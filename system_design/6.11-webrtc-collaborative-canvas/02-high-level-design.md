# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        direction LR
        WA[Web App<br/>Canvas/WebGL Renderer]
        DA[Desktop App<br/>Electron/Tauri]
        MA[Mobile App<br/>Native Canvas]
    end

    subgraph Edge["Edge & Gateway"]
        direction LR
        LB[Load Balancer<br/>L7 Sticky Sessions]
        AG[API Gateway<br/>REST + GraphQL]
        WSG[WebSocket Gateway<br/>Connection Manager]
    end

    subgraph RTC["Real-Time Collaboration Layer"]
        direction LR
        SIG[Signaling Server<br/>ICE/SDP Exchange]
        CSE[CRDT Sync Engine<br/>Board State Manager]
        CRS[Cursor Relay Server<br/>Ephemeral Broadcast]
    end

    subgraph Services["Application Services"]
        direction LR
        BS[Board Service<br/>CRUD, Permissions]
        PS[Persistence Service<br/>Snapshot + Op Log]
        AS[Asset Service<br/>Upload, Process, Serve]
        ES[Export Service<br/>PNG/SVG/PDF Render]
        SS[Search Service<br/>Full-text Index]
    end

    subgraph Data["Data Layer"]
        direction LR
        DB[(Board DB<br/>Metadata + Permissions)]
        OL[(Operation Log<br/>Append-only Store)]
        KV[(Cache<br/>Hot Board State)]
        BL[(Object Storage<br/>Images, Assets)]
        SI[(Search Index<br/>Full-text)]
        CDN[CDN<br/>Asset Delivery]
    end

    subgraph TURN["WebRTC Infrastructure"]
        direction LR
        STUN[STUN Server<br/>NAT Discovery]
        TR[TURN Relay<br/>Media Relay]
    end

    subgraph Local["Client-Side Storage"]
        direction LR
        IDB[(IndexedDB/OPFS<br/>Offline CRDT State)]
    end

    WA & DA & MA --> LB
    LB --> AG & WSG
    WSG --> CSE & CRS
    AG --> BS & AS & ES & SS

    CSE --> PS
    PS --> OL & KV
    BS --> DB
    AS --> BL & CDN
    ES --> BL
    SS --> SI

    CSE --> SIG
    SIG --> STUN & TR
    CRS --> KV

    WA & DA & MA -.-> IDB
    WA & DA & MA -.-> STUN

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef rtc fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef service fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef webrtc fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef local fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class WA,DA,MA client
    class LB,AG,WSG edge
    class SIG,CSE,CRS rtc
    class BS,PS,AS,ES,SS service
    class DB,OL,KV,BL,SI,CDN data
    class STUN,TR webrtc
    class IDB local
```

---

## Key Architectural Decisions

### 1. WebRTC Topology: Server-Mediated (SFU-Style) Not Pure P2P

**Decision: Hybrid SFU relay for operations with WebSocket fallback**

| Factor | Pure P2P Mesh | SFU-Style Relay (Chosen) |
|--------|--------------|--------------------------|
| Connection count | O(n^2) per room | O(n) per room |
| NAT traversal | Each pair needs ICE; ~20% fail | Server handles all; 100% reachability |
| TURN cost | Each pair may need TURN | Single TURN hop to server |
| Permission enforcement | Cannot enforce server-side | Server validates every operation |
| Persistence | No central state; relies on peers | Server persists to operation log |
| Late joiners | Must sync from arbitrary peer | Server provides authoritative state |
| Scale limit | Practical max ~6-8 peers | Tested to 300+ peers |

**Rationale**: Pure WebRTC mesh fails at scale because connection count grows quadratically and NAT traversal is unreliable. For a canvas with 50+ editors, the server must mediate. However, we use WebRTC data channels between the client and the SFU relay for lower latency than WebSocket where possible, with WebSocket as a universal fallback.

**Architecture**:

```
Client A ──WebRTC DataChannel──> SFU Relay ──WebRTC DataChannel──> Client B
   │                                │
   │ (fallback)                     │
   └───WebSocket──────────────> WS Gateway ──WebSocket──────────> Client B
