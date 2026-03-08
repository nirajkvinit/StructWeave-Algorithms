# WebRTC Collaborative Canvas --- Miro/Excalidraw Architecture

## System Overview

A WebRTC collaborative canvas (Miro, Excalidraw, FigJam, tldraw) enables multiple users to simultaneously draw, annotate, and organize visual content on a shared infinite canvas with real-time cursor synchronization. Unlike text-based collaborative editors, canvas collaboration operates in two-dimensional spatial space where objects have positions, dimensions, rotation, z-ordering, and visual rendering properties. The system must handle concurrent drawing operations (freehand strokes, shape placement, connector routing), synchronize ephemeral state (cursors, selections, viewport positions) with sub-100ms latency, manage an infinite coordinate plane with spatial indexing, and support offline editing with conflict-free merging via CRDTs. Miro serves 80M+ users across 200K+ organizations; Excalidraw processes millions of collaborative sessions monthly as an open-source whiteboard; tldraw has pioneered CRDT-native canvas editing with its own sync engine.

The core challenge that differentiates canvas collaboration from text collaboration is the **spatial dimension**: objects exist in continuous 2D space rather than a linear sequence, concurrent moves of the same object produce visible visual conflicts (not just textual ones), and the infinite canvas itself is a scalability problem---users can zoom from a single sticky note to a board with 50,000+ objects spanning millions of coordinate units.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Write-heavy during active sessions (drawing, moving); read-heavy for viewing shared boards |
| **Latency Sensitivity** | Very High---cursor positions must feel real-time (<50ms local, <100ms remote); drawing strokes must render immediately |
| **Consistency Model** | Strong eventual consistency (CRDT convergence); ephemeral state tolerates best-effort delivery |
| **Concurrency Level** | 2-300 simultaneous editors per board; 1000s of viewers; millions of boards globally |
| **Data Volume** | Moderate per board (KBs to MBs of object data); massive in aggregate (10B+ objects, petabytes of assets) |
| **Architecture Model** | Hybrid SFU-relay with CRDT state synchronization; separate ephemeral and durable channels |
| **Offline Support** | First-class---local CRDT state enables offline editing with guaranteed merge on reconnect |
| **Complexity Rating** | **Very High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Canvas object model, API design, CRDT algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | WebRTC signaling, infinite canvas, freehand drawing, connector routing |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Sharding, snapshotting, multi-region, CDN, graceful degradation |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Authentication, authorization, guest access, compliance |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from a Text-Based Collaborative Editor (6.8)

| Aspect | Text Editor (Notion/Google Docs) | Canvas Editor (Miro/Excalidraw) |
|--------|----------------------------------|----------------------------------|
| **Data Model** | Linear character sequence or block tree | 2D spatial objects with (x, y, width, height, rotation) |
| **Coordinate System** | 1D positions (character offsets) | Continuous 2D plane with floating-point coordinates |
| **Operations** | Insert/delete characters, move blocks | Create/move/resize/rotate/connect shapes, freehand drawing |
| **Conflict Domain** | Position conflicts in sequences | Spatial conflicts (two users drag same shape) |
| **CRDT Complexity** | Sequence CRDT + Tree CRDT | Map CRDT (properties) + Set CRDT (presence) + Sequence CRDT (z-order, stroke points) |
| **Viewport** | Vertical scroll through document | 2D pan + zoom across infinite plane |
| **Rendering** | DOM/text layout engine | Canvas/WebGL 2D graphics rendering |
| **Ephemeral State** | Cursor position (1D) | Cursor position (2D) + viewport bounds + selection highlights |
| **Asset Handling** | Inline images/embeds | Images, PDFs, videos, embedded frames, sticky notes |
| **Scale Bottleneck** | Document length, operation log size | Object count per board, rendering performance, spatial queries |

---

## WebRTC Topology Options

A key architectural decision for collaborative canvas is the network topology for real-time data exchange.

| Topology | How It Works | Pros | Cons | When to Use |
|----------|-------------|------|------|-------------|
| **Full Mesh (P2P)** | Every peer connects to every other peer directly | Lowest latency; no server cost; works offline | O(n^2) connections; NAT traversal issues; no central state | 2-4 users, same network |
| **SFU (Selective Forwarding Unit)** | Peers send to server; server forwards selectively | O(n) connections; selective relay; scales to ~50 peers | Server infrastructure cost; single point of failure | 5-50 users, cross-network |
| **MCU (Multipoint Control Unit)** | Server receives, mixes/composites, sends single stream | Single downstream stream per client; works on low-bandwidth | High server CPU; latency from processing; complex server | Audio/video mixing (not ideal for canvas) |
| **Hybrid SFU + WebSocket** | WebRTC data channels via SFU for operations; WebSocket fallback | Best of both; graceful degradation; firewall-friendly | Two transport paths; complexity | **Production choice for canvas** |

---

## CRDT Approaches for Canvas Operations

