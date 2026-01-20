# Scalability & Reliability

[← Back to Index](./00-index.md)

---

## Scalability

### Snowflake Scaling Capacity

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SNOWFLAKE SCALING CAPACITY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Single Generator Limits:                                                    │
│  ─────────────────────────                                                  │
│  • Sequence bits: 12 → 2^12 = 4,096 IDs per millisecond                     │
│  • Per second: 4,096 × 1,000 = 4,096,000 IDs                                │
│  • Per minute: 4,096,000 × 60 = 245,760,000 IDs                             │
│  • Per hour: 245,760,000 × 60 = 14.7 billion IDs                            │
│                                                                              │
│  System-Wide Limits (Standard Snowflake):                                    │
│  ─────────────────────────────────────────                                  │
│  • Machine ID bits: 10 → 1,024 total generators                             │
│  • Datacenter bits: 5 → 32 datacenters                                      │
│  • Worker bits: 5 → 32 workers per datacenter                               │
│  • Total throughput: 4,096,000 × 1,024 = 4.19 billion IDs/second           │
│                                                                              │
│  System-Wide Limits (Sonyflake):                                             │
│  ────────────────────────────────                                           │
│  • Machine ID bits: 16 → 65,536 total generators                            │
│  • Per generator: 256 IDs per 10ms = 25,600 IDs/second                      │
│  • Total throughput: 25,600 × 65,536 = 1.68 billion IDs/second              │
│  • But supports MANY more generators                                         │
│                                                                              │
│  Lifetime:                                                                   │
│  ────────                                                                   │
│  • Snowflake: 2^41 ms ÷ (1000 × 60 × 60 × 24 × 365) ≈ 69.7 years           │
│  • Sonyflake: 2^39 × 10ms ÷ (1000 × ...) ≈ 174 years                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Horizontal Scaling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      HORIZONTAL SCALING STRATEGY                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Scaling Model: Add More Generators                                          │
│  ────────────────────────────────────                                       │
│                                                                              │
│  Current: 4 generators                     After scaling: 8 generators      │
│  ┌─────────────────────────┐               ┌─────────────────────────┐     │
│  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐│               │  ┌───┐ ┌───┐ ┌───┐ ┌───┐│     │
│  │  │G1 │ │G2 │ │G3 │ │G4 ││               │  │G1 │ │G2 │ │G3 │ │G4 ││     │
│  │  └───┘ └───┘ └───┘ └───┘│               │  └───┘ └───┘ └───┘ └───┘│     │
│  │                         │               │  ┌───┐ ┌───┐ ┌───┐ ┌───┐│     │
│  │                         │      →        │  │G5 │ │G6 │ │G7 │ │G8 ││     │
│  │                         │               │  └───┘ └───┘ └───┘ └───┘│     │
│  └─────────────────────────┘               └─────────────────────────┘     │
│                                                                              │
│  Capacity: 4M × 4 = 16M IDs/sec            Capacity: 4M × 8 = 32M IDs/sec  │
│                                                                              │
│  Why this works:                                                             │
│  • Each generator has unique machine ID                                      │
│  • No coordination needed between generators                                │
│  • Adding generators is independent operation                               │
│  • Linear scaling up to 1024 generators                                     │
│                                                                              │
│  Scaling considerations:                                                     │
│  ─────────────────────────                                                  │
│  1. Ensure machine ID assignment doesn't conflict                           │
│  2. Update load balancer if using centralized service                       │
│  3. Monitor clock sync across all generators                                │
│  4. Plan for machine ID exhaustion (1024 limit in standard Snowflake)      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Auto-Scaling Considerations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AUTO-SCALING CONSIDERATIONS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  When to auto-scale:                                                         │
│  ─────────────────────                                                      │
│  • Sequence overflow rate > threshold (e.g., 100/min)                       │
│  • Average throughput > 75% of capacity                                      │
│  • Latency p99 > target (e.g., 1ms)                                         │
│                                                                              │
│  Auto-scaling challenges:                                                    │
│  ──────────────────────────                                                 │
│  1. Machine ID Assignment                                                    │
│     • New instances need unique machine IDs                                  │
│     • ZooKeeper/etcd registration adds startup latency                      │
│     • Solution: Pre-warm pool of generators                                 │
│                                                                              │
│  2. Startup Time                                                             │
│     • Generator needs to acquire machine ID before generating               │
│     • If ZK is slow, startup is delayed                                      │
│     • Solution: Cache machine ID locally, refresh in background             │
│                                                                              │
│  3. Scale-Down                                                               │
│     • When scaling down, machine IDs become available                       │
│     • Must ensure proper deregistration                                      │
│     • Solution: Ephemeral ZK nodes, TTL-based etcd leases                   │
│                                                                              │
│  Kubernetes HPA example:                                                     │
│  ────────────────────────                                                   │
│  apiVersion: autoscaling/v2                                                  │
│  kind: HorizontalPodAutoscaler                                               │
│  metadata:                                                                   │
│    name: id-generator-hpa                                                    │
│  spec:                                                                       │
│    scaleTargetRef:                                                           │
│      apiVersion: apps/v1                                                     │
│      kind: Deployment                                                        │
│      name: id-generator                                                      │
│    minReplicas: 2                                                            │
│    maxReplicas: 32  # Limited by datacenter × worker bits                   │
│    metrics:                                                                  │
│    - type: Pods                                                              │
│      pods:                                                                   │
│        metric:                                                               │
│          name: ids_per_second                                                │
│        target:                                                               │
│          type: AverageValue                                                  │
│          averageValue: 3000000  # 75% of 4M capacity                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Multi-Region Scaling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MULTI-REGION ID ALLOCATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Machine ID (10 bits) = Datacenter (5 bits) + Worker (5 bits)               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │   Region US-East (DC IDs: 0-7)          Region EU-West (DC IDs: 8-15)│   │
│  │   ┌────────────────────────────┐        ┌────────────────────────────┐│   │
│  │   │ DC 0: Workers 0-31         │        │ DC 8: Workers 0-31         ││   │
│  │   │ DC 1: Workers 0-31         │        │ DC 9: Workers 0-31         ││   │
│  │   │ ...                        │        │ ...                        ││   │
│  │   │ DC 7: Workers 0-31         │        │ DC 15: Workers 0-31        ││   │
│  │   └────────────────────────────┘        └────────────────────────────┘│   │
│  │                                                                      │   │
│  │   Region APAC (DC IDs: 16-23)          Reserved (DC IDs: 24-31)     │   │
│  │   ┌────────────────────────────┐        ┌────────────────────────────┐│   │
│  │   │ DC 16: Workers 0-31        │        │ Future expansion          ││   │
│  │   │ DC 17: Workers 0-31        │        │                           ││   │
│  │   │ ...                        │        │                           ││   │
│  │   │ DC 23: Workers 0-31        │        │                           ││   │
│  │   └────────────────────────────┘        └────────────────────────────┘│   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Key benefits:                                                               │
│  • NO coordination needed between regions                                    │
│  • Each region independently generates unique IDs                           │
│  • Global uniqueness guaranteed by non-overlapping DC IDs                   │
│  • Can expand to new regions without affecting existing ones               │
│                                                                              │
│  Capacity per region (8 DCs):                                               │
│  • 8 DCs × 32 workers × 4M IDs/sec = 1.024 billion IDs/sec                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Reliability & Fault Tolerance