```

### 2. CRDT-Native for Canvas State

**Decision: CRDT with composable types for all canvas objects**

| Factor | Centralized Server State | CRDT (Chosen) |
|--------|-------------------------|---------------|
| Offline drawing | Read-only or queue operations | Full read/write; merge on reconnect |
| Concurrent moves | Server arbitrates; one wins immediately | Both apply; LWW resolves deterministically |
| Conflict resolution | Server decides; losers must retry | Automatic; all replicas converge |
| Server dependency | Required for every operation | Optional; aids persistence and fanout |
| Complexity | Lower | Higher (CRDT library + state management) |
| Convergence guarantee | N/A (server is authoritative) | Mathematically proven |

**Rationale**: Canvas workflows frequently involve offline scenarios (workshops on conference Wi-Fi, airplane editing, field work). OT-based approaches cannot support offline editing for spatial operations. CRDTs provide convergence guarantees that work naturally for the property-based canvas object model (each object is a map of independently mergeable properties).

### 3. Separation of Ephemeral vs Durable State

**Decision: Two distinct channels with different guarantees**

This is a foundational architectural pattern:

| State Category | Examples | Channel | Persistence | Consistency | Update Rate |
|---------------|----------|---------|-------------|-------------|-------------|
| **Durable** | Object positions, shapes, text, connectors, colors | Reliable (WebSocket/WebRTC ordered) | Operation log + snapshots | Strong eventual | 1-5 ops/sec/user |
| **Ephemeral** | Cursor positions, viewport bounds, selections, typing indicators | Unreliable (WebRTC unordered or UDP-like) | Not persisted | Best-effort | 15-30 updates/sec/user |

**Rationale**: Mixing cursor data (30 Hz, no historical value) with shape operations (1-5 Hz, must be durable) creates a 10-30x write amplification in the operation log with zero benefit. Ephemeral state tolerates packet loss (a 200ms-old cursor position is still useful), while durable state requires reliable delivery. Different transports for different guarantees.

### 4. Dual Data Channel Architecture

**Decision: Reliable + unreliable WebRTC data channels**

```
Client ──> SFU Relay
    ├── Reliable Data Channel (SCTP ordered)
    │   └── CRDT operations (shape create, move, delete, property changes)
    │
    └── Unreliable Data Channel (SCTP unordered, no retransmit)
        └── Cursor positions, viewport bounds, selection state
```

WebRTC data channels support configurable reliability. We use:

- **Reliable, ordered channel**: For CRDT operations that must be delivered exactly once and in order. Equivalent to TCP semantics.
- **Unreliable, unordered channel**: For cursor positions where the latest update supersedes all previous ones. Equivalent to UDP semantics. Reduces head-of-line blocking and latency.

### 5. Offline-First with Local CRDT State

**Decision: Full local CRDT replica with periodic sync**

```
Online:
  User Edit → Local CRDT → Render → Send to Server → Server Broadcasts

Offline:
  User Edit → Local CRDT → Render → Persist to IndexedDB
  (no network needed; full editing capability preserved)

Reconnect:
  Exchange state vectors → Send/receive missing operations → Converge
