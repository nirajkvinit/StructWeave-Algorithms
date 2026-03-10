# 14.16 AI-Native ONDC Commerce Platform — Scalability & Reliability

## Scaling Dimensions

The ONDC platform faces unique scaling challenges compared to centralized e-commerce: the system must scale not just with transaction volume but with the number of network participants, protocol message fan-out, and cross-NP coordination complexity.

---

## Protocol Gateway Scaling

### Challenge

The protocol adapter (the single entry/exit point for all Beckn messages) processes ~1,160 messages/second at peak. Each message requires digital signature verification (CPU-intensive RSA/Ed25519 operations), schema validation, and routing. During festival sales, volume can spike 5-10× within minutes.

### Scaling Strategy

```
GatewayScalingArchitecture:

  Tier 1: Load Balancer
    - Layer 7 load balancing (HTTP)
    - Route by message type: search messages → search fleet, order messages → order fleet
    - Health-check based routing (unhealthy nodes removed within 10 seconds)
    - Rate limiting per NP (prevent single NP from overwhelming the gateway)
      - Default: 100 req/sec per NP
      - Burst: 500 req/sec for 30 seconds
      - Elevated: 1000 req/sec for pre-registered sale events

  Tier 2: Stateless Protocol Adapter Fleet
    - 20 nodes baseline, auto-scales to 60 nodes
    - Scaling trigger: CPU > 70% OR message queue depth > 1000 OR p95 latency > 500ms
    - Scale-up: Add 5 nodes every 2 minutes until target metric achieved
    - Scale-down: Remove 2 nodes every 10 minutes when CPU < 30% for 15 minutes
    - Zero-downtime deployment via rolling update (max 10% nodes updating simultaneously)

  Tier 3: Signature Verification Cache
    - Cache NP public keys from ONDC registry (TTL: 1 hour)
    - Cache signature verification results for idempotent messages (TTL: 5 minutes)
    - Reduces registry lookups from 1160/sec to ~20/sec (one per unique NP per hour)

  Tier 4: Async Processing for Non-Critical Paths
    - Critical path (synchronous): Signature verification → schema validation → ACK/NACK
    - Non-critical path (async via queue): Compliance logging, trust signal extraction,
      analytics event emission, audit trail storage
    - Separating critical from non-critical reduces p95 latency from 200ms to 80ms
```

### Message Routing Optimization

```
MessageRoutingStrategy:

  Problem: A search request may need to fan out to 100+ seller NPs. Sequential fan-out
  at 50ms per NP = 5 seconds. Unacceptable.

  Solution: Parallel fan-out with intelligent NP selection

  step_1_np_selection:
    # Not all NPs are relevant for every search
    qualifying_nps = filter_nps_by(
      domain = search.context.domain,           # Only NPs in the same domain (grocery, fashion, etc.)
      city = search.context.city,               # Only NPs serving the buyer's city
      category = search.intent.category,        # Only NPs with products in the category
      trust_score > minimum_threshold,          # Exclude very low-trust NPs
      response_sla = "responsive"               # Exclude NPs with > 50% timeout rate
    )
    # Typically reduces 100+ NPs to 15-30 qualifying NPs

  step_2_parallel_fanout:
    # Fire requests to all qualifying NPs simultaneously
    futures = [async_send(np, search_message) for np in qualifying_nps]

    # Collect responses with timeout
    responses = await_with_timeout(futures, timeout=1500ms)
    # NPs that haven't responded within 1.5s are excluded from this query

  step_3_response_aggregation:
    all_items = flatten([response.catalog.items for response in responses])
    ranked_items = ai_rank(all_items, search.intent, buyer_context)
    return build_on_search(ranked_items)
```

---

## Search Index Scaling

### Horizontal Partitioning Strategy

```
SearchIndexPartitioning:

  Partition Key: category_domain (e.g., "ONDC:RET10" for grocery, "ONDC:RET12" for fashion)

  Rationale: Searches are always domain-scoped (a buyer searching for groceries never
  needs fashion results). Domain-based partitioning ensures each search query hits
  exactly one partition, eliminating scatter-gather.

  Partition sizing:
    Grocery (RET10):     ~50M items → 4 shards, 2 replicas each
    Fashion (RET12):     ~30M items → 3 shards, 2 replicas each
    Electronics (RET14): ~20M items → 2 shards, 2 replicas each
    Food & Bev (RET11):  ~15M items → 2 shards, 2 replicas each
    Other domains:       ~35M items → 3 shards, 2 replicas each
    Total:               ~150M items → 14 primary shards + 14 replicas

  Index refresh strategy:
    - Full refresh: Every 4 hours (complete catalog re-index from NP snapshots)
    - Incremental: Real-time via catalog change events (item update → index update within 30s)
    - Stale item cleanup: Daily batch removes items not seen in the last 7 days

  Vector index for semantic search:
    - HNSW index with 384-dimensional multilingual embeddings
    - Separate vector index per domain partition (co-located with inverted index)
    - Approximate nearest neighbor search with ef=100 for recall > 95%
```

