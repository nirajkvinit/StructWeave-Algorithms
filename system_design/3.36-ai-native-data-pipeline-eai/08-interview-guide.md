# Interview Guide

## Interview Approach

### Key Insight: EAI is the Evolution Beyond ETL/ELT

This design tests understanding of:
1. **AI integration** - How AI enhances each pipeline stage
2. **Autonomous operations** - Self-healing, auto-remediation
3. **Data quality as first-class** - Not an afterthought
4. **Human-in-the-loop** - When to auto-heal vs escalate
5. **Cost awareness** - LLM costs, compute optimization

**The candidate who treats this as "ETL with AI sprinkled on" will fail. The key is understanding where AI fundamentally changes the architecture.**

---

## 45-Minute Interview Pacing

| Time | Phase | Focus | Key Questions |
|------|-------|-------|---------------|
| **0-5 min** | Clarify | Scope the problem | Scale? Real-time vs batch? Quality requirements? |
| **5-15 min** | High-Level | Core architecture | EAI layers, medallion architecture, data flow |
| **15-30 min** | Deep Dive | One component deep | Schema mapping OR self-healing OR anomaly detection |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failures | What breaks at 10x? LLM costs? Human-in-loop? |
| **40-45 min** | Wrap Up | Summary, extensions | How would you monitor? What would you improve? |

---

## Phase 1: Clarifying Questions (0-5 min)

### Questions to Ask the Interviewer

| Question | Why It Matters |
|----------|----------------|
| "How many data sources are we integrating?" | Drives connector and schema mapping complexity |
| "What's the expected data volume per day?" | Determines batch vs streaming, scaling strategy |
| "What percentage of sources have frequent schema changes?" | Drives investment in schema drift handling |
| "What are the latency requirements for data freshness?" | CDC vs batch, SLA definitions |
| "How important is data quality vs raw throughput?" | Quality gates vs pass-through |
| "What's the budget for AI/LLM usage?" | Caching strategy, when to use LLM |
| "Are there compliance requirements (GDPR, HIPAA)?" | PII handling, data residency |

### Red Flags in Requirements

| Requirement | Concern | Clarify |
|-------------|---------|---------|
| "Real-time everything" | Cost, complexity | What truly needs <1s latency? |
| "100% automated" | Impossible for schema changes | When is human review acceptable? |
| "Zero data loss" | Expensive, may conflict with throughput | What's the acceptable RPO? |
| "No LLM costs" | Limits AI capabilities | Can we use embeddings only? |

---

## Phase 2: High-Level Design (5-15 min)

### Core Architecture to Draw

```
[Data Sources] → [Ingestion Layer] → [AI Processing Layer] → [Orchestration Layer] → [Storage Layer] → [Consumers]
                       ↓                     ↓                       ↓
                 [Schema Discovery]    [Schema Mapping]        [Self-Healing]
                 [CDC Capture]         [NL-to-SQL]             [Anomaly Detection]
                                       [Quality Scoring]        [Remediation]
```

### Key Points to Mention

1. **EAI Paradigm**: "This is Extract-AI Process-Integrate, not just ETL. AI is embedded at every stage, not a bolt-on."

2. **Medallion Architecture**: "We use Bronze (raw), Silver (cleaned), Gold (curated) layers. AI validation happens between layers."

3. **Schema-First Approach**: "Unlike traditional pipelines, we discover and map schemas autonomously using embeddings + LLM fallback."

4. **Quality as First-Class**: "Every record is quality-scored. We don't just move data—we validate it."

5. **Self-Healing**: "The system classifies errors and auto-remediates transient failures. Only novel errors escalate to humans."

### Architecture Checklist

| Component | Mentioned? | Key Decision |
|-----------|------------|--------------|
| Connector framework | ☐ | Support for 100+ source types |
| AI schema discovery | ☐ | Embedding-based inference |
| Schema mapping service | ☐ | Confidence scoring, LLM fallback |
| Transformation engine | ☐ | NL-to-SQL generation |
| Quality engine | ☐ | Multi-dimensional scoring |
| Self-healing controller | ☐ | Error classification, remediation |
| Anomaly detection | ☐ | Statistical + ML |
| Storage (Iceberg) | ☐ | Schema evolution support |
| Lineage tracking | ☐ | Column-level |

---

