# Interview Guide

## Overview

This guide provides a structured approach for discussing CQRS in a 45-minute system design interview, including pacing strategies, common questions, trap questions, and quick reference materials.

---

## 45-Minute Interview Pacing

### Recommended Time Allocation

```
┌────────────────────────────────────────────────────────────────────┐
│ 45-MINUTE INTERVIEW PACING                                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  0:00 - 0:05  │ Requirements Clarification (5 min)                 │
│  ─────────────┼─────────────────────────────────────────────────── │
│               │ • Confirm read/write ratio expectations            │
│               │ • Clarify consistency requirements                 │
│               │ • Understand query patterns                        │
│               │ • Ask about scale expectations                     │
│                                                                     │
│  0:05 - 0:10  │ High-Level Design (5 min)                          │
│  ─────────────┼─────────────────────────────────────────────────── │
│               │ • Draw command side / query side separation        │
│               │ • Show event flow from write to read               │
│               │ • Identify key components                          │
│               │ • State the consistency model                      │
│                                                                     │
│  0:10 - 0:25  │ Core Components Deep Dive (15 min)                 │
│  ─────────────┼─────────────────────────────────────────────────── │
│               │ • Command processing flow                          │
│               │ • Synchronization mechanism (outbox/CDC)           │
│               │ • Projection engine design                         │
│               │ • Read model schema examples                       │
│                                                                     │
│  0:25 - 0:35  │ Trade-offs & Challenges (10 min)                   │
│  ─────────────┼─────────────────────────────────────────────────── │
│               │ • Eventual consistency handling                    │
│               │ • Projection lag mitigation                        │
│               │ • Failure scenarios                                │
│               │ • Scaling strategies                               │
│                                                                     │
│  0:35 - 0:45  │ Operational Concerns (10 min)                      │
│  ─────────────┼─────────────────────────────────────────────────── │
│               │ • Monitoring and alerting                          │
│               │ • Projection rebuilding                            │
│               │ • Disaster recovery                                │
│               │ • Security considerations                          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### What to Draw

```
┌────────────────────────────────────────────────────────────────────┐
│ WHITEBOARD DRAWING GUIDE                                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Step 1: Basic Separation (Draw First)                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │     ┌─────────┐                    ┌─────────┐              │   │
│  │     │ Command │                    │  Query  │              │   │
│  │     │  Side   │                    │  Side   │              │   │
│  │     └────┬────┘                    └────┬────┘              │   │
│  │          │                              │                    │   │
│  │          ▼                              ▼                    │   │
│  │     ┌─────────┐   Events      ┌─────────────┐               │   │
│  │     │ Write   │ ──────────▶   │ Read Models │               │   │
│  │     │   DB    │               │  (multiple) │               │   │
│  │     └─────────┘               └─────────────┘               │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Step 2: Add Event Flow Details                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  Write DB ──▶ Outbox ──▶ Broker ──▶ Projections ──▶ Read DB │   │
│  │                                                              │   │
│  │  (Highlight: Same transaction for write + outbox)           │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Step 3: Add Specific Read Models                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │                          ┌─────────────┐                    │   │
│  │                          │ List View   │ (PostgreSQL)       │   │
│  │                          └─────────────┘                    │   │
│  │  Events ──▶ Projections ─┼─────────────┤                    │   │
│  │                          │ Detail View │ (MongoDB)          │   │
│  │                          └─────────────┘                    │   │
│  │                          │ Search      │ (Elasticsearch)    │   │
│  │                          └─────────────┘                    │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Common Interview Questions

### Fundamental Questions

| Question | Key Points to Cover |
|----------|---------------------|
| "What is CQRS?" | Separation of read/write models; optimize each independently; commands return success/failure, queries return data |
| "When would you use CQRS?" | High read/write disparity (10:1+), different query patterns, complex domain, need to scale independently |
| "What's the relationship between CQRS and Event Sourcing?" | Complementary but independent; CQRS works without ES; ES naturally leads to CQRS for read optimization |
| "How do you keep read models in sync?" | Outbox pattern, CDC, message broker; projections consume events |

### Design Questions

| Question | Key Points to Cover |
|----------|---------------------|
| "How would you handle eventual consistency?" | Version tokens, read-your-writes, UI optimistic updates, fallback to write DB |
| "What if a projection falls behind?" | Monitor lag, scale workers, alert if SLO breach, have fallback strategy |
| "How do you rebuild a projection?" | Blue-green deployment, parallel rebuild, catch up to live, atomic switch |
| "What databases would you use for read models?" | Depends on query pattern: relational for filtering, document for nested, search engine for full-text |

### Operational Questions

