# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        direction LR
        WA["Web App<br/>(WASM + WebGL)"]
        DT["Desktop App<br/>(Electron + GPU)"]
        MB["Mobile Viewer<br/>(WebView)"]
    end

    subgraph Edge["Edge & Gateway"]
        direction LR
        LB["Load Balancer<br/>L7 Sticky Sessions"]
        AG["API Gateway<br/>REST + GraphQL"]
        WG["WebSocket Gateway<br/>Connection Manager"]
    end

    subgraph Multiplayer["Multiplayer Layer"]
        direction LR
        MS["Multiplayer Server<br/>CRDT Relay + Ordering"]
        PS["Presence Server<br/>Cursors + Selections"]
        CS["Conflict Resolver<br/>Branch Merge Engine"]
    end

    subgraph Core["Core Services"]
        direction LR
        DS["Document Service<br/>File CRUD + Metadata"]
        CM["Component Service<br/>Library + Instances"]
        VH["Version History<br/>Snapshots + Restore"]
        PR["Prototype Engine<br/>Interactions + Flows"]
        PL["Plugin Runtime<br/>Sandbox Manager"]
        AI["AI Service<br/>Layout + Generation"]
    end

    subgraph Data["Data Layer"]
        direction LR
        SG[("Scene Graph Store<br/>(Binary Blob)")]
        OL[("Operation Log<br/>(Append-only)")]
        RC[("Cache<br/>(Hot Documents)")]
        MD[("Metadata DB<br/>(Relational)")]
        SE[("Search Index<br/>(Full-text)")]
    end

    subgraph Assets["Asset Layer"]
        direction LR
        AS[("Object Storage<br/>(Images + Fonts)")]
        CDN["CDN<br/>Global Edge Cache"]
    end

    WA & DT & MB --> LB
    LB --> AG & WG
    WG --> MS & PS
    AG --> DS & CM & VH & PR & PL & AI
    MS --> CS
    MS --> OL & RC
    DS --> SG & MD
    CM --> MD & SG
    VH --> OL & SG
    PL --> DS
    AI --> DS
    DS --> AS
    AS --> CDN
    SE -.-> MD

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef multiplayer fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef service fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef asset fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class WA,DT,MB client
    class LB,AG,WG edge
    class MS,PS,CS multiplayer
    class DS,CM,VH,PR,PL,AI service
    class SG,OL,RC,MD,SE data
    class AS,CDN asset
```

---

## Key Architectural Decisions

### 1. CRDTs (Not OT) for Conflict Resolution

**Decision: LWW Register Map CRDTs with fractional indexing**

| Factor | OT Approach | CRDT Approach (Chosen) |
|--------|-------------|------------------------|
| Offline editing | Requires server rebase on reconnect | Native—merge on reconnect |
| Property conflicts | Transform functions per property pair | LWW per property—simple, correct |
| Layer ordering | Sequence transforms (complex) | Fractional indexing (single property write) |
| Server role | Central transform authority | Relay + ordering (no transformation) |
| Memory overhead | Minimal | ~16 bytes per property per node (acceptable) |
| Convergence proof | Must verify per property type | Mathematical guarantee (LWW + causal ordering) |

**Rationale**: Design tool operations are predominantly property overwrites (change color, move position, resize). Unlike text editors where character ordering is critical, design tools need property-level conflict resolution. LWW registers are the simplest correct solution—when two users change the same property, the last write wins. When they change different properties of the same node, both writes are preserved. This dramatically simplifies the CRDT model compared to text editors.

### 2. WebGL + WebAssembly (Not DOM-Based Rendering)

**Decision: Custom C++ rendering engine compiled to WebAssembly**

| Factor | DOM/SVG Rendering | WebGL + WASM (Chosen) |
|--------|-------------------|------------------------|
| Performance ceiling | ~1,000 DOM elements before jank | 500,000+ objects at 60 FPS |
| Cross-platform consistency | Browser-dependent text rendering | Pixel-perfect across all platforms |
| Vector operations | Limited to SVG path spec | Custom boolean ops, gradients, blur |
| Memory layout | JS heap, GC pauses | Linear WASM memory, no GC |
| GPU utilization | Indirect via compositor | Direct WebGL draw calls |
| Development cost | Low (standard web APIs) | Very High (custom engine) |

**Rationale**: A professional design tool requires rendering hundreds of thousands of vector objects with effects (shadows, blur, gradients, blend modes) at interactive frame rates. The DOM was designed for document layout, not 2D graphics rendering. By compiling a C++ vector engine to WASM and rendering via WebGL, Figma achieves native-app performance in the browser while guaranteeing that the same file looks identical on every platform—critical for design handoff.

### 3. Scene Graph (Not Flat Object List)

**Decision: Hierarchical scene graph tree**

```
File
├── Page 1
│   ├── Frame "Header" (auto-layout)
│   │   ├── Text "Logo"
│   │   ├── Frame "Nav" (auto-layout)
│   │   │   ├── Text "Home"
│   │   │   ├── Text "About"
│   │   │   └── Text "Contact"
│   │   └── Component Instance "Avatar"
│   ├── Frame "Hero Section"
│   │   ├── Rectangle "Background"
│   │   ├── Text "Headline"
│   │   └── Component Instance "CTA Button"
│   └── ...
└── Page 2
    └── ...
