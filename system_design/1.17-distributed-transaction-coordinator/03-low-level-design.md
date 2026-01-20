# Low-Level Design

[← Back to Index](./00-index.md)

---

## Data Models

### Core Entities

```
┌────────────────────────────────────────────────────────────────────┐
│ TRANSACTION RECORD (2PC)                                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ENTITY Transaction:                                                 │
│   transaction_id:    UUID          // Unique transaction ID        │
│   coordinator_id:    String        // Node handling this TX        │
│   state:             TransactionState                              │
│   participants:      List<Participant>                             │
│   created_at:        Timestamp                                     │
│   updated_at:        Timestamp                                     │
│   timeout_at:        Timestamp     // Deadline for completion      │
│   decision:          Decision      // COMMIT or ABORT              │
│   decision_time:     Timestamp     // When decision was made       │
│   metadata:          Map<String, String>                           │
│                                                                     │
│ ENUM TransactionState:                                              │
│   STARTED           // TX initiated                                │
│   PREPARING         // Prepare sent to participants                │
│   PREPARED          // All participants voted COMMIT               │
│   COMMITTING        // Commit being sent                           │
│   COMMITTED         // All participants committed                  │
│   ABORTING          // Abort being sent                            │
│   ABORTED           // All participants aborted                    │
│                                                                     │
│ ENUM Decision:                                                      │
│   PENDING           // No decision yet                             │
│   COMMIT            // Decided to commit                           │
│   ABORT             // Decided to abort                            │
│                                                                     │
│ ENTITY Participant:                                                 │
│   participant_id:    String        // Service identifier           │
│   endpoint:          String        // Service URL                  │
│   vote:              Vote          // COMMIT, ABORT, or PENDING    │
│   vote_time:         Timestamp                                     │
│   ack_received:      Boolean       // Commit/abort acknowledged    │
│   ack_time:          Timestamp                                     │
│                                                                     │
│ ENUM Vote:                                                          │
│   PENDING           // Not yet voted                               │
│   COMMIT            // Ready to commit                             │
│   ABORT             // Cannot commit                               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Saga Entities

```
┌────────────────────────────────────────────────────────────────────┐
│ SAGA RECORD                                                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ENTITY Saga:                                                        │
│   saga_id:           UUID          // Unique saga instance ID      │
│   saga_type:         String        // e.g., "OrderSaga"           │
│   state:             SagaState                                     │
│   current_step:      Integer       // Current step index           │
│   steps:             List<SagaStep>                                │
│   input_data:        JSON          // Initial saga input           │
│   context:           JSON          // Accumulated step outputs     │
│   created_at:        Timestamp                                     │
│   updated_at:        Timestamp                                     │
│   completed_at:      Timestamp                                     │
│   error:             String        // Error message if failed      │
│   retry_count:       Integer       // Saga-level retry count       │
│   correlation_id:    String        // For tracing                  │
│                                                                     │
│ ENUM SagaState:                                                     │
│   STARTED           // Saga initiated                              │
│   RUNNING           // Executing forward steps                     │
│   COMPENSATING      // Executing compensation steps                │
│   COMPLETED         // All steps succeeded                         │
│   COMPENSATED       // All compensations executed                  │
│   FAILED            // Unrecoverable failure                       │
│                                                                     │
│ ENTITY SagaStep:                                                    │
│   step_id:           String        // Unique step identifier       │
│   step_index:        Integer       // Execution order              │
│   service:           String        // Target service name          │
│   action:            String        // Action to execute            │
│   compensation:      String        // Compensation action          │
│   state:             StepState                                     │
│   input:             JSON          // Step input data              │
│   output:            JSON          // Step output data             │
│   started_at:        Timestamp                                     │
│   completed_at:      Timestamp                                     │
│   retry_count:       Integer                                       │
│   error:             String                                        │
│   idempotency_key:   String        // For exactly-once            │
│                                                                     │
│ ENUM StepState:                                                     │
│   PENDING           // Not yet executed                            │
│   RUNNING           // Currently executing                         │
│   SUCCEEDED         // Completed successfully                      │
│   FAILED            // Execution failed                            │
│   COMPENSATING      // Compensation in progress                    │
│   COMPENSATED       // Compensation completed                      │
│   SKIPPED           // Skipped (no compensation needed)            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### TCC Entities

