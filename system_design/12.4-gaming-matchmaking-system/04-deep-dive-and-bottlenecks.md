# Deep Dive & Bottlenecks — Gaming Matchmaking System

## 1. Deep Dive: Skill Rating Engine (TrueSkill 2)

### 1.1 Why Bayesian Inference Matters

The fundamental insight behind TrueSkill 2 is that a player's skill is not a single number—it is a probability distribution. The system maintains two values per player: μ (what we think their skill is) and σ (how confident we are). A new player with μ=1500, σ=350 might actually be anywhere from 450 to 2550 (±3σ). After 30 matches, σ might shrink to 50, placing them confidently between 1350 and 1650.

This uncertainty tracking creates several critical advantages:

**Faster convergence for new players.** A new player's high σ means each match produces large rating changes. If they win against established players, their μ jumps dramatically. After 5-10 matches, the system has a reasonable estimate. Traditional Elo with fixed K-factor requires 30-50 matches for equivalent convergence.

**Natural smurf acceleration.** A smurf account starts with high σ. When they consistently win, each victory produces outsized μ increases precisely because the system is uncertain. The smurf reaches their true skill level within 5-8 matches instead of 30+.

**Inactivity handling without arbitrary rules.** When a player is inactive, σ gradually increases. When they return, the system appropriately treats early results as more informative (higher σ = larger updates), effectively recalibrating without requiring explicit "placement" games.

### 1.2 Factor Graph Architecture

TrueSkill 2 represents each match as a factor graph—a probabilistic graphical model:

```
Factor Graph for a 5v5 Match:

Prior Factors (10 nodes):
  [P1_prior] → [P1_skill]
  [P2_prior] → [P2_skill]
  ...
  [P10_prior] → [P10_skill]

Performance Factors (10 nodes):
  [P1_skill] → [P1_perf] (adds game noise β²)
  ...

Team Performance Factors (2 nodes):
  [P1_perf, P2_perf, ..., P5_perf] → [Team0_perf] (sum)
  [P6_perf, ..., P10_perf] → [Team1_perf] (sum)

Outcome Factor (1 node):
  [Team0_perf, Team1_perf] → [Outcome] (Team0 > Team1 if Team0 won)
```

Belief propagation runs through this graph, passing messages between nodes until convergence. Each message is a Gaussian distribution, and the update rules are closed-form truncated Gaussian operations.

The key computational cost: **10 players × 5-30 iterations × Gaussian multiplications**. At 32K rating updates/second, this is manageable with 20-30 worker cores. The factor graph never exceeds match size, so computation scales with match throughput, not player population.

### 1.3 Performance Feature Integration (TrueSkill 2 Extension)

Classic TrueSkill only uses win/loss. TrueSkill 2 adds individual performance signals:

| Feature | Weight | Rationale |
|---|---|---|
| Kill/Death Ratio (normalized) | 0.25 | Direct combat effectiveness |
| Damage Per Round (normalized) | 0.20 | Contribution beyond kills |
| Objective Score (normalized) | 0.30 | Playing the objective matters more than kills |
| Survival Rate | 0.15 | Dying less = making better decisions |
| Assist Rate | 0.10 | Teamwork contribution |

Performance features are normalized within the match context (compared to average in that specific game), not globally. A player with 30 kills in a 45-minute game is different from 30 kills in a 15-minute game.

The performance adjustment is capped at ±5% of the base rating change to prevent gaming the system. A player who hard-carried but lost still loses rating—just slightly less. This prevents perverse incentives like stat-padding instead of playing to win.

### 1.4 Edge Cases in Rating

| Scenario | Challenge | Solution |
|---|---|---|
| **Early surrender** | Full game not played, stats skewed | Apply 70% weight to rating change if game < 50% duration |
| **Player disconnect** | 4v5 result not meaningful for disconnected player | Freeze rating for disconnected player if < 3 min played; apply abandonment penalty otherwise |
| **Draw/tie** | No clear winner | Both teams get small σ reduction (more confident at current level) |
| **Party of 5 vs mixed** | Coordination advantage | Apply party synergy bonus to expected performance; losing to a party costs less rating |
| **Extreme skill mismatch** | Top 0.1% vs top 1% | Reduce σ update for the lower player if the match was predicted to be lopsided (learning signal is low) |

