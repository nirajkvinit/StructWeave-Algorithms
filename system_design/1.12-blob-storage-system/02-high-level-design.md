# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture Overview

### Core Components

```mermaid
flowchart TB
    subgraph Clients["Client Applications"]
        C1["Web App"]
        C2["Mobile App"]
        C3["Data Pipeline"]
        C4["Backup Service"]
    end

    subgraph Gateway["Access Layer"]
        LB["Load Balancer / CDN"]
        API["API Gateway"]
    end

    subgraph Control["Control Plane"]
        MS["Metadata Service"]
        IM["Index Manager"]
        PM["Placement Manager"]
    end

    subgraph Data["Data Plane"]
        SN1["Storage Node 1"]
        SN2["Storage Node 2"]
        SN3["Storage Node 3"]
        SN4["Storage Node N..."]
    end

    subgraph Async["Async Services"]
        GC["Garbage Collector"]
        REP["Replication Manager"]
        TIER["Tiering Service"]
    end

    C1 & C2 & C3 & C4 --> LB
    LB --> API
    API --> MS
    MS --> IM
    MS --> PM
    PM --> SN1 & SN2 & SN3 & SN4
    API -->|"Data Path"| SN1 & SN2 & SN3 & SN4
    GC --> SN1 & SN2 & SN3 & SN4
    REP --> SN1 & SN2 & SN3 & SN4
    TIER --> SN1 & SN2 & SN3 & SN4
```

### Component Responsibilities

| Component | Responsibility | Key Operations |
|-----------|---------------|----------------|
| **API Gateway** | Request routing, authentication, rate limiting | Authenticate, Route, Throttle |
| **Metadata Service** | Object/bucket metadata, consistency, indexing | CreateObject, GetMetadata, ListObjects |
| **Placement Manager** | Decide which storage nodes hold data | AssignChunks, Rebalance, LocateData |
| **Storage Nodes** | Store and retrieve actual data chunks | WriteChunk, ReadChunk, DeleteChunk |
| **Index Manager** | Maintain searchable indexes for listing | IndexObject, ListByPrefix, DeleteIndex |
| **Replication Manager** | Cross-region replication, repair | Replicate, RepairChunk, SyncRegion |
| **Garbage Collector** | Clean up deleted/orphaned data | MarkForDeletion, Compact, Reclaim |
| **Tiering Service** | Move data between storage classes | TransitionCold, RestoreHot, LifecycleEnforce |

---

## Detailed Architecture

### Two-Tier Architecture (Metadata + Data Separation)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      BLOB STORAGE SYSTEM                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      API GATEWAY LAYER                       │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐             │   │
│  │  │   REST     │  │    S3      │  │  Internal  │             │   │
│  │  │   API      │  │  Compat    │  │    gRPC    │             │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘             │   │
│  │        └───────────────┴───────────────┘                     │   │
│  │                        │                                      │   │
│  │  ┌────────────────────┴────────────────────────────────────┐ │   │
│  │  │  Auth / ACL / Rate Limit / Request Validation           │ │   │
│  │  └────────────────────┬────────────────────────────────────┘ │   │
│  └───────────────────────┼──────────────────────────────────────┘   │
│                          │                                          │
│  ┌───────────────────────┴──────────────────────────────────────┐   │
│  │                    CONTROL PLANE (Metadata)                    │   │
│  │                                                                │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │   │
│  │  │   Metadata     │  │   Placement    │  │    Index       │  │   │
│  │  │   Service      │  │   Manager      │  │   Manager      │  │   │
│  │  │                │  │                │  │                │  │   │
│  │  │  • Bucket info │  │  • Consistent  │  │  • Prefix      │  │   │
│  │  │  • Object meta │  │    hashing     │  │    index       │  │   │
│  │  │  • Versioning  │  │  • Node health │  │  • List cache  │  │   │
│  │  │  • ACLs        │  │  • Rebalancing │  │  • Pagination  │  │   │
│  │  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘  │   │
│  │          │                   │                   │            │   │
│  │  ┌───────┴───────────────────┴───────────────────┴──────────┐ │   │
│  │  │              Metadata Storage (Distributed DB)            │ │   │
│  │  │         (MySQL Cluster / CockroachDB / TiKV)             │ │   │
│  │  └──────────────────────────────────────────────────────────┘ │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                          │                                          │
│  ┌───────────────────────┴──────────────────────────────────────┐   │
│  │                    DATA PLANE (Storage)                        │   │
│  │                                                                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │   │
│  │  │ Storage  │  │ Storage  │  │ Storage  │  │ Storage  │      │   │
│  │  │ Node 1   │  │ Node 2   │  │ Node 3   │  │ Node N   │      │   │
│  │  │          │  │          │  │          │  │          │      │   │
│  │  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │      │   │
│  │  │ │Chunk │ │  │ │Chunk │ │  │ │Chunk │ │  │ │Chunk │ │      │   │
│  │  │ │Store │ │  │ │Store │ │  │ │Store │ │  │ │Store │ │      │   │
│  │  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │      │   │
│  │  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │      │   │
│  │  │ │ HDD  │ │  │ │ HDD  │ │  │ │ HDD  │ │  │ │ HDD  │ │      │   │
│  │  │ │ Pool │ │  │ │ Pool │ │  │ │ Pool │ │  │ │ Pool │ │      │   │
│  │  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │      │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Storage Node Architecture

