# Key Architectural Insights

## Insight 1: Block Identity Decouples Structure from Content

**Category**: System Modeling

**One-liner**: A UUID-identified block model makes move, nest, and type-transform first-class operations without affecting content.

**Why it matters**: In Notion's architecture, changing a block's type (paragraph to heading to code) changes only the `type` attribute---properties, content, and children remain untouched. This decoupling means a CRDT merge of a concurrent type change and content edit produces no conflict, because they operate on orthogonal data. Traditional linear editors cannot offer this because formatting and content are intertwined in the same character sequence. The block identity abstraction is what enables the fluid "everything is a block, drag anything anywhere" UX.

---

## Insight 2: Composite CRDTs Are Harder Than Any Individual CRDT

**Category**: Consistency

**One-liner**: A block editor requires three interacting CRDT types (Sequence + Tree + Map) whose combined behavior is not automatically correct.

**Why it matters**: A sequence CRDT (like YATA or Fugue) handles text within blocks. A tree CRDT handles block hierarchy. A map CRDT handles block properties. Each is individually well-understood and proven correct. But their composition creates emergent edge cases: a block move (tree CRDT) can conflict with a text edit (sequence CRDT) that references the same block, or a property change (map CRDT) can interact with a delete (tree CRDT). The composite must maintain referential integrity across all three layers. This is why production block editors like Notion took years to ship offline support---the interaction surface between CRDT types is where the real complexity lives.

---

## Insight 3: Presence Must Be Architecturally Separated from Document Sync

**Category**: Streaming

**One-liner**: Mixing ephemeral cursor data with durable document operations creates a 100x write amplification problem with zero historical value.

**Why it matters**: A user generates 10-30 cursor position updates per second while editing, but only 1-3 document operations per second. If cursor positions are stored in the CRDT operation log, they dominate storage (97% of operations) while providing zero historical value---no one needs to replay cursor movements from last Tuesday. Separating presence into an ephemeral, best-effort broadcast channel (like the Yjs awareness protocol) keeps the operation log clean and reduces sync payload size by an order of magnitude. The presence channel can tolerate stale data, packet loss, and lower consistency guarantees because a 200ms-old cursor position is still useful.

---

## Insight 4: Offline-First Is an Architecture, Not a Feature

**Category**: Resilience

**One-liner**: Choosing CRDT over OT is an irreversible architectural decision that enables offline editing as a natural consequence rather than a bolted-on capability.

**Why it matters**: OT requires a central server to order operations. If the server is unreachable, OT-based editors must either buffer operations (risking conflicts on reconnect) or go read-only. CRDTs, by mathematical construction, allow any replica to accept edits independently and merge later. This means offline editing is not a feature to be built---it is a property that emerges from the choice of data structure. Notion's December 2025 engineering blog confirms they had to migrate their data model to CRDTs specifically to enable offline support, a multi-year effort. The lesson: if offline matters, choose CRDT from day one.

---

## Insight 5: Block Tree Conflicts Require Different Resolution Semantics Than Text Conflicts

**Category**: Consistency

**One-liner**: Concurrent block moves can create cycles, orphans, and cross-permission boundary violations---none of which exist in character-level editing.

**Why it matters**: Text CRDTs deal with a flat sequence where the worst case is character interleaving. Block tree CRDTs face structurally dangerous conflicts: two users moving the same block to different parents (last-writer-wins), a user adding children to a block another user deletes (orphan rescue), or two users making reciprocal moves that create a cycle (cycle detection and rejection). Each requires a distinct resolution strategy. The "orphan rescue" pattern---where a block moved to a deleted parent is rescued to the deleted parent's former position---is particularly important because it preserves both users' intent: the creator's content and the deleter's cleanup.

---

## Insight 6: State Vector Exchange Reduces Sync to O(k) Where k Is Missing Operations

**Category**: Scaling

**One-liner**: A compact state vector (map of replica_id to clock) enables delta sync that transfers only what each side is missing, regardless of document size.

**Why it matters**: Without state vectors, syncing requires either transferring the entire document (O(n) for n characters) or maintaining a complex log of "what has each client seen." The state vector approach (used by Yjs and Automerge) compresses the answer to "I've seen everything from Replica A up to clock 47, Replica B up to clock 23." The remote side can then compute exactly which operations to send---typically just a few hundred bytes even for a million-character document. This makes offline reconnection practical: a client offline for days can sync by exchanging ~128 bytes of state vector and receiving only the operations it missed.

---

## Insight 7: Eg-walker Achieves CRDT Correctness with OT Memory Efficiency

**Category**: Data Structures

