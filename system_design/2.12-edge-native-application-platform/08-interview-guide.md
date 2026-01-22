# Interview Guide

[Back to Index](./00-index.md) | [Previous: Observability](./07-observability.md)

---

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| 0-5 min | **Clarify** | Requirements, scope, constraints | Ask about scale, consistency needs, use case |
| 5-15 min | **High-Level** | Architecture, major components | Draw the three-tier architecture |
| 15-30 min | **Deep Dive** | 1-2 critical components | Edge DB replication OR streaming SSR |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios | Discuss consistency vs latency |
| 40-45 min | **Wrap Up** | Summary, open questions | Mention what you'd explore given more time |

---

## Phase 1: Clarifying Questions (0-5 min)

### Questions to Ask

| Category | Question | Why It Matters |
|----------|----------|----------------|
| **Scale** | "How many users? What's the geographic distribution?" | Determines number of edge locations, capacity |
| **Traffic** | "What's the read:write ratio?" | Edge DB strategy depends on this |
| **Consistency** | "Can users tolerate slightly stale data? How stale?" | Eventual vs strong consistency decision |
| **Latency** | "What's the acceptable p99 latency for reads? Writes?" | Edge-local vs routed decision |
| **Data Model** | "Is the data relational or key-value? Complex queries?" | SQLite vs KV store |
| **Real-Time** | "Do users need live updates? Collaboration features?" | WebSocket, CRDT requirements |
| **Compliance** | "Any data residency requirements (GDPR, etc.)?" | Regional constraints |

### Expected Answers (Use Case: E-Commerce)

```
Typical e-commerce requirements:
- 10M DAU, global distribution (40% US, 30% EU, 20% APAC, 10% RoW)
- Read-heavy (100:1 ratio): browse products, view cart
- Latency: p99 < 100ms for product pages, < 500ms for checkout
- Eventual consistency OK for catalog, strong for inventory/cart
- GDPR compliance for EU users
```

---

## Phase 2: High-Level Design (5-15 min)

### Architecture to Draw

```
┌─────────────────────────────────────────────────────────────────┐
│                        GLOBAL USERS                              │
│                    (via Anycast DNS)                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     EDGE NETWORK (100+ PoPs)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Edge PoP   │  │  Edge PoP   │  │  Edge PoP   │              │
│  │  US-West    │  │  EU-West    │  │  APAC       │              │
│  │             │  │             │  │             │              │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │              │
│  │ │Runtime  │ │  │ │Runtime  │ │  │ │Runtime  │ │              │
│  │ │(V8)     │ │  │ │(V8)     │ │  │ │(V8)     │ │              │
│  │ └────┬────┘ │  │ └────┬────┘ │  │ └────┬────┘ │              │
│  │      │      │  │      │      │  │      │      │              │
│  │ ┌────▼────┐ │  │ ┌────▼────┐ │  │ ┌────▼────┐ │              │
│  │ │DB Replica│ │  │ │DB Replica│ │  │ │DB Replica│ │            │
│  │ │(SQLite) │ │  │ │(SQLite) │ │  │ │(SQLite) │ │              │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ (Writes routed to primary)
                           │ (Replication from primary)
┌──────────────────────────▼──────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ Primary Database │  │  Standby DB     │                       │
│  │ (Single Region)  │◄─┤  (Sync Replica) │                       │
│  └────────┬────────┘  └─────────────────┘                       │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ Replication Mgr  │──► WAL to all edge replicas                │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Key Points to Mention

1. **Three-tier architecture**: Control plane, edge network, data layer
2. **Anycast routing**: Users automatically hit nearest PoP
3. **Edge DB replicas**: Local reads (5-10ms), writes routed to primary
4. **WAL-based replication**: Efficient, incremental sync
5. **Read-your-writes**: Track write position, ensure local replica is caught up

### Data Flow Summary

```
READ PATH:
User → Edge PoP → Edge Runtime → Edge DB Replica → Response
                                 (< 10ms local)

WRITE PATH:
User → Edge PoP → Edge Runtime → Primary DB → ACK → Update local replica
                                 (50-200ms)      → Async replicate to all
