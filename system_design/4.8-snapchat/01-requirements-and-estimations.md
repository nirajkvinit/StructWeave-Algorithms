# Requirements & Capacity Estimations

## Overview

This document defines the functional and non-functional requirements for Snapchat, along with detailed capacity estimations. Snapchat's unique ephemeral-first design philosophy requires careful consideration of volatile storage, deletion guarantees, and real-time AR processing.

---

## Functional Requirements

### P0: Core Features (Must Have)

| Feature | Description | Key Requirement |
|---------|-------------|-----------------|
| **Camera Capture** | Photo/video capture with real-time effects | <6s launch time |
| **Ephemeral Snaps** | 1:1 or group Snaps that auto-delete after viewing | Guaranteed deletion |
| **Stories** | 24-hour public/friends-only content | Global CDN with TTL |
| **Chat** | Text, voice notes, video chat | Real-time delivery |
| **Friend Discovery** | Add by username, Snapcode, phone contacts | Privacy-aware suggestions |
| **Push Notifications** | Delivery alerts, friend requests | Cross-platform (APNs/FCM) |

### P1: Enhanced Features (Should Have)

| Feature | Description | Key Requirement |
|---------|-------------|-----------------|
| **AR Lenses** | Real-time face/world tracking effects | On-device ML, 60 FPS |
| **Snap Map** | Live location sharing with friends | 400M MAU, real-time |
| **Memories** | Saved Snaps archive | Persistent storage |
| **Spotlight** | Public short-video feed | Recommendation engine |
| **Bitmoji** | Personalized avatar integration | Avatar sync |
| **Snap Streaks** | Consecutive day exchange tracking | Reliable counter |
| **Voice/Video Calls** | Real-time communication | WebRTC, NAT traversal |

### P2: Extended Features (Nice to Have)

| Feature | Description |
|---------|-------------|
| **Discover** | Publisher content feed |
| **Snap Games** | Real-time multiplayer games |
| **Mini Apps** | Third-party integrations |
| **My AI** | AI chatbot assistant |
| **Snap Tokens** | AR commerce |

### Out of Scope

| Feature | Reason |
|---------|--------|
| **End-to-End Encryption (by default)** | Conflicts with content moderation |
| **Long-form Video (>60s)** | Not core use case |
| **Public Profiles** | Limited implementation |
| **Desktop-first Experience** | Mobile-first platform |
| **Message Search** | Conflicts with ephemeral philosophy |

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Camera Launch** | <6 seconds | Core user experience |
| **Snap Capture to Send** | <2 seconds | Spontaneous sharing |
| **Snap Delivery** | <100ms (online recipient) | Real-time feel |
| **AR Lens Frame Rate** | 60 FPS | Smooth experience |
| **AR Inference Latency** | <16ms per frame | Real-time requirement |
| **Story Load Time** | <500ms | First story visible |
| **Snap Map Refresh** | <1 second | Real-time location |

### Availability Requirements

| Component | Target | Justification |
|-----------|--------|---------------|
| **Core Messaging** | 99.99% | Critical user function |
| **Stories** | 99.95% | High but not critical |
| **AR Lenses** | 99.9% | Can gracefully degrade |
| **Snap Map** | 99.95% | Important but optional |
| **Memories** | 99.99% | User's saved content |

### Consistency Requirements

| Operation | Consistency | Rationale |
|-----------|-------------|-----------|
| **Snap Deletion** | Strong | Must guarantee deletion |
| **Snap Delivery** | Eventual | At-least-once acceptable |
| **Story Views** | Eventual | Approximate count OK |
| **Friend Status** | Strong | Real-time accuracy needed |
| **Snap Streaks** | Strong | Cannot lose streaks |
| **Location Updates** | Eventual | Slight delay acceptable |

### CAP Theorem Analysis

**Choice: AP with Strong Deletion Guarantees**

| Aspect | Decision | Reasoning |
|--------|----------|-----------|
| **Partition Tolerance** | Required | Distributed system |
| **Availability** | Prioritized | Users expect always-on |
| **Consistency** | Eventual (mostly) | Except for deletion |

**Exception: Deletion Operations**
- Deletion must be **strongly consistent**
- Accept temporary unavailability to guarantee deletion
- This is a **legal and trust requirement**

