# Requirements and Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Domain Resolution** | Translate domain names to IP addresses (A, AAAA records) | P0 |
| **Recursive Resolution** | Full resolution for client queries | P0 |
| **Authoritative Serving** | Serve responses for owned zones | P0 |
| **Caching** | Cache responses according to TTL | P0 |
| **Zone Transfers** | AXFR (full) and IXFR (incremental) transfers | P1 |
| **GeoDNS Routing** | Return different IPs based on client location | P1 |
| **Health-Based Failover** | Automatic failover on backend failure | P1 |
| **Weighted Load Balancing** | Distribute traffic by weight | P1 |
| **Latency-Based Routing** | Route to lowest-latency endpoint | P2 |
| **DNSSEC Validation** | Cryptographic authentication of responses | P2 |
| **DoH/DoT Support** | DNS over HTTPS and TLS | P2 |

### DNS Record Types Supported

```
┌────────────────────────────────────────────────────────────────────┐
│ DNS RECORD TYPES                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Address Records (Core):                                            │
│ • A      - IPv4 address mapping                                    │
│ • AAAA   - IPv6 address mapping                                    │
│                                                                     │
│ Naming Records:                                                     │
│ • CNAME  - Canonical name (alias)                                  │
│ • NS     - Nameserver delegation                                   │
│ • PTR    - Reverse lookup (IP to name)                             │
│                                                                     │
│ Service Records:                                                    │
│ • MX     - Mail exchange                                           │
│ • SRV    - Service location (port, weight, priority)               │
│ • TXT    - Text records (SPF, DKIM, verification)                  │
│                                                                     │
│ Zone Management:                                                    │
│ • SOA    - Start of authority                                      │
│ • AXFR   - Full zone transfer                                      │
│ • IXFR   - Incremental zone transfer                               │
│                                                                     │
│ Security (DNSSEC):                                                  │
│ • RRSIG  - Resource record signature                               │
│ • DNSKEY - Public signing key                                      │
│ • DS     - Delegation signer                                       │
│ • NSEC/NSEC3 - Authenticated denial of existence                   │
│                                                                     │
│ Modern Extensions:                                                  │
│ • CAA    - Certificate Authority Authorization                     │
│ • HTTPS  - HTTPS service binding                                   │
│ • SVCB   - Service binding                                         │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### API Operations

| Operation | Type | Description |
|-----------|------|-------------|
| DNS Query | UDP/TCP | Standard DNS resolution |
| Zone Create | API | Create new DNS zone |
| Record CRUD | API | Create/Read/Update/Delete records |
| Zone Transfer | TCP | AXFR/IXFR for secondary servers |
| Health Check Status | API | Get endpoint health status |
| Routing Policy | API | Configure GeoDNS/weighted/latency rules |
| Analytics | API | Query statistics and logs |

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Cache Hit Latency (p50)** | < 5ms | User experience, page load |
| **Cache Hit Latency (p99)** | < 20ms | Consistent performance |
| **Cache Miss Latency (p50)** | < 50ms | Acceptable for full resolution |
| **Cache Miss Latency (p99)** | < 200ms | Covers edge cases |
| **Cache Hit Ratio** | > 95% | Minimize upstream queries |
| **Availability** | 99.999% | < 5 min downtime/year |

### Scalability Targets

| Metric | Scale | Notes |
|--------|-------|-------|
| **Global QPS** | 10M+ | Aggregate across all resolvers |
| **Per-Resolver QPS** | 100K+ | Single resolver capacity |
| **Zones Supported** | 10M+ | Multi-tenant platform |
| **Records per Zone** | 1M+ | Large zone support |
| **Anycast Locations** | 50+ | Global coverage |
| **Concurrent Connections** | 1M+ | DoH/DoT connections |

### Reliability Requirements

| Requirement | Target | Mechanism |
|-------------|--------|-----------|
| **No Single Point of Failure** | Required | Anycast, multi-region |
| **Server Failure Tolerance** | Auto-failover | BGP reconvergence |
| **Zone Availability** | 99.999% | Multiple authoritative servers |
| **Data Durability** | 99.9999% | Replicated zone storage |
| **DDoS Absorption** | 10+ Tbps | Anycast distribution |

---

## Capacity Estimation

### Reference System: Global DNS Provider

**Assumptions:**
- 1 trillion queries per day globally
- 95% cache hit ratio at resolvers
- Average query size: 50 bytes
- Average response size: 200 bytes
- 50 Anycast locations globally

### Traffic Calculations

```
┌────────────────────────────────────────────────────────────────────┐
│ TRAFFIC ESTIMATION                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Daily Query Volume:                                                 │
│   1 trillion queries/day                                           │
│   = 1,000,000,000,000 / 86,400 seconds                             │
│   = ~11.6 million QPS (average)                                    │
│   = ~35 million QPS (peak at 3x)                                   │
│                                                                     │
│ Per-Location Distribution (50 locations):                          │
│   35M QPS / 50 locations                                           │
│   = 700,000 QPS per location (peak)                                │
│   Note: Distribution is uneven; major cities handle 2-3x average   │
│                                                                     │
│ Bandwidth:                                                          │
│   Query: 50 bytes × 35M QPS = 1.75 GB/s = 14 Gbps                 │
│   Response: 200 bytes × 35M QPS = 7 GB/s = 56 Gbps                │
│   Total: ~70 Gbps (peak)                                           │
│                                                                     │
│ Per-Location Bandwidth:                                             │
│   70 Gbps / 50 = 1.4 Gbps average                                  │
│   Top locations: ~5 Gbps                                           │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Cache Storage Estimation

