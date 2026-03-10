# Low-Level Design — Change Data Capture (CDC) System

## Data Model

### Change Event Envelope

Every change captured by the CDC system is wrapped in a standardized envelope that carries both the data and metadata needed for downstream processing:

```
┌─────────────────────────────────────────────────────────────────┐
│ Change Event Envelope                                           │
├──────────────────┬──────────────────────────────────────────────┤
│ schema           │ Schema ID + version (reference to registry)  │
│ payload          │ The actual change data (see below)           │
│   ├─ before      │ Row state before the change (NULL for INSERTs)│
│   ├─ after       │ Row state after the change (NULL for DELETEs)│
│   ├─ source      │ Source metadata block                        │
│   │   ├─ connector│ Connector name (e.g., "pg-orders")         │
│   │   ├─ db       │ Database name                              │
│   │   ├─ schema   │ Schema/namespace                           │
│   │   ├─ table    │ Table name                                 │
│   │   ├─ lsn      │ Log Sequence Number                        │
│   │   ├─ txId     │ Transaction ID                             │
│   │   ├─ ts_ms    │ Source database commit timestamp (ms)       │
│   │   └─ snapshot │ "true" if from snapshot, "false" if streaming│
│   ├─ op          │ Operation: "c" (create), "u" (update),      │
│   │              │ "d" (delete), "r" (read/snapshot)            │
│   ├─ ts_ms       │ CDC processing timestamp (ms)               │
│   └─ transaction │ Transaction metadata (optional)              │
│       ├─ id       │ Transaction ID string                      │
│       ├─ total    │ Total events in this transaction            │
│       └─ seq      │ Sequence number within transaction          │
└──────────────────┴──────────────────────────────────────────────┘
```

### Offset Storage Model

Offsets track the CDC connector's position in the source database's transaction log:

```
┌─────────────────────────────────────────────────────────────────┐
│ Connector Offset Record                                         │
├──────────────────┬──────────────────────────────────────────────┤
│ connector_name   │ String — unique identifier for this connector│
│ source_partition │ Map — identifies the specific source         │
│   ├─ server      │ Logical server name                         │
│   └─ database    │ Database name                               │
│ source_offset    │ Map — position in the transaction log        │
│   ├─ lsn         │ PostgreSQL: Log Sequence Number (int64)     │
│   ├─ file        │ MySQL: binlog file name                     │
│   ├─ pos         │ MySQL: binlog position (int64)              │
│   ├─ gtid        │ MySQL: Global Transaction ID set            │
│   ├─ txId        │ Current transaction ID                      │
│   ├─ ts_sec      │ Source timestamp (epoch seconds)            │
│   └─ snapshot    │ Boolean: currently in snapshot phase?        │
│ updated_at       │ Timestamp of last offset update             │
└──────────────────┴──────────────────────────────────────────────┘
```

### Schema History Store

Tracks DDL changes over time to correctly decode events from any point in the log:

```
┌─────────────────────────────────────────────────────────────────┐
│ Schema History Entry                                            │
├──────────────────┬──────────────────────────────────────────────┤
│ source           │ Map — connector + database + table           │
│ position         │ Map — log position where DDL was captured    │
│ database_name    │ String — database where DDL occurred         │
│ ddl              │ String — the DDL statement                   │
│ table_changes    │ List — structural changes to each table      │
│   ├─ type        │ "CREATE", "ALTER", "DROP"                   │
│   ├─ table       │ Fully-qualified table name                  │
│   └─ columns     │ List of column definitions (name, type, pk) │
│ ts_ms            │ Timestamp when DDL was captured              │
└──────────────────┴──────────────────────────────────────────────┘
```

### Event Key Structure

Each event has a key derived from the table's primary key, ensuring events for the same row land in the same partition for ordering:

```
Key = { "schema": <key_schema_id>, "payload": { <primary_key_columns> } }

Example (orders table with composite PK):
Key = { "payload": { "order_id": 42 } }
Value = { <full change event envelope> }
```

### Partitioning Strategy

| Strategy | How It Works | When Used |
|----------|-------------|-----------|
| **Primary key hash** | Hash the event key (PK) to determine partition | Default: per-row ordering guarantee |
| **Transaction ID** | Route all events in a transaction to one partition | When transaction atomicity at consumer is required |
| **Table-based** | One partition per table (for small deployments) | Simple setups with few tables |
| **Custom router** | Application-defined routing logic | Multi-tenant routing by tenant_id |

