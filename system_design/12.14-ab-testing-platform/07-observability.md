# 07 — Observability: A/B Testing Platform

## Experiment Health Metrics

### Assignment Health

The first sign that something is wrong with an experiment is often visible in assignment metrics. Every assignment decision — whether served from local SDK cache or the remote fallback service — is observable:

| Metric | Description | Healthy Range | Alert Threshold |
|---|---|---|---|
| `assignment.rate` | Assignments per second per experiment | Within 20% of expected based on DAU | < 10% of expected rate for > 5 min |
| `assignment.latency.p99` (local SDK) | 99th percentile local hash computation | < 1 ms | > 3 ms sustained |
| `assignment.latency.p99` (server) | 99th percentile remote assignment call | < 5 ms | > 10 ms sustained |
| `assignment.cache_hit_rate` | Fraction resolved from local SDK cache | > 99% | < 90% (ruleset refresh failures) |
| `assignment.targeting_pass_rate` | Fraction of eligible entities passing targeting | Stable within experiment | > 10% relative change from 1hr baseline |
| `assignment.error_rate` | Fraction of assignment calls returning errors | < 0.01% | > 0.1% for > 60 seconds |
| `ruleset.version_skew` | Gap between latest and oldest active ruleset version | < 60 seconds | > 120 seconds (stale SDK) |
| `ruleset.distribution_time_p99` | Time from ruleset publish to 99% SDK uptake | < 90 seconds | > 180 seconds |
| `assignment.fallback_rate` | Fraction of assignments served from stale/control fallback | < 0.01% | > 1% (assignment service degraded) |

Assignment rate anomalies are often the first signal of a targeting rule bug. If an experiment's assignment rate drops 50% immediately after a configuration change, the new targeting rule is likely too restrictive.

### Event Pipeline Health

| Metric | Description | Alert Threshold |
|---|---|---|
| `ingest.events_per_second` | Event throughput at gateway, by event type | Drop > 20% from baseline for > 2 min |
| `ingest.error_rate` | Fraction of events rejected at gateway | > 0.5% |
| `ingest.schema_validation_failure_rate` | Events failing schema validation | > 1% for any event type |
| `pipeline.queue_depth` | Message queue depth across all partitions | > 1M messages sustained for > 5 min |
| `pipeline.consumer_lag.p99` | Maximum lag across all partitions | > 2 minutes |
| `pipeline.dedup_hit_rate` | Fraction of events identified as duplicates | > 5% spike (SDK retry storm) |
| `pipeline.late_arrival_rate` | Fraction arriving after watermark | > 2% may indicate mobile offline burst |
| `pipeline.watermark_advance_rate` | Frequency of watermark advancement | Stalls for > 10 min → streaming broken |
| `pipeline.checkpoint_age` | Age of last successful stream aggregator checkpoint | > 5 min → recovery window growing |

The `pipeline.queue_depth` metric is the primary load indicator. A growing queue depth means the event processors cannot keep up with ingest throughput — a signal to auto-scale consumers.

### Analysis Pipeline Health

| Metric | Description | Alert Threshold |
|---|---|---|
| `analysis.job_queue_depth` | Pending analysis jobs | > 500 sustained for > 10 min |
| `analysis.job_duration.p95` | Time to complete one analysis job | > 60 seconds (3× expected) |
| `analysis.batch_lag` | Age of latest completed batch run | > 90 minutes (missed SLO) |
| `analysis.failure_rate` | Fraction of jobs failing permanently | > 1% |
| `analysis.cuped_failure_rate` | Fraction of CUPED computations failing | > 5% (possible pre-experiment data issue) |
| `results.staleness_p95` | Time since last successful result per experiment | > 2 hours for any running experiment |
| `analysis.significance_rate` | Fraction of experiments showing significance | Sudden spike > 3σ (statistical bug possible) |

The `analysis.significance_rate` metric is a meta-health check: if 50% of experiments suddenly show significance, there is likely a bug in the p-value computation rather than a surge in genuine product improvements.

---

## Sample Ratio Mismatch (SRM) Detection

SRM is one of the most dangerous and common data quality issues in experimentation. An SRM means the observed traffic split between variants does not match the expected split — a sign that the randomization or event pipeline is broken, not that the treatment is working. Every metric result produced from an experiment with a significant SRM is causally invalid, because the treatment and control groups are no longer comparable random samples.

### Continuous SRM Monitoring