```
┌────────────────────────────────────────────────────────────────────┐
│ TCC RECORD                                                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ENTITY TCCTransaction:                                              │
│   tcc_id:            UUID          // Transaction identifier       │
│   state:             TCCState                                      │
│   reservations:      List<Reservation>                             │
│   try_deadline:      Timestamp     // Must confirm/cancel by       │
│   created_at:        Timestamp                                     │
│   confirmed_at:      Timestamp                                     │
│   cancelled_at:      Timestamp                                     │
│                                                                     │
│ ENUM TCCState:                                                      │
│   TRYING            // Try phase in progress                       │
│   TRY_SUCCEEDED     // All tries succeeded                         │
│   TRY_FAILED        // At least one try failed                     │
│   CONFIRMING        // Confirm phase in progress                   │
│   CONFIRMED         // All confirmations done                      │
│   CANCELLING        // Cancel phase in progress                    │
│   CANCELLED         // All cancellations done                      │
│                                                                     │
│ ENTITY Reservation:                                                 │
│   reservation_id:    UUID                                          │
│   service:           String                                        │
│   resource_type:     String        // e.g., "seat", "room"        │
│   resource_id:       String                                        │
│   state:             ReservationState                              │
│   expires_at:        Timestamp                                     │
│   try_result:        JSON                                          │
│   confirm_result:    JSON                                          │
│                                                                     │
│ ENUM ReservationState:                                              │
│   PENDING           // Try not yet called                          │
│   RESERVED          // Try succeeded, awaiting confirm             │
│   TRY_FAILED        // Try failed                                  │
│   CONFIRMED         // Confirm succeeded                           │
│   CANCELLED         // Cancel called (explicit or timeout)         │
│   EXPIRED           // Timeout without confirm/cancel              │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Idempotency Store

```
┌────────────────────────────────────────────────────────────────────┐
│ IDEMPOTENCY RECORD                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ENTITY IdempotencyRecord:                                           │
│   idempotency_key:   String        // Primary key                  │
│   operation:         String        // Operation name               │
│   request_hash:      String        // Hash of request body         │
│   status:            IdempotencyStatus                             │
│   response:          JSON          // Cached response              │
│   created_at:        Timestamp                                     │
│   expires_at:        Timestamp     // TTL for cleanup              │
│                                                                     │
│ ENUM IdempotencyStatus:                                             │
│   IN_PROGRESS       // Operation currently executing               │
│   COMPLETED         // Operation completed successfully            │
│   FAILED            // Operation failed                            │
│                                                                     │
│ Key Generation:                                                     │
│   Format: "{saga_id}:{step_id}:{attempt}"                          │
│   Example: "saga-123:step-reserve:1"                               │
│                                                                     │
│ TTL Strategy:                                                       │
│   Default: 24 hours (covers retry window + buffer)                 │
│   Configurable per operation type                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Outbox Table

```
┌────────────────────────────────────────────────────────────────────┐
│ OUTBOX TABLE SCHEMA                                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ TABLE outbox:                                                       │
│   id:                BIGSERIAL     // Auto-increment PK            │
│   aggregate_type:    VARCHAR(255)  // e.g., "Order"               │
│   aggregate_id:      VARCHAR(255)  // e.g., order ID               │
│   event_type:        VARCHAR(255)  // e.g., "OrderCreated"        │
│   payload:           JSONB         // Event data                   │
│   created_at:        TIMESTAMP     // For ordering                 │
│   published_at:      TIMESTAMP     // NULL until published         │
│   correlation_id:    VARCHAR(255)  // For tracing                  │
│   causation_id:      VARCHAR(255)  // Parent event ID              │
│                                                                     │
│ INDEX: idx_outbox_unpublished ON outbox(created_at)                │
│        WHERE published_at IS NULL                                   │
│                                                                     │
│ Cleanup: DELETE WHERE published_at < NOW() - INTERVAL '7 days'     │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Storage Schema

### Transaction Log Table

```
┌────────────────────────────────────────────────────────────────────┐
│ TRANSACTION LOG STORAGE                                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ TABLE transaction_log:                                              │
│   transaction_id:    UUID PRIMARY KEY                              │
│   coordinator_id:    VARCHAR(255) NOT NULL                         │
│   state:             VARCHAR(50) NOT NULL                          │
│   decision:          VARCHAR(20)                                   │
│   participants:      JSONB NOT NULL                                │
│   created_at:        TIMESTAMP NOT NULL                            │
│   updated_at:        TIMESTAMP NOT NULL                            │
│   timeout_at:        TIMESTAMP NOT NULL                            │
│   decision_time:     TIMESTAMP                                     │
│   metadata:          JSONB                                         │
│                                                                     │
│ INDEXES:                                                            │
│   PRIMARY KEY (transaction_id)                                     │
│   INDEX idx_tx_coordinator (coordinator_id, state)                 │
│   INDEX idx_tx_timeout (timeout_at) WHERE state IN                 │
│     ('STARTED', 'PREPARING', 'PREPARED')                          │
│   INDEX idx_tx_created (created_at)                                │
│                                                                     │
│ PARTITION BY RANGE (created_at)                                    │
│   Monthly partitions for efficient archival                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Saga State Table

