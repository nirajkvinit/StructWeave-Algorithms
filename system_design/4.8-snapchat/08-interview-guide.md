# Interview Guide

## Overview

This guide prepares you for system design interviews focused on Snapchat or similar ephemeral messaging platforms. The key differentiators from other messaging apps (WhatsApp, Messenger) are:

1. **Ephemeral by default** - Content auto-deletes
2. **Camera-first** - Visual content, not text
3. **AR Lenses** - Real-time ML on device
4. **Location sharing** - Snap Map with 400M MAU
5. **Server-side encryption** - Not E2EE (enables moderation)

---

## Interview Pacing

### 45-Minute Format

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify | Scope, scale, constraints | Ask about ephemeral vs persistent |
| **5-15 min** | High-Level | Core architecture | Start with camera-first UX |
| **15-30 min** | Deep Dive | 1-2 components | Deletion pipeline or AR |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failures | Multicloud, reliability |
| **40-45 min** | Wrap Up | Summary, questions | Highlight key decisions |

### 60-Minute Format

| Time | Phase | Focus |
|------|-------|-------|
| **0-8 min** | Clarify | Requirements, constraints |
| **8-20 min** | High-Level | Architecture, data flows |
| **20-40 min** | Deep Dive | 2-3 components in detail |
| **40-52 min** | Scale & Reliability | Scaling, fault tolerance |
| **52-60 min** | Trade-offs & Wrap Up | Decision justification |

---

## Phase-by-Phase Guide

### Phase 1: Clarification (5-8 minutes)

**Questions to Ask:**

| Category | Question | Why It Matters |
|----------|----------|----------------|
| **Scope** | "Are we focusing on 1:1 Snaps, Stories, or both?" | Scope the problem |
| **Scale** | "What's our target DAU? Snaps per day?" | Capacity planning |
| **Features** | "Should I include AR Lenses and Snap Map?" | Complexity |
| **Ephemeral** | "How strict is the deletion requirement?" | Storage design |
| **Encryption** | "Do we need end-to-end encryption?" | Critical decision |
| **Platform** | "Mobile-only or also web?" | Client considerations |

**Key Assumptions to State:**

```
"Let me state my assumptions:
- 300M+ DAU, 5B+ Snaps/day
- Snaps auto-delete after viewed or 30 days
- Camera-first UX with AR effects
- Server-side encryption (not E2EE) for content moderation
- Mobile-first, but considering web
- Snap Map is in scope at a high level

Does this align with what you have in mind?"
```

### Phase 2: High-Level Design (10-15 minutes)

**Start with the user journey:**

```
"Let me walk through the core user flow:

1. Alice opens Snapchat → Camera is home screen
2. She captures a Snap, applies a Lens
3. Selects Bob as recipient, sends
4. Bob receives push notification, opens Snap
5. Snap auto-deletes after Bob views it

This drives our architecture..."
```

**Draw the architecture:**

```
                                Client
                                  │
                        ┌─────────┴─────────┐
                        │    API Gateway    │
                        │   (Auth, Route)   │
                        └────────┬──────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────┴─────┐ ┌────┴────┐ ┌─────┴─────┐
              │ Messaging │ │ Stories │ │   Map     │
              │  Service  │ │ Service │ │ Service   │
              └─────┬─────┘ └────┬────┘ └─────┬─────┘
                    │            │            │
              ┌─────┴────────────┴────────────┴─────┐
              │              Data Layer              │
              │  ┌───────────┐ ┌───────────────────┐│
              │  │ Volatile  │ │   Persistent      ││
              │  │ (Snaps)   │ │ (Users, Stories)  ││
              │  └───────────┘ └───────────────────┘│
              └─────────────────────────────────────┘
```

**Key points to cover:**

1. **Volatile memory for ephemeral Snaps** - Guarantees deletion
2. **CDN for Stories** - 24h TTL, global distribution
3. **On-device AR** - Cannot have network latency for 60 FPS
4. **Multicloud** - AWS + GCP for cost and reliability

