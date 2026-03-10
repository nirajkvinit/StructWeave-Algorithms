# 14.13 AI-Native MSME Business Intelligence Dashboard — Interview Guide

## Interview Format: 45-Minute System Design

### Pacing Guide

| Phase | Time | Focus | What the Interviewer Evaluates |
|---|---|---|---|
| **Phase 1: Requirements** | 0–8 min | Clarify scope, define functional and non-functional requirements | Ability to ask the right questions; prioritization instinct; understanding that MSME ≠ enterprise BI |
| **Phase 2: High-Level Design** | 8–22 min | Architecture, major components, data flow | Component decomposition; NL-to-SQL pipeline awareness; multi-tenant design instinct |
| **Phase 3: Deep Dive** | 22–38 min | 1-2 deep dives chosen by interviewer or candidate | Depth of knowledge; trade-off reasoning; handling of ambiguity |
| **Phase 4: Wrap-Up** | 38–45 min | Scalability, reliability, operational concerns | Production mindset; awareness of failure modes; cost consciousness |

---

## Phase 1: Requirements Gathering

### Key Questions to Ask (as the candidate)

1. **"Who is the primary user?"** — An MSME owner with no technical background, not a data analyst. This fundamentally changes the interface: NL queries, not SQL; auto-insights, not manual exploration; WhatsApp delivery, not email dashboards.

2. **"What data sources do we need to support?"** — Accounting software (Tally is dominant in India), POS systems, e-commerce platforms, bank statements, spreadsheets. The diversity of sources is a key constraint.

3. **"What is the expected scale?"** — 2M registered MSMEs, 800K monthly active, 200K daily active. This is a multi-tenant analytics platform, not a single-tenant data warehouse.

4. **"What languages do merchants query in?"** — English, Hindi, and regional languages. Mixed-language queries ("last month ka revenue") are common.

5. **"What is the latency budget for a natural language query?"** — ≤ 3 seconds. This constrains the NL-to-SQL pipeline design significantly.

### Red Flags in Requirements Phase

- Treating this as a standard enterprise BI system (Tableau, Looker clone)
- Ignoring the NL-to-SQL challenge and jumping to dashboard design
- Not asking about multi-tenancy and data isolation
- Assuming structured, clean data from MSME sources
- Not considering WhatsApp as a primary delivery channel

---

## Phase 2: High-Level Design

### Expected Components

A strong candidate should identify these components:

1. **Data ingestion layer** with pluggable connectors, schema mapping, and quality scoring
2. **Tenant-scoped semantic graph** mapping raw schemas to business concepts
3. **NL-to-SQL pipeline** with multi-stage processing (intent → entities → schema mapping → SQL generation → validation → execution)
4. **Analytical query engine** with columnar storage and materialized views
5. **Auto-insight engine** with anomaly detection, root cause analysis, and ranking
6. **Notification delivery** with WhatsApp digest, email, and push
7. **Benchmark service** with differential privacy for anonymized peer comparisons

### Key Design Decisions to Probe

**"How do you handle the semantic gap between natural language and SQL?"**

Expected: Multi-stage pipeline with semantic graph. The candidate should NOT suggest passing the raw question to an LLM with the full schema—this fails at scale because (a) schemas are too large for context windows, (b) accuracy is poor without entity extraction and schema mapping, and (c) there's no safety validation.

**"How do you ensure one tenant can never see another tenant's data?"**

Expected: Defense-in-depth (application-level filtering + SQL rewriting + database-level RLS). A candidate who says "just add WHERE tenant_id = X" gets a follow-up: "What if the LLM forgets to add the tenant filter?"

**"How do you build the semantic graph for a new tenant with zero documentation?"**

Expected: AI-assisted column mapping using column names, value distributions, and data types; cross-source entity resolution; merchant confirmation step. The cold-start problem is a defining challenge.

---

## Phase 3: Deep Dive Topics

### Deep Dive A: NL-to-SQL Pipeline

**Starter question:** "Walk me through exactly what happens when a merchant types 'Why did my sales drop last Tuesday?'"

**Expected depth:**
- Intent classification: this is an anomaly-explanation query, not a simple metric lookup
- Entity extraction: "sales" → revenue metric, "last Tuesday" → specific date
- Schema mapping: "sales" maps to `orders.total_amount` via semantic graph
- SQL generation: the LLM generates a comparison query (Tuesday vs. expected Tuesday baseline)
- Validation: verify tenant isolation, cost estimation
- Execution + root cause: run the query, then drill down by dimension to find the root cause
- Narration: generate a human-readable explanation

**Trap question:** "What if the merchant asks 'Show me all the data in the system'?"

**Expected answer:** This should NOT generate `SELECT * FROM all_tables`. The system should classify this as an ambiguous/overly broad query and respond with a clarification: "I can show you revenue trends, customer analysis, product performance, or expense breakdown. Which would you like to explore?" The query validator should also reject any query without specific table references as a safety measure.

**Trap question:** "How do you handle 'Compare my revenue with other businesses nearby'?"

