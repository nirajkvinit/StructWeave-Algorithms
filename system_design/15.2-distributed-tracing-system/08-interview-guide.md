# 08 — Interview Guide

## Interview Pacing (45-min Format)

| Time | Phase | Focus | Key Points |
|---|---|---|---|
| 0-5 min | **Clarify** | Scope and requirements | Ask: scale (services, QPS), consistency needs, sampling requirements, multi-tenancy, storage budget |
| 5-10 min | **Data Model** | Span schema and context propagation | Define span fields (trace_id, span_id, parent_span_id, operation, tags, logs); explain W3C Trace Context; discuss how context crosses process boundaries |
| 10-20 min | **High-Level Architecture** | Ingestion pipeline and storage | Draw: SDK → Agent → Collector → Queue → Storage; explain why each component exists; discuss sampling placement |
| 20-30 min | **Deep Dive** | Tail-based sampling OR trace assembly | Choose one: explain the sampling paradox, buffer management, and decision policies; OR explain out-of-order assembly, clock skew, missing spans |
| 30-40 min | **Scale & Trade-offs** | Storage tiering, reliability, bottlenecks | Discuss hot/warm/cold storage tiers; capacity math; explain graceful degradation when components fail |
| 40-45 min | **Wrap Up** | Service map, security, observability | Mention service dependency graph generation; PII concerns in traces; meta-observability (tracing the tracer) |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **The Sampling Paradox**: This is the central architectural tension. Any candidate who jumps to "store everything" or "sample 1% randomly" without discussing the trade-offs is missing the core problem. The interviewer wants to hear about the fundamental tension between observability completeness and cost, and how tail-based sampling resolves it at the cost of operational complexity.

2. **Write-heavy with bursty reads**: Unlike most systems where you design for either reads or writes, a tracing system must handle extreme write throughput (millions of spans/sec) while serving bursty, latency-sensitive read queries (engineers debugging during incidents). The write and read paths are almost entirely decoupled.

3. **The meta-observability challenge**: How do you monitor the monitoring system? This is a unique problem that doesn't appear in most system design interviews. Mentioning the circular dependency and your strategy to break it demonstrates depth.

4. **Context propagation is an organizational problem**: Unlike most distributed systems where the hard parts are technical, context propagation's hardest challenge is ensuring every team in the organization properly instruments their services. This socio-technical insight impresses interviewers.

### Where to Spend Most Time

- **Sampling strategy** (the single most impactful design decision)
- **Storage design** (how to make trace data affordable at scale)
- **Trace assembly** (demonstrates understanding of distributed systems fundamentals: out-of-order events, clock skew, partial failures)

### What Not to Spend Time On

- UI/UX details of the trace visualization (not architecturally interesting)
- Specific OpenTelemetry SDK API details (too implementation-specific)
- Authentication/authorization details (unless specifically asked)

---

## Trade-offs Discussion

### Trade-off 1: Head-Based vs. Tail-Based Sampling