**One-liner**: By instantiating CRDT structures only during merges and discarding them immediately after, eg-walker uses 10-100x less memory than persistent CRDTs.

**Why it matters**: Traditional CRDTs maintain 16-32 bytes of metadata per character permanently, inflating a 10KB document to 320KB. Eg-walker (used by Figma for code layers) takes a fundamentally different approach: it stores operations in a compact log and only builds a CRDT data structure when concurrent operations need merging. For the common case of sequential, non-conflicting edits, the merge cost is nearly zero. For long-running branches, it builds a temporary CRDT, merges, and discards. This achieves the correctness guarantees of CRDTs with memory consumption approaching OT levels---particularly valuable for code editors and mobile clients.

---

## Insight 8: Tombstone Accumulation Is the Hidden Scalability Tax of CRDTs

**Category**: Data Structures

**One-liner**: CRDTs can never truly delete; every deleted character becomes a tombstone that persists until all replicas coordinate garbage collection.

**Why it matters**: In a CRDT, a "delete" operation marks an item as a tombstone rather than removing it, because other replicas might have concurrent operations that reference the deleted item. Over time, tombstones can exceed live data---a document with 10K characters might have 50K tombstones from editing history. Garbage collection requires all replicas to agree that they've all seen the delete, which is impossible for an offline client that hasn't synced in months. The practical solution is a GC grace period (e.g., 30 days): clients that sync within the window get incremental updates; clients that miss it must do a full document reload. This is the fundamental trade-off between CRDT memory efficiency and offline duration support.

---

## Insight 9: CRDT Architecture Inverts the Disaster Recovery Model

**Category**: Resilience

**One-liner**: When every client is a full replica, total server data loss is recoverable from client state alone.

**Why it matters**: In traditional architectures, the server is the single source of truth, and data loss means data loss. In a CRDT-native editor, every connected client holds a complete, valid replica of every document it has open. If the server experiences catastrophic data loss, clients can re-sync their state to a new server, effectively reconstructing the database from the distributed client population. This inverts the traditional DR model: the "backup" is distributed across thousands of client devices. The caveat is documents not currently open on any client would be lost without separate snapshots, but for active documents, the CRDT architecture provides a level of resilience that traditional systems cannot match.

---

## Insight 10: Cursor Positions Must Be Anchored to CRDT Item IDs, Not Integer Offsets

**Category**: Consistency

**One-liner**: Integer offsets become invalid the moment a remote edit inserts or deletes before the cursor, but CRDT item IDs are stable across all concurrent edits.

**Why it matters**: If User A's cursor is at "position 5" and User B inserts 3 characters before position 5, User A's cursor should now be at position 8. With integer offsets, the presence system must transform every cursor position on every remote edit---effectively reimplementing OT for cursor positions. By anchoring cursors to CRDT item IDs (which are stable, unique identifiers for each character in the CRDT), the cursor position remains valid regardless of concurrent edits. The CRDT item ID resolves to the correct integer offset at render time. This is a subtle but critical design decision that eliminates an entire class of cursor-jumping bugs.

---

## Insight 11: Block-Level Lazy Loading Transforms Document Size from a Memory Problem to an I/O Problem

**Category**: Scaling

**One-liner**: Loading CRDT state per-block instead of per-document means a 10,000-block document only loads the 20 blocks on screen.

**Why it matters**: A full-document CRDT loads all character metadata, tombstones, and formatting marks into memory at once. For a large knowledge base page, this can be megabytes of CRDT state for content the user hasn't scrolled to. Block-level lazy loading treats each block's CRDT state as independently loadable: only blocks in the viewport are fully hydrated, while off-screen blocks exist as lightweight placeholders with just their ID and type. When the user scrolls, blocks are loaded on demand. This transforms the scaling constraint from "how much CRDT state can the client hold in memory" to "how fast can we load a block"---a much more tractable problem, solvable with caching and prefetching.

---

## Insight 12: Permission Changes and CRDT Merges Are Fundamentally at Odds

**Category**: Security

**One-liner**: A CRDT merge always succeeds by design, but permission changes require the ability to reject operations---creating an architectural tension.

**Why it matters**: CRDTs guarantee that any two states can be merged without conflict. But if an admin revokes a user's edit permission while that user is offline, the user's offline edits should be rejected, not merged. This creates a fundamental tension: the CRDT layer wants to merge everything; the permission layer wants to reject some things. The resolution is a two-phase approach: the CRDT merge happens in an isolated sandbox, the permission layer validates the result, and if validation fails, the merge is rolled back. The user's offline edits are preserved locally as "rejected changes" for transparency. This layered validation on top of CRDTs is essential for any enterprise-grade collaborative editor.
