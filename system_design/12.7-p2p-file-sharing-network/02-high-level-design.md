# High-Level Design — P2P File Sharing Network

## System Architecture

The P2P file sharing network operates as a decentralized overlay on top of the internet's physical infrastructure. Unlike client-server systems, there is no central data plane—every participant is both consumer and producer. The architecture consists of four layers: the discovery layer (how peers find each other), the swarm layer (how peers organize around content), the transfer layer (how data moves between peers), and the verification layer (how data integrity is ensured).

```mermaid
flowchart TB
    subgraph Clients["Peer Clients"]
        P1[Peer A<br/>Seeder]
        P2[Peer B<br/>Leecher]
        P3[Peer C<br/>Leecher]
        P4[Peer D<br/>Seeder]
    end

    subgraph Discovery["Discovery Layer"]
        T[Tracker Server<br/>HTTP/UDP Announce]
        DHT[Kademlia DHT<br/>Distributed across<br/>all nodes]
        PEX[Peer Exchange<br/>Gossip Protocol]
        LSD[Local Service<br/>Discovery<br/>LAN Multicast]
    end

    subgraph Swarm["Swarm Layer"]
        SW[Swarm Manager<br/>Per-torrent peer set<br/>Bitfield tracking<br/>Choking decisions]
    end

    subgraph Transfer["Transfer Layer"]
        WP[Wire Protocol<br/>Handshake, Request,<br/>Piece, Have, Bitfield]
        PS[Piece Selector<br/>Rarest-first,<br/>Random-first,<br/>Endgame mode]
    end

    subgraph Verify["Verification Layer"]
        HV[Hash Verifier<br/>SHA-256 per piece]
        MT[Merkle Tree<br/>Block-level proofs<br/>v2 protocol]
    end

    subgraph Storage["Local Storage"]
        FS[File System<br/>Piece cache &<br/>completed files]
    end

    P1 & P2 & P3 & P4 --> T
    P1 & P2 & P3 & P4 --> DHT
    P2 <--> PEX <--> P3
    P2 <--> LSD <--> P3

    T --> SW
    DHT --> SW
    PEX --> SW
    LSD --> SW

    SW --> WP
    WP --> PS
    PS --> HV
    HV --> MT
    MT --> FS

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef discovery fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef swarm fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef transfer fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef verify fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef storage fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class P1,P2,P3,P4 client
    class T,DHT,PEX,LSD discovery
    class SW swarm
    class WP,PS transfer
    class HV,MT verify
    class FS storage
```

---

## Data Flow: File Publishing (Creating a Torrent)

### Step-by-Step Flow

| Step | Action | Details |
|---|---|---|
| 1 | **Read source files** | Client reads all files to be shared from local storage |
| 2 | **Split into pieces** | Files are divided into fixed-size pieces (e.g., 2 MiB each) |
| 3 | **Compute piece hashes** | SHA-256 hash computed for each piece (v2: build Merkle tree with 16 KiB leaves) |
| 4 | **Build torrent metadata** | Create info dictionary: file names, sizes, piece length, piece hashes, and optional file tree |
| 5 | **Compute info-hash** | SHA-256 hash of the bencoded info dictionary — this becomes the torrent's unique identifier |
| 6 | **Generate .torrent file** | Serialize metadata including tracker URLs, DHT nodes, creation date |
| 7 | **Announce to tracker** | HTTP/UDP announce with info-hash, peer ID, port, and "started" event |
| 8 | **Announce to DHT** | Store (info-hash → peer contact info) in DHT nodes closest to the info-hash |
| 9 | **Begin seeding** | Listen for incoming connections from leechers requesting pieces |

### Publishing Latency Breakdown

| Phase | Latency | Bottleneck |
|---|---|---|
| File reading | Proportional to file size; ~1 GiB/s from SSD | Disk I/O |
| Piece hashing | ~500 MiB/s SHA-256 on modern CPU | CPU-bound |
| Torrent file creation | < 100ms | Negligible |
| Tracker announce | 100-500ms | Network RTT |
| DHT announce | 1-3 seconds | Multiple DHT hops |
| **Total for 4 GiB file** | **~10-15 seconds** | Dominated by hashing |

---

## Data Flow: File Downloading (Joining a Swarm)

### Step-by-Step Flow