| Decision | Head-Based Sampling | Tail-Based Sampling |
|---|---|---|
| | **Pros:** Near-zero overhead; no buffering needed; consistent decision across all services (deterministic on trace ID) | **Pros:** Informed decision (sees complete trace); guarantees retention of error/outlier traces; supports complex sampling rules |
| | **Cons:** Uninformed (can't know at start if trace will be interesting); systematically misses rare errors | **Cons:** Requires buffering all spans until trace completes; high memory usage; operational complexity; adds latency to trace availability |
| **Recommendation** | Use head-based as the first tier for volume reduction (90% drop), then tail-based at the collector for intelligent retention of the remaining stream |

### Trade-off 2: Wide-Column Store vs. Columnar Object Storage

| Decision | Wide-Column (Cassandra/ScyllaDB) | Columnar on Object Storage (Parquet) |
|---|---|---|
| | **Pros:** Low-latency point lookups (trace by ID in <10ms); high write throughput; automatic TTL-based expiration | **Pros:** 10-100x cheaper per TB; supports efficient column-scoped queries (predicate pushdown); virtually unlimited scale |
| | **Cons:** Expensive per TB; operational overhead (cluster management); tag-based search requires separate indices | **Cons:** Higher read latency (100ms-1s for point lookups); requires bloom filters for trace ID lookup; batch-oriented (not real-time writes) |
| **Recommendation** | Use wide-column for hot tier (0-7 days) for fast trace-by-ID lookups; use columnar on object storage for warm/cold tiers (7-90 days) for cost efficiency |

### Trade-off 3: Consistent Hashing vs. Random Distribution for Collectors

| Decision | Consistent Hashing by Trace ID | Random/Round-Robin Distribution |
|---|---|---|
| | **Pros:** All spans of a trace reach the same collector; enables local trace assembly and tail-based sampling | **Pros:** Simpler; better load distribution; no rebalancing issues during scaling |
| | **Cons:** Scaling events cause trace fragmentation during rebalancing; hot trace IDs create hot collectors | **Cons:** Cannot do tail-based sampling locally (requires distributed state); trace assembly requires a separate aggregation step |
| **Recommendation** | Use consistent hashing for tail-based sampling workloads; accept the rebalancing complexity in exchange for local trace visibility |

### Trade-off 4: Trace Completeness vs. Latency

| Decision | Wait Longer for Complete Traces | Decide Quickly on Partial Traces |
|---|---|---|
| | **Pros:** Higher trace completeness; more accurate sampling decisions; better clock skew correction | **Pros:** Lower memory usage; faster trace availability; simpler buffer management |
| | **Cons:** Higher memory usage in the sampler buffer; traces not queryable for longer; risk of buffer exhaustion during traffic spikes | **Cons:** May make sampling decisions on incomplete data (miss errors in late-arriving spans); orphaned subtrees |
| **Recommendation** | Default 30-second wait window with adaptive reduction under memory pressure; accept lower completeness during high-load periods |

### Trade-off 5: Per-Span vs. Per-Trace Storage Model

| Decision | Per-Span (Individual Rows) | Per-Trace (Grouped) |
|---|---|---|
| | **Pros:** Individual span queries are fast; incremental writes (don't need to wait for full trace); simpler write path | **Pros:** Trace-by-ID retrieval is a single read; better compression (spans within a trace share metadata); fewer I/O operations per trace read |
| | **Cons:** Trace-by-ID retrieval requires reading N rows (one per span); more I/O for the most common query pattern | **Cons:** Must buffer spans until trace is complete before writing; late-arriving spans require append operations; larger minimum write size |
| **Recommendation** | Per-span for hot tier (optimized for fast writes); per-trace for warm/cold tiers (optimized for read efficiency after compaction) |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---|---|---|
| **"Why not just log everything and grep?"** | Understand the difference between logs and traces | Logs are per-service, unstructured, and lack causal relationships. Traces capture the *causal chain* across services with timing data. Grepping logs by request ID gives you individual service perspectives; traces give you the complete request journey with parent-child timing, enabling latency attribution. They complement each other. |
| **"Can't you just sample 100% of traces?"** | Understand scale economics | At 4M spans/sec and 2KB per span, 100% sampling generates 26 TB/day of storage. At even modest storage costs, this becomes $500K+/year in storage alone, plus proportional query and compute costs. More importantly, 100% sampling degrades query performance because searches must scan vastly more data. Sampling is not a limitation—it's an intentional design choice. |
| **"What if the message queue goes down?"** | Test failure thinking | Graceful degradation: collectors buffer spans in memory (30s window), then fall back to writing directly to hot store (bypassing tail sampling). Worst case: head-only sampling for the duration of the outage. Critical: the application services are never affected—SDKs fire-and-forget. |
| **"How do you handle a service that doesn't propagate trace context?"** | Test real-world operational thinking | This is inevitable in a large organization. The trace breaks into disconnected subtrees. We detect "missing parent" spans and create synthetic placeholder spans to preserve partial structure. We also build a "propagation coverage" dashboard that identifies services with high rates of orphaned spans, enabling targeted instrumentation fixes. |
| **"Why not use Elasticsearch for everything?"** | Understand storage trade-offs | Elasticsearch works well for search-oriented workloads but is expensive for the write-heavy, append-only nature of trace data. Indexing every field creates massive storage overhead. Wide-column stores handle the write path better; columnar formats on object storage handle cost efficiency better. Elasticsearch might be used as an optional tag index layer, but not as the primary span store at scale. |
| **"How do you trace async processes like message queue consumers?"** | Test context propagation depth | The producer injects trace context into the message headers. The consumer extracts the context and creates a new span with a FOLLOWS_FROM reference (not CHILD_OF, since it's asynchronous). This preserves the causal chain across async boundaries. For batch consumers processing multiple messages, each message starts its own trace continuation. |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---|---|---|
| **Designing a synchronous ingestion path** | Any latency in the tracing pipeline adds latency to every instrumented service | Design fire-and-forget ingestion: SDK batches async, agent buffers, collector writes to queue |
| **Single storage tier** | Either too expensive (fast storage) or too slow (cheap storage) | Design tiered storage: hot (fast, expensive, short retention) → warm/cold (slow, cheap, long retention) |
| **Ignoring sampling entirely** | Implies infinite storage budget; shows lack of scale awareness | Lead with sampling as the first design decision; explain head vs. tail trade-offs |
| **Custom context propagation format** | Creates interoperability problems; breaks at organizational boundaries | Use W3C Trace Context standard; mention backwards compatibility with B3 format |
| **Assuming ordered span arrival** | In a distributed system, spans arrive out of order by definition | Design for async assembly with a wait window; handle missing spans and clock skew |
| **Designing for strong consistency** | Trace data is diagnostic; strong consistency adds unnecessary cost and latency | Eventual consistency is fine; traces becoming queryable 30-60 seconds after completion is acceptable |
| **Making the tracing system a SPOF** | If the tracing system failure impacts production services, it's a liability, not a tool | Design for isolation: SDK failures never propagate; fire-and-forget semantics; graceful degradation at every tier |

---

## Questions to Ask Interviewer

### Clarifying Questions (Ask First)

| Question | Why It Matters |
|---|---|
| What's the scale? (number of services, QPS) | Determines whether you need sampling at all, and how complex the storage tier needs to be |
| Is multi-tenancy required? | Changes isolation model, storage partitioning, and access control design |
| What's the storage budget? | Drives the sampling rate and retention policy decisions |
| Are there existing tracing standards in use? (Zipkin B3, W3C, etc.) | Determines context propagation format and backwards compatibility needs |
| Is cross-region tracing needed? | Adds complexity to trace assembly, storage replication, and clock skew handling |
| What level of trace completeness is acceptable? | Informs sampling strategy aggressiveness and buffer sizing |

### Follow-up Questions (If Time Permits)

| Question | What It Reveals |
|---|---|
| Should the service map be real-time or batch-computed? | Affects streaming vs. batch processing architecture |
| Are there compliance requirements for trace data? (GDPR, SOC2) | Drives PII scrubbing, data retention, and access control design |
| Is integration with existing metrics/logging systems expected? | Determines whether exemplar-based correlation is needed |
| Should the system support trace-based testing? | Advanced feature: comparing traces between deployments for regression detection |

---

## Evaluation Rubric

| Level | What to Expect |
|---|---|
| **Junior** | Describes basic span model and ingestion pipeline; may miss sampling entirely; single storage tier; doesn't address failure scenarios |
| **Mid-Level** | Understands head-based sampling; designs reasonable ingestion pipeline; mentions Cassandra or Elasticsearch for storage; basic error handling |
| **Senior** | Explains head vs. tail sampling trade-offs; designs tiered storage; addresses clock skew and trace assembly; discusses graceful degradation; mentions PII concerns |
| **Staff** | Leads with the sampling paradox as the central design tension; designs hybrid sampling with adaptive policies; discusses meta-observability; articulates organizational challenges of context propagation; considers cost optimization across storage tiers |
| **Principal** | All of the above plus: discusses trace-based testing, continuous profiling integration, ML-driven sampling, cross-region trace federation, and the evolution from tracing to full observability platform |