The SRM Detector runs as a continuous stream processor reading from the assignment log, evaluating every running experiment every 5 minutes:

```
SRM Detection Algorithm (per experiment):

1. Fetch assignment counts per variant from assignment log (last 24h + cumulative lifetime)
2. Compute expected assignment counts from variant traffic weights:
   expected_i = total_assigned × (weight_i / sum(weights))

3. Run chi-squared goodness-of-fit test:
   χ² = Σ_i (observed_i - expected_i)² / expected_i
   df = num_variants - 1

4. Compute p-value: p = 1 - CDF_chi_squared(χ², df)

5. Apply minimum sample threshold: skip if total_assigned < 1000
   (chi-squared test unreliable with small samples)

6. Severity classification:
   - p < 0.01: WARNING (display banner, no automatic action)
   - p < 0.001: MODERATE (notify owner, mark results unreliable)
   - p < 0.0001: SEVERE (auto-pause experiment, page on-call)

7. Bonferroni correction for running in parallel across many experiments:
   effective_threshold = 0.001 / num_running_experiments
```

### SRM Dashboard Panel

Every experiment results page includes a prominent SRM status panel:

```
SRM Status Panel structure:
┌─────────────────────────────────────────────────────┐
│  Sample Ratio Mismatch Status                        │
│  ──────────────────────────────────────────────────  │
│  Status:  ● PASS  (p = 0.34)                         │
│                                                       │
│  Observed splits:                                     │
│    Control:    50,234  (50.0% expected, 50.1% actual) │
│    Treatment:  50,016  (50.0% expected, 49.9% actual) │
│                                                       │
│  Last checked: 3 minutes ago                          │
│  Monitoring frequency: every 5 minutes                │
└─────────────────────────────────────────────────────┘
```

If status is MODERATE or SEVERE, the panel replaces metric results with an explanation of why the results cannot be trusted and a diagnostic checklist.

### SRM Root Cause Diagnostics

When SRM is detected, the platform automatically runs a diagnostic suite to identify the likely root cause:

| Diagnostic Check | Method | Likely Root Cause if Positive |
|---|---|---|
| **Bot traffic check** | Compare assignment rate to expected DAU; flag if > 2× expected | Bot traffic assigned to one variant preferentially |
| **Variant-specific crash check** | Compare event count to assignment count per variant | One variant's code crashes, suppressing events |
| **SDK version distribution** | Compare SDK version across variants | A/B test inadvertently correlated with SDK rollout |
| **Event type distribution** | Chi-squared test on event type counts per variant | Logging bug specific to one variant's code path |
| **Time-of-day distribution** | Compare assignment time distribution across variants | Assignment algorithm has time-based bias |
| **Targeting rule change correlation** | Check if SRM onset correlates with a config change | New targeting rule applies differently by variant |
| **Geographic distribution** | Compare country distribution across variants | Geographic routing bug |

The diagnostic results are displayed in the SRM panel alongside the detected mismatch, giving experiment owners actionable information rather than just an error code.

---

## Data Quality Monitoring

### Metric Sanity Checks

Before statistical analysis runs, the platform executes sanity checks on aggregated metric data. These run as the first step of the batch analysis pipeline:

| Check | Method | Fail Condition | Action |
|---|---|---|---|
| **Metric mean sanity** | Compare to 7-day pre-experiment baseline | > 3σ deviation from baseline | Flag metric as potentially broken |
| **Metric variance sanity** | Compare variance to historical baseline | > 10× historical variance | Suspect outlier events; check winsorization |
| **Zero variance check** | Detect metrics with variance = 0 | All users have identical value | Metric implementation or logging likely broken |
| **Missing data check** | Fraction of assigned users with ≥ 1 metric event | < 70% of users have any metric data | Tracking gap; SRM-adjacent concern |
| **Novelty effect check** | Compare day-1 vs. day-7 metric value in treatment | Day-7 < 50% of Day-1 | Flag experiment for novelty effect inflation |
| **Dilution check** | Fraction of assigned users who actually triggered the feature | < 10% trigger rate | Experiment has low power; low dilution warning |
| **Cross-variant contamination** | Measure metric similarity between control and treatment | Treatment metric < 10% different from control | Assignment contamination possible |

### Event Schema Validation and Monitoring

