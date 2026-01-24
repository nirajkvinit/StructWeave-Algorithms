# Scalability & Reliability

## Scalability Strategy

### Horizontal Scaling Architecture

FBLearner Flow scales horizontally across all layers to support 1,100+ teams and 600K+ models/month.

```mermaid
flowchart TB
    subgraph LoadBalancing["Load Balancing Layer"]
        LB1["Load Balancer 1"]
        LB2["Load Balancer 2"]
        LBN["Load Balancer N"]
    end

    subgraph APILayer["API Layer (Stateless)"]
        API1["API Server 1"]
        API2["API Server 2"]
        APIN["API Server N"]
    end

    subgraph Orchestration["Orchestration Layer (MWFS)"]
        Orch1["MWFS Node 1"]
        Orch2["MWFS Node 2"]
        OrchN["MWFS Node N"]
    end

    subgraph Compute["Compute Layer"]
        subgraph GPU["GPU Clusters"]
            GPU1["GPU Pool 1"]
            GPU2["GPU Pool 2"]
        end
        subgraph CPU["CPU Clusters"]
            CPU1["CPU Pool 1"]
            CPU2["CPU Pool 2"]
        end
    end

    subgraph Storage["Storage Layer"]
        subgraph MetadataDB["Sharded Metadata"]
            DB1[("Shard 1")]
            DB2[("Shard 2")]
            DBN[("Shard N")]
        end
        subgraph Artifacts["Artifact Storage"]
            Blob1[("Blob Store 1")]
            Blob2[("Blob Store 2")]
        end
    end

    LB1 --> API1
    LB1 --> API2
    LB2 --> API2
    LB2 --> APIN
    LBN --> APIN

    API1 --> Orch1
    API2 --> Orch2
    APIN --> OrchN

    Orch1 --> GPU1
    Orch1 --> CPU1
    Orch2 --> GPU2
    Orch2 --> CPU2

    Orch1 --> DB1
    Orch2 --> DB2
    OrchN --> DBN

    GPU1 --> Blob1
    GPU2 --> Blob2
    CPU1 --> Blob1
    CPU2 --> Blob2

    classDef lb fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef orch fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef compute fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef storage fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class LB1,LB2,LBN lb
    class API1,API2,APIN api
    class Orch1,Orch2,OrchN orch
    class GPU1,GPU2,CPU1,CPU2 compute
    class DB1,DB2,DBN,Blob1,Blob2 storage
```

### Scaling Dimensions

| Dimension | Scaling Mechanism | Trigger | Target |
|-----------|-------------------|---------|--------|
| API Servers | Horizontal (add instances) | CPU > 70% | < 100ms P99 latency |
| MWFS Nodes | Horizontal (partition by team) | Queue depth > 1000 | < 1s scheduling latency |
| GPU Workers | Horizontal (add nodes) | Queue wait > 1hr | < 30min queue time |
| CPU Workers | Horizontal (auto-scale) | Utilization > 80% | < 10min queue time |
| Database Shards | Horizontal (add shards) | Shard size > 500GB | < 50ms query P99 |
| Artifact Storage | Horizontal (geo-distributed) | Capacity planning | Unlimited |

### Database Sharding Strategy

**Shard Key: Team ID**

```
FUNCTION route_to_shard(team_id, total_shards)
    // Consistent hashing for even distribution
    hash = murmur3_hash(team_id)
    shard_index = hash % total_shards
    RETURN shard_index

// Team-specific queries hit single shard
// Cross-team queries (admin) use scatter-gather
```

**Benefits:**
- Team isolation: One team's load doesn't affect others
- Locality: All team data co-located
- Scale: Add shards as teams grow

**Trade-offs:**
- Cross-team queries require scatter-gather
- Team size imbalance may cause hot shards
- Rebalancing requires data migration

### Auto-Scaling Configuration

```yaml
# API Layer Auto-Scaling
api_autoscaler:
  min_replicas: 10
  max_replicas: 100
  metrics:
    - type: cpu
      target_utilization: 70%
    - type: request_latency_p99
      target: 100ms
  scale_up:
    cooldown: 60s
    increment: 20%
  scale_down:
    cooldown: 300s
    decrement: 10%

# GPU Pool Auto-Scaling (slower due to provisioning)
gpu_autoscaler:
  min_nodes: 1000
  max_nodes: 5000
  metrics:
    - type: queue_wait_time_p95
      target: 30m
    - type: utilization
      target: 85%
  scale_up:
    cooldown: 600s  # GPU provisioning is slow
    increment: 100 nodes
  scale_down:
    cooldown: 3600s  # Keep capacity to avoid churn
    decrement: 50 nodes
```

