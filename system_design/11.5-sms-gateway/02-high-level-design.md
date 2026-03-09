# High-Level Design — SMS Gateway

## System Architecture

```mermaid
---
config:
  theme: neutral
  look: neo
---
flowchart TB
    subgraph Clients["Client Layer"]
        REST["REST API Clients"]
        SDK["SDK Integrations"]
        DASH["Dashboard UI"]
    end

    subgraph Gateway["API Gateway Layer"]
        LB["Load Balancer"]
        AG["API Gateway<br/>Auth · Rate Limit · Validation"]
    end

    subgraph Core["Core Services"]
        MS["Message Service<br/>Accept · Validate · Enqueue"]
        RE["Routing Engine<br/>Carrier Selection · LCR"]
        CE["Compliance Engine<br/>TCPA · Opt-Out · Content Filter"]
        ENC["Encoding Service<br/>GSM-7 · UCS-2 · UDH"]
        NS["Number Service<br/>Provisioning · Pool Mgmt"]
        SCHED["Scheduler Service<br/>Deferred Delivery"]
    end

    subgraph Carrier["Carrier Integration Layer"]
        CP["SMPP Connection Pool<br/>Per-Carrier TPS Throttle"]
        CM["Carrier Manager<br/>Health Monitor · Failover"]
        DLR["DLR Processor<br/>Status Normalization"]
        MO["MO Receiver<br/>Inbound Message Handler"]
    end

    subgraph Async["Async Processing"]
        MQ["Message Queue<br/>Partitioned by Region/Carrier"]
        WH["Webhook Dispatcher<br/>Retry with Backoff"]
        BILL["Billing Engine<br/>Usage Metering"]
    end

    subgraph Data["Data Layer"]
        PDB[("Message Store<br/>(Partitioned NoSQL)")]
        RDB[("Config Store<br/>(Relational DB)")]
        CACHE[("Route Cache<br/>(In-Memory)")]
        OPTOUT[("Opt-Out Store<br/>(Key-Value)")]
        TS[("Time-Series DB<br/>(Metrics)")]
    end

    subgraph External["External Systems"]
        SMSC1["Carrier A SMSC"]
        SMSC2["Carrier B SMSC"]
        SMSC3["Carrier N SMSC"]
        TCR["10DLC Registry<br/>(TCR/CSP)"]
    end

    REST & SDK & DASH --> LB --> AG
    AG --> MS
    MS --> CE --> ENC --> RE
    RE --> MQ
    MQ --> CP
    CP --> SMSC1 & SMSC2 & SMSC3
    SMSC1 & SMSC2 & SMSC3 --> DLR
    SMSC1 & SMSC2 & SMSC3 --> MO
    DLR --> MQ
    MO --> MQ
    MQ --> WH
    MS --> BILL
    CM --> CP
    NS --> TCR
    RE --> CACHE
    MS --> PDB
    DLR --> PDB
    NS --> RDB
    CE --> OPTOUT
    BILL --> TS
    SCHED --> MQ

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef carrier fill:#fce4ec,stroke:#b71c1c,stroke-width:2px
    classDef async fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef external fill:#efebe9,stroke:#4e342e,stroke-width:2px

    class REST,SDK,DASH client
    class LB,AG gateway
    class MS,RE,CE,ENC,NS,SCHED service
    class CP,CM,DLR,MO carrier
    class MQ,WH,BILL async
    class PDB,RDB,CACHE,OPTOUT,TS data
    class SMSC1,SMSC2,SMSC3,TCR external
```

---

## Key Architectural Decisions

### 1. Asynchronous Message Pipeline (Not Synchronous)

**Decision:** Messages are accepted into a durable queue before carrier submission, returning `202 Accepted` immediately.

**Why:** Carrier SMPP connections have unpredictable latency (10ms to 30s depending on carrier load). Synchronously waiting for carrier response would tie up API threads, create head-of-line blocking, and make API latency dependent on the slowest carrier. The async pattern decouples acceptance from delivery, allowing each layer to scale independently.

