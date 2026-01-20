# Scalability & Reliability

[← Back to Index](./00-index.md)

---

## Scalability

### Horizontal Scaling Strategy

```mermaid
flowchart TB
    subgraph Before["Before Scaling (3 nodes)"]
        VIP1[Anycast VIP]
        LB1[LB Node 1<br/>33% traffic]
        LB2[LB Node 2<br/>33% traffic]
        LB3[LB Node 3<br/>33% traffic]
        VIP1 --> LB1 & LB2 & LB3
    end

    subgraph After["After Scaling (5 nodes)"]
        VIP2[Anycast VIP]
        LB1A[LB Node 1<br/>20% traffic]
        LB2A[LB Node 2<br/>20% traffic]
        LB3A[LB Node 3<br/>20% traffic]
        LB4[LB Node 4<br/>20% traffic]
        LB5[LB Node 5<br/>20% traffic]
        VIP2 --> LB1A & LB2A & LB3A & LB4 & LB5
    end

    Before -->|Add nodes| After
```

### Scaling Dimensions

| Dimension | Approach | Complexity |
|-----------|----------|------------|
| **Throughput (QPS)** | Add more LB nodes | Low |
| **Connections** | Add nodes + tune connection limits | Medium |
| **Bandwidth** | Add nodes + use DSR | Medium |
| **TLS Termination** | Add L7 nodes or TLS offload | Medium |
| **Backend Pools** | Shard by service, add capacity | Low |
| **Geographic** | Add PoPs with Anycast | High |

### Auto-Scaling Triggers

| Metric | Scale-Out Threshold | Scale-In Threshold | Cooldown |
|--------|---------------------|-------------------|----------|
| CPU Utilization | > 70% for 5 min | < 30% for 15 min | 10 min |
| Memory Utilization | > 80% for 5 min | < 40% for 15 min | 10 min |
| Connection Count | > 80% of max | < 30% of max | 10 min |
| Latency p99 | > 2x baseline | N/A | 5 min |

### Scaling L4 vs L7

```
L4 Load Balancers:
├── Stateless packet forwarding
├── Scale linearly with nodes
├── Single node: 10+ Gbps, millions of connections
├── Bottleneck: NIC capacity, connection table
└── Scaling: Add more nodes behind ECMP

L7 Load Balancers:
├── Stateful request processing
├── More CPU-bound (TLS, parsing)
├── Single node: 100K-500K QPS typical
├── Bottleneck: CPU for TLS/HTTP processing
└── Scaling: Add more nodes, L4 distributes to them
```

### Database Scaling (Configuration Store)

| Approach | Use Case | Trade-off |
|----------|----------|-----------|
| Single leader | Low write rate | Simple but SPOF |
| Leader-follower | Read scaling | Replication lag |
| Multi-leader (etcd) | High availability | Consistency complexity |

**Recommendation:** Use etcd or Consul cluster (3-5 nodes) for config store. Reads can go to any node, writes go to leader.

### Caching Strategy

```mermaid
flowchart LR
    subgraph Caching["Multi-Layer Caching"]
        L1[L1: Per-LB Memory<br/>Backend list, health<br/>TTL: real-time]
        L2[L2: Shared Cache<br/>TLS sessions<br/>TTL: 1 hour]
        L3[L3: Config Store<br/>Routing rules<br/>TTL: permanent]
    end

    Request --> L1
    L1 -->|Miss| L2
    L2 -->|Miss| L3
```

### Hot Spot Mitigation

**Problem:** Single backend receives disproportionate traffic.

| Cause | Detection | Mitigation |
|-------|-----------|------------|
| Consistent hash collision | Monitor per-backend QPS | Virtual nodes, re-hash |
| Popular content | Monitor request patterns | Request-level LB (not connection) |
| Slow backend | Monitor latency distribution | Circuit breaker, weight reduction |

---

## Reliability & Fault Tolerance

### Single Points of Failure (SPOF) Analysis

```mermaid
flowchart TD
    subgraph SPOF["Potential SPOFs"]
        VIP[VIP Address]
        Config[Config Store]
        DNS[DNS]
        Network[Network Path]
    end

    subgraph Mitigations["Mitigations"]
        Anycast[Anycast + BGP<br/>Multi-path routing]
        Cluster[etcd Cluster<br/>3-5 nodes]
        MultiDNS[Multiple DNS providers<br/>Low TTL]
        MultiPath[Multi-homing<br/>Multiple ISPs]
    end

    VIP --> Anycast
    Config --> Cluster
    DNS --> MultiDNS
    Network --> MultiPath
```

