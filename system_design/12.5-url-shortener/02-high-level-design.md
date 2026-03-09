# High-Level Design — URL Shortener

## 1. System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WEB[Web App]
        API_CLIENT[API Client]
        MOBILE[Mobile App]
    end

    subgraph Edge["Edge Layer"]
        CDN[CDN / Edge Cache]
        GLB[Global Load Balancer]
    end

    subgraph Gateway["API Gateway"]
        GW[API Gateway<br/>Rate Limiting · Auth · Routing]
    end

    subgraph Services["Service Layer"]
        REDIRECT[Redirect Service<br/>Read-optimized]
        CREATE[Creation Service<br/>Write path]
        ANALYTICS_API[Analytics API<br/>Query service]
    end

    subgraph Cache["Cache Layer"]
        L1[In-Process Cache<br/>Top 100K URLs]
        L2[Distributed Cache<br/>500M URL working set]
    end

    subgraph Storage["Data Layer"]
        URL_DB[(URL Store<br/>Short code → Long URL)]
        ANALYTICS_DB[(Analytics Store<br/>Columnar / Time-series)]
    end

    subgraph Streaming["Event Pipeline"]
        QUEUE[Message Queue<br/>Click events]
        PROCESSOR[Stream Processor<br/>Aggregation · Fraud detection]
    end

    WEB --> CDN
    API_CLIENT --> GLB
    MOBILE --> GLB
    CDN --> GLB
    GLB --> GW

    GW --> REDIRECT
    GW --> CREATE
    GW --> ANALYTICS_API

    REDIRECT --> L1
    L1 -.->|miss| L2
    L2 -.->|miss| URL_DB
    CREATE --> URL_DB
    CREATE --> L2

    REDIRECT --> QUEUE
    QUEUE --> PROCESSOR
    PROCESSOR --> ANALYTICS_DB
    ANALYTICS_API --> ANALYTICS_DB

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef stream fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class WEB,API_CLIENT,MOBILE client
    class CDN,GLB edge
    class GW gateway
    class REDIRECT,CREATE,ANALYTICS_API service
    class L1,L2 cache
    class URL_DB,ANALYTICS_DB data
    class QUEUE,PROCESSOR stream
```

---

## 2. Data Flow — Write Path (URL Creation)

### 2.1 Flow Description

1. **Client** sends POST request with long URL, optional custom alias, and optional TTL
2. **API Gateway** authenticates the request (API key or OAuth token), applies rate limiting
3. **Creation Service** validates the URL (format, reachability, reputation check)
4. If custom alias requested: check uniqueness in URL Store (strong consistency read)
5. If no custom alias: generate a unique short code via ID Generator → Base62 encode
6. **Write** the mapping (short_code → long_url + metadata) to URL Store
7. **Populate** the distributed cache with the new mapping
8. **Return** the shortened URL to the client

### 2.2 Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant CS as Creation Service
    participant IG as ID Generator
    participant DB as URL Store
    participant CACHE as Distributed Cache

    C->>GW: POST /api/v1/urls {long_url, custom_alias?, ttl?}
    GW->>GW: Authenticate & rate limit
    GW->>CS: Forward validated request

    CS->>CS: Validate URL format & reputation

    alt Custom alias requested
        CS->>DB: CHECK alias uniqueness
        DB-->>CS: Available / Conflict
        alt Alias taken
            CS-->>GW: 409 Conflict
            GW-->>C: 409 Conflict
        end
        CS->>CS: Use custom alias as short_code
    else Generate short code
        CS->>IG: Request unique ID
        IG-->>CS: Snowflake ID
        CS->>CS: Base62 encode → short_code
    end

    CS->>DB: INSERT (short_code, long_url, metadata)
    DB-->>CS: Success
    CS->>CACHE: SET short_code → long_url
    CACHE-->>CS: OK
    CS-->>GW: 201 Created {short_url, short_code}
    GW-->>C: 201 Created {short_url, short_code}
```

---

## 3. Data Flow — Read Path (URL Redirect)

### 3.1 Flow Description

