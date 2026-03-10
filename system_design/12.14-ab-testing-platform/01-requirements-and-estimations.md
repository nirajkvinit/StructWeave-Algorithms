# 01 — Requirements & Estimations: A/B Testing Platform

## Functional Requirements

| # | Requirement | Details |
|---|---|---|
| FR-01 | **Experiment Lifecycle Management** | Create, start, pause, resume, stop, and archive experiments via API and UI; support experiment versioning and rollback |
| FR-02 | **Deterministic Variant Assignment** | Given an entity ID (user, session, device, org), always return the same variant for a given active experiment with no database lookup |
| FR-03 | **Traffic Allocation Control** | Specify percentage of eligible traffic exposed to an experiment (0.1% granularity); support unequal splits (e.g., 10/10/80) |
| FR-04 | **Targeting & Eligibility Rules** | Filter experiment exposure by user attributes (country, platform, cohort, account age, subscription tier, custom properties) |
| FR-05 | **Mutual Exclusion & Layering** | Namespace experiments into layers so users in experiment A cannot simultaneously be in experiment B within the same layer |
| FR-06 | **Feature Flag Integration** | Experiments use feature flags as the delivery mechanism; flag state is the variant; no separate SDK needed |
| FR-07 | **Event Ingestion** | Accept arbitrary event types with entity ID, timestamp, experiment context, and custom properties via SDK and server-side API |
| FR-08 | **Metric Definition & Computation** | Define metrics (conversion rate, mean, ratio, percentile) over raw events; compute metric values per variant with configurable aggregation |
| FR-09 | **Statistical Analysis** | Compute z-test, t-test, chi-squared; report p-values, confidence intervals, effect sizes; support sequential testing modes |
| FR-10 | **CUPED Variance Reduction** | Accept pre-experiment covariate data and apply CUPED adjustment to reduce metric variance, accelerating time to significance |
| FR-11 | **Sample Ratio Mismatch Detection** | Continuously monitor actual vs. expected traffic splits; alert and pause experiment on statistically significant mismatch |
| FR-12 | **Guardrail Metrics** | Define a set of metrics that must not degrade; automatically stop experiment if guardrail threshold is breached |
| FR-13 | **Segment Analysis** | Break down treatment effects by user segment (country, platform, device type, cohort) to detect heterogeneous treatment effects |
| FR-14 | **Multi-Armed Bandit Mode** | Optionally run an experiment in adaptive mode (epsilon-greedy, UCB, Thompson Sampling) to shift traffic to the winning variant |
| FR-15 | **Holdback Groups** | Support long-running holdback cohorts excluded from all experiments to measure cumulative and long-term platform effects |
| FR-16 | **Experiment Scheduling** | Allow experiments to be pre-configured and auto-started at a scheduled time; auto-stop after a specified duration |
| FR-17 | **Pre-Registration** | Require analysts to specify primary metric, MDE, target power, and run duration before experiment starts, preventing post-hoc outcome switching |

---

## Out of Scope

- Multivariate testing with more than 5 variants (combinatorial explosion of interactions makes interpretation unreliable at scale)
- Full contextual bandits for per-user personalization (bandits are supported; contextual bandits for recommendations are a separate system)
- Real-user monitoring (RUM) outside experiment context — handled by the observability platform
- Qualitative user research tooling (surveys, session replay beyond experiment context)
- A/A test automation — this is a configuration concern handled by creating an experiment with two identical control variants

---

## Non-Functional Requirements

### Performance

| Metric | Target | Notes |
|---|---|---|
| Assignment latency — SDK local (p50) | < 0.1 ms | Pure local hash computation, no I/O |
| Assignment latency — SDK local (p99) | < 1 ms | Includes targeting rule evaluation |
| Assignment latency — server fallback (p99) | < 5 ms | Remote assignment service call |
| Event ingest ACK (p99) | < 50 ms | Async pipeline; ACK confirms durable receipt to queue |
| Metric refresh lag — streaming (p95) | < 5 minutes | Preliminary streaming aggregates |
| Metric refresh lag — batch (p95) | < 90 minutes | Authoritative batch computation including CUPED |
| Dashboard query latency (p95) | < 3 seconds | Pre-aggregated results store query |
| Ruleset distribution lag | < 60 seconds | SDK receives updated ruleset after config change |

### Reliability

| Metric | Target | Notes |
|---|---|---|
| Assignment service availability | 99.99% (< 52 min downtime/year) | Measured at SDK edge; outage means stale cache served |
| Event pipeline durability | 99.999% no event loss after ACK | Exactly-once delivery commitment after queue write |
| Analysis pipeline availability | 99.9% | Brief gaps acceptable; stale results shown |
| Graceful degradation | On assignment failure, serve control | Control fallback preserves baseline experience |
| Recovery time objective (RTO) | < 5 minutes for assignment service | SDK cache maintains service during recovery |

### Scalability

| Metric | Target |
|---|---|
| Concurrent active experiments | 10 000+ |
| Peak assignment throughput | 2 000 000/second (burst) |
| Sustained assignment throughput | 500 000/second |
| Event ingest throughput | 500 000 events/second sustained peak |
| Experiment metadata size (ruleset) | < 50 MB total (fits in SDK memory) |
| Maximum variants per experiment | 5 (above this, interaction analysis becomes unreliable) |
| Maximum targeting rule complexity | 10 predicates per rule, 3 nesting levels |

### Data Integrity

