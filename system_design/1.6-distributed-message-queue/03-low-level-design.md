# Low-Level Design

[← Back to Index](./00-index.md)

---

## Data Model

### Message Structure

```
STRUCT Message:
    // Delivery metadata
    delivery_tag: uint64          # Unique per-channel delivery identifier
    redelivered: boolean          # True if this is a redelivery
    exchange: string              # Source exchange name
    routing_key: string           # Routing key used for publishing

    // Message properties (AMQP basic properties)
    STRUCT Properties:
        content_type: string      # MIME type (e.g., "application/json")
        content_encoding: string  # Encoding (e.g., "utf-8", "gzip")
        headers: Map<string, any> # Custom headers for routing/metadata
        delivery_mode: uint8      # 1=transient, 2=persistent
        priority: uint8           # 0-9, higher = more important
        correlation_id: string    # For request-reply patterns
        reply_to: string          # Reply queue name
        expiration: string        # Message TTL in milliseconds
        message_id: string        # Application-provided unique ID
        timestamp: uint64         # Unix timestamp (seconds)
        type: string              # Application-specific message type
        user_id: string           # Publishing user (validated by broker)
        app_id: string            # Application identifier

    // Payload
    body: bytes                   # Message content (opaque to broker)

    // Dead letter metadata (added by broker)
    STRUCT XDeath:                # Present if dead-lettered
        reason: enum { REJECTED, EXPIRED, MAXLEN, DELIVERY_LIMIT }
        queue: string             # Original queue name
        exchange: string          # Original exchange
        routing_keys: string[]    # Original routing keys
        count: uint32             # Number of times dead-lettered
        time: timestamp           # When dead-lettered
```

### Exchange Structure

```
STRUCT Exchange:
    name: string                  # Exchange name (unique per vhost)
    type: enum { DIRECT, FANOUT, TOPIC, HEADERS }
    durable: boolean              # Survives broker restart
    auto_delete: boolean          # Delete when last binding removed
    internal: boolean             # Only reachable via exchange-to-exchange
    arguments: Map<string, any>   # Exchange-specific arguments

    // Runtime state
    bindings: Binding[]           # List of bindings to queues/exchanges

STRUCT Binding:
    source: string                # Source exchange name
    destination: string           # Queue or exchange name
    destination_type: enum { QUEUE, EXCHANGE }
    routing_key: string           # Routing key pattern
    arguments: Map<string, any>   # Headers for headers exchange
```

### Queue Structure

```
STRUCT Queue:
    name: string                  # Queue name (unique per vhost)
    durable: boolean              # Survives broker restart
    exclusive: boolean            # Single connection, auto-delete
    auto_delete: boolean          # Delete when consumers = 0
    queue_type: enum { CLASSIC, QUORUM, STREAM }

    // Queue arguments
    arguments: Map<string, any>
        x-message-ttl: uint32     # Per-message TTL (ms)
        x-expires: uint32         # Queue TTL when unused (ms)
        x-max-length: uint32      # Max messages in queue
        x-max-length-bytes: uint64 # Max queue size in bytes
        x-overflow: enum { DROP_HEAD, REJECT_PUBLISH, REJECT_PUBLISH_DLX }
        x-dead-letter-exchange: string    # DLX name
        x-dead-letter-routing-key: string # DLX routing key
        x-max-priority: uint8     # Enable priority queue (1-255)
        x-queue-mode: enum { DEFAULT, LAZY }  # Lazy = page to disk

    // Quorum queue specific
        x-quorum-initial-group-size: uint8  # Initial replicas
        x-delivery-limit: uint32   # Max redeliveries before DLQ

    // Runtime state
    message_count: uint64         # Current message count
    consumer_count: uint32        # Active consumers
    messages_ready: uint64        # Messages ready for delivery
    messages_unacked: uint64      # Delivered but not acknowledged
```

### Consumer Structure

