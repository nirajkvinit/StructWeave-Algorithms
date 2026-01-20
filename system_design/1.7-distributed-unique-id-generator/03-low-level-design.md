# Low-Level Design

[← Back to Index](./00-index.md)

---

## Snowflake ID Bit Layout (64-bit)

### Standard Twitter Snowflake Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SNOWFLAKE ID (64 bits)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Bit Position:  63                                      22 21        12 11  0│
│                 ┌──┬──────────────────────────────────┬────────────┬────────┤
│                 │ 0│          TIMESTAMP               │ MACHINE ID │SEQUENCE│
│                 │  │          (41 bits)               │ (10 bits)  │(12 bit)│
│                 └──┴──────────────────────────────────┴────────────┴────────┘
│                  ↑                 ↑                        ↑          ↑     │
│               Sign bit    Milliseconds since         DC + Worker   Counter  │
│             (always 0)    custom epoch               (5 + 5)      per ms    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Breakdown:                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Component       │ Bits │ Max Value        │ Purpose                    ││
│  ├─────────────────┼──────┼──────────────────┼────────────────────────────┤│
│  │ Sign bit        │ 1    │ 0                │ Always 0 (positive number) ││
│  │ Timestamp       │ 41   │ 2^41-1 = 2.2T ms │ ~69.7 years from epoch     ││
│  │ Datacenter ID   │ 5    │ 31               │ 32 datacenters             ││
│  │ Worker ID       │ 5    │ 31               │ 32 workers per DC          ││
│  │ Sequence        │ 12   │ 4095             │ 4096 IDs per ms            ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Bit Manipulation Constants

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BIT MANIPULATION CONSTANTS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  // Bit lengths                                                              │
│  TIMESTAMP_BITS    = 41                                                      │
│  DATACENTER_BITS   = 5                                                       │
│  WORKER_BITS       = 5                                                       │
│  SEQUENCE_BITS     = 12                                                      │
│                                                                              │
│  // Maximum values                                                           │
│  MAX_DATACENTER_ID = (1 << 5) - 1   = 31                                    │
│  MAX_WORKER_ID     = (1 << 5) - 1   = 31                                    │
│  MAX_SEQUENCE      = (1 << 12) - 1  = 4095                                  │
│                                                                              │
│  // Left shift amounts                                                       │
│  TIMESTAMP_SHIFT   = DATACENTER_BITS + WORKER_BITS + SEQUENCE_BITS = 22     │
│  DATACENTER_SHIFT  = WORKER_BITS + SEQUENCE_BITS = 17                       │
│  WORKER_SHIFT      = SEQUENCE_BITS = 12                                     │
│                                                                              │
│  // Custom epoch (Twitter uses Nov 4, 2010)                                  │
│  EPOCH = 1288834974657  // milliseconds since Unix epoch                    │
│                                                                              │
│  // Bit masks for extraction                                                 │
│  TIMESTAMP_MASK    = 0x1FFFFFFFFFF  // 41 bits                              │
│  DATACENTER_MASK   = 0x1F           // 5 bits                               │
│  WORKER_MASK       = 0x1F           // 5 bits                               │
│  MACHINE_ID_MASK   = 0x3FF          // 10 bits                              │
│  SEQUENCE_MASK     = 0xFFF          // 12 bits                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Example ID Breakdown

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXAMPLE ID BREAKDOWN                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Example ID: 7157846372921344042 (decimal)                                   │
│              0x635F9C4D3E2A801A (hexadecimal)                                │
│              0110001101011111100111000100110100111110001010101000000000011010│
│                                                                              │
│  Binary breakdown:                                                           │
│  ┌──┬─────────────────────────────────────────┬──────────┬──────────────┐  │
│  │0 │ 11000110101111110011100010011010011     │ 1110001010 │ 100000011010 │  │
│  │  │ (41 bits: timestamp)                    │(10 bits)   │ (12 bits)    │  │
│  └──┴─────────────────────────────────────────┴──────────┴──────────────┘  │
│                                                                              │
│  Extraction:                                                                 │
│  timestamp  = (id >> 22) = 1705789200123                                    │
│  actual_time = timestamp + EPOCH = Jan 20, 2024 15:00:00.123                │
│                                                                              │
│  machine_id = (id >> 12) & 0x3FF = 906                                      │
│  datacenter = (id >> 17) & 0x1F = 28                                        │
│  worker     = (id >> 12) & 0x1F = 10                                        │
│                                                                              │
│  sequence   = id & 0xFFF = 26                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## UUID v7 Structure (128-bit, RFC 9562)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          UUID v7 (128 bits)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Bit layout:                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │    unix_ts_ms (48 bits)    │ver│  rand_a (12 bits)  │var│rand_b(62b)│  │
│  │        Timestamp           │ 4 │     Random         │ 2 │  Random   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Octet breakdown (16 bytes):                                                 │
│  ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
│  │ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ 8  │ 9  │ 10 │ 11 │ 12 │ 13 │ 14 │ 15 │
│  ├────┴────┴────┴────┴────┴────┼────┴────┼────┴────┴────┴────┴────┴────┴────┴────┤
│  │        unix_ts_ms           │ ver+rand│       var + rand_b                    │
│  │        (48 bits)            │  (16)   │        (64 bits)                      │
│  └─────────────────────────────┴─────────┴───────────────────────────────────────┘
│                                                                              │
│  Version and variant:                                                        │
│  • Octet 6: 0111xxxx (version 7 in upper 4 bits)                            │
│  • Octet 8: 10xxxxxx (variant in upper 2 bits)                              │
│                                                                              │
│  String format:                                                              │
│  xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx                                       │
│                  ↑    ↑                                                      │
│              version  variant (y = 8, 9, a, or b)                           │
│                                                                              │
│  Example: 018e4c4a-1b3d-7def-8c3a-9b2f4e7a1b3c                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ULID Structure (128-bit)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ULID (128 bits)                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Binary layout:                                                              │
│  ┌───────────────────────────────────┬──────────────────────────────────┐  │
│  │          Timestamp                │           Randomness              │  │
│  │          (48 bits)                │           (80 bits)               │  │
│  └───────────────────────────────────┴──────────────────────────────────┘  │
│                                                                              │
│  Crockford Base32 encoding (26 characters):                                  │
│                                                                              │
│  01ARZ3NDEKTSV4RRFFQ69G5FAV                                                 │
│  └────────┘└────────────────┘                                               │
│  Timestamp   Randomness                                                      │
│  (10 chars)  (16 chars)                                                      │
│                                                                              │
│  Character set (Crockford Base32):                                           │
│  0123456789ABCDEFGHJKMNPQRSTVWXYZ                                           │
│  (excludes I, L, O, U to avoid confusion)                                   │
│                                                                              │
│  Properties:                                                                 │
│  • Lexicographically sortable                                               │
│  • Case insensitive                                                         │
│  • URL safe                                                                 │
│  • Timestamp: Unix ms since epoch (max year 10889)                          │
│  • Randomness: 80 bits of cryptographic random                              │
│                                                                              │
│  Example breakdown:                                                          │
│  01ARZ3NDEK = 01618820936000 ms = Jan 20, 2024 15:00:00.000                 │
│  TSV4RRFFQ69G5FAV = random component                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## MongoDB ObjectID Structure (96-bit)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MongoDB ObjectID (12 bytes / 96 bits)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Byte layout:                                                                │
│  ┌────────────────┬────────────────┬────────────────┬─────────────────────┐│
│  │   Timestamp    │   Machine ID   │  Process ID    │      Counter        ││
│  │   (4 bytes)    │   (3 bytes)    │   (2 bytes)    │    (3 bytes)        ││
│  └────────────────┴────────────────┴────────────────┴─────────────────────┘│
│                                                                              │
│  Component details:                                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Component   │ Size    │ Value                                          ││
│  ├─────────────┼─────────┼────────────────────────────────────────────────┤│
│  │ Timestamp   │ 4 bytes │ Unix timestamp in seconds (136 year range)     ││
│  │ Machine ID  │ 3 bytes │ Hash of hostname/MAC (16M unique machines)     ││
│  │ Process ID  │ 2 bytes │ PID of generating process (65K processes)      ││
│  │ Counter     │ 3 bytes │ Incrementing counter, random start (16M/sec)   ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Example: 507f1f77bcf86cd799439011                                          │
│           ├──────┤├────┤├──┤├────┤                                          │
│           timestamp machine pid counter                                      │
│                                                                              │
│  507f1f77 = 1350844279 seconds = Oct 21, 2012                               │
│  bcf86c = machine identifier                                                 │
│  d799 = process ID                                                           │
│  439011 = counter value                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pseudocode: Snowflake ID Generator

