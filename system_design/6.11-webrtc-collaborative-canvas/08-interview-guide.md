# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Clarify** | Scope the problem | Real-time canvas (not document editor)? Infinite canvas? Scale? Offline required? |
| 5-10 min | **Requirements** | Core features, non-functionals | Shapes, connectors, freehand, multiplayer cursors, <100ms sync |
| 10-20 min | **High-Level Design** | Architecture, topology, data flow | SFU vs mesh, CRDT vs OT, ephemeral vs durable separation |
| 20-35 min | **Deep Dive** | 1-2 critical components | CRDT for spatial data, concurrent move resolution, OR infinite canvas rendering |
| 35-42 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios | 300-user boards, TURN costs, large board performance |
| 42-45 min | **Wrap Up** | Summary, extensions | AI features, video integration, mobile optimization |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **Spatial data in CRDTs**: Unlike text editors where CRDTs handle 1D sequences, canvas CRDTs handle 2D continuous coordinates. The "concurrent move" conflict has no natural resolution ordering---both positions are equally valid. This forces LWW semantics that produce visible "jumps."

2. **The infinite canvas is a scaling problem, not just a UI feature**: An unbounded coordinate plane means spatial queries (which objects are visible?) require a dynamic spatial index (R-tree), level-of-detail management, and progressive loading. This is a classic computer graphics challenge, not a typical distributed systems problem.

3. **Ephemeral vs durable state is the architectural core**: The separation of cursor positions (ephemeral, 30 Hz, tolerate loss) from shape operations (durable, 1-5 Hz, must persist) is not just an optimization---it defines the entire transport and storage architecture.

4. **WebRTC is tempting but treacherous at scale**: The promise of P2P low-latency is offset by O(n^2) connections, NAT traversal failures, and TURN server costs. Most production systems (Miro, Figma) use WebSocket as the primary transport.

5. **Drawing is streaming, not request-response**: Freehand drawing generates 60-120 pointer events per second that must be streamed to peers, smoothed into curves, and stored efficiently. This is more like a real-time video stream than a database operation.

### Where to Spend Most Time

In the 45-minute interview, spend **60% of deep dive time on two topics**:

**Topic A: CRDT design for canvas objects** (10 min)
- Why LWW-Map for properties, OR-Set for presence, Sequence CRDT for z-order
- How concurrent shape moves resolve (LWW with Lamport timestamps)
- Why connectors are derived state, not stored state

**Topic B: WebRTC vs WebSocket architecture decision** (5 min)
- Why pure mesh fails at scale (O(n^2) + NAT)
- Why TURN costs drive architecture toward WebSocket-primary
- How to offer WebRTC as progressive enhancement

### How to Approach This Specific Problem

1. **Start with the canvas object model**: "Every canvas element is an object with (x, y, width, height, rotation, type, properties)." This frames the data model.
2. **Establish the topology decision early**: "Pure P2P mesh doesn't scale past 6-8 users because of O(n^2) connections. We use server-mediated relay with WebSocket primary and optional WebRTC data channels."
3. **Separate ephemeral from durable**: "Cursors and viewports are ephemeral---not persisted, tolerate loss, 15-30 Hz. Shape operations are durable---persisted, reliable delivery, 1-5 Hz."
4. **Show the CRDT composition**: Sketch the object model and identify which CRDT type handles which aspect.
5. **Address the infinite canvas**: Explain viewport culling with R-tree spatial index and LOD for zoomed-out views.
6. **Discuss failure modes**: Concurrent moves, offline sync, large boards, TURN fallback.

---

## Trade-offs Discussion

### Trade-off 1: P2P Mesh vs SFU Relay vs WebSocket-Only

| Decision | P2P Mesh | SFU Relay | WebSocket-Only (Miro approach) |
|----------|---------|-----------|-------------------------------|
| | **Pros**: Lowest latency; no server in data path; works offline P2P | **Pros**: O(n) connections; selective forwarding; lower latency than WS | **Pros**: Simplest; universal firewall compatibility; no STUN/TURN needed |
| | **Cons**: O(n^2) connections; NAT issues; no central persistence | **Cons**: TURN costs; ICE complexity; still needs WS fallback | **Cons**: Server always in path; ~20-40ms additional latency |
| **Recommendation** | Use for 2-4 user sessions on same network. Not viable at scale | Best balance of latency and scalability for WebRTC data | Pragmatic choice for most production systems. Use WebRTC as optional enhancement |

### Trade-off 2: CRDTs vs OT for Canvas

