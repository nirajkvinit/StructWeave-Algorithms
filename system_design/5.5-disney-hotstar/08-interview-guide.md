# Interview Guide

## Overview

This guide helps you navigate a 45-minute system design interview for a live sports streaming platform like Disney+ Hotstar. The key differentiator is handling extreme traffic spikes (20x in 10 minutes) while maintaining quality for 59M+ concurrent viewers.

---

## Interview Pacing (45 Minutes)

```
Timeline:
────────────────────────────────────────────────────────────────

0-5 min:   REQUIREMENTS CLARIFICATION
           ├─ Understand scale (peak concurrent users)
           ├─ Clarify latency requirements
           ├─ Ask about monetization (ads vs subscription)
           └─ Confirm geographic scope

5-15 min:  HIGH-LEVEL DESIGN
           ├─ Draw core components
           ├─ Explain live ingest pipeline
           ├─ Introduce multi-CDN strategy
           └─ Show data flow for playback

15-30 min: DEEP DIVE (Choose one based on interviewer interest)
           ├─ Option A: Traffic spike handling
           ├─ Option B: SSAI at scale
           └─ Option C: Multi-CDN orchestration

30-40 min: TRADE-OFFS AND BOTTLENECKS
           ├─ Discuss latency vs stability trade-off
           ├─ Address potential bottlenecks
           └─ Explain graceful degradation

40-45 min: WRAP-UP
           ├─ Summarize key decisions
           ├─ Mention future improvements
           └─ Ask clarifying questions

Key Signals Interviewers Look For:
├─ Understanding of live streaming constraints
├─ Ability to handle extreme scale
├─ Trade-off reasoning (especially latency)
├─ Operational awareness (monitoring, failover)
└─ Practical experience indicators
```

---

## Requirements Clarification Questions

### Essential Questions to Ask

| Question | Why It Matters | Expected Answer |
|----------|---------------|-----------------|
| "What's the peak concurrent viewership?" | Drives scaling strategy | 50-60M for major events |
| "What's the acceptable glass-to-glass latency?" | Determines architecture | 30-40s for stability |
| "Is this subscription-only or ad-supported?" | Affects SSAI requirements | Freemium with ads |
| "What's the traffic spike pattern?" | Informs pre-scaling | 20x in 10 minutes |
| "Geographic scope?" | CDN and compliance needs | India-primary, global diaspora |
| "Multi-language commentary needed?" | Audio architecture | Yes, 8+ languages |

### Questions to Clarify Scope

- "Should I focus on live streaming or also cover VOD?"
- "Do you want me to include interactive features like polls?"
- "Should I address DRM in detail or assume it's handled?"

---

## Deep Dive Options

### Option A: Traffic Spike Handling

**When to choose**: Interviewer asks about scaling, handling peak load, or thundering herd

**Key points to cover**:

1. **Pre-warming Strategy**
   ```
   L0 (Baseline) → L1 (T-60 min) → L2 (T-30 min) → L3 (T-10 min) → L4 (Reactive)

   "We use a ladder-based scaling approach. At T-60 minutes before a major
   match, we begin scaling to 2x baseline. By T-10 minutes, we're at 10x.
   This is proactive, not reactive."
   ```

2. **Origin Shield / Request Coalescing**
   ```
   "When 1 million users request the same segment simultaneously, without
   protection, that's 1 million requests to origin. With origin shield,
   we coalesce these into a single origin request and fan out the response."
   ```

3. **90-Second Provisioning**
   ```
   "Our target is 90 seconds from scaling trigger to serving traffic.
   We achieve this through pre-baked AMIs, warm instance pools, and
   pre-pulled container images."
   ```

### Option B: SSAI at Scale

**When to choose**: Interviewer asks about ads, monetization, or personalization at scale

**Key points to cover**:

1. **Why SSAI over CSAI**
   ```
   "Server-side ad insertion has two major advantages:
   1. Ad blockers can't bypass it - critical for revenue
   2. Unified QoE metrics - we measure one stream, not content + ads separately"
   ```

2. **Demographic Grouping**
   ```
   "We don't do 1:1 ad personalization at 25M scale - that would mean
   25M cache entries. Instead, we group users into 50-100 demographic
   segments. This gives us 99%+ cache hit rates while maintaining
   targeting value."
   ```

3. **Graceful Degradation**
   ```
   "If the ad decision server is slow, we fall back to pre-computed
   generic ad pods. The user experience is 'slightly less targeted ads'
   not 'black screen during ad break'."
   ```

### Option C: Multi-CDN Orchestration

**When to choose**: Interviewer asks about reliability, CDN, or geographic distribution

**Key points to cover**:

1. **Why Multi-CDN**
   ```
   "No single CDN can reliably serve 80+ Tbps. We use Akamai as primary
   (70%), with CloudFront and Fastly as backup. This provides both
   capacity and failover."
   ```

