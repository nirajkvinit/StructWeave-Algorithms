# Insights — AI-Native MSME Business Intelligence Dashboard

## Insight 1: The Semantic Graph Is a Slowly Evolving Consensus, Not a One-Time Mapping

**Category:** System Modeling

**One-liner:** The semantic graph that maps raw database columns to business concepts is not a static configuration artifact created during onboarding—it is a living model that evolves through four feedback signals simultaneously, and converging these signals without contradictions requires a conflict resolution protocol similar to CRDTs.

**Why it matters:** The naive approach treats semantic mapping as an onboarding step: the AI maps columns, the merchant confirms, and the mapping is frozen. But in production, the semantic graph receives continuous updates from four sources: (1) the AI column mapper proposes new mappings when schema drift is detected (the accounting software updated and renamed a column); (2) the merchant corrects a mapping through the UI ("no, 'party_name' refers to my suppliers, not customers"); (3) the NL-to-SQL engine implicitly votes on mappings through successful query execution (when a query using a particular mapping returns results the merchant marks as "helpful," that mapping is reinforced); (4) the insight engine validates mappings when detected anomalies are confirmed as real (if the system detects a revenue anomaly using a specific column mapping and the merchant confirms it, the mapping is validated). These four signals can conflict: the AI might propose remapping "amt" from "revenue" to "invoice_amount" while the NL query engine's usage data shows "revenue" is working correctly. The production system treats each signal as a vote with different weights (merchant explicit correction: weight 10, successful query feedback: weight 3, AI re-mapping: weight 2, insight validation: weight 5) and only applies a mapping change when the cumulative vote exceeds a threshold. This prevents oscillation where the AI keeps re-proposing a mapping that the merchant has already corrected.

---

## Insight 2: Query Result Caching Requires Semantic Deduplication, Not String Matching

**Category:** Caching

**One-liner:** Two natural language queries that are textually different but semantically identical ("What was my revenue last month?" on March 10 and "How much did I make in February?" on March 10) must resolve to the same cache entry, requiring a semantic normalization layer that traditional string-based cache keys cannot provide.

**Why it matters:** Standard cache key strategies (hash the query string) fail spectacularly for NL-to-SQL systems because the same question can be phrased in hundreds of ways. Even worse, time-relative queries ("last month," "previous quarter," "yesterday") change their meaning every day, so the same string produces different SQL on different days. The production system computes a semantic cache key from the normalized query representation: `hash(tenant_id, intent, sorted(metrics), sorted(dimensions), resolved_time_range, sorted(filters))`. "Revenue last month" and "February revenue" both normalize to `{metric: revenue, time: 2026-02-01..2026-02-28}` and hit the same cache entry. The cache TTL is tied to data freshness: when the tenant's data is updated (new incremental sync), all cache entries whose time range includes recent data are invalidated. Entries for historical ranges ("revenue in January") are never invalidated because the data cannot change retroactively. This semantic caching achieves a 25% hit rate—modest compared to traditional caches, but each hit saves 2-3 seconds of LLM inference + query execution, which at 250K hits/day saves $40K/month in compute.

---

## Insight 3: The Insight Novelty Problem Is a Per-Tenant Information Theory Problem

**Category:** Workflow

**One-liner:** Determining whether an insight is "novel" (worth delivering) or "obvious" (already known to the merchant) requires maintaining a per-tenant model of what the merchant already knows—essentially an information-theoretic model of the merchant's beliefs about their business.

**Why it matters:** The insight engine detects hundreds of statistical anomalies per tenant per month. Most are noise, and many of the real anomalies are "obvious" to the merchant (they already know weekends are busier). The challenge is that "obvious" is subjective and tenant-specific. A Saturday revenue spike is obvious for a restaurant but surprising for a B2B supplier. The production system maintains a "known patterns" model per tenant, initialized from the tenant's industry vertical (restaurants expect weekend spikes, B2B suppliers expect weekday dominance) and refined through feedback. Each insight is scored for novelty: `novelty = 1 - max(similarity(insight, known_pattern) for known_pattern in tenant.known_patterns)`. When a merchant marks an insight as "not useful," the underlying pattern is added to their known_patterns set with a decay weight (patterns fade over time—if Saturday spikes stop being normal, the system should eventually re-flag them). The known_patterns model is surprisingly compact: typically 20-50 patterns per tenant, stored as feature vectors of `(kpi, dimension, direction, seasonality_type)`. At 200 bytes per pattern, the entire model for 2M tenants fits in 20 GB.

---

## Insight 4: Materialized View Selection Is a Multi-Tenant Set Cover Problem Under a Storage Budget

