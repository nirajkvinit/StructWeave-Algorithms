# Deep Dive & Bottlenecks

[← Back to Index](./00-index.md)

---

## Critical Component 1: Clock Synchronization

### Why Clock Sync is Critical

The timestamp is the most significant component of a Snowflake ID (41 bits). Clock issues can cause:
- **Duplicate IDs** if clock moves backward and regenerates same timestamp
- **Out-of-order IDs** if different machines have different times
- **Wasted ID space** if clock is ahead of real time

### The Clock Drift Problem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLOCK DRIFT SCENARIO                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Time ────────────────────────────────────────────────────────────────►     │
│                                                                              │
│  Real time:    10:00:00.000    10:00:00.100    10:00:00.200                 │
│                     │               │               │                        │
│  Node A clock: 10:00:00.050    10:00:00.150    10:00:00.250  (normal)       │
│                     │               │               │                        │
│  Node B clock: 10:00:00.100    10:00:00.050 ←─ NTP correction (backward!)   │
│                     │               │                                        │
│                     ▼               ▼                                        │
│  Node A IDs:    ts=50, seq=0   ts=150, seq=0   ts=250, seq=0               │
│  Node B IDs:    ts=100, seq=0  ts=??? PROBLEM!                              │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  What happens when clock goes backward:                                      │
│                                                                              │
│  Before NTP correction:                                                      │
│    last_timestamp = 100                                                      │
│    Generated ID with timestamp = 100                                         │
│                                                                              │
│  After NTP correction (clock moved back 50ms):                              │
│    current_timestamp = 50                                                    │
│    current_timestamp < last_timestamp!                                       │
│                                                                              │
│  If we continue generating:                                                  │
│    Would generate ID with timestamp = 50                                     │
│    Could COLLIDE with earlier ID if sequence matches                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Clock Drift Handling Strategies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLOCK DRIFT HANDLING STRATEGIES                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Strategy 1: REFUSE AND WAIT (Twitter Snowflake Default)                    │
│  ─────────────────────────────────────────────────────────                  │
│  IF current_timestamp < last_timestamp THEN                                 │
│      IF drift < 5ms THEN                                                    │
│          SLEEP(drift)  // Small drift, wait it out                          │
│          RETRY                                                               │
│      ELSE                                                                    │
│          THROW ClockMovedBackwardError                                      │
│          // Let caller handle (retry, fail, use different generator)        │
│                                                                              │
│  Pros: Safest, guarantees uniqueness                                         │
│  Cons: Brief unavailability during clock correction                         │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Strategy 2: BORROW FROM FUTURE                                              │
│  ─────────────────────────────────                                          │
│  IF current_timestamp < last_timestamp THEN                                 │
│      // Keep using last_timestamp, increment sequence                       │
│      current_timestamp = last_timestamp                                     │
│      sequence++                                                              │
│      IF sequence > MAX_SEQUENCE THEN                                        │
│          current_timestamp = last_timestamp + 1  // Borrow 1ms from future │
│          sequence = 0                                                        │
│                                                                              │
│  Pros: Always available, no blocking                                         │
│  Cons: Reduces effective lifetime, IDs not truly time-ordered               │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Strategy 3: HYBRID LOGICAL CLOCKS (HLC)                                    │
│  ───────────────────────────────────────                                    │
│  Combines physical time with logical counter:                               │
│  hlc = max(physical_time, last_hlc) + 1                                     │
│                                                                              │
│  Pros: Handles drift gracefully, maintains causality                        │
│  Cons: More complex, not pure timestamp                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### NTP Best Practices

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NTP CONFIGURATION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Recommended NTP Setup:                                                      │
│  ──────────────────────                                                     │
│  1. Use multiple NTP servers (at least 3)                                   │
│  2. Include local stratum-1 servers if available                            │
│  3. Configure for gradual adjustment (slew mode, not step)                  │
│  4. Monitor offset continuously                                              │
│                                                                              │
│  Example chrony.conf:                                                        │
│  ────────────────────                                                       │
│  server time1.google.com iburst                                              │
│  server time2.google.com iburst                                              │
│  server time3.google.com iburst                                              │
│  makestep 0.1 3        # Step only if drift > 100ms, max 3 times           │
│  maxslewrate 500       # Max slew 500 ppm                                   │
│                                                                              │
│  Monitoring commands:                                                        │
│  ───────────────────                                                        │
│  chronyc tracking      # Show current offset                                │
│  chronyc sources -v    # Show NTP sources                                   │
│                                                                              │
│  Alert thresholds:                                                           │
│  ─────────────────                                                          │
│  Warning:  offset > 50ms                                                    │
│  Critical: offset > 100ms or clock stepped                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Critical Component 2: Machine ID Assignment

