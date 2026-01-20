# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Approach

### 45-Minute Pacing Guide

```
┌────────────────────────────────────────────────────────────────────┐
│ DNS SYSTEM DESIGN - 45 MINUTE INTERVIEW                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ [0-5 min] REQUIREMENTS CLARIFICATION                               │
│ ────────────────────────────────────                               │
│ • Recursive resolver or authoritative DNS?                         │
│ • What scale? (queries/sec, zones, records)                       │
│ • Need GSLB features? (GeoDNS, failover, weighted)                │
│ • Security requirements? (DNSSEC, DoH/DoT)                        │
│                                                                     │
│ Good Answer: "Let me design a recursive resolver at 10M QPS       │
│ scale with Anycast deployment, DNSSEC validation, and DoH         │
│ support for privacy."                                              │
│                                                                     │
│ [5-15 min] HIGH-LEVEL ARCHITECTURE                                 │
│ ─────────────────────────────────                                  │
│ • Draw DNS hierarchy (Root → TLD → Authoritative)                 │
│ • Show recursive resolution flow                                   │
│ • Explain Anycast for global distribution                         │
│ • Mention cache as critical component                             │
│                                                                     │
│ Key Components to Draw:                                            │
│   ┌────────┐    ┌────────┐    ┌────────┐                         │
│   │ Client │───▶│Resolver│───▶│  Root  │                         │
│   └────────┘    │ Cache  │    │  TLD   │                         │
│                 └────────┘    │  Auth  │                         │
│                               └────────┘                          │
│                                                                     │
│ [15-25 min] DEEP DIVE: CACHING                                     │
│ ─────────────────────────────                                      │
│ • TTL-based caching is fundamental                                │
│ • Cache hit ratio target: > 95%                                   │
│ • Negative caching (NXDOMAIN)                                     │
│ • Cache prefetching for popular domains                           │
│                                                                     │
│ [25-35 min] GSLB + ANYCAST                                         │
│ ──────────────────────────                                         │
│ • How does GeoDNS routing work?                                   │
│ • EDNS Client Subnet for accurate geo                             │
│ • Health checks and failover                                      │
│ • Anycast for resilience and load distribution                    │
│                                                                     │
│ [35-40 min] SECURITY                                               │
│ ─────────────────                                                  │
│ • Cache poisoning and prevention                                  │
│ • DNSSEC chain of trust                                           │
│ • DoH/DoT for privacy                                             │
│                                                                     │
│ [40-45 min] WRAP-UP                                                │
│ ──────────────────                                                 │
│ • Summarize key trade-offs                                        │
│ • Answer follow-up questions                                       │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Whiteboard Strategy

```
┌────────────────────────────────────────────────────────────────────┐
│ WHITEBOARD LAYOUT                                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ LEFT SIDE: Architecture Diagram                              │  │
│  │                                                               │  │
│  │        ┌──────────┐                                          │  │
│  │        │  Client  │                                          │  │
│  │        └────┬─────┘                                          │  │
│  │             │                                                 │  │
│  │        ┌────▼─────┐                                          │  │
│  │        │ Recursive│ ◄─── Anycast (1.1.1.1)                  │  │
│  │        │ Resolver │                                          │  │
│  │        │ + Cache  │                                          │  │
│  │        └────┬─────┘                                          │  │
│  │             │ Cache Miss                                      │  │
│  │        ┌────▼─────┐                                          │  │
│  │        │   Root   │ ◄─── 13 identifiers                     │  │
│  │        └────┬─────┘                                          │  │
│  │             │                                                 │  │
│  │        ┌────▼─────┐                                          │  │
│  │        │   TLD    │ ◄─── .com, .org, .net                   │  │
│  │        └────┬─────┘                                          │  │
│  │             │                                                 │  │
│  │        ┌────▼─────┐                                          │  │
│  │        │   Auth   │ ◄─── example.com NS                     │  │
│  │        └──────────┘                                          │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ RIGHT SIDE: Key Numbers & Trade-offs                         │  │
│  │                                                               │  │
│  │  Scale:                                                       │  │
│  │  • 10M+ QPS (global)                                         │  │
│  │  • 50+ Anycast locations                                     │  │
│  │  • Trillions of queries/day                                  │  │
│  │                                                               │  │
│  │  Latency Targets:                                            │  │
│  │  • Cache hit: < 5ms p50                                     │  │
│  │  • Cache miss: < 50ms p50                                   │  │
│  │  • Availability: 99.999%                                     │  │
│  │                                                               │  │
│  │  Key Ratios:                                                  │  │
│  │  • Cache hit ratio: > 95%                                   │  │
│  │  • Read:Write = 99.99:1                                     │  │
│  │                                                               │  │
│  │  Trade-offs:                                                  │  │
│  │  • TTL: Freshness vs Load                                   │  │
│  │  • DNSSEC: Security vs Latency                              │  │
│  │  • Anycast: Auto-failover vs Stickiness                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Key Talking Points

