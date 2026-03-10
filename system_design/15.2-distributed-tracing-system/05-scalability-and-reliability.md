# 05 — Scalability & Reliability

## Scalability

### Horizontal vs. Vertical Scaling Decisions

| Component | Scaling Strategy | Rationale |
|---|---|---|
| **OTel Agents** | Horizontal (one per host) | Naturally scales with infrastructure; no coordination between agents |
| **Collectors** | Horizontal with consistent hashing | Stateless processing; add instances to handle higher ingestion rates; consistent hash by trace ID for tail sampling affinity |
| **Tail Samplers** | Horizontal with trace-ID partitioning | Memory-bound; each instance owns a partition of the trace ID space; partition rebalancing on scale events |
| **Message Queue** | Horizontal (add partitions) | Throughput scales linearly with partition count; partitioned by trace ID |
| **Hot Store** | Horizontal (add nodes to cluster) | Wide-column stores scale linearly; trace ID as partition key ensures even distribution |
| **Warm/Cold Store** | Elastic object storage | Virtually unlimited capacity; cost scales linearly with data volume |
| **Query Service** | Horizontal (stateless) | Query load is independent of ingestion; scale based on query QPS |

### Auto-Scaling Triggers

| Component | Scale-Up Trigger | Scale-Down Trigger | Cooldown |
|---|---|---|---|
| Collectors | CPU > 70% sustained 5 min OR queue lag > 10s | CPU < 30% sustained 15 min | 10 min |
| Tail Samplers | Memory > 75% OR trace wait time > 45s | Memory < 40% sustained 15 min | 15 min |
| Query Service | p99 latency > 5s OR CPU > 60% | p99 latency < 1s AND CPU < 20% | 5 min |
| Compaction Workers | Compaction lag > 2 hours | Compaction lag < 30 min | 30 min |

### Database Scaling Strategy

**Hot Store (Wide-Column)**:
- **Sharding**: Automatic via trace_id partition key; wide-column stores handle this natively
- **Read replicas**: Not needed (trace queries are point lookups, not range scans)
- **Replication factor**: 3 (balances durability against write cost)
- **Compaction strategy**: Leveled compaction for read-optimized access; size-tiered for write-heavy ingestion tables

**Warm/Cold Store (Columnar on Object Storage)**:
- **Scaling**: Object storage is inherently elastic; no provisioning needed
- **Block size optimization**: Target 256 MB Parquet blocks for optimal read performance
- **Partition pruning**: Date-based directory structure enables skipping irrelevant blocks

### Caching Layers

| Layer | What's Cached | TTL | Eviction Policy | Hit Rate Target |
|---|---|---|---|---|
| **L1: Query Service in-process** | Recently queried traces | 2 min | LRU, 500 MB per instance | 30-40% |
| **L2: Distributed cache** | Assembled traces, search results | 10 min | LRU, 50 GB total | 50-60% |
| **L3: Block metadata cache** | Parquet block metadata + bloom filters | 1 hour | LFU, 10 GB total | 90%+ |
| **Service map cache** | Pre-computed dependency graph | 1 min | Full invalidation on update | 95%+ |

### Hot Spot Mitigation

**Problem**: Some traces are queried far more than others (e.g., traces linked from high-priority incident reports shared across teams).

**Mitigation**:
1. **L2 cache absorption**: Hot traces are cached in the distributed cache layer, absorbing repeated reads
2. **Read-through caching**: The query service reads from cache first; cache misses populate the cache for subsequent reads
3. **No hot spot in writes**: Trace IDs are random 128-bit values, ensuring uniform distribution across storage partitions; no skew possible

---

## Reliability & Fault Tolerance

### Single Points of Failure (SPOF) Identification

| Component | SPOF Risk | Mitigation |
|---|---|---|
| **Load Balancer** | Medium | Active-passive pair with health-check failover; or DNS-based routing to multiple LB instances |
| **Message Queue** | High (central bus) | Multi-broker cluster with replication factor 3; no single-broker failure causes data loss |
| **Hot Store** | Medium | Multi-node cluster with replication factor 3; automatic repair and rebalancing |
| **Object Storage** | Low | Provider-managed; 11 nines of durability by design |
| **Query Service** | Low | Stateless; multiple instances behind LB; any instance can serve any query |
| **Tail Sampler** | High (holds buffered state) | WAL checkpoint for crash recovery; overlap during rebalancing; accept some data loss for system availability |

### Redundancy Strategy

```
Deployment topology:
    Region A (primary):
        Collectors: 10 instances (behind LB)
        Tail Samplers: 10 instances (consistent hash ring)
        Message Queue: 5 brokers, 3x replication
        Hot Store: 12-node cluster, RF=3
        Query Service: 5 instances (behind LB)
        Compaction Workers: 3 instances

    Region B (standby):
        Collectors: 5 instances (receives cross-region span copies)
        Hot Store: 6-node cluster, RF=3 (async replication)
        Query Service: 3 instances (serves read queries)

    Object Storage:
        Cross-region replication enabled (provider-managed)
```

### Failover Mechanisms

**Collector failover**:
- Health check: gRPC health endpoint, 5-second interval
- Detection: 3 consecutive health check failures → remove from hash ring
- Recovery: Consistent hashing rebalances traffic to remaining collectors; spans for affected trace IDs route to the next node on the ring
- Impact: Traces being buffered on the failed collector may lose some spans; the tail sampler makes a decision on the partial trace

