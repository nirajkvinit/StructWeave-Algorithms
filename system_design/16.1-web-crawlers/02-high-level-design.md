# High-Level Design — Web Crawlers

## System Architecture

The crawler follows a **pipeline architecture** with four major stages: **Frontier** (URL scheduling and politeness), **Fetching** (distributed page download), **Processing** (parsing, link extraction, deduplication), and **Storage** (content persistence and metadata management). A feedback loop connects the processing stage back to the frontier as newly discovered URLs are enqueued.

```mermaid
flowchart TB
    subgraph Seed["Seed & Discovery"]
        SEED[Seed URLs]
        SITEMAP[Sitemap Parser]
        RECRAWL[Recrawl Scheduler]
    end

    subgraph Frontier["URL Frontier"]
        PRIO[Priority Assigner]
        FQ[Front Queues<br/>Priority-based]
        SELECTOR[Queue Selector]
        BQ[Back Queues<br/>Per-host politeness]
        ROBOTS[robots.txt Cache]
        POLITE[Politeness Controller]
    end

    subgraph Fetching["Distributed Fetcher Fleet"]
        DNS[DNS Resolver Cache]
        POOL[Connection Pool Manager]
        FETCH1[Fetcher Worker 1]
        FETCH2[Fetcher Worker 2]
        FETCHN[Fetcher Worker N]
    end

    subgraph Processing["Content Processing Pipeline"]
        PARSE[HTML Parser &<br/>Link Extractor]
        NORM[URL Normalizer]
        URLDEDUP[URL Dedup<br/>Bloom Filter]
        CONTENT[Content Fingerprinter<br/>MD5 + SimHash]
        CONTENTDEDUP[Content Dedup Store]
        TRAP[Spider Trap Detector]
    end

    subgraph Storage["Storage Layer"]
        PAGESTORE[(Page Store<br/>Object Storage)]
        URLDB[(URL Database)]
        CRAWLLOG[(Crawl Log)]
        META[(Metadata Store)]
    end

    SEED --> PRIO
    SITEMAP --> PRIO
    RECRAWL --> PRIO

    PRIO --> FQ
    FQ --> SELECTOR
    SELECTOR --> BQ
    BQ --> POLITE
    ROBOTS --> POLITE
    POLITE --> DNS

    DNS --> POOL
    POOL --> FETCH1
    POOL --> FETCH2
    POOL --> FETCHN

    FETCH1 --> PARSE
    FETCH2 --> PARSE
    FETCHN --> PARSE

    PARSE --> NORM
    NORM --> URLDEDUP
    URLDEDUP -->|New URLs| PRIO
    PARSE --> CONTENT
    CONTENT --> CONTENTDEDUP
    CONTENTDEDUP -->|Unique content| PAGESTORE
    NORM --> TRAP
    TRAP -->|Blocked URLs| CRAWLLOG

    FETCH1 --> CRAWLLOG
    FETCH2 --> CRAWLLOG
    FETCHN --> CRAWLLOG
    CONTENTDEDUP --> META
    PARSE --> URLDB

    classDef seed fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef frontier fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef fetch fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef process fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class SEED,SITEMAP,RECRAWL seed
    class PRIO,FQ,SELECTOR,BQ,POLITE frontier
    class ROBOTS cache
    class DNS,POOL,FETCH1,FETCH2,FETCHN fetch
    class PARSE,NORM,URLDEDUP,CONTENT,CONTENTDEDUP,TRAP process
    class PAGESTORE,URLDB,CRAWLLOG,META storage
```

---

## Crawl Pipeline: Page Fetch Flow

```mermaid
sequenceDiagram
    participant Frontier as URL Frontier
    participant Polite as Politeness Controller
    participant Robots as robots.txt Cache
    participant DNS as DNS Resolver
    participant Fetcher as Fetcher Worker
    participant Host as Target Web Host
    participant Parser as HTML Parser
    participant URLDedup as URL Dedup (Bloom)
    participant ContentDedup as Content Dedup
    participant Store as Page Store

    Frontier->>Polite: Dequeue next URL for host X
    Polite->>Polite: Check: time since last fetch to host X
    alt Too soon (violates politeness)
        Polite-->>Frontier: Defer (re-enqueue with delay)
    else Allowed
        Polite->>Robots: Get robots.txt for host X
        alt robots.txt expired or missing
            Robots->>Fetcher: Fetch robots.txt for host X
            Fetcher->>Host: GET /robots.txt
            Host-->>Fetcher: robots.txt content
            Fetcher-->>Robots: Cache robots.txt (TTL: 24h)
        end
        Robots-->>Polite: Parsed directives (Allow/Disallow/Crawl-delay)
        alt URL is disallowed
            Polite-->>Frontier: Skip URL (mark as robots-blocked)
        else URL is allowed
            Polite->>DNS: Resolve host X
            DNS-->>Polite: IP address (from cache or upstream)
            Polite->>Fetcher: Fetch URL at IP
            Fetcher->>Host: GET /path (with If-Modified-Since if recrawl)
            alt 200 OK
                Host-->>Fetcher: HTML content + headers
                Fetcher->>ContentDedup: Check content hash
                alt New or changed content
                    ContentDedup->>Store: Store page content
                    Fetcher->>Parser: Parse HTML
                    Parser->>Parser: Extract links
                    loop For each extracted link
                        Parser->>URLDedup: Is this URL known?
                        alt New URL
                            URLDedup->>Frontier: Enqueue with priority
                        end
                    end
                else Duplicate content
                    Fetcher->>Fetcher: Log duplicate, skip storage
                end
            else 304 Not Modified
                Fetcher->>Fetcher: Update crawl timestamp only
            else 3xx Redirect
                Fetcher->>URLDedup: Enqueue redirect target
            else 4xx/5xx Error
                Fetcher->>Frontier: Update error count, schedule retry with backoff
            end
        end
    end
```