**Category:** Data Structures

**One-liner:** Choosing which materialized views to pre-compute per tenant is a set cover problem: each view "covers" a set of query patterns, and the goal is to cover the maximum number of likely queries within a per-tenant storage budget—but the coverage sets change as merchant behavior evolves.

**Why it matters:** With 2M tenants and an average of 100 MB of materialized view storage per tenant, the total MV storage is 200 TB. This is not free. The naive approach—pre-compute the same 10 views for every tenant based on industry templates—wastes storage for tenants whose queries don't match the templates and misses coverage for tenants with unusual query patterns. The production system uses a feedback-driven view selection algorithm: (1) log all queries per tenant with their execution cost; (2) cluster queries by their SQL structure (ignoring literal values) to identify query patterns; (3) for each pattern, estimate the storage cost of a materialized view and the compute savings from caching; (4) select views that maximize `sum(query_frequency × latency_savings) / storage_cost` subject to the per-tenant storage budget. This selection is re-evaluated weekly. Tenants with predictable query patterns (always ask the same 5 questions) get highly optimized views with 90%+ cache hit rates. Tenants with diverse, exploratory queries get fewer views, and their queries hit the columnar store directly. The expected value of a view is continuously tracked: if a view is pre-computed but never queried for 14 days, it is evicted and the storage is reallocated.

---

## Insight 5: The WhatsApp Digest Character Limit Forces an Extractive-Abstractive Summarization Pipeline

**Category:** Cost Optimization

**One-liner:** Fitting 3 actionable business insights with root cause explanations, KPI indicators, and deep-link calls-to-action into WhatsApp's 1024-character template limit is a constrained summarization problem that requires a two-stage pipeline: extractive (select the most important facts) then abstractive (compress them into natural language within the character budget).

**Why it matters:** A single insight narrative (e.g., "Revenue on Tuesday dropped 23% below expected levels. The primary driver was a 45% decline in electronics sales, specifically products from Vendor X who experienced shipment delays affecting 4 products that account for 31% of Tuesday revenue. Consider contacting Vendor X about delivery timelines.") is already 300+ characters. Three insights plus KPI indicators plus deep links easily exceed 2000 characters. Simple truncation destroys the information hierarchy: truncating at 1024 characters might cut off the most actionable insight. The production system uses a two-stage approach: (1) extractive—for each insight, compute an "information density" score per sentence and select the sentences that maximize information within a per-insight character budget (budget allocated proportionally to insight impact score); (2) abstractive—the LLM compresses the extracted sentences into a fluent narrative that fits the remaining character budget after formatting overhead (KPI indicators, deep links, header). The character budget is allocated: 100 chars for header/greeting, 250 chars per insight × 3 = 750 chars, 174 chars for KPI indicators and deep links. Each insight's 250 chars must convey what happened, why it matters, and what to do—a compression ratio of roughly 3:1 from the full narrative.

---

## Insight 6: Cross-Tenant Benchmark Computation Requires an Asymmetric Trust Model

**Category:** Resilience

**One-liner:** Benchmark computation aggregates data across tenants who are often direct competitors, creating an asymmetric trust requirement: each tenant trusts the system to provide accurate benchmarks but does NOT trust the system to protect their individual data from being reverse-engineered by competitors in the same cohort.

**Why it matters:** The benchmark system must satisfy two contradictory goals: (1) benchmarks must be accurate enough to be useful (a benchmark with ±50% noise is worthless), and (2) no individual tenant's contribution to the benchmark can be inferred by any other tenant or external observer. Differential privacy provides the theoretical framework, but the implementation is nuanced for business metrics. Revenue follows a power-law distribution in most MSME verticals—a few large businesses dominate the average. Without clipping, the mean benchmark essentially reveals the top contributor. The production system applies value clipping at the 5th and 95th percentiles before aggregation, which caps the influence of outliers. But clipping introduces bias: the reported benchmark underestimates the true mean for top-heavy verticals. To compensate, the system reports percentile-based benchmarks (p25, p50, p75) rather than means—percentiles are more robust to both outliers and clipping bias. The privacy budget (ε = 1.0 per KPI per month) means that a tenant querying benchmarks 10 times across different KPIs exhausts the standard budget. Additional queries receive noisier results (higher ε allocation per query from a reserve budget) rather than being blocked, ensuring usability while maintaining privacy guarantees.

---

## Insight 7: The NL-to-SQL Feedback Loop Creates a Template Promotion Pipeline That Mirrors Code Compilation

**Category:** Contention