| Decision | OT for Canvas | CRDTs for Canvas |
|----------|--------------|------------------|
| | **Pros**: Lower memory overhead; simpler for property-based updates | **Pros**: Offline-first natively; no server dependency for editing; proven convergence |
| | **Cons**: No offline support; must define transform functions for every op pair; central server bottleneck | **Cons**: Tombstone accumulation; LWW "jumps" for concurrent moves; GC complexity |
| **Recommendation** | CRDTs. Canvas objects are naturally map-like (each property independent), making CRDT composition straightforward. Offline support is essential for workshop/field use cases. |

### Trade-off 3: LWW vs Operational Transform for Concurrent Moves

| Decision | LWW (Last-Writer-Wins) | Custom Merge (Average/Negotiate) |
|----------|----------------------|----------------------------------|
| | **Pros**: Simple; deterministic; always converges; no coordination needed | **Pros**: Could preserve both users' intent; smoother UX |
| | **Cons**: Losing user sees a "jump"; one user's move is discarded | **Cons**: Averages produce positions neither user intended; complex negotiation protocol |
| **Recommendation** | LWW with smooth animation. The jump is brief and rare (requires two users dragging the same shape simultaneously). Adding complexity for a rare edge case is not worth it. |

### Trade-off 4: Derived Connectors vs Stored Connectors

| Decision | Store Connector Routes in CRDT | Derive Routes Client-Side (Chosen) |
|----------|-------------------------------|-------------------------------------|
| | **Pros**: All clients render identical routes immediately | **Pros**: No CRDT conflicts on route changes; automatic re-routing on shape move; smaller CRDT state |
| | **Cons**: Route changes on every shape move create CRDT updates; conflicts when shapes move concurrently | **Cons**: Routes may differ briefly between clients (cosmetic); requires client-side routing algorithm |
| **Recommendation** | Derive. Store only (source_id, target_id, anchor_points) in CRDT. Route is a view-layer concern, not a data concern. |

### Trade-off 5: Spatial Chunking vs Full Board Loading

| Decision | Full Board Load | Spatial Chunking |
|----------|----------------|------------------|
| | **Pros**: Simplest; single CRDT state; instant viewport changes | **Pros**: Handles 100K+ objects; lower memory; faster initial load |
| | **Cons**: Memory limit ~50K objects on desktop, ~10K on mobile | **Cons**: Cross-chunk operations complex; chunk boundary artifacts; more complex sync |
| **Recommendation** | Full load for boards <20K objects (vast majority). Spatial chunking only for boards that exceed memory limits. Keep chunking as an optimization layer, not core architecture. |

### Trade-off 6: Soft Locks vs Lock-Free Editing

