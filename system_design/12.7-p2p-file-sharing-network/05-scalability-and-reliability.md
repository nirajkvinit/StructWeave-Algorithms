# Scalability & Reliability — P2P File Sharing Network

## Scalability

### The Self-Scaling Property: P2P's Fundamental Advantage

The defining scalability characteristic of a P2P file sharing network is that **demand adds supply**. In every client-server system, a new user adds load. In P2P, a new user adds both load AND bandwidth capacity. This creates a fundamentally different scaling curve.

#### Quantitative Analysis

| Swarm Size | Total Upload Capacity (5 Mbps avg) | Per-Leecher Bandwidth | Time for 4 GiB |
|---|---|---|---|
| 10 peers (1 seeder) | 5 Mbps (seeder only) + 9 × 2 Mbps = 23 Mbps | ~2.6 Mbps | ~2 hours |
| 100 peers (10 seeders) | 50 + 90 × 3 = 320 Mbps | ~3.6 Mbps | ~1.5 hours |
| 1,000 peers (100 seeders) | 500 + 900 × 4 = 4,100 Mbps | ~4.6 Mbps | ~1.2 hours |
| 10,000 peers (1,000 seeders) | 5,000 + 9,000 × 4 = 41,000 Mbps | ~4.6 Mbps | ~1.2 hours |
| 50,000 peers (5,000 seeders) | 25,000 + 45,000 × 4 = 205 Gbps | ~4.6 Mbps | ~1.2 hours |

**Key insight**: Per-leecher bandwidth converges to a ceiling determined by average peer upload speed, not by swarm size. Beyond a few hundred peers, adding more peers doesn't degrade performance — it maintains it. This is the opposite of client-server, where more users = worse performance without more servers.

#### The Flash Crowd Advantage

Client-server flash crowd:
- 100,000 users request simultaneously
- Server capacity: 100 Gbps
- Per-user: 1 Mbps (degraded)
- Solution: Pre-provision or auto-scale CDN (expensive)

P2P flash crowd:
- 100,000 users arrive simultaneously
- Initial seeder: 100 Mbps
- After 10 minutes: Thousands of partial copies distributing pieces
- After 30 minutes: Per-user bandwidth approaches steady-state
- Solution: Built into the protocol (free)

### DHT Scalability

The Kademlia DHT scales logarithmically with network size:

| Network Size | Routing Table Entries | Lookup Hops (avg) | Lookup Latency |
|---|---|---|---|
| 1,000 nodes | ~80 | ~10 | ~1 second |
| 100,000 nodes | ~140 | ~17 | ~1.7 seconds |
| 1,000,000 nodes | ~170 | ~20 | ~2 seconds |
| 10,000,000 nodes | ~200 | ~23 | ~2.3 seconds |
| 25,000,000 nodes | ~210 | ~25 | ~2.5 seconds |

**Why O(log n) works**: Each hop in a Kademlia lookup halves the XOR distance to the target. With n nodes, the maximum distance is n, and halving distance log2(n) times reaches distance 1 (the target neighborhood). The α=3 parallel queries provide redundancy and speed — even if one node is slow or offline, the other two queries continue converging.

**Memory scaling**: Each node stores a fixed-size routing table (~200-500 entries regardless of network size) plus a bounded peer store (announce entries expire after 30 minutes). Memory usage per node is O(1) relative to network size.

### Tracker Scalability

While trackers are centralized, they can scale effectively:

| Technique | Benefit | Implementation |
|---|---|---|
| **UDP protocol** | 10-50x lower overhead than HTTP; stateless | Single UDP socket handles all requests |
| **In-memory peer store** | Sub-millisecond lookups | Hash map: info-hash → peer list |
| **Compact responses** | 75% bandwidth reduction | 6 bytes per peer instead of ~25 |
| **Peer sampling** | O(1) response size regardless of swarm size | Return random 50-200 peers from swarm |
| **Announce jitter** | Spreads load uniformly over time | Client adds ±10% random offset to announce interval |
| **Horizontal sharding** | Linear capacity scaling | Shard by info-hash across tracker instances |
| **Geographic distribution** | Reduced latency, fault isolation | Tracker mirrors in multiple regions |

**Single-tracker capacity**: A well-optimized UDP tracker on modern hardware handles 100,000+ announces per second on a single server, supporting millions of peers across hundreds of thousands of torrents.

---

## Reliability

### Peer Churn Handling

P2P networks experience massive churn — peers connect and disconnect continuously. The BitTorrent Mainline DHT sees 10+ million node joins and departures per day. The system must remain functional despite this constant flux.

#### DHT Churn Resilience

| Mechanism | How It Handles Churn |
|---|---|
| **k-bucket redundancy** | Each bucket holds k=8 nodes. All 8 must die before the bucket is empty. |
| **Replacement cache** | Each bucket maintains backup nodes. When an active node dies, a replacement is promoted instantly. |
| **Prefer old nodes** | Kademlia eviction policy keeps long-lived nodes, which have higher survival probability. |
| **Announce replication** | `announce_peer` stores peer info on the k closest nodes. Even if some die, others still serve the data. |
| **Announce TTL & refresh** | Announcements expire after 30 minutes. Active peers re-announce every 15 minutes. Stale entries auto-expire. |
| **Bucket refresh** | Every 15 minutes, empty or stale buckets trigger a random lookup, discovering new nodes. |

#### Swarm Churn Resilience

