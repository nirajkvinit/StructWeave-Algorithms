# Requirements & Estimations — P2P File Sharing Network

## Functional Requirements

### Core Features (In Scope)

| # | Requirement | Description |
|---|---|---|
| FR-1 | **File Publishing** | A user can create a torrent from any file or directory, generating metadata (piece hashes, file structure) and announcing availability to the network |
| FR-2 | **Peer Discovery** | The system discovers peers sharing the same content through multiple mechanisms: tracker announce, DHT lookup, peer exchange, and local service discovery |
| FR-3 | **Parallel Multi-Peer Download** | A client downloads different pieces simultaneously from multiple peers, aggregating bandwidth from the entire swarm |
| FR-4 | **Piece-Level Integrity Verification** | Every downloaded piece is verified against its cryptographic hash before being accepted and made available for upload |
| FR-5 | **Resume & Partial Download** | Downloads can be paused and resumed across client restarts; partial downloads retain all completed pieces |
| FR-6 | **Seeding (Upload to Peers)** | After completing a download (or while in progress), the client uploads pieces to other requesting peers |
| FR-7 | **Bandwidth Allocation** | The choking/unchoking algorithm fairly distributes upload bandwidth based on reciprocity (tit-for-tat) |
| FR-8 | **Magnet Link Support** | Content can be identified and downloaded using only an info-hash (magnet URI), with metadata fetched from the swarm |
| FR-9 | **Selective File Download** | In multi-file torrents, users can choose which files to download without fetching the entire torrent |
| FR-10 | **Swarm Health Reporting** | The client reports swarm statistics: peer count, seeder/leecher ratio, piece availability, download/upload speeds |

### Out of Scope

| Feature | Rationale |
|---|---|
| **Content Search/Indexing** | Search is handled by external indexing sites, not the P2P protocol itself |
| **Content Moderation** | The protocol is content-agnostic; moderation is an application-layer concern |
| **User Accounts/Authentication** | P2P protocols operate with pseudonymous peer IDs, not authenticated identities |
| **Payment/Subscription** | Incentive mechanisms are protocol-level (tit-for-tat), not monetary |
| **Streaming Playback** | Sequential piece selection for streaming is a client-side optimization, not a protocol requirement |

---

## Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| **Availability** | No single point of failure for content availability | Content available while ≥1 seed exists |
| **Availability** | DHT network operational availability | 99.99% (distributed, no central dependency) |
| **Availability** | Tracker availability (when used) | 99.9% (centralized component, redundant deployment) |
| **Performance** | Peer discovery latency (DHT) | < 10 seconds for initial peer set |
| **Performance** | Peer discovery latency (tracker) | < 2 seconds for announce response |
| **Performance** | Piece verification throughput | ≥ 500 MiB/s hash computation on modern hardware |
| **Performance** | Download speed vs available bandwidth | ≥ 85% utilization of available peer bandwidth |
| **Integrity** | Data corruption detection rate | 100% — every piece verified against hash before acceptance |
| **Integrity** | False positive hash rejection rate | 0% — SHA-256 collision probability is negligible (2^-128) |
| **NAT Traversal** | Direct connection success rate (UDP) | ≥ 82% of peer pairs behind NAT |
| **NAT Traversal** | Direct connection success rate (TCP) | ≥ 64% of peer pairs behind NAT |
| **Fairness** | Free-rider bandwidth penalty | Free-riders receive ≤ 20% of cooperative peer bandwidth |
| **Scalability** | Concurrent DHT nodes supported | 25+ million without performance degradation |
| **Scalability** | Concurrent peers per swarm | 50,000+ without coordination bottlenecks |
| **Resilience** | Recovery from peer churn | < 30 seconds to replace departed peers via DHT/PEX |

---

## Capacity Estimations

### Scenario: Popular File Distribution

| Parameter | Value | Rationale |
|---|---|---|
| File size | 4 GiB | Typical large file distribution |
| Piece size | 2 MiB | Balance between metadata overhead and verification granularity |
| Number of pieces | 2,048 | 4 GiB / 2 MiB |
| Piece hash size (v2) | 32 bytes (SHA-256) | Per-piece hash for verification |
| Total hash metadata | 64 KiB | 2,048 × 32 bytes |
| Merkle tree overhead (v2) | ~128 KiB | Interior nodes of binary hash tree |

### Swarm Bandwidth Analysis

| Parameter | Value |
|---|---|
| Concurrent peers in swarm | 5,000 |
| Seeders (complete copies) | 500 (10%) |
| Leechers (downloading) | 4,500 (90%) |
| Average seeder upload bandwidth | 5 Mbps |
| Average leecher upload bandwidth | 2 Mbps (partial file, contributing what they have) |
| **Total swarm upload capacity** | 500 × 5 + 4,500 × 2 = **11,500 Mbps** = **11.5 Gbps** |
| Per-leecher download bandwidth (theoretical) | 11,500 / 4,500 ≈ **2.56 Mbps** |
| Per-leecher download bandwidth (with overhead, ~70% efficiency) | **~1.8 Mbps** |
| Time to download 4 GiB at 1.8 Mbps | ~3 hours |

### Swarm Bandwidth — Highly Seeded Content