2. **CDN Steering Logic**
   ```
   "We continuously monitor CDN health - error rates, latency, cache hit
   rates. If Akamai's error rate exceeds 1%, we automatically shift
   traffic to backup CDNs within 60 seconds."
   ```

3. **Origin Shield**
   ```
   "Origin shield sits between CDNs and our origin. It prevents any
   single CDN's cache miss from overwhelming our packagers."
   ```

---

## Trap Questions and Answers

### Trap 1: "Why not ultra-low latency (<5 seconds)?"

**The trap**: Suggesting ultra-low latency sounds impressive but is wrong for this use case.

**Good answer**:
```
"Ultra-low latency comes with significant trade-offs at our scale:

1. Buffer size: Ultra-low requires 2-3 segment buffers. At 59M viewers,
   a network hiccup means millions of rebuffer events simultaneously.

2. ABR instability: Small buffers make quality switching unpredictable.

3. SSAI complexity: Ad stitching needs time to personalize.

Our users care more about uninterrupted viewing than being 30 seconds
ahead of Twitter. A 1% rebuffer at 59M scale means 590,000 unhappy users.

We chose 30-40 seconds for stability over speed."
```

### Trap 2: "Why not use client-side ad insertion?"

**The trap**: CSAI is simpler but has critical flaws for this use case.

**Good answer**:
```
"Client-side ad insertion has three problems at our scale:

1. Ad blockers: 20-30% of users have ad blockers. CSAI can be blocked,
   SSAI cannot - it's the same stream.

2. Fragmented analytics: With CSAI, we have content metrics and ad
   metrics from different sources. SSAI gives us unified QoE.

3. Device limitations: Some devices (older Smart TVs) struggle with
   CSAI implementation.

Yes, SSAI is more complex to build, but the revenue protection alone
justifies it."
```

### Trap 3: "How do you handle 59M concurrent viewers?"

**The trap**: Jumping to horizontal scaling without addressing the real challenges.

**Good answer**:
```
"The challenge isn't just 59M viewers - it's the traffic pattern.
We go from 3M to 60M in 10 minutes.

Our approach:

1. Predictable scaling: Match schedules are known. We pre-scale
   infrastructure starting T-60 minutes.

2. Request coalescing: At segment boundaries, millions request the
   same content. Origin shield collapses these to single fetches.

3. Multi-tier caching: CDN edge → Origin shield → Packager.
   Most requests never reach origin.

4. Stateless design: Session state in Redis, allowing any instance
   to serve any user.

The hardest problem is actually the thundering herd at match start,
not steady-state 59M."
```

### Trap 4: "Why not use a single CDN with more capacity?"

**The trap**: Single CDN is simpler but creates risk.

**Good answer**:
```
"Three reasons for multi-CDN:

1. Capacity: No single CDN guarantees 100+ Tbps capacity for our peaks.

2. Reliability: CDNs have outages. During India vs Pakistan, a CDN
   outage is a national incident. Multi-CDN gives us failover.

3. Negotiating leverage: Multiple CDN contracts give us better pricing
   and prevent vendor lock-in.

The complexity of CDN steering is worth it for the reliability gain."
```

---

## Trade-off Discussions

### Trade-off 1: Latency vs Stability

| Factor | Ultra-Low (<10s) | Our Choice (30-40s) |
|--------|------------------|---------------------|
| Buffer depth | 2-3 segments | 8-10 segments |
| Rebuffer risk | High | Very low |
| ABR quality | Unstable | Stable |
| SSAI complexity | Very high | Manageable |
| Scale proven | Limited | 59M tested |

**Key quote**: "At 59M scale, we optimize for the worst network conditions, not the best."

### Trade-off 2: SSAI vs CSAI

| Factor | CSAI | SSAI |
|--------|------|------|
| Ad blocker immune | No | Yes |
| Implementation | Simple | Complex |
| Personalization | Full | Group-based |
| Analytics | Fragmented | Unified |
| Device support | Varies | Universal |

**Key quote**: "The 20-30% revenue protection from ad-blocker immunity pays for the SSAI complexity many times over."

### Trade-off 3: Single CDN vs Multi-CDN

| Factor | Single CDN | Multi-CDN |
|--------|------------|-----------|
| Complexity | Low | High |
| Cost efficiency | Higher | Lower (competition) |
| Capacity | Limited | Combined |
| Reliability | SPOF | Redundant |
| Operations | Simple | Complex |

**Key quote**: "During a World Cup final, CDN reliability is worth any operational complexity."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Proposing <10s latency | Unstable at 59M scale | Explain 30-40s trade-off |
| Ignoring traffic spikes | The core challenge | Discuss ladder scaling |
| 1:1 ad personalization | Doesn't scale | Explain demographic grouping |
| Single CDN | Creates SPOF | Multi-CDN with steering |
| Skipping DRM | Content rights are critical | Mention multi-DRM briefly |
| Exact viewer counting | Too expensive at scale | Sampling + HyperLogLog |
| Over-engineering DVR | It's just cached segments | Keep it simple |

---

## Questions to Ask the Interviewer

