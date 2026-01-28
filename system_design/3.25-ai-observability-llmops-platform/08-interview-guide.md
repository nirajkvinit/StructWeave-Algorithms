# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Deliverables |
|------|-------|-------|--------------|
| **0-5 min** | Clarify | Scope the problem, ask questions | Written list of requirements |
| **5-15 min** | High-Level Design | Core components, data flow | Architecture diagram on whiteboard |
| **15-30 min** | Deep Dive | 1-2 critical components | Detailed design with trade-offs |
| **30-40 min** | Scale & Reliability | Bottlenecks, failure scenarios | Scaling strategy, failure modes |
| **40-45 min** | Wrap Up | Summary, handle follow-ups | Key decisions recap |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **Non-Deterministic Outputs**
   - Unlike traditional observability (request → response), LLM outputs vary
   - "Correct" behavior is subjective and context-dependent
   - Quality metrics require semantic understanding, not just latency

2. **High-Cardinality Telemetry**
   - Every prompt is potentially unique (billions of unique values)
   - Traditional time-series databases fail with unbounded cardinality
   - Content-addressed storage is a key architectural insight

3. **Expensive Evaluation**
   - LLM-as-Judge costs money (~$0.002 per evaluation)
   - Full coverage at scale would cost millions/month
   - Sampling and tiering are essential

4. **Privacy by Default**
   - Prompts contain user data, PII, sensitive content
   - Can't just "log everything"
   - Redaction must be built into the core pipeline

5. **Agentic Workflow Complexity**
   - Agent traces span minutes to hours
   - Spans arrive out of order from distributed systems
   - Trace assembly requires stateful processing with timeouts

### Where to Spend Most Time (Based on Interviewer Focus)

| Interviewer Emphasis | Deep Dive Focus | Key Talking Points |
|---------------------|-----------------|-------------------|
| **Cost/FinOps** | Token accounting, attribution | Hierarchical budgets, real-time enforcement |
| **Quality/ML** | Hallucination detection, eval | Semantic entropy, LLM-as-Judge, tiered evaluation |
| **Scale/Infrastructure** | Storage, query performance | ClickHouse, sharding, high-cardinality handling |
| **Security/Compliance** | PII, GDPR | Redaction pipeline, encryption, deletion |
| **AI Company Interviewer** | Agent tracing, OTel | GenAI conventions, trace assembly, MCP |

---

## Clarifying Questions to Ask

### Essential Questions (Always Ask)

| Question | Why It Matters |
|----------|----------------|
| What's the expected trace volume? (1M/day vs 1B/day) | 100x difference changes architecture (sharding, sampling) |
| Multi-tenant SaaS or single-tenant enterprise? | Isolation, cost attribution complexity |
| Real-time evaluation required or batch acceptable? | Latency requirements, evaluation architecture |
| Which quality metrics matter most? | Hallucination, relevance, safety—each has different approaches |
| What's the latency budget for instrumentation overhead? | SDK design constraints |

### Good Follow-Up Questions

| Question | Signal You're Sending |
|----------|----------------------|
| Do we need to store prompt content or just metadata? | Privacy awareness |
| What's the cost attribution accuracy requirement? | Understanding of real-time vs eventual consistency |
| Are there agentic workflows with long-running traces? | Understanding of trace assembly complexity |
| What's the geographic distribution of users? | Multi-region considerations |
| Do customers need to self-host? | Deployment model awareness |

---

## Key Trade-offs Discussion

### Trade-off 1: OpenTelemetry vs Proprietary Instrumentation

| Aspect | OpenTelemetry | Proprietary SDK |
|--------|---------------|-----------------|
| **Portability** | Vendor-neutral, switch backends | Lock-in |
| **Ecosystem** | Growing auto-instrumentation | Custom development |
| **Standards** | GenAI conventions emerging | Full control over schema |
| **Complexity** | More concepts to learn | Simpler, focused API |
| **Time to Value** | Longer (learn OTel) | Faster (purpose-built) |

**Recommendation:** OpenTelemetry with GenAI semantic conventions.

**Why:** Industry converging on OTel. GenAI conventions provide standardization. Ecosystem benefits outweigh learning curve. Can extend with custom attributes.

### Trade-off 2: ClickHouse vs Elasticsearch for Traces

| Aspect | ClickHouse | Elasticsearch |
|--------|------------|---------------|
| **Compression** | 10-15x (excellent) | 3-5x (good) |
| **Aggregation Speed** | Optimized for analytics | Slower for aggregations |
| **Full-Text Search** | Limited | Excellent |
| **Cost at Scale** | Lower | Higher |
| **Operational Complexity** | Moderate | Higher |