### Main Generator Class

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SNOWFLAKE GENERATOR PSEUDOCODE                            │
├─────────────────────────────────────────────────────────────────────────────┤

CLASS SnowflakeGenerator:

    // Constants
    CONSTANT EPOCH = 1288834974657          // Custom epoch (Nov 4, 2010)
    CONSTANT DATACENTER_BITS = 5
    CONSTANT WORKER_BITS = 5
    CONSTANT SEQUENCE_BITS = 12

    CONSTANT MAX_DATACENTER_ID = 31         // 2^5 - 1
    CONSTANT MAX_WORKER_ID = 31             // 2^5 - 1
    CONSTANT MAX_SEQUENCE = 4095            // 2^12 - 1

    CONSTANT WORKER_SHIFT = 12
    CONSTANT DATACENTER_SHIFT = 17
    CONSTANT TIMESTAMP_SHIFT = 22

    // Instance state
    datacenter_id: INTEGER
    worker_id: INTEGER
    last_timestamp: INTEGER = -1
    sequence: INTEGER = 0
    lock: MUTEX

    // Constructor
    FUNCTION initialize(datacenter_id, worker_id):
        IF datacenter_id > MAX_DATACENTER_ID OR datacenter_id < 0 THEN
            THROW InvalidDatacenterIdError

        IF worker_id > MAX_WORKER_ID OR worker_id < 0 THEN
            THROW InvalidWorkerIdError

        this.datacenter_id = datacenter_id
        this.worker_id = worker_id

    // Main ID generation method
    FUNCTION next_id() -> INTEGER:
        ACQUIRE lock

        TRY:
            current_timestamp = get_current_timestamp()

            // Handle clock moving backward
            IF current_timestamp < last_timestamp THEN
                time_diff = last_timestamp - current_timestamp
                IF time_diff < 5 THEN
                    // Small drift - wait it out
                    SLEEP(time_diff milliseconds)
                    current_timestamp = get_current_timestamp()
                ELSE
                    RELEASE lock
                    THROW ClockMovedBackwardError(time_diff)

            // Same millisecond - increment sequence
            IF current_timestamp == last_timestamp THEN
                sequence = (sequence + 1) AND MAX_SEQUENCE

                // Sequence overflow - wait for next millisecond
                IF sequence == 0 THEN
                    current_timestamp = wait_for_next_ms(current_timestamp)
            ELSE
                // New millisecond - reset sequence
                sequence = 0

            last_timestamp = current_timestamp

            // Construct the ID using bit shifting
            id = ((current_timestamp - EPOCH) << TIMESTAMP_SHIFT)
                 | (datacenter_id << DATACENTER_SHIFT)
                 | (worker_id << WORKER_SHIFT)
                 | sequence

            RETURN id

        FINALLY:
            RELEASE lock

    // Helper: Get current time in milliseconds
    FUNCTION get_current_timestamp() -> INTEGER:
        RETURN system_time_milliseconds()

    // Helper: Wait for next millisecond
    FUNCTION wait_for_next_ms(last_ts) -> INTEGER:
        timestamp = get_current_timestamp()
        WHILE timestamp <= last_ts:
            // Busy wait or yield
            YIELD()
            timestamp = get_current_timestamp()
        RETURN timestamp

    // Utility: Extract components from ID
    FUNCTION parse_id(id) -> STRUCT:
        RETURN {
            timestamp: ((id >> TIMESTAMP_SHIFT) AND 0x1FFFFFFFFFF) + EPOCH,
            datacenter_id: (id >> DATACENTER_SHIFT) AND 0x1F,
            worker_id: (id >> WORKER_SHIFT) AND 0x1F,
            sequence: id AND 0xFFF
        }

    // Utility: Convert timestamp to human-readable
    FUNCTION get_creation_time(id) -> DATETIME:
        timestamp_ms = ((id >> TIMESTAMP_SHIFT) AND 0x1FFFFFFFFFF) + EPOCH
        RETURN milliseconds_to_datetime(timestamp_ms)