| CRDT Type | Canvas Use Case | How It Works |
|-----------|----------------|--------------|
| **LWW-Register** | Object properties (position, size, color, rotation) | Last-Writer-Wins by Lamport timestamp; concurrent property changes resolve to latest |
| **LWW-Map** | Per-object property map | Map of key -> LWW-Register; each property independently mergeable |
| **OR-Set (Observed-Remove Set)** | Object presence on canvas (add/delete objects) | Add wins over concurrent remove; tombstoned deletes merge cleanly |
| **RGA/LSEQ (Sequence CRDT)** | Freehand stroke point sequences; z-order lists; text in shapes | Ordered sequence with unique IDs per element; handles concurrent inserts |
| **Counter CRDT** | Vote counts, reaction counts on sticky notes | Increment-only or PN-Counter for collaborative counting |

---

## Algorithm Comparison: OT vs CRDT for Canvas

| Factor | OT for Canvas | CRDT for Canvas (Chosen) |
|--------|--------------|--------------------------|
| Offline drawing | Requires server rebase; complex for 2D ops | Native---merge on reconnect |
| Concurrent shape moves | Transform functions for 2D coordinates | LWW-Register per property; last mover wins |
| Server dependency | Central server required | Server-assisted but not required |
| Memory overhead | Minimal | Moderate (tombstones, metadata per object) |
| Object deletion | Server resolves immediately | Tombstones until GC |
| Freehand strokes | Must transform point sequences | Sequence CRDT handles concurrent stroke edits |
| Implementation | Custom transform functions for every op pair | Composable CRDT types |

---

## Related Designs

| Design | Relationship |
|--------|-------------|
| [6.8 - Real-Time Collaborative Editor](../6.8-real-time-collaborative-editor/00-index.md) | Shares CRDT sync patterns; differs in spatial vs linear data model |
| [6.9 - GitHub](../6.9-github/00-index.md) | Version control concepts; branching/merging parallels |
| [6.10 - Real-Time Gaming](../6.10-real-time-gaming/00-index.md) | Shares low-latency state sync; similar interpolation/prediction techniques |
| 12.8 - WebRTC Infrastructure | Signaling, STUN/TURN, data channel architecture |

---

## What Makes This System Unique

1. **2D Spatial CRDT**: Unlike text CRDTs that operate on a 1D sequence, canvas CRDTs must handle continuous 2D coordinates where "concurrent move" means two users dragging the same shape to different (x, y) positions---a conflict domain that has no natural ordering.

2. **Ephemeral vs Durable State Separation**: Cursor positions, viewport bounds, and live selection highlights update 30+ times per second but have zero historical value. Shape positions, colors, and connections update infrequently but must be durable. These two state categories demand fundamentally different transport, persistence, and consistency guarantees.

3. **Infinite Canvas as a Scaling Problem**: The coordinate plane is unbounded, objects can be placed at any (x, y), and users can zoom from 0.1x to 10x. This creates a spatial indexing challenge: "which objects are visible in this viewport?" must be answered in <1ms for smooth panning, requiring an R-tree or quadtree that itself must be synchronized across clients.

4. **WebRTC Data Channels as a Transport Layer**: Unlike WebSocket-only editors, canvas collaboration can leverage WebRTC data channels for lower-latency, peer-assisted delivery---but must handle NAT traversal failures, TURN fallback, and the O(n^2) connection problem for large rooms.

5. **Freehand Drawing as a Streaming Problem**: A user drawing a freehand stroke generates 60+ point events per second that must be streamed to all participants in real-time, smoothed into Bezier curves, and stored as a CRDT sequence---all while maintaining sub-frame rendering latency.

---

## Key Technology References

| Component | Real-World Example |
|-----------|-------------------|
| Canvas Rendering | HTML5 Canvas, WebGL, OffscreenCanvas, PixiJS |
| CRDT Framework | Yjs, Automerge, Loro, tldraw sync engine |
| WebRTC Stack | libwebrtc, Pion (Go), mediasoup, LiveKit |
| Spatial Index | R-tree, Quadtree, spatial hashing |
| Vector Graphics | SVG path data, Bezier curves, Path2D API |
| Offline Storage | IndexedDB, OPFS (Origin Private File System) |
| Asset Processing | Sharp (image resizing), PDF.js, ffmpeg (video thumbnails) |
| Export | SVG generation, Canvas-to-PNG rasterization, PDFKit |

---

## Sources

- Miro Engineering Blog --- Scaling Real-Time Collaboration, Canvas Architecture
- Excalidraw Architecture --- Open-source collaborative whiteboard, CRDT sync
- tldraw Engineering --- CRDT-native canvas, sync engine design
- Figma Engineering Blog --- Multiplayer technology, CRDTs at scale
- Yjs Documentation --- CRDT library used by Excalidraw and tldraw
- WebRTC Standards (RFC 8825, RFC 8831) --- Data Channels, ICE Framework
- Kleppmann et al. --- CRDTs and the Quest for Distributed Consistency
- Ink & Switch --- Local-first Software, Peritext, Automerge
- R-tree Paper (Guttman, 1984) --- Spatial indexing for 2D queries
- LiveKit Architecture --- Open-source WebRTC SFU
