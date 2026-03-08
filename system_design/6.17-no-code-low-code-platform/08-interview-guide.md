# Interview Guide

## 45-Minute Pacing Guide

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify & Scope | Ask: What kind of apps? Internal tools or customer-facing? What data sources? How many concurrent users on deployed apps? | Establish: this is Retool/Appsmith-style internal tool builder |
| **5-10 min** | Key Characteristics | Identify: metadata-driven runtime (not code generation), two-plane architecture (builder vs. runtime), sandboxed query execution | Mention numbers: 70+ connectors, <200ms page load, <500ms query round-trip |
| **10-20 min** | High-Level Architecture | Draw: Builder Plane (visual editor, app definition service, version control), Runtime Plane (API gateway, query execution engine, permission engine), Data Plane (metadata store, credential store, audit log), Sandbox (V8 isolates), Connector Proxy | **Spend time here on the connector proxy and sandbox---these are the differentiating components** |
| **20-35 min** | Deep Dive (pick 2) | **Priority 1**: Query sandbox security (V8 isolates, why not containers, resource limits, SSRF prevention). **Priority 2**: Connector proxy architecture (credential management, connection pooling, circuit breakers). **Alternative**: Reactive binding engine (dependency graph, topological sort) | This is where you differentiate. Most candidates talk about drag-and-drop UI; strong candidates discuss sandbox security and multi-tenant query execution |
| **35-42 min** | Scale & Trade-offs | Runtime vs. builder plane scaling, connector failure isolation, cache invalidation on publish, row-level security injection | Proactively discuss metadata-driven vs. code-gen trade-off |
| **42-45 min** | Wrap Up | Summarize: the hard parts are sandbox security, credential management, and reactive data binding---not the drag-and-drop UI | Leave interviewer with 3 crisp trade-offs |

### Where to Spend Extra Time

The visual builder UI is the most visible feature but the **least interesting architecturally**. Interviewers expect you to quickly acknowledge it ("component library, grid layout, JSON metadata") and dive into:

1. **Sandbox security** (5-7 minutes): This is the hardest security problem in the system. Why V8 isolates? What's stripped from the global scope? How do you prevent SSRF?
2. **Connector proxy** (5-7 minutes): Why server-side only? How do you manage credentials? What happens when a customer's database is slow?
3. **Reactive bindings** (3-5 minutes): The `{{expression}}` system is a spreadsheet formula engine in disguise. Dependency graph, topological sort, cycle detection.

---

## Opening Talking Points

**"Let me start with what makes this system architecturally unique..."**

1. Apps are JSON metadata documents, not compiled code. The client renders from this metadata at runtime. This means instant publish, instant rollback, and a clear security boundary.
2. Users write SQL and JavaScript that runs on our servers against their databases. We need a sandboxed execution model that prevents code escape, SSRF, and resource exhaustion.
3. All database connections are proxied server-side. Credentials never reach the browser. This is non-negotiable for credential security.

---

## 10 Likely Interview Questions

### Q1: How do you safely execute user-defined SQL?

**Answer**: We never execute raw user SQL. The platform parses `{{binding}}` expressions, extracts them as positional parameters ($1, $2...), and executes parameterized queries against the customer's database. We validate the SQL to reject DDL statements, multi-statement queries, and UNION-based injection patterns. Row-level security is enforced by wrapping the user's query as a subquery and injecting WHERE clauses, preventing bypass via UNION or CTEs.

### Q2: How do you prevent SSRF when users configure REST API connectors?

**Answer**: All outbound requests go through the connector proxy, never from the client. We resolve the target hostname to IP addresses and reject any private ranges (10.x, 172.16.x, 192.168.x, 169.254.x, 127.x). We pin the resolved IP to prevent DNS rebinding attacks. We require HTTPS for API connectors. Internal service hostnames are blocklisted.

### Q3: Why metadata-driven runtime instead of code generation?

