# Requirements and Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Content Caching** | Cache static assets at edge locations | P0 |
| **Cache Invalidation** | Purge cached content on-demand | P0 |
| **TLS Termination** | Handle HTTPS at edge | P0 |
| **Origin Shielding** | Protect origin from direct edge requests | P0 |
| **Video Streaming** | Support HLS/DASH adaptive streaming | P1 |
| **Custom Cache Rules** | Configure caching per path/header | P1 |
| **Geo-Blocking** | Restrict content by geography | P1 |
| **Real-Time Logs** | Stream access logs to customer systems | P2 |
| **Edge Compute** | Run custom logic at edge | P2 |

### Content Types Supported

```
┌────────────────────────────────────────────────────────────────────┐
│ CONTENT TYPES                                                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Static Assets (Highly Cacheable):                                  │
│ • Images: JPG, PNG, WebP, SVG, GIF                                │
│ • Scripts: JS, CSS, WASM                                          │
│ • Documents: HTML, PDF                                             │
│ • Fonts: WOFF2, TTF                                                │
│                                                                     │
│ Video/Audio (Segment-based Caching):                               │
│ • HLS: .m3u8 playlists, .ts segments                              │
│ • DASH: .mpd manifests, .m4s segments                             │
│ • Progressive: .mp4, .webm                                         │
│                                                                     │
│ Dynamic Content (Selective Caching):                               │
│ • API responses (with cache headers)                               │
│ • Personalization layers (edge compute)                            │
│ • Search results (short TTL)                                       │
│                                                                     │
│ Not Cached (Pass-through):                                         │
│ • POST/PUT/DELETE requests                                         │
│ • WebSocket connections                                            │
│ • Content with no-cache headers                                    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### API Operations

| Operation | Method | Description |
|-----------|--------|-------------|
| Content Fetch | GET | Retrieve cached or origin content |
| Cache Purge | POST /purge | Invalidate cached content |
| Purge by Tag | POST /purge/tags | Purge content by surrogate key |
| Purge All | POST /purge/all | Clear entire cache for domain |
| Cache Status | GET /cache-status | Check if URL is cached |
| Analytics | GET /analytics | Retrieve traffic metrics |

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Cache Hit TTFB** | < 20ms p50, < 50ms p99 | User experience, Core Web Vitals |
| **Cache Miss TTFB** | < 200ms p50, < 500ms p99 | Origin latency + edge overhead |
| **Cache Hit Ratio** | > 95% for static, > 80% for API | Origin offload efficiency |
| **Origin Offload** | > 90% of requests | Reduce origin load |
| **Purge Latency** | < 200ms global propagation | Content freshness |
| **Availability** | 99.99% (52 min downtime/year) | Business continuity |

### Scalability Targets

| Metric | Scale | Notes |
|--------|-------|-------|
| **Global PoPs** | 200+ locations | Minimize user latency |
| **Aggregate Bandwidth** | 400+ Tbps | Handle DDoS + peak traffic |
| **Requests per Second** | 50M+ RPS | Aggregate across all PoPs |
| **Concurrent Connections** | 100M+ | Persistent connections |
| **Domains Supported** | 10M+ | Multi-tenant platform |
| **Purge Rate** | 100K+ URLs/sec | Bulk invalidation |

### Reliability Requirements

| Requirement | Target | Mechanism |
|-------------|--------|-----------|
| **No Single Point of Failure** | Required | Anycast, multi-origin |
| **PoP Failure Tolerance** | Auto-failover | BGP reconvergence |
| **Origin Failure Tolerance** | Serve stale | stale-if-error |
| **Data Center Failure** | Regional failover | Multi-PoP redundancy |
| **DDoS Absorption** | 10+ Tbps | Distributed capacity |

---

## Capacity Estimation

### Reference System: Large Video Platform

**Assumptions:**
- 100M daily active users
- 10 billion requests per day
- Average response size: 500 KB (weighted by video segments)
- Peak traffic: 3x average
- 200 PoPs globally

### Traffic Calculations

```
┌────────────────────────────────────────────────────────────────────┐
│ TRAFFIC ESTIMATION                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Daily Requests:                                                     │
│   10 billion requests/day                                          │
│   = 10B / 86,400 seconds                                           │
│   = ~116,000 requests/second (average)                             │
│   = ~350,000 requests/second (peak at 3x)                          │
│                                                                     │
│ Bandwidth:                                                          │
│   Average response: 500 KB                                          │
│   Average RPS: 116,000                                              │
│   = 116,000 × 500 KB × 8 bits                                      │
│   = 464 Gbps (average)                                              │
│   = ~1.4 Tbps (peak)                                                │
│                                                                     │
│ Per-PoP Distribution (assuming even distribution):                  │
│   200 PoPs                                                          │
│   = 350,000 / 200 = 1,750 RPS/PoP (peak)                           │
│   = 1.4 Tbps / 200 = 7 Gbps/PoP (peak)                             │
│                                                                     │
│ Note: Real distribution is uneven (major cities handle more)       │
│   Top 10 PoPs might handle 30% of traffic = 70 Gbps/PoP            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Storage Calculations

