# 07 — Observability: Bot Detection System

## Core Detection Metrics

### Request Evaluation Metrics

The most fundamental metrics measure the outcome of every request evaluation:

```
Metrics (emitted per request, aggregated per 1-minute window):
  bot_detection.request.evaluated          counter  [endpoint, edge_region]
  bot_detection.request.score              histogram [0.0-1.0, endpoint]
  bot_detection.request.action             counter  [action=allow|challenge|block, endpoint]
  bot_detection.request.evaluation_tier    counter  [tier=edge|cloud, endpoint]
  bot_detection.request.latency_ms         histogram [tier, endpoint]
  bot_detection.request.features_used      histogram  // how many features were available
  bot_detection.cache.session_hit_rate     gauge    [edge_region]
  bot_detection.cache.fingerprint_hit_rate gauge    [edge_region]
```

**Key derived metrics:**
- **Challenge rate:** `action=challenge / action=allow+challenge+block` — target < 2% for human traffic, > 80% for known bot traffic
- **Block rate:** `action=block / total` — should track with known attack campaign activity
- **Score distribution:** P25/P50/P75/P95 of risk scores — useful for detecting model drift (score distribution shifting without corresponding change in challenge rate indicates a change in traffic composition or model drift)

### False Positive / False Negative Tracking

The hardest metrics to compute accurately because they require ground truth labels:

```
// False Positive Rate (FPR): humans incorrectly challenged or blocked
bot_detection.false_positive.confirmed     counter  // from user appeals verified as FP
bot_detection.false_positive.rate          gauge    // rolling 24h FPR estimate
bot_detection.false_positive.by_endpoint   gauge    [endpoint]
bot_detection.false_positive.by_signal     gauge    [signal_type]  // which signal drove FP?

// False Negative Rate (FNR): bots that passed undetected
bot_detection.false_negative.confirmed     counter  // from downstream fraud detection
bot_detection.false_negative.rate          gauge    // estimate from honeypot traffic
bot_detection.false_negative.by_bot_type   gauge    [bot_type]
```

**FPR estimation methodology:** Since we cannot directly observe false positives without user reports, FPR is estimated using two signals:
1. **Appeal rate:** Users who appeal a challenge decision. Confirmed legitimate = false positive. (Underestimates true FPR because most challenged legitimate users abandon rather than appeal)
2. **Session recovery rate:** Among challenged users, what fraction eventually solve the challenge and complete their intended action (vs. abandoning)? High solve rate suggests human; abandonment rate by challenge tier informs FPR estimate.

**FNR estimation methodology:** Honeypot telemetry provides a bounded estimate. Honeypots are hidden links/fields that only bots trigger. The fraction of requests that later trigger a honeypot but were not initially flagged is a lower bound on the false negative rate.

### Detection Rate by Bot Type

Understanding which bot categories are successfully detected versus evading is critical for prioritizing detection improvements:

```
// Bot taxonomy classification metrics
bot_detection.bot_type.detected           counter  [type=simple_script|headless|browser_farm|residential_proxy]
bot_detection.bot_type.escaped            counter  [type=...]  // confirmed FN by type

// Bot source analysis
bot_detection.bot_origin.datacenter_pct  gauge    // % of detected bots from datacenter IPs
bot_detection.bot_origin.residential_pct gauge    // % from residential proxies (harder to detect)
bot_detection.bot_origin.tor_pct         gauge
bot_detection.bot_origin.vpn_pct         gauge
```

---

## Model Performance Metrics

### Real-Time Model Health

```
// Inference performance
bot_detection.model.inference_latency_ms    histogram [tier=edge|cloud, region]
bot_detection.model.batch_size              histogram [tier=cloud]
bot_detection.model.queue_depth             gauge    [tier=cloud, region]
bot_detection.model.throughput_rps          gauge    [tier, region]

// Model freshness
bot_detection.model.version                 gauge    // current model version deployed
bot_detection.model.age_hours               gauge    // hours since model was trained
bot_detection.model.edge_propagation_pct    gauge    // % of edge nodes on latest model

// Inference errors
bot_detection.model.inference_error_rate    gauge    [tier]
bot_detection.model.fallback_rate           gauge    // requests falling back to rule-based scoring
```

### Model Drift Detection

Model drift occurs when the production data distribution shifts away from the training distribution. Behavioral and network signals are particularly susceptible to drift over time as bots evolve and as legitimate traffic patterns change seasonally.

```
// Feature distribution drift (computed every 10 minutes by streaming aggregation job)
bot_detection.drift.feature_z_score        gauge    [feature_name]
  // z-score of current feature distribution mean vs. training distribution mean
  // Alert threshold: |z-score| > 3.0 for any feature
  // Critical threshold: |z-score| > 5.0 → automatic feature weight reduction

bot_detection.drift.score_distribution_shift gauge  // KL divergence of current vs baseline
  // Alert threshold: KL divergence > 0.1
  // Indicates either traffic composition change or model staleness

bot_detection.drift.challenge_rate_delta    gauge    // % change in challenge rate vs 24h prior
  // Spike → bot attack or FP rate increase
  // Drop → bots getting better at evasion (FNR increase)

// Calibration drift
bot_detection.calibration.brier_score       gauge    // rolling Brier score on labeled samples
bot_detection.calibration.reliability_diagram histogram // P(label=1 | score=x) for x in [0,1]
```

