# 14.13 AI-Native MSME Business Intelligence Dashboard — Deep Dives & Bottlenecks

## Deep Dive 1: NL-to-SQL Accuracy and Safety

### The Accuracy Challenge

NL-to-SQL accuracy is the single most important metric for user trust. Research shows that when accuracy drops below 85%, users abandon natural language interfaces entirely and revert to manual dashboard exploration—defeating the purpose of the AI-native approach. The challenge is amplified for MSMEs because:

1. **Schema diversity** — No two MSMEs have the same schema. Even merchants using the same accounting software customize field names, add custom columns, and organize data differently.
2. **Query ambiguity** — "How are my sales doing?" could mean daily revenue, monthly trend, comparison to last period, or comparison to target—and the correct interpretation depends on context the system must infer.
3. **Domain-specific vocabulary** — A textile merchant's "grey fabric" means unfinished fabric (not the color grey), and a restaurant's "covers" means customers served (not physical covers). The NL-to-SQL system must handle industry-specific terminology.
4. **Multi-lingual queries** — Merchants query in Hindi, Tamil, or mixed-language inputs ("last week ka revenue kya tha?").

### Production Accuracy Strategy

The system achieves >90% accuracy through a layered approach:

**Layer 1: Intent templates for common patterns (60% of queries)**
The top 50 query patterns (identified from aggregated, anonymized query logs) are handled by deterministic template matching. "What is my [metric] for [time_period]?" maps directly to a parameterized SQL template without LLM involvement. Template matching is fast (10 ms), deterministic, and 99%+ accurate.

**Layer 2: LLM with rich schema context (35% of queries)**
For queries that don't match templates, the LLM receives the tenant's semantic graph (table descriptions, column mappings, sample values, relationship metadata) as context. Few-shot examples are selected from the tenant's own query history (queries where user feedback was positive). This contextual grounding reduces hallucination—the LLM can only reference tables and columns it sees in the schema.

**Layer 3: Clarification dialog (5% of queries)**
When the system's confidence is below 70% (e.g., ambiguous metric name, missing time range, multiple possible interpretations), it generates a clarification question: "Did you mean revenue from sales orders or total revenue including refunds?" This costs one extra interaction but prevents wrong results that erode trust faster than a clarification question.

### The Safety Boundary

NL-to-SQL introduces a unique attack surface: **semantic injection**. Unlike traditional SQL injection (which exploits string concatenation), semantic injection exploits the LLM's instruction-following behavior:

- **Cross-tenant probing**: "Show me all revenues in the database" could trick the LLM into generating SQL without the tenant filter.
- **Schema discovery**: "List all tables in the database" attempts to enumerate system metadata.
- **Resource exhaustion**: "Show me the cartesian product of all tables" generates an expensive query.

**Defense-in-depth:**

| Layer | Mechanism | What It Catches |
|---|---|---|
| Prompt engineering | System prompt explicitly prohibits cross-tenant queries, DDL, and system table access | Most naive attempts |
| Schema scoping | LLM only sees the tenant's semantic graph, not system tables or other tenants' schemas | Schema discovery attacks |
| AST validation | Parse generated SQL; verify tenant predicate, allowed tables/columns, no DDL/DML | Queries that bypass prompt instructions |
| Row-level security | Database-enforced RLS on tenant_id, independent of application logic | Defense if AST validation has bugs |
| Query cost estimation | Reject queries with estimated cost above tenant budget | Resource exhaustion |
| Audit logging | Every generated SQL + original NL logged for adversarial pattern detection | Post-hoc analysis of attack patterns |

---

## Deep Dive 2: Multi-Tenant Query Isolation at Scale

### The Isolation Challenge

With 2M tenants sharing a single analytical warehouse, the system must guarantee that:
1. No tenant can ever see another tenant's data—not through queries, error messages, or inference.
2. One tenant's expensive query cannot degrade performance for other tenants.
3. The operational overhead of managing isolation does not scale linearly with tenant count.

### Data-Level Isolation