**Expected answer:** This crosses from NL-to-SQL (querying the tenant's own data) into the benchmark system (querying aggregated peer data). The system must route this to the benchmark API, not generate SQL against the shared warehouse. A naive LLM might try to query other tenants' data—this is exactly why the SQL validator and RLS are critical.

### Deep Dive B: Auto-Insight Generation

**Starter question:** "How does the system decide which 3 insights to send in the morning WhatsApp digest?"

**Expected depth:**
- Detection: statistical anomaly detection with seasonality decomposition
- Root cause: dimensional drill-down to attribute the anomaly to specific segments
- Ranking: `impact_estimate × confidence × novelty_score` — not just statistical significance
- Personalization: merchant feedback loop (useful/not useful reactions) adjusts future ranking
- Delivery: respect WhatsApp template constraints (1024 chars); format for mobile readability

**Trap question:** "A merchant gets 'Your Saturday revenue was higher than Friday' every week. How do you prevent this?"

**Expected answer:** Seasonality decomposition. The baseline model accounts for day-of-week patterns. Saturday being higher than Friday is expected and should NOT be flagged. Only deviations from the expected Saturday level should generate insights. Additionally, the novelty filter should suppress any insight pattern that has been delivered >3 times with "not useful" feedback.

**Trap question:** "How do you generate insights for a brand-new tenant with only 2 weeks of data?"

**Expected answer:** Cold-start for insights is even harder than for NL-to-SQL. With 2 weeks of data, there's no reliable seasonality model. The system should: (1) use industry cohort baselines as a proxy until the tenant has 90 days of data, (2) focus on simple comparisons (this week vs. last week) rather than trend analysis, (3) heavily weight benchmark-based insights ("your average order value is 20% below similar businesses") over anomaly-based insights.

### Deep Dive C: Multi-Tenant Data Isolation

**Starter question:** "Explain your data isolation strategy as if I'm a security auditor."

**Expected depth:** Four layers of defense (application, validation, database RLS, audit). The candidate should explain why each layer is necessary (defense-in-depth) and what attack it prevents that the others might miss.

**Trap question:** "What if I compromise the application layer and set the session variable to another tenant's ID?"

**Expected answer:** This is why RLS alone is not sufficient—but combined with audit logging and anomaly detection, the system detects the breach. The key is that the session variable is set by the API gateway from the authenticated JWT, not by the application code. Compromising this requires compromising the authentication system, which is a separate and more heavily defended surface.

---

## Phase 4: Scalability & Operations

### Questions

**"How does the system perform with 2M tenants?"**
- Warehouse partitioning by tenant_id (4096 partitions)
- Materialized views for common queries (80% cache hit)
- LLM inference pool with auto-scaling
- Staggered data ingestion to avoid compute storms

**"What happens when the LLM service goes down?"**
- Circuit breaker pattern
- Template-based queries still work (60% of queries)
- Materialized view queries still work
- WhatsApp digests from pre-computed insights still deliver
- Status message: "Advanced analytics temporarily unavailable"

**"How do you control costs at scale?"**
- Template matching avoids LLM calls for 60% of queries
- Semantic caching avoids re-execution for 25% of queries
- Materialized views reduce compute for common patterns
- Tiered storage (hot/warm/cold) based on data age
- Query cost gating prevents expensive ad-hoc queries from consuming shared resources

---

## Scoring Rubric

### Junior (L3-L4): Meets Expectations

- Identifies the core NL-to-SQL challenge
- Designs a basic multi-tenant architecture with tenant_id filtering
- Recognizes the need for data connectors and ingestion
- Designs a simple dashboard with pre-built charts
- Understands WhatsApp as a delivery channel

### Mid-Level (L5): Exceeds Expectations

- Designs a multi-stage NL-to-SQL pipeline (not just "send to LLM")
- Implements defense-in-depth for tenant isolation (not just WHERE clause)
- Considers semantic graph for schema mapping
- Discusses materialized views for common query patterns
- Addresses insight ranking (impact vs. statistical significance)

### Senior (L6): Strong Hire

- Addresses the semantic graph cold-start problem
- Designs the insight ranking algorithm with novelty and feedback loops
- Discusses differential privacy for benchmarks
- Identifies the NL injection attack surface and mitigations
- Considers graceful degradation when LLM service is unavailable
- Discusses cost optimization (template caching, semantic caching, tiered compute)

### Staff (L7): Exceptional

- Frames the NL-to-SQL safety problem as a unique security challenge (not traditional SQL injection)
- Designs the end-to-end feedback loop: NL query → user correction → semantic graph update → template promotion → improved accuracy
- Discusses the insight cold-start problem (new tenants with insufficient data)
- Addresses the benchmark privacy-utility trade-off with formal differential privacy guarantees
- Considers the operational complexity of managing 2M semantic graphs
- Discusses multi-language NL understanding challenges and mitigation strategies

---

## Common Mistakes

| Mistake | Why It's Wrong | Better Approach |
|---|---|---|
| "Just use GPT to convert NL to SQL" | No validation, no safety, poor accuracy on messy schemas, no tenant isolation | Multi-stage pipeline with semantic graph, validation, and fallback |
| "Separate database per tenant" | Operationally impossible at 2M tenants (2M databases to manage) | Shared warehouse with partitioning + RLS + audit |
| "Run anomaly detection on every metric every minute" | Astronomically expensive; most metrics don't change frequently | Pre-screening tier to eliminate 80% of checks; batch processing for the rest |
| "Send all insights in the WhatsApp digest" | Information overload; merchant gets 20 insights and reads none | Rank by impact × confidence × novelty; deliver top 3 only |
| "Use the same LLM for all queries" | Expensive and slow; 60% of queries are simple patterns | Template matching for common patterns; LLM for complex ad-hoc only |
| "Benchmark by simple averaging" | Privacy violation risk in small cohorts | Differential privacy with calibrated noise |
