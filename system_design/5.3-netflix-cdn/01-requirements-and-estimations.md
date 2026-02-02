# Requirements & Estimations

[← Back to Index](./00-index.md) | [Next: High-Level Design →](./02-high-level-design.md)

---

## Functional Requirements

### Core Capabilities

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Proactive Content Distribution** | Pre-position content on OCAs before user demand | P0 |
| **ISP-Embedded Deployment** | Deploy and manage OCAs inside ISP networks | P0 |
| **Traffic Steering** | Route users to optimal OCA based on proximity and health | P0 |
| **Fill Management** | Schedule and execute nightly content fills during off-peak | P0 |
| **BGP Integration** | Establish peering with ISPs using ASN 40027 | P0 |
| **Cache Miss Handling** | Fallback to IXP OCAs or origin when content unavailable | P0 |
| **OCA Health Monitoring** | Track appliance health, capacity, and serving ability | P0 |
| **Popularity Prediction** | Forecast content demand at file-level granularity | P1 |
| **Multi-Site Coordination** | Manage clusters of OCAs within same ISP | P1 |
| **Content Versioning** | Handle re-encoded titles and software updates | P1 |

### ISP Partnership Requirements

| Requirement | Description |
|-------------|-------------|
| **Zero Cost to ISP** | Netflix provides hardware at no charge |
| **ISP Provides Facilities** | Space, power, cooling, connectivity |
| **SFI Peering Setup** | Settlement-free interconnection for fill and backup |
| **BGP Session Management** | ISP advertises routes to OCAs |
| **Fill Window Configuration** | Mutually agreed off-peak time windows |
| **Capacity Planning** | Joint planning for OCA deployment scale |

### Out of Scope

| Not Included | Rationale |
|--------------|-----------|
| Video encoding | Handled by Netflix Encoding Pipeline (see 5.2) |
| User authentication | Handled by Netflix Auth/Playback Service |
| Content licensing | Handled by Netflix Content Catalog |
| DRM key distribution | Handled by Netflix DRM Service |
| Client player logic | Handled by device-specific players |
| Real-time content (live) | Handled by Live Origin Service |

---

## Non-Functional Requirements

### Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Edge Hit Rate | ≥ 95% | Minimize origin/IXP fallback |
| Time to First Byte | < 100ms | Playback start latency |
| OCA Serving Latency | < 50ms | Intra-ISP delivery |
| Fill Completion Rate | 99.9% | Content availability by peak hours |
| BGP Convergence | < 30 seconds | Failover speed |

### Availability & Reliability

| Metric | Target | Measurement |
|--------|--------|-------------|
| OCA Uptime | 99.9% | Per-appliance availability |
| System Availability | 99.99% | Overall content delivery |
| Fill Window Success | 99.5% | Nightly fills complete on time |
| Failover Time | < 60 seconds | Traffic redirect to backup OCA |

### Scalability Targets

| Metric | Target | Context |
|--------|--------|---------|
| OCAs Supported | 20,000+ | Global deployment |
| ISP Partnerships | 2,000+ | Growth capacity |
| Concurrent Streams | 65M+ | Peak live events (Tyson vs Paul 2024) |
| Fill Throughput | 100+ Pbps | Aggregate nightly fill capacity |

### CAP Theorem Position

**Choice: Availability + Partition Tolerance (AP)**

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Consistency** | Eventual | Content propagation via fill windows is eventually consistent |
| **Availability** | High | Users must always be able to stream |
| **Partition Tolerance** | Required | OCAs must function during network partitions |

**Consistency Model:** Eventual consistency is acceptable because:
- Content is immutable once encoded
- Fill windows have multi-hour tolerance
- Cache misses fall back to IXP/origin
- No user state stored on OCAs

---

## Capacity Estimations

### Content Library

| Metric | Value | Calculation |
|--------|-------|-------------|
| Total Titles | ~17,000 | Movies + TV series |
| Episodes (estimated) | ~50,000 | ~3 episodes avg per series |
| Encoding Profiles per Title | 100-200 | Bitrates × resolutions × codecs × devices |
| Average File Size | 2-5 GB | Per encoding profile |
| Total Unique Files | 5-10 million | 50K titles × 100-200 profiles |
| Total Catalog Size | ~20-50 PB | Unique content storage |

### OCA Storage Requirements

| OCA Type | Storage | Catalog Coverage | Use Case |
|----------|---------|------------------|----------|
| Edge (120TB) | 120 TB | Popular 5-10% | Small ISPs |
| Storage (360TB) | 360 TB | Full catalog | IXPs, large ISPs |
| Flash (NVMe) | 36-72 TB | Hot content | High-throughput serving |

### Network Capacity

| Metric | Per OCA | 19,000 OCAs |
|--------|---------|-------------|
| Edge OCA (18Gbps) | 18 Gbps | 342 Tbps |
| Storage OCA (96Gbps) | 96 Gbps | 1.8 Pbps (theoretical) |
| Flash OCA (400Gbps) | 400 Gbps | 7.6 Pbps (theoretical) |

### Fill Traffic

| Metric | Value | Calculation |
|--------|-------|-------------|
| Daily Content Updates | 1-5% of catalog | New releases, re-encodes |
| Fill Data per OCA | 1-5 TB/night | 1-5% × 100TB average |
| Fill Window Duration | 6-8 hours | Off-peak period |
| Fill Throughput per OCA | ~200 Mbps avg | 5TB / 7 hours |
| Aggregate Fill Traffic | ~4 Pbps | 19K OCAs × 200Mbps |

### QPS Estimations