### Single Points of Failure Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SINGLE POINTS OF FAILURE (SPOF)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Component              │ SPOF Risk │ Mitigation                            │
│  ───────────────────────┼───────────┼─────────────────────────────────────  │
│  ID Generator itself    │ LOW       │ Stateless, instant restart, multiple  │
│                         │           │ instances with unique machine IDs     │
│  ───────────────────────┼───────────┼─────────────────────────────────────  │
│  System Clock           │ MEDIUM    │ NTP with multiple servers, monitoring │
│                         │           │ Graceful handling of clock issues     │
│  ───────────────────────┼───────────┼─────────────────────────────────────  │
│  ZooKeeper (machine ID) │ MEDIUM    │ ZK cluster (3+ nodes), cached IDs,    │
│                         │           │ static config fallback                │
│  ───────────────────────┼───────────┼─────────────────────────────────────  │
│  Network                │ LOW       │ Embedded library (no network needed)  │
│                         │           │ If centralized: multiple instances    │
│  ───────────────────────┼───────────┼─────────────────────────────────────  │
│  Database (segment mode)│ HIGH      │ Use Snowflake mode instead, or        │
│                         │           │ replicated database, local cache      │
│                                                                              │
│  Overall SPOF Assessment: LOW                                                │
│  The system is designed to be highly available with minimal dependencies.   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Redundancy Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REDUNDANCY STRATEGY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Level 1: Multiple Generators per Service                                    │
│  ─────────────────────────────────────────                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Order Service                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐│   │
│  │  │ Instance 1          Instance 2          Instance 3              ││   │
│  │  │ ┌───────────────┐   ┌───────────────┐   ┌───────────────┐      ││   │
│  │  │ │ ID Gen (M=0)  │   │ ID Gen (M=1)  │   │ ID Gen (M=2)  │      ││   │
│  │  │ └───────────────┘   └───────────────┘   └───────────────┘      ││   │
│  │  └─────────────────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  If Instance 1 fails → Instance 2 and 3 continue generating                 │
│                                                                              │
│  Level 2: Multiple Datacenters                                               │
│  ───────────────────────────────                                            │
│  ┌─────────────────────┐    ┌─────────────────────┐                        │
│  │  DC 1 (Primary)     │    │  DC 2 (Secondary)   │                        │
│  │  ┌───┐ ┌───┐ ┌───┐  │    │  ┌───┐ ┌───┐ ┌───┐  │                        │
│  │  │G1 │ │G2 │ │G3 │  │    │  │G4 │ │G5 │ │G6 │  │                        │
│  │  └───┘ └───┘ └───┘  │    │  └───┘ └───┘ └───┘  │                        │
│  └─────────────────────┘    └─────────────────────┘                        │
│           ↑                          ↑                                      │
│           └──────────┬───────────────┘                                      │
│                      │                                                       │
│              Load Balancer (or client-side)                                 │
│                                                                              │
│  If DC 1 fails → All traffic to DC 2                                        │
│  No data loss, no duplicate IDs (different machine IDs)                     │
│                                                                              │
│  Level 3: Cross-Region Failover                                              │
│  ────────────────────────────────                                           │
│  • Each region has independent generators                                    │
│  • Global load balancer routes to nearest healthy region                    │
│  • No state to replicate (stateless design)                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Failover Mechanisms

