# Observability

[← Back to Index](./00-index.md)

---

## Key Metrics

### Online Store Metrics

```yaml
# Latency Metrics
feature_store_online_latency_seconds:
  type: histogram
  labels: [feature_view, entity_type, method]
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1]
  description: "Online feature retrieval latency in seconds"

feature_store_online_latency_p50:
  type: gauge
  target: <5ms
  alert_threshold: >10ms

feature_store_online_latency_p99:
  type: gauge
  target: <10ms
  alert_threshold: >50ms

# Throughput Metrics
feature_store_online_requests_total:
  type: counter
  labels: [feature_view, entity_type, status]
  description: "Total online feature requests"

feature_store_online_qps:
  type: gauge
  description: "Current queries per second"
  alert_threshold: >90% of capacity

# Error Metrics
feature_store_online_errors_total:
  type: counter
  labels: [feature_view, error_type]
  description: "Total online store errors"
  error_types: [timeout, not_found, connection_error, serialization_error]

feature_store_online_error_rate:
  type: gauge
  target: <0.01%
  alert_threshold: >0.1%
```

### Offline Store Metrics

```yaml
# Query Performance
feature_store_offline_query_duration_seconds:
  type: histogram
  labels: [feature_view, query_type]
  buckets: [1, 10, 60, 300, 600, 1800]
  description: "Offline query duration in seconds"

feature_store_offline_rows_scanned:
  type: histogram
  labels: [feature_view]
  description: "Number of rows scanned per query"

feature_store_offline_rows_returned:
  type: histogram
  labels: [feature_view]
  description: "Number of rows returned per query"

# PIT Join Metrics
feature_store_pit_join_duration_seconds:
  type: histogram
  labels: [feature_view_count, entity_count_bucket]
  description: "Point-in-time join duration"

feature_store_pit_join_match_rate:
  type: gauge
  labels: [feature_view]
  description: "Percentage of entities with matched features"

# Storage Metrics
feature_store_offline_storage_bytes:
  type: gauge
  labels: [feature_view]
  description: "Offline storage size in bytes"

feature_store_offline_partitions:
  type: gauge
  labels: [feature_view]
  description: "Number of partitions"
```

### Materialization Metrics

```yaml
# Job Metrics
feature_store_materialization_duration_seconds:
  type: histogram
  labels: [feature_view, job_type]
  buckets: [60, 300, 600, 1800, 3600, 7200]
  description: "Materialization job duration"

feature_store_materialization_rows_processed:
  type: counter
  labels: [feature_view, job_type]
  description: "Total rows processed by materialization"

feature_store_materialization_rows_written:
  type: counter
  labels: [feature_view, target_store]
  description: "Rows written to online/offline store"

# Job Status
feature_store_materialization_jobs_total:
  type: counter
  labels: [feature_view, status]
  status: [success, failure, timeout, skipped]

feature_store_materialization_last_success_timestamp:
  type: gauge
  labels: [feature_view]
  description: "Timestamp of last successful materialization"

# Freshness Metrics
feature_store_feature_lag_seconds:
  type: gauge
  labels: [feature_view]
  description: "Time since last materialization completed"
  alert_threshold: >expected_freshness * 2

feature_store_materialization_lag_seconds:
  type: gauge
  labels: [feature_view]
  description: "Delay between scheduled and actual run"
```

### Feature Quality Metrics

```yaml
# Data Quality
feature_store_null_rate:
  type: gauge
  labels: [feature_view, feature_name]
  description: "Percentage of null values"
  alert_threshold: >5% (configurable per feature)

feature_store_missing_entity_rate:
  type: gauge
  labels: [feature_view]
  description: "Percentage of requested entities not found"

# Distribution Metrics
feature_store_feature_mean:
  type: gauge
  labels: [feature_view, feature_name]
  description: "Rolling mean of numeric features"

feature_store_feature_stddev:
  type: gauge
  labels: [feature_view, feature_name]
  description: "Rolling standard deviation"

feature_store_feature_min:
  type: gauge
  labels: [feature_view, feature_name]

feature_store_feature_max:
  type: gauge
  labels: [feature_view, feature_name]

# Drift Detection
feature_store_drift_score:
  type: gauge
  labels: [feature_view, feature_name]
  description: "Statistical drift from baseline (KL divergence, PSI)"
  alert_threshold: >0.1 (configurable)

feature_store_drift_alerts_total:
  type: counter
  labels: [feature_view, feature_name, severity]
```

