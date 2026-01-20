# Low-Level Design

[← Back to Index](./00-index.md)

---

## Log Segment Structure

### On-Disk Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOG DIRECTORY STRUCTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /data/kafka-logs/                                              │
│  └── order-events-0/              # Topic-Partition directory   │
│      ├── 00000000000000000000.log      # Segment file (base offset 0)
│      ├── 00000000000000000000.index    # Offset index           │
│      ├── 00000000000000000000.timeindex # Time index            │
│      ├── 00000000000001048576.log      # Next segment (base 1048576)
│      ├── 00000000000001048576.index                              │
│      ├── 00000000000001048576.timeindex                          │
│      ├── leader-epoch-checkpoint       # Leader epoch info      │
│      └── partition.metadata            # Partition metadata     │
│                                                                  │
│  Segment roll conditions:                                        │
│  • Size: segment.bytes (default 1GB)                            │
│  • Time: segment.ms (default 7 days)                            │
│  • Index full: index.size.max.bytes (default 10MB)              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Log Segment File Format

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOG SEGMENT (.log file)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Record Batch 1 (offset 0-99)                             │   │
│  │ ┌─────────────────────────────────────────────────────┐ │   │
│  │ │ Batch Header (61 bytes)                             │ │   │
│  │ │ • base_offset: 0                                    │ │   │
│  │ │ • batch_length: 1500                                │ │   │
│  │ │ • partition_leader_epoch: 5                         │ │   │
│  │ │ • magic: 2 (version)                                │ │   │
│  │ │ • crc: checksum                                     │ │   │
│  │ │ • attributes: compression, timestamp type           │ │   │
│  │ │ • last_offset_delta: 99                             │ │   │
│  │ │ • first_timestamp: 1704067200000                    │ │   │
│  │ │ • max_timestamp: 1704067205000                      │ │   │
│  │ │ • producer_id: 12345 (for idempotence)              │ │   │
│  │ │ • producer_epoch: 0                                 │ │   │
│  │ │ • base_sequence: 0                                  │ │   │
│  │ │ • records_count: 100                                │ │   │
│  │ └─────────────────────────────────────────────────────┘ │   │
│  │ ┌─────────────────────────────────────────────────────┐ │   │
│  │ │ Record 0                                            │ │   │
│  │ │ • length: varint                                    │ │   │
│  │ │ • attributes: 0                                     │ │   │
│  │ │ • timestamp_delta: varint (from first_timestamp)    │ │   │
│  │ │ • offset_delta: varint (from base_offset)           │ │   │
│  │ │ • key_length + key                                  │ │   │
│  │ │ • value_length + value                              │ │   │
│  │ │ • headers_count + headers[]                         │ │   │
│  │ └─────────────────────────────────────────────────────┘ │   │
│  │ │ Record 1...99                                       │ │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Record Batch 2 (offset 100-199)                          │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Index File Formats