**Partitioning strategy:** The warehouse is range-partitioned by `tenant_id` (hash partitioned into 4096 partitions). Each query is rewritten to include a partition filter, enabling the query engine to scan only the relevant partition(s). This reduces I/O by 99.97% compared to a full table scan.

**Row-level security (RLS):** Database-level RLS policies enforce `tenant_id = current_setting('app.tenant_id')` on every table. The application sets this session variable before executing any query. Even if the SQL validator fails to inject the tenant predicate, RLS blocks cross-tenant access.

**Column-level masking:** Sensitive columns (customer phone numbers, email addresses) are masked for non-owner users within a tenant using column-level security policies.

### Compute-Level Isolation

**Query queues:** Each tenant is assigned to a query queue based on their plan tier. Free-tier tenants share a best-effort queue with lower priority. Paid tenants get dedicated query slots with guaranteed latency.

```
QUEUE ALLOCATION:
    free_tier:    shared pool, max 2 concurrent queries, 10s timeout
    starter:      shared pool, max 5 concurrent queries, 30s timeout
    growth:       semi-dedicated pool, max 10 concurrent queries, 60s timeout
    pro:          dedicated compute, max 20 concurrent queries, 120s timeout
```

**Query cost gating:** Before execution, the query optimizer estimates the cost (estimated rows scanned × row size). Queries exceeding the tier's cost budget are rejected with a suggestion to add filters or reduce the time range.

**Circuit breaker:** If a tenant's queries fail 5 times in 60 seconds (e.g., hitting timeouts), the circuit breaker opens and subsequent queries are redirected to the materialized view cache (pre-aggregated data only, no ad-hoc queries) until the circuit resets. This prevents a runaway query pattern from consuming shared resources.

### Performance Isolation

**Materialized view per-tenant:** Common query patterns are pre-computed per tenant during off-peak hours. When a query hits a materialized view, it bypasses the shared query engine entirely, providing consistent sub-200ms latency regardless of other tenants' activity.

**Connection pooling:** Each tenant-tier gets a connection pool sized to its concurrency limit. Pool exhaustion for one tier does not affect other tiers.

---

## Deep Dive 3: Auto-Insight Generation at Scale

### The Scale Problem

Running anomaly detection across 800K monthly active tenants, each tracking 20-50 KPIs, produces 16-40 million anomaly checks per day. Each check requires:
1. Loading 90 days of KPI history (for seasonality decomposition)
2. Running statistical analysis (Prophet decomposition + Z-score)
3. If anomaly detected: dimensional drill-down across 3-5 dimensions
4. Impact estimation and narrative generation

Naive execution (sequential per tenant, per KPI) would require ~200 CPU-hours/day for detection alone, plus LLM calls for narrative generation.

### Scalable Insight Pipeline

**Tier 1: Pre-screening (eliminates 80% of checks)**
Before running full anomaly detection, a lightweight pre-screen compares each KPI's latest value against a ±3σ band computed from a simple 30-day moving average. Only KPIs outside this band proceed to full analysis. This is a fast vector operation on pre-computed statistics—no history loading required.

**Tier 2: Full anomaly detection (20% of KPIs)**
For pre-screened anomalies, load the KPI history and run Prophet-based seasonality decomposition. This is batched across tenants: KPIs are grouped by their seasonality pattern type (daily-weekly, weekly-monthly, monthly-quarterly), and batch decomposition amortizes the model fitting cost.

**Tier 3: Root cause drill-down (5% of KPIs—confirmed anomalies)**
Only statistically significant anomalies (Z-score > 2.0) proceed to root cause analysis. The drill-down queries are pre-compiled per KPI: for "daily_revenue", the drill-down template breaks it down by product_category, channel, customer_segment, and day_of_week. These templates are executed as parameterized queries against materialized views, not raw data.

**Tier 4: Ranking and delivery (1% of KPIs—actionable insights)**
After detection and root cause analysis, insights are ranked by `impact_estimate × confidence × novelty_score`. Only the top 3 per tenant are delivered in the WhatsApp digest. The rest are available in the dashboard's insight feed.

### Insight Quality Feedback Loop