```

**Why a tree, not a flat list**:
- **Parent-child relationships** enable auto-layout, constraints, clipping, and masking
- **Frame nesting** models real UI hierarchy (components contain sub-components)
- **Spatial queries** are efficient via tree traversal (only traverse visible subtrees)
- **Component instances** inherit from main components via tree structure
- **Permissions** can inherit down the tree (page-level access control)

### 4. Multiplayer: Server as Authoritative Relay

**Decision: Central relay server per document, not peer-to-peer**

```
Client A ──WebSocket──> Multiplayer Server ──WebSocket──> Client B
   │                          │                              │
   │                          ├── Assign sequence numbers    │
   │                          ├── Persist to operation log   │
   │                          └── Broadcast to all peers     │
   │                                                         │
   └── Apply locally first ──────────────────────── Apply locally
       (optimistic)                                 (remote merge)
```

- **Server assigns global ordering** (sequence numbers) to all operations
- **Server does NOT transform operations**—CRDTs converge regardless of order
- **Server persists operations** to the operation log for durability
- **Clients apply operations optimistically** before server acknowledgment
- **Server routes to the correct document's session**—sticky routing by file ID

### 5. Presence: Ephemeral Channel, Separate from Document State

**Decision: Cursor/selection data uses a separate, non-persistent broadcast channel**

| Aspect | Document Operations | Presence Data |
|--------|---------------------|---------------|
| Persistence | Durable (operation log) | Ephemeral (in-memory only) |
| Consistency | Strong eventual (CRDT) | Best-effort (last value wins) |
| Update frequency | 1-5 ops/sec per user | 10-30 updates/sec per user |
| Failure mode | Must not lose data | Stale cursor is acceptable |
| Bandwidth | Priority delivery | Throttled, sampled |
| Scope | All operations to all clients | Viewport-filtered |

**Rationale**: Cursor movements generate 10-30x more messages than actual document edits. Mixing them into the operation log would waste 97% of storage on data with zero historical value. Separate channels allow independent throttling, quality-of-service, and failure handling.

### 6. Storage: Binary Scene Graph + Operation Log

**Decision: Dual storage—binary blob for current state, append-only log for history**

```
Time ──────────────────────────────────────────────>
│ Snapshot S1 │ op op op op │ Snapshot S2 │ op op  │
│ (full scene │ (incremental│ (full scene │ (delta)│
│  graph blob)│  deltas)    │  graph blob)│        │
```

- **Scene graph blob**: Complete binary-encoded scene graph for fast file loading
- **Operation log**: Append-only stream of CRDT operations for sync, history, and undo
- **Snapshot cadence**: Every 500 operations or 10 minutes (whichever comes first)
- **Loading**: Fetch latest snapshot → replay subsequent operations → ready
- **Version history**: Browse operation log; restore by replaying to a specific point

### 7. Plugin Sandbox: iframe Isolation

**Decision: Run plugins in sandboxed iframes with message-passing API**

```
┌─────────────────────────────────┐
│ Main Thread (WASM Renderer)     │
│  ├── Scene Graph (WASM heap)    │
│  ├── Plugin Bridge              │
│  │    ├── postMessage() ←──┐    │
│  │    └── onMessage()  ────┤    │
│  └── Capability Checker    │    │
└────────────────────────────┤────┘
                             │
┌────────────────────────────┤────┐
│ Plugin iframe (sandboxed)  │    │
│  ├── Plugin Code           │    │
│  ├── Figma Plugin API      │    │
│  │    ├── figma.root       │    │
│  │    ├── figma.currentPage│    │
│  │    └── figma.createXxx()│    │
│  └── postMessage() ────────┘    │
└─────────────────────────────────┘
```

- **Full isolation**: Plugin code cannot access the main thread's memory, DOM, or network
- **Capability-based API**: Plugins declare required permissions in manifest (read-only, read-write, network access)
- **Message passing**: All plugin operations go through an async message bridge
- **Resource limits**: CPU time limits, memory caps, rate limiting on API calls

---

## Data Flow

### Opening a File

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client (WASM)
    participant LC as Local Cache
    participant AG as API Gateway
    participant DS as Document Service
    participant SG as Scene Graph Store
    participant RC as Cache
    participant WG as WebSocket Gateway
    participant MS as Multiplayer Server

    U->>C: Click file link
    C->>LC: Check local cache
    alt Cached locally
        LC->>C: Return cached scene graph
        C->>C: Render canvas (instant)
    else Not cached
        C->>AG: GET /files/{file_id}
        AG->>DS: Fetch file metadata + scene graph
        DS->>RC: Check hot cache
        alt Cache hit
            RC->>DS: Return scene graph blob
        else Cache miss
            DS->>SG: Load scene graph from storage
            SG->>DS: Return binary blob
            DS->>RC: Populate cache
        end
        DS->>C: Return scene graph + metadata
        C->>C: Parse binary → WASM scene graph
        C->>C: Render canvas
        C->>LC: Cache locally
    end
    C->>WG: Open WebSocket (file_id, auth_token)
    WG->>MS: Join multiplayer session
    MS->>C: Send missed operations (since snapshot)
    MS->>C: Send current presence states
    C->>C: Merge missed ops, show collaborator cursors
```

