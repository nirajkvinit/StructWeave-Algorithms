# 14.9 AI-Native MSME Marketing & Social Commerce Platform — Observability

## Metrics

### Content Generation Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `content.generation.latency_p95` | Histogram | End-to-end time from brief submission to creative ready | > 35s (static), > 100s (video) |
| `content.generation.success_rate` | Rate | Percentage of generation requests that pass quality gate | < 85% |
| `content.generation.quality_score_avg` | Gauge | Average quality gate score across all generated content | < 6.5 / 10 |
| `content.generation.regeneration_rate` | Rate | Percentage of creatives rejected by quality gate and regenerated | > 25% |
| `content.generation.gpu_utilization` | Gauge | GPU utilization across image/video/text pools | < 20% (waste) or > 85% (saturation) |
| `content.generation.queue_depth` | Gauge | Number of pending generation requests per pool | > 100 (image), > 50 (video) |
| `content.safety.rejection_rate` | Rate | Content blocked by safety filters | > 5% (indicates prompt quality issue) |
| `content.brand.compliance_rate` | Rate | Content passing brand kit compliance check | < 90% |
| `content.language.distribution` | Counter | Content generated per language | Imbalanced distribution alerts |

### Publishing Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `publishing.post.delivery_rate` | Rate | Scheduled posts successfully published on time | < 99.9% |
| `publishing.post.delay_p95` | Histogram | Delay between scheduled time and actual publish time | > 5 minutes |
| `publishing.api.error_rate` | Rate | Platform API error rate per platform | > 5% sustained for 10 min |
| `publishing.api.rate_limit_hits` | Counter | Number of rate limit responses per platform per hour | > 50% of quota consumed |
| `publishing.circuit_breaker.state` | Gauge | Current circuit breaker state per platform adapter | OPEN state for > 5 minutes |
| `publishing.retry_queue.depth` | Gauge | Number of posts in retry queue per platform | > 1,000 |
| `publishing.token.expiry_countdown` | Gauge | Hours until OAuth token expiry per MSME per platform | < 48 hours |
| `publishing.duplicate.blocked` | Counter | Duplicate publications prevented by idempotency check | Spike indicates retry storm |

### Ad Optimization Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `ads.campaign.roas_avg` | Gauge | Average ROAS across all active campaigns | < 1.0 (losing money) |
| `ads.budget.pacing_error` | Gauge | Difference between planned and actual hourly spend | > 30% deviation |
| `ads.budget.overspend_rate` | Rate | Campaigns exceeding daily budget | > 2% of campaigns |
| `ads.bandit.exploration_ratio` | Gauge | Fraction of budget spent on exploration vs. exploitation | < 10% (under-exploring) or > 40% (over-exploring) |
| `ads.creative.fatigue_detection` | Counter | Creatives flagged for engagement decay | Trend indicates need for more creative variants |
| `ads.fraud.click_anomaly` | Counter | Campaigns flagged for suspicious click patterns | Any spike triggers investigation |
| `ads.optimization.cycle_latency` | Histogram | Time to complete one optimization cycle per campaign | > 30s (missing 15-min optimization window) |

### Influencer Discovery Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `influencer.authenticity.avg_score` | Gauge | Average authenticity score of recommended influencers | < 0.7 (quality concern) |
| `influencer.match.query_latency` | Histogram | Time to return influencer search results | > 10s |
| `influencer.crawl.freshness` | Gauge | Average age of influencer profile data | > 14 days |
| `influencer.fake_detection.rate` | Rate | Percentage of indexed influencers flagged as fake/bot | > 30% (data quality issue) |
| `influencer.match.conversion_rate` | Rate | MSME-influencer matches that convert to actual partnerships | Trending metric for product effectiveness |

### MSME Engagement Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `msme.dau` | Gauge | Daily active MSMEs | Drop > 10% week-over-week |
| `msme.content.approval_rate` | Rate | Generated content approved by MSMEs (vs. rejected/edited) | < 60% (quality problem) |
| `msme.content.approval_latency` | Histogram | Time between content ready and MSME approval | > 24 hours (engagement problem) |
| `msme.onboarding.completion_rate` | Rate | New MSMEs completing brand kit setup | < 50% |
| `msme.churn.30day` | Rate | MSMEs inactive for 30+ days | > 40% monthly |

