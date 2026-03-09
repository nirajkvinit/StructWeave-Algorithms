# Business Intelligence Platform --- Interview Guide

## Interview Structure (45 Minutes)

| Phase | Duration | Focus | What to Assess |
|-------|----------|-------|----------------|
| **Problem Scoping** | 5 min | Clarify requirements; define scope of "BI platform" | Can the candidate identify key differentiators (semantic layer, OLAP engine, dashboard rendering) vs. generic "web app"? |
| **High-Level Design** | 12 min | Architecture diagram; major components; data flow | Does the candidate identify the semantic layer as the central abstraction? Do they separate query compilation from execution? |
| **Semantic Layer Deep Dive** | 10 min | Model compilation, join graph resolution, RLS injection | Can they explain how measures/dimensions translate to SQL? Do they understand fan-out risks? |
| **Query & Cache Architecture** | 8 min | Caching strategy, OLAP approach, query optimization | Do they propose multi-tier caching? Can they reason about MOLAP vs. ROLAP trade-offs? |
| **Dashboard Rendering** | 5 min | Widget tree execution, progressive rendering, embedded analytics | Can they describe parallel widget query execution? Do they consider cross-filter dependencies? |
| **Wrap-Up & Trade-Offs** | 5 min | Scaling, security, operational concerns | Can they articulate the fundamental trade-offs (freshness vs. performance, flexibility vs. governance)? |

---

## Phase 1: Problem Scoping (5 min)

### Opening Prompt

> "Design a Business Intelligence platform like Tableau or Looker that allows business users to create interactive dashboards, explore data with ad-hoc queries, and share insights across the organization."

### Good Scoping Questions from Candidate

| Question | Why It's Good | Expected Scope |
|----------|--------------|----------------|
| "How many concurrent dashboard viewers?" | Shows they're thinking about scale from the start | ~200K concurrent sessions, 5M total users |
| "Do users write SQL or is there a visual query builder?" | Leads to semantic layer discussion | Visual builder backed by semantic layer; no raw SQL for end users |
| "Live queries or cached/extracted data?" | Central architectural decision | Both: configurable per data source |
| "Do we need to embed dashboards in other applications?" | Identifies cross-cutting concern | Yes: iframe and SDK-based embedding |
| "What types of data sources do we connect to?" | Drives connector architecture | 50+ databases via JDBC/ODBC; both cloud warehouses and operational DBs |
| "How important is metric consistency across dashboards?" | Directly points to semantic layer need | Critical: semantic layer is the single source of truth |

### Red Flags in Scoping

- Jumps directly to database selection without understanding the query model
- Treats it as a simple CRUD app with charts
- No mention of semantic layer or metric definitions
- Assumes a single data source

---

## Phase 2: High-Level Design (12 min)

### Must-Have Components

| Component | Non-Negotiable? | Why |
|-----------|-----------------|-----|
| **Semantic Layer / Model Registry** | Yes | Defines how business concepts map to data; without it, the system is just a SQL editor with charts |
| **Query Compiler** | Yes | Translates visual interactions → optimized SQL; handles dialect differences |
| **Dashboard Rendering Engine** | Yes | Manages widget tree, parallel query execution, progressive rendering |
| **Multi-Tier Cache** | Yes | 80%+ of queries should be served from cache for acceptable performance |
| **Data Source Connector Layer** | Yes | JDBC/ODBC abstraction with connection pooling |
| **Extract/Refresh Service** | Important | Enables predictable performance by caching data locally |
| **OLAP/Pre-Aggregation Engine** | Important | Performance optimization for high-frequency dashboard queries |
| **Embedded Analytics Gateway** | Important | Competitive requirement; introduces unique security challenges |
| **NLQ Engine** | Nice-to-have | Differentiator; not architecturally critical |

### Scoring Rubric: High-Level Design

| Score | Criteria |
|-------|----------|
| **Strong** | Identifies semantic layer as central; separates compilation from execution; proposes multi-tier cache; discusses OLAP strategy; mentions RLS at the architecture level |
| **Acceptable** | Has query engine and dashboard renderer; mentions caching; discusses data source connectivity; basic understanding of metric consistency |
| **Weak** | Generic web app architecture with a charting library; no semantic layer concept; single-level cache; doesn't consider multiple data sources |

---

## Phase 3: Semantic Layer Deep Dive (10 min)

### Probing Questions

**Q1: "How does the system ensure that 'Revenue' means the same thing everywhere?"**

