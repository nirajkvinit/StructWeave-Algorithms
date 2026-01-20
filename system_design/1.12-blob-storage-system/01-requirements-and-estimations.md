# Requirements & Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Requirements

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-1 | Object Upload | P0 | Store objects (blobs) with unique keys within buckets |
| FR-2 | Object Download | P0 | Retrieve objects by bucket/key with support for range requests |
| FR-3 | Object Deletion | P0 | Remove objects from storage with eventual space reclamation |
| FR-4 | Bucket Management | P0 | Create, list, delete buckets (logical containers for objects) |
| FR-5 | Object Listing | P0 | List objects in bucket with prefix filtering and pagination |
| FR-6 | Multipart Upload | P0 | Upload large objects in parallel chunks with assembly |
| FR-7 | Object Metadata | P0 | Store and retrieve custom metadata with each object |

### Extended Requirements

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-8 | Versioning | P1 | Maintain multiple versions of objects, retrieve by version ID |
| FR-9 | Lifecycle Policies | P1 | Automatic transition between storage classes and expiration |
| FR-10 | Cross-Region Replication | P1 | Asynchronous replication to other regions |
| FR-11 | Pre-signed URLs | P1 | Generate time-limited URLs for direct access without credentials |
| FR-12 | Copy Object | P1 | Server-side copy without re-uploading data |
| FR-13 | Conditional Operations | P2 | ETag-based conditional GET/PUT (If-Match, If-None-Match) |
| FR-14 | Object Tagging | P2 | Attach key-value tags for organization and lifecycle rules |
| FR-15 | Batch Operations | P2 | Bulk delete, copy, or tag thousands of objects |

### Advanced Requirements

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-16 | Object Lock | P2 | WORM (Write Once Read Many) compliance for immutability |
| FR-17 | Event Notifications | P2 | Trigger events on object create/delete for downstream processing |
| FR-18 | Inventory Reports | P3 | Scheduled reports of all objects with metadata |
| FR-19 | Select from Object | P3 | Query CSV/JSON objects using SQL without downloading |
| FR-20 | Storage Analytics | P3 | Access patterns, cost breakdown, usage statistics |

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Requirement | Rationale |
|--------|-------------|-----------|
| **Upload Throughput** | > 10 GB/s aggregate | Support concurrent large file uploads |
| **Download Throughput** | > 50 GB/s aggregate | CDN origin and data processing workloads |
| **First Byte Latency (p50)** | < 50ms | Metadata lookup + storage node contact |
| **First Byte Latency (p99)** | < 100ms | Account for cross-AZ and cache misses |
| **Requests per Second** | > 100,000 RPS | Serve high-concurrency web workloads |
| **Multipart Part Upload** | < 200ms per part | Parallel chunk uploads should be fast |

### Durability Requirements

| Metric | Requirement | Description |
|--------|-------------|-------------|
| **Annual Durability** | 99.999999999% (11 nines) | Lose at most 1 object per 10 billion per year |
| **Data Integrity** | 100% | Every bit returned matches what was stored |
| **Corruption Detection** | Checksums on all data | MD5/SHA256 verification on read |
| **Repair Time** | < 24 hours | Reconstruct lost chunks before further failures |

### Availability Requirements

| Metric | Target | Description |
|--------|--------|-------------|
| **Read Availability** | 99.99% | < 52 minutes downtime/year for reads |
| **Write Availability** | 99.9% | < 8.7 hours downtime/year for writes |
| **Multi-AZ** | Automatic failover | Survive AZ failure without data loss |
| **Multi-Region** | Optional replication | Geographic redundancy for DR |

### Scalability Requirements

| Metric | Target | Description |
|--------|--------|-------------|
| **Total Storage** | Exabytes | No practical upper limit |
| **Objects per Bucket** | Unlimited | No fixed limit on object count |
| **Object Size** | 0 bytes - 5 TB | Multipart required for > 5 GB |
| **Buckets per Account** | > 1,000 | Soft limit, adjustable |
| **Concurrent Connections** | > 1 million | Global aggregate connections |

---

## Use Cases

### Primary Use Cases

