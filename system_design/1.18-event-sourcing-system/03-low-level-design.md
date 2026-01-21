# Low-Level Design

[← Back to Index](./00-index.md)

---

## Data Models

### Core Entities

```
┌────────────────────────────────────────────────────────────────────┐
│ EVENT RECORD                                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ENTITY Event:                                                       │
│   event_id:          UUID          // Unique event identifier      │
│   global_position:   Long          // Global ordering position     │
│   stream_id:         String        // Stream identifier            │
│   stream_position:   Long          // Position within stream       │
│   event_type:        String        // Event type name              │
│   data:              Bytes         // Event payload (JSON/binary)  │
│   metadata:          Bytes         // Event metadata               │
│   timestamp:         Timestamp     // When event was created       │
│   correlation_id:    String        // Request correlation          │
│   causation_id:      String        // Causing event ID             │
│                                                                     │
│ ENTITY EventEnvelope:                                               │
│   event:             Event         // The actual event             │
│   schema_version:    Integer       // Schema version for migration │
│   content_type:      String        // application/json, etc.       │
│   encoding:          String        // utf-8, gzip, etc.            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Stream Entities

```
┌────────────────────────────────────────────────────────────────────┐
│ STREAM RECORD                                                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ENTITY Stream:                                                      │
│   stream_id:         String        // Unique stream identifier     │
│   category:          String        // Stream category (e.g., order)│
│   aggregate_type:    String        // Type of aggregate            │
│   aggregate_id:      String        // Instance identifier          │
│   current_version:   Long          // Latest event position        │
│   created_at:        Timestamp     // Stream creation time         │
│   updated_at:        Timestamp     // Last event time              │
│   metadata:          JSON          // Stream-level metadata        │
│                                                                     │
│ ENTITY StreamMetadata:                                              │
│   stream_id:         String                                        │
│   max_age_seconds:   Integer       // Event TTL (null = forever)   │
│   max_count:         Integer       // Max events (null = unlimited)│
│   cache_control:     String        // Caching directives           │
│   acl:               JSON          // Access control list          │
│   custom_metadata:   JSON          // User-defined metadata        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Snapshot Entities

```
┌────────────────────────────────────────────────────────────────────┐
│ SNAPSHOT RECORD                                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ENTITY Snapshot:                                                    │
│   snapshot_id:       UUID          // Unique snapshot identifier   │
│   stream_id:         String        // Stream this snapshot is for  │
│   version:           Long          // Stream version at snapshot   │
│   state:             Bytes         // Serialized aggregate state   │
│   state_type:        String        // Type of aggregate state      │
│   schema_version:    Integer       // State schema version         │
│   created_at:        Timestamp     // When snapshot was taken      │
│   size_bytes:        Long          // Snapshot size for metrics    │
│   metadata:          JSON          // Additional metadata          │
│                                                                     │
│ Snapshot Key Format:                                                │
│   Primary: {stream_id}                                             │
│   Historical: {stream_id}:{version}                                │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Projection Entities

```
┌────────────────────────────────────────────────────────────────────┐
│ PROJECTION RECORD                                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ENTITY Projection:                                                  │
│   projection_id:     String        // Unique projection name       │
│   status:            ProjectionStatus                              │
│   checkpoint:        Long          // Last processed global pos    │
│   definition:        JSON          // Projection logic definition  │
│   target_streams:    List<String>  // Streams to process           │
│   created_at:        Timestamp                                     │
│   updated_at:        Timestamp                                     │
│   error:             String        // Last error if failed         │
│   statistics:        JSON          // Processing statistics        │
│                                                                     │
│ ENUM ProjectionStatus:                                              │
│   CREATED           // Defined but not started                     │
│   RUNNING           // Actively processing                         │
│   PAUSED            // Temporarily stopped                         │
│   STOPPED           // Permanently stopped                         │
│   FAULTED           // Error state                                 │
│                                                                     │
│ ENTITY ProjectionCheckpoint:                                        │
│   projection_id:     String                                        │
│   global_position:   Long          // Last processed position      │
│   stream_positions:  Map<String, Long> // Per-stream positions     │
│   updated_at:        Timestamp                                     │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Subscription Entities

