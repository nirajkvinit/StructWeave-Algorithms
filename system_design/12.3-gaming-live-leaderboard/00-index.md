# 12.3 Gaming: Live Leaderboard System

## System Overview

A Live Leaderboard System is the real-time ranking infrastructure that ingests continuous streams of player score updates, maintains globally ordered rankings across millions of concurrent players, and serves sub-100ms rank queries that power competitive gaming experiences—from casual mobile games to esports tournaments with millions of spectators. Modern leaderboard platforms process 50,000+ score updates per second, maintain sorted rankings across 100M+ player entries using in-memory sorted data structures (primarily sorted sets in key-value stores), support multiple ranking dimensions (global, regional, friend-circle, seasonal, tournament-specific), compute percentile positions in logarithmic time, handle seasonal resets without downtime, and push real-time rank changes to subscribed clients via persistent connections. These systems adopt a CQRS (Command Query Responsibility Segregation) architecture with separated write and read paths—score submissions flow through a validation pipeline into an append-only event log before updating in-memory ranking structures, while rank queries are served from read-optimized replicas with CDN caching for popular leaderboard segments (top-100, top-1000). The core challenge is maintaining exact global ordering at scale: a single sorted set can hold ~50M entries before memory constraints force sharding, at which point cross-shard rank computation requires scatter-gather coordination with merge algorithms—trading exact ranking for sub-second latency through approximate ranking techniques like bucket-based counting, segment trees, or probabilistic data structures.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Architecture Style** | CQRS with event-sourced score submissions, in-memory ranking engine, and read-replica fan-out for query serving |
| **Core Abstraction** | Score as an immutable event that transitions through validation → ranking update → notification pipeline, with the sorted set as the canonical ranking structure |
| **Processing Model** | Real-time for score ingestion and rank queries; micro-batch for cross-shard rank reconciliation; batch for historical snapshots, seasonal analytics, and leaderboard archival |
| **Data Structure** | Sorted sets (skip list + hash table) for O(log N) insert/rank/range operations; segment trees for approximate percentile queries at billion-entry scale |
| **Query Patterns** | Top-N retrieval, individual rank lookup, "around-me" relative ranking, friend-circle leaderboard, percentile position, historical rank trajectory |
| **Data Consistency** | Strong consistency for individual score updates (atomic sorted set operations); eventual consistency for cross-shard global rankings and friend leaderboards |
| **Availability Target** | 99.99% for rank queries (read path), 99.95% for score submissions (write path), zero data loss for validated scores |
| **Latency Targets** | < 50ms for top-N queries, < 100ms for individual rank lookup, < 500ms for score update propagation to ranking, < 2s for cross-shard global rank |
| **Scalability Model** | Vertical scaling of sorted set instances up to ~50M entries; horizontal sharding with scatter-gather for larger populations; read replicas for query fan-out |

---

## Quick Navigation

| Document | Focus Area |
|---|---|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity math for score throughput and memory |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, CQRS data flows, score submission and rank query paths |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API contracts, sorted set operations, sharded merge algorithms |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Sharded ranking engine, score validation pipeline, seasonal reset mechanism |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Sharding strategies, read replicas, failover, reset without downtime |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Anti-cheat, score validation, rate limiting, PII in public leaderboards |
| [07 - Observability](./07-observability.md) | Score processing latency, rank accuracy metrics, anomaly detection |
| [08 - Interview Guide](./08-interview-guide.md) | 45-minute pacing, leaderboard-specific traps, trade-off discussions |
| [09 - Insights](./09-insights.md) | Key architectural insights and cross-cutting patterns |

---

## What Differentiates This System

| Dimension | Naive Leaderboard | Production Live Leaderboard |
|---|---|---|
| **Ranking** | SQL ORDER BY on scores table | In-memory sorted sets with O(log N) rank lookup, sharded across instances |
| **Score Updates** | Direct DB write, re-query for rank | Event-sourced pipeline: validate → sorted set ZADD → async DB persist → notification |
| **Scale** | Single database, thousands of players | Sharded ranking engine, 100M+ players, 50K updates/sec |
| **Query Types** | Top-10 only | Top-N, around-me, friend circle, percentile, historical trajectory |
| **Consistency** | Full table scan per query | Atomic sorted set operations with eventual cross-shard consistency |
| **Latency** | Seconds (SQL query on large table) | Sub-50ms (in-memory sorted set with read replicas) |
| **Resets** | DELETE all, rebuild from scratch | Atomic key rotation with pre-warmed replacement, zero downtime |
| **Anti-cheat** | None | Multi-layer validation: server-authoritative scoring, statistical anomaly detection, replay verification |
| **Real-time** | Polling-based | WebSocket/SSE push with delta-compressed rank updates |
| **Multi-dimension** | Single global board | Per-game, per-region, per-season, per-tournament, friend-circle boards |

