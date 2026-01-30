# WhatsApp: Requirements & Estimations

## Table of Contents
- [Functional Requirements](#functional-requirements)
- [Non-Functional Requirements](#non-functional-requirements)
- [Capacity Estimations](#capacity-estimations)
- [SLOs / SLAs](#slos--slas)
- [Geographic Distribution](#geographic-distribution)
- [Growth Projections](#growth-projections)

---

## Functional Requirements

### Core Features (P0 - Must Have)

| Feature | Description |
|---------|-------------|
| **User Registration** | Phone number-based registration with SMS/call verification |
| **1:1 Messaging** | Text messages, emojis, reactions between two users |
| **Group Messaging** | Up to 1,024 members per group |
| **End-to-End Encryption** | All messages encrypted using Signal Protocol |
| **Delivery Status** | Single tick (sent), double tick (delivered), blue tick (read) |
| **Media Sharing** | Photos, videos, documents, voice messages |
| **Voice Calls** | 1:1 VoIP calls with E2EE |
| **Video Calls** | 1:1 video calls with E2EE |
| **Online/Last Seen** | Real-time presence indicator |
| **Profile Management** | Name, about, profile photo |
| **Contacts Sync** | Match phone contacts to WhatsApp users |

### Enhanced Features (P1 - Should Have)

| Feature | Description |
|---------|-------------|
| **Communities** | Groups of groups, up to 50 groups, 5,000 announcement members |
| **Group Calls** | Voice/video calls with up to 32 participants |
| **Disappearing Messages** | Auto-delete after 24 hours, 7 days, or 90 days |
| **Message Editing** | Edit sent messages within 15 minutes |
| **Message Deletion** | Delete for everyone within time window |
| **Channels** | Broadcast to unlimited subscribers (one-way) |
| **Status/Stories** | 24-hour ephemeral content |
| **Location Sharing** | Real-time and static location |
| **Contact Sharing** | Share contact cards |
| **Polls** | Create polls in groups |
| **Multi-Device** | Use on up to 4 linked devices without phone |
| **Starred Messages** | Bookmark important messages |
| **Search** | Search messages (on-device only due to E2EE) |

### Out of Scope

- Public social feed / timeline
- Friend discovery / recommendations
- In-app games
- Marketplace / commerce (separate WhatsApp Business)
- Stories discovery (not a public platform)
- Server-side message search (E2EE prevents this)

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Message Delivery (online) | < 200ms | p99 latency end-to-end |
| Message Delivery (offline → online) | < 30s | Time from reconnection |
| Connection Establishment | < 500ms | TCP + authentication |
| E2EE Session Setup (X3DH) | < 1s | First message to new contact |
| Media Upload (1MB) | < 5s | p95 latency |
| Media Download (1MB) | < 3s | p95 with CDN |
| Voice Call Setup | < 3s | Ring to connected |
| Push Notification | < 5s | Server to device |

### Availability & Reliability

| Metric | Target | Notes |
|--------|--------|-------|
| Service Availability | 99.99% | < 52.6 minutes downtime/year |
| Message Durability | 99.999% | Messages in transit |
| Delivery Guarantee | At-least-once | With deduplication on client |
| Regional Failover | < 30s | Automatic failover |

### Consistency Model

| Data Type | Consistency | Rationale |
|-----------|-------------|-----------|
| Messages | Eventual | Delivered at-least-once, client dedupes |
| Delivery Receipts | Strong | Must be accurate for tick system |
| Presence (Online) | Eventual | Near real-time, some staleness OK |
| Group Membership | Strong | Must be consistent for key distribution |
| Prekey Bundles | Strong | Critical for E2EE session setup |

### Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| Message Encryption | E2EE using Signal Protocol (AES-256-CBC + HMAC-SHA256) |
| Forward Secrecy | Double Ratchet algorithm |
| Backward Secrecy | DH ratchet step recovers from key compromise |
| Media Encryption | Separate key per media, encrypted on client |
| Voice/Video Encryption | SRTP (AES-128-ICM) |
| Key Verification | Safety numbers for MITM detection |
| Server Access | Server CANNOT access message content |

---

## Capacity Estimations

### User Metrics

| Metric | Value | Calculation |
|--------|-------|-------------|
| Monthly Active Users (MAU) | 2,000,000,000 | Given |
| Daily Active Users (DAU) | 1,200,000,000 | 60% DAU/MAU ratio |
| Concurrent Users (Peak) | 500,000,000 | ~42% of DAU at peak |
| New Registrations/Day | 1,000,000 | Given |

### Message Volume

| Metric | Value | Calculation |
|--------|-------|-------------|
| Messages per Day | 140,000,000,000 | Given |
| Messages per User per Day | 117 | 140B / 1.2B DAU |
| Messages per Second (Avg) | 1,620,370 | 140B / 86,400 |
| Messages per Second (Peak) | ~5,000,000 | 3x average |

### Read/Write Ratio

| Operation | Percentage | Notes |
|-----------|------------|-------|
| Message Send (Write) | ~50% | 1:1 send ratio |
| Message Receive (Read) | ~50% | Each send has corresponding receive |
| Read Receipts | ~30% | If enabled, read triggers update |
| Presence Updates | ~20% | Online/offline transitions |

### Connection Calculations

| Metric | Value | Calculation |
|--------|-------|-------------|
| Concurrent Connections | 500,000,000 | Peak concurrent users |
| Memory per Connection | 2 KB | Erlang process overhead |
| Total Connection Memory | 1 TB | 500M × 2KB |
| Connections per Server | 1-2 Million | ejabberd capacity |
| Connection Servers Needed | 250-500 | 500M / 1-2M per server |

### Storage Calculations

| Data Type | Size | Daily Volume | Annual Volume |
|-----------|------|--------------|---------------|
| Message Metadata | 200 bytes | 28 TB | 10.2 PB |
| Offline Queue (7-day retention) | 200 bytes/msg | ~200 TB | N/A (transient) |
| Media (photos/videos) | Variable | 5-10 PB | 1.8-3.6 EB |
| User Profiles | 5 KB | 5 TB total | 5 TB total |
| Prekey Bundles | 3 KB | 3 TB total | 3 TB total |

### Bandwidth Calculations

| Traffic Type | Size | Volume | Bandwidth |
|--------------|------|--------|-----------|
| Text Messages | 500 bytes avg | 5M/sec | 2.5 GB/s |
| Delivery ACKs | 50 bytes | 5M/sec | 250 MB/s |
| Media (upload) | 500 KB avg | 100K/sec | 50 GB/s |
| Media (download) | 500 KB avg | 500K/sec | 250 GB/s |
| Presence Updates | 100 bytes | 10M/sec | 1 GB/s |
| **Total** | | | **~300 GB/s** |

---

## SLOs / SLAs

### Service Level Objectives

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| Availability | 99.99% | Monthly |
| Message Delivery Latency (p50) | < 100ms | Rolling 5-min |
| Message Delivery Latency (p99) | < 500ms | Rolling 5-min |
| Offline Delivery (after reconnect) | < 30s | Per reconnection |
| Media Upload Success Rate | 99.9% | Daily |
| Call Setup Success Rate | 99.5% | Daily |
| Push Notification Delivery | 99% | Daily |

### Error Budgets

| Metric | Monthly Budget | Equivalent |
|--------|---------------|------------|
| Availability | 0.01% | 4.38 minutes/month |
| Failed Messages | 0.001% | 1.4M messages/day |
| Failed Media Uploads | 0.1% | ~100K/day |

### Alerting Thresholds

| Alert | Condition | Severity |
|-------|-----------|----------|
| Availability Drop | < 99.9% for 5 min | Critical |
| Latency Spike | p99 > 1s for 5 min | Critical |
| Offline Queue Growth | > 10M messages | Warning |
| Prekey Depletion | < 10 prekeys for user | Critical |
| Connection Error Rate | > 1% for 2 min | Critical |

---

## Geographic Distribution

### User Distribution by Region

| Region | % of Users | Estimated Users | Primary Data Center |
|--------|------------|-----------------|---------------------|
| India | 40% | 800M | Mumbai, Chennai |
| Brazil | 10% | 200M | Sao Paulo |
| Indonesia | 5% | 100M | Singapore |
| Mexico | 4% | 80M | Dallas |
| United States | 4% | 80M | Virginia, Oregon |
| Germany | 3% | 60M | Frankfurt |
| United Kingdom | 2% | 40M | London |
| Other | 32% | 640M | Multiple |

### Data Center Requirements

| Region | Primary DC | Secondary DC | Estimated Capacity |
|--------|------------|--------------|-------------------|
| Asia-Pacific | Singapore | Mumbai | 1B+ users |
| South America | Sao Paulo | Buenos Aires | 300M users |
| Europe | Frankfurt | London | 200M users |
| North America | Virginia | Oregon | 200M users |

### Latency Targets by Region

| Route | Target Latency | Notes |
|-------|----------------|-------|
| Intra-region | < 50ms | Same data center or nearby |
| Cross-region (same continent) | < 100ms | Between DCs |
| Cross-continent | < 300ms | International routing |

---

## Growth Projections

### User Growth (5-Year Outlook)

| Year | MAU | DAU | Daily Messages |
|------|-----|-----|----------------|
| Current | 2.0B | 1.2B | 140B |
| Year 1 | 2.2B | 1.3B | 160B |
| Year 2 | 2.4B | 1.45B | 180B |
| Year 3 | 2.6B | 1.55B | 200B |
| Year 5 | 3.0B | 1.8B | 250B |

### Infrastructure Scaling Implications

| Metric | Current | Year 5 | Growth Factor |
|--------|---------|--------|---------------|
| Connection Servers | 500 | 750 | 1.5x |
| Message Throughput | 1.6M/sec | 3M/sec | 1.8x |
| Storage (Messages) | 10 PB/year | 20 PB/year | 2x |
| Storage (Media) | 2 EB/year | 4 EB/year | 2x |
| Bandwidth | 300 GB/s | 600 GB/s | 2x |

### Feature-Driven Capacity Changes

| Feature | Capacity Impact |
|---------|-----------------|
| Communities | +20% group message fan-out |
| Channels | +50% broadcast traffic (one-to-many) |
| AI Features | +30% compute for analysis (metadata only) |
| HD Media | +100% media storage |
| Group Video Calls | +200% real-time bandwidth |

---

## Interview Capacity Estimation Cheat Sheet

```
┌────────────────────────────────────────────────────────────────┐
│  QUICK ESTIMATION REFERENCE                                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  USERS                                                         │
│  ──────                                                        │
│  MAU: 2B    DAU: 1.2B (60%)    Concurrent: 500M (peak)        │
│                                                                │
│  MESSAGES                                                      │
│  ─────────                                                     │
│  Daily: 140B    Per user/day: 117    Per second: 1.6M         │
│  Peak: 5M/sec (3x average)                                     │
│                                                                │
│  CONNECTIONS                                                   │
│  ────────────                                                  │
│  Memory/conn: 2KB    Total: 1TB    Per server: 1-2M           │
│  Servers needed: 250-500                                       │
│                                                                │
│  STORAGE                                                       │
│  ────────                                                      │
│  Message metadata: 28TB/day    Media: 5-10PB/day              │
│  Offline queue: ~200TB (7-day TTL)                            │
│                                                                │
│  BANDWIDTH                                                     │
│  ──────────                                                    │
│  Text: 2.5GB/s    Media: 300GB/s    Total: ~300GB/s           │
│                                                                │
│  LATENCY                                                       │
│  ────────                                                      │
│  Message (online): <200ms    Call setup: <3s                   │
│  Media upload: <5s           E2EE setup: <1s                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```
