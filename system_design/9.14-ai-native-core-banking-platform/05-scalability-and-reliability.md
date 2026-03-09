# Scalability & Reliability — AI-Native Core Banking Platform

## 1. Scaling Strategy

### 1.1 Scaling Dimensions

| Dimension | Approach | Trigger |
|---|---|---|
| **Transaction throughput** | Horizontal scaling of stateless processing nodes + partitioned event store | TPS exceeds 70% of partition capacity |
| **Account volume** | Re-partitioning with consistent hashing; add partitions as accounts grow | Partition size exceeds 10M accounts |
| **Read query volume** | Add read replicas; expand cache tier; CDN for static reference data | Read latency p99 exceeds SLO |
| **Storage** | Tiered storage with automated data lifecycle (hot → warm → cold → archive) | Hot storage exceeds 80% capacity |
| **Geographic expansion** | Add new regions with local data residency; extend active-active topology | New jurisdiction requirements |
| **Entity onboarding** | Logical tenant provisioning within shared infrastructure | New legal entity integration |

### 1.2 Partitioning Strategy

**Primary partitioning: Account-based consistent hashing**

```
Partition Assignment:
  partition_id = HASH(account_id) MOD num_partitions

Properties:
  - All events for an account live on the same partition
  - Strict ordering maintained within partition
  - Partition count: start at 256, expand to 1024, 4096 as needed
  - Rebalancing: virtual nodes allow adding capacity without full reshuffle

Partition Sizing Target:
  - Max 500K accounts per partition
  - Max 5,000 TPS per partition
  - Max 100 GB event data per partition
```

**Secondary indexes for cross-account queries:**
- Customer → accounts mapping (for customer-level views)
- Entity → accounts mapping (for entity-level reporting)
- GL code → entries mapping (for general ledger queries)

### 1.3 Service-Level Scaling

| Service | Scaling Pattern | Min Instances | Auto-Scale Trigger |
|---|---|---|---|
| **API Gateway** | Horizontal, stateless | 6 (3 per region) | CPU > 60% or RPS > 80% capacity |
| **Transaction Engine** | Partition-aligned pods | 1 per partition | TPS per partition > 70% capacity |
| **Ledger Service** | Partition-aligned, co-located with event store | 1 per partition | Write throughput > 80% |
| **Balance Service** | Horizontal with cache affinity | 4 minimum | Cache miss rate > 10% |
| **Payment Orchestrator** | Horizontal, stateless | 4 minimum | Queue depth > 1000 |
| **Fraud Engine** | Horizontal with GPU/NPU pods | 6 minimum | Inference latency p99 > 15ms |
| **Compliance Engine** | Horizontal stream processors | 4 minimum | Event processing lag > 100ms |
| **FX Rate Service** | Horizontal with replicated state | 3 minimum | Rate request latency > 5ms |

### 1.4 Data Tier Scaling

**Event Store (Write Path):**
- Partitioned across multiple nodes with account-affinity
- Each partition: leader + 2 synchronous replicas (quorum writes)
- Write-ahead log with group commit for throughput optimization
- Compaction: periodic snapshots reduce replay cost

**Read Store (Query Path):**
- Multiple read replicas per region, asynchronously updated
- Materialized views optimized for specific query patterns:
  - Balance view: indexed by account_id (sub-ms lookups)
  - Transaction history view: indexed by account_id + timestamp (range scans)
  - GL view: indexed by gl_code + posting_period (reporting queries)

**Cache Tier:**
- Distributed cache for hot data:
  - Account balances (TTL: write-through, always fresh)
  - FX rates (TTL: 5s, push-invalidated on rate update)
  - Product configurations (TTL: 5 min, event-invalidated on change)
  - Sanctions bloom filter (TTL: refreshed on list update)

### 1.5 Tiered Storage Lifecycle

