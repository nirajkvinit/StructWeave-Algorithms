# 15.3 High-Level Design

## System Architecture

```mermaid
---
config:
  theme: neutral
  look: neo
---
flowchart TB
    subgraph Sources["Log Sources"]
        S1["Microservices"]
        S2["Infrastructure<br/>(OS, containers, network)"]
        S3["Security<br/>(audit, access, firewall)"]
        S4["Third-Party<br/>(cloud APIs, SaaS)"]
    end

    subgraph Collection["Collection Layer"]
        A1["OTel Collector<br/>(sidecar per pod)"]
        A2["Fleet Agent<br/>(per host)"]
        A3["API Gateway<br/>(HTTP/gRPC endpoint)"]
    end

    subgraph Buffer["Buffer Layer"]
        K1["Message Queue Cluster<br/>(partitioned by tenant + source)"]
        DLQ["Dead Letter Queue"]
    end

    subgraph Processing["Processing Layer"]
        P1["Stream Processor<br/>(parse, enrich, route)"]
        P2["PII Redaction<br/>Engine"]
        P3["Sampling &<br/>Filtering Engine"]
    end

    subgraph Indexing["Indexing Layer"]
        I1["Index Writer Pool<br/>(sharded by time + tenant)"]
        I2["WAL<br/>(Write-Ahead Log)"]
    end

    subgraph Storage["Storage Layer"]
        H["Hot Tier<br/>(SSD, 1-7 days)"]
        W["Warm Tier<br/>(HDD, 7-30 days)"]
        C["Cold Tier<br/>(Object Storage,<br/>30-365 days)"]
        F["Frozen Archive<br/>(Deep Storage,<br/>1-7 years)"]
    end

    subgraph Query["Query Layer"]
        Q1["Query Frontend<br/>(parse, plan, cache)"]
        Q2["Query Executor Pool<br/>(scatter-gather)"]
        Q3["Result Cache"]
    end

    subgraph Consumers["Consumer Layer"]
        U1["Search UI /<br/>Dashboards"]
        U2["Alerting<br/>Engine"]
        U3["API Clients"]
        U4["Log-to-Metric<br/>Converter"]
    end

    S1 & S2 --> A1
    S3 --> A2
    S4 --> A3
    A1 & A2 & A3 --> K1
    K1 --> P1
    P1 --> P2 --> P3
    P3 --> I1
    P3 -.->|unparseable| DLQ
    I1 --> I2 --> H
    H -->|lifecycle| W -->|lifecycle| C -->|lifecycle| F

    U1 & U2 & U3 & U4 --> Q1
    Q1 --> Q3
    Q1 --> Q2
    Q2 --> H & W & C

    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef collect fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef buffer fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef index fill:#fce4ec,stroke:#c62828,stroke-width:2px
    classDef store fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef query fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef consumer fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class S1,S2,S3,S4 source
    class A1,A2,A3 collect
    class K1,DLQ buffer
    class P1,P2,P3 process
    class I1,I2 index
    class H,W,C,F store
    class Q1,Q2,Q3 query
    class U1,U2,U3,U4 consumer
```

---

## Data Flow: Write Path

```mermaid
---
config:
  theme: neutral
  look: neo
---
sequenceDiagram
    participant App as Application
    participant Agent as OTel Collector
    participant Queue as Message Queue
    participant Proc as Stream Processor
    participant PII as PII Redactor
    participant Idx as Index Writer
    participant WAL as Write-Ahead Log
    participant Hot as Hot Storage

    App->>Agent: Emit log event (stdout/file/OTLP)
    Agent->>Agent: Buffer locally (memory + disk)
    Agent->>Agent: Batch (up to 5MB or 5s)
    Agent->>Queue: Publish batch (compressed, partitioned)
    Queue-->>Agent: ACK (durable write)

    Queue->>Proc: Consume batch
    Proc->>Proc: Parse (JSON/logfmt/grok)
    Proc->>Proc: Extract timestamp, severity
    Proc->>Proc: Enrich (add host, region, cluster)
    Proc->>PII: Route through PII pipeline
    PII->>PII: Detect & redact PII fields
    PII->>Proc: Return sanitized event

    Proc->>Idx: Forward structured event
    Idx->>WAL: Append to WAL (durability)
    WAL-->>Idx: ACK (persisted)
    Idx->>Idx: Buffer in memory segment
    Idx->>Idx: Build inverted index entries
    Note over Idx,Hot: Refresh interval (1-5s)
    Idx->>Hot: Flush segment to hot storage
    Note over Idx,Hot: Event now searchable
```