```
Schema validation pipeline:
1. Schema Registry: stores versioned event schemas (JSON Schema format)
2. Event Gateway: validates every event against registered schema on ingestion
3. Validation results: written to a "validation_events" topic separate from the main event topic
4. Monitoring: real-time count of pass/fail by event type and property name
5. Alert: if validation failure rate > 1% for any event type for > 5 min

Schema drift detection:
- Daily job computes actual property distribution vs. registered schema
- Flags properties that appear in > 10% of events but are not in the schema
- These are candidate additions for schema update (possibly missing intentionally)
- Properties that are in schema but appear in < 1% of events are flagged as possibly broken
```

### Assignment-Event Join Quality

For each experiment, the platform validates that assigned users appear in the metric event stream. This is a proxy for "are we measuring what we think we're measuring?":

```
Join quality monitoring (runs hourly per experiment):

coverage = count(distinct entity_id with metric event) / count(distinct assigned entity_id)

Expected coverage range by metric type:
- Conversion metric: 5-80% (not all users convert; wide range is normal)
- Engagement metric (page views, clicks): > 70%
- Revenue metric: 1-30% (high variance expected)

Alert conditions:
- Coverage for primary metric < 20% (for an engagement metric): tracking gap likely
- Coverage drops > 50% day-over-day: SDK update or deployment likely broke tracking
- Coverage different between control and treatment by > 5%: SRM-adjacent bug

Segment breakdown: is coverage gap uniform or concentrated in one variant?
If concentrated in treatment: variant-specific tracking bug (possible SRM root cause)
If uniform: event type broken for all users (metric definition issue)
```

### Novelty Effect Monitoring

New features often show inflated early engagement because they are novel, not because they are genuinely better. The platform surfaces novelty effects proactively:

```
Novelty effect analysis:
- Compute primary metric daily for each variant: {day1, day2, ..., day14}
- Fit an exponential decay model to treatment metric time series
- Compute the stabilized metric value (asymptote of decay curve)
- Compare stabilized value vs. day-1 value
- If stabilized/day-1 < 0.7: high novelty effect, display warning
- Display both "day-1 effect" and "stable effect" on dashboard with explanation
```

---

## Statistical Engine Dashboards

### Experiment Results Dashboard Layout

The results dashboard is the primary interface for experiment owners. It is designed to present statistical information clearly to both technical and non-technical audiences:

```
Dashboard layout (left-to-right, top-to-bottom):

Banner row: SRM status | Data quality | Experiment status | Days running
═══════════════════════════════════════════════════════════════════════

Primary metric card:
  Effect size:    +3.2%  (95% CI: +1.8% to +4.7%)
  P-value:        0.0003  (sequential p-value: 0.0015)
  Significance:   ✓ Statistically significant
  Power achieved: 94% (at pre-registered MDE of 2%)
  Sample N:       Control: 52,341  Treatment: 51,987
  CUPED applied:  Yes — 38% variance reduction

Secondary metrics table:
  Metric             | Effect    | CI              | p-value | FDR-adjusted
  Revenue per user   | +$0.42    | (+$0.18, +$0.67)| 0.0012  | 0.006  ✓
  Page load time     | +12ms     | (+5ms, +19ms)   | 0.0008  | 0.004  ✗ GUARDRAIL WARN
  Session length     | -0.3%     | (-2.1%, +1.5%)  | 0.76    | 1.0    –

Time-series chart:
  [Line chart: control vs treatment, daily metric values, confidence bands]
  [Annotations: experiment start, any config changes]

Guardrail status:
  Page load time:    ⚠ WARNING  (+12ms, threshold: +10ms)
  Crash rate:        ✓ OK
  Revenue:           ✓ OK (treatment higher, not lower)
```

### Sequential P-Value Trend Chart

The sequential p-value trend chart is a key differentiator from classical fixed-horizon dashboards. It shows the always-valid sequential p-value computed at every day of the experiment:

```
Sequential p-value chart:
- X-axis: experiment day (0 to current day)
- Y-axis: sequential p-value (log scale, 0.001 to 1.0)
- Line: sequential p-value over time
- Horizontal reference line: significance threshold (0.05)
- Shaded region: "significance zone" below threshold
- Annotation: "Any crossing into the significance zone is a valid stopping criterion"

This chart makes it visually clear that the p-value dropped below 0.05 on day 5 and has remained there — the experiment could have been stopped at day 5 without inflating false positive rates.
```

### Analysis Pipeline Operational Dashboard

For platform engineers monitoring the system's internals. Uses a tabbed layout with 6 panels:

**Panel 1 — Assignment Throughput**
- Time series: assignments/second across all experiments, broken down by source (local SDK vs. server)
- Current: 487K/sec; Peak today: 521K/sec; 7-day peak: 498K/sec