| Component | QPS | Notes |
|-----------|-----|-------|
| Steering Service | 100K+ | Playback requests globally |
| Fill Manifest Requests | 20K | OCAs polling for updates |
| OCA Health Reports | 300K | OCAs reporting status (every 60s) |
| BGP Updates | Low | Topology changes only |

---

## Back-of-Envelope Calculations

### Storage Estimation

```
Given:
- 238M Netflix memberships
- ~17,000 titles
- 100-200 encoding profiles per title
- Average 3 GB per file

Total Catalog Size:
= 17,000 titles × 150 profiles × 3 GB
= 7.65 PB (unique content)

With redundancy across tiers:
= 7.65 PB × 3 (avg copies across OCAs)
= ~23 PB distributed storage

Edge OCA Coverage:
- 120 TB storage
- Popular content = 5-10% of catalog
- Coverage = 120TB / 7.65PB = 1.5% (hot content serves 95%+ requests)
```

### Bandwidth Estimation

```
Given:
- 238M memberships
- 30% concurrent at peak (evening)
- Average bitrate: 5 Mbps

Peak Concurrent Viewers:
= 238M × 0.30 × 0.5 (not all watch at same time)
= ~35M concurrent streams

Peak Bandwidth:
= 35M × 5 Mbps
= 175 Tbps peak

Per OCA (19,000 OCAs):
= 175 Tbps / 19,000
= ~9 Gbps average per OCA at peak

(Matches 18Gbps OCA capacity with headroom)
```

### Fill Traffic Estimation

```
Given:
- 1-5% catalog changes daily
- 120TB per Edge OCA
- 6-hour fill window

Daily Fill per OCA:
= 120TB × 3% (average churn)
= 3.6 TB per night

Required Fill Throughput:
= 3.6 TB / 6 hours
= 600 GB/hour
= ~1.3 Gbps sustained

(Well within 10GbE fill interfaces)
```

---

## SLO/SLA Definitions

### Content Availability SLOs

| SLO | Target | Measurement |
|-----|--------|-------------|
| Edge Cache Hit Rate | ≥ 95% | Requests served from embedded OCA |
| Content Freshness | < 24 hours | Time from release to OCA availability |
| Fill Completion | 99.5% | Nightly fills complete successfully |
| Title Availability | 99.99% | Any title streamable from some OCA |

### Performance SLOs

| SLO | Target | Measurement |
|-----|--------|-------------|
| Time to First Byte (p50) | < 50ms | From request to first byte |
| Time to First Byte (p99) | < 200ms | Including fallback scenarios |
| Rebuffer Rate | < 0.1% | Playback interruptions |
| Start Time | < 2 seconds | Button press to video playing |

### ISP Partnership SLAs

| SLA | Netflix Commitment | ISP Commitment |
|-----|-------------------|----------------|
| Hardware Delivery | < 30 days | Facilities ready |
| Hardware Replacement | 48-hour shipping | RMA process |
| Fill Connectivity | SFI peering maintained | Route advertisements |
| Support Response | 24/7 NOC monitoring | Facility access for repairs |
| Capacity Planning | Quarterly reviews | Traffic forecasts |

---

## ISP Qualification Criteria

### Minimum Requirements for Embedded OCAs

| Requirement | Specification |
|-------------|---------------|
| Netflix Traffic | Significant Netflix viewership on ASN |
| Facility Space | 2U-4U rack space per OCA |
| Power | 300-700W per OCA (AC or DC) |
| Cooling | Standard data center cooling |
| Network Connectivity | 10GbE minimum (100GbE preferred) |
| BGP Capability | Establish peering with ASN 40027 |
| SFI Peering | Settlement-free interconnection at IXP |

### Deployment Tiers

| Tier | Traffic Volume | OCA Deployment | Fill Source |
|------|----------------|----------------|-------------|
| **Large ISP** | >100 Gbps Netflix | 10+ Storage + 30+ Flash | Direct from AWS |
| **Medium ISP** | 10-100 Gbps | 5-10 Edge OCAs | IXP Storage |
| **Small ISP** | 1-10 Gbps | 1-3 Edge OCAs | IXP Storage |
| **Peering Only** | < 1 Gbps | None | SFI at local IXP |

---

## Cost-Benefit Analysis

### Netflix Investment

| Cost Category | Estimated | Notes |
|---------------|-----------|-------|
| Hardware (19K OCAs) | $500M+ | Custom servers at scale |
| Operations | $100M/year | NOC, logistics, replacements |
| Peering/IXP Colocation | $50M/year | Facility fees at IXPs |
| Engineering | $50M/year | Software development, optimization |
| **Total Since 2012** | **$1B+** | Netflix disclosed figure |

### ISP Benefits

| Benefit | Estimated Savings | Mechanism |
|---------|-------------------|-----------|
| Transit Cost Reduction | $1.25B (2021 global) | No transit fees for Netflix traffic |
| Backbone Bandwidth | 30-50% reduction | Local delivery |
| Customer Satisfaction | Reduced churn | Better streaming quality |
| Competitive Advantage | Differentiation | "Netflix optimized" marketing |

### Netflix Benefits

| Benefit | Value | Mechanism |
|---------|-------|-----------|
| Transit Cost Avoidance | $500M+/year | No third-party CDN fees |
| Quality Control | Full stack ownership | End-to-end optimization |
| Latency Reduction | 25-40% | ISP proximity |
| Proactive Caching | Impossible with CDNs | Subscription predictability |
| ISP Relationships | Strategic value | Partnership vs vendor |

---

*Next: [High-Level Design →](./02-high-level-design.md)*