```
STRUCT Consumer:
    consumer_tag: string          # Unique consumer identifier
    queue: string                 # Subscribed queue name
    channel_id: uint16            # AMQP channel
    connection_id: string         # Connection identifier

    // Consumer settings
    no_ack: boolean               # Auto-acknowledge on delivery
    exclusive: boolean            # Sole consumer of queue
    prefetch_count: uint16        # Max unacked messages (QoS)
    prefetch_size: uint32         # Max unacked bytes
    priority: int8                # Consumer priority (-128 to 127)
    arguments: Map<string, any>   # Consumer-specific arguments

    // Runtime state
    unacked_messages: Message[]   # Delivered, pending ACK
    active: boolean               # Currently receiving messages
```

### Connection and Channel

```
STRUCT Connection:
    connection_id: string         # Unique connection identifier
    client_address: string        # Client IP:port
    vhost: string                 # Virtual host
    user: string                  # Authenticated user
    protocol: string              # AMQP version
    state: enum { STARTING, TUNING, OPENING, RUNNING, CLOSING, CLOSED }

    // Negotiated parameters
    frame_max: uint32             # Max frame size (bytes)
    channel_max: uint16           # Max channels per connection
    heartbeat: uint16             # Heartbeat interval (seconds)

    // Runtime
    channels: Channel[]           # Active channels
    created_at: timestamp
    last_heartbeat: timestamp

STRUCT Channel:
    channel_id: uint16            # Channel number (1-65535)
    connection_id: string         # Parent connection
    state: enum { OPEN, CLOSING, CLOSED }

    // Channel settings
    confirm_mode: boolean         # Publisher confirms enabled
    transactional: boolean        # Transaction mode enabled

    // Runtime
    next_publish_seq: uint64      # Sequence for confirms
    unconfirmed: Message[]        # Published, pending confirm
    consumers: Consumer[]         # Consumers on this channel
```

---

## API Design

### Channel Operations

```
// Declare an exchange
FUNCTION exchange_declare(
    exchange: string,             # Exchange name
    type: ExchangeType,           # direct, fanout, topic, headers
    durable: boolean,             # Survive restart
    auto_delete: boolean,         # Delete when unused
    internal: boolean,            # Not directly publishable
    arguments: Map<string, any>   # Exchange arguments
) -> void
    ERRORS:
        PRECONDITION_FAILED       # Redeclare with different params
        ACCESS_REFUSED            # Permission denied

// Delete an exchange
FUNCTION exchange_delete(
    exchange: string,
    if_unused: boolean            # Only if no bindings
) -> void
    ERRORS:
        NOT_FOUND                 # Exchange doesn't exist
        PRECONDITION_FAILED       # Has bindings and if_unused=true

// Declare a queue
FUNCTION queue_declare(
    queue: string,                # Queue name (empty = server-generated)
    durable: boolean,
    exclusive: boolean,           # Single connection
    auto_delete: boolean,
    arguments: Map<string, any>   # Queue arguments
) -> QueueDeclareResult:
    queue: string                 # Actual queue name
    message_count: uint32         # Existing messages
    consumer_count: uint32        # Existing consumers
    ERRORS:
        RESOURCE_LOCKED           # Exclusive queue owned by other connection
        PRECONDITION_FAILED       # Redeclare with different params

// Bind queue to exchange
FUNCTION queue_bind(
    queue: string,
    exchange: string,
    routing_key: string,
    arguments: Map<string, any>   # For headers exchange
) -> void
    ERRORS:
        NOT_FOUND                 # Queue or exchange doesn't exist
```

### Publishing API

```
// Publish a message
FUNCTION basic_publish(
    exchange: string,             # Target exchange ("" = default)
    routing_key: string,          # Routing key
    mandatory: boolean,           # Return if unroutable
    immediate: boolean,           # (Deprecated) Require consumer
    properties: Properties,       # Message properties
    body: bytes                   # Message payload
) -> void
    NOTES:
        - If exchange="", routing_key is queue name (direct-to-queue)
        - If mandatory=true and no queue, basic.return is sent
        - Fire-and-forget unless confirms enabled

// Enable publisher confirms
FUNCTION confirm_select() -> void
    NOTES:
        - Channel enters confirm mode
        - Each publish assigned sequence number
        - Broker sends basic.ack or basic.nack

// Wait for confirms (client-side)
FUNCTION wait_for_confirms(timeout_ms: uint32) -> boolean
    OUTPUT: true if all confirmed, false on timeout/nack
```

