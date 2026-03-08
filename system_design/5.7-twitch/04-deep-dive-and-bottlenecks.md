# Deep Dive & Bottlenecks

## 1. Critical Component #1: Intelligest — Live Video Ingest Routing

### Why Is This Critical?

The ingest layer is the **single point of entry** for all live video on the platform. If routing fails, streams either can't start or get assigned to overloaded origins, causing transcoding failures and viewer-facing quality degradation. Twitch retired HAProxy precisely because static routing couldn't handle the dynamic, bursty nature of live streaming traffic.

### How It Works Internally

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
flowchart TB
    subgraph PoP["Point of Presence (PoP)"]
        MP["Intelligest Media Proxy"]
        RTMP_IN["RTMP/ERTMP Termination"]
        EXTRACT["Stream Property Extraction<br/>(codec, resolution, fps, bitrate)"]
    end

    subgraph IRS["Intelligest Routing Service (Control Plane)"]
        ROUTER["Routing Engine<br/>(Randomized Greedy)"]
        CAP["Capacitor<br/>(Compute Monitoring)"]
        WELL["The Well<br/>(Network Monitoring)"]
        RULES["Rule Engine<br/>(Special Channel Routing)"]
        OFFLINE["Offline Optimizer<br/>(Historical Demand Model)"]
    end

    subgraph Origins["Origin Data Centers"]
        O1["Origin DC 1<br/>(US-East)"]
        O2["Origin DC 2<br/>(US-West)"]
        O3["Origin DC 3<br/>(EU)"]
        O4["Origin DC 4<br/>(APAC)"]
    end

    RTMP_IN --> EXTRACT
    EXTRACT --> MP
    MP -->|"Route Query<br/>(stream properties + PoP location)"| ROUTER
    ROUTER --> CAP
    ROUTER --> WELL
    ROUTER --> RULES
    OFFLINE -.->|"Pre-computed weights"| ROUTER
    CAP -.->|"Real-time compute<br/>availability"| O1 & O2 & O3 & O4
    WELL -.->|"Backbone bandwidth<br/>utilization"| O1 & O2 & O3 & O4
    ROUTER -->|"Selected origin"| MP
    MP -->|"Canonical protocol"| O1
    MP -->|"Canonical protocol"| O2

    classDef pop fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef irs fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef origin fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class MP,RTMP_IN,EXTRACT pop
    class ROUTER,CAP,WELL,RULES,OFFLINE irs
    class O1,O2,O3,O4 origin
```

**Key Design Decisions:**

1. **Randomized Greedy (not pure greedy)** — Pure greedy routing causes "herding": all PoPs simultaneously pick the same best origin, overloading it. Adding randomization among top-K candidates distributes load more evenly.

2. **Two-pronged capacity monitoring:**
   - **Capacitor** — Continuously polls origin DCs for available CPU/GPU compute slots. Detects capacity fluctuations (hardware failures, maintenance windows).
   - **The Well** — Monitors backbone network links between every PoP-Origin pair. Detects congestion, link failures, and bandwidth exhaustion.

3. **Offline + Online hybrid** — An offline optimization solver pre-computes baseline routing weights using historical demand patterns. The online randomized greedy algorithm adjusts these weights in real-time based on current capacity.

4. **Rule-based overrides** — Special channels (esports tournaments, Amazon-partnered events) can be pinned to specific origins with guaranteed capacity reservations.

5. **L3 DiffServ marking** — Live video traffic receives differentiated services markings for priority treatment over the private backbone.

### Failure Modes & Handling

| Failure Mode | Impact | Mitigation |
|-------------|--------|------------|
| IRS unavailable | PoPs can't get routing decisions | **Fallback**: PoPs use cached last-known-good routes + round-robin across origins |
| Origin DC capacity exhaustion | New streams can't be transcoded | Capacitor detects and removes DC from candidate pool; IRS re-routes to other origins |
| Backbone link failure | Streams on affected path drop | Well detects within seconds; IRS re-routes affected streams to alternate origins via different paths |
| PoP failure | Regional streamers can't connect | DNS-based failover redirects streamers to next-nearest PoP (anycast or GeoDNS) |
| Streamer sends unexpected codec | Transcoder can't process | Media proxy validates stream properties before forwarding; rejects unsupported codecs with error |

---

## 2. Critical Component #2: Real-Time Transcoding Pipeline

### Why Is This Critical?

Transcoding is the **most compute-intensive operation** in the entire platform. Every incoming stream must be decoded and re-encoded into 3-5 quality variants in real-time. Any processing delay directly increases glass-to-glass latency for all viewers. At 100K concurrent streams, this requires hundreds of thousands of CPU cores or specialized hardware.

### How It Works Internally

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
flowchart LR
    subgraph Input["Input Stage"]
        RTMP["RTMP Stream<br/>(from PoP)"]
        DEMUX["Demuxer<br/>(Extract A/V)"]
        DEC["Shared Decoder<br/>(H.264/AV1)"]
    end

    subgraph Processing["Processing Stage (per variant)"]
        direction TB
        S1["Scaler → 1080p"]
        S2["Scaler → 720p"]
        S3["Scaler → 480p"]
        S4["Scaler → 160p"]

        E1["Encoder (6 Mbps)"]
        E2["Encoder (2.5 Mbps)"]
        E3["Encoder (1.5 Mbps)"]
        E4["Encoder (400 Kbps)"]
    end

    subgraph IDR["IDR Alignment"]
        ALIGN["IDR Frame<br/>Synchronizer"]
    end

    subgraph Output["Output Stage"]
        SEG["HLS Segment<br/>Packager"]
        META["Metadata<br/>Injector"]
        MAN["Manifest<br/>Generator"]
        PUB["Publish to<br/>Replication Tree"]
    end

    RTMP --> DEMUX --> DEC
    DEC --> ALIGN

    ALIGN --> S1 --> E1
    ALIGN --> S2 --> E2
    ALIGN --> S3 --> E3
    ALIGN --> S4 --> E4

    E1 --> SEG
    E2 --> SEG
    E3 --> SEG
    E4 --> SEG

    SEG --> META --> MAN --> PUB

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef proc fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef idr fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef output fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class RTMP,DEMUX,DEC input
    class S1,S2,S3,S4,E1,E2,E3,E4 proc
    class ALIGN idr
    class SEG,META,MAN,PUB output
```

