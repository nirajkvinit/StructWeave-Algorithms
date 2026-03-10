# 15.3 Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Deliverables |
|---|---|---|---|
| 0-5 min | **Clarify** | Ask clarifying questions; scope the problem; establish constraints | Functional/non-functional requirements written; scale numbers agreed; scope boundaries clear |
| 5-15 min | **High-Level Design** | End-to-end architecture; ingestion pipeline; major component identification | Architecture diagram on whiteboard; data flow for write path and read path; key technology choices articulated |
| 15-30 min | **Deep Dive** | Pick 1-2 critical components (indexing engine, storage tiering, or query execution) and go deep | Detailed data flow for chosen component; trade-off analysis; failure mode discussion; pseudocode for core algorithm |
| 30-40 min | **Scale & Trade-offs** | Capacity math; bottleneck identification; cost optimization; operational concerns | Capacity estimation table; top 3 bottlenecks with mitigations; cost analysis across indexing strategies |
| 40-45 min | **Wrap Up** | Summarize key decisions; address follow-up questions; mention what you'd improve with more time | Clear summary of trade-offs made; acknowledgment of areas not fully explored; forward-looking evolution ideas |

---

## Meta-Commentary: What Makes This System Unique

### Where to Spend Most Time

**The indexing strategy discussion is the highest-signal part of the interview.** This is where you demonstrate depth. A strong candidate will:
1. Explain that there are fundamentally different indexing approaches (inverted index vs. label-only vs. bloom filter vs. columnar)
2. Articulate the three-way trade-off: ingestion speed, search speed, storage cost
3. Propose a hybrid approach and justify why different tiers warrant different strategies
4. Connect the indexing choice to capacity estimates and cost projections

### What Makes This Challenging

1. **The write:read ratio is extreme** (100:1 to 1000:1)---most database designs optimize for reads, but this system must optimize for writes first
2. **Schema diversity** means you can't assume uniform data shapes---schema-on-read vs. schema-on-write is a critical decision
3. **The system must work during failures**---unique reliability requirement where peak load coincides with the moment the system is most needed
4. **Cost is a first-class architectural concern**---at TB/day scale, the difference between indexing strategies is millions of dollars per year

### Common Approaches and How to Differentiate

| Approach | Junior | Senior | Staff+ |
|---|---|---|---|
| **Architecture** | "Use Elasticsearch" (black box) | Multi-layer pipeline with queue buffer | Hybrid indexing per tier; compute-storage separation; cost-aware design |
| **Indexing** | "Index everything" | Full-text for recent, sampling for old | Quantify storage cost per strategy; propose bloom filters for cold tier; discuss FST vs. HashMap trade-off |
| **Scale** | "Add more servers" | Shard by time + tenant; tier storage | Calculate exact node counts; model incident-spike capacity; discuss backpressure propagation |
| **Reliability** | "Replicate everything" | WAL + queue buffer for at-least-once | Analyze the write+read correlation during incidents; propose priority-based degradation; meta-monitoring |

---

## Clarifying Questions to Ask

| Question | Why It Matters | Impact on Design |
|---|---|---|
| "What's the expected daily ingestion volume?" | Determines whether this is a GB/day or TB/day system | GB/day: single-node ELK stack. TB/day: distributed pipeline with queue buffer |
| "What's the primary query pattern---needle-in-haystack search or aggregation analytics?" | Determines indexing strategy | Search-first: inverted index. Analytics-first: columnar storage. Both: hybrid |
| "What's the acceptable delay between log emission and searchability?" | Determines refresh interval and pipeline depth | Sub-second: direct write (no queue). 5-15 seconds: queue + stream processing |
| "How many distinct services are producing logs, and do they share a schema?" | Determines schema handling complexity | 10 services, same schema: schema-on-write. 5,000 services, varied schemas: schema-on-read |
| "What's the retention requirement? Compliance-driven?" | Determines storage tier depth and cost model | 7 days: hot-only. 1 year: tiered. 7 years: deep archive with compliance controls |
| "Is there an existing observability stack (metrics, traces)?" | Determines correlation requirements | Yes: must integrate trace_id/span_id correlation. No: can design logs-only |
| "Who queries the logs---SRE oncall, all engineers, automated systems?" | Determines query layer scaling and access control | SRE-only: low query QPS, minimal RBAC. All engineers: high QPS, tenant isolation |
| "Are there PII/compliance requirements for log data?" | Determines need for redaction pipeline | Yes: inline PII redaction, field-level access, audit trail, retention matrix |

---

## Trade-offs Discussion

### Trade-off 1: Full-Text Indexing vs. Label-Only Indexing