### Consuming API

```
// Start consuming from queue
FUNCTION basic_consume(
    queue: string,
    consumer_tag: string,         # Empty = server-generated
    no_local: boolean,            # Don't receive own messages
    no_ack: boolean,              # Auto-acknowledge
    exclusive: boolean,           # Sole consumer
    arguments: Map<string, any>
) -> ConsumeResult:
    consumer_tag: string          # Actual consumer tag
    ERRORS:
        NOT_FOUND                 # Queue doesn't exist
        ACCESS_REFUSED            # Permission denied
        RESOURCE_LOCKED           # Exclusive queue

// Set prefetch (QoS)
FUNCTION basic_qos(
    prefetch_size: uint32,        # Max bytes (0 = unlimited)
    prefetch_count: uint16,       # Max messages
    global: boolean               # Apply to all consumers on channel
) -> void

// Acknowledge message
FUNCTION basic_ack(
    delivery_tag: uint64,
    multiple: boolean             # ACK all up to this tag
) -> void

// Negative acknowledge
FUNCTION basic_nack(
    delivery_tag: uint64,
    multiple: boolean,
    requeue: boolean              # Requeue or discard/DLQ
) -> void

// Reject single message
FUNCTION basic_reject(
    delivery_tag: uint64,
    requeue: boolean
) -> void

// Cancel consumer
FUNCTION basic_cancel(
    consumer_tag: string
) -> void
```

### Management API (HTTP)

```
// List queues
GET /api/queues/{vhost}
    RESPONSE:
        queues: [{
            name: string,
            messages: uint64,
            consumers: uint32,
            state: string,
            ...
        }]

// Get queue details
GET /api/queues/{vhost}/{name}
    RESPONSE:
        name: string,
        messages_ready: uint64,
        messages_unacked: uint64,
        consumers: uint32,
        memory: uint64,
        ...

// Publish message (for testing)
POST /api/exchanges/{vhost}/{exchange}/publish
    BODY:
        routing_key: string,
        properties: Properties,
        payload: string,
        payload_encoding: string  # "string" or "base64"
    RESPONSE:
        routed: boolean

// Purge queue
DELETE /api/queues/{vhost}/{name}/contents
    RESPONSE:
        messages_deleted: uint64
```

---

## Core Algorithms

### Direct Exchange Routing

```
FUNCTION route_direct(exchange, routing_key, message):
    INPUT:
        exchange: Exchange (type=DIRECT)
        routing_key: string
        message: Message
    OUTPUT:
        target_queues: Queue[]

    ALGORITHM:
        target_queues = []

        FOR binding IN exchange.bindings:
            IF binding.routing_key == routing_key:
                target_queues.append(binding.destination)

        RETURN target_queues

    COMPLEXITY: O(B) where B = number of bindings
    OPTIMIZATION: Use hash map for O(1) lookup
```

### Topic Exchange Pattern Matching