```
┌────────────────────────────────────────────────────────────────────┐
│ CACHE STORAGE ESTIMATION                                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Unique Content Volume:                                              │
│   Video library: 100,000 titles                                    │
│   Average video: 5 GB (multiple bitrates)                          │
│   = 500 TB unique content                                          │
│                                                                     │
│ Working Set (frequently accessed):                                  │
│   80/20 rule: 20% content = 80% requests                           │
│   Hot content: 20,000 titles × 5 GB = 100 TB                       │
│                                                                     │
│ Per-PoP Cache Size:                                                 │
│   Goal: Cache entire working set                                   │
│   = 100 TB per major PoP                                           │
│   = 20-50 TB per smaller PoP                                       │
│                                                                     │
│ Total Edge Storage:                                                 │
│   200 PoPs × 50 TB average                                         │
│   = 10 PB total edge storage                                       │
│                                                                     │
│ Origin Shield Storage:                                              │
│   5 regional shields × 200 TB each                                 │
│   = 1 PB total shield storage                                      │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Origin Load Estimation

```
┌────────────────────────────────────────────────────────────────────┐
│ ORIGIN OFFLOAD CALCULATION                                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Without CDN:                                                        │
│   All 350,000 RPS (peak) hit origin                                │
│   1.4 Tbps bandwidth at origin                                     │
│                                                                     │
│ With CDN (95% cache hit ratio):                                    │
│   Cache hits: 350,000 × 0.95 = 332,500 RPS at edge                │
│   Cache misses: 350,000 × 0.05 = 17,500 RPS                        │
│                                                                     │
│ With Origin Shield (90% collapse ratio):                           │
│   Shield absorbs: 17,500 × 0.90 = 15,750 RPS                      │
│   Origin requests: 17,500 × 0.10 = 1,750 RPS                       │
│                                                                     │
│ Origin Bandwidth:                                                   │
│   1,750 RPS × 500 KB × 8 = 7 Gbps                                  │
│   Reduction: 1.4 Tbps → 7 Gbps = 99.5% offload                    │
│                                                                     │
│ Origin Infrastructure:                                              │
│   1,750 RPS is manageable with 10-20 origin servers               │
│   vs. 1000+ servers needed without CDN                             │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Service Level Objectives (SLOs)

### Latency SLOs

| Scenario | p50 | p95 | p99 | p99.9 |
|----------|-----|-----|-----|-------|
| Cache Hit (same region) | 5ms | 15ms | 30ms | 50ms |
| Cache Hit (cross region) | 30ms | 60ms | 100ms | 150ms |
| Cache Miss (shield hit) | 50ms | 100ms | 200ms | 300ms |
| Cache Miss (origin) | 100ms | 250ms | 500ms | 1000ms |
| Purge Propagation | 50ms | 100ms | 150ms | 200ms |

### Availability SLOs

| Component | SLO | Allowed Downtime/Year |
|-----------|-----|----------------------|
| Edge Network | 99.99% | 52 minutes |
| Origin Shield | 99.95% | 4.4 hours |
| Purge API | 99.9% | 8.7 hours |
| Analytics | 99.5% | 1.8 days |

### Performance SLOs

| Metric | Target |
|--------|--------|
| Cache Hit Ratio (static) | > 95% |
| Cache Hit Ratio (API) | > 80% |
| Origin Offload | > 90% |
| Byte Hit Ratio | > 85% |
| Error Rate | < 0.01% |