| Level | Answer Quality |
|-------|---------------|
| **Strong** | Describes a semantic layer where measures and dimensions are defined once in a modeling DSL; all queries resolve through this layer; model versioned in Git; changes reviewed before deployment |
| **Acceptable** | Mentions shared metric definitions or a data dictionary; understands the problem of metric drift |
| **Weak** | "We define it in each dashboard" or "it's in the SQL" |

**Q2: "When a user adds 'Revenue' and 'Region' to a chart, what happens under the hood?"**

Expected answer flow:
1. UI sends a semantic query spec (measures + dimensions + filters)
2. Semantic layer resolves field references to physical SQL expressions
3. Join graph determines which tables to include and how to join them
4. RLS policies inject user-specific WHERE predicates
5. SQL generator produces dialect-specific SQL
6. Cache check → execute if miss → store result → return to rendering engine

**Q3: "What happens when a query joins a 'users' table (one-to-many) with both 'orders' and 'support_tickets'?"**

This tests understanding of the **fan-out problem**:
- Naive join creates a cross product between orders and tickets per user
- SUM(order_total) and COUNT(tickets) both inflate
- Solution: subquery aggregation or CTE-based pre-aggregation before the join

### Trap Question: "Why not just let users write SQL directly?"

**Ideal response** should cover:
- Metric consistency: different analysts write different SQL for the same metric
- Security: SQL injection risk; can't enforce RLS at the SQL level
- Governance: no lineage tracking; can't audit who queries what
- Usability: business users shouldn't need SQL knowledge
- Performance: can't optimize queries you don't understand structurally

---

## Phase 4: Query & Cache Architecture (8 min)

### Probing Questions

**Q1: "How do you handle caching when different users see different data due to row-level security?"**

| Level | Answer Quality |
|-------|---------------|
| **Strong** | Cache key includes RLS context hash; users with identical RLS contexts share cache entries; quantifies the cache hit rate impact of RLS granularity |
| **Acceptable** | Recognizes that caching with RLS is tricky; proposes per-user cache (correct but wasteful) |
| **Weak** | Doesn't consider RLS impact on caching; proposes a single global cache |

**Q2: "A dashboard has 15 widgets. How do you prevent 15 simultaneous queries from overwhelming the data source?"**

Expected strategies:
- Query merging: combine widgets querying the same explore with the same filters
- Query deduplication: identical queries from multiple users share one execution
- Connection pool with backpressure: queue excess queries rather than failing
- Prioritization: interactive queries over scheduled/background queries
- Cache-first: most widgets should hit cache (80%+ target)

**Q3: "When should you pre-aggregate data vs. query live?"**

| Factor | Pre-Aggregate (MOLAP) | Live Query (ROLAP) |
|--------|----------------------|-------------------|
| Query frequency | High (executive dashboard viewed 1000x/day) | Low (ad-hoc exploration) |
| Data freshness need | Can tolerate 15-min to hourly staleness | Must be real-time |
| Dimension cardinality | Low (region, quarter, category) | High (user_id, transaction_id) |
| Aggregation complexity | Simple (SUM, COUNT, AVG) | Complex (DISTINCT, percentile, window) |
| Storage budget | Sufficient for pre-computed tables | Constrained |

### Trap Question: "Why not cache everything indefinitely?"

**Should mention:**
- Stale data worse than slow data for decision-making
- Cache storage costs at scale (100TB+)
- Invalidation complexity increases with cache lifetime
- RLS multiplies cache entries; long TTLs waste memory on rarely-reused entries
- Users need confidence their data is current

---

## Phase 5: Dashboard Rendering (5 min)

### Key Assessment Areas

**Q1: "How does a dashboard render efficiently when widgets have dependencies?"**

Expected answer:
- Build a dependency DAG from widget cross-filter relationships
- Topologically sort into execution groups
- Execute independent widgets in parallel
- Stream results to client as they complete (progressive rendering)
- Dependent widgets execute only after their dependencies complete

**Q2: "How does embedded analytics work securely?"**

Expected answer:
- Host application generates a signed embed token via backend API
- Token contains: user attributes (for RLS), allowed dashboards, permissions, expiry
- Embed gateway validates token before rendering
- RLS enforced using attributes from token (not from any client-side data)
- Origin/Referer validation prevents token reuse on unauthorized domains

---

## Phase 6: Wrap-Up & Trade-Offs (5 min)

### Key Trade-Offs to Discuss