---

## Capacity Estimations

### User Metrics

| Metric | Value | Source |
|--------|-------|--------|
| **DAU** | 306 million | Public data (2024) |
| **MAU** | 750 million | Public data (2024) |
| **DAU/MAU Ratio** | 41% | High engagement |
| **Peak Concurrent Users** | ~50 million | ~16% of DAU |
| **Snap Map MAU** | 400 million | Public data |
| **Average Session Length** | 30 minutes | Industry estimate |
| **Sessions per Day** | 6-8 | Industry estimate |

### Content Volume

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Snaps per Day** | Reported | 5.4 billion |
| **Snaps per Second (avg)** | 5.4B / 86,400 | **62,500 Snaps/sec** |
| **Snaps per Second (peak)** | 3x average | **~200,000 Snaps/sec** |
| **Snaps per User per Day** | 5.4B / 306M | ~18 Snaps |
| **Stories per Day** | ~1B (estimated) | ~1B Stories |
| **Daily Lens Plays** | Reported | 6+ billion |

### Media Size Estimates

| Content Type | Typical Size | Range |
|--------------|--------------|-------|
| **Photo Snap** | 200 KB | 100-500 KB |
| **Video Snap (10s)** | 2 MB | 1-5 MB |
| **Story Photo** | 300 KB | 150-500 KB |
| **Story Video (15s)** | 3 MB | 2-6 MB |
| **AR Lens Model** | 5-50 MB | Varies by complexity |
| **Thumbnail** | 10 KB | 5-20 KB |

### Storage Calculations

#### Ephemeral Storage (Volatile Memory)

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Active Snaps in Transit** | Peak QPS × avg delivery time | 200K × 2s = 400K |
| **Unopened Snaps** | 10% of daily × 24h | 540M Snaps |
| **Avg Snap Size** | Mix of photo/video | 500 KB |
| **Ephemeral Storage Need** | 540M × 500KB | **270 TB** |
| **With 3x Replication** | 270TB × 3 | **810 TB volatile** |

#### Persistent Storage (Stories + Memories)

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Active Stories** | 1B × 24h TTL | 1B Stories |
| **Avg Story Size** | Photo + video mix | 1 MB |
| **Stories Storage** | 1B × 1MB | **1 PB** |
| **Memories (Year 1)** | 10% users × 50 items × 1MB | 3.75 PB |
| **Memories (Year 5)** | Growth + retention | ~20 PB |

### Bandwidth Calculations

| Flow | Calculation | Result |
|------|-------------|--------|
| **Upload (Snaps)** | 62.5K/s × 500KB | **31.25 GB/s** |
| **Download (Snaps)** | 62.5K/s × 500KB × 1.5 recipients | **47 GB/s** |
| **Stories (Read)** | Assuming 10B views/day | ~100 GB/s |
| **Total Egress** | Sum of above | **~200 GB/s** |
| **Peak Multiplier** | 3x average | **~600 GB/s peak** |

### Connection Estimates

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Concurrent Connections** | 50M peak users | 50M connections |
| **WebSocket Servers** | 50K connections per server | **1,000 servers** |
| **Connection per User** | Mobile + possible web | 1.2 avg |

---

## Read/Write Ratio Analysis

| Operation | Type | Volume | Ratio |
|-----------|------|--------|-------|
| **Send Snap** | Write | 62,500/s | - |
| **Upload Media** | Write | 62,500/s | - |
| **Receive Snap** | Read | 93,750/s (1.5x) | - |
| **View Story** | Read | 115,000/s | - |
| **Location Update** | Write | 100,000/s | - |
| **View Map** | Read | 50,000/s | - |
| **Total Write** | - | ~225,000/s | 35% |
| **Total Read** | - | ~260,000/s | 65% |

**Ratio: 1:1.8 (Write:Read)** - More balanced than typical social apps due to ephemeral nature.

---

## Geographic Distribution

### User Distribution (Estimated)

| Region | % of DAU | Users | Data Center Requirement |
|--------|----------|-------|------------------------|
| **North America** | 35% | 107M | US-East, US-West |
| **Europe** | 25% | 77M | EU-West, EU-Central |
| **Asia-Pacific** | 20% | 61M | APAC |
| **Middle East** | 10% | 31M | ME |
| **Other** | 10% | 30M | Nearest region |