**Recommendation:** ClickHouse + Vector DB for semantic search.

**Why:** Observability is aggregation-heavy, not full-text search. ClickHouse compression reduces storage 5x. Use vector DB for semantic similarity when needed.

### Trade-off 3: Real-Time vs Batch Evaluation

| Aspect | Real-Time | Batch |
|--------|-----------|-------|
| **Latency** | Adds to request path | No impact |
| **Cost** | Higher (can't batch LLM calls) | Lower (efficient batching) |
| **Coverage** | Limited (expensive to evaluate all) | Full (can evaluate everything) |
| **Accuracy** | May use faster/cheaper model | Can use best model |
| **Use Case** | Safety gates, format checks | Quality metrics, analysis |

**Recommendation:** Tiered—real-time for safety/format, batch for comprehensive quality.

**Why:** Real-time evaluation for 1B spans/day would cost $2M+ monthly. Tiering reduces to ~$50K while maintaining safety coverage.

### Trade-off 4: Full Content Storage vs Metadata Only

| Aspect | Store Full Content | Metadata Only |
|--------|-------------------|----------------|
| **Debugging** | Complete context available | Must reconstruct |
| **Privacy Risk** | Higher (sensitive data stored) | Lower |
| **Storage Cost** | Very high (10x metadata) | Low |
| **Compliance** | Harder (must redact/delete) | Easier |
| **Semantic Search** | Available | Not available |

**Recommendation:** Content-addressed storage with configurable retention.

**Why:** Hash prompt content, store separately with shorter TTL. Get deduplication (60% savings), separate retention, and deletion simplicity.

### Trade-off 5: Head-Based vs Tail-Based Sampling

| Aspect | Head-Based | Tail-Based |
|--------|------------|------------|
| **Implementation** | Simple (decide at start) | Complex (buffer entire trace) |
| **Consistency** | All spans of trace sampled together | Can be partial |
| **Selection** | Random or priority-based | Based on trace outcome |
| **Memory** | Low | High (buffer traces) |
| **Best For** | Consistent sampling | Error/slow trace focus |

**Recommendation:** Head-based with always-sample rules.

**Why:** Simpler, lower memory. Add rules to always sample errors, high-cost, slow requests. Covers 95% of interesting traces with 10x less complexity than tail-based.

---

## Trap Questions and How to Handle

### Trap 1: "How do you handle 1 trillion tokens per day?"

**What Interviewer Wants:** Understand you know sampling is mandatory at scale.

**Bad Answer:** "We'll just add more servers and store everything."

**Good Answer:**
> "At that scale, storing every trace isn't economically feasible. The key insights are:
>
> 1. **Adaptive sampling**: 0.1-1% for normal requests
> 2. **Always-sample rules**: 100% of errors, high-cost (> $0.10), slow (> 30s) requests
> 3. **Head-based sampling**: Consistent decision at trace start using trace_id hash
> 4. **Aggregations always**: Store metrics even when dropping raw traces
>
> At 0.1% sampling of 1T tokens, we're still sampling 1B tokens/day—plenty for debugging while keeping costs manageable."

### Trap 2: "How accurate is your hallucination detection?"

**What Interviewer Wants:** Understand this is an open research problem.

**Bad Answer:** "Our system detects hallucinations with 99% accuracy."

**Good Answer:**
> "Hallucination detection is fundamentally imperfect—it's an active research area. Current methods:
>
> 1. **Semantic entropy**: 70-80% correlation with human judgment
> 2. **LLM-as-Judge**: 80-85% but expensive and has its own biases
> 3. **RAG grounding check**: Higher accuracy (85-90%) but only for RAG use cases
>
> The practical approach is combining signals and calibrating against periodic human evaluation. We also differentiate factual hallucination from stylistic variance—the former matters more."

### Trap 3: "Why not just use Prometheus for this?"

**What Interviewer Wants:** Understand the high-cardinality problem.

**Bad Answer:** "Prometheus would work fine, it's industry standard."

**Good Answer:**
> "Prometheus struggles with high-cardinality data. Each unique prompt would create a new time series. With 1M unique prompts, that's 1M series—Prometheus starts degrading above 100K series.
>
> The solution is:
> 1. Store prompt content separately (ClickHouse, object storage)
> 2. Use content hashes as labels (bounded to unique content)
> 3. Pre-aggregate common dimensions (model, org, time bucket)
>
> Metrics stay low-cardinality, content is queryable via a different path."

### Trap 4: "How do you handle GDPR right-to-erasure?"

**What Interviewer Wants:** Privacy and compliance awareness.

**Bad Answer:** "We just delete the user's data when requested."

**Good Answer:**
> "Right-to-erasure for LLM telemetry is more complex than typical systems:
>
> 1. **User ID indexing**: We index spans by hashed user_id for efficient lookup
> 2. **Cascade delete**: Delete spans, then referenced content by content_hash
> 3. **Verification**: Confirm deletion across all storage tiers (hot, warm, cold)
> 4. **Audit trail**: Log the deletion itself (required for compliance proof)
>
> One subtlety: aggregated metrics can remain if they're truly anonymized (no user_id dimension). We also offer configurable retention—shorter TTL means less to delete."

### Trap 5: "How do you attribute cost when requests are cached?"

**What Interviewer Wants:** Understanding of nuanced cost tracking.

**Bad Answer:** "Cached responses are free, so we don't charge for them."

**Good Answer:**
> "Cached responses require careful cost modeling:
>
> 1. **Original request**: Full LLM cost attributed to original requester
> 2. **Cache hits**: Zero LLM cost, but small infrastructure cost (storage, lookup)
> 3. **Shared cache**: Amortize savings across benefiting applications
>
> For billing, we track two metrics separately:
> - **LLM cost**: What we pay providers (zero for cache hits)
> - **Effective cost**: What customer pays (may include cache infrastructure)
>
> This lets us show customers their cache savings while maintaining accurate cost attribution."

### Trap 6: "What if your evaluation system starts hallucinating?"

**What Interviewer Wants:** Meta-level thinking about reliability.

**Good Answer:**
> "Great question—LLM-as-Judge can indeed hallucinate or drift. Mitigations:
>
> 1. **Ground truth sampling**: Periodically compare LLM-as-Judge to human evaluators
> 2. **Calibration**: Track judge model agreement with historical human labels
> 3. **Multiple judges**: For critical evaluations, use 2-3 different models and ensemble
> 4. **Confidence thresholds**: Only trust high-confidence scores, flag uncertain ones for human review
> 5. **Version pinning**: Pin judge model version, A/B test before upgrading
>
> We also monitor judge score distributions—sudden shifts indicate model or data issues."

### Trap 7: "How do you handle long-running agent traces that span hours?"

**What Interviewer Wants:** Understanding of trace assembly complexity.

**Good Answer:**
> "Long-running traces are a unique challenge in LLM observability:
>
> 1. **Buffering with timeout**: Buffer spans in memory with 5-minute default timeout
> 2. **Partial emission**: For traces > 60 minutes, emit partial traces every 100 spans
> 3. **Completeness heuristics**: Root span ended + 30s gap + all parents resolved = complete
> 4. **Tiered storage**: Hot (memory) → Warm (Redis) → Stream (periodic emit)
>
> The key insight is that perfect trace assembly isn't always necessary. Partial traces with clear status (COMPLETE, PARTIAL_TIMEOUT, PARTIAL_OVERFLOW) are still useful for debugging."

---

## Quick Reference Card

### Core Architecture (Draw This First)

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ Application │─────▶│   OTel SDK  │─────▶│  Collector  │
│  (LLM App)  │      │ (GenAI ext) │      │ (validate)  │
└─────────────┘      └─────────────┘      └──────┬──────┘
                                                  │
                                          ┌───────▼───────┐
                                          │     Kafka     │
                                          │ (partitioned) │
                                          └───────┬───────┘
                                                  │
┌─────────────┐      ┌─────────────┐      ┌───────▼───────┐
│  Dashboard  │◀─────│  Query API  │◀─────│   ClickHouse  │
│             │      │   (cache)   │      │   (sharded)   │
└─────────────┘      └─────────────┘      └───────────────┘
                             │
                     ┌───────▼───────┐
                     │  Evaluation   │
                     │    Engine     │
                     └───────────────┘
```

### GenAI Semantic Conventions (Key Attributes)

| Attribute | Example |
|-----------|---------|
| `gen_ai.system` | `openai`, `anthropic`, `bedrock` |
| `gen_ai.request.model` | `gpt-4o` |
| `gen_ai.response.model` | `gpt-4o-2024-05-13` |
| `gen_ai.usage.input_tokens` | `1500` |
| `gen_ai.usage.output_tokens` | `500` |
| `gen_ai.response.finish_reasons` | `["stop"]` |

### Key Numbers to Know

| Metric | Target | Why |
|--------|--------|-----|
| SDK overhead | < 10ms P99 | Don't slow down LLM apps |
| Ingestion latency | < 5s | Near-real-time visibility |
| Query latency (recent) | < 300ms P99 | Responsive dashboards |
| Cost attribution accuracy | 99.9% | Billing trust |
| Storage compression | 10-15x | Cost efficiency |
| Sampling rate at scale | 0.1-1% | Balance coverage vs. cost |

### Three Critical Flows

1. **Trace Ingestion**: SDK → Collector → Kafka → Processor → ClickHouse
2. **Cost Attribution**: Span → Price Lookup → Hierarchical Sum → Budget Check
3. **Evaluation**: Span → Real-Time Rules → (sampled) → LLM-as-Judge → Store

---

## Sample Answer Skeleton

### Opening (2-3 min)

> "Before I start, let me clarify a few things:
>
> 1. What's the expected scale—number of organizations, LLM calls per day?
> 2. Is this multi-tenant SaaS or single-tenant?
> 3. Do we need real-time quality evaluation or is batch acceptable?
>
> [Wait for answers]
>
> Given those requirements, I'll design an LLMOps observability platform that provides distributed tracing, cost attribution, and quality evaluation for LLM applications. I'll build on OpenTelemetry standards since that's the emerging industry norm for AI observability."

### High-Level Design (10 min)

> "Let me start with the core architecture. [Draw diagram]
>
> The main components are:
>
> 1. **Instrumentation SDK**: OTel-based with GenAI semantic conventions—captures model, tokens, latency
> 2. **Ingestion Pipeline**: Collectors → Kafka → Stream processors. Kafka provides durability and decoupling.
> 3. **Storage Layer**: ClickHouse for traces (columnar, great compression), time-series for metrics
> 4. **Evaluation Engine**: Tiered—real-time rules for safety, batch LLM-as-Judge for quality
> 5. **Query Layer**: GraphQL API with caching, powers dashboards
>
> The key architectural insight is handling high-cardinality data. Prompts are unique—we can't use them as metric labels. Instead, we hash content and store separately. This keeps metrics low-cardinality while preserving content for debugging."

### Deep Dive (15 min)

> "Let me deep-dive on **cost attribution**, which is critical for multi-tenant:
>
> [Explain token counting, pricing table lookup, hierarchical attribution]
>
> The hierarchy is: Request → Application → Team → Organization
>
> Each level can have budgets:
> - Hard limits: Block requests when exceeded
> - Soft limits: Alert but allow
>
> The key challenge is real-time accuracy. We use pessimistic reservation:
> 1. Before LLM call, reserve estimated max cost
> 2. After response, finalize with actual cost
> 3. Release unused reservation
>
> This prevents concurrent requests from exceeding budget.
>
> For billing, we separate 'LLM cost' (what we pay providers) from 'effective cost' (what customer pays). Cache hits reduce LLM cost but may still incur infrastructure cost."

### Scale & Reliability (10 min)

> "For 1B traces/day:
>
> **Ingestion**: Kafka with 100+ partitions, partitioned by org_id for locality. Stream processors scale with partition count.
>
> **Storage**: ClickHouse sharded by org_id. Each shard has 2 replicas across AZs. Tiered storage: 7 days hot (NVMe), 90 days warm (SSD), archive to object storage.
>
> **Reliability**:
> - Kafka replication factor 3, min ISR 2
> - ClickHouse ReplicatedMergeTree
> - Circuit breakers on evaluation (LLM API can be flaky)
> - Graceful degradation: if evaluation fails, log for batch processing
>
> **Trade-off**: I chose eventual consistency for cost aggregations because billing reconciles end-of-day anyway. But budget enforcement uses strong consistency to prevent overspend."

### Wrap-Up (3 min)

> "To summarize the key decisions:
>
> 1. **OpenTelemetry with GenAI conventions**: Industry standard, future-proof
> 2. **ClickHouse for traces**: 10x compression, excellent aggregation performance
> 3. **Content-addressed storage**: Solves high-cardinality problem
> 4. **Tiered evaluation**: Real-time for safety, batch for quality—balances cost and coverage
> 5. **Adaptive sampling**: 0.1-1% at scale with always-sample rules for errors
>
> The unique insight is that LLM observability differs from traditional APM due to non-deterministic outputs, high-cardinality prompts, and expensive evaluation. The architecture addresses all three."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Jumping to solution | Miss important requirements | Spend 5 min on clarifying questions |
| Using Prometheus for prompts | High-cardinality breaks Prometheus | Content-addressed storage |
| Evaluating every span | $2M+/month at scale | Tiered evaluation with sampling |
| Ignoring privacy | Prompts contain PII | Build redaction into pipeline |
| Single point of failure | Kafka, ClickHouse can fail | Replication, multi-AZ |
| "Just add more servers" | Doesn't solve algorithmic bottlenecks | Discuss sharding, caching, sampling |
| Forgetting cost attribution | This is a business-critical feature | Hierarchical attribution, budgets |