---

## API Design

### Connector Management API

```
POST /connectors
Content-Type: application/json
Authorization: Bearer {token}

Request:
{
  "name": "pg-orders-connector",
  "config": {
    "connector.class": "io.cdc.connector.postgresql.PostgresConnector",
    "database.hostname": "orders-db.internal",
    "database.port": 5432,
    "database.user": "cdc_replication_user",
    "database.dbname": "orders",
    "table.include.list": "public.orders,public.order_items",
    "slot.name": "cdc_orders_slot",
    "publication.name": "cdc_orders_pub",
    "snapshot.mode": "initial",
    "topic.prefix": "prod.orders",
    "schema.history.internal.topic": "schema-history.orders",
    "transforms": "filter",
    "transforms.filter.type": "io.cdc.transforms.Filter",
    "transforms.filter.condition": "op != 'r' OR table == 'orders'"
  }
}

Response:
{
  "name": "pg-orders-connector",
  "type": "source",
  "state": "RUNNING",
  "worker_id": "worker-03:8083",
  "tasks": [
    { "id": 0, "state": "RUNNING", "worker_id": "worker-03:8083" }
  ]
}
```

### Connector Lifecycle

```
GET    /connectors                        → List all connectors
GET    /connectors/{name}                 → Get connector status and config
POST   /connectors                        → Create a new connector
PUT    /connectors/{name}/config          → Update connector configuration
PUT    /connectors/{name}/pause           → Pause capture (retains offset)
PUT    /connectors/{name}/resume          → Resume from last offset
PUT    /connectors/{name}/restart         → Restart connector tasks
DELETE /connectors/{name}                 → Remove connector (offsets retained)
```

### Offset Management API

```
GET /connectors/{name}/offsets
Response:
{
  "offsets": [
    {
      "partition": { "server": "prod.orders" },
      "offset": {
        "lsn": 2847592016,
        "txId": 98234,
        "ts_sec": 1710072301,
        "snapshot": false
      }
    }
  ]
}

PUT /connectors/{name}/offsets
Request:
{
  "offsets": [
    {
      "partition": { "server": "prod.orders" },
      "offset": { "lsn": 2847590000 }
    }
  ]
}
// Rewind connector to a specific log position (requires connector to be stopped)
```

### Monitoring API

```
GET /connectors/{name}/status
Response:
{
  "name": "pg-orders-connector",
  "connector": { "state": "RUNNING", "worker_id": "worker-03:8083" },
  "tasks": [
    {
      "id": 0,
      "state": "RUNNING",
      "worker_id": "worker-03:8083"
    }
  ],
  "metrics": {
    "total_events_captured": 12847293,
    "events_per_second": 3421,
    "lag_ms": 234,
    "snapshot_completed": true,
    "last_event_ts": "2026-03-10T14:32:01.234Z"
  }
}
```

### Idempotency & Rate Limiting

**Idempotency:**
- Connector creation is idempotent by connector name (same name → same connector)
- Offset writes use conditional updates (compare-and-swap on version)
- Event production uses idempotent producer (sequence number deduplication)

**Rate Limiting:**

| Endpoint | Limit | Window |
|----------|-------|--------|
| Connector CRUD | 100/min per client | Sliding window |
| Offset management | 50/min per client | Sliding window |
| Monitoring reads | 1,000/min per client | Sliding window |
| Signal table writes | 10/min per connector | Fixed window |

---

## Core Algorithms

### 1. WAL / Binlog Parsing and Event Extraction

```
FUNCTION capture_changes(source_config, start_offset):
    connection = open_replication_connection(source_config)
    slot = ensure_replication_slot(connection, source_config.slot_name)
    schema_cache = load_schema_history(source_config)

    // Position to the last committed offset
    current_lsn = start_offset.lsn OR slot.confirmed_flush_lsn

    WHILE connector.is_running:
        // Read batch of WAL entries from logical decoding
        wal_entries = connection.read_logical_changes(
            slot_name = source_config.slot_name,
            start_lsn = current_lsn,
            max_batch_size = 1024,
            timeout_ms = 100
        )

        IF wal_entries is empty:
            // No new changes; emit heartbeat if configured
            IF heartbeat_interval_elapsed():
                emit_heartbeat_event(current_lsn)
            CONTINUE

        FOR EACH entry IN wal_entries:
            IF entry.type == DDL_CHANGE:
                // Schema change detected
                new_schema = parse_ddl(entry.ddl_statement)
                schema_cache.update(entry.table, new_schema, entry.lsn)
                persist_schema_history(entry)
                emit_schema_change_event(entry)

            ELSE IF entry.type == ROW_CHANGE:
                schema = schema_cache.get(entry.table, entry.lsn)
                event = build_change_event(entry, schema)
                emit_to_streaming_platform(event)

            current_lsn = entry.lsn

        // Periodically commit offset
        IF offset_commit_interval_elapsed():
            persist_offset(current_lsn)
            connection.confirm_flush(current_lsn)  // Allow WAL cleanup

// Time:  O(N) per batch where N = number of WAL entries
// Space: O(S) for schema cache where S = number of monitored tables
```

