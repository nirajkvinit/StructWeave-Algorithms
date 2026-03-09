# Observability — Gaming Matchmaking System

## 1. Observability Strategy

### 1.1 The Three Pillars for Matchmaking

Matchmaking observability has a unique challenge: the system's primary output—player experience—is subjective and delayed. A technically perfect match (low skill variance, low latency) might still feel terrible if one team's playstyles counter the other. The observability system must bridge the gap between measurable metrics and perceived quality.

| Pillar | Matchmaking Focus |
|---|---|
| **Metrics** | Queue times, match quality scores, pool sizes, matching rates, skill distributions |
| **Logs** | Individual match formation decisions (why these 10 players?), rating update traces, smurf detection events |
| **Traces** | End-to-end lifecycle: queue entry → match found → server allocated → game start → result → rating update |

### 1.2 Key Dashboards

| Dashboard | Primary Audience | Refresh Rate |
|---|---|---|
| **Queue Health** | Operations, On-call | 10 seconds |
| **Match Quality** | Game designers, Operations | 1 minute |
| **Rating Engine** | Data science, Game designers | 5 minutes |
| **Player Experience** | Product, Game designers | 1 hour |
| **Smurf/Boost Detection** | Trust & Safety | 15 minutes |
| **Infrastructure** | Platform engineering | 30 seconds |

---

## 2. Queue Health Metrics

### 2.1 Core Queue Metrics

```
Queue Metrics (per region × mode × rank tier):

// Volume metrics
queue.entries.count              // Queue entries per minute
queue.cancellations.count        // Cancellations per minute
queue.timeouts.count             // Tickets expired without match per minute
queue.active_tickets.gauge       // Current tickets in pool

// Latency metrics (histogram)
queue.wait_time.p50              // Median queue time in seconds
queue.wait_time.p75              // 75th percentile
queue.wait_time.p95              // 95th percentile
queue.wait_time.p99              // 99th percentile
queue.wait_time.max              // Maximum queue time (any active ticket)

// Throughput metrics
queue.matches_formed.count       // Matches per minute
queue.players_matched.count      // Players moved from queue to match per minute
queue.matching_cycle_time.p99    // Time to complete one matching sweep

// Health indicators
queue.starvation.count           // Tickets waiting > 120 seconds
queue.expansion_depth.avg        // Average expansion level (0=base, 1=max)
queue.conflict_rate              // Double-matching conflicts per 1000 attempts
queue.pool_imbalance             // Ratio of largest to smallest party-size cohort
```

### 2.2 Queue Time Distribution Dashboard

```
Dashboard: Queue Wait Time Distribution
Layout:

┌───────────────────────────────────────────────────┐
│ Queue Wait Time Heatmap (Region × Mode)           │
│                                                   │
│ Region    │ Ranked │ Casual │ Custom │ Tournament  │
│ NA-East   │  🟢 22s │  🟢 12s │  🟢  8s │  🟡 45s    │
│ NA-West   │  🟢 28s │  🟢 15s │  🟢 10s │  🟡 52s    │
│ EU-West   │  🟢 20s │  🟢 10s │  🟢  7s │  🟢 35s    │
│ EU-North  │  🟡 38s │  🟢 18s │  🟢 12s │  🔴 95s    │
│ APAC-East │  🟢 25s │  🟢 14s │  🟢  9s │  🟡 48s    │
│ APAC-SE   │  🟡 42s │  🟢 22s │  🟢 15s │  🔴 120s   │
│ SA        │  🔴 65s │  🟡 35s │  🟢 20s │  ⚫ N/A     │
│ OCE       │  🔴 78s │  🟡 40s │  🟢 25s │  ⚫ N/A     │
├───────────────────────────────────────────────────┤
│ Queue Time by Rank Tier (NA-East, Ranked, 1hr)    │
│                                                   │
│ Bronze    ████████ 18s                            │
│ Silver    █████████ 20s                           │
│ Gold      ████████████ 25s                        │
│ Platinum  ██████████████ 28s                      │
│ Diamond   ██████████████████ 35s                  │
│ Master    █████████████████████████ 52s           │
│ GM        ████████████████████████████████ 85s    │
│ Top 500   █████████████████████████████████████ 180s│
├───────────────────────────────────────────────────┤
│ 🟢 < 30s   🟡 30-60s   🔴 > 60s   ⚫ Insufficient │
└───────────────────────────────────────────────────┘
```

