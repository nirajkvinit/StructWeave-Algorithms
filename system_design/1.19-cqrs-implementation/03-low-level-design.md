# Low-Level Design

## Overview

This document covers the detailed design of CQRS components, including data models, API specifications, and core algorithms with pseudocode.

---

## Data Models

### Write Model Schema

```
┌────────────────────────────────────────────────────────────────────┐
│ WRITE MODEL (Normalized - Optimized for Writes)                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  orders                              order_items                    │
│  ┌────────────────────────────┐     ┌────────────────────────────┐ │
│  │ id           UUID PK       │     │ id           UUID PK       │ │
│  │ customer_id  UUID FK       │     │ order_id     UUID FK       │ │
│  │ status       VARCHAR(20)   │     │ product_id   UUID FK       │ │
│  │ version      INTEGER       │◄────│ quantity     INTEGER       │ │
│  │ created_at   TIMESTAMP     │     │ unit_price   DECIMAL(10,2) │ │
│  │ updated_at   TIMESTAMP     │     │ created_at   TIMESTAMP     │ │
│  └────────────────────────────┘     └────────────────────────────┘ │
│                                                                     │
│  outbox (Transactional Outbox)                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ id              UUID PK                                      │   │
│  │ aggregate_type  VARCHAR(50)   -- "Order"                    │   │
│  │ aggregate_id    UUID          -- order.id                   │   │
│  │ event_type      VARCHAR(100)  -- "OrderCreated"             │   │
│  │ payload         JSONB         -- event data                 │   │
│  │ created_at      TIMESTAMP                                    │   │
│  │ published_at    TIMESTAMP     -- NULL until published       │   │
│  │ INDEX (published_at IS NULL, created_at)                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  idempotency_keys                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ key             VARCHAR(255) PK                             │   │
│  │ response        JSONB         -- cached response            │   │
│  │ created_at      TIMESTAMP                                    │   │
│  │ expires_at      TIMESTAMP                                    │   │
│  │ INDEX (expires_at)                                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Read Model Schemas

```
┌────────────────────────────────────────────────────────────────────┐
│ READ MODEL 1: Order List View (Denormalized)                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  order_list_view                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ order_id         UUID PK                                     │   │
│  │ customer_id      UUID                                        │   │
│  │ customer_name    VARCHAR(100)    -- Denormalized            │   │
│  │ customer_email   VARCHAR(255)    -- Denormalized            │   │
│  │ status           VARCHAR(20)                                 │   │
│  │ item_count       INTEGER         -- Pre-computed            │   │
│  │ total_amount     DECIMAL(10,2)   -- Pre-computed            │   │
│  │ first_item_name  VARCHAR(200)    -- Preview                 │   │
│  │ created_at       TIMESTAMP                                   │   │
│  │ updated_at       TIMESTAMP                                   │   │
│  │ version          BIGINT          -- For consistency         │   │
│  │                                                              │   │
│  │ INDEXES:                                                     │   │
│  │   (customer_id, created_at DESC)  -- Customer orders        │   │
│  │   (status, created_at DESC)       -- Status filtering       │   │
│  │   (created_at DESC)               -- Default sorting        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ READ MODEL 2: Order Detail View (Document)                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  order_details (Document Store / JSON Column)                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ {                                                            │   │
│  │   "_id": "order-123",                                        │   │
│  │   "customerId": "cust-456",                                  │   │
│  │   "customer": {                    // Embedded               │   │
│  │     "name": "John Doe",                                      │   │
│  │     "email": "john@example.com",                             │   │
│  │     "phone": "+1-555-0100"                                   │   │
│  │   },                                                         │   │
│  │   "status": "shipped",                                       │   │
│  │   "items": [                       // Embedded               │   │
│  │     {                                                        │   │
│  │       "productId": "prod-789",                               │   │
│  │       "name": "Laptop",                                      │   │
│  │       "quantity": 1,                                         │   │
│  │       "unitPrice": 999.99,                                   │   │
│  │       "totalPrice": 999.99                                   │   │
│  │     }                                                        │   │
│  │   ],                                                         │   │
│  │   "totals": {                      // Pre-computed           │   │
│  │     "subtotal": 999.99,                                      │   │
│  │     "tax": 80.00,                                            │   │
│  │     "shipping": 10.00,                                       │   │
│  │     "total": 1089.99                                         │   │
│  │   },                                                         │   │
│  │   "timeline": [                    // Event history          │   │
│  │     {"event": "created", "at": "2025-01-15T10:00:00Z"},     │   │
│  │     {"event": "paid", "at": "2025-01-15T10:05:00Z"},        │   │
│  │     {"event": "shipped", "at": "2025-01-16T14:00:00Z"}      │   │
│  │   ],                                                         │   │
│  │   "version": 3,                                              │   │
│  │   "updatedAt": "2025-01-16T14:00:00Z"                        │   │
│  │ }                                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ READ MODEL 3: Search Index (Elasticsearch)                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  orders_search_index                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ {                                                            │   │
│  │   "mappings": {                                              │   │
│  │     "properties": {                                          │   │
│  │       "orderId": { "type": "keyword" },                     │   │
│  │       "customerId": { "type": "keyword" },                  │   │
│  │       "customerName": {                                      │   │
│  │         "type": "text",                                      │   │
│  │         "fields": {                                          │   │
│  │           "keyword": { "type": "keyword" },                 │   │
│  │           "autocomplete": {                                  │   │
│  │             "type": "text",                                  │   │
│  │             "analyzer": "autocomplete"                       │   │
│  │           }                                                  │   │
│  │         }                                                    │   │
│  │       },                                                     │   │
│  │       "status": { "type": "keyword" },                      │   │
│  │       "itemNames": { "type": "text" },                      │   │
│  │       "totalAmount": { "type": "float" },                   │   │
│  │       "createdAt": { "type": "date" },                      │   │
│  │       "tags": { "type": "keyword" }                         │   │
│  │     }                                                        │   │
│  │   }                                                          │   │
│  │ }                                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Checkpoint Schema

