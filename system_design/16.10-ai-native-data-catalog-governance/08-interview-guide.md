# Interview Guide — AI-Native Data Catalog & Governance

## 45-Minute Pacing Guide

| Time | Phase | Focus | What to Cover |
|------|-------|-------|---------------|
| 0-5 min | **Clarify** | Scope the problem | Ask: "Is this a discovery-focused catalog or a governance-enforcing platform?" Clarify scale (number of sources, users, compliance requirements). Establish whether NL-to-SQL is in scope. |
| 5-15 min | **High-Level** | Core architecture | Draw the metadata graph, search index, ingestion pipeline, and policy engine. Explain push vs. pull ingestion. Show the event bus connecting all components. |
| 15-30 min | **Deep Dive** | Pick 1-2 critical areas | **Option A:** Column-level lineage extraction (SQL parsing, AST, schema resolution). **Option B:** Auto-classification pipeline (multi-stage: regex → NER → LLM). **Option C:** Tag-based policy enforcement (ABAC, inheritance, caching). |
| 30-40 min | **Scale & Trade-offs** | Production concerns | Discuss metadata freshness vs. ingestion cost, classification precision vs. recall trade-off, search ranking signals, and graceful degradation when the LLM is unavailable. |
| 40-45 min | **Wrap Up** | Summary and follow-ups | Highlight the key insight: the catalog is a metadata platform, not a data platform — it never stores or queries actual data, only metadata. Touch on adoption as the real success metric. |

---

## Where to Spend Most Time

**Column-level lineage** is the most technically interesting deep dive because it involves:
1. SQL parsing across dialects (a hard problem with real edge cases)
2. Schema-aware column resolution (requires catalog integration)
3. Graph construction at scale (200M+ edges)
4. Impact analysis traversal algorithms

If the interviewer is more governance-oriented, pivot to **tag-based policy enforcement** with ABAC — it's a rich design space with inheritance semantics, conflict resolution, and caching challenges.

---

## Trade-off Frameworks

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Metadata storage** | Graph database (native traversal) | RDBMS with adjacency model | **RDBMS** — simpler ops, ACID transactions, good enough for lineage with materialized paths. Graph DB only if traversal is the dominant query pattern with 6+ hops. |
| | Pros: Native path queries, intuitive model | Pros: Operational maturity, schema migrations, strong consistency | |
| | Cons: Weak ACID, harder ops, smaller talent pool | Cons: Recursive CTEs for deep traversal, denormalization needed | |
| **Classification approach** | Regex-only (deterministic) | ML-based (NER + LLM) | **Hybrid** — regex for structured patterns (SSN, email), NER for unstructured text, LLM for ambiguous cases. Determinism where possible, ML where needed. |
| | Pros: Predictable, fast, no false positives from model errors | Pros: Catches PII in free text, handles novel patterns | |
| | Cons: Misses PII in unstructured data, brittle to format changes | Cons: False positives, model drift, higher latency, needs retraining | |
| **Ingestion model** | Pull-only (scheduled crawls) | Push + Pull hybrid | **Hybrid** — pull for batch sources (warehouses, BI tools), push for real-time sources (pipeline DAGs, streaming metadata). Push gives freshness; pull gives coverage. |
| | Pros: Simpler architecture, centralized scheduling | Pros: Real-time freshness for critical sources | |
| | Cons: Metadata is always stale by crawl interval | Cons: More complex; push sources need instrumentation | |
| **Policy enforcement point** | Catalog-side (filter at search time) | Query-engine-side (enforce at data access) | **Both** — catalog filters search results by visibility policy (don't show assets you can't access), but actual data masking/filtering happens at the query engine. The catalog informs, the engine enforces. |
| | Pros: Prevents metadata leakage | Pros: Cannot be bypassed by direct SQL | |
| | Cons: Only controls catalog access, not data access | Cons: Requires integration with every query engine | |
| **Search ranking** | Static scoring (hand-tuned weights) | Learning-to-rank (ML model) | **Start static, graduate to ML** — hand-tuned weights (text 0.35, usage 0.25, quality 0.15, freshness 0.10, affinity 0.15) work well initially. Train L2R model once you have 6+ months of click-through data. |
| | Pros: Transparent, debuggable, no training data needed | Pros: Learns user preferences, adapts to changing patterns | |
| | Cons: Cannot personalize, doesn't learn from behavior | Cons: Needs click data, harder to debug, cold-start problem | |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just use the data warehouse's built-in catalog?" | Understand the limitations of single-system catalogs | "A warehouse catalog only knows about its own tables. An enterprise data catalog spans 50+ sources — warehouses, lakes, BI tools, ML platforms, streaming systems — and provides cross-system lineage and unified governance. The warehouse catalog is one *source* of metadata for the enterprise catalog, not a replacement." |
| "How do you handle lineage for stored procedures and dynamic SQL?" | Test awareness of lineage extraction limits | "Static SQL parsing cannot handle dynamic SQL (EXECUTE IMMEDIATE, string concatenation). For these cases, fall back to runtime lineage: instrument the query engine to capture actual column-level I/O during execution. This gives accurate lineage at higher cost, used selectively for dynamic SQL paths." |
| "What if teams don't want to use the catalog?" | Test understanding that adoption is the real challenge | "The catalog must be embedded where people already work — IDE plugins, dbt integrations, BI tool extensions, Slack bots — not a separate portal they have to visit. Enforce 'catalog-first' policies: no data access without catalog registration. Measure adoption as the primary success metric, not feature count." |
| "How do you ensure classification accuracy at 95%+ precision?" | Test understanding of the precision-recall trade-off | "95% precision means accepting lower recall — some PII will be missed. The system uses cascading classification (regex → NER → LLM) with increasing cost and accuracy. High-confidence classifications are auto-applied; borderline cases go to human review. The feedback loop from human reviews continuously improves the model. The key insight is that 100% precision is impossible; the goal is to make the residual error rate acceptable for the compliance context." |
| "Why not just tag everything as PII to be safe?" | Test understanding of over-governance costs | "Over-classification is as harmful as under-classification. If every column is tagged PII, masking is applied everywhere, analytics teams can't do their jobs, and they'll find workarounds that bypass governance entirely. The goal is *accurate* classification that applies masking only where needed — preserving data utility while protecting sensitive data." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Do Instead |
|---------|----------------|-------------------|
| Designing a query engine instead of a catalog | The catalog stores metadata, not data | Clearly separate: "The catalog answers 'what data exists and where' — the query engine answers 'what is in the data'" |
| Ignoring the adoption problem | Technical excellence with zero users is worthless | Design for embedding in existing workflows; measure WAU and search CTR as primary KPIs |
| Treating lineage as a solved problem | SQL parsing across dialects is genuinely hard | Acknowledge limitations: dynamic SQL, UDFs, cross-system gaps. Discuss fallback strategies. |
| Over-indexing on NL-to-SQL | It's flashy but not the core value proposition | Position NL-to-SQL as an accessibility layer on top of the catalog, not the catalog's primary purpose |
| Proposing graph database without justification | Graph DBs have operational costs | Justify with query patterns: if 90% of queries are key lookups and 1-2 hop lineage, RDBMS is sufficient |
| Forgetting policy enforcement at the data layer | Catalog-only enforcement is bypassable | Explain that the catalog *informs* policies, but the query engine/data platform *enforces* them |