```mermaid
flowchart TB
    subgraph StorageNode["Storage Node"]
        subgraph API["Node API"]
            GRPC["gRPC Server"]
        end

        subgraph ChunkMgr["Chunk Manager"]
            Writer["Chunk Writer"]
            Reader["Chunk Reader"]
            Erasure["Erasure Encoder"]
        end

        subgraph Cache["Caching Layer"]
            RC["Read Cache (Memory)"]
            WB["Write Buffer"]
        end

        subgraph Disk["Disk Management"]
            Journal["Write Journal"]
            DS["Data Store"]
            Meta["Local Metadata"]
        end

        GRPC --> Writer
        GRPC --> Reader
        Writer --> Erasure
        Writer --> WB
        WB --> Journal
        Journal --> DS
        Reader --> RC
        RC --> DS
        Erasure --> DS
    end
```

---

## Data Flow

### Write Path (Object Upload)

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant Meta as Metadata Service
    participant PM as Placement Manager
    participant SN1 as Storage Node 1
    participant SN2 as Storage Node 2
    participant SN3 as Storage Node 3

    Note over Client,SN3: Simple Upload (< 5GB)

    Client->>Gateway: PUT /bucket/object (data, metadata)
    Gateway->>Gateway: Authenticate, Authorize
    Gateway->>Meta: CreateObjectMetadata(bucket, key, size)
    Meta->>Meta: Check bucket exists, quotas
    Meta->>PM: GetChunkPlacements(object_id, size)
    PM->>PM: Consistent hash → select nodes
    PM-->>Meta: [Node1, Node2, Node3] (for erasure coding)
    Meta-->>Gateway: Upload URLs/tokens for each node

    par Upload chunks in parallel
        Gateway->>SN1: WriteChunk(chunk_id, data[0:n])
        Gateway->>SN2: WriteChunk(chunk_id, data[n:2n])
        Gateway->>SN3: WriteParity(chunk_id, parity)
    end

    SN1-->>Gateway: OK (checksum)
    SN2-->>Gateway: OK (checksum)
    SN3-->>Gateway: OK (checksum)

    Gateway->>Meta: CommitObject(object_id, checksums, locations)
    Meta->>Meta: Mark object VISIBLE
    Meta-->>Gateway: ETag, VersionId

    Gateway-->>Client: 200 OK (ETag: "abc123")
```

### Read Path (Object Download)

```mermaid
sequenceDiagram
    participant Client
    participant CDN as CDN/Cache
    participant Gateway as API Gateway
    participant Meta as Metadata Service
    participant SN as Storage Node

    Note over Client,SN: Read with CDN Cache

    Client->>CDN: GET /bucket/object
    alt Cache Hit
        CDN-->>Client: Return cached data
    else Cache Miss
        CDN->>Gateway: GET /bucket/object (Origin)
        Gateway->>Gateway: Authenticate
        Gateway->>Meta: GetObjectMetadata(bucket, key)
        Meta-->>Gateway: {size, chunks: [{node, chunk_id}...], etag}

        Gateway->>SN: ReadChunks(chunk_ids)
        SN->>SN: Read from disk, verify checksum
        SN-->>Gateway: Chunk data

        Note over Gateway: Reassemble chunks if erasure coded
        Gateway->>Gateway: Assemble object from chunks

        Gateway-->>CDN: 200 OK (data, ETag, Cache-Control)
        CDN->>CDN: Cache response
        CDN-->>Client: Return data
    end