**Drift alert response protocol:**
```
IF feature_z_score[feature] > 3.0 for any feature:
  1. Log: which feature, what direction, when started
  2. Check if drift correlates with a known event (seasonal traffic, new bot campaign)
  3. If malicious drift: reduce feature weight immediately without full retraining
     using emergency weight patch (deployed in < 30 minutes)
  4. Schedule emergency model retraining with updated training window

IF score_distribution_shift > 0.3:
  1. Immediate alert to ML platform team
  2. Initiate shadow scoring of newly trained model
  3. If shadow model improves calibration: fast-track deployment
```

---

## Challenge System Metrics

```
// Challenge issuance
bot_detection.challenge.issued              counter  [type=js_probe|pow|captcha|block]
bot_detection.challenge.issued_rate         gauge    [type, endpoint]

// Challenge outcomes
bot_detection.challenge.solved              counter  [type]
bot_detection.challenge.failed              counter  [type]
bot_detection.challenge.abandoned           counter  [type]  // issued but never responded to
bot_detection.challenge.timeout             counter  [type]  // TTL expired before solve

// Solve timing distribution (behavioral signal)
bot_detection.challenge.solve_time_ms       histogram [type]  // time to solve, by challenge type
  // Human reference: PoW=50-500ms, CAPTCHA=5,000-30,000ms
  // Bot-like: PoW<10ms or >5,000ms, CAPTCHA<1,000ms

// CAPTCHA difficulty calibration
bot_detection.captcha.difficulty_level      gauge    // current difficulty tier (1-5)
bot_detection.captcha.human_solve_rate      gauge    // target: > 99%
bot_detection.captcha.bot_solve_rate        gauge    // target: < 5%
```

---

## Threat Intelligence Metrics

```
// Feed health
bot_detection.threat_intel.feed_age_minutes gauge    [feed_name]
  // Alert if any feed > 60 minutes stale
bot_detection.threat_intel.feed_size        gauge    [feed_name]  // entry count
bot_detection.threat_intel.feed_update_lag  histogram [feed_name]  // minutes to process update

// IP reputation coverage
bot_detection.threat_intel.ip_hit_rate      gauge    // % of IPs found in threat intel
bot_detection.threat_intel.datacenter_ips   gauge    // count of datacenter IPs currently tracked
bot_detection.threat_intel.tor_exits        gauge    // count of active Tor exit nodes
bot_detection.threat_intel.residential_proxies gauge // count of residential proxy IPs

// Honeypot signal
bot_detection.honeypot.triggered            counter  [honeypot_type]
bot_detection.honeypot.triggering_ips       gauge    // distinct IPs that hit honeypots today
```

---

## Operational Dashboards

### Dashboard 1: Real-Time Traffic Overview

```
┌─────────────────────────────────────────────────────────────┐
│              Bot Detection - Real-Time Traffic               │
├────────────────┬────────────────┬───────────────────────────┤
│ Requests/sec   │ Bot Rate       │ Challenge Rate             │
│ 4.8M           │ 47.3%          │ 2.1%                       │
├────────────────┼────────────────┼───────────────────────────┤
│ Block Rate     │ FP Rate (est)  │ Model Age                  │
│ 31.2%          │ 0.08%          │ 3h 42m                     │
├─────────────────────────────────────────────────────────────┤
│ Score Distribution (last 5 min)                             │
│ [0.0-0.2]: 52% ████████████████████                        │
│ [0.2-0.4]: 11% ████                                        │
│ [0.4-0.6]:  8% ███                                         │
│ [0.6-0.8]:  9% ████                                        │
│ [0.8-1.0]: 20% ████████                                    │
├─────────────────────────────────────────────────────────────┤
│ Top Attack Sources (by blocked session count)               │
│ 1. ASN 12345 - Datacenter US-EAST: 42,000 blocks/min       │
│ 2. ASN 67890 - Residential Pool UK: 18,000 blocks/min      │
│ 3. Tor Exit Nodes: 12,000 blocks/min                        │
└─────────────────────────────────────────────────────────────┘
```

### Dashboard 2: Model Health

