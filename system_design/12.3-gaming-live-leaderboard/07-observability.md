# Observability — Live Leaderboard System

## Observability Strategy

The leaderboard system requires three distinct observability perspectives: **operational health** (is the system working?), **ranking accuracy** (are ranks correct?), and **integrity monitoring** (are scores legitimate?). Each perspective has different stakeholders, metrics, and alerting thresholds.

---

## Key Metrics

### Score Processing Metrics

| Metric | Description | Collection Method | Alert Threshold |
|---|---|---|---|
| `score.ingestion.rate` | Score submissions per second | Counter at ingestion service | < 10K/sec (low) or > 250K/sec (overload) |
| `score.ingestion.latency_ms` | Time from API receipt to event log write | Histogram at ingestion service | P99 > 100ms |
| `score.validation.pass_rate` | Percentage of scores passing validation | Counter ratio | < 90% (possible attack) |
| `score.validation.latency_ms` | Time spent in validation pipeline | Histogram at validation service | P99 > 50ms |
| `score.propagation.latency_ms` | Time from event log write to sorted set update | Timestamp diff: event_log.ts → ZADD.ts | P99 > 500ms |
| `score.rejected.rate` | Rejected scores per second by reason | Counter by rejection_reason label | > 1K/sec (anomaly) |
| `score.flagged.rate` | Scores flagged for async review | Counter | > 100/sec (possible widespread cheating) |

### Ranking Engine Metrics

| Metric | Description | Collection Method | Alert Threshold |
|---|---|---|---|
| `ranking.zadd.latency_us` | Time for ZADD operation (microseconds) | Histogram at sorted set command | P99 > 1000μs |
| `ranking.zrank.latency_us` | Time for ZREVRANK operation | Histogram | P99 > 500μs |
| `ranking.zrange.latency_us` | Time for ZREVRANGE (top-N) operation | Histogram | P99 > 2000μs |
| `ranking.memory.used_bytes` | Memory used by sorted sets | Gauge per instance | > 80% of maxmemory |
| `ranking.memory.fragmentation_ratio` | Memory fragmentation | Gauge | > 1.5 |
| `ranking.entries.count` | Total entries per sorted set | Gauge per leaderboard | > 40M (approaching limit) |
| `ranking.replication.lag_ms` | Replication delay primary → replica | Gauge per replica | > 100ms |
| `ranking.ops.per_second` | Operations per second per instance | Counter | > 150K (approaching saturation) |

### Query Service Metrics

| Metric | Description | Collection Method | Alert Threshold |
|---|---|---|---|
| `query.top_n.latency_ms` | End-to-end latency for top-N queries | Histogram at query service | P99 > 50ms |
| `query.rank.latency_ms` | End-to-end latency for rank lookup | Histogram | P99 > 100ms |
| `query.around_me.latency_ms` | Latency for around-me queries | Histogram | P99 > 100ms |
| `query.friend.latency_ms` | Latency for friend leaderboard | Histogram | P99 > 200ms |
| `query.cross_shard.latency_ms` | Scatter-gather latency for sharded queries | Histogram | P99 > 2000ms |
| `query.cache.hit_rate` | Response cache hit ratio | Counter ratio | < 30% (cache ineffective) |
| `query.cdn.hit_rate` | CDN cache hit ratio | Counter from CDN metrics | < 50% during normal traffic |
| `query.error.rate` | Query errors per second | Counter by error_type | > 0.1% of total queries |

### WebSocket/Notification Metrics

| Metric | Description | Collection Method | Alert Threshold |
|---|---|---|---|
| `ws.connections.active` | Active WebSocket connections | Gauge | > 80% capacity per server |
| `ws.connections.rate` | New connections per second | Counter | Spike > 10x normal |
| `notification.delivery.latency_ms` | Time from rank change to client push | Histogram | P99 > 2000ms |
| `notification.delivery.success_rate` | Successfully delivered notifications | Counter ratio | < 95% |
| `notification.backlog` | Undelivered notifications in queue | Gauge | > 50K |

### Reset & Snapshot Metrics