```

### Delete Path

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant Meta as Metadata Service
    participant GC as Garbage Collector
    participant SN as Storage Nodes

    Note over Client,SN: Delete with Deferred Cleanup

    Client->>Gateway: DELETE /bucket/object
    Gateway->>Gateway: Authenticate, Authorize
    Gateway->>Meta: MarkForDeletion(bucket, key)
    Meta->>Meta: Add delete marker (versioning) or mark DELETED
    Meta-->>Gateway: OK (DeleteMarker: true)
    Gateway-->>Client: 204 No Content

    Note over GC,SN: Async Garbage Collection (later)
    GC->>Meta: GetDeletedObjects(older_than=24h)
    Meta-->>GC: [object_ids...]

    loop For each deleted object
        GC->>Meta: GetChunkLocations(object_id)
        Meta-->>GC: [(node, chunk_id)...]
        par Delete chunks
            GC->>SN: DeleteChunk(chunk_id)
        end
        GC->>Meta: FinalizeDelete(object_id)
    end
```

### Multipart Upload Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant Meta as Metadata Service
    participant PM as Placement Manager
    participant SN as Storage Nodes

    Note over Client,SN: Large File Multipart Upload

    Client->>Gateway: POST /bucket/object?uploads (Initiate)
    Gateway->>Meta: CreateMultipartUpload(bucket, key)
    Meta-->>Gateway: UploadId: "mpu-123"
    Gateway-->>Client: UploadId: "mpu-123"

    loop Upload Parts (1 to N)
        Client->>Gateway: PUT /bucket/object?partNumber=1&uploadId=mpu-123
        Gateway->>PM: GetPartPlacement(upload_id, part_num)
        PM-->>Gateway: [NodeA, NodeB, NodeC]
        par Upload part chunks
            Gateway->>SN: WritePartChunk(...)
        end
        SN-->>Gateway: OK (ETag: "part1-etag")
        Gateway->>Meta: RegisterPart(upload_id, part_num, etag, size)
        Gateway-->>Client: ETag: "part1-etag"
    end

    Client->>Gateway: POST /bucket/object?uploadId=mpu-123 (Complete)
    Note over Gateway: Body: [{PartNumber: 1, ETag: "part1"}, ...]
    Gateway->>Meta: CompleteMultipartUpload(upload_id, parts[])
    Meta->>Meta: Verify all parts present, calculate final ETag
    Meta->>Meta: Create final object metadata, link parts
    Meta-->>Gateway: Final ETag, VersionId
    Gateway-->>Client: 200 OK (ETag, Location)
