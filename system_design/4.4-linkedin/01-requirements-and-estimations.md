# LinkedIn: Requirements & Capacity Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### P0 - Must Have (Core Platform)

| Feature | Description | Key Operations |
|---------|-------------|----------------|
| **Professional Profile** | Member identity with work history, skills, education | Create, update, view, visibility controls |
| **Connections** | Bidirectional professional relationships | Request, accept, reject, withdraw, remove |
| **Feed** | Professional content stream | View, post, like, comment, share |
| **Messaging (InMail)** | Professional communication | Send, receive, reply, read receipts |
| **Job Search** | Find job opportunities | Search, filter, save, apply |
| **Notifications** | Activity alerts | Push, email, in-app digest |

### P1 - Important (Engagement & Discovery)

| Feature | Description | Key Operations |
|---------|-------------|----------------|
| **People You May Know (PYMK)** | Connection recommendations | Generate, dismiss, connect |
| **Job Recommendations** | Personalized job suggestions | Generate, save, apply |
| **Company Pages** | Business profiles | Follow, view, jobs, updates |
| **Groups** | Professional communities | Join, post, discuss |
| **Skills & Endorsements** | Professional validation | Add, endorse, assessment |
| **Search** | People, jobs, companies, content | Query, filter, paginate |

### P2 - Nice to Have (Premium & Enterprise)

| Feature | Description | Key Operations |
|---------|-------------|----------------|
| **Recruiter** | Talent acquisition platform | Search, InMail, pipeline |
| **Sales Navigator** | B2B sales intelligence | Lead search, account mapping |
| **LinkedIn Learning** | Professional courses | Watch, track progress, certificates |
| **Premium Insights** | Profile viewers, salary data | View analytics |
| **LinkedIn Live** | Live video broadcasting | Stream, watch, engage |

### Out of Scope

- Marketing Solutions / Ads Platform (separate system)
- LinkedIn Events (simplified version in Groups)
- LinkedIn News (curated by editorial team)
- Detailed analytics dashboards (separate data platform)

---

## Non-Functional Requirements

### Latency Requirements

| Operation | P50 | P95 | P99 | Notes |
|-----------|-----|-----|-----|-------|
| **Feed Load** | 100ms | 200ms | 500ms | Pre-computed + real-time merge |
| **Profile View** | 50ms | 100ms | 200ms | Heavy caching |
| **Connection Request** | 100ms | 200ms | 400ms | Graph write + notification |
| **PYMK Load** | 150ms | 300ms | 600ms | ML inference required |
| **Job Search** | 100ms | 250ms | 500ms | Galene query + ranking |
| **Message Send** | 50ms | 100ms | 200ms | Async persistence |
| **Graph Query (1st degree)** | 10ms | 30ms | 50ms | LIquid in-memory |
| **Graph Query (2nd degree)** | 30ms | 80ms | 150ms | Bidirectional BFS |

### Availability Requirements

| Component | Target | Justification |
|-----------|--------|---------------|
| **Core Platform** | 99.99% | Professional users expect reliability |
| **Feed** | 99.95% | Can degrade to cached content |
| **Messaging** | 99.99% | Business-critical communication |
| **Job Applications** | 99.99% | Career-impacting operations |
| **Search** | 99.9% | Can show degraded results |
| **PYMK** | 99.5% | Non-critical, can hide section |

### Consistency Requirements

| Data Type | Model | Rationale |
|-----------|-------|-----------|
| **Connections** | Strong | Bidirectional must be atomic |
| **Profile Updates** | Strong | Identity accuracy critical |
| **Feed Content** | Eventual | Slight delay acceptable |
| **Message Delivery** | Strong | Professional communication |
| **Job Applications** | Strong | Career-critical |
| **Engagement Counts** | Eventual | Approximate OK for display |
| **Notifications** | Eventual | Delay acceptable |

### Durability Requirements

| Data Type | Durability | Replication | Backup |
|-----------|------------|-------------|--------|
| **Profiles** | 11 nines | 3 replicas cross-region | Daily |
| **Connections** | 11 nines | Graph replicated | Continuous |
| **Messages** | 11 nines | 3 replicas | Hourly |
| **Job Applications** | 11 nines | 3 replicas | Real-time |
| **Feed Content** | 9 nines | 2 replicas | Daily |
| **Analytics** | 6 nines | Single region | Weekly |

---

## Capacity Estimations

### User & Traffic Assumptions

| Metric | Value | Source |
|--------|-------|--------|
| Total Members | 1.2 billion | LinkedIn 2025 |
| Monthly Active Users (MAU) | 310 million | ~26% of total |
| Daily Active Users (DAU) | 134.5 million | ~43% of MAU |
| Average Connections | 400 per active user | Industry data |
| Sessions per DAU/day | 3 | Professional usage |
| Feed views per session | 5 | Conservative estimate |
| Average session duration | 7 minutes | Mobile-heavy |