### Cache Metrics

```yaml
feature_store_cache_hit_rate:
  type: gauge
  labels: [cache_layer, feature_view]
  cache_layers: [l1_local, l2_distributed]
  target: >70%

feature_store_cache_size_bytes:
  type: gauge
  labels: [cache_layer]

feature_store_cache_evictions_total:
  type: counter
  labels: [cache_layer, reason]
  reasons: [ttl_expired, capacity, manual]
```

---

## Feature Quality Monitoring

### Data Drift Detection

```
Drift Detection Methods:
─────────────────────────────────────────────────────────

1. POPULATION STABILITY INDEX (PSI)
   Use case: Detect distribution shift in categorical/binned features
   Formula: PSI = Σ (Actual% - Expected%) × ln(Actual% / Expected%)

   Thresholds:
   PSI < 0.1: No significant shift
   0.1 < PSI < 0.25: Moderate shift (investigate)
   PSI > 0.25: Significant shift (alert)

   Implementation:
   def calculate_psi(expected_dist, actual_dist, bins=10):
       expected_pcts = np.histogram(expected_dist, bins=bins)[0] / len(expected_dist)
       actual_pcts = np.histogram(actual_dist, bins=bins)[0] / len(actual_dist)

       # Avoid division by zero
       expected_pcts = np.clip(expected_pcts, 0.0001, None)
       actual_pcts = np.clip(actual_pcts, 0.0001, None)

       psi = np.sum((actual_pcts - expected_pcts) * np.log(actual_pcts / expected_pcts))
       return psi

2. KOLMOGOROV-SMIRNOV TEST
   Use case: Detect shift in continuous distributions
   Measures: Maximum difference between cumulative distributions

   Thresholds:
   p-value > 0.05: No significant shift
   p-value < 0.05: Investigate
   p-value < 0.01: Alert

3. JENSEN-SHANNON DIVERGENCE
   Use case: Symmetric measure of distribution difference
   Range: 0 (identical) to 1 (completely different)

   Thresholds:
   JSD < 0.1: Minimal drift
   0.1 < JSD < 0.3: Moderate drift
   JSD > 0.3: Significant drift

─────────────────────────────────────────────────────────

Monitoring Pipeline:

1. Capture baseline distribution during model training
2. Continuously sample production features
3. Calculate drift metrics (hourly/daily)
4. Compare against thresholds
5. Alert and visualize

Baseline Update Strategy:
- Automatic: Update baseline when model is retrained
- Scheduled: Update baseline monthly
- Manual: Update when business context changes
```

### Staleness Monitoring

```
Staleness Detection:
─────────────────────────────────────────────────────────

FEATURE-LEVEL STALENESS:
  Definition: Time since feature was last updated for an entity
  Metric: feature_timestamp - current_time

  Implementation:
  def check_staleness(entity_key, feature_view, max_staleness):
      record = online_store.get(entity_key, feature_view)
      if record is None:
          return "NOT_FOUND"

      age = current_time - record.event_timestamp
      if age > max_staleness:
          return "STALE"
      return "FRESH"

ENTITY-LEVEL STALENESS:
  Definition: Percentage of entities with stale features
  Metric: count(stale_entities) / count(total_entities)

  Sampling approach (for large entity counts):
  - Sample 10,000 random entities
  - Check staleness for each
  - Extrapolate to full population

MATERIALIZATION-LEVEL STALENESS:
  Definition: Time since last successful materialization
  Metric: current_time - last_materialization_timestamp

  Alert thresholds by tier:
  - Real-time: >5 minutes
  - Near-real-time: >30 minutes
  - Batch: >2x scheduled interval

─────────────────────────────────────────────────────────

Staleness Dashboard Metrics:

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Real-time feature lag | <1 min | 1-5 min | >5 min |
| Batch feature lag | <12h | 12-24h | >24h |
| Entity staleness rate | <1% | 1-5% | >5% |
| Materialization delay | <10% | 10-50% | >50% |
```

### Data Quality Checks