1. **User** clicks a short URL (e.g., `https://short.ly/a1B2c3`)
2. **DNS** resolves to nearest edge/CDN point of presence
3. **CDN** checks edge cache for 301 redirect (if enabled for this link)
4. On CDN miss: request reaches **API Gateway** → **Redirect Service**
5. **Redirect Service** checks in-process cache (L1) → distributed cache (L2) → URL Store (L3)
6. On any hit: return HTTP 301 or 302 redirect with `Location: <long_url>` header
7. **Asynchronously** emit a click event to the message queue (non-blocking)
8. If short code not found or expired: return 404 Not Found or 410 Gone

### 3.2 Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User Browser
    participant CDN as CDN Edge
    participant RS as Redirect Service
    participant L1 as In-Process Cache
    participant L2 as Distributed Cache
    participant DB as URL Store
    participant MQ as Message Queue

    U->>CDN: GET /a1B2c3

    alt CDN cache hit (301 only)
        CDN-->>U: 301 Redirect → long_url
    else CDN miss
        CDN->>RS: Forward request

        RS->>L1: GET a1B2c3
        alt L1 hit
            L1-->>RS: long_url
        else L1 miss
            RS->>L2: GET a1B2c3
            alt L2 hit
                L2-->>RS: long_url
                RS->>L1: SET a1B2c3 (backfill)
            else L2 miss
                RS->>DB: SELECT long_url WHERE code = 'a1B2c3'
                DB-->>RS: long_url
                RS->>L2: SET a1B2c3 (backfill)
                RS->>L1: SET a1B2c3 (backfill)
            end
        end

        RS-->>U: 302 Redirect → long_url
        RS-)MQ: Async: emit click event
    end
```

---

## 4. Data Flow — Analytics Pipeline

### 4.1 Flow Description

1. **Redirect Service** emits a click event to the message queue (fire-and-forget, non-blocking)
2. **Message Queue** durably stores events with at-least-once delivery guarantee
3. **Stream Processor** consumes events in micro-batches:
   - Enriches with geo-location data (IP → country/city)
   - Parses User-Agent → device, browser, OS
   - Deduplicates using click ID (idempotent processing)
   - Detects fraud signals (bot patterns, click farms)
4. Writes enriched events to **Analytics Store** (columnar database)
5. **Materialized views** maintain pre-aggregated rollups (hourly, daily per URL)
6. **Analytics API** queries pre-aggregated data for dashboard responses

### 4.2 Analytics Data Flow Diagram

```mermaid
flowchart LR
    subgraph Capture["Event Capture"]
        RS[Redirect Service]
        MQ[Message Queue]
    end

    subgraph Process["Stream Processing"]
        GEO[Geo Enrichment<br/>IP → Location]
        UA[User-Agent<br/>Parser]
        DEDUP[Deduplication<br/>Click ID]
        FRAUD[Fraud Detection<br/>Bot filtering]
    end

    subgraph Store["Analytics Storage"]
        RAW[(Raw Events<br/>90-day retention)]
        HOURLY[(Hourly Rollups)]
        DAILY[(Daily Rollups)]
    end

    subgraph Serve["Analytics API"]
        DASH[Dashboard<br/>Queries]
        EXPORT[Data Export<br/>CSV/JSON]
    end

    RS --> MQ --> GEO --> UA --> DEDUP --> FRAUD
    FRAUD --> RAW
    RAW --> HOURLY --> DAILY
    HOURLY --> DASH
    DAILY --> DASH
    DAILY --> EXPORT

    classDef capture fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef process fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef store fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef serve fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class RS,MQ capture
    class GEO,UA,DEDUP,FRAUD process
    class RAW,HOURLY,DAILY store
    class DASH,EXPORT serve