**Why Twitch Built a Custom Transcoder (Not FFmpeg):**

1. **IDR Frame Alignment** — FFmpeg encoders operate independently, causing misaligned IDR (keyframe) positions across variants. HLS requires aligned IDR frames for seamless ABR switching. Misalignment caused playback issues on devices like Chromecast (constant pausing). Twitch's custom transcoder uses a centralized IDR synchronizer.

2. **Shared Decoder** — FFmpeg's 1-in-1-out model runs N independent decoders for N variants. Twitch's design shares a single decoder across all variants, saving ~30% CPU.

3. **Intelligent Frame Rate Conversion** — Converting 60fps to 30fps by dropping every other frame is naive and produces visual artifacts. Twitch's transcoder uses motion-aware frame selection.

4. **Custom Metadata Injection** — Proprietary metadata structures embedded in HLS segments, parsed by the Twitch player for features like low-latency mode indicators, ad insertion markers, and clip timestamp alignment.

5. **ASIC-Based Transcoding (2023+)** — Twitch prototyped ASIC-based encoding hardware achieving **10x the scale** with improved quality per watt. This is the same trajectory as Google (YouTube) and Apple (silicon encoders).

### Enhanced Broadcasting: Client-Side Transcoding

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
flowchart LR
    subgraph Traditional["Traditional Path"]
        T1["Streamer sends<br/>1 × 1080p60 RTMP"]
        T2["Origin transcodes<br/>→ 5 variants"]
        T3["High server<br/>compute cost"]
    end

    subgraph Enhanced["Enhanced Broadcasting Path"]
        E1["Streamer GPU encodes<br/>3 × variants (NVENC)"]
        E2["ERTMP: 3 tracks<br/>in 1 connection"]
        E3["Origin: package only<br/>(no transcode)"]
        E4["90% compute<br/>reduction"]
    end

    T1 --> T2 --> T3
    E1 --> E2 --> E3 --> E4

    classDef trad fill:#fce4ec,stroke:#c62828,stroke-width:2px
    classDef enh fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class T1,T2,T3 trad
    class E1,E2,E3,E4 enh
