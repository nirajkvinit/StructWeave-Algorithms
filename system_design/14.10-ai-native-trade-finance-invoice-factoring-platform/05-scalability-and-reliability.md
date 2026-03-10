# 14.10 AI-Native Trade Finance & Invoice Factoring Platform — Scalability & Reliability

## Scaling Strategy

### Tier 1: Invoice Processing Pipeline (Stateless, Horizontally Scalable)

The invoice processing pipeline—OCR, field extraction, GST verification, fraud detection—is stateless and scales horizontally by adding processing nodes.

| Component | Scaling Mechanism | Capacity per Node | Target Nodes |
|---|---|---|---|
| OCR Engine | GPU auto-scaling based on queue depth | 200 invoices/min (A100 GPU) | 6 (normal), 20 (quarter-end) |
| Field Extractor | CPU auto-scaling | 500 invoices/min | 4 (normal), 12 (quarter-end) |
| GST Verifier | I/O-bound; scale by connection pool | 50 req/min per GSTIN (API limit) | 10 (normal), 30 (quarter-end) |
| Fraud Detector | Mixed CPU/GPU; graph queries are CPU-heavy | 300 invoices/min | 5 (normal), 15 (quarter-end) |

**Auto-Scaling Policy:**
- Metric: Queue depth (number of unprocessed invoices)
- Scale-up threshold: Queue depth > 500 for 2 minutes → add 2 nodes
- Scale-down threshold: Queue depth < 50 for 10 minutes → remove 1 node
- Minimum nodes: always maintain at least 2 for each component (fault tolerance)
- Maximum nodes: cost-capped at 3x normal capacity (beyond this, queue and throttle)

**GST Verifier Rate Limit Management:**
The GSTN API rate limit (50 requests/min per GSTIN) is the binding constraint. For 500K invoices/day across 200K unique GSTINs:
- Average: 2.5 verifications per GSTIN per day → well within limits
- But distribution is skewed: large buyers (Reliance, Tata, etc.) may have 5,000+ invoices/day against their GSTIN
- Solution: Request queue per GSTIN with rate-limiting; cached GST data reduces API calls by 60%; batch GSTN queries during off-peak hours for frequently used GSTINs

### Tier 2: Risk & Pricing Engine (Compute-Intensive, Partitionable)

Credit scoring and pricing are CPU/GPU-intensive but embarrassingly parallel across invoices.

| Component | Scaling Mechanism | Partitioning |
|---|---|---|
| Credit Scorer | Model serving replicas behind load balancer | Partition by buyer_id hash; each replica serves all buyers but caches differently |
| Pricing Engine | Stateless compute replicas | No partitioning needed; each request is independent |
| Fraud Detector (graph) | Graph database shards + compute replicas | Graph partitioned by industry vertical; cross-partition queries fan out |
| Insurance Underwriter | Stateless compute replicas | Independent per deal |

**Model Serving:**
- Credit model inference: 200ms per buyer on CPU; batch inference: 50ms/buyer amortized
- Daily batch refresh of all 500K buyer scores: 500K × 50ms = 25,000 seconds = ~7 hours on single node
- Parallelized across 20 nodes: ~21 minutes
- Real-time inference for new invoices uses cached scores; fresh computation only when cache miss or score expired

### Tier 3: Settlement Engine (Consistency-Critical, Carefully Scaled)

Settlement requires strong consistency and must never duplicate or lose a financial transaction.

**Partitioning Strategy:**
- Partition by `buyer_id` (mod N, where N = number of settlement partitions)
- All deals against the same buyer are processed by the same partition → prevents double-collection from NACH mandates
- Partition count: 16 initially; can be increased with rebalancing
- Each partition processes settlements sequentially within the partition but partitions operate in parallel

**Disaster Recovery:**
- Active-passive per partition: each partition has a standby that continuously replays the event stream
- Failover time: < 30 seconds (standby is warm with the latest state)
- No data loss: event stream is durably persisted before any processing