| Parameter | Value |
|---|---|
| Concurrent peers | 20,000 |
| Seeders | 5,000 (25%) |
| Leechers | 15,000 |
| Seeder bandwidth | 10 Mbps average (enthusiast seeders) |
| **Total upload capacity** | 5,000 × 10 + 15,000 × 3 = **95 Gbps** |
| Per-leecher bandwidth | 95,000 / 15,000 ≈ **6.3 Mbps** |
| Time to download 4 GiB | ~85 minutes |

### DHT Network Scale

| Parameter | Value |
|---|---|
| Total DHT nodes | 20 million |
| Node ID space | 160 bits (2^160 possible IDs) |
| k-bucket size (k) | 8 nodes per bucket |
| Routing table size per node | ~160 buckets × 8 = ~1,280 entries (max) |
| Actual routing table (typical) | 200-500 entries (most distant buckets empty) |
| Memory per node for routing table | ~50-100 KiB |
| DHT lookup hops | log₂(20M) ≈ 24 hops (theoretical); ~15-20 in practice with parallel α=3 queries |
| DHT lookup latency | 15-20 hops × 100ms RTT = **1.5-2 seconds** (with parallelism) |
| Announce/lookup messages per node per hour | ~100-500 (background DHT maintenance) |

### Tracker Load (Single Popular Tracker)

| Parameter | Value |
|---|---|
| Torrents tracked | 1,000,000 |
| Average peers per torrent | 50 |
| Total peer entries | 50,000,000 |
| Announce interval | 1,800 seconds (30 minutes) |
| Announce requests per second | 50M / 1,800 ≈ **27,800 req/s** |
| Announce request size | ~200 bytes |
| Announce response size (50 peers) | ~350 bytes |
| Bandwidth (inbound) | 27,800 × 200 = **5.3 MiB/s** |
| Bandwidth (outbound) | 27,800 × 350 = **9.3 MiB/s** |
| Compact peer entry size | 6 bytes (4 IP + 2 port) |
| Memory for all peer entries | 50M × 6 = **300 MiB** |

---

## Storage Estimations

### Per-Client Storage

| Component | Size | Notes |
|---|---|---|
| Torrent metadata (per torrent) | 50-500 KiB | Piece hashes, file tree, tracker list |
| DHT routing table | 50-100 KiB | ~500 node entries with contact info |
| Peer connection state | ~2 KiB per peer | Bitfield, choking state, request queue |
| Active connection state (50 peers) | ~100 KiB | All connection metadata |
| Piece bitmap (4 GiB torrent) | 256 bytes | 2,048 bits, one per piece |
| Download queue state | ~10 KiB | Pending requests, priority queue |
| **Total client overhead** | **< 1 MiB** per active torrent | Excluding downloaded content |

### Per-Tracker Storage

| Component | Size | Notes |
|---|---|---|
| Peer entries (50M) | 300 MiB | Compact format: IP + port |
| Torrent index (1M torrents) | 80 MiB | Info-hash → peer list mapping |
| Token cache (announce tokens) | 50 MiB | Anti-spoofing tokens, TTL 10 min |
| **Total tracker memory** | **~430 MiB** | Fits in single server memory |

---

## Network Bandwidth Estimations

### Per-Node DHT Traffic

| Message Type | Size | Frequency | Bandwidth |
|---|---|---|---|
| PING/PONG | ~60 bytes | Every 15 min per stale node | ~50 bytes/s |
| FIND_NODE query/response | ~200 bytes | Routing table refresh, ~10/hour | ~0.6 bytes/s |
| GET_PEERS query/response | ~300 bytes | Per active torrent lookup | ~5 bytes/s per active torrent |
| ANNOUNCE_PEER | ~150 bytes | Every 15 min per active torrent | ~0.2 bytes/s per torrent |
| **Total DHT overhead per node** | | | **~100-500 bytes/s** |

### Wire Protocol Overhead

| Component | Overhead | Context |
|---|---|---|
| Handshake | 68 bytes | Once per peer connection |
| Bitfield message | 5 + ⌈pieces/8⌉ bytes | Once after handshake; 261 bytes for 2,048 pieces |
| Request message | 17 bytes | Per 16 KiB block request |
| Piece message header | 13 bytes | Per 16 KiB block delivery |
| Have message | 9 bytes | Per newly completed piece |
| Protocol overhead ratio | ~0.2% | Header overhead relative to payload |

---

## SLOs

| SLO | Target | Measurement |
|---|---|---|
| **Peer Discovery Time** | p50 < 5s, p99 < 15s | Time from torrent start to first peer connection |
| **Download Efficiency** | ≥ 80% of theoretical swarm bandwidth | Actual throughput vs sum of connected peer upload rates |
| **Piece Integrity** | 100% verified, 0% false rejections | Hash verification pass rate |
| **Seeder Upload Utilization** | ≥ 90% of configured upload cap | Bytes uploaded vs upload limit |
| **DHT Lookup Success** | ≥ 95% find at least one peer for existing content | Lookup completion rate for content with known seeds |
| **NAT Traversal Success** | ≥ 80% direct connections | Peer pairs achieving direct connectivity without relay |
| **Free-Rider Penalty** | Non-contributing peers receive ≤ 20% max speed | Download speed ratio: free-riders vs active uploaders |
| **Swarm Convergence** | 90% piece availability within 30 minutes | Time for rarest piece to reach 10%+ of swarm in a new torrent |