```
┌────────────────────────────────────────────────────────────────────┐
│ CHECKPOINT STORE                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  projection_checkpoints                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ projection_name  VARCHAR(100) PK                             │   │
│  │ last_position    BIGINT          -- Global event position   │   │
│  │ last_event_id    UUID            -- For exactly-once        │   │
│  │ updated_at       TIMESTAMP                                   │   │
│  │ status           VARCHAR(20)     -- running, paused, error  │   │
│  │ error_message    TEXT            -- Last error if any       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Example entries:                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ projection_name    │ last_position │ status  │ updated_at   │   │
│  │ order_list_view    │ 1234567       │ running │ 2025-01-15   │   │
│  │ order_detail_view  │ 1234567       │ running │ 2025-01-15   │   │
│  │ order_search_index │ 1234560       │ running │ 2025-01-15   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## API Specifications

### Command API

```
┌────────────────────────────────────────────────────────────────────┐
│ COMMAND: Create Order                                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  POST /api/v1/commands/orders                                       │
│                                                                     │
│  Headers:                                                           │
│    Authorization: Bearer <token>                                    │
│    Idempotency-Key: <uuid>                                         │
│    Content-Type: application/json                                   │
│                                                                     │
│  Request Body:                                                      │
│  {                                                                  │
│    "customerId": "cust-456",                                       │
│    "items": [                                                       │
│      {                                                              │
│        "productId": "prod-789",                                    │
│        "quantity": 2                                                │
│      }                                                              │
│    ],                                                               │
│    "shippingAddress": {                                            │
│      "street": "123 Main St",                                      │
│      "city": "Seattle",                                            │
│      "zipCode": "98101"                                            │
│    }                                                                │
│  }                                                                  │
│                                                                     │
│  Success Response (202 Accepted):                                  │
│  {                                                                  │
│    "commandId": "cmd-abc123",                                      │
│    "aggregateId": "order-xyz789",                                  │
│    "version": 1,                                                   │
│    "status": "accepted",                                           │
│    "timestamp": "2025-01-15T10:30:00Z"                             │
│  }                                                                  │
│                                                                     │
│  Idempotent Response (200 OK - duplicate request):                 │
│  {                                                                  │
│    "commandId": "cmd-abc123",                                      │
│    "aggregateId": "order-xyz789",                                  │
│    "version": 1,                                                   │
│    "status": "previously_accepted",                                │
│    "timestamp": "2025-01-15T10:30:00Z"                             │
│  }                                                                  │
│                                                                     │
│  Validation Error (400 Bad Request):                               │
│  {                                                                  │
│    "error": "validation_failed",                                   │
│    "message": "Invalid request",                                   │
│    "details": [                                                    │
│      {"field": "items", "error": "At least one item required"}    │
│    ]                                                                │
│  }                                                                  │
│                                                                     │
│  Domain Error (422 Unprocessable Entity):                          │
│  {                                                                  │
│    "error": "domain_error",                                        │
│    "code": "CUSTOMER_NOT_FOUND",                                   │
│    "message": "Customer cust-456 not found"                        │
│  }                                                                  │
│                                                                     │
│  Concurrency Error (409 Conflict):                                 │
│  {                                                                  │
│    "error": "concurrency_conflict",                                │
│    "message": "Resource was modified, please retry",               │
│    "currentVersion": 3                                             │
│  }                                                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ COMMAND: Update Order Status                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  POST /api/v1/commands/orders/{orderId}/status                     │
│                                                                     │
│  Request Body:                                                      │
│  {                                                                  │
│    "newStatus": "shipped",                                         │
│    "reason": "Dispatched via FedEx",                               │
│    "expectedVersion": 2    // Optimistic concurrency              │
│  }                                                                  │
│                                                                     │
│  Success Response (202 Accepted):                                  │
│  {                                                                  │
│    "commandId": "cmd-def456",                                      │
│    "aggregateId": "order-xyz789",                                  │
│    "version": 3,                                                   │
│    "status": "accepted"                                            │
│  }                                                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Query API