```
┌─────────────────────────────────────────────────────────────────┐
│                    OFFSET INDEX (.index)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Sparse index: every log.index.interval.bytes (4KB default)     │
│                                                                  │
│  Entry format (8 bytes each):                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ relative_offset (4 bytes) │ position (4 bytes)           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Example entries:                                                │
│  │ Offset  │ Position │                                         │
│  │─────────│──────────│                                         │
│  │ 0       │ 0        │  First record batch                     │
│  │ 100     │ 4096     │  ~4KB into segment                      │
│  │ 200     │ 8192     │  ~8KB into segment                      │
│  │ ...     │ ...      │                                         │
│                                                                  │
│  Lookup: binary search to find floor entry, scan from there     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    TIME INDEX (.timeindex)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Entry format (12 bytes each):                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ timestamp (8 bytes) │ relative_offset (4 bytes)          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Used for: consumer.seekToTimestamp(timestamp)                  │
│  • Find offset for a given timestamp                            │
│  • Replay from specific point in time                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Message Record

```
STRUCT Record:
    // Batch-level (shared across records in batch)
    base_offset: int64           # First offset in batch
    partition_leader_epoch: int32 # Epoch of partition leader
    magic: int8                  # Format version (2 = current)
    crc: int32                   # CRC32C of batch
    attributes: int16            # Compression, timestamp type, transactional
    last_offset_delta: int32     # Offset of last record relative to base
    first_timestamp: int64       # Timestamp of first record (ms since epoch)
    max_timestamp: int64         # Max timestamp in batch
    producer_id: int64           # For idempotent producer
    producer_epoch: int16        # Producer epoch
    base_sequence: int32         # Sequence number for idempotence
    records_count: int32         # Number of records in batch

    // Record-level (per message)
    STRUCT SingleRecord:
        length: varint           # Record length
        attributes: int8         # Record attributes
        timestamp_delta: varint  # Delta from first_timestamp
        offset_delta: varint     # Delta from base_offset
        key_length: varint       # Key length (-1 for null)
        key: bytes               # Message key (optional)
        value_length: varint     # Value length (-1 for null/tombstone)
        value: bytes             # Message payload
        headers_count: varint    # Number of headers
        headers: Header[]        # Key-value headers

    STRUCT Header:
        key_length: varint
        key: string              # Header key (UTF-8)
        value_length: varint
        value: bytes             # Header value
```

### Partition Metadata

```
STRUCT PartitionState:
    topic: string
    partition_id: int32
    leader: int32                # Broker ID of current leader
    leader_epoch: int32          # Monotonically increasing epoch
    isr: int32[]                 # In-Sync Replica broker IDs
    replicas: int32[]            # All replica broker IDs
    offline_replicas: int32[]    # Replicas known to be offline

STRUCT PartitionLog:
    log_start_offset: int64      # Earliest available offset
    log_end_offset: int64        # Next offset to be assigned (LEO)
    high_watermark: int64        # Last committed offset (HW)
    last_stable_offset: int64    # For transactions (LSO)
```

### Consumer Group State

```
STRUCT ConsumerGroup:
    group_id: string
    state: enum { EMPTY, PREPARING_REBALANCE, COMPLETING_REBALANCE, STABLE, DEAD }
    protocol_type: string        # "consumer" for standard consumers
    generation_id: int32         # Incremented on each rebalance
    leader_id: string            # Member ID of group leader
    members: Member[]

STRUCT Member:
    member_id: string            # Unique member identifier
    client_id: string            # Client-provided identifier
    client_host: string          # IP address
    session_timeout_ms: int32    # Heartbeat timeout
    rebalance_timeout_ms: int32  # Max time for rebalance
    assignment: PartitionAssignment[]

STRUCT PartitionAssignment:
    topic: string
    partitions: int32[]

STRUCT OffsetCommit:
    group_id: string
    topic: string
    partition: int32
    offset: int64                # Committed offset
    leader_epoch: int32          # Optional, for fencing
    metadata: string             # Optional consumer metadata
    commit_timestamp: int64
```

---

## API Design

### Producer API

```
// Send message to topic
FUNCTION produce(topic, key, value, headers, partition):
    INPUT:
        topic: string               # Target topic
        key: bytes (optional)       # Message key for partitioning
        value: bytes                # Message payload
        headers: Map<string, bytes> # Optional headers
        partition: int32 (optional) # Explicit partition (overrides key)
    OUTPUT:
        RecordMetadata:
            topic: string
            partition: int32
            offset: int64
            timestamp: int64
    ERRORS:
        NOT_LEADER_OR_FOLLOWER     # Partition leader changed
        REQUEST_TIMED_OUT          # No response within timeout
        MESSAGE_TOO_LARGE          # Exceeds max.message.bytes
        INVALID_TOPIC              # Topic doesn't exist

// Batch produce (internal, used by client library)
FUNCTION produce_batch(topic_partitions):
    INPUT:
        topic_partitions: Map<TopicPartition, RecordBatch[]>
    OUTPUT:
        Map<TopicPartition, ProduceResponse>:
            error_code: int16
            base_offset: int64
            log_append_time: int64
