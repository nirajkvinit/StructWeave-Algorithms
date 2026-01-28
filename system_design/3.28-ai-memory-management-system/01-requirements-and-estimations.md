# Requirements and Estimations

## Functional Requirements

### P0 - Must Have (Core Memory Operations)

| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| **Memory Write** | Store memories from conversations | Extract entities, embed text, persist to storage |
| **Memory Read** | Retrieve relevant memories for context | Return top-K memories by relevance score |
| **Memory Types** | Support episodic, semantic, procedural | Different storage and retrieval per type |
| **Context Injection** | Insert memories into LLM prompts | Format memories within token budget |
| **User Isolation** | Separate memories per user | Zero cross-user memory leakage |
| **Session Continuity** | Remember across conversation sessions | Persistent storage with session linking |

### P1 - Should Have (Memory Lifecycle)

| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| **Memory Consolidation** | Compress old memories to save space | Summarize clusters, archive originals |
| **Importance Scoring** | Rank memories by importance | Score = f(recency, frequency, relevance) |
| **Forgetting Mechanism** | Decay low-importance memories | Ebbinghaus curve, configurable decay rate |
| **Hybrid Retrieval** | Combine vector + graph + temporal search | RRF fusion, configurable weights |
| **Memory Update** | Modify existing memories | Handle contradictions, superseding |
| **Deduplication** | Prevent redundant memories | Similarity threshold (0.95) dedup |

### P2 - Nice to Have (Advanced Features)

| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| **Multi-Agent Sharing** | Share memories between agents | Scoped visibility (private/shared/global) |
| **Temporal Queries** | "What did user say last week?" | Bi-temporal indexing, time-range filters |
| **Memory Graphs** | Entity-relationship knowledge graphs | Graph traversal, multi-hop queries |
| **Self-Editing Memory** | Agents update own memories | MemGPT-style tool calls |
| **Contradiction Detection** | Flag conflicting memories | Semantic similarity + temporal analysis |
| **Memory Analytics** | Usage patterns, memory health | Dashboard, retention metrics |

---

## Non-Functional Requirements

### CAP Theorem Choice: AP (Availability + Partition Tolerance)

**Choice:** Availability over Strong Consistency

**Justification:**
- Memory retrieval must be available for every LLM call - blocking on memory failures breaks the agent
- Eventual consistency is acceptable: if a memory write takes 100ms to propagate, the next turn will have it
- Stale memories are acceptable - better to retrieve slightly outdated context than fail entirely
- Memory writes can be async and eventually consistent

**Consistency Model:** Eventual Consistency with Read-Your-Writes guarantee for same session

### Latency Requirements

| Operation | P50 | P95 | P99 | Notes |
|-----------|-----|-----|-----|-------|
| **Memory Retrieval** | 30ms | 100ms | 200ms | Must fit in LLM call latency budget |
| **Memory Write** | 50ms | 200ms | 500ms | Can be async after response |
| **Context Injection** | 5ms | 10ms | 20ms | Formatting already-retrieved memories |
| **Consolidation** | 5s | 15s | 30s | Background async job |
| **Embedding Generation** | 20ms | 50ms | 100ms | Per memory, batchable |

### Availability Requirements

| Tier | Target | Downtime/Year | Applicable To |
|------|--------|---------------|---------------|
| **Memory Read** | 99.95% | 4.4 hours | Critical path for LLM |
| **Memory Write** | 99.9% | 8.8 hours | Can retry async |
| **Consolidation** | 99.5% | 1.8 days | Background, recoverable |
| **Analytics** | 99.0% | 3.7 days | Non-critical |

### Durability Requirements

| Requirement | Target | Implementation |
|-------------|--------|----------------|
| **Memory Persistence** | 99.999% | Replicated storage, WAL |
| **Write Acknowledgment** | At least 1 replica | Async replication |
| **Backup Frequency** | Every 1 hour | Incremental snapshots |
| **Point-in-Time Recovery** | 7 days | Transaction logs |

### Scalability Requirements

| Dimension | Target | Strategy |
|-----------|--------|----------|
| **Users** | 10M concurrent | Horizontal sharding by user_id |
| **Memories** | 10B total | Partitioned vector indices |
| **QPS (Read)** | 10K | Cached hot memories, read replicas |
| **QPS (Write)** | 2K | Async queue, batch embedding |
| **Memory Size** | 100KB max | Chunking for larger content |

---

## Capacity Estimations

### Scale Assumptions

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Active Users** | 10M | Enterprise + consumer mix |
| **Memories per User** | 1,000 average | Power users: 10K, casual: 100 |
| **Memory Content Size** | 500 bytes average | Ranges from 50B facts to 2KB conversations |
| **Embedding Dimension** | 1,536 | text-embedding-3-small standard |
| **Queries per User/Day** | 50 | ~5 conversations × 10 turns |
| **Writes per User/Day** | 10 | Not every turn creates memory |
| **Graph Edges per Memory** | 3 average | Relationships to other entities |

### Storage Calculations

| Component | Calculation | Result |
|-----------|-------------|--------|
| **Total Memories** | 10M users × 1,000 memories | **10 billion memories** |
| **Raw Content Storage** | 10B × 500 bytes | **5 TB** |
| **Embedding Storage** | 10B × 1,536 × 4 bytes (float32) | **61.4 TB** |
| **Metadata Storage** | 10B × 200 bytes | **2 TB** |
| **Graph Edges** | 10B × 3 edges × 50 bytes | **1.5 TB** |
| **Indexes** | ~20% of data | **14 TB** |
| **Total Storage** | Sum + replication (3x) | **~250 TB** |