---

## URL Frontier Architecture: Front Queues and Back Queues

The Mercator-style frontier architecture separates **what to crawl** (priority) from **when to crawl it** (politeness):

```mermaid
flowchart LR
    subgraph Input["Incoming URLs"]
        NEW[Newly Discovered URLs]
        RE[Recrawl URLs]
    end

    subgraph Prioritizer["Priority Assignment"]
        PA[Priority<br/>Calculator]
    end

    subgraph FrontQueues["Front Queues (Priority)"]
        F1["F1: Highest Priority<br/>(news, homepages)"]
        F2["F2: High Priority<br/>(frequently changing)"]
        F3["F3: Medium Priority<br/>(standard pages)"]
        F4["F4: Low Priority<br/>(deep links, archives)"]
    end

    subgraph Selector["Biased Selector"]
        SEL["Weighted Random<br/>Selection"]
    end

    subgraph BackQueues["Back Queues (Politeness)"]
        B1["B1: example.com<br/>next_fetch: 14:00:01"]
        B2["B2: news.org<br/>next_fetch: 14:00:03"]
        B3["B3: shop.io<br/>next_fetch: 14:00:00"]
        BN["BN: blog.net<br/>next_fetch: 14:00:05"]
    end

    subgraph Heap["Ready Queue"]
        H["Min-Heap<br/>ordered by<br/>next_fetch_time"]
    end

    subgraph Output["To Fetchers"]
        OUT[Ready URLs]
    end

    NEW --> PA
    RE --> PA
    PA --> F1
    PA --> F2
    PA --> F3
    PA --> F4

    F1 --> SEL
    F2 --> SEL
    F3 --> SEL
    F4 --> SEL

    SEL --> B1
    SEL --> B2
    SEL --> B3
    SEL --> BN

    B1 --> H
    B2 --> H
    B3 --> H
    BN --> H

    H --> OUT

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef prio fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef front fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef selector fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef back fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef heap fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class NEW,RE input
    class PA prio
    class F1,F2,F3,F4 front
    class SEL selector
    class B1,B2,B3,BN back
    class H,OUT heap
```

**Front Queues** implement priority: URLs are assigned to one of K priority levels based on importance signals (PageRank, change frequency, domain authority, content type). A biased selector draws from higher-priority queues more frequently.

**Back Queues** implement politeness: each back queue corresponds to a single host (or IP for shared hosting). A URL drawn from a front queue is routed to its host's back queue. The back queue tracks the next allowable fetch time. A min-heap orders back queues by their next fetch time, and the fetcher dequeues only from back queues whose next fetch time has passed.

---

## Key Architectural Decisions

### 1. Centralized Frontier vs. Distributed Frontier

| Aspect | Centralized Frontier | Distributed Frontier (Chosen) |
|--------|---------------------|-------------------------------|
| **Coordination** | Single service manages all URL scheduling | Frontier partitioned by host hash; each partition independently manages its hosts |
| **Politeness** | Perfect per-host enforcement (single authority) | Per-host enforcement is natural — each partition owns its hosts exclusively |
| **Throughput** | Bottleneck at ~100K URLs/sec even with optimization | Linear scaling — add partitions for more throughput |
| **Failure impact** | Single point of failure for entire crawl | Partition failure only halts crawling for hosts in that partition |
| **Recommendation** | Distributed frontier with consistent-hash-based partitioning; each partition is a self-contained Mercator mini-frontier for its assigned hosts |

### 2. Pull Model (Fetcher Pulls from Frontier) vs. Push Model

| Aspect | Pull Model (Chosen) | Push Model |
|--------|---------------------|------------|
| **Backpressure** | Natural — fetchers request URLs only when they have capacity | Frontier must track fetcher capacity; risk of overwhelming slow fetchers |
| **Politeness** | Frontier can enforce per-host timing when serving URLs | Frontier pushes URL, but fetcher may not be ready at the right time |
| **Fetcher utilization** | Optimal — fetchers are always working if URLs are available | May over-provision fetchers if push rate is miscalibrated |
| **Recommendation** | Pull model — fetcher calls `get_next_url(partition_id)` and the frontier returns the highest-priority URL whose host is ready for fetching |

