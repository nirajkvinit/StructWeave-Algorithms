# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify | Scope, constraints, scale | Ask about scope (music only? podcasts? offline?) |
| **5-15 min** | High-Level | Core architecture, data flow | Draw CDN + services + databases |
| **15-30 min** | Deep Dive | 1-2 critical components | Pick your strength (streaming, offline, playlists) |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failures | Discuss CAP, consistency choices |
| **40-45 min** | Wrap Up | Summary, questions | Highlight key decisions |

---

## Phase 1: Requirements Clarification (5 min)

### Questions to Ask

1. **Scope**
   - "Should I focus on music streaming only, or include podcasts?"
   - "Is offline mode in scope?"
   - "Are collaborative playlists required?"

2. **Scale**
   - "What's the expected scale? 100M users? 500M?"
   - "Read-heavy or write-heavy? (Streaming is read-heavy)"

3. **Constraints**
   - "What's the latency requirement for playback start? Sub-second?"
   - "Any specific regions to prioritize?"

### Expected Answers to Clarify

| Question | Typical Answer |
|----------|----------------|
| Scale | 500M+ MAU, 50M peak concurrent |
| Content | 100M+ songs, long-tail distribution |
| Latency | < 500ms playback start |
| Offline | Yes, for premium users |
| Collaboration | Yes, real-time playlist editing |

---

## Phase 2: High-Level Design (10 min)

### What to Draw

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SPOTIFY HIGH-LEVEL ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Clients]                                                                   │
│      │                                                                       │
│      ▼                                                                       │
│  [CDN Layer] ← Multi-CDN (Akamai, Fastly, GCP)                              │
│      │                                                                       │
│      ▼                                                                       │
│  [API Gateway] ← Auth, Rate Limiting, Routing                               │
│      │                                                                       │
│      ├──────────────┬──────────────┬──────────────┐                         │
│      ▼              ▼              ▼              ▼                         │
│  [Playback]    [Playlist]    [Search]     [Recommendations]                 │
│      │              │              │              │                         │
│      ▼              ▼              ▼              ▼                         │
│  [DRM Service] [Cassandra]  [Elasticsearch]  [ML Platform]                  │
│      │                                                                       │
│      ▼                                                                       │
│  [Cloud Storage] ← Audio files (Ogg Vorbis, AAC, FLAC)                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Points to Mention

1. **Multi-CDN**: "Unlike Netflix, Spotify uses multi-CDN because audio files are small (4MB vs GB for video)"

2. **Microservices**: "200+ services on Kubernetes, Java/Scala backend"

3. **Database choices**:
   - Cassandra for user data, playlists (write-heavy, eventual consistency)
   - Elasticsearch for search
   - BigQuery for analytics

4. **Async + Sync**: "Sync for playback APIs, async (Kafka) for analytics events"

---

## Phase 3: Deep Dive Options (15 min)

### Option A: Audio Streaming & CDN

**What to cover:**
- Codec selection (Ogg Vorbis vs MP3 vs AAC)
- Adaptive bitrate for audio (simpler than video)
- CDN architecture (multi-CDN, cache hit rate)
- Playback latency optimization

**Key talking points:**
```
Audio Quality Tiers:
- Free: 96-160 kbps Ogg Vorbis
- Premium: up to 320 kbps Ogg Vorbis
- Lossless (2025): FLAC ~1,411 kbps

Why Ogg Vorbis?
- Better quality than MP3 at same bitrate
- No licensing fees (open source)
- Spotify has optimized encoders

CDN Strategy:
- 95%+ cache hit rate (popular songs cached)
- Multi-CDN for redundancy and geographic coverage
- Pre-warm cache for big releases (Taylor Swift drops)
```

### Option B: Offline Mode & DRM

**What to cover:**
- Device-bound encryption
- 30-day re-authentication
- Sync algorithm
- Limits (10K tracks, 5 devices)

**Key talking points:**
```
DRM Flow:
1. User requests download
2. Server validates Premium subscription
3. Generate device-bound encryption key
4. Set 30-day expiry
5. Client downloads encrypted audio
6. Store key in Secure Enclave/TEE

Why 30-Day Limit?
- Music label licensing requirements
- Prevent download-and-cancel abuse
- Security: key rotation best practice
- UX friendly: covers vacations
```

### Option C: Playlist Sync (CRDT)

**What to cover:**
- Why CRDT over last-write-wins
- Version vectors
- Conflict resolution rules
- Offline editing support

**Key talking points:**
```
CRDT Approach:
- Conflict-free Replicated Data Type
- Both concurrent edits preserved
- No data loss (critical for playlists)
- Works offline, merges on reconnect

Conflict Example:
User A adds Track X at position 0
User B adds Track Y at position 0 (concurrent)
Result: Both tracks kept, ordered by timestamp
  [Track X, Track Y, ...] (X was first)
```

### Option D: Recommendations (BaRT)