**Throughput:**
- 200K settlements/day ÷ 16 partitions = 12,500 settlements/partition/day
- At ~5 seconds per settlement saga: 12,500 × 5 = 62,500 seconds = ~17 hours → adequate headroom within 24-hour window
- Quarter-end surge handled by increasing partition count to 32 (pre-planned scaling)

### Tier 4: Data Layer Scaling

| Data Store | Scaling Strategy | Current Size | Growth Rate |
|---|---|---|---|
| Invoice Document Store | Object storage with CDN for hot documents; lifecycle policy moves documents older than 90 days to cold storage | 450 TB | 2.5 TB/day |
| Financial Ledger DB | Sharded relational DB with time-based partitioning; recent 3 months on high-IOPS storage; older on standard storage | 55 TB (10-year) | 15 GB/day |
| Event Store | Append-only log with topic-based partitioning; retained for regulatory period (10 years) | 35 TB | 10 GB/day |
| Feature Store | Column-oriented store optimized for ML feature serving; partitioned by entity type | 500 GB | 2 GB/day |
| Cache Layer | Distributed in-memory cache; 3 replicas per shard | 128 GB | Steady state (eviction-based) |
| Search Index | Distributed search engine with per-field indexing for invoice and deal search | 50 GB | 5 GB/day |

---

## Fault Tolerance

### Critical Failure Scenarios

**Scenario 1: Settlement Engine Crash Mid-Saga**

The settlement saga is executing Step 4 (bank transfer to MSME) when the settlement engine crashes.

**Impact:** The bank transfer may have been initiated but the engine doesn't know if it completed.

**Recovery:**
1. Saga state is persisted to durable storage after each step completion
2. On restart, the engine loads all in-progress sagas from the saga state table
3. For Step 4 (bank transfer), the engine queries the bank API with the idempotency key to check if the transfer was executed
4. If executed: proceed to Step 5 (confirm transfer) and continue the saga
5. If not executed: retry Step 4 with the same idempotency key
6. If uncertain (bank API also crashed): wait for bank statement reconciliation (next business day) and reconcile

**RTO:** < 2 minutes for saga resumption; < 24 hours for full reconciliation of ambiguous transfers

**Scenario 2: Credit Score Database Corruption**

A bad model deployment produces incorrect credit scores, which lead to mispricing of invoices.

**Impact:** Invoices may be priced too low (platform/financier takes on excess risk) or too high (MSMEs are overcharged).

**Recovery:**
1. Credit scores are versioned; every score update records the model version
2. If a bad model is detected, roll back to the previous model version
3. Re-score all buyers affected by the bad model (using the versioned feature store, which stores the inputs)
4. For deals already executed at incorrect prices: compute the pricing difference; if the MSME was overcharged, issue a credit adjustment; if the financier was undercompensated for risk, add a risk reserve from platform margins
5. Post-mortem: tighten model deployment with canary scoring (run new model in shadow mode on 5% of traffic for 24 hours before full rollout)

**Scenario 3: GSTN API Outage During Peak Filing Season**

GSTN becomes unavailable for 6 hours during the GSTR filing deadline period.

**Impact:** No new invoices can be GST-verified; the processing pipeline backs up.

**Recovery:**
1. Pipeline switches to "degraded mode": invoices are processed through all other verification layers (OCR, fraud detection, duplicate detection) but skip GST verification
2. Invoices in degraded mode receive a `GST_PENDING` status and are eligible for financing at a higher risk premium (25–50 bps surcharge)
3. When GSTN comes back, queued invoices are GST-verified in priority order (FIFO within priority tiers)
4. If GST verification fails post-funding (invoice not found in GSTR filings), the deal is flagged for review and the risk premium is retained as a buffer
5. SLA: GST verification backlog must be cleared within 4 hours of GSTN recovery

**Scenario 4: Financier API Integration Failure**

A major financier's API goes down, preventing deal confirmation and portfolio updates for deals involving that financier.

