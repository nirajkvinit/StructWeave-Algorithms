# High-Level Design — Push Notification System

## 1. System Architecture

### 1.1 Architecture Overview

The Push Notification System follows an event-driven microservices architecture with a multi-stage pipeline: **Ingestion → Resolution → Rendering → Scheduling → Fan-Out → Delivery → Feedback**. Each stage is decoupled via message queues, enabling independent scaling and fault isolation. The system uses CQRS for the device registry (high-read token lookups separated from write-heavy token updates) and an adapter pattern for provider integration (abstracting APNs, FCM, HMS, and Web Push behind a unified delivery interface).

```mermaid
---
config:
  theme: neutral
  look: neo
---
flowchart TB
    subgraph Clients["Notification Sources"]
        C1["Internal Services<br/>(Order, Auth, Chat)"]
        C2["Campaign Manager<br/>(Marketing Console)"]
        C3["Event Triggers<br/>(Behavioral Rules)"]
    end

    subgraph Ingestion["Ingestion Layer"]
        API["API Gateway<br/>+ Rate Limiter"]
        VAL["Request Validator<br/>+ Schema Check"]
        PQ["Priority Router"]
    end

    subgraph Processing["Processing Pipeline"]
        SEG["Segmentation<br/>Engine"]
        RES["Target Resolver<br/>(User → Devices)"]
        TPL["Template<br/>Renderer"]
        SCHED["Scheduling<br/>Service"]
        DEDUP["Deduplication<br/>Engine"]
    end

    subgraph FanOut["Fan-Out Layer"]
        FO["Fan-Out<br/>Coordinator"]
        PW1["Provider Workers<br/>(APNs Pool)"]
        PW2["Provider Workers<br/>(FCM Pool)"]
        PW3["Provider Workers<br/>(HMS Pool)"]
        PW4["Provider Workers<br/>(Web Push Pool)"]
    end

    subgraph Providers["External Providers"]
        APNS["APNs<br/>(Apple)"]
        FCMS["FCM<br/>(Google)"]
        HMSS["HMS Push Kit<br/>(Huawei)"]
        WPUSH["Web Push<br/>Services"]
    end

    subgraph DataStores["Data Layer"]
        DR[("Device<br/>Registry")]
        UPS[("User<br/>Preferences")]
        NL[("Notification<br/>Log")]
        TS[("Template<br/>Store")]
        ADB[("Analytics<br/>Store")]
    end

    subgraph Feedback["Feedback & Analytics"]
        FBP["Feedback<br/>Processor"]
        AE["Analytics<br/>Engine"]
        DASH["Dashboards<br/>& Reports"]
    end

    C1 & C2 & C3 --> API
    API --> VAL --> PQ
    PQ -->|"High Priority<br/>Queue"| SEG
    PQ -->|"Normal Priority<br/>Queue"| SEG
    SEG --> RES
    RES --> TPL
    TPL --> DEDUP
    DEDUP --> SCHED
    SCHED --> FO
    FO --> PW1 & PW2 & PW3 & PW4
    PW1 --> APNS
    PW2 --> FCMS
    PW3 --> HMSS
    PW4 --> WPUSH

    RES -.->|"lookup"| DR
    RES -.->|"check prefs"| UPS
    TPL -.->|"fetch template"| TS
    DEDUP -.->|"check sent"| NL
    FBP -.->|"update tokens"| DR
    FBP -.->|"write events"| ADB
    AE -.->|"aggregate"| ADB
    AE --> DASH

    APNS & FCMS & HMSS & WPUSH -.->|"delivery feedback"| FBP

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef external fill:#fce4ec,stroke:#b71c1c,stroke-width:2px

    class C1,C2,C3 client
    class API,VAL,PQ api
    class SEG,RES,TPL,SCHED,DEDUP,FO,FBP,AE service
    class PW1,PW2,PW3,PW4 queue
    class DR,UPS,NL,TS,ADB data
    class APNS,FCMS,HMSS,WPUSH external
    class DASH cache
```

---

## 2. Data Flow

