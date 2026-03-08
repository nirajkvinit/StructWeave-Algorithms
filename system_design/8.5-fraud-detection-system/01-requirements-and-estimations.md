# Requirements & Estimations

## Functional Requirements

### Core Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Real-Time Transaction Scoring** | Evaluate every transaction with a fraud risk score (0.0 - 1.0) within 100ms, returning allow/block/review decision |
| F2 | **Rules Engine** | Execute deterministic rules (velocity checks, blacklists, geo-fencing, amount thresholds) before and alongside ML scoring |
| F3 | **ML Model Serving** | Serve an ensemble of gradient-boosted trees, neural networks, and anomaly detection models with feature vector assembly |
| F4 | **Feature Engineering Pipeline** | Compute real-time features (velocity, device fingerprint, behavioral signals) and batch features (spending profiles, historical patterns) |
| F5 | **Graph-Based Fraud Ring Detection** | Build and query entity relationship graphs to detect coordinated multi-account fraud patterns |
| F6 | **Case Management** | Route flagged transactions to analyst queues with enrichment data, investigation tools, and disposition workflow |
| F7 | **Feedback Loop & Model Retraining** | Capture analyst decisions and transaction outcomes as labels; retrain models on weekly/daily cadence |
| F8 | **Regulatory Reporting** | Generate and file Suspicious Activity Reports (SARs) and Suspicious Transaction Reports (STRs) with regulatory bodies |
| F9 | **Merchant/Customer Risk Profiling** | Maintain risk profiles for merchants and customers based on historical behavior and external signals |
| F10 | **Alert Management** | Generate, prioritize, and route fraud alerts based on severity, amount, and pattern type |

### User Personas

| Persona | Key Interactions |
|---------|-----------------|
| **Payment Service** | Calls scoring API synchronously during transaction authorization; receives allow/block/review decision |
| **Fraud Analyst** | Investigates flagged cases, views enrichment data, makes disposition decisions, files SARs |
| **Fraud Operations Manager** | Configures rules, sets thresholds, monitors team performance, reviews model metrics |
| **ML Engineer** | Trains models, deploys new versions, monitors model drift, manages feature pipelines |
| **Compliance Officer** | Reviews SAR filings, audits decision trails, ensures regulatory adherence |
| **Merchant** | Views fraud metrics for their transactions, configures risk sensitivity preferences |

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Scoring Latency (p99)** | < 100ms | Must not perceptibly delay payment authorization |
| **Scoring Throughput** | 500+ TPS sustained, 1,500 TPS peak | Support 15M+ transactions/day with 3x burst |
| **Availability** | 99.95% | Scoring path cannot be a single point of failure for payments |
| **Fail-Open Policy** | Allow on scoring timeout | Better to miss fraud than block all payments during outage |
| **Model Update Latency** | < 30 minutes from deploy to 100% traffic | Fast rollout for new model versions to respond to emerging attacks |
| **Feature Freshness** | Real-time features: < 1s stale; Batch features: < 1 hour stale | Real-time velocity must reflect recent transactions |
| **Data Retention** | Raw events: 2 years; Features: 90 days hot / 2 years cold; Labels: indefinite | Training data and regulatory audit trail |
| **Explainability** | Top-5 contributing factors per decision | Regulatory requirement and analyst productivity |
| **False Positive Rate** | < 5% of blocked transactions | Minimize customer friction and revenue loss |
| **Detection Rate** | > 95% by fraud value | Catch nearly all fraud dollars, even if some low-value fraud slips through |

---

## Capacity Estimations

### Traffic

| Metric | Calculation | Value |
|--------|-------------|-------|
| Daily transactions | Given | 15M |
| Average TPS | 15M / 86,400 | ~175 TPS |
| Peak TPS (3x) | 175 x 3 | ~500 TPS |
| Holiday peak TPS (5x) | 175 x 5 | ~875 TPS |
| Scoring API calls/day | 15M x 1.1 (retries) | ~16.5M |

### Storage

