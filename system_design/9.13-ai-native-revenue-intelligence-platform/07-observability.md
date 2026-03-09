# AI-Native Revenue Intelligence Platform --- Observability

## 1. Metrics

### 1.1 Audio Ingestion Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `audio.streams.active` | Gauge | Current concurrent audio streams being recorded | >1.1M (110% of design capacity) |
| `audio.capture.success_rate` | Ratio | Percentage of calls successfully captured | <99.99% |
| `audio.capture.latency_ms` | Histogram | Time from call start to first audio chunk stored | P95 >500ms |
| `audio.quality.mos_score` | Histogram | Mean Opinion Score of captured audio quality | Average <3.5 |
| `audio.storage.write_throughput_mbps` | Gauge | Audio write throughput to object storage | Sustained >80% of provisioned bandwidth |
| `audio.consent.rejection_rate` | Ratio | Percentage of calls not recorded due to consent refusal | >20% (may indicate UX issue) |

### 1.2 ASR / Transcription Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `asr.realtime.latency_ms` | Histogram | End-to-end latency for real-time transcription | P95 >2,000ms |
| `asr.batch.queue_depth_hours` | Gauge | Hours of audio queued for batch transcription | >30 min |
| `asr.batch.completion_time_min` | Histogram | Time from call end to transcript availability | P95 >5 min |
| `asr.word_error_rate` | Gauge | Estimated WER from sampled ground-truth comparisons | >15% (English) |
| `asr.diarization.accuracy` | Gauge | Speaker attribution accuracy from sampled evaluations | <92% |
| `asr.gpu.utilization` | Gauge | GPU utilization across ASR cluster | <50% (over-provisioned) or >90% (under-provisioned) |
| `asr.batch.failure_rate` | Ratio | Percentage of transcription jobs that fail | >0.5% |

### 1.3 NLP Pipeline Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `nlp.pipeline.completion_time_min` | Histogram | Time from transcript ready to all annotations complete | P95 >10 min |
| `nlp.model.{name}.latency_ms` | Histogram | Per-model inference latency | P95 >200ms for any model |
| `nlp.model.{name}.error_rate` | Ratio | Per-model inference error rate | >1% for any model |
| `nlp.model.{name}.confidence_avg` | Gauge | Average confidence score per model | Sudden drop >10% from baseline |
| `nlp.router.queue_depth` | Gauge | Pending transcript segments waiting for NLP | >100K segments |
| `nlp.gpu.utilization` | Gauge | GPU utilization across NLP cluster | >90% sustained |
| `nlp.inference.throughput_per_sec` | Gauge | Total NLP inferences per second | <80% of expected for time of day |

### 1.4 Deal Scoring Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `scoring.update_latency_sec` | Histogram | Time from new signal to updated deal score | P95 >300s (5 min) |
| `scoring.updates_per_minute` | Gauge | Deal score updates processed per minute | <50% of expected for time of day |
| `scoring.calibration.brier_score` | Gauge | Brier score for deal score calibration quality | >0.25 (poor calibration) |
| `scoring.calibration.segment_bias` | Gauge | Per-segment calibration bias | >0.10 for any segment |
| `scoring.lock_contention_rate` | Ratio | Percentage of scoring attempts that hit a lock | >5% |

### 1.5 Forecast Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `forecast.refresh_duration_min` | Histogram | Time to complete a full forecast refresh per tenant | >30 min |
| `forecast.accuracy.within_10pct` | Gauge | Percentage of closed periods where forecast was within 10% of actual | <85% (trailing 4 quarters) |
| `forecast.ai_vs_rep_delta_pct` | Histogram | Percentage difference between AI forecast and rep-submitted forecast | Systemic >20% divergence |
| `forecast.model.nan_rate` | Ratio | Percentage of deal predictions that produce NaN | >0.01% |

### 1.6 CRM Sync Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `crm.sync.outbound_latency_sec` | Histogram | Time from insight generation to CRM writeback | P95 >120s |
| `crm.sync.error_rate` | Ratio | Percentage of CRM API calls that fail | >2% |
| `crm.sync.rate_limit_hits` | Counter | Number of rate limit responses from CRM API per tenant | >10/hour for any tenant |
| `crm.sync.queue_depth` | Gauge | Pending CRM write operations | >10K for any tenant |
| `crm.sync.reconciliation_drift` | Gauge | Records out of sync detected by daily reconciliation | >100 for any tenant |