### 2. Consistent Initial Snapshot with Streaming Cutover

```
FUNCTION perform_snapshot(source_config, tables):
    connection = open_snapshot_connection(source_config)

    // Step 1: Acquire a consistent snapshot point
    connection.begin_transaction(isolation = REPEATABLE_READ)
    snapshot_lsn = connection.get_current_lsn()
    LOG("Snapshot started at LSN: {snapshot_lsn}")

    // Step 2: Read and emit each table in chunks
    FOR EACH table IN tables:
        schema = connection.get_table_schema(table)
        register_schema(table, schema)

        total_rows = connection.estimate_row_count(table)
        pk_columns = connection.get_primary_key_columns(table)

        // Chunked reading to avoid memory pressure
        last_pk = NULL
        WHILE true:
            rows = connection.execute_query(
                "SELECT * FROM {table} WHERE {pk_columns} > {last_pk}
                 ORDER BY {pk_columns} LIMIT {chunk_size}"
            )

            IF rows is empty:
                BREAK

            FOR EACH row IN rows:
                event = build_snapshot_event(table, row, snapshot_lsn, schema)
                emit_to_streaming_platform(event)

            last_pk = rows.last().pk_value
            persist_snapshot_progress(table, last_pk)
            LOG("Snapshot progress: {table} - {rows_emitted}/{total_rows}")

    // Step 3: Complete snapshot and transition to streaming
    connection.commit_transaction()
    persist_offset(snapshot_lsn, snapshot_complete = true)
    LOG("Snapshot complete. Transitioning to streaming from LSN: {snapshot_lsn}")

    // Step 4: Start streaming from snapshot position
    start_streaming(source_config, start_offset = snapshot_lsn)

// Time:  O(R) where R = total rows across all tables
// Space: O(chunk_size) for buffered rows
```

### 3. Incremental Snapshot via Watermark (DBLog Approach)

```
FUNCTION incremental_snapshot(table, source_config):
    // Non-blocking snapshot that interleaves with streaming
    // Uses watermark tokens written to a signal table

    pk_columns = get_primary_key_columns(table)
    chunk_boundaries = compute_chunk_boundaries(table, pk_columns, chunk_size)

    FOR EACH chunk IN chunk_boundaries:
        // Step 1: Write LOW watermark to signal table
        low_watermark_id = generate_uuid()
        write_to_signal_table(low_watermark_id, "LOW", chunk.start, chunk.end)
        // The CDC log reader will see this watermark in the WAL

        // Step 2: Execute SELECT for this chunk
        rows = execute_query(
            "SELECT * FROM {table}
             WHERE {pk_columns} >= {chunk.start}
               AND {pk_columns} < {chunk.end}"
        )

        // Step 3: Write HIGH watermark to signal table
        high_watermark_id = generate_uuid()
        write_to_signal_table(high_watermark_id, "HIGH", chunk.start, chunk.end)

        // Step 4: The log reader processes events in order:
        //   a) Log events before LOW watermark → emit normally
        //   b) Log events between LOW and HIGH → buffer
        //   c) Snapshot rows → emit, but deduplicate against buffered log events
        //   d) Buffered log events → emit (they are more recent than snapshot)
        //   e) Log events after HIGH watermark → emit normally

        process_watermark_window(low_watermark_id, high_watermark_id, rows)

        persist_incremental_snapshot_progress(table, chunk.end)

// Time:  O(R) where R = total rows in table
// Space: O(chunk_size + B) where B = buffered log events between watermarks
```

### 4. Offset Tracking and Exactly-Once Commit