---

## 2. Deep Dive: Queue Manager

### 2.1 The Double-Matching Problem

The most dangerous race condition in matchmaking is **double-matching**: two match workers simultaneously selecting the same ticket for different matches. If Player A appears in Match 1 and Match 2, both servers expect them, but only one can have them.

**How it happens:**

```
Time T0: Match Worker 1 reads pool snapshot (Player A is in pool)
Time T0: Match Worker 2 reads pool snapshot (Player A is in pool)
Time T1: Worker 1 forms Match 1 including Player A
Time T1: Worker 2 forms Match 2 including Player A
Time T2: Worker 1 dequeues Player A → success
Time T2: Worker 2 dequeues Player A → CONFLICT
```

**Solutions evaluated:**

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **Global lock** on pool during matching | No double-matching possible | Serializes matching, kills throughput | Rejected |
| **Optimistic concurrency** with CAS | High throughput, conflict detected at commit | Requires retry logic, wasted computation on conflict | **Selected** |
| **Ticket-level locks** (lock each ticket before including in match) | Fine-grained, parallel-safe | Lock contention at scale, deadlock risk | Rejected |
| **Single-threaded per pool** | No concurrency issues | Limits matching throughput to one core per pool | Used for small pools (<1K tickets) |

**The selected approach—optimistic concurrency with atomic batch dequeue:**

```
FUNCTION CommitMatch(match):
    // Atomic batch dequeue with version checking
    ticket_ids = match.GetAllTicketIds()
    expected_versions = match.GetAllTicketVersions()

    result = QueueStore.AtomicConditionalRemove(
        ticket_ids,
        expected_versions  // Each ticket has a version counter
    )

    IF result == ALL_REMOVED:
        RETURN SUCCESS  // Match committed
    ELSE:
        // Some tickets were modified/removed since we read them
        conflicting_tickets = result.GetConflicting()
        RETURN CONFLICT(conflicting_tickets)

// On CONFLICT: discard this match, re-scan the pool next cycle
// The conflicting tickets are in another match—no player appears twice
```

This approach means some computation is wasted when conflicts occur, but conflicts are rare in practice (< 0.5% of match formations at steady state) and the system self-corrects within one matching cycle (1-2 seconds).

### 2.2 Queue Starvation for Outlier Skills

Players at the extreme ends of the skill distribution (top 0.1% or bottom 0.5%) face a fundamental problem: there are very few players at their skill level in their region at any given time.

**The starvation cascade:**
1. Top-500 player queues in NA-East
2. Only 15 players of similar skill are online in the region
3. Need 10 for a 5v5 match
4. Some are already in-game, some are queuing for different modes
5. Effective pool might be 3-5 players → match impossible

**Mitigation strategies (layered):**

| Strategy | Trigger | Effect |
|---|---|---|
| **Accelerated expansion** | Ticket ordinal in top/bottom 1% | Start with ±200 skill window instead of ±50 |
| **Immediate cross-region** | Ticket ordinal in top 0.1% | Skip regional-first policy, search all regions immediately |
| **Asymmetric expansion** | Queue time > 60s for any ticket | Expand downward in skill more than upward (slightly unfair, but better than no match) |
| **Fill matches** | Queue time > 120s | Allow matches with 8/10 players (4v4 in a 5v5 mode) |
| **Priority queuing** | Returning from a very long queue last session | Boost ticket priority for next queue entry |
| **Streamer/pro pools** | Account flagged as high-visibility | Dedicated matching pool with relaxed skill tolerance and better latency priority |

### 2.3 Queue Health Monitoring

