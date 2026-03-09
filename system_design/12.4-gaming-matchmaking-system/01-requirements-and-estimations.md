# Requirements & Estimations — Gaming Matchmaking System

## 1. Functional Requirements

### 1.1 Core Matchmaking

| ID | Requirement | Description |
|---|---|---|
| FR-1 | **Queue Entry** | Players (solo or party) submit a match request specifying game mode, preferred region, and optional role preferences |
| FR-2 | **Skill-Based Matching** | System pairs players of similar skill using a Bayesian rating model (TrueSkill 2) with configurable tolerance windows |
| FR-3 | **Expanding Search Window** | Skill tolerance progressively widens as queue time increases to guarantee eventual match formation |
| FR-4 | **Party Support** | Groups of 2-5 players queue together with weighted skill aggregation accounting for party synergy advantage |
| FR-5 | **Match Quality Scoring** | Each potential match is scored on skill variance, latency fairness, party symmetry, and role coverage before confirmation |
| FR-6 | **Server Allocation** | Upon match formation, system selects the optimal game server by latency profile of all matched players |
| FR-7 | **Match Confirmation** | Players receive match-found notification and optionally accept/decline within a timeout window |
| FR-8 | **Queue Cancellation** | Players can cancel queue at any time before match confirmation |

### 1.2 Rating & Progression

| ID | Requirement | Description |
|---|---|---|
| FR-9 | **Skill Rating Updates** | Post-match, player ratings (μ, σ) update based on match outcome, individual performance, and opponent strength |
| FR-10 | **Placement Matches** | New players undergo calibration series (typically 5-10 matches) with high uncertainty for rapid convergence |
| FR-11 | **Seasonal Resets** | Periodic soft resets that increase uncertainty without fully resetting skill, triggering recalibration |
| FR-12 | **Mode-Specific Ratings** | Separate skill ratings per game mode (ranked, casual, competitive queue variants) |
| FR-13 | **Rating Decay** | Inactive players accumulate uncertainty over time, requiring recalibration upon return |

### 1.3 Fairness & Integrity

| ID | Requirement | Description |
|---|---|---|
| FR-14 | **Smurf Detection** | Identify new accounts performing significantly above their rating tier and accelerate their MMR convergence |
| FR-15 | **Boosting Prevention** | Detect and flag accounts with suspicious rank trajectories, IP/hardware changes, or party patterns |
| FR-16 | **Rematch Avoidance** | Prevent the same players from being matched repeatedly within a configurable time window |
| FR-17 | **Report Integration** | Player reports for match quality issues feed into matchmaking adjustments |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| Metric | Target | Rationale |
|---|---|---|
| **Median Queue Time** | < 30 seconds | Player satisfaction drops sharply beyond 30s; competitive expectation |
| **P95 Queue Time** | < 60 seconds | Acceptable wait for 95% of players including off-peak hours |
| **P99 Queue Time** | < 120 seconds | Hard upper bound; outlier skill ratings or small regions |
| **Queue Entry Latency** | < 100ms | API response time from queue request to acknowledgment |
| **Match Notification Latency** | < 500ms | Time from match formation to all players receiving notification |
| **Server Allocation Latency** | < 2 seconds | Time from match confirmation to game server ready |
| **Rating Update Latency** | < 5 seconds | Post-match rating recalculation and persistence |

### 2.2 Quality

| Metric | Target | Rationale |
|---|---|---|
| **Match Skill Variance** | < 200 rating points (team avg) | Teams should be within ~1 standard deviation of each other |
| **Intra-Team Skill Spread** | < 400 rating points | No single player should be drastically above/below teammates |
| **Win Rate Convergence** | 45-55% for established players | Balanced matches should converge individual win rates toward 50% |
| **Party Balance** | Symmetric party sizes when possible | A 3-stack vs 3-stack, not a 3-stack vs 3 solos |
| **Latency Fairness** | < 30ms ping variance within match | No player should have extreme latency disadvantage |

### 2.3 Availability & Reliability

| Metric | Target | Rationale |
|---|---|---|
| **API Availability** | 99.9% (8.76 hrs downtime/year) | Matchmaking is the gateway to gameplay |
| **Match Completion Rate** | > 99.5% | Formed matches should result in game sessions (not lost in allocation) |
| **Queue Durability** | Zero queue loss on component failure | Players should never silently drop from queue |
| **Graceful Degradation** | Wider skill windows during partial outage | Maintain some matching capability even with reduced capacity |

### 2.4 Scalability

| Metric | Target | Rationale |
|---|---|---|
| **Concurrent Players** | 10M+ globally | Major title at peak engagement |
| **Concurrent Queued Players** | 500K-1M at peak | ~5-10% of online players actively in queue at any moment |
| **Match Formation Rate** | 100K+ matches/minute at peak | Assuming 10-player matches, 1M queued players with 30s avg queue |
| **Regional Pools** | 6-12 geographic regions | NA-East, NA-West, EU-West, EU-North, Asia-East, Asia-SE, OCE, SA, ME, etc. |

---

## 3. Capacity Estimations

### 3.1 Traffic Model

```
Assumptions:
- 10M concurrent players at peak
- 8% in queue at any instant = 800K queued players
- Average match size = 10 players (5v5)
- Average queue time = 25 seconds
- Average match duration = 25 minutes

Queue entry rate:
- 800K players / 25s avg queue = 32K queue entries/second
- = ~1.92M queue entries/minute

Match formation rate:
- 32K entries/sec ÷ 10 players/match = 3,200 matches/second
- = 192K matches/minute

Post-match rating updates:
- 3,200 matches/sec × 10 players = 32K rating updates/second

Server allocation requests:
- 3,200 server allocations/second
```

