# High-Level Design — Email Delivery System

## 1. System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        REST[REST API Client<br/>JSON Payload]
        SMTP_IN[SMTP Relay Client<br/>RFC 5321]
        SDK[Language SDKs<br/>Node · Python · Go · Java]
        WEBHOOK_IN[Webhook Triggers<br/>Event-Driven Sends]
    end

    subgraph Ingestion["Ingestion Layer"]
        APIGW[API Gateway<br/>Rate Limit · Auth · Validation]
        SMTP_SRV[SMTP Ingestion Server<br/>STARTTLS · Auth]
        VALIDATE[Validation Service<br/>Schema · Suppression · Domain Check]
    end

    subgraph Processing["Processing Layer"]
        TEMPLATE[Template Engine<br/>MJML Render · Handlebars]
        PERSONALIZE[Personalization Service<br/>Merge Tags · Conditional Blocks]
        AUTH_SIGN[Authentication Signer<br/>DKIM · ARC · Headers]
        CAMPAIGN[Campaign Orchestrator<br/>Scheduling · A/B · Segmentation]
    end

    subgraph Queuing["Queue Layer"]
        PRIORITY_Q[Priority Queue<br/>Transactional · Marketing]
        DOMAIN_Q[Domain Queues<br/>Per-ISP Partitioning]
        RETRY_Q[Retry Queue<br/>Exponential Backoff]
        SCHED_Q[Scheduled Queue<br/>Future Sends]
    end

    subgraph Delivery["Delivery Layer"]
        MTA[MTA Fleet<br/>SMTP Delivery · TLS · Connection Pool]
        THROTTLE[Throttle Controller<br/>Per-ISP Rate Management]
        IP_MGR[IP Pool Manager<br/>Warming · Rotation · Reputation]
        DNS_CACHE[DNS Resolver Cache<br/>MX · A · AAAA Lookups]
    end

    subgraph Feedback["Feedback Layer"]
        BOUNCE[Bounce Processor<br/>Hard/Soft Classification]
        FBL[Feedback Loop Handler<br/>ARF Complaint Processing]
        UNSUB[Unsubscribe Handler<br/>RFC 8058 One-Click]
    end

    subgraph Tracking["Tracking Layer"]
        PIXEL[Open Tracking Server<br/>1x1 Pixel · Bot Detection]
        CLICK[Click Tracking Proxy<br/>Redirect · Link Wrapping]
        EVENT_PROC[Event Processor<br/>Deduplication · Classification]
    end

    subgraph Notification["Webhook Layer"]
        WEBHOOK_OUT[Webhook Dispatcher<br/>Event Fanout · HMAC Signing]
        WEBHOOK_Q[Webhook Queue<br/>Retry · Dead Letter]
    end

    subgraph Data["Data Layer"]
        RELDB[(Relational DB<br/>Accounts · Domains · Config)]
        MSGSTORE[(Message Store<br/>Content · Metadata)]
        SUPPRESS[(Suppression Store<br/>Bloom Filter · Hash Index)]
        TSDB[(Time-Series DB<br/>Events · Metrics)]
        CACHE[(Distributed Cache<br/>Templates · DNS · Sessions)]
        SEARCHDB[(Search Index<br/>Logs · Events)]
        LAKE[(Data Lake<br/>Analytics · ML Training)]
    end

    subgraph Intelligence["Intelligence Layer"]
        REPUTATION[Reputation Engine<br/>IP · Domain Scoring]
        DELIVER_OPT[Deliverability Optimizer<br/>ISP Signal Analysis]
        SPAM_SCORE[Spam Score Predictor<br/>Content Analysis]
    end

    REST --> APIGW
    SMTP_IN --> SMTP_SRV
    SDK --> APIGW
    WEBHOOK_IN --> APIGW

    APIGW --> VALIDATE
    SMTP_SRV --> VALIDATE

    VALIDATE --> SUPPRESS
    VALIDATE --> TEMPLATE
    TEMPLATE --> PERSONALIZE
    PERSONALIZE --> AUTH_SIGN
    CAMPAIGN --> SCHED_Q

    AUTH_SIGN --> PRIORITY_Q
    PRIORITY_Q --> DOMAIN_Q
    SCHED_Q --> DOMAIN_Q
    DOMAIN_Q --> THROTTLE
    THROTTLE --> MTA
    MTA --> DNS_CACHE
    IP_MGR --> MTA

    MTA --> BOUNCE
    MTA --> RETRY_Q
    RETRY_Q --> DOMAIN_Q
    BOUNCE --> SUPPRESS
    FBL --> SUPPRESS
    UNSUB --> SUPPRESS

    PIXEL --> EVENT_PROC
    CLICK --> EVENT_PROC
    EVENT_PROC --> TSDB
    EVENT_PROC --> WEBHOOK_OUT
    BOUNCE --> WEBHOOK_OUT
    WEBHOOK_OUT --> WEBHOOK_Q

    REPUTATION --> IP_MGR
    DELIVER_OPT --> THROTTLE
    SPAM_SCORE --> VALIDATE

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef intelligence fill:#fce4ec,stroke:#c62828,stroke-width:2px

    class REST,SMTP_IN,SDK,WEBHOOK_IN client
    class APIGW,SMTP_SRV api
    class VALIDATE,TEMPLATE,PERSONALIZE,AUTH_SIGN,CAMPAIGN,MTA,THROTTLE,IP_MGR,DNS_CACHE,BOUNCE,FBL,UNSUB,PIXEL,CLICK,EVENT_PROC,WEBHOOK_OUT service
    class RELDB,MSGSTORE,TSDB,SEARCHDB,LAKE data
    class CACHE cache
    class PRIORITY_Q,DOMAIN_Q,RETRY_Q,SCHED_Q,WEBHOOK_Q queue
    class SUPPRESS data
    class REPUTATION,DELIVER_OPT,SPAM_SCORE intelligence