---

## What Makes This System Unique

### 1. The Ranking Problem Is Deceptively Simple Until You Need Global Order at Scale
Getting the "rank" of a player sounds trivial—sort by score, count position. But `SELECT COUNT(*) FROM scores WHERE score > ?` is O(N) and takes 35+ seconds on a 50M-row table. In-memory sorted sets solve this with O(log N) rank lookups, but a single instance tops out at ~50M entries due to memory constraints. Beyond that, you need sharded sorted sets where computing a global rank requires scatter-gather across all shards—and the merge step introduces latency proportional to shard count. The fundamental tension is between exact global ordering (which requires centralized knowledge) and horizontal scalability (which requires distributed state).

### 2. Read-to-Write Ratio Creates an Asymmetric Scaling Challenge
Leaderboards exhibit extreme read amplification: every score update triggers not just the updater's rank query but potentially thousands of nearby players checking if their rank changed. A 50K writes/sec workload generates 200K+ reads/sec, and during events (season end, tournament finale), read amplification can reach 100x. The system must scale reads independently from writes—read replicas for queries, primary instances for updates—without the replication lag creating visible rank inconsistencies.

### 3. Seasonal Resets Are a Unique Distributed Systems Problem
Unlike most systems where data accumulates monotonically, leaderboards periodically reset—clearing millions of entries and starting fresh. A naive reset (DELETE all keys) creates a thundering herd: millions of players simultaneously submit new scores to an empty leaderboard, and anyone querying during the reset sees stale or empty results. The solution requires atomic key rotation (swap from `leaderboard:season:7` to `leaderboard:season:8`), pre-warming the new leaderboard, archiving the old one asynchronously, and coordinating the switchover across all shards—a distributed transaction across in-memory data stores.

### 4. "Around-Me" Queries Break the Top-Heavy Assumption
Most caching strategies optimize for the "hot" top of the leaderboard—the top-100 or top-1000 that everyone views. But "around-me" queries (show my rank ±10 positions) are uniformly distributed across the entire ranking. A player ranked 4,523,891st needs the same query performance as the player ranked 1st. This means the entire sorted set must be query-ready, not just the top segment—invalidating the common assumption that leaderboard data has a "hot head" and "cold tail."

---

## Scale Reference Points

| Metric | Value |
|---|---|
| **Global gaming market** | ~$250 billion (2026) |
| **Players with leaderboard interaction** | 100M–500M monthly across major platforms |
| **Score updates (peak)** | 50,000–200,000 updates/sec during global events |
| **Rank queries (peak)** | 200,000–1,000,000 queries/sec |
| **Unique leaderboard instances** | 10,000–100,000 (per-game, per-mode, per-season, per-region) |
| **Entries per leaderboard (large)** | 10M–100M players |
| **In-memory footprint per 10M entries** | ~800 MB–1.2 GB (sorted set with 8-byte scores, 16-byte member IDs) |
| **Top-N query latency** | < 10ms (in-memory, local replica) |
| **Rank lookup latency** | < 50ms (single shard), < 200ms (cross-shard scatter-gather) |
| **Score-to-rank propagation** | < 500ms (P99) |
| **Seasonal reset frequency** | Weekly to quarterly, depending on game |
| **Historical snapshot retention** | 1–3 years for regulatory and analytics purposes |

---

## Technology Landscape

| Layer | Component | Role |
|---|---|---|
| **Client SDK** | Game client integration | Score reporting, rank polling, WebSocket subscription for real-time updates |
| **API Gateway** | Rate-limited entry point | Authentication, request routing, payload validation, DDoS protection |
| **Score Ingestion Service** | Validation pipeline | Server-authoritative score verification, anti-cheat checks, deduplication |
| **Ranking Engine** | In-memory sorted sets | Core ranking data structure: ZADD, ZRANK, ZREVRANGE, ZINCRBY operations |
| **Query Service** | Read-optimized layer | Top-N, around-me, friend circle, percentile queries served from read replicas |
| **Notification Service** | Real-time push | WebSocket/SSE connections for rank change notifications, delta compression |
| **Snapshot Service** | Periodic archival | Point-in-time leaderboard captures for historical queries and seasonal archives |
| **Reset Orchestrator** | Season lifecycle | Atomic leaderboard rotation, pre-warming, archive triggering, shard coordination |
| **Persistence Layer** | Durable storage | Score event log (append-only), player metadata, historical snapshots |
| **Analytics Pipeline** | Stream + batch processing | Score distribution analysis, engagement metrics, anomaly detection |
| **Anti-Cheat Service** | Fraud detection | Statistical scoring analysis, replay verification, behavioral profiling |

---

*Next: [Requirements & Estimations →](./01-requirements-and-estimations.md)*
