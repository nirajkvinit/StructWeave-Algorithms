# Scalability & Reliability

[← Back to Index](./00-index.md)

---

## Scalability

### Horizontal vs Vertical Scaling

| Approach | When to Use | Limits |
|----------|-------------|--------|
| **Vertical** | Early stage, simple deployment | Single machine memory/CPU |
| **Horizontal** | Production scale (>50K QPS) | Coordination overhead |

**Recommendation:** Start vertical, scale horizontally when single node reaches 70% capacity.

### Rate Limiter Service Scaling

```mermaid
flowchart TB
    subgraph LB["Load Balancer"]
        HAProxy[HAProxy/Nginx]
    end

    subgraph Tier1["Rate Limiter Tier (Stateless)"]
        RL1[RL Instance 1]
        RL2[RL Instance 2]
        RL3[RL Instance N]
    end

    HAProxy --> RL1 & RL2 & RL3

    subgraph Redis["Redis Cluster"]
        R1[(Shard 1)]
        R2[(Shard 2)]
        R3[(Shard N)]
    end

    RL1 & RL2 & RL3 --> R1 & R2 & R3
```

**Scaling triggers:**

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU utilization | > 70% sustained | Add rate limiter nodes |
| Request latency (p99) | > 5ms | Add nodes or optimize |
| Redis memory | > 70% | Add shards or evict |
| Request queue depth | > 100 | Add nodes |

### Auto-Scaling Configuration

```
// Rate Limiter Service Auto-scaling
min_instances: 3
max_instances: 50
target_cpu_utilization: 60%
scale_up_cooldown: 60 seconds
scale_down_cooldown: 300 seconds

// Scale-up: Add 25% capacity
// Scale-down: Remove 10% capacity (conservative)
```

### Database (Redis) Scaling

**Strategy 1: Read Replicas**

```mermaid
flowchart LR
    subgraph Primary
        P[(Primary)]
    end

    subgraph Replicas
        R1[(Replica 1)]
        R2[(Replica 2)]
        R3[(Replica 3)]
    end

    P -->|Async Replication| R1 & R2 & R3

    RL[Rate Limiter] -->|Writes| P
    RL -->|Reads| R1 & R2 & R3
```

**Use Case:** Read-heavy config lookups, NOT for counter reads (stale data).

**Strategy 2: Sharding (Recommended)**

```mermaid
flowchart TB
    RL[Rate Limiter]

    subgraph Sharding["Consistent Hash Ring"]
        Hash[hash(user_id) % shards]
    end

    subgraph Shards["Redis Shards"]
        S1[(Shard 1<br/>users 0-33%)]
        S2[(Shard 2<br/>users 34-66%)]
        S3[(Shard 3<br/>users 67-100%)]
    end

    RL --> Hash
    Hash --> S1 & S2 & S3
```

**Sharding considerations:**
- Shard by user/API key for even distribution
- Avoid sharding by endpoint (hot spots)
- Use consistent hashing for minimal reshuffling

**Strategy 3: Redis Cluster Mode**

Native Redis Cluster with automatic sharding and failover.

```
Cluster Configuration:
- 6 nodes minimum (3 primaries + 3 replicas)
- 16384 hash slots distributed across primaries
- Automatic failover when primary dies
- Client-side routing with MOVED redirects
```

### Caching Layers

```mermaid
flowchart LR
    subgraph L1["L1: Process Cache"]
        PC[In-Memory<br/>TTL: 100ms<br/>Size: 10K keys]
    end

    subgraph L2["L2: Local Cache"]
        LC[Per-Node Cache<br/>TTL: 500ms<br/>Size: 100K keys]
    end

    subgraph L3["L3: Distributed"]
        Redis[(Redis<br/>Source of Truth)]
    end

    Request --> PC
    PC -->|Miss| LC
    LC -->|Miss| Redis
    Redis --> LC --> PC --> Response
```

**Cache hit rates target:**
- L1: 30-40% (very hot keys)
- L2: 50-60% (warm keys)
- Overall: 70-80% Redis bypass

### Hot Spot Mitigation

**Problem:** A single user/key gets disproportionate traffic.

**Solutions:**

| Solution | Implementation | Effectiveness |
|----------|----------------|---------------|
| **Key spreading** | `key:user:shard:{rand(4)}` | High, but aggregation needed |
| **Local counting** | Aggregate locally, sync batched | High, slight accuracy loss |
| **Dedicated shard** | Route hot keys to beefier shard | Medium, operational overhead |
| **Rate limit the rate limiter** | Cap checks per key | Medium, may miss attacks |

