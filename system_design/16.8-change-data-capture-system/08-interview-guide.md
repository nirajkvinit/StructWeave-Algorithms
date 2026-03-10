# Interview Guide — Change Data Capture (CDC) System

## Interview Pacing (45-min Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Clarify** | Scope the problem | What databases? (PostgreSQL, MySQL, both?) What downstream consumers? (search, cache, warehouse?) Scale? (events/sec, number of sources) Latency requirements? |
| 5-15 min | **High-Level** | Core architecture | Log-based capture from WAL/binlog, event envelope format, streaming platform as durable buffer, schema registry for evolution |
| 15-30 min | **Deep Dive** | 1-2 critical components | Pick: snapshot-to-streaming handoff, exactly-once semantics, or schema evolution handling. Go deep on internals. |
| 30-40 min | **Scale & Trade-offs** | Production challenges | WAL retention pressure, connector failover, large transaction handling, multi-source coordination |
| 40-45 min | **Wrap Up** | Summary + operational concerns | Monitoring (lag metrics), security (WAL access = full data access), compliance (GDPR propagation via CDC) |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **The dual-write problem is the genesis:** CDC exists because writing to a database AND publishing an event is fundamentally unsafe without distributed transactions. CDC eliminates the dual-write by making the database's own transaction log the single source of truth for both the mutation and the event.

2. **The snapshot-to-streaming handoff is the hardest problem:** Getting the initial full-table snapshot to seamlessly merge with the live streaming pipeline — without duplicates, gaps, or inconsistency — is the defining engineering challenge. Most CDC failures in production occur at this boundary.

3. **You are building a replication protocol:** CDC is conceptually identical to database replication. The connector is a replica that consumes the WAL and applies changes to a different target (a streaming platform instead of another database instance). Understanding database replication internals gives you the vocabulary for this design.

4. **WAL access is god-mode:** The transaction log contains every mutation to every table in the database. The security implications are profound — a compromised CDC connector has read access to the entire database's change history.

### Where to Spend Most Time

- **Log-based capture mechanics:** Explain WAL/binlog tailing vs. polling vs. triggers. This is the foundational design decision.
- **Snapshot-to-streaming handoff:** This is where most candidates fail. Show the consistent snapshot approach with LSN recording and deduplication at the boundary.
- **Exactly-once semantics:** Explain the combination of idempotent producers, transactional offset commits, and idempotent consumers. Do NOT claim that the streaming platform alone gives you exactly-once.

### How to Approach This Problem

1. Start with WHY CDC exists — the dual-write problem in distributed systems
2. Explain the log-based approach (WAL/binlog tailing) and why it is superior to polling/triggers
3. Design the event envelope (before/after images, source metadata, operation type)
4. Design the snapshot mechanism for initial load with consistent handoff to streaming
5. Address offset management and exactly-once delivery
6. Discuss schema evolution and the role of the schema registry
7. Cover operational concerns: WAL retention, connector failover, monitoring

---

## Trade-offs Discussion

### Decision 1: Log-Based CDC vs. Query-Based CDC

| Aspect | Log-Based CDC | Query-Based CDC (Polling) |
|--------|--------------|--------------------------|
| Pros | Zero source impact; captures all changes including deletes; sub-second latency; preserves transaction order | Simpler setup; no replication configuration; works with any database |
| Cons | Requires database replication configuration; engine-specific log parsers; WAL retention management | Source query load; misses changes between polls; cannot capture deletes; higher latency |
| **Recommendation** | **Choose log-based** for any production system where completeness, latency, and source impact matter |

### Decision 2: Embedded CDC vs. Standalone CDC Platform

| Aspect | Embedded (in-process) | Standalone (distributed workers) |
|--------|----------------------|--------------------------------|
| Pros | No external infrastructure; lower operational overhead; simpler for single-service use | Fault isolation; independent scaling; centralized management; multi-source support |
| Cons | Tied to application lifecycle; single-threaded; limited monitoring | Additional infrastructure to manage; operational complexity |
| **Recommendation** | **Standalone** for production multi-service architectures. Embedded for prototypes or single-service use cases. |