```
┌────────────────────────────────────────────────────────────────────┐
│ SUBSCRIPTION RECORD                                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ENTITY PersistentSubscription:                                      │
│   subscription_id:   String        // Unique subscription name     │
│   group_name:        String        // Consumer group               │
│   stream_id:         String        // Target stream ($all or name) │
│   status:            SubscriptionStatus                            │
│   checkpoint:        Long          // Last acknowledged position   │
│   settings:          SubscriptionSettings                          │
│   statistics:        JSON          // Processing stats             │
│   created_at:        Timestamp                                     │
│                                                                     │
│ ENTITY SubscriptionSettings:                                        │
│   start_from:        StartPosition // Beginning, End, Position     │
│   resolve_links:     Boolean       // Resolve link events          │
│   max_retry_count:   Integer       // Max retries before park      │
│   message_timeout:   Duration      // Ack timeout                  │
│   checkpoint_after:  Integer       // Events before checkpoint     │
│   max_checkpoint_count: Integer    // Max buffered events          │
│   consumer_strategy: Strategy      // RoundRobin, Pinned, etc.    │
│                                                                     │
│ ENUM SubscriptionStatus:                                            │
│   ACTIVE            // Processing events                           │
│   PAUSED            // Temporarily stopped                         │
│   PARKED            // Events parked due to errors                 │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Storage Schema

### Event Log Table

```
┌────────────────────────────────────────────────────────────────────┐
│ EVENT LOG STORAGE                                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ TABLE events:                                                       │
│   global_position:   BIGSERIAL PRIMARY KEY                         │
│   event_id:          UUID NOT NULL UNIQUE                          │
│   stream_id:         VARCHAR(255) NOT NULL                         │
│   stream_position:   BIGINT NOT NULL                               │
│   event_type:        VARCHAR(255) NOT NULL                         │
│   data:              BYTEA NOT NULL                                │
│   metadata:          BYTEA                                         │
│   timestamp:         TIMESTAMP NOT NULL DEFAULT NOW()              │
│   correlation_id:    VARCHAR(255)                                  │
│   causation_id:      VARCHAR(255)                                  │
│   schema_version:    INTEGER NOT NULL DEFAULT 1                    │
│                                                                     │
│ CONSTRAINTS:                                                        │
│   UNIQUE (stream_id, stream_position)                              │
│                                                                     │
│ INDEXES:                                                            │
│   PRIMARY KEY (global_position)                                    │
│   INDEX idx_events_stream (stream_id, stream_position)             │
│   INDEX idx_events_type (event_type, global_position)              │
│   INDEX idx_events_timestamp (timestamp)                           │
│   INDEX idx_events_correlation (correlation_id)                    │
│                                                                     │
│ PARTITION BY RANGE (global_position)                               │
│   Partition every 10M events for manageable chunks                 │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Stream Metadata Table

