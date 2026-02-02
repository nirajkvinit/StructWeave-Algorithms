# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | What to Cover |
|------|-------|-------|---------------|
| **0-5 min** | Clarify | Requirements | Scope, scale, constraints |
| **5-15 min** | High-Level | Architecture | Major components, data flow |
| **15-30 min** | Deep Dive | Critical components | 1-2 areas in detail |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failures | Scaling strategy, what-ifs |
| **40-45 min** | Wrap Up | Summary | Questions, next steps |

---

## Phase 1: Requirements Clarification (0-5 min)

### Questions to Ask

| Question | Why It Matters | Netflix Answer |
|----------|----------------|----------------|
| "What's the expected scale?" | Determines architecture complexity | 238M users, 65M peak concurrent |
| "Is this VOD, live, or both?" | Different architectures | Both (VOD primary, live emerging) |
| "Read-heavy or write-heavy?" | Database, caching strategy | Read-heavy (streaming) |
| "What devices to support?" | Client architecture, DRM | Smart TV, mobile, web, consoles |
| "Global or regional?" | Multi-region, CDN strategy | Global (190+ countries) |
| "Latency requirements?" | Caching, edge architecture | <200ms playback start |
| "Consistency requirements?" | Database choice | Eventual for recs, strong for billing |

### Scope Definition

**In Scope:**
- Video streaming (VOD and live)
- Content catalog and search
- Personalized recommendations
- User accounts and profiles
- Subscription management

**Out of Scope:**
- Content acquisition/licensing
- Studio production systems
- Ad-supported tier details (unless asked)
- Games integration

---

## Phase 2: High-Level Design (5-15 min)

### Key Components to Draw

```
1. CLIENT LAYER
   └── Smart TV, Mobile, Web, Consoles

2. EDGE LAYER (Open Connect)
   ├── Edge Appliances (ISP networks)
   └── Storage Appliances (IXPs)

3. GATEWAY LAYER
   └── Zuul API Gateway

4. SERVICE LAYER
   ├── Playback Service
   ├── Catalog Service
   ├── User Service
   └── Personalization (Hydra)

5. DATA LAYER
   ├── CockroachDB (ACID)
   ├── Cassandra (analytics)
   └── EVCache (features)

6. PROCESSING LAYER
   ├── Kafka Keystone
   └── Flink
```

### Data Flow to Explain

**Playback Flow (MUST know):**
1. User clicks play → API Gateway
2. Playback Service checks subscription, rights
3. Gets CDN URLs from Steering Service
4. Returns manifest with quality ladder
5. Client fetches segments from Open Connect
6. 95%+ served from ISP-embedded edge

---

## Phase 3: Deep Dive Options (15-30 min)

The interviewer will likely pick ONE of these areas to go deep:

### Option A: Open Connect CDN

**Key Points:**
- Two-tier: Storage (IXP) + Edge (ISP)
- Free hardware to ISPs (mutual benefit)
- Predictive content placement
- 95% traffic from ISP networks
- Control plane in AWS, data plane global

**Be Prepared For:**
- "How do you decide what to cache where?"
- "What happens on cache miss?"
- "How do you handle ISP outages?"

### Option B: Adaptive Bitrate (ABR)

**Key Points:**
- Hybrid algorithm: throughput + buffer-based
- AV1 codec (30% of streaming, Dec 2025)
- Film Grain Synthesis (24-31% bandwidth savings)
- Context-Aware Encoding per device
- Per-segment quality selection

**Be Prepared For:**
- "Why not pure buffer-based?"
- "How do you handle network fluctuations?"
- "Explain Film Grain Synthesis"

### Option C: Personalization (Hydra)

**Key Points:**
- Multi-task learning (single model, multiple heads)
- 75-80% of viewing from recommendations
- Thumbnail personalization (20-30% lift)
- Feature store in EVCache (<10ms)
- Two-stage: candidate generation → ranking

**Be Prepared For:**
- "How do you handle cold start?"
- "Why multi-task vs separate models?"
- "How do you balance explore vs exploit?"

---

## Phase 4: Trap Questions & Answers

### Trap 1: "Why doesn't Netflix use Akamai or Cloudflare?"

**Bad Answer:** "Third-party CDNs are expensive"