```
┌────────────────────────────────────────────────────────────────────┐
│ SAGA STATE STORAGE                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ TABLE sagas:                                                        │
│   saga_id:           UUID PRIMARY KEY                              │
│   saga_type:         VARCHAR(255) NOT NULL                         │
│   state:             VARCHAR(50) NOT NULL                          │
│   current_step:      INTEGER NOT NULL DEFAULT 0                    │
│   input_data:        JSONB                                         │
│   context:           JSONB NOT NULL DEFAULT '{}'                   │
│   error:             TEXT                                          │
│   retry_count:       INTEGER NOT NULL DEFAULT 0                    │
│   correlation_id:    VARCHAR(255)                                  │
│   created_at:        TIMESTAMP NOT NULL                            │
│   updated_at:        TIMESTAMP NOT NULL                            │
│   completed_at:      TIMESTAMP                                     │
│                                                                     │
│ TABLE saga_steps:                                                   │
│   saga_id:           UUID NOT NULL                                 │
│   step_index:        INTEGER NOT NULL                              │
│   step_id:           VARCHAR(255) NOT NULL                         │
│   service:           VARCHAR(255) NOT NULL                         │
│   action:            VARCHAR(255) NOT NULL                         │
│   compensation:      VARCHAR(255)                                  │
│   state:             VARCHAR(50) NOT NULL                          │
│   input:             JSONB                                         │
│   output:            JSONB                                         │
│   error:             TEXT                                          │
│   retry_count:       INTEGER NOT NULL DEFAULT 0                    │
│   idempotency_key:   VARCHAR(255) NOT NULL                         │
│   started_at:        TIMESTAMP                                     │
│   completed_at:      TIMESTAMP                                     │
│   PRIMARY KEY (saga_id, step_index)                                │
│   FOREIGN KEY (saga_id) REFERENCES sagas(saga_id)                 │
│                                                                     │
│ INDEXES:                                                            │
│   INDEX idx_saga_state (state, updated_at)                         │
│   INDEX idx_saga_type (saga_type, state)                           │
│   INDEX idx_saga_correlation (correlation_id)                      │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## API Design

### Transaction Coordinator API

```
┌────────────────────────────────────────────────────────────────────┐
│ 2PC COORDINATOR API                                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ POST /transactions                                                  │
│ Begin a new distributed transaction                                 │
│                                                                     │
│ Request:                                                            │
│ {                                                                   │
│   "timeout_seconds": 30,                                           │
│   "participants": [                                                │
│     {"service": "inventory", "endpoint": "http://..."},           │
│     {"service": "payment", "endpoint": "http://..."}              │
│   ],                                                               │
│   "metadata": {"order_id": "123"}                                  │
│ }                                                                   │
│                                                                     │
│ Response (201 Created):                                             │
│ {                                                                   │
│   "transaction_id": "uuid-...",                                    │
│   "state": "STARTED",                                              │
│   "timeout_at": "2024-01-15T10:30:00Z"                            │
│ }                                                                   │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ POST /transactions/{txId}/prepare                                   │
│ Initiate prepare phase (coordinator sends PREPARE to participants)│
│                                                                     │
│ Response (202 Accepted):                                            │
│ {                                                                   │
│   "transaction_id": "uuid-...",                                    │
│   "state": "PREPARING"                                             │
│ }                                                                   │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ POST /transactions/{txId}/commit                                    │
│ Force commit (only if all participants voted COMMIT)               │
│                                                                     │
│ POST /transactions/{txId}/abort                                     │
│ Force abort                                                        │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ GET /transactions/{txId}                                            │
│ Get transaction status                                             │
│                                                                     │
│ Response (200 OK):                                                  │
│ {                                                                   │
│   "transaction_id": "uuid-...",                                    │
│   "state": "COMMITTED",                                            │
│   "decision": "COMMIT",                                            │
│   "participants": [                                                │
│     {"service": "inventory", "vote": "COMMIT", "ack": true},      │
│     {"service": "payment", "vote": "COMMIT", "ack": true}         │
│   ]                                                                │
│ }                                                                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Saga Orchestrator API