```
FUNCTION route_topic(exchange, routing_key, message):
    INPUT:
        exchange: Exchange (type=TOPIC)
        routing_key: string        # e.g., "order.us.created"
        message: Message
    OUTPUT:
        target_queues: Queue[]

    ALGORITHM:
        target_queues = []
        routing_words = routing_key.split(".")

        FOR binding IN exchange.bindings:
            pattern_words = binding.routing_key.split(".")

            IF matches_pattern(routing_words, pattern_words):
                target_queues.append(binding.destination)

        RETURN target_queues

FUNCTION matches_pattern(routing_words, pattern_words):
    // Wildcards:
    // * = exactly one word
    // # = zero or more words

    r_idx = 0
    p_idx = 0

    WHILE r_idx < len(routing_words) AND p_idx < len(pattern_words):
        pattern = pattern_words[p_idx]

        IF pattern == "#":
            IF p_idx == len(pattern_words) - 1:
                RETURN TRUE  // # at end matches everything

            // Find next non-# pattern word
            p_idx += 1
            IF p_idx >= len(pattern_words):
                RETURN TRUE

            next_pattern = pattern_words[p_idx]
            // Advance routing until match found
            WHILE r_idx < len(routing_words):
                IF routing_words[r_idx] == next_pattern OR next_pattern == "*":
                    BREAK
                r_idx += 1

        ELSE IF pattern == "*":
            // Match exactly one word
            r_idx += 1
            p_idx += 1

        ELSE IF pattern == routing_words[r_idx]:
            // Exact match
            r_idx += 1
            p_idx += 1

        ELSE:
            RETURN FALSE

    // Check remaining pattern
    WHILE p_idx < len(pattern_words):
        IF pattern_words[p_idx] != "#":
            RETURN FALSE
        p_idx += 1

    RETURN r_idx == len(routing_words)

    EXAMPLES:
        "order.us.created" matches "order.us.created"     ✓
        "order.us.created" matches "order.*.created"      ✓
        "order.us.created" matches "order.#"              ✓
        "order.us.created" matches "#.created"            ✓
        "order.us.created" matches "order.eu.created"     ✗
        "order.us.created" matches "order.*"              ✗ (3 words vs 2)

    COMPLEXITY: O(B × W) where B = bindings, W = words in key
    OPTIMIZATION: Use trie structure for prefix matching
```

### Headers Exchange Matching

```
FUNCTION route_headers(exchange, message):
    INPUT:
        exchange: Exchange (type=HEADERS)
        message: Message
    OUTPUT:
        target_queues: Queue[]

    ALGORITHM:
        target_queues = []
        msg_headers = message.properties.headers

        FOR binding IN exchange.bindings:
            bind_args = binding.arguments
            match_type = bind_args.get("x-match", "all")  // "all" or "any"

            // Remove x-match from comparison
            required_headers = bind_args without "x-match"

            IF match_type == "all":
                // All headers must match
                IF all_match(required_headers, msg_headers):
                    target_queues.append(binding.destination)
            ELSE:  // "any"
                // At least one header must match
                IF any_match(required_headers, msg_headers):
                    target_queues.append(binding.destination)

        RETURN target_queues

FUNCTION all_match(required, actual):
    FOR key, value IN required:
        IF key NOT IN actual OR actual[key] != value:
            RETURN FALSE
    RETURN TRUE

FUNCTION any_match(required, actual):
    FOR key, value IN required:
        IF key IN actual AND actual[key] == value:
            RETURN TRUE
    RETURN FALSE
```

### Consumer Selection (Round-Robin with Prefetch)

```
FUNCTION select_consumer(queue):
    INPUT:
        queue: Queue with active consumers
    OUTPUT:
        selected_consumer: Consumer or NONE

    ALGORITHM:
        eligible_consumers = []

        FOR consumer IN queue.consumers:
            IF consumer.active == FALSE:
                CONTINUE

            IF consumer.no_ack:
                // No prefetch limit for auto-ack
                eligible_consumers.append(consumer)
            ELSE:
                unacked_count = len(consumer.unacked_messages)
                unacked_bytes = sum(msg.body.length FOR msg IN consumer.unacked_messages)

                // Check prefetch limits
                IF consumer.prefetch_count > 0 AND unacked_count >= consumer.prefetch_count:
                    CONTINUE
                IF consumer.prefetch_size > 0 AND unacked_bytes >= consumer.prefetch_size:
                    CONTINUE

                eligible_consumers.append(consumer)

        IF eligible_consumers is empty:
            RETURN NONE

        // Sort by priority (higher first), then round-robin
        eligible_consumers.sort(key=lambda c: -c.priority)

        // Group by priority
        highest_priority = eligible_consumers[0].priority
        same_priority = filter(c for c in eligible_consumers if c.priority == highest_priority)

        // Round-robin among same priority
        selected = same_priority[queue.round_robin_index % len(same_priority)]
        queue.round_robin_index += 1

        RETURN selected
```