└─────────────────────────────────────────────────────────────────────────────┘
```

### Thread-Safe Implementation Notes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONCURRENCY CONSIDERATIONS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Option 1: Mutex Lock (shown above)                                          │
│  • Simple to implement                                                       │
│  • Guaranteed correctness                                                    │
│  • May have contention under high load                                       │
│                                                                              │
│  Option 2: Atomic Operations (Lock-free)                                     │
│  • Use atomic compare-and-swap (CAS) for sequence                           │
│  • Higher throughput under contention                                        │
│  • More complex to implement correctly                                       │
│                                                                              │
│  Pseudocode for atomic version:                                              │
│  ─────────────────────────────────                                          │
│  FUNCTION next_id_atomic() -> INTEGER:                                       │
│      LOOP:                                                                   │
│          current = atomic_load(state)  // {timestamp, sequence}             │
│          new_timestamp = get_current_timestamp()                            │
│                                                                              │
│          IF new_timestamp > current.timestamp THEN                          │
│              new_state = {new_timestamp, 0}                                 │
│          ELSE IF new_timestamp == current.timestamp THEN                    │
│              IF current.sequence >= MAX_SEQUENCE THEN                       │
│                  CONTINUE  // Retry after wait                              │
│              new_state = {current.timestamp, current.sequence + 1}          │
│          ELSE                                                                │
│              THROW ClockMovedBackwardError                                  │
│                                                                              │
│          IF atomic_compare_and_swap(state, current, new_state) THEN         │
│              RETURN construct_id(new_state)                                 │
│          // CAS failed, another thread won - retry                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pseudocode: UUID v7 Generator

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     UUID v7 GENERATOR PSEUDOCODE                             │
├─────────────────────────────────────────────────────────────────────────────┤

FUNCTION generate_uuid_v7() -> STRING:

    // Get current timestamp in milliseconds
    timestamp_ms = get_unix_timestamp_ms()

    // Create 128-bit UUID
    uuid_bytes = ARRAY[16] of BYTE

    // Bytes 0-5: 48-bit timestamp (big-endian)
    uuid_bytes[0] = (timestamp_ms >> 40) AND 0xFF
    uuid_bytes[1] = (timestamp_ms >> 32) AND 0xFF
    uuid_bytes[2] = (timestamp_ms >> 24) AND 0xFF
    uuid_bytes[3] = (timestamp_ms >> 16) AND 0xFF
    uuid_bytes[4] = (timestamp_ms >> 8) AND 0xFF
    uuid_bytes[5] = timestamp_ms AND 0xFF

    // Bytes 6-15: Random data
    random_bytes = crypto_random_bytes(10)
    COPY random_bytes TO uuid_bytes[6..15]

    // Set version (byte 6, upper 4 bits = 0111 for v7)
    uuid_bytes[6] = (uuid_bytes[6] AND 0x0F) OR 0x70

    // Set variant (byte 8, upper 2 bits = 10)
    uuid_bytes[8] = (uuid_bytes[8] AND 0x3F) OR 0x80

    // Format as string: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    RETURN format_uuid_string(uuid_bytes)

FUNCTION format_uuid_string(bytes) -> STRING:
    hex = bytes_to_hex(bytes)
    RETURN hex[0:8] + "-" + hex[8:12] + "-" + hex[12:16] + "-" +
           hex[16:20] + "-" + hex[20:32]

// Example output: 018e4c4a-1b3d-7def-8c3a-9b2f4e7a1b3c

└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pseudocode: ULID Generator

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ULID GENERATOR PSEUDOCODE                               │
├─────────────────────────────────────────────────────────────────────────────┤

CONSTANT ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"  // Crockford Base32
CONSTANT ENCODING_LEN = 32

STATE:
    last_timestamp = 0
    last_random = 0  // For monotonic ULIDs within same ms

FUNCTION generate_ulid() -> STRING:
    timestamp_ms = get_unix_timestamp_ms()

    IF timestamp_ms == last_timestamp THEN
        // Same millisecond - increment random part for monotonicity
        last_random = last_random + 1
        IF last_random > 2^80 - 1 THEN
            // Overflow - wait for next millisecond
            WHILE get_unix_timestamp_ms() <= timestamp_ms:
                YIELD()
            timestamp_ms = get_unix_timestamp_ms()
            last_random = crypto_random_80_bits()
    ELSE
        last_random = crypto_random_80_bits()

    last_timestamp = timestamp_ms

    RETURN encode_ulid(timestamp_ms, last_random)

FUNCTION encode_ulid(timestamp, random) -> STRING:
    result = ARRAY[26] of CHAR

    // Encode timestamp (first 10 characters)
    result[0] = ENCODING[(timestamp >> 45) AND 0x1F]
    result[1] = ENCODING[(timestamp >> 40) AND 0x1F]
    result[2] = ENCODING[(timestamp >> 35) AND 0x1F]
    result[3] = ENCODING[(timestamp >> 30) AND 0x1F]
    result[4] = ENCODING[(timestamp >> 25) AND 0x1F]
    result[5] = ENCODING[(timestamp >> 20) AND 0x1F]
    result[6] = ENCODING[(timestamp >> 15) AND 0x1F]
    result[7] = ENCODING[(timestamp >> 10) AND 0x1F]
    result[8] = ENCODING[(timestamp >> 5) AND 0x1F]
    result[9] = ENCODING[timestamp AND 0x1F]

    // Encode random (last 16 characters)
    FOR i = 0 TO 15:
        shift = (15 - i) * 5
        result[10 + i] = ENCODING[(random >> shift) AND 0x1F]

    RETURN CONCATENATE(result)

// Example output: 01ARZ3NDEKTSV4RRFFQ69G5FAV

└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Design

### REST API (Centralized Service)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REST API DESIGN                                     │
├─────────────────────────────────────────────────────────────────────────────┤

// Generate single ID
POST /api/v1/ids
Request:
{
    "format": "snowflake"  // snowflake | uuid_v7 | ulid
}

Response:
{
    "id": "7157846372921344042",
    "format": "snowflake",
    "generator": "dc1-worker3",
    "timestamp": "2024-01-20T15:00:00.123Z"
}

────────────────────────────────────────────────────────────────────────────────

// Generate batch of IDs
POST /api/v1/ids/batch
Request:
{
    "count": 1000,
    "format": "snowflake"
}

Response:
{
    "ids": ["7157846372921344042", "7157846372921344043", ...],
    "count": 1000,
    "generator": "dc1-worker3"
}

────────────────────────────────────────────────────────────────────────────────

// Parse/inspect an ID
GET /api/v1/ids/{id}/info

Response:
{
    "id": "7157846372921344042",
    "format": "snowflake",
    "components": {
        "timestamp": 1705789200123,
        "timestamp_human": "2024-01-20T15:00:00.123Z",
        "datacenter_id": 1,
        "worker_id": 3,
        "sequence": 42
    }
}

────────────────────────────────────────────────────────────────────────────────

// Health check
GET /api/v1/health

Response:
{
    "status": "healthy",
    "generator_id": "dc1-worker3",
    "clock_offset_ms": 2,
    "uptime_seconds": 86400
}

└─────────────────────────────────────────────────────────────────────────────┘
```