### Must-Mention Concepts

| Topic | What to Say | Why It Matters |
|-------|-------------|----------------|
| **DNS Hierarchy** | "Root → TLD → Authoritative, iterative queries" | Foundation of DNS architecture |
| **Caching + TTL** | "Cache hit ratio 95%+, TTL-based expiration" | Most queries never leave resolver |
| **Anycast** | "Same IP at all locations, BGP routes to nearest" | Scalability and resilience |
| **DNSSEC** | "Chain of trust from root, validates authenticity" | Security-critical |
| **Negative Caching** | "Cache NXDOMAIN to prevent repeated lookups" | Often overlooked but important |
| **13 Root Servers** | "13 identifiers, 1900+ instances via Anycast" | Common trap question |

### Things to Avoid

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| Ignoring caching | DNS is 95%+ caching | Emphasize cache architecture |
| Missing Anycast | Core of DNS scalability | Explain BGP Anycast routing |
| No security discussion | DNS is attack target | Cover DNSSEC, poisoning prevention |
| Forgetting negative caching | Important for NXDOMAIN attacks | Mention SOA minimum TTL |
| Saying "13 root servers" | They're identifiers, not servers | 13 identifiers, 1900+ instances |

---

## Trap Questions & Answers

### Question: "Why are there only 13 root servers?"

```
┌────────────────────────────────────────────────────────────────────┐
│ GOOD ANSWER                                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ "This is actually a common misconception. There are 13 root       │
│ server identifiers (a.root-servers.net through m.root-servers.net),│
│ not 13 physical servers.                                           │
│                                                                     │
│ The reason for 13 identifiers is historical - it comes from the   │
│ 512-byte UDP packet limit. A priming response listing all root    │
│ servers needs to fit in one packet, and 13 NS records with        │
│ their IPv4 addresses was the maximum that fit.                     │
│                                                                     │
│ In reality, each identifier is served by many instances:          │
│   • Total: 1900+ instances worldwide                              │
│   • Uses Anycast: same IP advertised from multiple locations      │
│   • Operated by 12 independent organizations                      │
│                                                                     │
│ So the root server system is actually highly distributed and      │
│ resilient, not a single point of failure."                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Question: "How do you prevent DNS cache poisoning?"

```
┌────────────────────────────────────────────────────────────────────┐
│ GOOD ANSWER                                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ "Cache poisoning is when an attacker injects false records into   │
│ a resolver's cache. I'd implement multiple layers of defense:     │
│                                                                     │
│ 1. Source Port Randomization:                                      │
│    - Use random source ports (64K possibilities)                  │
│    - Combined with transaction ID (16 bits)                       │
│    - Attacker must guess both = 2^32 combinations                 │
│                                                                     │
│ 2. 0x20 Encoding:                                                  │
│    - Randomize case of query name: wWw.ExAmPlE.cOm                │
│    - Response must match exact case                               │
│    - Adds more entropy to validate responses                      │
│                                                                     │
│ 3. DNSSEC Validation:                                              │
│    - Cryptographically signed responses                           │
│    - Chain of trust from root                                     │
│    - Definitive protection against poisoning                      │
│    - Trade-off: ~10% latency increase                             │
│                                                                     │
│ 4. Response Validation:                                            │
│    - Verify query ID matches                                      │
│    - Verify question section matches                              │
│    - Reject responses from wrong servers                          │
│                                                                     │
│ DNSSEC is the only complete solution, but the other techniques    │
│ make poisoning extremely difficult even without it."               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Question: "How does DNS handle failure?"