```
Quality Check Framework:
─────────────────────────────────────────────────────────

1. COMPLETENESS CHECKS
   - Null rate per feature
   - Missing entity rate
   - Schema compliance

   Implementation:
   quality_checks:
     - name: null_rate_check
       feature: user_age
       max_null_rate: 0.01
       action: alert

     - name: entity_coverage
       feature_view: user_profile
       min_coverage: 0.95
       action: alert

2. VALIDITY CHECKS
   - Value range validation
   - Type conformance
   - Referential integrity

   Implementation:
   quality_checks:
     - name: age_range
       feature: user_age
       min: 0
       max: 150
       action: reject_and_alert

     - name: country_code
       feature: user_country
       valid_values: ["US", "UK", "CA", ...]
       action: alert

3. CONSISTENCY CHECKS
   - Cross-feature consistency
   - Temporal consistency
   - Aggregation consistency

   Implementation:
   quality_checks:
     - name: date_consistency
       check: event_timestamp <= created_timestamp
       action: alert

     - name: aggregation_check
       check: sum_30d >= sum_7d
       action: alert

4. FRESHNESS CHECKS
   - Feature age within TTL
   - Materialization recency

─────────────────────────────────────────────────────────

Quality Score:
  Overall quality = weighted average of check pass rates
  Score range: 0-100
  Alert threshold: <95
```

---

## Dashboard Design

### Executive Dashboard

```
Executive Feature Store Dashboard
─────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────┐
│  FEATURE STORE HEALTH                    Last 24 hours  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Overall Health: 98.5% ████████████████████░░  HEALTHY │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Online Store │  │ Offline Store│  │Materialization│ │
│  │    99.9%     │  │    99.2%     │  │    98.1%     │  │
│  │   HEALTHY    │  │   HEALTHY    │  │   WARNING    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  KEY METRICS                                            │
│                                                         │
│  Feature Views: 523          Features: 8,421            │
│  Online QPS: 45.2K           Entities (Online): 82M     │
│  Offline Queries: 127/day    Storage: 2.3 PB            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ALERTS (Last 7 days)                                   │
│                                                         │
│  Critical: 0    Warning: 3    Info: 12                  │
│                                                         │
│  Recent: [WARNING] user_activity_features staleness     │
│          >30 min (2 hours ago)                          │
└─────────────────────────────────────────────────────────┘
```

### Operations Dashboard

```
Operations Dashboard
─────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────┐
│  ONLINE STORE PERFORMANCE                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Latency (p99): 8.2ms ███████░░░ [Target: <10ms]       │
│                                                         │
│  QPS by Feature View:                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │ user_profile       ████████████████████  12.3K   │  │
│  │ item_features      ██████████████        8.1K    │  │
│  │ user_activity      ████████████          7.2K    │  │
│  │ session_features   ████████              4.8K    │  │
│  │ other              ██████                3.5K    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Error Rate: 0.002% ░░░░░░░░░░ [Target: <0.01%]        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ONLINE STORE RESOURCES                                 │
│                                                         │
│  Memory: 67% ██████████████████░░░░░░░░░               │
│  CPU:    23% ███████░░░░░░░░░░░░░░░░░░░░               │
│  Connections: 1,247 / 2,000                             │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  MATERIALIZATION STATUS                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Running Jobs: 3    Queued: 5    Failed (24h): 1       │
│                                                         │
│  Job Timeline:                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 00:00 ─────────────────────────────────── 24:00  │  │
│  │ user_profile    [====] [====]     [====]         │  │
│  │ user_activity   [=][=][=][=][=][=][=][=][=][=]   │  │
│  │ item_features         [========]                 │  │
│  │ session (stream) ───────────────────────────     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Feature Freshness:                                     │
│  user_profile:    2h 15m ago  ██████████████████░░     │
│  user_activity:   12m ago     █████████████████████    │
│  item_features:   6h 30m ago  █████████████░░░░░░░     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Data Quality Dashboard

```
Data Quality Dashboard
─────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────┐
│  OVERALL DATA QUALITY SCORE: 96.8%                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Quality by Feature View:                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Feature View        Completeness  Validity  Drift│  │
│  ├─────────────────────────────────────────────────┤   │
│  │ user_profile        99.2%        98.5%     0.02 │   │
│  │ user_activity       98.8%        99.1%     0.05 │   │
│  │ item_features       99.9%        99.8%     0.01 │   │
│  │ session_features    97.3%        98.2%     0.08 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  DRIFT ALERTS                                           │
│                                                         │
│  [!] user_activity:page_views_7d - PSI: 0.18           │
│      Distribution shifted (more high-volume users)     │
│      Detected: 2 hours ago | Baseline: 2 weeks ago     │
│                                                         │
│  [i] item_features:price - Mean shifted +5%            │
│      Likely seasonal (holiday pricing)                 │
│      Detected: 1 day ago                               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  NULL RATE TRENDS (7 days)                              │
│                                                         │
│  user_age:     0.8% ░░░░░░░░░░ (stable)                │
│  user_country: 1.2% ░░░░░░░░░░ (stable)                │
│  last_login:   2.3% ░░░░░░░░░▲ (increasing)            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Alerting