```
┌────────────────────────────────────────────────────────────────────┐
│ STREAM METADATA STORAGE                                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ TABLE streams:                                                      │
│   stream_id:         VARCHAR(255) PRIMARY KEY                      │
│   category:          VARCHAR(255) NOT NULL                         │
│   aggregate_type:    VARCHAR(255)                                  │
│   aggregate_id:      VARCHAR(255)                                  │
│   current_version:   BIGINT NOT NULL DEFAULT -1                    │
│   created_at:        TIMESTAMP NOT NULL DEFAULT NOW()              │
│   updated_at:        TIMESTAMP NOT NULL DEFAULT NOW()              │
│   metadata:          JSONB                                         │
│                                                                     │
│ INDEXES:                                                            │
│   PRIMARY KEY (stream_id)                                          │
│   INDEX idx_streams_category (category)                            │
│   INDEX idx_streams_updated (updated_at)                           │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Snapshot Table

```
┌────────────────────────────────────────────────────────────────────┐
│ SNAPSHOT STORAGE                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ TABLE snapshots:                                                    │
│   snapshot_id:       UUID PRIMARY KEY                              │
│   stream_id:         VARCHAR(255) NOT NULL                         │
│   version:           BIGINT NOT NULL                               │
│   state:             BYTEA NOT NULL                                │
│   state_type:        VARCHAR(255) NOT NULL                         │
│   schema_version:    INTEGER NOT NULL DEFAULT 1                    │
│   created_at:        TIMESTAMP NOT NULL DEFAULT NOW()              │
│   size_bytes:        BIGINT NOT NULL                               │
│   metadata:          JSONB                                         │
│                                                                     │
│ CONSTRAINTS:                                                        │
│   UNIQUE (stream_id, version)                                      │
│                                                                     │
│ INDEXES:                                                            │
│   INDEX idx_snapshots_stream (stream_id, version DESC)             │
│   INDEX idx_snapshots_created (created_at)                         │
│                                                                     │
│ -- Get latest snapshot for a stream                                │
│ SELECT * FROM snapshots                                            │
│ WHERE stream_id = ?                                                │
│ ORDER BY version DESC                                              │
│ LIMIT 1                                                            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Projection Checkpoint Table

```
┌────────────────────────────────────────────────────────────────────┐
│ PROJECTION CHECKPOINT STORAGE                                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ TABLE projection_checkpoints:                                       │
│   projection_id:     VARCHAR(255) PRIMARY KEY                      │
│   global_position:   BIGINT NOT NULL DEFAULT 0                     │
│   stream_positions:  JSONB NOT NULL DEFAULT '{}'                   │
│   updated_at:        TIMESTAMP NOT NULL DEFAULT NOW()              │
│   processing_stats:  JSONB                                         │
│                                                                     │
│ -- Atomic checkpoint update                                        │
│ UPDATE projection_checkpoints                                      │
│ SET global_position = ?,                                           │
│     updated_at = NOW()                                             │
│ WHERE projection_id = ?                                            │
│   AND global_position < ?                                          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## API Design

### Event Store API

```
┌────────────────────────────────────────────────────────────────────┐
│ APPEND EVENTS API                                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ POST /streams/{streamId}/events                                    │
│                                                                     │
│ Headers:                                                            │
│   Content-Type: application/json                                   │
│   Expected-Version: 5          // Optimistic concurrency           │
│   Idempotency-Key: uuid        // For retries                      │
│                                                                     │
│ Request:                                                            │
│ {                                                                   │
│   "events": [                                                      │
│     {                                                              │
│       "eventType": "OrderCreated",                                 │
│       "data": {                                                    │
│         "orderId": "order-123",                                    │
│         "customerId": "cust-456",                                  │
│         "items": [...]                                             │
│       },                                                           │
│       "metadata": {                                                │
│         "correlationId": "req-789",                                │
│         "userId": "user-001"                                       │
│       }                                                            │
│     }                                                              │
│   ]                                                                │
│ }                                                                   │
│                                                                     │
│ Response (201 Created):                                             │
│ {                                                                   │
│   "streamId": "order-123",                                         │
│   "fromVersion": 5,                                                │
│   "toVersion": 6,                                                  │
│   "events": [                                                      │
│     {                                                              │
│       "eventId": "evt-uuid",                                       │
│       "globalPosition": 12345,                                     │
│       "streamPosition": 6                                          │
│     }                                                              │
│   ]                                                                │
│ }                                                                   │
│                                                                     │
│ Error (409 Conflict - Wrong Expected Version):                     │
│ {                                                                   │
│   "error": "WrongExpectedVersion",                                 │
│   "currentVersion": 7,                                             │
│   "expectedVersion": 5                                             │
│ }                                                                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Read Stream API

