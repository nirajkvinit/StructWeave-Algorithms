# Section 15: Observability & Reliability

> Part of the [System Design Insights Index](../insights-index.md). For cross-cutting patterns, see [Insights by Category](./by-category.md).

---

### 15.1 Metrics & Monitoring System [View](../15.1-metrics-monitoring-system/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | Cardinality Is an Adversarial Scaling Problem That Grows Combinatorially, Not Linearly | Scaling |
| 2 | Gorilla Compression Is Not a Generic Algorithm — It's a Bet on Data Regularity That Can Be Lost | Data Structures |
| 3 | The Inverted Index Is the Query Engine's Achilles' Heel — Its Design Is Closer to Search Engines Than Databases | Data Structures |
| 4 | Alert Evaluation Must Be the Highest-Priority Reader — Yet It's Usually Designed as Just Another Query Consumer | Contention |
| 5 | Fixed-Bucket Histograms Have a Fundamental Aggregation Flaw That DDSketch Solves Through Logarithmic Bucketing | Data Structures |
| 6 | The Meta-Monitoring System Must Be Architecturally Simpler Than What It Monitors — Complexity Is the Enemy of the Last Line of Defense | Resilience |
| 7 | The WAL Is Not Just a Durability Mechanism — It's the Determinant of Recovery Time and Replication Strategy | Resilience |
| 8 | Downsampling Is Lossy and Irreversible — Different Aggregation Functions Lose Different Information | Cost Optimization |

---

### 15.2 Distributed Tracing System [View](../15.2-distributed-tracing-system/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | The Sampling Paradox — Head Sampling Is Fast but Blind, Tail Sampling Is Informed but Expensive, and Neither Alone Is Sufficient | Traffic Shaping |
| 2 | Consistent Hashing by Trace ID Is Not a Load-Balancing Strategy — It Is the Enabler of Local Trace Assembly | Partitioning |
| 3 | Clock Skew Correction Is Heuristic, Not Deterministic — and Getting It Wrong Distorts Latency Attribution More Than Not Correcting at All | Consistency |
| 4 | PII in Trace Data Is Not a Bug to Fix but an Ongoing Adversarial Game Between Instrumentation Convenience and Data Privacy | Security |
| 5 | The Trace Wait Window Creates a Fundamental Trade-off Between Completeness and Memory That Cannot Be Resolved — Only Managed | Contention |
| 6 | Columnar Storage's Advantage for Traces Is Not Just Cost — It Is That Trace Data's High Redundancy Within a Trace Makes Column Encoding Extraordinarily Effective | Data Structures |
| 7 | The Service Dependency Graph Is Not a Static Map — It Is a Time-Series of Topological Snapshots That Reveals Deployment Drift and Configuration Errors | System Modeling |
| 8 | A Tracing System Must Be Invisible When Healthy and Indispensable When Things Break — This Asymmetry Drives Every Major Design Decision | Resilience |

---

### 15.3 Log Aggregation System [View](../15.3-log-aggregation-system/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | The Indexing Strategy Is Not a Technology Choice --- It Is a Three-Way Economic Trade-off Between Ingestion Cost, Search Cost, and Storage Cost | Cost Optimization |
| 2 | Schema-on-Read Wins at Microservice Scale Because the Coordination Cost of Schema-on-Write Exceeds the Query Performance Benefit | Consistency |
| 3 | The Segment Merge Tax Is the Hidden Throughput Ceiling That Doesn't Appear in Benchmarks | Contention |
| 4 | The Write Path and Read Path Are Maximally Correlated at the Worst Possible Moment | Resilience |
| 5 | Bloom Filters Transform the Search Problem from "Find the Needle" to "Eliminate the Haystacks" | Data Structures |
| 6 | PII Redaction in the Log Pipeline Is a Fail-Closed Gate, Not a Best-Effort Filter | Security |
| 7 | The Finite State Transducer Is the Unsung Data Structure That Makes Full-Text Log Search Possible at Scale | Data Structures |
| 8 | Adaptive Refresh Interval by Severity Turns a Global Performance Knob into a Priority System | Scaling |

---

### 15.4 eBPF-based Observability Platform [View](../15.4-ebpf-observability-platform/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | The Verifier Is Not a Safety Net — It Is the Architect That Shapes Every Design Decision | System Modeling |
| 2 | In-Kernel Filtering Inverts the Traditional Observability Cost Model — You Pay for What You Don't Collect, Not What You Do | Cost Optimization |
| 3 | The Ring Buffer Is Not Just a Queue — Its Fill Level Is the System's Most Important Control Signal | Back-Pressure |
| 4 | eBPF Program Pinning Creates a Unique Split-Brain Lifecycle — The Data Plane Survives Control Plane Death | Reliability |
| 5 | Protocol Parsing in eBPF Is Not a Miniature Application Parser — It Is a Probabilistic Classifier with Bounded Confidence | Data Structures |
| 6 | The Cgroup-to-Pod Mapping Is the Platform's Most Fragile Dependency — And It Updates on a Different Clock Than the Kernel Events It Enriches | Consistency |
| 7 | Adaptive Sampling Under Load Is a Control Theory Problem Disguised as a Systems Engineering Decision | Scaling |
| 8 | Security Enforcement in eBPF Has an Asymmetric Blast Radius — A False-Positive Kill Is Worse Than Missing a True-Positive Detection | Security |
| 9 | The eBPF Observability Platform's True Competitive Moat Is Not Data Collection — It Is the Kernel-Side Data Reduction Ratio | Architecture |

---
