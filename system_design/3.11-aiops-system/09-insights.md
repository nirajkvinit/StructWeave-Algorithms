# Key Insights: AIOps System

## Insight 1: Three-Tier Anomaly Detection as a Cost-Accuracy Funnel

**Category:** Scaling
**One-liner:** Route 80% of metrics through cheap statistical checks, 15% through lightweight ML, and only 5% through expensive GPU-based ensemble models to achieve 1M metrics/sec on just 10 GPUs.

**Why it matters:** Naively running ML inference on every metric at 1M/sec would require 10,000 GPUs -- a non-starter. The three-tier architecture exploits a fundamental asymmetry: most metrics are normal and can be cheaply classified by moving averages or static thresholds in under 10ms (Tier 1). Only the ambiguous 20% escalate to seasonal decomposition (Tier 2), and only the 5% that survive both tiers reach the GPU ensemble (Tier 3). Combined with batch inference (512 metrics/batch) and feature caching (80% hit rate, 4x compute reduction), this tiered routing reduces GPU requirements by 1000x. The pattern generalizes to any system where an expensive classification step can be preceded by cheap pre-filters.

---

## Insight 2: Causal Inference over Correlation for Root Cause Analysis

**Category:** System Modeling
**One-liner:** RCA must use causal inference (Granger causality + PC algorithm + Bayesian ranking) rather than correlation, because correlated symptoms are not causes.

**Why it matters:** When Service A and Service B both show errors simultaneously, naive correlation-based RCA cannot distinguish whether A causes B, B causes A, or an unseen Service C causes both. The AIOps RCA engine solves this with a three-step causal pipeline: (1) the service topology graph provides structural priors about which causal directions are plausible, (2) Granger causality tests whether past values of one metric predict another beyond its own history (a statistical test for temporal causation), and (3) the PC algorithm discovers causal DAG structure from observational data using conditional independence tests. The final Bayesian ranking combines timing evidence (which anomaly appeared first), magnitude (severity of deviation), and propagation patterns (did downstream nodes show symptoms?) into a posterior probability. This causal approach correctly identifies the database connection pool exhaustion 300 seconds before the incident rather than blaming the gateway that merely showed symptoms.

---

## Insight 3: Dynamic-X-Y Alert Correlation Compresses 10K Alerts into 300 Incidents

**Category:** Streaming
**One-liner:** Correlate alerts along two dimensions simultaneously -- temporal proximity (X) and topological proximity (Y) -- to achieve 97% alert suppression without losing real incidents.

**Why it matters:** A single infrastructure failure in a microservices environment can trigger thousands of cascading alerts. The Dynamic-X-Y algorithm clusters alerts by computing a multi-factor similarity score: temporal (30% weight -- alerts within 5 minutes), topological (40% weight -- services within N hops in the dependency graph), semantic (20% weight -- Jaccard similarity on labels), and severity (10% weight). The suppression pipeline operates in four stages: deduplication via fingerprinting (-30%), time-based cooldown (-20%), XY correlation clustering (-70%), and child-alert noise suppression (-50%), achieving 97% total suppression. The topological dimension is what makes this non-obvious -- two alerts 5 minutes apart on unrelated services should not correlate, but two alerts 5 minutes apart on services connected by a dependency edge almost certainly should.

---

## Insight 4: Blue-Green Model Deployment to Avoid Inference Inconsistency

**Category:** Consistency
**One-liner:** Use blue-green deployment with gradual traffic shifting (1% to 100%) and atomic pointer swaps to prevent inconsistent predictions during ML model updates.

**Why it matters:** When a new anomaly detection model is deployed while inference is in-flight, requests can get stale references to the old model version, producing inconsistent predictions during the transition window. The solution mirrors traditional blue-green deployment but adapted for ML: the new model is deployed as a "candidate" alongside the "champion," traffic is gradually shifted (1% then 10% then 50% then 100%) while monitoring for regression, and final promotion uses an atomic pointer swap. This avoids the race condition where inference starts with Model V1, retraining completes mid-inference, and subsequent requests unpredictably mix V1 and V2 results. The Model Registry tracks champion/candidate versions while the inference router handles weighted routing.