| Step | Action | Details |
|---|---|---|
| 1 | **Parse torrent / magnet link** | Extract info-hash, tracker URLs, DHT bootstrap nodes |
| 2 | **Fetch metadata (magnet only)** | If magnet link, request metadata from DHT peers via `ut_metadata` extension |
| 3 | **Tracker announce** | Send announce request to tracker with info-hash; receive peer list (up to 200 peers) |
| 4 | **DHT get_peers** | Query DHT with info-hash; iteratively contact nodes closer to the target |
| 5 | **Establish peer connections** | TCP/uTP handshake with discovered peers; exchange protocol handshake with info-hash and peer ID |
| 6 | **Exchange bitfields** | Each peer sends its piece completion bitmap; client learns who has which pieces |
| 7 | **Express interest** | Send INTERESTED message to peers with needed pieces; wait for UNCHOKE |
| 8 | **Piece selection** | Apply rarest-first algorithm (or random-first for initial pieces) |
| 9 | **Request blocks** | Send REQUEST messages for 16 KiB blocks within the selected piece |
| 10 | **Receive & verify** | Receive PIECE messages; when all blocks of a piece received, verify hash |
| 11 | **Announce completion** | Send HAVE messages to all connected peers; update bitfield |
| 12 | **Upload to others** | Serve received pieces to requesting peers based on choking algorithm |
| 13 | **Endgame mode** | When <5 pieces remain, request them from ALL available peers; cancel duplicates |
| 14 | **Completion** | All pieces received and verified; transition from leecher to seeder |

---

## Sequence Diagram: Torrent Download Lifecycle

```mermaid
sequenceDiagram
    participant C as Client (Leecher)
    participant T as Tracker
    participant D as DHT Network
    participant S1 as Seeder 1
    participant S2 as Seeder 2
    participant L1 as Leecher 2

    Note over C: Parse .torrent or magnet link

    par Discover peers
        C->>T: ANNOUNCE (info_hash, peer_id, port, event=started)
        T-->>C: Peer list (compact: IP+port × N)
    and
        C->>D: GET_PEERS (info_hash)
        D-->>C: Closest nodes + peers
        C->>D: ANNOUNCE_PEER (info_hash, port, token)
    end

    C->>S1: TCP connect + Protocol Handshake (info_hash, peer_id)
    S1-->>C: Handshake accepted
    S1->>C: BITFIELD (all pieces = 1)
    C->>S1: INTERESTED

    C->>S2: TCP connect + Protocol Handshake
    S2-->>C: Handshake accepted
    S2->>C: BITFIELD (all pieces = 1)
    C->>S2: INTERESTED

    S1->>C: UNCHOKE
    Note over C: Rarest-first piece selection

    C->>S1: REQUEST (piece=42, offset=0, length=16384)
    S1-->>C: PIECE (piece=42, offset=0, data)
    C->>S1: REQUEST (piece=42, offset=16384, length=16384)
    S1-->>C: PIECE (piece=42, offset=16384, data)

    Note over C: Piece 42 complete — verify SHA-256 hash
    Note over C: Hash matches ✓

    C->>S1: HAVE (piece=42)
    C->>S2: HAVE (piece=42)
    C->>L1: HAVE (piece=42)

    Note over C: Now can upload piece 42 to others

    L1->>C: INTERESTED
    Note over C: Choking algorithm: L1 uploads to us → reciprocate
    C->>L1: UNCHOKE
    L1->>C: REQUEST (piece=42, offset=0, length=16384)
    C-->>L1: PIECE (piece=42, offset=0, data)
```

---

## Key Architectural Decisions

### Decision 1: Tracker vs Trackerless (DHT) Discovery

| Approach | Pros | Cons |
|---|---|---|
| **Centralized Tracker Only** | Fast response (single RTT), reliable peer lists, easy to implement | Single point of failure, can be taken down, requires infrastructure |
| **DHT Only (Trackerless)** | No SPOF, censorship-resistant, no infrastructure cost | Slower discovery (multiple hops), vulnerable to DHT attacks, bootstrap required |
| **Hybrid (Tracker + DHT + PEX)** | Fast initial discovery via tracker, fallback to DHT if tracker unavailable, PEX accelerates peer acquisition | Most complex to implement; must handle inconsistency between sources |

**Decision: Hybrid approach.** Use trackers for fast initial peer discovery, DHT for resilience and trackerless operation, and PEX for rapid peer set expansion once connected. This provides the best combination of speed, reliability, and decentralization.

### Decision 2: Piece Size Selection

| Piece Size | Hash Overhead (4 GiB file) | Pieces | Trade-off |
|---|---|---|---|
| 64 KiB | 2 MiB (65,536 hashes) | 65,536 | Fine granularity, huge metadata, more protocol overhead |
| 256 KiB | 512 KiB (16,384 hashes) | 16,384 | Good granularity, moderate metadata |
| 2 MiB | 64 KiB (2,048 hashes) | 2,048 | Standard choice: balanced overhead and granularity |
| 16 MiB | 8 KiB (256 hashes) | 256 | Low overhead, but coarse verification (bad piece = 16 MiB re-download) |