```

---

## Phase 3: Deep Dive (15-30 min)

Choose one of these based on interviewer interest:

### Option A: Edge Database Replication

**Key talking points:**

1. **WAL-based replication**
   - Primary writes to Write-Ahead Log
   - Frames batched and compressed (LZ4)
   - Broadcast to regional distributors → edge PoPs
   - Replicas apply frames in order

2. **Read-your-writes consistency**
   - Client tracks last write position (cookie/header)
   - On read, check if local replica is caught up
   - If behind, wait briefly (50-100ms) or route to primary
   - Guarantees writer always sees their own writes

3. **Failure handling**
   - Gap detection: Request missing frames
   - Too far behind: Rebuild from snapshot
   - Primary failover: Promote standby, replicas reconnect

### Option B: Streaming SSR at Edge

**Key talking points:**

1. **Progressive rendering**
   - Send HTML shell immediately (< 50ms TTFB)
   - Render components with Suspense boundaries
   - Stream in async components as data loads
   - Client replaces placeholders via script injection

2. **ISR integration**
   - Cache rendered HTML at edge
   - Serve stale while revalidating in background
   - Revalidation lock prevents thundering herd

3. **Performance benefits**
   - User sees content immediately
   - SEO-friendly (full HTML for crawlers)
   - Reduced perceived latency

---

## Phase 4: Scale & Trade-offs (30-40 min)

### Trade-offs Discussion

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Consistency** | Eventual (fast, stale) | Strong (slow, correct) | Eventual + read-your-writes |
| **DB Model** | KV (simple) | SQL (rich queries) | SQL for complex, KV for cache |
| **Rendering** | SSG + ISR (cached) | Streaming SSR (fresh) | ISR default, SSR for dynamic |
| **State sync** | Single-writer (simple) | CRDTs (multi-writer) | Single-writer unless collab needed |
| **Write handling** | Sync to primary | Queue + async | Queue with sync ACK |

### Bottleneck Discussion

1. **Write amplification**: Every write replicates to 100+ locations
   - Mitigation: Batch writes, regional distributors, compression

2. **Replication lag**: Reads may see stale data
   - Mitigation: Read-your-writes, accept eventual consistency

3. **Cold starts**: First request to function is slow
   - Mitigation: Warm pools, code pre-compilation

4. **Primary bottleneck**: Single writer limits throughput
   - Mitigation: Shard by tenant, eventual scale to multiple primaries

### Failure Scenario Discussion

**"What if the primary database fails?"**

```
Timeline:
T=0:     Primary becomes unresponsive
T=5s:    Health check fails (retry)
T=15s:   Health check fails (confirm)
T=30s:   Trigger failover
         - Set old primary to read-only
         - Promote standby to primary
         - Update routing
         - Notify edge replicas
T=60s:   Writes resume to new primary

Impact:
- Reads: Unaffected (served from edge replicas)
- Writes: Failed for ~30-60s
- Data loss: Up to 1s of writes (sync replication lag)
```

**"What if a user's write is lost during failover?"**

```
Scenario: Write accepted by old primary but not replicated to standby

Options:
1. Accept loss (< 1s of data, rare event)
2. Return success only after standby ACK (higher latency)
3. Queue writes at edge, replay after failover (complexity)