**Panel 2 — Event Ingest**
- Time series: events/sec by event type (page_view, click, purchase, custom)
- Error rate: gateway validation failures by error type
- Queue depth: per-partition view with p50/p99

**Panel 3 — Processing Lag**
- Consumer lag per partition (heat map: green = < 30s, yellow = < 2min, red = > 2min)
- Watermark age per partition
- Late arrival rate over time

**Panel 4 — Analysis Jobs**
- Job queue depth over time
- Job completion rate (jobs/minute)
- Failed jobs by failure type (broken down by error category)
- In-progress jobs with duration (identify long-running outliers)

**Panel 5 — Results Freshness**
- Heat map: 10,000 experiments × freshness age
- Color: green < 15min, yellow < 60min, red > 60min
- Click any experiment to drill into its analysis job history

**Panel 6 — Alerts History**
- Timeline of SRM alerts, guardrail fires, auto-stops in last 7 days
- Grouped by experiment and root cause category
- MTTD (mean time to detect) trend over last 30 days

---

## Alerting Strategy

### Alert Severity Tiers

| Tier | Severity | Response SLO | Examples |
|---|---|---|---|
| P0 | Critical | Immediate on-call page (< 5 min) | Assignment service down globally, event pipeline complete outage (> 50% loss), guardrail breach on core revenue metric |
| P1 | High | On-call page (< 30 min) | SRM detected on > 10 experiments simultaneously, event pipeline lag > 15 min, analysis batch overdue by > 60 min |
| P2 | Medium | Next business hour | Single experiment SRM (moderate), CUPED failure for specific experiment, ruleset propagation delay > 90s |
| P3 | Low | Next sprint planning | Schema validation failure rate elevated but < 5%, analysis job duration trending up, coverage check warnings |

### Alert Fatigue Prevention

With 10,000+ concurrent experiments, naively alerting on every anomaly generates an unmanageable alert volume. The platform applies layered suppression:

**Correlation grouping:** Multiple SRM alerts from experiments in the same layer are grouped into a single incident with probable shared root cause. A single page is issued for the incident, not one per experiment.

**Progressive escalation:** A new SRM warning does not page immediately. It must remain unacknowledged for 30 minutes before escalating to P2. This gives the experiment owner time to investigate and acknowledge before on-call is paged.

**Baseline adaptation:** Alert thresholds adapt to historical baselines per metric type and experiment size. A 15% event rate drop on a Tuesday morning is expected (lower traffic) and does not alert; the same drop on a Friday afternoon is anomalous.

**Business hours filtering for P2/P3:** Non-critical alerts are batched and delivered in a daily digest at 9 AM local time for each experiment owner, rather than interrupting their work throughout the day.

### Experiment Owner Notification Workflow

```
Notification types and channels:

Immediate (real-time push + email):
- Guardrail breach detected → kill-switch fired
- SRM detected (severe)
- Experiment auto-stopped

Same-day (email + in-app):
- Primary metric reached statistical significance
- SRM detected (moderate)
- Experiment reached pre-registered sample size
- Analysis data stale by > 2× expected refresh interval

Weekly digest (email only):
- Experiment approaching scheduled stop date (7-day warning)
- Power analysis update (current detectable effect given observed N)
- Segment analysis completed with notable heterogeneous effects
- CUPED variance reduction summary (was pre-experiment data available and useful?)
```

### On-Call Runbooks

Each alert type has a linked runbook in the alert notification:

```
Example runbook structure for "SRM detected — moderate":

1. CHECK: Is the SRM confined to one variant, or are all non-control variants affected?
   → If one variant: likely variant-specific code bug (crash, event suppression)
   → If all variants equally: likely assignment randomization bug or bot traffic

2. CHECK: When did the SRM first appear? (use SRM p-value trend chart)
   → Correlate with recent deployments or config changes in the deployment log

3. CHECK: Is the SRM present in the assignment log or only in the event log?
   → Assignment SRM: randomization bug
   → Event-only SRM: tracking bug (events correct, assignment correct, but events
     fired at different rates by variant)

4. ACTION: Do not stop the experiment yet — first identify root cause
5. ACTION: Mark experiment results as "Data Quality Warning" in dashboard
6. ACTION: Open P2 incident ticket with diagnostic findings
7. ESCALATE: If root cause not identified within 2 hours → page on-call lead
```
