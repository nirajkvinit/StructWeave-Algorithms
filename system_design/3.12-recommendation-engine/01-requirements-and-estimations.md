# Requirements and Estimations

## Functional Requirements

### Core Features (P0 - Must Have)

| Feature | Description | User Story |
|---------|-------------|------------|
| **Personalized Feed** | Generate ranked list of items tailored to user | "As a user, I want to see content relevant to my interests" |
| **Similar Items** | Find items similar to a given item | "As a user browsing item X, I want to discover similar items" |
| **Real-time Personalization** | Incorporate recent behavior within session | "As a user, I want recommendations reflecting what I just did" |
| **Multi-source Retrieval** | Combine collaborative, content, and popularity signals | "As a platform, I want diverse recommendation sources" |
| **Cold Start Handling** | Recommendations for new users/items | "As a new user, I want relevant recommendations immediately" |
| **Feedback Collection** | Capture implicit signals (clicks, views, time) | "As a platform, I want to learn from user behavior" |

### Important Features (P1)

| Feature | Description | User Story |
|---------|-------------|------------|
| **Contextual Recommendations** | Adapt based on time, device, location | "As a user, I want different recommendations on mobile vs TV" |
| **Diversity Controls** | Ensure variety in recommendations | "As a user, I don't want repetitive content" |
| **Freshness Boosting** | Promote new content appropriately | "As a content creator, I want my new items discovered" |
| **Negative Feedback** | Handle explicit "not interested" signals | "As a user, I want to hide content I dislike" |
| **Explanation** | Why was this recommended | "As a user, I want to understand why I'm seeing this" |
| **A/B Testing** | Experiment with different models/strategies | "As a product team, I want to measure recommendation changes" |

### Nice-to-Have Features (P2)

| Feature | Description | User Story |
|---------|-------------|------------|
| **Cross-domain Recommendations** | Recommendations across product lines | "Based on your music taste, you might like these podcasts" |
| **Sequential Recommendations** | Next-item prediction (playlists, watch next) | "Continue watching" or "Up next" features |
| **Group Recommendations** | Recommendations for multiple users | "Movies for the whole family" |
| **Conversational Recommendations** | LLM-powered recommendation dialogue | "Find me something relaxing to watch" |

### Out of Scope

- Content creation/upload pipeline (separate system)
- Search functionality (covered in search system design)
- Social features (likes, comments, shares)
- Payment/subscription handling
- Content moderation and safety

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| **End-to-end latency (p50)** | <50ms | Smooth user experience |
| **End-to-end latency (p99)** | <100ms | Tail latency affects perceived performance |
| **Retrieval stage latency** | <20ms | Leave budget for ranking |
| **Ranking stage latency** | <50ms | Complex model with batching |
| **Feature fetch latency** | <10ms | Parallel fetch, cached |
| **Throughput** | 1M+ QPS | Peak traffic handling |

### Scalability Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Total users** | 1B+ | Global platform scale |
| **Daily active users** | 500M | ~50% DAU/MAU ratio |
| **Item catalog size** | 100M+ | Large content library |
| **Daily new items** | 100K+ | Active content creation |
| **Daily interactions** | 50B+ | High engagement platform |
| **Concurrent recommendations** | 10M+ | Peak concurrent users |

### Availability & Reliability

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Serving availability** | 99.99% | 4.3 min downtime/month acceptable |
| **Training pipeline availability** | 99.9% | Daily retraining sufficient |
| **Data durability** | 99.999999% | User preferences are critical |
| **Cross-region failover** | <1 minute | Automatic failover |

### Consistency Model

| Component | Consistency | Rationale |
|-----------|-------------|-----------|
| **User preferences** | Strong | User-visible settings must be consistent |
| **Embeddings** | Eventual (~15 min) | Async updates acceptable |
| **Item metadata** | Eventual (~5 min) | Near real-time catalog updates |
| **Interaction events** | Eventual (~1 min) | Real-time features from stream |
| **Model versions** | Strong per-region | No mixed model responses |

---

## Capacity Estimations

### Assumptions

| Parameter | Value | Source/Reasoning |
|-----------|-------|------------------|
| Monthly Active Users (MAU) | 1 billion | Netflix/Spotify scale |
| Daily Active Users (DAU) | 500 million | 50% DAU/MAU ratio |
| Sessions per user per day | 2 | Average engagement |
| Recommendations per session | 50 | Feed + similar items |
| Items in catalog | 100 million | Large media library |
| New items per day | 100,000 | Active content platform |
| Embedding dimension | 256 | Balance of quality/size |
| Features per request | 500 | User + item + context features |
| Feature size (average) | 8 bytes | Mix of floats and ints |