| Metric | Description | Collection Method | Alert Threshold |
|---|---|---|---|
| `reset.duration_ms` | Time to complete seasonal reset | Histogram | > 30,000ms |
| `reset.success_rate` | Successful resets vs. total attempts | Counter ratio | < 100% (any failure is critical) |
| `snapshot.duration_ms` | Time to capture snapshot | Histogram | > 60,000ms |
| `snapshot.size_bytes` | Size of captured snapshot | Gauge | > 5 GB (investigate) |
| `snapshot.integrity.failures` | Checksum mismatches on verification | Counter | > 0 (data corruption) |

---

## Rank Accuracy Monitoring

Rank accuracy is uniquely important for leaderboard systems—stale or incorrect ranks erode player trust and competitive integrity.

### Accuracy Verification Process

```
FUNCTION verify_rank_accuracy(leaderboard_id, sample_size=1000):
    // Run periodically (every 5 minutes) on a subset of players

    // Step 1: Sample random players from the sorted set
    total = ZCARD("lb:" + leaderboard_id)
    sample_indices = RANDOM_SAMPLE(0, total-1, sample_size)

    errors = 0
    max_drift = 0

    FOR each index IN sample_indices:
        // Step 2: Get player at this rank position
        entries = ZREVRANGE("lb:" + leaderboard_id, index, index, WITHSCORES)
        player_id = entries[0].member
        expected_rank = index + 1  // 1-indexed

        // Step 3: Independently compute rank
        score = entries[0].score
        actual_higher = ZCOUNT("lb:" + leaderboard_id, "(" + score, "+inf")
        // Add same-score players ranked above (by tiebreak)
        same_score_above = count_same_score_above(leaderboard_id, player_id, score)
        computed_rank = actual_higher + same_score_above + 1

        // Step 4: Compare
        drift = ABS(expected_rank - computed_rank)
        IF drift > 0:
            errors += 1
            max_drift = MAX(max_drift, drift)

    accuracy = 1 - (errors / sample_size)

    EMIT_METRIC("rank.accuracy.rate", accuracy)
    EMIT_METRIC("rank.accuracy.max_drift", max_drift)
    EMIT_METRIC("rank.accuracy.errors", errors)

    IF accuracy < 0.999:
        ALERT("RANK_ACCURACY_DEGRADED", {
            leaderboard_id: leaderboard_id,
            accuracy: accuracy,
            max_drift: max_drift
        })
```

### Cross-Shard Consistency Check

```
FUNCTION verify_cross_shard_consistency(leaderboard_id):
    shards = GET_SHARDS(leaderboard_id)

    // Check 1: Total entry count matches expectation
    total = SUM(ZCARD(shard) FOR shard IN shards)
    expected = GET_EXPECTED_COUNT(leaderboard_id)

    IF ABS(total - expected) > expected * 0.001:
        ALERT("SHARD_COUNT_MISMATCH", {
            actual: total,
            expected: expected,
            drift_pct: ABS(total - expected) / expected * 100
        })

    // Check 2: No duplicate players across shards
    // Sample-based: check 1000 random players
    FOR i IN [0..999]:
        player = RANDOM_MEMBER(shards[RANDOM(0, len(shards))])
        found_in = []
        FOR shard IN shards:
            IF ZSCORE(shard, player) != NULL:
                found_in.append(shard)
        IF len(found_in) > 1:
            ALERT("DUPLICATE_PLAYER_ACROSS_SHARDS", {
                player_id: player,
                shards: found_in
            })

    // Check 3: Score distribution consistency
    // Each shard should have similar score ranges (for hash sharding)
    distributions = []
    FOR shard IN shards:
        min_score = ZRANGE(shard, 0, 0, WITHSCORES)[0].score
        max_score = ZREVRANGE(shard, 0, 0, WITHSCORES)[0].score
        distributions.append({min: min_score, max: max_score, count: ZCARD(shard)})

    // Verify uniform distribution (±10% of expected per shard)
    expected_per_shard = total / len(shards)
    FOR dist IN distributions:
        IF ABS(dist.count - expected_per_shard) > expected_per_shard * 0.1:
            ALERT("SHARD_IMBALANCE", {distribution: distributions})
```

---

## Anomaly Detection for Score Manipulation

### Statistical Anomaly Detection Dashboard