### Why Machine ID Matters

The 10-bit machine ID (1024 possible values) ensures uniqueness across generators. If two generators have the same machine ID, they can produce duplicate IDs.

### Machine ID Assignment Strategies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MACHINE ID ASSIGNMENT STRATEGIES                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Strategy 1: STATIC CONFIGURATION                                            │
│  ─────────────────────────────────                                          │
│  // config.yaml                                                              │
│  snowflake:                                                                  │
│    datacenter_id: 1                                                          │
│    worker_id: 3                                                              │
│                                                                              │
│  Pros:                               Cons:                                   │
│  • Simplest to implement             • Manual management                     │
│  • No external dependencies          • Risk of duplicate assignment         │
│  • Fast startup                      • Doesn't work with auto-scaling       │
│                                                                              │
│  Use when: Small, stable deployments with known topology                    │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Strategy 2: ZOOKEEPER / ETCD REGISTRATION                                  │
│  ─────────────────────────────────────────────                              │
│                                                                              │
│  ZooKeeper structure:                                                        │
│  /snowflake/                                                                 │
│  └── workers/                                                                │
│      ├── worker-0 (ephemeral) → data: "host1:8080"                          │
│      ├── worker-1 (ephemeral) → data: "host2:8080"                          │
│      └── worker-2 (ephemeral) → data: "host3:8080"                          │
│                                                                              │
│  Registration pseudocode:                                                    │
│  ────────────────────────                                                   │
│  FUNCTION acquire_machine_id():                                              │
│      FOR id = 0 TO 1023:                                                    │
│          path = "/snowflake/workers/worker-" + id                           │
│          TRY:                                                                │
│              zk.create(path, self.host, EPHEMERAL)                          │
│              RETURN id                                                       │
│          CATCH NodeExistsException:                                         │
│              CONTINUE                                                        │
│      THROW NoAvailableMachineIdError                                        │
│                                                                              │
│  Pros:                               Cons:                                   │
│  • Automatic assignment              • ZK dependency                         │
│  • Handles failures (ephemeral)      • Startup latency                      │
│  • Works with auto-scaling           • ZK unavailable = no new generators   │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Strategy 3: DATABASE SEQUENCE                                               │
│  ─────────────────────────────                                              │
│                                                                              │
│  Table: machine_id_registry                                                  │
│  ┌──────┬─────────────────┬─────────────────┬────────────┐                 │
│  │ id   │ host            │ registered_at   │ last_seen  │                 │
│  ├──────┼─────────────────┼─────────────────┼────────────┤                 │
│  │ 0    │ host1:8080      │ 2024-01-01      │ 2024-01-20 │                 │
│  │ 1    │ host2:8080      │ 2024-01-01      │ 2024-01-20 │                 │
│  │ 2    │ NULL (available)│ NULL            │ NULL       │                 │
│  └──────┴─────────────────┴─────────────────┴────────────┘                 │
│                                                                              │
│  Registration:                                                               │
│  UPDATE machine_id_registry                                                  │
│  SET host = 'host3:8080', registered_at = NOW()                             │
│  WHERE id = (SELECT MIN(id) FROM machine_id_registry WHERE host IS NULL)   │
│                                                                              │
│  Pros:                               Cons:                                   │
│  • Guaranteed uniqueness             • Database dependency at startup       │
│  • Persistent across restarts        • More complex recovery logic          │
│  • Easy to audit                     • Need heartbeat mechanism             │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Strategy 4: IP/MAC ADDRESS HASH                                             │
│  ─────────────────────────────────                                          │
│                                                                              │
│  machine_id = hash(ip_address + mac_address) % 1024                         │
│                                                                              │
│  Pros:                               Cons:                                   │
│  • No coordination needed            • COLLISION RISK (birthday problem)    │
│  • Deterministic                     • VMs can have duplicate MACs          │
│  • Works anywhere                    • Container networking issues          │
│                                                                              │
│  NOT RECOMMENDED for production at scale                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Kubernetes Considerations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    KUBERNETES MACHINE ID ASSIGNMENT                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Challenge: Pods are ephemeral, IPs change                                   │
│                                                                              │
│  Solution 1: StatefulSet with ordinal index                                  │
│  ─────────────────────────────────────────────                              │
│  apiVersion: apps/v1                                                         │
│  kind: StatefulSet                                                           │
│  metadata:                                                                   │
│    name: id-generator                                                        │
│  spec:                                                                       │
│    replicas: 32                                                              │
│    ...                                                                       │
│                                                                              │
│  Pod names: id-generator-0, id-generator-1, ...                             │
│  Machine ID = pod ordinal (0, 1, 2, ...)                                    │
│                                                                              │
│  In container:                                                               │
│  HOSTNAME=id-generator-5                                                     │
│  machine_id = int(HOSTNAME.split("-")[-1])  # = 5                           │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Solution 2: ConfigMap with explicit mapping                                 │
│  ─────────────────────────────────────────────                              │
│  apiVersion: v1                                                              │
│  kind: ConfigMap                                                             │
│  metadata:                                                                   │
│    name: machine-ids                                                         │
│  data:                                                                       │
│    id-generator-0: "0"                                                       │
│    id-generator-1: "1"                                                       │
│    ...                                                                       │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Solution 3: Init container with etcd/consul                                 │
│  ─────────────────────────────────────────────                              │
│  initContainers:                                                             │
│  - name: acquire-machine-id                                                  │
│    image: etcd-client                                                        │
│    command: ["/acquire-id.sh"]                                               │
│    # Writes machine_id to shared volume                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Critical Component 3: Sequence Overflow

