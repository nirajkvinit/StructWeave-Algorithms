# Interview Guide

[← Back to Index](./00-index.md) | [Previous: Observability →](./07-observability.md)

---

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify | Requirements, scale, consistency needs | Ask about write patterns, latency requirements |
| **5-15 min** | High-Level | Multi-region architecture, data flow | Draw 3 regions, show replication |
| **15-30 min** | Deep Dive | Conflict resolution OR replication | Pick one, go deep |
| **30-40 min** | Trade-offs | CAP, consistency models, failure scenarios | Show multiple options |
| **40-45 min** | Wrap Up | Summary, questions, extensions | Mention monitoring, security |

---

## Clarifying Questions to Ask

### Functional Requirements

| Question | Why It Matters |
|----------|----------------|
| "What's the read/write ratio?" | Determines caching strategy, conflict likelihood |
| "Do users need to see their writes immediately?" | Read-your-writes vs eventual consistency |
| "What data types are we storing?" | CRDT applicability |
| "Are there transactions spanning multiple keys?" | Affects consistency model |
| "What happens if two users update the same item?" | Conflict resolution strategy |

### Non-Functional Requirements

| Question | Why It Matters |
|----------|----------------|
| "What's the latency target for reads/writes?" | Local vs global consistency |
| "What availability target (nines)?" | Redundancy model |
| "How many regions do we need?" | Topology complexity |
| "What's the expected QPS?" | Capacity planning |
| "Any data residency requirements?" | Replication constraints |

### Scope

| Question | Why It Matters |
|----------|----------------|
| "Is this greenfield or migrating existing?" | Compatibility constraints |
| "What's the budget for infrastructure?" | Affects multi-cloud, dedicated links |
| "Do we own the network between regions?" | Latency, security assumptions |

---

## Phase-by-Phase Approach

### Phase 1: High-Level Design (5-15 min)

**What to Draw:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│           Global Load Balancer (GeoDNS/Anycast)              │
│                         │                                    │
│           ┌─────────────┼─────────────┐                      │
│           │             │             │                      │
│           ▼             ▼             ▼                      │
│      ┌─────────┐   ┌─────────┐   ┌─────────┐                │
│      │ US-East │   │ EU-West │   │  APAC   │                │
│      │   ┌─┐   │   │   ┌─┐   │   │   ┌─┐   │                │
│      │   │DB│   │   │   │DB│   │   │   │DB│   │                │
│      │   └─┘   │   │   └─┘   │   │   └─┘   │                │
│      └────┬────┘   └────┬────┘   └────┬────┘                │
│           │             │             │                      │
│           └─────────────┴─────────────┘                      │
│              Async Replication (Full Mesh)                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Points to Make:**

1. "Each region is fully independent - can serve all operations"
2. "Async replication between regions for low latency"
3. "Global load balancer routes to nearest healthy region"
4. "Conflict resolution needed for concurrent writes"

### Phase 2: Deep Dive (15-30 min)

**Option A: Conflict Resolution Deep Dive**

Draw the conflict detection flowchart:
1. Explain vector clocks (how they detect concurrent writes)
2. Walk through a conflict scenario
3. Explain resolution strategy (CRDT vs LWW)
4. Discuss trade-offs

**Option B: Replication Deep Dive**

Draw the replication flow:
1. Write-ahead log capture
2. Batching and compression
3. Cross-region transport
4. Conflict resolution on apply
5. Anti-entropy for repair

### Phase 3: Trade-offs (30-40 min)

**Must Discuss:**

1. **Consistency vs Latency** - Why we choose eventual consistency
2. **Write Patterns** - Write-local vs write-partitioned
3. **CRDT Limitations** - Not all data fits CRDTs
4. **Cost** - 2N redundancy is expensive

---

## Trade-offs Discussion Framework

### Trade-off 1: Write Pattern

| Decision | Write-Local | Write-Partitioned | Write-Global |
|----------|-------------|-------------------|--------------|
| **Latency** | Lowest | Medium | Highest |
| **Conflicts** | Most likely | Home-region only | None |
| **Availability** | Highest | High | Medium (SPOF) |
| **Complexity** | Highest | Medium | Lowest |
| **Best For** | Shopping carts, social | User data | Financial |

**Recommendation:** "For most use cases, write-local with CRDT conflict resolution provides the best balance. We'd use write-partitioned for data like user profiles where we want to avoid conflicts."

### Trade-off 2: Consistency Model

| Decision | Eventual | Causal+ | Strong |
|----------|----------|---------|--------|
| **Latency** | Lowest | Medium | Highest |
| **Implementation** | CRDT/LWW | Vector clocks | Distributed locks |
| **Availability** | Highest | High | Lower |
| **User Experience** | May see stale | Read-your-writes | Always consistent |