```
Anomaly Signals Monitored:

  Signal 1: Score Distribution Shift
    - Compare current hour's score distribution vs. trailing 7-day average
    - KL divergence or KS test for distributional change
    - Alert if p-value < 0.01 (significant distribution change)

  Signal 2: Top-N Velocity
    - Track how quickly the top-100 scores change
    - Normal: ~5-10 changes per hour
    - Anomalous: 50+ changes per hour (score manipulation or bot army)

  Signal 3: New Account Score Ratio
    - Accounts < 7 days old achieving top-1000 scores
    - Normal: < 1% of top-1000 are new accounts
    - Anomalous: > 5% (possible smurf/bot accounts)

  Signal 4: Geographic Score Anomaly
    - Scores from unexpected geographic regions
    - Track VPN/proxy usage patterns
    - Flag clusters of high scores from same IP range

  Signal 5: Submission Pattern Regularity
    - Natural play has irregular submission intervals
    - Bot-like behavior: regular intervals (every 60s ± 1s)
    - Entropy-based detection: low entropy = suspicious regularity
```

### Automated Response Actions

```
Alert Severity Levels and Automated Responses:

  INFO:
    - Log for trend analysis
    - No immediate action
    - Example: slight increase in flagged scores

  WARNING:
    - Increase validation strictness for affected leaderboard
    - Enable enhanced logging for suspicious accounts
    - Notify game operations team
    - Example: 2x normal flagged score rate

  CRITICAL:
    - Freeze affected leaderboard (read-only)
    - Block score submissions from new accounts
    - Page on-call security engineer
    - Example: 10x normal flagged score rate

  EMERGENCY:
    - Freeze ALL leaderboards for the affected game
    - Roll back to last verified snapshot
    - Engage incident response team
    - Example: confirmed systematic compromise of score validation
```

---

## Dashboards

### Dashboard 1: Leaderboard Health Overview

```
Panel Layout:

  Row 1: Traffic & Throughput
    [Score Ingestion Rate - Time Series]  [Query Rate - Time Series]
    [Write/Read Ratio - Gauge]            [Active WebSockets - Gauge]

  Row 2: Latency
    [Score Propagation P50/P99 - Heatmap]  [Query Latency P50/P99 - Heatmap]
    [Cross-Shard Latency - Time Series]    [Notification Delay - Time Series]

  Row 3: System Resources
    [Memory Usage per Instance - Stacked Bar]   [CPU per Instance - Line Chart]
    [Replication Lag per Replica - Line Chart]   [Queue Depth - Area Chart]

  Row 4: Data Integrity
    [Rank Accuracy % - Gauge]              [Shard Balance - Bar Chart]
    [Cache Hit Rates - Stacked Area]       [Error Rate - Time Series]
```

### Dashboard 2: Anti-Cheat & Integrity

```
Panel Layout:

  Row 1: Score Validation
    [Validation Pass/Fail/Flag Rate - Stacked Area]
    [Rejection Reasons - Pie Chart]
    [Flagged Score Volume - Time Series]

  Row 2: Anomaly Detection
    [Score Distribution Shift (KS Statistic) - Time Series]
    [Top-100 Velocity - Bar Chart]
    [New Account Score Ratio - Line Chart]

  Row 3: Enforcement
    [Active Shadow Bans - Gauge]
    [Enforcement Actions by Tier - Bar Chart]
    [Trust Score Distribution - Histogram]

  Row 4: Account Risk
    [High-Risk Accounts - Table (top 20)]
    [Score Anomaly Heatmap (player × time)]
    [Cross-Player Correlation Clusters - Network Graph]
```

### Dashboard 3: Seasonal Reset & Lifecycle

```
Panel Layout:

  Row 1: Current Season Status
    [Active Leaderboard Count - Gauge]     [Total Entries Across All - Counter]
    [Season Duration Remaining - Countdown] [Next Reset Schedule - Text]

  Row 2: Reset Performance
    [Last Reset Duration - Gauge]          [Reset Success History - Table]
    [Snapshot Capture Times - Bar Chart]   [Post-Reset Score Ramp-Up - Line Chart]

  Row 3: Storage & Archival
    [In-Memory Usage Trend - Area Chart]   [Object Storage Usage - Stacked Bar]
    [Snapshot Sizes Over Time - Line Chart] [Archive Retrieval Latency - Histogram]
```

---

## Distributed Tracing

### Trace Points

