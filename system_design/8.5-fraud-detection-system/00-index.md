# Fraud Detection System Design

## System Overview

A fraud detection system---exemplified by Stripe Radar, PayPal Risk, Featurespace ARIC, and Feedzai---evaluates every financial transaction in real time to assign a fraud risk score, block or flag suspicious activity, and route ambiguous cases to human analysts for investigation. Modern platforms process over 10 million transactions per day with sub-100ms scoring latency, catching 95%+ of fraudulent transactions while maintaining false positive rates below 5%. The core engineering challenge sits at the intersection of **real-time ML inference** (serving gradient-boosted tree ensembles and neural networks under strict latency budgets while consuming hundreds of features per transaction), **hybrid scoring architecture** (combining deterministic rules for known attack vectors with probabilistic ML models for novel fraud patterns, where rules provide explainability and ML provides adaptability), **feature engineering at dual time scales** (real-time features like velocity counters and device fingerprints computed in milliseconds, combined with batch features like historical spending profiles and graph-derived risk scores computed hourly), **graph-based fraud ring detection** (traversing transaction and entity relationship graphs to identify coordinated multi-account attacks that appear innocuous when viewed individually), and **feedback loop integrity** (ensuring analyst disposition decisions flow back to retrain models without label leakage, selection bias, or stale feature drift). Unlike simple rule-based filters that generate excessive false positives and miss novel attack vectors, a modern fraud detection system learns continuously from the network's collective intelligence---every transaction outcome, chargeback, and analyst decision enriches the models, creating a flywheel where more data produces better models that catch more fraud.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Read-heavy for feature lookups and model serving; write-heavy for event ingestion, feature updates, and case management |
| **Latency Sensitivity** | Critical---scoring must complete in < 100ms to avoid blocking the payment flow; p99 target < 150ms |
| **Consistency Model** | Eventually consistent for feature stores and model updates; strong consistency for block/allow decisions and case state transitions |
| **Accuracy Requirement** | High precision (> 95%) to minimize false positives that block legitimate customers; high recall (> 90%) to catch actual fraud |
| **Data Volume** | Very High---10M+ transactions/day, each generating 200-500 features; 90-day feature windows; years of labeled training data |
| **Architecture Model** | Event-driven pipeline with synchronous scoring hot path; asynchronous enrichment, graph analysis, and model retraining cold path |
| **Regulatory Burden** | High---PCI-DSS for payment data, GDPR/CCPA for user data, SAR/STR filing requirements, model explainability mandates |
| **Complexity Rating** | **Very High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, scoring algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Feature store latency, model serving cold starts, graph traversal bottlenecks |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Horizontal scaling, model canary deployment, feature store sharding |
| [06 - Security & Compliance](./06-security-and-compliance.md) | PCI-DSS, GDPR, SAR filing, model bias auditing, adversarial robustness |
| [07 - Observability](./07-observability.md) | Model performance metrics, drift detection, scoring latency, alert triage dashboards |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs, scoring rubric |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Fraud Detection (This) | Digital Wallet (8.4) | Payment Gateway (5.5) | Anomaly Detection (Generic) |
|--------|----------------------|---------------------|----------------------|---------------------------|
| **Primary Goal** | Block fraudulent transactions before completion | Move money between wallets safely | Route payments between merchants and banks | Detect outliers in any data stream |
| **Latency Budget** | < 100ms (inline scoring during payment) | < 2s (end-to-end transfer) | < 500ms (authorization round-trip) | Seconds to minutes (often async) |
| **Decision Type** | Risk score + block/allow/review decision | Debit/credit ledger operations | Authorize/decline routing | Alert generation |
| **ML Dependency** | Core---ML models are the primary decision engine | Peripheral---uses fraud score as input | Minimal---mostly rule-based | Varies by domain |
| **Feature Complexity** | Very High---hundreds of real-time and batch features per transaction | Low---balance checks, velocity limits | Medium---basic risk signals | Medium---domain-specific signals |
| **Human-in-Loop** | Essential---analysts investigate flagged cases and provide labels | Rare---automated dispute handling | Rare---chargeback teams | Optional---depends on domain |
| **Adversarial Nature** | Core challenge---fraudsters actively evolve tactics | Secondary---fraud is one threat vector | Secondary---fraud is delegated to fraud system | Rarely adversarial |

---

## What Makes This System Unique

1. **Adversarial Co-Evolution**: Unlike most ML systems where the data distribution is stationary, fraud detection operates in a perpetual arms race. Fraudsters observe which transactions get blocked and adapt their tactics. This means models degrade over time not from data drift but from adversarial drift---the very act of deploying a model changes the attack surface. The system must continuously retrain, deploy challenger models, and detect when existing models lose effectiveness against emerging attack vectors.

