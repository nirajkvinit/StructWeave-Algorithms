[← Back to Index](./00-index.md)

# Interview Guide

## Interview Pacing (45-Minute Format)

| Phase | Time | Focus | Key Deliverables |
|-------|------|-------|------------------|
| **1. Requirements** | 5 min | Clarify scope, constraints | Functional/non-functional requirements |
| **2. High-Level Design** | 12 min | Architecture, components | System diagram with OTel, AI layer |
| **3. Deep Dive** | 15 min | Critical component details | Anomaly detection, agent coordination, or storage |
| **4. Scale & Reliability** | 8 min | Scaling strategy | Sharding, replication, failure handling |
| **5. Trade-offs & Extensions** | 5 min | Alternatives, improvements | Discussion of design choices |

---

## Phase 1: Requirements Clarification (5 min)

### Questions to Ask

**Scope:**
- "Are we designing a full observability platform or focusing on a specific capability (anomaly detection, auto-remediation)?"
- "Should we support all three pillars (metrics, logs, traces) or prioritize one?"
- "Is this for a single organization or a multi-tenant SaaS platform?"

**Scale:**
- "What's the expected event ingestion rate? (Clarify: 1M/sec? 10M/sec?)"
- "How many unique services/dimensions do we need to support?"
- "What's the query latency requirement for dashboards vs investigations?"

**Constraints:**
- "Should we optimize for cost or for comprehensive data retention?"
- "Are there compliance requirements (GDPR, HIPAA, SOC2)?"
- "Do we need multi-region deployment?"

### Sample Requirements Summary

```
FUNCTIONAL:
- Ingest metrics, logs, traces via OpenTelemetry
- Correlate signals via trace_id/span_id
- Detect anomalies without manual threshold configuration
- Investigate root causes automatically
- Propose remediation actions with human approval
- Support natural language queries

NON-FUNCTIONAL:
- 10M events/sec ingestion
- < 60s anomaly detection latency
- < 5s query latency for recent data
- 99.9% query availability
- 7 days hot retention, 2 years cold
```

---

## Phase 2: High-Level Design (12 min)

### Key Components to Mention

1. **Data Collection Layer**
   - OTel SDK instrumentation in applications
   - OTel Collectors (agent + gateway pattern)
   - Support for eBPF zero-code instrumentation

2. **Ingestion Pipeline**
   - Kafka for buffering and decoupling
   - Stream processor (Flink) for enrichment and correlation
   - Adaptive sampling for cost control

3. **Storage Layer**
   - ClickHouse for events/traces (high cardinality)
   - Time-series DB for metrics (VictoriaMetrics/Prometheus)
   - Tiered storage (hot/warm/cold)

4. **AI Layer**
   - Baseline learning (Prophet/ML models)
   - Anomaly detection (Isolation Forest, statistical)
   - Investigation agents (root cause analysis)
   - Remediation engine

5. **Human Interface**
   - Dashboards and query interface
   - Natural language query
   - Approval gateway for remediation
   - MCP server for IDE integration

