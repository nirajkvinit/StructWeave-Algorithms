# Feature Store

[← Back to System Design Index](../README.md)

## Overview

A **Feature Store** is a centralized repository for storing, managing, and serving machine learning features. It bridges the gap between data engineering and ML engineering by providing a consistent interface for feature discovery, reuse, and serving. Feature Stores solve critical ML infrastructure challenges including train-serve skew, point-in-time correctness, and feature reuse across teams and models.

---

## Complexity Rating

| Aspect | Rating | Justification |
|--------|--------|---------------|
| **Overall** | **Very High** | Dual-store architecture (online/offline), streaming + batch pipelines, ML-specific consistency requirements |
| Algorithm Complexity | High | Point-in-time joins, materialization strategies, feature transformations |
| Scale Challenges | Very High | Billions of entities, petabyte-scale offline storage, sub-10ms online serving |
| Operational Complexity | High | Data freshness SLAs, schema evolution, cross-team coordination |
| Interview Frequency | High | Common in ML infrastructure and data platform interviews (2025+) |

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| **Store Pattern** | Dual-store (Online + Offline) | Different storage for training vs serving |
| **Online Latency** | p99 <10ms | Key-value optimized storage required |
| **Offline Pattern** | Point-in-time joins | Temporal correctness for training data |
| **Read:Write Ratio** | 100:1 (online), 1:10 (offline) | Read-heavy serving, write-heavy training data |
| **Freshness Tiers** | Real-time (<1m), Near-real-time (<15m), Batch (<24h) | Multiple materialization paths |
| **Consistency Model** | Eventual (online), Strong (offline) | Trade-off between latency and correctness |
| **Scale** | 10K+ features, 1B+ entities | Horizontal partitioning required |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture, dual-store pattern, data flow |
| [03 - Low-Level Design](./03-low-level-design.md) | Data model, APIs, algorithm pseudocode |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Point-in-time joins, materialization, online serving |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling, caching, fault tolerance |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Access control, PII handling, compliance |
| [07 - Observability](./07-observability.md) | Feature quality metrics, freshness monitoring |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing, trap questions, trade-offs |

---

## Feature Store vs. Other Approaches

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Ad-hoc Feature Pipelines** | Simple, fast to build | Duplicate work, train-serve skew | Single model, PoC |
| **Data Warehouse Only** | Centralized, SQL-friendly | High latency for serving | Batch-only ML |
| **Custom Key-Value Store** | Low latency | No versioning, no PIT correctness | Simple online-only |
| **Feature Store** | Reuse, consistency, PIT joins | Complexity, operational overhead | Production ML at scale |
| **Virtual Feature Store** | No data duplication | Higher latency, source dependency | Exploratory, cost-sensitive |

---

## Core Concept Comparison

### Store Types

| Store | Purpose | Latency | Storage | Query Pattern |
|-------|---------|---------|---------|---------------|
| **Offline Store** | Training data generation | Minutes | Columnar (Parquet/Delta) | Point-in-time joins |
| **Online Store** | Real-time inference | <10ms | Key-value (Redis/DynamoDB) | Point lookups |
| **Feature Registry** | Discovery, governance | N/A | Relational/Graph | Metadata queries |

### Materialization Strategies

| Strategy | Freshness | Cost | Complexity | Use Case |
|----------|-----------|------|------------|----------|
| **Batch** | Hours-Days | $ | Low | Historical features |
| **Streaming** | Minutes | $$ | Medium | Near-real-time |
| **On-Demand** | Real-time | $$$ | High | Request-time computation |
| **Pre-computed** | Scheduled | $ | Low | Predictable patterns |

### Feature Types

| Type | Example | Storage | Freshness | Computation |
|------|---------|---------|-----------|-------------|
| **Batch Features** | User lifetime value | Offline | Daily | Batch pipelines |
| **Streaming Features** | Items viewed in last hour | Online | Minutes | Stream processing |
| **On-Demand Features** | Distance to restaurant | Computed | Real-time | Request-time |
| **Entity Features** | User age, country | Both | Stable | Dimension tables |

---

## Architecture Patterns

### Pattern 1: Physical Feature Store (Traditional)

```
┌─────────────────────────────────────────────────────────┐
│                    Architecture                          │
├─────────────────────────────────────────────────────────┤
│  Data Sources → Transformation → Offline Store          │
│                        ↓                                │
│                 Materialization → Online Store          │
│                        ↓                                │
│              Training ← Offline  |  Online → Inference  │
│                                                         │
│  • Data is copied to feature store                      │
│  • Transformation at ingestion time                     │
│  • Best: Production ML, strict SLAs                    │
├─────────────────────────────────────────────────────────┤
│  Latency: <10ms (online) | Freshness: Configurable     │
└─────────────────────────────────────────────────────────┘
```

### Pattern 2: Virtual Feature Store

```
┌─────────────────────────────────────────────────────────┐
│                    Architecture                          │
├─────────────────────────────────────────────────────────┤
│  Query → Feature Definition → Transform at Runtime      │
│                        ↓                                │
│              Read from Source Systems                   │
│                                                         │
│  • No data copying, compute on read                     │
│  • Transformation at query time                         │
│  • Best: Exploration, cost-sensitive                   │
├─────────────────────────────────────────────────────────┤
│  Latency: Higher | Freshness: Real-time                │
└─────────────────────────────────────────────────────────┘
```

### Pattern 3: Hybrid Feature Store (Recommended)