**Recommendation:** "Default to eventual with read-your-writes guarantee via session tokens. Offer strong consistency per-request for critical operations like checkout."

### Trade-off 3: Replication Topology

| Decision | Full Mesh | Hub-Spoke | Ring |
|----------|-----------|-----------|------|
| **Propagation** | Fastest (1 hop) | Medium (2 hops) | Slowest |
| **Connections** | O(n²) | O(n) | O(n) |
| **Complexity** | High | Low | Medium |
| **Failure Impact** | Minimal | Hub is critical | Cascading |

**Recommendation:** "Full mesh for up to 5 regions. Beyond that, hierarchical with regional super-nodes."

---

## Trap Questions & Best Answers

### Trap 1: "Why not just use synchronous replication everywhere?"

**What Interviewer Wants:** Understanding of CAP and latency trade-offs

**Best Answer:**
"Synchronous replication would guarantee strong consistency, but at a severe cost. Cross-region latency is 50-200ms, so synchronous writes would take 2-3x that for quorum. For a shopping cart needing <100ms responses, we'd be looking at 300-600ms writes - unacceptable UX.

Instead, we use async replication with CRDTs. This gives us low latency while guaranteeing eventual convergence. For the rare operations needing strong consistency, we offer GLOBAL_QUORUM as an opt-in with clear latency warnings."

---

### Trap 2: "What happens if three regions write to the same key simultaneously?"

**What Interviewer Wants:** Deep understanding of multi-way conflict resolution

**Best Answer:**
"With vector clocks and CRDTs, multi-way conflicts resolve the same as two-way. Each region's vector clock tracks its own updates.

Example: If Region A has {A:5, B:3, C:2}, Region B has {A:4, B:6, C:2}, and Region C has {A:4, B:3, C:7}, these are all concurrent - no clock dominates.

For a G-Counter CRDT, we take element-wise maximum: {A:5, B:6, C:7}, giving us total value 18.

The key insight is that CRDT merge is associative and commutative - merge(merge(A,B),C) equals merge(A,merge(B,C)), so order doesn't matter."

---

### Trap 3: "How do you prevent users from seeing their data revert after a write?"

**What Interviewer Wants:** Understanding of session consistency

**Best Answer:**
"This is the read-your-writes problem. Several solutions:

1. **Sticky sessions** - Route user to same region via cookie. Simple but fails on failover.

2. **Version tokens** - Client sends last-seen vector clock; server waits until that version is available locally.

3. **Read-from-writer** - For critical flows, read from the region that processed the write.

4. **Causal consistency tokens** - Encode the vector clock in a session token, propagate with requests.

For most cases, I'd use version tokens - they're stateless and handle failover gracefully."

---

### Trap 4: "CRDTs sound perfect - why doesn't everyone use them?"

**What Interviewer Wants:** Understanding of CRDT limitations

**Best Answer:**
"CRDTs have significant trade-offs:

1. **Limited data types** - A counter works, but complex business logic doesn't. You can't model 'withdraw $100 if balance > $100' as a CRDT.

2. **Storage overhead** - OR-Set stores unique tags for every add, which can grow unbounded without GC.

3. **Semantic limitations** - 'Add' and 'remove' commute, but 'reserve seat 5A' doesn't - two concurrent reservations both 'succeed'.

4. **Garbage collection complexity** - Pruning tombstones requires coordination.

For many use cases, application-level conflict resolution with vector clocks and siblings is more practical."

---

### Trap 5: "What if a region is partitioned for an hour? How much data is lost?"

**What Interviewer Wants:** Understanding of RPO and partition behavior

**Best Answer:**
"With true active-active, no data is lost during a partition - both sides continue accepting writes. The question is about divergence.

During the hour, both partitions accumulate independent writes. When the partition heals:
1. Replication lag spikes as we reconcile
2. Conflict resolution kicks in for keys written on both sides
3. RPO is effectively zero - no writes rejected

However, users see 'stale' data during partition - User A in Region A won't see Region B's updates until healing.

For critical data, we could use global quorum which fails writes during partition - trading availability for consistency. The choice depends on the use case."

---

### Trap 6: "How do you handle schema changes in active-active?"

**What Interviewer Wants:** Understanding of operational complexity

**Best Answer:**
"Schema changes are one of the hardest problems. Our approach:

1. **Backward-compatible only** - Add fields, never remove or rename. Old regions ignore unknown fields.

2. **Dual-write period** - During migration, write both old and new formats.

3. **Version field** - Every record includes schema_version; readers handle multiple versions.

4. **Rolling updates** - Update one region at a time, verify cross-region compatibility.

5. **CRDTs help** - If the CRDT type stays the same, evolution is just adding new counters.