```
┌────────────────────────────────────────────────────────────────────┐
│ CACHE STORAGE ESTIMATION                                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Unique Domain Names:                                                │
│   Active domains: ~340 million                                     │
│   Popular domains (20/80): ~70 million                             │
│                                                                     │
│ Cache Entry Size:                                                   │
│   Domain name: ~30 bytes (average)                                 │
│   Record data: ~50 bytes (average)                                 │
│   Metadata (TTL, timestamp): ~20 bytes                             │
│   Total per entry: ~100 bytes                                      │
│                                                                     │
│ Working Set:                                                        │
│   Top 1 million domains = 95% of traffic                          │
│   1M × 100 bytes = 100 MB                                          │
│                                                                     │
│ Full Cache:                                                         │
│   70M domains × 100 bytes = 7 GB                                   │
│   With overhead (hash tables, etc.): ~15 GB                        │
│                                                                     │
│ Per-Resolver Cache:                                                 │
│   Working set: 100 MB - 1 GB (fits in RAM)                        │
│   Full regional cache: 10-20 GB                                    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Upstream Query Estimation

```
┌────────────────────────────────────────────────────────────────────┐
│ UPSTREAM QUERY CALCULATION                                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Total Queries: 35M QPS (peak)                                      │
│                                                                     │
│ Cache Hit Ratio: 95%                                               │
│   Cache hits: 35M × 0.95 = 33.25M QPS (served from cache)         │
│   Cache misses: 35M × 0.05 = 1.75M QPS (need resolution)          │
│                                                                     │
│ Resolution Steps (cache miss):                                      │
│   Average resolution: 2-3 upstream queries                         │
│   Root queries: ~5% of misses (NS cached)                          │
│   TLD queries: ~20% of misses                                      │
│   Auth queries: 100% of misses                                     │
│                                                                     │
│ Upstream Query Volume:                                              │
│   Root: 1.75M × 0.05 = 87,500 QPS                                  │
│   TLD: 1.75M × 0.20 = 350,000 QPS                                  │
│   Authoritative: 1.75M QPS                                         │
│   Total upstream: ~2.2M QPS                                        │
│                                                                     │
│ Root Server Load (13 identifiers, 1900+ instances):                │
│   87,500 QPS / 1900 instances = 46 QPS per instance               │
│   Well within capacity                                              │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Service Level Objectives (SLOs)

### Latency SLOs

| Scenario | p50 | p95 | p99 | p99.9 |
|----------|-----|-----|-----|-------|
| Cache Hit (local) | 1ms | 3ms | 10ms | 20ms |
| Cache Hit (regional) | 5ms | 15ms | 30ms | 50ms |
| Cache Miss (full resolution) | 30ms | 80ms | 150ms | 300ms |
| DNSSEC Validation | +5ms | +10ms | +20ms | +40ms |
| DoH/DoT Overhead | +2ms | +5ms | +10ms | +20ms |

### Availability SLOs

| Component | SLO | Allowed Downtime/Year |
|-----------|-----|----------------------|
| Resolver Service | 99.999% | 5.26 minutes |
| Authoritative DNS | 99.99% | 52.6 minutes |
| Management API | 99.9% | 8.76 hours |
| Analytics | 99.5% | 1.83 days |

### Performance SLOs