---

## Order Processing Scaling

### Event-Driven Order Pipeline

```
OrderPipelineScaling:

  Event Stream Configuration:
    - Partitioned by transaction_id (ensures all events for one order go to same partition)
    - 64 partitions (supports up to 64 concurrent consumers per consumer group)
    - Retention: 7 days (sufficient for replaying recent orders; long-term in cold storage)
    - Replication factor: 3 (survives loss of 2 nodes)

  Consumer Groups:
    group_1: OrderStateManager (updates order state, 16 consumers)
    group_2: InventoryUpdater (adjusts stock levels, 8 consumers)
    group_3: SettlementTracker (records financial events, 8 consumers)
    group_4: NotificationSender (sends buyer/seller notifications, 4 consumers)
    group_5: AnalyticsCollector (updates metrics, 4 consumers)
    group_6: TrustSignalExtractor (extracts signals for trust scoring, 4 consumers)

  Backpressure Handling:
    - If consumer group lag > 10,000 events: auto-add consumers (up to partition count)
    - If consumer group lag > 100,000 events: alert on-call; consider partition expansion
    - If a single consumer fails repeatedly: dead-letter queue with manual investigation

  Peak Handling (Festival Sales):
    - Pre-scale event stream to 128 partitions 24 hours before known sale events
    - Pre-warm order database with additional read replicas
    - Enable "fast path" mode: skip non-critical consumers (analytics, trust signals)
      during peak; backfill from event log after peak subsides
```

---

## Database Scaling Strategy

### Polyglot Persistence

| Data Type | Storage | Scaling Strategy | Rationale |
|---|---|---|---|
| **Order state** | Distributed SQL (strongly consistent) | Horizontal sharding by `transaction_id` hash; 8 shards with 2 replicas | Orders require ACID transactions for state transitions; sharding by transaction_id keeps all order data co-located |
| **Catalog data** | Document store | Sharded by `seller_np_id`; allows schema flexibility per seller | Catalog schema varies by domain and seller; document store handles heterogeneous schemas naturally |
| **Search index** | Dedicated search engine | Partitioned by domain; replicated for read scaling | Full-text + vector search requires specialized indexing; separate from operational store |
| **Protocol message log** | Append-only log store | Partitioned by date + transaction_id; tiered storage (hot: 7 days, warm: 90 days, cold: 7 years) | Append-only workload; immutable after write; large volume (24 TB/year) requires tiered storage |
| **Trust scores** | Key-value store with sorted sets | Sharded by `np_id`; in-memory for read-heavy access | Trust scores are read on every search and order; sub-millisecond read latency required |
| **Settlement ledger** | Distributed SQL (strongly consistent) | Sharded by `order_id`; separate from order database for isolation | Financial data requires strict consistency and auditability; isolation prevents order workload from affecting settlement queries |
| **Session state (WhatsApp)** | In-memory store with persistence | Sharded by `conversation_id`; TTL-based expiry (30 minutes) | Conversational sessions are short-lived; in-memory for speed with persistence for recovery |

---

## Reliability Architecture

### Failure Modes and Mitigations