### 2.3 Alert Rules for Queue Health

| Alert | Condition | Severity | Action |
|---|---|---|---|
| **Queue Time SLO Breach** | P50 > 45s for any region+mode for 5 min | P1 | Page on-call, investigate pool health |
| **Queue Starvation** | > 50 tickets waiting > 120s in single pool | P2 | Enable cross-region overflow, relax quality |
| **Matching Cycle Stall** | Cycle time > 2s for 3 consecutive cycles | P1 | Check match worker health, restart if needed |
| **Queue Depth Spike** | Tickets > 200% predicted for time of day | P2 | Trigger reactive scaling |
| **Zero Match Rate** | No matches formed in region for 2 minutes | P1 | Immediate investigation (possible system failure) |
| **Conflict Rate Spike** | > 5% conflict rate for 5 minutes | P3 | Reduce parallel match workers for that pool |

---

## 3. Match Quality Metrics

### 3.1 Quality Score Distribution

```
Match Quality Metrics (per match):

// Pre-match predictions
match.quality_score              // Composite quality score (0-1)
match.skill_variance             // Rating point spread between teams
match.latency_variance           // Ping spread within match
match.party_symmetry             // Party composition balance
match.role_coverage              // Role preference satisfaction

// Post-match validation
match.actual_competitiveness     // How close was the match? (based on score/rounds)
match.perceived_fairness         // Survey-based (if collected)
match.stomp_rate                 // Percentage of matches with > 70-30 outcome split
match.comeback_rate              // Percentage of matches with lead changes

// Quality → Outcome correlation
match.predicted_win_prob         // What we predicted the win probability was
match.actual_outcome             // Who actually won
match.prediction_accuracy        // Rolling accuracy of predictions
```

### 3.2 Match Quality Dashboard

```
Dashboard: Match Quality Analysis
Layout:

┌───────────────────────────────────────────────────┐
│ Match Quality Score Distribution (last 1 hour)    │
│                                                   │
│ 0.0-0.2  ▏ 0.1%                                  │
│ 0.2-0.4  ▎ 0.8%                                  │
│ 0.4-0.5  ██ 3.2%                                 │
│ 0.5-0.6  ██████ 12.1%                            │
│ 0.6-0.7  ██████████████ 28.5%                    │
│ 0.7-0.8  ████████████████████ 38.2%              │
│ 0.8-0.9  █████████ 14.8%                         │
│ 0.9-1.0  █ 2.3%                                  │
│                                                   │
│ Avg: 0.72  │  Target: > 0.65  │  Status: 🟢 OK  │
├───────────────────────────────────────────────────┤
│ Stomp Rate Trend (matches decided by round 5)     │
│                                                   │
│ 15% ─┬──────────────────────────────────────      │
│ 12% ─┤        ╱╲                                  │
│  9% ─┤───╱╲──╱──╲────────────────── target: 10%  │
│  6% ─┤──╱────────╲──╱╲──────────                  │
│  3% ─┤─╱─────────────────╲───────                 │
│  0% ─┴──────────────────────────────────────      │
│      Mon  Tue  Wed  Thu  Fri  Sat  Sun            │
├───────────────────────────────────────────────────┤
│ Win Prediction Accuracy (should be ~50% for both) │
│                                                   │
│ Predicted Team A wins: 51.2% actual  (target: 50%)│
│ Calibration error: 1.2%  │  Status: 🟢 Good      │
└───────────────────────────────────────────────────┘
```

