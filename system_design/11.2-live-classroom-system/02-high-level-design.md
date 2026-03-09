# High-Level Design — Live Classroom System

## System Architecture

The live classroom system follows a split-plane architecture: a **media plane** for real-time audio/video routing via WebRTC SFUs, and a **control plane** for signaling, session management, and collaboration features. This separation is fundamental—the media plane operates on UDP with microsecond timing constraints, while the control plane uses reliable TCP/WebSocket transport.

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        direction LR
        WEB[Web Client<br/>WebRTC + Canvas]
        MOB[Mobile Client<br/>Native WebRTC]
        DESK[Desktop Client<br/>Electron + WebRTC]
    end

    subgraph Edge["Edge / Ingress Layer"]
        direction LR
        LB[Load Balancer<br/>L4/L7]
        TURN[TURN/STUN<br/>Relay Servers]
        GW[API Gateway<br/>REST + WebSocket]
    end

    subgraph Signal["Signaling & Control Plane"]
        direction LR
        SIG[Signaling Server<br/>WebSocket Handler]
        SESS[Session Service<br/>Room Lifecycle]
        ROSTER[Roster Service<br/>Participant Mgmt]
        SCHED[Scheduler Service<br/>Calendar + Recurrence]
    end

    subgraph Media["Media Plane"]
        direction LR
        SFU1[SFU Node 1<br/>Region A]
        SFU2[SFU Node 2<br/>Region A]
        SFU3[SFU Node 3<br/>Region B]
        SFUC[SFU Cascade<br/>Controller]
    end

    subgraph Collab["Collaboration Plane"]
        direction LR
        WB[Whiteboard Service<br/>CRDT Engine]
        CHAT[Chat Service<br/>Message Broker]
        ENGAGE[Engagement Service<br/>Polls / Q&A / Raise Hand]
    end

    subgraph Record["Recording Pipeline"]
        direction LR
        REC[Recording Agent<br/>Per-Session Capture]
        COMP[Composition Worker<br/>Multi-Track Merge]
        STORE[(Object Storage<br/>Recording Archive)]
    end

    subgraph Data["Data & Analytics Layer"]
        direction LR
        DB[(Primary Database<br/>Session + Roster)]
        CACHE[(Redis Cache<br/>Session State)]
        STREAM[Event Stream<br/>Analytics Pipeline]
        ANALYTICS[Analytics Service<br/>Engagement + Quality]
    end

    WEB & MOB & DESK --> LB
    WEB & MOB & DESK -.->|WebRTC media| TURN
    WEB & MOB & DESK -.->|WebRTC media| SFU1 & SFU2 & SFU3
    LB --> GW
    GW --> SIG
    GW --> SESS & ROSTER & SCHED
    SIG --> SFU1 & SFU2 & SFU3
    SFUC --> SFU1 & SFU2 & SFU3
    SIG --> WB & CHAT & ENGAGE
    SFU1 & SFU2 --> REC
    REC --> COMP --> STORE
    SESS & ROSTER --> DB
    SESS & ROSTER --> CACHE
    SIG & ENGAGE & CHAT --> STREAM --> ANALYTICS

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef signal fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef media fill:#fce4ec,stroke:#c62828,stroke-width:2px
    classDef collab fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef record fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef data fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class WEB,MOB,DESK client
    class LB,TURN,GW edge
    class SIG,SESS,ROSTER,SCHED signal
    class SFU1,SFU2,SFU3,SFUC media
    class WB,CHAT,ENGAGE collab
    class REC,COMP,STORE record
    class DB,CACHE,STREAM,ANALYTICS data
```

---

## Data Flow: Session Lifecycle

### Session Join Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant SS as Session Service
    participant SIG as Signaling Server
    participant SFU as SFU Node
    participant TURN as TURN Server

    C->>GW: POST /sessions/{id}/join (auth token)
    GW->>SS: Validate session + participant permissions
    SS-->>GW: Session config + assigned SFU endpoint
    GW-->>C: Join token + SFU address + ICE servers

    C->>SIG: WebSocket connect (join token)
    SIG->>SIG: Authenticate + add to roster
    SIG-->>C: Room state (participants, media tracks, whiteboard)

    C->>C: Create RTCPeerConnection
    C->>SIG: SDP Offer (publish tracks: audio + video simulcast)
    SIG->>SFU: Forward SDP Offer
    SFU-->>SIG: SDP Answer
    SIG-->>C: SDP Answer

    par ICE Connectivity
        C->>SFU: ICE candidate exchange (direct)
        C->>TURN: ICE candidate exchange (relay fallback)
    end

    C->>SFU: DTLS handshake + SRTP key exchange
    SFU-->>C: Media flow established

    SFU->>SIG: Publisher ready notification
    SIG-->>C: Existing track list (subscribe offers)
    C->>SIG: Subscribe to instructor + active speakers
    SIG->>SFU: Create subscriber transports
    SFU-->>C: Downstream media tracks
```

### Breakout Room Transition Flow

