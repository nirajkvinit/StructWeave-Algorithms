# Figma — Real-time Design Collaboration Platform

## System Overview

Figma is a browser-based, real-time collaborative design tool where multiple designers simultaneously edit vector graphics on an infinite canvas. Unlike text-based collaborative editors that operate on linear character sequences, Figma manages a **2D scene graph** of visual objects—frames, shapes, text, images, and component instances—where every property (position, size, color, opacity, constraints, auto-layout rules) must converge across all connected clients within milliseconds. The system renders complex vector graphics at 60 FPS using a custom **WebAssembly + WebGL** rendering engine (bypassing the DOM entirely), supports **multiplayer cursors and selections** as ephemeral state overlaid on the canvas, and provides a **component/instance model** where changes to a main component propagate to hundreds of instances with local overrides preserved. With 4M+ daily active users collaborating on 50M+ files, Figma must handle up to 500 simultaneous editors per file while maintaining sub-50ms edit propagation and pixel-perfect cross-platform rendering consistency.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Write-heavy during active sessions (property changes, object creation); read-heavy for viewing, handoff, and inspection |
| **Latency Sensitivity** | Very High—every drag, resize, and color change must feel instantaneous (<16ms local, <50ms propagation) |
| **Consistency Model** | Strong eventual consistency via CRDTs; last-writer-wins for individual properties |
| **Concurrency Level** | 2–500 simultaneous editors per file; 1000s of viewers |
| **Data Volume** | Scene graphs range from KBs (simple mockup) to 100s of MBs (enterprise design systems); asset libraries in GBs |
| **Architecture Model** | Scene graph tree with CRDT-managed properties and fractional-indexed ordering |
| **Rendering** | Custom WebAssembly + WebGL pipeline (not DOM-based) |
| **Plugin Ecosystem** | Sandboxed iframe plugins with message-passing API |
| **Offline Support** | Partial—local queue with reconnect and CRDT convergence |
| **Complexity Rating** | **9/10** (combines real-time collaboration, custom rendering, and a full design system model) |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Scene graph data model, API design, CRDT algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Multiplayer sync, rendering pipeline, component overrides, CRDTs vs OT |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Sharding, asset storage, autoscaling, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Auth, plugin sandboxing, encryption, SOC2/GDPR |
| [07 - Observability](./07-observability.md) | Metrics, alerting, tracing, dashboards |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from a Text Collaborative Editor (6.8)

| Aspect | Text Editor (Notion/Google Docs) | Design Tool (Figma) |
|--------|----------------------------------|---------------------|
| **Data Model** | Linear character sequence or block tree | 2D scene graph tree with spatial properties |
| **Operations** | Insert/delete characters, format text | Move, resize, rotate, restyle any visual object |
| **Conflict Domain** | Character ordering, block reparenting | Property-level LWW on hundreds of attributes per node |
| **CRDT Complexity** | Sequence CRDT for text ordering | Map CRDT (LWW registers) for properties + fractional indexing for layer order |
| **Rendering** | DOM-based text layout | Custom WebGL/WASM vector rasterizer |
| **Undo Model** | Character-level inverse operations | Multi-property object snapshots per user |
| **Cursor Model** | 1D text cursor position | 2D (x,y) position on infinite canvas |
| **Component Reuse** | Synced blocks / templates | Main component → instance override propagation |

---

## CRDTs vs OT: Conflict Resolution Comparison

| Approach | Server Dependency | Offline Support | Memory Overhead | Convergence Guarantee | Best For |
|----------|-------------------|-----------------|-----------------|----------------------|----------|
| **OT (Operational Transform)** | Central server required for transform ordering | Limited—must queue and rebase on reconnect | Minimal | Requires correct transform functions | Linear text editors (Google Docs) |
| **Traditional CRDT (Yjs/Automerge)** | Optional—pure P2P possible | Native—merge on reconnect | 4–32 bytes/character | Mathematical guarantee | Block editors, offline-first apps |
| **LWW Register Map CRDT** | Relay server for ordering | Native—property convergence | 8–16 bytes per property per node | Last-writer-wins per property | Property-based design tools (Figma) |
| **Eg-walker (Hybrid)** | Log-based, server-assisted | Native with log replay | Near-OT levels (transient CRDT) | CRDT correctness, OT efficiency | Code editors, memory-constrained |

