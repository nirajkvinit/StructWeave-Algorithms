# Interview Guide

## 1. Interview Pacing (45-min Format)

| Time | Phase | Focus | Key Actions |
|------|-------|-------|-------------|
| 0-5 min | **Clarify** | Scope: text only or rich text? Concurrent users? Offline? | Ask about consistency needs, scale, feature scope |
| 5-12 min | **High-Level** | Architecture, WebSocket, collaboration service, data flow | Draw the editing flow from keystroke to other users' screens |
| 12-25 min | **Deep Dive** | OT vs CRDT: pick one, explain transform functions | Show you understand WHY convergence is hard, not just WHAT it is |
| 25-35 min | **Scale & Trade-offs** | Hot documents, session management, snapshot strategy | Discuss what breaks with 1000 editors, offline mode |
| 35-42 min | **Reliability** | WAL, crash recovery, convergence verification | Show failure thinking |
| 42-45 min | **Wrap Up** | Summary, extensions (comments, presence, undo) | Demonstrate breadth |

---

## 2. Meta-Commentary

### What Makes This System Unique

1. **The core problem is correctness, not scale**: Unlike most system design problems where the challenge is handling more traffic, the fundamental challenge here is a CS theory problem: how do you guarantee convergence when multiple users edit the same position simultaneously?

2. **Optimistic local application is non-negotiable**: Every keystroke MUST render instantly on the local client. This means you're applying operations before knowing if they conflict with remote edits. The reconciliation happens asynchronously --- this is a fundamentally different paradigm from most distributed systems.

3. **The collaboration service is stateful**: Unlike most microservices which are stateless, the collaboration service holds the document's in-memory state. This creates unique scaling challenges (session affinity, migration, crash recovery).

4. **Rich text makes everything exponentially harder**: For N operation types, OT needs N² transform functions. Plain text has 2 types (4 pairs). Rich text with 9+ types has 81+ pairs, each with subtle edge cases.

### Where to Spend Most Time

- **OT/CRDT algorithm explanation** (10-15 min): This is the heart of the problem. Show you understand transforms, not just the buzzwords
- **Client state machine** (5 min): The pending_op / buffer_op / confirmed_version state machine is essential
- **Crash recovery** (5 min): WAL + snapshot + replay shows production thinking

### How to Approach

1. Start with **two users, same document**: simplest collaboration scenario
2. Show the **happy path** first: no conflicts, operations arrive in order
3. Introduce **concurrent edits**: two inserts at the same position
4. Explain **transform function**: how the second operation gets adjusted
5. Scale up: **many users, hot documents, offline mode**
6. Add **reliability**: what happens when the server crashes?

---

## 3. Questions to Ask the Interviewer

| Question | Why It Matters |
|----------|---------------|
| "Is this plain text or rich text (bold, italic, formatting)?" | Rich text is 10x more complex; scopes the OT/CRDT design |
| "How many simultaneous editors per document?" | 5 vs 500 has completely different scaling implications |
| "Do we need offline editing support?" | Offline requires either CRDT or local-first OT with reconciliation |
| "What consistency model is expected?" | Strong consistency requires central server (OT); eventual allows CRDT |
| "Is version history with restore required?" | Affects snapshot strategy and operation retention |
| "Should we support comments and suggestions?" | Adds comment anchoring complexity (tracking positions through edits) |
| "What's the target latency for seeing someone else's edit?" | <100ms vs <500ms affects architecture choices |
| "Is this a new system or replacing an existing one?" | Determines if you need migration strategy |

---

## 4. Trade-offs Discussion

### Trade-off 1: OT vs CRDT

| | Operational Transformation | CRDTs |
|--|---------------------------|-------|
| **Pros** | Lower memory overhead; proven at Google scale; simpler data model; no tombstone bloat | No central server needed; works offline natively; mathematically guaranteed convergence; fast branch merging |
| **Cons** | Requires central server; N² transform functions; offline support is hard; slow branch merging | Higher memory (metadata per character); tombstone management; complex data structures; newer, less production battle-testing |
| **Best for** | Centralized real-time editing (Google Docs model) | Peer-to-peer, offline-first, local-first apps |
| **Recommendation** | **OT for server-centric architecture** (simpler, proven). Use CRDT if offline is a primary requirement |

### Trade-off 2: Operation Granularity

| | Character-level ops (insert 1 char) | Word/line-level ops (insert "Hello World") |
|--|------------------------------------|--------------------------------------------|
| **Pros** | Finest-grained conflict detection; most accurate transforms | Fewer operations to process and store; lower bandwidth |
| **Cons** | High operation rate (30 ops/s per fast typist); more transforms needed | Coarser conflict resolution; may lose parts of a word on conflict |
| **Recommendation** | **Character-level on wire, composed on storage**. Send character-level for accuracy; compose into compound operations for the operation log |