### Redundancy Strategy

| Component | Redundancy Level | Strategy |
|-----------|------------------|----------|
| L4 LB Nodes | N+2 | Anycast + ECMP |
| L7 LB Nodes | N+1 per zone | Cross-zone distribution |
| Config Store | 3 or 5 nodes | Raft consensus |
| Health Checkers | 2 per zone | Independent checking |
| Network Paths | 2+ | Multi-homed, diverse paths |

### Failover Mechanisms

#### L4 Failover (Anycast + BGP)

```mermaid
sequenceDiagram
    participant Router
    participant LB1 as LB Node 1
    participant LB2 as LB Node 2

    Note over Router,LB2: Normal operation
    LB1->>Router: BGP: I have VIP 1.2.3.4
    LB2->>Router: BGP: I have VIP 1.2.3.4
    Router->>Router: ECMP: Split traffic 50/50

    Note over LB1: LB1 fails
    LB1--xRouter: BGP session drops

    Router->>Router: Detect loss, reconverge
    Note over Router: Convergence: 1-3 seconds

    Router->>LB2: All traffic to LB2
```

**Convergence time:** 1-3 seconds with BFD (Bidirectional Forwarding Detection)

#### L7 Failover (Health Check Based)

```mermaid
sequenceDiagram
    participant L4 as L4 LB
    participant L7A as L7 Node A
    participant L7B as L7 Node B
    participant HC as Health Checker

    loop Every 5 seconds
        HC->>L7A: Health check
        L7A-->>HC: 200 OK
        HC->>L7B: Health check
        L7B-->>HC: 200 OK
    end

    Note over L7A: L7A crashes
    HC->>L7A: Health check
    L7A--xHC: Timeout

    HC->>HC: Failure count++

    Note over HC: After 3 failures (15 sec)
    HC->>L4: Remove L7A from pool

    L4->>L7B: All traffic to L7B
```

**Detection time:** (check_interval × threshold) + timeout = ~17 seconds typical

### Circuit Breaker Pattern

```mermaid
stateDiagram-v2
    [*] --> Closed: Initial state

    Closed --> Open: Error threshold exceeded
    Closed --> Closed: Success / error < threshold

    Open --> HalfOpen: Reset timeout expires
    Open --> Open: Reject requests

    HalfOpen --> Closed: Test request succeeds
    HalfOpen --> Open: Test request fails

    note right of Closed: Normal operation<br/>Count errors
    note right of Open: Fast fail<br/>No requests to backend
    note right of HalfOpen: Test with limited traffic
```

**Configuration:**

```
circuit_breaker:
  error_threshold_percentage: 50    # Trip at 50% errors
  request_volume_threshold: 20      # Min requests before tripping
  sleep_window_ms: 30000            # Time in open state
  half_open_requests: 5             # Requests to test in half-open
```

### Retry Strategy

| Retry Type | When to Use | Configuration |
|------------|-------------|---------------|
| **Connection retry** | Connection refused | 2-3 retries, immediate |
| **Request retry** | 502/503/504 errors | 1-2 retries, idempotent only |
| **Timeout retry** | Request timeout | 1 retry, increase timeout |

**Exponential Backoff:**

```
FUNCTION retry_with_backoff(request, max_retries):
    base_delay = 100  // ms
    max_delay = 5000  // ms

    FOR attempt FROM 0 TO max_retries:
        TRY:
            RETURN send_request(request)
        CATCH retryable_error:
            IF attempt == max_retries THEN
                THROW error

            delay = MIN(base_delay * (2 ^ attempt), max_delay)
            jitter = random(0, delay * 0.1)
            SLEEP(delay + jitter)
```

### Graceful Degradation

| Scenario | Degraded Behavior | Recovery |
|----------|-------------------|----------|
| 50% backends down | Increased load on healthy backends | Auto-recover when backends return |
| All backends down | Return cached response or error page | Fail-open with monitoring |
| Config store down | Use cached config | Alert, manual intervention |
| Health checker down | Keep current state | Secondary checker takes over |

### Bulkhead Pattern

```mermaid
flowchart TD
    subgraph LB["Load Balancer with Bulkheads"]
        subgraph Pool1["Service A Pool (isolated)"]
            T1[Thread Pool: 100]
            C1[Connection Pool: 500]
        end
        subgraph Pool2["Service B Pool (isolated)"]
            T2[Thread Pool: 50]
            C2[Connection Pool: 200]
        end
        subgraph Pool3["Service C Pool (isolated)"]
            T3[Thread Pool: 50]
            C3[Connection Pool: 200]
        end
    end

    Note1[Service A failure<br/>doesn't affect B and C]
```