```

### Failure Modes & Handling

| Failure Mode | Impact | Mitigation |
|-------------|--------|------------|
| Transcoder crash | Stream goes offline for viewers | Watchdog restarts transcoder within 2-3s; IRS can re-route stream to backup origin |
| CPU saturation | Increased latency, dropped frames | Autoscaling triggers; quality ladder reduction (drop highest variant first) |
| Corrupted input frames | Decoder errors, visual artifacts | Error concealment (repeat last good frame); stream health metrics alert streamer |
| ASIC hardware failure | Capacity reduction | Graceful fallback to CPU-based transcoding on same origin |
| ERTMP stream with missing tracks | Incomplete quality ladder | Fill missing variants with server-side transcode from highest available track |

---

## 3. Critical Component #3: Chat Fanout System (Edge + PubSub)

### Why Is This Critical?

Chat is Twitch's **core engagement mechanism** — it differentiates live streaming from video-on-demand. A popular channel with 200K concurrent viewers requires delivering every chat message to 200K WebSocket connections with sub-300ms latency. The system handles hundreds of billions of messages per day.

### How It Works Internally

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
flowchart TB
    subgraph Viewers["200K Viewers in Channel"]
        V1["Viewer Group 1<br/>(50K connections)"]
        V2["Viewer Group 2<br/>(50K connections)"]
        V3["Viewer Group 3<br/>(50K connections)"]
        V4["Viewer Group 4<br/>(50K connections)"]
    end

    subgraph EdgeNodes["Chat Edge Layer (Go)"]
        E1["Edge Node 1<br/>(handles 50K conns)"]
        E2["Edge Node 2<br/>(handles 50K conns)"]
        E3["Edge Node 3<br/>(handles 50K conns)"]
        E4["Edge Node 4<br/>(handles 50K conns)"]
    end

    subgraph PubSubCluster["PubSub Cluster"]
        PS1["PubSub Node 1"]
        PS2["PubSub Node 2"]
        PS3["PubSub Node 3"]
    end

    subgraph Moderation["Moderation Pipeline"]
        CLUE["Clue Service"]
        AUTOMOD["AutoMod<br/>(ML Filter)"]
        RULES["Channel Rules<br/>(Ban list, slow mode)"]
    end

    V1 <-->|"WebSocket"| E1
    V2 <-->|"WebSocket"| E2
    V3 <-->|"WebSocket"| E3
    V4 <-->|"WebSocket"| E4

    E1 <--> PS1
    E2 <--> PS2
    E3 <--> PS3
    E4 <--> PS1

    E1 --> CLUE
    CLUE --> AUTOMOD
    CLUE --> RULES

    classDef viewer fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef pubsub fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef mod fill:#fce4ec,stroke:#c62828,stroke-width:2px

    class V1,V2,V3,V4 viewer
    class E1,E2,E3,E4 edge
    class PS1,PS2,PS3 pubsub
    class CLUE,AUTOMOD,RULES mod
```

**Hierarchical Fanout Design:**

The key insight is **two-level fanout** instead of single-level:

1. **PubSub Level** — When a message arrives, the Edge node publishes it to the PubSub cluster. PubSub knows which Edge nodes have subscribers for that channel and fans out to only those Edge nodes (not all edges). For a channel with 200K viewers across 4 Edge nodes, PubSub sends 4 copies.

2. **Edge Level** — Each Edge node then locally delivers the message to all connected viewers for that channel. An Edge node handling 50K connections for this channel sends 50K copies.

**Total messages generated:** 4 (PubSub) + 200K (Edge delivery) = ~200K
**Without hierarchy:** 200K messages directly from a single point = impossible at scale

**Go's Role in Chat:**