### The Sequence Overflow Problem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SEQUENCE OVERFLOW SCENARIO                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Scenario: Traffic spike generating >4096 IDs in 1 millisecond              │
│                                                                              │
│  Millisecond: 1705789200000                                                  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Request  │ Timestamp        │ Sequence │ Status                        ││
│  ├──────────┼──────────────────┼──────────┼───────────────────────────────┤│
│  │ 1        │ 1705789200000    │ 0        │ ✓ Generated                   ││
│  │ 2        │ 1705789200000    │ 1        │ ✓ Generated                   ││
│  │ ...      │ ...              │ ...      │ ...                           ││
│  │ 4095     │ 1705789200000    │ 4094     │ ✓ Generated                   ││
│  │ 4096     │ 1705789200000    │ 4095     │ ✓ Generated (MAX)             ││
│  │ 4097     │ 1705789200000    │ 0 ← WRAP!│ ⚠ OVERFLOW!                   ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  If sequence wraps to 0 with same timestamp:                                │
│  ID 4097 = ID 1 (DUPLICATE!)                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Overflow Handling Strategies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SEQUENCE OVERFLOW HANDLING                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Strategy 1: WAIT FOR NEXT MILLISECOND (Standard)                           │
│  ──────────────────────────────────────────────────                         │
│  IF sequence > MAX_SEQUENCE THEN                                            │
│      // Spin-wait or sleep until timestamp advances                         │
│      WHILE current_time_ms() == last_timestamp:                             │
│          YIELD() or SLEEP(10 microseconds)                                  │
│      // Now in new millisecond, reset sequence                              │
│      sequence = 0                                                            │
│                                                                              │
│  Latency impact: 0-1ms worst case                                           │
│  Throughput: Limited to 4096/ms = 4,096,000/sec per generator               │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Strategy 2: RANDOMIZE STARTING SEQUENCE                                    │
│  ─────────────────────────────────────────                                  │
│  // On each new millisecond, start from random offset                       │
│  IF current_time_ms() > last_timestamp THEN                                 │
│      sequence = random(0, 1000)  // Random start                            │
│  ELSE                                                                        │
│      sequence++                                                              │
│                                                                              │
│  Pros: Distributes load, less predictable                                   │
│  Cons: Reduces effective capacity by start offset                           │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Strategy 3: RETURN ERROR (Let Caller Handle)                               │
│  ───────────────────────────────────────────────                            │
│  IF sequence > MAX_SEQUENCE THEN                                            │
│      THROW SequenceExhaustedError                                           │
│      // Caller can: retry, use different generator, queue request           │
│                                                                              │
│  Pros: Explicit failure, caller controls retry                              │
│  Cons: More complex client code                                             │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Strategy 4: LOAD BALANCING ACROSS GENERATORS                               │
│  ───────────────────────────────────────────────                            │
│  // If one generator is overloaded, route to another                        │
│  generator = pick_generator_with_capacity()                                 │
│  RETURN generator.next_id()                                                 │
│                                                                              │
│  Implementation: Track sequence fill rate, route accordingly                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Overflow Probability Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SEQUENCE OVERFLOW PROBABILITY                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Given: 12-bit sequence = 4096 IDs per millisecond                          │
│                                                                              │
│  Question: At what request rate do we expect overflows?                     │
│                                                                              │
│  If requests are uniformly distributed:                                      │
│  ───────────────────────────────────────                                    │
│  4096 IDs/ms = 4,096,000 IDs/sec                                            │
│                                                                              │
│  But requests are rarely uniform! Bursts happen.                            │
│                                                                              │
│  Modeling with Poisson distribution:                                         │
│  ─────────────────────────────────────                                      │
│  λ = average request rate per ms                                             │
│  P(overflow) = P(X > 4096) where X ~ Poisson(λ)                             │
│                                                                              │
│  Example calculations:                                                       │
│  ┌──────────────────┬─────────────────┬──────────────────────────────┐     │
│  │ Avg requests/ms  │ Avg requests/sec│ P(overflow in any given ms)  │     │
│  ├──────────────────┼─────────────────┼──────────────────────────────┤     │
│  │ 1000             │ 1,000,000       │ ~0% (practically never)      │     │
│  │ 2000             │ 2,000,000       │ ~0% (very rare)              │     │
│  │ 3000             │ 3,000,000       │ ~0.1% (once per 1000 ms)     │     │
│  │ 4000             │ 4,000,000       │ ~45% (very common!)          │     │
│  │ 4096             │ 4,096,000       │ ~50% (every other ms)        │     │
│  └──────────────────┴─────────────────┴──────────────────────────────┘     │
│                                                                              │
│  Recommendation: Keep average rate below 3000/ms (3M/sec) per generator    │
│  with headroom for bursts                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Bottleneck Analysis