### Throughput Calculations

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Daily Queries** | 10M users × 50 queries | 500M queries/day |
| **Average QPS** | 500M / 86,400 | **~6,000 QPS** |
| **Peak QPS** | 3x average | **~18,000 QPS** |
| **Daily Writes** | 10M users × 10 writes | 100M writes/day |
| **Write QPS** | 100M / 86,400 | **~1,200 QPS** |
| **Peak Write QPS** | 3x average | **~3,600 QPS** |

### Embedding Computation

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Daily Embeddings** | 100M new memories | 100M embeddings/day |
| **Embedding QPS** | 100M / 86,400 | **~1,200 QPS** |
| **Embedding Latency** | 20ms per embedding | Batchable to 100/request |
| **Embedding Batch QPS** | 1,200 / 100 | **12 batch requests/sec** |

### Memory Growth Projections

| Timeframe | Users | Memories | Storage |
|-----------|-------|----------|---------|
| **Month 1** | 100K | 100M | 2.5 TB |
| **Month 6** | 1M | 1B | 25 TB |
| **Year 1** | 5M | 5B | 125 TB |
| **Year 2** | 10M | 10B | 250 TB |
| **Year 3** | 15M | 15B | 375 TB |

*Note: Consolidation reduces growth by 20-40% over time.*

---

## SLOs and SLAs

### Service Level Objectives (SLOs)

| Metric | SLO | Measurement Window | Alerting Threshold |
|--------|-----|--------------------|--------------------|
| **Retrieval Latency (p95)** | < 100ms | 5 minutes | > 150ms |
| **Retrieval Availability** | 99.95% | 30 days | < 99.9% (7 days) |
| **Write Latency (p95)** | < 200ms | 5 minutes | > 300ms |
| **Write Availability** | 99.9% | 30 days | < 99.8% (7 days) |
| **Retrieval Relevance** | > 90% | Weekly sample | < 85% |
| **Extraction Accuracy** | > 85% | Weekly sample | < 80% |
| **Error Rate** | < 0.1% | 1 hour | > 0.5% |

### Service Level Agreements (SLAs) - Enterprise Tier

| Metric | SLA | Penalty |
|--------|-----|---------|
| **Monthly Availability** | 99.9% | 10% credit per 0.1% below |
| **Retrieval Latency (p99)** | < 200ms | 5% credit if exceeded >5% of time |
| **Data Durability** | 99.999% | Full refund for data loss |
| **Support Response** | < 1 hour (P1) | Escalation to engineering |

### Error Budget

| Error Type | Budget/Month | Current | Status |
|------------|--------------|---------|--------|
| **Retrieval Failures** | 0.05% (43 min) | 0.02% | Healthy |
| **Write Failures** | 0.1% (43 min) | 0.05% | Healthy |
| **Latency Violations** | 5% of requests | 2% | Healthy |

---

## Capacity Planning Scenarios

### Scenario 1: Normal Load

```
Users: 5M active
QPS: 3,000 read, 600 write
Latency: p95 < 50ms
Infrastructure: 20 API pods, 10 vector DB nodes
```

### Scenario 2: Peak Load (3x)

```
Users: 15M active (viral event)
QPS: 18,000 read, 3,600 write
Latency: p95 < 100ms (SLO limit)
Infrastructure: 60 API pods, 30 vector DB nodes
Action: Auto-scale triggered at 70% capacity
```

### Scenario 3: Memory-Intensive Users

```
Power users: 100K with 10K+ memories each
Total: 1B+ memories from 1% of users
Impact: Hot-spot sharding required
Action: User-based sharding with dedicated resources for power users
```

### Scenario 4: Consolidation Backlog

```
Trigger: Storage > 80% capacity
Memories to consolidate: 2B (20% of total)
Timeline: 48 hours background processing
Compute: 50 consolidation workers
Expected reduction: 40% storage savings
```

---

## Cost Estimations

### Infrastructure Costs (Monthly at Year 1 Scale)

| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| **Vector Database** | 125 TB, 10K QPS | $25,000 |
| **Graph Database** | 1.5 TB, 2K QPS | $5,000 |
| **PostgreSQL** | 5 TB, metadata | $3,000 |
| **Redis Cache** | 100 GB, hot memories | $2,000 |
| **API Servers** | 20 pods × 4 vCPU | $4,000 |
| **Embedding Service** | GPU instances | $8,000 |
| **Object Storage** | 50 TB archive | $1,000 |
| **Network** | Inter-region, CDN | $2,000 |
| **Total** | | **~$50,000/month** |

### Variable Costs

| Item | Unit Cost | Monthly Volume | Cost |
|------|-----------|----------------|------|
| **Embedding API** | $0.02/1M tokens | 10B tokens | $200 |
| **LLM Extraction** | $0.15/1M tokens | 500M tokens | $75 |
| **Bandwidth** | $0.05/GB | 10 TB | $500 |

### Cost per User

| Scale | Total Cost | Cost/User/Month |
|-------|------------|-----------------|
| **1M users** | $20,000 | $0.02 |
| **5M users** | $35,000 | $0.007 |
| **10M users** | $50,000 | $0.005 |

*Economies of scale reduce per-user cost significantly.*

---

## Requirements Traceability Matrix

| Requirement | Priority | SLO | Measurement | Owner |
|-------------|----------|-----|-------------|-------|
| Memory retrieval < 100ms | P0 | 99.95% < 100ms | APM metrics | Platform |
| Memory write durability | P0 | 99.999% | Storage replication | Storage |
| User isolation | P0 | Zero cross-user leakage | Security audit | Security |
| Consolidation efficiency | P1 | 40% storage reduction | Weekly report | Platform |
| Multi-agent sharing | P2 | Functional | Feature flag | Product |
| Temporal queries | P2 | < 200ms | APM metrics | Platform |