```
┌────────────────────────────────────────────────────────────────────┐
│ QUERY: List Orders                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  GET /api/v1/orders?status=pending&page=1&limit=20                 │
│                                                                     │
│  Query Parameters:                                                  │
│    status      - Filter by status (optional)                       │
│    customerId  - Filter by customer (optional)                     │
│    page        - Page number (default: 1)                          │
│    limit       - Items per page (default: 20, max: 100)            │
│    sort        - Sort field (default: createdAt:desc)              │
│    minVersion  - Wait for this version (read-your-writes)         │
│                                                                     │
│  Response (200 OK):                                                 │
│  {                                                                  │
│    "data": [                                                       │
│      {                                                              │
│        "orderId": "order-xyz789",                                  │
│        "customerName": "John Doe",                                 │
│        "status": "pending",                                        │
│        "itemCount": 3,                                             │
│        "totalAmount": 299.99,                                      │
│        "firstItemName": "Laptop",                                  │
│        "createdAt": "2025-01-15T10:30:00Z"                         │
│      }                                                              │
│    ],                                                               │
│    "pagination": {                                                  │
│      "page": 1,                                                    │
│      "limit": 20,                                                  │
│      "total": 156,                                                 │
│      "totalPages": 8                                               │
│    },                                                               │
│    "meta": {                                                        │
│      "version": 1234567,                                           │
│      "lastUpdated": "2025-01-15T10:35:00Z",                        │
│      "stale": false                                                │
│    }                                                                │
│  }                                                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ QUERY: Get Order Details                                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  GET /api/v1/orders/{orderId}                                      │
│  GET /api/v1/orders/{orderId}?minVersion=3                         │
│                                                                     │
│  Response (200 OK):                                                 │
│  {                                                                  │
│    "data": {                                                       │
│      "orderId": "order-xyz789",                                    │
│      "customer": {                                                 │
│        "id": "cust-456",                                           │
│        "name": "John Doe",                                         │
│        "email": "john@example.com"                                 │
│      },                                                             │
│      "status": "shipped",                                          │
│      "items": [                                                    │
│        {                                                            │
│          "productId": "prod-789",                                  │
│          "name": "Laptop",                                         │
│          "quantity": 1,                                            │
│          "unitPrice": 999.99,                                      │
│          "totalPrice": 999.99                                      │
│        }                                                            │
│      ],                                                             │
│      "totals": {                                                   │
│        "subtotal": 999.99,                                         │
│        "tax": 80.00,                                               │
│        "shipping": 10.00,                                          │
│        "total": 1089.99                                            │
│      },                                                             │
│      "timeline": [                                                 │
│        {"event": "created", "at": "2025-01-15T10:00:00Z"},        │
│        {"event": "paid", "at": "2025-01-15T10:05:00Z"},           │
│        {"event": "shipped", "at": "2025-01-16T14:00:00Z"}         │
│      ]                                                              │
│    },                                                               │
│    "meta": {                                                        │
│      "version": 3,                                                 │
│      "lastUpdated": "2025-01-16T14:00:00Z"                         │
│    }                                                                │
│  }                                                                  │
│                                                                     │
│  Version Wait Timeout (504 Gateway Timeout):                       │
│  {                                                                  │
│    "error": "version_timeout",                                     │
│    "message": "Requested version 5 not available within timeout", │
│    "currentVersion": 3                                             │
│  }                                                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ QUERY: Search Orders                                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  GET /api/v1/orders/search?q=laptop&status=shipped                 │
│                                                                     │
│  Query Parameters:                                                  │
│    q          - Full-text search query                             │
│    status     - Filter by status (multiple allowed)                │
│    minAmount  - Minimum total amount                               │
│    maxAmount  - Maximum total amount                               │
│    from       - Date range start                                   │
│    to         - Date range end                                     │
│    page       - Page number                                        │
│    limit      - Items per page                                     │
│                                                                     │
│  Response (200 OK):                                                 │
│  {                                                                  │
│    "data": [...],                                                  │
│    "facets": {                                                     │
│      "status": [                                                   │
│        {"value": "shipped", "count": 45},                         │
│        {"value": "pending", "count": 12}                          │
│      ],                                                             │
│      "priceRange": [                                               │
│        {"range": "0-100", "count": 20},                           │
│        {"range": "100-500", "count": 30}                          │
│      ]                                                              │
│    },                                                               │
│    "pagination": {...},                                            │
│    "meta": {...}                                                   │
│  }                                                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Core Algorithms

### Algorithm 1: Command Processing with Idempotency

```
┌────────────────────────────────────────────────────────────────────┐
│ ALGORITHM: Command Processing Pipeline                              │
├────────────────────────────────────────────────────────────────────┤