```

---

## 2. Data Flow: Transactional Email (Critical Path)

```mermaid
sequenceDiagram
    participant Client as API Client
    participant GW as API Gateway
    participant Val as Validator
    participant Supp as Suppression Check
    participant Tmpl as Template Engine
    participant Sign as DKIM Signer
    participant PQ as Priority Queue
    participant DQ as Domain Queue
    participant Throt as Throttle Controller
    participant MTA as MTA
    participant ISP as Receiving ISP
    participant Track as Event Processor
    participant WH as Webhook Dispatcher

    Client->>GW: POST /v1/mail/send (API key + payload)
    GW->>GW: Rate limit check + auth
    GW->>Val: Validate payload (schema, sender domain)
    Val->>Supp: Check recipient against suppression list
    Supp-->>Val: NOT suppressed ✓
    Val->>Tmpl: Render template (MJML → HTML)
    Tmpl->>Tmpl: Inject tracking pixel + wrap links
    Tmpl->>Sign: Add DKIM signature + headers
    Sign->>PQ: Enqueue (priority: TRANSACTIONAL)
    PQ-->>Client: 202 Accepted (message_id: msg_xxx)

    Note over PQ,DQ: Async boundary — client receives response

    PQ->>DQ: Route to gmail.com queue
    DQ->>Throt: Check ISP rate budget
    Throt->>MTA: Dispatch (IP pool: shared-warm-1)
    MTA->>MTA: DNS MX lookup (cached)
    MTA->>ISP: SMTP EHLO → STARTTLS → MAIL FROM → RCPT TO → DATA
    ISP-->>MTA: 250 OK (accepted)
    MTA->>Track: Emit DELIVERED event
    Track->>WH: Dispatch webhook

    Note over ISP: Later — recipient opens email
    ISP->>Track: GET /pixel/track/{msg_id}.gif
    Track->>Track: Bot detection (user-agent, timing)
    Track->>WH: Emit OPENED event (human_open: true)

    Note over ISP: Recipient clicks link
    ISP->>Track: GET /click/{encoded_link}
    Track->>Track: Decode original URL + log
    Track-->>ISP: 302 Redirect to original URL
    Track->>WH: Emit CLICKED event
