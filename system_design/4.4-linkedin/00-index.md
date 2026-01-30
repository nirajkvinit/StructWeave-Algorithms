# LinkedIn System Design

[← Back to System Design Index](../README.md)

---

## Overview

**LinkedIn** is the world's largest professional networking platform, connecting 1.2 billion members for career development, recruiting, and professional content sharing. Unlike consumer social networks (Facebook, Twitter), LinkedIn focuses on **professional identity**, **bidirectional connections** (mutual consent required), and **career-oriented engagement**. The platform monetizes primarily through B2B products (Recruiter, Sales Navigator, Marketing Solutions) rather than consumer ads.

**Core Technical Challenges:**
- Managing a professional graph with 270 billion bidirectional edges at 2 million QPS
- Two-sided job marketplace optimization (job seekers + recruiters)
- Feed ranking optimized for professional value (dwell time) rather than engagement
- B2B data isolation for enterprise products

---

## System Characteristics

| Characteristic | Value | Implications |
|----------------|-------|--------------|
| **Read:Write Ratio** | 100:1 | Heavy caching, pre-computed feeds |
| **Connection Type** | Bidirectional | Atomic edge creation, mutual consent flow |
| **Avg Connections** | ~400 (max 30K) | Sparse graph vs Facebook/Twitter |
| **Content Velocity** | Low (professional) | Quality over quantity ranking |
| **Primary Metric** | Dwell Time | Not engagement (likes, shares) |
| **Monetization** | B2B (Recruiter, Sales Nav) | Enterprise features, data isolation |
| **Latency Target** | <200ms p99 (feed) | Pre-computation + caching |
| **Availability Target** | 99.99% | Multi-region active-active |

---

## Complexity Rating

| Component | Complexity | Rationale |
|-----------|------------|-----------|
| **Overall System** | Very High | Combines graph, ML ranking, job matching, messaging |
| **LIquid Graph** | Very High | 270B edges, 2M QPS, bidirectional consistency |
| **360Brew Feed Ranking** | Very High | 300+ signals, dwell time prediction, LLM integration |
| **Job Matching** | High | Two-sided marketplace, GLMix personalization |
| **InMail Messaging** | High | Espresso distributed storage, real-time presence |
| **PYMK Recommendations** | High | LiGNN with 8.6B nodes, cross-domain signals |
| **Connection Service** | Medium-High | Bidirectional atomicity, request lifecycle |
| **Profile Service** | Medium | Caching, visibility controls |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flows, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, core algorithms |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | LIquid Graph, Job Matching, 360Brew Feed |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategy, fault tolerance, DR |
| [06 - Security & Compliance](./06-security-and-compliance.md) | AuthN/AuthZ, B2B isolation, GDPR/CCPA |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing, trap questions, trade-offs |

---

## Core Modules