```
┌────────────────────────────────────────────────────────────────────┐
│ SAGA ORCHESTRATOR API                                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ POST /sagas                                                         │
│ Start a new saga                                                   │
│                                                                     │
│ Request:                                                            │
│ {                                                                   │
│   "saga_type": "OrderSaga",                                        │
│   "input": {                                                       │
│     "order_id": "order-123",                                       │
│     "customer_id": "cust-456",                                     │
│     "items": [...],                                                │
│     "total": 99.99                                                 │
│   },                                                               │
│   "correlation_id": "request-789"                                  │
│ }                                                                   │
│                                                                     │
│ Response (201 Created):                                             │
│ {                                                                   │
│   "saga_id": "saga-uuid-...",                                      │
│   "saga_type": "OrderSaga",                                        │
│   "state": "STARTED",                                              │
│   "steps": [                                                       │
│     {"step_id": "reserve-inventory", "state": "PENDING"},         │
│     {"step_id": "process-payment", "state": "PENDING"},           │
│     {"step_id": "schedule-shipping", "state": "PENDING"}          │
│   ]                                                                │
│ }                                                                   │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ GET /sagas/{sagaId}                                                 │
│ Get saga status                                                    │
│                                                                     │
│ Response (200 OK):                                                  │
│ {                                                                   │
│   "saga_id": "saga-uuid-...",                                      │
│   "state": "COMPLETED",                                            │
│   "current_step": 3,                                               │
│   "steps": [                                                       │
│     {"step_id": "reserve-inventory", "state": "SUCCEEDED",        │
│      "output": {"reservation_id": "..."}},                        │
│     {"step_id": "process-payment", "state": "SUCCEEDED",          │
│      "output": {"payment_id": "..."}},                            │
│     {"step_id": "schedule-shipping", "state": "SUCCEEDED",        │
│      "output": {"shipment_id": "..."}}                            │
│   ],                                                               │
│   "context": {...accumulated outputs...}                          │
│ }                                                                   │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ POST /sagas/{sagaId}/compensate                                     │
│ Manually trigger compensation (admin only)                         │
│                                                                     │
│ GET /sagas?state=RUNNING&saga_type=OrderSaga                       │
│ List sagas with filtering                                          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Participant Service API

```
┌────────────────────────────────────────────────────────────────────┐
│ PARTICIPANT SERVICE API (2PC)                                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ POST /2pc/prepare                                                   │
│ Prepare for commit                                                  │
│                                                                     │
│ Request:                                                            │
│ {                                                                   │
│   "transaction_id": "tx-uuid-...",                                 │
│   "operation": {                                                   │
│     "type": "DEBIT",                                               │
│     "account_id": "acc-123",                                       │
│     "amount": 100.00                                               │
│   }                                                                │
│ }                                                                   │
│                                                                     │
│ Response (200 OK):                                                  │
│ {                                                                   │
│   "transaction_id": "tx-uuid-...",                                 │
│   "vote": "COMMIT"    // or "ABORT"                                │
│ }                                                                   │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ POST /2pc/commit                                                    │
│ {                                                                   │
│   "transaction_id": "tx-uuid-..."                                  │
│ }                                                                   │
│                                                                     │
│ POST /2pc/rollback                                                  │
│ {                                                                   │
│   "transaction_id": "tx-uuid-..."                                  │
│ }                                                                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────────┐
│ PARTICIPANT SERVICE API (SAGA)                                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ POST /saga/execute                                                  │
│ Execute a saga step                                                │
│                                                                     │
│ Headers:                                                            │
│   Idempotency-Key: saga-123:step-1:attempt-1                       │
│   X-Saga-Id: saga-123                                              │
│   X-Correlation-Id: req-456                                        │
│                                                                     │
│ Request:                                                            │
│ {                                                                   │
│   "action": "reserve-inventory",                                   │
│   "input": {                                                       │
│     "product_id": "prod-789",                                      │
│     "quantity": 2                                                  │
│   }                                                                │
│ }                                                                   │
│                                                                     │
│ Response (200 OK):                                                  │
│ {                                                                   │
│   "status": "SUCCESS",                                             │
│   "output": {                                                      │
│     "reservation_id": "res-abc"                                    │
│   }                                                                │
│ }                                                                   │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ POST /saga/compensate                                               │
│ Execute compensation for a step                                    │
│                                                                     │
│ Request:                                                            │
│ {                                                                   │
│   "action": "release-inventory",                                   │
│   "input": {                                                       │
│     "reservation_id": "res-abc"                                    │
│   }                                                                │
│ }                                                                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Algorithms