| Question | Key Points to Cover |
|----------|---------------------|
| "What would you monitor?" | Projection lag (critical), command/query latency, error rates, DLQ size |
| "How do you handle projection errors?" | Retry transient, DLQ for permanent, alert, never block other events |
| "What's your disaster recovery strategy?" | Events are source of truth, rebuild projections from events, multi-region replication |

---

## Trap Questions and How to Handle Them

### Trap Question 1: "Why not just use CRUD?"

```
┌────────────────────────────────────────────────────────────────────┐
│ TRAP: "Why not just use CRUD with caching?"                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  What they're testing:                                              │
│  • Do you know when CQRS is overkill?                              │
│  • Can you articulate trade-offs?                                  │
│                                                                     │
│  Good Answer Structure:                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  "Great question. CRUD with caching is often sufficient.    │   │
│  │   CQRS adds complexity, so we need justification:           │   │
│  │                                                              │   │
│  │   Use CQRS when:                                             │   │
│  │   • Read/write patterns are fundamentally different         │   │
│  │   • Need multiple denormalized views of same data           │   │
│  │   • Independent scaling is critical                         │   │
│  │   • Using Event Sourcing                                    │   │
│  │                                                              │   │
│  │   Stick with CRUD when:                                      │   │
│  │   • Simple domain                                           │   │
│  │   • Small team                                              │   │
│  │   • Balanced read/write                                     │   │
│  │   • Strong consistency required everywhere                   │   │
│  │                                                              │   │
│  │   For THIS problem, CQRS makes sense because [specific]..."  │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Red flags to avoid:                                                │
│  ✗ "CQRS is always better"                                        │
│  ✗ Not acknowledging the complexity trade-off                     │
│  ✗ Unable to justify for the specific problem                     │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Trap Question 2: "How do you handle stale reads?"

```
┌────────────────────────────────────────────────────────────────────┐
│ TRAP: "What if a user creates something and doesn't see it?"       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  What they're testing:                                              │
│  • Do you understand eventual consistency implications?            │
│  • Can you provide practical solutions?                            │
│                                                                     │
│  Good Answer Structure:                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  "This is the read-your-writes problem. Several solutions:  │   │
│  │                                                              │   │
│  │  1. Version Tokens (Server-side):                           │   │
│  │     Command returns version, query waits for that version   │   │
│  │                                                              │   │
│  │  2. Client-side Merging:                                    │   │
│  │     Keep local pending items, merge with server response    │   │
│  │                                                              │   │
│  │  3. UI Patterns:                                             │   │
│  │     Optimistic updates, redirect to detail page             │   │
│  │                                                              │   │
│  │  4. Fallback to Write DB:                                   │   │
│  │     For critical single-item reads immediately after write  │   │
│  │                                                              │   │
│  │  5. Sync Projection (for critical data):                    │   │
│  │     Update read model in same transaction as write          │   │
│  │                                                              │   │
│  │  I'd typically use version tokens + UI optimistic updates   │   │
│  │  for most cases, sync projection only for critical paths."  │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Red flags to avoid:                                                │
│  ✗ "Just make projections sync everywhere" (defeats purpose)      │
│  ✗ "Users won't notice" (they will)                               │
│  ✗ Not having multiple strategies                                 │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Trap Question 3: "What if the event bus goes down?"

```
┌────────────────────────────────────────────────────────────────────┐
│ TRAP: "What happens if the message broker is unavailable?"         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  What they're testing:                                              │
│  • Failure mode understanding                                      │
│  • Knowledge of outbox pattern                                     │
│                                                                     │
│  Good Answer Structure:                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  "With the outbox pattern, commands continue working:       │   │
│  │                                                              │   │
│  │  1. Write + event stored in same DB transaction             │   │
│  │  2. Events buffer in outbox table                           │   │
│  │  3. Relay retries until broker is back                      │   │
│  │  4. Projections catch up when broker recovers               │   │
│  │                                                              │   │
│  │  Impact during outage:                                       │   │
│  │  • Commands: Work normally (writes succeed)                 │   │
│  │  • Queries: Return increasingly stale data                  │   │
│  │                                                              │   │
│  │  Mitigation:                                                 │   │
│  │  • Alert if outbox backlog grows                            │   │
│  │  • Show 'data may be delayed' in UI                        │   │
│  │  • Fallback critical queries to write DB                    │   │
│  │                                                              │   │
│  │  This is why outbox > direct publish - no dual write!"     │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Red flags to avoid:                                                │
│  ✗ "Commands would fail" (wrong with outbox pattern)              │
│  ✗ "We'd lose events" (outbox prevents this)                      │
│  ✗ Not explaining the dual-write problem                          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Trap Question 4: "Doesn't this double your storage?"

```
┌────────────────────────────────────────────────────────────────────┐
│ TRAP: "Isn't storing data twice wasteful?"                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  What they're testing:                                              │
│  • Cost/benefit analysis                                           │
│  • Understanding that storage is cheap, latency is expensive       │
│                                                                     │
│  Good Answer Structure:                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  "Yes, we store data redundantly. But consider:             │   │
│  │                                                              │   │
│  │  Storage costs:                                              │   │
│  │  • Cheap and getting cheaper                                │   │
│  │  • Typical system: maybe 2-3x storage                       │   │
│  │  • Example: 100GB → 300GB = ~$30/month difference          │   │
│  │                                                              │   │
│  │  What we gain:                                               │   │
│  │  • 10-100x faster queries (pre-computed views)             │   │
│  │  • Independent scaling (100 read replicas easy)             │   │
│  │  • Polyglot persistence (right DB for each query)          │   │
│  │  • Simpler queries (denormalized = no joins)               │   │
│  │                                                              │   │
│  │  Trade-off math:                                             │   │
│  │  • Storage: +$30/month                                      │   │
│  │  • Saved compute: -$500/month (fewer expensive queries)    │   │
│  │  • Better user experience: priceless                        │   │
│  │                                                              │   │
│  │  For high-scale systems, query performance is worth it."    │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Trade-offs Table

