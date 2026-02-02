# Interview Guide

[← Back to Index](./00-index.md) | [Previous: Observability](./07-observability.md)

---

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Open Connect Specifics |
|------|-------|-------|------------------------|
| 0-5 min | **Clarify** | Scope, scale, constraints | "Is this Netflix specifically or general video CDN?" |
| 5-15 min | **High-Level** | Architecture, components | Two-tier OCA model, control/data plane split |
| 15-30 min | **Deep Dive** | 1-2 critical components | Proactive caching OR steering algorithm |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failures | Fill window constraints, BGP failover |
| 40-45 min | **Wrap Up** | Summary, follow-ups | Own CDN vs third-party decision |

---

## Meta-Commentary: What Makes This Problem Unique

### Key Insight: Proactive vs Reactive

Traditional CDN interview answers focus on:
- Cache-on-demand (reactive)
- Anycast routing
- TTL-based invalidation
- Per-bandwidth pricing

**Netflix Open Connect flips all of these:**
- Pre-positioned content (proactive)
- BGP-based steering
- Fill-based distribution (no invalidation)
- Free hardware to ISPs

### Where to Spend Time

| Topic | Time Investment | Why |
|-------|-----------------|-----|
| **Proactive Caching** | 30% | Most unique aspect, shows you understand Netflix's model |
| **Two-Tier Architecture** | 20% | Storage vs Edge OCAs, their relationship |
| **Steering Algorithm** | 20% | BGP integration, proximity ranking |
| **ISP Partnership** | 15% | Economics, mutual benefit |
| **Hardware/Performance** | 15% | 400Gbps serving, kTLS offload |

---

## Questions to Ask Interviewer

### Scoping Questions

| Question | Why Ask | Follow-up Based on Answer |
|----------|---------|---------------------------|
| "Are we designing Netflix specifically or a general video CDN?" | Clarify scope | If Netflix: Focus on Open Connect. If general: Traditional CDN patterns |
| "What's the expected scale - subscribers, traffic?" | Size the system | Determines OCA count, cluster sizing |
| "Is this read-heavy or write-heavy?" | Architecture choice | Video CDN is 99:1 read-heavy |
| "Are we including live streaming or VOD only?" | Scope complexity | Live adds Real-time constraints |
| "What's the geographic distribution?" | Multi-region design | Affects IXP placement, ISP partnerships |

### Clarifying Questions

| Question | Expected Answer | Design Implication |
|----------|-----------------|-------------------|
| "Is the content catalog known or user-generated?" | Known (Netflix) | Enables proactive caching |
| "Can we predict demand?" | Yes (subscription model) | Popularity prediction feasible |
| "What's the ISP relationship model?" | Partnership | Free hardware, SFI peering |
| "What latency is acceptable?" | < 100ms playback start | Edge proximity critical |

---

## Trade-offs Discussion

### Trade-off 1: Own CDN vs Third-Party

| Aspect | Own CDN (Open Connect) | Third-Party (Cloudflare/Akamai) |
|--------|------------------------|--------------------------------|
| **Upfront Cost** | $1B+ investment | Zero |
| **Operating Cost** | Fixed (hardware, ops) | Per-bandwidth (scales with traffic) |
| **Control** | Full stack | Limited configuration |
| **Caching Model** | Proactive possible | Reactive only |
| **ISP Relationship** | Partnership | None |
| **Time to Deploy** | Months/years | Hours |

**Recommendation:** Own CDN for Netflix scale (15%+ internet traffic). Third-party for smaller scale.

**When to choose each:**
- **Own CDN:** 10+ Tbps traffic, need proactive caching, long-term commitment
- **Third-Party:** < 1 Tbps traffic, variable demand, fast deployment

### Trade-off 2: Two-Tier vs Single-Tier OCAs

| Aspect | Two-Tier (Chosen) | Single-Tier |
|--------|-------------------|-------------|
| **Storage Efficiency** | Edge: 120TB (popular only) | Every OCA: 360TB (full catalog) |
| **Complexity** | Higher (fill management) | Lower |
| **Long-Tail Content** | IXP Storage has it | Every OCA has it |
| **ISP Facility Needs** | 2U, 270W (smaller) | 2U, 650W (larger) |

**Recommendation:** Two-tier for Netflix. Single-tier if catalog is small.

### Trade-off 3: BGP Steering vs Anycast