### Two-Phase Commit Coordinator Algorithm

```
FUNCTION RunTwoPhaseCommit(transaction):
    // Phase 1: Prepare
    transaction.state = PREPARING
    PersistState(transaction)

    votes = []
    FOR EACH participant IN transaction.participants:
        TRY:
            response = SendWithTimeout(participant.endpoint, PREPARE, timeout)
            participant.vote = response.vote
            participant.vote_time = now()
            votes.append(response.vote)
        CATCH TimeoutException:
            participant.vote = ABORT
            votes.append(ABORT)
        END TRY
    END FOR

    PersistState(transaction)

    // Decision Point
    IF all(votes == COMMIT):
        transaction.decision = COMMIT
        transaction.state = COMMITTING
    ELSE:
        transaction.decision = ABORT
        transaction.state = ABORTING
    END IF

    transaction.decision_time = now()
    PersistState(transaction)  // CRITICAL: Must persist before Phase 2

    // Phase 2: Commit or Abort
    FOR EACH participant IN transaction.participants:
        IF transaction.decision == COMMIT:
            SendWithRetry(participant.endpoint, COMMIT, maxRetries)
        ELSE:
            SendWithRetry(participant.endpoint, ROLLBACK, maxRetries)
        END IF
        participant.ack_received = true
        participant.ack_time = now()
    END FOR

    transaction.state = IF transaction.decision == COMMIT THEN COMMITTED ELSE ABORTED
    PersistState(transaction)

    RETURN transaction.decision
END FUNCTION
```

### 2PC Recovery Algorithm

```
FUNCTION RecoverTransactions(coordinator_id):
    // Find incomplete transactions on startup
    incomplete = Query(
        "SELECT * FROM transaction_log
         WHERE coordinator_id = ?
         AND state NOT IN ('COMMITTED', 'ABORTED')",
        coordinator_id
    )

    FOR EACH transaction IN incomplete:
        SWITCH transaction.state:
            CASE STARTED, PREPARING:
                // No decision made, safe to abort
                AbortTransaction(transaction)

            CASE PREPARED:
                // Decision may have been made but not persisted
                // Query participants or use timeout
                IF transaction.timeout_at < now():
                    AbortTransaction(transaction)
                ELSE:
                    // Re-run prepare to get votes
                    RunTwoPhaseCommit(transaction)
                END IF

            CASE COMMITTING:
                // Decision was COMMIT, must complete
                CompleteCommit(transaction)

            CASE ABORTING:
                // Decision was ABORT, must complete
                CompleteAbort(transaction)
        END SWITCH
    END FOR
END FUNCTION

FUNCTION CompleteCommit(transaction):
    FOR EACH participant IN transaction.participants:
        IF NOT participant.ack_received:
            SendWithRetry(participant.endpoint, COMMIT, maxRetries)
            participant.ack_received = true
        END IF
    END FOR
    transaction.state = COMMITTED
    PersistState(transaction)
END FUNCTION
```