---

## Logging

### Log Levels and Content

```
CONTENT GENERATION LOGS:
  INFO:  Brief received, generation started, quality score, generation completed
  WARN:  Quality gate threshold close (score 5.0–6.0), regeneration triggered,
         brand kit incomplete (using defaults)
  ERROR: Generation failed (GPU error, model timeout, invalid input),
         safety filter triggered, brand kit loading failed

PUBLISHING LOGS:
  INFO:  Post scheduled, publishing initiated, platform response received,
         post confirmed live
  WARN:  Rate limit approaching (>70% quota), retry initiated,
         token refresh triggered
  ERROR: Publishing failed (API error), circuit breaker opened,
         token expired (MSME notification sent), duplicate detected

AD OPTIMIZATION LOGS:
  INFO:  Optimization cycle completed, budget allocation updated,
         creative rotated, campaign state change
  WARN:  Budget pacing deviation >20%, ROAS below 1.0 for 24h,
         exploration ratio exceeding bounds
  ERROR: Budget overspend detected, fraud alert triggered,
         platform campaign API failure

INFLUENCER LOGS:
  INFO:  Search query executed, match scores calculated,
         profile crawl completed
  WARN:  Stale profile data (>14 days), high fake follower ratio in results,
         API rate limit approaching
  ERROR: Crawl failed for platform, scoring pipeline error,
         database query timeout
```

### Structured Log Format

```
{
  "timestamp": "2026-03-10T14:30:22.456Z",
  "level": "INFO",
  "service": "content-generator",
  "trace_id": "abc123",
  "span_id": "def456",
  "msme_id": "msme-789",
  "event": "content.generation.completed",
  "details": {
    "brief_id": "brief-101",
    "creative_id": "creative-202",
    "content_type": "static_image",
    "quality_score": 7.8,
    "generation_time_ms": 18500,
    "gpu_pool": "image_gen_pool_a",
    "language": "hindi",
    "platform_target": "instagram",
    "brand_compliance": true,
    "safety_passed": true,
    "template_used": "food_festive_001",
    "regeneration_count": 0
  }
}
```

### Log Retention and Archival

| Log Category | Hot Retention | Warm Retention | Cold Archive |
|---|---|---|---|
| Content generation | 7 days | 30 days | 1 year |
| Publishing | 14 days | 90 days | 2 years (compliance) |
| Ad optimization | 14 days | 90 days | 2 years (financial audit) |
| Influencer scoring | 7 days | 30 days | 6 months |
| Security/audit | 30 days | 1 year | 7 years (regulatory) |

---

## Distributed Tracing

### Trace Spans for Content Generation Flow

```
Trace: content_generation (total: 22s)
├── brief_parsing (200ms)
│   ├── input_validation (50ms)
│   ├── intent_classification (100ms)
│   └── category_detection (50ms)
├── product_understanding (3.2s) [GPU]
│   ├── background_removal (1.5s)
│   ├── feature_extraction (1.0s)
│   └── color_analysis (0.7s)
├── text_generation (2.8s) [GPU, parallel with layout]
│   ├── caption_generation (1.5s)
│   ├── hashtag_selection (0.8s)
│   └── cta_generation (0.5s)
├── layout_generation (4.5s) [GPU]
│   ├── template_selection (0.3s)
│   ├── composition (3.5s)
│   └── brand_kit_application (0.7s)
├── visual_rendering (8.0s) [GPU]
│   ├── background_synthesis (3.0s)
│   ├── product_compositing (2.5s)
│   ├── text_overlay_rendering (1.5s)
│   └── post_processing (1.0s)
├── quality_gate (1.5s)
│   ├── aesthetic_scoring (0.5s)
│   ├── brand_compliance (0.3s)
│   ├── platform_fitness (0.2s)
│   └── safety_check (0.5s) [GPU]
└── storage_and_notification (1.8s)
    ├── media_upload (1.5s)
    └── push_notification (0.3s)
```

### Trace Spans for Publishing Flow