Recommendation: Option 1 for most apps, Option 2 for financial
```

---

## Phase 5: Wrap-up (40-45 min)

### Summary Points

"To summarize the design:
1. **Edge-native architecture** with 100+ PoPs globally
2. **Edge SQLite replicas** for sub-10ms reads
3. **WAL-based replication** from single primary
4. **Read-your-writes consistency** via position tracking
5. **Streaming SSR + ISR** for optimal rendering
6. **Horizontal scaling** of reads, vertical/shard for writes"

### Open Questions to Mention

"Given more time, I'd explore:
1. **CRDT-based multi-master** for collaborative features
2. **Embedded replicas** for offline-first mobile apps
3. **Vector search at edge** for AI-powered features
4. **Edge caching strategies** for even lower latency"

---

## Trap Questions & Best Answers

| Trap Question | What They Want | Best Answer |
|---------------|----------------|-------------|
| "Why not just use a global PostgreSQL cluster?" | Understanding of edge latency | "PostgreSQL requires connection overhead (200-800ms) and would add latency for every read. Edge replicas give us sub-10ms reads without connection setup." |
| "How do you handle write conflicts?" | Consistency understanding | "We use a single-writer model - all writes go to primary, so conflicts are serialized. For collaboration features, we'd use CRDTs." |
| "What if replication lag causes stale reads?" | Read-your-writes knowledge | "We track the client's last write position and ensure their reads wait for the replica to catch up, guaranteeing read-your-writes." |
| "Why not cache everything at the edge?" | Cache invalidation awareness | "Caching works for static/semi-static content (ISR), but user-specific data needs fresher data from replicas. The hard part is invalidation." |
| "This seems complex. Why not just use a CDN?" | Edge compute understanding | "CDNs cache static content. We need to run application logic at the edge - authentication, personalization, database queries - which CDNs can't do." |
| "What happens at 100x scale?" | Scaling knowledge | "Reads scale horizontally with more PoPs/replicas. Writes hit primary limits - we'd shard by tenant or use regional primaries with CRDT merge." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| Starting with database before clarifying requirements | May design wrong system | Ask about read/write ratio, consistency needs first |
| Proposing strong consistency everywhere | High latency, complex | Use eventual + read-your-writes for most cases |
| Ignoring replication lag | Users see stale data unexpectedly | Explicitly design for and mention lag handling |
| Not considering failure scenarios | Incomplete design | Discuss primary failover, PoP failure, network partition |
| Over-engineering for day 1 | Wasted complexity | Start simple, mention how to scale later |
| Using containers at edge | Too slow | V8 isolates (5ms) vs containers (500ms+) |
| Forgetting about writes | Most designs focus on reads | Explicitly discuss write path, consistency |

---

## Questions to Ask the Interviewer

At the end, ask clarifying questions that show depth:

1. "Should we prioritize consistency or availability during network partitions?"
2. "Are there any specific compliance requirements (GDPR, HIPAA)?"
3. "What's the expected growth rate? Should we design for 10x from day 1?"
4. "Are there existing systems this needs to integrate with?"
5. "What's the budget constraint for infrastructure?"

---

## Quick Reference Card

### Architecture Checklist

- [ ] Three tiers: Control plane, Edge network, Data layer
- [ ] Anycast DNS for routing
- [ ] Edge runtime (V8 isolates)
- [ ] Edge database replicas
- [ ] WAL-based replication
- [ ] Read-your-writes consistency
- [ ] Primary with standby
- [ ] ISR + Streaming SSR

### Numbers to Know

| Metric | Value |
|--------|-------|
| Edge read latency | 5-15ms |
| Edge write latency | 50-200ms |
| Replication lag | 10-60s (eventual) |
| V8 cold start | 5ms |
| ISR revalidation | Background, < 5s |
| Read:write ratio | 100:1 (typical) |
| Edge PoPs | 100+ (global platform) |

### Key Algorithms

1. **WAL replication**: Frame batching, compression, ordered apply
2. **Read-your-writes**: Position tracking, wait-or-route
3. **ISR revalidation**: Stale-while-revalidate, revalidation lock
4. **Streaming SSR**: Chunked encoding, Suspense boundaries

### Red Flags

- Traditional RDBMS without edge strategy
- Strong consistency for all operations
- Ignoring write amplification
- No failover strategy
- Containers at edge (use isolates)

---

## Practice Scenarios

### Scenario 1: E-Commerce Product Pages

**Prompt**: "Design the product page system for a global e-commerce site"

**Key points**:
- ISR for product details (revalidate every 5 min)
- Edge KV for inventory counts (eventual OK for display)
- Strong consistency for actual purchase (route to primary)
- Streaming SSR for personalized recommendations

### Scenario 2: Social Media Feed

**Prompt**: "Design a news feed that loads instantly globally"

**Key points**:
- Pre-computed feed stored in edge KV
- Streaming SSR for shell + async feed load
- Fan-out on write (compute feed at write time)
- Read-your-writes for user's own posts

### Scenario 3: Real-Time Collaboration

**Prompt**: "Design a collaborative document editor at the edge"

**Key points**:
- CRDTs for conflict-free merging
- WebSocket for real-time updates
- Durable Objects for coordination
- Eventually consistent across regions

---

**End of Interview Guide**

[Back to Index](./00-index.md)