```
┌────────────────────────────────────────────────────────────────────┐
│ GOOD ANSWER                                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ "DNS has multiple layers of fault tolerance:                       │
│                                                                     │
│ 1. Anycast Failover (Resolvers):                                  │
│    - All resolvers advertise same IP via BGP                      │
│    - Server failure: BGP reconverges in 10-30 seconds            │
│    - Traffic automatically routes to next-closest server          │
│    - No client-side changes needed                                │
│                                                                     │
│ 2. Multiple Authoritative Servers:                                │
│    - Every zone has 2+ nameservers                               │
│    - NS records specify all authoritative servers                 │
│    - Resolvers try each one on failure                           │
│                                                                     │
│ 3. TTL-Based Caching:                                              │
│    - Cached responses served even if upstream fails               │
│    - Can serve stale entries with 'serve-stale' (RFC 8767)       │
│    - TTL gives time to recover before cache expires              │
│                                                                     │
│ 4. Retry Logic:                                                    │
│    - Resolvers retry with exponential backoff                    │
│    - Try TCP if UDP fails                                         │
│    - Try different nameservers for zone                           │
│                                                                     │
│ Key insight: The hierarchical, cached nature of DNS means most   │
│ queries never reach authoritative servers, so the system is      │
│ resilient to individual server failures."                         │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Question: "How would you implement GeoDNS?"

```
┌────────────────────────────────────────────────────────────────────┐
│ GOOD ANSWER                                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ "GeoDNS returns different IPs based on client location. Here's    │
│ how I'd implement it:                                              │
│                                                                     │
│ 1. Client Location Detection:                                      │
│    - Primary: EDNS Client Subnet (ECS) option                     │
│    - Fallback: Resolver IP (less accurate)                        │
│    - GeoIP database to map IP to location                         │
│                                                                     │
│ 2. Routing Policy Engine:                                          │
│    - Define regions and their endpoints                           │
│    - Priority order: Country → Region → Continent → Default      │
│    - Health check status filters unhealthy endpoints              │
│                                                                     │
│ 3. Response Selection:                                             │
│    Query: api.example.com A                                       │
│    Client subnet: 203.0.113.0/24 (Tokyo)                          │
│    Policy: Return Tokyo datacenter IP                             │
│    Response: A 203.0.113.100                                      │
│                                                                     │
│ 4. Caching Considerations:                                         │
│    - Must scope cache by client subnet                            │
│    - ECS scope in response indicates cache granularity            │
│    - Larger scope = better cache sharing, less accuracy           │
│                                                                     │
│ Trade-off: ECS reveals client subnet to authoritative servers,   │
│ which has privacy implications. Some resolvers disable or         │
│ truncate ECS for privacy."                                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Trade-off Discussions

### TTL Duration Trade-off

| Factor | Short TTL (5 min) | Long TTL (24 hours) |
|--------|-------------------|---------------------|
| Update Speed | Fast propagation | Slow (up to 24h) |
| Cache Hit Ratio | Lower | Higher |
| Authoritative Load | Higher | Lower |
| Failover Speed | Fast (5 min max) | Slow (24h max) |
| **Best For** | Dynamic content, GSLB | Stable content |

**Interview Answer:** "I'd use short TTLs (5 min) for records that need fast updates, like GSLB endpoints. For stable records, longer TTLs (1-24h) reduce authoritative load. The key is matching TTL to how often data actually changes."

### Anycast vs GeoDNS Trade-off

| Factor | Anycast | GeoDNS |
|--------|---------|--------|
| Failover Speed | Seconds (BGP) | Minutes (DNS TTL) |
| Routing Control | Automatic (BGP) | Manual (policies) |
| Session Stickiness | Challenging | Easy |
| Implementation | Requires BGP | DNS-only |
| **Best For** | Stateless services | Session-based services |

**Interview Answer:** "Anycast is ideal for DNS resolvers because they're stateless. The automatic failover through BGP is a huge advantage. GeoDNS is better when you need fine-grained control or session stickiness."

### DNSSEC Trade-off

| Factor | With DNSSEC | Without DNSSEC |
|--------|-------------|----------------|
| Security | Authenticated responses | Vulnerable to poisoning |
| Latency | +5-10% overhead | Baseline |
| Complexity | High (key management) | Simple |
| Response Size | Larger (signatures) | Smaller |
| Adoption | ~30% of domains | ~70% of domains |

**Interview Answer:** "DNSSEC provides cryptographic authentication that definitively prevents cache poisoning. The trade-off is operational complexity around key management and some latency overhead. For critical infrastructure, the security benefit outweighs the complexity."

---

## Common Mistakes

