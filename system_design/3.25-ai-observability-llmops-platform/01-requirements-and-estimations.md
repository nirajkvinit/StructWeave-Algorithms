# Requirements and Estimations

## Functional Requirements

### Core Features (Must Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Distributed Tracing** | Capture LLM calls, chains, and agent workflows as hierarchical spans with parent-child relationships | P0 |
| **Token Accounting** | Count input/output tokens per request with per-model accuracy | P0 |
| **Cost Calculation** | Real-time cost computation using model-specific pricing tables | P0 |
| **Prompt-Completion Linkage** | Associate prompts with completions, versions, and metadata | P0 |
| **Latency Profiling** | Track TTFT (Time to First Token), TPOT (Time Per Output Token), and end-to-end latency | P0 |
| **Multi-Tenant Isolation** | Strict data and cost separation per organization | P0 |
| **Query API** | Search, filter, and aggregate traces by attributes and time ranges | P0 |
| **Dashboards** | Visual representation of usage, cost, and quality metrics | P0 |

### Extended Features (Should Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Hallucination Detection** | Automated scoring via semantic entropy or LLM-as-Judge | P1 |
| **Evaluation Pipelines** | Batch and real-time evaluation with human-in-loop support | P1 |
| **Prompt Versioning** | Version control, A/B comparison, and rollback capability | P1 |
| **Budget Management** | Hierarchical limits (org → team → key) with alerts | P1 |
| **Alerting** | Threshold-based and anomaly detection alerts | P1 |
| **SDK Libraries** | Instrumentation SDKs for Python, TypeScript, Go | P1 |
| **Semantic Search** | Find similar traces/prompts using vector embeddings | P2 |
| **Export & Integration** | Export data to BI tools, integrate with alerting systems | P2 |

### Out of Scope

| Feature | Reason | Related System |
|---------|--------|----------------|
| LLM inference execution | Separate concern | [3.23 LLM Inference Engine](../3.23-llm-inference-engine/00-index.md) |
| Prompt template management | Covered elsewhere | [3.21 LLM Gateway](../3.21-llm-gateway-prompt-management/00-index.md) |
| Safety/guardrails execution | Covered elsewhere | [3.22 AI Guardrails](../3.22-ai-guardrails-safety-system/00-index.md) |
| Model training | Different domain | [3.4 MLOps Platform](../3.4-mlops-platform/00-index.md) |
| Feature store | Different domain | [3.16 Feature Store](../3.16-feature-store/00-index.md) |

---

## Non-Functional Requirements

### CAP Theorem Choice

**Choice: AP (Availability + Partition Tolerance) with Eventual Consistency**

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Consistency** | Eventual | Telemetry data can tolerate brief lag; billing reconciles end-of-day |
| **Availability** | High | Dropping traces is unacceptable for debugging production issues |
| **Partition Tolerance** | Required | Distributed ingestion across regions |

**Exception**: Budget enforcement requires strong consistency to prevent overspend.

### Consistency Models by Component

| Component | Consistency Model | Rationale |
|-----------|-------------------|-----------|
| Trace ingestion | Eventually consistent | High throughput > immediate visibility |
| Cost aggregation | Eventually consistent | Billing reconciles hourly/daily |
| Budget enforcement | Strongly consistent | Must prevent overspend immediately |
| Evaluation scores | Eventually consistent | Batch processing acceptable |
| Dashboard queries | Read-after-write (same session) | User expects to see recent traces |
| Prompt versions | Strongly consistent | A/B tests need exact version tracking |

### Availability Targets

| Tier | Component | Availability | Downtime/Year | Justification |
|------|-----------|--------------|---------------|---------------|
| Tier 1 | Ingestion pipeline | 99.95% | 4.4 hours | Data loss unacceptable |
| Tier 1 | Cost tracking | 99.95% | 4.4 hours | Billing accuracy critical |
| Tier 2 | Query API | 99.9% | 8.7 hours | Debugging can tolerate brief outages |
| Tier 2 | Evaluation engine | 99.9% | 8.7 hours | Async processing can retry |
| Tier 3 | Dashboard UI | 99.5% | 1.8 days | Degraded mode acceptable |

### Latency Targets