| Failure Scenario | Detection | Failover Action | RTO |
|------------------|-----------|-----------------|-----|
| Generator process crash | Health check | Restart process | <1 sec |
| Host failure | Health check | Route to other hosts | <5 sec |
| Datacenter failure | Health check | Route to other DC | <30 sec |
| Clock drift detected | Monitoring | Pause + alert | Immediate |
| ZK unavailable | Connection timeout | Use cached machine ID | N/A |

### Circuit Breaker Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CIRCUIT BREAKER FOR ID GENERATION                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Note: Circuit breaker is typically for external calls.                      │
│  For ID generation, it's mainly relevant for:                               │
│  1. Centralized ID service (if using that model)                            │
│  2. ZooKeeper calls for machine ID                                          │
│                                                                              │
│  States:                                                                     │
│  ─────────                                                                  │
│                                                                              │
│    CLOSED ───────────────► OPEN ───────────────► HALF-OPEN                  │
│       │                      │                       │                       │
│       │  (failures > threshold) (timeout)           │                       │
│       │                      │                       │                       │
│       │                      ▼                       │                       │
│       │                 Return error             Test one                    │
│       │                 immediately              request                     │
│       │                                              │                       │
│       │                                              │                       │
│       ◄──────────────────────────────────────────────┘                      │
│                    (success: reset, failure: back to OPEN)                  │
│                                                                              │
│  For ZooKeeper circuit breaker:                                              │
│  ─────────────────────────────────                                          │
│  • CLOSED: Normal operation, acquire/renew machine ID                       │
│  • OPEN: Use cached machine ID, don't call ZK                              │
│  • HALF-OPEN: Try one ZK call, if success resume normal                    │
│                                                                              │
│  Thresholds:                                                                 │
│  • Failure threshold: 5 consecutive failures                                │
│  • Timeout: 30 seconds                                                       │
│  • Half-open test interval: 60 seconds                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Disaster Recovery