```
┌────────────────────────────────────────────────────────────────────┐
│ READ STREAM API                                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ GET /streams/{streamId}?direction=forward&from=0&count=100         │
│                                                                     │
│ Parameters:                                                         │
│   direction: forward | backward                                    │
│   from: starting position (inclusive)                              │
│   count: max events to return                                      │
│                                                                     │
│ Response (200 OK):                                                  │
│ {                                                                   │
│   "streamId": "order-123",                                         │
│   "fromPosition": 0,                                               │
│   "nextPosition": 100,                                             │
│   "isEndOfStream": false,                                          │
│   "events": [                                                      │
│     {                                                              │
│       "eventId": "evt-001",                                        │
│       "eventType": "OrderCreated",                                 │
│       "streamPosition": 0,                                         │
│       "globalPosition": 10000,                                     │
│       "timestamp": "2024-01-15T10:30:00Z",                        │
│       "data": {...},                                               │
│       "metadata": {...}                                            │
│     },                                                             │
│     ...                                                            │
│   ]                                                                │
│ }                                                                   │
│                                                                     │
│ GET /streams/$all?from=0&count=1000                               │
│ Read from all streams (global ordering)                            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Subscription API

```
┌────────────────────────────────────────────────────────────────────┐
│ SUBSCRIPTION API                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ WebSocket: /subscribe/streams/{streamId}?from={position}           │
│                                                                     │
│ Client → Server (Subscribe):                                       │
│ {                                                                   │
│   "action": "subscribe",                                           │
│   "streamId": "order-123",                                         │
│   "fromPosition": 0,                                               │
│   "options": {                                                     │
│     "resolveLinks": false,                                         │
│     "batchSize": 100                                               │
│   }                                                                │
│ }                                                                   │
│                                                                     │
│ Server → Client (Events):                                          │
│ {                                                                   │
│   "type": "event",                                                 │
│   "event": {                                                       │
│     "eventId": "evt-uuid",                                         │
│     "eventType": "OrderCreated",                                   │
│     "streamId": "order-123",                                       │
│     "streamPosition": 0,                                           │
│     "globalPosition": 12345,                                       │
│     "data": {...}                                                  │
│   }                                                                │
│ }                                                                   │
│                                                                     │
│ Server → Client (Caught Up):                                       │
│ {                                                                   │
│   "type": "caughtUp",                                              │
│   "position": 1000                                                 │
│ }                                                                   │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│ Persistent Subscription:                                            │
│                                                                     │
│ POST /subscriptions                                                │
│ {                                                                   │
│   "name": "order-projection",                                      │
│   "streamId": "$all",                                              │
│   "groupName": "projections",                                      │
│   "settings": {                                                    │
│     "startFrom": "beginning",                                      │
│     "maxRetryCount": 3,                                            │
│     "messageTimeoutMs": 30000                                      │
│   }                                                                │
│ }                                                                   │
│                                                                     │
│ POST /subscriptions/{name}/ack                                     │
│ { "eventIds": ["evt-1", "evt-2"] }                                │
│                                                                     │
│ POST /subscriptions/{name}/nack                                    │
│ { "eventIds": ["evt-3"], "action": "retry" }                      │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Snapshot API