**Trade-off:** Customers receive a message SID immediately but must poll or use webhooks for delivery status. This is the industry standard for messaging APIs.

### 2. Carrier-Partitioned Queues (Not Destination-Partitioned)

**Decision:** Message queues are partitioned primarily by carrier, not by destination country or number.

**Why:** The critical constraint is per-carrier TPS limits. If queues were partitioned by country, a single carrier serving multiple countries could be overwhelmed by aggregate traffic from multiple queue partitions. Carrier-partitioned queues allow each consumer to enforce carrier-specific rate limits precisely. Secondary routing within each carrier partition handles geographic distribution.

**Trade-off:** Messages to the same destination may go through different queue partitions if multiple carriers serve that destination, making strict per-destination ordering harder (but ordering is rarely a requirement for SMS).

### 3. Connection Pooling with Per-Carrier TPS Enforcement

**Decision:** Each carrier connection is managed through a dedicated pool with token-bucket rate limiting at the pool level.

**Why:** Carriers enforce TPS limits strictly—exceeding them results in throttle errors (SMPP `0x00000058`), temporary bans, or connection termination. The connection pool acts as a precise throttle valve, ensuring submissions never exceed carrier-allowed rates while maximizing utilization up to the limit.

### 4. Event-Sourced Message State Machine

**Decision:** Message state transitions are modeled as an append-only event log, not mutable status fields.

**Why:** A message transitions through multiple states (accepted → queued → submitted → delivered/failed), and each transition carries different metadata (carrier response codes, DLR timestamps, retry counts). Event sourcing provides a complete audit trail, supports rebuilding current state from history, and prevents race conditions where simultaneous DLR and timeout events could corrupt a mutable status field.

### 5. Multi-Protocol Carrier Interface

**Decision:** Support SMPP v3.4/v5.0 as primary, with HTTP/HTTPS adapters for carriers offering REST APIs and SS7/SIGTRAN for legacy telco integration.

**Why:** While SMPP is the dominant protocol, modern carriers (especially cloud-native MVNOs) increasingly offer HTTP APIs. Legacy carriers in emerging markets may require SS7 integration. A protocol-agnostic carrier adapter layer isolates the core routing engine from carrier-specific protocol details.

### 6. Polyglot Persistence

**Decision:** Use different data stores for different access patterns.

| Store | Use Case | Why |
|---|---|---|
| Partitioned NoSQL | Message records, DLR history | Write-heavy, time-series partitioning, automatic TTL |
| Relational DB | Account config, number inventory, carrier config | Transactional consistency for billing and provisioning |
| In-memory cache | Route decisions, carrier scores, phone number metadata | Sub-millisecond reads for routing hot path |
| Key-value store | Opt-out lists, idempotency keys | High-throughput point lookups with TTL |
| Time-series DB | Delivery metrics, carrier health scores | Efficient aggregation for dashboards and alerting |

---

## Data Flow: Outbound Message (MT Path)

```mermaid
---
config:
  theme: neutral
  look: neo
---
sequenceDiagram
    participant C as Customer App
    participant API as API Gateway
    participant MS as Message Service
    participant CE as Compliance Engine
    participant ENC as Encoding Service
    participant RE as Routing Engine
    participant MQ as Message Queue
    participant SMPP as SMPP Connector
    participant SMSC as Carrier SMSC
    participant DLR as DLR Processor
    participant WH as Webhook Dispatcher

    C->>API: POST /messages {to, from, body}
    API->>API: Auth + Rate Limit + Validate
    API->>MS: Submit message
    MS->>MS: Generate message SID<br/>Check idempotency key
    MS->>CE: Compliance check
    CE->>CE: TCPA consent lookup<br/>Opt-out check<br/>Content filter<br/>Time-of-day check
    CE-->>MS: PASS / BLOCK

    alt Compliance BLOCKED
        MS-->>C: 400 / 403 with violation details
    end

    MS->>ENC: Encode message
    ENC->>ENC: Detect charset (GSM-7/UCS-2)<br/>Calculate segments<br/>Generate UDH if concatenated
    ENC-->>MS: Encoded segments[]

    MS->>RE: Route message
    RE->>RE: Lookup destination carrier<br/>Score available routes<br/>Apply LCR algorithm
    RE-->>MS: Selected carrier + route

    MS->>MQ: Enqueue to carrier partition
    MS-->>C: 202 Accepted {messageSid, status: "queued"}

    Note over MQ,SMPP: Async carrier submission

    MQ->>SMPP: Dequeue message
    SMPP->>SMPP: Acquire connection from pool<br/>Enforce TPS limit
    SMPP->>SMSC: submit_sm PDU
    SMSC-->>SMPP: submit_sm_resp {message_id}
    SMPP->>MQ: Update: status → "submitted"

    Note over SMSC,DLR: Async DLR callback (seconds to hours)

    SMSC->>DLR: deliver_sm (DLR PDU)
    DLR->>DLR: Parse carrier status<br/>Normalize to platform status<br/>Map carrier codes
    DLR->>MQ: Status update event
    MQ->>WH: Dispatch webhook
    WH->>C: POST /webhook {messageSid, status: "delivered"}
```