The key principle: never deploy a change that breaks cross-region replication."

---

### Trap 7: "Your conflict resolution uses timestamps - what about clock skew?"

**What Interviewer Wants:** Understanding of time synchronization

**Best Answer:**
"Clock skew is real - NTP gives 100-250ms skew between regions. LWW could pick the 'wrong' winner.

Mitigations:
1. **Hybrid Logical Clocks** - Combine physical time with logical counters for causal ordering even with skew.

2. **Bounded staleness** - If timestamps within skew window, treat as concurrent, use region ID tiebreaker.

3. **TrueTime approach** - For Google-scale, atomic clocks give 7ms skew, but expensive.

4. **Design principle** - CRDTs don't rely on timestamps; use them so timestamp is last resort, not primary resolution.

Best practice: assume clock skew exists and design around it."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| **Single global database** | Defeats active-active purpose | Full replica per region |
| **Ignoring conflicts** | Data corruption/loss | Explicit conflict strategy |
| **Synchronous replication** | Latency kills UX | Async with CRDT |
| **No clock skew handling** | Silent data corruption | HLC, bounded staleness |
| **Forgetting read-your-writes** | User confusion | Session tokens |
| **Unbounded CRDT state** | Memory explosion | Garbage collection |
| **Same consistency everywhere** | Latency for non-critical ops | Per-request levels |

---

## Questions to Ask Interviewer

1. "What's the expected scale - users, QPS, data size?"
2. "What's the read/write ratio?"
3. "Do we need strong consistency for any operations?"
4. "What's the latency target?"
5. "Any data residency requirements?"
6. "What consistency do users expect - banking level or social media level?"

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│           MULTI-REGION ACTIVE-ACTIVE QUICK REFERENCE         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SCALE TARGETS:                                              │
│  • 3-5 regions, 100K+ QPS/region                            │
│  • < 50ms local latency, < 300ms global                      │
│  • 99.999% availability                                      │
│                                                              │
│  KEY PATTERNS:                                               │
│  • Write-Local + CRDT conflict resolution                    │
│  • Async replication, sync for critical ops                  │
│  • Vector clocks for causality                               │
│  • Full mesh < 5 regions, hierarchical beyond                │
│                                                              │
│  GO-TO CRDT CHOICES:                                         │
│  • Counters → G-Counter / PN-Counter                         │
│  • Collections → OR-Set                                      │
│  • Simple values → LWW-Register                              │
│  • Complex → Vector Clocks + App Resolution                  │
│                                                              │
│  CONSISTENCY LEVELS:                                         │
│  • LOCAL_ONE: 5ms, cached reads                              │
│  • LOCAL_QUORUM: 15ms, most operations                       │
│  • GLOBAL_QUORUM: 200ms, critical writes                     │
│                                                              │
│  FAILURE HANDLING:                                           │
│  • Region fail: GeoDNS/Anycast failover (< 90s)              │
│  • Partition: Both sides continue (AP)                       │
│  • Heal: CRDT merge, anti-entropy repair                     │
│                                                              │
│  CRITICAL NUMBERS:                                           │
│  • Replication lag: 50-200ms typical                         │
│  • RTO: < 30s automatic failover                             │
│  • RPO: < replication lag                                    │
│  • Clock skew: 7ms (TrueTime) to 250ms (NTP)                │
│                                                              │
│  INTERVIEW FLOW (45 min):                                    │
│  • 0-5: Clarify requirements                                 │
│  • 5-15: High-level (3 regions, replication)                │
│  • 15-30: Deep dive (conflicts OR replication)               │
│  • 30-40: Trade-offs (CAP, consistency)                      │
│  • 40-45: Wrap up (monitoring, extensions)                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Interview Success Checklist

### Before Deep Dive
- [ ] Asked about read/write ratio
- [ ] Asked about consistency requirements
- [ ] Asked about latency targets
- [ ] Drew 3-region architecture

### During Deep Dive
- [ ] Explained conflict detection (vector clocks)
- [ ] Explained conflict resolution (CRDT or LWW)
- [ ] Discussed replication mechanism
- [ ] Addressed read-your-writes guarantee

### Trade-offs Covered
- [ ] Consistency vs latency
- [ ] Write patterns (local vs partitioned)
- [ ] CRDT limitations
- [ ] Cost (2N redundancy)

### Failure Scenarios
- [ ] Regional failover
- [ ] Network partition
- [ ] Data divergence recovery

### Bonus Points
- [ ] Mentioned anti-entropy/Merkle trees
- [ ] Discussed clock skew mitigation
- [ ] Mentioned GDPR/data residency
- [ ] Brought up observability (replication lag metrics)

---

[← Back to Index](./00-index.md) | [Previous: Observability →](./07-observability.md)