### Traffic Calculations

**Daily Recommendation Requests:**
```
= DAU × sessions/user × recommendations/session
= 500M × 2 × 50
= 50 billion requests/day
```

**Average QPS:**
```
= 50B / 86,400 seconds
= ~580,000 QPS (average)
```

**Peak QPS (3x average):**
```
= 580,000 × 3
= ~1.74 million QPS (peak)
```

**Candidates per request:**
```
= 1,000-10,000 (from retrieval)
= Let's use 5,000 average
```

**Ranking operations per second (peak):**
```
= 1.74M QPS × 5,000 candidates
= 8.7 billion ranking operations/sec
```

### Storage Calculations

| Component | Calculation | Result |
|-----------|-------------|--------|
| **Item embeddings** | 100M items × 256 dim × 4 bytes | 100 GB |
| **User embeddings** | 1B users × 256 dim × 4 bytes | 1 TB |
| **ANN index overhead** | ~2x raw embeddings | 200 GB (items) |
| **Feature store (online)** | 1B users × 500 features × 8 bytes | 4 TB |
| **Feature store (offline)** | 100B daily features × 365 days × 8 bytes | ~300 TB/year |
| **Interaction logs** | 50B events × 200 bytes × 30 days | 300 TB (hot) |
| **Model artifacts** | 10 GB × 100 versions | 1 TB |

**Total Storage Estimate:**
- Hot storage (SSD): ~10 TB
- Warm storage (HDD/Object): ~500 TB
- Cold storage (archive): ~2 PB/year

### Bandwidth Calculations

**Feature fetch bandwidth:**
```
= 1.74M QPS × 500 features × 8 bytes
= ~7 GB/sec internal bandwidth
```

**Embedding lookup bandwidth:**
```
= 1.74M QPS × (user_emb + 5000 item_emb) × 256 × 4 bytes
= ~9 TB/sec (requires heavy caching)
```

**Response bandwidth to clients:**
```
= 1.74M QPS × 50 items × 200 bytes
= ~17 GB/sec outbound
```

### Compute Calculations

**Retrieval (CPU):**
```
= 1.74M QPS / 10K QPS per node
= ~175 retrieval nodes minimum
= 350 nodes with 2x redundancy
```

**Ranking (GPU):**
```
Assumption: 1 GPU can score 100K candidates/sec
= 8.7B ops/sec / 100K ops/GPU
= ~87,000 GPUs needed (without batching)

With batching (10x efficiency):
= ~8,700 GPUs minimum
= ~17,400 GPUs with redundancy
```

**Feature Store (Redis):**
```
= 4 TB data / 100 GB per node
= ~40 nodes minimum
= 80 nodes with replication
```

### Summary Table

| Resource | Calculation | Estimate |
|----------|-------------|----------|
| Recommendation QPS (average) | 50B/day ÷ 86,400 | 580K QPS |
| Recommendation QPS (peak) | 3x average | 1.74M QPS |
| Item embedding storage | 100M × 256 × 4B | 100 GB |
| User embedding storage | 1B × 256 × 4B | 1 TB |
| Feature store (online) | 1B × 500 × 8B | 4 TB |
| Daily interaction logs | 50B × 200B | 10 TB/day |
| Retrieval servers | Peak / 10K per node × 2 | 350 nodes |
| Ranking GPUs | Peak × candidates / 1M × 2 | 17,400 GPUs |
| Feature store nodes | 4TB / 100GB × 2 | 80 nodes |

---

## Service Level Objectives (SLOs)

### Availability SLOs

| Service | SLO | Error Budget (monthly) | Measurement |
|---------|-----|------------------------|-------------|
| Recommendation API | 99.99% | 4.3 minutes | Successful responses / Total requests |
| Retrieval Service | 99.99% | 4.3 minutes | Candidate generation success |
| Ranking Service | 99.95% | 21.6 minutes | Ranking completion (fallback available) |
| Feature Store | 99.99% | 4.3 minutes | Feature fetch success |
| Model Serving | 99.95% | 21.6 minutes | Inference success |

### Latency SLOs

| Metric | SLO | Measurement |
|--------|-----|-------------|
| End-to-end p50 | <50ms | API response time |
| End-to-end p95 | <80ms | API response time |
| End-to-end p99 | <100ms | API response time |
| Retrieval p99 | <20ms | Candidate generation time |
| Ranking p99 | <50ms | Model inference time |
| Feature fetch p99 | <10ms | Online store lookup |

