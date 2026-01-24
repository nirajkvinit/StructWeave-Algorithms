# Requirements & Estimations

## Functional Requirements

### P0 - Core Features (Must Have)

| Feature | Description | User Story |
|---------|-------------|------------|
| **Model Registration** | Register models with metadata, ownership, and dependencies | As an ML engineer, I want to register my model with its training lineage and declare known dependencies |
| **Dependency Discovery** | Auto-discover upstream/downstream model relationships | As a platform team, I want automatic dependency tracking from Metaflow workflow lineage |
| **Ground Truth Collection** | Collect actual outcomes for predictions | As a data scientist, I want to compare my model's predictions to actual user behavior |
| **Staleness Detection** | Monitor data drift, concept drift, and performance decay | As an ML engineer, I want alerts when my model's performance degrades or input distributions shift |
| **Auto-Retraining Triggers** | Policy-based automation for model retraining | As a team lead, I want automatic retraining based on configurable drift and performance thresholds |
| **Impact Analysis** | Understand downstream effects of model changes | As an ML engineer, I want to know what other models/systems break if my model changes |

### P1 - Enhanced Features (Should Have)

| Feature | Description | User Story |
|---------|-------------|------------|
| **Embedding Stability Tracking** | Track embedding drift across foundation model versions | As a platform team, I want to ensure embeddings remain stable when the foundation model is retrained |
| **A/B Test Integration** | Connect retraining decisions to experiment outcomes | As a data scientist, I want retraining to consider A/B test results, not just drift metrics |
| **Canary Deployments** | Gradual rollout of retrained models | As an ML engineer, I want retrained models deployed to a small user segment first |
| **Model Deprecation Workflow** | Managed retirement of stale models | As a team lead, I want a formal process to deprecate and retire models safely |
| **Cascade Prevention** | Prevent cascading retraining storms | As a platform team, I want to limit concurrent retrains when upstream models change |

### P2 - Nice to Have

| Feature | Description |
|---------|-------------|
| **Cost Attribution** | Track compute costs per model lifecycle event |
| **Compliance Reporting** | Generate audit reports for model freshness |
| **Multi-Region Sync** | Coordinate staleness across deployment regions |
| **Custom Drift Metrics** | Allow teams to define domain-specific drift measures |

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| Staleness detection latency | < 1 hour | Near-real-time alerting for critical models |
| Dependency graph query | < 500ms (p99) | Interactive exploration in dashboards |
| Ground truth join latency | < 24 hours | Next-day performance metrics availability |
| Retraining trigger latency | < 5 minutes | Quick response once drift detected |
| Model registration | < 10 seconds | Fast developer experience |
| Batch staleness scan | < 30 minutes | Full system health check |

### Reliability Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| Model Registry availability | 99.9% | Critical for all model operations |
| Staleness detector availability | 99.5% | Can tolerate brief gaps |
| Ground truth pipeline availability | 99.5% | Delayed data acceptable |
| Retraining success rate | > 95% | Most retrains should complete |

### Consistency Model

| Component | Model | Rationale |
|-----------|-------|-----------|
| Model Registry | Strong consistency | Model metadata must be accurate |
| Dependency Graph | Eventual (minutes) | Lineage updates can lag slightly |
| Staleness Metrics | Eventual (hours) | Aggregations acceptable |
| Ground Truth | Eventual (24h window) | Delayed labels expected |

### CAP Theorem Choice

**Choice: CP (Consistency + Partition Tolerance)**

- Model registry must return accurate state even if some replicas unavailable
- Staleness detection can pause during network partitions (better than false positives)
- Ground truth collection is eventually consistent, can buffer during partitions

---

## Capacity Estimations

### Scale Assumptions

| Metric | Value | Basis |
|--------|-------|-------|
| Netflix subscribers | 300M | Global user base |
| Production models | 500 | Personalization, discovery, search |
| Models per team | 10-50 | Varying team sizes |
| Features per model | 100-1000 | Typical model complexity |
| Predictions per day | 10B+ | Member x content x context |
| Metaflow workflows | 3,000+ | Training pipelines |

### Capacity Calculations

#### Model Registry

```
Total Models: 500
Versions per Model: 20 (avg, historical)
Total Versions: 500 x 20 = 10,000

Metadata per Version: ~10 KB (JSON blob)
Total Metadata Storage: 10,000 x 10 KB = 100 MB

Growth Rate: 50 new versions/day
Annual Growth: 50 x 365 x 10 KB = 182 MB/year
```

#### Dependency Graph

```
Nodes (Models): 500
Nodes (Features): 2,000 (avg 4 features per model)
Nodes (Data Sources): 200
Total Nodes: 2,700

Edges per Model: 10 (avg: features, data, upstream models)
Total Edges: 500 x 10 = 5,000

Graph Storage (Neo4j estimate):
  - Node: ~200 bytes each
  - Edge: ~100 bytes each
  - Total: 2,700 x 200 + 5,000 x 100 = 1.04 MB

Graph Query Volume:
  - Impact analysis: 100/day
  - Lineage lookups: 1,000/day
  - Dashboard refreshes: 10,000/day
```

#### Ground Truth Storage

```
Predictions per Day: 10 billion
Sample Rate: 1% (for ground truth)
Sampled Predictions: 100 million/day

Record Size: 500 bytes (prediction + outcome + metadata)
Daily Storage: 100M x 500 bytes = 50 GB/day
Retention: 90 days
Total Storage: 50 GB x 90 = 4.5 TB

Annual Growth (if retention increases): 50 GB x 365 = 18 TB/year
```