---

## Caching Strategy

### Multi-Layer Caching

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        SDK["SDK Cache<br/>(Local)"]
    end

    subgraph Edge["Edge Cache"]
        CDN["CDN<br/>(Static Assets)"]
    end

    subgraph API["API Layer"]
        L1["L1 Cache<br/>(In-Memory)"]
    end

    subgraph Distributed["Distributed Cache"]
        Redis["Redis Cluster<br/>(Hot Data)"]
    end

    subgraph Storage["Persistent Storage"]
        DB[("Database")]
        Blob[("Artifact Store")]
    end

    SDK --> CDN
    CDN --> L1
    L1 --> Redis
    Redis --> DB
    Redis --> Blob

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef api fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef distributed fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef storage fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class SDK client
    class CDN edge
    class L1 api
    class Redis distributed
    class DB,Blob storage
```

### Cache Usage by Data Type

| Data Type | Cache Layer | TTL | Invalidation |
|-----------|-------------|-----|--------------|
| Type Registry | CDN + L1 | 1 hour | Version-based |
| Workflow Definitions | Redis | 15 min | On update |
| Execution Status | L1 | 5 sec | Real-time events |
| Feature Statistics | Redis | 1 hour | Daily refresh |
| Model Metadata | Redis | 30 min | On deployment |
| Artifact Hashes | L1 + Redis | Permanent | Content-addressed (never changes) |

### Hot Spot Mitigation

```
ALGORITHM MitigateHotSpots(cache, request)
    key = request.cache_key

    // Check if key is hot (high access rate)
    access_rate = get_access_rate(key)

    IF access_rate > HOT_THRESHOLD:
        // Replicate hot key across multiple cache nodes
        replica_count = min(access_rate / HOT_THRESHOLD, MAX_REPLICAS)
        replicated_keys = create_replicas(key, replica_count)

        // Randomly select a replica to spread load
        selected_key = random_choice(replicated_keys)
        RETURN cache.get(selected_key)
    ELSE:
        RETURN cache.get(key)

// For extremely hot data (e.g., popular model metadata)
// Use read-through cache with local in-memory copy
```

---

## Fault Tolerance

### Single Points of Failure (SPOF) Analysis

| Component | SPOF Risk | Mitigation |
|-----------|-----------|------------|
| API Layer | Low | Multiple stateless instances behind LB |
| MWFS Orchestrator | Medium | Active-passive with leader election |
| Database | Low (post-MWFS) | Sharded, replicated within shard |
| Artifact Store | Low | Distributed object storage with replication |
| Type Registry | Medium | Cached at multiple layers, readonly |
| GPU Scheduler | Medium | Multiple scheduler instances, partitioned |

### Redundancy Strategy

```mermaid
flowchart TB
    subgraph Primary["Primary Data Center"]
        API1["API Cluster"]
        MWFS1["MWFS Cluster"]
        DB1[("Primary DB")]
        GPU1["GPU Pool"]
    end

    subgraph Secondary["Secondary Data Center"]
        API2["API Cluster"]
        MWFS2["MWFS Cluster"]
        DB2[("Replica DB")]
        GPU2["GPU Pool"]
    end

    subgraph Global["Global Services"]
        Artifacts[("Artifact Store<br/>(Geo-Replicated)")]
        TypeReg["Type Registry<br/>(Cached)"]
    end

    API1 <-->|"Active-Active"| API2
    MWFS1 <-->|"Active-Passive"| MWFS2
    DB1 -->|"Async Replication"| DB2

    API1 --> Artifacts
    API2 --> Artifacts
    MWFS1 --> TypeReg
    MWFS2 --> TypeReg

    classDef primary fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef secondary fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef global fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class API1,MWFS1,DB1,GPU1 primary
    class API2,MWFS2,DB2,GPU2 secondary
    class Artifacts,TypeReg global
