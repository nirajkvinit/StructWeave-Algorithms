# High-Level Design — WebRTC Infrastructure

## System Architecture

The WebRTC infrastructure consists of three planes: the **signaling plane** (WebSocket-based session management), the **connectivity plane** (STUN/TURN for NAT traversal), and the **media plane** (SFU for packet forwarding). These planes operate independently but coordinate through shared session state.

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TB
    subgraph Clients["Client Layer"]
        C1["Participant A<br/>(Browser/Mobile)"]
        C2["Participant B<br/>(Browser/Mobile)"]
        C3["Participant C<br/>(Browser/Mobile)"]
    end

    subgraph Signaling["Signaling Plane"]
        SIG["Signaling Server<br/>(WebSocket)"]
        SIGDB[("Session Store")]
    end

    subgraph Connectivity["Connectivity Plane"]
        STUN["STUN Server<br/>(Reflexive Discovery)"]
        TURN["TURN Server<br/>(Relay Fallback)"]
    end

    subgraph Media["Media Plane"]
        SFU1["SFU Node 1<br/>(Region A)"]
        SFU2["SFU Node 2<br/>(Region B)"]
        SFU1 <-->|"Cascaded<br/>Media Relay"| SFU2
    end

    subgraph Storage["Storage & Processing"]
        REC["Recording<br/>Egress"]
        OBJ[("Object<br/>Storage")]
    end

    C1 & C2 & C3 -->|"WebSocket<br/>(SDP, ICE candidates)"| SIG
    SIG --> SIGDB
    C1 & C2 & C3 -.->|"STUN Binding<br/>Request"| STUN
    C1 -.->|"TURN Allocation<br/>(if needed)"| TURN
    C1 & C2 -->|"SRTP Media<br/>Tracks"| SFU1
    C3 -->|"SRTP Media<br/>Tracks"| SFU2
    SFU1 -->|"Egress<br/>Pipeline"| REC
    REC --> OBJ

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef signal fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef connect fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef media fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef store fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class C1,C2,C3 client
    class SIG,SIGDB signal
    class STUN,TURN connect
    class SFU1,SFU2 media
    class REC,OBJ store
```

---

## Call Establishment Flow

The lifecycle of a WebRTC call involves coordinated interaction across all three planes. The sequence below shows a 1:1 call where both participants connect through an SFU.

```mermaid
%%{init: {'theme': 'neutral'}}%%
sequenceDiagram
    participant A as Participant A
    participant SIG as Signaling Server
    participant STUN as STUN Server
    participant TURN as TURN Server
    participant SFU as SFU Node
    participant B as Participant B

    Note over A,B: Phase 1 — Room Join & Signaling
    A->>SIG: Connect WebSocket + Auth Token
    SIG->>SIG: Validate token, create/join room
    B->>SIG: Connect WebSocket + Auth Token
    SIG->>A: Peer joined notification
    SIG->>B: Existing participants list

    Note over A,B: Phase 2 — ICE Candidate Gathering
    A->>STUN: STUN Binding Request
    STUN->>A: Server-Reflexive Candidate (public IP:port)
    A->>TURN: Allocate Request (if configured)
    TURN->>A: Relay Candidate (TURN IP:port)
    B->>STUN: STUN Binding Request
    STUN->>B: Server-Reflexive Candidate

    Note over A,B: Phase 3 — SDP Offer/Answer Exchange
    A->>SIG: SDP Offer (codecs, candidates, fingerprint)
    SIG->>B: Forward SDP Offer
    B->>SIG: SDP Answer (accepted codecs, candidates)
    SIG->>A: Forward SDP Answer

    Note over A,B: Phase 4 — ICE Connectivity Checks
    A->>SFU: STUN connectivity check (host candidate)
    SFU->>A: STUN response (success)
    B->>SFU: STUN connectivity check
    SFU->>B: STUN response (success)
    Note over A,SFU: ICE selects best candidate pair

    Note over A,B: Phase 5 — Secure Media Flow
    A->>SFU: DTLS handshake (derive SRTP keys)
    SFU->>A: DTLS handshake complete
    A->>SFU: SRTP audio/video tracks
    SFU->>B: Forward SRTP tracks (selective)
    B->>SFU: SRTP audio/video tracks
    SFU->>A: Forward SRTP tracks (selective)

    Note over A,B: Phase 6 — Ongoing Adaptation
    SFU->>A: RTCP TWCC feedback
    A->>A: Adjust bitrate via GCC
    SFU->>SFU: Switch simulcast layers per subscriber