## Phase 3: Deep Dive (15-30 min)

### Option A: AI Schema Mapping Deep Dive

**Key Points to Cover:**

1. **Multi-Signal Approach**:
   - Field name embeddings (semantic similarity)
   - Type compatibility checking
   - Statistics matching (null rates, distributions)
   - Historical mapping patterns

2. **Confidence-Based Routing**:
   - High confidence (>0.85): Auto-approve
   - Medium confidence (0.7-0.85): LLM disambiguation
   - Low confidence (<0.7): Human review queue

3. **LLM Disambiguation**:
   - Prompt with field names, types, samples
   - Ask LLM to reason about best match
   - Parse structured response, validate against schema

4. **Failure Modes**:
   - Semantic ambiguity (multiple valid targets)
   - Name collision (same name, different meaning)
   - New field with no analog

**Sample Deep Dive Question:** "What happens when a source adds a new column?"

**Good Answer:** "We detect the schema change, run embedding-based matching against unmapped target fields. If confidence is high, we auto-map and continue. If low, we add to human review queue but don't block the pipeline—we ingest with the new column as-is and alert the data engineer."

### Option B: Self-Healing Deep Dive

**Key Points to Cover:**

1. **Error Classification Taxonomy**:
   - Transient (network, rate limit) → Auto-retry
   - Schema drift (column added/removed) → Conditional auto-heal
   - Data quality (null violation) → Quarantine + continue
   - Configuration (credential expired) → Escalate

2. **Decision Flow**:
   ```
   Error → Classify → Is auto-healable? →
     Yes → Apply remediation → Track outcome
     No → Escalate to human → Track resolution
   ```

3. **Remediation Actions**:
   - Exponential backoff retry
   - Schema mapping update
   - Record quarantine
   - Rate limit adjustment

4. **Feedback Loop**:
   - Track healing outcomes
   - Retrain classification model
   - Adjust thresholds based on success rate

**Sample Deep Dive Question:** "How do you avoid making things worse with auto-healing?"

**Good Answer:** "Three safeguards: (1) We only auto-heal error types with proven >80% success rate. (2) We have circuit breakers—if an auto-heal fails twice, we escalate. (3) Every remediation is reversible with automatic rollback if the fix causes new errors."

### Option C: Anomaly Detection Deep Dive

**Key Points to Cover:**

1. **Detection Methods**:
   - Statistical: Z-score, IQR for known distributions
   - ML: Isolation Forest for multivariate anomalies
   - LSTM Autoencoder for sequence patterns

2. **Metric Types**:
   - Freshness: Time since last update
   - Volume: Row count deviation
   - Distribution: KL divergence, PSI
   - Schema: Structural changes

3. **Adaptive Thresholds**:
   - Adjust based on false positive feedback
   - Time-of-day awareness (weekends less sensitive)
   - Seasonal pattern recognition

4. **Alert Correlation**:
   - Group related anomalies
   - Identify root cause vs symptoms
   - Reduce alert fatigue

**Sample Deep Dive Question:** "How do you handle alert fatigue?"

**Good Answer:** "Multiple strategies: (1) Adaptive thresholds that raise the bar when FP rate exceeds 5%. (2) Alert correlation to group related anomalies into single incidents. (3) User feedback loop—marked false positives train the model to suppress similar alerts. (4) Severity-based routing—not everything pages the on-call."

---

## Phase 4: Scale & Trade-offs (30-40 min)

### Trade-offs Discussion

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Schema Handling** | Strict validation (fail on mismatch) | Flexible evolution (adapt to changes) | **Iceberg + AI validation**: Get both safety and flexibility |
| **Transformation** | Pre-defined SQL (fast, predictable) | AI-generated (flexible, slower) | **Hybrid**: AI generates, human validates for critical pipelines |
| **Anomaly Detection** | Rule-based (interpretable) | ML-based (catches more) | **ML for detection, rules for critical**: Best of both |
| **Self-Healing** | Auto-remediate all (less human burden) | Human-approve all (safer) | **Tiered**: Auto for transient, human for schema/data |
| **LLM Usage** | Use for everything (best quality) | Minimize (cost control) | **Selective**: LLM for complex, embeddings for simple |

### Bottleneck Discussion