### Decision 3: Per-Table Topics vs. Single-Database Topic

| Aspect | Per-Table Topics | Single-Database Topic |
|--------|-----------------|---------------------|
| Pros | Independent scaling; selective consumption; per-table retention; clear ownership | Preserves cross-table transaction order; simpler topic management |
| Cons | Many topics to manage; cross-table transactions split across topics | All consumers receive all tables' events; single partition ordering limit |
| **Recommendation** | **Per-table topics** with transaction metadata headers for consumers that need cross-table atomicity. This is the industry standard approach. |

### Decision 4: Full Snapshot vs. Incremental Snapshot (Watermark)

| Aspect | Full Snapshot (Lock-Based) | Incremental Snapshot (Watermark) |
|--------|--------------------------|--------------------------------|
| Pros | Simple consistency model; proven approach; snapshot transaction guarantees | No global lock; non-blocking; can snapshot individual tables on demand; interleaves with streaming |
| Cons | Requires long-running transaction; prevents vacuum; brief lock for LSN capture | More complex implementation; watermark coordination; chunk-boundary edge cases |
| **Recommendation** | **Full snapshot** for initial setup (simplicity). **Incremental watermark** for on-demand re-snapshots of individual tables in production without disrupting streaming. |

### Decision 5: Avro vs. Protobuf vs. JSON for Event Serialization

| Aspect | Avro | Protobuf | JSON |
|--------|------|----------|------|
| Pros | Compact binary; excellent schema evolution; native Kafka integration; dynamic schema | Very compact; strong typing; code generation; fast serialization | Human-readable; universal support; no compilation step |
| Cons | Requires schema registry; learning curve; dynamic typing can be loose | Requires .proto compilation; less dynamic schema support | Verbose; no built-in evolution rules; larger payload |
| **Recommendation** | **Avro as default** for CDC workloads. Schema registry integration, dynamic schema evolution (adding columns without recompiling consumers), and compact binary format make it the strongest fit. JSON for debugging environments. |

---

## Trap Questions & How to Handle

### Trap 1: "Why not just use database triggers for CDC?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Test understanding of trigger overhead and limitations | Triggers execute synchronously within the transaction, adding latency to every write. A trigger-based CDC on a table with 10K writes/sec means 10K trigger executions per second, each potentially inserting into a separate events table within the same transaction. This doubles the write load and transaction size. Additionally, triggers must be maintained for every table (schema changes require trigger updates), they don't capture schema changes themselves, and they create tight coupling between the data model and the event model. Log-based CDC adds zero overhead to the source because it reads the log that the database already writes for its own durability. |

### Trap 2: "How do you guarantee exactly-once delivery?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Test depth beyond "Kafka gives us exactly-once" | True end-to-end exactly-once requires three coordinated guarantees: (1) idempotent producer — the streaming platform deduplicates messages using producer ID + sequence number, (2) transactional offset commits — the connector's offset update and the event publish happen in a single atomic transaction within the streaming platform, and (3) idempotent consumer — the sink writes are idempotent using the event's primary key and offset as a deduplication key. No single component provides exactly-once alone — it is an end-to-end property of the pipeline. |

### Trap 3: "What happens when the connector falls behind the WAL?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Test operational awareness of WAL retention | This is the most dangerous operational scenario in CDC. On PostgreSQL, a stalled replication slot prevents WAL recycling, and the WAL files accumulate indefinitely until the disk is full — at which point the database stops accepting ALL writes (total outage). Mitigations: (1) set `max_slot_wal_keep_size` to cap retention, (2) monitor replication slot lag with alerts at 1 GB and 10 GB thresholds, (3) implement automatic slot drop after a configurable retention limit (accepting that dropped events will require a re-snapshot), (4) use heartbeat events to advance the slot even when tables have no writes. On MySQL, the binlog simply expires after the configured retention period — if the connector is behind, events are permanently lost and a re-snapshot is needed. |