```
┌─────────────────────────────────────────────────────────┐
│                    Architecture                          │
├─────────────────────────────────────────────────────────┤
│  Batch Features:   Source → Materialize → Online/Offline│
│  Streaming:        Stream → Transform → Online          │
│  On-Demand:        Query → Compute at request time      │
│                                                         │
│  • Mix of pre-computed and on-demand                    │
│  • Flexible freshness tiers                             │
│  • Best: Enterprise ML platforms                       │
├─────────────────────────────────────────────────────────┤
│  Latency: <10ms (materialized) | Cost: Optimized       │
└─────────────────────────────────────────────────────────┘
```

---

## Real-World Implementations

| System | Company | Architecture | Key Innovation |
|--------|---------|--------------|----------------|
| **Feast** | Linux Foundation | Open-source, pluggable | Provider abstraction, Python-native |
| **Tecton** | Tecton | Managed, declarative | DSL for feature definitions, real-time transforms |
| **Palette** | Uber | Michelangelo component | FeatureServingGroups, 20K+ features, SLA tiers |
| **Zipline/Chronon** | Airbnb | Batch-first | Train-serve consistency, PIT correctness |
| **Feathr** | LinkedIn | Unified batch/streaming | Spark-native, Azure integration |
| **Vertex AI Feature Store** | Google Cloud | Managed | BigQuery integration, streaming ingestion |
| **SageMaker Feature Store** | AWS | Managed | Tight SageMaker integration |

---

## Key Trade-offs Visualization

```
                       FRESHNESS (Real-time)
                              ▲
                              │
             On-Demand ───────┼─────── Highest
                              │         (compute per request)
           Streaming ─────────┼──────────
                              │          │
           Batch ─────────────┼──────────┼───── Lowest
                              │          │         │
                              └──────────┴─────────┴──► COST
                                  $       $$        $$$

─────────────────────────────────────────────────────────────────

                        CONSISTENCY
                              ▲
                              │
         Offline Store ───────┼─────── Strongest
                              │         (PIT correctness)
         Hybrid ──────────────┼──────────
                              │          │
         Online Only ─────────┼──────────┼───── Weakest
                              │          │         │
                              └──────────┴─────────┴──► LATENCY
                                 100ms    10ms     1ms
```

---

## When to Use a Feature Store

### Use When

- **Feature Reuse**: Multiple models use the same features
- **Train-Serve Consistency**: Need identical features in training and inference
- **Point-in-Time Correctness**: Historical training data must be accurate
- **Team Collaboration**: Data scientists share features across projects
- **Real-Time ML**: Models need sub-10ms feature retrieval
- **Compliance**: Need feature versioning, lineage, and auditing

### Avoid When

- **Single Model**: Only one model consuming features
- **Batch-Only**: All inference is batch, no real-time needs
- **Simple Features**: Features are trivial to compute
- **Early Stage**: Still exploring, not yet in production
- **Small Scale**: <100 features, <1M entities

---

## Interview Readiness Checklist

### Must Know

- [ ] Why Feature Store over ad-hoc pipelines
- [ ] Dual-store architecture (online vs offline)
- [ ] Point-in-time correctness and why it matters
- [ ] Train-serve skew causes and prevention
- [ ] Materialization strategies (batch vs streaming)
- [ ] Basic online store latency requirements

### Should Know

- [ ] Point-in-time join algorithm
- [ ] Feature freshness SLAs and tiers
- [ ] Online store schema design (entity-centric)
- [ ] Backfill strategies for new features
- [ ] Schema evolution challenges
- [ ] Feature monitoring and drift detection

### Nice to Know

- [ ] Late-arriving data handling
- [ ] Streaming feature aggregations (windowed)
- [ ] Multi-tenant feature store architecture
- [ ] Feature store cost optimization
- [ ] Integration with ML pipelines (training, serving)
- [ ] Real-world implementations (Feast, Tecton, Palette)

---

## Related Topics

- [3.14 - Vector Database](../3.14-vector-database/00-index.md) - Embedding storage for feature retrieval
- [3.15 - RAG System](../3.15-rag-system/00-index.md) - Uses features for context
- [3.4 - MLOps Platform](../3.4-mlops-platform/00-index.md) - Feature Store integration
- [3.5 - Uber Michelangelo](../3.5-uber-michelangelo-ml-platform/00-index.md) - Palette Feature Store

---

## References & Further Reading

### Documentation
- [Feast Documentation](https://docs.feast.dev) - Open-source Feature Store
- [Tecton Documentation](https://docs.tecton.ai) - Managed Feature Store
- [Databricks Feature Store](https://docs.databricks.com/machine-learning/feature-store/index.html)

### Engineering Blogs
- [Uber Palette Meta Store Journey](https://www.uber.com/blog/palette-meta-store-journey/) - Uber's feature store evolution
- [Airbnb Chronon](https://medium.com/airbnb-engineering) - Point-in-time correctness
- [LinkedIn Feathr](https://engineering.linkedin.com/blog/2022/open-sourcing-feathr---linkedin-s-feature-store-for-productive-m)

### Papers & Talks
- [Feature Stores for ML - MLOps Community](https://mlops.community/feature-stores-for-real-time-ai-ml-benchmarks-architectures-and-case-studies/)
- [Point-in-Time Correctness](https://apxml.com/courses/feature-stores-for-ml/chapter-3-data-consistency-quality/point-in-time-correctness)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01 | Initial release covering physical, virtual, and hybrid patterns |