```

- Client maintains a complete CRDT replica of every open board in IndexedDB/OPFS
- All edits apply locally first (zero-latency rendering) then sync
- Offline edits accumulate in the local CRDT; merge is automatic on reconnect
- State vector exchange ensures only missing operations are transferred

### 6. Storage: Operation Log + Periodic Snapshots

**Decision: Event sourcing with compaction**

```
Time ────────────────────────────────────────────────>
│ Snapshot │ op op op op op │ Snapshot │ op op op │
│  (full   │ (CRDT deltas)  │  (full   │ (deltas) │
│  state)  │                │  state)  │          │
```

- Every CRDT operation is appended to an immutable log (partitioned by board_id)
- Periodic snapshots capture full CRDT state (every 200 operations or 10 minutes)
- Loading a board: load latest snapshot + replay subsequent operations
- Old operations retained for version history but compacted after 30 days
- Snapshots stored in object storage; hot snapshots cached in key-value store

---

## Data Flow

### Opening a Board

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant L as Local Store<br/>(IndexedDB)
    participant AG as API Gateway
    participant BS as Board Service
    participant KV as Cache
    participant CSE as CRDT Sync Engine

    U->>C: Navigate to board
    C->>L: Check local cache
    alt Board cached locally
        L->>C: Return cached CRDT state
        C->>C: Render canvas immediately
        C->>CSE: Connect + send state vector
        CSE->>C: Send missing operations (delta)
        C->>C: Merge + re-render changes
    else Board not cached
        C->>AG: GET /boards/{board_id}
        AG->>BS: Fetch board metadata
        BS->>KV: Check hot cache
        alt Cache hit
            KV->>BS: Return snapshot
        else Cache miss
            BS->>BS: Load snapshot + replay ops
            BS->>KV: Populate cache
        end
        BS->>C: Return CRDT state + metadata + asset URLs
        C->>L: Cache locally
        C->>C: Render canvas
        C->>CSE: Establish sync connection
    end
    CSE->>C: Send current awareness states (other cursors)
    C->>C: Render other users' cursors
```

### Drawing a Shape

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant L as Local CRDT
    participant CSE as CRDT Sync<br/>Engine
    participant P as Peer Clients

    U->>C: Draw rectangle at (200, 150)
    C->>L: Create object in local CRDT
    Note over C: {id: "obj-uuid", type: "rect",<br/>x: 200, y: 150, w: 100, h: 80,<br/>fill: "#4a90d9", stroke: "#01579b"}
    C->>C: Render shape immediately (<5ms)
    C->>L: Persist to IndexedDB
    C->>CSE: Send CRDT delta (binary)
    CSE->>CSE: Merge into server CRDT state
    CSE->>CSE: Append to operation log
    CSE->>P: Broadcast delta to all peers
    P->>P: Merge into local CRDT
    P->>P: Render new shape on canvas
```

### Moving a Cursor

```mermaid
sequenceDiagram
    participant U as User A
    participant CA as Client A
    participant CRS as Cursor Relay<br/>Server
    participant CB as Client B
    participant UB as User B

    U->>CA: Move mouse to (450, 300)
    CA->>CA: Throttle to 15 Hz
    CA->>CRS: Cursor update (unreliable channel)
    Note over CA,CRS: {user: "alice", x: 450, y: 300,<br/>viewport: {x: 0, y: 0, w: 1200, h: 800}}
    CRS->>CRS: Batch cursor updates (50ms window)
    CRS->>CB: Broadcast batched cursors
    CB->>CB: Interpolate cursor position
    CB->>UB: Render Alice's cursor with label
```

### New User Joining an Active Session

```mermaid
sequenceDiagram
    participant NP as New Participant
    participant CSE as CRDT Sync<br/>Engine
    participant CRS as Cursor Relay
    participant EP as Existing<br/>Participants

    NP->>CSE: Connect + authenticate
    CSE->>NP: Send full board state (latest snapshot + ops)
    CSE->>NP: Send current awareness states
    NP->>NP: Render board + show existing cursors
    NP->>CRS: Start sending cursor position
    CRS->>EP: Announce new participant
    EP->>EP: Render new cursor on canvas
    NP->>CSE: Begin sending/receiving CRDT ops
    Note over NP,EP: New participant is now<br/>fully synchronized
