# Key Insights: CQRS Implementation

[← Back to Index](./00-index.md)

---

## Insight 1: The Dual-Write Problem Is the Single Biggest Source of Data Loss in CQRS Systems
**Category:** Atomicity
**One-liner:** Writing to the database and then publishing to the message broker in two separate operations creates a failure window where the DB succeeds but the event is lost, making the read model permanently diverge from reality.
**Why it matters:** This is not an edge case -- it is the default failure mode when CQRS is implemented naively. If the application writes to the write database and then crashes before publishing the event to the broker, the read models never receive the update. The system is now silently inconsistent with no mechanism for self-healing. Three solutions exist, each with distinct trade-offs: the outbox pattern (write event to an outbox table in the same DB transaction, relay asynchronously), CDC via Debezium (read the database WAL directly, no application code changes), or using an event store as the single source of truth (single write, built-in pub/sub). The outbox pattern is the most commonly adopted because it requires no infrastructure changes and provides explicit control over event shape.

---

## Insight 2: Partition by Aggregate ID Is the Only Reliable Way to Guarantee Event Ordering for Projections
**Category:** Consistency
**One-liner:** Without partitioning events by aggregate ID, events for the same order can land on different broker partitions, arrive out of order, and corrupt the read model -- an ItemAdded event processed before its OrderCreated event creates an orphaned update.
**Why it matters:** Message brokers only guarantee ordering within a partition, not across partitions. If CQRS events are partitioned randomly (round-robin) or by event type, events for the same aggregate may cross partitions. The projection for "Order 123" sees ItemAdded(v2) before OrderCreated(v1), tries to update a non-existent row, and either fails silently or creates a partial record. Partitioning by aggregate ID (the event's `aggregateId` as the partition key) ensures all events for one aggregate flow through one partition and are processed sequentially by one consumer. This is a hard constraint, not an optimization -- violating it produces data corruption that is difficult to detect and repair.

---

## Insight 3: Version-Aware Projections with Event Buffering Handle Out-of-Order Delivery Gracefully
**Category:** Resilience
**One-liner:** When a projection receives an event at version N but the read model is at version N-2, it buffers the event and retries after a delay, processing it only when the gap is filled by the missing intermediate event.
**Why it matters:** Even with aggregate-ID-based partitioning, network delays and redeliveries can cause events to arrive out of sequence. A version-aware projection handler checks: if `currentVersion < expectedVersion` (gap detected), buffer the event; if `currentVersion >= event.version` (already processed), skip it (idempotent); otherwise, apply it and drain the buffer. This three-way check transforms a fragile projection into a self-healing one. The buffered-event retry with a short delay (100ms) handles transient reordering, while a timeout on the buffer prevents indefinite waiting on truly lost events. This pattern adds modest complexity but eliminates an entire class of data integrity issues.

---

## Insight 4: LISTEN/NOTIFY on the Outbox Table Reduces Projection Lag from 50ms Average to Near-Zero
**Category:** Caching
**One-liner:** Instead of polling the outbox table every 100ms (average 50ms latency), a PostgreSQL trigger fires NOTIFY on INSERT, waking the relay process immediately, with polling as a reliability fallback.
**Why it matters:** The outbox relay's polling interval directly determines minimum projection lag. At 100ms polling, the average lag is 50ms -- acceptable for most use cases but noticeable for real-time UIs. Push-based notification via PostgreSQL's LISTEN/NOTIFY mechanism reduces this to sub-millisecond: a trigger on the outbox table fires NOTIFY with the event ID, and the relay process, listening on that channel, wakes immediately to fetch and publish. The critical detail is that NOTIFY is not guaranteed (it can be lost if the relay is disconnected), so polling must remain as a fallback. This dual-mode approach (push for speed, poll for reliability) is a pattern that recurs whenever you need both low latency and guaranteed delivery.

---

## Insight 5: Synchronous Projection for Critical Paths, Async for Everything Else
**Category:** Consistency
**One-liner:** A hybrid projection mode -- where a few critical read models are updated in the same transaction as the write (strong consistency) while most projections process asynchronously (eventual consistency) -- balances correctness with throughput.
**Why it matters:** The binary choice between "all sync projections" (low throughput, high consistency) and "all async projections" (high throughput, stale reads) is a false dichotomy. In practice, only a few projections need immediate consistency: the user's own order status, an account balance after a transfer, or inventory count during checkout. These critical projections can be updated in the same database transaction as the write (`BEGIN; UPDATE orders; UPDATE order_list_view; COMMIT;`), while analytics dashboards, search indexes, and recommendation models project asynchronously. This per-projection consistency policy mirrors how DynamoDB offers both strongly consistent and eventually consistent read modes -- let the caller choose the trade-off at the point of use.

---

## Insight 6: Read-After-Write Staleness Is Best Solved at the Client, Not the Server
**Category:** Consistency
**One-liner:** After a successful command, the client optimistically updates the UI with the expected new state and maintains a local pending-items list that merges with server results until the projection catches up.
**Why it matters:** The classic CQRS problem -- "I just created an order but it's not in my list" -- has both server-side and client-side solutions. Server-side (version tokens, wait-for-position) adds latency and complexity to the query path. Client-side optimistic updates provide instant perceived responsiveness: after the command succeeds, the client adds the new order to a local pending list and merges it into the displayed results. When subsequent server fetches include the order (projection has caught up), it is removed from the pending list. This approach requires no server changes, handles the 99% case perfectly, and only needs fallback reconciliation for the rare case where the command's effects differ from expectations (e.g., validation changed the data).

---

## Insight 7: SELECT FOR UPDATE SKIP LOCKED Enables Parallel Outbox Relays Without Double Publishing
**Category:** Contention
**One-liner:** Multiple outbox relay workers can process events in parallel by using `SELECT ... FOR UPDATE SKIP LOCKED`, where each worker locks a subset of unpublished rows and skips rows already locked by other workers.
**Why it matters:** A single outbox relay process is a throughput bottleneck. Running multiple relay instances without coordination causes double-publishing (both instances read the same unpublished event). Traditional approaches -- sharding the outbox or partitioning by relay instance -- add complexity. `SKIP LOCKED` is an elegant database-level solution: each relay worker's SELECT locks the rows it fetches, and concurrent workers skip those locked rows, naturally dividing the work. Combined with adaptive backoff (increase sleep interval when no events are found), this creates a self-balancing pool of relay workers that scales horizontally without explicit coordination or partition management.

---

## Insight 8: Blue-Green Projection Deployment Eliminates the Rebuild Maintenance Window
**Category:** Resilience
**One-liner:** Building a new projection in the background while the old one serves traffic, then performing an atomic traffic switch once the new projection has caught up to live, achieves zero-downtime projection schema changes.
**Why it matters:** Projection rebuilds from 100M events can take hours. During a traditional rebuild, the read model is either unavailable (unacceptable) or serving stale data (confusing). Blue-green deployment of projections -- running old and new projections simultaneously against the same event stream, with traffic routed to the old until the new is caught up -- eliminates this window entirely. The new projection processes the historical backlog at its own pace, transitions to live processing, and traffic is switched once lag reaches zero. This requires double the read-model infrastructure temporarily, but the operational benefit (no maintenance windows, rollback is simply switching back) makes it the standard approach for mature event-sourced systems.

---

## Insight 9: Denormalizing Data into Events Prevents N+1 Query Problems in Projections
**Category:** Scaling
**One-liner:** Including all necessary context (customer name, product title, etc.) directly in the domain event eliminates the need for projections to query other services during processing, converting a network-bound operation into a pure data transformation.
**Why it matters:** A common projection performance pitfall is enrichment: the `OrderCreated` event contains only `customerId` and `productId`, so the projection must query the Customer and Product services to populate the denormalized read model. At 10,000 events/sec, this means 10,000 network calls/sec per enrichment dimension -- an N+1 problem at the infrastructure level. By including denormalized data in the event itself (`customerName`, `productTitle`, `unitPrice` at the time of the event), the projection becomes a pure function from event to read model update, with no external dependencies. The trade-off is larger events and potential staleness of denormalized data, but for projections, point-in-time accuracy (what was the customer's name when they ordered) is often more valuable than current accuracy.

---

## Insight 10: The Outbox Pattern Combined with CDC Provides the Best of Both Worlds for Event Distribution
**Category:** Streaming
**One-liner:** Writing events to an outbox table gives explicit control over event shape and schema, while CDC (Debezium reading the WAL) provides the relay mechanism without polling overhead or application-level complexity.
**Why it matters:** Pure outbox with application-level polling has two weaknesses: polling latency and relay process management. Pure CDC without an outbox reads raw database changes (INSERT/UPDATE/DELETE on business tables), which couples event consumers to the write model's physical schema. The hybrid approach writes structured, versioned events to a dedicated outbox table (giving producers full control over the event contract), then uses CDC to capture those outbox inserts from the WAL (eliminating polling entirely). This provides the explicit event design of the outbox pattern with the zero-latency, zero-polling characteristics of CDC. Debezium's connector for this exact pattern (outbox event router) has become a standard component in production CQRS architectures.