```
┌────────────────────────────────────────────────────────────────────┐
│ SNAPSHOT API                                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ POST /snapshots/{streamId}                                         │
│ Store a new snapshot                                               │
│                                                                     │
│ Request:                                                            │
│ {                                                                   │
│   "version": 100,                                                  │
│   "stateType": "Order",                                            │
│   "state": {                                                       │
│     "orderId": "order-123",                                        │
│     "status": "shipped",                                           │
│     "items": [...],                                                │
│     "total": 299.99                                                │
│   },                                                               │
│   "schemaVersion": 2                                               │
│ }                                                                   │
│                                                                     │
│ Response (201 Created):                                             │
│ {                                                                   │
│   "snapshotId": "snap-uuid",                                       │
│   "streamId": "order-123",                                         │
│   "version": 100,                                                  │
│   "sizeBytes": 2048                                                │
│ }                                                                   │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│ GET /snapshots/{streamId}/latest                                   │
│ Get the most recent snapshot                                       │
│                                                                     │
│ Response (200 OK):                                                  │
│ {                                                                   │
│   "snapshotId": "snap-uuid",                                       │
│   "streamId": "order-123",                                         │
│   "version": 100,                                                  │
│   "stateType": "Order",                                            │
│   "state": {...},                                                  │
│   "schemaVersion": 2,                                              │
│   "createdAt": "2024-01-15T10:00:00Z"                             │
│ }                                                                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Algorithms

### Event Append with Optimistic Concurrency

```
FUNCTION AppendEvents(stream_id, events, expected_version):
    // Acquire exclusive lock on stream
    LOCK streams WHERE stream_id = stream_id

    TRY:
        // Get current version
        current_version = GetStreamVersion(stream_id)

        // Optimistic concurrency check
        IF expected_version != ANY_VERSION:
            IF current_version != expected_version:
                THROW WrongExpectedVersionException(
                    expected = expected_version,
                    actual = current_version
                )
            END IF
        END IF

        // Generate positions
        next_stream_position = current_version + 1
        global_position = GetNextGlobalPosition()

        // Append events
        FOR EACH event IN events:
            event.stream_position = next_stream_position
            event.global_position = global_position
            event.event_id = GenerateUUID()
            event.timestamp = NOW()

            InsertEvent(event)

            next_stream_position++
            global_position++
        END FOR

        // Update stream metadata
        UpdateStreamVersion(stream_id, next_stream_position - 1)

        COMMIT

        // Notify subscribers (async)
        NotifySubscribers(stream_id, events)

        RETURN AppendResult(
            from_version = current_version,
            to_version = next_stream_position - 1,
            events = events
        )

    CATCH Exception AS e:
        ROLLBACK
        THROW e
    FINALLY:
        UNLOCK streams
    END TRY
END FUNCTION
```

### Load Aggregate with Snapshot

```
FUNCTION LoadAggregate(stream_id, aggregate_factory):
    // Try to load snapshot first
    snapshot = LoadLatestSnapshot(stream_id)

    IF snapshot IS NOT NULL:
        // Reconstruct from snapshot
        aggregate = aggregate_factory.FromSnapshot(snapshot.state)
        start_version = snapshot.version + 1
    ELSE:
        // Start from scratch
        aggregate = aggregate_factory.CreateNew()
        start_version = 0
    END IF

    // Load events after snapshot
    events = ReadStream(
        stream_id = stream_id,
        from_position = start_version,
        direction = FORWARD
    )

    // Replay events
    FOR EACH event IN events:
        aggregate.Apply(event)
    END FOR

    // Check if snapshot needed
    IF ShouldCreateSnapshot(aggregate, events.length):
        ScheduleSnapshotCreation(stream_id, aggregate)
    END IF

    RETURN aggregate
END FUNCTION

FUNCTION ShouldCreateSnapshot(aggregate, events_since_snapshot):
    threshold = GetSnapshotThreshold(aggregate.type)

    IF events_since_snapshot >= threshold:
        RETURN TRUE
    END IF

    RETURN FALSE
END FUNCTION
```

### Projection Processing Algorithm

```
FUNCTION RunProjection(projection):
    // Load checkpoint
    checkpoint = LoadCheckpoint(projection.id)
    current_position = checkpoint.global_position

    // Subscribe from checkpoint
    subscription = SubscribeToAll(
        from_position = current_position + 1,
        filter = projection.event_filter
    )

    WHILE projection.status == RUNNING:
        TRY:
            // Get next batch of events
            events = subscription.ReadNext(batch_size = 100)

            IF events.isEmpty():
                // Caught up, wait for new events
                events = subscription.WaitForEvents(timeout = 1000ms)
            END IF

            // Process events in transaction
            BEGIN TRANSACTION

            FOR EACH event IN events:
                // Apply projection logic
                TRY:
                    projection.Apply(event)
                CATCH Exception AS e:
                    HandleProjectionError(projection, event, e)
                END TRY

                current_position = event.global_position
            END FOR

            // Save checkpoint
            SaveCheckpoint(projection.id, current_position)

            COMMIT TRANSACTION

        CATCH Exception AS e:
            ROLLBACK TRANSACTION
            projection.status = FAULTED
            projection.error = e.message
            Log.Error("Projection failed", projection.id, e)
        END TRY
    END WHILE