```

---

## Key Architectural Decisions

### Decision 1: Metadata and Data Separation

| Aspect | Combined | Separated (Recommended) |
|--------|----------|------------------------|
| **Scaling** | Hard to scale independently | Scale metadata/data separately |
| **Consistency** | Single point of truth | Metadata can be strongly consistent, data eventually |
| **Performance** | Metadata queries hit same nodes | Optimized for each workload |
| **Technology** | One storage system | Specialized: DB for metadata, log-structured for data |

**Recommendation:** Separate metadata service (scalable distributed database) from data plane (append-only storage nodes).

### Decision 2: Durability Strategy

| Aspect | 3x Replication | Erasure Coding RS(10,4) |
|--------|----------------|-------------------------|
| **Storage Overhead** | 200% (3 copies) | 40% (14 chunks for 10 data) |
| **Write Latency** | Lower (parallel writes) | Higher (encoding overhead) |
| **Read Latency** | Lower (any copy) | Higher (may need decode) |
| **Repair Cost** | Copy full object | Reconstruct from any 10 chunks |
| **Best For** | Hot data, small files | Cold data, large files |

**Recommendation:** Hybrid approach - replication for hot/small objects, erasure coding for cold/large objects.

### Decision 3: Consistency Model

| Aspect | Eventual | Strong (S3 since 2020) |
|--------|----------|------------------------|
| **Read After Write** | May read stale | Always see latest |
| **List After Write** | Object may not appear | Object appears immediately |
| **Complexity** | Simpler | Requires coordination |
| **Latency** | Lower | Slightly higher |

**Recommendation:** Strong consistency (modern expectation). Achieve via CRDT-based metadata or distributed transaction.

### Decision 4: Chunk Size

| Size | Pros | Cons | Use Case |
|------|------|------|----------|
| **4 MB** | Fine-grained parallelism, good for small files | More metadata overhead, more chunks | Mixed workloads |
| **64 MB** | Less metadata, efficient large files | Wasted space for small files | Data lake, backups |
| **Variable (CDC)** | Deduplication benefit | Complex, more CPU | Backup with dedup |

**Recommendation:** 64 MB default for simplicity. Smaller chunks for multipart upload parts.

---

## High-Level Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BLOB STORAGE SYSTEM                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   CLIENT LAYER                                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  SDK/CLI        Browser        Data Pipeline      Backup     │   │
│   │     │              │               │                │        │   │
│   │     └──────────────┴───────────────┴────────────────┘        │   │
│   │                           │                                   │   │
│   │                    HTTPS / S3 API                             │   │
│   └───────────────────────────┼───────────────────────────────────┘   │
│                               │                                       │
│   EDGE LAYER                  │                                       │
│   ┌───────────────────────────┼───────────────────────────────────┐   │
│   │                    ┌──────┴──────┐                            │   │
│   │                    │    CDN      │◄── Cache Hot Objects       │   │
│   │                    └──────┬──────┘                            │   │
│   │                           │                                    │   │
│   │                    ┌──────┴──────┐                            │   │
│   │                    │ API Gateway │◄── Auth, Rate Limit        │   │
│   │                    └──────┬──────┘                            │   │
│   └───────────────────────────┼───────────────────────────────────┘   │
│                               │                                       │
│   CONTROL PLANE               │                                       │
│   ┌───────────────────────────┼───────────────────────────────────┐   │
│   │            ┌──────────────┴──────────────┐                    │   │
│   │            │      METADATA SERVICE       │                    │   │
│   │            │  ┌────────────────────────┐ │                    │   │
│   │            │  │ Bucket/Object Metadata │ │                    │   │
│   │            │  │ Versioning & Lifecycle │ │                    │   │
│   │            │  │ ACL & Policies         │ │                    │   │
│   │            │  └────────────────────────┘ │                    │   │
│   │            └──────────────┬──────────────┘                    │   │
│   │                           │                                    │   │
│   │       ┌───────────────────┼───────────────────┐               │   │
│   │       │                   │                   │               │   │
│   │       ▼                   ▼                   ▼               │   │
│   │  ┌─────────┐       ┌─────────┐        ┌─────────┐            │   │
│   │  │Placement│       │  Index  │        │ Quota   │            │   │
│   │  │ Manager │       │ Service │        │ Manager │            │   │
│   │  └─────────┘       └─────────┘        └─────────┘            │   │
│   └───────────────────────────┼───────────────────────────────────┘   │
│                               │                                       │
│   DATA PLANE                  │                                       │
│   ┌───────────────────────────┼───────────────────────────────────┐   │
│   │                           │                                    │   │
│   │     ┌─────────────────────┴─────────────────────┐             │   │
│   │     │              STORAGE CLUSTER               │             │   │
│   │     │                                           │             │   │
│   │  ┌──┴──┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  │             │   │
│   │  │ SN1 │  │ SN2 │  │ SN3 │  │ SN4 │  │ SNn │  │             │   │
│   │  │     │  │     │  │     │  │     │  │     │  │             │   │
│   │  │█████│  │█████│  │█████│  │█████│  │█████│  │             │   │
│   │  │█████│  │█████│  │█████│  │█████│  │█████│  │             │   │
│   │  │█████│  │█████│  │█████│  │█████│  │█████│  │             │   │
│   │  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  │             │   │
│   │     │         │         │         │         │  │             │   │
│   │     └─────────┴─────────┴─────────┴─────────┘  │             │   │
│   │              Data Chunks + Parity              │             │   │
│   │                                                │             │   │
│   │     └──────────────────────────────────────────┘             │   │
│   │                                                               │   │
│   └───────────────────────────────────────────────────────────────┘   │
│                               │                                       │
│   ASYNC SERVICES              │                                       │
│   ┌───────────────────────────┼───────────────────────────────────┐   │
│   │     ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐│   │
│   │     │ Garbage │    │  Data   │    │ Repair  │    │Lifecycle││   │
│   │     │Collector│    │Replicatr│    │ Service │    │ Manager ││   │
│   │     └─────────┘    └─────────┘    └─────────┘    └─────────┘│   │
│   └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Region Architecture

### Cross-Region Replication

```mermaid
flowchart TB
    subgraph Region1["Region: US-East (Primary)"]
        C1["Client"]
        API1["API Gateway"]
        Meta1["Metadata<br/>Service"]
        Store1["Storage<br/>Cluster"]
        C1 --> API1
        API1 --> Meta1
        API1 --> Store1
    end

    subgraph Region2["Region: EU-West (Replica)"]
        C2["Client"]
        API2["API Gateway"]
        Meta2["Metadata<br/>Service"]
        Store2["Storage<br/>Cluster"]
        C2 --> API2
        API2 --> Meta2
        API2 --> Store2
    end

    subgraph Replication["Replication Layer"]
        RepQ["Replication<br/>Queue"]
        RepW["Replication<br/>Workers"]
    end

    Store1 -->|"1. New object event"| RepQ
    RepQ -->|"2. Consume"| RepW
    RepW -->|"3. Copy data"| Store2
    RepW -->|"4. Update metadata"| Meta2