| Metric | Target |
|--------|--------|
| Cache Hit Ratio | > 95% |
| SERVFAIL Rate | < 0.01% |
| Query Timeout Rate | < 0.001% |
| Zone Propagation (update) | < 60 seconds |
| Health Check Response | < 10 seconds |

---

## Cost Estimation

### Infrastructure Costs (Monthly)

```
┌────────────────────────────────────────────────────────────────────┐
│ DNS INFRASTRUCTURE COST BREAKDOWN                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Resolver Infrastructure (50 locations):                            │
│   Servers: 50 locations × 10 servers × $500/mo                    │
│   = $250,000/month                                                 │
│                                                                     │
│ Authoritative Infrastructure:                                       │
│   Primary + Secondary servers: $50,000/month                       │
│   Zone storage: $10,000/month                                      │
│                                                                     │
│ Network Costs:                                                      │
│   Anycast peering and transit                                      │
│   = $100,000/month                                                 │
│                                                                     │
│ DDoS Mitigation:                                                    │
│   Always-on protection                                             │
│   = $50,000/month                                                  │
│                                                                     │
│ Total Infrastructure: ~$460,000/month                              │
│                                                                     │
│ Cost per billion queries:                                          │
│   ~$460K / 30B queries/month = $0.015 per million queries          │
│                                                                     │
│ Comparison:                                                         │
│   AWS Route 53: $0.40/million queries (first billion)             │
│   Cloudflare: Free (with enterprise features paid)                │
│   Google Cloud DNS: $0.40/million queries                          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Cost per Query

```
Total monthly cost: ~$500K
Monthly queries: 30 billion
Cost per million queries: $0.017

At scale (trillion queries/month):
Cost per million queries: < $0.01
```

---

## Constraints and Assumptions

### Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **UDP 512-byte limit** | Large responses truncated | EDNS0 (4096 bytes), TCP fallback |
| **DNS Amplification** | DDoS vector | Response Rate Limiting (RRL) |
| **TTL Minimum** | Can't force instant updates | Low TTLs for critical records |
| **BGP Convergence** | 10-90 second failover | Health monitoring, graceful drain |
| **DNSSEC Complexity** | Key rotation challenges | Automated key management |

### Protocol Constraints

| Constraint | Description |
|------------|-------------|
| **UDP Default** | Most queries use UDP (connectionless) |
| **53/UDP,TCP** | Standard ports (firewall considerations) |
| **443/TCP (DoH)** | HTTPS port for DNS over HTTPS |
| **853/TCP (DoT)** | Dedicated port for DNS over TLS |
| **Recursion Depth** | Maximum delegation chain (typically 10) |

### Assumptions

1. **Traffic Pattern**: Read-heavy (99.99:1 ratio)
2. **Cache Effectiveness**: 95%+ hit ratio achievable
3. **Geographic Distribution**: Global user base
4. **TTL Compliance**: Clients respect TTL values
5. **Protocol Support**: UDP/TCP/DoH/DoT all required
6. **DNSSEC Adoption**: Growing but not universal

---

## Comparison with Alternatives

### DNS Provider Comparison

| Provider | Best For | Global PoPs | GSLB Features |
|----------|----------|-------------|---------------|
| **AWS Route 53** | AWS integration | 400+ | Full GSLB |
| **Cloudflare** | Performance, security | 400+ | Load balancing |
| **Google Cloud DNS** | GCP integration | 200+ | Basic routing |
| **Akamai Edge DNS** | Enterprise | 4000+ | Advanced GSLB |
| **NS1** | Traffic management | 25+ | Full GSLB |

### Build vs Buy Analysis

| Factor | Build (Self-Hosted) | Buy (Managed DNS) |
|--------|---------------------|-------------------|
| **Upfront Cost** | High ($2M+ infrastructure) | Low (pay-per-query) |
| **Operational Expertise** | Need DNS/BGP team | Provider manages |
| **Customization** | Full control | Limited to features |
| **Time to Market** | 6-12 months | Days |
| **Scale Ceiling** | Need to build capacity | Instant scaling |
| **When to Choose** | Cloudflare-scale, custom needs | Most companies |

---

## Summary

| Category | Key Metric |
|----------|------------|
| **Scale** | 35M QPS peak, 70 Gbps |
| **Latency** | < 5ms cache hit (p50) |
| **Availability** | 99.999% |
| **Cache Hit Ratio** | > 95% |
| **Resolution Latency** | < 50ms (p50) |
| **Global Coverage** | 50+ Anycast locations |