### Identified Bottlenecks

| Bottleneck | Component | Impact | Likelihood | Mitigation |
|------------|-----------|--------|------------|------------|
| Clock sync failure | Timestamp | Duplicate IDs | Low | Refuse + wait, monitoring |
| Machine ID collision | Machine ID | Duplicate IDs | Very low | Proper assignment strategy |
| Sequence overflow | Sequence | Blocked requests | Medium at high scale | Wait, load balance |
| Lock contention | Thread-safety | Increased latency | Medium | Lock-free implementation |
| ZK unavailable | Machine ID | Can't start new generators | Low | Cached ID, graceful degradation |

### Bottleneck Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BOTTLENECK FLOW ANALYSIS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         Request for ID                                       │
│                              │                                               │
│                              ▼                                               │
│                    ┌───────────────────┐                                    │
│                    │ Acquire Lock      │ ◄── BOTTLENECK 1: Lock contention  │
│                    └─────────┬─────────┘     (use lock-free if needed)      │
│                              │                                               │
│                              ▼                                               │
│                    ┌───────────────────┐                                    │
│                    │ Get Timestamp     │ ◄── BOTTLENECK 2: System call      │
│                    └─────────┬─────────┘     (batch if high throughput)     │
│                              │                                               │
│                              ▼                                               │
│               ┌──────────────┴──────────────┐                               │
│               │                             │                               │
│         ts < last_ts?                  ts == last_ts?                       │
│               │                             │                               │
│               ▼                             ▼                               │
│    ┌─────────────────────┐       ┌─────────────────────┐                   │
│    │ CLOCK BACKWARD!     │       │ Increment Sequence  │                   │
│    │ ◄── BOTTLENECK 3    │       └──────────┬──────────┘                   │
│    │ (refuse/wait)       │                  │                               │
│    └─────────────────────┘                  ▼                               │
│                               ┌──────────────┴──────────────┐              │
│                               │                             │              │
│                          seq > 4095?                    seq <= 4095        │
│                               │                             │              │
│                               ▼                             │              │
│                    ┌─────────────────────┐                  │              │
│                    │ SEQUENCE OVERFLOW!  │                  │              │
│                    │ ◄── BOTTLENECK 4    │                  │              │
│                    │ (wait for next ms)  │                  │              │
│                    └─────────────────────┘                  │              │
│                                                             │              │
│                              ┌───────────────────────────────┘              │
│                              │                                               │
│                              ▼                                               │
│                    ┌───────────────────┐                                    │
│                    │ Construct ID      │                                    │
│                    │ (bit manipulation)│                                    │
│                    └─────────┬─────────┘                                    │
│                              │                                               │
│                              ▼                                               │
│                         Return ID                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Race Conditions