| Operation | P50 | P95 | P99 | Notes |
|-----------|-----|-----|-----|-------|
| **SDK Instrumentation** | | | | |
| Span creation overhead | 1ms | 3ms | 5ms | Must not slow down LLM apps |
| Batch flush to collector | 50ms | 100ms | 200ms | Background operation |
| **Ingestion Pipeline** | | | | |
| Collector to storage | 500ms | 2s | 5s | End-to-end ingestion |
| Cost calculation | 10ms | 50ms | 100ms | Inline enrichment |
| **Query Operations** | | | | |
| Recent traces (< 24h) | 50ms | 150ms | 300ms | Hot tier queries |
| Historical traces (> 7d) | 500ms | 2s | 5s | Warm tier queries |
| Aggregation queries | 200ms | 1s | 3s | Dashboard panels |
| **Evaluation** | | | | |
| Real-time (rules/regex) | 5ms | 20ms | 50ms | Inline checks |
| Near-real-time (LLM-as-Judge) | 500ms | 2s | 5s | Async scoring |
| Batch evaluation | Minutes | - | - | Background processing |

### Durability Guarantees

| Data Type | Durability | Strategy | RPO |
|-----------|------------|----------|-----|
| Raw traces | 99.999% | Replicated log + columnar storage | 1 minute |
| Aggregated metrics | 99.9999% | Time-series with replication | 5 minutes |
| Prompt versions | 99.9999% | Versioned object storage with snapshots | 0 (sync write) |
| Evaluation results | 99.999% | Replicated database | 5 minutes |
| Audit logs | 99.9999% | Immutable append-only log | 0 (sync write) |

---

## Capacity Estimations

### Input Assumptions

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Target customer segment | Enterprise SaaS | Multi-tenant, diverse workloads |
| Organizations | 1,000 | Mid-sized observability vendor |
| Applications per organization | 100 | Diverse use cases (chatbots, agents, RAG) |
| LLM calls per application per day | 10,000 | Average across high and low usage apps |
| Spans per LLM call | 3 | Root span + LLM call + tool/retrieval |
| Average tokens per call | 1,500 | 1,000 input + 500 output (typical) |
| Peak traffic multiplier | 4-5x | Business hours surge |

### Traffic Calculations

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Daily Volume** | | |
| Total LLM calls/day | 1,000 orgs × 100 apps × 10,000 calls | **1 billion** |
| Total spans/day | 1B calls × 3 spans | **3 billion** |
| Total tokens/day | 1B calls × 1,500 tokens | **1.5 trillion** |
| **Throughput** | | |
| Average QPS (spans) | 3B spans / 86,400 seconds | **34,722 spans/s** |
| Peak QPS (spans) | 34,722 × 5 | **173,611 spans/s** |
| Average QPS (calls) | 1B calls / 86,400 seconds | **11,574 calls/s** |
| Peak QPS (calls) | 11,574 × 5 | **57,870 calls/s** |

### Storage Estimations

| Data Type | Size per Unit | Daily Volume | Storage/Day | Notes |
|-----------|---------------|--------------|-------------|-------|
| **Trace Spans** | 500 bytes (compressed) | 3B spans | 1.5 TB | ClickHouse with LZ4 |
| **Prompt/Completion** | 1 KB (compressed) | 1B records | 1 TB | Object storage, deduplicated |
| **Aggregated Metrics** | 100 bytes | 100M data points | 10 GB | Time-series pre-aggregations |
| **Evaluation Results** | 200 bytes | 100M evaluations | 20 GB | Subset of traces evaluated |
| **Embeddings** | 1.5 KB (768-dim float16) | 100M prompts | 150 GB | For semantic search |
| **Total per Day** | | | **~2.7 TB** | |

### Storage Retention & Tiers

| Tier | Retention | Data Volume | Storage Type | Query Latency |
|------|-----------|-------------|--------------|---------------|
| Hot | 7 days | 19 TB | NVMe SSD | < 100ms |
| Warm | 30 days | 81 TB | SSD | < 1s |
| Cold | 365 days | 900 TB | Object Storage | < 10s |
| Archive | 7 years | ~6 PB | Glacier-class | Minutes |

### Annual Storage Projection

| Year | Organizations | Calls/Day | Storage/Year | Cumulative |
|------|---------------|-----------|--------------|------------|
| Year 1 | 1,000 | 1B | 900 TB | 900 TB |
| Year 2 | 2,500 | 3B | 2.7 PB | 3.6 PB |
| Year 3 | 5,000 | 8B | 7.2 PB | 10.8 PB |
| Year 5 | 15,000 | 25B | 22.5 PB | 50+ PB |

### Bandwidth Estimations