```

### Failover Mechanisms

**API Layer Failover:**
```
ALGORITHM APIFailover(request)
    primary_endpoints = get_healthy_endpoints(PRIMARY_DC)

    IF primary_endpoints.not_empty():
        RETURN route_to(random_choice(primary_endpoints))

    // Primary DC unavailable
    secondary_endpoints = get_healthy_endpoints(SECONDARY_DC)

    IF secondary_endpoints.not_empty():
        log_failover_event(PRIMARY_DC, SECONDARY_DC)
        RETURN route_to(random_choice(secondary_endpoints))

    // Both DCs unavailable
    RETURN ServiceUnavailableError()
```

**MWFS Leader Election:**
```
ALGORITHM MWFSLeaderElection(nodes)
    // Using distributed consensus (e.g., Raft/Paxos)
    current_term = get_current_term()

    WHILE TRUE:
        leader = elect_leader(nodes, current_term)

        IF leader == self:
            // I am the leader
            start_processing_workflows()
            send_heartbeats_to_followers()
        ELSE:
            // I am a follower
            replicate_state_from_leader(leader)
            wait_for_leader_heartbeat(timeout=5s)

            IF heartbeat_timeout:
                // Leader may have failed
                current_term += 1
                CONTINUE  // Start new election
```

### Circuit Breaker Pattern

```
ALGORITHM CircuitBreaker(service_call, config)
    state = get_circuit_state(service_call.service_name)

    SWITCH state:
        CASE CLOSED:
            TRY:
                result = execute(service_call)
                record_success(service_call.service_name)
                RETURN result
            CATCH error:
                record_failure(service_call.service_name)
                IF failure_count > config.failure_threshold:
                    open_circuit(service_call.service_name)
                RAISE error

        CASE OPEN:
            IF time_since_opened > config.reset_timeout:
                set_state(service_call.service_name, HALF_OPEN)
                // Fall through to HALF_OPEN
            ELSE:
                RAISE CircuitOpenError("Service unavailable")

        CASE HALF_OPEN:
            TRY:
                result = execute(service_call)
                close_circuit(service_call.service_name)
                RETURN result
            CATCH error:
                open_circuit(service_call.service_name)
                RAISE error

// Configuration per service
circuit_configs = {
    "database": {failure_threshold: 5, reset_timeout: 30s},
    "gpu_scheduler": {failure_threshold: 3, reset_timeout: 60s},
    "feature_store": {failure_threshold: 10, reset_timeout: 15s}
}
```

### Retry Strategy with Exponential Backoff

```
ALGORITHM RetryWithBackoff(operation, config)
    attempt = 0

    WHILE attempt < config.max_retries:
        TRY:
            RETURN operation()
        CATCH RetryableError as error:
            attempt += 1

            IF attempt >= config.max_retries:
                RAISE MaxRetriesExceededError(error)

            // Exponential backoff with jitter
            base_delay = config.initial_delay * (2 ^ attempt)
            jitter = random(0, base_delay * 0.1)
            delay = min(base_delay + jitter, config.max_delay)

            log(f"Retry {attempt}/{config.max_retries} after {delay}ms")
            sleep(delay)

// Retry configuration
retry_configs = {
    "operator_execution": {
        max_retries: 3,
        initial_delay: 1000ms,
        max_delay: 30000ms,
        retryable_errors: [TimeoutError, ResourceUnavailableError]
    },
    "artifact_upload": {
        max_retries: 5,
        initial_delay: 500ms,
        max_delay: 60000ms,
        retryable_errors: [NetworkError, StorageTemporaryError]
    }
}
```

### Graceful Degradation

```mermaid
flowchart TB
    subgraph Normal["Normal Operation"]
        Full["Full Functionality"]
    end

    subgraph Degraded["Degraded Modes"]
        NoPreview["No Dataset Previews"]
        NoStats["No Feature Statistics"]
        QueueOnly["Queue-Only Mode"]
        ReadOnly["Read-Only Mode"]
    end

    subgraph Failure["Failure Triggers"]
        F1["Preview Service Down"]
        F2["Stats Service Down"]
        F3["Scheduler Overloaded"]
        F4["Database Failover"]
    end

    Full --> NoPreview
    Full --> NoStats
    Full --> QueueOnly
    Full --> ReadOnly

    F1 -.-> NoPreview
    F2 -.-> NoStats
    F3 -.-> QueueOnly
    F4 -.-> ReadOnly

    classDef normal fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef degraded fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef failure fill:#ffebee,stroke:#c62828,stroke-width:2px

    class Full normal
    class NoPreview,NoStats,QueueOnly,ReadOnly degraded
    class F1,F2,F3,F4 failure