| Aspect | BGP Steering (Chosen) | Anycast |
|--------|----------------------|---------|
| **Control** | Fine-grained (AS-PATH preference) | Automatic (nearest PoP) |
| **Session Stickiness** | Easy (URL-based) | Hard (TCP state) |
| **ISP Integration** | Deep (BGP peering) | Shallow (route announcement) |
| **Failover** | Explicit (health-based) | Implicit (BGP convergence) |

**Recommendation:** BGP steering for deep ISP integration. Anycast for simpler deployment.

---

## Trap Questions & How to Handle

### Trap 1: "Why not just use Cloudflare/Akamai?"

**What Interviewer Wants:** Test if you understand the unique value of owning infrastructure at Netflix scale.

**Best Answer:**
> "At Netflix's scale - handling 15%+ of internet traffic - owning the CDN makes economic sense. More importantly, Open Connect enables proactive caching which is impossible with third-party CDNs. Since Netflix has a known catalog and predictable subscription-based viewing, they can pre-position content during off-peak hours. A reactive CDN would always have cache misses for the first viewer of each content piece. Additionally, the ISP partnership model (free hardware) creates competitive moats."

### Trap 2: "What if an ISP refuses to deploy OCAs?"

**What Interviewer Wants:** Test fallback strategies and graceful degradation.

**Best Answer:**
> "Open Connect has a tiered deployment model. For ISPs that can't or won't deploy embedded OCAs, Netflix offers settlement-free peering at IXPs where both Netflix and the ISP are present. The traffic still routes through the ISP's network to the IXP, which is worse than embedded but better than transit. For very small ISPs, they may route to the nearest IXP automatically. The system gracefully degrades - higher latency but still functional."

### Trap 3: "How do you handle a viral new release that wasn't predicted?"

**What Interviewer Wants:** Test understanding of cache miss handling and dynamic adaptation.

**Best Answer:**
> "The cache miss classification system detects prediction misses in real-time. When a title shows unexpectedly high demand:
> 1. Immediate: Clients fall back to IXP Storage OCAs (which have full catalog)
> 2. Minutes: Out-of-cycle fill triggered to push content to affected Edge OCAs
> 3. Hours: Additional copies replicated across cluster
> 4. Next day: Prediction model updated to account for the pattern
>
> The system is designed to detect and adapt, not to be perfect on day one."

### Trap 4: "If OCAs are in ISP networks, what about security?"

**What Interviewer Wants:** Test security thinking for distributed, untrusted environments.

**Best Answer:**
> "The security model is designed assuming the ISP is untrusted:
> 1. No user data on OCAs - only video content
> 2. Content is DRM-encrypted - useless without license from Netflix's servers
> 3. URL signing - OCAs verify time-limited signed URLs
> 4. No DRM keys on OCAs - keys delivered directly to client devices
> 5. TLS for all traffic - even if intercepted, it's encrypted
>
> Physical access to an OCA gives you encrypted video files that are commercially useless."

### Trap 5: "What's the single point of failure?"

**What Interviewer Wants:** Test awareness of failure domains and redundancy.