```

### Consumer API

```
// Subscribe to topics
FUNCTION subscribe(topics, rebalance_listener):
    INPUT:
        topics: string[]            # Topics to subscribe
        rebalance_listener: Callback # Called on partition assignment changes
    SIDE_EFFECT:
        Joins consumer group, triggers rebalance

// Poll for messages
FUNCTION poll(timeout_ms):
    INPUT:
        timeout_ms: int64           # Max time to block
    OUTPUT:
        ConsumerRecords:
            records: Map<TopicPartition, Record[]>
    NOTES:
        - Handles heartbeats
        - Triggers rebalance if needed
        - Auto-commits if enabled

// Commit offsets
FUNCTION commit(offsets, async):
    INPUT:
        offsets: Map<TopicPartition, OffsetAndMetadata> (optional)
        async: boolean              # If true, don't wait for response
    OUTPUT:
        void (sync) or Future (async)
    NOTES:
        - If offsets null, commits current positions
        - Writes to __consumer_offsets topic

// Seek to offset
FUNCTION seek(partition, offset):
    INPUT:
        partition: TopicPartition
        offset: int64 | BEGINNING | END | timestamp
    SIDE_EFFECT:
        Next poll() returns records from this offset
```

### Admin API

```
// Create topic
FUNCTION create_topic(name, partitions, replication_factor, configs):
    INPUT:
        name: string
        partitions: int32           # Number of partitions
        replication_factor: int16   # Number of replicas
        configs: Map<string, string> # Topic-level configs
    OUTPUT:
        void
    ERRORS:
        TOPIC_ALREADY_EXISTS
        INVALID_REPLICATION_FACTOR

// Describe topic
FUNCTION describe_topic(names):
    INPUT:
        names: string[]
    OUTPUT:
        Map<string, TopicDescription>:
            name: string
            partitions: PartitionInfo[]
            configs: Map<string, ConfigEntry>

// Alter partition count
FUNCTION create_partitions(topic, new_count, assignments):
    INPUT:
        topic: string
        new_count: int32            # Must be > current count
        assignments: int32[][] (optional) # Replica assignments
    NOTES:
        - Cannot decrease partitions
        - Existing data unaffected
        - New partitions start empty
```

---

## Core Algorithms

### Partition Assignment Algorithm

```
// Range Assignor (default in older versions)
FUNCTION range_assign(topics, members):
    INPUT:
        topics: string[]            # Subscribed topics
        members: Member[]           # Consumer group members
    OUTPUT:
        Map<Member, TopicPartition[]>

    ALGORITHM:
        assignment = empty map

        FOR each topic IN sorted(topics):
            partitions = get_partitions(topic)
            num_partitions = len(partitions)
            num_members = len(members)

            // Calculate partitions per member
            partitions_per_member = num_partitions / num_members
            extra_partitions = num_partitions % num_members

            partition_index = 0
            FOR i, member IN enumerate(sorted(members)):
                // Some members get one extra partition
                count = partitions_per_member + (1 IF i < extra_partitions ELSE 0)

                FOR j FROM 0 TO count:
                    assignment[member].append(TopicPartition(topic, partition_index))
                    partition_index += 1

        RETURN assignment

    EXAMPLE:
        // 3 partitions, 2 consumers
        // Consumer 1: P0, P1 (2 partitions)
        // Consumer 2: P2 (1 partition)


// Sticky Assignor (preferred)
FUNCTION sticky_assign(topics, members, previous_assignment):
    INPUT:
        topics: string[]
        members: Member[]
        previous_assignment: Map<Member, TopicPartition[]>
    OUTPUT:
        Map<Member, TopicPartition[]>

    ALGORITHM:
        // Phase 1: Keep existing assignments where possible
        assignment = empty map
        unassigned = all partitions

        FOR each member IN members:
            FOR each partition IN previous_assignment[member]:
                IF partition IN unassigned AND member subscribed to partition.topic:
                    assignment[member].append(partition)
                    unassigned.remove(partition)

        // Phase 2: Assign remaining partitions for balance
        WHILE unassigned is not empty:
            // Find member with fewest partitions
            member = min(members, key=lambda m: len(assignment[m]))

            // Assign next unassigned partition they're subscribed to
            FOR partition IN unassigned:
                IF member subscribed to partition.topic:
                    assignment[member].append(partition)
                    unassigned.remove(partition)
                    BREAK

        RETURN assignment

    BENEFITS:
        - Minimizes partition movement during rebalance
        - Better locality (consumer keeps familiar partitions)
        - Cooperative rebalance compatible
