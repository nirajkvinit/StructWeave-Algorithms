# Requirements & Estimations — RTB System

## 1. Functional Requirements

### 1.1 Bid Request Processing (Exchange Side)

| Requirement | Description |
|---|---|
| **Receive bid requests** | Accept OpenRTB 2.6 bid requests from SSPs containing impression, site/app, device, user, and privacy signals |
| **DSP fan-out** | Broadcast bid requests to eligible DSPs based on targeting pre-filters (geo, format, deal eligibility) |
| **Timeout enforcement** | Enforce configurable per-DSP timeout (typically 80–120ms); discard late responses |
| **Auction execution** | Run first-price auction across all timely bid responses; apply floor price enforcement |
| **Winner notification** | Send win notice (nurl) to winning DSP with final settlement price; send loss notices to losers |
| **Creative delivery** | Return winning ad markup (HTML, VAST, native JSON) to the SSP for rendering |

### 1.2 Bid Evaluation & Response (DSP Side)

| Requirement | Description |
|---|---|
| **Targeting evaluation** | Match impression attributes against campaign targeting rules (geo, device, audience segments, contextual categories) |
| **User signal lookup** | Retrieve user profile features (historical behavior, segment membership, frequency counts) from low-latency feature store |
| **Bid price computation** | Calculate optimal bid using ML model output (predicted CTR/CVR), campaign bid strategy, and budget pacing state |
| **Creative selection** | Choose best-matching creative from advertiser's creative pool based on format, size, and dynamic creative optimization rules |
| **Bid shading** | Apply bid shading algorithm to reduce first-price bid toward estimated market clearing price |
| **Response assembly** | Construct OpenRTB bid response with bid price, creative markup, advertiser domain, and deal metadata |

### 1.3 Impression & Event Tracking

| Requirement | Description |
|---|---|
| **Impression tracking** | Fire server-to-server and pixel-based impression beacons when ad renders in viewport |
| **Click tracking** | Record click events with redirect through tracking endpoint; capture click coordinates and timing |
| **Viewability measurement** | Track whether ad met viewability threshold (50% pixels visible for 1+ second per MRC standard) |
| **Conversion attribution** | Match post-click and post-view conversions back to serving events via attribution windows |
| **Billing event generation** | Produce immutable billing events for won impressions that feed into financial reconciliation |

### 1.4 Campaign & Budget Management

| Requirement | Description |
|---|---|
| **Campaign CRUD** | Create, update, pause, and archive campaigns with hierarchical structure (advertiser → campaign → ad group → creative) |
| **Budget allocation** | Set daily and lifetime budgets at campaign and ad-group levels with configurable pacing strategy (even, accelerated, front-loaded) |
| **Frequency capping** | Enforce per-user impression limits at campaign and advertiser levels (e.g., max 3 impressions per user per 24 hours) |
| **Dayparting** | Restrict ad delivery to specific hours/days per the advertiser's timezone |
| **Targeting configuration** | Define targeting rules across geo, device, OS, browser, audience segments, contextual categories, and deal IDs |

### 1.5 Reporting & Analytics

| Requirement | Description |
|---|---|
| **Real-time dashboards** | Show live metrics: spend, impressions, clicks, CTR, CPM, win rate, bid rate |
| **Historical reporting** | Provide aggregated reports by campaign, creative, geo, device, time period |
| **Discrepancy reports** | Compare SSP-reported vs DSP-reported impression/click counts; flag variances >5% |
| **Budget utilization** | Track pacing adherence: actual spend vs planned spend curve |

---

## 2. Non-Functional Requirements

### 2.1 Latency

| Metric | Target | Rationale |
|---|---|---|
| **End-to-end bid response** | < 80ms p99 (DSP) | DSP must respond within exchange timeout (100ms) minus network RTT (~20ms) |
| **Feature lookup** | < 10ms p99 | User profile and campaign data must be available from in-memory cache |
| **Model inference** | < 15ms p99 | CTR/CVR prediction must complete within the bid computation budget |
| **Auction execution** | < 5ms p99 | Exchange must collect bids, run auction logic, and select winner rapidly |
| **Impression beacon** | < 50ms p99 | Tracking pixels must respond quickly to avoid blocking page render |
| **Win notice delivery** | < 200ms p99 | Asynchronous but must arrive before impression pixel for billing accuracy |