**Good Answer:**
```
"Netflix built Open Connect for several strategic reasons:

1. COST: At 400+ Tbps peak egress, third-party CDN would cost
   $1B+/year. Open Connect reduces this by 95%+.

2. CONTROL: Netflix can implement custom caching logic:
   - Predictive content placement (not possible with third-party)
   - Video-optimized cache policies
   - Custom health monitoring

3. ISP RELATIONSHIPS: Free hardware creates mutual benefit:
   - ISP reduces transit costs (Netflix is 15%+ of internet)
   - Netflix gets low-latency edge delivery
   - Both reduce peering disputes

4. UNIQUE WORKLOAD: Netflix's catalog-based model enables:
   - Predictable demand (not UGC)
   - Pre-population before prime time
   - Release-day cache warming

YouTube can't do this because UGC is unpredictable.
TikTok's short videos need different caching strategy."
```

### Trap 2: "Why use hybrid ABR instead of just buffer-based?"

**Bad Answer:** "Buffer-based is simpler"

**Good Answer:**
```
"Pure buffer-based has issues at session start and during network variability:

1. COLD START PROBLEM:
   - Empty buffer → algorithm picks lowest quality
   - User sees pixelated video, then quality ramps up slowly
   - Poor first impression

2. NETWORK VARIABILITY:
   - Buffer level lags network changes
   - If network suddenly drops, buffer is high but will drain
   - May cause rebuffering

Netflix's hybrid approach:
- Startup: Weight throughput estimation (fast quality ramp)
- Stable: Blend throughput + buffer signals
- Context-aware: Different weights by device, network type

Additional innovations:
- Film Grain Synthesis reduces required bandwidth
- Context-Aware Encoding optimizes per device
- Predictive quality switching before buffer drains"
```

### Trap 3: "How do you handle 65 million concurrent for a live event?"

**Bad Answer:** "Just scale up servers"

**Good Answer:**
```
"Live events need fundamentally different architecture than VOD:

1. SEPARATE INFRASTRUCTURE
   - Live Origin Service (not VOD origin)
   - AWS MediaConnect + MediaLive for cloud ingest
   - EVCache for time-critical manifest updates
   - Different CDN URLs for live content

2. PRE-WARMING
   - Deploy additional capacity before event
   - Pre-warm ALL Open Connect appliances
   - Coordinate with ISPs on expected traffic
   - Test edge appliances in advance

3. TRAFFIC MANAGEMENT
   - Virtual waiting room for gradual admission
   - Geographic staggering if applicable
   - Throttle non-live browsing during peak

4. GRACEFUL DEGRADATION
   - Accept higher latency (30s vs real-time OK)
   - ABR more aggressive toward lower quality
   - Prioritize stream continuity over max quality

The Tyson vs Paul event (65M concurrent) validated this:
- Sub-minute distribution to all devices
- 38M events/second processing
- No major outages"
```

### Trap 4: "Why does 75-80% of viewing come from recommendations?"

**Bad Answer:** "The algorithm is really good"

**Good Answer:**
```
"It's a virtuous cycle of product design + data + ML:

1. UX DESIGN (Product-driven discovery)
   - Home page is recommendation-first
   - Search is de-emphasized
   - Autoplay previews drive discovery
   - Personalized thumbnails (20-30% CTR lift)

2. DATA FLYWHEEL (Massive signal collection)
   - 238M subscribers × years of viewing history
   - 80B+ signals/day into personalization
   - Every play, pause, skip is a signal
   - Implicit feedback (watch time) > explicit (ratings)

3. HYDRA MULTI-TASK LEARNING
   - Single model predicts: watch probability,
     completion, satisfaction
   - Shared representations improve all predictions
   - Multi-armed bandit for thumbnail exploration

4. CONTENT STRATEGY INTEGRATION
   - Recommendations inform content acquisition
   - Know what genres/actors work in each region
   - Original content strategy driven by data

This is why Netflix outperforms simpler approaches:
- YouTube: More search/subscription driven
- TikTok: Algorithm-only but short-form
- Netflix: Algorithm-driven for long-form binge"
```

### Trap 5: "Why AV1 if it's slow to encode?"

**Bad Answer:** "It's the newest codec"