### Latency Requirements by Region

| User Location | Target Latency | Strategy |
|---------------|----------------|----------|
| Same region as DC | <50ms | Direct |
| Adjacent region | <100ms | Edge PoP |
| Cross-continent | <200ms | CDN + routing |

---

## SLOs and SLAs

### Service Level Objectives (SLOs)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Snap Delivery Latency (p50)** | <50ms | End-to-end |
| **Snap Delivery Latency (p95)** | <100ms | End-to-end |
| **Snap Delivery Latency (p99)** | <500ms | End-to-end |
| **Camera Launch (p95)** | <6s | Cold start |
| **AR Frame Rate** | 60 FPS | On supported devices |
| **Story Load (p95)** | <500ms | First story visible |
| **Deletion Completion** | <1 min | After trigger |
| **Availability (Monthly)** | 99.99% | Core services |

### Service Level Agreements (SLAs)

| Service | Availability | Consequences |
|---------|--------------|--------------|
| **Core Messaging** | 99.95% | Internal escalation |
| **Stories** | 99.9% | Priority P1 |
| **Snap Map** | 99.9% | Priority P2 |
| **AR Lenses** | 99.5% | Graceful degradation |

### Error Budgets

| Service | Monthly Downtime Allowed |
|---------|-------------------------|
| **99.99%** | 4.3 minutes |
| **99.95%** | 21.9 minutes |
| **99.9%** | 43.8 minutes |

---

## Growth Projections

### 5-Year Outlook

| Metric | Current | Year 2 | Year 5 |
|--------|---------|--------|--------|
| **DAU** | 306M | 400M | 600M |
| **Snaps/Day** | 5.4B | 8B | 15B |
| **Stories/Day** | 1B | 1.5B | 3B |
| **AR Lens Plays** | 6B | 10B | 20B |
| **Snap Map MAU** | 400M | 550M | 800M |

### Infrastructure Scaling Implications

| Resource | Current | Year 5 | Strategy |
|----------|---------|--------|----------|
| **Volatile Memory** | 810 TB | 2.5 PB | Horizontal scaling |
| **Persistent Storage** | 5 PB | 50 PB | Cloud auto-scaling |
| **Bandwidth** | 600 GB/s | 2 TB/s | CDN expansion |
| **Microservices** | 300+ | 500+ | Service mesh |

---

## Interview Capacity Estimation Cheat Sheet

```
┌─────────────────────────────────────────────────────────────────┐
│              SNAPCHAT CAPACITY QUICK REFERENCE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  USERS:                                                         │
│    DAU = 306M, MAU = 750M, Peak Concurrent = 50M               │
│                                                                 │
│  SNAPS:                                                         │
│    Daily = 5.4B → 62,500/sec avg → 200,000/sec peak            │
│    Size = 500KB avg (photo 200KB, video 2MB)                   │
│                                                                 │
│  STORAGE:                                                       │
│    Ephemeral (volatile) = ~800 TB                              │
│    Stories (24h) = ~1 PB                                       │
│    Memories (persistent) = ~5 PB                               │
│                                                                 │
│  BANDWIDTH:                                                     │
│    Upload = 31 GB/s, Download = 150+ GB/s, Peak = 600 GB/s     │
│                                                                 │
│  CONNECTIONS:                                                   │
│    Peak = 50M, Servers needed = ~1,000 WebSocket servers       │
│                                                                 │
│  KEY FORMULAS:                                                  │
│    Snaps/sec = 5.4B / 86,400 = 62,500                         │
│    Storage = Snaps × Size × Replication Factor                 │
│    Bandwidth = QPS × Avg Size                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Requirements Traceability

| Requirement | Addressed In |
|-------------|--------------|
| Ephemeral deletion | 04-deep-dive (deletion pipeline) |
| <6s camera launch | 03-low-level (client optimization) |
| AR 60 FPS | 04-deep-dive (AR engine) |
| 99.99% availability | 05-scalability (fault tolerance) |
| Server-side moderation | 06-security (content moderation) |
| Snap Map privacy | 06-security (privacy controls) |
