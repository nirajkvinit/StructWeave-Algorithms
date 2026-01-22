# Scalability & Reliability

[Back to Index](./00-index.md) | [Previous: Deep Dive](./04-deep-dive-and-bottlenecks.md) | [Next: Security](./06-security-and-compliance.md)

---

## Scalability Strategy

### Multi-Region Architecture

```mermaid
flowchart TB
    subgraph GlobalInfra["Global Infrastructure"]
        subgraph ControlPlane["Control Plane (Multi-Region Active-Active)"]
            CP_US["Control Plane US"]
            CP_EU["Control Plane EU"]
            CP_AP["Control Plane APAC"]

            CP_US <--> CP_EU
            CP_EU <--> CP_AP
            CP_AP <--> CP_US
        end

        subgraph EdgeNetwork["Edge Network (300+ PoPs)"]
            subgraph Region_NA["North America (80 PoPs)"]
                PoP_SJC["SJC"]
                PoP_LAX["LAX"]
                PoP_ORD["ORD"]
                PoP_IAD["IAD"]
            end

            subgraph Region_EU["Europe (70 PoPs)"]
                PoP_AMS["AMS"]
                PoP_FRA["FRA"]
                PoP_LHR["LHR"]
                PoP_CDG["CDG"]
            end

            subgraph Region_APAC["Asia Pacific (60 PoPs)"]
                PoP_NRT["NRT"]
                PoP_SIN["SIN"]
                PoP_SYD["SYD"]
                PoP_HKG["HKG"]
            end
        end

        subgraph DataStores["Distributed Data Stores"]
            KV_Primary["KV Primary<br/>(Multi-master)"]
            KV_Replicas["KV Edge Replicas"]
            DO_Regions["DO Regions<br/>(Single-master per object)"]
        end
    end

    CP_US --> Region_NA
    CP_EU --> Region_EU
    CP_AP --> Region_APAC

    KV_Primary --> KV_Replicas
    KV_Replicas --> Region_NA
    KV_Replicas --> Region_EU
    KV_Replicas --> Region_APAC

    DO_Regions --> Region_NA
    DO_Regions --> Region_EU
    DO_Regions --> Region_APAC

    style ControlPlane fill:#e3f2fd
    style EdgeNetwork fill:#f3e5f5
    style DataStores fill:#fff3e0
```

### Horizontal Scaling

| Component | Scaling Strategy | Trigger |
|-----------|-----------------|---------|
| Edge PoPs | Add new geographic locations | Latency targets in underserved regions |
| PoP Servers | Add servers within PoP | CPU > 70% or Memory > 80% |
| Isolate Workers | Scale isolate count per server | Request queue depth > 100 |
| Control Plane | Add replicas across regions | API latency p99 > 500ms |
| KV Replicas | Add replicas per PoP | Read latency > 10ms |
| DO Regions | Add regions for ownership | Hot region capacity |

### Vertical Scaling Limits

| Resource | Per-Isolate Limit | Per-Server Limit | Rationale |
|----------|-------------------|------------------|-----------|
| Memory | 128MB | 64GB | Isolate memory cap |
| CPU Time | 50ms wall-clock | - | Prevent runaway |
| Execution Time | 30s (default) | - | Long-running protection |
| Subrequests | 50 per request | - | Prevent amplification |
| Code Size | 10MB (after compression) | - | Cold start impact |

### Auto-Scaling Configuration

```yaml
# Per-PoP Auto-Scaling Rules
autoscaling:
  edge_servers:
    min_servers: 4
    max_servers: 100
    scale_up:
      - metric: cpu_utilization
        threshold: 70%
        period: 5m
        action: add_server
      - metric: memory_utilization
        threshold: 80%
        period: 5m
        action: add_server
      - metric: request_queue_depth
        threshold: 1000
        period: 1m
        action: add_server
    scale_down:
      - metric: cpu_utilization
        threshold: 30%
        period: 15m
        action: remove_server
    cooldown: 5m

  warm_pool:
    min_isolates_per_deployment: 0
    max_isolates_per_deployment: 1000
    scale_up:
      - metric: cold_start_rate
        threshold: 5%
        action: increase_warm_pool
    scale_down:
      - metric: isolate_idle_time
        threshold: 5m
        action: evict_isolate

  kv_replicas:
    min_replicas_per_pop: 2
    max_replicas_per_pop: 10
    scale_up:
      - metric: read_latency_p99
        threshold: 10ms
        action: add_replica
```

### Scaling Stages