### Phase 3: Deep Dive (15-20 minutes)

**Choose 1-2 components based on interviewer interest:**

#### Option A: Ephemeral Deletion Pipeline

```
"The deletion pipeline is critical - it's Snapchat's core promise.
Let me explain how we guarantee deletion:

1. Snaps stored in volatile memory (RAM cluster)
   - Not on disk, no backups
   - Power off = data gone

2. Deletion triggers:
   - All recipients viewed → immediate
   - 30-day timeout → expired
   - Sender delete → immediate

3. Deletion process:
   - Delete media from temp storage
   - Purge from CDN cache
   - Remove from volatile memory
   - Log deletion (metadata only) for audit

4. Failure handling:
   - Deletion workers have retry with backoff
   - Queue depth monitoring
   - Alert if deletion takes >1 minute
```

#### Option B: AR Lens Engine

```
"AR at 60 FPS requires <16ms per frame. Here's how:

1. Face detection: 3ms (optimized model)
2. Landmark detection: 2ms (68 points)
3. Lens inference: 5ms (SnapML)
4. Effect rendering: 3ms (GPU)
5. Compositing: 2ms

Total: ~15ms, leaving 1ms headroom

Key optimizations:
- On-device inference (no network)
- Model quantization (INT8)
- Tiered quality by device
- Frame skipping under load
```

#### Option C: Snap Map

```
"Snap Map has 400M MAU with real-time location. Challenges:

1. Write volume: Millions of location updates/second
2. Read pattern: Show friends in viewport

Solution:
- H3 geospatial indexing (hexagonal cells)
- Client-side throttling (only send if moved 50m+)
- Write-behind caching (Redis → Cassandra)
- Heatmaps pre-computed, cached at CDN
- Privacy: Ghost mode client-side, no server calls
```

### Phase 4: Scale & Trade-offs (10-15 minutes)

**Scaling discussion:**

```
"At 5B Snaps/day (62,500/sec), here's how we scale:

1. Stateless services in Kubernetes
   - Horizontal autoscaling
   - 300+ microservices

2. Envoy service mesh
   - 10M QPS service-to-service
   - Circuit breakers, retries

3. DynamoDB Global Tables
   - Multi-region replication
   - Sub-10ms latency

4. Multicloud (AWS + GCP)
   - 65% cost reduction
   - No vendor lock-in
```

**Trade-offs to discuss:**

| Decision | Option A | Option B | Our Choice |
|----------|----------|----------|------------|
| Encryption | E2EE | Server-side | Server-side (moderation) |
| Ephemeral Storage | Database TTL | Volatile memory | Volatile (guaranteed deletion) |
| AR Processing | Cloud | On-device | On-device (latency) |
| Cloud | Single provider | Multicloud | Multicloud (flexibility) |

### Phase 5: Wrap Up (5 minutes)

**Summarize key decisions:**

```
"To summarize the key architectural decisions:

1. Ephemeral-first: Volatile memory storage ensures
   Snaps are truly deleted, not just marked.

2. Camera-first: On-device AR inference for 60 FPS,
   camera as home screen.

3. Server-side encryption: Enables content moderation
   and guaranteed deletion (vs E2EE).

4. Multicloud: AWS + GCP for 65% cost savings,
   no vendor lock-in.

5. Service mesh: 300+ microservices with Envoy
   handling 10M QPS.

Any questions or areas you'd like me to explore further?"
```

---

## Trap Questions & Best Answers

### Encryption & Privacy