| Data Type | Size per Record | Volume/Day | Daily Storage | Retention | Total |
|-----------|----------------|------------|---------------|-----------|-------|
| Transaction events | ~2 KB | 15M | ~30 GB | 2 years | ~22 TB |
| Feature vectors | ~4 KB (500 features x 8 bytes) | 15M | ~60 GB | 90 days hot | ~5.4 TB hot |
| Scoring results | ~500 bytes | 15M | ~7.5 GB | 2 years | ~5.5 TB |
| Entity graph nodes | ~1 KB | 100K new/day | ~100 MB | Indefinite | ~100M nodes |
| Entity graph edges | ~200 bytes | 500K new/day | ~100 MB | Indefinite | ~1B edges |
| Case records | ~10 KB (with enrichment) | 5,000 | ~50 MB | 7 years | ~130 GB |
| Rule definitions | ~2 KB | 500-2,000 active | ~4 MB | Versioned | ~100 MB |
| ML model artifacts | 50-500 MB each | 3-5 models | ~2 GB | Last 20 versions | ~40 GB |

### Compute

| Component | Resource Profile | Instances |
|-----------|-----------------|-----------|
| Scoring service | CPU-optimized (model inference) | 20-40 pods (auto-scaled) |
| Feature store | Memory-optimized (low-latency reads) | 10-20 nodes |
| Rules engine | CPU (deterministic evaluation) | 10-15 pods |
| Graph database | Memory + storage (traversal-heavy) | 5-10 nodes |
| Stream processor | CPU + memory (feature computation) | 15-25 pods |
| Case management API | Standard compute | 5-10 pods |
| Model training | GPU cluster (periodic) | 4-8 GPUs (on-demand) |

---

## SLOs and SLIs

| SLO | SLI | Target | Measurement |
|-----|-----|--------|-------------|
| **Scoring Latency** | p99 latency of /score endpoint | < 100ms | Histogram at API gateway |
| **Scoring Availability** | Successful responses / total requests | > 99.95% | 5xx error rate at load balancer |
| **Feature Freshness** | Age of newest feature at scoring time | Real-time: < 1s; Batch: < 1h | Feature store metadata timestamp |
| **Model Accuracy** | Weekly AUC-ROC on holdout set | > 0.98 | Offline evaluation pipeline |
| **False Positive Rate** | Blocked legitimate / total blocked | < 5% | Analyst disposition labels |
| **Detection Rate** | Caught fraud value / total fraud value | > 95% | Chargeback reconciliation |
| **Case Queue Latency** | Time from flagging to analyst assignment | < 15 minutes | Case management timestamps |
| **SAR Filing Timeliness** | Filing within regulatory deadline | 100% | Compliance tracking system |
| **Model Deploy Time** | Time from model approval to 100% traffic | < 30 minutes | Deployment pipeline metrics |
| **Rule Update Latency** | Time from rule save to enforcement | < 60 seconds | Rule engine version sync |

---

## Error Budget Policy

| SLO | Monthly Budget | Burn Rate Alert | Action |
|-----|---------------|-----------------|--------|
| Scoring availability (99.95%) | 21.6 min downtime | > 2x in 1 hour | Page on-call; activate fail-open |
| Scoring latency (p99 < 100ms) | 0.05% requests slow | > 5x in 15 min | Scale scoring pods; check feature store health |
| Detection rate (> 95%) | 5% fraud value missed | Weekly review | Emergency model retrain; tighten rules temporarily |
| False positive rate (< 5%) | 5% of blocks are FP | Daily review | Adjust thresholds; review recent rule changes |

---

## Key Assumptions

1. The payment service calls the fraud scoring API synchronously during transaction authorization---scoring is on the critical payment path
2. The system operates in a fail-open mode: if scoring is unavailable, transactions are allowed and flagged for async review
3. Chargebacks provide ground-truth fraud labels with a 30-90 day delay; analyst dispositions provide faster but noisier labels
4. Feature engineering uses point-in-time correctness: features used for scoring must match features available at training time to prevent data leakage
5. Models are retrained weekly with full dataset and updated daily with incremental learning on recent data
6. The system handles card-present, card-not-present, ACH, wire, and peer-to-peer transaction types with type-specific feature sets
7. Regulatory requirements vary by jurisdiction; SAR filing thresholds and timelines are configurable per region