---

## Data Flow: Read Path

```mermaid
---
config:
  theme: neutral
  look: neo
---
sequenceDiagram
    participant User as Engineer / Dashboard
    participant QF as Query Frontend
    participant Cache as Result Cache
    participant QE as Query Executors
    participant Hot as Hot Tier
    participant Warm as Warm Tier
    participant Cold as Cold Tier

    User->>QF: Submit query (time range + filters)
    QF->>QF: Parse query, validate syntax
    QF->>QF: Determine target tiers from time range
    QF->>Cache: Check result cache
    alt Cache hit
        Cache-->>QF: Return cached result
        QF-->>User: Return results
    else Cache miss
        QF->>QF: Split query by time shard
        QF->>QE: Scatter subqueries to executors

        par Query Hot Tier
            QE->>Hot: Search recent segments
            Hot-->>QE: Matching events
        and Query Warm Tier
            QE->>Warm: Search warm segments
            Warm-->>QE: Matching events
        and Query Cold Tier (if needed)
            QE->>Cold: Fetch searchable snapshots
            Cold-->>QE: Matching events
        end

        QE->>QE: Merge, sort, aggregate results
        QE-->>QF: Return merged results
        QF->>Cache: Store in result cache
        QF-->>User: Return results
    end
```

---

## Key Architectural Decisions

### 1. Multi-Layer Ingestion Pipeline vs. Direct Write

| Aspect | Direct Write | Multi-Layer Pipeline (Chosen) |
|---|---|---|
| Architecture | Agents write directly to index storage | Agents -> Queue -> Processor -> Indexer |
| Reliability | Logs lost if indexer is down | Queue buffers during indexer downtime (hours) |
| Backpressure | Agent blocks or drops on indexer overload | Queue absorbs burst, indexer consumes at steady rate |
| Processing | Agents must parse and enrich (CPU on every host) | Centralized processing pool, specialized hardware |
| Latency | Lower (one fewer hop) | Slightly higher (+100ms queue transit) |
| Complexity | Low | High (3 additional distributed systems) |
| **Decision** | | **Multi-layer pipeline**: the reliability and backpressure benefits are non-negotiable for a system that must not lose data during incidents when log volume spikes 10x |

### 2. Indexing Strategy Selection

| Aspect | Full-Text Inverted Index | Label-Only + Grep | Bloom Filter + Scan | Columnar + Sparse Index |
|---|---|---|---|---|
| Example | Elasticsearch | Loki | LogScale/Humio | ClickHouse |
| Ingestion speed | Moderate (index overhead) | Fast (minimal indexing) | Very fast (bloom only) | Very fast (append-only) |
| Full-text search | Sub-second | Slow (brute-force grep) | Fast (bloom skip) | Moderate (token bloom) |
| Aggregation | Moderate | Slow | Moderate | Very fast |
| Storage overhead | 1.5-3x raw data | 0.1-0.15x (labels only) | 0.05-0.1x (bloom filters) | ~0x (sparse index in RAM) |
| Compression ratio | 1.5-3x | 10-20x | 10-20x | 15-50x |
| Cost at scale | Very high | Very low | Low-moderate | Low |
| **Decision** | | | | **Hybrid approach**: use full-text inverted index for hot tier (7 days, optimized for fast interactive search), transition to columnar storage for warm/cold tiers (optimized for aggregation and cost), bloom filter acceleration on cold tier for needle-in-haystack queries. This hybrid captures the query speed of inverted indexes for recent data while achieving the cost efficiency of columnar/object storage for historical data. |

