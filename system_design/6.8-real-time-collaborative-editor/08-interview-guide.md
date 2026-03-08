# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Clarify** | Scope the problem | Block-based vs linear? Offline required? Scale? |
| 5-10 min | **Requirements** | Core features, non-functionals | Block model, real-time sync, offline, presence |
| 10-20 min | **High-Level Design** | Architecture, data flow | Client-server CRDT, WebSocket, block tree, operation log |
| 20-35 min | **Deep Dive** | 1-2 critical components | CRDT merge engine, block tree conflicts, OR offline sync |
| 35-42 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios | Fan-out, memory, OT vs CRDT trade-offs |
| 42-45 min | **Wrap Up** | Summary, extensions | Synced blocks, database views, search |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **Three CRDT types must compose**: Unlike a chat system (just sequence CRDT) or a config system (just map CRDT), a block editor needs Sequence + Tree + Map CRDTs working together coherently. This is the core intellectual challenge.

2. **The block model changes everything**: If you approach this as "Google Docs with better structure," you'll miss that tree-structural operations (move, nest, reparent) create an entirely different conflict domain than text operations.

3. **Offline is not a feature---it's an architecture**: You can't bolt offline onto an OT-based system. The choice of CRDT is an architectural commitment that affects every layer.

4. **Presence is architecturally separate from sync**: Mixing ephemeral cursor data with durable document data is a common mistake. They have different persistence, consistency, and bandwidth requirements.

### Where to Spend Most Time

In the 45-minute interview, spend **60% of deep dive time on the CRDT merge engine and conflict resolution**. This is where the real system design thinking happens:

- How do concurrent block moves resolve?
- What happens when someone deletes a block that another user is moving into?
- How does the system handle 48 hours of offline edits merging?

### How to Approach This Specific Problem

1. **Start with the data model**: "Everything is a block with a UUID." This single statement shapes the entire architecture.
2. **Establish OT vs CRDT early**: Make the decision and justify it (offline requirement drives CRDT).
3. **Draw the block tree**: Show how blocks nest and how operations (insert, move, delete) affect the tree.
4. **Show the sync protocol**: State vector exchange for efficient delta sync.
5. **Discuss failure modes**: Concurrent moves, delete-while-editing, cycle creation.

---

## Trade-offs Discussion

### Trade-off 1: OT vs CRDT

| Decision | OT (Google Docs approach) | CRDT (Notion/AFFiNE approach) |
|----------|--------------------------|-------------------------------|
| | **Pros**: Lower memory overhead; simpler for linear text; proven at Google scale | **Pros**: Offline-first natively; peer-to-peer possible; mathematically guaranteed convergence |
| | **Cons**: No offline support; N-squared transform functions; central server bottleneck | **Cons**: 4-32x memory overhead per character; complex to implement correctly |
| **Recommendation** | Choose CRDT if offline editing is a requirement (it usually is for modern productivity tools) |

### Trade-off 2: Block-Level vs Character-Level CRDT Granularity

| Decision | Character-Level CRDT (full document) | Block-Level CRDT (per block) |
|----------|--------------------------------------|------------------------------|
| | **Pros**: Simplest model; one CRDT state per document | **Pros**: Independent loading per block; smaller sync payloads; block-level GC |
| | **Cons**: Entire CRDT must load for any edit; large memory footprint | **Cons**: Cross-block operations require coordination; more complex state management |
| **Recommendation** | Block-level for production systems (enables lazy loading and reduces memory pressure) |

### Trade-off 3: Server-Authoritative vs Pure Peer-to-Peer

| Decision | Server-Authoritative (Notion) | Pure P2P (Local-first) |
|----------|-------------------------------|------------------------|
| | **Pros**: Central permission enforcement; audit trail; easier ops | **Pros**: Works without any server; maximum privacy; zero-latency |
| | **Cons**: Server is a dependency for sync (though not for editing) | **Cons**: No central permission model; discovery problem; harder backup |
| **Recommendation** | Server-assisted for enterprise/team tools; P2P for personal/privacy-focused tools |

### Trade-off 4: Tombstones vs Garbage Collection

| Decision | Keep All Tombstones | Garbage Collect |
|----------|---------------------|-----------------|
| | **Pros**: Simple; no coordination needed; supports arbitrary-length offline | **Pros**: Reduced memory; faster document loading; smaller sync payloads |
| | **Cons**: Unbounded memory growth; 50%+ of CRDT can be tombstones | **Cons**: Requires all replicas to agree on GC point; breaks very-long-offline clients |
| **Recommendation** | GC with a grace period (e.g., 30 days); clients offline longer must do full document reload |

### Trade-off 5: Eg-walker vs Traditional CRDT