#### 1. Media Asset Storage and Delivery

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Video Platform Media Storage                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Upload Flow:                                                        │
│  1. User uploads 2GB video file                                     │
│  2. Client initiates multipart upload                               │
│  3. File split into 64MB chunks, uploaded in parallel               │
│  4. Server assembles chunks, stores with erasure coding             │
│  5. Transcoding service triggered via event notification            │
│                                                                      │
│  Storage Layout:                                                    │
│    /videos/{video_id}/original.mp4           (2 GB, archival)      │
│    /videos/{video_id}/transcoded/1080p.mp4   (1 GB, hot)           │
│    /videos/{video_id}/transcoded/720p.mp4    (500 MB, hot)         │
│    /videos/{video_id}/transcoded/480p.mp4    (200 MB, hot)         │
│    /videos/{video_id}/thumbnail.jpg          (50 KB, hot)          │
│                                                                      │
│  Delivery:                                                          │
│  - CDN caches transcoded versions                                   │
│  - Blob storage serves as origin                                    │
│  - Pre-signed URLs for authenticated access                         │
│                                                                      │
│  Scale: 10 million videos, 50 PB storage, 1M views/day             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2. Data Lake and Analytics

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Analytics Data Lake                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Ingestion:                                                          │
│  - Kafka streams write Parquet files every 15 minutes              │
│  - Log aggregators write compressed logs hourly                     │
│  - ETL jobs write transformed datasets daily                        │
│                                                                      │
│  Storage Layout (Hive-partitioned):                                 │
│    s3://data-lake/events/                                          │
│      year=2024/month=01/day=15/                                    │
│        part-00000.parquet  (128 MB)                                │
│        part-00001.parquet  (128 MB)                                │
│                                                                      │
│  Query Patterns:                                                    │
│  - Athena/Presto: SQL over Parquet (predicate pushdown)            │
│  - Spark: Distributed processing, shuffle to/from blob storage     │
│  - ML training: Read TFRecords/Parquet for model training          │
│                                                                      │
│  Lifecycle:                                                          │
│  - 0-30 days: Standard storage (hot)                               │
│  - 30-90 days: Infrequent Access                                   │
│  - 90+ days: Archive/Glacier                                       │
│                                                                      │
│  Scale: 500 TB/day ingestion, 10 PB total, 10K queries/day         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3. Backup and Disaster Recovery

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Enterprise Backup System                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Backup Sources:                                                     │
│  - Database snapshots (RDS, PostgreSQL)                            │
│  - File server backups (millions of files)                         │
│  - VM images (100 GB+ each)                                        │
│  - Container registry images                                        │
│                                                                      │
│  Backup Strategy:                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Full backup weekly → Archive tier                            │  │
│  │ Incremental daily → Standard tier                            │  │
│  │ WAL/binlog continuous → Infrequent Access                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Object Layout:                                                      │
│    /backups/mysql/prod-db/                                         │
│      full/2024-01-14.tar.gz.enc      (encrypted, 500 GB)          │
│      incremental/2024-01-15.tar.gz.enc  (50 GB)                   │
│      wal/0000000100000001.gz         (100 MB, streaming)          │
│                                                                      │
│  Recovery:                                                          │
│  - RTO: 4 hours (restore from archive)                             │
│  - RPO: 15 minutes (WAL streaming)                                 │
│  - Cross-region copy for DR                                        │
│                                                                      │
│  Scale: 2 PB backups, 50 TB/day growth, 7 year retention          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4. Static Website and CDN Origin

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: E-commerce Static Assets                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Asset Types:                                                        │
│  - Product images (10M products × 5 images = 50M objects)          │
│  - JavaScript/CSS bundles (versioned)                              │
│  - PDF manuals and documents                                        │
│                                                                      │
│  Bucket Structure:                                                   │
│    /static.example.com/                                            │
│      index.html                                                     │
│      assets/                                                        │
│        main.a1b2c3.js                                              │
│        styles.d4e5f6.css                                           │
│      products/                                                      │
│        {product_id}/                                               │
│          main.jpg                                                   │
│          thumb.jpg                                                  │
│          gallery/*.jpg                                              │
│                                                                      │
│  CDN Integration:                                                    │
│  - CloudFront/Cloudflare in front of blob storage                  │
│  - Cache-Control headers for browser caching                       │
│  - Immutable assets (hash in filename) cached forever              │
│                                                                      │
│  Traffic: 100K RPS to CDN, 5K RPS origin fetches                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Secondary Use Cases

| Use Case | Description | Key Requirements |
|----------|-------------|------------------|
| Container Registry | Store Docker/OCI images as blobs | Content-addressable, deduplication |
| Machine Learning | Training data, model artifacts | Large files, high throughput |
| Log Archival | Compliance and audit logs | Append-only, lifecycle policies |
| Scientific Data | Research datasets, simulations | Massive files, metadata-rich |
| IoT Data Lake | Sensor data from millions of devices | High write throughput, time-partitioned |

---

## Capacity Estimations

### Reference Architecture: 1 Petabyte Scale

```
┌─────────────────────────────────────────────────────────────────────┐
│  REFERENCE SCENARIO: E-commerce Platform                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Scale:                                                              │
│    - 1 PB total storage                                             │
│    - 10 billion objects                                              │
│    - 100 million buckets                                            │
│    - 100 KB average object size                                     │
│                                                                      │
│  Traffic Patterns:                                                   │
│    - Reads: 100,000 RPS (peak)                                      │
│    - Writes: 10,000 RPS (peak)                                      │
│    - Data ingestion: 10 TB/day                                      │
│    - Data retrieval: 50 TB/day                                      │
│                                                                      │
│  Object Size Distribution:                                          │
│    - < 1 KB:      10% (metadata, configs)                          │
│    - 1 KB - 1 MB: 70% (images, small files)                        │
│    - 1 MB - 100 MB: 15% (documents, medium files)                  │
│    - > 100 MB:    5% (videos, backups)                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Storage Requirements

```
Raw Storage vs. Effective Storage:

┌────────────────────────────────────────────────────────────────────┐
│ Durability Method        │ Raw Storage │ Overhead │ Effective     │
├──────────────────────────┼─────────────┼──────────┼───────────────┤
│ 3x Replication           │ 3 PB        │ 200%     │ 1 PB          │
│ Erasure Coding RS(10,4)  │ 1.4 PB      │ 40%      │ 1 PB          │
│ Erasure Coding RS(6,3)   │ 1.5 PB      │ 50%      │ 1 PB          │
│ Erasure Coding RS(17,3)  │ 1.18 PB     │ 18%      │ 1 PB (cold)   │
└──────────────────────────┴─────────────┴──────────┴───────────────┘

Storage Breakdown (1 PB logical):
  - User data (with erasure coding): ~1.4 PB raw
  - Metadata (10B objects × 500 bytes): ~5 TB
  - Indexes and caches: ~1 TB
  - Total raw storage: ~1.5 PB
```

### Metadata Storage

```
Per-Object Metadata Record:
┌────────────────────────────────────────────────────────────────┐
│ Field              │ Size    │ Notes                           │
├────────────────────┼─────────┼─────────────────────────────────┤
│ bucket_id          │ 8 B     │ UUID reference                  │
│ object_key         │ 256 B   │ Variable, max 1024              │
│ version_id         │ 16 B    │ UUID for versioning             │
│ size               │ 8 B     │ Object size in bytes            │
│ etag               │ 32 B    │ MD5 or composite hash           │
│ content_type       │ 64 B    │ MIME type                       │
│ created_at         │ 8 B     │ Timestamp                       │
│ modified_at        │ 8 B     │ Timestamp                       │
│ storage_class      │ 2 B     │ Enum: standard, IA, archive     │
│ custom_metadata    │ ~200 B  │ User-defined key-value pairs    │
│ chunk_locations    │ ~100 B  │ Pointers to data chunks         │
│ checksum           │ 32 B    │ SHA256 of content               │
└────────────────────┴─────────┴─────────────────────────────────┘
Total per object: ~500 bytes average

Metadata for 10 billion objects:
  - Raw metadata: 10B × 500 B = 5 TB
  - Indexes (key, bucket, time): ~2 TB
  - Replicated 3x: ~21 TB
```

### Bandwidth Requirements

```
┌─────────────────────────────────────────────────────────────────────┐
│  BANDWIDTH ESTIMATION                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Ingestion (Writes):                                                 │
│    - 10 TB/day = 115 MB/s average                                  │
│    - Peak (3x average): 350 MB/s                                   │
│    - Replication overhead (erasure coding): +40%                   │
│    - Total write bandwidth: ~500 MB/s peak                         │
│                                                                      │
│  Retrieval (Reads):                                                 │
│    - 50 TB/day = 580 MB/s average                                  │
│    - Peak (5x average): 3 GB/s                                     │
│    - Cache hit rate (CDN): 80%                                     │
│    - Origin bandwidth: ~600 MB/s peak                              │
│                                                                      │
│  Inter-DC Replication:                                              │
│    - Cross-region sync: 10 TB/day × 2 regions = 230 MB/s          │
│                                                                      │
│  Total Network Capacity Needed:                                     │
│    - Storage cluster internal: 10 Gbps per node                    │
│    - External ingress/egress: 40 Gbps aggregate                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Request Rate Calculations

```
┌─────────────────────────────────────────────────────────────────────┐
│  REQUEST RATE ANALYSIS                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Read Requests:                                                      │
│    - GET object: 80,000 RPS                                        │
│    - HEAD object: 10,000 RPS                                       │
│    - LIST objects: 5,000 RPS                                       │
│    - GET metadata: 5,000 RPS                                       │
│    Total reads: 100,000 RPS                                        │
│                                                                      │
│  Write Requests:                                                    │
│    - PUT object (< 5GB): 5,000 RPS                                 │
│    - Multipart upload initiate: 1,000 RPS                          │
│    - Multipart part upload: 3,000 RPS                              │
│    - Multipart complete: 500 RPS                                   │
│    - DELETE object: 500 RPS                                        │
│    Total writes: 10,000 RPS                                        │
│                                                                      │
│  Metadata Operations:                                               │
│    - Per read: 1-2 metadata lookups                                │
│    - Per write: 2-3 metadata writes (create, update index)         │
│    - Metadata service: ~300,000 ops/sec                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Infrastructure Sizing

```
┌─────────────────────────────────────────────────────────────────────┐
│  INFRASTRUCTURE SIZING (1 PB Scale)                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Storage Nodes:                                                      │
│    - Raw capacity: 1.5 PB (with erasure coding overhead)           │
│    - Node capacity: 100 TB each (10 × 10 TB drives)                │
│    - Nodes needed: 15 storage nodes                                │
│    - With replication factor: 15 nodes × 1.4 = 21 nodes            │
│    - Spec: 32 vCPU, 64 GB RAM, 10 × 10 TB HDD, 25 Gbps network    │
│                                                                      │
│  Metadata Nodes:                                                    │
│    - Data size: 21 TB (replicated metadata)                        │
│    - In-memory index: ~500 GB                                      │
│    - Nodes: 5 (for quorum and redundancy)                          │
│    - Spec: 16 vCPU, 256 GB RAM, 2 TB NVMe SSD, 25 Gbps network    │
│                                                                      │
│  API Gateway / Proxy:                                               │
│    - Handle 100K RPS                                                │
│    - Nodes: 10 (10K RPS each)                                      │
│    - Spec: 16 vCPU, 32 GB RAM, 25 Gbps network                    │
│                                                                      │
│  Total:                                                             │
│    - 21 storage nodes                                               │
│    - 5 metadata nodes                                               │
│    - 10 API nodes                                                   │
│    - 36 nodes total (+ redundancy buffer)                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## SLOs / SLAs

### Service Level Objectives

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Durability** | 99.999999999% | Simulated annual object loss rate |
| **Read Availability** | 99.99% | Successful reads / Total read attempts |
| **Write Availability** | 99.9% | Successful writes / Total write attempts |
| **First Byte Latency (p50)** | < 50ms | Time from request to first byte |
| **First Byte Latency (p99)** | < 100ms | Time from request to first byte |
| **Upload Completion (< 1MB)** | < 200ms p99 | End-to-end upload time |
| **List Operations (p99)** | < 500ms | For 1000 objects |
| **Consistency** | Strong read-after-write | All reads see latest write |

### Durability Mathematics

```
┌─────────────────────────────────────────────────────────────────────┐
│  DURABILITY CALCULATION                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Assumptions:                                                        │
│    - Annual drive failure rate (AFR): 2%                           │
│    - Mean time to repair (MTTR): 24 hours                          │
│    - Erasure coding: RS(10, 4) - need 10 of 14 chunks              │
│                                                                      │
│  Probability of losing a chunk (before repair):                     │
│    P(chunk_loss) = AFR × (MTTR / 8760 hours) ≈ 0.00005            │
│                                                                      │
│  Probability of losing 5+ chunks simultaneously:                    │
│    P(data_loss) = C(14,5) × P^5 × (1-P)^9                         │
│    P(data_loss) ≈ 2002 × (0.00005)^5 × (0.99995)^9                │
│    P(data_loss) ≈ 6.3 × 10^(-18)                                   │
│                                                                      │
│  With geographic distribution (3 AZs):                              │
│    - Correlated failures reduced                                    │
│    - Effective durability: > 10^(-11) = 11 nines                   │
│                                                                      │
│  For 10 billion objects:                                            │
│    - Expected annual loss: 10^10 × 10^(-11) = 0.1 objects/year    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Storage Class SLOs

| Storage Class | Durability | Availability | First Byte Latency | Use Case |
|---------------|------------|--------------|-------------------|----------|
| **Standard** | 11 nines | 99.99% | < 100ms p99 | Frequently accessed |
| **Infrequent Access** | 11 nines | 99.9% | < 100ms p99 | Monthly access |
| **Archive** | 11 nines | 99.9% | 1-5 hours | Yearly access |
| **Deep Archive** | 11 nines | 99.9% | 12-48 hours | Compliance/legal hold |

---

## Constraints & Assumptions

### Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| Object Immutability | Objects are not modified in place | Overwrites create new versions |
| Eventual Consistency (cross-region) | Async replication to other regions | May read stale data in secondary region |
| Single PUT Limit | 5 GB max for single PUT | Larger files require multipart |
| Key Length | Max 1024 bytes | Limits hierarchical depth |
| Metadata Size | Max 2 KB user metadata | Large metadata in separate object |
| Rate Limits | Per-account request throttling | Prevents resource exhaustion |

### Assumptions

| Assumption | Rationale |
|------------|-----------|
| Most objects are write-once | Media files, backups rarely modified |
| Read patterns are cacheable | CDN handles repeated requests |
| Object sizes follow power-law | Many small, few large |
| Network is the bottleneck | Not CPU for most operations |
| Storage is the major cost | Drives cheaper than compute |

---

## Out of Scope

| Concern | Why Out of Scope | Handled By |
|---------|-----------------|------------|
| POSIX File Semantics | Blob storage is object-based, not file-based | Network file systems (NFS, EFS) |
| Random Write Access | Objects are immutable; no seek + write | Block storage (EBS) |
| Real-time Streaming | Optimized for upload/download, not live | Streaming services (Kinesis Video) |
| Database Functionality | No queries beyond key lookup | Database services |
| Message Queuing | Not designed for pub/sub patterns | Message queues (SQS, Kafka) |
| In-place Append | Objects cannot be appended | Application-level chunking |
| Strong Cross-Region Consistency | WAN latency makes this impractical | Single-region or accept eventual |

---

## Requirements Traceability

| Requirement | Addressed In | Implementation |
|-------------|--------------|----------------|
| FR-1,2,3: Object CRUD | 02-high-level, 03-low-level | API design, data flow |
| FR-4,5: Bucket operations | 03-low-level | Metadata service |
| FR-6: Multipart upload | 04-deep-dive | Upload manager, chunk assembly |
| FR-8: Versioning | 03-low-level | Version metadata, storage |
| FR-9: Lifecycle | 05-scalability | Tiering, expiration |
| FR-10: Cross-region | 05-scalability | Replication pipeline |
| FR-11: Pre-signed URLs | 06-security | URL signing algorithm |
| NFR: Durability | 04-deep-dive | Erasure coding |
| NFR: Performance | 05-scalability | Caching, distribution |
| NFR: Security | 06-security | Encryption, IAM |