### Technical Questions
- "Is there a specific traffic pattern you'd like me to optimize for?"
- "Should I assume we have existing relationships with CDN providers?"
- "How important is supporting legacy devices (older Smart TVs)?"

### Scope Questions
- "Should I include the VOD component or focus purely on live?"
- "Do you want me to address the interactive features (polls, predictions)?"

### Clarifying Questions
- "When you say 'low latency', do you mean glass-to-glass or just CDN latency?"
- "Is the ad targeting done in-house or through a third-party ad server?"

---

## Quick Reference Card

```
╔══════════════════════════════════════════════════════════════════════════╗
║            DISNEY+ HOTSTAR INTERVIEW QUICK REFERENCE                     ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  KEY NUMBERS TO REMEMBER                                                 ║
║  ├─ 59M concurrent viewers (T20 World Cup 2024)                         ║
║  ├─ 20x traffic spike in 10 minutes                                     ║
║  ├─ 30-40 second glass-to-glass latency                                 ║
║  ├─ 4-second segment duration                                           ║
║  ├─ 8+ commentary languages                                             ║
║  ├─ 6 quality tiers (360p to 4K)                                        ║
║  ├─ 70% mobile users                                                    ║
║  └─ 90-second infrastructure scaling                                    ║
║                                                                          ║
║  ARCHITECTURE HIGHLIGHTS                                                 ║
║  ├─ Multi-CDN: Akamai (70%) + CloudFront + Fastly                       ║
║  ├─ Origin Shield: Request coalescing (1M → 1 request)                  ║
║  ├─ SSAI: Server-side ads, demographic grouping (50-100 groups)         ║
║  ├─ Ladder Scaling: L0 → L1 (T-60) → L2 (T-30) → L3 (T-10) → L4        ║
║  └─ Multi-DRM: Widevine, FairPlay, PlayReady                            ║
║                                                                          ║
║  KEY TRADE-OFFS (MEMORIZE THESE)                                        ║
║  ├─ Latency: 30-40s chosen for stability over ultra-low                 ║
║  ├─ Ads: SSAI chosen for ad-blocker immunity + unified QoE              ║
║  ├─ CDN: Multi-CDN for capacity + reliability                           ║
║  └─ Counting: Sampling + HyperLogLog for cost efficiency                ║
║                                                                          ║
║  GRACEFUL DEGRADATION LEVELS                                            ║
║  ├─ L0: Full features                                                   ║
║  ├─ L1: Generic ads (drop personalization)                              ║
║  ├─ L2: Disable interactive features                                    ║
║  ├─ L3: Cap at 720p                                                     ║
║  └─ L4: Audio-only emergency mode                                       ║
║                                                                          ║
║  WHAT MAKES THIS PROBLEM UNIQUE                                         ║
║  ├─ Predictable spikes (match schedules known)                          ║
║  ├─ Extreme scale (top 3 globally for concurrent)                       ║
║  ├─ Mobile-first (India's bandwidth constraints)                        ║
║  ├─ Multi-language (8+ commentary tracks)                               ║
║  └─ Revenue-critical ads (SSAI at 25M+ scale)                           ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## Sample Interview Flow

### Opening (0-5 min)

**Interviewer**: "Design a live sports streaming system like Hotstar."

**You**: "Before I dive in, I'd like to clarify a few requirements:
1. What's our target peak concurrent viewership?
2. What latency is acceptable - are we targeting ultra-low or is 30-40 seconds okay?
3. Is this ad-supported, subscription, or both?
4. Should I focus on a specific geography?"

**Interviewer**: "50-60 million concurrent, latency can be 30-40 seconds, freemium model with ads, primarily India."

**You**: "Great, so we're dealing with one of the highest concurrent viewership scenarios globally, similar to IPL finals. The key challenges will be:
1. Handling 20x traffic spikes in 10 minutes
2. Server-side ad insertion at 25M+ concurrent scale
3. Multi-CDN to handle 80+ Tbps egress
Let me start with the high-level architecture..."

### High-Level (5-15 min)

*Draw and explain the architecture diagram from 02-high-level-design.md*

### Deep Dive (15-30 min)

**Interviewer**: "Tell me more about how you handle the traffic spikes."

*Deep dive into Option A from this guide*

### Wrap-up (40-45 min)

**You**: "To summarize, the key architectural decisions are:
1. 30-40s latency for stability at 59M scale
2. Ladder-based pre-scaling starting T-60 minutes
3. Origin shield for thundering herd protection
4. Multi-CDN with automated steering
5. SSAI with demographic grouping for ad efficiency

If I had more time, I'd discuss:
- The multi-language audio architecture
- Disaster recovery across regions
- Real-time viewer counting optimizations"

---

## Further Reading

- [00-index.md](./00-index.md) - Overview and navigation
- [02-high-level-design.md](./02-high-level-design.md) - Architecture diagrams
- [04-deep-dive-and-bottlenecks.md](./04-deep-dive-and-bottlenecks.md) - Technical deep dives