```mermaid
flowchart LR
    subgraph Stage1["Stage 1: Single PoP"]
        S1_Servers["4 Servers"]
        S1_QPS["10K QPS"]
    end

    subgraph Stage2["Stage 2: Regional"]
        S2_Servers["50 PoPs<br/>200 Servers"]
        S2_QPS["500K QPS"]
    end

    subgraph Stage3["Stage 3: Global"]
        S3_Servers["300 PoPs<br/>3000 Servers"]
        S3_QPS["5M QPS"]
    end

    subgraph Stage4["Stage 4: Hyper-Scale"]
        S4_Servers["500+ PoPs<br/>10000+ Servers"]
        S4_QPS["50M+ QPS"]
    end

    Stage1 --> Stage2 --> Stage3 --> Stage4

    style Stage1 fill:#c8e6c9
    style Stage2 fill:#dcedc8
    style Stage3 fill:#fff9c4
    style Stage4 fill:#ffe0b2
```

---

## Reliability & Fault Tolerance

### Single Points of Failure (SPOF) Analysis

| Component | SPOF Risk | Mitigation |
|-----------|-----------|------------|
| DNS | High (global impact) | Multi-provider DNS, anycast |
| Control Plane | Medium (no new deploys) | Multi-region active-active |
| Individual PoP | Low (localized) | Anycast failover to nearest PoP |
| KV Primary | Medium (write failures) | Multi-master replication |
| DO Region | Low (per-object) | Migration to backup region |
| Code Artifact Store | Medium (deployment failures) | Geo-replicated object storage |

### Redundancy Architecture

```mermaid
flowchart TB
    subgraph DNSLayer["DNS Redundancy"]
        DNS1["DNS Provider 1"]
        DNS2["DNS Provider 2"]
        DNS3["DNS Provider 3<br/>(backup)"]
    end

    subgraph ControlPlaneRedundancy["Control Plane Redundancy"]
        subgraph US["US Region"]
            CP_US1["Primary"]
            CP_US2["Replica"]
            CP_US3["Replica"]
        end

        subgraph EU["EU Region"]
            CP_EU1["Primary"]
            CP_EU2["Replica"]
        end
    end

    subgraph PoPRedundancy["PoP Redundancy"]
        subgraph PoP_SJC["PoP SJC"]
            LB_SJC1["LB 1"]
            LB_SJC2["LB 2"]
            Server1["Server 1"]
            Server2["Server 2"]
            Server3["Server 3"]
            Server4["Server 4"]
        end
    end

    subgraph KVRedundancy["KV Redundancy"]
        KV_Master1["Master 1 (US)"]
        KV_Master2["Master 2 (EU)"]
        KV_Master3["Master 3 (APAC)"]
    end

    DNS1 --> PoP_SJC
    DNS2 --> PoP_SJC

    LB_SJC1 --> Server1
    LB_SJC1 --> Server2
    LB_SJC2 --> Server3
    LB_SJC2 --> Server4

    KV_Master1 <--> KV_Master2
    KV_Master2 <--> KV_Master3

    style DNSLayer fill:#e3f2fd
    style ControlPlaneRedundancy fill:#f3e5f5
    style PoPRedundancy fill:#e8f5e9
    style KVRedundancy fill:#fff3e0
```

### Failover Mechanisms

#### PoP Failover (Anycast)

```mermaid
sequenceDiagram
    participant User
    participant BGP as BGP Network
    participant PoP_SJC as PoP SJC (Primary)
    participant PoP_LAX as PoP LAX (Backup)
    participant Health as Health Checker

    Note over PoP_SJC: PoP healthy

    User->>BGP: Request to 1.2.3.4
    BGP->>PoP_SJC: Route to nearest (SJC)
    PoP_SJC->>User: Response

    Note over PoP_SJC: PoP fails

    Health->>PoP_SJC: Health check
    PoP_SJC--xHealth: Timeout

    Health->>BGP: Withdraw SJC route
    Note over BGP: BGP convergence (~30s)

    User->>BGP: Request to 1.2.3.4
    BGP->>PoP_LAX: Route to next nearest (LAX)
    PoP_LAX->>User: Response
```

**Failover Timeline**:
```
0s      - PoP failure occurs
5s      - Health check detects failure
10s     - BGP route withdrawal initiated
30s     - BGP convergence complete
30-60s  - All traffic shifted to backup PoPs
```

#### Durable Object Failover