**Hot store failover**:
- Multi-node cluster with automatic coordinator failover
- Write path: If a write fails, the collector retries to the message queue (which buffers); writes resume when the storage node recovers
- Read path: Query service retries against replica nodes; if all replicas for a partition are down, return a partial result with a warning

**Message queue failover**:
- Multi-broker with in-sync replicas (ISR)
- If a partition leader fails, a follower is promoted; no data loss for acknowledged messages
- If all brokers in a partition fail: collectors buffer in memory for a configurable window (30 seconds); drop oldest spans if buffer fills

### Circuit Breaker Patterns

| Circuit | Opens When | Behavior When Open | Closes When |
|---|---|---|---|
| Collector → Hot Store | 5 consecutive write failures within 10s | Redirect writes to message queue dead letter; alert on-call | Successful write to hot store |
| Query Service → Hot Store | p99 read latency > 10s for 1 min | Serve from cache only; return stale data with staleness indicator | p99 < 3s for 30 sec |
| Query Service → Warm Store | 3 consecutive timeout failures | Return partial results (hot tier only) with "incomplete results" flag | Single successful query |
| Tail Sampler → Message Queue | Queue publish latency > 5s | Fall back to writing sampled spans directly to hot store (bypass queue) | Queue latency < 500ms for 30 sec |

### Retry Strategies

| Operation | Retry Policy | Backoff | Max Retries | Notes |
|---|---|---|---|---|
| SDK → Agent span export | None (fire-and-forget) | N/A | 0 | Tracing must never block application |
| Agent → Collector | Exponential backoff | 100ms, 200ms, 400ms | 3 | Drop batch after max retries |
| Collector → Queue publish | Exponential backoff | 50ms, 100ms, 200ms, 400ms | 4 | Buffer in memory during retries |
| Storage writer → Hot Store | Exponential backoff | 200ms, 400ms, 800ms | 3 | Return to queue for reprocessing after max retries |
| Query → Storage read | Immediate retry to replica | 0ms (different node) | 2 | Try alternate replicas |

### Graceful Degradation

| Degradation Level | Trigger | Behavior |
|---|---|---|
| **Level 0: Healthy** | All systems nominal | Full functionality |
| **Level 1: Reduced sampling** | Tail sampler memory > 80% | Reduce wait window; increase head sampling aggressiveness; drop low-priority traces first |
| **Level 2: Head-only sampling** | Tail sampler unavailable | Fall back to head-based sampling only; lose tail-sampling guarantees (errors may be missed) |
| **Level 3: Stale queries** | Hot store degraded | Serve queries from cache and warm store only; accept increased query latency |
| **Level 4: Ingestion-only** | Query tier unavailable | Continue ingesting and storing spans; queries return 503; data is preserved for when query tier recovers |
| **Level 5: Instrumentation bypass** | Collector fleet unavailable | SDKs drop spans silently; no impact on production services; no trace data collected until recovery |

### Bulkhead Pattern

| Bulkhead | Isolated Resource | Why |
|---|---|---|
| Ingestion pool | Collector threads for span processing | Prevents a slow storage write from blocking span ingestion |
| Query pool | Query service threads per query type | Prevents expensive search queries from starving trace-by-ID lookups |
| Compaction pool | Dedicated compaction worker instances | Prevents compaction load from affecting ingestion or query performance |
| Per-tenant queue | Message queue partitions per tenant | Prevents a noisy tenant from consuming all queue capacity |

---

## Disaster Recovery

### Recovery Objectives

| Metric | Target | Rationale |
|---|---|---|
| **RTO (Recovery Time Objective)** | 30 minutes for ingestion; 2 hours for query | Ingestion must resume quickly to avoid span loss; query can tolerate longer recovery since it's used interactively |
| **RPO (Recovery Point Objective)** | 30 seconds for hot tier; 0 for warm/cold tier | Hot tier data in the last 30 seconds of the write pipeline may be lost; warm/cold tier on replicated object storage has zero data loss |

### Backup Strategy

| Data | Backup Method | Frequency | Retention |
|---|---|---|---|
| Hot store data | Continuous replication (RF=3) + periodic snapshot | Snapshots every 6 hours | 7 days (matches hot tier retention) |
| Warm/cold store | Object storage native replication (cross-region) | Continuous | 90 days (matches cold tier retention) |
| Configuration | Version-controlled (Git) | On every change | Indefinite |
| Sampling rules | Version-controlled | On every change | Indefinite |
| Service map aggregates | Periodic export to object storage | Every hour | 1 year |

### Multi-Region Considerations

| Strategy | Description | Trade-off |
|---|---|---|
| **Active-passive** | Primary region ingests and serves queries; secondary region receives replicated data and takes over on failure | Lower cost; higher RTO (minutes to failover) |
| **Active-active (regional)** | Each region ingests its own spans and serves local queries; cross-region queries are slower | Lower latency for regional queries; cross-region traces require federation |
| **Recommended: Active-active with regional affinity** | Spans are ingested in the region where the service runs; queries prefer local data but can federate to other regions for cross-region traces | Best latency; moderate complexity; natural disaster isolation |

### Cross-Region Trace Correlation

When a request traverses services in multiple regions, the trace context (trace ID) is propagated across regions. Each region stores its portion of the trace locally. The query service handles cross-region traces by:

1. Detecting that a trace ID exists in multiple regions (via a global trace ID index or bloom filter federation)
2. Fetching span fragments from each region in parallel
3. Assembling the complete trace in the query service
4. Caching the assembled cross-region trace for repeated access