### 3.3 Quality Alerts

| Alert | Condition | Severity | Action |
|---|---|---|---|
| **Low Quality Matches** | Avg quality < 0.55 for 15 min in any pool | P2 | Check skill distribution, review expansion config |
| **High Stomp Rate** | > 15% stomp rate for 1 hour | P2 | Tighten quality floor, investigate rating accuracy |
| **Prediction Bias** | Win prediction accuracy deviates > 3% from 50% for 24h | P3 | Review rating model, check for systematic bias |
| **Party Imbalance** | > 20% of matches have asymmetric party composition | P3 | Review party matching rules |

---

## 4. Skill Rating Observability

### 4.1 Rating Engine Metrics

```
Rating Metrics:

// Processing metrics
rating.updates_per_second        // Rating calculations completed
rating.event_queue_depth         // Pending match outcomes to process
rating.processing_latency.p99    // Time from match end to rating committed
rating.factor_graph_iterations   // Avg iterations for convergence

// Distribution metrics
rating.population_mean           // Should hover around 1500
rating.population_stddev         // Should be ~200-300 (stable distribution)
rating.tier_distribution         // Percentage of players per rank tier

// Drift detection
rating.inflation_rate            // Is population mean drifting upward?
rating.sigma_distribution        // Are uncertainties converging as expected?
rating.new_player_convergence    // Matches for new players to stabilize (target: 20-30)

// Anomalies
rating.extreme_updates.count     // |Δμ| > 100 in single match
rating.factor_divergence.count   // Factor graph failed to converge
rating.reset_rollbacks.count     // Rating updates rolled back
```

### 4.2 Rating Drift Detection

Rating drift means the population average skill is shifting over time, usually due to:
- More new players entering than leaving (deflation) or vice versa (inflation)
- Seasonal resets not properly calibrated
- Performance feature weights biased

```
FUNCTION DetectRatingDrift(window=7_DAYS):
    daily_means = GetDailyPopulationMean(window)

    // Linear regression to detect trend
    slope = LinearRegression(daily_means).slope

    IF ABS(slope) > DRIFT_THRESHOLD_PER_DAY:  // e.g., 0.5 rating points/day
        ALERT(
            severity="P3",
            message="Rating drift detected",
            detail={
                direction: "inflation" IF slope > 0 ELSE "deflation",
                rate: slope,
                projected_monthly_drift: slope × 30
            }
        )

    // Check tier distribution health
    tier_dist = GetTierDistribution()
    expected_dist = GetExpectedTierDistribution()
    kl_divergence = KLDivergence(tier_dist, expected_dist)

    IF kl_divergence > DISTRIBUTION_THRESHOLD:
        ALERT(
            severity="P3",
            message="Rank distribution anomaly",
            detail={
                actual: tier_dist,
                expected: expected_dist,
                divergence: kl_divergence
            }
        )

EXPECTED TIER DISTRIBUTION (example):
    Bronze:     10%
    Silver:     20%
    Gold:       30%
    Platinum:   25%
    Diamond:    10%
    Master:     4%
    Grandmaster: 0.8%
    Top 500:    0.2%
```

### 4.3 New Player Rating Convergence

```
Dashboard: Rating Convergence for New Players

Tracks how quickly new players reach a stable rating:

┌───────────────────────────────────────────────────┐
│ Rating Sigma by Match Count (cohort: last 30 days)│
│                                                   │
│ σ 350 ─┬──●                                      │
│   300 ─┤   ╲                                     │
│   250 ─┤    ╲                                    │
│   200 ─┤     ╲                                   │
│   150 ─┤      ╲                                  │
│   100 ─┤       ╲──●                              │
│    50 ─┤           ╲──●──●──●──●──●──●──●──●     │
│     0 ─┴──────────────────────────────────────    │
│        0   5  10  15  20  25  30  35  40  50      │
│                     Matches Played                │
│                                                   │
│ Target convergence: σ < 60 by match 25            │
│ Current: σ < 60 by match 22  │  Status: 🟢       │
└───────────────────────────────────────────────────┘
```