2. **Sub-100ms ML Inference with Hundreds of Features**: The scoring pipeline must compute real-time features (velocity counters, device fingerprint similarity, geolocation anomaly scores), fetch pre-computed batch features (historical spending profile, merchant risk category, account age signals), assemble a feature vector of 200-500 dimensions, and run it through an ensemble model---all within 100ms. This is not a standard model-serving problem; it requires a purpose-built feature store with single-digit-millisecond retrieval and model architectures optimized for inference speed over training convenience.

3. **Precision-Recall Trade-off with Asymmetric Costs**: Blocking a legitimate transaction (false positive) costs customer trust and revenue. Missing a fraudulent transaction (false negative) costs the fraud amount plus chargeback fees plus reputational damage. The optimal operating point on the precision-recall curve is not 50/50---it depends on transaction amount, merchant category, user tenure, and regulatory requirements. The system must support dynamic threshold adjustment per segment.

4. **Graph-Based Fraud Ring Detection**: Individual transactions that appear legitimate in isolation may be part of a coordinated fraud ring---synthetic identities opening accounts, building credit history, and then executing a burst of fraudulent transactions. Detecting these patterns requires graph analysis: building entity resolution graphs (shared devices, addresses, phone numbers, IP addresses) and running community detection algorithms to identify clusters of suspicious interconnection.

5. **Dual-Speed Feature Engineering**: The system operates at two fundamentally different time scales. Real-time features (last-5-minutes velocity, current device fingerprint, session behavioral biometrics) must be computed inline during scoring. Batch features (30-day spending profile, merchant category affinity, historical chargeback rate) are pre-computed hourly or daily. The feature store must serve both with consistent point-in-time semantics to prevent data leakage during model training.

6. **Case Management as a Feedback Engine**: The human analyst workflow is not just an operational necessity---it is the system's primary source of labeled training data. Every analyst disposition (confirmed fraud, false positive, escalation) becomes a label that feeds back into model retraining. The quality and consistency of analyst decisions directly determines model quality, creating a socio-technical feedback loop where operational processes and ML pipelines are inseparable.

---

## Quick Reference: Scale Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Transactions scored per day | ~15M | All payment transactions across all channels |
| Peak transactions/sec | ~500 | 3x average during holiday/sale events |
| Scoring latency (p50) | < 50ms | Feature fetch + model inference |
| Scoring latency (p99) | < 100ms | Including network overhead and feature cache misses |
| Features per transaction | 200-500 | Real-time + batch features combined |
| ML model ensemble size | 3-5 models | Gradient-boosted trees + neural network + rules |
| False positive rate | < 5% | Of all flagged/blocked transactions |
| Fraud detection rate (recall) | > 95% | Of total confirmed fraud value |
| Daily fraud prevention value | ~$2M | Estimated blocked fraud amount |
| Model retraining frequency | Weekly | Full retrain; daily incremental updates |
| Feature store entries | ~500M | Active entity-feature combinations |
| Case management queue | ~5,000/day | Transactions routed to analyst review |
| Analyst review time (median) | 3-5 minutes | Per case with enrichment data |
| SAR filing volume | ~200/month | Regulatory filings for confirmed fraud patterns |
| Graph entities | ~100M nodes | Users, devices, addresses, accounts, merchants |
| Graph edges | ~1B | Relationships between entities |
| Rule engine rules | 500-2,000 | Active deterministic rules |
| Model AUC-ROC | > 0.98 | Area under receiver operating characteristic curve |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [8.4 - Digital Wallet](../8.4-digital-wallet/) | Inline fraud scoring integration, transaction monitoring, KYC/AML |
| [8.2 - Stripe/Razorpay](../8.2-stripe-razorpay/) | Payment orchestration, merchant risk scoring, chargeback handling |
| [1.5 - Distributed Log-Based Broker](../1.5-distributed-log-based-broker/) | Event streaming for transaction events, feature computation pipelines |
| [1.1 - Distributed Rate Limiter](../1.1-distributed-rate-limiter/) | Velocity-based rules, sliding window counters for abuse detection |
| [4.1 - Notification System](../4.1-notification-system/) | Real-time fraud alerts to users, analyst notifications |
| [1.4 - Distributed LRU Cache](../1.4-distributed-lru-cache/) | Feature store caching, model result caching for repeated entities |

---

## Sources

- Stripe Engineering --- How We Built Stripe Radar
- Stripe --- Primer on Machine Learning for Fraud Protection
- Featurespace --- ARIC Platform: Adaptive Real-Time Individual Change Detection
- Feedzai --- Real-Time ML for Financial Crime Prevention
- Neo4j --- Graph-Based Fraud Detection Architecture
- NICE Actimize --- SAR Filing Automation with Generative AI
- DataVisor --- Unsupervised ML for Fraud Ring Detection
- SAS --- Strategies for Modern Fraud Detection
- FinCEN --- Bank Secrecy Act / SAR Filing Requirements
- PCI Security Standards Council --- PCI-DSS v4.0 Data Protection Requirements
- ACM --- Feature Engineering for Real-Time Fraud Detection Systems
- IEEE --- Graph Neural Networks for Financial Fraud Detection