### Message Priority Queue

```
FUNCTION enqueue_with_priority(queue, message):
    INPUT:
        queue: Queue with x-max-priority set
        message: Message
    OUTPUT:
        void

    ALGORITHM:
        priority = message.properties.priority
        max_priority = queue.arguments.get("x-max-priority", 0)

        IF max_priority == 0:
            // Not a priority queue, simple FIFO
            queue.messages.append(message)
            RETURN

        // Clamp priority to valid range
        priority = min(priority, max_priority)

        // Priority queues use separate buckets
        // Bucket 0 = lowest priority
        queue.priority_buckets[priority].append(message)

FUNCTION dequeue_with_priority(queue):
    INPUT:
        queue: Queue with priority buckets
    OUTPUT:
        message: Message or NONE

    ALGORITHM:
        max_priority = queue.arguments.get("x-max-priority", 0)

        // Check buckets from highest to lowest priority
        FOR priority FROM max_priority DOWN TO 0:
            IF queue.priority_buckets[priority] is not empty:
                RETURN queue.priority_buckets[priority].pop_front()

        RETURN NONE

    NOTE: Priority queues have memory overhead (separate bucket per level)
          Recommended: max-priority <= 10
```

### Dead Letter Handling

```
FUNCTION handle_dead_letter(queue, message, reason):
    INPUT:
        queue: Queue with DLX configured
        message: Message to dead-letter
        reason: enum { REJECTED, EXPIRED, MAXLEN, DELIVERY_LIMIT }
    OUTPUT:
        void

    ALGORITHM:
        dlx_exchange = queue.arguments.get("x-dead-letter-exchange")
        IF dlx_exchange is NONE:
            // No DLX configured, discard message
            discard(message)
            RETURN

        // Add x-death header
        x_death = {
            "reason": reason,
            "queue": queue.name,
            "exchange": message.exchange,
            "routing-keys": [message.routing_key],
            "count": 1,
            "time": current_timestamp()
        }

        // Check for existing x-death (cycle detection)
        existing_deaths = message.properties.headers.get("x-death", [])
        FOR death IN existing_deaths:
            IF death.queue == queue.name AND death.reason == reason:
                death.count += 1
                break
        ELSE:
            existing_deaths.prepend(x_death)

        message.properties.headers["x-death"] = existing_deaths

        // Route to DLX
        dlx_routing_key = queue.arguments.get(
            "x-dead-letter-routing-key",
            message.routing_key  // Use original if not specified
        )

        publish_to_exchange(dlx_exchange, dlx_routing_key, message)
```

### Quorum Queue Raft Protocol

```
FUNCTION leader_append(queue, message):
    INPUT:
        queue: QuorumQueue (this node is leader)
        message: Message to append
    OUTPUT:
        success: boolean

    ALGORITHM:
        // Append to local log
        log_entry = {
            term: current_term,
            index: next_log_index,
            command: ENQUEUE,
            message: message
        }
        local_log.append(log_entry)
        next_log_index += 1

        // Replicate to followers
        acks = 1  // Leader's own ack

        FOR follower IN followers:
            send_append_entries(follower, [log_entry])

        // Wait for quorum
        WHILE acks < quorum_size:
            response = wait_for_response(timeout=heartbeat_interval)
            IF response.success:
                acks += 1

        IF acks >= quorum_size:
            // Commit the entry
            commit_index = log_entry.index
            apply_entry(log_entry)  // Actually enqueue message
            RETURN TRUE
        ELSE:
            // Failed to get quorum
            RETURN FALSE

FUNCTION follower_handle_append(entries, leader_commit):
    INPUT:
        entries: LogEntry[]
        leader_commit: uint64
    OUTPUT:
        success: boolean

    ALGORITHM:
        FOR entry IN entries:
            // Consistency check
            IF entry.index <= log.last_index:
                IF log[entry.index].term != entry.term:
                    // Conflict - truncate log
                    log.truncate_from(entry.index)

            log.append(entry)

        // Apply committed entries
        WHILE last_applied < leader_commit:
            last_applied += 1
            apply_entry(log[last_applied])

        RETURN TRUE
```

