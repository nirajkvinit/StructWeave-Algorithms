# Scalability & Reliability

## Scalability Strategy

### Component-Level Scaling

| Component | Scaling Type | Trigger | Strategy |
|-----------|--------------|---------|----------|
| **Registry Service** | Horizontal | Read QPS > 100 | Add read replicas, load balance |
| **Dependency Service** | Horizontal | Query latency > 200ms | Neo4j read replicas, caching |
| **Health Service** | Horizontal | Model count > 500 | Partition by model tier |
| **Ground Truth Pipeline** | Horizontal | Prediction volume | Kafka partitions, parallel consumers |
| **Retrain Service** | Vertical + Queue | Concurrent jobs > 20 | Queue-based, resource limits |

### Registry Service Scaling

```mermaid
flowchart TB
    subgraph Clients["API Clients"]
        Dashboard["Dashboard"]
        CLI["CLI"]
        Services["Internal<br/>Services"]
    end

    subgraph LoadBalancer["Load Balancer"]
        LB["Application<br/>Load Balancer"]
    end

    subgraph RegistryCluster["Registry Service Cluster"]
        R1["Registry<br/>Instance 1"]
        R2["Registry<br/>Instance 2"]
        R3["Registry<br/>Instance 3"]
    end

    subgraph Database["Database Layer"]
        Primary[("PostgreSQL<br/>Primary")]
        Replica1[("Read<br/>Replica 1")]
        Replica2[("Read<br/>Replica 2")]
    end

    subgraph Cache["Cache Layer"]
        Redis[("Redis<br/>Cluster")]
    end

    Dashboard --> LB
    CLI --> LB
    Services --> LB

    LB --> R1
    LB --> R2
    LB --> R3

    R1 -->|"Writes"| Primary
    R2 -->|"Writes"| Primary
    R3 -->|"Writes"| Primary

    R1 -->|"Reads"| Replica1
    R2 -->|"Reads"| Replica2
    R3 -->|"Reads"| Replica1

    R1 --> Redis
    R2 --> Redis
    R3 --> Redis

    Primary -->|"Async Replication"| Replica1
    Primary -->|"Async Replication"| Replica2

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef lb fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef db fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class Dashboard,CLI,Services client
    class LB lb
    class R1,R2,R3 service
    class Primary,Replica1,Replica2 db
    class Redis cache
```

**Scaling Triggers:**
- CPU utilization > 70% for 5 minutes
- Response latency p99 > 200ms
- Request queue depth > 100

**Scaling Actions:**
- Add instances (horizontal)
- Increase read replica count
- Expand Redis cluster

### Ground Truth Pipeline Scaling

```mermaid
flowchart TB
    subgraph Kafka["Kafka Cluster"]
        PT0["Predictions<br/>Partition 0"]
        PT1["Predictions<br/>Partition 1"]
        PT2["Predictions<br/>Partition 2"]
        OT0["Outcomes<br/>Partition 0"]
        OT1["Outcomes<br/>Partition 1"]
        OT2["Outcomes<br/>Partition 2"]
    end

    subgraph ConsumerGroup["Consumer Group: ground-truth-join"]
        C0["Consumer 0<br/>(PT0, OT0)"]
        C1["Consumer 1<br/>(PT1, OT1)"]
        C2["Consumer 2<br/>(PT2, OT2)"]
    end

    subgraph StateStore["State Stores (RocksDB)"]
        S0["State 0"]
        S1["State 1"]
        S2["State 2"]
    end

    subgraph Output["Output"]
        Redis[("Redis<br/>Speed View")]
        S3[("S3<br/>Batch View")]
    end

    PT0 --> C0
    PT1 --> C1
    PT2 --> C2
    OT0 --> C0
    OT1 --> C1
    OT2 --> C2

    C0 --> S0
    C1 --> S1
    C2 --> S2

    C0 --> Redis
    C1 --> Redis
    C2 --> Redis

    S0 --> S3
    S1 --> S3
    S2 --> S3

    classDef kafka fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef consumer fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef state fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef output fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class PT0,PT1,PT2,OT0,OT1,OT2 kafka
    class C0,C1,C2 consumer
    class S0,S1,S2 state
    class Redis,S3 output
```