### RTO and RPO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RTO AND RPO ANALYSIS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Recovery Time Objective (RTO): Near-Zero                                    │
│  ────────────────────────────────────────                                   │
│  • Generators are stateless                                                  │
│  • No data to restore                                                        │
│  • Restart immediately starts generating                                     │
│  • Only state: machine ID (can be cached or re-acquired)                    │
│                                                                              │
│  Recovery Point Objective (RPO): Not Applicable                              │
│  ──────────────────────────────────────────────                             │
│  • No persistent state to lose                                               │
│  • Generated IDs are not stored by the generator                            │
│  • No data loss scenario (IDs are consumed immediately)                     │
│                                                                              │
│  Timeline of Recovery:                                                       │
│  ─────────────────────                                                      │
│  t=0      Generator crashes                                                  │
│  t=0.1s   Health check detects failure                                       │
│  t=0.5s   Container/process restarts                                         │
│  t=1s     Generator acquires machine ID (if needed)                          │
│  t=1.1s   Generator ready to serve                                           │
│                                                                              │
│  Total recovery time: ~1 second                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Backup Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKUP STRATEGY                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  What to backup:                                                             │
│  ────────────────                                                           │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Component              │ Backup? │ Reason                              ││
│  ├────────────────────────┼─────────┼─────────────────────────────────────┤│
│  │ Generated IDs          │ NO      │ Not stored by generator             ││
│  │ Machine ID mapping     │ YES     │ ZK/etcd state, config files         ││
│  │ Configuration          │ YES     │ Epoch, bit allocation, etc.         ││
│  │ Monitoring dashboards  │ YES     │ Operational knowledge               ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ZooKeeper/etcd backup:                                                      │
│  ──────────────────────                                                     │
│  # For ZooKeeper                                                             │
│  zkCli.sh -server localhost:2181 <<< "dump" > zk_backup.txt                │
│                                                                              │
│  # For etcd                                                                  │
│  etcdctl snapshot save backup.db                                            │
│                                                                              │
│  Configuration backup:                                                       │
│  ──────────────────────                                                     │
│  • Store configs in version control (Git)                                   │
│  • Infrastructure as Code (Terraform, Kubernetes manifests)                 │
│  • Document custom epoch and any non-standard settings                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Multi-Region Disaster Recovery

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   MULTI-REGION DISASTER RECOVERY                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Scenario: Entire region goes offline                                        │
│                                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐                        │
│  │  US-East (DOWN!)    │    │  EU-West (Active)   │                        │
│  │  ┌───┐ ┌───┐ ┌───┐  │    │  ┌───┐ ┌───┐ ┌───┐  │                        │
│  │  │ X │ │ X │ │ X │  │    │  │G4 │ │G5 │ │G6 │  │                        │
│  │  └───┘ └───┘ └───┘  │    │  └───┘ └───┘ └───┘  │                        │
│  └─────────────────────┘    └─────────────────────┘                        │
│                                    │                                        │
│                   All traffic ─────┘                                        │
│                                                                              │
│  Recovery steps:                                                             │
│  ────────────────                                                           │
│  1. DNS/Load balancer automatically routes to EU-West                       │
│  2. EU-West has independent generators with different DC IDs               │
│  3. No data migration needed (stateless)                                    │
│  4. When US-East recovers, restore traffic gradually                        │
│                                                                              │
│  Why this works:                                                             │
│  • Each region has reserved DC IDs (no conflict)                            │
│  • Generators are stateless (no sync needed)                                │
│  • IDs from both regions are globally unique                                │
│  • No split-brain scenario possible                                         │
│                                                                              │
│  Considerations:                                                             │
│  • Increased latency for users in affected region                          │
│  • EU-West may need more capacity (auto-scale)                              │
│  • Monitor for sequence overflow under increased load                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Performance Optimization

