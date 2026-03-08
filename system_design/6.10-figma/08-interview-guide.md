# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Clarify** | Scope the problem | Real-time design tool? Multiplayer? Browser-based? Scale? |
| 5-10 min | **Requirements** | Core features, non-functionals | Vector rendering, multiplayer, components, < 50ms propagation |
| 10-20 min | **High-Level Design** | Architecture, data flow | WASM renderer, WebSocket multiplayer, CRDT properties, scene graph |
| 20-35 min | **Deep Dive** | 1-2 critical components | CRDT design for properties, rendering pipeline, OR component model |
| 35-42 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios | 500-user fan-out, WebGL vs DOM, CRDTs vs OT |
| 42-45 min | **Wrap Up** | Summary, extensions | Plugins, branching, AI features, design tokens |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **Property-level CRDTs, not text CRDTs**: This is NOT "Google Docs for design." The fundamental CRDT model is different. Text editors need sequence CRDTs for character ordering. Design tools need LWW registers for property values. If you approach this as a text collaboration problem, you'll overcomplicate it.

2. **Custom rendering engine is the moat**: Figma built a C++ vector engine compiled to WebAssembly with WebGL rendering. This is not "just use SVG" or "just use Canvas 2D." The rendering architecture is central to the system design, not an implementation detail.

3. **Component/instance is a non-trivial data model**: The relationship between main components and their instances with override tracking is a unique challenge. It's not inheritance. It's not just cloning. It's a merge strategy: "inherit non-overridden properties, preserve overridden ones."

4. **Spatial multiplayer differs from linear multiplayer**: In a text editor, all users share the same linear space. In a design tool, users may be on different pages or zoomed into different parts of a huge canvas. Multiplayer must be viewport-aware and spatially filtered.

### Where to Spend Most Time

In the 45-minute interview, spend **60% of the deep dive on the CRDT model and multiplayer architecture**. The key insight to demonstrate is:

- Why **LWW registers** work for design (not sequence CRDTs)
- Why **fractional indexing** works for layer order (not sequence CRDTs)
- How the **multiplayer server acts as a relay**, not a transformer
- How **offline sync works** via operation queue + CRDT convergence

The rendering pipeline is important but is better as a follow-up deep dive rather than the primary focus (unless the interviewer specifically asks about it).

### How to Approach This Specific Problem

1. **Start with "What is a design file?"**: A scene graph tree of visual nodes, each with dozens of properties (position, size, color, effects, constraints).
2. **Establish the CRDT model early**: "Each property is an independent LWW register. Concurrent edits to different properties of the same node never conflict."
3. **Draw the multiplayer architecture**: WebSocket relay server that fans out operations. Server assigns sequence numbers but does NOT transform operations.
4. **Explain why WebGL + WASM**: DOM can't handle 500K objects. Custom rendering is necessary for performance and cross-platform consistency.
5. **Show the component model**: Main → Instance with override tracking. Distinguish from text editor synced blocks.

---

## Trade-offs Discussion

### Trade-off 1: CRDTs vs OT for Design Documents

| Decision | OT | CRDT (LWW Registers) |
|----------|----|-----------------------|
| | **Pros**: Lower memory overhead; well-understood for text | **Pros**: Offline-first; property-level granularity natural fit; simple implementation |
| | **Cons**: No offline support; need transform functions per property pair; central server bottleneck | **Cons**: LWW can lose concurrent edits to same property; clock synchronization matters |
| **Recommendation** | **Choose CRDTs**: Design tools naturally decompose into independent properties. LWW is both simpler and more correct for this domain. |

### Trade-off 2: WebGL + WASM vs DOM/SVG Rendering

| Decision | DOM/SVG | WebGL + WASM (Chosen) |
|----------|---------|------------------------|
| | **Pros**: Standard web APIs; accessibility built-in; text selection; smaller bundle | **Pros**: 500K+ nodes at 60 FPS; pixel-perfect cross-platform; full control over rendering |
| | **Cons**: ~1K node limit before jank; platform-dependent text rendering; limited effects | **Cons**: Custom engine maintenance; accessibility must be rebuilt; 5MB+ WASM binary |
| **Recommendation** | **WebGL + WASM for professional tools**: The performance ceiling of DOM is too low for production design tools. |