```
Data Lifecycle:

Hot Tier (0-90 days):
  - Storage: NVMe SSD
  - Access pattern: Real-time queries, active transaction processing
  - Full indexes maintained
  - Replicated across 3 nodes (synchronous)

Warm Tier (90 days - 2 years):
  - Storage: SSD
  - Access pattern: Historical inquiries, regulatory queries
  - Reduced indexes (primary key + date range)
  - Replicated across 2 nodes (asynchronous)

Cold Tier (2-7 years):
  - Storage: Object storage (compressed, encrypted)
  - Access pattern: Audit requests, legal discovery
  - Metadata index only; full data requires fetch
  - Geo-redundant storage (cross-region)

Archive Tier (7+ years):
  - Storage: Archive-class object storage
  - Access pattern: Exceptional regulatory requests
  - Retrieval time: minutes to hours
  - Retained per jurisdictional requirements
```

---

## 2. Reliability Engineering

### 2.1 Availability Architecture

**Target: 99.999% availability (5.26 minutes/year)**

This requires eliminating every single point of failure and designing for automated recovery faster than human reaction time.

```
Reliability Layers:

Layer 1 - Component Redundancy:
  Every component has N+2 redundancy minimum
  Active-active where possible, active-standby for stateful components

Layer 2 - Zone Redundancy:
  Services distributed across 3 availability zones
  Any single zone can fail without impact

Layer 3 - Region Redundancy:
  Active-active across 2 regions (primary + secondary)
  Synchronous replication for financial data (RPO=0)

Layer 4 - Chaos Engineering:
  Regular failure injection to validate recovery
  Gameday exercises simulating region-level failures
```

### 2.2 Replication Strategy

| Data Type | Replication Mode | Replicas | RPO |
|---|---|---|---|
| **Event Store (ledger)** | Synchronous quorum | 3 (2 local + 1 remote) | 0 (zero data loss) |
| **Balance projections** | Asynchronous | 2 per region | < 100ms |
| **Customer data** | Synchronous within region | 3 local | 0 within region |
| **Reference data** | Asynchronous | All regions | < 1s |
| **Audit logs** | Synchronous | 3 (write-once) | 0 |
| **ML model artifacts** | Asynchronous | All serving nodes | < 5 min |

**Synchronous replication for financial data is non-negotiable.** The business cost of losing even a single committed transaction far exceeds the latency cost of synchronous writes.

### 2.3 Consensus and Leader Election

For the partitioned event store, each partition uses a consensus protocol for leader election:

```
Consensus Configuration:
  Protocol: Raft-based consensus (adapted for banking requirements)
  Quorum size: 3 nodes (2 of 3 for commit)
  Heartbeat interval: 100ms
  Election timeout: 500ms - 1500ms (randomized)
  Max entries per append: 1000

Leader Responsibilities:
  - Accept all write requests for the partition
  - Replicate to followers before acknowledging commit
  - Maintain transaction ordering within partition

Follower Promotion:
  - Automatic promotion when leader heartbeat missed
  - New leader must have all committed entries
  - Read-only queries can be served by followers (stale reads acceptable for non-critical paths)
```

### 2.4 Circuit Breaker Configuration

| Service | Failure Threshold | Recovery | Fallback |
|---|---|---|---|
| **Fraud Engine** | 5 failures in 10s | Half-open after 30s | Rule-based scoring |
| **Sanctions Screening** | 3 failures in 5s | Half-open after 15s | Hold transaction + async screen |
| **FX Rate Service** | 10 failures in 30s | Half-open after 60s | Use last known rate (< 30s old) |
| **Payment Network** | 3 failures in 10s | Half-open after 120s | Queue for retry |
| **ML Credit Scoring** | 5 failures in 15s | Half-open after 45s | Policy-based scoring |
| **External KYC Provider** | 3 failures in 30s | Half-open after 300s | Queue application + manual review |

### 2.5 Graceful Degradation Modes