| Decision | Lock-Free (LWW) | Soft Locks on Drag |
|----------|-----------------|-------------------|
| | **Pros**: Zero-latency edit; no lock acquisition overhead; simpler | **Pros**: Prevents conflicts entirely; no visual jumps; clear ownership |
| | **Cons**: Occasional visual jumps when two users drag same shape | **Cons**: Lock acquisition adds ~50ms latency; lock failures frustrate users; lock management complexity |
| **Recommendation** | Lock-free for small teams (default). Soft locks as an option for large workshops where conflict probability is high. |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not use a full mesh for WebRTC?" | Understanding of O(n^2) problem and NAT traversal | "Full mesh creates n*(n-1)/2 connections. At 20 users, that's 190 connections per room. Each requires ICE negotiation, and ~20% will fail due to symmetric NATs. An SFU reduces this to n connections and handles NAT traversal centrally." |
| "Why CRDTs for spatial data? Isn't that overkill?" | Test whether they understand the offline requirement | "CRDTs might seem heavy for a canvas, but they're actually a natural fit. Each object property (x, y, fill, etc.) is an independent LWW-Register---simpler than text CRDTs. And we get offline support as a free architectural consequence. For a workshop tool, offline is non-negotiable." |
| "How do you handle 300 simultaneous cursors?" | Test understanding of ephemeral state scaling | "Cursors are ephemeral---not persisted, sent via unreliable channel. At 300 users, naive broadcast is 300 x 15 Hz x 300 peers = 1.35M messages/sec. We mitigate with: batch broadcasts (50ms windows), viewport-based filtering (only send cursors visible in your viewport), and throttle to 5 Hz for distant cursors." |
| "What happens when someone draws while offline for 2 hours?" | Test CRDT offline merge understanding | "All drawing operations are applied to the local CRDT and persisted to IndexedDB. On reconnect, the client exchanges state vectors with the server. Only missing operations are transferred. CRDT merge is automatic---new shapes from the offline session appear alongside changes made by online users. The only conflict is if both sides modified the same object's properties (LWW resolves)." |
| "How do you render 50,000 objects without dropping frames?" | Test spatial indexing and LOD knowledge | "We never render 50,000 objects. The R-tree spatial index answers 'which objects intersect the viewport?' in O(log n + k) time. Typically k is 100-200. At low zoom, we apply LOD: text becomes gray boxes, freehand strokes become simplified paths, images show thumbnails. The rendering budget is 16ms/frame; spatial culling keeps us well within it." |
| "Why not just use SVG?" | Test understanding of canvas rendering performance | "SVG creates a DOM element per object. At 1,000+ objects, DOM overhead causes jank---layout recalculation, style computation, and repainting become bottlenecks. Canvas/WebGL gives us direct pixel control, batched draw calls, and no DOM overhead. The tradeoff is we implement our own hit testing and text rendering, but at scale it's the only viable approach." |
| "Can't you just send the whole board state on every change?" | Test understanding of delta sync | "A board with 10,000 objects is ~15 MB of CRDT state. At 3 operations/second, that's 45 MB/sec per user. With 100 users, that's 4.5 GB/sec egress. Delta sync sends only the changed bytes: typically 50-200 bytes per operation. That's a 100,000x reduction." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Choosing P2P mesh without discussing scale limits | Fails past 6-8 users; ignores NAT traversal | Start with SFU/relay; mention P2P as optimization for small rooms |
| Treating the canvas as a flat image | Ignores spatial indexing, LOD, and object-level operations | Describe object model with spatial properties and R-tree queries |
| Storing cursor positions in the CRDT | 100x write amplification; no historical value | Explicitly separate ephemeral (cursors) from durable (shapes) state |
| Using text CRDT algorithms (YATA/Fugue) for shape positions | Shape positions are independent values, not sequences | Use LWW-Map per object; reserve sequence CRDTs for z-order and stroke points |
| Ignoring the infinite canvas rendering problem | Interviewer will ask "what if there are 50,000 objects?" | Proactively discuss viewport culling, R-tree, LOD strategy |
| Describing HTTP polling for real-time updates | Wrong transport for real-time collaboration | WebSocket primary; WebRTC data channels as enhancement |
| Saying "just use a database" for state management | Misses the real-time, conflict-free merge requirement | CRDT state with operation log + snapshots for persistence |
| Conflating WebRTC media (audio/video) with WebRTC data channels | Different protocols, different use cases | Specify "WebRTC data channels" for operations/cursors; media is a separate concern |

---

## Questions to Ask Interviewer

| Question | Why It Matters |
|----------|---------------|
| "Is this for small teams (5-10) or large workshops (100+)?" | Shapes topology, cursor scaling, and conflict management strategy |
| "Is offline editing a hard requirement?" | Drives the entire CRDT vs centralized state decision |
| "What types of content? Shapes only, or also freehand, images, embeds?" | Determines complexity of object model and asset management |
| "Are there enterprise requirements (SSO, permissions, compliance)?" | Adds server-side validation, audit logging, data residency |
| "Is WebRTC specifically required, or is low-latency the actual goal?" | Many interviewers say "WebRTC" but mean "real-time"; WebSocket may suffice |
| "What's the target platform? Web only, or also native mobile/desktop?" | Affects rendering strategy (Canvas vs native) and offline storage |
| "Are connectors/auto-routing important?" | Adds significant algorithm complexity for connector path-finding |

---

## Diagram to Draw on Whiteboard

### Minimal Architecture (Draw This First)

```
┌─────────────────────────────────────────────┐
│                                             │
│   Client A          Server          Client B │
│   ┌──────┐       ┌────────┐       ┌──────┐ │
│   │Canvas│       │        │       │Canvas│ │
│   │CRDT  │──WS──▶│  CRDT  │──WS──▶│CRDT  │ │
│   │R-tree│       │  Sync  │       │R-tree│ │
│   │Local │       │ Engine │       │Local │ │
│   │Store │       │        │       │Store │ │
│   └──────┘       │ Cursor │       └──────┘ │
│       ▲          │ Relay  │          ▲      │
│       │          │        │          │      │
│       └──────────│ Op Log │──────────┘      │
│    Ephemeral:    │Snapshot│    Ephemeral:    │
│    cursors,      └────────┘    cursors,      │
│    viewport                    viewport      │
│                                             │
│    Durable:                    Durable:      │
│    shapes,                     shapes,       │
│    connectors                  connectors    │
│                                             │
└─────────────────────────────────────────────┘
```