| Decision | Traditional CRDT (Yjs/Automerge) | Eg-walker (Hybrid) |
|----------|----------------------------------|---------------------|
| | **Pros**: Well-understood; large ecosystem; production-proven | **Pros**: 10-100x less memory; fast merging; best of OT and CRDT |
| | **Cons**: Persistent metadata overhead; large state for big documents | **Cons**: Newer algorithm; smaller ecosystem; more complex implementation |
| **Recommendation** | Traditional CRDT for most use cases; Eg-walker for code editors or memory-constrained environments |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just use a database with row locking?" | Understand why DB transactions don't work for real-time editing | "Row locking would mean only one user edits at a time. We need concurrent edits with <50ms latency. Locking at character or block level is infeasible. CRDTs solve this by making all operations commutative---no locks needed." |
| "What if two users type the same character at the same position?" | Understand CRDT conflict resolution for text | "The CRDT assigns each character a unique ID with left/right origins. Concurrent insertions at the same position are ordered deterministically using the Fugue algorithm to prevent interleaving. Both users' characters appear, grouped by author." |
| "Can't you just use Git for version control?" | Understand difference between file-level and character-level merging | "Git operates on line-level diffs and requires manual conflict resolution. A collaborative editor needs character-level, real-time merging with zero user intervention. CRDTs provide automatic, always-correct merging at the keystroke level." |
| "Why not store operations in a Kafka topic and replay?" | Test understanding of CRDT vs event sourcing | "Good for the operation log, but Kafka alone doesn't solve conflict resolution. You still need a CRDT or OT algorithm to determine how concurrent operations merge. Kafka provides ordering and durability; CRDTs provide convergence." |
| "What happens with 10,000 concurrent editors?" | Test scaling thinking | "At that scale, we shard the broadcast. Not all 10K users need every keystroke---most are viewing, not editing. We batch operations (50ms windows), compress deltas, and use viewport-based filtering to only send relevant updates. For truly massive docs, we paginate the block tree." |
| "How do you handle a user who's been offline for 6 months?" | Test understanding of CRDT garbage collection trade-offs | "If we've garbage-collected tombstones, a 6-month-old client can't incrementally sync. We detect this via state vector comparison---if the gap is too large, we send a full snapshot instead of a delta. The client resets its state to the snapshot and syncs forward." |
| "What if someone pastes 1GB of text?" | Test input validation and limits | "We enforce limits at multiple layers: client-side validation (max block size), WebSocket message size limits, and server-side schema validation. A 1GB paste would be rejected at the client before it ever reaches the network." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Starting with the database schema | Premature; the hard problem is conflict resolution, not storage | Start with the block data model and CRDT algorithm |
| Describing only text editing | Missing the block-based tree structure | Explicitly discuss block operations: move, nest, transform |
| Using "eventual consistency" without qualifying | Suggests data loss is acceptable | Say "strong eventual consistency"---CRDTs guarantee convergence |
| Ignoring offline entirely | Major requirement for modern editors | Make offline a first-class architectural decision (drives CRDT choice) |
| Conflating presence with document sync | Different consistency, persistence, and frequency requirements | Explicitly separate presence as an ephemeral, best-effort channel |
| Saying "just add more servers" for scaling | Doesn't address document-level fan-out bottleneck | Discuss operation batching, delta compression, viewport filtering |
| Using HTTP polling for real-time sync | Too high latency; too much overhead | WebSocket with persistent connection; binary CRDT deltas |

---

## Questions to Ask Interviewer

| Question | Why It Matters |
|----------|---------------|
| "Is offline editing a hard requirement?" | Drives the entire OT vs CRDT decision |
| "What's the expected scale---concurrent editors per document?" | Shapes fan-out strategy |
| "Is this block-based (Notion-style) or linear (Google Docs-style)?" | Determines data model complexity |
| "Are there enterprise requirements like permissions, audit, compliance?" | Adds server-authoritative validation layer |
| "Is real-time presence (multiplayer cursors) required?" | Adds presence subsystem |
| "What types of content? Just text, or also tables, databases, embeds?" | Determines block type complexity |
| "What's the target latency for edit propagation?" | Shapes batching and compression decisions |

---

## Quick Reference Card

### The 5-Sentence Architecture Summary

1. Everything is a UUID-identified **block** in a tree hierarchy, with each block containing typed properties and optional rich text content.
2. Document state is managed by a **composite CRDT** (Sequence CRDT for text + Tree CRDT for hierarchy + Map CRDT for properties) that guarantees convergence without a central server.
3. Edits are applied **optimistically on the client** (zero latency), persisted to **local storage** (offline safety), then synced via **WebSocket** to a sync server that broadcasts to peers.
4. **Offline editing** works natively because CRDTs merge without server coordination; reconnection uses **state vector exchange** to sync only missing operations.
5. **Presence** (cursors, selections) is a separate ephemeral channel that does not pollute the durable operation log.

### Key Numbers to Remember

| Metric | Value |
|--------|-------|
| Local edit latency | <5ms |
| Edit propagation (p50/p99) | 50ms / 300ms |
| CRDT memory overhead per char | 4-32 bytes |
| State vector exchange (sync) | ~128 bytes typical |
| WebSocket message size (delta) | 50-200 bytes |
| Max concurrent editors per doc | 200 (soft limit) |
| Offline merge rate | 100K ops/sec |
| Snapshot interval | Every 100 ops or 5 min |