```
Per-pool health metrics (computed every 10 seconds):

PoolHealth {
    pool_id:            String
    ticket_count:       Integer
    median_wait_sec:    Float64
    p95_wait_sec:       Float64
    p99_wait_sec:       Float64
    match_rate_per_min: Float64
    avg_match_quality:  Float64
    starvation_count:   Integer     // Tickets waiting > 120s
    conflict_rate:      Float64     // Double-match conflict percentage
    expansion_depth:    Float64     // Avg expansion level (0=base, 1=max)
}

Alert thresholds:
- median_wait > 45s: WARNING (possible pool imbalance)
- p99_wait > 180s: CRITICAL (starvation event)
- match_rate declining for 5 consecutive intervals: WARNING
- conflict_rate > 5%: WARNING (too many parallel workers for pool size)
- avg_match_quality < 0.55: WARNING (matches too imbalanced)
```

---

## 3. Deep Dive: Smurf and Booster Detection

### 3.1 Smurf Detection Pipeline

Smurf detection operates at three layers:

**Layer 1: Pre-game behavioral signals**

| Signal | Detection Method | Confidence |
|---|---|---|
| **Hardware fingerprint match** | Hash of GPU, CPU, RAM, disk serial matches a known higher-rated account | High (0.9) |
| **IP correlation** | New account originates from same IP/subnet as existing account | Medium (0.6) |
| **Input pattern analysis** | Mouse sensitivity, key binding patterns, crosshair placement match known player | Medium (0.7) |
| **Account metadata** | New account with zero friends, no profile customization, immediate ranked play | Low (0.4) |

**Layer 2: In-game performance anomalies**

```
FUNCTION DetectSmurfPerformance(player, match_history):
    IF player.total_matches < 20:
        // Only check new accounts
        recent_matches = match_history.Last(10)

        // Calculate performance z-score against tier average
        tier_avg_kd = GetTierAverage(player.current_tier, "kd_ratio")
        tier_std_kd = GetTierStdDev(player.current_tier, "kd_ratio")
        player_kd = AVG(m.kd_ratio FOR m IN recent_matches)

        z_score_kd = (player_kd - tier_avg_kd) / tier_std_kd

        // Check multiple metrics
        z_score_damage = ComputeZScore(player, "damage_per_round")
        z_score_winrate = ComputeZScore(player, "win_rate")
        z_score_hs = ComputeZScore(player, "headshot_pct")

        composite_z = 0.3 × z_score_kd + 0.25 × z_score_damage +
                      0.25 × z_score_winrate + 0.2 × z_score_hs

        IF composite_z > 2.5:
            RETURN SMURF_CONFIRMED  // Performance is 2.5 std devs above tier
        ELSE IF composite_z > 1.8:
            RETURN SMURF_SUSPECTED
        ELSE:
            RETURN SMURF_NONE
```

**Layer 3: Accelerated convergence (the response)**

Rather than banning suspected smurfs (high false-positive risk), the system accelerates their MMR convergence:

| Smurf Flag | Rating Update Multiplier | Effect |
|---|---|---|
| NONE | 1.0x | Normal rating updates |
| SUSPECTED | 1.5x | Faster convergence, reach true rank in ~10 matches |
| CONFIRMED | 2.0-3.0x | Rapid convergence, reach true rank in ~5 matches |
| ACCELERATED | Return to 1.0x once σ stabilizes | Convergence complete, resume normal updates |

### 3.2 Boosting Detection

Boosting involves a high-skill player accessing another account or queuing with a low-skill account to inflate it.

**Detection signals:**

| Signal | Weight | Description |
|---|---|---|
| **IP/hardware change** | 0.30 | Sudden change in connection profile mid-season |
| **Playtime pattern shift** | 0.20 | Account suddenly active at different hours |
| **Performance discontinuity** | 0.25 | Dramatic KD/winrate jump between sessions |
| **Party pattern** | 0.15 | Repeatedly queuing with same high-rank partner who appears on multiple boosted accounts |
| **Mouse/input signature change** | 0.10 | Different sensitivity/DPI profile detected |