---

## 5. Player Experience Metrics

### 5.1 Experience Quality Indicators

These metrics bridge system performance with player satisfaction:

```
Player Experience Metrics:

// Session-level
session.queue_time_total         // Total time spent in queue per session
session.matches_played           // Number of matches per session
session.session_duration         // Total session length
session.return_after_loss        // Did the player queue again after losing?

// Match-level player perception proxies
match.early_quit_rate            // Left before match ended (proxy for bad experience)
match.report_rate                // Reports filed during/after match
match.rematch_rate               // How often players immediately re-queue
match.commendation_rate          // Positive feedback rate (if system supports it)

// Longitudinal
player.churn_after_loss_streak   // Players who stop playing after N consecutive losses
player.smurf_encounter_rate      // Estimated matches vs probable smurfs
player.matchmaking_satisfaction  // Direct survey (quarterly)
player.rank_anxiety_indicators   // Queue avoidance behavior at rank boundaries
```

### 5.2 Experience Dashboard

```
Dashboard: Player Experience Health
Layout:

┌───────────────────────────────────────────────────┐
│ Key Experience Indicators (7-day rolling)          │
│                                                   │
│ Return Rate After Loss:   72%  (target: > 65%) 🟢│
│ Session Avg Matches:      4.2  (target: > 3.5) 🟢│
│ Early Quit Rate:          3.1% (target: < 5%)  🟢│
│ Report Rate Per Match:    8.2% (target: < 10%) 🟢│
│ Smurf Encounter Rate:    2.1% (target: < 3%)  🟢│
│ Avg Queue-to-Play Ratio:  8%  (target: < 15%) 🟢│
├───────────────────────────────────────────────────┤
│ Churn Risk by Loss Streak                         │
│                                                   │
│ After 1 loss:  5% stop (normal)                   │
│ After 2 losses: 12% stop                          │
│ After 3 losses: 28% stop  ← intervention point    │
│ After 4 losses: 45% stop                          │
│ After 5+ losses: 62% stop                         │
│                                                   │
│ Action: After 3 consecutive losses in ranked,     │
│ suggest switching to casual or taking a break.    │
├───────────────────────────────────────────────────┤
│ Smurf Detection Effectiveness                     │
│                                                   │
│ Detected smurfs (last 7d):     12,400             │
│ Avg matches before detection:  4.8 (target: < 8) │
│ False positive rate:           ~2.1%              │
│ Avg matches to correct rank:   7.2 (target: < 10)│
└───────────────────────────────────────────────────┘
```

---

## 6. Infrastructure Observability

### 6.1 Component Health Metrics

```
Infrastructure Metrics:

// API Gateway
gateway.active_connections       // WebSocket connections per instance
gateway.request_rate             // HTTP requests per second
gateway.error_rate_5xx           // Server errors per minute
gateway.auth_failure_rate        // Authentication failures (possible abuse)

// Queue Store
queuestore.memory_utilization    // Percentage of allocated memory
queuestore.operation_latency.p99 // Read/write latency
queuestore.replication_lag       // Primary-replica sync delay
queuestore.eviction_rate         // Tickets evicted due to memory pressure (should be 0)

// Match Workers
matchworker.cpu_utilization      // Per-worker CPU usage
matchworker.cycle_duration       // Time per matching sweep
matchworker.matches_per_cycle    // Productivity per sweep
matchworker.idle_cycles          // Cycles with no matches formed (pool too small?)

// Rating Engine
ratingengine.throughput          // Updates per second
ratingengine.backlog_depth       // Pending events
ratingengine.processing_errors   // Failed rating calculations

// Server Fleet
fleet.total_capacity             // Total game server slots
fleet.utilization                // Percentage in use
fleet.allocation_latency.p99     // Time to allocate a server
fleet.health_check_failures      // Unhealthy servers detected
```

