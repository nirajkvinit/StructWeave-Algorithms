# Telegram: Requirements & Estimations

## Functional Requirements

### Core Features (In Scope)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Cloud Messaging** | 1:1 and group messaging with server storage | P0 |
| **Multi-Device Sync** | Seamless sync across unlimited devices | P0 |
| **Supergroups** | Groups up to 200,000 members | P0 |
| **Channels** | One-way broadcast to unlimited subscribers | P0 |
| **File Sharing** | Share files up to 2-4GB | P0 |
| **Secret Chats** | End-to-end encrypted 1:1 chats | P0 |
| **Message History** | Cloud-stored, searchable history | P0 |
| **Media Delivery** | Photos, videos, voice messages | P1 |
| **Bots Platform** | Programmable bots with HTTP API | P1 |
| **Voice/Video Calls** | Encrypted real-time communication | P1 |
| **Stickers & GIFs** | Rich media expressions | P2 |
| **Mini Apps** | Embedded web applications | P2 |

### Out of Scope

- Stories/Status (separate feature set)
- Payment processing details (Telegram Stars)
- Advertising platform internals
- Content recommendation algorithms
- Spam detection ML models

---

## Non-Functional Requirements

### CAP Theorem Choice

**Choice: AP (Availability + Partition Tolerance)**

| Aspect | Rationale |
|--------|-----------|
| **Availability** | Messaging must work even during network issues |
| **Partition Tolerance** | Multi-DC deployment requires partition handling |
| **Eventual Consistency** | Messages eventually sync; ordering preserved per chat |

**Consistency Guarantees:**
- **Per-Chat Ordering**: Sequence numbers ensure message order within a chat
- **Multi-DC Sync**: Append-only logs replicate across data centers
- **Device Sync**: Latest state propagated to all user devices

### Consistency Model

| Operation | Consistency | Mechanism |
|-----------|-------------|-----------|
| Message ordering (per chat) | Strong | Sequence numbers |
| Message delivery | Eventual | Async replication |
| Group membership | Eventual | Membership vector clocks |
| Read receipts | Eventual | Async aggregation |
| Secret chat keys | Strong | DH verification |

### Availability Target

| Tier | Target | Justification |
|------|--------|---------------|
| Core Messaging | 99.99% | ~52 min downtime/year |
| File Upload/Download | 99.9% | 8.7 hours downtime/year |
| Bots API | 99.9% | Third-party integration tolerance |
| Secret Chats | 99.95% | Key exchange complexity |

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Message send (online recipient) | 100ms | 200ms | 500ms |
| Message send (offline recipient) | 150ms | 300ms | 1s |
| Group message (1K members) | 200ms | 500ms | 1s |
| Channel broadcast (1M subscribers) | 500ms | 2s | 5s |
| File upload (100MB) | 10s | 20s | 30s |
| File download (100MB, cached) | 5s | 10s | 15s |
| Secret chat key exchange | 500ms | 1s | 2s |
| Search (chat history) | 200ms | 500ms | 1s |

### Durability Guarantees

| Data Type | Durability | Mechanism |
|-----------|------------|-----------|
| Cloud messages | 99.999999% (8 nines) | Multi-DC replication, append-only logs |
| Files | 99.99999% (7 nines) | Distributed file system, checksums |
| User data | 99.99999% | PostgreSQL replication |
| Secret chat messages | Device-dependent | Client-side only |

---

## Capacity Estimations

### User & Traffic Estimates

| Metric | Value | Calculation |
|--------|-------|-------------|
| **MAU** | 1,000,000,000 | Given |
| **DAU** | 500,000,000 | 50% of MAU |
| **DAU/MAU Ratio** | 50% | High engagement platform |
| **Premium Users** | 15,000,000 | ~1.5% conversion |
| **New Users/Day** | 2,500,000 | Rapid growth |

### Message Traffic

| Metric | Value | Calculation |
|--------|-------|-------------|
| **Messages/Day** | 15,000,000,000 | Research data |
| **Messages/User/Day** | 30 | 15B / 500M DAU |
| **Messages/Second (avg)** | 173,611 | 15B / 86,400 |
| **Messages/Second (peak)** | 520,833 | 3x average |
| **Read:Write Ratio** | 5:1 | Multi-device reads |