| Trade-off | Option A | Option B | How to Decide |
|-----------|----------|----------|---------------|
| **Sync vs Async Projections** | Sync: Strong consistency, higher latency | Async: Eventual consistency, lower latency | Business requirement for freshness |
| **Single vs Multiple Read Models** | Single: Simple ops, limited optimization | Multiple: Complex ops, optimized queries | Number of distinct query patterns |
| **Outbox vs CDC** | Outbox: Explicit events, app control | CDC: Automatic, DB-level | Existing infrastructure, event schema needs |
| **Rebuild vs Migrate** | Rebuild: Clean slate, slow | Migrate: In-place, complex | Projection size, downtime tolerance |
| **Strong vs Eventual Consistency** | Strong: Simple reasoning, lower throughput | Eventual: Complex UX, higher throughput | User expectations, domain requirements |

---

## Anti-Patterns to Mention

```
┌────────────────────────────────────────────────────────────────────┐
│ CQRS ANTI-PATTERNS                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Dual Writes (No Outbox)                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ✗ Write to DB then publish to broker separately            │   │
│  │ ✓ Use outbox pattern or CDC                                 │   │
│  │ Why: Partial failures cause inconsistency                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  2. Querying Write Model for Lists                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ✗ Bypass read models for "fresh" data                       │   │
│  │ ✓ Trust the read model, improve lag if needed               │   │
│  │ Why: Defeats the purpose, kills write DB performance        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  3. Sync Projections Everywhere                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ✗ Update all read models in command transaction             │   │
│  │ ✓ Sync only for critical paths, async for rest              │   │
│  │ Why: Destroys write performance and scalability             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  4. Commands Returning Query Data                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ✗ CreateOrder returns full order details                    │   │
│  │ ✓ Return only ID + version, client queries separately       │   │
│  │ Why: Couples command and query, complicates caching         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  5. Single Monolithic Read Model                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ✗ One read model for all query types                        │   │
│  │ ✓ Separate models optimized for each query pattern          │   │
│  │ Why: Defeats the optimization benefit of CQRS               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  6. Ignoring Projection Lag                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ✗ No monitoring, no SLO, no user feedback                   │   │
│  │ ✓ Alert on lag, show staleness indicators, have fallbacks   │   │
│  │ Why: Silent degradation, poor user experience               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference Card

### CQRS at a Glance

```
┌────────────────────────────────────────────────────────────────────┐
│ CQRS QUICK REFERENCE                                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Core Principle:                                                    │
│  "Separate models for reading and writing"                         │
│                                                                     │
│  Key Components:                                                    │
│  • Command API → Write DB → Outbox → Broker → Projections → Read DB│
│                                                                     │
│  Consistency Model:                                                 │
│  • Write side: Strong (ACID)                                       │
│  • Read side: Eventual (typically)                                 │
│                                                                     │
│  Typical SLOs:                                                      │
│  • Command latency p99: < 100ms                                    │
│  • Query latency p99: < 50ms                                       │
│  • Projection lag p99: < 5 seconds                                 │
│                                                                     │
│  Synchronization Options:                                           │
│  • Outbox pattern (most common)                                    │
│  • Change Data Capture (CDC)                                       │
│  • Event Store subscriptions                                       │
│                                                                     │
│  Read Model Stores:                                                 │
│  • Relational (filtering, joins)                                   │
│  • Document (nested data)                                          │
│  • Search engine (full-text)                                       │
│  • Cache (hot data)                                                │
│                                                                     │
│  Critical Metrics:                                                  │
│  • projection_lag_seconds (most important)                        │
│  • command_duration_p99                                            │
│  • query_duration_p99                                              │
│  • dlq_size (should be 0)                                         │
│                                                                     │
│  When to Use:                                                       │
│  ✓ Read:write ratio > 10:1                                        │
│  ✓ Multiple distinct query patterns                               │
│  ✓ Independent scaling needed                                     │
│  ✓ Using Event Sourcing                                           │
│                                                                     │
│  When NOT to Use:                                                   │
│  ✗ Simple CRUD apps                                               │
│  ✗ Small teams                                                    │
│  ✗ Strong consistency required everywhere                         │
│  ✗ Balanced read/write                                            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Key Formulas