Twitch's migration from Python (Tornado) to Go for chat was driven by:
- **Goroutines** — One goroutine per WebSocket connection. 50K goroutines on a single Edge node is trivial for Go's scheduler.
- **Performance** — Go doubled throughput-per-thread versus the Python implementation.
- **Memory efficiency** — Each goroutine uses ~4KB stack (vs Python's heavier threads), enabling 100K+ connections per node.

**Chat Moderation Pipeline (Clue):**

```
Message arrives → Clue evaluates:
  1. Is sender banned in this channel? → Reject
  2. Is channel in slow mode? → Rate limit check
  3. Is channel in subscribers-only mode? → Check sub status
  4. Is channel in emote-only mode? → Validate content
  5. AutoMod ML filter → Toxicity / harassment score
  6. Custom word filter (channel-specific) → Regex match
  7. Link detection → Allow/deny based on channel settings
→ Result: ALLOW | DENY | HOLD_FOR_REVIEW
```

### Failure Modes & Handling

| Failure Mode | Impact | Mitigation |
|-------------|--------|------------|
| Edge node crash | Viewers on that node lose chat | Viewers auto-reconnect to different Edge node; connection state restored from Room service |
| PubSub node failure | Messages not delivered to some edges | PubSub cluster has replicas; remaining nodes take over channel subscriptions |
| Chat flood (raid/bot attack) | Legitimate messages delayed | Per-channel and per-user rate limiting; AutoMod escalation; follower-only/sub-only mode |
| Clue service slow/down | Messages delayed or unmoderated | **Circuit breaker**: If Clue is slow, allow messages with async moderation (delete retroactively) |
| Message ordering issues | Out-of-order messages in chat | Best-effort ordering via timestamps; exact ordering is not guaranteed (eventual consistency) |

---

## 4. Concurrency & Race Conditions

### 4.1 Subscription State During Stream

**Problem:** Viewer subscribes during a stream. Their entitlements (emotes, badge, ad-free) must be reflected in chat immediately, but the subscription is processed asynchronously through 40+ commerce microservices.

**Solution:**
```
1. Payment Service processes charge (strong consistency)
2. Subscription Service writes to database (ACID)
3. Event published: "subscription.created"
4. Chat entitlement cache updated (Redis) — async but fast (<500ms)
5. Chat Edge checks Redis for subscriber status on next message

Race window: ~500ms where user might not have subscriber badge.
Acceptable because it's transient and non-critical.
```

### 4.2 Viewer Count Accuracy

**Problem:** 2.5M concurrent viewers across thousands of Edge nodes. Maintaining an exact count requires global coordination (too expensive).

**Solution:** **Approximate counting with periodic reconciliation**
```
- Each Edge node maintains a local count per channel
- Every 15 seconds, Edge nodes report deltas to a centralized counter service
- Counter service aggregates and publishes updated counts
- Displayed counts may be off by ±5% at any moment
- Exact counts computed post-hoc for analytics
```

### 4.3 Clip Creation Race

**Problem:** Multiple viewers create clips from the same stream moment simultaneously.

**Solution:**
```
- Rate limit: 1 clip per user per channel per 60 seconds
- No deduplication of similar clips (different viewers, different perspectives)
- Clip references VOD timestamp — actual video data is shared
- Clip creation is idempotent per (user_id, channel_id, timestamp_range)
```

### 4.4 Concurrent Bit Cheers

**Problem:** During hype moments, thousands of viewers cheer Bits simultaneously. Each cheer must debit the viewer's balance and credit the streamer atomically.

**Solution:**
```
- Viewer's Bits balance stored in transactional database
- Each cheer: BEGIN → debit viewer → credit streamer → COMMIT
- Optimistic locking on viewer balance (CAS: Compare-And-Swap)
- If balance insufficient, transaction fails (no partial charges)
- Cheer animation rendered client-side immediately (optimistic UI)
- Background reconciliation catches any discrepancies
```

---

## 5. Bottleneck Analysis

### Bottleneck #1: Transcoding Compute at Peak

**Problem:** During major events (new game launches, esports finals), concurrent streams can spike 3-5x. Each stream requires ~5 vCPUs for 5-variant transcoding. At 100K concurrent streams → 500K vCPUs. At 300K concurrent (event spike) → 1.5M vCPUs.

**Mitigation Strategies:**
1. **Enhanced Broadcasting** — Offload transcoding to streamer's GPU. For streamers with capable hardware, origin only needs to package HLS segments (10x reduction in compute per stream).
2. **ASIC-based transcoding** — Custom hardware achieving 10x density vs CPU encoding. Already prototyped as of 2023.
3. **Quality ladder reduction** — Under pressure, reduce from 5 variants to 3 for non-partner channels. Partners always get full quality ladder.
4. **Capacity reservation** — For announced events, pre-reserve origin capacity and pre-warm ASIC pools.
5. **Overflow to cloud compute** — Burst to cloud-based GPU/CPU instances for unexpected spikes.

### Bottleneck #2: Chat Fanout for Mega-Channels

**Problem:** A channel with 500K+ concurrent viewers means every chat message must be delivered to 500K WebSocket connections. At 100 messages/second in chat, that's 50M message deliveries per second for one channel.

**Mitigation Strategies:**
1. **Message sampling for ultra-popular channels** — Above a threshold (e.g., 100K viewers), not every message is delivered to every viewer. A representative sample is shown, with subscriber/moderator/highlighted messages always included.
2. **Slow mode** — Reduce message rate in large channels (e.g., 1 message per 3 seconds per user).
3. **Edge-level batching** — Batch multiple chat messages into a single WebSocket frame (e.g., batch 10 messages every 100ms instead of sending individually).
4. **Geographic sharding of Edge nodes** — Viewers in EU connect to EU Edge nodes; fanout is localized first, then cross-region.
5. **Subscriber-only mode** — Dramatically reduces message volume while preserving community engagement.

### Bottleneck #3: Replication Tree Propagation Delay

**Problem:** HLS segments must propagate from origin through mid-tier to edge cache nodes before viewers can request them. Each hop adds latency. For viewers far from origins, propagation through 2-3 tiers can add 1-2 seconds to glass-to-glass latency.

**Mitigation Strategies:**
1. **Demand-based replication** — Only replicate to edge nodes that have active viewers for that stream. A stream with 10 viewers doesn't need global replication.
2. **Push-based propagation** — Don't wait for edge nodes to pull; origin proactively pushes segments to known high-demand edges.
3. **Edge-local caching** — Hot streams' segments cached in RAM at edge (not disk). RAM access is ~100x faster than disk.
4. **Segment pre-loading** — Begin transmitting next segment before the current one finishes playing (pipelining).
5. **Low-Latency HLS** — Twitch's 2021 migration cut latency from ~6s to ~2s by using partial segments (CMAF) and blocking playlist requests.