### Potential Race Conditions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RACE CONDITIONS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Race Condition 1: CONCURRENT SEQUENCE INCREMENT                            │
│  ─────────────────────────────────────────────────                          │
│  Thread A                     Thread B                                       │
│  ────────                     ────────                                       │
│  read sequence = 5            read sequence = 5                              │
│  compute new = 6              compute new = 6                                │
│  write sequence = 6           write sequence = 6   ← BOTH GOT SAME SEQ!    │
│                                                                              │
│  Solution: Use atomic increment or mutex                                     │
│  sequence = atomic_fetch_add(&seq_counter, 1)                               │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Race Condition 2: TIMESTAMP-SEQUENCE INCONSISTENCY                         │
│  ──────────────────────────────────────────────────                         │
│  Thread A                     Thread B                                       │
│  ────────                     ────────                                       │
│  read timestamp = 1000        (waiting)                                      │
│  (context switch)             read timestamp = 1001                          │
│  increment seq for ts=1000    reset seq to 0 for ts=1001                    │
│  (context switch back)                                                       │
│  use seq=6 with ts=1000       use seq=0 with ts=1001                        │
│  write last_ts = 1000         write last_ts = 1001                          │
│                                                                              │
│  Problem: Thread A's ID appears to be from before Thread B's                │
│  (minor issue - within tolerance for k-sorting)                             │
│                                                                              │
│  Solution: Use single mutex covering timestamp + sequence                   │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Race Condition 3: MACHINE ID REGISTRATION                                  │
│  ────────────────────────────────────────────                               │
│  Instance A                   Instance B                                     │
│  ──────────                   ──────────                                     │
│  check id=5 available         check id=5 available                          │
│  → yes                        → yes                                          │
│  register id=5                register id=5                                  │
│  → success!                   → success!   ← BOTH GOT SAME ID!             │
│                                                                              │
│  Solution: Use atomic compare-and-swap in ZK/etcd                           │
│  zk.create("/workers/5", EPHEMERAL) throws if exists                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Failure Scenarios

### Failure Mode Analysis

| Failure | Detection | Impact | Recovery |
|---------|-----------|--------|----------|
| NTP server down | Offset monitoring | Clock drift over time | Failover to backup NTP |
| Clock step backward | Timestamp comparison | Pause or error | Wait for catch-up |
| Generator crash | Health checks | No IDs from that generator | Instant restart (stateless) |
| ZK cluster down | Connection timeout | Can't register new generators | Use cached machine ID |
| Network partition | Unable to reach ZK | Machine ID renewal fails | Continue with existing ID |
| Disk full on ZK | ZK health checks | Can't write new registrations | Disk cleanup, add capacity |

### Graceful Degradation Strategies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GRACEFUL DEGRADATION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Scenario: ZooKeeper unavailable at startup                                  │
│  ─────────────────────────────────────────────                              │
│  1. Check local cache for previously assigned machine ID                    │
│  2. If cache exists and is recent (<24h), use cached ID                     │
│  3. If no cache, attempt to acquire from ZK with exponential backoff        │
│  4. After N retries, either:                                                 │
│     a. Fail startup (if uniqueness is critical)                             │
│     b. Generate random machine ID (if collision risk acceptable)            │
│                                                                              │
│  Scenario: High sequence overflow rate                                       │
│  ─────────────────────────────────────────                                  │
│  1. Monitor overflow rate (>100/min → warning, >1000/min → critical)        │
│  2. Options:                                                                 │
│     a. Add more generator instances                                         │
│     b. Enable request queuing with backpressure                             │
│     c. Temporarily switch to UUID v7 (no sequence limit)                    │
│                                                                              │
│  Scenario: Clock drift detected                                              │
│  ───────────────────────────────────                                        │
│  1. Alert operations team                                                    │
│  2. Continue generating with "borrow from future" strategy                  │
│  3. Log affected ID range for potential analysis                            │
│  4. Fix NTP configuration and monitor recovery                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