| Module | Responsibility | Key Challenge | Scale |
|--------|----------------|---------------|-------|
| **LIquid Graph** | Professional connections, degrees of separation | Bidirectional BFS at 2M QPS | 270B edges |
| **360Brew Feed** | Content ranking and delivery | Dwell time prediction with 300+ signals | 134M DAU |
| **Job Service** | Job posting, search, recommendations | Two-sided marketplace optimization | 15M+ active jobs |
| **Recruiter Platform** | Talent search, InMail, pipeline | B2B data isolation, compliance | 50M+ recruiters |
| **InMail/Messaging** | Professional messaging | Espresso distributed storage | 1B+ messages/day |
| **PYMK** | People You May Know | LiGNN cross-domain recommendations | 8.6B nodes |
| **Notification Service** | Real-time alerts, email digest | Concourse streaming pipeline | 10B+ notifications/day |
| **Profile Service** | Professional identity | Visibility controls, caching | 1.2B profiles |

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        Web["Web App"]
        Mobile["Mobile Apps<br/>(iOS/Android)"]
        API["API Clients<br/>(Recruiter/Sales Nav)"]
    end

    subgraph Edge["Edge Layer"]
        CDN["CDN<br/>(Media, Static)"]
        LB["Load Balancer<br/>(L7)"]
    end

    subgraph Gateway["API Gateway Layer"]
        GW["API Gateway<br/>(Auth, Rate Limit, Routing)"]
    end

    subgraph Services["Service Layer"]
        Feed["Feed Service<br/>(360Brew)"]
        Conn["Connection Service"]
        Job["Job Service"]
        Msg["Messaging Service<br/>(InMail)"]
        Profile["Profile Service"]
        Notif["Notification Service<br/>(Concourse)"]
        Search["Search Service<br/>(Galene)"]
        PYMK["PYMK Service"]
    end

    subgraph ML["ML/AI Layer"]
        Ranking["Ranking Models<br/>(GLMix, LiGNN)"]
        Features["Feature Store"]
        Embeddings["Embedding Service"]
    end

    subgraph Graph["Graph Layer"]
        LIquid["LIquid Graph<br/>(270B edges)"]
        GraphCache["Graph Cache"]
    end

    subgraph Data["Data Layer"]
        Espresso["Espresso<br/>(Messages, Profiles)"]
        MySQL["MySQL Clusters<br/>(Jobs, Companies)"]
        Redis["Redis<br/>(Feed Cache, Sessions)"]
        Venice["Venice<br/>(Derived Data)"]
    end

    subgraph Streaming["Streaming Layer"]
        Kafka["Kafka<br/>(7T msgs/day)"]
        Samza["Samza<br/>(Stream Processing)"]
    end

    Web --> CDN
    Mobile --> CDN
    API --> LB
    CDN --> LB
    LB --> GW

    GW --> Feed
    GW --> Conn
    GW --> Job
    GW --> Msg
    GW --> Profile
    GW --> Search

    Feed --> Ranking
    Feed --> LIquid
    Feed --> Redis

    Conn --> LIquid
    Conn --> GraphCache

    Job --> Search
    Job --> Ranking
    Job --> MySQL

    Msg --> Espresso
    Msg --> Kafka

    PYMK --> LIquid
    PYMK --> Ranking

    Notif --> Samza
    Samza --> Kafka

    Ranking --> Features
    Ranking --> Embeddings

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ml fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef graph fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef data fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef streaming fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class Web,Mobile,API client
    class CDN,LB edge
    class GW service
    class Feed,Conn,Job,Msg,Profile,Notif,Search,PYMK service
    class Ranking,Features,Embeddings ml
    class LIquid,GraphCache graph
    class Espresso,MySQL,Redis,Venice data
    class Kafka,Samza streaming
```

---

## LinkedIn vs Facebook vs Twitter

| Aspect | LinkedIn | Facebook | Twitter |
|--------|----------|----------|---------|
| **Connection Model** | Bidirectional (mutual consent) | Bidirectional (friend request) | Unidirectional (follow) |
| **Graph Density** | Sparse (~400 avg) | Dense (~500 avg) | Asymmetric (~700 avg) |
| **Content Type** | Professional articles, jobs | Personal posts, photos | Real-time news, threads |
| **Feed Goal** | Career value | Social connection | Information/entertainment |
| **Primary Metric** | Dwell time | Engagement | Impressions |
| **Fan-out Threshold** | N/A (low velocity) | 10K followers | 100K followers |
| **Monetization** | B2B (Recruiter, Sales Nav) | B2C (Ads) | B2C (Ads) |
| **Connection Limit** | 30,000 | 5,000 | Unlimited |
| **Graph Database** | LIquid (custom) | TAO (custom) | GraphJet + Redis |
| **Feed System** | 360Brew | Aggregator | Home Mixer |

---

## Key Scale Numbers (2025-2026)

```
┌─────────────────────────────────────────────────────────────────┐
│                    LINKEDIN SCALE NUMBERS                        │
├─────────────────────────────────────────────────────────────────┤
│  USERS                                                          │
│  ├── Total Members:        1.2 billion                          │
│  ├── Daily Active Users:   134.5 million                        │
│  ├── Monthly Active Users: 310 million                          │
│  └── Avg Connections:      ~400 (active: ~1,300, max: 30,000)   │
│                                                                  │
│  PROFESSIONAL GRAPH (LIquid)                                    │
│  ├── Total Edges:          270 billion                          │
│  ├── Query Throughput:     2 million QPS                        │
│  ├── Avg Latency:          <50ms                                │
│  └── Memory per Server:    1+ TB                                │
│                                                                  │
│  GRAPH NEURAL NETWORK (LiGNN)                                   │
│  ├── Graph Size:           15 TB                                │
│  ├── Nodes:                8.6 billion                          │
│  └── Edges:                100+ billion                         │
│                                                                  │
│  FEED (360Brew)                                                 │
│  ├── Ranking Signals:      300+                                 │
│  ├── Spam Detection:       93% accuracy                         │
│  └── Content Lifespan:     2-3 weeks (relevance-based)          │
│                                                                  │
│  MESSAGING                                                       │
│  ├── Messages/Day:         1+ billion                           │
│  └── InMail Delivery:      Async with receipts                  │
│                                                                  │
│  INFRASTRUCTURE                                                  │
│  ├── Kafka Messages/Day:   7 trillion                           │
│  ├── Kafka Clusters:       100+                                 │
│  ├── Kafka Brokers:        4,000+                               │
│  └── Kafka Topics:         100,000+                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feed Ranking Signals (360Brew - 2025)