**Purpose:** Isolate failures to prevent cascade across services.

---

## Disaster Recovery

### RTO and RPO

| Metric | Target | Justification |
|--------|--------|---------------|
| **RTO** (Recovery Time Objective) | < 5 minutes | Auto-failover should handle most cases |
| **RPO** (Recovery Point Objective) | 0 (stateless) | LB has no persistent user data |

### Backup Strategy

| Component | Backup Frequency | Retention | Method |
|-----------|------------------|-----------|--------|
| Configuration | On every change | 30 days | etcd snapshots |
| Routing rules | On every change | 30 days | Git version control |
| TLS certificates | Weekly | 1 year | Encrypted backup |
| Audit logs | Continuous | 90 days | Log aggregation |

### Multi-Region Architecture

```mermaid
flowchart TB
    subgraph Global["Global Layer"]
        GeoDNS[GeoDNS / Global LB]
    end

    subgraph Region1["Region: US-East"]
        VIP1[Anycast VIP]
        L4_1[L4 LB Pool]
        L7_1[L7 LB Pool]
        B1[Backend Pool]
    end

    subgraph Region2["Region: EU-West"]
        VIP2[Anycast VIP]
        L4_2[L4 LB Pool]
        L7_2[L7 LB Pool]
        B2[Backend Pool]
    end

    subgraph Region3["Region: APAC"]
        VIP3[Anycast VIP]
        L4_3[L4 LB Pool]
        L7_3[L7 LB Pool]
        B3[Backend Pool]
    end

    GeoDNS --> VIP1 & VIP2 & VIP3
    VIP1 --> L4_1 --> L7_1 --> B1
    VIP2 --> L4_2 --> L7_2 --> B2
    VIP3 --> L4_3 --> L7_3 --> B3
```

### Regional Failover

```mermaid
sequenceDiagram
    participant User
    participant GeoDNS
    participant Region1 as US-East (Primary)
    participant Region2 as EU-West (Backup)

    User->>GeoDNS: Resolve api.example.com
    GeoDNS->>User: US-East VIP (closest)

    User->>Region1: Request
    Region1-->>User: Response

    Note over Region1: Region 1 becomes unhealthy

    User->>GeoDNS: Resolve api.example.com
    Note over GeoDNS: Health check fails for US-East
    GeoDNS->>User: EU-West VIP (next closest)

    User->>Region2: Request
    Region2-->>User: Response
```

**Regional Failover Time:**
- DNS TTL: 30-60 seconds
- Health check detection: 15-30 seconds
- Total: 45-90 seconds

### Disaster Scenarios and Response

| Scenario | Detection | Response | Recovery |
|----------|-----------|----------|----------|
| Single LB node failure | BGP/health check | ECMP reconverge | Auto (seconds) |
| AZ failure | Multi-AZ health checks | Traffic to other AZs | Auto (minutes) |
| Region failure | Global health checks | DNS failover | Auto (minutes) |
| Config corruption | Validation failure | Rollback to last known good | Manual (minutes) |
| DDoS attack | Traffic spike detection | Scrubbing, rate limiting | Manual/Auto |

---

## Capacity Planning

### Growth Projections

```
Current State:
├── QPS: 100,000
├── Connections: 2 million
├── LB Nodes: 5
└── Bandwidth: 10 Gbps

Year 1 Projection (2x growth):
├── QPS: 200,000
├── Connections: 4 million
├── LB Nodes: 8 (add 3)
└── Bandwidth: 20 Gbps

Year 3 Projection (5x growth):
├── QPS: 500,000
├── Connections: 10 million
├── LB Nodes: 15 (add 7 more)
└── Bandwidth: 50 Gbps
```

### Capacity Headroom

| Resource | Normal Usage | Headroom Target | Rationale |
|----------|--------------|-----------------|-----------|
| CPU | 50% | 30% unused | Handle traffic spikes |
| Memory | 60% | 20% unused | Connection table growth |
| Network | 50% | 40% unused | Burst traffic |
| Connections | 60% | 30% unused | Flash crowd events |

### Load Testing Requirements

```
Pre-production Validation:
├── Baseline: Sustained load at expected QPS
├── Spike: 3x traffic for 5 minutes
├── Soak: 24-hour sustained load
├── Failover: Kill LB nodes during load
└── Recovery: Verify return to baseline
```