### 1.7 Infrastructure Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `storage.audio.volume_tb` | Gauge | Total audio storage volume across tiers | Growth >120% of projected monthly rate |
| `storage.transcript.volume_tb` | Gauge | Transcript storage volume | Growth anomaly detection |
| `graph.query_latency_ms` | Histogram | Revenue graph query latency | P95 >2,000ms |
| `graph.node_count` | Gauge | Total nodes in revenue graph per tenant | >1M for any tenant (capacity planning) |
| `search.query_latency_ms` | Histogram | Transcript search query latency | P95 >500ms |
| `search.index_lag_sec` | Gauge | Delay between transcript creation and search availability | >300s |
| `cache.hit_rate` | Ratio | Distributed cache hit rate for dashboard queries | <70% |

---

## 2. Logging

### 2.1 Structured Log Schema

All services emit structured logs with the following common fields:

| Field | Description | Example |
|-------|-------------|---------|
| `timestamp` | ISO 8601 with microsecond precision | `2026-03-09T14:23:45.123456Z` |
| `service` | Emitting service name | `nlp-pipeline`, `deal-scorer`, `crm-sync` |
| `level` | Log level | `INFO`, `WARN`, `ERROR` |
| `tenant_id` | Tenant context (if applicable) | `t-abc123` |
| `trace_id` | Distributed trace identifier | `tr-xyz789` |
| `span_id` | Current span identifier | `sp-def456` |
| `interaction_id` | Related interaction (if applicable) | `int-ghi012` |
| `opportunity_id` | Related opportunity (if applicable) | `opp-jkl345` |
| `message` | Human-readable log message | `"NLP analysis completed"` |
| `metadata` | Structured key-value pairs | `{ "model": "sentiment-v3", "segments": 142 }` |

### 2.2 Key Log Events

| Event | Level | Service | Key Fields |
|-------|-------|---------|------------|
| Call recording started | INFO | telephony-hub | interaction_id, consent_status, participant_count |
| Consent determination | INFO | consent-engine | interaction_id, jurisdiction, consent_type, decision |
| Transcription completed | INFO | asr-engine | interaction_id, duration_sec, segment_count, model_version |
| NLP model inference error | ERROR | nlp-pipeline | model_name, error_type, segment_id, retry_count |
| Deal score updated | INFO | deal-scorer | opportunity_id, old_score, new_score, trigger_type |
| Forecast refreshed | INFO | forecast-engine | tenant_id, period, total_predicted, delta_from_previous |
| CRM sync failed | WARN | crm-sync | tenant_id, crm_type, error_code, retry_scheduled |
| Rate limit hit | WARN | crm-sync | tenant_id, crm_type, limit_type, backoff_sec |
| Model calibration drift | WARN | calibration-engine | tenant_id, segment, brier_score, drift_amount |
| PII detected and redacted | INFO | pii-detector | interaction_id, pii_type, redaction_applied |
| Erasure request processed | INFO | compliance-engine | subject_id, data_types_erased, verification_status |

### 2.3 Log Retention and Storage

| Log Category | Retention | Storage |
|-------------|-----------|---------|
| Application logs | 30 days (hot), 90 days (warm) | Log aggregation service |
| Audit logs | 7 years | Immutable append-only storage |
| Security logs | 1 year (hot), 7 years (archive) | SIEM integration |
| Compliance logs (consent, erasure) | 7 years | Tamper-evident storage |
| Debug/trace logs | 7 days | Local + sampling to central |

---

## 3. Distributed Tracing

### 3.1 Trace Propagation

Every request carries a trace context through the entire processing pipeline:

```
API Request (trace starts)
  → API Gateway (span: gateway_routing)
    → Telephony Hub (span: audio_capture)
      → Object Storage (span: audio_write)
      → ASR Engine (span: transcription)
        → NLP Router (span: model_routing)
          → Sentiment Model (span: sentiment_inference)
          → Objection Model (span: objection_inference)
          → [... other models ...]
        → LLM Service (span: summarization)
      → Deal Scorer (span: score_update)
        → Time-Series Store (span: score_write)
      → CRM Sync (span: crm_writeback)
```

### 3.2 Key Trace Scenarios

| Scenario | Trace Captures | Primary Use |
|----------|---------------|-------------|
| Call-to-insight pipeline | Full path from audio capture to CRM writeback | End-to-end latency analysis; bottleneck identification |
| Dashboard load | API call → cache check → graph/TS queries → response | Dashboard performance optimization |
| Forecast refresh | Scheduler → data fetch → model inference → calibration → storage | Forecast generation time analysis |
| Transcript search | Search query → index lookup → result hydration → response | Search latency optimization |
| CRM sync cycle | Event consumption → transformation → CRM API call → confirmation | Sync reliability and latency analysis |

### 3.3 Sampling Strategy

| Traffic Type | Sampling Rate | Rationale |
|-------------|--------------|-----------|
| API requests (user-facing) | 10% | Balance between visibility and overhead |
| Error traces | 100% | All errors fully traced for debugging |
| High-latency traces (>P95) | 100% | Capture all slow requests for analysis |
| Audio processing pipeline | 1% | Very high volume; sampled for trend analysis |
| CRM sync operations | 5% | Moderate volume; important for integration debugging |
| Forecast generation | 100% | Low volume; each trace is valuable for accuracy analysis |