**Scaling Strategy:**
- Partition key: `model_id` (ensures predictions and outcomes for same model go to same partition)
- Initial partitions: 16
- Scale to 64 partitions at 1B predictions/day
- Consumer parallelism matches partition count

**Auto-scaling Configuration:**
```yaml
kafka:
  topics:
    predictions:
      partitions: 16
      replication_factor: 3
      retention_ms: 604800000  # 7 days
    outcomes:
      partitions: 16
      replication_factor: 3
      retention_ms: 604800000

consumer_group:
  ground_truth_join:
    min_instances: 4
    max_instances: 32
    scale_up_threshold:
      consumer_lag_seconds: 300
    scale_down_threshold:
      consumer_lag_seconds: 30
```

### Dependency Graph Scaling

```mermaid
flowchart TB
    subgraph QueryLayer["Query Layer"]
        QueryRouter["Query<br/>Router"]
    end

    subgraph Neo4jCluster["Neo4j Causal Cluster"]
        Leader["Leader<br/>(Writes)"]
        Follower1["Follower 1<br/>(Reads)"]
        Follower2["Follower 2<br/>(Reads)"]
        Follower3["Follower 3<br/>(Reads)"]
    end

    subgraph Cache["Cache Layer"]
        ImpactCache["Impact<br/>Cache"]
        LineageCache["Lineage<br/>Cache"]
    end

    QueryRouter -->|"Writes"| Leader
    QueryRouter -->|"Reads"| Follower1
    QueryRouter -->|"Reads"| Follower2
    QueryRouter -->|"Reads"| Follower3

    Leader -->|"Raft Replication"| Follower1
    Leader -->|"Raft Replication"| Follower2
    Leader -->|"Raft Replication"| Follower3

    Follower1 --> ImpactCache
    Follower2 --> LineageCache

    classDef router fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef neo4j fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef cache fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class QueryRouter router
    class Leader,Follower1,Follower2,Follower3 neo4j
    class ImpactCache,LineageCache cache
```

**Scaling Approach:**
- Neo4j Causal Cluster with 1 leader + 3 followers
- Read replicas for query load
- Materialized views for common impact queries
- Cache layer for hot paths

---

## Reliability Strategy

### Single Points of Failure (SPOF) Analysis

| Component | SPOF Risk | Mitigation |
|-----------|-----------|------------|
| Registry DB (PostgreSQL) | High | Multi-AZ primary + read replicas |
| Graph DB (Neo4j) | Medium | Causal cluster with auto-failover |
| Ground Truth Store (S3) | Low | S3 provides 11 9s durability |
| Kafka Cluster | Medium | 3-node cluster, replication factor 3 |
| Maestro Integration | High | Circuit breaker, queue retries |
| Redis Cache | Low | Redis Cluster mode, degradation to DB |

### Redundancy Architecture

```mermaid
flowchart TB
    subgraph AZ1["Availability Zone 1"]
        R1["Registry<br/>Instance"]
        G1["Ground Truth<br/>Consumer"]
        N1["Neo4j<br/>Follower"]
        K1["Kafka<br/>Broker 1"]
    end

    subgraph AZ2["Availability Zone 2"]
        R2["Registry<br/>Instance"]
        G2["Ground Truth<br/>Consumer"]
        N2["Neo4j<br/>Leader"]
        K2["Kafka<br/>Broker 2"]
    end

    subgraph AZ3["Availability Zone 3"]
        R3["Registry<br/>Instance"]
        G3["Ground Truth<br/>Consumer"]
        N3["Neo4j<br/>Follower"]
        K3["Kafka<br/>Broker 3"]
    end

    subgraph SharedStorage["Shared Storage"]
        PG[("PostgreSQL<br/>Multi-AZ")]
        S3[("S3<br/>Cross-Region")]
        Redis[("Redis<br/>Cluster")]
    end

    R1 --> PG
    R2 --> PG
    R3 --> PG

    G1 --> K1
    G2 --> K2
    G3 --> K3

    G1 --> S3
    G2 --> S3
    G3 --> S3

    R1 --> Redis
    R2 --> Redis
    R3 --> Redis

    classDef az1 fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef az2 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef az3 fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class R1,G1,N1,K1 az1
    class R2,G2,N2,K2 az2
    class R3,G3,N3,K3 az3
    class PG,S3,Redis storage
```