| Property | Mechanism |
|---|---|
| Exactly-once event counting | Idempotent event IDs with 7-day dedup window |
| Immutable audit trail | Append-only write-once storage for all config changes |
| Assignment reproducibility | Deterministic hash allows server-side verification of any assignment |
| Statistical correctness | Sequential testing prevents false positives from peeking |

---

## Capacity Estimations

### Experiment Volume

| Parameter | Estimate | Reasoning |
|---|---|---|
| Active experiments at peak | 10 000 | Large product org; multiple teams, many surfaces |
| Average variants per experiment | 2.3 | Mostly 2-way (A/B); some 3-way |
| Average experiment duration | 14 days | Standard two-week cadence for most features |
| New experiments started per day | ~500 | 10 000 / 14 days × 70% overlap ≈ 500/day |
| Experiments stopped per day | ~500 | Steady state: starts ≈ stops |

### Assignment Throughput

| Variable | Value |
|---|---|
| Daily active users (DAU) | 500 million |
| Average sessions per DAU | 1.5 |
| Average page views per session | 7 |
| Fraction of page views with experiment lookup | 80% |
| Average experiments evaluated per page view | 3 |

**Total experiment evaluations per day:** 500M × 1.5 × 7 × 0.80 × 3 = **12.6 billion**

**Peak assignments per second:** 12.6B / 86,400 × 3.5 (peak factor) = **510,000/sec** → **target: 500K/sec sustained, 2M/sec burst**

Note: The vast majority (~99%) are resolved by the local SDK cache with zero network I/O. Only cache misses (ruleset refresh, first page load) hit the assignment service.

### Event Volume

| Event Category | Events/Day | Rate at Peak |
|---|---|---|
| Page view events | 5 billion | 200K/sec |
| Click / interaction events | 2 billion | 80K/sec |
| Purchase / conversion events | 50 million | 2K/sec |
| Custom metric events | 1 billion | 40K/sec |
| Server-side events (API calls, etc.) | 500 million | 20K/sec |
| **Total** | **~8.55 billion/day** | **~340K/sec avg; 1M/sec peak** |

### Storage Calculations

| Data Type | Retention | Calculation | Estimated Size |
|---|---|---|---|
| Raw event log (compressed Parquet) | 90 days | 8.55B events/day × 150 bytes compressed × 90 days | **115 TB** |
| Assignment log | 90 days | 12.6B evaluations/day × 40 bytes × 90 days | **45 TB** |
| Pre-aggregated metric snapshots | 2 years | 10K experiments × 20 metrics × 14 days × 100 data points/day × 50 bytes | **140 GB** |
| Statistical results | 2 years | 10K experiments × 5 metrics × 5 variants × 2 KB/result | **500 MB active; tens of GB archived** |
| Experiment configuration | Indefinite | 10K configs × 5 KB each | **50 MB (in-memory viable)** |
| Audit log | 7 years | 500 experiments started/day × 10 audit events × 2 KB × 365 × 7 | **~26 GB** |

**Total storage:** ~160 TB active, dominated by raw event log and assignment log.

### Compute Estimation

| Component | Throughput | Compute Requirement |
|---|---|---|
| Event Gateway shards | 1M events/sec peak | 50 nodes × 20K events/sec/node |
| Event Processor (dedup+enrich) | 1M events/sec | 100 nodes (I/O bound on cache lookups) |
| Stream Aggregator partitions | 1M events/sec | 200 partitions (5K events/sec/partition) |
| Batch Analysis jobs | 50K jobs/hour | 100 workers × 0.1 sec/job = 139 minutes → 200 workers needed |
| Statistical Engine | 50K analysis runs/hour | 50 workers (pure CPU, 0.5 sec/run) |

### Network Bandwidth

| Flow | Volume |
|---|---|
| SDK → Event Gateway | 1M events/sec × 200 bytes = **200 MB/sec = 1.6 Gbps** |
| Message Queue internal | 1M × 200 bytes + metadata = **~2 Gbps** |
| Event Log write | 1M × 150 bytes compressed = **150 MB/sec = 1.2 Gbps** |
| Ruleset CDN distribution | 50 MB ruleset × 10K SDK refreshes/min / 60 = **~8 GB/sec CDN hit rate; < 1% origin** |

---

## Service Level Objectives (SLOs)

| SLO ID | Metric | Target | Measurement Window | Alert Threshold |
|---|---|---|---|---|
| SLO-01 | Assignment service p99 latency (remote) | ≤ 5 ms | Rolling 5-minute window | > 8 ms for > 1 minute |
| SLO-02 | Assignment service availability | ≥ 99.99% | Monthly | < 99.95% in any 24-hour window |
| SLO-03 | Event pipeline data loss rate | ≤ 0.001% of ACK'd events | Per experiment over lifetime | Any confirmed loss > 100 events |
| SLO-04 | Streaming metric freshness | ≤ 5 minutes at p95 | Hourly sample | > 10 minutes for > 5 experiments |
| SLO-05 | Batch metric freshness | ≤ 90 minutes at p95 | Daily | Batch overdue by > 30 minutes |
| SLO-06 | SRM detection time | ≤ 30 minutes after mismatch onset | Per experiment | Not met for any P0 experiment |
| SLO-07 | Guardrail breach detection time | ≤ 15 minutes after breach onset | Per experiment | Not met for any production experiment |
| SLO-08 | Dashboard query response time | ≤ 3 seconds at p95 | Per query | > 5 seconds for > 5% of queries |
| SLO-09 | Ruleset propagation time | ≤ 60 seconds for 99% of SDKs | Per config change | > 90 seconds for any change |
| SLO-10 | Experiment start-to-first-result | ≤ 20 minutes | Per experiment | > 30 minutes |