**Impact:** Invoices matched to this financier cannot be funded; MSMEs experience delays.

**Recovery:**
1. Circuit breaker triggers after 3 consecutive failures to the financier's API
2. Affected invoices are re-matched to other eligible financiers (if available at acceptable rates)
3. The financier is marked as temporarily unavailable in the matching engine
4. Webhook retry queue holds deal notifications for delivery when the API recovers
5. MSMEs are notified of the delay with an estimated resolution time

---

## Disaster Recovery

### RPO and RTO Targets

| System | RPO | RTO | Strategy |
|---|---|---|---|
| Financial Ledger | 0 (zero data loss) | 15 minutes | Synchronous replication to standby; automated failover |
| Settlement Engine | 0 | 5 minutes | Event-sourced with durable queue; saga state survives crash |
| Invoice Pipeline | 5 minutes | 30 minutes | Stateless processing; queue-backed; restart and reprocess |
| Credit Scoring | 1 hour | 1 hour | Feature store replicated; models stateless; score cache rebuilds from replicas |
| Analytics/Reporting | 4 hours | 4 hours | Batch-derived; can be reconstructed from source data |

### Multi-Region Strategy

**Primary Region:** Data center in financial district (low latency to banking APIs and GSTN)
**Secondary Region:** Geographically separated data center (disaster recovery)

| Data Type | Replication | Notes |
|---|---|---|
| Financial ledger + audit log | Synchronous (strong consistency) | Zero data loss guarantee; latency cost ~15ms per write |
| Invoice documents | Asynchronous (eventual consistency) | Documents are immutable after upload; 5-minute replication lag acceptable |
| Cache and search index | Not replicated (rebuilt in DR region) | Cache is ephemeral; search index rebuilt from source |
| ML models and features | Asynchronous snapshot (every 6 hours) | Models are deterministic given features; 6-hour lag acceptable |

**Failover Procedure:**
1. Primary region becomes unresponsive for > 5 minutes
2. Automated health check confirms outage (prevents false-positive failover)
3. DR region promoted to primary: DNS updated, banking API endpoints repointed
4. Settlement engine in DR region resumes in-progress sagas from persisted state
5. Banking API connections are re-established (some banks require manual IP whitelist update—pre-authorized with banks)
6. Full service restoration target: 30 minutes

### Backup Strategy

| Data | Backup Frequency | Retention | Storage |
|---|---|---|---|
| Financial ledger | Continuous (event stream) + daily snapshot | 10 years (regulatory) | Immutable object storage with WORM (Write Once Read Many) |
| Invoice documents | On upload (write-once) | 8 years | Object storage with lifecycle tiering |
| Audit events | Continuous (event stream) | 10 years | Append-only log storage |
| Credit scores (versioned) | Per computation | 5 years | Feature store with version history |
| Configuration and secrets | On change | 2 years | Encrypted vault with version history |

---

## Load Testing Strategy

### Test Scenarios

| Scenario | Load Profile | Success Criteria |
|---|---|---|
| Normal day | 500K invoices over 14 hours; 300K deals; 200K settlements | All SLOs met; no queue overflow |
| Quarter-end surge | 1.5M invoices over 14 hours; 900K deals; 600K settlements | Processing completes within 24 hours; pricing latency p95 ≤ 2 seconds (relaxed from 500ms) |
| Single large buyer default | 1 buyer with 2,000 active deals defaults; credit propagation to 50 financiers | All repricing completes within 5 minutes; all alerts delivered within 1 minute |
| GSTN outage during peak | 500K invoices with GSTN unavailable for 6 hours | Degraded mode activates; invoices processed with GST_PENDING; backlog cleared within 4 hours of recovery |
| Settlement engine failover | Primary settlement partition crashes mid-saga | Standby takes over within 30 seconds; no duplicate disbursements; all sagas resume correctly |
| Concurrent bidding storm | 100 financiers bidding on same pool of 1,000 invoices simultaneously | No bid lost; no double-award; auction integrity maintained |