### Making an Edit (Real-Time Collaboration)

```mermaid
sequenceDiagram
    participant UA as User A
    participant CA as Client A
    participant MS as Multiplayer Server
    participant OL as Operation Log
    participant CB as Client B
    participant UB as User B

    UA->>CA: Drag rectangle (x: 100→200)
    CA->>CA: Apply locally (instant render)
    CA->>MS: Send operation: {node_id, prop: "x", value: 200, timestamp: T1}
    MS->>MS: Assign sequence number (seq: 4287)
    MS->>OL: Append operation (durable)
    MS->>CB: Broadcast: {seq: 4287, node_id, prop: "x", value: 200, origin: UserA}
    CB->>CB: Apply remote operation
    CB->>CB: LWW merge (T1 > local timestamp → accept)
    CB->>CB: Re-render affected node
    UB->>UB: Sees rectangle move to x:200

    Note over UA,UB: Concurrent edit scenario
    UB->>CB: Change same rectangle color to red
    CB->>CB: Apply locally (instant)
    CB->>MS: Send: {node_id, prop: "fill", value: "red", timestamp: T2}
    MS->>CA: Broadcast fill change
    CA->>CA: Apply (different property → no conflict)
    Note over CA,CB: Both clients converge:<br/>x=200, fill=red
```

### Plugin Execution Flow

```mermaid
sequenceDiagram
    participant U as User
    participant M as Main Thread
    participant PB as Plugin Bridge
    participant PI as Plugin iframe

    U->>M: Run plugin "Auto Layout Grid"
    M->>PI: Load plugin code in sandbox
    PI->>PB: figma.currentPage.selection
    PB->>M: Read scene graph (selection nodes)
    M->>PB: Return serialized node data
    PB->>PI: Return node proxies

    PI->>PI: Compute grid layout
    PI->>PB: figma.createFrame()
    PB->>M: Validate capability (create permission)
    M->>M: Create frame node in scene graph
    M->>PB: Return new node reference
    PB->>PI: Return frame proxy

    PI->>PB: frame.appendChild(selection[0])
    PB->>M: Reparent node
    M->>M: Update scene graph (triggers CRDT op)
    M->>PB: Acknowledge

    PI->>PB: figma.closePlugin()
    M->>M: Batch all changes as single undo group
    M->>M: Broadcast CRDT operations to multiplayer
```

---

## Architecture Pattern Checklist

- [x] **Sync vs Async**: WebSocket for real-time multiplayer (async push); REST/GraphQL for file metadata (sync request-response)
- [x] **Event-driven vs Request-response**: Event-driven for canvas edits (operation stream); request-response for file CRUD, exports
- [x] **Push vs Pull**: Push for real-time edits and presence; pull for file load, version history, search
- [x] **Stateful vs Stateless**: Multiplayer servers are stateful (hold active document sessions in memory); API servers are stateless
- [x] **Read-heavy vs Write-heavy**: Write-heavy during editing (2+ ops/sec per user); read-heavy for viewing/inspection/handoff
- [x] **Real-time vs Batch**: Real-time for edits and presence; batch for export rendering, search indexing, thumbnail generation
- [x] **Edge vs Origin**: Client-side WASM rendering for zero-latency visual updates; server for persistence, sync, and collaboration
- [x] **Thick client vs Thin client**: Thick client—all rendering, CRDT merge, and interaction logic runs in the browser's WASM engine

---

## Component Responsibilities

| Component | Responsibility | Scaling Strategy |
|-----------|---------------|-----------------|
| **WebSocket Gateway** | Connection management, auth, routing to correct multiplayer server | Horizontal (L7 load balancer, sticky by file ID) |
| **Multiplayer Server** | CRDT operation relay, sequence assignment, broadcast to peers | Horizontal (sharded by file ID, 1 server per active file) |
| **Presence Server** | Cursor positions, selections, viewport awareness, follow mode | Horizontal (pub/sub, ephemeral state) |
| **Document Service** | File CRUD, metadata, permissions, sharing settings | Stateless, horizontally scaled |
| **Component Service** | Team libraries, component publishing, instance tracking | Stateless, cache-heavy |
| **Version History** | Snapshot management, operation log browsing, restore | Background workers, scaled by queue depth |
| **Plugin Runtime** | Sandbox lifecycle, capability enforcement, resource limits | Per-client (plugins run in user's browser) |
| **Rendering Engine** | Vector rasterization, text layout, effects | Client-side only (WASM + WebGL) |
| **Scene Graph Store** | Binary scene graph blob storage and retrieval | Object storage with tiered caching |
| **Operation Log** | Append-only operation persistence, replay | Partitioned by file ID |
| **CDN** | Static assets, WASM binary, images, fonts | Global edge network |
| **AI Service** | Layout suggestions, content generation, image generation | GPU-backed inference servers |