| Trap Question | What They Want | Good Answer |
|---------------|----------------|-------------|
| **"Why not use E2EE like WhatsApp?"** | Understand trade-offs | "E2EE would prevent server-side moderation for CSAM and abuse. Snapchat's privacy model is deletion, not encryption. By controlling content lifecycle on the server, we can guarantee deletion. With E2EE, we'd rely on clients to delete, which isn't reliable." |
| **"How can you guarantee deletion?"** | Defense in depth | "Multiple layers: volatile memory storage (no disk persistence), deletion after all recipients view, 30-day max for unopened, asynchronous deletion workers, CDN cache purge, and metadata-only audit logs. If the server loses power, volatile data is gone by design." |
| **"What about screenshots?"** | Technical limitations | "We can't technically prevent screenshots. Our approach is social deterrent: we notify the sender when a screenshot is taken. The user knows their friend violated trust. This is a product decision - ephemeral doesn't mean absolute secrecy." |

### Architecture

| Trap Question | What They Want | Good Answer |
|---------------|----------------|-------------|
| **"Why 300+ microservices?"** | Scale understanding | "At Snapchat's scale, AR, messaging, Map, and Stories have vastly different scaling patterns. AR needs GPU, messaging needs connections, Map needs geospatial indexing. Microservices let us scale and deploy independently. The service mesh (Envoy) handles the complexity." |
| **"Why not just use database TTL for ephemeral?"** | Deep understanding | "Database TTL doesn't guarantee deletion. Backups, replicas, and caches might retain data. By using volatile memory, we ensure content is truly gone. There's no backup to restore, no replica to sync. This is intentional - it matches our product promise." |
| **"Why multicloud vs single provider?"** | Infrastructure decisions | "Three reasons: (1) Cost optimization - we achieved 65% reduction by leveraging competitive pricing, (2) No vendor lock-in - we can negotiate better rates, and (3) Reliability - if one provider has an outage, we're not completely down. The complexity is managed by our service mesh." |

### Performance

| Trap Question | What They Want | Good Answer |
|---------------|----------------|-------------|
| **"How does AR work on old phones?"** | Performance awareness | "We use tiered model quality. Flagship phones get full 60 FPS with complex Lenses. Mid-range gets 30 FPS with standard models. Budget phones get basic filters only. We detect device capabilities at startup and load appropriate models. Under thermal throttling, we gracefully degrade." |
| **"What if deletion workers fall behind?"** | Reliability thinking | "We auto-scale workers based on queue depth. At 10K items, we add workers. At 100K, we alert. Deletions are prioritized: user-initiated first, then view-triggered, then expiration. We accept brief delays (minutes) rather than losing data. Background scanners ensure nothing falls through." |

### Scale

| Trap Question | What They Want | Good Answer |
|---------------|----------------|-------------|
| **"How do you handle celebrity Story views?"** | Fan-out problem | "Hybrid approach. For regular users (<10K followers), we push to friend feeds on write. For celebrities (>10K), we use pull on read - query their Stories when a friend opens the feed. This avoids writing to millions of feeds for one Story." |
| **"How does Snap Map handle 400M users?"** | Location scale | "H3 geospatial indexing with cell-based queries. Client throttles updates (only send if moved 50m). Write-behind caching to Cassandra. Heatmaps are pre-computed and cached at CDN. Most queries hit Redis, not the database." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| **Designing E2EE** | Conflicts with core product (moderation, deletion) | Explain server-side encryption with deletion-based privacy |
| **Using database for ephemeral** | Can't guarantee deletion (backups) | Volatile memory with no persistence |
| **Cloud AR** | Latency too high for 60 FPS | On-device inference with SnapML |
| **Single cloud** | Misses cost optimization opportunity | Multicloud with service mesh |
| **Ignoring deletion** | Missing the core feature | Detail the deletion pipeline |
| **Over-engineering day 1** | Design for 1000x, not 10x | Start with current scale, discuss growth path |

---

## Key Trade-offs Summary

### Trade-off 1: Server Access vs E2EE

```
Server-Side (Snapchat's Choice):
  + Content moderation (CSAM, abuse)
  + Guaranteed deletion (server controls)
  + Law enforcement cooperation
  - Users trust Snapchat with content

End-to-End Encryption:
  + Cryptographic privacy guarantee
  - Can't moderate content
  - Can't guarantee deletion
  - Controversial client-side CSAM detection
```