**Best Answer:**
> "There's no single point that takes down the entire system:
> - **Single OCA fails:** Client retries on fallback URLs immediately
> - **Entire cluster fails:** Traffic routes to IXP Storage OCAs
> - **IXP fails:** Traffic routes to adjacent IXP
> - **AWS Control Plane fails:** OCAs continue serving (data plane is independent), but new playback sessions impacted
> - **BGP misconfiguration:** Independent health checks detect and reroute within seconds
>
> The most critical dependency is the AWS Control Plane for new playback sessions, but even that is multi-AZ and multi-region."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Designing reactive caching | Misses Netflix's key innovation | Explain proactive caching with fill windows |
| Ignoring ISP partnership | Misses the business model | Explain free hardware, mutual benefit |
| Single-tier architecture | Over-provisions storage | Explain Storage vs Edge OCA roles |
| Anycast-only routing | Misses BGP integration | Explain AS-PATH preference, steering service |
| No fallback strategy | Single point of failure | Explain ranked OCA list, IXP backup |
| Storing user data on OCAs | Security risk | Emphasize content-only storage, DRM |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                NETFLIX OPEN CONNECT INTERVIEW CHEAT SHEET                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  KEY NUMBERS (Memorize)                                                      │
│  ─────────────────────                                                       │
│  • OCAs: 19,000+ deployed                                                    │
│  • ISP locations: 1,500+                                                     │
│  • Countries: 100+                                                           │
│  • Edge hit rate: 95%+                                                       │
│  • Netflix investment: $1B+                                                  │
│  • ISP savings: $1.25B (2021)                                               │
│  • Edge OCA: 120TB, 18Gbps                                                   │
│  • Storage OCA: 360TB, 96Gbps                                                │
│  • Latest: 400Gbps (AMD EPYC)                                               │
│                                                                              │
│  KEY DIFFERENTIATORS (vs Traditional CDN)                                   │
│  ─────────────────────────────────────────                                   │
│  1. PROACTIVE caching (not reactive)                                        │
│  2. ISP-EMBEDDED (not PoP-based)                                            │
│  3. FREE hardware to ISPs (not per-bandwidth fees)                          │
│  4. BGP steering (not Anycast)                                              │
│  5. Two-tier (Storage + Edge)                                               │
│                                                                              │
│  ARCHITECTURE SUMMARY                                                        │
│  ────────────────────                                                        │
│  Control Plane: AWS (Steering, Fill, Health)                                │
│  Data Plane: OCAs globally (19K+ appliances)                                │
│  Tier 1: Storage OCAs at IXPs (full catalog)                                │
│  Tier 2: Edge OCAs in ISPs (popular content)                                │
│                                                                              │
│  PROACTIVE CACHING FLOW                                                      │
│  ─────────────────────                                                       │
│  1. Predict popularity (ML, file-level)                                     │
│  2. Generate fill manifest per OCA                                          │
│  3. Push content during off-peak (nightly)                                  │
│  4. Content ready before users request                                      │
│                                                                              │
│  INTERVIEW OPENING                                                           │
│  ─────────────────                                                           │
│  "Netflix Open Connect is unique because it enables PROACTIVE caching.      │
│  Unlike traditional CDNs that cache on first request, Netflix pre-          │
│  positions content because they have a known catalog and predictable        │
│  subscription-based viewing patterns. This eliminates cold cache misses."   │
│                                                                              │
│  TRADE-OFF TO MENTION                                                        │
│  ────────────────────                                                        │
│  Own CDN: High upfront ($1B+), full control, proactive caching possible    │
│  Third-party: Zero upfront, pay-per-use, reactive caching only             │
│  Netflix chose own because: Scale justifies cost, proactive is impossible  │
│  with third-party, ISP relationships as competitive moat                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sample Interview Dialog

### Opening (0-5 min)

**Interviewer:** "Design Netflix's CDN system."

**Candidate:** "Before I start, I'd like to clarify a few things. Are we designing Netflix specifically, or a generic video CDN? And what's the expected scale?"

**Interviewer:** "Let's design Netflix specifically. Assume 200M+ subscribers globally."

**Candidate:** "Got it. A few more questions: Is the content catalog known ahead of time, or is it user-generated? And what's the ISP relationship model?"

**Interviewer:** "Known catalog - movies and TV shows. ISPs are partners."

**Candidate:** "Perfect. This means we can do something unique - proactive caching. Let me outline the approach..."

### High-Level Design (5-15 min)

**Candidate:** "Netflix's Open Connect is fundamentally different from traditional CDNs like Cloudflare or Akamai. Let me draw the architecture.

[Draws two-tier diagram]

The key insight is that Netflix can predict what content will be watched because:
1. Known catalog of ~17,000 titles
2. Predictable subscription-based viewing patterns
3. No user-generated content surprises

This enables PROACTIVE caching - we push content to edge servers BEFORE users request it, during off-peak hours. Traditional CDNs cache on first request, so the first viewer always has a cache miss. With Open Connect, content is already there.

The architecture has two tiers:
- **Storage OCAs** at Internet Exchange Points - hold the full catalog
- **Edge OCAs** embedded INSIDE ISP networks - hold popular content only

The control plane runs in AWS and handles steering (which OCA to use), fill management (what content goes where), and health monitoring. The data plane is the globally distributed OCAs."

### Deep Dive (15-30 min)

**Interviewer:** "Tell me more about how proactive caching works."

**Candidate:** "Sure. There are three main components:

1. **Popularity Prediction**: We use ML to predict demand at file-level granularity. Each title has 100-200 encoding profiles (different resolutions, bitrates, codecs, languages). We predict separately for each file because their popularity varies by orders of magnitude.