```mermaid
sequenceDiagram
    participant INS as Instructor Client
    participant SIG as Signaling Server
    participant BO as Breakout Orchestrator
    participant SFU_M as SFU (Main Room)
    participant SFU_B as SFU (Breakout Room)
    participant STU as Student Clients

    INS->>SIG: Create breakout rooms (config: 5 rooms, random, 15 min)
    SIG->>BO: Allocate breakout rooms
    BO->>BO: Assign participants to rooms (random shuffle)
    BO->>SIG: Room assignments + SFU allocations

    SIG-->>STU: Breakout room assignment notification
    SIG-->>INS: Room roster confirmation

    Note over STU: Client initiates room transition

    STU->>SFU_M: Pause media tracks (keep connection warm)
    STU->>SIG: Join breakout room (room_id, assignment_token)
    SIG->>SFU_B: Setup subscriber/publisher for student
    SFU_B-->>STU: New SDP offer (breakout room tracks)
    STU->>SFU_B: SDP answer + media flow begins

    Note over BO: Timer expires (15 min)

    BO->>SIG: Auto-return trigger (all rooms)
    SIG-->>STU: Return-to-main notification (60s warning)
    SIG-->>STU: Return-to-main (forced)
    STU->>SFU_B: Disconnect breakout media
    STU->>SFU_M: Resume main room media tracks
    SFU_M-->>STU: Main room media restored
```

---

## Key Architectural Decisions

### Decision 1: SFU over MCU for Media Routing

| Aspect | SFU (Selected) | MCU (Rejected) |
|---|---|---|
| **Server CPU** | Low—forwards packets without decoding | High—decodes, mixes, and re-encodes all streams |
| **Scalability** | Horizontal—add more SFU nodes | Vertical—limited by single node CPU capacity |
| **Client flexibility** | Each client selects quality layers independently | All clients receive same mixed output |
| **Latency** | Minimal—packet forwarding adds <5ms | Significant—transcoding adds 50-200ms |
| **Recording** | Multi-track recording (separate streams) available | Only mixed recording available |
| **Cost** | Bandwidth-heavy but compute-light | Compute-heavy but bandwidth-efficient |

**Decision:** SFU with simulcast. The education use case requires role-based quality selection (instructor at 720p, students at 360p in gallery view) and multi-track recording for post-session review. SFU's horizontal scalability handles the burst-pattern load profile. MCU is only used as an optional edge case for participants on extremely constrained bandwidth who cannot decode multiple streams.

### Decision 2: CRDT over OT for Whiteboard Collaboration

| Aspect | CRDT (Selected) | OT (Rejected) |
|---|---|---|
| **Server requirement** | Serverless merge—peers can sync directly | Requires central transformation server |
| **Conflict resolution** | Automatic—mathematical convergence guarantee | Manual—complex transformation functions |
| **Offline support** | Natural—merge when reconnected | Complex—must buffer and transform on reconnect |
| **Scalability** | Peer-to-peer friendly, server is optional relay | Central server is bottleneck |
| **Complexity** | Custom CRDT types needed for geometric ops | Well-established for text; complex for graphics |

**Decision:** CRDT with a central relay for performance. While CRDTs can operate peer-to-peer, routing through a central relay provides consistent ordering and enables persistence. The relay is not a transformation server—it simply relays and persists CRDT operations. If the relay fails, clients can sync directly (temporary degradation, not outage).

### Decision 3: WebSocket for Signaling, DataChannel for Whiteboard

| Aspect | WebSocket (Signaling) | WebRTC DataChannel (Whiteboard) |
|---|---|---|
| **Transport** | TCP—reliable, ordered delivery | SCTP over DTLS—configurable reliability |
| **Latency** | Higher (TCP head-of-line blocking) | Lower (can use unreliable mode) |
| **NAT traversal** | Requires separate proxy/LB | Piggybacks on existing WebRTC connection |
| **Connection overhead** | Separate connection per service | Shares ICE/DTLS with media connection |

**Decision:** Hybrid approach. Signaling (session control, roster, permissions) uses WebSocket for reliable delivery—these events are infrequent and must not be lost. Whiteboard CRDT operations use WebRTC DataChannels (ordered, reliable mode) to piggyback on the existing media connection, reducing connection overhead and NAT traversal complexity. Chat uses WebSocket for server-side persistence and moderation.

### Decision 4: Cascaded SFU for Multi-Region Support

```mermaid
flowchart LR
    subgraph RegionA["Region A (US-East)"]
        SFU_A1[SFU A1]
        SFU_A2[SFU A2]
        PA1[Participant 1-15]
    end

    subgraph RegionB["Region B (EU-West)"]
        SFU_B1[SFU B1]
        PB1[Participant 16-25]
    end

    subgraph RegionC["Region C (AP-South)"]
        SFU_C1[SFU C1]
        PC1[Participant 26-30]
    end

    PA1 -->|WebRTC| SFU_A1
    PA1 -->|WebRTC| SFU_A2
    PB1 -->|WebRTC| SFU_B1
    PC1 -->|WebRTC| SFU_C1

    SFU_A1 <-->|"SFU Cascade (SRTP relay)"| SFU_B1
    SFU_A1 <-->|"SFU Cascade (SRTP relay)"| SFU_C1
    SFU_B1 <-->|"SFU Cascade (SRTP relay)"| SFU_C1

    classDef region_a fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef region_b fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef region_c fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class SFU_A1,SFU_A2,PA1 region_a
    class SFU_B1,PB1 region_b
    class SFU_C1,PC1 region_c
```

