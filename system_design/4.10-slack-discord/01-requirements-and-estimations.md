# Requirements & Capacity Estimations

## Functional Requirements

### P0 - Core Features (Must Have)

| Feature | Description | Slack | Discord |
|---------|-------------|-------|---------|
| **Workspace/Guild** | Organizational container for channels | Workspace | Guild/Server |
| **Channels** | Public/private conversation spaces | Yes | Yes |
| **Direct Messages** | 1:1 and group DMs | Yes | Yes |
| **Real-time Messaging** | Instant message delivery | <500ms | <100ms |
| **Presence** | Online/idle/DnD/offline status | Yes | Yes + Invisible |
| **Typing Indicators** | Show when users are typing | Yes | Yes |
| **Message Threading** | Replies organized under parent | First-class | Basic reply_to |
| **File Sharing** | Upload images, documents, media | Yes | Yes |
| **Reactions** | Emoji reactions to messages | Yes | Yes |
| **Search** | Full-text search across messages | Yes | Yes |
| **Push Notifications** | Alerts for offline users | Yes | Yes |
| **Message History** | Persistent message storage | Yes | Yes |

### P1 - Extended Features (Should Have)

| Feature | Description | Slack | Discord |
|---------|-------------|-------|---------|
| **Voice Channels** | Real-time audio communication | Huddles | Core feature |
| **Screen Sharing** | Share screen in calls | Yes | Yes |
| **Video Calls** | Face-to-face communication | Yes | Yes |
| **Role-based Permissions** | Granular access control | Channel-level | Role hierarchy |
| **Integrations/Bots** | Third-party apps, webhooks | App Directory | Bot ecosystem |
| **Slash Commands** | Trigger actions via `/command` | Yes | Yes |
| **Message Pinning** | Highlight important messages | Yes | Yes |
| **Channel Categories** | Organize channels in folders | Sections | Categories |
| **Cross-workspace Channels** | Connect different orgs | Slack Connect | N/A |
| **Server Discovery** | Find public communities | N/A | Server Browser |
| **Nitro/Premium** | Enhanced features for subscribers | N/A | Nitro |
| **Enterprise Grid** | Multi-workspace management | Yes | N/A |

### Out of Scope

- End-to-end encryption (both platforms have server access for search/compliance)
- Federated messaging (no cross-platform communication)
- Blockchain-based identity
- AI content generation (separate feature, not core messaging)

---

## Non-Functional Requirements

### Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Message Delivery (online)** | <500ms (Slack), <100ms (Discord) | Global, 99th percentile |
| **WebSocket Event Latency** | <100ms | Typing, presence updates |
| **Voice Latency** | <200ms | Discord voice channels |
| **Search Latency** | <2s (p95) | Full-text across message history |
| **Connection Establishment** | <3s | WebSocket handshake + auth |
| **API Response Time** | <200ms (p99) | REST API calls |

### Availability & Reliability

| Metric | Target | Notes |
|--------|--------|-------|
| **Availability** | 99.99% | 52 minutes downtime/year |
| **Message Durability** | 99.9999999% | No message loss after ACK |
| **Recovery Time (RTO)** | <5 minutes | Per-region failover |
| **Recovery Point (RPO)** | <1 second | Synchronous replication |

### Scalability Targets

| Metric | Slack | Discord |
|--------|-------|---------|
| **Concurrent WebSockets** | 5M+ | 12M+ |
| **Messages/Day** | Billions | Billions |
| **WebSocket Events/Second** | Millions | 26M+ |
| **Max Users in Single Channel/Guild** | Unlimited | 15M+ |
| **Workspaces/Guilds** | 750K+ paying | Millions |

### Consistency Model

| Data Type | Model | Rationale |
|-----------|-------|-----------|
| **Messages** | Eventual (with causal ordering) | High availability, global scale |
| **Presence** | Eventual | Rapidly changing, tolerate staleness |
| **Membership** | Strong | Critical for authorization |
| **User Profile** | Eventual | Low update frequency |
| **Permissions** | Strong | Security-critical |

---

## Capacity Estimations

### Assumptions

| Metric | Slack | Discord |
|--------|-------|---------|
| **DAU** | 15M | 150M |
| **Peak Concurrent** | 5M | 12M |
| **Messages/User/Day** | 50 | 30 |
| **Avg Message Size** | 500 bytes | 300 bytes |
| **Channels/Workspace** | 500 | 50 (guilds have fewer) |
| **Members/Channel (avg)** | 50 | 500 |
| **Presence Updates/User/Hour** | 10 | 20 |

### Traffic Calculations

#### Messages