---

## Data Flow: Inbound Message (MO Path)

```mermaid
---
config:
  theme: neutral
  look: neo
---
sequenceDiagram
    participant Phone as Mobile Handset
    participant SMSC as Carrier SMSC
    participant MO as MO Receiver
    participant NL as Number Lookup
    participant KW as Keyword Processor
    participant MQ as Message Queue
    participant WH as Webhook Dispatcher
    participant C as Customer App

    Phone->>SMSC: SMS to short code / long code
    SMSC->>MO: deliver_sm PDU
    MO->>MO: Parse SMPP PDU<br/>Extract sender, recipient, body
    MO->>NL: Lookup recipient number
    NL-->>MO: Owner account + webhook URL

    MO->>KW: Process keywords
    KW->>KW: Check STOP/HELP/START keywords

    alt Opt-Out Keyword (STOP)
        KW->>KW: Add to opt-out list
        KW->>SMSC: Auto-reply confirmation
        KW-->>MO: Handled (no webhook)
    else Regular Message
        KW-->>MO: Forward to customer
    end

    MO->>MQ: Enqueue inbound event
    MQ->>WH: Dispatch to customer webhook
    WH->>C: POST /webhook {from, to, body, messageSid}

    alt Webhook Fails
        WH->>WH: Retry with exponential backoff<br/>(5s, 30s, 5m, 30m, 4h)
        WH->>MQ: Dead-letter after max retries
    end
```

---

## Data Flow: DLR State Machine

```mermaid
---
config:
  theme: neutral
  look: neo
---
stateDiagram-v2
    [*] --> Accepted: API receives message
    Accepted --> Queued: Enqueued to carrier partition
    Queued --> Submitted: SMPP submit_sm_resp received
    Submitted --> Delivered: DLR status = DELIVRD
    Submitted --> Undelivered: DLR status = UNDELIV / REJECTD
    Submitted --> Failed: DLR status = EXPIRED / permanent error
    Submitted --> Unknown: DLR timeout (72h)

    Queued --> Failed: Max retries exceeded
    Queued --> Rerouted: Carrier failover triggered
    Rerouted --> Queued: Re-enqueued to alternate carrier

    Submitted --> Buffered: DLR status = ACCEPTD (intermediate)
    Buffered --> Delivered: Final DLR = DELIVRD
    Buffered --> Failed: Final DLR = EXPIRED
    Buffered --> Unknown: DLR timeout (72h)

    note right of Accepted: Message SID returned to customer
    note right of Submitted: Carrier message_id mapped to SID
    note right of Unknown: Carrier never sent final DLR
    note right of Rerouted: Original carrier failed/throttled
```

---

## Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---|---|---|
| **Sync vs Async** | Async (API accepts, queue delivers) | Carrier latency is unpredictable; decoupling prevents API degradation |
| **Event-driven vs Request-response** | Event-driven for message pipeline; request-response for API and number management | Message lifecycle is inherently event-driven (submit → DLR → webhook) |
| **Push vs Pull** | Push (webhooks) for status updates; pull (API) as fallback | Webhooks minimize latency; API polling provides reliability backup |
| **Stateless vs Stateful** | Stateless API/routing tiers; stateful SMPP connector tier | SMPP requires persistent TCP connections; all other tiers are stateless |
| **Write-heavy vs Read-heavy** | Write-heavy (message ingestion dominates) | 1B messages/day written; reads are primarily status checks and analytics |
| **Real-time vs Batch** | Real-time for message delivery; batch for analytics/billing reconciliation | Messages need immediate delivery; reporting can lag by minutes |
| **Edge vs Origin** | Origin-centric (no edge processing) | SMS messages are routed through centralized carrier connections, not CDN edges |

---

## Carrier Integration Topology

```mermaid
---
config:
  theme: neutral
  look: neo
---
flowchart LR
    subgraph Platform["SMS Gateway Platform"]
        POOL["Connection Pool<br/>Manager"]

        subgraph Tier1["Tier-1 Carriers (Direct)"]
            C1["Carrier A<br/>50 connections<br/>5000 TPS"]
            C2["Carrier B<br/>30 connections<br/>3000 TPS"]
            C3["Carrier C<br/>20 connections<br/>2000 TPS"]
        end

        subgraph Tier2["Tier-2 Aggregators"]
            A1["Aggregator X<br/>10 connections<br/>1000 TPS"]
            A2["Aggregator Y<br/>5 connections<br/>500 TPS"]
        end

        subgraph Tier3["Tier-3 Wholesale"]
            W1["Wholesale Z<br/>2 connections<br/>200 TPS"]
        end
    end

    subgraph Dest["Destination Networks"]
        US["US Networks<br/>AT&T · T-Mobile · Verizon"]
        EU["European Networks<br/>Vodafone · Orange · DT"]
        APAC["APAC Networks<br/>NTT · Reliance · Singtel"]
        LATAM["LATAM Networks<br/>América Móvil · Telefónica"]
    end

    POOL --> C1 & C2 & C3
    POOL --> A1 & A2
    POOL --> W1
    C1 --> US
    C2 --> US & EU
    C3 --> EU & APAC
    A1 --> APAC & LATAM
    A2 --> LATAM
    W1 --> APAC & LATAM

    classDef pool fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef tier1 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef tier2 fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef tier3 fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef dest fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class POOL pool
    class C1,C2,C3 tier1
    class A1,A2 tier2
    class W1 tier3
    class US,EU,APAC,LATAM dest
```

### Carrier Tier Strategy

| Tier | Description | When to Use | Cost | Delivery Rate |
|---|---|---|---|---|
| **Tier-1 Direct** | Direct SMPP connection to carrier SMSC | Highest-volume routes, premium delivery needed | Lowest | 97-99% |
| **Tier-2 Aggregator** | Via SMS aggregator with multi-carrier reach | Medium-volume routes, multi-country coverage | Medium | 93-96% |
| **Tier-3 Wholesale** | Bulk wholesale routes via SS7 or grey routes | Low-volume/emerging markets, cost-sensitive | Highest | 85-92% |

---

## Message Encoding Decision Flow

```mermaid
---
config:
  theme: neutral
  look: neo
---
flowchart TB
    START["Incoming Message"] --> DETECT["Detect Character Set"]
    DETECT --> GSM{"All chars in<br/>GSM-7 alphabet?"}

    GSM -->|Yes| GSM_LEN{"Length ≤ 160?"}
    GSM -->|No| UCS2_LEN{"Length ≤ 70?"}

    GSM_LEN -->|Yes| SINGLE_GSM["Single SMS<br/>GSM-7 Encoding<br/>Up to 160 chars"]
    GSM_LEN -->|No| CONCAT_GSM["Concatenated SMS<br/>GSM-7 + UDH Header<br/>153 chars per segment"]

    UCS2_LEN -->|Yes| SINGLE_UCS["Single SMS<br/>UCS-2 Encoding<br/>Up to 70 chars"]
    UCS2_LEN -->|No| CONCAT_UCS["Concatenated SMS<br/>UCS-2 + UDH Header<br/>67 chars per segment"]

    CONCAT_GSM --> CALC_G["Calculate segments:<br/>⌈length ÷ 153⌉"]
    CONCAT_UCS --> CALC_U["Calculate segments:<br/>⌈length ÷ 67⌉"]

    CALC_G --> UDH["Add UDH Headers<br/>Reference ID + Seq Num<br/>+ Total Segments"]
    CALC_U --> UDH

    UDH --> SUBMIT["Submit each segment<br/>as separate SMPP PDU"]

    classDef start fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef single fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef concat fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef process fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class START start
    class GSM,GSM_LEN,UCS2_LEN decision
    class SINGLE_GSM,SINGLE_UCS single
    class CONCAT_GSM,CONCAT_UCS,CALC_G,CALC_U concat
    class DETECT,UDH,SUBMIT process
```