### Trade-off 3: Snapshot Frequency

| | Frequent (every 50 ops) | Infrequent (every 500 ops) |
|--|------------------------|---------------------------|
| **Pros** | Fast document load (fewer ops to replay); smaller recovery window | Less storage; less write amplification |
| **Cons** | More storage; more write overhead; more snapshot worker load | Slower document load; longer recovery time |
| **Recommendation** | **Every 100 operations or 5 minutes** (whichever first) --- balances load time against storage cost |

### Trade-off 4: Session Statefulness

| | Stateful (in-memory session per doc) | Stateless (reconstruct from log on each op) |
|--|--------------------------------------|---------------------------------------------|
| **Pros** | Sub-millisecond transform time; no DB hit on critical path | No session affinity needed; any instance handles any doc; no crash recovery issue |
| **Cons** | Requires session affinity; crash = session loss; migration complexity | Every operation requires log read (slow); high DB load |
| **Recommendation** | **Stateful sessions** --- the latency requirement (<5ms per operation) makes stateless infeasible. Mitigate crash risk with WAL + fast recovery |

### Trade-off 5: Presence Durability

| | Durable presence (stored in DB) | Ephemeral presence (memory only) |
|--|--------------------------------|----------------------------------|
| **Pros** | Survives server restart; consistent across instances | Zero storage cost; no persistence latency; naturally cleans up |
| **Cons** | Unnecessary storage; stale data persists; cleanup needed | Lost on crash; requires reconnect to restore |
| **Recommendation** | **Ephemeral** --- presence is intrinsically temporary. Stale cursors are worse than no cursors. Users reconnect quickly and restore presence naturally |

---

## 5. Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just use a database lock to prevent concurrent edits?" | Test understanding of real-time collaboration | "Locking is the opposite of collaboration. The whole point is that multiple users edit simultaneously. OT/CRDTs let every user edit without blocking, and the system reconciles. The user experience requires zero-latency local edits." |
| "Why not use last-write-wins for conflict resolution?" | Test understanding of intention preservation | "LWW silently discards one user's edit --- imagine typing a paragraph and it vanishes because someone else edited a different section. OT preserves both edits by adjusting positions. The goal is to never lose user input." |
| "Can you just use Git-style merging?" | Test understanding of real-time vs batch merge | "Git merge works on saved snapshots with human conflict resolution. Collaborative editing needs sub-second automated resolution for every keystroke. OT does this continuously and automatically. Git's three-way merge is conceptually similar to OT's transform, but OT operates at character granularity in real-time." |
| "What if the central server goes down?" | Test failure thinking | "The operation log is replicated across zones. On crash: (1) clients enter offline mode and buffer operations locally, (2) a new instance loads the latest snapshot + replays WAL entries, (3) clients reconnect and send buffered operations, (4) normal service resumes. Total recovery: ~10-30 seconds. RPO = 0 because of synchronous WAL replication." |
| "How does undo work when multiple people are editing?" | Test depth on collaborative undo | "Each user has their own undo stack. When User A undoes, we compute the inverse of their last operation, then transform it against all subsequent operations (by any user). The transformed inverse is applied as a new operation. This ensures A only undoes their own changes without affecting B's edits." |
| "Can't CRDTs solve everything? Why not just use them?" | Test nuanced understanding of trade-offs | "CRDTs have real costs: 16-32 bytes metadata per character, tombstone management (Figma had documents with 10M+ tombstones), and richtext CRDTs like Peritext are still relatively new. OT is simpler for centralized architectures. The best approach depends on requirements: CRDT for offline-first/P2P, OT for server-centric real-time editing." |
| "How do you handle a document with a million edits?" | Test operational thinking | "Periodic snapshots (every 100 ops) bound the replay cost. Document load = latest snapshot + replay 0-100 operations. The raw operation log is compacted after snapshot. For version history, we store snapshots at user-requested save points. Operation log growth is ~50 bytes/op, so 1M ops = ~50 MB --- manageable, but we archive old ops to cold storage." |

---

## 6. Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Do Instead |
|---------|---------------|-------------------|
| Explaining OT without showing a transform example | Interviewer can't tell if you actually understand it | Walk through: "User A inserts 'X' at position 5, User B inserts 'Y' at position 3 → B's insert shifts A's to position 6" |
| Not mentioning the client-side state machine | This is half of the OT algorithm | Show: pending_op, buffer_op, confirmed_version; explain how remote ops are transformed against pending local ops |
| Treating the collab service as stateless | It fundamentally cannot be stateless at useful latency | Explain WHY it's stateful (sub-ms transforms require in-memory doc) and how you handle crash recovery |
| Ignoring rich text complexity | Plain text OT is a warm-up; rich text is the real challenge | At minimum acknowledge: "for N op types, we need N² transform functions; rich text has 9+ types = 81+ pairs" |
| Not discussing convergence verification | How do you KNOW all users see the same thing? | Mention periodic hash comparison between server and clients |
| Spending too much time on infrastructure | The interesting part is the algorithm | Spend 60% of time on OT/CRDT, 40% on infrastructure |
| Saying "just use Firebase" or "just use Yjs" | Shows you don't understand the underlying algorithms | Show you understand the algorithm, then mention Yjs/CRDTs as implementation options |