**Good Answer:**
```
"Netflix's encoding economics favor AV1 despite encoding cost:

ENCODE ONCE, SERVE MILLIONS
- Encoding is O(1) per title
- Streaming is O(n) where n = viewers
- AV1's 50% bandwidth savings compounds across all views

FILM GRAIN SYNTHESIS
- Additional 24-31% bandwidth reduction
- Only AV1 supports FGS well
- Preserves cinematic quality

COST ANALYSIS:
- Title encoded once, viewed millions of times
- 10x encoding time is insignificant vs bandwidth savings
- ROI is massive at Netflix scale

ADOPTION STRATEGY:
- AV1 now 30% of streaming (Dec 2025)
- Hardware decode in modern TVs, phones
- Fallback to VP9, H.264 for older devices
- Gradual rollout based on device support

The encoding investment pays for itself many times over
in bandwidth cost and user experience improvements."
```

---

## Trade-off Discussions

### Trade-off 1: Own CDN vs Third-Party

| Factor | Open Connect | Third-Party (Akamai) |
|--------|--------------|----------------------|
| **Upfront Cost** | High (hardware, ops) | Low (pay-as-you-go) |
| **Operating Cost** | Low (ISP partnerships) | High ($1B+/year) |
| **Control** | Full | Limited |
| **Customization** | Unlimited | Constrained |
| **Time to Deploy** | Slow (ISP negotiation) | Fast |
| **Global Coverage** | Build over time | Instant |

**Netflix's Choice:** Open Connect

**Rationale:** Predictable workload (catalog-based), massive scale, long-term cost savings, need for custom optimizations

### Trade-off 2: CockroachDB vs Manual Sharding

| Factor | CockroachDB | Manual Sharding |
|--------|-------------|-----------------|
| **Complexity** | Lower (automatic) | Higher (manual) |
| **Global Distribution** | Built-in | Build yourself |
| **ACID Guarantees** | Full | Difficult |
| **Operational Burden** | Lower | Higher |
| **Maturity** | Newer | Proven |
| **Vendor Risk** | Some | None |

**Netflix's Choice:** CockroachDB (380+ clusters)

**Rationale:** Need global ACID for billing/subscriptions, automatic rebalancing, reduced operational burden

### Trade-off 3: Multi-Task vs Separate Models

| Factor | Multi-Task (Hydra) | Separate Models |
|--------|-------------------|-----------------|
| **Training Efficiency** | Higher (shared data) | Lower |
| **Inference Efficiency** | One forward pass | Multiple passes |
| **Maintenance** | One model | Many models |
| **Specialization** | Moderate | High |
| **Cold Start** | Better (shared reps) | Harder |

**Netflix's Choice:** Multi-task learning (Hydra)

**Rationale:** Shared representations improve all tasks, operational simplicity, better cold start handling

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | What to Do Instead |
|---------|--------------|-------------------|
| Jumping to solution | Miss requirements | Ask clarifying questions first |
| Ignoring Open Connect | Miss Netflix's key innovation | Explain two-tier CDN architecture |
| Single database | Won't scale | Polyglot persistence (Cockroach + Cassandra) |
| Forgetting personalization | Miss 75-80% of viewing driver | Include Hydra/recommendation system |
| Strong consistency everywhere | Hurts availability | Eventual for recs, strong for billing |
| Ignoring device diversity | Miss DRM, client complexity | Mention multi-DRM, device-aware encoding |
| Underestimating scale | Appear inexperienced | Quote: 238M users, 65M peak concurrent, 2T messages/day |

---

## Questions to Ask Interviewer

