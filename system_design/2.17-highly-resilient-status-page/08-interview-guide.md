# Interview Guide

[Back to Index](./00-index.md)

---

## Interview Pacing (45 Minutes)

| Phase | Time | Focus | Deliverables |
|-------|------|-------|--------------|
| **Clarify** | 0-5 min | Requirements gathering | Scale, constraints, independence needs |
| **High-Level** | 5-15 min | Architecture overview | Components, data flow, independence layers |
| **Deep Dive** | 15-30 min | Critical component | Multi-CDN OR notifications OR CRDTs |
| **Scale & Reliability** | 30-40 min | Production concerns | Traffic spikes, failover, DR |
| **Wrap-up** | 40-45 min | Trade-offs & questions | Alternatives, follow-ups |

---

## Phase 1: Clarifying Questions (0-5 min)

### Questions to Ask

| Question | Why It Matters | Expected Answer |
|----------|----------------|-----------------|
| "What's the availability target?" | Drives architecture complexity | 99.99%+ (higher than monitored services) |
| "How many subscribers per page?" | Notification system scale | 1K - 1M+ |
| "Do we need real-time updates?" | SSE vs polling decision | Usually yes |
| "Multi-tenant or single-tenant?" | Architecture complexity | Usually multi-tenant SaaS |
| "What notification channels?" | Notification system scope | Email, SMS, webhooks, Slack |
| "International or single region?" | Multi-region requirements | Usually global |

### Requirements Checklist

After clarifying, confirm:

- [ ] Availability target (99.99%)
- [ ] Geographic scope (global)
- [ ] Traffic expectations (1000:1 read-write, spikes during incidents)
- [ ] Notification channels required
- [ ] Real-time updates needed
- [ ] Independence from monitored infrastructure (critical)

---

## Phase 2: High-Level Design (5-15 min)

### Quick Architecture Sketch

Draw this on the whiteboard:

```
┌─────────────────────────────────────────────────────────────────┐
│                    STATUS PAGE SYSTEM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Users ──► Multi-CDN ──► Edge Workers ──► Control Plane        │
│                  │              │              │                 │
│                  │              │              ▼                 │
│                  │              │       ┌──────────────┐        │
│                  │              │       │ Incident API │        │
│                  │              │       │ Component API│        │
│                  │              │       └──────────────┘        │
│                  │              │              │                 │
│                  │              ▼              ▼                 │
│                  │       Edge KV Store   Status Database        │
│                  │              │         (CRDT-enabled)        │
│                  │              │              │                 │
│                  │              │              ▼                 │
│                  │              │       Notification Engine     │
│                  │              │              │                 │
│                  │              │         ┌────┼────┐           │
│                  │              │         ▼    ▼    ▼           │
│                  │              │       Email SMS Webhook       │
│                  │              │                                │
│                  ▼              ▼                                │
│            Real-time:  SSE connections via Pub/Sub              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Key: The status page is on DIFFERENT infrastructure than monitored services
```

### Key Points to Communicate

1. **Independence Architecture** (Most Important)
   > "The fundamental requirement is that the status page must remain UP when everything else is DOWN. This means we cannot share any infrastructure with the monitored services - different cloud provider, different CDN, different DNS."

2. **Multi-CDN for Resilience**
   > "We use multiple CDN providers with health-based DNS failover. If one CDN goes down, traffic automatically routes to backups within 30-60 seconds."

3. **Edge-First for Performance**
   > "Status pages are read-heavy with extreme spikes during incidents. We render at the edge using Edge KV for current status, serving globally under 200ms."

4. **CRDTs for Consistency**
   > "Incidents can be updated from multiple regions. We use CRDTs (Conflict-free Replicated Data Types) to handle concurrent updates without coordination."

5. **Queue-Based Notifications**
   > "Notifications are async through message queues with retries. During a major incident, we might need to notify millions of subscribers quickly."

---

## Phase 3: Deep Dive Options (15-30 min)

Choose ONE based on interviewer interest:

### Option A: Independence Architecture

**Key Points:**
- DNS independence: Separate DNS providers
- Network independence: Multi-CDN (3 providers)
- Compute independence: Different cloud provider
- Data independence: Separate database with CRDT sync
- Monitoring independence: External synthetic checks

**Technical Details:**
```
Health Check Failover:
- Health checks every 10 seconds
- 2 failures to mark unhealthy
- DNS weight updated, propagates in ~30s
- Total failover time: 25-85 seconds

Graceful Degradation Tiers:
- Tier 1: Full dynamic (Edge KV)
- Tier 2: Origin-backed (API fetch)
- Tier 3: Stale cache (CDN cached)
- Tier 4: Static fallback (pre-deployed)
```

### Option B: Notification Pipeline

**Key Points:**
- Event-driven architecture with Pub/Sub
- Multi-channel fanout (email, SMS, webhook, Slack)
- Deduplication at multiple levels
- Exponential backoff with jitter for retries
- At-least-once delivery guarantee