### CRDT Composition (Draw for Deep Dive)

```
Board CRDT State
├── OR-Set ← Object presence (add/delete shapes)
│   ├── "rect-001" ✓
│   ├── "text-002" ✓
│   └── "line-003" ✗ (tombstoned)
│
├── LWW-Map per object ← Properties
│   └── "rect-001":
│       ├── x: 200 (clock: 47)
│       ├── y: 150 (clock: 47)
│       ├── fill: "#4a90d9" (clock: 42)
│       └── width: 100 (clock: 45)
│
├── Sequence CRDT ← Z-order (back to front)
│   └── ["text-002", "rect-001", "image-004"]
│
└── Sequence CRDT per stroke ← Freehand points
    └── "freehand-005": [(x1,y1), (x2,y2), ...]
```

---

## "At 10x Scale, What Breaks?"

### Current Scale → 10x Scale

| Metric | Current | 10x | What Breaks | Solution |
|--------|---------|-----|-------------|----------|
| Concurrent sessions | 500K | 5M | WebSocket servers saturated | 10x server fleet; connection pooling |
| Cursor messages/sec | 15M | 150M | Cursor relay overwhelmed | Aggressive viewport filtering; reduce to 5 Hz global |
| TURN bandwidth | 5 Gbps | 50 Gbps | TURN cost becomes $600K/month | Eliminate TURN; WebSocket-only; invest in better NAT traversal |
| Hot board participants | 300 | 3,000 | Single sync engine cannot handle fanout | Tiered broadcast: editors (real-time) + viewers (1 Hz snapshots) |
| Board object count | 50K | 500K | Client OOM; R-tree too large | Mandatory spatial chunking; server-side rendering for overview |
| Operation log daily | 15 TB | 150 TB | Storage cost; compaction speed | More aggressive snapshot frequency; shorter op retention |
| Board load time | <1s | <1s (must maintain) | More objects to load | Smarter progressive loading; precomputed viewport snapshots |

### Critical 10x Decisions

1. **Eliminate TURN entirely**: At $600K/month, TURN is not viable. Move to WebSocket-only with optional P2P for same-network peers. Invest in smart routing to minimize WebSocket hop latency.

2. **Tiered participation model**: Distinguish between editors (full CRDT sync) and viewers (periodic snapshots). At 3,000 participants, most are viewers. Serve them a snapshot that updates every 1-2 seconds instead of every operation.

3. **Server-side rendering for board overview**: Instead of sending all object data to every client, render a rasterized overview image on the server for zoomed-out views. Only load full object data when the user zooms into a region.

4. **Edge computing for cursor relay**: Deploy cursor relay servers at CDN edge locations to minimize latency. Cursor data never needs to reach the origin; it only needs to reach peers.

---

## Quick Reference Card

### The 5-Sentence Architecture Summary

1. Every canvas element is an **object with 2D spatial properties** (x, y, width, height, rotation) and type-specific attributes, managed by a **composite CRDT** (OR-Set for presence, LWW-Map for properties, Sequence CRDT for z-order and stroke points).
2. The system uses **WebSocket as the primary transport** with **optional WebRTC data channels** for lower-latency P2P connections, falling back gracefully when WebRTC is unavailable.
3. **Ephemeral state** (cursors, viewports, selections) is separated from **durable state** (shapes, connectors, text) with different transport channels, persistence, and consistency guarantees.
4. The **infinite canvas** uses an **R-tree spatial index** for viewport queries, **level-of-detail** rendering at low zoom levels, and **progressive loading** for large boards.
5. **Offline editing** works natively because CRDTs merge without server coordination; reconnection uses **state vector exchange** to sync only missing operations.

### Key Numbers to Remember

| Metric | Value |
|--------|-------|
| Local edit latency | <5ms |
| Cursor propagation (p50/p99) | 50ms / 100ms |
| Operation propagation (p50/p99) | 100ms / 500ms |
| P2P connections in mesh | n*(n-1)/2 |
| NAT traversal failure rate | ~18-22% |
| Cursor update rate | 15 Hz per user |
| R-tree query time (10K objects) | <0.1ms |
| Board CRDT state size (200 objects) | ~50 KB |
| Board CRDT state size (10K objects) | ~15 MB |
| Max concurrent editors per board | 300 |
| TURN session bandwidth | ~50 Kbps |
| Snapshot interval | Every 200 ops or 10 min |