### 2.1 Transactional Notification Flow (Single User)

A transactional notification (e.g., OTP code, order confirmation) targets a specific user and requires low-latency delivery.

```mermaid
---
config:
  theme: neutral
  look: neo
---
sequenceDiagram
    participant Caller as Calling Service
    participant API as Ingestion API
    participant Q as Priority Queue
    participant Resolver as Target Resolver
    participant DR as Device Registry
    participant UP as User Preferences
    participant TPL as Template Renderer
    participant FO as Fan-Out Engine
    participant APNs as APNs Adapter
    participant FCM as FCM Adapter
    participant Apple as APNs (Apple)
    participant Google as FCM (Google)
    participant FB as Feedback Processor

    Caller->>API: POST /v1/notifications {user_id, template, data, priority: HIGH}
    API->>API: Validate + authenticate + rate check
    API-->>Caller: 202 Accepted {notification_id}
    API->>Q: Enqueue (high-priority)

    Q->>Resolver: Dequeue notification
    Resolver->>DR: Get devices for user_id
    DR-->>Resolver: [{token: "abc", platform: "ios"}, {token: "xyz", platform: "android"}]
    Resolver->>UP: Check user preferences for category
    UP-->>Resolver: {push_enabled: true, quiet_hours: null}

    Resolver->>TPL: Render template with user data + locale
    TPL-->>Resolver: {title: "Order Shipped", body: "Your order #1234 is on the way", deep_link: "app://orders/1234"}

    Resolver->>FO: Fan out to 2 devices
    FO->>APNs: Send to iOS device (token: abc)
    FO->>FCM: Send to Android device (token: xyz)

    APNs->>Apple: HTTP/2 POST /3/device/abc
    Apple-->>APNs: 200 OK {apns-id: "uuid"}
    APNs->>FB: Delivery event {status: accepted, provider: apns}

    FCM->>Google: POST /v1/projects/*/messages:send
    Google-->>FCM: 200 OK {name: "projects/*/messages/123"}
    FCM->>FB: Delivery event {status: accepted, provider: fcm}

    FB->>FB: Update notification log + analytics
```

### 2.2 Campaign Notification Flow (Mass Fan-Out)

A marketing campaign targets a segment (e.g., "users in US who haven't opened app in 7 days") and requires controlled fan-out.

```mermaid
---
config:
  theme: neutral
  look: neo
---
sequenceDiagram
    participant CM as Campaign Manager
    participant API as Ingestion API
    participant SCHED as Scheduler
    participant SEG as Segmentation Engine
    participant UDB as User Attribute Store
    participant DR as Device Registry
    participant FO as Fan-Out Coordinator
    participant W1 as Worker Pool 1
    participant W2 as Worker Pool 2
    participant Providers as Provider Adapters
    participant AN as Analytics Pipeline

    CM->>API: POST /v1/campaigns {segment, template, schedule, A/B config}
    API-->>CM: 202 Accepted {campaign_id}
    API->>SCHED: Schedule for 10:00 AM per-timezone

    Note over SCHED: Time triggers at 10:00 AM EST
    SCHED->>SEG: Evaluate segment for EST timezone
    SEG->>UDB: Query: country=US AND last_active < 7d AND timezone=EST
    UDB-->>SEG: 2.5M matching user IDs

    SEG->>DR: Batch resolve user IDs → device tokens
    DR-->>SEG: 5.2M device tokens (2.5M users × ~2 devices)

    SEG->>FO: Fan-out request: 5.2M tokens, partitioned
    FO->>FO: Partition by provider: 3.1M FCM, 1.6M APNs, 300K HMS, 200K Web

    par APNs Fan-Out
        FO->>W1: 1.6M APNs tokens (batched in 1000-token chunks)
        W1->>Providers: HTTP/2 multiplexed sends
    and FCM Fan-Out
        FO->>W2: 3.1M FCM tokens (500-token multicast batches)
        W2->>Providers: Multicast API calls
    end

    Providers-->>AN: Stream delivery events
    AN->>AN: Real-time aggregation: sent/delivered/failed counts
```