FUNCTION processCommand(command, idempotencyKey):
    // Step 1: Check idempotency
    cachedResult = idempotencyStore.get(idempotencyKey)
    IF cachedResult EXISTS:
        RETURN cachedResult WITH status="previously_accepted"

    // Step 2: Validate command structure
    validationErrors = validator.validate(command)
    IF validationErrors NOT EMPTY:
        THROW ValidationException(validationErrors)

    // Step 3: Load aggregate with current state
    aggregate = repository.load(command.aggregateId)
    currentVersion = aggregate.version

    // Step 4: Check expected version (optimistic concurrency)
    IF command.expectedVersion IS SET:
        IF command.expectedVersion != currentVersion:
            THROW ConcurrencyConflictException(currentVersion)

    // Step 5: Execute domain logic
    TRY:
        events = aggregate.handle(command)
    CATCH DomainException as e:
        THROW DomainException(e)

    // Step 6: Persist in single transaction
    BEGIN TRANSACTION:
        // Save aggregate state
        newVersion = repository.save(aggregate, currentVersion)

        // Append events to outbox
        FOR EACH event IN events:
            outbox.insert({
                aggregateType: aggregate.type,
                aggregateId: aggregate.id,
                eventType: event.type,
                payload: serialize(event),
                createdAt: NOW()
            })

        // Store idempotency key
        result = {
            commandId: generateId(),
            aggregateId: aggregate.id,
            version: newVersion,
            status: "accepted"
        }
        idempotencyStore.set(idempotencyKey, result, TTL=24h)

    COMMIT TRANSACTION

    // Step 7: Return result (async projection will happen later)
    RETURN result