### Trade-off 3: Server Relay vs Peer-to-Peer

| Decision | P2P (WebRTC) | Server Relay (Chosen) |
|----------|-------------|------------------------|
| | **Pros**: Lower latency (direct); no server cost for sync | **Pros**: O(N) connections (not O(N²)); centralized ordering; permission enforcement; persistence |
| | **Cons**: O(N²) connections; NAT traversal issues; no central permission check | **Cons**: One extra network hop; server is dependency for sync |
| **Recommendation** | **Server relay**: Mandatory for 500-user files. P2P possible as optimization for 2-3 user sessions. |

### Trade-off 4: Binary Scene Graph vs Structured Storage

| Decision | Relational/Structured | Binary Blob (Chosen) |
|----------|----------------------|----------------------|
| | **Pros**: SQL queries on nodes; row-level updates; flexible indexes | **Pros**: Single sequential read; 5-10x smaller; memory-mappable; fast load |
| | **Cons**: Multiple queries to reconstruct tree; row overhead; slow for large files | **Cons**: Cannot query individual nodes; full blob write for snapshots |
| **Recommendation** | **Binary blob for file storage**: File open latency is the #1 UX-critical operation. Separate search index for queryability. |

### Trade-off 5: Fractional Indexing vs Sequence CRDT for Layer Order

| Decision | Sequence CRDT | Fractional Indexing (Chosen) |
|----------|--------------|------------------------------|
| | **Pros**: Well-studied; handles concurrent inserts naturally | **Pros**: Reorder is a single property write; no tombstones; simpler |
| | **Cons**: Reorder = delete + insert (two operations); tombstone accumulation; complex | **Cons**: Precision limits after many insertions; needs periodic rebalancing |
| **Recommendation** | **Fractional indexing**: Design tools have frequent reorder (layer panel drag), rare insertions between the same pair. Fractional indexing optimizes for the common case. |

### Trade-off 6: Full Scene Graph Load vs Lazy Page Loading

| Decision | Full Load | Lazy by Page (Chosen) |
|----------|-----------|----------------------|
| | **Pros**: All pages immediately available; simpler sync | **Pros**: 10x faster initial load; lower memory usage; scale to huge files |
| | **Cons**: Multi-page files with 200K+ nodes load slowly; high memory | **Cons**: Page switch has load delay; cross-page operations need coordination |
| **Recommendation** | **Lazy page loading**: Most users work on 1-2 pages at a time. Load other pages on demand. |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| **"Why CRDTs and not OT?"** | Understand that the CRDT choice is fundamentally different for design vs text | "Design tools have property-level operations, not character-level. Each node property is an independent LWW register. This is much simpler than text CRDTs—no sequence ordering, no interleaving. OT would require N² transform functions for each property pair. CRDTs also enable offline editing natively." |
| **"How do you handle 500 simultaneous editors?"** | Test fan-out thinking | "Each operation fans out to 499 clients. We batch operations in 16ms windows, compress deltas, filter by page (multi-page files), and filter cursor updates by viewport overlap. Viewers receive at lower frequency. For the hottest files, dedicated servers with read replicas for view-only users." |
| **"How do components work at scale?"** | Test understanding of the component/instance model | "A main component is the source of truth. Instances inherit all properties but can override any of them. When the main changes, only non-overridden properties propagate. This is tracked per-property per-instance. With 500+ instances, we batch propagation as a background task and use dirty flags to skip unchanged instances." |
| **"Why not just use SVG?"** | Test rendering knowledge | "SVG elements are DOM nodes. At 500K objects, the DOM becomes the bottleneck—layout recalculation, memory per DOM node, limited compositing. Figma renders everything via WebGL from C++ compiled to WASM, bypassing DOM entirely. This enables 60 FPS with complex effects, boolean operations, and custom text rendering." |
| **"What if two users drag the same rectangle at the same time?"** | Test CRDT conflict resolution | "Both users generate `set_property(x, ...)` and `set_property(y, ...)` operations with Lamport timestamps. Since x and y are independent LWW registers, if both users change x, the latest timestamp wins. If one changes x and the other changes fill color, both apply—no conflict. The rectangle ends up at the last-writer's position. This is acceptable because the user can always undo." |
| **"How does offline work?"** | Test offline architecture | "Edits are applied locally to the WASM scene graph and queued in IndexedDB. On reconnect, the client sends queued operations; the server sends missed operations. CRDT properties merge deterministically—both sides converge. For long offline periods exceeding the queue limit, the client does a full state reload." |
| **"What happens if the multiplayer server crashes?"** | Test resilience | "The server flushes operations to the log every second. On crash, clients detect WebSocket disconnect, switch to offline mode, and continue editing locally. When a new server spins up, clients reconnect, and the sync protocol (operation replay from last known sequence) reconciles state. At most 1 second of fan-out is lost, but no client data is lost—every client has the full state." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Treating it like Google Docs | Text editors and design tools have fundamentally different CRDT models | Start with "property-level LWW registers" not "character-level sequence CRDTs" |
| Ignoring the rendering engine | The custom WebGL+WASM renderer is the core technical differentiator | Explain why DOM is insufficient; discuss scene graph → GPU pipeline |
| Using a database for real-time sync | Database writes are too slow for 50ms propagation | WebSocket + in-memory CRDT state on multiplayer server |
| Proposing SVG for rendering | SVG cannot handle 10K+ objects, let alone 500K | WebGL with custom tessellation |
| Conflating components with copy-paste | Components maintain a live link; paste does not | Explain override tracking and propagation |
| Ignoring viewport-aware multiplayer | Sending all cursor data to all users wastes bandwidth | Filter cursor updates by page + viewport overlap |
| Saying "CRDTs for everything" | Not all data needs CRDTs—file metadata, permissions, comments are standard CRUD | CRDTs only for the scene graph (real-time collaborative data) |
| Forgetting about fonts | Text rendering consistency across platforms is a hard problem | Custom WASM font rasterizer, glyph atlas, font subsetting |