| Mistake | Impact | Correct Approach |
|---------|--------|------------------|
| Treating DNS as simple lookup | Misses distributed nature | Explain hierarchy, caching |
| Ignoring cache | DNS is 95%+ cache hits | Emphasize caching strategy |
| Missing Anycast | Key to DNS scalability | Explain BGP Anycast deployment |
| No security discussion | DNS is attack target | Cover DNSSEC, cache poisoning |
| Confusing resolver vs authoritative | Fundamental difference | Clarify roles and responsibilities |
| Ignoring negative caching | Important for NXDOMAIN attacks | Mention SOA minimum TTL |

---

## Follow-up Questions to Expect

1. **"How do you handle a DNS DDoS attack?"**
   - Anycast distributes attack traffic globally
   - Response Rate Limiting (RRL)
   - BGP Flowspec for dynamic filtering
   - Serve stale data if upstream overwhelmed

2. **"What happens if a root server goes down?"**
   - There are 1900+ instances across 13 identifiers
   - Anycast routes to surviving instances
   - Root hints cached for 48+ hours
   - Resolvers try all 13 identifiers

3. **"How do you measure DNS health?"**
   - QPS and latency percentiles
   - Cache hit ratio (target > 95%)
   - SERVFAIL rate (target < 0.01%)
   - DNSSEC validation success rate

4. **"How do you handle zone updates?"**
   - Update zone file, increment serial
   - Primary notifies secondaries (NOTIFY)
   - Secondaries do AXFR/IXFR
   - Propagation depends on TTL

5. **"What's the difference between DoH and DoT?"**
   - DoT: TLS on port 853, can be blocked
   - DoH: HTTPS on port 443, blends with web traffic
   - Both encrypt queries for privacy
   - DoH harder to block but more overhead

---

## Quick Reference Card

```
┌────────────────────────────────────────────────────────────────────┐
│ DNS CHEAT SHEET                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Architecture:                                                       │
│   Client → Recursive Resolver → Root → TLD → Authoritative        │
│                                                                     │
│ Key Numbers:                                                        │
│   • 13 root server identifiers (1900+ instances)                  │
│   • 10M+ QPS for major resolvers                                   │
│   • 95%+ cache hit ratio target                                   │
│   • < 5ms cache hit latency (p50)                                 │
│   • 99.999% availability (5 min/year downtime)                    │
│                                                                     │
│ Record Types:                                                       │
│   A:     IPv4 address                                              │
│   AAAA:  IPv6 address                                              │
│   CNAME: Alias to another name                                     │
│   MX:    Mail server                                               │
│   NS:    Nameserver delegation                                     │
│   SOA:   Zone authority + timers                                   │
│   TXT:   Text (SPF, DKIM, verification)                           │
│                                                                     │
│ DNSSEC Records:                                                     │
│   RRSIG:  Signature over records                                   │
│   DNSKEY: Zone public keys                                         │
│   DS:     Delegation signer (hash of child KSK)                   │
│                                                                     │
│ Caching:                                                            │
│   • TTL from response (respect min/max bounds)                    │
│   • Negative caching: NXDOMAIN cached per SOA minimum            │
│   • Prefetch popular entries before expiry                        │
│                                                                     │
│ Security:                                                           │
│   Poisoning Prevention:                                            │
│   • Source port randomization (16 bits)                           │
│   • Transaction ID randomization (16 bits)                        │
│   • 0x20 case randomization                                        │
│   • DNSSEC validation                                              │
│                                                                     │
│   Encrypted DNS:                                                    │
│   • DoT: TLS on port 853                                          │
│   • DoH: HTTPS on port 443                                        │
│   • DoQ: QUIC on port 853                                         │
│                                                                     │
│ Routing:                                                            │
│   Anycast: Same IP announced via BGP everywhere                   │
│   GeoDNS: Different IP based on client location                   │
│   GSLB: Weighted, latency-based, failover routing                 │
│                                                                     │
│ Failover:                                                          │
│   Anycast: BGP reconverges (10-30 seconds)                        │
│   Zones: Multiple NS records, try each                            │
│   Serve-stale: Return expired cache on failure                    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Clarifying Questions to Ask

At the start of the interview, ask:

1. **Scope**: "Are we designing a recursive resolver, authoritative DNS, or both?"
2. **Scale**: "What query volume? 100K QPS? 10M QPS?"
3. **Features**: "Do we need GSLB features like GeoDNS, weighted routing, health-based failover?"
4. **Security**: "What security requirements? DNSSEC? DoH/DoT?"
5. **Latency**: "What latency targets? Sub-5ms for cache hits?"
6. **Availability**: "What availability target? 99.99%? 99.999%?"

These questions help scope the problem and show you understand the design space.
