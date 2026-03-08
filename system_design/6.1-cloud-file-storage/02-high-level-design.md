# High-Level Design

## 1. System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        direction LR
        Desktop["Desktop Client<br/>(Win/Mac/Linux)"]
        Mobile["Mobile Client<br/>(iOS/Android)"]
        Web["Web Application"]
        API["Third-Party<br/>API Clients"]
    end

    subgraph Edge["Edge Layer"]
        CDN["CDN / Edge Cache"]
        LB["Global Load Balancer<br/>(GeoDNS + L7)"]
    end

    subgraph Gateway["API Gateway Layer"]
        GW["API Gateway<br/>(Auth, Rate Limit,<br/>Routing)"]
    end

    subgraph Core["Core Services"]
        direction TB
        SyncSvc["Sync Service<br/>(Conflict Detection,<br/>State Machine)"]
        MetaSvc["Metadata Service<br/>(File Tree, Versions,<br/>Permissions)"]
        BlockSvc["Block Service<br/>(Upload, Download,<br/>Dedup Check)"]
        ShareSvc["Sharing Service<br/>(ACLs, Links,<br/>Notifications)"]
        SearchSvc["Search Service<br/>(Full-text Index,<br/>Metadata Search)"]
        NotifSvc["Notification Service<br/>(WebSocket,<br/>Long-poll, Push)"]
    end

    subgraph Async["Async Processing"]
        MQ["Message Queue"]
        Workers["Background Workers<br/>(Thumbnail, Preview,<br/>Indexing, GC)"]
    end

    subgraph Data["Data Layer"]
        direction TB
        MetaDB["Metadata Store<br/>(Sharded SQL +<br/>Consistent Cache)"]
        BlockStore["Block Storage<br/>(Content-Addressable,<br/>Erasure Coded)"]
        SearchIdx["Search Index<br/>(Inverted Index)"]
        CacheLayer["Cache Layer<br/>(Metadata + Block<br/>Location Cache)"]
    end

    Desktop & Mobile & Web & API --> CDN
    Desktop & Mobile & Web & API --> LB
    CDN --> LB
    LB --> GW
    GW --> SyncSvc & MetaSvc & BlockSvc & ShareSvc & SearchSvc
    SyncSvc --> MetaSvc
    SyncSvc --> BlockSvc
    SyncSvc --> NotifSvc
    MetaSvc --> MetaDB
    MetaSvc --> CacheLayer
    BlockSvc --> BlockStore
    ShareSvc --> MetaDB
    SearchSvc --> SearchIdx
    NotifSvc --> Desktop & Mobile & Web
    MetaSvc --> MQ
    BlockSvc --> MQ
    MQ --> Workers
    Workers --> SearchIdx
    Workers --> BlockStore

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef async fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class Desktop,Mobile,Web,API client
    class CDN,LB edge
    class GW gateway
    class SyncSvc,MetaSvc,BlockSvc,ShareSvc,SearchSvc,NotifSvc service
    class MQ,Workers async
    class MetaDB,BlockStore,SearchIdx data
    class CacheLayer cache
```

---

## 2. Data Flow

### 2.1 File Upload Flow (Write Path)

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant Sync as Sync Service
    participant Meta as Metadata Service
    participant Block as Block Service
    participant BS as Block Storage
    participant MDB as Metadata Store
    participant Notif as Notification Service
    participant C2 as Other Devices

    C->>C: 1. Detect file change (filesystem watcher)
    C->>C: 2. Chunk file into blocks (4 MB, CDC)
    C->>C: 3. Compute SHA-256 hash per block

    C->>GW: 4. POST /sync/check {file_id, block_hashes[]}
    GW->>Sync: 5. Forward dedup check
    Sync->>Meta: 6. Query existing block hashes
    Meta->>MDB: 7. Lookup block registry
    MDB-->>Meta: 8. Return known/unknown hashes
    Meta-->>Sync: 9. Return missing block list
    Sync-->>C: 10. Response: {needed_blocks: [hash3, hash7]}

    loop For each needed block
        C->>GW: 11. PUT /blocks/{hash} (block data)
        GW->>Block: 12. Forward block
        Block->>Block: 13. Verify hash matches content
        Block->>BS: 14. Store block (erasure coded)
        BS-->>Block: 15. Confirm storage
        Block-->>C: 16. Block stored ACK
    end

    C->>GW: 17. POST /files/{id}/commit {version, block_list}
    GW->>Sync: 18. Commit file version
    Sync->>Meta: 19. Create new file version entry
    Meta->>MDB: 20. Write version record (strong consistency)
    MDB-->>Meta: 21. Confirm write
    Meta-->>Sync: 22. Version committed
    Sync->>Notif: 23. Broadcast change event
    Notif->>C2: 24. Push notification to other devices
    Sync-->>C: 25. Commit success {new_version}
```