| Bottleneck | At What Scale? | Mitigation |
|------------|----------------|------------|
| Schema inference | >1000 columns/table | Sampling, parallelization |
| LLM latency | >100 transforms/pipeline | Caching, batching, smaller models |
| CDC throughput | >500K events/sec | Horizontal partitioning |
| Quality scoring | >10TB/day | Sampling, micro-batching |
| Lineage computation | >10K tables | Incremental updates |

### Cost Discussion

**Interviewer:** "What are the main cost drivers?"

**Good Answer:**
1. **Compute**: Ingestion workers, transformation jobs
2. **Storage**: Medallion layers, especially Bronze retention
3. **LLM**: NL-to-SQL generation, schema disambiguation
4. **Observability**: Metrics, logs, traces at scale

**Cost Optimization:**
- "LLM caching can reduce API calls by 50%+"
- "Iceberg compaction reduces storage costs"
- "Sampling for quality checks trades precision for cost"
- "Auto-scaling with predictive sizing avoids over-provisioning"

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| **"Why not just use Airflow?"** | Understand AI-native difference | "Airflow orchestrates workflows, but doesn't provide AI schema mapping, self-healing, or anomaly detection. This is about intelligent data engineering, not just scheduling." |
| **"What if AI schema mapping is wrong?"** | Confidence, fallback strategy | "Every mapping has a confidence score. Below 0.7, it goes to human review. Mappings are validated against sample data before production. We can always rollback." |
| **"How do you handle 10x data volume?"** | Scalability thinking | "Horizontal scaling of ingestion workers, partition CDC streams, shard metadata store, sample for quality checks. The bottleneck is usually LLM—we cache aggressively." |
| **"What's the cost of LLM transformations?"** | Cost awareness | "~$0.01 per transformation. At 10K transforms/day, that's $100/day. We mitigate with caching (50% hit rate), batching prompts, and using LLM only for complex cases." |
| **"What if self-healing makes things worse?"** | Safety awareness | "Circuit breakers. If an auto-heal fails twice, we stop and escalate. Every remediation is reversible. We track success rates and only auto-heal error types with >80% success." |
| **"Why medallion architecture?"** | Data organization understanding | "Bronze preserves raw data for audit and reprocessing. Silver applies validation so downstream consumers get clean data. Gold aggregates for specific use cases. AI validation happens at each transition." |

---

## Common Mistakes to Avoid

### Architectural Mistakes

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Treating it as ETL + AI plugin | Misses the paradigm shift | AI is embedded at every stage |
| Ignoring human-in-loop | 100% automation is impossible | Design for human escalation |
| Over-relying on LLMs | Latency, cost, hallucination | Use embeddings + rules where possible |
| Single data quality check | Quality is multi-dimensional | Freshness, volume, distribution, completeness |
| Not addressing schema drift | Most common failure mode | Explicit schema evolution strategy |

### Communication Mistakes

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Jumping to solution | Missing requirements | Ask clarifying questions first |
| No diagrams | Hard to follow | Draw architecture, data flow |
| Only happy path | Ignores reality | Discuss failure scenarios |
| No trade-offs | Seems naive | Every decision has trade-offs |
| Generic scalability | "Add more servers" | Specific bottlenecks and mitigations |

---

## Phase 5: Wrap Up (40-45 min)

### Summary Checklist

- [ ] Covered EAI paradigm (not just ETL)
- [ ] Explained schema mapping (embedding + LLM + human)
- [ ] Described self-healing (classification + remediation)
- [ ] Discussed anomaly detection (statistical + ML)
- [ ] Addressed data quality (multi-dimensional scoring)
- [ ] Explained medallion architecture (Bronze/Silver/Gold)
- [ ] Discussed trade-offs explicitly
- [ ] Covered failure scenarios
- [ ] Mentioned observability

### Questions to Expect

| Question | Good Answer |
|----------|-------------|
| "What would you build first?" | "Schema discovery and mapping—it's the foundation. Without accurate schema mapping, nothing else works." |
| "What's the hardest part?" | "Self-healing for schema changes. Transient errors are easy, but schema drift requires understanding semantic changes." |
| "How would you test this?" | "Integration tests with schema change simulation, chaos engineering for failure scenarios, shadow mode for AI components before production." |
| "What would you monitor?" | "Schema mapping confidence distribution, self-healing success rate, anomaly detection precision, LLM token costs, overall data quality score." |