```

---

## 3. Data Flow: Marketing Campaign

```mermaid
sequenceDiagram
    participant User as Marketer
    participant UI as Dashboard
    participant Camp as Campaign Orchestrator
    participant Seg as Segmentation Engine
    participant AB as A/B Test Engine
    participant Gen as Message Generator
    participant PQ as Priority Queue
    participant DQ as Domain Queues
    participant MTA as MTA Fleet
    participant ISP as ISPs

    User->>UI: Create campaign (template, audience, schedule)
    UI->>Camp: Schedule campaign (send_at: 2026-03-10 09:00 UTC)

    Note over Camp: At scheduled time
    Camp->>Seg: Resolve audience segment (1.5M recipients)
    Seg-->>Camp: Recipient list with merge fields
    Camp->>AB: Split into variants (A: 10%, B: 10%, hold: 80%)
    AB->>Gen: Generate A variant (subject line A)
    AB->>Gen: Generate B variant (subject line B)

    loop Batch Processing (10K per batch)
        Gen->>Gen: Render templates + personalize
        Gen->>Gen: Check suppression list
        Gen->>Gen: DKIM sign
        Gen->>PQ: Enqueue batch (priority: MARKETING)
    end

    PQ->>DQ: Distribute to per-ISP queues

    Note over DQ,MTA: Throttled delivery over 2-4 hours
    loop Per-ISP Throttling
        DQ->>MTA: Deliver batch to gmail.com (rate: 500/sec)
        DQ->>MTA: Deliver batch to outlook.com (rate: 300/sec)
        DQ->>MTA: Deliver batch to yahoo.com (rate: 200/sec)
    end

    MTA->>ISP: SMTP delivery (TLS 1.3)

    Note over AB: After 4 hours — evaluate A/B results
    AB->>AB: Winner = Variant B (18% open vs 14%)
    AB->>Gen: Generate winner variant for remaining 80%
    Gen->>PQ: Enqueue remaining 1.2M messages
```

---

## 4. Data Flow: Bounce Processing

```mermaid
flowchart LR
    subgraph Sources["Bounce Sources"]
        SYNC[Synchronous Bounce<br/>SMTP 5xx/4xx Response]
        ASYNC[Asynchronous Bounce<br/>NDR Email Received]
        FBL_IN[Feedback Loop<br/>ARF Complaint Report]
    end

    subgraph Classification["Bounce Classifier"]
        PARSE[SMTP Code Parser<br/>RFC 3463 Enhanced Codes]
        NDR_PARSE[NDR Body Parser<br/>Regex · ML Classification]
        CLASSIFY{Classify Bounce<br/>Type}
    end

    subgraph Actions["Actions"]
        HARD[Hard Bounce<br/>Permanent Failure]
        SOFT[Soft Bounce<br/>Temporary Failure]
        COMPLAINT[Spam Complaint<br/>User Reported]
    end

    subgraph Outcomes["Outcomes"]
        SUPPRESS_ADD[Add to Suppression<br/>Immediate Block]
        RETRY_ENQ[Enqueue for Retry<br/>Exponential Backoff]
        REPUTATION_UPD[Update IP Reputation<br/>Score Adjustment]
        WEBHOOK_EMIT[Emit Webhook Event<br/>Notify Customer]
        ANALYTICS[Update Analytics<br/>Bounce Rate Tracking]
    end

    SYNC --> PARSE
    ASYNC --> NDR_PARSE
    FBL_IN --> CLASSIFY

    PARSE --> CLASSIFY
    NDR_PARSE --> CLASSIFY

    CLASSIFY -->|550 User unknown| HARD
    CLASSIFY -->|452 Mailbox full| SOFT
    CLASSIFY -->|ARF report| COMPLAINT

    HARD --> SUPPRESS_ADD
    HARD --> WEBHOOK_EMIT
    HARD --> REPUTATION_UPD
    HARD --> ANALYTICS

    SOFT --> RETRY_ENQ
    SOFT --> ANALYTICS
    SOFT -->|3+ soft bounces| SUPPRESS_ADD

    COMPLAINT --> SUPPRESS_ADD
    COMPLAINT --> WEBHOOK_EMIT
    COMPLAINT --> REPUTATION_UPD
    COMPLAINT --> ANALYTICS

    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef classify fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef hard fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef soft fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef complaint fill:#fce4ec,stroke:#c62828,stroke-width:2px
    classDef outcome fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class SYNC,ASYNC,FBL_IN source
    class PARSE,NDR_PARSE,CLASSIFY classify
    class HARD hard
    class SOFT soft
    class COMPLAINT complaint
    class SUPPRESS_ADD,RETRY_ENQ,REPUTATION_UPD,WEBHOOK_EMIT,ANALYTICS outcome