---

## Message Flow State Machine

### Message Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGE STATE MACHINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                      ┌─────────────┐                            │
│                      │  PUBLISHED  │                            │
│                      └──────┬──────┘                            │
│                             │                                    │
│                             ▼                                    │
│                      ┌─────────────┐                            │
│                      │   ROUTED    │                            │
│                      └──────┬──────┘                            │
│                             │                                    │
│              ┌──────────────┼──────────────┐                    │
│              ▼              ▼              ▼                    │
│       ┌──────────┐   ┌──────────┐   ┌──────────┐              │
│       │ RETURNED │   │  QUEUED  │   │ DROPPED  │              │
│       │(mandatory)│   │ (ready)  │   │(overflow)│              │
│       └──────────┘   └────┬─────┘   └──────────┘              │
│                           │                                      │
│                           ▼                                      │
│                    ┌─────────────┐                              │
│                    │  DELIVERED  │◄──────────┐                  │
│                    │ (unacked)   │           │                  │
│                    └──────┬──────┘           │                  │
│                           │                  │ requeue          │
│              ┌────────────┼────────────┐     │                  │
│              ▼            ▼            ▼     │                  │
│       ┌──────────┐ ┌──────────┐ ┌──────────┐│                  │
│       │   ACKED  │ │  NACKED  │ │ REJECTED ││                  │
│       │ (removed)│ │          │ │          ││                  │
│       └──────────┘ └────┬─────┘ └────┬─────┘│                  │
│                         │            │      │                   │
│                         ▼            ▼      │                   │
│                  ┌─────────────────────┐    │                   │
│                  │    REQUEUE=true?    │────┘                   │
│                  └──────────┬──────────┘                        │
│                             │ no                                 │
│                             ▼                                    │
│                      ┌─────────────┐                            │
│                      │ DEAD-LETTER │                            │
│                      │  (or drop)  │                            │
│                      └─────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration Reference

### Queue Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `x-message-ttl` | uint32 | - | Per-message TTL (ms) |
| `x-expires` | uint32 | - | Queue deletion timeout when unused (ms) |
| `x-max-length` | uint32 | - | Max message count |
| `x-max-length-bytes` | uint64 | - | Max queue size (bytes) |
| `x-overflow` | string | drop-head | `drop-head`, `reject-publish`, `reject-publish-dlx` |
| `x-dead-letter-exchange` | string | - | DLX exchange name |
| `x-dead-letter-routing-key` | string | - | DLX routing key |
| `x-max-priority` | uint8 | - | Enable priority (1-255) |
| `x-queue-mode` | string | default | `default` or `lazy` |
| `x-queue-type` | string | classic | `classic`, `quorum`, `stream` |
| `x-quorum-initial-group-size` | uint8 | - | Initial quorum size |
| `x-delivery-limit` | uint32 | - | Max redeliveries (quorum) |

### Consumer Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `x-priority` | int8 | 0 | Consumer priority (-128 to 127) |
| `x-cancel-on-ha-failover` | bool | false | Cancel on HA failover |
| `x-stream-offset` | string | - | Stream offset (`first`, `last`, timestamp) |

### Connection Limits

| Parameter | Default | Description |
|-----------|---------|-------------|
| `frame_max` | 131072 | Max frame size (128KB) |
| `channel_max` | 2047 | Max channels per connection |
| `heartbeat` | 60 | Heartbeat interval (seconds) |