**Approach:** For sessions with participants in multiple regions, SFU nodes in each region form a cascade mesh. Each participant connects to their nearest regional SFU. SFUs forward only the active speaker's highest-quality stream and thumbnail-quality streams for others across the inter-region link. This minimizes cross-region bandwidth while keeping intra-region latency optimal.

**Cascade selection heuristic:**
- Single region: All participants on one SFU cluster (or split across 2 SFUs if >50 participants)
- Two regions: Direct cascade between 2 regional SFUs
- Three+ regions: Star topology with the instructor's region as hub (minimizes instructor-to-student latency)

### Decision 5: Event-Driven Architecture for Non-Media Features

```mermaid
flowchart LR
    subgraph Sources["Event Sources"]
        SIG[Signaling Events]
        MEDIA[Media Events]
        ENGAGE[Engagement Events]
        WB[Whiteboard Events]
    end

    BROKER[Event Stream Broker<br/>Partitioned by Session ID]

    subgraph Consumers["Event Consumers"]
        ATT[Attendance Tracker]
        REC[Recording Trigger]
        ANALYTICS[Analytics Aggregator]
        NOTIFY[Notification Dispatcher]
        AUDIT[Audit Logger]
    end

    SIG & MEDIA & ENGAGE & WB --> BROKER
    BROKER --> ATT & REC & ANALYTICS & NOTIFY & AUDIT

    classDef source fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef broker fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef consumer fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class SIG,MEDIA,ENGAGE,WB source
    class BROKER broker
    class ATT,REC,ANALYTICS,NOTIFY,AUDIT consumer
```

All non-media events (signaling actions, engagement interactions, whiteboard operations, attendance heartbeats) are published to a partitioned event stream broker (partitioned by session ID for ordering). Downstream consumers independently process these events for attendance tracking, recording triggers, analytics aggregation, notifications, and audit logging. This decoupling ensures that slow analytics processing never affects real-time media delivery.

---

## Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---|---|---|
| **Sync vs Async** | Both: Sync for media/signaling, Async for analytics/recording | Media is inherently synchronous; analytics tolerates delay |
| **Event-driven vs Request-response** | Both: Event-driven for engagement/analytics, Request-response for session CRUD | Events decouple non-critical consumers from real-time path |
| **Push vs Pull** | Push: SFU pushes media, server pushes signaling events | Real-time system requires server-initiated delivery |
| **Stateless vs Stateful** | Both: SFU is stateful (holds sessions), API services are stateless | SFU statefulness is unavoidable; control plane is stateless for scaling |
| **Read-heavy vs Write-heavy** | Write-heavy: Continuous media, signaling events, whiteboard ops during sessions | Reads are only post-session (recordings, analytics) |
| **Real-time vs Batch** | Both: Real-time for media/signaling, Batch for recording composition | Composition is compute-intensive and not time-critical |
| **Edge vs Origin** | Edge for media (SFU near participants), Origin for control | Media latency requires geographic proximity; control tolerates centralization |

---

## Component Interaction Summary

| Source → Target | Protocol | Data | Frequency |
|---|---|---|---|
| Client → SFU | WebRTC (SRTP/SRTCP over DTLS) | Audio/video media streams | Continuous (30fps video, 50pps audio) |
| Client → Signaling | WebSocket (WSS) | SDP offers, ICE candidates, control events | Bursty (high at join, low during session) |
| Client → Whiteboard | WebRTC DataChannel (SCTP) | CRDT operations (vector objects, strokes) | Moderate (10-50 ops/sec during active drawing) |
| Client → Chat | WebSocket (WSS) | Text messages, file references | Low (1-5 msgs/min typical) |
| SFU → SFU (cascade) | SRTP relay over DTLS | Forwarded media streams | Continuous (active speaker + thumbnails) |
| Signaling → SFU | gRPC | Track publish/subscribe commands | On participant join/leave |
| SFU → Recording | RTP dump / media fork | Raw media tracks per participant | Continuous when recording enabled |
| Services → Event Stream | Async message | Session events, engagement events | High (1000s/sec per session) |
| Event Stream → Analytics | Async consume | Aggregated metrics | Continuous batch windows |
| Composition Worker → Object Storage | HTTP PUT | Composed MP4 recordings | Post-session batch |

---

*Previous: [Requirements & Estimations](./01-requirements-and-estimations.md) | Next: [Low-Level Design ->](./03-low-level-design.md)*