```
FUNCTION DetectBoosting(player, session_data):
    risk_score = 0.0

    // Check hardware profile change
    IF session_data.hardware_id != player.last_known_hardware_id:
        risk_score += 0.30
        IF player.last_known_hardware_id seen on another active account:
            risk_score += 0.20  // Hardware linked to multiple accounts

    // Check performance discontinuity
    recent_kd = AVG(last_5_matches.kd_ratio)
    historical_kd = player.lifetime_kd_ratio
    IF recent_kd > historical_kd × 1.8:    // 80% improvement
        risk_score += 0.25

    // Check party patterns
    party_partners = GetRecentPartyPartners(player, last_30_days)
    FOR EACH partner IN party_partners:
        boosted_accounts = GetAccountsBoostedWith(partner)
        IF LEN(boosted_accounts) > 3:
            risk_score += 0.15  // This partner is a serial booster

    // Action based on risk score
    IF risk_score > 0.70:
        RETURN BOOSTING_CONFIRMED  // Flag for review, restrict ranked play
    ELSE IF risk_score > 0.45:
        RETURN BOOSTING_SUSPECTED  // Increase monitoring, warn player
    ELSE:
        RETURN BOOSTING_NONE
```

### 3.3 Win-Trading Detection

Win-trading occurs when two players or groups coordinate to give each other wins, often at high ranks where the pool is small.

| Pattern | Detection |
|---|---|
| **Repeated matchups** | Same pair of players in opposing teams > 3 times in 24 hours |
| **Alternating results** | Player A wins against B, then B wins against A, in clear rotation |
| **Queue synchronization** | Two accounts queue within 2 seconds of each other repeatedly |
| **Intentional losing** | One player exhibits 0 damage, 0 kills, suspicious movement patterns |

---

## 4. Bottleneck Analysis

### 4.1 Matching Computation at Scale

**The problem:** With 800K concurrent queued players across 60 pools, each pool averaging 13.3K tickets, the matching algorithm runs every 1-2 seconds. Naive pairwise comparison is O(n²), which is 177M comparisons per pool per cycle—impractical.

**Why it's a bottleneck:** The matching algorithm must complete within the cycle window (1-2 seconds). If computation exceeds this, queue times increase and match quality degrades (stale pool snapshots).

**Solutions:**

| Technique | Speedup | Mechanism |
|---|---|---|
| **Sorted set range queries** | O(n²) → O(n log n) | Binary search to find tickets within skill window, only compare candidates |
| **Spatial indexing** | 10-50x | Partition tickets into skill buckets (width = base tolerance). Only compare across adjacent buckets |
| **Early termination** | 2-5x | Stop searching once a match exceeding quality threshold is found |
| **Parallelism within pool** | Linear in cores | Partition ticket set by skill range, parallel workers per partition with conflict resolution |
| **Incremental matching** | 2-3x | Don't re-scan tickets that were evaluated last cycle and haven't changed |

**Target budget:** Each pool must complete a matching sweep in < 500ms. With spatial indexing and early termination, this supports pools up to 50K tickets on a single core.

### 4.2 Queue Starvation for Extreme Skill Outliers

**The problem:** The top 0.1% (approximately 800 players globally at peak) may have queue times of 5-15 minutes even with aggressive expansion, because there simply are not enough opponents at their skill level.

**Why it's a bottleneck:** Long queue times for top players are highly visible (streamers, pros, esports athletes). Negative perception disproportionately impacts brand.

**Impact quantification:**

```
Top 0.1% population at peak: ~800 globally
Online in NA-East at any moment: ~120
In queue for ranked 5v5: ~25
Need 10 for a match: ~2.5 matches worth
With 25-min avg game time: 1 match forms every ~10 minutes in this pool

Expected queue time for top 0.1%: 3-10 minutes (vs 25s median)
```

**Mitigations (prioritized):**

1. Cross-region matching from t=0 for top 0.1% (adds 40-100ms latency but 5x larger pool)
2. Skill range asymmetric expansion (match them against top 1% opponents, adjust expected outcome)
3. Priority queue boost (top 0.1% tickets always evaluated first)
4. Fill matches (allow 4v4 or 4v5 with adjusted rating outcome)
5. Off-peak transparency (show estimated queue time >2 min, let player decide to wait)

### 4.3 Cross-Region Latency Tax