```mermaid
sequenceDiagram
    participant Client
    participant Router as DO Router
    participant Primary as Primary Region (EU)
    participant Backup as Backup Region (US)

    Note over Primary: Region healthy

    Client->>Router: Request for DO xyz
    Router->>Primary: Forward request
    Primary->>Client: Response

    Note over Primary: Region fails

    Client->>Router: Request for DO xyz
    Router->>Primary: Forward request
    Primary--xRouter: Timeout

    Router->>Router: Detect failure, initiate migration

    Router->>Backup: Restore DO from snapshot
    Backup->>Backup: Replay WAL since snapshot

    Router->>Router: Update routing table

    Client->>Router: Retry request
    Router->>Backup: Forward to new owner
    Backup->>Client: Response
```

**DO Failover Timeline**:
```
0s      - Region failure
10s     - Router detects failure
15s     - Migration initiated
20s     - Snapshot restored in backup
25s     - WAL replayed
30s     - Routing updated
30s+    - New requests served from backup
```

### Circuit Breaker Pattern

```mermaid
stateDiagram-v2
    [*] --> Closed

    Closed --> Open: Failure threshold exceeded
    Open --> HalfOpen: Timeout elapsed
    HalfOpen --> Closed: Probe succeeds
    HalfOpen --> Open: Probe fails

    note right of Closed
        Normal operation
        Track failure count
    end note

    note right of Open
        Fail fast
        No requests sent
    end note

    note right of HalfOpen
        Test with single request
        Decide next state
    end note
```

**Circuit Breaker Configuration**:

```yaml
circuit_breaker:
  origin_requests:
    failure_threshold: 5       # Failures before opening
    success_threshold: 3       # Successes to close
    timeout: 30s               # Time in open state
    half_open_requests: 1      # Probe requests

  kv_operations:
    failure_threshold: 10
    timeout: 10s

  do_requests:
    failure_threshold: 3
    timeout: 60s               # Longer for migration
```

### Retry Strategies

| Operation | Retry Strategy | Max Retries | Backoff |
|-----------|---------------|-------------|---------|
| Code fetch | Exponential | 3 | 100ms, 200ms, 400ms |
| KV read | Immediate | 2 | None (different replica) |
| KV write | Exponential | 3 | 50ms, 100ms, 200ms |
| DO request | Exponential | 3 | 100ms, 500ms, 2s |
| Origin fetch | Exponential | 3 | 100ms, 300ms, 1s |

### Graceful Degradation

```mermaid
flowchart TB
    subgraph Levels["Degradation Levels"]
        L0["Level 0: Normal<br/>All features available"]
        L1["Level 1: KV Degraded<br/>Serve stale, disable writes"]
        L2["Level 2: PoP Overloaded<br/>Shed non-critical traffic"]
        L3["Level 3: Partial Outage<br/>Route to healthy PoPs only"]
        L4["Level 4: Control Plane Down<br/>Existing deployments work"]
    end

    L0 --> L1
    L1 --> L2
    L2 --> L3
    L3 --> L4

    style L0 fill:#c8e6c9
    style L1 fill:#dcedc8
    style L2 fill:#fff9c4
    style L3 fill:#ffe0b2
    style L4 fill:#ffcdd2
```

**Degradation Behaviors**:

| Level | Trigger | Behavior |
|-------|---------|----------|
| Level 1 | KV replication lag > 5min | Serve cached/stale KV data, queue writes |
| Level 2 | PoP CPU > 90% | Reject lowest-priority traffic classes |
| Level 3 | Multiple PoP failures | Higher latency, traffic concentration |
| Level 4 | Control plane unreachable | No new deployments, existing code runs |

---

## Disaster Recovery

### Recovery Objectives

| Metric | Target | Measurement |
|--------|--------|-------------|
| **RPO** (Recovery Point Objective) | 0 for KV, < 1s for DO | Data loss tolerance |
| **RTO** (Recovery Time Objective) | < 30s for PoP, < 5min for region | Time to recovery |
| **MTTR** (Mean Time to Recovery) | < 15min | Average recovery time |
| **MTBF** (Mean Time Between Failures) | > 30 days per PoP | Reliability target |

### Backup Strategy