| Dimension | Full-Text Inverted Index | Label-Only + Grep |
|---|---|---|
| **Pros** | Sub-second search for any term; arbitrary field queries; familiar query experience (Elasticsearch/Kibana) | 10x cheaper storage; 3-5x faster ingestion; trivial to operate (no segment merging, no index corruption); object storage backend |
| **Cons** | Index storage = 1.5-3x raw data; expensive at TB/day scale; segment merge overhead; type conflicts | Full-text search requires brute-force scan of compressed chunks; seconds-to-minutes for "grep" queries; poor experience for ad-hoc investigation |
| **Best For** | Security/audit logs (fast search critical); production debugging (interactive exploration); small-to-medium volume | High-volume, cost-sensitive workloads; environments where most queries filter by labels (service, severity, time); infrastructure logs |
| **Recommendation** | Use for hot tier (recent 7 days) where interactive search speed justifies cost | Use for warm/cold tier where cost efficiency matters more than search speed |

### Trade-off 2: Schema-on-Write vs. Schema-on-Read

| Dimension | Schema-on-Write | Schema-on-Read |
|---|---|---|
| **Pros** | Optimal query performance (pre-structured data); type safety; storage efficiency (known column types enable better compression) | Accept any format; no operational coordination across 5K services; type conflicts handled gracefully; faster adoption |
| **Cons** | Schema management across thousands of services is operationally expensive; schema evolution breaks ingestion; rejected logs = data loss | Slightly slower queries (runtime parsing); storage overhead (type suffix fields); harder to enforce data quality |
| **Recommendation** | **Schema-on-read** for general-purpose log aggregation. The operational cost of schema coordination at microservice scale is prohibitive. Uber explicitly chose this after years of schema-on-write pain. |

### Trade-off 3: Ingestion Completeness vs. Cost

| Dimension | Index Everything | Selective Indexing |
|---|---|---|
| **Pros** | No data loss; every log searchable; simple mental model | 50-80% cost reduction; focus indexing budget on high-value data; configurable per data stream |
| **Cons** | Extremely expensive at scale (TB/day * $0.50/GB = $500K/month+); most indexed data is never queried; DEBUG logs dominate volume but rarely provide value | Requires ingestion routing rules; risk of dropping logs that turn out to be needed during an incident; operational overhead of managing routing rules |
| **Recommendation** | **Selective indexing**: ingest everything to cheap object storage (complete audit trail), but index selectively based on severity and data stream. ERROR/WARN: full-text indexed. INFO: label-indexed. DEBUG: stored but not indexed (available via cold-tier brute-force search on demand). |

### Trade-off 4: Real-Time Freshness vs. Ingestion Throughput