```
FailureModeAnalysis:

  Failure 1: Seller NP Unresponsive (during order flow)
    Impact: Buyer's order hangs at select/init/confirm step
    Detection: Timeout on callback (default: 30 seconds per step)
    Mitigation:
      - Automated timeout with buyer notification: "Seller is not responding. Try another seller?"
      - If timeout occurs after confirm (payment collected), enter escrow hold
      - Auto-cancel with full refund if seller doesn't respond within 30 minutes post-confirm
      - Record as behavioral compliance violation for trust scoring

  Failure 2: Payment Gateway Degradation
    Impact: Buyers cannot complete payment; cart abandonment spikes
    Detection: Payment success rate drops below 90% over 5-minute window
    Mitigation:
      - Multi-gateway routing: if primary gateway success rate < 90%, shift traffic to secondary
      - Canary payments: ₹1 synthetic payment every 60 seconds to each gateway for proactive detection
      - Fallback to COD option for high-value orders if all digital payment gateways degraded
      - Buyer notification: "Payment is taking longer than usual. Your order is reserved for 10 minutes."

  Failure 3: Search Index Corruption or Staleness
    Impact: Buyers see wrong prices, out-of-stock items, or missing results
    Detection: Index freshness monitoring (alert if any domain partition > 6 hours stale)
    Mitigation:
      - Serve from replica while primary rebuilds (full rebuild takes ~45 minutes for largest partition)
      - Live price validation via select/on_select for top-displayed results
      - "Price may have changed" indicator for results with freshness > 2 hours

  Failure 4: Event Stream Backlog
    Impact: Order states lag behind reality; settlement delayed; notifications delayed
    Detection: Consumer lag monitoring (alert if any consumer group > 5 minutes behind)
    Mitigation:
      - Auto-scale consumers up to partition count
      - Critical path bypass: order state manager reads directly from protocol adapter
        (synchronous path) in addition to consuming from event stream
      - Non-critical consumers (analytics, trust signals) tolerate up to 1 hour lag

  Failure 5: ONDC Gateway Outage
    Impact: No new orders can be placed; existing orders in progress may hang
    Detection: Gateway health check failure (HTTP 5xx or timeout for 3 consecutive checks)
    Mitigation:
      - Existing in-progress orders continue (state is local)
      - New orders queue in a local buffer (replay when gateway recovers)
      - Direct NP-to-NP communication for pre-registered seller NPs (bypass gateway)
      - Status page update for merchants: "ONDC network experiencing issues. Orders will resume shortly."
```

### Circuit Breaker Configuration

```
CircuitBreakerPolicy:

  per_np_circuit_breaker:
    failure_threshold: 5 consecutive failures OR error_rate > 30% over 1-minute window
    open_duration: 30 seconds (no requests sent to the NP)
    half_open: Allow 1 probe request; if successful, close circuit
    metrics_window: 1 minute sliding window

  per_gateway_circuit_breaker:
    failure_threshold: 3 consecutive failures
    open_duration: 10 seconds (critical path; recover quickly)
    half_open: Allow 2 probe requests

  per_payment_gateway_circuit_breaker:
    failure_threshold: error_rate > 10% over 2-minute window
    open_duration: 60 seconds
    half_open: Allow canary payment; if successful, gradually increase traffic (10%, 25%, 50%, 100%)
```

### Data Replication and Recovery

```
DataReplicationStrategy:

  Order Database:
    - Synchronous replication within region (2 replicas)
    - Asynchronous replication to DR region (RPO: < 5 seconds)
    - Point-in-time recovery: 7-day retention
    - Backup: Daily full + hourly incremental

  Protocol Message Log:
    - 3× replication within the event stream cluster
    - Async archive to object storage (cold tier) after 7 days
    - Retention: 7 years (regulatory requirement for financial transaction records)

  Settlement Ledger:
    - Synchronous replication (3 replicas, quorum writes)
    - No data loss tolerance: RPO = 0
    - Daily reconciliation against protocol message log (source of truth)

  Search Index:
    - 2 replicas per shard (read scaling + fault tolerance)
    - Full rebuild capability from catalog store (recovery time: ~45 minutes)
    - No separate backup needed (derived data, reconstructible from source)

  DR Strategy:
    - Active-passive with automated failover
    - Failover trigger: Primary region unavailable for > 2 minutes
    - Failover time: < 5 minutes
    - Regular DR drills: Quarterly
```

---

## Capacity Planning for Growth

```
GrowthProjections:

  Current (2026):  50M orders/month,  1M sellers, 150M catalog items
  2027 target:     200M orders/month, 3M sellers, 450M catalog items
  2028 target:     500M orders/month, 5M sellers, 750M catalog items

  Scaling triggers:
    - CPU utilization > 60% sustained for 1 hour → add 20% compute
    - Database storage > 70% capacity → provision additional shards
    - Search index query latency p95 > 1.5s → add replicas or re-shard
    - Event stream consumer lag > 10 minutes → increase partition count

  Cost-efficiency measures:
    - Reserved compute for baseline load; spot/preemptible for burst capacity
    - Tiered storage: hot (SSD) for 7 days, warm (HDD) for 90 days, cold (object store) for archival
    - AI inference batch scheduling: non-critical catalog enrichment during off-peak hours (2-6 AM)
    - Search index compaction during low-traffic windows
```