```

---

## 5. Key Architectural Decisions

### 5.1 Architecture Pattern Checklist

| Decision | Choice | Justification |
|---|---|---|
| **Sync vs Async** | Async for delivery; sync for API acceptance | API returns 202 immediately; delivery happens asynchronously through queue pipeline |
| **Event-driven vs Request-response** | Event-driven for pipeline | Message lifecycle events (queued, sent, delivered, opened) flow through event stream |
| **Push vs Pull** | Push for delivery + webhooks; Pull for analytics | MTA pushes to ISPs; webhooks push to customers; analytics dashboards pull on demand |
| **Stateless vs Stateful** | Stateless services + stateful MTA connections | SMTP connections are inherently stateful; all other services are stateless and horizontally scalable |
| **Read-heavy vs Write-heavy** | Write-heavy for delivery; Read-heavy for analytics | Ingestion and delivery are write-dominated; dashboards and reports are read-dominated |
| **Real-time vs Batch** | Real-time for transactional; Batch for campaigns | Transactional emails require sub-second queuing; campaigns batch for ISP-friendly throttling |
| **Edge vs Origin** | Edge for tracking; Origin for delivery | Open/click tracking servers deployed at edge PoPs; MTA fleet at origin data centers |

### 5.2 Monolith vs Microservices

**Choice: Microservices with domain boundaries**

| Domain | Services | Justification |
|---|---|---|
| **Ingestion** | API Gateway, SMTP Server, Validator | Different protocols (HTTP vs SMTP) with independent scaling needs |
| **Processing** | Template Engine, DKIM Signer, Personalization | CPU-intensive rendering scales independently from I/O-bound delivery |
| **Delivery** | MTA Fleet, Throttle Controller, IP Manager | Core delivery path with unique scaling (per-ISP connection pools) |
| **Feedback** | Bounce Processor, FBL Handler, Unsubscribe | Inbound processing with different traffic patterns than outbound |
| **Tracking** | Pixel Server, Click Proxy, Event Processor | Extremely high QPS (billions of requests/month) with CDN-like deployment |
| **Intelligence** | Reputation Engine, Deliverability Optimizer | ML workloads with GPU requirements and batch processing |

### 5.3 Database Strategy (Polyglot Persistence)

| Data Type | Store Type | Technology | Justification |
|---|---|---|---|
| **Account/domain config** | Relational DB | PostgreSQL | Structured data with referential integrity, low write volume |
| **Message metadata** | Wide-column store | Cassandra / ScyllaDB | Time-series message logs with high write throughput, TTL-based expiry |
| **Message content** | Object storage | Blob store | Large HTML bodies with 30-day retention, no query requirements |
| **Suppression lists** | Key-value store + Bloom filter | Redis + RocksDB | Sub-millisecond lookup for every outgoing message; bloom filter for fast negative |
| **Engagement events** | Time-series DB | ClickHouse / TimescaleDB | High-cardinality event data with time-windowed aggregations |
| **Template storage** | Document store | MongoDB | Semi-structured templates with versioning and rich querying |
| **DNS cache** | In-memory store | Local LRU cache + Redis | MX/A record caching with TTL-based invalidation |
| **Analytics** | Columnar store | ClickHouse | Fast OLAP queries across billions of events |
| **Search/logs** | Search engine | OpenSearch | Full-text search across email logs and events |

### 5.4 Queue Architecture

The multi-stage queue is the system's defining architectural element:

```
API → [Priority Queue] → [Domain Queue] → [Connection Queue] → MTA → ISP
         ↓                    ↓                  ↓
    Transactional         gmail.com          IP-1 → gmail
    Marketing             outlook.com        IP-2 → gmail
    Scheduled             yahoo.com          IP-3 → outlook
                          custom-domain      IP-4 → yahoo