```

### Multi-Region Consistency Options

```
┌─────────────────────────────────────────────────────────────────────┐
│  MULTI-REGION STRATEGIES                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  OPTION 1: Async Cross-Region Replication (S3 CRR)                  │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │   US-East (Primary)              EU-West (Replica)            │ │
│  │   ┌──────────────┐               ┌──────────────┐             │ │
│  │   │   Bucket A   │──── async ───►│  Bucket A'   │             │ │
│  │   └──────────────┘   (~seconds)  └──────────────┘             │ │
│  │                                                                 │ │
│  │   Pros: Low latency writes, no cross-region coordination       │ │
│  │   Cons: RPO > 0 (may lose recent writes), read-after-write    │ │
│  │         not guaranteed cross-region                            │ │
│  │   Use: Disaster recovery, global read acceleration            │ │
│  │                                                                 │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  OPTION 2: Multi-Master with Conflict Resolution                    │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │   US-East                         EU-West                      │ │
│  │   ┌──────────────┐               ┌──────────────┐             │ │
│  │   │   Bucket A   │◄──── sync ───►│   Bucket A   │             │ │
│  │   └──────────────┘    (CRDTs)    └──────────────┘             │ │
│  │                                                                 │ │
│  │   Pros: Write anywhere, automatic conflict resolution          │ │
│  │   Cons: Complex, last-writer-wins semantics                    │ │
│  │   Use: Active-active global deployment                         │ │
│  │                                                                 │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  OPTION 3: Primary with Read Replicas                               │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │   US-East (Primary)   EU-West (Read)   Asia (Read)            │ │
│  │   ┌──────────────┐    ┌──────────────┐ ┌──────────────┐       │ │
│  │   │  Read/Write  │───►│  Read Only   │ │  Read Only   │       │ │
│  │   └──────────────┘    └──────────────┘ └──────────────┘       │ │
│  │                                                                 │ │
│  │   Pros: Simple consistency model, strong in primary            │ │
│  │   Cons: Write latency from non-primary regions                 │ │
│  │   Use: Read-heavy global workloads                             │ │
│  │                                                                 │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Storage Node Internal Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                         STORAGE NODE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      Network Layer                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │ gRPC Server  │  │ HTTP Server  │  │  Metrics     │       │   │
│  │  │ (internal)   │  │ (data path)  │  │  Exporter    │       │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────┘       │   │
│  │         └─────────────────┘                                   │   │
│  └─────────────────────┬───────────────────────────────────────┘   │
│                        │                                            │
│  ┌─────────────────────┴───────────────────────────────────────┐   │
│  │                    Request Handler                            │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │  • Chunk ID parsing                                     │  │   │
│  │  │  • Checksum verification                                │  │   │
│  │  │  • Quota enforcement                                    │  │   │
│  │  │  • Request deduplication                                │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────┬───────────────────────────────────────┘   │
│                        │                                            │
│  ┌─────────────────────┴───────────────────────────────────────┐   │
│  │                   Chunk Manager                               │   │
│  │                                                               │   │
│  │  ┌────────────┐    ┌────────────┐    ┌────────────┐         │   │
│  │  │   Write    │    │   Read     │    │   Delete   │         │   │
│  │  │   Path     │    │   Path     │    │   Path     │         │   │
│  │  └─────┬──────┘    └─────┬──────┘    └─────┬──────┘         │   │
│  │        │                 │                 │                  │   │
│  │  ┌─────┴─────────────────┴─────────────────┴─────────────┐   │   │
│  │  │               Buffer / Cache Layer                      │   │   │
│  │  │  ┌──────────────┐    ┌──────────────┐                  │   │   │
│  │  │  │ Write Buffer │    │  Read Cache  │                  │   │   │
│  │  │  │ (Memory)     │    │  (Memory/SSD)│                  │   │   │
│  │  │  └──────────────┘    └──────────────┘                  │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  └─────────────────────┬───────────────────────────────────────┘   │
│                        │                                            │
│  ┌─────────────────────┴───────────────────────────────────────┐   │
│  │                   Storage Engine                              │   │
│  │                                                               │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │                Log-Structured Store                      │  │   │
│  │  │                                                          │  │   │
│  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │  │   │
│  │  │  │ Volume │ │ Volume │ │ Volume │ │ Volume │           │  │   │
│  │  │  │   1    │ │   2    │ │   3    │ │   N    │           │  │   │
│  │  │  │        │ │        │ │        │ │        │           │  │   │
│  │  │  │┌──────┐│ │┌──────┐│ │┌──────┐│ │┌──────┐│           │  │   │
│  │  │  ││Needle││ ││Needle││ ││Needle││ ││Needle││           │  │   │
│  │  │  ││ File ││ ││ File ││ ││ File ││ ││ File ││           │  │   │
│  │  │  │└──────┘│ │└──────┘│ │└──────┘│ │└──────┘│           │  │   │
│  │  │  │┌──────┐│ │┌──────┐│ │┌──────┐│ │┌──────┐│           │  │   │
│  │  │  ││Index ││ ││Index ││ ││Index ││ ││Index ││           │  │   │
│  │  │  │└──────┘│ │└──────┘│ │└──────┘│ │└──────┘│           │  │   │
│  │  │  └────────┘ └────────┘ └────────┘ └────────┘           │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                        │                                            │
│  ┌─────────────────────┴───────────────────────────────────────┐   │
│  │                   Disk Layer                                  │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │   │
│  │  │  HDD 1  │ │  HDD 2  │ │  HDD 3  │ │  HDD N  │            │   │
│  │  │  10TB   │ │  10TB   │ │  10TB   │ │  10TB   │            │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### Where Blob Storage Fits

