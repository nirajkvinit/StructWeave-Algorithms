# Requirements & Capacity Estimations

[← Back to Index](./00-index.md) | [Next: High-Level Design →](./02-high-level-design.md)

---

## Functional Requirements

### P0 - Must Have (Core)

| Requirement | Description |
|-------------|-------------|
| **Global Read/Write** | Users can read and write data from any region with low latency |
| **Conflict Resolution** | System automatically resolves concurrent writes to the same data |
| **Regional Failover** | Traffic automatically reroutes when a region becomes unavailable |
| **Data Convergence** | All regions eventually converge to the same state |
| **Consistency Options** | Support multiple consistency levels per operation |

### P1 - Should Have (Important)

| Requirement | Description |
|-------------|-------------|
| **Read-Your-Writes** | Users see their own writes immediately within a session |
| **Causal Consistency** | Related operations are seen in correct order |
| **Conflict Visibility** | Ability to track and audit conflict resolutions |
| **Selective Sync** | Control which data replicates to which regions |
| **Schema Evolution** | Support backward-compatible schema changes without downtime |

### P2 - Nice to Have (Enhancement)

| Requirement | Description |
|-------------|-------------|
| **Cross-Region Transactions** | Multi-key transactions spanning regions (with latency cost) |
| **Data Residency Controls** | Keep specific data in designated regions only |
| **Conflict Callbacks** | Application-defined conflict resolution hooks |
| **Time-Travel Queries** | Read data as of a specific timestamp |

---

## Out of Scope

| Exclusion | Reason |
|-----------|--------|
| Strict serializability everywhere | Would require synchronous cross-region coordination |
| Sub-10ms cross-region latency | Physics constraint (speed of light) |
| Zero-downtime region addition | Requires careful data migration (handled operationally) |
| Arbitrary transaction support | Would require distributed locks across regions |

---

## Non-Functional Requirements

### Performance

| Metric | Target | Notes |
|--------|--------|-------|
| **Local read latency (p50)** | < 10ms | From regional data cluster |
| **Local read latency (p99)** | < 50ms | Under normal load |
| **Local write latency (p50)** | < 20ms | Async replication, local commit only |
| **Local write latency (p99)** | < 100ms | Under normal load |
| **Cross-region read (p50)** | < 150ms | When querying remote region |
| **Cross-region write (p99)** | < 300ms | For GLOBAL_QUORUM consistency |
| **Replication lag (p50)** | < 100ms | Region-to-region propagation |
| **Replication lag (p99)** | < 500ms | During normal operation |

### Availability

| Metric | Target | Notes |
|--------|--------|-------|
| **System availability** | 99.999% | 5 nines (~5 min downtime/year) |
| **Regional availability** | 99.99% | Per-region target |
| **Failover time (RTO)** | < 30 seconds | Automatic detection and rerouting |
| **Data loss window (RPO)** | < replication lag | Typically < 500ms |

### Scalability

| Metric | Target | Notes |
|--------|--------|-------|
| **Regions supported** | 3-10 | Full mesh up to 5, hierarchical beyond |
| **QPS per region** | 100,000+ | Read and write combined |
| **Storage per region** | 10+ TB | Full dataset replica |
| **Concurrent connections** | 100,000+ per region | With connection pooling |

### Reliability

| Metric | Target | Notes |
|--------|--------|-------|
| **Durability** | 99.999999999% | 11 nines with cross-region replication |
| **Consistency convergence** | < 5 seconds | All regions consistent after writes stop |
| **Partition tolerance** | Required | System operates during network partitions |

---

## Capacity Estimations

### Assumptions

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Number of regions** | 3 | US-East, EU-West, APAC |
| **Active users (DAU)** | 50 million | Global user base |
| **Requests per user per day** | 100 | Mix of reads and writes |
| **Read:Write ratio** | 80:20 | Read-heavy workload |
| **Average record size** | 2 KB | Including metadata |
| **Records per user** | 500 | User data, preferences, content |
| **Peak traffic multiplier** | 3x | During peak hours |
| **Data growth rate** | 20% annually | New users + more data |

### Traffic Calculations

**Daily requests:**
```
Total daily requests = 50M users × 100 requests/user
                     = 5 billion requests/day
```

**QPS (average):**
```
Average QPS = 5B requests / 86,400 seconds
            = ~58,000 QPS globally
            ≈ 19,300 QPS per region (evenly distributed)
```

**QPS (peak):**
```
Peak QPS = 58,000 × 3x multiplier
         = ~174,000 QPS globally
         ≈ 58,000 QPS per region
```

**By operation type:**
```
Read QPS (peak)  = 58,000 × 0.8 = 46,400 per region
Write QPS (peak) = 58,000 × 0.2 = 11,600 per region
```

### Storage Calculations

**Total data volume:**
```
Total records = 50M users × 500 records/user
              = 25 billion records

Total storage = 25B records × 2 KB/record
              = 50 TB (raw data)

With metadata overhead (30%):
              = 50 TB × 1.3
              = 65 TB per region
```

**Storage growth (5 years):**
```
Year 1: 65 TB × 1.0 = 65 TB
Year 2: 65 TB × 1.2 = 78 TB
Year 3: 65 TB × 1.44 = 94 TB
Year 4: 65 TB × 1.73 = 112 TB
Year 5: 65 TB × 2.07 = 135 TB per region
```