### Trade-off 2: Volatile Memory vs Database TTL

```
Volatile Memory (Snapchat's Choice):
  + True deletion (power off = gone)
  + Sub-ms latency
  + No backup restoration risk
  - Higher cost (RAM)
  - No recovery (acceptable for ephemeral)

Database TTL:
  + Lower cost
  + Standard tooling
  - Backups might retain data
  - Can't guarantee deletion
```

### Trade-off 3: On-Device vs Cloud AR

```
On-Device (Snapchat's Choice):
  + <16ms per frame (60 FPS)
  + Works offline
  + Privacy (frames stay on device)
  - Limited by device capability
  - Large model downloads

Cloud AR:
  + Unlimited model complexity
  + Always latest version
  - 50-200ms latency (unusable for real-time)
  - Privacy concerns
```

---

## Quick Reference Card

### Key Numbers

```
┌─────────────────────────────────────────┐
│           SNAPCHAT QUICK FACTS          │
├─────────────────────────────────────────┤
│ DAU: 306M    MAU: 750M    Peak: 50M    │
│ Snaps/day: 5.4B    Snaps/sec: 62.5K    │
│ Stories/day: 1B    Lens plays: 6B      │
│ Snap Map MAU: 400M                      │
├─────────────────────────────────────────┤
│ Microservices: 300+   QPS: 10M         │
│ Clouds: AWS + GCP    Cost saving: 65%  │
├─────────────────────────────────────────┤
│ Camera launch: <6s   AR FPS: 60        │
│ Snap delivery: <100ms                  │
│ Deletion: <60s after trigger           │
├─────────────────────────────────────────┤
│ Encryption: TLS + server-side (NOT E2E)│
│ Ephemeral: Volatile memory (no backup) │
└─────────────────────────────────────────┘
```

### Snapchat vs WhatsApp

| Feature | Snapchat | WhatsApp |
|---------|----------|----------|
| Primary content | Visual (camera-first) | Text (chat-first) |
| Default behavior | Ephemeral (delete) | Persistent (save) |
| Encryption | Server-side | End-to-end |
| Content moderation | Full capability | Metadata only |
| AR Lenses | Core feature | None |
| Location | Snap Map (400M MAU) | Optional sharing |
| Stories | Pioneered | Adopted |

### Architecture Checklist

```
□ Volatile memory for ephemeral Snaps
□ CDN with TTL for Stories
□ On-device AR inference
□ Multicloud (AWS + GCP)
□ Service mesh (Envoy)
□ DynamoDB Global Tables
□ H3 for geospatial (Map)
□ Server-side moderation
□ Deletion pipeline with audit
```

---

## Interview Scenario Variations

### "Design Snapchat" (General)

Focus on: Ephemeral messaging, AR Lenses, Stories

### "Design the Snap Deletion System"

Focus on: Volatile memory, deletion pipeline, compliance

### "Design Snap Map"

Focus on: H3 indexing, privacy controls, real-time updates

### "Design AR Lenses"

Focus on: On-device ML, model distribution, performance

### "Design Stories"

Focus on: 24h TTL, CDN distribution, view tracking

---

## Questions to Ask Interviewer

At the end, show engagement:

1. "What aspects would you like me to elaborate on?"
2. "Are there specific failure scenarios you'd like me to address?"
3. "Should I discuss the content moderation architecture in more detail?"
4. "Would you like me to compare with WhatsApp's E2EE approach?"

---

## Final Tips

1. **Lead with ephemeral** - It's the core differentiator
2. **Explain the E2EE trade-off early** - Shows you understand the product
3. **Draw as you talk** - Keep interviewer engaged
4. **Quantify** - Use real numbers (306M DAU, 5.4B Snaps)
5. **Acknowledge trade-offs** - Nothing is perfect
6. **Connect to product** - Technical decisions serve user experience