### 3. Schema-on-Read vs. Schema-on-Write

| Aspect | Schema-on-Write | Schema-on-Read (Chosen) |
|---|---|---|
| Ingestion | Reject logs that don't match schema | Accept any format, parse later |
| Field mapping | Pre-defined, strict types | Dynamic, types inferred at ingest or query time |
| Type conflicts | Rejected at ingestion (data loss risk) | Resolved with suffix strategy (field_str, field_int) |
| Query performance | Faster (pre-structured data) | Slightly slower (may need runtime parsing) |
| Operational burden | High (schema management across 5K services) | Low (services log freely) |
| **Decision** | | **Schema-on-read**: the operational cost of enforcing schemas across thousands of independently deployed microservices is prohibitive; Uber's migration to schema-agnostic logging eliminated their single largest operational pain point |

### 4. Push vs. Pull Collection Model

| Aspect | Pull (Scrape) | Push (Chosen) |
|---|---|---|
| Model | Central collector scrapes log files from targets | Agents on each host push logs to central pipeline |
| Ephemeral workloads | Poor (containers gone before scrape) | Good (agent pushes before shutdown) |
| Network topology | Requires collector access to all targets | Agents push outbound (firewall-friendly) |
| Service discovery | Collector must discover all log sources | Self-registration at agent startup |
| Backpressure | Collector controls scrape rate | Agent must handle backpressure signals |
| **Decision** | | **Push model**: log data from ephemeral containers, serverless functions, and across network boundaries requires push; agents on each host push through the OTel Collector with local buffering for reliability |

### 5. Query Language Design

| Aspect | SQL-Based | Pipe-Based (SPL) | PromQL-Inspired (LogQL) | Custom DSL (Chosen) |
|---|---|---|---|---|
| Familiarity | Universal | Splunk users only | Prometheus users | New but learnable |
| Expressiveness | Very high | Very high | Moderate | High |
| Log-native operations | Low (no grep, parse, extract built-in) | Very high | High | High |
| Streaming support | Low | High | High | High |
| **Decision** | | | | **LogQL-inspired with SQL aggregations**: label-based stream selection `{service="api", env="prod"}` piped through filter stages `|= "error" | json | status >= 500`, with SQL-like aggregation syntax for analytics queries; balances familiarity, expressiveness, and log-native operations |

---

## Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---|---|---|
| Sync vs Async communication | **Async** (event-driven pipeline) | Decoupling via message queue enables burst absorption and independent scaling of each layer |
| Event-driven vs Request-response | **Event-driven** for write path, **Request-response** for read path | Writes are fire-and-forget events; reads are interactive queries requiring synchronous response |
| Push vs Pull model | **Push** for log collection | Ephemeral containers, serverless, cross-boundary; agents push to central pipeline |
| Stateless vs Stateful services | **Stateless** processors, **stateful** indexers | Stream processors are horizontally scalable stateless workers; index writers maintain in-memory segments and WAL (stateful) |
| Write-heavy vs Read-heavy | **Extremely write-heavy** (100:1+ write-to-read) | Ingestion is continuous at millions/sec; search is intermittent at tens-to-hundreds/sec; optimize write path first |
| Real-time vs Batch processing | **Real-time** ingestion + indexing, **batch** for tier migration and compaction | Logs must be searchable within seconds; tier migration and segment compaction run as background batch jobs |
| Edge vs Origin processing | **Edge** for collection and initial parsing, **origin** for indexing and search | OTel Collectors at the edge do local parsing, batching, and filtering; centralized indexers handle compute-intensive indexing |

---

## Component Interaction Summary

