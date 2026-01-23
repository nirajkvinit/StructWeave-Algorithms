# Interview Guide

[Back to Index](./00-index.md)

---

## Interview Pacing (45 minutes)

| Time | Phase | Focus | Key Deliverables |
|------|-------|-------|------------------|
| **0-5 min** | Clarify | Understand scope, ask questions | Requirements list, constraints |
| **5-15 min** | High-Level | Core architecture, components | Architecture diagram, data flow |
| **15-30 min** | Deep Dive | 1-2 critical components | Algorithms, trade-offs |
| **30-40 min** | Scale & Reliability | Bottlenecks, failure handling | Scaling strategy, failure modes |
| **40-45 min** | Wrap Up | Summary, Q&A | Key decisions recap |

---

## Phase 1: Clarify (0-5 minutes)

### Questions to Ask the Interviewer

| Category | Question | Why It Matters |
|----------|----------|----------------|
| **Scale** | "How many tenants are we targeting? Thousands or millions?" | Determines sharding strategy |
| **Scale** | "What's the expected size of the largest tenant (records, users)?" | Hot tenant handling |
| **Customization** | "How extensive is the customization? Just fields, or also workflows and UIs?" | Scope of metadata engine |
| **AI** | "Is AI a must-have or nice-to-have? What AI capabilities are expected?" | AI infrastructure complexity |
| **Consistency** | "What's the tolerance for eventual consistency in metadata propagation?" | Caching TTL decisions |
| **Latency** | "What's the acceptable latency for record operations? Sub-100ms or more relaxed?" | Caching aggressiveness |
| **Compliance** | "Any specific compliance requirements (HIPAA, GDPR, SOC 2)?" | Security architecture |

### Sample Clarification Dialogue

> **Interviewer:** "Design a platform like Salesforce where customers can create their own applications."
>
> **You:** "Got it. Let me clarify a few things:
> 1. Are we targeting enterprise scale (10K+ tenants) or smaller?
> 2. Should tenants be able to create custom objects, fields, workflows, and UIs, or just a subset?
> 3. Is AI-assisted development (generating formulas from natural language) in scope?
> 4. What's the latency target for typical operations?"
>
> **Interviewer:** "Enterprise scale, full customization including workflows and UIs, AI is nice-to-have, and p99 under 500ms for writes."

---

## Phase 2: High-Level Design (5-15 minutes)

### What to Cover

1. **Core Architecture Diagram**
   - Client layer, API gateway, Runtime engine, Metadata layer, Data layer
   - Show multi-tenancy boundaries

2. **Key Design Decisions**
   - Flex columns vs schema-per-tenant
   - Metadata caching strategy
   - Formula engine approach

3. **Data Flow**
   - How a record read works (metadata lookup → permission check → data fetch → formula evaluation)
   - How custom object creation works

### Architecture Talking Points

> "The core insight of this architecture is that **everything is metadata**. Custom objects, fields, formulas, workflows, permissions, and UI layouts are all stored as data rows, not as code or database schema changes.
>
> At the center is the **Runtime Engine** that interprets this metadata to execute operations. When a client creates a record, the engine:
> 1. Looks up the object definition from the **Metadata Cache**
> 2. Maps the API field names to physical **flex columns**
> 3. Checks permissions using the **Permission Engine**
> 4. Evaluates formulas and validates data
> 5. Executes any triggered workflows
> 6. Writes to the **Flex Column Store**
>
> This approach enables instant customization without deployments, but the trade-off is the overhead of metadata resolution on every request—which is why aggressive caching is critical."

---

## Phase 3: Deep Dive (15-30 minutes)

### Option A: Formula Engine Deep Dive

**When to choose:** If interviewer asks about calculated fields or expressions.

> "Let me dive into the Formula Engine, which is one of the most technically interesting components.
>
> **The challenge:** We need to support formulas like `IF(Account.Industry = 'Tech', Amount * 0.1, 0)` that reference cross-object relationships and are evaluated on every record read.
>
> **The approach:**
> 1. **Compilation:** Parse formula text into an AST at field definition time
> 2. **Caching:** Cache compiled ASTs in memory
> 3. **Evaluation:** Walk the AST with the record context at runtime
>
> **Key algorithms:**
> - **Parsing:** Lexer → Parser → AST with type checking
> - **Cross-object resolution:** Lazy load related records when formula accesses them
> - **Circular dependency detection:** Build a dependency graph and check for cycles before allowing a formula
>
> **Trade-offs:**
> - Interpreted vs compiled: We chose interpreted because it's safer and easier to debug, at the cost of some performance
> - Eager vs lazy cross-object fetch: Lazy to avoid unnecessary queries, but risk N+1 if not careful"