└────────────────────────────────────────────────────────────────────┘
```

### Algorithm 2: Outbox Relay (Polling Publisher)

```
┌────────────────────────────────────────────────────────────────────┐
│ ALGORITHM: Outbox Relay                                             │
├────────────────────────────────────────────────────────────────────┤

FUNCTION outboxRelay():
    WHILE running:
        // Step 1: Poll unpublished events
        events = database.query("""
            SELECT id, aggregate_type, aggregate_id, event_type, payload
            FROM outbox
            WHERE published_at IS NULL
            ORDER BY created_at ASC
            LIMIT 100
            FOR UPDATE SKIP LOCKED
        """)

        IF events IS EMPTY:
            SLEEP(100ms)  // Avoid busy loop
            CONTINUE

        // Step 2: Publish batch to message broker
        FOR EACH event IN events:
            message = {
                eventId: event.id,
                aggregateType: event.aggregate_type,
                aggregateId: event.aggregate_id,
                eventType: event.event_type,
                data: event.payload,
                timestamp: NOW()
            }

            TRY:
                broker.publish(
                    topic: "domain-events",
                    key: event.aggregate_id,  // Ordering key
                    message: message
                )
            CATCH PublishException:
                LOG.error("Failed to publish event", event.id)
                CONTINUE  // Will retry next iteration

        // Step 3: Mark as published
        eventIds = events.map(e => e.id)
        database.execute("""
            UPDATE outbox
            SET published_at = NOW()
            WHERE id IN (eventIds)
        """)

        // Step 4: Cleanup old published events (optional)
        IF shouldCleanup():
            database.execute("""
                DELETE FROM outbox
                WHERE published_at < NOW() - INTERVAL '7 days'
            """)

└────────────────────────────────────────────────────────────────────┘
```

### Algorithm 3: Projection Update

```
┌────────────────────────────────────────────────────────────────────┐
│ ALGORITHM: Projection Processing                                    │
├────────────────────────────────────────────────────────────────────┤

FUNCTION processProjection(projectionName, eventHandlers):
    // Step 1: Load checkpoint
    checkpoint = checkpointStore.get(projectionName)
    lastPosition = checkpoint.lastPosition OR 0

    WHILE running:
        // Step 2: Fetch events from broker (or event store)
        events = eventSource.fetchFrom(
            position: lastPosition,
            limit: 100
        )

        IF events IS EMPTY:
            SLEEP(50ms)
            CONTINUE

        // Step 3: Process each event
        FOR EACH event IN events:
            handler = eventHandlers.get(event.eventType)

            IF handler IS NULL:
                // Unknown event type - skip but record position
                LOG.debug("Skipping unknown event type", event.eventType)
                lastPosition = event.position
                CONTINUE

            // Step 4: Apply event to read model
            TRY:
                BEGIN TRANSACTION:
                    handler.handle(event)

                    // Update checkpoint atomically with projection
                    checkpointStore.update(projectionName, {
                        lastPosition: event.position,
                        lastEventId: event.eventId,
                        updatedAt: NOW()
                    })
                COMMIT TRANSACTION

                lastPosition = event.position

            CATCH Exception as e:
                // Step 5: Handle errors
                LOG.error("Projection failed", projectionName, event, e)

                IF isRetryable(e):
                    SLEEP(exponentialBackoff())
                    // Will retry same event
                ELSE:
                    // Send to dead letter queue
                    deadLetterQueue.send(event, e)
                    lastPosition = event.position  // Skip this event

        // Optional: Emit metrics
        metrics.gauge("projection.lag", NOW() - events.last().timestamp)
        metrics.counter("projection.events.processed", events.size)