### 3.2 Storage Estimates

```
Player Skill Profile:
- Player ID (16 bytes) + mode ratings (5 modes × 24 bytes each) +
  match history refs (100 × 16 bytes) + metadata (200 bytes)
- ~1.9 KB per player
- 100M registered players × 1.9 KB = ~190 GB total skill data

Queue State (in-memory):
- Per ticket: player IDs (up to 5 × 16B) + skill summary (48B) +
  latency data (96B) + metadata (128B)
- ~400 bytes per ticket
- 800K concurrent tickets × 400B = ~320 MB in-memory

Match History:
- Per match: match ID (16B) + 10 player IDs (160B) + outcome data (256B) +
  performance stats (10 × 128B) + metadata (256B)
- ~1.97 KB per match record
- 192K matches/min × 1,440 min/day = ~276M matches/day
- 276M × 1.97 KB = ~544 GB/day (hot storage, 30-day retention = ~16 TB)
- Archived to cold storage after 30 days
```

### 3.3 Bandwidth Estimates

```
Queue Entry Request:
- Request: ~500 bytes (player info, mode, preferences)
- Response: ~200 bytes (ticket ID, estimated wait)
- 32K/sec × 700B = ~22.4 MB/sec inbound

Match Notification:
- Push notification per player: ~1 KB (match details, server info)
- 32K players/sec matched × 1 KB = ~32 MB/sec outbound

Rating Update Events:
- 32K updates/sec × 256 bytes = ~8.2 MB/sec internal bus

Total bandwidth: ~60-80 MB/sec aggregate (manageable with standard infra)
```

### 3.4 Compute Estimates

```
Matching computation per cycle (every 1-2 seconds):
- Evaluate 800K tickets across 12 regions × 5 modes = 60 pools
- Average pool size: ~13.3K tickets
- Pairwise comparison (with spatial indexing): O(n log n) per pool
- ~13.3K × log(13.3K) ≈ 185K comparisons per pool per cycle
- 60 pools × 185K = ~11.1M comparisons per cycle

Rating update per match:
- TrueSkill 2 factor graph inference: ~10-50 iterations per player
- 32K players/sec × 30 iterations = ~960K inference iterations/sec

Estimated compute: 50-100 matching worker cores + 20-30 rating worker cores
(scales linearly with concurrent queued population)
```

---

## 4. SLOs and SLAs

### 4.1 Service Level Objectives

| SLO | Target | Measurement Window | Burn Rate Alert |
|---|---|---|---|
| **Queue API Availability** | 99.9% | 30-day rolling | > 2x budget in 1-hour window |
| **Median Queue Time** | < 30 seconds | 1-hour rolling per region | > 45s triggers investigation |
| **P99 Queue Time** | < 120 seconds | 1-hour rolling per region | > 180s triggers escalation |
| **Match Quality Score** | > 0.75 (normalized) | 1-hour rolling per region per mode | < 0.60 triggers alert |
| **Match Completion Rate** | > 99.5% | 24-hour rolling | < 99% triggers incident |
| **Rating Update Freshness** | < 5 seconds | Continuous per-event | > 15s triggers alert |
| **Server Allocation Success** | > 99.9% | 1-hour rolling | < 99.5% triggers escalation |

### 4.2 SLA Tiers

| Tier | Commitment | Penalty | Applies To |
|---|---|---|---|
| **Platform** | 99.9% monthly uptime for queue API | Service credits for ranked mode outage | All players |
| **Competitive** | < 60s P95 queue time during ranked seasons | Ranked point compensation during extended queue | Ranked mode |
| **Tournament** | 99.99% availability during scheduled events | Prize pool adjustments | Tournament participants |
| **Partner** | Dedicated matching pools with custom SLOs | Per-contract terms | Esports organizations |

### 4.3 Error Budget Policy

```
Monthly error budget (99.9% SLO):
- 30 days × 24 hours × 60 min = 43,200 minutes
- 0.1% budget = 43.2 minutes of allowed downtime

Budget allocation:
- Planned maintenance: 15 minutes (deploy windows)
- Incident response: 20 minutes (unexpected failures)
- Reserve: 8.2 minutes (safety margin)

Escalation thresholds:
- 50% budget consumed in first week → freeze non-critical deploys
- 75% budget consumed → incident review, restrict changes to hotfixes
- 90% budget consumed → full change freeze, war-room monitoring
```

---

## 5. Key Assumptions & Constraints

### 5.1 Assumptions

| Assumption | Impact if Wrong |
|---|---|
| 5v5 is the dominant game mode | Smaller modes (1v1, 3v3) have faster queues but different matching constraints |
| Players tolerate 30s queue for quality matches | If players expect < 10s, must sacrifice match quality significantly |
| TrueSkill 2 converges in 20-30 matches | If convergence is slower, new player experience suffers from mismatched games |
| Peak load is 3x average | If actual peak is higher (game launch, events), need burst capacity planning |
| Parties represent ~30% of queue population | Higher party rates increase matching complexity and queue times |

### 5.2 Constraints

| Constraint | Implication |
|---|---|
| Players must not wait indefinitely | Expanding search window is mandatory; no "perfect match or nothing" |
| Cross-region play adds 50-150ms latency | Regional pools are primary; cross-region is overflow only |
| Rating manipulation must be prevented | Cannot expose raw MMR values; rating updates must be server-authoritative |
| Competitive integrity for esports | Ranked mode requires stricter matching than casual modes |
| Multiple game modes with separate ratings | Storage and compute scale linearly with number of modes |