Each delivered insight includes a "useful / not useful" reaction mechanism. This feedback trains a per-tenant insight preference model:
- Insights marked "not useful" have their pattern suppressed (e.g., if the merchant repeatedly dismisses weekday-vs-weekend revenue differences, that pattern type is suppressed)
- Insights marked "useful" boost similar patterns in future ranking
- After 30 days of feedback, the insight engine adapts its novelty and relevance scoring per tenant

---

## Deep Dive 4: Semantic Graph Maintenance and Evolution

### Schema Drift Problem

MSME data sources change without notice. A merchant upgrades their POS software, and column names change. They add a new product category that doesn't map to the existing ontology. They start using a new payment method that creates a new column in the transactions table.

The semantic graph must evolve to reflect these changes without breaking existing queries or insights.

### Drift Detection

On every incremental sync, the connector compares the source schema against the last-known schema stored in the semantic graph:

```
DRIFT TYPES:
    column_added     → AI maps new column; merchant confirms
    column_removed   → Mark dependent queries as potentially broken; alert merchant
    column_renamed   → AI detects via value distribution similarity; propose remapping
    type_changed     → Flag as breaking change; pause affected materialized views
    table_added      → Full AI mapping for new table; extend semantic graph
    table_removed    → Archive dependent semantic nodes; alert merchant
```

### Graceful Degradation

When a drift event potentially breaks existing queries:
1. Affected materialized views are paused (stale data is better than wrong data)
2. NL queries referencing affected columns trigger a clarification: "Your data source has changed. The column 'vch_amt' no longer exists. Did your accounting software rename it?"
3. The system proposes remappings based on column value similarity analysis and waits for merchant confirmation before applying

---

## Bottleneck Analysis

### Bottleneck 1: LLM Inference Latency for NL-to-SQL

**Problem:** LLM inference for SQL generation averages 800 ms, consuming 53% of the 3-second query latency budget. During peak hours, queue wait adds another 200-500 ms.

**Mitigation:**
- Template cache handles 60% of queries without LLM (10 ms instead of 800 ms)
- Semantic cache: identical questions from the same tenant return cached results (15-min TTL)
- Speculative execution: while the LLM generates SQL, pre-warm the query engine connection
- Model distillation: fine-tune a smaller, faster model on the accumulated query logs; use the large model as a fallback for complex queries

### Bottleneck 2: Materialized View Refresh Storm

**Problem:** When 100K tenants' data arrives within the same 15-minute sync window, all their materialized views need refreshing simultaneously, creating a compute storm.

**Mitigation:**
- Staggered sync schedules: distribute tenants across the 15-minute window based on tenant_id hash
- Incremental materialization: only recompute aggregations affected by the new data (partition-level refresh)
- Priority queuing: tenants whose WhatsApp digest is scheduled within 1 hour get priority refresh
- Lazy refresh: views are marked stale but only recomputed when actually queried (for tenants who haven't logged in today)

### Bottleneck 3: Cold-Start Query Latency for New Tenants

**Problem:** New tenants have no materialized views, no query templates, and no semantic graph refinements. Their first queries hit raw data and go through the full LLM pipeline, resulting in 5-8 second response times vs. the 1-2 second experience for established tenants.

**Mitigation:**
- Onboarding pre-computation: after initial data ingestion, immediately compute the top 10 materialized views for the tenant's industry vertical
- Warm start with industry templates: seed the template cache with industry-specific query patterns
- Progressive loading: show instant results from pre-aggregated industry benchmarks ("here's how businesses like yours typically look") while computing the tenant's actual data

### Bottleneck 4: WhatsApp Digest Thundering Herd

**Problem:** 600K merchants requesting digests at 8 AM creates a thundering herd on the WhatsApp Business API (rate limit: 500 messages/second for the account).

**Mitigation:**
- Time-zone sharding: distribute delivery across 8 AM in each timezone (naturally spreads load)
- Pre-computation window: start generating digests at 5 AM (3 hours before first delivery)
- Rate-limited sender: token-bucket rate limiter capped at 400 msg/s (80% of API limit) to stay below throttling threshold
- Fallback channel: if WhatsApp delivery fails twice, retry once more after 30 minutes; if still failing, send via SMS as fallback