### Option B: Permission System Deep Dive

**When to choose:** If interviewer asks about security or multi-tenancy.

> "Let me dive into the Permission System, which has three layers: Object-level, Field-level, and Record-level.
>
> **The challenge:** A single query might return records that different users should see different parts of, and we need to enforce this at scale.
>
> **The layers:**
> 1. **Object CRUD:** Can this user create/read/update/delete this object type?
> 2. **Field-Level Security (FLS):** Can this user see/edit this specific field?
> 3. **Record-Level Sharing:** Can this user access this specific record?
>
> **Record-level is the complex part.** Access is determined by:
> - Organization-Wide Defaults (baseline)
> - Role hierarchy (managers see subordinates' records)
> - Sharing rules (criteria-based or ownership-based)
> - Manual shares (explicit grants)
>
> **Algorithm:** Check in order from fastest to slowest, short-circuit on first match:
> 1. Is user admin or has 'Modify All'? → Allow
> 2. Is user the owner? → Allow
> 3. Is user above owner in role hierarchy? → Allow
> 4. Do sharing rules grant access? → Allow
> 5. Is there a manual share? → Allow
> 6. Check OWD
>
> **Performance:** Cache permission results per user-record pair (5min TTL), pre-compute role hierarchy paths for O(1) lookups."

### Option C: Metadata Caching Deep Dive

**When to choose:** If interviewer asks about performance or scaling.

> "Let me dive into the Metadata Caching strategy, which is critical because every single API call requires metadata lookup.
>
> **The problem:** At 30K QPS, if each request needs to query the metadata database, we'd have 90K+ database queries per second just for metadata—that's not sustainable.
>
> **The solution:** Multi-layer caching.
>
> **L1 (In-Process):**
> - 2GB per instance
> - 60-second TTL
> - 94%+ hit rate
> - Sub-millisecond access
>
> **L2 (Distributed Redis):**
> - 60GB across cluster
> - 5-minute TTL
> - Catches L1 misses
> - ~5ms access
>
> **Invalidation strategy:**
> - On metadata change, publish to invalidation channel
> - All instances subscribe and clear their L1 cache
> - L2 is explicitly deleted
> - Next request repopulates from database
>
> **Challenges:**
> - Cache stampede: Use request coalescing so only one thread fetches on miss
> - Stale reads: Acceptable for 60s with explicit invalidation on writes
> - Hot tenants: Consider dedicated cache partitions for large tenants"

---

## Phase 4: Scale & Reliability (30-40 minutes)

### Scaling Discussion

> "For scaling, I'd focus on three areas:
>
> **1. Horizontal scaling of stateless components:**
> - API Gateway and Runtime Engine scale horizontally
> - Auto-scaling based on CPU (60% threshold) and queue depth
>
> **2. Database sharding by tenant:**
> - Small tenants: multi-tenant shards (500 per shard)
> - Large tenants: dedicated shards
> - Shard routing via tenant_id → consistent hash → shard
>
> **3. Metadata database strategy:**
> - Single primary with read replicas
> - Metadata is relatively small (~50GB for 10K tenants)
> - Aggressive caching reduces load to manageable levels"

### Failure Scenario Discussion

> "Let me walk through failure modes:
>
> **Cache failure:**
> - If L1 fails: fallback to L2 (transparent)
> - If L2 (Redis) fails: circuit breaker, direct DB queries with increased latency
> - Graceful degradation, not complete outage
>
> **Database failure:**
> - Primary fails: automatic failover to sync replica
> - RPO: 1 minute (synchronous replication)
> - RTO: 15 minutes (automated with manual validation)
>
> **Infinite workflow loop:**
> - Governor limit: max 5 levels of trigger depth
> - Per-transaction timeout: 10 seconds
> - Circuit breaker: disable problematic workflow after repeated failures"

---

## Phase 5: Wrap Up (40-45 minutes)

### Summary Statement

> "To summarize the key decisions:
>
> 1. **Flex columns** for instant schema changes without DDL
> 2. **Multi-layer metadata caching** (L1/L2) for performance at scale
> 3. **AST-based formula engine** for safe, flexible expression evaluation
> 4. **Multi-layer permissions** (RBAC + sharing rules + role hierarchy) for enterprise security
> 5. **AI-native capabilities** through self-hosted LLM with RAG for context
>
> The main trade-offs are:
> - Flexibility vs complexity: Metadata-driven is powerful but adds runtime overhead
> - Consistency vs latency: We accept 60s staleness in caches for performance
> - Security vs performance: Permission checks on every request, mitigated by caching"

---

## Trade-offs Discussion

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Storage Model** | Flex columns (shared schema) | Schema-per-tenant | Flex columns for instant changes, despite query complexity |
| | Pros: No DDL, instant changes | Pros: Natural SQL, type safety | |
| | Cons: Query complexity, type coercion | Cons: DDL latency, migrations | |
| **Formula Execution** | Interpreted AST | Compiled to bytecode | Interpreted for safety and debuggability |
| | Pros: Safe, debuggable | Pros: Faster execution | |
| | Cons: Slower execution | Cons: Security risks, complexity | |
| **Permission Calculation** | On-demand with caching | Pre-computed sharing | On-demand for accuracy, cache for performance |
| | Pros: Always accurate | Pros: Fast reads | |
| | Cons: Latency on cache miss | Cons: Expensive writes, storage | |
| **Workflow Execution** | Synchronous | Asynchronous | Hybrid: sync for before-triggers, async for actions |
| | Pros: Simple, predictable | Pros: Responsive, scalable | |
| | Cons: Slow responses | Cons: Complexity, eventual consistency | |
| **AI Integration** | Self-hosted LLM | External API | Self-hosted for data privacy, despite cost |
| | Pros: Data stays on-platform | Pros: Simple, no GPU infra | |
| | Cons: GPU costs, complexity | Cons: Data leaves platform | |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just create a database table for each custom object?" | Understand DDL limitations | "DDL is slow and requires migrations. At scale with thousands of tenants, ALTER TABLE operations would cause significant latency and lock contention. Flex columns let us add fields instantly as metadata, though we trade off some query optimization." |
| "What if a formula creates a circular reference?" | Show you've thought about edge cases | "We detect cycles at formula creation time by building a dependency graph and running cycle detection. If A depends on B and B depends on A, we reject the formula with a clear error message." |
| "What if a workflow triggers another workflow infinitely?" | Governor limits awareness | "We enforce a trigger depth limit of 5 levels. If workflow A triggers workflow B which triggers A again, it can only recurse 5 times before we halt with an error. We also have a 10-second transaction timeout as a backstop." |
| "How do you handle a tenant that uses 100x more resources than others?" | Hot tenant awareness | "We monitor per-tenant metrics. Hot tenants are automatically identified and can be migrated to dedicated shards. For caching, we use tenant-aware routing to dedicated cache partitions. Rate limiting prevents abuse." |
| "Can you make it faster? That latency is too high." | Know when NOT to optimize | "The current design optimizes for flexibility and safety. If we need lower latency, we could: (1) increase cache TTLs at the cost of staleness, (2) pre-compute more (like permissions), or (3) add read replicas. But each has trade-offs we should discuss based on requirements." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| **Jumping to schema-per-tenant** | DDL is slow, migrations are hard | Start with flex columns, explain the trade-off |
| **Forgetting metadata caching** | Every request needs metadata | Multi-layer cache is essential |
| **Ignoring permission complexity** | Record-level security is hard | Discuss OWD, sharing rules, role hierarchy |
| **Single database for all data** | Won't scale to enterprise | Shard by tenant for data, replicas for metadata |
| **Making everything synchronous** | Workflows can be slow | Hybrid: sync for critical path, async for actions |
| **Over-engineering day 1** | Design for 10x, not 1000x | Start simpler, show where you'd add complexity |
| **Ignoring tenant isolation** | Security is critical | Tenant ID in all queries, encryption per tenant |
| **Forgetting about AI guardrails** | AI can generate bad output | Validate syntax, check permissions, require approval |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────┐
│           METADATA-DRIVEN PLATFORM - INTERVIEW CHEAT SHEET              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CORE INSIGHT                                                            │
│  ────────────                                                            │
│  "Everything is metadata" - objects, fields, workflows, permissions,    │
│  UIs are all data rows interpreted by a generic runtime engine.         │
│                                                                          │
│  KEY COMPONENTS                        KEY NUMBERS                       │
│  ──────────────                        ───────────                       │
│  1. Metadata Repository                • 10K+ tenants                   │
│  2. Flex Column Store                  • 30K QPS peak                   │
│  3. Runtime Engine                     • 99.99% availability            │
│  4. Formula Engine (AST)               • <50ms metadata read            │
│  5. Workflow Engine                    • <500ms record write            │
│  6. Permission Engine                  • 99%+ cache hit rate            │
│  7. AI Platform (optional)             • 5-level trigger limit          │
│                                                                          │
│  DATA MODEL                            CACHING                           │
│  ──────────                            ───────                           │
│  • flex_string_1..100                  • L1: In-process, 60s TTL        │
│  • flex_number_1..50                   • L2: Redis, 5min TTL            │
│  • flex_date_1..20                     • Invalidation on change          │
│  • flex_boolean_1..20                  • Request coalescing              │
│  • Metadata maps API→flex column                                         │
│                                                                          │
│  PERMISSIONS (in order)                TRADE-OFFS TO MENTION            │
│  ──────────────────────                ─────────────────────             │
│  1. Admin bypass                       • Flex columns vs schema/tenant  │
│  2. Owner check                        • Interpreted vs compiled AST    │
│  3. Role hierarchy                     • On-demand vs pre-computed perm │
│  4. Sharing rules                      • Sync vs async workflows        │
│  5. Manual shares                      • Self-hosted vs external AI     │
│  6. Org-wide defaults                                                    │
│                                                                          │
│  FAILURE MODES TO DISCUSS              SCALING STRATEGY                  │
│  ────────────────────────              ────────────────                  │
│  • Cache miss stampede                 • Horizontal: stateless services │
│  • Metadata stale reads                • Sharding: tenant-based         │
│  • Formula circular refs               • Caching: L1/L2 metadata        │
│  • Workflow infinite loops             • Hot tenants: dedicated shards  │
│  • Cross-tenant data leak                                                │
│                                                                          │
│  AI INTEGRATION POINTS                                                   │
│  ─────────────────────                                                   │
│  • NL → Formula generation                                               │
│  • NL → Workflow generation                                              │
│  • Schema recommendation                                                 │
│  • NL → Query (SOQL generation)                                         │
│  • Always validate AI output + require approval for deployment          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Related Topics to Mention

If you have time or the interviewer asks:

- **Event Sourcing:** For audit trails and history tracking
- **CQRS:** Separate read (cached) and write (transactional) paths
- **Service Mesh:** For internal service communication security
- **Feature Flags:** For gradual rollout of platform changes
- **Chaos Engineering:** For testing failure scenarios

---

## Sample 45-Minute Walkthrough

**0:00 - 5:00:** Clarify requirements (scale, features, latency)

**5:00 - 10:00:** Draw high-level architecture on whiteboard
- Client → API Gateway → Runtime Engine → Data Layer
- Metadata Cache connecting to all components
- AI Platform as optional enhancement

**10:00 - 15:00:** Explain flex columns and metadata repository
- Why not schema-per-tenant
- What metadata is stored
- How flex column mapping works

**15:00 - 25:00:** Deep dive on Formula Engine
- AST parsing and caching
- Evaluation algorithm
- Cross-object reference handling
- Circular dependency detection

**25:00 - 35:00:** Permission system and scaling
- Three layers of permissions
- Role hierarchy and sharing rules
- Caching strategy for permissions
- Sharding by tenant

**35:00 - 40:00:** Failure scenarios
- Cache failures and graceful degradation
- Workflow loops and governor limits
- Database failover

**40:00 - 45:00:** Wrap up and Q&A
- Summarize key decisions
- Acknowledge trade-offs
- Answer follow-up questions