└────────────────────────────────────────────────────────────────────┘
```

### Algorithm 4: Read-Your-Writes Consistency

```
┌────────────────────────────────────────────────────────────────────┐
│ ALGORITHM: Version-Based Consistency                                │
├────────────────────────────────────────────────────────────────────┤

// Client side: Store version after command
FUNCTION afterCommandSuccess(response):
    sessionStorage.set(
        key: "version:" + response.aggregateId,
        value: response.version,
        ttl: 5m
    )

// Client side: Include version in queries
FUNCTION queryWithConsistency(aggregateId):
    minVersion = sessionStorage.get("version:" + aggregateId)
    RETURN apiClient.get("/orders/" + aggregateId, {
        params: { minVersion: minVersion }
    })

// Server side: Handle minVersion parameter
FUNCTION handleQueryWithVersion(aggregateId, minVersion, timeout=5s):
    startTime = NOW()

    WHILE (NOW() - startTime) < timeout:
        result = readModel.get(aggregateId)

        IF result IS NULL:
            THROW NotFoundException()

        IF minVersion IS NULL OR result.version >= minVersion:
            RETURN result

        // Version not yet available, wait and retry
        SLEEP(100ms)

    // Timeout reached
    IF allowStaleRead:
        result = readModel.get(aggregateId)
        result.meta.stale = true
        RETURN result
    ELSE:
        THROW VersionTimeoutException(
            requestedVersion: minVersion,
            currentVersion: result.version
        )

└────────────────────────────────────────────────────────────────────┘
```

### Algorithm 5: Projection Rebuild

```
┌────────────────────────────────────────────────────────────────────┐
│ ALGORITHM: Zero-Downtime Projection Rebuild                         │
├────────────────────────────────────────────────────────────────────┤

FUNCTION rebuildProjection(projectionName):
    // Step 1: Create new projection instance
    newProjectionName = projectionName + "_v2"
    newReadModel = createReadModel(newProjectionName)

    // Step 2: Start rebuilding from beginning
    checkpointStore.set(newProjectionName, { lastPosition: 0 })

    LOG.info("Starting rebuild of", projectionName)

    // Step 3: Process all historical events
    WHILE NOT caughtUp:
        events = eventSource.fetchFrom(
            position: checkpointStore.get(newProjectionName).lastPosition,
            limit: 1000  // Larger batches for rebuild
        )

        IF events IS EMPTY:
            caughtUp = true
            CONTINUE

        // Batch process for efficiency
        FOR EACH event IN events:
            handler = eventHandlers.get(event.eventType)
            IF handler:
                handler.handle(event, newReadModel)

        // Checkpoint less frequently during rebuild
        checkpointStore.update(newProjectionName, {
            lastPosition: events.last().position
        })

        LOG.info("Rebuild progress", events.last().position)

    // Step 4: Catch up to live (projection is now nearly current)
    LOG.info("Rebuild complete, switching to live mode")

    // Step 5: Atomic switch
    BEGIN TRANSACTION:
        // Rename old to backup
        renameReadModel(projectionName, projectionName + "_old")

        // Rename new to active
        renameReadModel(newProjectionName, projectionName)

        // Update checkpoint reference
        checkpointStore.rename(newProjectionName, projectionName)
    COMMIT

    LOG.info("Projection switch complete")

    // Step 6: Cleanup (after verification period)
    SCHEDULE afterDelay(1h):
        dropReadModel(projectionName + "_old")
        checkpointStore.delete(newProjectionName)