```

---

## Media Flow Through SFU

In a group call with N participants, the SFU operates as a selective packet router. Each participant publishes their tracks once, and the SFU forwards copies to each subscriber with per-subscriber quality selection.

**Publisher path:**
1. Client encodes video at multiple simulcast layers (e.g., 720p @ 1.5 Mbps, 360p @ 500 Kbps, 180p @ 150 Kbps)
2. Client encodes audio with Opus codec at 50 Kbps
3. RTP packets are encrypted via SRTP and sent to the SFU over the ICE-selected transport
4. SFU receives packets and stores them in a per-track jitter buffer (reorders out-of-sequence packets)

**Subscriber path:**
1. SFU determines which simulcast layer each subscriber should receive based on:
   - Subscriber's estimated available bandwidth (via TWCC/REMB feedback)
   - Subscriber's requested resolution (e.g., thumbnail vs. main view)
   - Room policy (e.g., active speaker gets high quality, others get low)
2. SFU forwards the selected layer's RTP packets to the subscriber
3. If bandwidth drops, SFU switches to a lower simulcast layer — no packet loss, just lower resolution
4. Subscriber decodes and renders each received track independently

**Key optimization — Last-N:**
For rooms with many participants, the SFU only forwards the top N active speakers' video tracks, dramatically reducing subscriber bandwidth. Audio is always forwarded for all participants (low bandwidth cost). A voice activity detector (VAD) determines active speakers.

---

## Key Architectural Decisions

### Decision 1: SFU Over MCU

| Factor | SFU | MCU |
|---|---|---|
| **CPU cost** | Minimal (packet forwarding only) | High (decode + composite + re-encode per output) |
| **Latency** | 1-5ms forwarding | 50-200ms (encoding pipeline) |
| **Scalability** | Horizontal via cascading | Vertical (limited by encoding capacity) |
| **Client flexibility** | Each subscriber receives individual tracks, can layout locally | Single composite stream, fixed layout |
| **Bandwidth** | Higher downstream (N-1 tracks) | Lower downstream (1 composite) but server bears encoding cost |
| **Simulcast/SVC** | Natural fit (per-subscriber layer selection) | Not applicable |

**Decision:** SFU is the standard for all real-time interactive use cases. MCU is reserved only for specific legacy scenarios (SIP interop) or server-side recording compositing.

### Decision 2: Simulcast Over SVC

| Factor | Simulcast | SVC |
|---|---|---|
| **Codec support** | VP8, H.264, VP9, AV1 | VP9, AV1 only (limited H.264) |
| **Encoder complexity** | Multiple independent encodes | Single layered encode |
| **SFU complexity** | Simple layer switching | Must parse and strip NAL units |
| **Bandwidth efficiency** | ~40% overhead (redundant encoding) | ~15% overhead (shared base layer) |
| **Switching artifacts** | Brief freeze during layer switch (keyframe needed) | Seamless layer dropping |
| **Client support** | Universal | Incomplete (mobile platforms lag) |

**Decision:** Simulcast as the primary approach for broad compatibility. SVC for VP9/AV1-capable endpoints where bandwidth efficiency matters (large rooms).

### Decision 3: WebSocket-Based Signaling

**Rationale:** WebSockets provide full-duplex, low-latency signaling over a persistent connection. Alternatives:
- HTTP long polling: Higher latency, connection overhead per message
- Server-Sent Events: Unidirectional (server → client only)
- gRPC streaming: Better for service-to-service; browser support limited
- Pub/sub messaging: Good for inter-server, overkill for client-server signaling

**Decision:** WebSocket for client-server signaling. Pub/sub message bus for inter-SFU coordination and signaling server clustering.

### Decision 4: Custom Protocol for SFU Cascading

**Rationale:** Using WebRTC between SFU nodes would require ICE negotiation, SDP exchange, and DTLS handshake for each inter-node connection—adding unnecessary complexity and latency. A custom protocol using serialized metadata (e.g., FlatBuffers) over direct UDP/TCP connections allows:
- Supplementing RTP packets with track identifiers and room context
- Eliminating ICE negotiation (servers have known public addresses)
- Lower connection establishment latency (no DTLS handshake needed between trusted servers)
- Simpler topology management (mesh can be preconfigured)

**Decision:** Custom relay protocol for server-to-server media forwarding; standard WebRTC for client-to-server.

---

## Architecture Pattern Checklist

| Pattern | Applied? | Implementation |
|---|---|---|
| **Hub-and-spoke** | Yes | SFU as central hub; clients as spokes with single upstream connection |
| **Cascaded mesh** | Yes | Multi-SFU topology for large rooms and multi-region deployment |
| **Event-driven** | Yes | Signaling via WebSocket events; room state changes broadcast to subscribers |
| **Pub/sub** | Yes | Inter-SFU coordination via message bus; room topic-based state distribution |
| **Circuit breaker** | Yes | TURN fallback when direct/reflexive paths fail; SFU failover on node loss |
| **Sidecar** | Yes | Recording egress as sidecar to SFU (subscribes to tracks without publishing) |
| **Edge deployment** | Yes | STUN/TURN servers at edge PoPs; SFU nodes in regional data centers |
| **Graceful degradation** | Yes | Simulcast layer downgrade; audio-only mode; last-N video limiting |

---

## Component Interaction Summary

| Component | Communicates With | Protocol | Purpose |
|---|---|---|---|
| Client | Signaling Server | WebSocket (WSS) | SDP exchange, ICE candidates, room events |
| Client | STUN Server | STUN over UDP | Reflexive candidate discovery |
| Client | TURN Server | TURN over UDP/TCP/TLS | Relay allocation and media relay |
| Client | SFU Node | SRTP/SRTCP over UDP | Encrypted media track publish/subscribe |
| SFU Node | SFU Node | Custom relay (RTP + metadata) | Cascaded media forwarding |
| SFU Node | Message Bus | Pub/sub | Room state sync, participant routing |
| Signaling Server | Session Store | Key-value reads/writes | Room metadata, participant registry |
| SFU Node | Recording Egress | Internal subscription | Track data for recording pipeline |