### 2.2 Throughput

| Metric | Target | Rationale |
|---|---|---|
| **Bid requests received** | 10M+ QPS peak | Global display + video + CTV inventory across all publishers |
| **Bid evaluations per DSP** | 500K–2M QPS | Each DSP receives a filtered subset of total exchange traffic |
| **Impression events** | 2M+ events/sec | Win rate ~20-30% of bid requests × tracking events per impression |
| **Click events** | 50K+ events/sec | CTR ~0.1-2% of impressions depending on format |

### 2.3 Availability & Durability

| Metric | Target | Rationale |
|---|---|---|
| **Bid serving availability** | 99.95% | Downtime = lost revenue; but brief outages degrade gracefully (SSP falls back to other DSPs) |
| **Impression tracking** | 99.99% | Every missed impression event is lost revenue; requires at-least-once delivery |
| **Billing event durability** | 99.999% | Financial records must never be lost; drives revenue reconciliation |
| **Campaign management API** | 99.9% | Non-real-time; brief outages acceptable |
| **Reporting pipeline** | 99.5% | Batch processing; can tolerate delays without revenue impact |

### 2.4 Data Freshness

| Data Type | Staleness Tolerance | Update Mechanism |
|---|---|---|
| **Campaign status** | < 30 seconds | Push notification from campaign service to bidder cache |
| **Budget remaining** | < 5 seconds | Periodic sync from centralized budget ledger to local bidder cache |
| **Frequency cap counters** | < 60 seconds | Approximate counters with periodic cross-node reconciliation |
| **User segments** | < 1 hour | Batch-computed audience segments pushed to feature store |
| **ML model weights** | < 1 hour | Rolling model deployment with canary testing |
| **Blocklists (fraud IPs)** | < 5 minutes | Streaming updates from fraud detection pipeline |

---

## 3. Capacity Estimations

### 3.1 Traffic Volume

```
Peak bid requests:           10,000,000 QPS
Average bid requests:         5,000,000 QPS
Daily bid requests:           5M × 86,400 = 432 billion / day
Avg bid request size:         ~2 KB (JSON) / ~800 bytes (protobuf)
Avg bid response size:        ~1 KB (JSON) / ~400 bytes (protobuf)

Win rate (DSP perspective):   ~15-25% of bids placed
Bid rate (DSP perspective):   ~30-50% of requests evaluated
Impressions served:           ~50 billion / day (across exchange)
```

### 3.2 Bandwidth

```
Inbound bid requests:   10M QPS × 2 KB = 20 GB/s peak
Outbound bid responses: 10M QPS × 1 KB = 10 GB/s peak (across all DSPs)
Impression beacons:     2M/s × 500 bytes = 1 GB/s
Total network:          ~30+ GB/s peak at exchange level

Per DSP (receiving 1M QPS):
  Inbound:  1M × 2 KB = 2 GB/s
  Outbound: 1M × 1 KB × 40% bid rate = 400 MB/s
```

### 3.3 Storage

```
Impression logs:
  50B impressions/day × 500 bytes/event = 25 TB/day raw
  With bid-level logs (all bids, not just wins): 432B × 200 bytes = 86 TB/day
  30-day retention at exchange level: ~3.3 PB

Campaign metadata:
  100K active campaigns × 50 KB avg = 5 GB (fits in memory)

User profiles (DSP feature store):
  2 billion user profiles × 2 KB avg = 4 TB
  Must be served from in-memory/SSD tier for <10ms latency

Model artifacts:
  CTR/CVR models: ~500 MB - 2 GB per model version
  Multiple models (per-format, per-geo): ~20 GB total
```

### 3.4 Compute

