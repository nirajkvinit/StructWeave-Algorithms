# Key Insights: Document Collaboration Engine

## Insight 1: Single-Threaded Per-Document Session as the Concurrency Model

**Category:** Contention
**One-liner:** Process all operations for a given document on a single thread with no concurrency within a document session, making the OT transform pipeline inherently serializable and race-condition-free.

**Why it matters:** The OT collaboration engine must guarantee that all clients converge to the same document state. Concurrent modification of the in-memory document state would require locks, making the transform pipeline both slower and harder to reason about. By assigning each document to exactly one collaboration server instance and processing all operations for that document on a single thread, the entire transform-apply-broadcast pipeline becomes inherently sequential -- no locks, no races, no lost updates. The trade-off is that a single hot document is bound to one server's CPU. At 2 ops/sec from 500 users (1,000 ops/sec), the 5ms target per operation gives ample headroom on a single core. This is a deliberate choice: simplicity and correctness over theoretical throughput. The principle: for stateful processing where correctness requires ordering, single-threaded-per-entity is often the fastest and safest architecture.

---

## Insight 2: N-Squared Transform Complexity for Rich Text

**Category:** System Modeling
**One-liner:** Rich text OT requires N-squared transform function pairs (81+ for 9 operation types), each with dozens of edge cases -- this combinatorial explosion is why collaborative rich text editing took decades to get right.

**Why it matters:** Plain text OT has 2 operation types (insert, delete) requiring 4 transform pairs -- manageable and well-understood since 1989. Rich text adds formatting, block splits, merges, attribute sets, moves, wraps, and unwraps, ballooning to 81+ transform pairs. Each pair must correctly handle edge cases (what happens when a format operation and a delete overlap? when a split and a merge target the same block?). CKEditor 5 reported spending "over a year with several significant reworks" on their rich text OT. A former Google Wave engineer wrote: "implementing OT sucks." This N-squared complexity is why CRDTs are gaining traction for new implementations -- they provide mathematical convergence guarantees without transform functions. The architectural lesson: understand the complexity growth curve of your core algorithm before committing to an approach. Linear operations may compose linearly, but rich operations compose quadratically.

---

## Insight 3: Optimistic Local Application with Server Reconciliation

**Category:** Consistency
**One-liner:** Apply every keystroke instantly on the local client (zero perceived latency), then reconcile with the server version asynchronously, transforming remote operations against local pending operations.

**Why it matters:** If every keystroke required a server round-trip before appearing on screen, collaborative editing would feel unbearably laggy (50-200ms per character). Optimistic local application makes editing feel native: the user's keystrokes appear instantly, and the client maintains a buffer of pending operations that haven't been acknowledged by the server. When the server acknowledges an operation, it may have been transformed against concurrent operations from other users. The client must then transform its pending operations against any remote operations that were applied on the server between the client's base version and the acknowledged version. This creates a complex state machine on the client (waiting for ack while buffering new local ops), but the user experience is seamless. The broader principle: for latency-sensitive interactive applications, optimistic local application with async reconciliation is the only viable architecture.

---

## Insight 4: Ephemeral Presence with Bandwidth Optimization

**Category:** Caching
**One-liner:** Treat cursor positions and selections as ephemeral state (never persisted, TTL of 10 seconds) with client-side throttling (50ms), server-side debouncing (16ms batching), and delta encoding to minimize bandwidth.

**Why it matters:** Presence data (cursors, selections, online indicators) creates the "multiplayer" feeling, but it has fundamentally different characteristics from document operations: it's high-frequency (every mouse move), low-value per update (a cursor position is stale the instant it's sent), and ephemeral (no one cares where a cursor was 30 seconds ago). Persisting presence to durable storage or applying the same WAL guarantees as document operations would be wasteful. Instead, presence is stored only in memory, expires after 10 seconds of inactivity, and is lost on disconnect (by design -- a stale cursor is worse than no cursor). The bandwidth optimization stack (client throttle at 50ms, server batch at 16ms, delta encoding, dead reckoning interpolation on the receiver) reduces the wire cost from 20+ updates/sec per user to a few batched messages per second. The principle: match the durability and delivery guarantees to the data's actual value and lifetime.