### Traffic Calculations

#### Feed Operations

```
Feed Reads:
- DAU: 134.5M users
- Sessions/day: 3 × 134.5M = 403.5M sessions
- Feed views/session: 5
- Total feed views/day: 403.5M × 5 = 2.02 billion

Feed Read QPS:
- Average: 2.02B / 86,400 = ~23,400 QPS
- Peak (3x): ~70,000 QPS
```

#### Connection Operations

```
Connection Requests:
- Active users sending requests: 10% of DAU = 13.45M
- Requests per active user/day: 2
- Total requests/day: 26.9M

Connection QPS:
- Write (requests): 26.9M / 86,400 = ~311 QPS
- Read (connection list): ~10,000 QPS (profile views)
```

#### Job Operations

```
Job Searches:
- Users searching jobs/day: 30% of DAU = 40.35M
- Searches per user: 5
- Total searches/day: 201.75M

Job Search QPS:
- Average: 201.75M / 86,400 = ~2,335 QPS
- Peak (3x): ~7,000 QPS

Job Applications:
- Applications/day: 10M (estimate)
- Application QPS: ~116 QPS
```

#### Messaging Operations

```
Messages:
- Users messaging/day: 20% of DAU = 26.9M
- Messages per user: 5
- Total messages/day: 134.5M

InMail-specific:
- InMail messages/day: ~10M (premium feature)

Message QPS:
- Send: ~1,560 QPS
- Read: ~5,000 QPS (checking inbox)
```

#### Graph Operations

```
LIquid Graph Queries:
- Profile views/day: 500M (includes own profile)
- Connection list views: 200M
- PYMK requests: 100M
- 2nd degree lookups: 300M

Total graph queries: ~1.1B/day
Graph QPS: ~12,700 QPS (avg), 2M QPS (peak per LinkedIn)
```

### Storage Calculations

#### Member Profiles

```
Profile Storage:
- Members: 1.2B
- Profile size: ~50KB (text, settings, history)
- Raw storage: 1.2B × 50KB = 60TB

With replication (3x) and overhead (2x):
- Total profile storage: 60TB × 6 = 360TB
```

#### Professional Graph

```
Graph Storage (LIquid):
- Edges: 270 billion (bidirectional)
- Edge size: ~100 bytes (IDs, metadata, timestamps)
- Raw storage: 270B × 100B = 27TB

With indexes and replication:
- Total graph storage: ~500TB (in-memory optimized)
```

#### Messages

```
Message Storage:
- Messages/day: 134.5M
- Average message: 500 bytes
- Daily new: 134.5M × 500B = 67.25GB

Annual growth:
- 67.25GB × 365 = 24.5TB/year
- 5-year retention: ~125TB raw
- With replication: ~400TB
```

#### Jobs

```
Job Storage:
- Active jobs: 15M
- Job posting size: 10KB
- Active storage: 150GB

Historical (searchable):
- Jobs posted/year: ~50M
- 3-year retention: 150M × 10KB = 1.5TB
```

#### Content (Feed)

```
Content Storage:
- Posts/day: 10M
- Average post: 5KB (text, metadata)
- Daily: 50GB

Annual:
- 50GB × 365 = 18TB/year
- With media references: ~100TB/year
```

### Cache Sizing

```
Feed Cache (Redis):
- Active users: 134.5M DAU
- Cached feed entries: 200 per user
- Entry size: 200 bytes
- Total: 134.5M × 200 × 200B = 5.38TB

Connection Cache:
- Active users: 134.5M
- Cached connections: 1000 per user
- Connection size: 50 bytes
- Total: 134.5M × 1000 × 50B = 6.73TB

Session Cache:
- Concurrent sessions: 50M
- Session size: 2KB
- Total: 100GB

Total Redis: ~15TB (distributed)
```

### Bandwidth Calculations

```
Inbound:
- Posts: 10M × 5KB = 50GB/day
- Messages: 134.5M × 500B = 67GB/day
- Job applications: 10M × 2KB = 20GB/day
- Total inbound: ~150GB/day = ~14 Mbps avg

Outbound:
- Feed views: 2B × 10KB = 20TB/day
- Profile views: 500M × 20KB = 10TB/day
- Job searches: 200M × 5KB = 1TB/day
- Total outbound: ~31TB/day = ~3 Gbps avg

Peak (5x): ~15 Gbps
```

---

## Capacity Summary