---

## Quick Reference Card

```
+------------------------------------------------------------------------+
|       AI-NATIVE DATA PIPELINE (EAI) - INTERVIEW QUICK REFERENCE        |
+------------------------------------------------------------------------+
|                                                                         |
|  KEY DIFFERENTIATORS FROM ETL                                          |
|  ---------------------------                                            |
|  1. AI schema mapping (not manual)                                     |
|  2. Self-healing (not alerting only)                                   |
|  3. Quality as first-class (not afterthought)                          |
|  4. NL-to-SQL generation (not hand-coded)                              |
|  5. Autonomous operation (not human-dependent)                         |
|                                                                         |
+------------------------------------------------------------------------+
|                                                                         |
|  SCHEMA MAPPING FLOW               SELF-HEALING FLOW                   |
|  -----------------                 -----------------                    |
|  Field → Embedding →               Error → Classify →                  |
|  Similarity → Threshold →          Transient? → Auto-retry             |
|  High: Auto-map                    Schema? → Conditional               |
|  Low: LLM → Still low: Human       Quality? → Quarantine               |
|                                    Unknown? → Escalate                  |
|                                                                         |
+------------------------------------------------------------------------+
|                                                                         |
|  QUALITY DIMENSIONS (FVDCS)        MEDALLION LAYERS                    |
|  ----------------------            ---------------                      |
|  Freshness:   Update latency       Bronze: Raw, full fidelity          |
|  Volume:      Row count            Silver: Cleaned, validated          |
|  Distribution: Value profiles      Gold:   Curated, aggregated         |
|  Completeness: Null rates                                              |
|  Schema:      Structure changes    AI validation at each transition    |
|                                                                         |
+------------------------------------------------------------------------+
|                                                                         |
|  KEY NUMBERS TO MENTION                                                |
|  ----------------------                                                 |
|  Schema mapping accuracy:     95%+                                     |
|  Self-healing success:        78% for transient                        |
|  Human intervention target:   <30% of failures                         |
|  LLM cost per transform:      ~$0.01                                   |
|  Cache hit rate target:       >30%                                     |
|                                                                         |
+------------------------------------------------------------------------+
|                                                                         |
|  TRAP QUESTION DEFENSES                                                |
|  ----------------------                                                 |
|  "Why not Airflow?"   → Orchestration ≠ AI schema mapping + healing    |
|  "AI mapping wrong?"  → Confidence scores + human review + rollback    |
|  "10x scale?"         → Horizontal + partition + cache LLM             |
|  "LLM costs?"         → Cache + batch + selective use                  |
|  "Self-heal worse?"   → Circuit breakers + reversible + escalation     |
|                                                                         |
+------------------------------------------------------------------------+
```

---

## Interview Success Criteria

### Strong Candidate Signals

| Signal | Example |
|--------|---------|
| **Understands EAI paradigm** | "This isn't just ETL with AI—AI fundamentally changes how we approach schema mapping and error handling" |
| **Thinks about confidence** | "Every AI decision has a confidence score; low confidence triggers human review" |
| **Considers failure modes** | "What if the LLM hallucinates? We validate generated SQL against the schema" |
| **Cost-aware** | "LLM calls are expensive; we cache and use embeddings where possible" |
| **Operational mindset** | "We need to track self-healing success rate and adjust thresholds" |

### Red Flags

| Red Flag | Concern |
|----------|---------|
| "We'll use GPT-4 for everything" | Cost and latency not considered |
| "AI will handle all errors" | Doesn't understand limitations |
| "Schema mapping is easy" | Underestimates complexity |
| "Just add more servers" | Generic scalability answer |
| "No need for human review" | 100% automation is unrealistic |

---

## Additional Resources

### Related Designs to Study

- [3.15 RAG System](../3.15-rag-system/00-index.md) - Context retrieval patterns
- [3.21 LLM Gateway](../3.21-llm-gateway-prompt-management/00-index.md) - LLM routing and cost optimization
- [3.25 AI Observability](../3.25-ai-observability-llmops-platform/00-index.md) - AI-specific monitoring

### Key Concepts to Review

- Embedding similarity and cosine distance
- Isolation Forest for anomaly detection
- Apache Iceberg schema evolution
- Medallion architecture patterns
- Circuit breaker pattern