```
Daily Messages (Slack):
= DAU × Messages/User/Day
= 15M × 50
= 750M messages/day

Peak Messages/Second (Slack):
= (Daily Messages × Peak Factor) / (Peak Hours × 3600)
= (750M × 3) / (8 × 3600)
= 78,125 messages/second

Daily Messages (Discord):
= DAU × Messages/User/Day
= 150M × 30
= 4.5B messages/day

Peak Messages/Second (Discord):
= (4.5B × 3) / (8 × 3600)
= 468,750 messages/second
```

#### WebSocket Events

```
Presence Updates/Second (Slack):
= Concurrent Users × Updates/Hour / 3600
= 5M × 10 / 3600
= 13,889/second

Typing Indicators/Second (estimate):
= Active Typers × Channels Visible
= 100K × 10
= 1M events/second (peak)

Total WebSocket Events (Discord):
= 26M+ events/second (stated)
```

#### Fanout

```
Average Fanout (message to channel members):
Slack: 50 members/channel average
Discord: 500 members/guild average

Large Channel Fanout:
- Slack Enterprise: 10K+ members
- Discord Large Guild: 15M members (extreme)

Messages × Fanout = Deliveries/Second:
Slack Peak: 78K × 50 = 3.9M deliveries/second
Discord Peak: 469K × 500 = 234M deliveries/second
```

### Storage Calculations

#### Message Storage

```
Daily Message Storage (Slack):
= Daily Messages × Avg Message Size
= 750M × 500 bytes
= 375 GB/day

Yearly Storage (Slack):
= 375 GB × 365
= 137 TB/year

Daily Message Storage (Discord):
= 4.5B × 300 bytes
= 1.35 TB/day

Yearly Storage (Discord):
= 1.35 TB × 365
= 493 TB/year

5-Year Storage with Indices (2x):
Slack: 137 TB × 5 × 2 = 1.37 PB
Discord: 493 TB × 5 × 2 = 4.93 PB
```

#### Media Storage

```
Assume 5% of messages have attachments:
Average attachment: 1 MB

Daily Media (Slack):
= 750M × 5% × 1 MB
= 37.5 TB/day

Yearly Media (Slack):
= 37.5 TB × 365
= 13.7 PB/year
```

### Infrastructure Estimates

#### Connection Servers

```
Connections per Gateway Server: 100K (industry standard)

Gateway Servers Needed (Slack):
= Peak Concurrent / Connections per Server
= 5M / 100K
= 50 servers

With 100% buffer for failover:
= 100 Gateway Servers

Gateway Servers Needed (Discord):
= 12M / 100K
= 120 servers

With buffer:
= 240 Gateway Servers
```

#### Database Shards

```
Messages per Shard (target): 10B

Initial Shards (Slack):
= Year 1 Messages / Messages per Shard
= (750M × 365) / 10B
= 27.4 shards → 32 shards (power of 2)

Initial Shards (Discord):
= (4.5B × 365) / 10B
= 164 shards → 256 shards
```

#### Cache Layer

```
Hot Messages (last 24 hours in cache):
Slack: 375 GB
Discord: 1.35 TB

With 3x replication:
Slack: ~1.1 TB cache cluster
Discord: ~4 TB cache cluster
```

---

## SLOs / SLAs

### Service Level Objectives

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| **Availability** | 99.99% | Monthly |
| **Message Delivery (p99)** | <500ms | 5-minute rolling |
| **WebSocket Uptime** | 99.95% | Per connection/hour |
| **Search Latency (p95)** | <2s | Hourly |
| **API Error Rate** | <0.1% | 5-minute rolling |
| **Push Notification Delivery** | <30s | End-to-end |

### Service Level Agreements (Enterprise)

| Metric | SLA | Penalty |
|--------|-----|---------|
| **Monthly Uptime** | 99.9% | Service credits |
| **Incident Response (P1)** | <15 minutes | Escalation |
| **Data Residency** | Region-specific | Contractual |
| **Backup Recovery** | <4 hours | Contractual |

---

## Capacity Summary Table

| Resource | Slack | Discord | Notes |
|----------|-------|---------|-------|
| **Gateway Servers** | 100 | 240 | With failover buffer |
| **Database Shards** | 32 | 256 | Channel-based sharding |
| **Cache Cluster** | 1.1 TB | 4 TB | Hot message cache |
| **Search Cluster** | 500 nodes | 2000 nodes | Elasticsearch |
| **Daily Storage** | 375 GB | 1.35 TB | Messages only |
| **Yearly Storage** | 137 TB | 493 TB | Messages only |
| **Peak QPS** | 78K msg/s | 469K msg/s | Message writes |
| **Peak Fanout** | 3.9M/s | 234M/s | Message deliveries |