### Trap 4: "How do you handle the initial snapshot for a billion-row table?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Test snapshot-to-streaming handoff understanding | The challenge is not just reading a billion rows — it is doing so while the source continues accepting writes and ensuring zero gaps or duplicates at the transition to streaming. Approach: (1) Open a REPEATABLE READ transaction and record the current LSN — this gives us a consistent point-in-time view. (2) Read the table in chunks (ordered by primary key, 10K rows per chunk) to avoid holding a massive result set in memory. (3) Persist chunk progress so we can resume if the snapshot is interrupted. (4) After all chunks are read, commit the transaction and start streaming from the recorded LSN. (5) At the handoff, deduplicate: events from the WAL between the snapshot LSN and the streaming start are compared against the snapshot — if the snapshot already captured the newer state, the WAL event is skipped. For tables so large that a single transaction is impractical, use the watermark-based incremental snapshot approach (Netflix DBLog pattern). |

### Trap 5: "How do you handle schema changes in the middle of streaming?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Test schema evolution understanding | DDL changes (ALTER TABLE) appear in the transaction log interleaved with data changes. The connector must: (1) detect the DDL from the log, (2) parse the new schema, (3) check compatibility with the schema registry (backward/forward/full), (4) register the new schema version, (5) use the correct schema version for each event based on the event's LSN position (events before the DDL use the old schema, events after use the new schema). The schema history store, keyed by LSN, ensures this mapping is correct. If the schema change is incompatible (e.g., dropping a required column), the connector should halt or route events to a dead-letter topic rather than silently corrupting the data stream. |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Proposing polling-based CDC | Misses deletes, adds source load, higher latency | Start with log-based CDC; explain WAL/binlog tailing |
| Ignoring the snapshot-to-streaming handoff | This is the hardest part; skipping it suggests lack of production experience | Design the snapshot mechanism with LSN recording and deduplication |
| Saying "Kafka gives us exactly-once" | Exactly-once is an end-to-end property, not a transport property | Explain idempotent producer + transactional offsets + idempotent consumer |
| Not discussing WAL retention | The #1 operational risk in production CDC | Address disk pressure, slot monitoring, heartbeat events early |
| Ignoring schema evolution | Schema changes are inevitable and can break the pipeline | Design schema registry integration with compatibility rules |
| Treating CDC as a simple connector | CDC has deep database internals (WAL format, logical decoding) | Show understanding of database replication mechanics |
| No before-image discussion | Before-images are essential for updates and deletes | Include before/after images in the event envelope design |

---

## Questions to Ask Interviewer

| Question | Why It Matters |
|----------|---------------|
| What source databases? (PostgreSQL, MySQL, MongoDB?) | Determines log format (WAL, binlog, oplog) and connector architecture |
| What downstream consumers? | Determines delivery guarantees and topic design |
| What latency requirements? | Sub-second requires log-based CDC; minutes allows polling |
| What is the write throughput? | Determines connector sizing and streaming platform capacity |
| Are there very large tables that need initial snapshot? | Determines snapshot strategy (full vs. incremental) |
| How often do schema changes happen? | Determines schema evolution strategy priority |
| Any compliance requirements? (GDPR, HIPAA) | Determines PII masking and audit requirements |
| Is this single-tenant or multi-tenant? | Determines topic namespace and isolation strategy |

---

## Quick Reference Card

```
CDC SYSTEM DESIGN CHEATSHEET
──────────────────────────────
Capture: Log-based (WAL/binlog tailing) — zero source impact
Envelope: op (c/u/d/r) + before + after + source metadata + schema
Snapshot: REPEATABLE READ txn + record LSN + chunked SELECT + handoff dedup
Offsets: Transactional commit (events + offset in single atomic write)
Exactly-Once: Idempotent producer + transactional offsets + idempotent consumer
Schemas: Registry with Avro + backward compatibility + LSN-keyed history
Topics: Per-table ({server}.{db}.{table}) with PK-based partitioning
Streaming: Durable partitioned log with configurable retention
WAL Risk: Stalled slot → disk full → database outage
Key Metric: Replication lag (ms and bytes)
Key Trade-off: Snapshot consistency vs. source impact (locks vs. watermarks)
Heartbeat: Periodic writes to advance slot when tables are idle
```