---

## Cost Estimation

### Infrastructure Costs (Monthly)

```
┌────────────────────────────────────────────────────────────────────┐
│ CDN INFRASTRUCTURE COST BREAKDOWN                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Edge Servers (200 PoPs):                                           │
│   Hardware: 200 PoPs × 50 servers × $500/mo                       │
│   = $5,000,000/month                                               │
│                                                                     │
│ Storage (SSD at edge):                                             │
│   10 PB total × $0.02/GB/mo                                        │
│   = $200,000/month                                                 │
│                                                                     │
│ Bandwidth (transit):                                                │
│   1 Tbps average × $0.50/Mbps/mo                                   │
│   = $500,000/month                                                 │
│   (Lower due to peering agreements)                                │
│                                                                     │
│ Network Infrastructure:                                             │
│   Routers, switches, DDoS mitigation                               │
│   = $1,000,000/month                                               │
│                                                                     │
│ Total Infrastructure: ~$6.7M/month                                 │
│                                                                     │
│ Comparison without CDN:                                             │
│   Origin: 1.4 Tbps bandwidth × $0.02/GB egress                    │
│   = 1.4 Tbps × 3600 × 24 × 30 / 8 × 1024 GB × $0.02               │
│   = ~$9M/month in bandwidth alone                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Cost per Request

```
Total monthly cost: ~$7M
Monthly requests: 300 billion
Cost per million requests: $0.023

Comparison:
- AWS CloudFront: ~$0.085/million (US)
- Cloudflare Enterprise: ~$0.015/million
- Self-hosted CDN: ~$0.023/million
```

---

## Constraints and Assumptions

### Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **BGP Propagation** | Anycast failover takes 10-90 seconds | Health checks, pre-emptive rerouting |
| **DNS TTL** | GeoDNS changes take minutes | Low TTLs (30-60s) for critical domains |
| **TLS Handshake** | 1-2 RTT overhead | TLS session resumption, 0-RTT |
| **Cache Consistency** | Eventual (purge propagation) | Accept brief staleness |
| **Edge Storage** | Limited per-PoP capacity | Eviction policies, tiered caching |

### Business Constraints

| Constraint | Description |
|------------|-------------|
| **Peering Costs** | ISP relationships affect routing costs |
| **PoP Locations** | Colocation availability and pricing |
| **Compliance** | Data sovereignty (GDPR, etc.) |
| **Contracts** | Long-term peering agreements |

### Assumptions

1. **Traffic Pattern**: Read-heavy (99:1 ratio)
2. **Content Freshness**: Eventual consistency acceptable (< 5s stale)
3. **Geographic Distribution**: Users globally distributed
4. **Origin Capacity**: Origin can handle ~1% of peak edge traffic
5. **Cache TTL**: Default 24h for static, 5m for API

---

## Comparison with Alternatives

### Build vs Buy Analysis

| Factor | Build (Self-Hosted) | Buy (Managed CDN) |
|--------|---------------------|-------------------|
| **Upfront Cost** | High ($10M+ infrastructure) | Low (pay-as-you-go) |
| **Operational Expertise** | Need CDN team | Provider manages |
| **Customization** | Full control | Limited to provider features |
| **Time to Market** | 12-18 months | Days |
| **Scale** | Need to build capacity | Instant scaling |
| **When to Choose** | Netflix-scale, unique needs | Most companies |

### CDN Provider Comparison

| Provider | Best For | Global PoPs | Purge Speed |
|----------|----------|-------------|-------------|
| **Cloudflare** | Small-medium, security | 400+ | ~150ms |
| **Fastly** | Real-time purge needs | 90+ | ~150ms |
| **Akamai** | Enterprise, video | 4000+ | 5-7 seconds |
| **AWS CloudFront** | AWS integration | 600+ | 1-2 minutes |
| **Google Cloud CDN** | GCP integration | 200+ | Seconds |

---

## Summary

| Category | Key Metric |
|----------|------------|
| **Scale** | 350K RPS peak, 1.4 Tbps |
| **Latency** | < 20ms cache hit TTFB |
| **Availability** | 99.99% |
| **Cache Hit Ratio** | > 95% static |
| **Origin Offload** | > 99% with shield |
| **Purge Latency** | < 200ms global |