---

## 3. Key Architectural Decisions

### 3.1 Decision Log

| Decision | Choice | Alternatives Considered | Rationale |
|---|---|---|---|
| **Service architecture** | Microservices with pipeline stages | Monolith, serverless functions | Each pipeline stage has fundamentally different scaling characteristics (segmentation is CPU-bound, fan-out is I/O-bound, feedback is event-driven); independent scaling is essential |
| **Inter-service communication** | Async message queues between pipeline stages | Synchronous REST/gRPC calls | Queue-based decoupling absorbs traffic spikes, enables backpressure, and prevents cascading failures when providers throttle |
| **Priority handling** | Separate queue lanes (high/normal/low) | Single queue with priority field | Separate queues ensure transactional notifications (OTP, security alerts) are never delayed behind a 100M-device marketing campaign |
| **Provider integration** | Adapter pattern with per-provider worker pools | Unified abstraction with single pool | Per-provider pools allow independent scaling (more APNs workers during iOS peak, more FCM workers during Android peak) and isolated failure domains |
| **Device registry** | Wide-column NoSQL with caching layer | Relational DB, pure in-memory | 2B tokens requires horizontal sharding; wide-column store supports user_id partitioning with device-level columns; cache handles hot-path reads |
| **Fan-out strategy** | Pre-materialized device lists + partitioned parallel workers | Lazy resolution during send, topic-based provider broadcast | Pre-materialization allows per-device personalization and preference checking; provider topic broadcast cannot customize per user |
| **Delivery tracking** | Event-sourced notification status log | Mutable status field on notification record | Append-only event log captures the full lifecycle (queued → sent → delivered → opened) without update contention; enables reliable analytics |
| **Scheduling** | Distributed timer wheel with timezone partitioning | Cron-based scheduler, delay queues | Timer wheel handles millions of scheduled sends efficiently; timezone partitioning distributes load across the rolling global peak |
| **Template rendering** | Server-side rendering at send time | Client-side rendering, pre-rendered at ingest | Server-side ensures consistent rendering; send-time rendering allows dynamic data (e.g., current price in a sale notification) |
| **Analytics** | Stream processing for real-time + batch for aggregation | Pure batch (hourly rollups), pure stream | Real-time stream enables live campaign monitoring; batch handles expensive aggregations (funnel analysis, cohort comparison) |

### 3.2 Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---|---|---|
| **Sync vs Async** | Async (queue-based pipeline) | Callers must not block on delivery; 202 Accepted response with async processing |
| **Event-driven vs Request-response** | Event-driven between pipeline stages | Each notification generates a cascade of events (resolved, rendered, sent, delivered) that flow through the pipeline |
| **Push vs Pull** | Push to providers, pull from queues | Workers pull from partitioned queues for backpressure; final delivery pushes to provider APIs |
| **Stateless vs Stateful** | Stateless services, stateful connections | Services are horizontally scalable; APNs HTTP/2 connections are stateful (persistent) but managed in connection pools |
| **Read-heavy vs Write-heavy** | Write-heavy (10:1 write:read) | System is dominated by notification sends (writes); reads are analytics queries and preference lookups |
| **Real-time vs Batch** | Real-time for delivery, batch for analytics | Transactional notifications require real-time processing; analytics aggregation can be batch |
| **Edge vs Origin** | Origin processing, edge delivery (via providers) | Providers own the edge delivery (CDN-like); all logic runs at origin |

---

## 4. Component Interaction Model

### 4.1 Queue Topology

The system uses a multi-lane queue topology to isolate traffic classes and enable per-stage backpressure:

```mermaid
---
config:
  theme: neutral
  look: neo
---
flowchart LR
    subgraph Ingest["Ingestion"]
        API["API Gateway"]
    end

    subgraph Queues["Queue Lanes"]
        HQ["High Priority<br/>Queue<br/>(Transactional)"]
        NQ["Normal Priority<br/>Queue<br/>(Marketing)"]
        LQ["Low Priority<br/>Queue<br/>(Digest/Batch)"]
        SQ["Scheduled<br/>Queue<br/>(Deferred)"]
        DLQ["Dead Letter<br/>Queue<br/>(Failed)"]
    end

    subgraph Workers["Worker Pools"]
        HP["High-Priority<br/>Workers<br/>(dedicated)"]
        NP["Normal-Priority<br/>Workers<br/>(elastic)"]
        LP["Low-Priority<br/>Workers<br/>(batch)"]
    end

    subgraph ProviderQueues["Provider Queues"]
        AQ["APNs<br/>Send Queue"]
        FQ["FCM<br/>Send Queue"]
        HMQ["HMS<br/>Send Queue"]
        WQ["Web Push<br/>Send Queue"]
    end

    API -->|"priority: HIGH"| HQ
    API -->|"priority: NORMAL"| NQ
    API -->|"priority: LOW"| LQ
    API -->|"scheduled"| SQ

    SQ -->|"timer fires"| HQ & NQ

    HQ --> HP
    NQ --> NP
    LQ --> LP

    HP & NP & LP --> AQ & FQ & HMQ & WQ

    AQ & FQ & HMQ & WQ -.->|"retry on failure"| DLQ

    classDef high fill:#ffcdd2,stroke:#b71c1c,stroke-width:2px
    classDef normal fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef low fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef provider fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef dead fill:#f5f5f5,stroke:#616161,stroke-width:2px

    class HQ,HP high
    class NQ,NP,SQ normal
    class LQ,LP low
    class AQ,FQ,HMQ,WQ provider
    class DLQ dead
    class API normal
```

### 4.2 Provider Connection Management

Each provider adapter maintains a pool of persistent connections optimized for the provider's protocol:

| Provider | Protocol | Connection Strategy | Batch Size | Auth Refresh |
|---|---|---|---|---|
| **APNs** | HTTP/2 multiplexed | 500–2,000 persistent connections; multiplex 500+ concurrent streams per connection | 1 (individual device per request, multiplexed) | JWT token rotated every 50 minutes (expires at 60 min) |
| **FCM** | HTTPS (HTTP v1 API) | Connection pool with keep-alive; 10K+ connections | 500 tokens per multicast request | OAuth 2.0 token cached, refreshed 5 min before expiry |
| **HMS** | HTTPS (Push Kit v2) | Connection pool similar to FCM | 1,000 tokens per batch | OAuth 2.0 with client credentials, 1-hour token TTL |
| **Web Push** | HTTPS to each browser's push service | Per-origin connection pooling; many distinct endpoints | 1 (each subscription has unique endpoint + encryption key) | VAPID JWT signed per request (or cached per endpoint origin) |

---

## 5. Cross-Cutting Concerns

### 5.1 Idempotency

Every notification carries an idempotency key (caller-provided or system-generated UUID). The deduplication engine checks this key against a sliding-window cache before processing. This prevents duplicate sends when callers retry after timeout (common during high-load periods when the API responds slowly).

### 5.2 Backpressure

When providers throttle (APNs returns 429, FCM returns QUOTA_EXCEEDED), the corresponding provider queue's consumers slow down using exponential backoff. The upstream fan-out coordinator detects queue depth growth and reduces its output rate, propagating backpressure up the pipeline. Critical: backpressure in one provider lane must not affect other providers—APNs throttling must not delay FCM delivery.

### 5.3 Graceful Degradation

| Failure Scenario | Degradation Strategy |
|---|---|
| APNs outage | Queue APNs messages; deliver FCM/HMS/Web normally; alert on growing APNs queue |
| Segmentation engine slow | Bypass segment evaluation for pre-cached segments; reject new segment campaigns with 503 |
| Device registry read timeout | Serve from cache (stale-while-revalidate); log cache-served percentage |
| Template service down | Fall back to raw text body from notification request (skip template rendering) |
| Analytics pipeline lag | Continue sending notifications; analytics are eventually consistent by design |

---

*Previous: [Requirements & Estimations](./01-requirements-and-estimations.md) | Next: [Low-Level Design ->](./03-low-level-design.md)*