### Group & Channel Traffic

| Metric | Value | Calculation |
|--------|-------|-------------|
| **Active Groups** | 50,000,000 | Estimated |
| **Active Channels** | 10,000,000 | Estimated |
| **Avg Group Size** | 50 members | Mix of small/large |
| **Large Supergroups (>10K)** | 500,000 | Power law distribution |
| **Mega Channels (>1M)** | 10,000 | Top broadcasters |
| **Largest Channel** | 43,000,000 subscribers | @hamster_kombat |

### Channel Fanout Calculation

```
Largest Channel Fanout:
- Subscribers: 43,000,000
- Messages/day (active channel): 10
- Total fanout events/day: 430,000,000

Fanout QPS (peak, single channel):
- 43M subscribers / 60 seconds = 716,667 QPS (if delivered in 1 minute)
- With batching (1000 per batch): 717 batch operations/second
```

### Storage Estimates

| Data Type | Per Unit | Total/Day | Total/Year |
|-----------|----------|-----------|------------|
| **Text Message** | 500 bytes | 7.5 TB | 2.7 PB |
| **Media Metadata** | 1 KB | 5 TB | 1.8 PB |
| **Media Files** | 2 MB avg | 10 PB | 3.65 EB |
| **User Profile** | 5 KB | - | 5 TB |
| **Group Metadata** | 10 KB | - | 500 GB |

**Total Storage Projections:**

| Timeframe | Messages | Media | Total |
|-----------|----------|-------|-------|
| Year 1 | 2.7 PB | 3.65 EB | ~4 EB |
| Year 3 | 8 PB | 11 EB | ~12 EB |
| Year 5 | 14 PB | 18 EB | ~20 EB |

### Bandwidth Estimates

| Type | Calculation | Bandwidth |
|------|-------------|-----------|
| **Message Ingest** | 175K msg/s × 500B | 87.5 MB/s |
| **Message Delivery** | 175K × 5 (read ratio) × 500B | 437.5 MB/s |
| **Media Upload** | 10% msgs have media × 2MB | 35 GB/s |
| **Media Download** | 5× uploads (cached) | 175 GB/s |
| **Total Egress** | Sum | ~210 GB/s |
| **Peak Egress** | 3× average | ~630 GB/s |

### Connection Estimates

| Metric | Value | Calculation |
|--------|-------|-------------|
| **Concurrent Connections** | 100,000,000 | 20% of DAU online |
| **Connections/Server** | 500,000 | Efficient MTProto |
| **Gateway Servers Needed** | 200 | 100M / 500K |
| **Memory/Connection** | 10 KB | Session + buffer |
| **Total Connection Memory** | 1 TB | 100M × 10KB |

---

## SLOs / SLAs

### Service Level Objectives

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Availability** | 99.99% | Uptime monitoring per region |
| **Message Delivery (p99)** | <500ms | End-to-end latency tracing |
| **File Upload Success** | 99.5% | Upload completion rate |
| **Search Latency (p95)** | <500ms | Query timing |
| **Sync Lag (multi-device)** | <5s | Cross-device message arrival |
| **Error Rate** | <0.1% | Failed API requests |

### Service Level Agreements (Premium)

| Feature | Free | Premium |
|---------|------|---------|
| File Size | 2 GB | 4 GB |
| Channels Joined | 500 | 1,000 |
| Chat Folders | 10 | 30+ |
| Bio Length | 70 chars | 140 chars |
| Download Speed | Standard | Priority |

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Message delivery p99 | >1s | >3s |
| Error rate | >0.5% | >1% |
| DC failover time | >30s | >60s |
| Queue depth | >1M | >10M |
| Connection drop rate | >1% | >5% |

---

## Traffic Patterns

### Daily Pattern