**What to cover:**
- Bandits for Recommendations as Treatments
- Collaborative filtering + content-based hybrid
- Discover Weekly pipeline
- Cold start problem

**Key talking points:**
```
BaRT System:
- Multi-armed bandit approach
- Balance explore (new content) vs exploit (known likes)
- Thompson Sampling for uncertainty

Discover Weekly Pipeline:
1. Candidate generation: 10K tracks per user
2. Scoring: BaRT model predicts P(save)
3. Diversification: genre/artist variety
4. 30 tracks delivered every Monday
```

---

## Phase 4: Trade-offs Discussion (10 min)

### Major Trade-offs

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **CDN** | Own CDN | Multi-CDN | Multi-CDN: Audio is small, multi-CDN provides flexibility |
| **Codec** | MP3 (universal) | Ogg Vorbis | Ogg: Better quality, no license |
| **Playlist Sync** | Last-write-wins | CRDT | CRDT: No data loss in collaborative editing |
| **Offline Auth** | Per-play check | 30-day window | 30-day: Better UX, acceptable piracy risk |
| **Database** | Single SQL | Polyglot | Polyglot: Right tool for each use case |

### When to Discuss Trade-offs

Interviewer might ask:
- "Why not build your own CDN like Netflix?"
- "Why eventual consistency for playlists?"
- "How do you prevent piracy with offline mode?"

---

## Trap Questions & How to Handle

### Trap 1: "Why doesn't Spotify build their own CDN like Netflix?"

**Bad Answer**: "Audio files are smaller so they don't need their own CDN."

**Good Answer**:
> "Several factors make multi-CDN the right choice for Spotify:
>
> 1. **Traffic volume**: Netflix is 15%+ of internet traffic, justifying infrastructure investment. Spotify is much less.
>
> 2. **File characteristics**: Audio files average 4MB vs video at 2GB+. Less benefit from ISP embedding.
>
> 3. **Content unpredictability**: Podcasts add UGC-like unpredictability. Harder to pre-position.
>
> 4. **Flexibility**: Multi-CDN allows best-of-breed per region and instant failover.
>
> 5. **Focus**: Spotify invests in recommendations and discovery instead of infrastructure."

### Trap 2: "How do you handle playlist conflicts when two users edit simultaneously?"

**Bad Answer**: "Last write wins."

**Good Answer**:
> "Spotify uses CRDTs (Conflict-free Replicated Data Types) for collaborative playlists:
>
> 1. **No data loss**: Both concurrent edits are preserved.
>
> 2. **Version vectors**: Track causality across users/devices.
>
> 3. **Deterministic merge**: Same inputs always produce same result.
>
> 4. **Offline support**: Users can edit offline, merge on reconnect.
>
> For example, if User A adds Track X and User B adds Track Y at the same position concurrently, both tracks are kept. Position is determined by timestamp (earlier wins the requested position).
>
> Trade-off: May result in duplicate tracks that users need to manually clean up."

### Trap 3: "Why do offline downloads expire after 30 days?"

**Bad Answer**: "To prevent piracy."

**Good Answer**:
> "The 30-day window balances several concerns:
>
> 1. **License compliance**: Music labels require periodic verification that the user is still subscribed.
>
> 2. **Revenue protection**: Prevents users from downloading their entire library and canceling.
>
> 3. **Key rotation**: Cryptographic best practice to rotate encryption keys.
>
> 4. **User-friendly**: 30 days is long enough for vacations, cruises, or international travel.
>
> 5. **Silent refresh**: When the app is online, keys refresh automatically in the background, so users rarely notice.
>
> We also show warnings at 7 days remaining to avoid surprise lockouts."

### Trap 4: "What if your recommendation system goes down?"

**Bad Answer**: "Users just won't get recommendations."

**Good Answer**:
> "We have multiple fallback strategies:
>
> 1. **Cache recent recommendations**: Keep last-known-good recommendations for 24 hours.
>
> 2. **Popular content**: Fall back to trending/top charts in the user's region.
>
> 3. **Circuit breaker**: Detect failure quickly, don't retry in a loop.
>
> 4. **Graceful degradation**: Home feed still shows playlists, recently played, new releases - just without personalized sections.
>
> 5. **User impact**: Discover Weekly and Daily Mix would show stale content, but core playback is unaffected."

### Trap 5: "How would you handle 10x scale?"

**Bad Answer**: "Add more servers."