### 2.2 File Download Flow (Read Path)

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant Meta as Metadata Service
    participant Cache as Cache Layer
    participant Block as Block Service
    participant BS as Block Storage
    participant CDN as CDN Edge

    C->>GW: 1. GET /files/{id}/metadata
    GW->>Meta: 2. Fetch file metadata
    Meta->>Cache: 3. Check metadata cache
    Cache-->>Meta: 4. Cache hit/miss
    alt Cache miss
        Meta->>Meta: 5. Query metadata store
    end
    Meta-->>C: 6. Return {version, block_list[], size}

    C->>C: 7. Identify blocks not in local cache

    loop For each needed block
        C->>CDN: 8. GET /blocks/{hash}
        alt CDN cache hit
            CDN-->>C: 9a. Return cached block
        else CDN cache miss
            CDN->>GW: 9b. Forward to origin
            GW->>Block: 10. Fetch block
            Block->>BS: 11. Read from block storage
            BS-->>Block: 12. Return block data
            Block-->>CDN: 13. Return + cache at edge
            CDN-->>C: 14. Return block
        end
    end

    C->>C: 15. Reassemble file from blocks
    C->>C: 16. Verify file checksum
    C->>C: 17. Write to local filesystem
```

### 2.3 Sync Flow (Bidirectional)

```mermaid
sequenceDiagram
    participant C as Client (Device A)
    participant Sync as Sync Service
    participant Meta as Metadata Service
    participant Notif as Notification Service
    participant C2 as Client (Device B)

    Note over C,C2: Device B modifies a file

    C2->>Sync: 1. Upload changed blocks + commit
    Sync->>Meta: 2. Update file version
    Sync->>Notif: 3. File changed event

    Notif->>C: 4. Push: file_id changed (v3 → v4)

    C->>Sync: 5. GET /sync/delta {file_id, my_version: v3}
    Sync->>Meta: 6. Compute delta (v3 → v4)
    Meta-->>Sync: 7. Changed blocks list
    Sync-->>C: 8. Delta: {added_blocks, removed_blocks}

    C->>C: 9. Download only new blocks
    C->>C: 10. Apply delta to local file
    C->>Sync: 11. ACK sync complete for v4

    Note over C,C2: Conflict Scenario

    par Device A edits file
        C->>Sync: 12a. Commit v4 (from base v3)
    and Device B edits same file
        C2->>Sync: 12b. Commit v4 (from base v3)
    end

    Sync->>Sync: 13. Detect conflict (two v4 from same v3)
    Sync->>Sync: 14. First-writer-wins for canonical v4
    Sync->>C2: 15. Conflict notification
    Sync->>C2: 16. Create "conflicted copy" for second writer