### Quality SLOs

| Metric | SLO | Measurement |
|--------|-----|-------------|
| ANN recall@1000 | >95% | Recall vs exact search |
| Model freshness | <24 hours | Time since last training |
| Feature freshness | <1 hour | Time since feature update |
| Index freshness | <15 minutes | New item discoverability |
| Cold start coverage | >99% | Users with personalized results |

### Business SLOs

| Metric | SLO | Measurement |
|--------|-----|-------------|
| Recommendation diversity | >80% unique categories | Categories in top 20 |
| Catalog coverage | >10% items recommended/month | Items with >0 impressions |
| Click-through rate | No regression vs baseline | A/B test significance |
| Engagement time | No regression vs baseline | Time on recommended content |

---

## Traffic Patterns

### Daily Patterns

```
        Peak Hours (Evening)
            ↓
    ┌───────────────────┐
    │                   │
    │        ╭──╮       │
    │      ╭─╯  ╰─╮     │
    │    ╭─╯      ╰─╮   │
    │  ╭─╯          ╰─╮ │
    │╭─╯              ╰─│
    └───────────────────┘
    0   6   12  18  24
        Hour of Day

Peak: 8-11 PM local time (3x average)
Trough: 3-6 AM local time (0.3x average)
```

### Weekly Patterns

- **Weekends**: 1.5x weekday traffic
- **Monday**: Gradual ramp-up
- **Friday evening**: Week's highest peak

### Event-Driven Spikes

| Event | Traffic Multiplier | Duration |
|-------|-------------------|----------|
| New content release | 5-10x | Hours |
| Marketing campaign | 2-3x | Days |
| Platform outage recovery | 10x | Minutes |
| Holiday season | 2x sustained | Weeks |

### Geographic Distribution

| Region | Traffic Share | Peak Time (UTC) |
|--------|---------------|-----------------|
| North America | 35% | 01:00-04:00 |
| Europe | 25% | 19:00-22:00 |
| Asia Pacific | 30% | 12:00-15:00 |
| Rest of World | 10% | Distributed |

---

## Constraints and Assumptions

### Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Embedding dimension ≤512 | Limits expressiveness | Careful feature engineering |
| ANN search ≤50ms | Limits index size per shard | Distributed index |
| GPU memory ≤80GB | Limits model size | Model distillation, batching |
| Network latency ~1ms intra-region | Impacts feature fetch | Aggressive caching |

### Business Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Privacy regulations (GDPR) | Limited personalization in EU | Consent-based personalization |
| Content licensing | Item availability varies by region | Region-aware recommendations |
| Advertiser requirements | Sponsored content placement | Separate ad ranking |
| Creator fairness | Cold start for new creators | Exploration budget |

### Assumptions

1. **User behavior is predictable** - Past interactions indicate future preferences
2. **Implicit signals are reliable** - Clicks/views correlate with satisfaction
3. **Embeddings capture similarity** - Learned representations are meaningful
4. **Features are available in time** - Real-time feature pipeline meets SLOs
5. **Models generalize** - Training data represents serving traffic
6. **Infrastructure is elastic** - Can scale for traffic spikes

---

## Cost Estimation

### Infrastructure Costs (Monthly)

| Component | Specification | Quantity | Monthly Cost |
|-----------|--------------|----------|--------------|
| Retrieval servers | 32 vCPU, 128GB RAM | 350 | $175K |
| Ranking GPUs | A100 80GB | 17,400 | $8.7M |
| Feature store (Redis) | 128GB RAM, SSD | 80 | $80K |
| Vector DB cluster | Managed service | 1 | $200K |
| Training cluster | A100 GPUs | 500 | $250K |
| Object storage | 500TB | 1 | $12K |
| Networking | Inter-region | - | $100K |
| **Total Infrastructure** | | | **~$9.5M/month** |

### Cost Optimization Strategies

| Strategy | Savings | Trade-off |
|----------|---------|-----------|
| Spot/preemptible for training | 70% training cost | Training interruptions |
| Model quantization | 4x GPU reduction | Slight accuracy loss |
| Tiered caching | 50% compute reduction | Cache invalidation complexity |
| Regional pricing | 20-30% in cheaper regions | Latency for some users |
| Reserved instances | 30-40% | Commitment |

### Cost per Recommendation

```
Monthly cost: $9.5M
Monthly recommendations: 50B × 30 = 1.5T
Cost per 1000 recommendations: $9.5M / 1.5B = $0.0063 (0.63 cents)
```