```
┌─────────────────────────────────────────────────────────────┐
│                    ML Model Health                           │
├────────────────────┬────────────────────────────────────────┤
│ Edge Model         │ Cloud Deep Model                       │
│ Version: v2.847    │ Version: v2.847                        │
│ Age: 3h 42m        │ Latency P99: 28ms                      │
│ Propagation: 100%  │ Queue depth: 12,000 req                │
│ Latency P99: 2.1ms │ GPU util: 78%                          │
├────────────────────┴────────────────────────────────────────┤
│ Feature Drift Monitor (top drifted features)                │
│ Feature                    │ Z-Score │ Direction │ Action   │
│ ip_datacenter_flag         │  1.2    │ ↑ higher  │ Monitor  │
│ mouse_velocity_mean        │  0.8    │ ↓ lower   │ Normal   │
│ webgl_renderer_mismatch    │  2.9    │ ↑ higher  │ Alert    │
│ canvas_hash_frequency      │  0.3    │ stable    │ Normal   │
├─────────────────────────────────────────────────────────────┤
│ Calibration Reliability (P(bot) | predicted score)          │
│ Score 0.1 → Actual bot rate: 6% (target: 10%)  ⚠ Slight off│
│ Score 0.5 → Actual bot rate: 51% (target: 50%) ✓ Good      │
│ Score 0.9 → Actual bot rate: 95% (target: 90%) ✓ Good      │
└─────────────────────────────────────────────────────────────┘
```

### Dashboard 3: False Positive Monitor

```
┌─────────────────────────────────────────────────────────────┐
│              False Positive & User Impact Monitor            │
├────────────────────┬────────────────────────────────────────┤
│ FP Rate (24h est)  │ Appeal Volume                          │
│ 0.08%              │ 847 appeals today                      │
│ ████ Target: <0.1% │ 712 confirmed FP (84%)                 │
├────────────────────┴────────────────────────────────────────┤
│ False Positive Root Cause (today)                           │
│ ├─ No behavioral data (accessibility): 45%                  │
│ ├─ Datacenter IP (corporate network): 28%                   │
│ ├─ Shared canvas fingerprint (common GPU): 15%              │
│ ├─ Unusual typing speed (power user): 8%                    │
│ └─ Unknown / new pattern: 4%                                │
├─────────────────────────────────────────────────────────────┤
│ Top Endpoints by FP Rate                                     │
│ /api/checkout → 0.15% ⚠ (threshold: lower to 0.35)        │
│ /search       → 0.04% ✓                                    │
│ /login        → 0.09% ✓                                    │
├─────────────────────────────────────────────────────────────┤
│ Challenge Funnel (last 1 hour)                              │
│ Challenged: 95,000 sessions                                 │
│ ├─ JS Probe: 40,000 → 35,000 passed (87.5%)               │
│ ├─ PoW: 30,000 → 24,000 passed (80%)                      │
│ ├─ CAPTCHA: 20,000 → 15,000 passed (75%)                  │
│ └─ Blocked: 5,000 (no challenge path)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Alerting Rules

### Critical Alerts (PagerDuty, immediate response)

| Alert | Trigger | Response |
|---|---|---|
| Edge ML down | Error rate > 5% on any edge region | Auto-rollback to rule-based scoring; on-call alert |
| FP rate spike | FP rate > 0.5% sustained 10 minutes | Auto-raise challenge threshold; page ML team |
| Session store partition | > 20% of sessions unreachable | Switch to stateless mode; page infra team |
| Challenge verifier down | Availability < 99% | Fail open on challenge verification; page |
| Model age > 12h | Model not updated in 12+ hours | Page ML team to investigate training pipeline |
| Score distribution collapse | > 90% of scores in [0, 0.1] or [0.9, 1.0] | Model drift; page ML team; shadow new model |

### Warning Alerts (Slack, business hours response)

| Alert | Trigger | Response |
|---|---|---|
| Feature drift detected | Any feature Z-score > 3.0 | Investigate feature, consider weight reduction |
| Challenge rate elevated | Challenge rate > 5% for 30 min | Check for bot attack vs. FP issue |
| Bot bypass rate elevated | Honeypot trigger rate drops > 30% | New evasion technique; analyze traffic pattern |
| Threat intel feed stale | Any feed > 60 minutes since update | Check feed provider; use cached data |
| Model calibration drift | Brier score increases > 0.02 | Schedule emergency retraining |

---

## Distributed Tracing

Every request carries a distributed trace that enables end-to-end latency analysis:

```
Request Trace Structure:
  trace_id: UUID (propagated across all services)
  spans:
    ├─ edge.session_cache_lookup          (latency target: < 1ms)
    ├─ edge.ip_reputation_lookup          (latency target: < 0.5ms)
    ├─ edge.fingerprint_cache_lookup      (latency target: < 1ms)
    ├─ edge.ml_inference                  (latency target: < 2ms)
    ├─ [conditional] cloud.feature_assembly (latency target: < 5ms)
    ├─ [conditional] cloud.deep_ml_inference (latency target: < 30ms)
    ├─ [conditional] challenge.issue        (latency target: < 5ms)
    └─ decision.return                    (total target: < 5ms edge, < 50ms cloud)

Trace sampling:
  - 100% of blocked requests (always trace)
  - 100% of challenged requests (always trace)
  - 10% of allowed high-confidence requests (sample for baseline)
  - 1% of allowed low-confidence (near-borderline) requests
```

Traces are stored for 7 days and indexed for queries like: "Show all requests from fingerprint X in the past 24 hours" or "Show the 100 slowest cloud ML evaluations today."