---

## Routing Decision Architecture

```mermaid
---
config:
  theme: neutral
  look: neo
---
flowchart TB
    MSG["Inbound Message"] --> DEST["Resolve Destination<br/>Country + Network via MCC/MNC"]
    DEST --> NUM_TYPE["Determine Sender<br/>Number Type"]
    NUM_TYPE --> ELIGIBLE["Filter Eligible Carriers<br/>by destination + number type"]

    ELIGIBLE --> SCORE["Score Each Route"]

    subgraph Scoring["Multi-Factor Scoring"]
        COST["Cost Factor<br/>Weight: 40%"]
        DELIV["Delivery Rate<br/>Weight: 30%"]
        LAT["Latency Factor<br/>Weight: 15%"]
        HEALTH["Carrier Health<br/>Weight: 15%"]
    end

    SCORE --> COST & DELIV & LAT & HEALTH
    COST & DELIV & LAT & HEALTH --> RANK["Rank Routes by<br/>Composite Score"]

    RANK --> AVAIL{"Top route<br/>available?<br/>(TPS capacity)"}
    AVAIL -->|Yes| SELECT["Select Route"]
    AVAIL -->|No| NEXT["Try Next Route"]
    NEXT --> AVAIL

    SELECT --> ENQUEUE["Enqueue to<br/>Carrier Partition"]

    classDef msg fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef scoring fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef decision fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef result fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class MSG msg
    class DEST,NUM_TYPE,ELIGIBLE,SCORE,RANK process
    class COST,DELIV,LAT,HEALTH scoring
    class AVAIL decision
    class SELECT,ENQUEUE,NEXT result
```

---

## Cross-Cutting Concerns

### Idempotency

Every message submission accepts an optional `idempotency_key`. The system stores a hash of `(account_id, idempotency_key)` in a key-value store with 24-hour TTL. Duplicate submissions within the window return the original `202 Accepted` response with the same message SID, preventing double-sends on API retries.

### Rate Limiting (Customer-Side)

Customer rate limits are enforced at the API gateway level using a sliding window algorithm:
- Per-account TPS limit (configurable per pricing tier)
- Per-number TPS limit (carrier-mandated)
- Per-destination daily/monthly limits (anti-spam)

### Backpressure Propagation

When carrier queues build up (carrier degradation), backpressure propagates upstream:
1. SMPP connector detects rising latency / error rates
2. Carrier health score decreases
3. Routing engine shifts traffic to alternate carriers
4. If all routes to a destination are degraded, the routing engine signals the API tier
5. API returns `429 Too Many Requests` or queues with extended delivery SLA

### Multi-Region Deployment

| Region | Role | Traffic |
|---|---|---|
| US East | Primary for Americas | 40% of global traffic |
| EU West | Primary for EMEA | 30% of global traffic |
| APAC (Singapore) | Primary for Asia-Pacific | 20% of global traffic |
| US West | Failover for US East | Standby, 10% overflow |

Messages are routed to the region closest to their destination carriers, minimizing SMPP connection latency. Customer API requests are handled by the nearest region with cross-region replication for account data.

---

*Next: [Low-Level Design ->](./03-low-level-design.md)*