```

### Leader Election Algorithm

```
FUNCTION elect_partition_leader(partition, current_isr, preferred_leader):
    INPUT:
        partition: TopicPartition
        current_isr: int32[]        # In-Sync Replica broker IDs
        preferred_leader: int32     # First replica in assignment
    OUTPUT:
        new_leader: int32
        new_isr: int32[]

    ALGORITHM:
        // Priority 1: Elect from ISR
        IF current_isr is not empty:
            // Prefer the preferred leader if it's in ISR
            IF preferred_leader IN current_isr:
                RETURN (preferred_leader, current_isr)

            // Otherwise, first available ISR member
            RETURN (current_isr[0], current_isr)

        // Priority 2: Unclean leader election (if enabled)
        IF config.unclean.leader.election.enable:
            // Find any live replica (may have lost data!)
            FOR replica IN all_replicas:
                IF broker_is_alive(replica):
                    LOG.warn("Unclean leader election for partition", partition)
                    RETURN (replica, [replica])

        // No leader available
        RETURN (NONE, [])

    NOTES:
        - ISR = replicas that are fully caught up to leader
        - Unclean election risks data loss (disabled by default)
        - Leader epoch incremented on each election
```

### Fetch Protocol

```
FUNCTION handle_fetch_request(request):
    INPUT:
        request:
            replica_id: int32       # -1 for consumers, broker ID for replication
            max_wait_ms: int32      # Max time to wait for data
            min_bytes: int32        # Min data to return
            max_bytes: int32        # Max data to return
            partitions: FetchPartition[]

    ALGORITHM:
        responses = []

        FOR each fetch_partition IN request.partitions:
            partition = get_partition(fetch_partition.topic, fetch_partition.partition)

            // Authorization check
            IF NOT authorized(request, partition, READ):
                responses.append(error=TOPIC_AUTHORIZATION_FAILED)
                CONTINUE

            // Only leader serves fetches (or any ISR for follower fetch)
            IF request.replica_id == -1:  // Consumer
                IF NOT is_leader(partition):
                    responses.append(error=NOT_LEADER_OR_FOLLOWER)
                    CONTINUE

            fetch_offset = fetch_partition.fetch_offset
            max_bytes = fetch_partition.max_bytes

            // Validate offset
            IF fetch_offset < log_start_offset:
                responses.append(error=OFFSET_OUT_OF_RANGE)
                CONTINUE

            // Read from log
            records = read_log(partition, fetch_offset, max_bytes)

            // For consumers, only return up to high watermark
            IF request.replica_id == -1:
                records = filter(records, offset <= high_watermark)

            responses.append(
                partition=fetch_partition.partition,
                error=NONE,
                high_watermark=partition.high_watermark,
                records=records
            )

        // Wait for min_bytes or max_wait_ms
        IF total_bytes(responses) < request.min_bytes:
            wait_for_data(request.max_wait_ms)
            // Re-read if new data arrived

        RETURN responses