| Resource | Daily | Annual | Notes |
|----------|-------|--------|-------|
| **Feed Read QPS** | 23K avg / 70K peak | - | Pre-computed feeds |
| **Graph QPS** | 12.7K avg / 2M peak | - | LIquid in-memory |
| **Job Search QPS** | 2.3K avg / 7K peak | - | Galene index |
| **Message QPS** | 1.5K write / 5K read | - | Espresso async |
| **Profile Storage** | - | 360TB | 3x replicated |
| **Graph Storage** | - | 500TB | In-memory optimized |
| **Message Storage** | 67GB | 24.5TB | 5-year retention |
| **Cache (Redis)** | - | 15TB | Distributed |
| **Outbound Bandwidth** | 31TB | - | 3 Gbps avg |

---

## Service Level Objectives (SLOs)

### Feed Service

| Metric | Objective | Measurement |
|--------|-----------|-------------|
| Availability | 99.95% | Successful feed loads / total requests |
| Latency (P99) | 500ms | Time to first content |
| Error Rate | < 0.1% | 5xx responses |
| Freshness | < 5 min | Time to new relevant content |

### Connection Service

| Metric | Objective | Measurement |
|--------|-----------|-------------|
| Availability | 99.99% | Request success rate |
| Latency (P99) | 400ms | Request -> accept confirmation |
| Consistency | 100% | Bidirectional edge atomicity |
| Error Rate | < 0.01% | Failed operations |

### Job Service

| Metric | Objective | Measurement |
|--------|-----------|-------------|
| Availability | 99.99% | Search + application success |
| Search Latency (P99) | 500ms | Query to results |
| Application Success | 99.99% | Application submissions |
| Matching Quality | > 70% | Relevant job in top 10 |

### Messaging Service

| Metric | Objective | Measurement |
|--------|-----------|-------------|
| Availability | 99.99% | Send + receive success |
| Delivery Latency (P99) | 2s | Send to recipient notification |
| Read Receipt Accuracy | 99.9% | Correct read timestamps |
| Error Rate | < 0.01% | Message delivery failures |

---

## Traffic Patterns

### Daily Pattern

```
               LinkedIn Traffic Pattern (Professional Hours)

QPS
70K ─┐
     │                    ╭────╮
60K ─┤                   ╱      ╲           Lunch
     │                  ╱        ╲          peak
50K ─┤       Morning   ╱          ╲
     │       ramp-up  ╱            ╲
40K ─┤      ╭────────╯              ╲
     │     ╱                          ╲    Evening
30K ─┤    ╱                            ╲   decline
     │   ╱                              ╲
20K ─┤  ╱                                ╲
     │ ╱                                  ╲
10K ─┤╱                                    ╲───────
     │
  0 ─┼──────────────────────────────────────────────────
        6am   9am   12pm   3pm   6pm   9pm   12am

     └─────── Business Hours Peak (9am-6pm) ────────┘
```

**Key Observations:**
- Peak: 9am-6pm local time (business hours)
- Secondary peak: Lunch hour (12pm-1pm)
- Low activity: Evenings, weekends
- Geographic spread smooths global traffic

### Special Events

| Event | Traffic Multiplier | Example |
|-------|-------------------|---------|
| **Mass Layoffs Announcement** | 10x job search | Tech layoffs |
| **Earnings Season** | 3x company page views | Q4 reports |
| **LinkedIn Outage Recovery** | 5x catch-up | Post-incident |
| **Viral Professional Post** | 2x feed engagement | Industry news |
| **Job Fair Period** | 3x applications | Campus recruiting |

### Geographic Distribution

| Region | DAU % | Peak Hours (UTC) |
|--------|-------|------------------|
| **North America** | 35% | 14:00-22:00 |
| **Europe** | 25% | 07:00-17:00 |
| **Asia Pacific** | 30% | 00:00-10:00 |
| **Rest of World** | 10% | Distributed |

---

## Constraints & Assumptions

### Business Constraints

- **Connection Limit**: 30,000 maximum per member (graph quality)
- **InMail Limits**: Based on subscription tier (spam prevention)
- **Job Application Limit**: Easy Apply rate limits per employer
- **Content Posting**: Rate limited to prevent spam
- **Profile Completeness**: Encourages professional detail

### Technical Assumptions

- Read-heavy workload (100:1 ratio)
- Professional content velocity lower than consumer social
- Mobile-first traffic (60%+ mobile)
- B2B features require stronger data isolation
- Cross-region access patterns (recruiters in US hiring globally)

### Data Retention

| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Profiles | Indefinite | User owns data |
| Connections | Indefinite | Relationship history |
| Messages | 7 years | Business records |
| Job Applications | 3 years | Compliance |
| Feed Content | 2 years | Storage optimization |
| Analytics | 1 year | Aggregated after |

---

*Previous: [← 00 - Index](./00-index.md) | Next: [02 - High-Level Design →](./02-high-level-design.md)*