### 3. Synchronous vs. Asynchronous Fetching

| Aspect | Synchronous (thread-per-fetch) | Asynchronous (event-driven) (Chosen) |
|--------|-------------------------------|--------------------------------------|
| **Concurrency per worker** | Limited by thread count (~100-200 threads) | Thousands of concurrent connections per worker via event loop |
| **Memory footprint** | ~1 MB stack per thread; 200 threads = 200 MB | Minimal per-connection overhead; 2,000 connections < 50 MB |
| **CPU efficiency** | Thread context switching overhead at high concurrency | Single-threaded event loop; minimal context switching |
| **Recommendation** | Asynchronous I/O with event-driven architecture; each fetcher worker maintains ~200-500 concurrent connections |

### 4. Deduplication Strategy: URL-Level vs. Content-Level

| Aspect | URL-Level Only | URL + Content (Chosen) |
|--------|---------------|------------------------|
| **Accuracy** | Misses content served at different URLs (mirrors, parameter variations) | Catches both URL duplicates and content duplicates across different URLs |
| **Cost** | Cheap (Bloom filter lookup) | Adds content hashing overhead per page |
| **Coverage** | ~70% of duplicates caught (many duplicate URLs are syntactically different) | ~95%+ of duplicates caught |
| **Recommendation** | Two-tier deduplication: fast Bloom filter for URL-level, then content hash + SimHash for fetched pages |

### 5. Page Storage: Inline vs. External

| Aspect | Inline (DB stores content) | External Object Storage (Chosen) |
|--------|---------------------------|----------------------------------|
| **Query flexibility** | Can query content and metadata together | Metadata in DB, content in object storage; requires two lookups |
| **Storage cost** | Expensive — relational/wide-column stores are costly per byte | Object storage is 10-50x cheaper per byte |
| **Scalability** | DB size grows to petabytes — operational nightmare | Object storage scales to exabytes with no operational burden |
| **Recommendation** | Store content in object storage with a content-addressed key (hash of content); store content key + metadata in the URL database |

---

## Architecture Pattern Checklist

- [x] **Sync vs Async communication decided** — Async (event-driven) for page fetching; sync for frontier queries and DNS resolution
- [x] **Event-driven vs Request-response decided** — Pipeline model: each stage processes and forwards; newly discovered URLs are events fed back into the frontier
- [x] **Push vs Pull model decided** — Pull: fetchers request URLs from the frontier when ready
- [x] **Stateless vs Stateful services identified** — Fetchers are stateless (no persistent state); frontier partitions are stateful (URL queues, politeness timers); DNS cache is stateful
- [x] **Read-heavy vs Write-heavy optimization applied** — Frontier is write-heavy (continuous URL insertion from link extraction); content store is write-heavy (continuous page storage); dedup is read-heavy (constant membership queries)
- [x] **Real-time vs Batch processing decided** — Real-time for crawl pipeline; batch for analytics (crawl coverage reports, freshness metrics)
- [x] **Edge vs Origin processing considered** — Fetcher workers deployed geographically close to target hosts to minimize network latency

---

## Component Interaction Summary

| Component | Inputs | Outputs | State |
|-----------|--------|---------|-------|
| Priority Assigner | New/recrawl URLs with signals (PageRank, change freq) | URLs assigned to front queue priority level | Stateless (reads signals from metadata store) |
| Front Queues | Prioritized URLs | URLs selected by biased random sampling | Per-priority-level queues (disk-backed) |
| Back Queues | URLs from front queue selector | URLs ready for fetching (politeness-approved) | Per-host queue + next-fetch timestamp |
| Politeness Controller | URL + host + robots.txt directives | Fetch permission (approved/deferred) | Per-host last-fetch time, robots.txt cache |
| DNS Resolver Cache | Hostnames | IP addresses | LRU cache with TTL awareness |
| Fetcher Worker | URL + IP address | Fetched page content + HTTP metadata | Stateless (connection pool is ephemeral) |
| HTML Parser / Link Extractor | Raw HTML | Extracted links + normalized URLs | Stateless |
| URL Dedup (Bloom Filter) | Normalized URL | New/Known decision | Bloom filter (in-memory, periodically checkpointed) |
| Content Fingerprinter | Page content | MD5 hash + SimHash fingerprint | Stateless |
| Content Dedup Store | Content fingerprints | Duplicate/Unique decision | Hash-to-URL mapping (distributed key-value store) |
| Spider Trap Detector | URL patterns per host | Block/Allow decision | Per-host URL counters, path depth stats |
| Page Store | Page content + content key | Storage confirmation | Object storage (content-addressed) |
| URL Database | URL metadata, crawl results | URL history, change frequency | Wide-column or relational store |
| Recrawl Scheduler | URL metadata (last crawl, change freq, importance) | Recrawl URLs enqueued to frontier | Reads from URL database on schedule |