```

**Stage 1: Priority Queue** — Separates transactional (immediate) from marketing (throttled) traffic. Transactional messages bypass scheduling and throttling delays.

**Stage 2: Domain Queue** — Partitions messages by recipient domain. Each ISP has different rate limits, connection policies, and throttling behavior. Per-domain queues enable independent rate control.

**Stage 3: Connection Queue** — Maps messages to specific sending IPs and SMTP connections. Ensures even distribution across the IP pool and respects per-IP rate limits at each ISP.

### 5.5 Caching Strategy

| Cache Layer | Data | TTL | Hit Rate Target |
|---|---|---|---|
| **L1 (Local)** | DNS MX records, compiled templates, DKIM keys | 5-60 min | > 99% |
| **L2 (Distributed)** | Suppression bloom filter, domain config, IP reputation | 1-15 min | > 95% |
| **L3 (CDN Edge)** | Tracking pixel responses (304 Not Modified), click redirect pages | 0 (no cache) | N/A (tracking must be unique) |

### 5.6 Message Queue Technology

**Choice: Distributed log (Kafka-style) for event streaming + specialized MTA queues for SMTP delivery**

| Queue Type | Technology | Justification |
|---|---|---|
| **Event stream** | Kafka / Pulsar | Durable, ordered, replayable event log for message lifecycle events |
| **MTA delivery queue** | Custom on-disk queue | SMTP delivery requires per-domain partitioning, connection affinity, and retry scheduling that generic message brokers don't optimize for |
| **Webhook delivery** | Redis-backed queue | High throughput, low latency, with dead-letter support |
| **Scheduled sends** | Sorted set (Redis) or delay queue | Efficient time-based dequeue for future-scheduled messages |

---

## 6. Multi-Tenant Architecture

```mermaid
flowchart TB
    subgraph Tenants["Customer Tiers"]
        FREE[Free Tier<br/>Shared IPs · Rate Limited]
        PRO[Pro Tier<br/>Shared Pool · Higher Limits]
        ENT[Enterprise<br/>Dedicated IPs · Custom Config]
        DEDICATED[Dedicated Infra<br/>Isolated MTA · Custom Domain]
    end

    subgraph IPPools["IP Pool Management"]
        SHARED_WARM[Shared Warm Pool<br/>200 IPs · Mixed Reputation]
        SHARED_PREM[Shared Premium Pool<br/>100 IPs · High Reputation]
        DEDICATED_POOL[Dedicated Pools<br/>Per-Customer IPs]
        WARMING_POOL[Warming Pool<br/>New IPs · Gradual Ramp]
    end

    subgraph Isolation["Isolation Mechanisms"]
        RATE[Rate Limiter<br/>Per-Account · Per-Minute]
        QUALITY[Quality Gate<br/>Bounce Rate · Complaint Monitor]
        QUARANTINE[Quarantine<br/>Auto-Suspend Bad Senders]
    end

    FREE --> SHARED_WARM
    PRO --> SHARED_PREM
    ENT --> DEDICATED_POOL
    DEDICATED --> DEDICATED_POOL

    SHARED_WARM --> QUALITY
    SHARED_PREM --> QUALITY
    QUALITY -->|Exceeds threshold| QUARANTINE
    QUALITY -->|Within limits| RATE

    classDef free fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef pro fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ent fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef ded fill:#fce4ec,stroke:#c62828,stroke-width:2px
    classDef pool fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef gate fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class FREE free
    class PRO pro
    class ENT ent
    class DEDICATED ded
    class SHARED_WARM,SHARED_PREM,DEDICATED_POOL,WARMING_POOL pool
    class RATE,QUALITY,QUARANTINE gate
```

---

## 7. Deployment Architecture

| Component | Deployment Model | Scaling Unit |
|---|---|---|
| **API Gateway** | Horizontally scaled behind load balancer | Per-request; auto-scale on QPS |
| **SMTP Ingestion** | Dedicated fleet with connection affinity | Per-connection; scale on concurrent connections |
| **Template Engine** | Stateless worker pool | Per-CPU; scale on render queue depth |
| **MTA Fleet** | Regional fleets with IP affinity | Per-IP; each MTA instance manages a set of sending IPs |
| **Bounce Processor** | Consumer group on event stream | Per-partition; scale on bounce event volume |
| **Tracking Servers** | Edge-deployed, globally distributed | Per-region; scale on pixel/click request volume |
| **Webhook Dispatcher** | Worker pool with queue consumers | Per-webhook; scale on event backlog |
| **Analytics Pipeline** | Stream processors + batch aggregators | Per-partition for stream; per-query for batch |

---

*Previous: [Requirements & Estimations](./01-requirements-and-estimations.md) | Next: [Low-Level Design ->](./03-low-level-design.md)*