### Library API (Embedded)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LIBRARY API DESIGN                                   │
├─────────────────────────────────────────────────────────────────────────────┤

// Initialization
generator = SnowflakeGenerator.new(
    datacenter_id: 1,
    worker_id: 3,
    epoch: 1288834974657  // optional custom epoch
)

// Alternative: auto-assign machine ID from ZooKeeper
generator = SnowflakeGenerator.with_zookeeper(
    zk_address: "zk1:2181,zk2:2181",
    namespace: "/snowflake/workers"
)

────────────────────────────────────────────────────────────────────────────────

// Generate single ID
id = generator.next_id()
// Returns: 7157846372921344042

// Generate batch
ids = generator.next_ids(count: 1000)
// Returns: [7157846372921344042, 7157846372921344043, ...]

────────────────────────────────────────────────────────────────────────────────

// Parse ID components
info = generator.parse(id: 7157846372921344042)
// Returns: {timestamp: 1705789200123, datacenter: 1, worker: 3, sequence: 42}

// Get creation time
created_at = generator.created_at(id: 7157846372921344042)
// Returns: 2024-01-20T15:00:00.123Z

────────────────────────────────────────────────────────────────────────────────

// Status/metrics
stats = generator.stats()
// Returns: {
//     ids_generated: 1000000,
//     sequence_overflows: 5,
//     clock_drift_events: 0,
//     uptime_ms: 86400000
// }

