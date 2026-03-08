# Real-Time Collaborative Editor System Design

## System Overview

A real-time collaborative editor (Notion, AFFiNE, Outline, Coda) enables multiple users to simultaneously edit block-structured documents with nested hierarchies, rich media, databases, and embedded content. Unlike linear text editors (Google Docs), block-based editors treat every element---paragraph, heading, image, table, embed---as an independently addressable, movable, and transformable block identified by a UUID. The system must guarantee convergence across all clients despite concurrent edits to both block content and block tree structure, support offline editing with automatic conflict-free merging on reconnect, and deliver multiplayer cursor presence with sub-100ms latency. Notion serves 100M+ registered users with its block-based CRDT architecture; AFFiNE has pioneered open-source CRDT-native block editors using Yjs.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Write-heavy during active sessions; read-heavy for viewing and sharing |
| **Latency Sensitivity** | Very High---every keystroke must feel local (<50ms via optimistic local application) |
| **Consistency Model** | Strong eventual consistency (CRDT convergence guarantee); intention preservation |
| **Concurrency Level** | 2-100+ simultaneous editors per document; 1000s per workspace |
| **Data Volume** | Moderate per document; massive across workspaces (block trees, operation logs, version snapshots) |
| **Architecture Model** | Block-based tree structure with CRDT-native state management |
| **Offline Support** | First-class---offline edits merge conflict-free on reconnect |
| **Complexity Rating** | **Very High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Block data model, API design, CRDT algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | CRDT engine, block tree operations, presence system |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Access control, encryption, threat model |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from a Linear Collaborative Editor (6.2)

| Aspect | Linear Editor (Google Docs) | Block-Based Editor (Notion/AFFiNE) |
|--------|----------------------------|-------------------------------------|
| **Data Model** | Flat character sequence with formatting spans | Tree of UUID-identified blocks with typed properties |
| **Operations** | Insert/delete characters, apply formatting | Insert/delete/move/nest/transform blocks + inline text edits |
| **Conflict Domain** | Character-level position conflicts | Tree-structural conflicts (concurrent move, reparent, delete ancestor) |
| **CRDT Complexity** | Sequence CRDT (RGA, YATA, Fugue) | Sequence CRDT + Tree CRDT + Map CRDT (composite) |
| **Offline Story** | Bolted on after OT design | CRDT-native from the ground up |
| **Type Flexibility** | Fixed element types | Blocks can change type without losing content/children |
| **Granularity** | Character-level sync | Block-level + character-level hybrid sync |

---

## What Makes This System Unique

1. **Composite CRDT Architecture**: A single document requires three interacting CRDT types---sequence CRDTs for text within blocks, tree CRDTs for block hierarchy, and map CRDTs for block properties---all coordinating to produce a coherent merged result.

2. **Block Tree Structural Conflicts**: Two users can concurrently move the same block to different parents, delete a block while another user adds children to it, or transform a block's type while another edits its content---each requiring distinct resolution semantics.

3. **Offline-First by Design**: Unlike OT-based systems that require a server for operation ordering, CRDT-native editors allow arbitrary-duration offline editing with guaranteed merge on reconnect---no server coordination needed during editing.

4. **Content-Aware Block Rendering**: Changing a block's type (paragraph to heading to toggle to callout) changes only the rendering behavior, not the underlying content or children---a decoupling that enables fluid editing but complicates CRDT merge semantics.

5. **Hierarchical Permissions on a Tree**: Permission inheritance flows down the block tree (page -> sub-page -> blocks), creating challenges when blocks are moved across permission boundaries during offline editing.

---

## Key Technology References

| Component | Real-World Example |
|-----------|-------------------|
| Block Model | Notion (UUID blocks), AFFiNE (BlockSuite), Outline |
| CRDT Framework | Yjs (YATA algorithm), Automerge, Loro (Fugue algorithm) |
| Rich Text CRDT | Peritext (Ink & Switch), Yjs XmlFragment |
| Tree CRDT | Kleppmann's move operation, Loro movable tree |
| Hybrid OT/CRDT | Eg-walker (Gentle & Kleppmann, EuroSys 2025) |
| Block Editor Framework | BlockSuite (@blocksuite/store), Tiptap, ProseMirror |
| Sync Protocol | Yjs sync protocol, Automerge sync protocol |
| Presence | Yjs awareness protocol, Liveblocks, PartyKit |
| Offline Storage | IndexedDB, SQLite (WASM), OPFS |

---

## Sources

- Notion Engineering Blog --- Data Model Behind Notion, Offline Architecture (2025)
- AFFiNE/BlockSuite --- Document-Centric CRDT-Native Editors
- Peritext Paper (CSCW 2022) --- Rich Text CRDTs
- Fugue Paper (Weidner & Kleppmann, 2023) --- Non-interleaving Text CRDTs
- Eg-walker Paper (Gentle & Kleppmann, EuroSys 2025) --- Hybrid OT/CRDT
- Figma Engineering Blog --- Multiplayer Technology, Code Layers with Eg-walker
- Yjs Documentation and CRDT Benchmarks (2025-2026)
- Loro CRDT Library --- Movable Trees and Rich Text
- Automerge Architecture --- JSON CRDT with Rust/WASM
- Martin Kleppmann --- CRDTs and the Quest for Distributed Consistency
- Ink & Switch --- Local-first Software Research
- Zed Editor Blog --- CRDTs for Code Editing
- Industry statistics: Notion 100M+ users (2025), AFFiNE open-source growth