| Flow | Payload Size | Rate (Peak) | Bandwidth |
|------|--------------|-------------|-----------|
| Telemetry ingestion | 2 KB/call | 60K calls/s | 120 MB/s |
| Internal replication | 2 KB/span | 175K spans/s | 350 MB/s |
| Dashboard queries | 10 KB/query | 10K queries/s | 100 MB/s |
| Evaluation pipeline | 5 KB/eval | 5K evals/s | 25 MB/s |
| **Total Peak Inbound** | | | **~500 MB/s** |

### Compute Estimations

| Component | Instance Type | Count | Scaling Factor |
|-----------|---------------|-------|----------------|
| Ingestion collectors | 8 vCPU, 16 GB | 30 | QPS-based |
| Stream processors | 16 vCPU, 32 GB | 20 | Kafka partitions |
| ClickHouse nodes | 32 vCPU, 128 GB, NVMe | 12 | Storage + query load |
| Query API servers | 8 vCPU, 16 GB | 20 | Query QPS |
| Evaluation workers | 16 vCPU, 32 GB | 15 | Evaluation backlog |
| Dashboard servers | 4 vCPU, 8 GB | 10 | User sessions |

---

## SLOs and SLAs

### Service Level Objectives

| Metric | Target | Measurement Window | Error Budget |
|--------|--------|-------------------|--------------|
| **Ingestion Success Rate** | 99.95% | Rolling 1 hour | 0.05% |
| **Query P95 Latency** | < 200ms | Rolling 1 hour | 5% over threshold |
| **Data Freshness** | < 30 seconds | 95th percentile | 5% stale |
| **Evaluation Accuracy** | > 90% human correlation | Weekly sampling | 10% deviation |
| **Cost Attribution Accuracy** | 99.9% | Monthly reconciliation | 0.1% discrepancy |
| **Dashboard Availability** | 99.5% | Rolling 24 hours | 0.5% downtime |

### SLO Measurement Queries

```
# Ingestion Success Rate
rate(llmops_spans_processed_total{status="success"}[1h]) /
rate(llmops_spans_received_total[1h])

# Query Latency P95
histogram_quantile(0.95, rate(llmops_query_duration_seconds_bucket[1h]))

# Data Freshness
llmops_ingestion_lag_seconds{quantile="0.95"}
```

### Scaling Triggers

| Metric | Scale-Up Trigger | Scale-Down Trigger | Cooldown |
|--------|------------------|-------------------|----------|
| Ingestion queue depth | > 100K pending | < 10K pending | 5 min |
| Query latency P95 | > 300ms for 5 min | < 100ms for 15 min | 10 min |
| CPU utilization | > 70% for 5 min | < 30% for 15 min | 10 min |
| Memory utilization | > 80% for 5 min | < 50% for 15 min | 10 min |
| Storage utilization | > 80% | < 50% | 1 hour |
| Kafka consumer lag | > 100K messages | < 10K messages | 5 min |

---

## Cost Estimation

### Infrastructure Costs (Monthly)

| Component | Specification | Count | Unit Cost | Monthly Cost |
|-----------|---------------|-------|-----------|--------------|
| ClickHouse nodes | 32 vCPU, 128 GB, 2 TB NVMe | 12 | $2,500 | $30,000 |
| Kafka cluster | 16 vCPU, 64 GB, 1 TB SSD | 6 | $1,500 | $9,000 |
| Time-series DB | 16 vCPU, 64 GB | 4 | $1,000 | $4,000 |
| Application servers | 8-16 vCPU, 16-32 GB | 100 | $300 | $30,000 |
| Object storage | 100 TB (warm) | - | $0.023/GB | $2,300 |
| Network egress | 500 TB/month | - | $0.05/GB | $25,000 |
| **Total Infrastructure** | | | | **~$100,000/month** |

### LLM Evaluation Costs (Monthly)

| Evaluation Type | Volume | Model | Cost per 1K tokens | Monthly Cost |
|-----------------|--------|-------|-------------------|--------------|
| LLM-as-Judge | 100M spans × 10% sampled | GPT-4o-mini | $0.15 input, $0.60 output | $15,000 |
| Embedding generation | 100M prompts | text-embedding-3-small | $0.02 per 1K tokens | $3,000 |
| **Total LLM Costs** | | | | **~$18,000/month** |

### Cost per Customer

| Customer Tier | LLM Calls/Month | Platform Cost | Target Margin | Price Point |
|---------------|-----------------|---------------|---------------|-------------|
| Starter | 1M | ~$50 | 80% | $250/month |
| Growth | 10M | ~$200 | 75% | $800/month |
| Enterprise | 100M | ~$1,000 | 70% | $3,500/month |
| Unlimited | 1B+ | ~$5,000 | 60% | Custom |