**The problem:** When a player overflows to a cross-region server, they incur 40-150ms additional latency. In competitive games, this creates a measurable disadvantage.

**Why it's a bottleneck:** The system must balance "provide a match eventually" against "don't put players at a latency disadvantage." Strict latency requirements shrink the pool; lenient requirements create unfair games.

**Tension analysis:**

```
Strict (< 60ms cap):
- Pool limited to home region
- Top 0.1% queue time: 5-15 min
- Match quality for formed matches: high
- Player perception: "queues are too long"

Lenient (< 150ms cap):
- Pool includes adjacent + sometimes distant regions
- Top 0.1% queue time: 1-3 min
- Match quality includes latency-disadvantaged players
- Player perception: "laggy players in my games"

Selected: adaptive cap starting at 40ms, expanding to 120ms over 60s
```

### 4.4 Party Composition Imbalance

**The problem:** If 40% of the queue is parties of 3 in a 5v5 mode, forming balanced matches becomes a bin-packing problem. Two 3-stacks exceed team size (6 > 5), so each match needs exactly one 3-stack + one duo, or one 3-stack + two solos per team.

**Why it's a bottleneck:** Party composition mismatches cause longer queue times for certain party sizes, even when total queue population is healthy.

**Impact by party size:**

| Party Size | Queue Population Share | Matching Difficulty | Expected Queue Time Premium |
|---|---|---|---|
| Solo (1) | 45% | Low (fills any gap) | 0% (baseline) |
| Duo (2) | 25% | Low-Medium | +10-20% |
| Trio (3) | 18% | High (needs 2-slot partners) | +30-50% |
| Quad (4) | 8% | Very High (needs exactly 1 solo) | +50-100% |
| 5-Stack | 4% | Needs another 5-stack | +100-200% (or matched vs non-5-stack with handicap) |

**Solutions:**

1. **5-stack separate queue:** 5-stacks only match other 5-stacks (or flex after 2 min)
2. **Flexible team composition:** Allow 3+2 vs 2+2+1 with quality penalty, not strict symmetry
3. **Queue time estimates per party size:** Show accurate estimates at queue entry so players have expectations
4. **Party size incentives:** Bonus rewards for queuing as sizes that help the pool (duo fills 3+2 gaps)

### 4.5 Thundering Herd on Season Start

**The problem:** When a new ranked season begins, all players are in recalibration. A massive surge of queue entries hits simultaneously, all with elevated uncertainty (σ), meaning the system can form matches more aggressively (wider acceptable ranges) but the match quality is inherently lower.

**Why it's a bottleneck:** 3-5x normal queue rate in the first hour. Rating engine processing 3-5x the normal update volume. All players competing for placement matches creates artificial congestion.

**Solutions:**

1. **Staggered season activation:** Roll out season start region-by-region over 2 hours
2. **Pre-provisioned capacity:** Auto-scale matching workers and rating workers 30 min before season start
3. **Relaxed quality thresholds during calibration:** Accept 0.50 quality floor (vs 0.65 normal) during placement games
4. **Rate-limited ranked entry:** Queue at most 200K placement matches concurrently, with estimated wait shown

---

## 5. Failure Mode Analysis

| Failure | Impact | Detection | Recovery |
|---|---|---|---|
| **Match worker crash** | Pool stops forming matches in that region | Heartbeat miss > 5s | Standby worker promotes, re-reads pool state from in-memory store |
| **Queue store crash** | All queued tickets lost in that region | Store heartbeat miss | Restore from replication; players re-enter queue (client auto-retries) |
| **Rating engine backlog** | Post-match ratings delayed | Queue depth > 10K events | Scale rating workers; ratings are eventually consistent, doesn't block gameplay |
| **Server allocator failure** | Matches formed but no server | Allocation timeout > 5s | Retry with different server; if persistent, re-queue players with priority |
| **Network partition (region)** | Region isolated, can't overflow | Cross-region health check fail | Region operates independently; overflow disabled until partition heals |
| **Factor graph divergence** | Rating update produces nonsensical values | |mu_delta| > 500 in single match | Discard update, flag match for manual review, use previous rating |