### Collection Layer
- **OTel Collector (Sidecar)**: Deployed per pod/host. Tails log files or receives OTLP. Performs initial parsing (JSON detection, timestamp extraction), batching (5MB or 5-second window), compression (LZ4), and push to message queue. Buffers to local disk on queue unavailability (up to configurable disk limit, default 500MB). Implements memory limiter processor to prevent OOM.
- **Fleet Agent**: Per-host agent for infrastructure logs (kernel, syslog, container runtime). Monitors system log files with inotify/kqueue. Handles log rotation detection (inode tracking, file fingerprinting).
- **API Gateway**: HTTP/gRPC endpoint for direct log submission. Rate limiting per API key. Request validation (timestamp present, event size < 1MB). TLS termination.

### Buffer Layer
- **Message Queue Cluster**: Multi-broker deployment with topic-per-tenant-per-source partitioning. Replication factor 3 for durability. Retention: 72 hours (provides replay window for re-indexing). Consumer groups per indexer pool. Compaction disabled (log events are unique, not keyed).
- **Dead Letter Queue**: Receives events that fail parsing after N retries. Monitored for volume spikes (indicates format change in a service). Manual or automated reprocessing after parser update.

### Processing Layer
- **Stream Processor**: Stateless workers consuming from queue. Operations: format detection (JSON vs. logfmt vs. plain text), timestamp extraction and normalization (UTC), severity mapping (vendor-specific levels to OTel standard 1-24), field extraction (grok patterns for unstructured logs), enrichment (add cluster/region/environment from host metadata), routing (send to appropriate index based on rules).
- **PII Redaction Engine**: Inline processor that scans structured fields and message body for PII patterns (email, phone, SSN, credit card, IP addresses). Configurable per data stream (some streams may need IP addresses preserved for debugging). Redaction strategies: hash, mask (`****`), or remove.
- **Sampling & Filtering Engine**: Reduces volume for low-value streams. Strategies: deterministic sampling (keep 10% of DEBUG logs, 100% of ERROR), content-based filtering (drop health-check logs), deduplication (collapse repeated identical messages into a single event with count).

### Indexing Layer
- **Index Writer Pool**: Stateful workers that maintain in-memory index segments. Each writer owns a set of shards (partitioned by time + tenant hash). Operations: receive structured events, tokenize text fields, build inverted index entries (term -> posting list), buffer in memory, periodically flush to storage. Implements refresh cycle (1-5 seconds) after which new events become searchable.
- **Write-Ahead Log**: Each index writer maintains a WAL for crash recovery. Events are appended to WAL before being added to the in-memory segment. On crash recovery, the WAL is replayed to rebuild the in-memory state. WAL is truncated after segment flush to storage.

### Storage Layer
- **Hot Tier**: SSD-backed storage for the most recent data (1-7 days). Fully indexed with inverted index. Segment structure: immutable segments with term dictionaries, posting lists, stored fields (compressed with LZ4). Active compaction (merge small segments into larger ones).
- **Warm Tier**: HDD-backed or cheaper SSD for intermediate data (7-30 days). Read-only. On transition from hot: force-merge to reduce segment count (fewer segments = faster search), mark as read-only, optionally shrink shard count.
- **Cold Tier**: Object storage with searchable snapshot capability. Data lives in object storage; a minimal local cache (SSD) holds recently accessed blocks. On-demand block fetching for search queries. Bloom filter pre-filtering reduces unnecessary fetches.
- **Frozen Tier**: Deep archive in object storage. No local cache. On-demand rehydration (minutes to hours) for compliance and forensic queries. Lowest cost per GB.

### Query Layer
- **Query Frontend**: Entry point for all search requests. Parses query syntax, validates permissions (tenant isolation), determines time range and target tiers, splits query into time-shard subqueries, routes to query executors, merges results, manages result cache.
- **Query Executor Pool**: Stateless workers that execute subqueries against specific storage shards. Operations: open segment files, apply bloom filter pre-check, scan inverted index for matching terms, fetch matching documents, apply post-filters, return results with metadata (hit count, scanned bytes).
- **Result Cache**: In-memory cache for repeated queries (common for dashboards). Cache key: query hash + time range (rounded to nearest refresh interval). TTL: short (30-60 seconds) to balance freshness with load reduction.