### Failover Mechanisms

**Registry Service Failover:**
```
HEALTH_CHECK:
  - Endpoint: /health
  - Interval: 10 seconds
  - Unhealthy threshold: 3 consecutive failures
  - Action: Remove from load balancer

DATABASE_FAILOVER:
  - Automatic failover with Multi-AZ PostgreSQL
  - Failover time: < 60 seconds
  - Application: Connection pooler handles reconnection
```

**Maestro Integration Failover:**
```
CIRCUIT_BREAKER_CONFIG:
  failure_threshold: 5        # Open after 5 failures
  success_threshold: 3        # Close after 3 successes
  timeout: 30 seconds        # Request timeout
  half_open_requests: 1      # Test requests when half-open
  reset_timeout: 60 seconds  # Time before half-open

ON_CIRCUIT_OPEN:
  - Queue retrain requests to dead letter queue
  - Alert on-call
  - Retry from queue when circuit closes
```

### Circuit Breaker Pattern

```mermaid
stateDiagram-v2
    [*] --> Closed

    Closed --> Open: Failure threshold reached
    Closed --> Closed: Success / Failure below threshold

    Open --> HalfOpen: Reset timeout elapsed
    Open --> Open: Requests fail fast

    HalfOpen --> Closed: Test request succeeds
    HalfOpen --> Open: Test request fails

    note right of Closed
        Normal operation
        Track failures
    end note

    note right of Open
        Fail fast
        Don't call dependency
    end note

    note right of HalfOpen
        Allow limited traffic
        Test if dependency recovered
    end note
```

**Implementation:**
```
CLASS CircuitBreaker:
    state = CLOSED
    failure_count = 0
    last_failure_time = null
    config = CircuitBreakerConfig

    FUNCTION Execute(operation):
        IF state == OPEN:
            IF Now() - last_failure_time > config.reset_timeout:
                state = HALF_OPEN
            ELSE:
                RAISE CircuitOpenException()

        TRY:
            result = operation()

            IF state == HALF_OPEN:
                success_count += 1
                IF success_count >= config.success_threshold:
                    state = CLOSED
                    failure_count = 0

            RETURN result

        CATCH exception:
            failure_count += 1
            last_failure_time = Now()

            IF failure_count >= config.failure_threshold:
                state = OPEN
                EmitAlert("Circuit opened for Maestro")

            RAISE exception
```

### Retry Strategies

**Exponential Backoff with Jitter:**
```
FUNCTION RetryWithBackoff(operation, max_retries=5):
    FOR attempt FROM 1 TO max_retries:
        TRY:
            RETURN operation()
        CATCH RetryableException AS e:
            IF attempt == max_retries:
                RAISE e

            // Exponential backoff with jitter
            base_delay = 1 second
            max_delay = 60 seconds
            delay = Min(base_delay * (2 ^ attempt), max_delay)
            jitter = Random(0, delay * 0.1)
            actual_delay = delay + jitter

            Sleep(actual_delay)

RETRYABLE_EXCEPTIONS:
  - ConnectionTimeout
  - ServiceUnavailable
  - RateLimitExceeded

NON_RETRYABLE_EXCEPTIONS:
  - InvalidRequest
  - AuthenticationFailed
  - ResourceNotFound
```

### Graceful Degradation

| Scenario | Degraded Behavior | User Impact |
|----------|-------------------|-------------|
| **Neo4j unavailable** | Serve from cache, disable impact analysis | No new dependency queries |
| **Ground truth delayed** | Use drift-only staleness | Less accurate staleness |
| **Maestro unavailable** | Queue retrains, manual fallback | Delayed retraining |
| **Axion unavailable** | Skip drift calculation, use age + performance | Higher staleness uncertainty |
| **Redis unavailable** | Direct DB queries | Higher latency |