---

## What Distinguishes Senior vs. Staff Answers

| Aspect | Senior Answer | Staff Answer |
|--------|--------------|-------------|
| **Scope** | Focuses on technical components (search, lineage, classification) | Adds organizational dimensions: adoption strategy, change management, domain ownership model |
| **Lineage** | Describes SQL parsing and graph storage | Discusses the fundamental limitation that lineage accuracy depends on parsing quality, and proposes a tiered approach (static parsing + runtime lineage + manual annotation) with coverage metrics |
| **Classification** | Describes NER + regex pipeline | Discusses the precision-recall trade-off as a governance decision, the feedback loop that improves accuracy over time, and the organizational process for handling borderline cases |
| **Policy** | Describes ABAC with tags | Explains how tag-based policies compose with auto-classification to create an automated governance loop: classify → tag → enforce → audit → improve classification |
| **Success metric** | Latency, uptime, entity count | Adoption rate, time-to-first-discovery, search click-through rate, classification coverage — metrics that measure whether the catalog is actually useful |

---

## Quick Reference Card

```
AI-Native Data Catalog & Governance — Cheatsheet

CORE COMPONENTS:
  Metadata Graph (RDBMS)  →  entities + relationships + tags
  Search Index            →  full-text + faceted + semantic
  Ingestion Pipeline      →  push + pull connectors + SQL parser
  Classification Engine   →  regex → NER → LLM (cascading)
  Policy Engine           →  tag-based ABAC with inheritance
  NL-to-SQL               →  LLM + catalog RAG + policy enforcement

KEY NUMBERS:
  2M entities, 40M columns, 200M lineage edges (large enterprise)
  Search latency: p50 < 200ms, p99 < 1s
  Metadata freshness: < 5 minutes
  Classification: > 95% precision, > 90% recall

KEY TRADE-OFFS:
  RDBMS vs Graph DB → RDBMS (simpler ops, good enough for lineage)
  Pull vs Push ingestion → Hybrid (pull for batch, push for real-time)
  Regex vs ML classification → Cascading (cheap first, expensive on ambiguity)
  Catalog-side vs Engine-side enforcement → Both (visibility + data masking)

THE ONE THING:
  The catalog's primary purpose is ADOPTION — making the right data
  findable and trustworthy. Technical excellence with low adoption is failure.
```