**Good Answer**:
> "Scaling 10x requires changes across multiple layers:
>
> 1. **CDN**: Increase allocation, add more PoPs in growing regions, possibly negotiate better rates.
>
> 2. **Compute (GKE)**: Horizontal auto-scaling handles this automatically, but we'd need to increase quotas and pod limits.
>
> 3. **Cassandra**: Add nodes to the ring. May need to re-evaluate partition keys if hot spots emerge.
>
> 4. **Kafka**: Add partitions and brokers. Review consumer lag.
>
> 5. **Recommendations**: This is the hardest. ML training and inference don't scale linearly. Would need to:
>    - Pre-compute more aggressively
>    - Use approximate nearest neighbor for candidate generation
>    - Consider tiered recommendation quality
>
> 6. **Cost**: 10x users doesn't mean 10x cost if we optimize (better caching, more efficient algorithms)."

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SPOTIFY INTERVIEW CHEAT SHEET                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCALE NUMBERS (memorize)          ARCHITECTURE                              │
│  ────────────────────────          ────────────                              │
│  MAU: 713M                         • Multi-CDN (Akamai, Fastly, GCP)         │
│  Premium: 281M                     • GKE (Kubernetes) microservices          │
│  DAU: 350M                         • Java/Scala backend                      │
│  Peak Concurrent: 50M              • Cassandra (user data, playlists)        │
│  Songs: 100M+                      • Kafka for event streaming               │
│  Playlists: 4B+                    • BigQuery for analytics                  │
│                                                                              │
│  AUDIO FORMATS                     OFFLINE MODE                              │
│  ─────────────                     ────────────                              │
│  Ogg Vorbis: 320kbps max           • Device-bound DRM keys                   │
│  AAC: 256kbps (web)                • 30-day re-authentication                │
│  FLAC: Lossless (2025)             • Max 10K tracks, 5 devices               │
│  Playback latency: 265ms p50       • Encrypted in Secure Enclave             │
│                                                                              │
│  PLAYLIST SYNC                     RECOMMENDATIONS                           │
│  ─────────────                     ───────────────                           │
│  • CRDT for conflicts              • BaRT (Bandits)                          │
│  • Version vectors                 • Collaborative + Content-based           │
│  • No data loss                    • Discover Weekly: 30 tracks/Monday       │
│  • Offline merge                   • 350M+ playlists generated weekly        │
│                                                                              │
│  KEY TRADE-OFFS                                                              │
│  ───────────────                                                             │
│  CDN: Multi-CDN (not own like Netflix) - smaller files, flexibility         │
│  Codec: Ogg Vorbis (not MP3) - quality, no license                          │
│  Sync: CRDT (not LWW) - no data loss in collaboration                       │
│  Offline: 30-day (not per-play) - UX over strict DRM                        │
│                                                                              │
│  WHAT MAKES SPOTIFY UNIQUE                                                   │
│  ────────────────────────                                                    │
│  1. Algorithm-first discovery (vs Apple's editorial)                         │
│  2. Collaborative playlists with CRDT                                        │
│  3. Spotify Connect (device handoff)                                         │
│  4. Podcast leadership                                                       │
│  5. Backstage (open-source dev portal)                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| "Add more servers" for scaling | Doesn't address bottlenecks | Identify specific bottlenecks first |
| Ignoring offline mode | It's a core premium feature | Address DRM, sync, limits |
| Single database for everything | Different access patterns | Polyglot: Cassandra, ES, BigQuery |
| Last-write-wins for playlists | Data loss in collaboration | Explain CRDT approach |
| Own CDN like Netflix | Overkill for audio | Explain why multi-CDN is better |
| Strong consistency everywhere | Too slow, unnecessary | Eventual for playlists, strong for payments |

---

## Questions to Ask Interviewer

1. "What's the expected scale - are we designing for 100M or 1B users?"
2. "Should I prioritize music streaming, or also cover podcasts?"
3. "Is offline mode a must-have or nice-to-have?"
4. "Any specific latency requirements? Sub-second playback start?"
5. "Should I focus on a specific geography or global from day one?"
6. "Is collaborative playlist editing in scope?"

---

## Practice Problems

### Variant 1: Design Spotify for Emerging Markets

Focus on:
- Low bandwidth (64kbps quality tier)
- Offline-first (unreliable connectivity)
- Cheaper storage (aggressive cache limits)
- Feature phones (no app, USSD/SMS?)

### Variant 2: Design Spotify Live (Concerts)

Focus on:
- Low-latency live streaming (< 5s)
- Scalability for millions watching same stream
- DVR/rewind functionality
- Chat/social features

### Variant 3: Design Spotify for Podcasts Only

Focus on:
- Variable-length content (30 min - 4 hours)
- Chapters and bookmarks
- Download prioritization
- Video podcasts
- Creator upload pipeline

---

## Interview Scoring Rubric

| Criteria | Exceeds | Meets | Below |
|----------|---------|-------|-------|
| **Requirements** | Asked clarifying questions, identified edge cases | Covered main requirements | Jumped to solution |
| **Architecture** | Clear, scalable, justified choices | Reasonable architecture | Missing key components |
| **Deep Dive** | Detailed algorithms, failure modes | Explained key components | Surface level only |
| **Trade-offs** | Discussed multiple options with pros/cons | Mentioned trade-offs | No trade-off discussion |
| **Scale** | Addressed specific bottlenecks | General scaling strategy | "Add more servers" |
| **Communication** | Clear, structured, adapted to feedback | Clear explanation | Hard to follow |