**Degradation Implementation:**
```
FUNCTION GetModelDependencies(model_id):
    TRY:
        // Try primary path
        RETURN GraphDB.Query(model_id)
    CATCH GraphDBUnavailable:
        // Degraded path 1: Cache
        cached = Cache.Get(f"deps:{model_id}")
        IF cached:
            LogDegradation("Serving dependencies from cache")
            RETURN cached WITH stale_warning=True

        // Degraded path 2: Return empty with warning
        LogDegradation("Dependencies unavailable")
        RETURN EmptyDependencies() WITH unavailable_warning=True
```

### Bulkhead Pattern

Isolate different workloads to prevent cascade failures:

```mermaid
flowchart TB
    subgraph Requests["Incoming Requests"]
        DashboardReq["Dashboard<br/>Requests"]
        APIReq["API<br/>Requests"]
        InternalReq["Internal<br/>Service Calls"]
    end

    subgraph Bulkheads["Bulkhead Isolation"]
        subgraph DashBulk["Dashboard Pool"]
            DT1["Thread 1"]
            DT2["Thread 2"]
            DT3["Thread 3"]
        end
        subgraph APIBulk["API Pool"]
            AT1["Thread 1"]
            AT2["Thread 2"]
            AT3["Thread 3"]
            AT4["Thread 4"]
        end
        subgraph IntBulk["Internal Pool"]
            IT1["Thread 1"]
            IT2["Thread 2"]
        end
    end

    subgraph Backend["Backend Services"]
        Registry["Registry<br/>Service"]
        Graph["Graph<br/>Service"]
    end

    DashboardReq --> DashBulk
    APIReq --> APIBulk
    InternalReq --> IntBulk

    DashBulk --> Registry
    DashBulk --> Graph
    APIBulk --> Registry
    APIBulk --> Graph
    IntBulk --> Registry

    classDef req fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef bulk fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef backend fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class DashboardReq,APIReq,InternalReq req
    class DT1,DT2,DT3,AT1,AT2,AT3,AT4,IT1,IT2 bulk
    class Registry,Graph backend
```

**Configuration:**
```yaml
bulkheads:
  dashboard:
    max_concurrent: 50
    max_wait_time: 5s
    priority: low
  api:
    max_concurrent: 100
    max_wait_time: 10s
    priority: medium
  internal:
    max_concurrent: 30
    max_wait_time: 3s
    priority: high
```

---

## Disaster Recovery

### Recovery Objectives

| Metric | Target | Strategy |
|--------|--------|----------|
| **RTO (Recovery Time Objective)** | < 1 hour | Automated failover, hot standby |
| **RPO (Recovery Point Objective)** | < 5 minutes | Synchronous replication for critical data |

### Backup Strategy

| Data Type | Backup Frequency | Retention | Storage |
|-----------|------------------|-----------|---------|
| Registry DB | Continuous (streaming) | 30 days | Cross-region S3 |
| Graph DB | Daily snapshot | 7 days | Cross-region S3 |
| Ground Truth | N/A (source of truth is Kafka) | 7 days in Kafka | Kafka retention |
| Staleness Metrics | Daily snapshot | 90 days | S3 |
| Configuration | Git-versioned | Forever | Git repository |

### Multi-Region Considerations