### Alert Definitions

```yaml
alerts:
  # Latency Alerts
  - name: OnlineLatencyHigh
    condition: feature_store_online_latency_p99 > 50ms
    duration: 5m
    severity: warning
    action: page_oncall

  - name: OnlineLatencyCritical
    condition: feature_store_online_latency_p99 > 100ms
    duration: 2m
    severity: critical
    action: page_oncall

  # Error Rate Alerts
  - name: OnlineErrorRateHigh
    condition: feature_store_online_error_rate > 0.1%
    duration: 5m
    severity: warning

  - name: OnlineErrorRateCritical
    condition: feature_store_online_error_rate > 1%
    duration: 2m
    severity: critical
    action: page_oncall

  # Freshness Alerts
  - name: MaterializationStale
    condition: feature_store_feature_lag_seconds > expected_freshness * 2
    severity: warning
    annotations:
      summary: "Feature {{ $labels.feature_view }} is stale"

  - name: MaterializationFailed
    condition: feature_store_materialization_jobs_total{status="failure"} > 0
    duration: 0m  # Immediate
    severity: critical
    action: page_oncall

  # Data Quality Alerts
  - name: FeatureDriftDetected
    condition: feature_store_drift_score > 0.2
    severity: warning
    annotations:
      summary: "Drift detected in {{ $labels.feature_name }}"

  - name: HighNullRate
    condition: feature_store_null_rate > 0.05  # 5%
    severity: warning

  # Capacity Alerts
  - name: OnlineStoreCapacity
    condition: feature_store_online_storage_used_percent > 80%
    severity: warning

  - name: CacheHitRateLow
    condition: feature_store_cache_hit_rate < 50%
    severity: warning
```

### Alert Routing

```yaml
alert_routing:
  # Route by severity
  critical:
    - pagerduty: ml-platform-oncall
    - slack: #ml-platform-alerts

  warning:
    - slack: #ml-platform-alerts
    - email: ml-platform-team@company.com

  info:
    - slack: #ml-platform-info

  # Route by component
  routes:
    - match:
        component: online_store
      receiver: online-store-team

    - match:
        component: materialization
      receiver: data-platform-team

    - match:
        component: data_quality
      receiver: ml-team

# Escalation
escalation:
  - after: 15m
    action: notify_manager
  - after: 30m
    action: notify_director
  - after: 1h
    action: incident_commander
```

---

## Distributed Tracing

### Trace Context

```
Trace Propagation:
─────────────────────────────────────────────────────────

Request Flow with Trace Context:

Client → Feature Store API → [Trace ID: abc123]
  │
  ├── Online Store Query [Span: query_online]
  │     └── Redis GET [Span: redis_get]
  │
  ├── Cache Lookup [Span: cache_lookup]
  │
  └── Response Serialization [Span: serialize]

─────────────────────────────────────────────────────────

Trace Schema:
{
  "trace_id": "abc123",
  "spans": [
    {
      "span_id": "span_001",
      "name": "get_online_features",
      "service": "feature-store-api",
      "duration_ms": 8.2,
      "tags": {
        "feature_view": "user_profile",
        "entity_count": 10,
        "cache_hit": true
      }
    },
    {
      "span_id": "span_002",
      "parent_span_id": "span_001",
      "name": "cache_lookup",
      "service": "feature-store-cache",
      "duration_ms": 0.5,
      "tags": {
        "cache_layer": "l1",
        "hit": true
      }
    }
  ]
}

─────────────────────────────────────────────────────────

Key Spans to Instrument:

Online Path:
1. API request received
2. Authentication/authorization
3. Cache lookup (L1, L2)
4. Online store query
5. Deserialization
6. Response sent

Offline Path:
1. Query request received
2. Query planning
3. Partition pruning
4. Data scan
5. PIT join execution
6. Result serialization

Materialization Path:
1. Job started
2. Source data read
3. Transformation
4. Deduplication
5. Online store write
6. Checkpoint update
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01 | Initial observability documentation |