```

### Offset Commit Protocol

```
FUNCTION handle_offset_commit(group_id, member_id, generation, offsets):
    INPUT:
        group_id: string
        member_id: string
        generation: int32           # Consumer group generation
        offsets: Map<TopicPartition, OffsetAndMetadata>

    ALGORITHM:
        group = get_consumer_group(group_id)

        // Validate member and generation
        IF group.state != STABLE:
            RETURN error=REBALANCE_IN_PROGRESS

        IF generation != group.generation_id:
            RETURN error=ILLEGAL_GENERATION

        IF member_id NOT IN group.members:
            RETURN error=UNKNOWN_MEMBER_ID

        // Validate partitions are assigned to this member
        FOR partition IN offsets.keys():
            IF partition NOT IN group.members[member_id].assignment:
                RETURN error=UNKNOWN_TOPIC_OR_PARTITION

        // Write to __consumer_offsets topic
        offset_topic_partition = hash(group_id) % 50  // 50 partitions by default

        record = OffsetCommitRecord(
            group_id=group_id,
            offsets=offsets,
            timestamp=now()
        )

        produce(__consumer_offsets, offset_topic_partition, record)

        RETURN success

FUNCTION get_committed_offset(group_id, partition):
    // Read from compacted __consumer_offsets topic
    offset_topic_partition = hash(group_id) % 50
    cache = offset_cache[offset_topic_partition]

    RETURN cache.get((group_id, partition))
```

### ISR Management

```
FUNCTION update_isr(partition, follower_id, follower_leo):
    INPUT:
        partition: Partition
        follower_id: int32          # Broker ID of follower
        follower_leo: int64         # Follower's log end offset

    ALGORITHM:
        leader_leo = partition.log_end_offset
        current_isr = partition.isr

        // Check if follower is caught up
        is_caught_up = (leader_leo - follower_leo) <= replica.lag.max.messages
                       OR last_fetch_time[follower_id] >= now() - replica.lag.time.max.ms

        IF follower_id IN current_isr:
            IF NOT is_caught_up:
                // Remove from ISR (shrink)
                new_isr = current_isr.remove(follower_id)
                partition.isr = new_isr
                persist_isr_change(partition, new_isr)
                LOG.warn("ISR shrunk", partition, removed=follower_id)

                // Check min.insync.replicas
                IF len(new_isr) < min.insync.replicas:
                    partition.accept_writes = FALSE
        ELSE:
            IF is_caught_up:
                // Add to ISR (expand)
                new_isr = current_isr.add(follower_id)
                partition.isr = new_isr
                persist_isr_change(partition, new_isr)
                LOG.info("ISR expanded", partition, added=follower_id)

        // Update high watermark (min LEO across ISR)
        new_hw = min(leo FOR replica IN partition.isr)
        IF new_hw > partition.high_watermark:
            partition.high_watermark = new_hw


FUNCTION should_ack_produce(partition, acks_config):
    // Called after leader appends, before responding to producer
    IF acks_config == 0:
        RETURN TRUE  // No ack needed

    IF acks_config == 1:
        RETURN TRUE  // Leader only

    IF acks_config == -1 (all):
        // Wait for all ISR to acknowledge
        FOR replica IN partition.isr:
            IF replica.leo < partition.log_end_offset:
                RETURN FALSE
        RETURN TRUE
```

---

## Consumer Group Rebalance Protocol

### Classic Rebalance (Eager)

```mermaid
sequenceDiagram
    participant C1 as Consumer 1
    participant C2 as Consumer 2
    participant Coord as Group Coordinator

    Note over C1,C2: Initial state: C1 has P0,P1; C2 has P2,P3

    C2->>C2: Crashes or leaves

    Note over C1: Heartbeat reveals C2 gone

    C1->>Coord: JoinGroup
    Note over C1: STOPS processing (eager)

    Coord->>Coord: Wait for other members

    Coord-->>C1: JoinResponse (you are leader)

    C1->>C1: Compute new assignment:<br/>C1 gets P0,P1,P2,P3

    C1->>Coord: SyncGroup (with assignment)

    Coord-->>C1: SyncResponse (P0,P1,P2,P3)

    C1->>C1: Resume processing all partitions