---

## Follow-Up Deep Dives

### Deep Dive 1: Plugin Sandbox Security

**Prompt**: "How do you securely run third-party plugins that can modify the design?"

**Key points to cover**:
- iframe sandbox with `sandbox="allow-scripts"` (no DOM access, no cookies, no network)
- Message-passing bridge (postMessage) between plugin and main thread
- Capability-based manifest: plugins declare what they need (read/write/network)
- Rate limiting on API calls (prevent DoS from within a plugin)
- Memory and CPU limits per plugin instance
- Review process before publishing to plugin store

### Deep Dive 2: Vector Rendering Pipeline

**Prompt**: "Walk me through how a rectangle with rounded corners, a gradient fill, and a drop shadow gets rendered."

**Key points to cover**:
1. Scene graph node → properties extracted (bounds, corner radius, fill, shadow)
2. Path generation: rounded rectangle as a series of arcs and lines
3. Tessellation: convert curves to triangle mesh for GPU
4. Fill rendering: gradient shader with stop colors and positions
5. Shadow: render shape to offscreen buffer, apply Gaussian blur shader, composite
6. Final composite: blend shadow + fill + stroke in correct order

### Deep Dive 3: Component Override Resolution

**Prompt**: "A Button component changes its icon. How does every instance update correctly?"

**Key points to cover**:
- Instance stores overrides as `Map<PropertyPath, Value>`
- Changed property check: if `component_id/icon_id/name` not in overrides → propagate
- Nested components: if Button contains Icon (another component), cascade updates
- Variant swapping: changing variant preserves applicable overrides
- Detaching: breaks link, resolves all properties to concrete values
- Performance: batch propagation, dirty flags, skip unchanged instances

---

## "At 10x Scale: What Breaks First?"

| Scale Level | What Breaks | Solution |
|-------------|------------|----------|
| **10x users (40M DAU)** | Multiplayer server count; WebSocket connection management | Larger server fleet; connection pooling; smarter routing |
| **10x file complexity (5M nodes)** | Client-side rendering; WASM memory limits | Progressive loading; aggressive LOD; streaming scene graph |
| **10x concurrent editors (5000/file)** | Fan-out bandwidth; operation batching | Hierarchical fan-out (relay tree); summary operations; viewport sharding |
| **10x asset volume** | CDN bandwidth; storage costs | Better deduplication; smart compression; regional CDN edge caching |
| **10x plugin usage** | Plugin bridge becomes bottleneck; iframe overhead | Web Worker plugins (shared memory); plugin batching APIs |
| **10x offline duration** | Operation queue overflow; merge complexity | Snapshot-based sync; CRDT compaction; forced reload threshold |

