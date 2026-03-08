# Key Insights: Event Sourcing System

[← Back to Index](./00-index.md)

---

## Insight 1: The Global Position Sequencer Is the Hidden Throughput Ceiling
**Category:** Contention
**One-liner:** Every event must be assigned a monotonically increasing global position, creating a single serialization point that limits the entire system to ~50K events/sec with replicated persistence.
**Why it matters:** Event sourcing's append-only model appears infinitely scalable at first glance -- appends are cheap. But the requirement for a total ordering across all streams introduces a global sequencer that every write must coordinate through. An in-memory atomic counter handles ~1M increments/sec, but persisting and replicating that counter drops throughput to ~50K/sec. The mitigation options reveal a fundamental design choice: batch position assignment (fast but creates gaps), hierarchical ordering with `{epoch}.{partition}.{local_sequence}` (partitions the bottleneck but loses strict global order), or accepting partial ordering (only guarantee order within a stream, use timestamps across streams). The choice between these options defines whether projections can make cross-stream causal guarantees.

---

## Insight 2: Out-of-Order Commits Are Invisible to the Writer but Catastrophic for Subscribers
**Category:** Consistency
**One-liner:** Two transactions that receive consecutive global positions (100, 101) may commit in reverse order if one has slower disk I/O, causing subscribers to see position 101 before 100.
**Why it matters:** This pitfall is subtle because the write path works correctly -- both events are durably stored with correct positions. The problem only manifests on the read path: a subscriber processing the global stream sees position 101 arrive before 100, violating causal ordering. If position 100 contains "OrderCreated" and 101 contains "ItemAdded" for the same order, the projection tries to add an item to a non-existent order. Solutions include serializing all writes through a single writer thread (simple but limits throughput), implementing gap detection in subscribers (complex but preserves write parallelism), or assigning positions at commit time rather than pre-assignment (positions unknown until commit, complicating the write protocol). The single-writer approach is surprisingly common in production event stores because the simplicity outweighs the throughput limitation for most workloads.

---

## Insight 3: Snapshot Schema Evolution Is the Sleeper Complexity That Breaks Production Deploys
**Category:** Consistency
**One-liner:** When an aggregate's state schema changes, all existing snapshots become incompatible, forcing a choice between lazy migration (version each snapshot), mass invalidation (performance cliff), or background re-snapshotting (resource intensive).
**Why it matters:** Event schema evolution through upcasting is well-documented, but snapshot schema evolution is often overlooked until it causes an incident. Snapshots store serialized aggregate state, and when that state's structure changes (new field, renamed property, restructured object), old snapshots cannot be deserialized into the new schema. Lazy migration -- storing a schema version with each snapshot and converting on load -- is the most practical approach but accumulates technical debt as version chains grow. Mass invalidation is clean but causes a thundering herd of full replays when many aggregates are loaded simultaneously. The non-obvious best practice is to combine lazy migration for normal operations with background re-snapshotting during off-peak hours, preventing version chain accumulation.

---

## Insight 4: Hot Aggregates Require Sharding the Aggregate Itself, Not Just the Event Store
**Category:** Scaling
**One-liner:** A popular product with 10,000 inventory updates per second generates 864M events per day in a single stream, causing constant version conflicts and unbounded replay times that no amount of snapshotting can fix.
**Why it matters:** Event sourcing assigns one stream per aggregate instance, so a hot aggregate like a global inventory counter becomes a single-stream bottleneck. Optimistic concurrency means every concurrent write to the same stream version conflicts and retries, creating retry storms. The stream length grows without bound, and even with aggressive snapshots, the backlog between snapshots accumulates. The architectural response is to shard the aggregate itself (e.g., `inventory-product-popular-shard-1` through `shard-N`), distributing writes across independent streams and aggregating reads. Alternatively, for pure counter workloads, the counter should not be event-sourced at all -- use an atomic increment in a dedicated read model. This insight generalizes: event sourcing is not appropriate for all state shapes within the same system.

---

## Insight 5: The Subscription Lag Spiral Is a Positive Feedback Loop That Leads to OOM Kills
**Category:** Resilience
**One-liner:** When a projection falls behind, buffer accumulation causes memory pressure, which triggers GC pauses, which slows processing further, which increases lag -- a vicious cycle that often ends in OOM termination and checkpoint rollback.
**Why it matters:** This failure mode is particularly insidious because it is self-reinforcing. A traffic spike causes the projection to process events slower than they arrive. The subscriber buffers unprocessed events in memory. Buffer growth triggers garbage collection pressure. GC pauses slow processing. The gap widens. Eventually, either memory is exhausted (OOM kill) or the subscription times out and reconnects -- from the last checkpoint, re-adding already-buffered events to the backlog. Prevention requires multiple complementary mechanisms: monitoring lag with early alerting, auto-scaling projection workers before the spiral begins, implementing backpressure to slow event production when projections cannot keep up, and circuit-breaking projections that fall too far behind rather than letting them continue accumulating buffers.