END FUNCTION

FUNCTION HandleProjectionError(projection, event, error):
    IF projection.settings.skip_on_error:
        Log.Warn("Skipping failed event", event.event_id, error)
        projection.skipped_events++
        RETURN
    END IF

    IF projection.settings.retry_count > 0:
        FOR i = 1 TO projection.settings.retry_count:
            TRY:
                Wait(ExponentialBackoff(i))
                projection.Apply(event)
                RETURN
            CATCH Exception:
                CONTINUE
            END TRY
        END FOR
    END IF

    // All retries exhausted
    THROW error
END FUNCTION
```

### Snapshot Creation Algorithm

```
FUNCTION CreateSnapshot(stream_id, aggregate):
    snapshot = Snapshot(
        snapshot_id = GenerateUUID(),
        stream_id = stream_id,
        version = aggregate.version,
        state = Serialize(aggregate.state),
        state_type = aggregate.type,
        schema_version = aggregate.schema_version,
        created_at = NOW()
    )

    // Store snapshot
    SaveSnapshot(snapshot)

    // Cleanup old snapshots (keep last N)
    CleanupOldSnapshots(stream_id, keep_count = 3)

    Log.Info("Snapshot created", stream_id, snapshot.version)

    RETURN snapshot
END FUNCTION

FUNCTION CleanupOldSnapshots(stream_id, keep_count):
    snapshots = GetSnapshots(stream_id, order_by = version DESC)

    IF snapshots.length > keep_count:
        to_delete = snapshots[keep_count:]
        FOR EACH snapshot IN to_delete:
            DeleteSnapshot(snapshot.snapshot_id)
        END FOR
    END IF
END FUNCTION
```

### Event Upcasting (Schema Evolution)

```
FUNCTION ReadEventsWithUpcasting(stream_id, from_position):
    raw_events = ReadRawEvents(stream_id, from_position)
    upcasted_events = []

    FOR EACH raw_event IN raw_events:
        // Get registered upcasters for this event type
        upcasters = GetUpcasters(
            event_type = raw_event.event_type,
            from_version = raw_event.schema_version,
            to_version = CURRENT_VERSION
        )

        // Apply upcasters in order
        event_data = raw_event.data
        current_version = raw_event.schema_version

        FOR EACH upcaster IN upcasters:
            event_data = upcaster.Upcast(event_data)
            current_version = upcaster.to_version
        END FOR

        upcasted_event = Event(
            ...raw_event,
            data = event_data,
            schema_version = current_version
        )

        upcasted_events.append(upcasted_event)
    END FOR

    RETURN upcasted_events
END FUNCTION

FUNCTION RegisterUpcaster(event_type, from_version, to_version, transformer):
    upcaster = Upcaster(
        event_type = event_type,
        from_version = from_version,
        to_version = to_version,
        transform = transformer
    )

    upcaster_registry.Register(upcaster)
END FUNCTION
```

### Catch-up Subscription Algorithm

```
FUNCTION CatchUpSubscription(stream_id, from_position, handler):
    subscription = CatchUpSubscription(
        stream_id = stream_id,
        current_position = from_position,
        is_live = FALSE
    )

    // Phase 1: Catch-up (historical events)
    WHILE NOT subscription.is_live:
        events = ReadStream(
            stream_id = stream_id,
            from_position = subscription.current_position,
            count = BATCH_SIZE
        )

        IF events.isEmpty():
            // Caught up to head
            subscription.is_live = TRUE
            handler.OnCaughtUp(subscription.current_position)
        ELSE:
            FOR EACH event IN events:
                handler.OnEvent(event)
                subscription.current_position = event.stream_position + 1
            END FOR
        END IF
    END WHILE

    // Phase 2: Live (real-time events)
    live_subscription = SubscribeToStream(
        stream_id = stream_id,
        from_position = subscription.current_position
    )

    WHILE subscription.is_active:
        event = live_subscription.WaitForEvent(timeout = 1000ms)

        IF event IS NOT NULL:
            handler.OnEvent(event)
            subscription.current_position = event.stream_position + 1
        END IF
    END WHILE

    RETURN subscription