### Saga Orchestrator Algorithm

```
FUNCTION RunSaga(saga):
    saga.state = RUNNING
    PersistSaga(saga)

    WHILE saga.current_step < saga.steps.length:
        step = saga.steps[saga.current_step]

        TRY:
            result = ExecuteStep(saga, step)
            step.state = SUCCEEDED
            step.output = result.output
            saga.context = Merge(saga.context, result.output)
            saga.current_step++
            PersistSaga(saga)

        CATCH RetryableException AS e:
            IF step.retry_count < maxRetries:
                step.retry_count++
                Wait(ExponentialBackoff(step.retry_count))
                CONTINUE
            ELSE:
                step.state = FAILED
                step.error = e.message
                PersistSaga(saga)
                RETURN CompensateSaga(saga)
            END IF

        CATCH NonRetryableException AS e:
            step.state = FAILED
            step.error = e.message
            PersistSaga(saga)
            RETURN CompensateSaga(saga)
        END TRY
    END WHILE

    saga.state = COMPLETED
    saga.completed_at = now()
    PersistSaga(saga)
    RETURN SUCCESS
END FUNCTION

FUNCTION ExecuteStep(saga, step):
    idempotency_key = GenerateIdempotencyKey(saga.saga_id, step.step_id)

    // Check idempotency
    cached = GetIdempotencyRecord(idempotency_key)
    IF cached AND cached.status == COMPLETED:
        RETURN cached.response
    END IF

    // Mark in-progress
    SaveIdempotencyRecord(idempotency_key, IN_PROGRESS)

    TRY:
        response = CallService(
            service = step.service,
            action = step.action,
            input = ResolveInput(step.input, saga.context),
            headers = {
                "Idempotency-Key": idempotency_key,
                "X-Saga-Id": saga.saga_id,
                "X-Correlation-Id": saga.correlation_id
            }
        )
        SaveIdempotencyRecord(idempotency_key, COMPLETED, response)
        RETURN response

    CATCH Exception AS e:
        SaveIdempotencyRecord(idempotency_key, FAILED, e)
        THROW e
    END TRY
END FUNCTION
```

### Saga Compensation Algorithm

```
FUNCTION CompensateSaga(saga):
    saga.state = COMPENSATING
    PersistSaga(saga)

    // Compensate in reverse order, skip failed step
    FOR i = saga.current_step - 1 DOWNTO 0:
        step = saga.steps[i]

        IF step.state != SUCCEEDED:
            step.state = SKIPPED
            CONTINUE
        END IF

        IF step.compensation IS NULL:
            step.state = SKIPPED
            CONTINUE
        END IF

        TRY:
            step.state = COMPENSATING
            PersistSaga(saga)

            ExecuteCompensation(saga, step)

            step.state = COMPENSATED
            PersistSaga(saga)

        CATCH Exception AS e:
            step.state = COMPENSATION_FAILED
            step.error = e.message
            PersistSaga(saga)
            // Log for manual intervention
            AlertCompensationFailure(saga, step, e)
            // Continue with other compensations
        END TRY
    END FOR

    IF AllCompensationsSucceeded(saga):
        saga.state = COMPENSATED
    ELSE:
        saga.state = FAILED
    END IF

    saga.completed_at = now()
    PersistSaga(saga)
    RETURN saga.state
END FUNCTION

FUNCTION ExecuteCompensation(saga, step):
    idempotency_key = GenerateIdempotencyKey(
        saga.saga_id, step.step_id, "compensate"
    )

    CallService(
        service = step.service,
        action = step.compensation,
        input = step.output,  // Use step output as compensation input
        headers = {
            "Idempotency-Key": idempotency_key,
            "X-Saga-Id": saga.saga_id
        }
    )
END FUNCTION
```

### TCC Coordinator Algorithm