```mermaid
flowchart TB
    subgraph Apps["Application Layer"]
        Web["Web Application"]
        Mobile["Mobile App"]
        API["API Service"]
    end

    subgraph Compute["Compute Layer"]
        Lambda["Serverless Functions"]
        K8s["Kubernetes Pods"]
        VMs["Virtual Machines"]
    end

    subgraph Data["Data Services"]
        DB["Database"]
        Cache["Redis Cache"]
        Queue["Message Queue"]
    end

    subgraph Storage["Storage Layer"]
        Blob["Blob Storage<br/>(Primary)"]
        CDN["CDN"]
        Archive["Archive Storage"]
    end

    subgraph Analytics["Analytics"]
        Lake["Data Lake<br/>(Parquet on Blob)"]
        Spark["Spark/Presto"]
        ML["ML Training"]
    end

    Web & Mobile & API --> Blob
    Lambda & K8s & VMs --> Blob
    DB -->|"Backups"| Blob
    Blob --> CDN
    Blob -->|"Lifecycle"| Archive
    Blob --> Lake
    Lake --> Spark & ML
```

### Common Integrations

| Integration | Purpose | Pattern |
|-------------|---------|---------|
| **CDN** | Edge caching for read acceleration | Blob as origin, signed URLs |
| **Kubernetes** | Container image registry, persistent volumes | S3-compatible CSI driver |
| **Database** | Backup storage, large object offload | Periodic snapshots, TOAST substitute |
| **Streaming** | Event source, sink for streams | Kafka Connect S3 Sink |
| **Data Lake** | Foundation for analytics | Parquet/ORC files, partitioning |
| **ML Pipeline** | Training data, model artifacts | Large file storage, versioning |
| **CI/CD** | Build artifacts, deployment packages | Upload on build, fetch on deploy |
| **Compliance** | Audit logs, long-term retention | WORM, lifecycle to archive |