**Figma's approach**: LWW Register Map CRDTs for node properties + fractional indexing (not sequence CRDT) for layer ordering. This is simpler than text CRDTs because design operations are primarily property overwrites rather than sequence insertions.

---

## Multiplayer Architecture Options

| Architecture | Latency | Scalability | Complexity | Consistency |
|-------------|---------|-------------|------------|-------------|
| **Central Relay Server (Figma's approach)** | ~50ms (1 hop) | Horizontally scalable per document | Moderate | Server serializes operations |
| **Pure Peer-to-Peer (WebRTC)** | ~20ms (0 hops) | Limited by mesh connectivity | High (NAT traversal, discovery) | No central authority |
| **Hybrid (Relay + P2P fallback)** | ~30ms average | Good | Very High | Complex ordering |
| **Database Polling** | 500ms+ | Poor | Low | Eventually consistent |

**Figma's choice**: Central relay server that fans out operations to all connected clients. The server acts as an authoritative ordering point but does not transform operations—it simply relays CRDT updates that converge automatically.

---

## What Makes This System Unique

1. **Property-Level CRDTs, Not Text CRDTs**: Unlike collaborative text editors that need sequence CRDTs for character ordering, Figma uses LWW (last-writer-wins) register CRDTs for each property of each node. Two users changing the same rectangle's color resolve via timestamp; two users changing different properties of the same rectangle never conflict at all.

2. **Custom Rendering Engine in WebAssembly**: Figma bypasses the browser's DOM and CSS layout engine entirely, rendering vector graphics directly via WebGL from a C++ engine compiled to WASM. This enables pixel-perfect cross-platform consistency—the same file renders identically on every browser and OS.

3. **Component/Instance Override Model**: A main component defines the "source of truth." Instances inherit all properties but can locally override any of them. When the main component changes, only non-overridden properties propagate to instances—a merge strategy more nuanced than any standard CRDT.

4. **Fractional Indexing for Layer Order**: Rather than using a sequence CRDT for the z-order of layers (expensive for moves), Figma uses fractional indexing—assigning rational numbers between existing layers so reordering is a single property write, not a delete-and-reinsert.

5. **Spatial Multiplayer**: Unlike text editors where cursors are 1D positions in a sequence, Figma's multiplayer cursors are (x, y) coordinates on an infinite 2D canvas with zoom levels, requiring viewport-aware broadcasting to avoid sending irrelevant cursor data.

---

## Prerequisites and Related Designs

| Design | Relevance |
|--------|-----------|
| [6.2 - Google Docs (Collaborative Text Editor)](../6.2-google-docs/) | Text-based OT/CRDT collaboration — Figma's multiplayer builds on similar foundations but for 2D |
| [6.8 - Real-Time Collaborative Editor](../6.8-real-time-collaborative-editor/) | Block-based CRDT architecture — shares CRDT concepts but Figma uses property CRDTs, not sequence CRDTs |
| [6.11 - Miro/Whiteboard](../6.11-miro/) | Infinite canvas collaboration — similar spatial model but Figma adds precision vector rendering |

---

## Key Technology References

| Component | Real-World Approach |
|-----------|-------------------|
| Multiplayer Engine | Custom CRDT relay server, LiveGraph protocol |
| CRDT Type | LWW Register Maps for properties, fractional indexing for ordering |
| Rendering | C++ engine compiled to WebAssembly, WebGL 2.0 rasterization |
| Plugin System | Sandboxed iframes with postMessage API |
| Asset Storage | Object storage with global CDN, content-addressable hashing |
| Version History | Operation log with periodic snapshots |
| Component Model | Main/instance with override tracking per property |
| Offline Support | Local operation queue, CRDT convergence on reconnect |
| Desktop App | Electron wrapper with native GPU acceleration |

---

## Sources

- Figma Engineering Blog — Multiplayer Technology (Evan Wallace), How Figma's Multiplayer Technology Works
- Figma Engineering Blog — Building a Professional Design Tool on the Web (WebGL/WASM)
- Figma CTO Evan Wallace — LiveGraph Architecture Talks
- Figma Plugin API Documentation — Sandbox Model and Capabilities
- Martin Kleppmann — CRDTs and the Quest for Distributed Consistency
- Ink & Switch — Local-first Software Research
- Fractional Indexing Paper (Attiya et al.) — Collaborative Ordering Without Sequence CRDTs
- Industry statistics: Figma 4M+ DAU (2025), $12.5B valuation, acquired by Adobe (blocked), independent since 2024