| Trade-Off | Question to Ask |
|-----------|----------------|
| **Freshness vs. Performance** | "How do you balance sub-second dashboard loads with data that's always current?" |
| **Flexibility vs. Governance** | "How do you let analysts explore freely while ensuring metrics are consistent?" |
| **Thick vs. Thin Semantic Layer** | "What are the downsides of routing ALL queries through the semantic layer?" |
| **Multi-tenancy Isolation** | "How do you prevent one tenant's expensive query from affecting all others?" |

### Strong Candidate Signals

- Independently identifies the semantic layer as the core abstraction
- Understands fan-out in join graphs without prompting
- Proposes multi-tier caching with RLS-aware cache keys
- Discusses MOLAP vs. ROLAP trade-offs with concrete criteria
- Considers progressive rendering for dashboard UX
- Mentions embed token security model for embedded analytics
- Considers query deduplication and merging for scalability

### Weak Candidate Signals

- Treats it as "database + chart library"
- No concept of semantic layer or metric governance
- Single-level cache without RLS consideration
- Sequential widget query execution
- Ignores multi-tenancy challenges
- No discussion of data freshness vs. performance trade-offs

---

## Scoring Rubric

### Overall Assessment

| Dimension | Weight | Strong (4-5) | Acceptable (3) | Weak (1-2) |
|-----------|--------|-------------|----------------|------------|
| **Architecture** | 30% | Semantic-layer-centric design with clear tier separation; OLAP strategy articulated | Reasonable component separation; mentions key pieces | Generic web app; no semantic layer; monolithic |
| **Depth: Semantic Layer** | 25% | Explains model compilation, join resolution, fan-out handling, RLS injection | Understands concept; can describe field → SQL translation | No understanding of how measures/dimensions map to queries |
| **Depth: Query & Cache** | 20% | Multi-tier cache with RLS-aware keys; query merging; MOLAP/ROLAP reasoning | Proposes caching; understands basic query optimization | No caching strategy; ignores query performance |
| **Scalability** | 15% | Horizontal scaling per tier; tenant isolation; query deduplication; progressive rendering | Mentions horizontal scaling; basic load balancing | No scaling discussion; single-server assumptions |
| **Trade-Off Reasoning** | 10% | Articulates freshness/performance, flexibility/governance trade-offs with nuance | Identifies some trade-offs when prompted | Cannot reason about trade-offs |

### Hire Levels

| Level | Expected Performance |
|-------|---------------------|
| **Senior SDE** | Strong architecture; good semantic layer depth; reasonable cache strategy; some trade-off discussion |
| **Staff SDE** | Strong across all dimensions; independently identifies fan-out problem; proposes auto-aggregation; discusses operational concerns (cache invalidation, extract monitoring); considers embedded analytics security model |
| **Principal SDE** | All of Staff-level plus: discusses semantic layer as a DSL compiler; proposes visualization grammar abstraction; considers NLQ architecture; discusses data governance and lineage; thinks about platform extensibility and API design for ecosystem |

---

## Common Mistakes to Watch For

| Mistake | Why It's Wrong | What It Reveals |
|---------|---------------|-----------------|
| "Just cache the entire dashboard HTML" | Different users see different data (RLS); filters change results | Doesn't understand the query-per-widget model |
| "Store metrics in a separate metrics database" | Metrics are computed from source data, not stored separately; this is a metrics store, not a metric database | Confuses metric definitions with metric values |
| "Use a single large SQL query per dashboard" | Widgets have different data sources, explores, and filter dependencies | Doesn't understand dashboard rendering |
| "Let each team define their own metric SQL" | Defeats the purpose of the semantic layer; leads to metric drift | Doesn't appreciate governance challenges |
| "Real-time dashboards don't need caching" | Even "real-time" dashboards benefit from caching for identical concurrent views | Conflates "fresh data" with "no caching" |

---

## Bonus Topics for Strong Candidates

| Topic | What to Look For |
|-------|-----------------|
| **Natural Language Query** | Understands NLQ maps to semantic model (not raw SQL); discusses disambiguation |
| **Visualization Grammar** | Mentions declarative chart specs (Vega-like); encoding channels map to data fields |
| **Data Lineage** | Forward/backward lineage through semantic model to dashboards; impact analysis |
| **Git-Based Model Versioning** | Branch/merge workflow for semantic models; CI/CD validation |
| **Cost Attribution** | Tracking which dashboards/tenants generate the most warehouse cost |
| **Auto-Aggregation** | System automatically identifies queries that would benefit from pre-aggregation |