### Sample Diagram to Draw

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Applications│───▶│ OTel       │───▶│ Kafka       │
│ (OTel SDK)  │    │ Collectors │    │ (Buffer)    │
└─────────────┘    └─────────────┘    └──────┬──────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────┐
│                 Stream Processor                     │
│  (Enrich, Correlate, Sample, Route to AI)           │
└──────────────────────────┬──────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │ClickHouse │ │ Time-     │ │ AI Layer  │
       │ (Events)  │ │ Series DB │ │ (Detect/  │
       │           │ │ (Metrics) │ │ Investigate│
       └───────────┘ └───────────┘ └─────┬─────┘
                                         │
                                         ▼
                                  ┌───────────┐
                                  │ Human     │
                                  │ Approval  │
                                  └───────────┘
```

### Key Points to Emphasize

- **OpenTelemetry as foundation** - vendor neutral, unified telemetry
- **Event-based architecture** - enables high cardinality, flexible queries
- **Correlation via trace_id** - links metrics, logs, traces
- **AI with human-in-the-loop** - autonomous detection/investigation, human approval for actions
- **Engineer as supervisor** - paradigm shift from firefighting

---

## Phase 3: Deep Dive (15 min)

The interviewer will likely pick one area. Be prepared for:

### Deep Dive Option 1: Anomaly Detection

**Key Points:**
- **Baseline learning**: Use Prophet or similar for time-series forecasting
- **Multidimensional**: Baseline per service/endpoint/dimension combination
- **Dynamic thresholds**: No manual configuration, learns "normal"
- **Multiple detectors**: Statistical + ML (Isolation Forest) + rule-based
- **Correlation-based filtering**: Multi-signal validation reduces false positives

**Sample Explanation:**
> "For anomaly detection, we use a hybrid approach. First, we learn baselines using Prophet for each service-metric combination, capturing seasonality (hourly, daily, weekly patterns). When new data arrives, we calculate deviation from the baseline. But a single metric deviation isn't enough—we correlate across multiple signals. If latency spikes but error rate is flat and downstream services are healthy, it might be normal load increase. Only when multiple signals align (latency + errors + user impact) do we alert."

### Deep Dive Option 2: High Cardinality Storage

**Key Points:**
- **Problem**: Traditional metrics systems explode with high cardinality
- **Solution**: Wide events in columnar storage (ClickHouse)
- **Optimizations**: LowCardinality columns, bloom filters, materialized views
- **Trade-off**: Higher storage cost, aggregation at query time

**Sample Explanation:**
> "Traditional systems like Prometheus pre-aggregate into time series. With high cardinality—user_id, trace_id—this creates billions of series. Instead, we store wide events in ClickHouse. Each event has 50+ dimensions as a Map column. ClickHouse's columnar format compresses well, and we use LowCardinality for dimensions under 10K unique values. For trace_id lookups, we add bloom filter indexes. Trade-off: we pay more for storage, but gain unlimited flexibility in queries."

### Deep Dive Option 3: Multi-Agent Investigation

**Key Points:**
- **Specialized agents**: Metrics analyst, log parser, trace explorer, deployment correlator
- **Shared context**: All agents write to shared investigation context
- **Task claiming**: Prevents duplicate work via distributed locks
- **Consensus**: Weighted voting on hypotheses based on evidence strength

**Sample Explanation:**
> "When an anomaly is detected, we spawn multiple specialized agents: one analyzes metrics trends, one searches logs for errors, one traces dependencies, one checks recent deployments. They share a context store and claim tasks to avoid duplication. Each agent adds findings and proposes hypotheses with confidence scores. A synthesis layer combines evidence—if the deployment correlator says 'high correlation with deploy v2.3' and the trace explorer finds 'Stripe timeouts started at deploy time', we combine these into a root cause with high confidence."

### Deep Dive Option 4: Human Approval Workflow

**Key Points:**
- **Risk tiers**: Info (auto), Low (any member), Medium (lead), High (manager)
- **Approval channels**: Slack buttons, web UI, CLI
- **Timeout and escalation**: If not approved in X minutes, escalate
- **Audit trail**: Every proposal and decision logged

---

## Phase 4: Scaling & Reliability (8 min)

### Scaling Strategies

| Component | Scaling Approach |
|-----------|------------------|
| **Collectors** | Horizontal via HPA, stateless |
| **Kafka** | Add partitions, add brokers |
| **ClickHouse** | Shard by trace_id, replicate 3x |
| **AI Inference** | GPU cluster with dynamic batching |
| **Query** | Read replicas, query cache |

### Failure Handling

| Failure | Mitigation |
|---------|------------|
| **Collector down** | DaemonSet auto-restart, buffering |
| **Kafka broker down** | Replication (ISR=2), rack awareness |
| **ClickHouse shard down** | 3x replication, query retry |
| **AI down** | Fallback to rule-based detection |

### Key Numbers to Know

- Kafka: 100K-500K msgs/sec per partition
- ClickHouse: 1-10M inserts/sec per shard
- Query cache hit rate target: >80%
- Replication factor: 3 for durability

---

## Phase 5: Trade-offs & Extensions (5 min)

### Key Trade-offs to Discuss

| Decision | Trade-off |
|----------|-----------|
| **Events vs Metrics** | Storage cost vs query flexibility |
| **Full retention vs sampling** | Cost vs completeness |
| **AI autonomy level** | Speed vs safety |
| **Single vs multi-region** | Cost vs latency/availability |
| **Proprietary vs OTel** | Integration vs vendor lock-in |

### Potential Extensions

- **Synthetic monitoring**: Proactive endpoint testing
- **Browser RUM**: Client-side observability
- **Cost attribution**: Per-team billing for observability usage
- **Chaos engineering integration**: Correlate fault injection with anomalies

---

## Common Trap Questions

### Q: "Why not just use Prometheus?"

**Good Answer:**
> "Prometheus excels at metrics with known cardinality but struggles with high-cardinality data like user IDs or request IDs. It pre-aggregates into time series, so you can't query arbitrary dimensions after the fact. For an observability platform that needs to answer 'why is this specific user slow?' we need event-based storage like ClickHouse that stores wide events and computes aggregations at query time."

### Q: "How do you handle false positives?"

**Good Answer:**
> "Multi-signal correlation is key. A single metric deviation triggers investigation, not immediate alerting. We correlate: is latency high AND errors elevated AND users impacted? We also learn from feedback—when engineers mark alerts as false positives, we retrain baselines. Target is <5% false positive rate, tracked as a platform SLO."

### Q: "Why human approval? Isn't that slow?"

**Good Answer:**
> "It's a spectrum. Low-risk actions like creating tickets are auto-approved. Medium-risk like scaling up needs one approver. High-risk like rollbacks need team lead approval. The goal is to build trust—as the AI proves accurate, we can gradually increase autonomy. Also, human approval creates accountability and a feedback loop for AI learning."

### Q: "What happens when the observability platform itself fails?"

**Good Answer:**
> "The observer must be observed. We run independent Prometheus/Alertmanager specifically for platform health, separate from the main platform. Alerts go directly to PagerDuty, not through our own alerting. We also design for graceful degradation—if AI fails, we fall back to rule-based detection. The ingestion path is simpler and more resilient than the AI path."

### Q: "How do you ensure AI explainability?"

**Good Answer:**
> "Every AI decision is logged with evidence. When anomaly is detected, we show: baseline value, observed value, deviation factor, correlated signals. For investigations, we show the evidence chain—which logs, traces, and metrics led to the root cause hypothesis. For remediation, we show risk assessment and similar past actions. Engineers can drill down and verify."

---

## Checklist: What Great Candidates Do

- [ ] **Ask clarifying questions** before diving into design
- [ ] **Start with requirements**, not implementation
- [ ] **Draw clear diagrams** with labeled components
- [ ] **Explain the "why"** behind design choices
- [ ] **Acknowledge trade-offs** rather than claiming perfection
- [ ] **Quantify scale** (events/sec, storage, latency)
- [ ] **Address failure scenarios** proactively
- [ ] **Connect to real systems** (Honeycomb, Datadog, etc.)
- [ ] **Highlight the paradigm shift** (engineers as supervisors)

---

## Red Flags in Candidate Responses

| Red Flag | Why It's Concerning |
|----------|---------------------|
| Jumps to implementation without requirements | Doesn't understand problem-solving process |
| Ignores high cardinality problem | Missing key observability challenge |
| No mention of correlation (trace_id) | Doesn't understand distributed tracing |
| Fully autonomous remediation | Doesn't understand safety requirements |
| No discussion of false positives | Doesn't understand operational reality |
| Ignores self-monitoring | Doesn't think about platform reliability |
| Only mentions one approach | Doesn't consider trade-offs |

---

## Sample Interview Dialogue

**Interviewer**: "Design an AI-native observability platform."

**Candidate**: "Before I start, I'd like to clarify a few things. First, are we designing a multi-tenant SaaS like Datadog/Honeycomb, or an internal platform for a single organization?"

**Interviewer**: "Multi-tenant SaaS."

**Candidate**: "Great. And what scale should I target—millions or billions of events per day?"

**Interviewer**: "Let's say 10 million events per second across all tenants."

**Candidate**: "Understood. And for the AI capabilities—should I focus on anomaly detection, automated investigation, or autonomous remediation?"

**Interviewer**: "Cover all three, but you can go deeper on one."

**Candidate**: "Perfect. Let me start with requirements, then draw the high-level architecture, and we can deep dive on the AI investigation flow since that's the most complex part..."

*[Candidate proceeds with structured approach]*