```
FUNCTION commit_offset_exactly_once(connector_id, events_batch, new_offset):
    // Use transactional producer to atomically write events and offset

    producer.begin_transaction()

    TRY:
        // Step 1: Publish all events in the batch
        FOR EACH event IN events_batch:
            topic = compute_topic(event.source.table)
            key = extract_key(event)
            producer.send(topic, key, serialize(event))

        // Step 2: Write offset as part of the same transaction
        offset_record = build_offset_record(connector_id, new_offset)
        producer.send("__cdc_offsets", connector_id, serialize(offset_record))

        // Step 3: Commit transaction atomically
        producer.commit_transaction()

        LOG("Offset committed: connector={connector_id}, lsn={new_offset.lsn}")

    CATCH TransactionAbortException:
        producer.abort_transaction()
        LOG_WARN("Transaction aborted; will retry batch from previous offset")
        // Events will be re-read from the WAL and re-published
        // Idempotent producer ensures no duplicates

FUNCTION recover_offset(connector_id):
    // On restart, read the last committed offset
    offset_record = read_latest("__cdc_offsets", key = connector_id)

    IF offset_record is NULL:
        // No offset found; need full snapshot
        RETURN { snapshot_required: true }

    IF offset_record.snapshot_complete == false:
        // Snapshot was interrupted; resume from last progress
        RETURN {
            snapshot_required: true,
            resume_table: offset_record.snapshot_table,
            resume_pk: offset_record.snapshot_last_pk
        }

    RETURN { start_lsn: offset_record.lsn, snapshot_required: false }

// Time:  O(B) per commit where B = batch size
// Space: O(1) for offset storage per connector
```

### 5. Schema Change Detection and Propagation

```
FUNCTION handle_schema_change(ddl_entry, schema_cache, registry_client):
    table = extract_table_name(ddl_entry.statement)
    change_type = classify_ddl(ddl_entry.statement)
    // Types: ADD_COLUMN, DROP_COLUMN, RENAME_COLUMN, ALTER_TYPE, CREATE_TABLE, DROP_TABLE

    old_schema = schema_cache.get(table)
    new_schema = parse_new_schema(ddl_entry)

    // Check compatibility with schema registry
    compatibility = registry_client.check_compatibility(
        subject = compute_subject_name(table),
        schema = new_schema
    )

    IF NOT compatibility.is_compatible:
        // Breaking change detected
        LOG_ERROR("Incompatible schema change for {table}: {compatibility.errors}")
        emit_alert("SCHEMA_INCOMPATIBLE", table, ddl_entry)

        IF config.schema_change_policy == "FAIL":
            HALT connector with error
        ELSE IF config.schema_change_policy == "SKIP":
            LOG_WARN("Skipping incompatible events until schema is resolved")
            schema_cache.mark_incompatible(table)
            RETURN
        ELSE IF config.schema_change_policy == "LOG_AND_CONTINUE":
            // Log raw event to dead-letter topic
            emit_to_dead_letter(ddl_entry)

    // Register new schema version
    schema_id = registry_client.register(
        subject = compute_subject_name(table),
        schema = new_schema
    )

    // Update local cache
    schema_cache.put(table, new_schema, schema_id, ddl_entry.lsn)

    // Persist to schema history
    persist_schema_history_entry(ddl_entry, old_schema, new_schema)

    LOG("Schema updated: {table} v{schema_id} ({change_type})")

// Time:  O(1) per DDL event (registry call is network-bounded)
// Space: O(T) for schema cache where T = number of tables
```

### Data Flow Visualization

```mermaid
---
config:
  theme: base
  look: neo
---
flowchart LR
    subgraph Source["Source DB"]
        WAL["WAL / Binlog"]
    end

    subgraph CDC["CDC Engine"]
        LP[Log Parser]
        SN[Snapshot Engine]
        OT[Offset Tracker]
    end

    subgraph Processing["Event Pipeline"]
        EB[Envelope Builder]
        FT[Filter/Transform]
        SR[(Schema Registry)]
    end

    subgraph Delivery["Streaming Platform"]
        P1[Partition 0]
        P2[Partition 1]
        P3[Partition 2]
    end

    WAL -->|"continuous stream"| LP
    LP --> EB
    SN -->|"initial load"| EB
    OT <-.->|"checkpoint"| LP
    EB --> FT
    FT <-.->|"schema lookup"| SR
    FT -->|"key-based routing"| P1 & P2 & P3

    classDef source fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef engine fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef proc fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef stream fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class WAL source
    class LP,SN,OT engine
    class EB,FT,SR proc
    class P1,P2,P3 stream
```