---

## 4. Alerting

### 4.1 Alert Severity Levels

| Severity | Criteria | Response Time | Notification |
|----------|---------|---------------|-------------|
| P0 - Critical | Call recording failure; data loss risk; security breach | Immediate (< 5 min) | Page on-call; auto-escalate after 15 min |
| P1 - High | Transcription SLA breach; deal scoring down; CRM sync failure | < 15 min | Page on-call; Slack alert |
| P2 - Medium | Elevated latency; model accuracy degradation; queue depth growth | < 1 hour | Slack alert; ticket created |
| P3 - Low | Capacity warning; non-critical model failure; minor sync drift | Next business day | Slack notification; ticket created |

### 4.2 Alert Definitions

| Alert | Severity | Condition | Runbook Action |
|-------|----------|-----------|---------------|
| Recording capture failure spike | P0 | `audio.capture.success_rate` < 99.9% for 5 min | Check telephony connector health; verify storage availability; escalate to provider if external |
| ASR queue overflow | P1 | `asr.batch.queue_depth_hours` > 30 min for 15 min | Scale ASR GPU pool; activate overflow instances; check for stuck jobs |
| NLP model circuit breaker open | P2 | Any NLP model circuit breaker in open state | Check model health; review recent deployment; rollback if needed |
| Deal scoring latency SLA breach | P1 | `scoring.update_latency_sec` P95 > 300s for 10 min | Check signal queue depth; scale scoring workers; verify graph DB health |
| Forecast accuracy degradation | P2 | `forecast.accuracy.within_10pct` < 80% for 2 consecutive periods | Trigger model retraining; review feature drift; check calibration |
| CRM sync rate limit sustained | P2 | `crm.sync.rate_limit_hits` > 50/hour for 2 hours | Review write batching; reduce sync frequency; contact CRM provider |
| Cross-tenant access attempt | P0 | Any `cross_tenant_access_attempt` event | Immediately revoke involved credentials; investigate; notify security team |
| Audio storage growth anomaly | P3 | Storage growth > 150% of projected | Review ingestion patterns; check for duplicate recordings; verify lifecycle policies |
| Model calibration drift | P2 | `scoring.calibration.brier_score` > 0.25 for any segment | Trigger per-segment recalibration; if persistent, trigger full model retraining |
| Search index lag | P2 | `search.index_lag_sec` > 300 for 30 min | Check indexer health; review indexing queue; scale indexer replicas |

### 4.3 Alert Suppression and Deduplication

| Rule | Implementation |
|------|---------------|
| Deduplication | Same alert (service + condition) within 15 min → single notification with count |
| Dependency suppression | If storage is down (P0), suppress all downstream alerts (ASR, NLP, scoring) |
| Maintenance window | Scheduled maintenance suppresses non-P0 alerts for the affected service |
| Flap detection | Alert toggling open/close >3 times in 30 min → escalate as persistent instability |

---

## 5. Dashboards

### 5.1 Operations Dashboard

| Panel | Metrics Visualized | Refresh Rate |
|-------|-------------------|-------------|
| Active audio streams | `audio.streams.active` with time-of-day overlay | 10s |
| ASR pipeline health | Queue depth, completion time P50/P95/P99, GPU utilization | 30s |
| NLP pipeline health | Per-model latency, error rate, throughput | 30s |
| Deal scoring SLA | Update latency distribution, updates per minute | 1 min |
| CRM sync status | Per-tenant sync health, queue depths, error rates | 1 min |
| Storage capacity | Audio/transcript storage volume by tier, growth trend | 5 min |

### 5.2 AI Model Health Dashboard

| Panel | Metrics Visualized | Refresh Rate |
|-------|-------------------|-------------|
| ASR accuracy | WER by language, diarization accuracy | Daily |
| NLP model performance | Per-model confidence distributions, accuracy trends | Hourly |
| Deal score calibration | Reliability diagrams, Brier scores by segment | Daily |
| Forecast accuracy | Predicted vs. actual by period, accuracy trend | Weekly |
| Model version tracking | Active model versions per component, rollout status | Real-time |

### 5.3 Business Health Dashboard

| Panel | Metrics Visualized | Refresh Rate |
|-------|-------------------|-------------|
| Tenant adoption | Active tenants, calls processed per tenant, feature utilization | Hourly |
| Data quality | Missing transcripts, failed annotations, sync drift | Hourly |
| User engagement | Dashboard views, search queries, coaching interactions | Hourly |
| SLA compliance | Per-SLO achievement rates, error budget consumption | 5 min |