END FUNCTION
```

---

## State Machines

### Stream Lifecycle

```
┌────────────────────────────────────────────────────────────────────┐
│ STREAM STATE MACHINE                                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│              ┌────────────────┐                                    │
│              │   NOT_EXISTS   │                                    │
│              └───────┬────────┘                                    │
│                      │ First event appended                        │
│                      ▼                                              │
│              ┌────────────────┐                                    │
│         ┌────│     ACTIVE     │◄────┐                              │
│         │    └───────┬────────┘     │                              │
│         │            │              │                              │
│    Soft delete       │         Recreate                            │
│         │            │              │                              │
│         ▼            │              │                              │
│  ┌────────────────┐  │   ┌────────────────┐                       │
│  │ SOFT_DELETED   │──┼──►│    DELETED     │                       │
│  └────────────────┘  │   └────────────────┘                       │
│         │            │              │                              │
│         └────────────┴──────────────┘                              │
│                Hard delete / TTL expired                           │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Projection Lifecycle

```
┌────────────────────────────────────────────────────────────────────┐
│ PROJECTION STATE MACHINE                                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    [Create]                                                        │
│       │                                                             │
│       ▼                                                             │
│   ┌────────┐  Start()   ┌─────────┐                               │
│   │CREATED │───────────►│ RUNNING │◄─────────────┐                │
│   └────────┘            └────┬────┘              │                │
│                              │                    │                │
│                   ┌──────────┼──────────┐        │                │
│                   │          │          │        │                │
│              Pause()    Error()    Stop()    Resume()              │
│                   │          │          │        │                │
│                   ▼          ▼          ▼        │                │
│            ┌────────┐  ┌─────────┐  ┌────────┐  │                │
│            │ PAUSED │  │ FAULTED │  │STOPPED │  │                │
│            └────┬───┘  └────┬────┘  └────────┘  │                │
│                 │           │                    │                │
│                 │      Reset/Fix()               │                │
│                 │           │                    │                │
│                 └───────────┴────────────────────┘                │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Subscription Lifecycle

```
┌────────────────────────────────────────────────────────────────────┐
│ SUBSCRIPTION STATE MACHINE                                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    [Connect]                                                        │
│        │                                                            │
│        ▼                                                            │
│   ┌──────────┐  Events available   ┌───────────┐                  │
│   │ CATCHING │────────────────────►│   LIVE    │                  │
│   │    UP    │                     └─────┬─────┘                  │
│   └──────────┘                           │                         │
│        │                                 │                         │
│        │ No events (gap)                 │ Disconnect              │
│        │                                 │                         │
│        ▼                                 ▼                         │
│   ┌──────────┐                    ┌───────────┐                   │
│   │  IDLE    │                    │DISCONNECTED│                  │
│   │ (waiting)│                    └───────────┘                   │
│   └──────────┘                                                     │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Component | Implementation Choice | Rationale |
|-----------|----------------------|-----------|
| **Event Storage** | PostgreSQL with partitioning | ACID, familiar, scalable |
| **Event Format** | JSON with schema version | Readable, evolvable |
| **Snapshot Storage** | Separate table/store | Independent lifecycle |
| **Projection Checkpoints** | Database table | Transactional with read model |
| **Subscriptions** | WebSocket + persistent | Real-time + durability |
| **Concurrency Control** | Optimistic with version | High throughput, conflict detection |