└─────────────────────────────────────────────────────────────────────────────┘
```

### gRPC API (High Performance)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           gRPC API DESIGN                                    │
├─────────────────────────────────────────────────────────────────────────────┤

syntax = "proto3";

package idgen;

service IdGenerator {
    // Generate single ID
    rpc GenerateId(GenerateIdRequest) returns (GenerateIdResponse);

    // Generate batch of IDs
    rpc GenerateBatch(GenerateBatchRequest) returns (GenerateBatchResponse);

    // Parse ID components
    rpc ParseId(ParseIdRequest) returns (ParseIdResponse);

    // Streaming: continuous ID generation
    rpc StreamIds(StreamIdsRequest) returns (stream Id);
}

message GenerateIdRequest {
    IdFormat format = 1;  // SNOWFLAKE, UUID_V7, ULID
}

message GenerateIdResponse {
    int64 id = 1;         // For snowflake (64-bit)
    string id_string = 2; // For UUID/ULID (string format)
    int64 timestamp_ms = 3;
}

message GenerateBatchRequest {
    int32 count = 1;      // Max 10000
    IdFormat format = 2;
}

message GenerateBatchResponse {
    repeated int64 ids = 1;
    repeated string id_strings = 2;
}

enum IdFormat {
    SNOWFLAKE = 0;
    UUID_V7 = 1;
    ULID = 2;
}

└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Indexing Strategy

### Database Index Recommendations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATABASE INDEXING STRATEGY                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Snowflake ID as Primary Key (Recommended):                                  │
│  ─────────────────────────────────────────────                              │
│  CREATE TABLE orders (                                                       │
│      id BIGINT PRIMARY KEY,        -- Snowflake ID                          │
│      user_id BIGINT NOT NULL,                                               │
│      created_at TIMESTAMP,         -- Optional: for human queries           │
│      ...                                                                     │
│  );                                                                          │
│                                                                              │
│  Why this works well:                                                        │
│  • Time-ordered IDs → sequential inserts → minimal page splits              │
│  • 64-bit integer → efficient comparison and indexing                       │
│  • No need for separate auto-increment column                               │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  UUID v7 as Primary Key:                                                     │
│  ─────────────────────────                                                  │
│  CREATE TABLE orders (                                                       │
│      id UUID PRIMARY KEY,          -- UUID v7 (stored as 128-bit)           │
│      ...                                                                     │
│  );                                                                          │
│                                                                              │
│  PostgreSQL optimization:                                                    │
│  • Use uuid type (native 128-bit storage)                                   │
│  • NOT varchar(36) - wastes 2.3x storage                                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Composite Index with Timestamp:                                             │
│  ─────────────────────────────────                                          │
│  -- If you often query by time range AND need the ID                        │
│  CREATE INDEX idx_orders_created ON orders (created_at, id);                │
│                                                                              │
│  -- Note: With Snowflake IDs, you can often skip this because               │
│  -- WHERE id > snowflake_from_timestamp(start_time) works                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary: Format Selection Guide

| Use Case | Recommended Format | Reason |
|----------|-------------------|--------|
| High-scale database PK | Snowflake | 64-bit, excellent B-tree performance |
| Need UUID compatibility | UUID v7 | Standard format, time-ordered |
| Human-readable URLs | ULID | Base32, URL-safe, readable |
| Document database | ObjectID | Often built-in (MongoDB) |
| Offline-first app | UUID v4/v7 | No coordination needed |
| Enterprise batch processing | Segment allocation | Sequential within batches |
| Simple single-node | Auto-increment | Simplest option |
