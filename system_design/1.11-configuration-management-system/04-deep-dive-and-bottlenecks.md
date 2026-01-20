# Deep Dive & Bottlenecks

[← Back to Index](./00-index.md)

---

## Deep Dive 1: Consensus Protocol

### Leader Election Mechanics

```
┌─────────────────────────────────────────────────────────────────────┐
│  LEADER ELECTION DEEP DIVE                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Election Trigger Conditions:                                        │
│  1. Follower doesn't receive heartbeat within election timeout      │
│  2. Candidate doesn't win election within timeout                   │
│  3. Leader steps down (discovers higher term)                       │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Election Timeout Randomization:                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Base timeout: 150-300ms (configurable)                      │   │
│  │  Randomization: Each node picks random value in range        │   │
│  │                                                               │   │
│  │  Node A: 180ms  ←── First to timeout, starts election        │   │
│  │  Node B: 250ms                                                │   │
│  │  Node C: 200ms                                                │   │
│  │                                                               │   │
│  │  Purpose: Prevent split votes where multiple nodes           │   │
│  │           start elections simultaneously                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Vote Granting Rules:                                                │
│  1. Candidate's term >= voter's term                                │
│  2. Voter hasn't voted for another candidate this term              │
│  3. Candidate's log is at least as up-to-date as voter's           │
│                                                                      │
│  "Up-to-date" comparison:                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Compare (last_log_term, last_log_index) lexicographically   │   │
│  │                                                               │   │
│  │  Candidate A: (term=5, index=100)                            │   │
│  │  Voter B:     (term=5, index=95)                             │   │
│  │  → A is more up-to-date (same term, higher index)           │   │
│  │                                                               │   │
│  │  Candidate A: (term=4, index=200)                            │   │
│  │  Voter B:     (term=5, index=50)                             │   │
│  │  → B is more up-to-date (higher term wins)                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Log Replication Guarantees

```
┌─────────────────────────────────────────────────────────────────────┐
│  LOG REPLICATION GUARANTEES                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Safety Properties:                                                  │
│                                                                      │
│  1. Log Matching Property:                                           │
│     If two logs have an entry with same term and index,             │
│     then all preceding entries are identical.                        │
│                                                                      │
│     Leader: [1,1] [1,2] [2,3] [2,4] [3,5]                          │
│     Node A: [1,1] [1,2] [2,3] [2,4] [3,5]  ✓ Matches               │
│     Node B: [1,1] [1,2] [2,3]              ✓ Prefix matches        │
│     Node C: [1,1] [1,2] [3,3]              ✗ Conflict at index 3   │
│                                                                      │
│  2. Leader Completeness:                                             │
│     If entry is committed in term T, it will be in log of          │
│     all leaders for terms > T.                                       │
│                                                                      │
│  3. State Machine Safety:                                            │
│     If a server applies entry at index i to state machine,          │
│     no other server applies different entry at index i.              │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Commit Rules:                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  An entry is committed when:                                  │   │
│  │  1. Stored on majority of servers, AND                       │   │
│  │  2. At least one entry from current term is committed        │   │
│  │                                                               │   │
│  │  Why rule 2? Prevents committing entries from previous       │   │
│  │  terms that might be overwritten by a new leader.            │   │
│  │                                                               │   │
│  │  Example:                                                     │   │
│  │  Term 2: Leader A replicates entry X to A, B (2/5)          │   │
│  │  Term 3: Leader C (doesn't have X) overwrites with Y        │   │
│  │                                                               │   │
│  │  Solution: Only commit entries from current term;            │   │
│  │  older entries committed indirectly.                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Crash Recovery and State Reconstruction

```
┌─────────────────────────────────────────────────────────────────────┐
│  CRASH RECOVERY                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Recovery Steps:                                                     │
│                                                                      │
│  1. Load Persistent State:                                           │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  current_term  : Persisted to disk on every change       │    │
│     │  voted_for     : Persisted before responding to vote     │    │
│     │  log[]         : WAL on disk                             │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
│  2. Reconstruct State Machine:                                       │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  a. Load latest snapshot (if exists)                     │    │
│     │  b. Apply WAL entries after snapshot                     │    │
│     │  c. Set last_applied = snapshot_index + applied_entries  │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
│  3. Rejoin Cluster:                                                  │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  a. Start as follower                                    │    │
│     │  b. Wait for AppendEntries from leader                   │    │
│     │  c. Leader sends missing log entries                     │    │
│     │  d. Catch up and become voting member                    │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Snapshot Strategy:                                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Trigger: When WAL size > threshold (e.g., 10,000 entries)   │   │
│  │                                                               │   │
│  │  Process:                                                     │   │
│  │  1. Serialize current state machine to snapshot file         │   │
│  │  2. Record snapshot_index = last_applied                     │   │
│  │  3. Truncate WAL entries before snapshot_index               │   │
│  │  4. Keep snapshot + WAL suffix for recovery                  │   │
│  │                                                               │   │
│  │  Snapshot transfer (slow follower):                          │   │
│  │  1. Leader detects follower is behind snapshot point         │   │
│  │  2. Send InstallSnapshot RPC with full snapshot              │   │
│  │  3. Follower replaces state machine, truncates log           │   │
│  │  4. Resume normal replication                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Deep Dive 2: Watch Mechanism

### Event Ordering Guarantees

```
┌─────────────────────────────────────────────────────────────────────┐
│  WATCH EVENT ORDERING                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Guarantees:                                                         │
│                                                                      │
│  1. FIFO per watch:                                                  │
│     Events for a single watch are delivered in revision order.      │
│                                                                      │
│  2. No duplicates (with revision tracking):                          │
│     Each event delivered exactly once per watch.                    │
│                                                                      │
│  3. No gaps (from start_revision):                                   │
│     All events from start_revision to current are delivered.        │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Event Ordering Example:                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Commits:                                                     │   │
│  │    Rev 100: PUT /a                                           │   │
│  │    Rev 101: PUT /b                                           │   │
│  │    Rev 102: PUT /a (update)                                  │   │
│  │    Rev 103: DELETE /b                                        │   │
│  │                                                               │   │
│  │  Watch on prefix "/" from rev 100:                           │   │
│  │    Event 1: {rev=100, PUT, /a}                               │   │
│  │    Event 2: {rev=101, PUT, /b}                               │   │
│  │    Event 3: {rev=102, PUT, /a}                               │   │
│  │    Event 4: {rev=103, DELETE, /b}                            │   │
│  │                                                               │   │
│  │  Watch on key "/a" from rev 100:                             │   │
│  │    Event 1: {rev=100, PUT, /a}                               │   │
│  │    Event 2: {rev=102, PUT, /a}                               │   │
│  │    (rev 101, 103 skipped - different keys)                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Watch Coalescing and Batching

```
┌─────────────────────────────────────────────────────────────────────┐
│  WATCH COALESCING                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Problem: Rapid updates to same key generate many events            │
│                                                                      │
│  Scenario:                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  10ms: PUT /config/rate-limit = 100                          │   │
│  │  11ms: PUT /config/rate-limit = 200                          │   │
│  │  12ms: PUT /config/rate-limit = 150                          │   │
│  │  13ms: PUT /config/rate-limit = 175 (final value)            │   │
│  │                                                               │   │
│  │  Without coalescing: 4 events sent to watchers               │   │
│  │  With coalescing: 1 event (final value) if within window     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Implementation Strategies:                                          │
│                                                                      │
│  1. Time-based batching (etcd approach):                            │
│     - Collect events for 10-50ms                                    │
│     - Send batch to clients                                         │
│     - Reduces network overhead, increases latency                   │
│                                                                      │
│  2. Event coalescing (ZooKeeper approach):                          │
│     - Track "pending notification" flag per watch                   │
│     - If flag set, skip sending (client will re-read)               │
│     - Client gets latest value, may miss intermediate               │
│                                                                      │
│  3. Revision-based catch-up:                                         │
│     - Client tracks last received revision                          │
│     - On reconnect, request events from that revision               │
│     - No coalescing, guaranteed delivery                            │
│                                                                      │
│  Trade-off:                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Full events: Higher overhead, complete history              │   │
│  │  Coalesced:   Lower overhead, may miss intermediate values   │   │
│  │                                                               │   │
│  │  Recommendation: Full events for audit/replay needs;         │   │
│  │  coalescing acceptable for config where latest value matters │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Watch Memory Management

```
┌─────────────────────────────────────────────────────────────────────┐
│  WATCH MEMORY MANAGEMENT                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Memory Breakdown per Watch:                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Watch metadata:     ~200 bytes                              │   │
│  │  Filter/key buffer:  ~500 bytes                              │   │
│  │  Event queue:        ~4 KB (bounded)                         │   │
│  │  Connection state:   ~1 KB                                   │   │
│  │  ─────────────────────────────                               │   │
│  │  Total per watch:    ~6 KB                                   │   │
│  │                                                               │   │
│  │  50,000 watches:     ~300 MB                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Memory Pressure Scenarios:                                          │
│                                                                      │
│  1. Too many watches on single key:                                  │
│     - Solution: Limit watches per key (e.g., 10,000)                │
│     - Alternative: Fanout service for popular keys                  │
│                                                                      │
│  2. Slow client causing event queue backlog:                        │
│     - Solution: Bounded queue, disconnect slow clients              │
│     - etcd: Sends compacted response if too far behind              │
│                                                                      │
│  3. Watch on high-churn prefix:                                      │
│     - Solution: Rate limit notifications per watch                  │
│     - Alternative: Client-side filtering                            │
│                                                                      │
│  Protection Mechanisms:                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  max_watches_per_connection = 10,000                         │   │
│  │  max_event_queue_size = 1,000 events                         │   │
│  │  watch_progress_notify_interval = 10 minutes                 │   │
│  │  slow_client_disconnect_timeout = 60 seconds                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Deep Dive 3: Session/Lease Management

### Heartbeat Protocol

```
┌─────────────────────────────────────────────────────────────────────┐
│  LEASE KEEPALIVE PROTOCOL                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Recommended Pattern:                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Lease TTL:        30 seconds                                │   │
│  │  KeepAlive interval: TTL / 3 = 10 seconds                   │   │
│  │  Network timeout:  5 seconds                                 │   │
│  │                                                               │   │
│  │  This allows 2 missed keepalives before expiry:              │   │
│  │  T=0:  KeepAlive sent, TTL reset to 30s                     │   │
│  │  T=10: KeepAlive sent, TTL reset to 30s                     │   │
│  │  T=20: KeepAlive MISSED (network issue)                     │   │
│  │  T=30: KeepAlive MISSED → TTL=0, lease expires              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Client-side Implementation:                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  function lease_keepalive_loop(lease_id, ttl):               │   │
│  │      interval = ttl / 3                                      │   │
│  │      retry_count = 0                                          │   │
│  │      max_retries = 3                                          │   │
│  │                                                               │   │
│  │      while lease_valid:                                       │   │
│  │          try:                                                 │   │
│  │              response = send_keepalive(lease_id)             │   │
│  │              if response.ttl == -1:                          │   │
│  │                  # Lease expired on server                   │   │
│  │                  handle_lease_expired()                       │   │
│  │                  return                                       │   │
│  │              retry_count = 0                                  │   │
│  │          except NetworkError:                                 │   │
│  │              retry_count++                                    │   │
│  │              if retry_count >= max_retries:                  │   │
│  │                  handle_lease_expired()                       │   │
│  │                  return                                       │   │
│  │                                                               │   │
│  │          sleep(interval)                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Ephemeral Node Cleanup

```
┌─────────────────────────────────────────────────────────────────────┐
│  EPHEMERAL KEY CLEANUP                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Cleanup Trigger:                                                    │
│  1. Lease TTL expires (no keepalive received)                       │
│  2. Client explicitly revokes lease                                 │
│  3. Server detects client disconnect (TCP reset)                    │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Cleanup Process:                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  function on_lease_expired(lease_id):                        │   │
│  │      # Get all keys attached to lease                        │   │
│  │      keys = lease_to_keys[lease_id]                          │   │
│  │                                                               │   │
│  │      # Delete all attached keys (batch for efficiency)       │   │
│  │      for key in keys:                                        │   │
│  │          delete_request = DeleteRequest(key)                 │   │
│  │          batch.append(delete_request)                        │   │
│  │                                                               │   │
│  │      # Execute as single Raft proposal                       │   │
│  │      raft_propose(BatchDelete(batch))                        │   │
│  │                                                               │   │
│  │      # Cleanup lease state                                    │   │
│  │      delete lease_to_keys[lease_id]                          │   │
│  │      delete leases[lease_id]                                 │   │
│  │                                                               │   │
│  │      # Trigger watch notifications for deleted keys          │   │
│  │      for key in keys:                                        │   │
│  │          notify_watchers(key, DELETE, revision)              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Edge Case: Lease Expiry During Partition                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Scenario:                                                    │   │
│  │  - Client holds lock via ephemeral key                       │   │
│  │  - Network partition isolates client from cluster            │   │
│  │  - Lease expires on cluster (key deleted)                    │   │
│  │  - Client still thinks it holds lock (DANGEROUS!)            │   │
│  │                                                               │   │
│  │  Solution: Fencing tokens                                     │   │
│  │  - Include lease version/revision in lock value              │   │
│  │  - Resource checks token before accepting operations         │   │
│  │  - Stale token → operation rejected                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Split-Brain Handling

```
┌─────────────────────────────────────────────────────────────────────┐
│  SPLIT-BRAIN SCENARIOS                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Scenario 1: Network Partition                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Partition A (2 nodes)     │     Partition B (3 nodes)       │   │
│  │  [Leader*, Follower]       │     [Follower, Follower, F]    │   │
│  │                            │                                  │   │
│  │  * Old leader, loses       │     New leader elected          │   │
│  │    majority, steps down    │     (has majority)              │   │
│  │                            │                                  │   │
│  │  Clients in A:             │     Clients in B:               │   │
│  │  - Reads may work (stale)  │     - Full functionality        │   │
│  │  - Writes FAIL (no quorum) │     - Writes succeed            │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Leader Lease (prevents stale reads):                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Problem: Old leader might serve stale reads during split    │   │
│  │                                                               │   │
│  │  Solution: Leader lease                                       │   │
│  │  1. Leader holds a "lease" that expires if not renewed       │   │
│  │  2. Lease renewed when heartbeat acknowledged by majority    │   │
│  │  3. If lease expires, leader rejects all requests            │   │
│  │                                                               │   │
│  │  Timing:                                                      │   │
│  │  - Heartbeat interval: 100ms                                 │   │
│  │  - Leader lease duration: 500ms                              │   │
│  │  - Election timeout: 1000-2000ms                             │   │
│  │                                                               │   │
│  │  Guarantee: Old leader stops serving before new elected     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Client Behavior During Partition:                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  1. Detect partition (requests timing out)                   │   │
│  │  2. Try other cluster members                                │   │
│  │  3. If all fail, enter degraded mode:                        │   │
│  │     - Use cached configuration                               │   │
│  │     - Log warnings                                           │   │
│  │     - Retry with exponential backoff                         │   │
│  │  4. On reconnect, validate cached data against server        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Bottleneck Analysis

### Bottleneck 1: Leader Bottleneck (All Writes Through Leader)

```
┌─────────────────────────────────────────────────────────────────────┐
│  LEADER BOTTLENECK                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Problem:                                                            │
│  - All writes go through single leader                              │
│  - Leader CPU, network, disk become bottleneck                      │
│  - Adding followers doesn't increase write throughput               │
│                                                                      │
│  Typical Limits:                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Single leader throughput: 10,000-50,000 writes/sec          │   │
│  │  Limiting factors:                                            │   │
│  │  - Disk fsync latency (1-10ms per batch)                     │   │
│  │  - Network RTT to followers (0.1-1ms LAN)                    │   │
│  │  - Serialization/consensus overhead                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Mitigations:                                                        │
│                                                                      │
│  1. Batch writes:                                                    │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  Collect writes for 1-5ms, commit as single Raft entry   │    │
│     │  Amortizes consensus overhead across multiple writes     │    │
│     │  Trade-off: Higher latency for individual writes         │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
│  2. Pipelining:                                                      │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  Don't wait for previous entry to commit before sending  │    │
│     │  Send multiple AppendEntries in parallel                 │    │
│     │  Increases throughput with same latency                  │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
│  3. Sharding (for very high scale):                                 │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  Split keyspace across multiple clusters                 │    │
│     │  /service-a/* → Cluster 1                                │    │
│     │  /service-b/* → Cluster 2                                │    │
│     │  Requires client-side routing                            │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Bottleneck 2: Watch Storm on Popular Keys

```
┌─────────────────────────────────────────────────────────────────────┐
│  WATCH STORM BOTTLENECK                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Problem:                                                            │
│  - Single key watched by 10,000+ clients                            │
│  - Update triggers 10,000 notifications simultaneously              │
│  - Network/CPU spike, potential cascading failures                  │
│                                                                      │
│  Example:                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Key: /config/global/feature-flags                           │   │
│  │  Watchers: 50,000 services                                   │   │
│  │                                                               │   │
│  │  Update triggers:                                             │   │
│  │  - 50,000 events @ 1KB each = 50MB network burst             │   │
│  │  - All 50,000 services simultaneously refetch config         │   │
│  │  - "Thundering herd" on dependent services                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Mitigations:                                                        │
│                                                                      │
│  1. Jittered notifications:                                          │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  Add random delay (0-5s) before sending each notification│    │
│     │  Spreads load over time                                  │    │
│     │  Trade-off: Increased notification latency               │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
│  2. Fanout service:                                                  │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  Dedicated service subscribes to popular keys            │    │
│     │  Clients subscribe to fanout service instead             │    │
│     │  Fanout service handles distribution, rate limiting      │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
│  3. Client-side caching with TTL:                                   │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  Clients cache config locally with 30-60s TTL            │    │
│     │  On notification, invalidate cache (don't refetch)       │    │
│     │  Natural load spreading as TTLs expire at different times│    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
│  4. Watch multiplexing:                                              │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  Per-host daemon watches on behalf of local services     │    │
│     │  1000 hosts × 50 services = 1000 watches (not 50,000)   │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Bottleneck 3: Storage I/O (WAL fsync Latency)

```
┌─────────────────────────────────────────────────────────────────────┐
│  STORAGE I/O BOTTLENECK                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Problem:                                                            │
│  - Every committed write requires fsync to WAL                      │
│  - fsync latency: 1-10ms (SSD), 10-50ms (HDD)                      │
│  - Limits write throughput regardless of CPU/network                │
│                                                                      │
│  Disk Type Comparison:                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  HDD:          10-20ms fsync → ~50-100 writes/sec           │   │
│  │  SATA SSD:     1-3ms fsync  → ~300-1000 writes/sec         │   │
│  │  NVMe SSD:     0.1-0.5ms    → ~2000-10000 writes/sec       │   │
│  │  Optane:       0.01-0.1ms   → ~10000-100000 writes/sec     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Mitigations:                                                        │
│                                                                      │
│  1. Write batching:                                                  │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  Batch multiple writes into single fsync                 │    │
│     │  100 writes × 1 fsync vs 1 write × 100 fsyncs           │    │
│     │  etcd: --max-request-bytes, batching window              │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
│  2. Fast storage:                                                    │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  NVMe SSDs strongly recommended                          │    │
│     │  Avoid network-attached storage (adds latency)           │    │
│     │  Dedicated disk for WAL (not shared with snapshots)      │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
│  3. Parallel disk writes (leader optimization):                     │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  Write to local WAL in parallel with sending to followers│    │
│     │  Commit when both local write and quorum ack complete    │    │
│     │  Reduces latency from sequential to parallel             │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Bottleneck 4: Large Value Handling

```
┌─────────────────────────────────────────────────────────────────────┐
│  LARGE VALUE BOTTLENECK                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Problem:                                                            │
│  - Config systems optimized for small values (< 1 KB)               │
│  - Large values (100 KB - 1 MB) cause issues:                       │
│    • Slow replication                                                │
│    • Memory pressure                                                 │
│    • Watch notification size                                         │
│                                                                      │
│  Impact Analysis:                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Value Size   │ Replication │ Watch Event │ Memory Impact    │   │
│  │  ─────────────┼─────────────┼─────────────┼─────────────────│   │
│  │  1 KB         │ < 1ms       │ 1 KB        │ Negligible       │   │
│  │  100 KB       │ 5-10ms      │ 100 KB      │ Noticeable       │   │
│  │  1 MB         │ 50-100ms    │ 1 MB        │ Significant      │   │
│  │  > 1 MB       │ REJECTED    │ N/A         │ N/A              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Mitigations:                                                        │
│                                                                      │
│  1. Value size limits:                                               │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  etcd: --max-request-bytes (default 1.5 MB)             │    │
│     │  ZooKeeper: jute.maxbuffer (default 1 MB)               │    │
│     │  Reject values exceeding limit at API layer             │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
│  2. External storage for large data:                                │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  Store large config in object storage (S3, GCS)          │    │
│     │  Config system stores URL/reference only                 │    │
│     │  Client fetches full config from object storage          │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
│  3. Config splitting:                                                │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  Break large config into smaller pieces                  │    │
│     │  /config/app/db, /config/app/cache, /config/app/queue   │    │
│     │  Client assembles from multiple keys                     │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Performance Optimization Summary

| Bottleneck | Impact | Mitigation | Trade-off |
|------------|--------|------------|-----------|
| Leader writes | Limited write throughput | Batching, pipelining | Higher per-write latency |
| Watch storms | Network/CPU spikes | Jitter, fanout, caching | Notification delay |
| WAL fsync | I/O bound writes | NVMe, batching | Cost, complexity |
| Large values | Slow replication | Size limits, external storage | Application complexity |
| Many watches | Memory pressure | Limits, multiplexing | Fewer subscriptions |
| Compaction | CPU/I/O during compact | Off-peak scheduling | Stale history |