**Answer**: Code generation (emitting JavaScript/HTML) gives more flexibility but loses the security boundary. With metadata-driven, the platform controls the execution environment---user-defined logic runs in sandboxes, not as first-class code. Instant publish (swap JSON pointer) is possible without a build step. Debugging is simpler (inspect JSON, not generated code). The trade-off is flexibility---you're limited to the component library plus custom components.

### Q4: How does the reactive binding system work?

**Answer**: Bindings like `{{query1.data.filter(...)}}` create edges in a dependency graph. When any source value changes (query completes, state variable set), we topologically sort the dependents and re-evaluate them in order. This is fundamentally the same model as spreadsheet formula evaluation. We detect cycles at save time and surface errors in the builder. The graph is built client-side from the app definition JSON.

### Q5: How do you handle 1,000 end-users on a single deployed app?

**Answer**: The runtime is designed for horizontal scale. App definitions are cached aggressively (>95% cache hit rate). Each query execution is stateless---the server receives the query name, user context, and client state, executes, and returns results. The bottleneck shifts to the customer's database. We manage this with connection pooling (max 20 connections per connector per proxy node), per-connector circuit breakers, and bulkhead isolation so one slow connector doesn't block others.

### Q6: How do you handle credential management?

**Answer**: Envelope encryption---each connector has a unique Data Encryption Key (AES-256-GCM), which is itself encrypted by an org-level Key Encryption Key stored in an HSM. Credentials are decrypted only by the connector proxy at query execution time. They're cached in-memory for 60 seconds (encrypted at rest in memory). Credentials are never returned to API clients---only overwritten. Every decryption is audit-logged.

### Q7: What happens when a builder publishes an update while end-users are active?

**Answer**: Published app definitions are cached with event-driven invalidation. On publish: (1) new version is written to DB, (2) publish event is emitted, (3) new definition is pre-warmed in cache, (4) version pointer is atomically updated. End-users on the old version continue until their next page load or a lightweight version-check poll detects the update. No in-progress queries are interrupted.

### Q8: How do you handle multi-tenant isolation?

**Answer**: Isolation at multiple layers: (1) Org-scoped data in the metadata store (all queries include `org_id`), (2) Separate V8 isolates per query execution (no shared memory), (3) Per-org encryption keys for credentials, (4) Connector proxy connections are per-connector (one org's database is never accessible from another org's context). The audit log records org_id on every event for forensic traceability.

### Q9: How do you handle collaborative editing?

**Answer**: Presence-based collaboration with last-write-wins at the component-property level. WebSocket connections show which builder is editing which component (colored cursors). If two builders edit different properties of the same component, both changes merge. If they edit the same property, the last write wins and the other builder is notified. This is simpler than CRDT/OT and sufficient for visual builders where the editing granularity is component properties, not characters.

### Q10: How do you implement row-level security?

**Answer**: Administrators define filter expressions per user group per connector (e.g., `org_id = '{{currentUser.orgId}}'`). At query execution time, the platform wraps the user's SQL as a subquery and injects the filter as a WHERE clause on the outer query: `SELECT * FROM (user_query) AS __filtered WHERE org_id = $1`. The subquery wrapping prevents bypass via UNION, CTE, or other SQL constructs. Filter values are parameterized to prevent injection within the filter itself.

---

## Trade-offs to Proactively Raise

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **App execution model** | Metadata-driven runtime | Code generation | Metadata-driven: security, instant publish, simpler debugging. Trade: less flexibility |
| **Sandbox technology** | V8 Isolates (fast, shared process) | Container per execution (stronger isolation) | V8 Isolates for transforms; containers for heavy/long-running workflows. Balance speed vs. isolation |
| **Collaboration model** | Full CRDT/OT (perfect merge) | Presence + last-write-wins | Last-write-wins: sufficient for component-level edits; 10x simpler to implement |
| **Query caching** | Cache query results per user | No caching (always execute) | No caching by default (data freshness); optional per-query cache for expensive, infrequently-changing queries |
| **Row-level security** | Platform-enforced (subquery wrapping) | Database-native RLS policies | Platform-enforced: portable across database types, no database config needed. Trade: performance overhead of subquery |