```
Mode 1: NORMAL
  All services operational, full AI/ML capabilities
  → Standard operation

Mode 2: DEGRADED_ML
  ML services unavailable, rule-based fallbacks active
  → Reduced fraud detection accuracy, manual credit decisions
  → Auto-triggered when ML services breach circuit breaker

Mode 3: DEGRADED_EXTERNAL
  External payment networks partially unavailable
  → Domestic payments continue; affected corridors queued
  → Customer notification of delays

Mode 4: READ_ONLY
  Write path impaired but reads functional
  → Balance inquiries, statements available
  → New transactions queued with estimated processing time
  → Triggered by event store primary failure during failover

Mode 5: EMERGENCY
  Minimal operations only
  → ATM/POS authorization from cached balances (stand-in processing)
  → All other operations suspended
  → Requires manual activation by operations command center
```

---

## 3. Disaster Recovery

### 3.1 DR Architecture

```
Primary Region (Active)          DR Region (Hot Standby)
┌─────────────────────┐         ┌─────────────────────┐
│                     │         │                     │
│  API + Services     │         │  API + Services     │
│  (serving traffic)  │         │  (pre-warmed, idle) │
│                     │         │                     │
│  Event Store        │──sync──►│  Event Store        │
│  (leader)           │  RPO=0  │  (follower)         │
│                     │         │                     │
│  Read Store         │──async─►│  Read Store         │
│  (active)           │ <100ms  │  (replica)          │
│                     │         │                     │
│  Cache              │         │  Cache              │
│  (populated)        │         │  (warm)             │
│                     │         │                     │
└─────────────────────┘         └─────────────────────┘
         │                               │
         ▼                               ▼
    ┌──────────┐                   ┌──────────┐
    │ Object   │──geo-replicate──►│ Object   │
    │ Storage  │                   │ Storage  │
    └──────────┘                   └──────────┘
```

### 3.2 Recovery Objectives

| Scenario | RPO | RTO | Recovery Procedure |
|---|---|---|---|
| **Single node failure** | 0 | < 10s | Automatic failover within cluster |
| **Availability zone failure** | 0 | < 30s | Traffic rerouted to surviving zones |
| **Region failure** | 0 | < 60s | DNS failover to DR region; follower promotion |
| **Data corruption (logical)** | Point-in-time | < 30 min | Replay events from last known good state |
| **Ransomware/total loss** | < 1 hour | < 4 hours | Restore from immutable backups + event replay |

### 3.3 Failover Procedure

```
PROCEDURE RegionFailover():
    // Automated, completes in < 60 seconds

    1. DETECT primary region failure
       - Health check failure from 3+ independent monitors
       - Confirmation from network-level monitoring
       - Rule out split-brain (verify primary is truly unreachable)

    2. PROMOTE DR event store followers to leaders
       - Verify all committed events are present
       - Enable write acceptance on promoted leaders
       - Reject any stale writes from old primary

    3. ACTIVATE DR services
       - Scale up pre-warmed service pods
       - Verify cache warming complete (< 10s for critical data)
       - Activate payment network connections

    4. UPDATE DNS
       - Switch traffic to DR region endpoints
       - TTL: 30 seconds (pre-configured low TTL)

    5. VALIDATE
       - Run automated smoke tests (account lookup, balance check, test transaction)
       - Verify payment network connectivity
       - Confirm regulatory reporting pipeline

    6. NOTIFY
       - Alert operations team
       - Notify payment network partners
       - Log regulatory incident (if applicable)
```

### 3.4 Split-Brain Prevention

Banking systems cannot tolerate split-brain scenarios where two nodes both accept writes for the same account.

```
Prevention Mechanisms:

1. Fencing Tokens:
   Every write carries a monotonically increasing fencing token
   Storage layer rejects writes with stale tokens
   Prevents old leader from corrupting data after partition heal

2. Quorum-Based Writes:
   Write requires acknowledgment from majority of replicas
   In a 3-node cluster, 2 must acknowledge
   Partitioned minority cannot accept writes

3. External Arbiter:
   Independent witness service in third location
   Breaks ties when primary and DR regions cannot communicate
   Only one region can hold the "write lease" at any time

4. Automatic Demotion:
   If primary region loses contact with arbiter for > 10s
   Primary demotes itself to read-only
   Prevents both regions from accepting writes simultaneously
```