#### Staleness Metrics

```
Models: 500
Metrics per Model: 10 (PSI, KL, performance, age, etc.)
Computation Frequency: Hourly
Datapoints per Day: 500 x 10 x 24 = 120,000

Metric Size: 200 bytes (value, timestamp, details)
Daily Storage: 120,000 x 200 = 24 MB/day
Retention: 1 year
Total Storage: 24 MB x 365 = 8.7 GB
```

#### Retraining Jobs

```
Stale Models per Day (5%): 25
Retraining Jobs Triggered: 25/day (avg)
Peak Concurrent Retrains: 10

Job Duration: 2-4 hours (avg)
Compute Cost per Job: $50 (GPU training)
Daily Retraining Cost: 25 x $50 = $1,250
Monthly Cost: $37,500
```

### Summary Table

| Resource | Estimation | Calculation |
|----------|------------|-------------|
| Model Registry Storage | 100 MB + 182 MB/year | 10K versions x 10 KB |
| Dependency Graph | ~1 MB | 2.7K nodes + 5K edges |
| Ground Truth Storage | 4.5 TB (90-day retention) | 100M samples/day x 500 bytes |
| Staleness Metrics | 8.7 GB/year | 120K datapoints/day x 200 bytes |
| Daily Compute (Retraining) | $1,250 | 25 jobs x $50 |
| Read QPS (Registry) | 50 | Dashboard + API queries |
| Write QPS (Ground Truth) | 1,200 | 100M/day / 86,400 |

---

## SLOs / SLAs

### Service Level Objectives

| Metric | SLO | Measurement | Alert Threshold |
|--------|-----|-------------|-----------------|
| **Staleness Detection Freshness** | 99% of models evaluated within 1 hour | Time since last evaluation | > 2 hours |
| **Registry Availability** | 99.9% | Successful API responses | > 0.1% errors in 5 min |
| **Dependency Query Latency** | p99 < 500ms | Query response time | p99 > 1 second |
| **Ground Truth Coverage** | > 95% of predictions joined | Predictions with outcomes | < 90% |
| **Retraining Success Rate** | > 95% | Completed / Triggered | < 90% |
| **Alert Precision** | > 90% | True positives / Total alerts | < 80% (too noisy) |

### SLA Tiers

| Tier | Description | Staleness SLA | Retraining SLA |
|------|-------------|---------------|----------------|
| **Tier 1** | Revenue-critical (homepage ranking) | Detect within 30 min | Auto-retrain within 4 hours |
| **Tier 2** | Important (search, discovery) | Detect within 1 hour | Auto-retrain within 24 hours |
| **Tier 3** | Standard (notifications) | Detect within 4 hours | Manual review before retrain |
| **Tier 4** | Experimental | Best effort | Manual only |

### Error Budget

```
Monthly Error Budget Calculation (Tier 1, 99.9%):
  - Minutes in month: 43,200
  - Allowed downtime: 43,200 x 0.001 = 43.2 minutes
  - Staleness detection gap budget: 43 minutes/month

If error budget exhausted:
  - Freeze non-critical changes
  - Prioritize reliability improvements
  - Escalate to on-call
```

---

## Traffic Patterns

### Daily Pattern

```
          Staleness Detection Load
    ^
  H |                    ****
  i |                 ***    ***
  g |              ***          ***
  h |           ***                ***
    |        ***                      ***
  L |     ***                            ***
  o | ****                                  ****
  w +-------------------------------------------> Time
       00:00   06:00   12:00   18:00   24:00 UTC

Peak: 12:00-18:00 UTC (US prime time, European evening)
Trough: 00:00-06:00 UTC (global overnight)
```

### Event-Driven Spikes

| Event | Expected Load | Duration |
|-------|---------------|----------|
| Foundation model retrain | +50% staleness checks | 4-6 hours |
| New content launch | +20% ground truth volume | 24-48 hours |
| Algorithm A/B test deployment | +30% registry queries | 1-2 hours |
| Monthly model review | +100% dashboard load | 2-4 hours |

---

## Constraints and Assumptions

### Technical Constraints

1. **Metaflow Dependency**: Lineage extraction depends on Metaflow workflow metadata
2. **Maestro Integration**: Retraining coordination requires Maestro API availability
3. **Label Delay**: Ground truth for some models may arrive 7-30 days after prediction
4. **Compute Budget**: Max 50 concurrent retraining jobs (GPU cluster capacity)

### Business Constraints

1. **Tier 1 Model Changes**: Require human approval before auto-retrain
2. **Cost Limits**: Monthly retraining budget capped at $50K
3. **Rollback Window**: Must support 24-hour rollback to previous model version
4. **Audit Requirements**: All state changes must be logged for compliance

### Assumptions

1. Most models have quantifiable ground truth (implicit or explicit feedback)
2. Feature distributions are logged via Axion fact store
3. Teams have defined acceptable drift thresholds for their models
4. Network latency between services is < 10ms (same data center)

---

## Out of Scope

The following are explicitly **NOT** in scope for Runway:

| Item | Reason | Alternative |
|------|--------|-------------|
| Model Training | Handled by Metaflow | Runway triggers, Metaflow executes |
| Model Serving | Handled by Titus | Runway monitors health, Titus serves |
| Feature Engineering | Handled by Axion | Runway consumes feature distributions |
| A/B Test Analysis | Handled by experimentation platform | Runway uses outcomes as signals |
| Model Interpretability | Separate concern | Dedicated explainability tools |
| Real-time Inference | Latency-critical path | Titus handles serving, Runway monitors offline |