---

## Insight 6: Upcasting Chains Transform Schema Evolution from a Migration Problem into a Code Maintenance Problem
**Category:** System Modeling
**One-liner:** Instead of migrating stored events (which are immutable), register upcaster functions that transform old event versions to the current version on read, creating a chain (V1 to V2 to V3) that grows with every schema change.
**Why it matters:** The immutability of the event log -- the very property that makes event sourcing valuable for audit trails -- means you can never "fix" old events in place. Upcasting elegantly solves this by applying transformation functions at read time: a V1 event with `customerName: "John Doe"` is transformed by an upcaster that splits it into `customer: {firstName: "John", lastName: "Doe"}` for V2. But the chain accumulates: after 10 schema versions, reading a V1 event requires applying 9 upcasters sequentially. This is manageable if upcasters are pure functions (no I/O, no external dependencies), but becomes a testing and maintenance burden over time. The practical limit is ~5-8 versions before teams reach for copy-and-transform (creating a new event type), which is cleaner but adds events to the stream.

---

## Insight 7: Transactional Checkpointing Eliminates the At-Least-Once Processing Problem for Projections
**Category:** Atomicity
**One-liner:** Wrapping the read model update and checkpoint advance in a single database transaction ensures that a crash between processing and checkpointing does not cause duplicate event application.
**Why it matters:** The naive projection loop -- process event, then update checkpoint -- has a failure window: if the process crashes after applying the event to the read model but before persisting the checkpoint, the event will be reprocessed on restart. For idempotent operations (setting a field to a value), this is harmless. For non-idempotent operations (incrementing a counter, appending to a list), it corrupts the read model. Transactional checkpointing (`BEGIN; UPDATE read_model; UPDATE checkpoint; COMMIT;`) closes this window entirely. When the read model and checkpoint live in different databases, the alternative is to store the last processed position directly in the read model row and skip events at or below that position.

---

## Insight 8: Blue-Green Projections Enable Zero-Downtime Rebuilds of Read Models
**Category:** Resilience
**One-liner:** Building a new projection alongside the existing one, catching up to live, then atomically switching traffic eliminates the maintenance window traditionally required for projection rebuilds.
**Why it matters:** Projection rebuilds are operationally painful: processing 100M events at 10K/sec takes 2.7 hours, during which the read model is either stale or unavailable. Blue-green deployment of projections -- running the new projection in parallel while the old one serves traffic, then switching once the new one is caught up -- solves this but introduces its own complexity: you need to handle events written during the rebuild window (the new projection must process both historical and live events), coordinate the switchover atomically, and manage the resource overhead of running two projections simultaneously. This pattern is directly borrowed from blue-green application deployment and is one of the most operationally important techniques in event-sourced systems.

---

## Insight 9: Optimistic Concurrency on Stream Version Is the Natural Conflict Resolution for Event Sourcing
**Category:** Consistency
**One-liner:** Each event append includes an expected stream version; if the actual version has advanced (another write occurred), the append fails with a concurrency conflict, forcing the command to reload, re-evaluate, and retry.
**Why it matters:** Unlike traditional databases where optimistic concurrency requires manually adding version columns, event sourcing has it built in: the stream version is the count of events, and appending with an expected version is a natural CAS operation. What makes this non-obvious is the retry strategy: the command must be re-executed against the new aggregate state (not simply re-submitted), because the new events may have changed the preconditions. For example, "add item to cart" may succeed after retry, but "set price to $10" may conflict with a concurrent "set price to $15" and require user intervention. The choice between auto-retry (commutative operations), merge (CRDT-like semantics), and fail-to-user (conflicting operations) must be made per-command, not globally.

---

## Insight 10: Read-Your-Writes Consistency Bridges the Gap Between Eventual Consistency and User Expectations
**Category:** Consistency
**One-liner:** Returning a position token from the write path and passing it to the query path, where the server waits for the projection to reach that position, gives users the illusion of strong consistency without sacrificing async projection benefits.
**Why it matters:** The most common user complaint in eventually consistent systems is "I just created this order but it's not in my order list." Pure eventual consistency is correct but feels broken. Synchronous projections fix this but sacrifice throughput. Read-your-writes consistency threads the needle: the command returns the global position of the written event, the client passes this as a `minVersion` parameter on subsequent queries, and the query API waits (with timeout) for the projection to reach that position before returning. Other users may see slightly stale data (which is acceptable), but the acting user always sees their own mutations. This is the same principle behind DynamoDB's consistent reads and PostgreSQL's synchronous_commit -- targeted consistency where it matters most.