```

---

## 3. Key Architectural Decisions

### 3.1 Monolith vs Microservices

**Decision: Microservices**

| Factor | Justification |
|--------|---------------|
| Independent scaling | Block service scales on bandwidth; metadata service scales on IOPS; sync service scales on connection count |
| Team ownership | Separate teams own storage, sync, sharing, search |
| Deployment velocity | Block storage rarely changes; sync logic iterates frequently |
| Failure isolation | Metadata outage should not prevent cached file access |

### 3.2 Synchronous vs Asynchronous Communication

| Communication | Pattern | Reason |
|---------------|---------|--------|
| Client ↔ Sync Service | **Synchronous** (HTTP/gRPC) | User-facing; needs immediate response |
| Sync → Notification | **Asynchronous** (Message Queue) | Fan-out to many devices; fire-and-forget |
| Block Service → Storage | **Synchronous** | Must confirm durability before ACK |
| Metadata → Search Index | **Asynchronous** | Search can lag behind by seconds |
| Metadata → Thumbnail Workers | **Asynchronous** | Background processing, non-critical path |

### 3.3 Database Choices

| Data Type | Storage Choice | Justification |
|-----------|---------------|---------------|
| **File metadata** | Sharded SQL (MySQL/PostgreSQL) | Strong consistency, complex queries (file tree traversal), ACID transactions |
| **Block data** | Custom content-addressable blob store | Immutable blocks, erasure coding, optimized for large sequential I/O |
| **Block hash registry** | Wide-column store (Cassandra-like) | High write throughput for dedup checks, simple key-value pattern |
| **User sessions/tokens** | In-memory store (Redis) | Fast lookup, TTL-based expiry |
| **Search index** | Inverted index (Elasticsearch-like) | Full-text search across file content and names |
| **Audit log** | Append-only log store | Immutable audit trail, time-series queries |
| **Cold metadata** | LSM-tree on object storage | 5.5x cheaper per GB than primary metadata store |

### 3.4 Caching Strategy

```
┌─────────────────────────────────────────────────────┐
│ L1: Client-side Cache                                │
│ • Local block cache (recently accessed blocks)       │
│ • File tree cache (last known state)                 │
│ • Sync cursor (last sync position)                   │
├─────────────────────────────────────────────────────┤
│ L2: CDN Edge Cache                                   │
│ • Popular shared files                               │
│ • Public link content                                │
│ • Thumbnail/preview cache                            │
├─────────────────────────────────────────────────────┤
│ L3: Application-level Consistent Cache               │
│ • Metadata cache (file tree, permissions)            │
│ • Block location cache (hash → storage location)    │
│ • Strong consistency via cache invalidation on write │
├─────────────────────────────────────────────────────┤
│ L4: Database Buffer Pool / Page Cache                │
│ • SQL query result cache                             │
│ • Hot data pages in memory                           │
└─────────────────────────────────────────────────────┘
```

### 3.5 Message Queue Usage

| Queue | Producers | Consumers | Purpose |
|-------|-----------|-----------|---------|
| `file.changed` | Sync Service | Notification Service, Search Indexer | Fan-out file change events |
| `block.stored` | Block Service | Thumbnail Worker, Preview Generator | Post-upload processing |
| `user.activity` | API Gateway | Analytics, Audit Logger | Usage tracking |
| `gc.candidates` | Version Cleanup Job | GC Worker | Garbage collect unreferenced blocks |
| `share.events` | Sharing Service | Notification Service, Email Service | Share/unshare notifications |

---

## 4. Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---------|----------|---------------|
| Sync vs Async | **Hybrid** | Sync for user-facing paths; async for background processing |
| Event-driven vs Request-response | **Event-driven** for sync propagation | Changes fan-out to N devices via events |
| Push vs Pull | **Push** for sync notifications; **Pull** for block content | Push reduces sync latency; pull allows CDN caching |
| Stateless vs Stateful | **Stateless services** + stateful sync connections | WebSocket connections for real-time notifications are stateful |
| Read/Write optimization | **Write-optimized** upload path; **read-optimized** download (CDN) | Dedup on write; cache on read |
| Real-time vs Batch | **Real-time** sync; **batch** for GC, indexing, analytics | Users expect immediate sync; background tasks can batch |
| Edge vs Origin | **Edge** for downloads (CDN); **Origin** for uploads/metadata | Uploads need strong consistency at origin |

---

## 5. Component Responsibilities

| Component | Responsibilities |
|-----------|-----------------|
| **Sync Service** | Manages sync state machine, detects conflicts, coordinates upload/download flows, maintains sync cursors per device |
| **Metadata Service** | Manages file tree (namespaces), versions, permissions, sharing ACLs; strongly consistent via sharded SQL |
| **Block Service** | Handles block upload/download, deduplication check, hash verification, erasure coding coordination |
| **Sharing Service** | Manages shared folders, link generation, permission grants/revocations, team folder membership |
| **Search Service** | Full-text indexing of file content and names, metadata-based filtering, ranked results |
| **Notification Service** | Real-time change notifications via WebSocket/long-poll/push, delivery guarantees, connection management |
| **Block Storage** | Custom content-addressable blob store with erasure coding, multi-zone replication, tiered storage (hot/cold) |
| **Metadata Store** | Sharded SQL with consistent caching layer, supports millions of QPS at single-digit ms latency |
| **Background Workers** | Thumbnail generation, content indexing, garbage collection, storage tiering, compliance scanning |

---

## 6. Streaming Sync Architecture

A key innovation (pioneered by Dropbox) is **streaming sync** --- allowing file contents to stream through servers between clients without waiting for the full upload to complete:

```mermaid
sequenceDiagram
    participant A as Device A (uploader)
    participant S as Sync Server
    participant B as Device B (downloader)

    Note over A,B: Traditional Sync (store-and-forward)
    A->>S: Upload complete file
    S->>S: Store to block storage
    S->>B: Notify file available
    B->>S: Download file

    Note over A,B: Streaming Sync (pipelined)
    A->>S: Stream block 1
    S->>B: Forward block 1 (immediately)
    A->>S: Stream block 2
    S->>B: Forward block 2
    A->>S: Stream block 3 + commit
    S->>S: Persist to block storage (async)
    S->>B: Forward block 3 + commit

    Note over A,B: Result: 2x faster multi-device sync
```

This architecture provides up to **2x improvement** in multi-client sync times, particularly beneficial for teams collaborating on large files.