### 6.2 Distributed Tracing

Each matchmaking lifecycle generates a distributed trace:

```
Trace: Player Queue-to-Game Lifecycle
Trace ID: abc123

Spans:
├── [12ms] api.queue.enter
│   ├── [2ms] auth.validate_token
│   ├── [3ms] cache.get_player_profile
│   ├── [1ms] queue.validate_eligibility
│   └── [5ms] queue.create_ticket
├── [18000ms] queue.waiting (async span)
│   ├── [500ms] matchworker.scan_cycle_1 (no match)
│   ├── [500ms] matchworker.scan_cycle_2 (no match)
│   └── [500ms] matchworker.scan_cycle_3 (match found!)
├── [45ms] matchworker.form_match
│   ├── [10ms] matchworker.score_candidates
│   ├── [15ms] matchworker.assign_teams
│   └── [20ms] queue.atomic_dequeue
├── [1200ms] server.allocate
│   ├── [5ms] server.select_optimal
│   ├── [800ms] server.reserve_session
│   └── [400ms] server.distribute_connection_info
├── [25min] game.in_progress (span marker only)
└── [45ms] rating.update
    ├── [5ms] rating.validate_result
    ├── [30ms] rating.trueskill2_inference
    └── [10ms] rating.persist_updates

Total lifecycle: 25min 19.3s
Queue portion: 18.0s (71% of pre-game time)
```

---

## 7. Alerting Hierarchy

### 7.1 Alert Severity Classification

| Severity | Response Time | Notification | Example |
|---|---|---|---|
| **P0 (Critical)** | Immediate (< 5 min) | Page on-call + escalation | Matchmaking completely down in a region |
| **P1 (High)** | < 15 min | Page on-call | Queue times > 3x SLO for 5+ minutes |
| **P2 (Medium)** | < 1 hour | Notification to team channel | Match quality degraded below threshold |
| **P3 (Low)** | Next business day | Email/ticket | Rating drift detected, tier distribution shift |

### 7.2 Composite Health Score

```
FUNCTION ComputeSystemHealthScore():
    // Weighted composite of all key metrics
    components = {
        "queue_time_slo":      (CheckQueueTimeSLO(), 0.30),
        "match_quality":       (CheckMatchQuality(), 0.20),
        "api_availability":    (CheckAPIAvailability(), 0.20),
        "server_headroom":     (CheckServerCapacity(), 0.15),
        "rating_freshness":    (CheckRatingLatency(), 0.10),
        "smurf_detection":     (CheckSmurfMetrics(), 0.05),
    }

    health_score = SUM(score × weight FOR (score, weight) IN components.values())

    // Map to status
    IF health_score > 0.90:   RETURN "HEALTHY" (green)
    IF health_score > 0.75:   RETURN "DEGRADED" (yellow)
    IF health_score > 0.50:   RETURN "IMPAIRED" (orange)
    RETURN "CRITICAL" (red)
```

---

## 8. Operational Runbooks (Summary)

| Scenario | Detection | Investigation Steps | Resolution |
|---|---|---|---|
| **Queue times spiking in one region** | P50 alert | Check pool size, match worker health, recent deploys | Scale workers, check for pool partition issue |
| **Match quality dropping** | Quality score alert | Review skill distribution changes, check expansion config, verify rating model | Tighten quality floor, adjust expansion rates |
| **Rating engine falling behind** | Backlog depth alert | Check worker count, processing errors, database latency | Scale workers, investigate DB health |
| **Server allocation failures** | Allocation error rate | Check fleet capacity, server health, recent fleet changes | Scale fleet, investigate unhealthy servers |
| **Smurf detection surge** | Smurf count spike | Check for new game sale/free weekend, verify detection accuracy | Expected during promotion events; monitor false positive rate |
| **Post-season-reset chaos** | Multiple alerts | Expected on season boundaries, verify pre-scaling activated | Ride it out (planned), adjust real-time if thresholds exceeded |