---

## Questions to Ask Interviewer

| Question | Why It Matters |
|----------|---------------|
| "Is offline editing required?" | Drives CRDT vs OT decision |
| "What's the max concurrent editor count?" | Shapes fan-out strategy |
| "Browser-only or native desktop too?" | Affects rendering architecture (can use native GPU APIs if desktop) |
| "Is there a plugin ecosystem?" | Adds sandbox security as a design concern |
| "Components and design systems?" | Adds the override propagation problem |
| "What's the target latency for edit propagation?" | Shapes batching and compression decisions |
| "Cross-platform rendering consistency required?" | Justifies custom WASM rendering engine |
| "Branching and merging needed?" | Adds three-way merge for visual data |

---

## Whiteboard Diagram to Draw

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                         │
│  ┌──────────────┐  ┌────────────┐  ┌─────────────────────┐ │
│  │ WASM Engine   │  │ WebSocket  │  │ Plugin Sandbox      │ │
│  │ (Scene Graph  │  │ Client     │  │ (iframe + message   │ │
│  │  + Renderer)  │  │            │  │  passing bridge)    │ │
│  │  WebGL 2.0    │  │            │  │                     │ │
│  └──────┬───────┘  └─────┬──────┘  └──────────┬──────────┘ │
│         │  Local state    │  WebSocket          │  API calls │
│         │  (IndexedDB)    │  operations         │            │
└─────────┼─────────────────┼─────────────────────┼────────────┘
          │                 │                     │
          │    ┌────────────┴────────────┐        │
          │    │    Multiplayer Server    │        │
          │    │  ┌────────────────────┐ │        │
          │    │  │ CRDT Relay Engine  │ │        │
          │    │  │ (LWW Registers +   │ │        │
          │    │  │  Fractional Index)  │ │        │
          │    │  └─────────┬──────────┘ │        │
          │    │            │            │        │
          │    │  ┌─────────┴──────────┐ │        │
          │    │  │ Presence Broadcast  │ │        │
          │    │  │ (Cursors, viewport) │ │        │
          │    │  └────────────────────┘ │        │
          │    └────────────┬────────────┘        │
          │                 │                     │
    ┌─────┴─────┐  ┌───────┴───────┐  ┌──────────┴──────┐
    │ Scene     │  │ Operation    │  │ REST API       │
    │ Graph     │  │ Log          │  │ (files, teams, │
    │ Store     │  │ (append-only)│  │  exports)      │
    │ (binary)  │  │              │  │                │
    └───────────┘  └──────────────┘  └────────────────┘
```

---

## Quick Reference Card

### The 5-Sentence Architecture Summary

1. A Figma file is a **hierarchical scene graph** of visual nodes, each with dozens of properties (position, size, fill, effects, constraints), rendered by a custom **WebAssembly + WebGL** engine at 60 FPS.
2. Each node property is an independent **LWW (Last-Writer-Wins) register CRDT** — concurrent edits to different properties never conflict, and same-property conflicts resolve deterministically by timestamp.
3. A **multiplayer server** relays CRDT operations via WebSocket, assigning global sequence numbers for ordering but never transforming operations — convergence is guaranteed by the CRDT model.
4. **Multiplayer cursors** are ephemeral state on a separate channel, filtered by page and viewport overlap, broadcast at 10-30 Hz without persisting to the operation log.
5. **Components** maintain a live link to instances: main component changes propagate to all instances except where local overrides exist, tracked per-property per-instance.

### Key Numbers to Remember

| Metric | Value |
|--------|-------|
| Local edit latency | < 16ms (one frame) |
| Edit propagation (p50/p99) | 50ms / 200ms |
| Cursor sync latency | < 100ms |
| Max concurrent editors per file | 500 |
| Scene graph nodes (supported) | 500,000 |
| CRDT overhead per property | ~16 bytes |
| WebSocket message size (delta) | 50-500 bytes |
| WASM binary size | ~5 MB (cached) |
| Fractional index rebalance threshold | ~1000 insertions between same pair |
| Offline queue limit | 10,000 operations |
| Snapshot interval | Every 500 ops or 10 minutes |