```

---

## 5. Key Architectural Decisions

### 5.1 Synchronous Write, Asynchronous Analytics

| Decision | Synchronous URL creation; asynchronous click analytics |
|---|---|
| **Why** | The write path (URL creation) must return a usable short URL immediately—the user is waiting. Analytics, however, can tolerate seconds of delay without impacting user experience. Decoupling analytics into an async pipeline prevents click processing from adding latency to the redirect hot path. |
| **Trade-off** | Analytics data lags real-time by 1-5 seconds. Click counts shown to users may briefly undercount during traffic spikes. |
| **Alternative** | Synchronous counter increment on redirect (simpler, but adds 2-5ms to every redirect and creates write contention on the counter). |

### 5.2 Three-Tier Cache Architecture

| Decision | In-process (L1) → Distributed cache (L2) → Database (L3) |
|---|---|
| **Why** | The 100:1 read-to-write ratio means caching is the primary scaling mechanism. L1 (in-process) handles the hottest URLs with sub-millisecond latency and zero network hops. L2 (distributed cache) provides a shared, consistent view across all redirect servers. L3 (database) is the source of truth for cold URLs. |
| **Trade-off** | L1 may serve stale data for up to 15 seconds after a URL update. L2 adds a network hop (~1-2ms) but shares state. Three tiers increase operational complexity. |
| **Alternative** | Two-tier (distributed cache + DB) is simpler but sacrifices the sub-millisecond latency of L1 for hot URLs. |

### 5.3 302 as Default Redirect Status

| Decision | Use HTTP 302 (temporary) by default; offer 301 (permanent) as opt-in |
|---|---|
| **Why** | 302 ensures every click passes through the server, enabling accurate analytics, destination URL updates, and link expiration enforcement. 301 is cached by browsers indefinitely, making the short URL "unrevocable" from the user's perspective. |
| **Trade-off** | 302 means every click hits the server (higher infrastructure cost). 301 would reduce server load by 80%+ for repeat visitors but sacrifices analytics and flexibility. |
| **Alternative** | 301 with short `max-age` Cache-Control (e.g., 1 hour) as a compromise—reduces server load while maintaining some analytics granularity. |

### 5.4 Snowflake-Style ID Generation

| Decision | Use distributed Snowflake-style IDs converted to Base62 for short codes |
|---|---|
| **Why** | Snowflake IDs are coordination-free (each worker generates independently), time-ordered (enables efficient range queries), and unique across the cluster. Base62 encoding produces compact, URL-safe short codes. |
| **Trade-off** | Snowflake IDs are 64-bit, producing 11-character Base62 codes. For shorter codes (6-7 chars), can use a counter-based approach with range pre-allocation. |
| **Alternative** | MD5/SHA hash of URL (deterministic, but 128+ bits → longer codes and collision risk requires checking). Counter with Zookeeper coordination (shorter codes, but single point of failure). |

### 5.5 Separate Read and Write Services

| Decision | Split redirect handling and URL creation into separate microservices |
|---|---|
| **Why** | Read (redirect) and write (creation) have vastly different scaling profiles (100:1), latency requirements (5ms vs 200ms), and failure modes. Independent scaling allows provisioning 100x more redirect capacity without wasting resources on creation infrastructure. |
| **Trade-off** | Adds deployment complexity and requires service discovery. A monolith would be simpler for small scale. |
| **Alternative** | Single service with internal read/write separation at the thread pool level (viable up to ~10K QPS). |

---

## 6. Architecture Pattern Checklist

| Pattern | Applied? | Implementation |
|---|---|---|
| **CQRS** | ✅ Yes | Separate read (redirect) and write (creation) services with independent scaling |
| **Event Sourcing** | ⚠️ Partial | Click events are an append-only event log; URL mappings are state-based (not event-sourced) |
| **Cache-Aside** | ✅ Yes | Redirect service checks cache first, falls back to DB, then backfills cache on miss |
| **Write-Through Cache** | ✅ Yes | Creation service writes to DB and cache simultaneously |
| **Async Messaging** | ✅ Yes | Click events are published to message queue for async analytics processing |
| **Circuit Breaker** | ✅ Yes | Between redirect service and database; falls back to cache-only mode if DB is down |
| **Bulkhead** | ✅ Yes | Separate thread pools for redirect, creation, and analytics to prevent cascade |
| **Gateway Aggregation** | ✅ Yes | API gateway handles auth, rate limiting, and routing for all services |
| **Strangler Fig** | ⬜ N/A | Not applicable (greenfield design) |
| **Saga** | ⬜ N/A | No distributed transactions needed; URL creation is a single-service operation |