| Dimension | Short Refresh Interval (1s) | Long Refresh Interval (5-30s) |
|---|---|---|
| **Pros** | Near-real-time searchability; essential for live debugging and incident response; better developer experience | Higher ingestion throughput (larger batches, fewer segment flushes); less segment merge overhead; more efficient compression |
| **Cons** | More small segments created; higher merge overhead; lower ingestion throughput per node; more I/O | Increased ingestion-to-searchable delay; poor experience during fast-moving incidents; stale search results |
| **Recommendation** | **Adaptive refresh**: 1-2s for ERROR/WARN severity (fast incident response), 5-15s for INFO/DEBUG (throughput-optimized). Dynamic adjustment based on system load. |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---|---|---|
| "Why not just use Elasticsearch for everything?" | Test understanding of indexing trade-offs and cost awareness | "Elasticsearch is excellent for the hot tier where fast interactive search justifies the cost. But at TB/day scale, full-text indexing every event costs 3-5x in storage alone. A hybrid approach---inverted index for hot tier, columnar/label-only for warm/cold---captures the query speed where it matters (recent data) while achieving 10-20x cost savings on historical data." |
| "Why use a message queue? Can't agents write directly to the indexer?" | Test understanding of decoupling and reliability | "Direct write is simpler but fragile. During indexer maintenance or incident-driven load spikes, agents would either block or drop logs. The queue provides three critical benefits: burst absorption (minutes of buffering during indexer slowdown), replay capability (re-index if data is corrupted), and decoupled scaling (ingestion rate independent of indexing rate). The 100ms latency cost is negligible against these reliability benefits." |
| "How do you handle a log event that's 100MB?" | Test boundary thinking | "Enforce maximum event size at the ingestion API (e.g., 1MB). Events exceeding the limit are rejected with an error response. For legitimate large payloads (e.g., core dumps, large stack traces), truncate the body to the limit and add a reference to the full artifact in external blob storage. Never allow unbounded event sizes---they cause OOM in every downstream component." |
| "What if the PII redaction engine goes down?" | Test failure mode thinking for compliance-critical components | "PII redaction is in the critical path---logs must not be indexed without redaction for compliance. If the PII engine is unavailable: (1) fail-closed: events queue in the message queue until PII engine recovers, (2) the queue's 72-hour retention provides ample buffer, (3) alert on PII pipeline health with P1 severity, (4) never bypass PII redaction, even during outages. Data compliance is not a degradable feature." |
| "How do you handle schema changes when a service deploys?" | Test schema evolution understanding | "Schema-on-read means we accept any format. But field type conflicts (same field name, different types) need handling. Strategy: first-writer-wins for the base field name, conflicting types get a type suffix (e.g., status becomes status_str and status_int). The query UI shows a warning. Long-term: schema registry as a recommendation (not enforcement), with linting in CI to catch common issues." |
| "What about 100x the current scale?" | Test architectural evolution thinking | "At 100x (210M events/s, 1.7 PB/day), several things change: (1) the message queue becomes the bottleneck---need partitioned queues per data stream, not just per tenant; (2) indexing becomes compute-bound---consider compute-storage separation (Quickwit architecture) where indexers produce immutable segments uploaded to object storage; (3) full-text indexing becomes unaffordable even for hot tier---shift to bloom-filter-based search (LogScale approach) or columnar storage (ClickHouse); (4) query federation across multiple regional clusters becomes necessary." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---|---|---|
| **Starting with "I'd use ELK stack"** | Black-boxing the system; shows no understanding of internals | Start from requirements, derive architecture from constraints, then mention specific technologies as examples |
| **Ignoring cost** | At TB/day scale, indexing strategy determines whether the system costs $50K/month or $500K/month | Include cost per GB per tier in your capacity estimates; discuss cost as a primary architectural driver |
| **Not addressing the incident spike scenario** | The system's most critical moments are when it's under maximum stress | Explicitly discuss how the system handles correlated write + read spikes; propose priority-based degradation |
| **Single indexing strategy for all data** | Not all log data has the same access pattern | Propose per-tier or per-severity indexing strategies; discuss the spectrum from full-text to label-only |
| **Forgetting about PII** | Logs inevitably contain sensitive data; ignoring this is a compliance red flag | Include PII redaction in the ingestion pipeline; discuss compliance requirements |
| **Designing for average load only** | Average load is irrelevant; peak load during incidents determines required capacity | Show incident spike calculations (5-10x); discuss pre-provisioned headroom vs. auto-scaling |
| **Not discussing the queue's role** | The queue is the most important reliability component, not just a "nice to have" | Explain why the queue is essential: backpressure, replay, decoupling; quantify its buffer capacity |
| **Ignoring meta-observability** | The log system monitoring itself is a unique challenge | Mention the circular dependency; propose independent meta-monitoring stack |

---

## Questions the Candidate Should Ask the Interviewer

| Question | What It Demonstrates |
|---|---|
| "What's the primary use case: real-time debugging, security analytics, or compliance?" | Understanding that the use case drives indexing strategy |
| "Is there an existing observability stack, or is this greenfield?" | Pragmatic thinking about integration vs. greenfield design |
| "What's the budget constraint per GB per month?" | Cost awareness---critical for log systems at scale |
| "How heterogeneous are the log sources? Fixed schema or freeform?" | Understanding schema complexity drives parser design |
| "Are there regulatory requirements (GDPR, HIPAA, PCI-DSS) for log data?" | Security and compliance awareness |
| "What's the SLA for the log system itself during incidents?" | Understanding the meta-reliability requirement |

---

## Scoring Rubric (For Interviewers)

| Dimension | Strong Signal | Weak Signal |
|---|---|---|
| **Requirements** | Asks about scale, query patterns, compliance; quantifies write:read ratio | Jumps to "I'd use Elasticsearch" without clarification |
| **Architecture** | Multi-layer pipeline with queue; explains why each layer exists | Single monolithic system; no buffering or decoupling |
| **Indexing Deep Dive** | Explains multiple strategies with trade-offs; proposes hybrid per tier | Single strategy without cost analysis |
| **Capacity Planning** | Calculates events/s, storage per tier, cost per strategy; models incident spikes | Vague "it handles a lot of data" without numbers |
| **Reliability** | Discusses WAL, queue replay, graceful degradation, meta-monitoring | "Replicate everything"; no discussion of incident-correlated load |
| **Trade-offs** | Explicitly compares alternatives with pros/cons; connects to requirements | One-sided arguments; no acknowledgment of trade-offs |
| **Security** | Mentions PII redaction, field-level access, audit trail | No mention of PII or compliance |
| **Cost Awareness** | Quantifies cost difference between strategies; proposes optimization | Ignores cost entirely; proposes most expensive solution |