2. **Fill Manifest Generation**: Based on predictions, we generate a manifest for each OCA specifying which files should be stored. Popular content gets multiple copies across the cluster. Long-tail content stays only at IXP Storage OCAs.

3. **Fill Execution**: During the nightly off-peak window (say 2-8am local time), OCAs download new/updated content from upstream. They use SFI (settlement-free interconnection) so there's no transit cost.

[Draws fill flow diagram]

The key challenge is the fill window is limited. If we have 6 hours and a 10GbE link, that's 36TB max transfer. Typical daily churn is 3-5%, so we have plenty of headroom. But for major events like a new season release, we pre-position content days before launch.

**Interviewer:** "What happens if the prediction is wrong?"

**Candidate:** "Great question. The system has fallbacks:
1. Immediate: Client URLs include ranked fallback OCAs
2. Detection: Cache miss classification system identifies 'prediction misses'
3. Remediation: Out-of-cycle fills push unexpected popular content immediately
4. Learning: Model updates for future predictions

The cache miss classification is interesting - we join steering logs with OCA server logs to determine if traffic was served from the expected OCA. If not, we classify why: health issue, prediction miss, capacity miss, etc."

### Scale & Trade-offs (30-40 min)

**Interviewer:** "Why build your own CDN instead of using Cloudflare?"

**Candidate:** "This is the key trade-off question. At Netflix's scale:

**Own CDN (Open Connect):**
- High upfront: $1B+ investment
- Enables proactive caching (impossible with third-party)
- ISP partnership model creates competitive moat
- Full control over hardware optimization (400Gbps per server now)
- Break-even at this traffic volume vs per-bandwidth fees

**Third-party CDN:**
- Zero upfront, instant deployment
- Reactive caching only
- Pay-per-bandwidth (expensive at Netflix scale)
- Limited optimization control

Netflix chose own CDN because:
1. Traffic volume (15%+ of internet) justifies investment
2. Proactive caching is their key advantage
3. ISP relationships locked in as partnerships
4. Hardware optimization yields massive efficiency gains

I'd recommend own CDN for any service above 10 Tbps with predictable content. Below that, third-party makes sense."

### Wrap-Up (40-45 min)

**Interviewer:** "Anything you'd add given more time?"

**Candidate:** "A few areas I'd expand on:

1. **Live streaming**: Netflix added live events (like Tyson vs Paul with 65M concurrent). That requires different architecture - more real-time, less caching.

2. **Codec optimization**: Netflix innovated with AV1 and Film Grain Synthesis for 20-30% bandwidth savings. This compounds with the CDN efficiency.

3. **Security model**: OCAs in ISP networks are designed for untrusted environments - no user data, DRM-encrypted content, signed URLs.

4. **Observability**: The cache miss classification system I mentioned enables continuous improvement of prediction accuracy.

Should I dive into any of these?"

---

## Related Interview Questions

| Question | Relevance | Key Points |
|----------|-----------|------------|
| "Design YouTube's CDN" | Compare with UGC model | YouTube uses reactive caching, can't predict UGC popularity |
| "Design a generic CDN" | Traditional patterns | Anycast, cache-on-demand, origin shield |
| "Design Twitch's live CDN" | Real-time constraints | No caching for live, different architecture |
| "Optimize CDN cache hit rate" | Performance tuning | Prediction accuracy, storage sizing, fill optimization |

---

## Further Reading

- [Netflix Open Connect Official](https://openconnect.netflix.com/)
- [Serving 100 Gbps from an Open Connect Appliance](https://netflixtechblog.com/serving-100-gbps-from-an-open-connect-appliance-cdb51dda3b99)
- [How Data Science Helps Power Worldwide Delivery of Netflix Content](https://netflixtechblog.com/how-data-science-helps-power-worldwide-delivery-of-netflix-content-bac55800f9a7)
- [Driving Content Delivery Efficiency Through Classifying Cache Misses](https://netflixtechblog.com/driving-content-delivery-efficiency-through-classifying-cache-misses-ffcf08026b6c)
- [Netflix and Fill](https://netflixtechblog.com/netflix-and-fill-c43a32b490c0)
- [FreeBSD Case Study: Open Connect](https://freebsdfoundation.org/wp-content/uploads/2021/03/Netflix-Open.pdf)

---

*[← Back to Index](./00-index.md)*