```mermaid
flowchart TB
    subgraph Primary["Primary Region (us-east-1)"]
        PrimaryRunway["Runway<br/>Services"]
        PrimaryDB[("PostgreSQL<br/>Primary")]
        PrimaryGraph[("Neo4j<br/>Primary")]
        PrimaryKafka["Kafka<br/>Cluster"]
    end

    subgraph DR["DR Region (us-west-2)"]
        DRRunway["Runway<br/>Services<br/>(Standby)"]
        DRDB[("PostgreSQL<br/>Standby")]
        DRGraph[("Neo4j<br/>Standby")]
        DRKafka["Kafka<br/>MirrorMaker"]
    end

    subgraph GlobalStorage["Global Storage"]
        S3Global[("S3<br/>Cross-Region<br/>Replication")]
    end

    PrimaryDB -->|"Async Replication"| DRDB
    PrimaryGraph -->|"Async Replication"| DRGraph
    PrimaryKafka -->|"MirrorMaker"| DRKafka

    PrimaryRunway --> S3Global
    DRRunway --> S3Global

    classDef primary fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef dr fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef global fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class PrimaryRunway,PrimaryDB,PrimaryGraph,PrimaryKafka primary
    class DRRunway,DRDB,DRGraph,DRKafka dr
    class S3Global global
```

### Disaster Recovery Runbook

```
RUNBOOK: Primary Region Failure

1. DETECTION (Automated)
   - Health check failures > 3 minutes
   - Alert: "Primary region unhealthy"

2. ASSESSMENT (5 minutes)
   - Confirm region-wide outage vs service-specific
   - Check replication lag to DR

3. FAILOVER DECISION (5 minutes)
   - If lag < 5 minutes: Proceed with failover
   - If lag > 5 minutes: Assess data loss risk

4. EXECUTE FAILOVER (15 minutes)
   a. Update DNS to DR region
   b. Promote DR database to primary
   c. Start DR services
   d. Verify connectivity

5. VALIDATION (15 minutes)
   - Run smoke tests
   - Verify staleness detection working
   - Confirm Maestro integration

6. COMMUNICATION (Ongoing)
   - Status page update
   - Stakeholder notification

TOTAL RTO TARGET: < 1 hour
```

### Data Consistency During Failover

```
FUNCTION ValidatePostFailover():
    // Check registry consistency
    model_count = DRDB.Count("models")
    IF model_count == 0:
        RAISE CriticalError("No models in DR database")

    // Check graph consistency
    graph_nodes = DRGraph.Count("Model")
    IF Abs(graph_nodes - model_count) > model_count * 0.01:
        LogWarning("Graph/Registry mismatch, triggering reconciliation")
        ScheduleReconciliation()

    // Check Kafka consumer positions
    consumer_lag = Kafka.GetConsumerLag("ground_truth_join")
    IF consumer_lag > 1_hour:
        LogWarning("High consumer lag, ground truth may be delayed")

    RETURN HealthStatus(
        registry="healthy",
        graph="healthy" IF no_mismatch ELSE "degraded",
        ground_truth="healthy" IF lag < 1_hour ELSE "degraded"
    )
```

---

## Capacity Planning

### Growth Projections

| Metric | Current | Year 1 | Year 2 | Year 3 |
|--------|---------|--------|--------|--------|
| Production Models | 500 | 750 | 1,000 | 1,500 |
| Daily Predictions | 10B | 15B | 25B | 40B |
| Dependency Edges | 5,000 | 8,000 | 12,000 | 20,000 |
| Retraining Jobs/Day | 25 | 40 | 60 | 100 |

### Infrastructure Scaling Plan

| Component | Current | Year 1 | Year 2 | Year 3 |
|-----------|---------|--------|--------|--------|
| Registry Instances | 3 | 4 | 6 | 8 |
| Ground Truth Consumers | 8 | 16 | 32 | 48 |
| Neo4j Cluster Size | 4 | 4 | 6 | 8 |
| Kafka Partitions | 16 | 32 | 64 | 96 |
| PostgreSQL Size | db.r5.xlarge | db.r5.2xlarge | db.r5.4xlarge | db.r5.8xlarge |

### Cost Projections

| Category | Monthly Cost (Current) | Year 1 | Year 2 | Year 3 |
|----------|------------------------|--------|--------|--------|
| Compute | $8,000 | $12,000 | $18,000 | $28,000 |
| Storage | $3,000 | $5,000 | $8,000 | $15,000 |
| Database | $5,000 | $8,000 | $12,000 | $18,000 |
| Kafka | $4,000 | $6,000 | $10,000 | $16,000 |
| **Total** | **$20,000** | **$31,000** | **$48,000** | **$77,000** |