```
Score Submission Trace:
  Span 1: api_gateway.receive          (entry point, 1-2ms)
  Span 2: api_gateway.authenticate     (JWT validation, 1-5ms)
  Span 3: ingestion.validate_schema    (payload check, <1ms)
  Span 4: ingestion.check_rate_limit   (rate limit lookup, 1-2ms)
  Span 5: validation.anti_cheat_fast   (quick plausibility, 5-20ms)
  Span 6: event_log.append             (durable write, 2-10ms)
  Span 7: queue.publish                (enqueue score event, 1-5ms)
  Span 8: ranking.zadd                 (sorted set update, <1ms)
  Span 9: ranking.replicate            (async to replicas, 1-10ms)
  Span 10: notification.dispatch       (rank change push, 5-50ms)

  Total expected: 20-100ms end-to-end

Rank Query Trace:
  Span 1: api_gateway.receive          (entry point, 1-2ms)
  Span 2: cdn.cache_check              (CDN lookup, 1-5ms)
  Span 3: query_service.cache_check    (response cache, 1-2ms)
  Span 4: query_service.read_replica   (sorted set query, 1-5ms)
  Span 5: query_service.enrich         (player metadata fetch, 5-20ms)
  Span 6: query_service.cache_write    (cache result, 1-2ms)

  Total expected: 10-35ms end-to-end
```

### Trace Sampling Strategy

```
Sampling Rules:
  - High-latency requests (P99+): 100% sampling
  - Error responses: 100% sampling
  - Score rejections: 100% sampling
  - Anti-cheat flagged events: 100% sampling
  - Normal successful requests: 1% sampling
  - Health checks: 0% sampling (excluded)

Storage:
  - Sampled traces retained for 7 days
  - Error/flagged traces retained for 30 days
  - Estimated storage: ~50 GB/day at 1% sampling rate
```

---

## Alerting Rules

### Critical Alerts (Page On-Call)

| Alert | Condition | Action |
|---|---|---|
| `ranking_engine_down` | Primary unreachable for > 10s | Page SRE; trigger failover |
| `score_propagation_stalled` | No ZADD operations for > 30s | Page SRE; check event queue |
| `rank_accuracy_degraded` | Accuracy < 99.5% | Page SRE; investigate shard consistency |
| `reset_failed` | Seasonal reset did not complete | Page SRE; manual intervention |
| `memory_critical` | Instance memory > 95% | Page SRE; emergency eviction |

### Warning Alerts (Notify Team)

| Alert | Condition | Action |
|---|---|---|
| `replication_lag_high` | Lag > 500ms for > 2 min | Investigate network/load |
| `cache_hit_rate_low` | Hit rate < 30% for > 10 min | Review cache configuration |
| `queue_depth_growing` | Queue depth > 500K | Scale consumers |
| `score_rejection_spike` | Rejections > 5x normal | Investigate; possible attack |
| `memory_warning` | Instance memory > 80% | Plan capacity expansion |

### Info Alerts (Dashboard Only)

| Alert | Condition | Action |
|---|---|---|
| `traffic_spike` | Query rate > 2x normal | Monitor; may need scaling |
| `new_leaderboard_created` | New leaderboard provisioned | Log for capacity planning |
| `snapshot_slow` | Snapshot > 2x normal duration | Optimize or schedule off-peak |

---

## Log Structure

```
Structured Log Format:

Score Event Log:
{
    "timestamp": "2026-03-09T14:30:00.123Z",
    "level": "INFO",
    "service": "score-ingestion",
    "trace_id": "abc-123-def",
    "event": "score_accepted",
    "player_id": "uuid-abc",
    "leaderboard_id": "battle-royale:solo:global:s7",
    "score": 2450,
    "validation_result": "PASSED",
    "validation_latency_ms": 12,
    "source_server": "gs-na-east-14"
}

Anti-Cheat Log:
{
    "timestamp": "2026-03-09T14:30:01.456Z",
    "level": "WARNING",
    "service": "anti-cheat",
    "trace_id": "abc-124-def",
    "event": "score_flagged",
    "player_id": "uuid-xyz",
    "reason": "z_score_exceeded",
    "z_score": 4.7,
    "historical_mean": 1200,
    "submitted_score": 8500,
    "trust_score": 0.45,
    "action_taken": "flagged_for_review"
}

Log Retention:
  - Operational logs: 30 days
  - Security/anti-cheat logs: 1 year
  - Audit logs: 7 years
  - Score event logs: 1 year (compressed after 30 days)
```

---

*Previous: [Security & Compliance](./06-security-and-compliance.md) | Next: [Interview Guide →](./08-interview-guide.md)*