**Decision: 2 MiB default piece size** with v2 Merkle trees providing 16 KiB block-level verification within each piece. This gives the metadata efficiency of large pieces with the verification granularity of small blocks.

### Decision 3: Transport Protocol

| Protocol | Characteristics | Use Case |
|---|---|---|
| **TCP** | Reliable, ordered delivery; well-understood; aggressive congestion control | Default for compatibility; works through most NATs and firewalls |
| **uTP (LEDBAT)** | UDP-based; delay-sensitive congestion control; "background-friendly" | Preferred for not disrupting other network traffic; lower latency |
| **WebRTC** | Browser-based; requires signaling server; DTLS encrypted | Browser P2P clients; no plugin required |

**Decision: Support TCP and uTP.** uTP preferred for bandwidth-friendly behavior; TCP as fallback. WebRTC supported via separate signaling infrastructure for browser-based clients.

### Decision 4: Choking Algorithm Parameters

| Parameter | Value | Rationale |
|---|---|---|
| Regular unchoke slots | 4 | TCP performs well with 4 simultaneous uploads |
| Regular unchoke interval | 10 seconds | Frequent enough to respond to changing conditions |
| Optimistic unchoke slots | 1 | Enough to bootstrap new peers without wasting bandwidth |
| Optimistic unchoke interval | 30 seconds | Gives each optimistic peer 30 seconds to prove reciprocity |
| Snubbing timeout | 60 seconds | Mark peer as snubbed if no data received for 60 seconds |

---

## Architecture Pattern Checklist

| Pattern | Application in P2P File Sharing |
|---|---|
| **Overlay Network** | Kademlia DHT creates a structured overlay on top of the physical network; peers organized by XOR distance |
| **Content-Addressable Storage** | Pieces identified by hash; enables deduplication, verification, and location-independent retrieval |
| **Gossip Protocol** | PEX propagates peer lists through the network without central coordination |
| **Tit-for-Tat (Game Theory)** | Choking/unchoking algorithm creates incentive-compatible bandwidth sharing |
| **Merkle Tree** | Hierarchical hash verification enabling both coarse (piece) and fine (block) integrity checks |
| **Sharding by Content** | Each torrent is an independent swarm; no coordination needed between different torrents |
| **Idempotent Operations** | Piece downloads are idempotent — re-downloading and re-verifying a piece is harmless |
| **Circuit Breaker** | Peers that consistently send corrupt data are banned; prevents wasting bandwidth on malicious peers |
| **Bulkhead** | Per-torrent swarm isolation — a problem in one swarm doesn't affect others |
| **Retry with Backoff** | Failed DHT lookups and peer connections retried with exponential backoff |

---

## Component Interaction Map

| Component | Interacts With | Protocol/Mechanism |
|---|---|---|
| **Peer Client** | Tracker | HTTP GET/announce or UDP announce protocol |
| **Peer Client** | DHT Network | KRPC protocol over UDP (ping, find_node, get_peers, announce_peer) |
| **Peer Client** | Other Peers | BitTorrent wire protocol over TCP/uTP |
| **Peer Client** | Local Storage | File system I/O for piece storage and retrieval |
| **Tracker** | All Peers | Maintains peer lists per info-hash; responds to announce/scrape requests |
| **DHT Node** | Other DHT Nodes | Kademlia routing protocol; k-bucket management |
| **PEX** | Connected Peers | Extension message (ut_pex) carrying added/dropped peer lists |
| **LSD** | LAN Peers | Multicast UDP on 239.192.152.143:6771 |

---

## Multi-Layer Discovery Architecture

The system employs a defense-in-depth approach to peer discovery, where each layer provides complementary strengths:

| Layer | Mechanism | Latency | Reliability | Peer Quality |
|---|---|---|---|---|
| **Layer 1: Tracker** | Centralized HTTP/UDP announce | 100-500ms | High (while tracker is up) | High (curated, recent peers) |
| **Layer 2: DHT** | Distributed Kademlia lookup | 2-10 seconds | Very high (no SPOF) | Medium (may include stale entries) |
| **Layer 3: PEX** | Gossip via connected peers | < 1 second | Medium (requires existing connections) | High (peers verified by sender) |
| **Layer 4: LSD** | LAN multicast | < 100ms | Low (LAN only) | Very high (same network, zero latency) |
| **Layer 5: Web Seeds** | HTTP/HTTPS URL | < 1 second | Depends on server | N/A (server, not peer) |