```
┌────────────────────────────────────────────────────────────────┐
│  TELEGRAM DAILY TRAFFIC PATTERN                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Messages/sec                                                  │
│  600K ┤                                                        │
│       │                    ┌─────┐                             │
│  500K ┤                   ╱       ╲         ┌───┐              │
│       │                  ╱         ╲       ╱     ╲             │
│  400K ┤                 ╱           ╲     ╱       ╲            │
│       │                ╱             ╲   ╱         ╲           │
│  300K ┤               ╱               ╲ ╱           ╲          │
│       │              ╱                 X             ╲         │
│  200K ┤            ╱                                  ╲        │
│       │           ╱                                    ╲       │
│  100K ┤         ╱                                       ╲      │
│       │────────╱                                         ╲─────│
│     0 ┼────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┤
│       0    2    4    6    8   10   12   14   16   18   20   22 │
│                          Hour (UTC)                            │
│                                                                │
│  Peak: 12:00-14:00 UTC (Europe lunch) + 18:00-22:00 UTC        │
│  Trough: 02:00-06:00 UTC                                       │
│  Peak/Trough Ratio: ~6x                                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Event-Driven Spikes

| Event Type | Traffic Multiplier | Duration |
|------------|-------------------|----------|
| Breaking News | 3-5x | 1-4 hours |
| Major Sports Event | 2-3x | 2-3 hours |
| New Year's Eve | 10x | 30 minutes |
| Regional Holidays | 2x | 24 hours |
| Platform Outage (competitor) | 5-10x | Hours to days |

---

## Resource Estimation Summary

### Compute

| Service | Instance Type | Count | Purpose |
|---------|--------------|-------|---------|
| MTProto Gateway | High-memory | 200 | Connection handling |
| Message Service | Balanced | 500 | Message routing |
| Channel Service | High-CPU | 100 | Fanout processing |
| File Service | Storage-optimized | 200 | File operations |
| Search Service | Memory-optimized | 100 | Full-text search |
| Bot API | Balanced | 50 | HTTP handling |

### Storage

| Type | Capacity | Purpose |
|------|----------|---------|
| PostgreSQL (sharded) | 100 TB | User data, metadata |
| Cassandra | 10 PB | Message history |
| TFS (Distributed) | 20 EB | Media files |
| Redis | 10 TB | Cache, sessions |

### Network

| Component | Capacity |
|-----------|----------|
| Total Bandwidth | 1 Tbps |
| Inter-DC Links | 100 Gbps per pair |
| CDN Capacity | 500 Gbps |
| Edge PoPs | 50+ locations |

---

## Capacity Planning Formula

### Message Infrastructure

```
Gateway Servers = Concurrent_Connections / Connections_Per_Server
               = 100,000,000 / 500,000
               = 200 servers

Message Servers = Peak_QPS / QPS_Per_Server
               = 520,833 / 10,000
               = 53 servers (round to 100 for redundancy)

Storage Growth/Year = Messages/Day × Avg_Size × 365
                   = 15B × 500B × 365
                   = 2.7 PB (messages only)
```

### Channel Fanout Infrastructure

```
Fanout Servers = Max_Channel_Size × Messages/Hour / Fanout_Rate
              = 43,000,000 × 10 / 1,000,000
              = 430 fanout operations at peak

With batching (1000 subscribers/batch):
Batch Operations = 43,000 batches per message
Time to complete = 43,000 / 10,000 ops/sec = 4.3 seconds
```

---

## Interview Quick Reference

### Back-of-Envelope Calculations

```
Users:
- MAU: 1B
- DAU: 500M
- Concurrent: 100M

Messages:
- Per day: 15B
- Per second: 175K avg, 500K peak
- Per user/day: 30

Storage:
- Messages/year: 2.7 PB
- Media/year: 3.65 EB
- Total 5-year: ~20 EB

Connections:
- Concurrent: 100M
- Per server: 500K
- Servers needed: 200

Bandwidth:
- Egress: 210 GB/s avg, 630 GB/s peak
```

### Key Differences from WhatsApp

| Aspect | Telegram | WhatsApp |
|--------|----------|----------|
| Storage model | Server-side permanent | Store-and-forward |
| Multi-device | Unlimited, full sync | Primary + 4 linked |
| Group size | 200K (supergroup) | 1K |
| Encryption default | Client-server | E2EE |
| File size | 2-4GB | ~100MB |
| Message search | Server-side | Client-side |