```
┌────────────────────────────────────────────────────────────────────┐
│ ESTIMATION FORMULAS                                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Read:Write Ratio:                                                  │
│    queries_per_second / commands_per_second                        │
│    Typical: 10:1 to 1000:1                                         │
│                                                                     │
│  Projection Lag:                                                    │
│    current_time - last_processed_event_timestamp                   │
│    OR: latest_event_position - checkpoint_position                 │
│                                                                     │
│  Cache Hit Ratio:                                                   │
│    cache_hits / (cache_hits + cache_misses)                        │
│    Target: > 90%                                                   │
│                                                                     │
│  Storage Multiplication:                                            │
│    write_model_size + (read_model_size × num_projections)         │
│    Typical: 2-3x write model size                                  │
│                                                                     │
│  Projection Throughput Needed:                                      │
│    events_per_second × safety_factor (1.5-2x)                      │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Interview Success Tips

```
┌────────────────────────────────────────────────────────────────────┐
│ DO's AND DON'Ts                                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  DO:                                                                │
│  ✓ Start with requirements clarification (read/write ratio)       │
│  ✓ Explicitly state the consistency model                         │
│  ✓ Draw the event flow clearly                                    │
│  ✓ Explain why you chose outbox vs CDC                            │
│  ✓ Address eventual consistency proactively                       │
│  ✓ Mention projection lag monitoring                              │
│  ✓ Discuss failure scenarios                                      │
│  ✓ Acknowledge when CQRS is overkill                             │
│                                                                     │
│  DON'T:                                                             │
│  ✗ Assume CQRS is always the right choice                        │
│  ✗ Forget the synchronization mechanism                          │
│  ✗ Ignore the read-your-writes problem                           │
│  ✗ Make projections sync without justification                   │
│  ✗ Skip monitoring and observability                             │
│  ✗ Confuse CQRS with Event Sourcing                              │
│  ✗ Forget to discuss trade-offs                                   │
│                                                                     │
│  Key Phrases to Use:                                                │
│  • "The read model is optimized for [specific query pattern]"      │
│  • "We use eventual consistency with bounded staleness"            │
│  • "The outbox pattern ensures no events are lost"                 │
│  • "Version tokens provide read-your-writes consistency"           │
│  • "We monitor projection lag with a 5-second SLO"                 │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Sample Interview Flow

### Interviewer: "Design an order management system with high read traffic"

```
┌────────────────────────────────────────────────────────────────────┐
│ SAMPLE RESPONSE FLOW                                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Clarify Requirements (2-3 min):                                │
│     "What's the expected read:write ratio? ... 100:1, got it."     │
│     "What consistency is needed for order status updates?"         │
│     "What query patterns - list, search, analytics?"               │
│                                                                     │
│  2. Propose Architecture (2-3 min):                                │
│     "Given the 100:1 ratio and multiple query patterns,            │
│      I recommend CQRS to optimize reads independently."            │
│     [Draw basic diagram: Command side → Events → Query side]       │
│                                                                     │
│  3. Detail Command Side (3-4 min):                                 │
│     "Commands go through validation, domain logic, then persist    │
│      to write DB with events in outbox - same transaction."        │
│     "Outbox relay publishes to message broker."                    │
│                                                                     │
│  4. Detail Query Side (3-4 min):                                   │
│     "Three read models: PostgreSQL for filtered lists,             │
│      Elasticsearch for search, Redis for hot data."                │
│     "Projections consume events and update each store."            │
│                                                                     │
│  5. Address Consistency (3-4 min):                                 │
│     "We have eventual consistency. For read-your-writes,           │
│      command returns version token, query can wait for it."        │
│     "UI uses optimistic updates for immediate feedback."           │
│                                                                     │
│  6. Discuss Failures (2-3 min):                                    │
│     "If broker is down, outbox buffers events."                    │
│     "If projection fails, we retry or DLQ."                        │
│     "If read model is down, we can fallback to write DB."          │
│                                                                     │
│  7. Operational Concerns (2-3 min):                                │
│     "Key metric is projection lag - alert if > 5 seconds."         │
│     "Projection rebuild uses blue-green deployment."               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```