```
FUNCTION RunTCC(tcc_transaction, reservations):
    tcc_transaction.state = TRYING
    PersistTCC(tcc_transaction)

    // Try Phase
    try_results = []
    FOR EACH reservation IN reservations:
        TRY:
            result = CallService(
                service = reservation.service,
                action = "try",
                input = reservation.request,
                timeout = tcc_transaction.try_deadline - now()
            )
            reservation.state = RESERVED
            reservation.try_result = result
            try_results.append(SUCCESS)
        CATCH Exception AS e:
            reservation.state = TRY_FAILED
            try_results.append(FAILURE)
        END TRY
        PersistTCC(tcc_transaction)
    END FOR

    // Decision
    IF all(try_results == SUCCESS):
        tcc_transaction.state = TRY_SUCCEEDED
        PersistTCC(tcc_transaction)
        RETURN ConfirmAll(tcc_transaction)
    ELSE:
        tcc_transaction.state = TRY_FAILED
        PersistTCC(tcc_transaction)
        RETURN CancelAll(tcc_transaction)
    END IF
END FUNCTION

FUNCTION ConfirmAll(tcc_transaction):
    tcc_transaction.state = CONFIRMING
    PersistTCC(tcc_transaction)

    FOR EACH reservation IN tcc_transaction.reservations:
        IF reservation.state == RESERVED:
            TRY:
                result = CallServiceWithRetry(
                    service = reservation.service,
                    action = "confirm",
                    input = {"reservation_id": reservation.reservation_id}
                )
                reservation.state = CONFIRMED
                reservation.confirm_result = result
            CATCH Exception AS e:
                // Confirm must eventually succeed (idempotent)
                // Schedule retry
                ScheduleRetry(tcc_transaction, reservation, "confirm")
            END TRY
            PersistTCC(tcc_transaction)
        END IF
    END FOR

    IF all(reservations.state == CONFIRMED):
        tcc_transaction.state = CONFIRMED
        tcc_transaction.confirmed_at = now()
        PersistTCC(tcc_transaction)
    END IF

    RETURN tcc_transaction.state
END FUNCTION

FUNCTION CancelAll(tcc_transaction):
    tcc_transaction.state = CANCELLING
    PersistTCC(tcc_transaction)

    FOR EACH reservation IN tcc_transaction.reservations:
        IF reservation.state == RESERVED:
            TRY:
                CallServiceWithRetry(
                    service = reservation.service,
                    action = "cancel",
                    input = {"reservation_id": reservation.reservation_id}
                )
                reservation.state = CANCELLED
            CATCH Exception AS e:
                // Cancel must eventually succeed (idempotent)
                ScheduleRetry(tcc_transaction, reservation, "cancel")
            END TRY
            PersistTCC(tcc_transaction)
        END IF
    END FOR

    IF all(reservations.state IN [CANCELLED, TRY_FAILED]):
        tcc_transaction.state = CANCELLED
        tcc_transaction.cancelled_at = now()
        PersistTCC(tcc_transaction)
    END IF

    RETURN tcc_transaction.state
END FUNCTION
```

### Idempotent Consumer Algorithm

```
FUNCTION ProcessIdempotently(idempotency_key, operation):
    // Step 1: Check cache
    cached = GetFromCache(idempotency_key)
    IF cached:
        RETURN cached.response
    END IF

    // Step 2: Check persistent store (with lock)
    record = GetIdempotencyRecord(idempotency_key, FOR_UPDATE)

    IF record IS NULL:
        // First time processing
        record = CreateIdempotencyRecord(
            key = idempotency_key,
            status = IN_PROGRESS,
            request_hash = Hash(operation.request)
        )

    ELSE IF record.status == IN_PROGRESS:
        // Another request in flight - wait and retry
        Wait(100ms)
        RETURN ProcessIdempotently(idempotency_key, operation)

    ELSE IF record.status == COMPLETED:
        // Validate request matches
        IF record.request_hash != Hash(operation.request):
            THROW IdempotencyKeyCollision
        END IF
        SetCache(idempotency_key, record.response)
        RETURN record.response

    ELSE IF record.status == FAILED:
        // Previous attempt failed, retry
        record.status = IN_PROGRESS
        UpdateIdempotencyRecord(record)
    END IF

    // Step 3: Execute operation
    TRY:
        response = ExecuteOperation(operation)
        record.status = COMPLETED
        record.response = response
        UpdateIdempotencyRecord(record)
        SetCache(idempotency_key, response)
        RETURN response

    CATCH Exception AS e:
        record.status = FAILED
        record.error = e.message
        UpdateIdempotencyRecord(record)
        THROW e
    END TRY
END FUNCTION
```