---

## 7. Extension Topics (If Time Permits)

| Topic | Key Point |
|-------|-----------|
| **Peritext (Rich Text CRDT)** | Treats formatting marks as elements in the list CRDT; solves concurrent bold/italic conflicts |
| **Fugue algorithm** | Solves the interleaving problem where concurrent inserts at the same position produce garbled text |
| **Eg-walker (2025)** | Hybrid OT/CRDT: 160,000x faster branch merging than OT, orders of magnitude less memory than CRDTs |
| **Block-based documents** | Notion model: everything is a UUID block; CRDTs operate on blocks not characters; enables mixed content (text, images, tables) |
| **Suggesting mode** | Tracked changes = operations wrapped in "suggestion" metadata; accept = remove wrapper; reject = undo operation |
| **AI integration** | AI writes to the document via the same OT pipeline; AI operations are treated like any other user's operations |
| **Notion offline** | Dynamically migrates pages to CRDT model on offline access; one of the largest production CRDT systems |

---

## 8. Quick Reference Card

```
┌────────────────────────────────────────────────────────┐
│     DOCUMENT COLLABORATION ENGINE - QUICK REFERENCE     │
├────────────────────────────────────────────────────────┤
│                                                         │
│  CORE CHALLENGE: Convergence under concurrent edits     │
│                                                         │
│  OT (Google Docs model):                                │
│  • Central server orders all operations                 │
│  • Transform(op_a, op_b) adjusts positions              │
│  • Client: optimistic apply → send → await ACK          │
│  • Server: transform → apply → persist → broadcast      │
│  • N² transform functions for rich text                 │
│                                                         │
│  CLIENT STATE MACHINE:                                  │
│  • confirmed_version: last ACKed server version         │
│  • pending_op: sent, awaiting ACK (null if idle)        │
│  • buffer_op: composed local ops during await           │
│  • Remote ops transformed against pending + buffer      │
│                                                         │
│  CONVERGENCE PROPERTIES:                                │
│  • TP1: T(op1, T(op2, op1)) == T(op2, T(op1, op2))    │
│  • TP2: for 3+ concurrent ops, consistent regardless   │
│         of transformation path                          │
│                                                         │
│  DOCUMENT STATE:                                        │
│  • Source of truth: append-only operation log            │
│  • Fast load: snapshot (every 100 ops) + replay         │
│  • Version = monotonic counter (not timestamp)          │
│                                                         │
│  PRESENCE:                                              │
│  • Ephemeral (memory only, never persisted)             │
│  • Throttled: 50ms client, 16ms server batch            │
│  • Adjusted when operations modify cursor positions     │
│                                                         │
│  COLLAB SERVICE:                                        │
│  • STATEFUL — in-memory document session                │
│  • Partitioned by doc_id (consistent hashing)           │
│  • Crash recovery: WAL + snapshot + replay              │
│                                                         │
│  SCALE NUMBERS:                                         │
│  • 200M MAU, 50M DAU                                    │
│  • 5M concurrent WebSocket connections                  │
│  • 3.5M ops/s average, 10M ops/s peak                   │
│  • 10B documents, 500TB snapshots, 2PB op logs          │
│                                                         │
│  REAL-WORLD:                                            │
│  • Google Docs: 1B MAU, Jupiter OT (1995)               │
│  • Figma: LWW CRDTs, 95% edits saved in 600ms          │
│  • Notion: Block model, CRDT for offline, 100M users    │
│  • CKEditor 5: Rich text OT took 1+ year to build      │
│  • Eg-walker (2025): Hybrid, 160,000x faster merging    │
│                                                         │
│  KEY INSIGHT: The algorithm IS the architecture.        │
│  OT/CRDT choice dictates everything else.               │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

## 9. Difficulty Calibration

| Level | Expected Depth |
|-------|---------------|
| **Junior** | Explain the problem (concurrent edits), basic architecture (WebSocket + server), mention OT or CRDT by name |
| **Mid-Level** | Walk through a transform example, explain client state machine, discuss snapshots and version history |
| **Senior** | Full OT algorithm with edge cases, rich text complexity (N² functions), stateful service scaling, crash recovery via WAL, convergence verification |
| **Staff+** | Compare OT vs CRDT with nuanced trade-offs, discuss Fugue/Peritext/eg-walker, offline reconciliation, comment anchor tracking, collaborative undo, block-based vs linear document models |