```

**Degradation Policies:**

| Trigger | Degradation Mode | User Impact | Auto-Recovery |
|---------|------------------|-------------|---------------|
| Preview service down | Disable dataset previews | Minor - can still launch | Yes, on health check pass |
| Stats service down | Show cached stats only | Minor - stale stats | Yes, on health check pass |
| Scheduler overloaded | Queue-only mode | Medium - delayed starts | Yes, when queue drains |
| Database failover | Read-only mode | High - no new workflows | Yes, on failover complete |
| GPU exhaustion | CPU-only mode | High - no GPU training | Manual - capacity planning |

---

## Disaster Recovery

### RTO and RPO Targets

| Component | RTO | RPO | Mechanism |
|-----------|-----|-----|-----------|
| Workflow Metadata | 1 hour | 0 (sync replication) | Cross-DC sync replication |
| Execution State | 4 hours | 15 minutes | Async replication + logs |
| Artifacts | 8 hours | 0 | Geo-replicated object storage |
| Type Registry | 30 minutes | 0 | Cached + backed by DB |
| Running Jobs | N/A | Checkpoint interval | Checkpoint-based recovery |

### Backup Strategy

```
BACKUP_SCHEDULE = {
    "workflow_metadata": {
        frequency: "continuous",
        retention: "90 days",
        type: "incremental"
    },
    "execution_state": {
        frequency: "hourly",
        retention: "30 days",
        type: "snapshot"
    },
    "artifacts": {
        frequency: "on_write",
        retention: "1 year",
        type: "replicated"
    },
    "full_backup": {
        frequency: "weekly",
        retention: "1 year",
        type: "full"
    }
}
```

### Recovery Procedures

**Scenario 1: Single Shard Failure**
```
1. Detect shard unavailable (automated monitoring)
2. Route traffic to replica shard
3. Promote replica to primary
4. Provision new replica
5. Resync data to new replica
6. Update routing table

Estimated RTO: 5-15 minutes (automated)
```

**Scenario 2: Full Data Center Failure**
```
1. Detect DC failure (multiple service health checks)
2. Trigger DNS failover to secondary DC
3. Promote secondary DB replicas to primary
4. Scale up secondary DC capacity
5. Resume operations in secondary DC
6. Queue non-critical workloads until capacity restored

Estimated RTO: 30-60 minutes
```

**Scenario 3: Artifact Store Corruption**
```
1. Detect corruption (checksum validation)
2. Identify affected artifacts
3. Restore from geo-replicated copy
4. Validate restored artifacts
5. Invalidate caches
6. Notify affected workflows

Estimated RTO: 1-4 hours depending on data volume
```

### Multi-Region Considerations

```mermaid
flowchart TB
    subgraph US["US Region"]
        US_API["API"]
        US_MWFS["MWFS"]
        US_DB[("DB Primary")]
        US_GPU["GPU Pool"]
    end

    subgraph EU["EU Region"]
        EU_API["API"]
        EU_MWFS["MWFS"]
        EU_DB[("DB Replica")]
        EU_GPU["GPU Pool"]
    end

    subgraph Global["Global"]
        GlobalDNS["GeoDNS"]
        ArtifactStore[("Geo-Replicated<br/>Artifact Store")]
    end

    GlobalDNS --> US_API
    GlobalDNS --> EU_API

    US_DB -->|"Async Replication"| EU_DB

    US_API --> ArtifactStore
    EU_API --> ArtifactStore

    US_GPU --> US_MWFS
    EU_GPU --> EU_MWFS

    classDef us fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef eu fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef global fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class US_API,US_MWFS,US_DB,US_GPU us
    class EU_API,EU_MWFS,EU_DB,EU_GPU eu
    class GlobalDNS,ArtifactStore global
```

**Cross-Region Trade-offs:**

| Aspect | Within Region | Cross-Region |
|--------|---------------|--------------|
| Latency | < 10ms | 50-150ms |
| Consistency | Strong | Eventual |
| Failover | Automatic | Manual/Semi-auto |
| Cost | Lower | Higher (egress) |