```

### Cooperative Rebalance (Incremental)

```mermaid
sequenceDiagram
    participant C1 as Consumer 1
    participant C2 as Consumer 2
    participant Coord as Group Coordinator

    Note over C1,C2: New consumer C2 joins

    C2->>Coord: JoinGroup

    par Rebalance triggered
        Coord->>C1: Rebalance notification
        Coord->>C2: Rebalance notification
    end

    Note over C1: KEEPS processing P0,P1,P2 (cooperative)

    C1->>Coord: JoinGroup
    C2->>Coord: JoinGroup

    Coord-->>C1: JoinResponse (leader)
    Coord-->>C2: JoinResponse

    C1->>C1: Compute assignment:<br/>C1: P0,P1; C2: P2

    C1->>Coord: SyncGroup
    C2->>Coord: SyncGroup

    Coord-->>C1: SyncResponse (P0,P1)
    Coord-->>C2: SyncResponse (P2)

    Note over C1: Only revokes P2<br/>Keeps processing P0,P1
    Note over C2: Starts processing P2
```

### Rebalance State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                CONSUMER GROUP STATE MACHINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                      ┌───────────┐                              │
│                      │   EMPTY   │                              │
│                      └─────┬─────┘                              │
│                            │ JoinGroup                          │
│                            ▼                                    │
│                   ┌─────────────────┐                           │
│                   │   PREPARING     │                           │
│                   │   REBALANCE     │◄────────────────────┐     │
│                   └────────┬────────┘                     │     │
│                            │ All members joined           │     │
│                            ▼                              │     │
│                   ┌─────────────────┐                     │     │
│                   │  COMPLETING     │                     │     │
│                   │   REBALANCE     │                     │     │
│                   └────────┬────────┘                     │     │
│                            │ All members synced           │     │
│                            ▼                              │     │
│                      ┌───────────┐     Member leaves/     │     │
│                      │  STABLE   │─────joins/timeout──────┘     │
│                      └─────┬─────┘                              │
│                            │ All members leave                  │
│                            ▼                                    │
│                      ┌───────────┐                              │
│                      │   DEAD    │                              │
│                      └───────────┘                              │
│                                                                  │
│  Timeouts:                                                       │
│  • session.timeout.ms: Heartbeat timeout (remove member)        │
│  • rebalance.timeout.ms: Max time for members to join/sync      │
│  • max.poll.interval.ms: Max time between polls (remove member) │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration Reference

### Producer Configuration

| Config | Default | Description |
|--------|---------|-------------|
| `acks` | `all` | Durability: 0=none, 1=leader, all=ISR |
| `retries` | `MAX_INT` | Retry count on failure |
| `batch.size` | `16384` | Max batch size in bytes |
| `linger.ms` | `0` | Wait time to batch messages |
| `buffer.memory` | `33554432` | Total producer buffer size |
| `max.request.size` | `1048576` | Max request size |
| `enable.idempotence` | `true` | Exactly-once producer |
| `compression.type` | `none` | none, gzip, snappy, lz4, zstd |

### Consumer Configuration

| Config | Default | Description |
|--------|---------|-------------|
| `group.id` | - | Consumer group identifier |
| `auto.offset.reset` | `latest` | earliest, latest, none |
| `enable.auto.commit` | `true` | Auto-commit offsets |
| `auto.commit.interval.ms` | `5000` | Auto-commit interval |
| `max.poll.records` | `500` | Max records per poll |
| `max.poll.interval.ms` | `300000` | Max poll interval |
| `session.timeout.ms` | `45000` | Heartbeat timeout |
| `fetch.min.bytes` | `1` | Min bytes to return |
| `fetch.max.wait.ms` | `500` | Max wait for fetch |

### Broker Configuration

| Config | Default | Description |
|--------|---------|-------------|
| `num.partitions` | `1` | Default partitions for new topics |
| `default.replication.factor` | `1` | Default RF for new topics |
| `min.insync.replicas` | `1` | Min ISR for acks=all |
| `unclean.leader.election.enable` | `false` | Allow out-of-sync leader |
| `log.retention.hours` | `168` | Retention time (7 days) |
| `log.retention.bytes` | `-1` | Retention size (unlimited) |
| `log.segment.bytes` | `1073741824` | Segment size (1GB) |
| `log.cleanup.policy` | `delete` | delete or compact |