### Replication Bandwidth

**Write volume:**
```
Write throughput = 11,600 writes/sec × 2 KB/write
                 = 23.2 MB/sec per region (outbound)
```

**Cross-region replication:**
```
Per region pair bandwidth = 23.2 MB/sec
Total replication (full mesh, 3 regions):
  = 23.2 MB/sec × 2 peers × 3 regions
  = 139.2 MB/sec total cross-region traffic
  = ~1.2 TB/day replication traffic
```

**Peak replication:**
```
Peak bandwidth = 139.2 MB/sec × 3x
               = 417.6 MB/sec
               = ~3.3 Gbps cross-region links required
```

### Vector Clock / CRDT Overhead

**Vector clock size:**
```
Per-record overhead = 8 bytes × 3 regions (timestamps)
                    = 24 bytes per record
Total overhead = 25B records × 24 bytes
               = 600 GB additional storage per region
```

**CRDT state (for OR-Set example):**
```
Average elements per set = 50
Unique tags per element = 5 (historical adds)
Tag size = 32 bytes (region_id + timestamp + uuid)

Per-set overhead = 50 × 5 × 32 bytes = 8 KB
For 1B sets = 8 PB (requires garbage collection!)
```

### Cache Sizing

**Hot data assumption:** 10% of data accessed frequently

```
Hot dataset = 65 TB × 10% = 6.5 TB per region
Cache size (with 3x for working set) = 6.5 TB / 3
                                     ≈ 2.2 TB cache per region
```

### Connection Estimates

```
Concurrent users (peak) = 50M DAU × 5% concurrent
                        = 2.5 million concurrent globally
                        ≈ 833,000 per region

With connection pooling (10:1 ratio):
Database connections = 83,300 per region
```

---

## Capacity Summary Table

| Metric | Per Region | Global (3 regions) |
|--------|------------|-------------------|
| **QPS (average)** | 19,300 | 58,000 |
| **QPS (peak)** | 58,000 | 174,000 |
| **Write QPS (peak)** | 11,600 | 34,800 |
| **Storage (Year 1)** | 65 TB | 195 TB (replicated) |
| **Storage (Year 5)** | 135 TB | 405 TB (replicated) |
| **Replication bandwidth** | 23.2 MB/sec out | 139.2 MB/sec total |
| **Peak bandwidth** | 69.6 MB/sec out | 417.6 MB/sec total |
| **Cache size** | 2.2 TB | 6.6 TB |
| **Concurrent connections** | 833,000 | 2.5 million |
| **Database connections** | 83,300 | 250,000 |

---

## SLO / SLA Definitions

### Service Level Objectives (SLOs)

| Metric | Objective | Measurement Window |
|--------|-----------|-------------------|
| **Availability** | 99.99% | Monthly, per region |
| **Global availability** | 99.999% | Monthly, any region serving |
| **Read latency (p99)** | < 50ms | 5-minute rolling window |
| **Write latency (p99)** | < 100ms | 5-minute rolling window |
| **Replication lag (p99)** | < 500ms | 1-minute rolling window |
| **Conflict rate** | < 0.1% of writes | Daily |
| **Data convergence** | < 5 seconds | After partition heal |
| **Failover time** | < 30 seconds | Per incident |

### Service Level Agreements (SLAs)

| Tier | Availability | Latency (p99) | Credits |
|------|--------------|---------------|---------|
| **Standard** | 99.9% | < 200ms | 10% below threshold |
| **Premium** | 99.99% | < 100ms | 25% below threshold |
| **Enterprise** | 99.999% | < 50ms local | 50% below threshold |

### Error Budget Calculation

```
Monthly error budget (99.99%) = 30 days × 24 hours × 60 min × 0.01%
                              = 4.32 minutes/month

Quarterly error budget = 4.32 × 3 = 12.96 minutes

Burn rate alert thresholds:
  - Warning: 2x normal rate (budget exhausted in 15 days)
  - Critical: 10x normal rate (budget exhausted in 3 days)
```

---

## Regional Deployment Considerations

### Region Selection Criteria

| Factor | Weight | Considerations |
|--------|--------|----------------|
| **User proximity** | High | Majority of users should be within 50ms |
| **Inter-region latency** | High | Pairs should be < 150ms apart |
| **Regulatory requirements** | Medium | Data residency laws (GDPR, etc.) |
| **Infrastructure availability** | Medium | Multiple zones per region |
| **Cost** | Low | Data transfer costs vary by provider |

### Recommended Initial Regions

| Region | Location | Primary User Base | Inter-Region Latency |
|--------|----------|-------------------|---------------------|
| **US-East** | Virginia | North/South America | - |
| **EU-West** | Ireland/Frankfurt | Europe, Middle East | ~80ms to US-East |
| **APAC** | Singapore/Tokyo | Asia-Pacific | ~180ms to US-East |

### Capacity per Region (2N Redundancy)

Each region must be sized to handle 100% of global traffic if other regions fail:

```
Required capacity per region = Global peak QPS
                             = 174,000 QPS

Normal operation (3 regions): 58,000 QPS each (33% utilization)
N+1 failover (2 regions):     87,000 QPS each (50% utilization)
N+2 failover (1 region):      174,000 QPS (100% utilization)
```

---

[← Back to Index](./00-index.md) | [Next: High-Level Design →](./02-high-level-design.md)