└────────────────────────────────────────────────────────────────────┘
```

---

## Event Schemas

### Domain Events

```
┌────────────────────────────────────────────────────────────────────┐
│ EVENT: OrderCreated                                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  {                                                                  │
│    "eventId": "evt-123",                                           │
│    "eventType": "OrderCreated",                                    │
│    "schemaVersion": "1.0",                                         │
│    "aggregateType": "Order",                                       │
│    "aggregateId": "order-xyz789",                                  │
│    "version": 1,                                                   │
│    "timestamp": "2025-01-15T10:30:00Z",                            │
│    "correlationId": "req-abc",                                     │
│    "causationId": "cmd-def",                                       │
│    "data": {                                                       │
│      "customerId": "cust-456",                                     │
│      "customerName": "John Doe",     // Denormalized at event time │
│      "customerEmail": "john@ex.com",                               │
│      "items": [                                                    │
│        {                                                            │
│          "productId": "prod-789",                                  │
│          "productName": "Laptop",                                  │
│          "quantity": 1,                                            │
│          "unitPrice": 999.99                                       │
│        }                                                            │
│      ],                                                             │
│      "shippingAddress": {                                          │
│        "street": "123 Main St",                                    │
│        "city": "Seattle",                                          │
│        "zipCode": "98101"                                          │
│      },                                                             │
│      "totals": {                                                   │
│        "subtotal": 999.99,                                         │
│        "tax": 80.00,                                               │
│        "shipping": 10.00,                                          │
│        "total": 1089.99                                            │
│      }                                                              │
│    }                                                                │
│  }                                                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ EVENT: OrderStatusChanged                                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  {                                                                  │
│    "eventId": "evt-456",                                           │
│    "eventType": "OrderStatusChanged",                              │
│    "schemaVersion": "1.0",                                         │
│    "aggregateType": "Order",                                       │
│    "aggregateId": "order-xyz789",                                  │
│    "version": 2,                                                   │
│    "timestamp": "2025-01-16T14:00:00Z",                            │
│    "data": {                                                       │
│      "previousStatus": "pending",                                  │
│      "newStatus": "shipped",                                       │
│      "reason": "Dispatched via FedEx",                             │
│      "trackingNumber": "FX123456789",                              │
│      "changedBy": "user-admin"                                     │
│    }                                                                │
│  }                                                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Projection Handlers

```
┌────────────────────────────────────────────────────────────────────┐
│ PROJECTION HANDLER: Order List View                                 │
├────────────────────────────────────────────────────────────────────┤

class OrderListViewProjection:

    FUNCTION handle(event):
        SWITCH event.eventType:
            CASE "OrderCreated":
                handleOrderCreated(event)
            CASE "OrderStatusChanged":
                handleStatusChanged(event)
            CASE "OrderCancelled":
                handleOrderCancelled(event)

    FUNCTION handleOrderCreated(event):
        data = event.data
        readModel.upsert("order_list_view", {
            orderId: event.aggregateId,
            customerId: data.customerId,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            status: "pending",
            itemCount: data.items.length,
            totalAmount: data.totals.total,
            firstItemName: data.items[0].productName,
            createdAt: event.timestamp,
            updatedAt: event.timestamp,
            version: event.version
        })

    FUNCTION handleStatusChanged(event):
        readModel.update("order_list_view",
            WHERE: { orderId: event.aggregateId },
            SET: {
                status: event.data.newStatus,
                updatedAt: event.timestamp,
                version: event.version
            }
        )

    FUNCTION handleOrderCancelled(event):
        readModel.update("order_list_view",
            WHERE: { orderId: event.aggregateId },
            SET: {
                status: "cancelled",
                updatedAt: event.timestamp,
                version: event.version
            }
        )

└────────────────────────────────────────────────────────────────────┘
```