---

## State Machines

### 2PC Transaction State Machine

```
┌────────────────────────────────────────────────────────────────────┐
│ 2PC STATE TRANSITIONS                                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    [START]                                                          │
│       │                                                             │
│       ▼                                                             │
│   ┌────────┐  prepare()   ┌───────────┐                            │
│   │STARTED │─────────────►│ PREPARING │                            │
│   └────────┘              └─────┬─────┘                            │
│       │                         │                                   │
│       │                    ┌────┴────┐                              │
│       │ abort()            │         │                              │
│       │           all voted│         │any voted                    │
│       │           COMMIT   │         │ABORT                        │
│       │                    ▼         ▼                              │
│       │              ┌─────────┐  ┌─────────┐                      │
│       │              │PREPARED │  │ABORTING │◄────┐                │
│       │              └────┬────┘  └────┬────┘     │                │
│       │                   │            │          │                │
│       │         commit()  │            │          │                │
│       │                   ▼            │          │                │
│       │           ┌───────────┐        │          │                │
│       └──────────►│COMMITTING │        │          │                │
│                   └─────┬─────┘        │          │                │
│                         │              │          │ timeout        │
│            all acked    │   all acked  │          │                │
│                         ▼              ▼          │                │
│                   ┌───────────┐  ┌─────────┐     │                │
│                   │ COMMITTED │  │ ABORTED │─────┘                │
│                   └───────────┘  └─────────┘                       │
│                         │              │                            │
│                         └──────┬───────┘                           │
│                                ▼                                    │
│                             [END]                                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Saga State Machine

```
┌────────────────────────────────────────────────────────────────────┐
│ SAGA STATE TRANSITIONS                                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    [START]                                                          │
│       │                                                             │
│       ▼                                                             │
│   ┌─────────┐    start()   ┌─────────┐                             │
│   │ CREATED │─────────────►│ RUNNING │◄─────────────┐              │
│   └─────────┘              └────┬────┘              │              │
│                                 │                    │              │
│                     ┌───────────┼───────────┐       │ next step    │
│                     │           │           │       │              │
│              step   │   step    │   step    │       │              │
│              success│   success │   failed  │       │              │
│                     │           │           │       │              │
│                     ▼           │           ▼       │              │
│               ┌─────────┐      │     ┌─────────────┐│              │
│               │ RUNNING │──────┘     │COMPENSATING ││              │
│               │(step n) │            └──────┬──────┘│              │
│               └────┬────┘                   │       │              │
│                    │                        │       │              │
│         all steps  │            ┌───────────┴───────┘              │
│         done       │            │                                   │
│                    ▼            │  comp success                    │
│              ┌───────────┐      ▼                                   │
│              │ COMPLETED │ ┌─────────────┐                         │
│              └───────────┘ │COMPENSATING │                         │
│                    │       │ (step n-1)  │                         │
│                    │       └──────┬──────┘                         │
│                    │              │                                 │
│                    │   ┌──────────┼──────────┐                     │
│                    │   │          │          │                     │
│                    │   │ all      │  comp    │                     │
│                    │   │ comped   │  failed  │                     │
│                    │   │          │          │                     │
│                    │   ▼          │          ▼                     │
│                    │ ┌────────────┤   ┌────────────┐               │
│                    │ │COMPENSATED │   │  FAILED    │               │
│                    │ └────────────┘   │(needs attn)│               │
│                    │       │          └────────────┘               │
│                    │       │                │                       │
│                    └───────┴────────────────┘                      │
│                                 │                                   │
│                                 ▼                                   │
│                              [END]                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Component | Implementation Choice | Rationale |
|-----------|----------------------|-----------|
| **Transaction Log** | PostgreSQL with WAL | Durability, ACID |
| **Saga State** | PostgreSQL + Redis cache | Consistency + performance |
| **Idempotency Store** | Redis with persistence | Fast lookups, TTL support |
| **Message Queue** | Topic-based with partitioning | Ordering by saga ID |
| **Outbox** | DB table + CDC | Atomic event publishing |
| **State Machine** | Explicit transitions | Debuggability, recovery |