### Optimization Techniques

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE OPTIMIZATION TECHNIQUES                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Lock-Free Implementation                                                 │
│  ────────────────────────────                                               │
│  Instead of mutex:                                                           │
│    state = atomic_load(current_state)                                       │
│    new_state = compute_new_state(state)                                     │
│    IF atomic_compare_and_swap(current_state, state, new_state) THEN        │
│        RETURN construct_id(new_state)                                       │
│    ELSE                                                                      │
│        RETRY                                                                 │
│                                                                              │
│  Benefit: Higher throughput under contention                                │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  2. Batch Timestamp Reads                                                    │
│  ────────────────────────────                                               │
│  Instead of reading clock for every ID:                                     │
│    timestamp = get_current_time_ms()                                        │
│    FOR i = 0 TO batch_size:                                                 │
│        id[i] = generate_with_timestamp(timestamp)                           │
│        IF sequence_overflow THEN                                            │
│            timestamp = wait_for_next_ms()                                   │
│                                                                              │
│  Benefit: Fewer system calls                                                 │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  3. CPU Affinity                                                             │
│  ─────────────────                                                          │
│  Pin generator thread to specific CPU core:                                 │
│    taskset -c 0 ./id-generator                                              │
│                                                                              │
│  Benefit: Better cache locality, consistent latency                         │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  4. Pre-allocated ID Pool                                                    │
│  ──────────────────────────                                                 │
│  Background thread pre-generates IDs into ring buffer:                      │
│    // Background thread                                                      │
│    LOOP:                                                                     │
│        IF buffer.available_space > threshold THEN                           │
│            id = generate_id()                                                │
│            buffer.push(id)                                                   │
│                                                                              │
│    // Main thread                                                            │
│    FUNCTION get_id():                                                        │
│        RETURN buffer.pop()  // No generation latency                        │
│                                                                              │
│  Benefit: Near-zero latency for consumers, smooths bursts                   │
│  Caution: IDs may be slightly out of order                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Caching Strategies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CACHING STRATEGIES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  What to cache:                                                              │
│  ──────────────                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Item                  │ Where        │ TTL        │ Reason              ││
│  ├───────────────────────┼──────────────┼────────────┼─────────────────────┤│
│  │ Machine ID            │ Local file   │ Until restart │ Avoid ZK on start││
│  │ ZK connection         │ In-memory    │ Persistent │ Reuse connection    ││
│  │ Pre-generated IDs     │ Ring buffer  │ Seconds    │ Reduce latency      ││
│  │ Clock offset          │ In-memory    │ Minutes    │ NTP check cache     ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Machine ID local cache:                                                     │
│  ────────────────────────                                                   │
│  // On successful ZK registration                                           │
│  write_to_file("/var/lib/snowflake/machine_id", machine_id)                 │
│                                                                              │
│  // On startup                                                               │
│  IF file_exists("/var/lib/snowflake/machine_id") THEN                       │
│      cached_id = read_file("/var/lib/snowflake/machine_id")                 │
│      // Verify in ZK (or use directly if ZK unavailable)                    │
│  ELSE                                                                        │
│      machine_id = acquire_from_zk()                                         │
│      write_to_file(...)                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary: Scalability & Reliability Checklist

### Scalability Checklist
- [ ] Understand single-generator limits (4M IDs/sec for Snowflake)
- [ ] Plan machine ID allocation for growth (1024 max)
- [ ] Design multi-region ID allocation (separate DC IDs)
- [ ] Consider auto-scaling triggers and machine ID assignment
- [ ] Plan for sequence overflow at scale

### Reliability Checklist
- [ ] No single points of failure identified
- [ ] Graceful clock drift handling implemented
- [ ] ZK/etcd unavailability handled (cached machine ID)
- [ ] Health checks configured
- [ ] Multi-datacenter deployment for HA
- [ ] Recovery procedures documented