```
Trace: scheduled_publish (total: 8.5s)
├── schedule_trigger (50ms)
│   └── fetch_scheduled_post (50ms)
├── pre_publish_validation (200ms)
│   ├── token_validity_check (50ms)
│   ├── content_staleness_check (50ms)
│   └── rate_limit_check (100ms)
├── platform_adaptation (500ms)
│   ├── format_conversion (200ms)
│   ├── caption_truncation (50ms)
│   └── hashtag_limit_enforcement (50ms)
├── platform_api_call (6.0s)
│   ├── media_upload (4.5s)
│   ├── caption_posting (1.0s)
│   └── post_confirmation (0.5s)
├── post_publish_actions (1.5s)
│   ├── record_platform_post_id (100ms)
│   ├── update_engagement_tracking (200ms)
│   ├── schedule_metric_polling (100ms)
│   └── notify_msme (300ms)
└── event_emission (200ms)
    └── publish_content_event (200ms)
```

### Cross-Service Trace Correlation

Every request carries a trace context through the entire lifecycle:

```
Brief submission → Content generation → Quality gate → MSME approval →
Scheduling → Publishing → Engagement tracking → Insight generation

All operations correlated by:
  - trace_id: unique per brief (spans entire content lifecycle)
  - brief_id: business-level correlation key
  - msme_id: customer-level correlation
  - creative_id: per-creative correlation (one brief may produce multiple creatives)
```

---

## Alerting

### Critical Alerts (Page on-call immediately)

| Alert | Condition | Action |
|---|---|---|
| Publishing failure rate > 10% | > 10% of scheduled posts failing for > 5 min | Investigate platform API health; check circuit breaker state |
| Ad budget overspend | Any campaign exceeds daily budget by > 20% | Immediately pause campaign; investigate pacing logic |
| Safety filter bypass | Content published without safety check | Emergency takedown; investigate pipeline bypass |
| OAuth token mass expiry | > 100 MSME tokens expiring in 24h with refresh failing | Investigate platform OAuth service health; batch notify MSMEs |
| GPU pool exhaustion | All GPU pools at >95% utilization for > 10 min | Trigger emergency scale-up; enable quality degradation |

### Warning Alerts (Notify team within 1 hour)

| Alert | Condition | Action |
|---|---|---|
| Content quality declining | Average quality score < 6.5 for > 1 hour | Review model outputs; check for input distribution shift |
| Platform rate limit saturation | > 80% of any platform's API quota consumed | Review API call patterns; optimize batching |
| Influencer data staleness | > 20% of indexed profiles older than 14 days | Investigate crawler health; check for API changes |
| MSME approval rate dropping | Approval rate < 60% for > 24 hours | Investigate content quality; check for brand kit issues |
| Ad ROAS below 1.0 | Average ROAS < 1.0 for > 48 hours | Review targeting and creative performance; check for fraud |

### Informational Alerts (Daily digest)

| Alert | Condition | Action |
|---|---|---|
| New language performance | Quality score for any language < 5.0 | Schedule language model improvement; increase human review |
| Template staleness | Any template used > 10,000 times without engagement improvement | Refresh template library; A/B test new designs |
| Competitor activity spike | Any monitored competitor's posting frequency > 2x normal | Informational; may trigger proactive MSME recommendations |

---

## Dashboards

### Operations Dashboard

- **GPU Pool Health**: Real-time utilization, queue depth, and latency per pool (image/video/text)
- **Publishing Pipeline**: Posts scheduled vs. published vs. failed per platform per hour
- **Platform API Health**: Per-platform error rate, rate limit utilization, circuit breaker states
- **Content Generation Throughput**: Requests/second, latency distribution, quality score distribution

### Business Dashboard

- **MSME Activity**: DAU/WAU/MAU trends, content creation volume, approval rates
- **Content Performance**: Engagement metrics per content type, per language, per platform
- **Ad Performance**: Campaign ROAS distribution, budget utilization, creative effectiveness
- **Influencer Program**: Match volume, partnership conversion rate, campaign ROI

### ML Model Dashboard

- **Generation Quality**: Quality score trends per model version, per content type, per language
- **Bandit Convergence**: Per-category exploration/exploitation ratio, time-to-convergence for new MSMEs
- **Authenticity Model**: Precision/recall of fake follower detection, false positive rate trends
- **Scheduling Accuracy**: Predicted vs. actual optimal posting time accuracy per MSME cohort