---

## Insight 5: Snapshot + Operation Log for Document State Reconstruction

**Category:** Data Structures
**One-liner:** Reconstruct document state by loading the nearest snapshot and replaying only the operations since that snapshot, bounding replay cost to at most ~100 operations regardless of total document history.

**Why it matters:** A heavily edited document accumulates millions of operations over its lifetime. Replaying all operations on document open would take seconds -- unacceptable for a target of <500ms load time. Snapshots (full document state captures) taken every 100 operations or 5 minutes bound the replay cost: load the snapshot (~50ms deserialization), replay at most 100 operations (~1ms total), and the document is ready. The snapshot creation is async (enqueued as a background job, never blocking the operation pipeline) with copy-on-write semantics (snapshot captures a frozen point-in-time, concurrent operations continue on the live copy). An emergency trigger at 1,000 ops since last snapshot prevents snapshot workers from falling too far behind. After snapshotting, raw operations older than 90 days can be archived to cold storage. This snapshot+replay pattern is the standard approach for event-sourced systems where the full event log is too expensive to replay on every load.

---

## Insight 6: WAL-Before-ACK for Operation Durability

**Category:** Atomicity
**One-liner:** Never acknowledge a client's operation until the transformed operation has been durably written to the write-ahead log, guaranteeing that acknowledged operations survive server crashes.

**Why it matters:** The collaboration server processes operations in memory for speed, but memory is volatile. If the server crashes after ACKing an operation but before persisting it, the client believes the operation is committed but the server has lost it. On reconnect, the client's document state diverges from the server's. The WAL-before-ACK rule prevents this: step 4 (WRITE_WAL) must complete before step 5 (SEND ACK). This adds latency to the operation pipeline (synchronous disk write), but it's the only way to guarantee that an ACKed operation is durable. The WAL also enables crash recovery: the new server instance loads the latest snapshot, replays the WAL, and reconstructs the exact in-memory state. The principle: in any system where clients cache state based on server acknowledgments, the ACK must be the commit point, and the commit point must be durable.

---

## Insight 7: Permission Revocation During Active Editing Sessions

**Category:** Security
**One-liner:** When an admin revokes a user's editor access during an active editing session, reject any pending operations from that user and downgrade or disconnect their WebSocket immediately.

**Why it matters:** In a collaborative document, permission revocation must take effect in real-time, not at the next page load. If User B has pending operations in their WebSocket buffer when their access is revoked, those operations must be rejected, not applied. The server-side handling (reject_ops_from(user_id), send permission_changed event, disconnect if access is "none") ensures that revocation is immediate and complete. The client handles the permission_changed event by transitioning to view-only mode (or disconnecting), which is a better experience than silently losing the ability to edit. This real-time revocation is architecturally interesting because it intersects the collaboration protocol (operations in flight) with the access control system (permission changes), requiring coordination between two typically independent systems.

---

## Insight 8: Comment Anchor Tracking Across Concurrent Edits

**Category:** Data Structures
**One-liner:** Track comment anchors by adjusting their character offsets whenever operations insert or delete text before or within the anchored range, and mark anchors as "orphaned" when their anchored text is fully deleted.

**Why it matters:** Comments on specific text ranges are a core collaboration feature, but they create a subtle data structure problem: the comment's anchor (character offset range) must remain valid as the document is edited. An insert before the anchor shifts it right. A delete within the anchor shrinks it. A delete of the entire anchored text orphans the comment. The AdjustPresenceForOperation algorithm (used for both cursors and comment anchors) processes every applied operation and adjusts all anchors accordingly. The orphan detection (anchor text fully deleted) is the edge case that distinguishes a well-implemented system from a buggy one -- the comment must remain visible in the sidebar but its inline indicator must be removed. This is a micro-example of a broader pattern: any positional reference in a collaboratively edited document must be a "live" data structure that updates in response to operations, not a static offset.