**Technical Details:**
```
Deduplication Levels:
1. Event-level: Same event ID → skip
2. Dedup key window: Same dedup_key in 5 min → skip
3. Rate limiting: Max 10/hour per subscriber per channel

Retry Strategy (webhooks):
- 8 retries over ~1 hour
- Delays: 30s, 1m, 2m, 4m, 8m, 16m, 32m, 60m
- Jitter: ±50% to prevent thundering herd
```

### Option C: CRDT Synchronization

**Key Points:**
- OR-Set for incident updates (additions preserved)
- LWW-Register for status changes (last writer wins)
- Vector clocks for causality tracking
- Hybrid Logical Clocks for tiebreaking

**Technical Details:**
```
LWW-Register Merge:
  IF remote.hlc > local.hlc:
      local.value = remote.value
      local.hlc = remote.hlc

OR-Set Merge:
  adds = union(local.adds, remote.adds)
  removes = union(local.removes, remote.removes)
  visible = {v for v in adds if v.tag not in removes}

Sync Interval: 100ms between regions
Max Lag: < 500ms
```

### Option D: Real-time Updates (SSE)

**Key Points:**
- Server-Sent Events as primary (simple, one-way)
- Polling fallback for unsupported clients
- Edge termination (connections at edge, not origin)
- Pub/Sub backbone for event distribution

**Technical Details:**
```
SSE Event Types:
- incident_created
- incident_updated
- incident_resolved
- component_status_changed
- heartbeat (every 30s)

Connection Management:
- Max 100K connections per edge location
- Max 10 connections per IP (prevent abuse)
- Reconnection with Last-Event-ID for catch-up
- Exponential backoff on reconnect
```

---

## Phase 4: Scale & Reliability (30-40 min)

### Handle Traffic Spikes

> "During a major incident, traffic can spike 100x normal. The edge-first architecture handles this because CDN edge caches absorb the load. We use stale-while-revalidate so even during origin stress, users see the last known status."

### Handle Region Failure

> "With multi-region active-active and CRDTs, a region failure is seamless. GeoDNS routes users to healthy regions, and CRDT sync means all regions have the same data. No explicit failover needed."

### Handle Notification Burst

> "For a million subscribers, we use sharded queues with auto-scaling workers. Critical incidents go to a priority queue processed first. Rate limiting per channel prevents provider throttling."

### Disaster Recovery Summary

| Scenario | RTO | RPO | Recovery |
|----------|-----|-----|----------|
| Single CDN | < 30s | 0 | DNS failover |
| Single region | < 10s | < 500ms | GeoDNS + CRDT |
| All origins | 0 | < 30s | Edge cache + fallback |
| Total loss | < 15min | < 5min | IaC + backup restore |

---

## Phase 5: Trade-offs & Wrap-up (40-45 min)

### Trade-off Discussions

| Trade-off | Option A | Option B | Recommendation |
|-----------|----------|----------|----------------|
| **Single vs Multi-CDN** | Simpler, cheaper | Complex, resilient | Multi-CDN (independence critical) |
| **Strong vs Eventual Consistency** | Always fresh | Multi-region writes | Eventual/CRDTs (availability wins) |
| **SSE vs Polling** | Real-time, overhead | Simple, laggy | SSE with polling fallback |
| **Edge vs Origin Rendering** | Fast, cached | Fresh, dependent | Edge-first (resilience) |
| **At-least-once vs Exactly-once** | Simple, duplicates | Complex | At-least-once + dedup |

### Common Follow-up Questions

**Q: "Why not just use the same cloud provider?"**
> "If the status page shares infrastructure with monitored services, it fails when you need it most. AWS's own status page had issues during AWS outages because it ran on AWS. Independence is the core requirement."

**Q: "How do you handle webhook failures?"**
> "Exponential backoff with jitter over 8 retries (~1 hour). After that, we mark it failed and optionally notify the subscriber their endpoint is unreachable. We never block on webhooks - they're async."

**Q: "What if two people update an incident simultaneously?"**
> "CRDTs handle this automatically. For incident updates (timeline), we use OR-Set so both updates appear. For status changes, LWW-Register with HLC ensures deterministic winner. No manual conflict resolution needed."

**Q: "How do you prevent notification spam?"**
> "Multi-level deduplication: event-level (same event ID), dedup_key (same alert group), and per-subscriber rate limiting (max 10/hour). Also, operators can suppress notifications for non-critical updates."

---

## Trap Questions & Strong Answers

### Trap 1: "Can you use the same infrastructure?"

❌ **Weak Answer:** "We could put it on the same cloud with separate accounts..."

✅ **Strong Answer:** "No - independence is the fundamental requirement. The status page must be UP when everything else is DOWN. This was proven when AWS's status page failed during an AWS outage. We need a different cloud provider, different CDN, different DNS - completely separate infrastructure."

### Trap 2: "What about 100x traffic during an incident?"

❌ **Weak Answer:** "We auto-scale our servers..."