```
DSP bidder fleet (for 1M QPS):
  Each bidder node handles ~10K-50K QPS (depending on model complexity)
  Fleet size: 1M / 25K = 40 bidder nodes minimum
  With 2x headroom: 80 bidder nodes
  Across 3 regions: 240 nodes total

Exchange auction servers (for 10M QPS):
  Each node handles ~100K QPS (lighter logic, no ML)
  Fleet size: 10M / 100K = 100 nodes minimum
  With 2x headroom and 3 regions: 600 nodes

Feature store cluster:
  4 TB user profiles across ~200 nodes with 20 GB memory each
  Replication factor 2 per region
```

---

## 4. SLOs and SLAs

### 4.1 Service Level Objectives

| Service | SLO | Measurement Window | Error Budget |
|---|---|---|---|
| **Bid response latency** | p99 < 80ms | Rolling 5-minute window | 1% of requests may exceed |
| **Bid serving uptime** | 99.95% | Monthly | 21.9 minutes/month downtime |
| **Impression tracking uptime** | 99.99% | Monthly | 4.3 minutes/month downtime |
| **Impression event delivery** | 99.99% no data loss | Daily | Max 0.01% event loss rate |
| **Budget accuracy** | ±2% of target daily spend | Daily | Campaign spend within 98-102% of pacing target |
| **Frequency cap accuracy** | ±1 impression of target | Per user per day | Slight over-delivery acceptable; under-delivery wastes budget |
| **Report freshness** | < 15 minutes lag | Continuous | Real-time dashboard data within 15min of event |
| **Campaign activation** | < 60 seconds | Per change | Changes propagate to all bidders within 1 minute |

### 4.2 SLA Tiers

| Tier | Availability | Latency | Use Case |
|---|---|---|---|
| **Platinum** | 99.99% | p99 < 60ms | Premium direct deals, guaranteed delivery campaigns |
| **Gold** | 99.95% | p99 < 80ms | Standard programmatic open exchange |
| **Silver** | 99.9% | p99 < 100ms | Backfill inventory, lower-priority campaigns |
| **Analytics** | 99.5% | < 15min freshness | Reporting, dashboards, historical queries |

### 4.3 Penalty Structure

| Violation | Impact | Mitigation |
|---|---|---|
| **Bid timeout (>100ms)** | Bid discarded; lost impression opportunity | Pre-compute features; shed load under pressure |
| **Budget overspend >5%** | Financial loss for DSP; advertiser trust damage | PID pacing with conservative bias; hard circuit breaker at 110% |
| **Impression tracking loss** | Revenue leakage; billing disputes | At-least-once delivery with deduplication; write-ahead log |
| **Frequency cap violation** | Poor user experience; advertiser complaints | Probabilistic counters with periodic reconciliation |

---

## 5. Key Constraints & Assumptions

### 5.1 Constraints

| Constraint | Impact |
|---|---|
| **100ms hard deadline** | Entire bid lifecycle (network + processing) must complete; no retry possible |
| **No request buffering** | Bid requests cannot be queued; they must be processed or dropped immediately |
| **First-price auction** | DSPs must implement bid shading; overbidding directly costs money |
| **Privacy regulations** | GDPR/CCPA limit user data availability; must support cookieless bidding |
| **Multi-party ecosystem** | SSPs, DSPs, and exchanges are separate entities with independent systems and incentives |
| **Creative review** | All ad creatives must pass review before serving; latency in creative approval pipeline |

### 5.2 Assumptions

| Assumption | Basis |
|---|---|
| **OpenRTB 2.6 protocol** | Industry standard; assumed as the communication protocol |
| **Global deployment** | At least 3 geographic regions (Americas, Europe, Asia-Pacific) |
| **ML-based bidding** | CTR/CVR prediction models are pre-trained and served via inference service |
| **First-party data available** | DSP has access to advertiser's first-party audience data via data clean rooms |
| **Protobuf for internal comms** | JSON for external OpenRTB; protobuf for internal service-to-service |
| **Event streaming backbone** | Distributed log (event streaming platform) for impression events and analytics |