| Question | Purpose |
|----------|---------|
| "Should I focus on VOD, live, or both?" | Scope the problem |
| "What's the target device coverage?" | Understand client complexity |
| "Any specific bottlenecks to address?" | Focus the design |
| "Is content acquisition in scope?" | Clarify boundaries |
| "Should I consider the ads-supported tier?" | Modern Netflix consideration |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    NETFLIX INTERVIEW CHEAT SHEET                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  SCALE NUMBERS (memorize)          MUST-DRAW COMPONENTS                  │
│  ────────────────────────          ────────────────────                  │
│  Memberships: 238M                 1. Open Connect (two-tier)            │
│  Peak Concurrent: 65M              2. Zuul Gateway                       │
│  Kafka msgs/day: 2T                3. Playback Service                   │
│  Events/sec: 38M                   4. Hydra Personalization              │
│  CockroachDB clusters: 380+        5. Feature Store (EVCache)            │
│  Rec-driven viewing: 75-80%        6. Kafka Keystone                     │
│  CDN traffic from ISP: 95%                                               │
│                                                                          │
│  KEY DIFFERENTIATORS               LATENCY TARGETS                       │
│  ──────────────────                ───────────────                       │
│  • Own CDN (Open Connect)          Playback start: <200ms                │
│  • AV1 + Film Grain (30%, 31%)     Recommendations: <50ms                │
│  • Predictive caching              API response: <100ms                  │
│  • Multi-task ML (Hydra)           Live latency: 10-30s                  │
│  • Subscription-first                                                    │
│                                                                          │
│  DEEP DIVE TOPICS                  TRADE-OFFS TO DISCUSS                 │
│  ────────────────────              ──────────────────────                │
│  1. Open Connect CDN               • Own CDN vs third-party              │
│  2. AV1 + Film Grain               • Hybrid ABR vs buffer-only           │
│  3. Hybrid ABR algorithm           • CockroachDB vs sharding             │
│  4. Hydra personalization          • Multi-task vs separate models       │
│  5. Live streaming                 • Predictive vs reactive caching      │
│                                                                          │
│  TRAP QUESTIONS                    ANSWER KEY POINTS                     │
│  ────────────────                  ─────────────────                     │
│  "Why not Akamai?"                 Cost, control, ISP partnerships       │
│  "Why hybrid ABR?"                 Cold start, network variability       │
│  "How 65M live?"                   Separate arch, pre-warming            │
│  "Why 80% from recs?"              UX + data flywheel + Hydra            │
│  "Why AV1 if slow?"                Encode once, serve millions           │
│                                                                          │
│  DATABASES                         COMPARISON vs YOUTUBE                 │
│  ─────────                         ───────────────────                   │
│  CockroachDB: ACID (billing)       Netflix: Subscription-first           │
│  Cassandra: Analytics              YouTube: Ads-first                    │
│  EVCache: Features (<10ms)         Netflix: Open Connect (ISP)           │
│  S3: Video content                 YouTube: Google CDN                   │
│                                    Netflix: Curated content              │
│                                    YouTube: UGC                          │
│                                    Netflix: Predictive caching           │
│                                    YouTube: Reactive caching             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 45-Minute Timeline Example

```
MINUTE 0-5: CLARIFICATION
"Let me make sure I understand the scope..."
- Confirm: VOD + live streaming
- Confirm: Global scale, 238M users
- Confirm: Multi-device (TV, mobile, web)
- State assumptions about billing, content acquisition

MINUTE 5-15: HIGH-LEVEL DESIGN
[Draw architecture diagram]
- Client layer → Open Connect → Gateway → Services → Data
- Explain data flow for playback
- Highlight key components: Open Connect, Hydra, Keystone

MINUTE 15-30: DEEP DIVE (Interviewer's choice)
If Open Connect:
  - Explain two-tier architecture
  - Discuss predictive caching
  - Explain steering logic

If Personalization:
  - Explain two-stage pipeline
  - Discuss Hydra multi-task
  - Cover thumbnail personalization

MINUTE 30-40: SCALE & FAILURES
- "What if an ISP's appliances fail?"
  → Fallback to Storage tier, then origin
- "What if recommendations are slow?"
  → Circuit breaker, serve cached recs
- "How to handle 10x growth?"
  → Add Open Connect appliances, scale services

MINUTE 40-45: WRAP UP
- Summarize key design decisions
- Mention things not covered (security, DRM)
- Ask clarifying questions
```

---

## Related Interview Topics

| If Asked About... | Key Points |
|-------------------|------------|
| **CDN design** | Open Connect two-tier, predictive caching |
| **Video streaming** | ABR, encoding pipeline, DRM |
| **Recommendation system** | Two-stage, Hydra, feature store |
| **Large-scale messaging** | Kafka Keystone, 2T msgs/day |
| **Database at scale** | CockroachDB + Cassandra polyglot |
| **Microservices** | Envoy mesh, federated GraphQL |
| **Live streaming** | Live Origin, EVCache, different arch |
| **ML at scale** | Feature store, batch + real-time |

---

*[← Back to Index](./00-index.md)*