---

## 4. Capacity Planning

### 4.1 Growth Projections

| Metric | Year 1 | Year 3 | Year 5 |
|---|---|---|---|
| **Active accounts** | 100M | 250M | 500M |
| **Daily transactions** | 500M | 1.5B | 3B |
| **Peak TPS** | 60K | 150K | 300K |
| **Event store size** | 200 TB | 1 PB | 3 PB |
| **Open Banking TPPs** | 500 | 2,000 | 5,000 |
| **API calls/day** | 25M | 200M | 1B |
| **Entities** | 10 | 50 | 100+ |

### 4.2 Scaling Milestones

```
Phase 1 (0-100M accounts):
  - 256 event store partitions
  - 3 availability zones, 1 DR region
  - 50 service pods per service
  - Estimated infrastructure: moderate cloud spend

Phase 2 (100M-300M accounts):
  - 1024 partitions (4x rebalance)
  - Add second active region (active-active)
  - 150 service pods, GPU nodes for ML
  - Estimated infrastructure: 2-3x Phase 1

Phase 3 (300M-500M+ accounts):
  - 4096 partitions
  - 3 active regions (follow-the-sun)
  - 300+ service pods, dedicated ML cluster
  - Consider custom hardware for hot path
  - Estimated infrastructure: 2x Phase 2
```

### 4.3 Load Testing Strategy

```
Load Test Profiles:

Profile 1: Steady State
  - Simulate normal business day traffic pattern
  - Gradual ramp: 10% → 50% → 100% over 2 hours
  - Sustain at 100% for 8 hours
  - Verify all SLOs met continuously

Profile 2: Peak Burst
  - Simulate salary-day / month-end spike
  - Ramp to 500% of normal in 5 minutes
  - Sustain for 30 minutes
  - Verify auto-scaling responds within 2 minutes
  - Verify no transaction failures or data loss

Profile 3: Failover Validation
  - Run at 100% load
  - Kill primary event store leader
  - Verify failover completes within RTO
  - Verify zero transaction loss
  - Verify all in-flight transactions complete or cleanly fail

Profile 4: Soak Test
  - Run at 80% load for 72 hours
  - Monitor for memory leaks, connection exhaustion, log accumulation
  - Verify no degradation in latency or error rate over time
```

---

## 5. Backpressure and Flow Control

### 5.1 Backpressure Mechanisms

```
Layer 1: API Gateway
  - Rate limiting per client, per API, per entity
  - Request queuing with bounded queue (reject when full)
  - Priority lanes: critical operations (ATM auth) > standard > batch

Layer 2: Transaction Engine
  - Per-partition admission control
  - When partition queue > threshold: reject new requests with 503
  - Caller retries with exponential backoff + jitter

Layer 3: Event Store
  - Write-ahead log bounded buffer
  - If buffer > 80%: slow down acceptance (add artificial 10ms delay)
  - If buffer > 95%: reject new writes, signal upstream

Layer 4: Event Processing (CQRS projections)
  - Consumer lag monitoring
  - If lag > threshold: scale up consumers
  - If lag > critical threshold: pause non-essential projections
  - Priority: balance projection > GL > analytics > audit
```

### 5.2 Traffic Shaping for Multi-Tenant Fairness

```
Per-Entity Resource Allocation:
  - Each entity gets a guaranteed minimum TPS allocation
  - Burst capacity shared across entities on best-effort basis
  - No single entity can consume > 30% of total capacity
  - Priority adjustment for regulatory-critical operations

Example:
  Entity A (large bank): guaranteed 30,000 TPS, burst to 50,000
  Entity B (mid-size): guaranteed 10,000 TPS, burst to 20,000
  Entity C (small): guaranteed 2,000 TPS, burst to 5,000
  Reserve: 8,000 TPS for burst absorption
  Total capacity: 100,000 TPS
```

---

*Next: [Security & Compliance →](./06-security-and-compliance.md)*