```
// Local counting with periodic sync
FUNCTION increment_with_local_aggregation(key, cost):
    local_count = local_cache.increment(key, cost)

    IF local_count >= SYNC_THRESHOLD OR time_since_sync > SYNC_INTERVAL THEN
        global_count = redis.incrby(key, local_count)
        local_cache.reset(key)
        RETURN global_count

    RETURN estimated_global_count(key)
```

---

## Reliability & Fault Tolerance

### Single Points of Failure (SPOF) Analysis

| Component | SPOF? | Mitigation |
|-----------|-------|------------|
| Rate Limiter Service | No | Multiple stateless instances |
| Redis Primary | Yes | Replicas + automatic failover |
| Config Store | Yes | Replicate, cache aggressively |
| Network | Yes | Multi-AZ, redundant paths |
| Load Balancer | Yes | Active-passive pair |

### Redundancy Strategy

```mermaid
flowchart TB
    subgraph AZ1["Availability Zone 1"]
        RL1[Rate Limiter]
        RP1[(Redis Primary)]
    end

    subgraph AZ2["Availability Zone 2"]
        RL2[Rate Limiter]
        RR1[(Redis Replica)]
    end

    subgraph AZ3["Availability Zone 3"]
        RL3[Rate Limiter]
        RR2[(Redis Replica)]
    end

    RP1 --> RR1 & RR2
    LB[Load Balancer] --> RL1 & RL2 & RL3
```

**Redundancy levels:**
- Rate Limiter: N+2 (survive 2 node failures)
- Redis: 1 primary + 2 replicas per shard
- Config: 3-node quorum cluster

### Failover Mechanisms

**Redis Sentinel Failover:**

```mermaid
sequenceDiagram
    participant S1 as Sentinel 1
    participant S2 as Sentinel 2
    participant S3 as Sentinel 3
    participant P as Primary
    participant R as Replica

    P->>S1: Heartbeat
    P->>S2: Heartbeat
    P->>S3: Heartbeat

    Note over P: Primary fails

    S1->>S2: Primary unreachable?
    S2->>S3: Primary unreachable?

    Note over S1,S3: Quorum agrees: failover

    S1->>R: SLAVEOF NO ONE
    R->>R: Become Primary

    S1->>S2: New primary: Replica
    S2->>S3: New primary: Replica
```

**Failover timeline:**
- Detection: 5-10 seconds (sentinel down-after-milliseconds)
- Election: 1-2 seconds
- Promotion: < 1 second
- **Total:** 10-15 seconds (requests fail-open during this window)

### Circuit Breaker Pattern

```mermaid
stateDiagram-v2
    [*] --> Closed

    Closed --> Open: failures >= threshold
    Open --> HalfOpen: timeout expires
    HalfOpen --> Closed: probe succeeds
    HalfOpen --> Open: probe fails

    note right of Closed: Normal operation<br/>Requests go to Redis
    note right of Open: Redis failing<br/>Fail-open or use fallback
    note right of HalfOpen: Testing recovery<br/>Limited traffic to Redis
```

**Configuration:**

```
CircuitBreaker {
    failure_threshold: 5          // Open after 5 failures
    success_threshold: 2          // Close after 2 successes in half-open
    timeout: 30 seconds           // Time in open state before trying again
    half_open_max_calls: 3        // Max calls to test in half-open
}
```

### Retry Strategy

```
FUNCTION rate_limit_with_retry(request):
    FOR attempt IN 1..MAX_RETRIES:
        TRY
            result = check_rate_limit(request)
            RETURN result
        CATCH TransientError
            IF attempt < MAX_RETRIES THEN
                delay = BASE_DELAY * (2 ^ attempt) + jitter()
                SLEEP(delay)
            ELSE
                RETURN fail_open_response()

// Exponential backoff with jitter
BASE_DELAY = 10ms
MAX_RETRIES = 3
// Delays: ~10ms, ~20ms, ~40ms (with ±25% jitter)
```

**Important:** Retries add latency. For rate limiting, prefer fail-open over multiple retries.

### Graceful Degradation

| Severity | Condition | Degradation |
|----------|-----------|-------------|
| **Level 0** | All healthy | Full functionality |
| **Level 1** | High latency | Disable secondary checks |
| **Level 2** | Partial Redis failure | Use local-only limits |
| **Level 3** | Full Redis failure | Fail-open with logging |
| **Level 4** | Config store failure | Use cached/default limits |

```
FUNCTION degraded_rate_limit(request, health_level):
    SWITCH health_level:
        CASE 0:
            RETURN full_rate_limit(request)
        CASE 1:
            RETURN fast_rate_limit(request)  // Skip secondary checks
        CASE 2:
            RETURN local_rate_limit(request) // Per-node limits only
        CASE 3:
            log.warn("Rate limiting disabled")
            RETURN {allowed: true}
        CASE 4:
            RETURN rate_limit_with_defaults(request)
```