---

## Insight 5: Distributed Deduplication via Redis SETNX with TTL

**Category:** Contention
**One-liner:** Use Redis SET with NX and EX flags on alert fingerprints to guarantee exactly-once alert processing across multiple collectors without coordination overhead.

**Why it matters:** When the same alert arrives at multiple collectors within milliseconds, a naive check-then-insert pattern creates a race condition: Collector 1 checks the fingerprint (not found), Collector 2 checks (not found), both insert, producing a duplicate. Redis SETNX resolves this atomically -- the first collector to SET wins, all others get an instant rejection. The 60-second TTL ensures fingerprints are automatically cleaned up. The same idempotency pattern applies to runbook execution, where an incident update might re-trigger a runbook that is already running. An execution lock (Redis SETNX with 1-hour TTL) combined with a status check prevents double-execution that could cause operational damage.

---

## Insight 6: Materialized Topology Views for O(1) RCA Graph Queries

**Category:** Data Structures
**One-liner:** Pre-compute "N-hop upstream" subgraphs as materialized views so that RCA graph traversals become O(1) lookups instead of O(10^3) real-time traversals.

**Why it matters:** The RCA engine needs to answer queries like "get all upstream services within 3 hops" during incident analysis. With 5,000 services averaging 10 dependencies each, a 3-hop query traverses O(10^3) = 1,000 nodes, taking 500ms-2s on the graph database. Since service topology changes are rare (deployments, not per-request), pre-computing these subgraphs as materialized views converts every RCA query into a simple O(1) lookup. Combined with graph caching (5-minute TTL, invalidated on topology updates), bidirectional BFS for traversal, and 3 read replicas for the graph database, this reduces graph query time by 100x. The topology itself is refreshed continuously from trace data to prevent staleness, which would cause RCA to reason about wrong dependency chains.

---

## Insight 7: Meta-Reliability -- The Monitor Must Be More Reliable Than the Monitored

**Category:** Resilience
**One-liner:** An AIOps system requires 99.99% availability because if it goes down during an outage of the systems it monitors, the outage becomes invisible.

**Why it matters:** This is the defining architectural constraint of AIOps: the monitoring system must be strictly more reliable than everything it observes. If the AIOps platform has 99.9% availability and a monitored service has 99.9%, there is a non-trivial chance that both fail simultaneously -- precisely when AIOps is most needed. This drives several design decisions: graceful degradation that falls back from ML-based detection to rule-based detection if models fail, anomaly detection on the training data itself to catch training data poisoning, and a self-monitoring layer (meta-observability) that watches the AIOps platform using independent infrastructure. The closed-loop design (Observe, Analyze, Act) must degrade gracefully at each stage rather than failing completely.

---

## Insight 8: Kafka as a Spike-Absorbing Buffer Between Ingestion and Storage

**Category:** Streaming
**One-liner:** Place Kafka between metric collectors and the time-series database to absorb ingestion spikes, enable parallel partitioned writes, and decouple ingestion rate from storage write throughput.

**Why it matters:** At 1M metrics/sec with ~100 bytes per metric, the raw ingestion bandwidth is 800 Mbps, but write amplification from indexing (~50 MB/s) and compaction (~30 MB/s) pushes total disk write to ~180 MB/s. A single-writer bottleneck at the TSDB would collapse under this load. Kafka partitioned by tenant + metric hash serves as the critical buffer: it absorbs burst spikes with 24-hour retention, enables one parallel writer per partition, and feeds into a sharded TSDB with consistent hashing. This decoupling means the ingestion layer can accept metrics at any burst rate while the storage layer writes at its own sustainable pace, and the 24-hour Kafka retention provides a natural replay window for recovery scenarios.