---

## Key Numbers to Memorize

| Metric | Value |
|--------|-------|
| App definition size (average) | 100 KB |
| App definition size (large) | 1-5 MB |
| Published app cache TTL | 5 minutes (event-driven invalidation) |
| V8 Isolate warm start | <5ms |
| V8 Isolate memory limit | 128 MB |
| V8 Isolate CPU timeout | 5 seconds |
| Connection pool max per connector | 20 per proxy instance |
| Circuit breaker: open after | 5 failures in 60s |
| Query execution p99 target | <1s (excluding connector latency) |
| App load p99 target | <400ms |
| Credential cache TTL | 60 seconds |
| Supported connector types | 70+ |
| Runtime QPS (peak) | ~2,300 |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just let the client connect directly to the database?" | Test security understanding | Credentials would be exposed in the browser. Private databases aren't accessible from the internet. No connection pooling, auditing, or SSRF prevention. Server-side proxy is non-negotiable. |
| "Why not use containers instead of V8 Isolates for sandboxing?" | Test latency/security trade-off | Containers have 200-500ms cold start; V8 isolates start in <5ms. For short JavaScript transforms (<1s), isolate overhead is acceptable. Use containers for long-running workflows where stronger isolation is worth the startup cost. |
| "What if a user writes SELECT * from a table with 10 million rows?" | Test resource limit thinking | Connection-level timeout (10s default). Result size cap (10MB). Client-side pagination (server sends page of results, not full dataset). Builder-time warning for unbounded queries. |
| "How is this different from just building a web app framework?" | Test domain understanding | The builder is a framework; the deployed app is an interpreter. Users don't write code---they compose from components and bindings. The security model is fundamentally different: the platform controls execution, not the user. |
| "Can this replace real applications?" | Test practical judgment | No---it excels at internal tools, admin panels, and CRUD apps. It's not suitable for high-performance user-facing products, complex stateful applications, or anything requiring custom rendering pipelines. It augments development, not replaces it. |

---

## Questions to Ask the Interviewer

Before diving into design, clarify scope with these questions:

| Question | Why It Matters | Expected Answer |
|----------|---------------|-----------------|
| "Internal tools or customer-facing apps?" | Changes security model, performance requirements, and scaling targets | Usually internal tools (Retool-style) |
| "What data sources do the apps connect to?" | Drives connector proxy design and security requirements | SQL databases, REST APIs, maybe GraphQL |
| "How many concurrent end-users per deployed app?" | Determines runtime scaling strategy | 100-10,000 per app |
| "Can users write custom code (JavaScript/SQL), or purely visual?" | Determines whether sandbox architecture is needed | Usually yes for SQL and some JS |
| "Enterprise or SMB customers?" | Drives permission model complexity (SSO, SCIM, row-level security) | Mix, but enterprise features are the hard problems |
| "Real-time collaboration on app building, or single-user?" | Determines if collaboration service is needed | Nice-to-have; presence-based is sufficient |

---

## Common Mistakes to Avoid

1. **Spending too long on the UI builder**: The drag-and-drop canvas is a frontend problem. Interviewers want to hear about sandbox security, query execution, and credential management.

2. **Ignoring the security implications**: User-defined code running on your servers is the #1 risk. If you don't discuss V8 isolation, SSRF prevention, and SQL parameterization, you're missing the point.

3. **Treating it as a static website builder**: Deployed apps execute queries in real-time against external databases. This is a dynamic runtime, not a static site generator.

4. **Forgetting multi-tenancy**: Every data path must be org-scoped. One organization must never see another's apps, connectors, or data.

5. **Over-engineering collaboration**: Full CRDT for a visual builder is overkill. Acknowledge the trade-off and explain why presence + last-write-wins is sufficient.

6. **Not discussing connector failure isolation**: If you don't mention circuit breakers and bulkhead patterns for the connector proxy, you're designing a system where one slow database takes down all apps.