| Signal Category | Examples | Weight |
|-----------------|----------|--------|
| **Relevance** | Industry match, job function, interests | High |
| **Expertise** | Author credentials, content quality | High |
| **Dwell Time Prediction** | Expected read time, scroll depth | Very High |
| **Engagement** | Likes, comments, shares | Medium |
| **Recency** | Post age (up to 2-3 weeks if relevant) | Medium |
| **Connection Strength** | 1st vs 2nd degree, interaction history | High |
| **Content Type** | Article, image, video, poll | Medium |
| **Comment Quality** | Thoughtful comments from relevant fields | High |
| **Spam Score** | Clickbait detection, policy violations | Filter |

---

## When to Use This Design

| Scenario | Applicable | Notes |
|----------|------------|-------|
| Professional networking platform | Yes | Primary use case |
| Job marketplace / recruiting | Yes | Two-sided matching |
| B2B social platform | Yes | Enterprise features |
| Consumer social network | Partial | Different engagement model |
| Real-time news feed | No | Use Twitter design |
| Friend-focused network | No | Use Facebook design |
| Dating/matching app | No | Use Tinder design |

---

## Technology Stack Reference

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Graph Database** | LIquid | Professional connections, degrees |
| **NoSQL** | Espresso | Messages, profiles, distributed storage |
| **Relational** | MySQL | Jobs, companies, structured data |
| **Cache** | Redis | Feed cache, sessions, real-time data |
| **Derived Data** | Venice | Pre-computed analytics, features |
| **Streaming** | Kafka + Samza | Event processing, notifications |
| **Search** | Galene | Job search, people search |
| **ML Serving** | GLMix, LiGNN | Ranking, recommendations |
| **Feature Store** | Custom | ML feature serving |
| **Real-time** | Play + Akka | Presence, SSE connections |

---

## Interview Readiness Checklist

- [ ] Can explain bidirectional connection model vs unidirectional (Twitter)
- [ ] Understand LIquid graph architecture and bidirectional BFS
- [ ] Know 360Brew feed ranking and why dwell time > engagement
- [ ] Can design job matching as two-sided marketplace
- [ ] Understand Espresso distributed messaging architecture
- [ ] Know PYMK recommendation pipeline with LiGNN
- [ ] Can discuss B2B data isolation for Recruiter/Sales Navigator
- [ ] Understand multi-region deployment for professional platform
- [ ] Can analyze bottlenecks: graph traversal, job matching, feed freshness

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                    LINKEDIN QUICK REFERENCE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  KEY DIFFERENTIATORS:                                           │
│  • Bidirectional connections (mutual consent)                   │
│  • Dwell time > engagement (professional value)                 │
│  • Two-sided job marketplace                                    │
│  • B2B monetization (not consumer ads)                          │
│                                                                  │
│  CORE COMPONENTS:                                                │
│  • LIquid Graph:  270B edges, 2M QPS, <50ms                     │
│  • 360Brew Feed:  300+ signals, dwell time focus                │
│  • Job Matching:  GLMix, Galene search                          │
│  • InMail:        Espresso NoSQL, plugin architecture           │
│                                                                  │
│  INTERVIEW FOCUS AREAS:                                          │
│  1. Bidirectional edge consistency                              │
│  2. PYMK at scale (LiGNN)                                       │
│  3. Dwell time prediction                                       │
│  4. Two-sided job matching                                      │
│  5. B2B data isolation                                          │
│                                                                  │
│  KEY TRADE-OFFS:                                                 │
│  • Strong consistency for connections (vs eventual)             │
│  • Hybrid feed (pre-compute + real-time merge)                  │
│  • 30K connection limit (graph quality vs growth)               │
│  • Async InMail delivery (scale vs latency)                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Designs

| Design | Relevance | Link |
|--------|-----------|------|
| Facebook | Social graph patterns, TAO architecture | [4.1-facebook](../4.1-facebook/00-index.md) |
| Twitter | Feed ranking, fan-out patterns | [4.2-twitter](../4.2-twitter/00-index.md) |
| Instagram | Image-heavy social, stories | [4.3-instagram](../4.3-instagram/00-index.md) |
| Recommendation Engine | ML ranking patterns | [3.12-recommendation-engine](../3.12-recommendation-engine/00-index.md) |
| Graph Database | Graph storage patterns | [3.14-vector-database](../3.14-vector-database/00-index.md) |
| Feature Store | ML feature serving | [3.16-feature-store](../3.16-feature-store/00-index.md) |

---

*Next: [01 - Requirements & Estimations →](./01-requirements-and-estimations.md)*