**One-liner:** High-frequency NL query patterns are progressively "compiled" from LLM-generated SQL to validated templates to pre-computed materialized views—a three-stage optimization pipeline analogous to JIT compilation, where the "hot path" detection is driven by tenant-agnostic query structure analysis rather than individual query frequency.

**Why it matters:** The LLM-per-query approach is correct but expensive (800 ms, $0.001/query in inference cost). The system identifies query patterns that appear frequently across tenants (not just within one tenant) and promotes them through an optimization pipeline: Stage 1 (interpreted): LLM generates SQL for every execution—full flexibility but high cost. Stage 2 (compiled template): when a query structure appears >100 times across tenants (e.g., "SELECT [metric] FROM [table] WHERE [tenant_filter] AND [time_range] GROUP BY [dimension] ORDER BY [metric] DESC LIMIT [n]"), it is extracted as a parameterized template. Template execution bypasses the LLM entirely: entity extraction fills the parameters, and the SQL is generated deterministically in 10 ms. Stage 3 (materialized): when a template is executed >50 times per day for a specific tenant, the result is pre-computed as a materialized view refreshed on data ingestion. Execution becomes a simple cache lookup in 5 ms. This pipeline runs automatically: query logs are analyzed nightly, new templates are promoted weekly, and view selections are recalculated weekly. The system tracks a "compilation coverage" metric: at steady state, 60% of queries are template-served, 20% are MV-served, and only 20% require LLM inference—reducing average query cost by 75% compared to naive LLM-per-query.

---

## Insight 8: Tenant Onboarding Latency Is Dominated by Semantic Ambiguity Resolution, Not Data Transfer

**Category:** System Modeling

**One-liner:** The time-to-first-insight for a new tenant is not bottlenecked by data ingestion (moving bytes from source to warehouse, which takes minutes) but by semantic ambiguity resolution (determining what the data means, which requires merchant interaction and can take hours or days if the mapping is unclear).

**Why it matters:** The naive onboarding flow is: connect source → ingest data → build semantic graph → start querying. The expected bottleneck is data ingestion (transferring 500 MB of transaction history). In practice, data transfer takes 5-10 minutes for a typical MSME, but the semantic graph construction surfaces ambiguities that only the merchant can resolve: is `vch_type = "Rcpt"` a customer receipt or a purchase receipt? Does `amt` in the ledger table represent gross or net amount? Is the `party` field always a customer, or sometimes a supplier? These ambiguities block the NL-to-SQL pipeline—queries against ambiguous fields produce unreliable results. The production system decouples onboarding from ambiguity resolution: (1) ingest data and build the semantic graph with AI-assigned mappings (confidence scores attached); (2) immediately enable NL queries against high-confidence mappings (≥0.85), which typically cover 60-70% of the schema; (3) flag low-confidence mappings as "unverified" and exclude them from NL queries until the merchant confirms; (4) present ambiguities as simple multiple-choice questions in the merchant's language ("Does 'party name' mean your customers or your suppliers?"); (5) track which ambiguities are actually blocking real queries (a low-confidence mapping for a column the merchant never asks about can remain unresolved indefinitely). This "progressive resolution" approach means merchants can start querying within 15 minutes of connecting their data, even though full semantic coverage may take days of incremental merchant interactions.

---

## Insight 9: The Auto-Insight Pipeline Must Handle Correlated Anomalies Without Double-Counting Impact

**Category:** Atomicity

**One-liner:** When multiple KPIs anomaly simultaneously (revenue dropped, order count dropped, and average order value dropped), the insight engine must determine whether these are three independent anomalies or a single root cause manifesting across correlated metrics—and deliver one insight, not three, to avoid overwhelming the merchant with redundant alerts.

**Why it matters:** KPIs in a business are not independent. Revenue = order_count × average_order_value. If order count drops 20%, revenue drops proportionally—flagging both as separate anomalies is redundant and confusing ("Why is the system telling me three things that are all the same problem?"). The production system implements a correlation-aware anomaly grouping step: (1) detect anomalies independently across all KPIs; (2) for each pair of concurrent anomalies, compute a causal dependency score based on known metric relationships (revenue depends on order_count; margin depends on revenue and COGS); (3) group anomalies that share a causal root into a single insight, attributed to the most upstream cause; (4) compute the impact estimate only once for the group, not by summing individual metric impacts (which would double-count). The dependency graph is defined per industry vertical: for retail, `revenue = sum(order_value) = sum(unit_price × quantity)`; for services, `revenue = billable_hours × hourly_rate × utilization`. This grouping reduces the average anomaly count per tenant from 3.2 per day (independent detection) to 1.1 per day (grouped), dramatically improving the signal-to-noise ratio of the WhatsApp digest.