```

### Offline Edit and Reconnect

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant L as Local Store
    participant CSE as CRDT Sync Engine

    Note over U,CSE: Network goes offline
    U->>C: Draw shapes, move objects, add text
    C->>C: Apply all edits to local CRDT
    C->>L: Persist every operation to IndexedDB
    Note over U,C: User continues editing<br/>offline for hours

    Note over U,CSE: Network restored
    C->>CSE: Send local state vector
    CSE->>C: Send server state vector
    Note over C,CSE: Exchange missing operations<br/>(bidirectional delta sync)
    C->>CSE: Send local-only operations
    CSE->>C: Send server-only operations
    C->>C: Merge (CRDT guarantees convergence)
    CSE->>CSE: Merge (CRDT guarantees convergence)
    Note over C,CSE: Both now have identical board state
```

---

## Architecture Pattern Checklist

- [x] **Sync vs Async**: WebSocket/WebRTC for real-time sync (async push); REST for metadata (sync request-response)
- [x] **Event-driven vs Request-response**: Event-driven for canvas operations (operation stream); request-response for board CRUD
- [x] **Push vs Pull**: Push for real-time edits and cursor positions; pull for initial board load and asset fetch
- [x] **Stateless vs Stateful**: Sync engine is stateful (holds active board CRDT state in memory); API servers are stateless
- [x] **Read-heavy vs Write-heavy**: Write-heavy during collaboration sessions; optimized with local-first rendering
- [x] **Real-time vs Batch**: Real-time for operations and presence; batch for search indexing, snapshots, export
- [x] **Edge vs Origin**: Client-side CRDT processing for zero-latency editing; server for persistence and cross-client sync
- [x] **Reliable vs Unreliable**: Reliable channel for durable operations; unreliable channel for ephemeral state

---

## Component Responsibilities

| Component | Responsibility | Scaling Strategy |
|-----------|---------------|-----------------|
| **WebSocket Gateway** | Connection management, auth, transport upgrade | Horizontal (sticky sessions by board) |
| **CRDT Sync Engine** | CRDT merge, operation validation, broadcast | Horizontal (sharded by board_id) |
| **Signaling Server** | WebRTC ICE/SDP exchange, session setup | Stateless, horizontally scaled |
| **Cursor Relay Server** | Ephemeral cursor/viewport broadcast | Horizontal (pub/sub, stateless) |
| **Board Service** | Board metadata CRUD, permissions, sharing | Stateless, horizontally scaled |
| **Persistence Service** | Snapshot creation, operation log management | Background workers, queue-based |
| **Asset Service** | Image/PDF upload, processing, thumbnail generation | Horizontal, CDN-backed |
| **Export Service** | Rasterization, SVG/PDF generation | Queue-based, auto-scaled workers |
| **Search Service** | Full-text indexing across boards | Sharded search index |
| **STUN Server** | NAT type discovery for WebRTC | Lightweight, globally distributed |
| **TURN Relay** | WebRTC media relay for restricted NATs | Bandwidth-intensive, metered |

---

## Why Not Pure WebSocket (No WebRTC)?

Many production canvas systems (including Miro) use WebSocket-only architectures. Our hybrid approach provides optional WebRTC benefits:

| Aspect | WebSocket Only | Hybrid WebSocket + WebRTC |
|--------|---------------|---------------------------|
| Latency | Server hop always required | Direct P2P possible for same-network peers |
| Cursor smoothness | ~30-80ms (through server) | ~5-20ms (P2P) or ~30-80ms (relay) |
| NAT handling | Not an issue (client → server) | Requires STUN/TURN infrastructure |
| Complexity | Lower | Higher |
| Firewall compatibility | Near-universal (port 443) | Blocked by some corporate firewalls |
| Cost | Server bandwidth only | Server + TURN bandwidth |
| Fallback | N/A | Falls back to WebSocket |

**Our approach**: WebSocket as the **primary** transport (reliable, universal). WebRTC data channels as an **optional enhancement** for lower-latency cursor sync when P2P connectivity is achievable. The system works correctly with WebSocket alone; WebRTC is a progressive enhancement.