```mermaid
flowchart TB
    subgraph Backups["Backup Architecture"]
        subgraph Continuous["Continuous Replication"]
            KV_WAL["KV Write-Ahead Log"]
            DO_WAL["DO SQLite WAL"]
            Config_Stream["Config Change Stream"]
        end

        subgraph Snapshots["Periodic Snapshots"]
            KV_Snap["KV Full Snapshot<br/>(Daily)"]
            DO_Snap["DO State Snapshot<br/>(Hourly)"]
            Code_Snap["Code Artifacts<br/>(Immutable)"]
        end

        subgraph Storage["Backup Storage"]
            Primary_Store["Primary Region Storage"]
            DR_Store["DR Region Storage"]
            Cold_Store["Cold Archive<br/>(30-day retention)"]
        end
    end

    KV_WAL --> Primary_Store
    DO_WAL --> Primary_Store
    Config_Stream --> Primary_Store

    Primary_Store --> DR_Store
    KV_Snap --> Cold_Store
    DO_Snap --> Cold_Store

    style Continuous fill:#e3f2fd
    style Snapshots fill:#f3e5f5
    style Storage fill:#e8f5e9
```

### Multi-Region DR

| Scenario | Impact | Recovery Procedure |
|----------|--------|-------------------|
| Single PoP failure | Minimal | Automatic anycast failover |
| Regional failure | Medium | Traffic shifts to other regions |
| Control plane failure | Medium | Existing deployments continue |
| Global KV failure | High | Restore from snapshots |
| Catastrophic (multi-region) | Severe | Failover to DR site |

### DR Runbook Summary

```
Scenario: Complete Region Failure

1. Detection (0-5min)
   - Automated alerts trigger
   - On-call acknowledges
   - Assess scope of failure

2. Containment (5-10min)
   - Withdraw region from DNS/BGP
   - Halt deployments to affected region
   - Notify status page

3. Recovery (10-30min)
   - Traffic already shifted via anycast
   - Initiate DO migrations from backups
   - Verify data integrity

4. Restoration (30min-4hr)
   - Bring up replacement infrastructure
   - Restore from backups
   - Re-add to DNS/BGP

5. Post-Incident
   - Customer communication
   - Root cause analysis
   - Remediation
```

---

## Load Shedding & Rate Limiting

### Traffic Priority Classes

| Priority | Traffic Type | Shedding Order |
|----------|--------------|----------------|
| P0 (Critical) | Health checks, auth | Never shed |
| P1 (High) | Paid customer traffic | Last to shed |
| P2 (Standard) | Free tier traffic | Shed under pressure |
| P3 (Best-effort) | Preview deployments | First to shed |

### Per-PoP Rate Limiting

```yaml
rate_limits:
  per_deployment:
    requests_per_second: 10000     # Burst limit
    requests_per_minute: 100000   # Sustained limit

  per_account:
    requests_per_second: 100000
    kv_reads_per_second: 50000
    kv_writes_per_second: 1000
    do_requests_per_second: 5000

  global:
    per_pop_capacity: 100000      # QPS per PoP
    spillover_threshold: 80%      # Trigger spillover
```

### Spillover Routing

```mermaid
flowchart TB
    subgraph Normal["Normal Operation"]
        User1["User"] --> PoP1["PoP SJC<br/>50% capacity"]
    end

    subgraph Overload["PoP Overloaded"]
        User2["User"] --> PoP2["PoP SJC<br/>90% capacity"]
        PoP2 --> Spillover["Spillover Router"]
        Spillover --> PoP3["PoP LAX<br/>30% capacity"]
    end

    style PoP1 fill:#c8e6c9
    style PoP2 fill:#ffcdd2
    style PoP3 fill:#c8e6c9
```

---

## Interview Tips: Scale & Reliability Phase

### Key Points to Cover

1. **Multi-region architecture** - Show control plane and data plane separation
2. **Anycast failover** - Explain BGP-based automatic recovery
3. **Consistency trade-offs** - KV eventual vs DO strong
4. **Graceful degradation** - What happens when components fail
5. **RPO/RTO targets** - Be specific with numbers

### Common Questions

- "How do you handle a region going down?"
  > Anycast automatically routes to nearest healthy PoP. DO instances migrate to backup regions. RTO < 30s for traffic, < 5min for DO.

- "What's your RPO for user data?"
  > KV: 0 (synchronous to primary before ACK). DO: < 1s (WAL replicated async).

- "How do you prevent cascading failures?"
  > Circuit breakers, bulkheads (isolate components), and load shedding by priority class.

### Numbers to Remember

| Metric | Value |
|--------|-------|
| Anycast failover time | 30-60s (BGP convergence) |
| DO migration time | 15-30s |
| Cold start (V8) | < 5ms |
| KV propagation | < 60s |
| Target availability | 99.99% |

---

**Next: [06 - Security & Compliance](./06-security-and-compliance.md)**