### Bulkhead Pattern

Isolate failures to prevent cascade:

```mermaid
flowchart TB
    subgraph Bulkhead1["Bulkhead: Premium Users"]
        TP[Thread Pool: 100]
        RP[(Redis Connection Pool: 50)]
    end

    subgraph Bulkhead2["Bulkhead: Free Users"]
        TF[Thread Pool: 50]
        RF[(Redis Connection Pool: 25)]
    end

    Premium[Premium Requests] --> TP --> RP
    Free[Free Requests] --> TF --> RF

    Note1[Premium users unaffected<br/>if free tier overwhelmed]
```

---

## Disaster Recovery

### Recovery Objectives

| Metric | Target | Justification |
|--------|--------|---------------|
| **RTO** (Recovery Time Objective) | 5 minutes | Rate limiting can fail-open briefly |
| **RPO** (Recovery Point Objective) | 1 minute | Counter data is ephemeral |

### Backup Strategy

| Data Type | Backup Frequency | Retention | Method |
|-----------|------------------|-----------|--------|
| Configuration | Every change + hourly | 30 days | Snapshot to object storage |
| User tiers | Hourly | 30 days | Database backup |
| Counter data | Not backed up | N/A | Ephemeral, regenerates |
| Audit logs | Daily | 1 year | Archive to cold storage |

### Multi-Region Considerations

```mermaid
flowchart TB
    subgraph Region1["US-East (Primary)"]
        R1RL[Rate Limiters]
        R1Redis[(Redis Primary)]
        R1Config[(Config Primary)]
    end

    subgraph Region2["US-West (Secondary)"]
        R2RL[Rate Limiters]
        R2Redis[(Redis Replica)]
        R2Config[(Config Replica)]
    end

    subgraph Region3["EU (Secondary)"]
        R3RL[Rate Limiters]
        R3Redis[(Redis Replica)]
        R3Config[(Config Replica)]
    end

    R1Redis -->|Async| R2Redis
    R1Redis -->|Async| R3Redis
    R1Config -->|Sync| R2Config & R3Config

    DNS[GeoDNS] --> R1RL & R2RL & R3RL
```

**Active-Active Multi-Region:**

| Approach | Consistency | Latency | Complexity |
|----------|-------------|---------|------------|
| **Single-primary writes** | Strong | High for remote | Low |
| **Local writes, async sync** | Eventual | Low | Medium |
| **CRDT counters** | Eventual | Low | High |
| **Hierarchical quotas** | Eventual | Low | Medium |

**Recommended: Hierarchical Quotas**

```
Global Limit: 10,000 req/min per user

US-East quota: 4,000 req/min (40%)
US-West quota: 3,000 req/min (30%)
EU quota: 3,000 req/min (30%)

// Quotas rebalanced hourly based on actual traffic patterns
```

### Disaster Recovery Runbook

**Scenario: Primary region failure**

1. **Detection** (0-2 min)
   - Health checks fail
   - Alerts trigger

2. **Decision** (2-3 min)
   - Assess scope (partial vs full)
   - Decide: failover vs wait

3. **Failover** (3-5 min)
   - Update DNS to route traffic to secondary
   - Promote secondary Redis to primary
   - Verify config replication

4. **Verification** (5-7 min)
   - Check rate limiting is functional
   - Verify metrics flowing
   - Confirm no widespread 429s

5. **Communication** (7-10 min)
   - Update status page
   - Notify on-call
   - Begin RCA

---

## Capacity Planning

### Growth Projections

| Metric | Current | 6 Months | 1 Year | 2 Years |
|--------|---------|----------|--------|---------|
| QPS | 100K | 200K | 500K | 1M |
| Users | 10M | 20M | 50M | 100M |
| Redis Memory | 20GB | 40GB | 100GB | 200GB |
| Rate Limiter Nodes | 10 | 20 | 40 | 80 |

### Scaling Checkpoints

```mermaid
flowchart LR
    subgraph Phase1["Phase 1: 0-100K QPS"]
        P1[Single Redis<br/>5 RL nodes]
    end

    subgraph Phase2["Phase 2: 100K-500K QPS"]
        P2[Redis Cluster<br/>20 RL nodes<br/>Local caching]
    end

    subgraph Phase3["Phase 3: 500K-1M QPS"]
        P3[Sharded Redis<br/>50 RL nodes<br/>Hierarchical limits]
    end

    subgraph Phase4["Phase 4: 1M+ QPS"]
        P4[Multi-region<br/>Edge caching<br/>100+ nodes]
    end

    Phase1 --> Phase2 --> Phase3 --> Phase4
```