Discovery proceeds in parallel across all available layers. The client maintains a target peer count (typically 50-80 connections) and stops active discovery when the target is reached, relying on PEX for passive peer replenishment.

---

## DHT Overlay Network Topology

```mermaid
flowchart TB
    subgraph DHT["Kademlia DHT Overlay"]
        N1[Node A<br/>ID: 0x1A...]
        N2[Node B<br/>ID: 0x3F...]
        N3[Node C<br/>ID: 0x7C...]
        N4[Node D<br/>ID: 0xA2...]
        N5[Node E<br/>ID: 0xD8...]
        N6[Node F<br/>ID: 0xE5...]
    end

    subgraph Lookup["Iterative Lookup for Info-Hash 0xB1..."]
        Q1[Query Node A<br/>XOR dist: large]
        Q2[Query Node D<br/>XOR dist: medium]
        Q3[Query Node E<br/>XOR dist: small]
        Q4[Found peers!<br/>XOR dist: closest]
    end

    N1 --- N2
    N1 --- N4
    N2 --- N3
    N3 --- N5
    N4 --- N5
    N5 --- N6
    N4 --- N6

    Q1 -->|"returns closer nodes"| Q2
    Q2 -->|"returns closer nodes"| Q3
    Q3 -->|"returns peer list"| Q4

    classDef node fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef query fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class N1,N2,N3,N4,N5,N6 node
    class Q1,Q2,Q3,Q4 query
```

---

## Piece Distribution Across Swarm

```mermaid
flowchart LR
    subgraph Seeder["Seeder (has all)"]
        S[All Pieces<br/>1-2048]
    end

    subgraph L1["Leecher A"]
        LA[Pieces: 1-500<br/>50-400 available<br/>to upload]
    end

    subgraph L2["Leecher B"]
        LB[Pieces: 200-900<br/>300-700 available<br/>to upload]
    end

    subgraph L3["Leecher C"]
        LC[Pieces: 800-1500<br/>Rarest: piece 1337]
    end

    subgraph New["New Leecher"]
        NL[Pieces: none<br/>Needs bootstrap]
    end

    S -->|"Upload pieces"| LA
    S -->|"Upload pieces"| LB
    S -->|"Upload pieces"| LC
    LA -->|"Pieces 1-500"| NL
    LB -->|"Pieces 200-900"| NL
    LC -->|"Pieces 800-1500"| NL

    classDef seeder fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef leecher fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef newpeer fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class S seeder
    class LA,LB,LC leecher
    class NL newpeer
```

---

## Tracker Announce Protocol Flow

```mermaid
sequenceDiagram
    participant P as Peer Client
    participant T as Tracker Server

    Note over P: Starting download

    P->>T: HTTP GET /announce?<br/>info_hash=...&peer_id=...&<br/>port=6881&uploaded=0&<br/>downloaded=0&left=4294967296&<br/>event=started&compact=1

    T-->>P: Bencoded response:<br/>interval=1800, complete=500,<br/>incomplete=4500,<br/>peers=(compact 6-byte entries)

    Note over P: Download in progress...<br/>Regular re-announce every 1800s

    P->>T: HTTP GET /announce?<br/>...&uploaded=1073741824&<br/>downloaded=3221225472&<br/>left=1073741824&compact=1

    T-->>P: Updated peer list

    Note over P: Download complete

    P->>T: HTTP GET /announce?<br/>...&event=completed&<br/>left=0

    T-->>P: Confirmation + peer list

    Note over P: Stopping client

    P->>T: HTTP GET /announce?<br/>...&event=stopped

    T-->>P: Acknowledgment
```

---

## Bandwidth Flow: Tit-for-Tat in Action

```mermaid
flowchart TB
    subgraph Round["Choking Round (every 10s)"]
        direction TB
        R1[Measure download rates<br/>from all peers]
        R2[Sort peers by<br/>download rate DESC]
        R3[Unchoke top 4<br/>fastest uploaders]
        R4[Choke everyone else]
        R1 --> R2 --> R3 --> R4
    end

    subgraph Optimistic["Optimistic Unchoke (every 30s)"]
        O1[Select 1 random<br/>interested + choked peer]
        O2[Unchoke for 30s<br/>to test reciprocity]
        O1 --> O2
    end

    subgraph Result["Equilibrium"]
        E1[Fast uploaders get<br/>fast downloads]
        E2[Free-riders get only<br/>optimistic unchoke slots]
        E3[New peers get<br/>bootstrap opportunity]
    end

    Round --> Result
    Optimistic --> Result

    classDef round fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef optimistic fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef result fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class R1,R2,R3,R4 round
    class O1,O2 optimistic
    class E1,E2,E3 result
```