| Mechanism | How It Handles Churn |
|---|---|
| **Rarest-first replication** | Rare pieces are prioritized for download, preventing piece extinction as peers leave. |
| **PEX gossip** | Connected peers continuously share their peer lists. New peers replace departed ones within seconds. |
| **Tracker re-announce** | Every 30 minutes, peers re-announce to the tracker, providing a fresh view of active peers. |
| **Optimistic unchoke** | Continuously introduces new peers to the swarm, replacing choking relationships lost to churn. |
| **Peer pipeline** | Client maintains 50-80 connections but tolerates any individual disconnection gracefully. |

### Seeder Incentives and Content Availability

The fundamental reliability question for P2P: **why would anyone seed after their download completes?**

| Incentive Mechanism | Description | Effectiveness |
|---|---|---|
| **Ratio enforcement** | Private trackers require upload/download ratio ≥ 1.0 | Very high (for private communities) |
| **Social norms** | Community expectations to "give back" | Moderate (works for enthusiast communities) |
| **Default client behavior** | Clients default to seeding until ratio reaches a threshold or time limit | Moderate (many users override) |
| **Super-seeding mode** | Gives seeders strategic control over piece distribution | Increases seeding efficiency, making seeding less costly |
| **Gamification** | Badges, ranks, points for upload contribution | Moderate (works in communities with identity) |
| **Web seeds** | HTTP servers provide baseline availability regardless of peer seeders | High reliability fallback |

### Piece Availability Analysis

The probability that a piece is available in the swarm depends on:
- Number of copies of that piece across all peers
- Independent probability that each peer holding the piece is online

```
FUNCTION piece_availability_probability(copies, peer_online_probability):
    // Probability that at least one copy is available
    // P(available) = 1 - P(all copies offline)
    // P(all copies offline) = (1 - peer_online_probability) ^ copies

    p_unavailable = (1 - peer_online_probability) ^ copies
    RETURN 1 - p_unavailable

// Examples with peer_online_probability = 0.3 (30% of peers online at any time):
// copies = 1:   P(available) = 0.30 (30%)
// copies = 5:   P(available) = 0.83 (83%)
// copies = 10:  P(available) = 0.97 (97%)
// copies = 20:  P(available) = 0.999 (99.9%)
// copies = 50:  P(available) = 0.99999999 (~100%)

// With rarest-first, even the rarest piece typically has 10+ copies
// This is why rarest-first is critical for reliability
```

---

## Disaster Recovery

### DHT Partition Healing

When the DHT network experiences a partition (e.g., due to submarine cable damage or regional internet issues), nodes in each partition continue operating independently. When the partition heals:

1. **Automatic discovery**: Normal lookup traffic crosses the former partition boundary, discovering previously unreachable nodes
2. **Routing table update**: Newly discovered cross-partition nodes are added to k-buckets following normal eviction rules
3. **Peer store reconciliation**: Announce entries for torrents are re-replicated across the healed network
4. **Convergence time**: Full healing takes 15-30 minutes (one full bucket refresh cycle)

No manual intervention is required — the DHT's self-healing properties handle partition recovery automatically.

### Tracker Failover

| Strategy | Implementation | RTO |
|---|---|---|
| **Multi-tracker announce** | .torrent files list multiple trackers in tiers; client tries each in order | Immediate failover to next tier |
| **Tracker + DHT hybrid** | If all trackers fail, DHT provides peer discovery | Automatic; DHT always running in parallel |
| **Active-passive tracker** | Primary tracker with hot standby; shared peer store in distributed cache | < 30 seconds |
| **DNS-based failover** | Tracker hostname resolves to multiple IPs; DNS removes failed instances | DNS TTL dependent (30-300 seconds) |

### Content Recovery After Mass Seed Loss

**Scenario**: A popular torrent loses all seeders (e.g., only seeder goes offline).

| Stage | Action | Timeline |
|---|---|---|
| 1 | Leechers detect no seeders available | Immediate (no peers have remaining pieces) |
| 2 | Leechers continue sharing pieces they have with each other | Ongoing (the swarm may have all pieces collectively) |
| 3 | If pieces are extinct (no peer has them), download stalls | Depends on piece distribution |
| 4 | New seeder joins (original or web seed) | Variable; could be minutes to days |
| 5 | Rarest-first immediately prioritizes the previously extinct pieces | Within seconds of new seeder connecting |
| 6 | Swarm recovers full piece availability | Minutes (depending on seeder bandwidth) |

**Key insight**: Even without seeders, if the collective swarm has all pieces (distributed across different leechers), the download can complete. This is a direct consequence of the content-addressed, piece-level architecture.

---

## Scaling Bottlenecks and Mitigations Summary

| Bottleneck | Scaling Limit | Mitigation | Result |
|---|---|---|---|
| **DHT lookup latency** | O(log n) grows slowly but adds up | α=3 parallelism, caching recent lookups | 2-4 seconds even at 25M nodes |
| **Tracker announce load** | CPU-bound request processing | UDP protocol, horizontal sharding | 100K+ announces/sec per server |
| **Single seeder for new content** | Seeder upload bandwidth | Super-seeding, web seeds, multi-location initial seed | First full copy in 15-60 minutes for large files |
| **NAT traversal failure rate** | ~5-15% of peer pairs cannot connect directly | TURN-style relay through third peer | 100% connectivity (with latency penalty) |
| **Piece metadata overhead** | Grows linearly with file size / piece size | v2 Merkle trees allow lazy verification | Sub-KiB per piece |
| **Connection count per client** | OS file descriptor limits | uTP multiplexing, connection pruning | Effective management within 200-500 connections |