✅ **Strong Answer:** "Edge-first architecture handles this. The status page is essentially static HTML with periodic updates. CDN edge caches absorb the spike - we might see 100x traffic at edge but origin only sees cache misses. We use stale-while-revalidate, so even if origin is stressed, users get the last known status. Request coalescing prevents cache stampede."

### Trap 3: "What if two regions update the same incident?"

❌ **Weak Answer:** "We use locks to prevent conflicts..."

✅ **Strong Answer:** "CRDTs handle this without coordination. Incident updates use OR-Set - both additions survive merge. Status changes use LWW-Register with Hybrid Logical Clocks for deterministic tiebreaking. No locks, no coordination, no conflicts. This is why we chose CRDTs over strong consistency - availability is more important than preventing brief inconsistency."

### Trap 4: "How do you guarantee notification delivery?"

❌ **Weak Answer:** "We send synchronously and wait for confirmation..."

✅ **Strong Answer:** "At-least-once delivery with multi-level deduplication. We queue notifications asynchronously, retry with exponential backoff (8 retries over an hour for webhooks), and track delivery status. Idempotency keys let receivers deduplicate on their end. We don't do exactly-once because the complexity isn't worth it - deduplication is simpler."

### Trap 5: "What if the CDN goes down?"

❌ **Weak Answer:** "We hope it doesn't happen often..."

✅ **Strong Answer:** "Multi-CDN with health-based DNS failover. We run health checks every 10 seconds across 3 CDN providers. Two failures mark a CDN unhealthy, DNS weights update, and traffic shifts to healthy CDNs within 30-60 seconds. If all CDNs fail (very rare), we have pre-deployed static fallback pages and communicate via Twitter."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Same cloud as monitored services | Correlated failure | Use different cloud provider |
| Single CDN | CDN outage = status page down | Multi-CDN with failover |
| Origin-first rendering | Origin failure = unavailable | Edge-first with fallback tiers |
| Strong consistency | Reduces availability during partitions | CRDTs for availability |
| Synchronous notifications | Blocks API, can't handle spikes | Queue-based async delivery |
| No deduplication | Notification spam | Multi-level deduplication |
| Ignoring graceful degradation | All-or-nothing availability | Tiered degradation (4 levels) |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│          STATUS PAGE SYSTEM - INTERVIEW QUICK REF               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SCALE TARGETS               KEY PATTERNS                       │
│  ─────────────               ────────────                       │
│  • 99.99% availability       • Independence architecture        │
│  • < 200ms TTFB globally     • Multi-CDN with failover         │
│  • 1M+ concurrent viewers    • Edge-first rendering            │
│  • 1M+ subscribers/page      • CRDTs for incident sync         │
│  • < 30s update propagation  • SSE with polling fallback       │
│  • < 2min email delivery     • At-least-once + deduplication   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ARCHITECTURE                FAILURE HANDLING                   │
│  ────────────                ────────────────                   │
│  • Multi-CDN edge layer      • CDN fail → backup CDN (30s)     │
│  • Edge compute/KV           • Origin fail → edge cache        │
│  • CRDT-enabled database     • Region fail → other regions     │
│  • Queue-based notifications • Total fail → static fallback    │
│  • Pub/Sub for real-time     • Queue backlog → auto-scale     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CRDT SUMMARY                NOTIFICATION FLOW                  │
│  ────────────                ─────────────────                  │
│  • OR-Set: incident updates  • Event → Dedup → Fanout → Queue  │
│  • LWW-Register: status      • Queue → Worker → Provider       │
│  • Vector clocks: causality  • Retry: 8x with exp backoff      │
│  • HLC: tiebreaking          • Track: delivery status          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  KEYWORDS TO USE             TRADE-OFFS TO MENTION              │
│  ───────────────             ────────────────────               │
│  • Independence architecture • Multi-CDN vs Single (independence)│
│  • Correlated failure        • Edge vs Origin (resilience)     │
│  • Edge-first rendering      • CRDT vs Strong (availability)   │
│  • Graceful degradation      • SSE vs Polling (real-time)      │
│  • At-least-once delivery    • At-least-once vs Exactly-once   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Questions to Ask Interviewer

At the end, show curiosity:

1. "What's the expected incident frequency? Are we optimizing for rare major incidents or frequent minor updates?"
2. "Are there compliance requirements (GDPR, SOC 2) that affect data handling?"
3. "What's the budget constraint? Multi-cloud is expensive but essential for independence."
4. "Do we need to support legacy systems that can't handle SSE?"
5. "Is there an existing monitoring stack we need to integrate with?"

---

## Summary: What Makes This System Unique

The status page system has one defining characteristic that distinguishes it from most other systems:

> **The status page must be MORE available than the services it monitors.**

This single requirement drives every architectural decision:
- **Multi-CDN** (not just one)
- **Different cloud provider** (not just different account)
- **CRDTs** (availability over consistency)
- **Edge-first** (survive origin failure)
- **Graceful degradation** (something always works)

When in doubt, optimize for independence and availability. That's the essence of a highly resilient status page system.
