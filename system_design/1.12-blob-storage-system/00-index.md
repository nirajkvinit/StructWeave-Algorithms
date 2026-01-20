# Blob Storage System

[← Back to System Design Index](../README.md)

---

## Overview

A **Blob Storage System** provides scalable, durable storage for unstructured data—files, images, videos, backups, and any binary large objects (BLOBs). Unlike traditional file systems or databases, blob storage is optimized for massive scale, extreme durability, and cost-effective storage of objects ranging from kilobytes to terabytes.

The core problem blob storage solves is: *"How do we store exabytes of unstructured data with 99.999999999% (11 nines) durability, serve millions of concurrent requests, and do so cost-effectively across multiple storage tiers?"*

Modern blob storage systems like Amazon S3, Google Cloud Storage, and Azure Blob Storage form the foundation of cloud infrastructure, serving as the persistence layer for data lakes, CDN origins, backup systems, and application assets.

---

## Complexity Rating

| Aspect | Rating | Justification |
|--------|--------|---------------|
| **Overall** | **High** | Durability guarantees, erasure coding math, and distributed consistency add significant complexity |
| Core Concept | Medium | PUT/GET objects with metadata is intuitive |
| Chunking & Assembly | Medium-High | Variable-length chunking, parallel uploads, chunk reassembly |
| Erasure Coding | High | Reed-Solomon mathematics, repair algorithms, encoding matrices |
| Consistency Model | High | Strong consistency across replicated data, cross-DC coordination |
| Storage Tiering | Medium | Lifecycle policies, data migration, cost optimization |

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| Read:Write Ratio | ~10:1 | Write-heavy ingestion, read-heavy retrieval; optimize both paths |
| Write Latency | < 200ms (p99) | Network transfer + durability acknowledgment |
| Read Latency (First Byte) | < 100ms (p99) | Metadata lookup + storage node contact |
| Consistency Model | Strong (modern S3) | All operations immediately visible after acknowledgment |
| Durability Target | 99.999999999% (11 nines) | Lose 1 object per 10 billion per year |
| Object Size Range | 1 byte - 5 TB | Multipart upload for large objects |
| Typical Chunk Size | 4-64 MB | Balance between parallelism and overhead |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/NFR, capacity planning (1 PB storage, 100K RPS), SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture, data flow, metadata/storage separation |
| [03 - Low-Level Design](./03-low-level-design.md) | Data model, API design, chunking algorithms, erasure coding |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Erasure coding math, metadata scaling, multipart uploads |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Horizontal scaling, storage tiering, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Pre-signed URLs, encryption, access control, GDPR/HIPAA |
| [07 - Observability](./07-observability.md) | Metrics, alerting, durability monitoring, cost dashboards |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trade-offs, common mistakes |

---

## Blob Storage vs. Related Systems

```
┌─────────────────────────────────────────────────────────────────────┐
│  BLOB STORAGE vs. RELATED SYSTEMS                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Blob Storage (S3, GCS, Azure Blob):                                │
│  ├── Flat namespace with bucket/key hierarchy                       │
│  ├── Extreme durability (11 nines)                                  │
│  ├── Objects are immutable (overwrite = new version)               │
│  ├── HTTP/REST API access                                           │
│  └── Examples: Media files, backups, data lakes, static assets     │
│                                                                      │
│  File System (NFS, HDFS, EFS):                                      │
│  ├── Hierarchical directory structure                               │
│  ├── POSIX semantics (open, seek, read, write)                     │
│  ├── Mutable files with random access                               │
│  └── Examples: Shared drives, application storage, HPC workloads   │
│                                                                      │
│  Block Storage (EBS, Persistent Disk):                              │
│  ├── Low-level block device                                         │
│  ├── Attached to single instance                                    │
│  ├── Requires file system on top                                    │
│  └── Examples: Database storage, VM boot disks                      │
│                                                                      │
│  Key-Value Store (Redis, DynamoDB):                                 │
│  ├── Optimized for small values (< 1 MB)                           │
│  ├── High throughput, low latency                                   │
│  ├── Rich query patterns                                            │
│  └── Examples: Session data, caching, user profiles                 │
│                                                                      │
│  Content-Addressable Storage (IPFS, Git):                           │
│  ├── Content hash as identifier                                     │
│  ├── Built-in deduplication                                         │
│  ├── Immutable by design                                            │
│  └── Examples: Version control, distributed content networks        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Comparison

| Aspect | Amazon S3 | Google Cloud Storage | Facebook Haystack | Twitter Blobstore |
|--------|-----------|---------------------|-------------------|-------------------|
| **Scale** | 500T+ objects, 100s EB | Not disclosed | 260B photos, 20 PB | Petabyte-scale |
| **Data Durability** | 11 nines | 11 nines | 3x replication | 3x replication |
| **Consistency** | Strong (since 2020) | Strong | Eventual | Eventual |
| **Key Innovation** | ShardStore, CRDTs | Colossus backend | 1 disk op/read | Multi-DC sync |
| **Storage Backend** | Custom distributed | Colossus (GFS successor) | Log-structured files | Custom object store |
| **Primary Use Case** | General cloud storage | GCP ecosystem | Photo serving | Media attachments |

---

## Data Durability Strategies

```
┌─────────────────────────────────────────────────────────────────────┐
│  DURABILITY STRATEGIES                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. REPLICATION (Simple, Higher Overhead)                           │
│     ┌────────┐  ┌────────┐  ┌────────┐                             │
│     │ Copy 1 │  │ Copy 2 │  │ Copy 3 │     3x storage overhead     │
│     │ Node A │  │ Node B │  │ Node C │     Tolerate 2 failures     │
│     └────────┘  └────────┘  └────────┘                             │
│                                                                      │
│  2. ERASURE CODING (Complex, Lower Overhead)                        │
│     Reed-Solomon (10, 4):                                           │
│     ┌────────────────────────────────────────┐                     │
│     │ Data:   D1 D2 D3 D4 D5 D6 D7 D8 D9 D10│  10 data chunks     │
│     │ Parity: P1 P2 P3 P4                    │   4 parity chunks   │
│     └────────────────────────────────────────┘                     │
│     1.4x storage overhead, tolerate 4 failures                     │
│                                                                      │
│  3. HYBRID APPROACH (Common in Practice)                            │
│     - Hot data: 3x replication (fast access)                       │
│     - Warm data: Erasure coding (balanced)                         │
│     - Cold data: Erasure coding + archival (cost optimized)        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Durability Mathematics

```
Replication (3 copies):
  Annual failure rate per drive: ~2%
  P(all 3 fail before repair) ≈ 0.02³ / repair_factor
  With fast repair (hours): ~10⁻⁸ annual loss rate

Erasure Coding RS(14, 10):
  Need 10 of 14 chunks to recover
  P(lose >4 chunks before repair) ≈ C(14,5) × 0.02⁵ × 0.98⁹
  With geographic distribution: ~10⁻¹¹ annual loss rate (11 nines)
```

---

## Chunking Strategies

| Strategy | Description | Use Case | Trade-offs |
|----------|-------------|----------|------------|
| **Fixed-Length** | Equal-sized chunks (e.g., 64 MB) | Simple workloads, streaming | No dedup benefit, simple implementation |
| **Variable-Length (CDC)** | Content-defined boundaries using rolling hash | Backup systems, deduplication | Better dedup, more complex, Rabin-Karp overhead |
| **Log-Structured** | Append-only aggregation (Haystack pattern) | Photo/media storage | One disk I/O per read, compaction needed |

### Content-Defined Chunking (CDC)

```
┌─────────────────────────────────────────────────────────────────────┐
│  RABIN-KARP ROLLING HASH FOR CDC                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  File: [...byte stream...]                                          │
│                                                                      │
│  Sliding Window (e.g., 48 bytes):                                   │
│  ┌────────────────────────────────────────────────┐                │
│  │ hash = (hash × base + new_byte - old × base^w) mod prime        │
│  └────────────────────────────────────────────────┘                │
│                                                                      │
│  Chunk Boundary Condition:                                          │
│  if (hash mod 2^k == magic_number):                                │
│      emit_chunk_boundary()                                          │
│                                                                      │
│  Expected chunk size ≈ 2^k bytes (e.g., k=20 → ~1MB average)       │
│                                                                      │
│  Benefits:                                                          │
│  - Insertions/deletions only affect nearby chunks                  │
│  - Enables cross-file and incremental deduplication                │
│  - Used by: rsync, Dropbox, Restic backup                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Real-World Scale Reference

| System | Objects Stored | Data Volume | Daily Requests | Key Architecture |
|--------|---------------|-------------|----------------|------------------|
| **Amazon S3** | 500+ trillion | Hundreds of exabytes | Trillions | ShardStore, strong consistency via CRDTs |
| **Backblaze B2** | 1+ trillion | 3+ exabytes | Billions | Reed-Solomon (20,17), vault-based |
| **Facebook Haystack** | 260 billion photos | 20+ petabytes | 1M+ reads/sec | Log-structured, CDN-backed |
| **MinIO** | Varies | Petabyte-scale | Enterprise | S3-compatible, erasure coding |

---

## Common Use Cases

### 1. Media Storage and Delivery

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Video Streaming Platform                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Upload Flow:                                                        │
│  1. Client uploads video → Blob Storage (origin)                   │
│  2. Transcoding service reads video, creates multiple qualities     │
│  3. Transcoded versions stored back to Blob Storage                │
│                                                                      │
│  Playback Flow:                                                      │
│  1. Client requests video segment                                   │
│  2. CDN serves if cached, else fetches from Blob Storage origin    │
│  3. Adaptive bitrate: manifest points to quality-specific objects  │
│                                                                      │
│  Storage Pattern:                                                    │
│    /videos/{video_id}/original/video.mp4        (archival)         │
│    /videos/{video_id}/hls/1080p/segment_001.ts  (hot, CDN-cached)  │
│    /videos/{video_id}/hls/720p/segment_001.ts                      │
│    /videos/{video_id}/thumbnail.jpg                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Data Lake Foundation

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Analytics Data Lake                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Ingestion:                                                          │
│  - Event streams → Parquet files in blob storage                   │
│  - Log aggregation → Compressed log files                          │
│                                                                      │
│  Storage Layout (Hive-partitioned):                                 │
│    s3://data-lake/events/                                          │
│      year=2024/month=01/day=15/                                    │
│        hour=00/events_00.parquet                                   │
│        hour=01/events_01.parquet                                   │
│                                                                      │
│  Query Engines:                                                      │
│  - Athena/Presto: SQL over Parquet files                           │
│  - Spark: Distributed processing directly from blob storage        │
│  - Delta Lake/Iceberg: ACID transactions on blob storage           │
│                                                                      │
│  Benefits:                                                          │
│  - Compute/storage separation (scale independently)                │
│  - Low cost per GB compared to databases                           │
│  - Schema-on-read flexibility                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Backup and Disaster Recovery

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Database Backup System                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Backup Strategy:                                                    │
│  1. Full backup weekly → Glacier/Archive tier                      │
│  2. Incremental daily → Standard tier                              │
│  3. WAL/binlog continuous → Infrequent Access tier                 │
│                                                                      │
│  Object Layout:                                                      │
│    /backups/mysql/prod-db-1/                                       │
│      full/2024-01-15T00:00:00Z.tar.gz                              │
│      incremental/2024-01-16T00:00:00Z.tar.gz                       │
│      wal/segment_0000000100000001.gz                               │
│                                                                      │
│  Lifecycle Policies:                                                 │
│  - After 30 days: Standard → Infrequent Access                    │
│  - After 90 days: Infrequent Access → Glacier                     │
│  - After 7 years: Delete (compliance requirement)                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Static Website and CDN Origin

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Static Website Hosting                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Bucket: example-website                                            │
│    index.html                                                       │
│    error.html                                                       │
│    /assets/                                                         │
│      main.js                                                        │
│      styles.css                                                     │
│    /images/                                                         │
│      logo.png                                                       │
│                                                                      │
│  Request Flow:                                                       │
│    User → CloudFront/CDN → (cache miss) → S3 Origin               │
│                                                                      │
│  Features Used:                                                      │
│  - Static website hosting endpoint                                  │
│  - Custom domain with SSL certificate                               │
│  - Cache-Control headers for CDN optimization                       │
│  - Versioned deploys: /v1.2.3/assets/main.js                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Trade-offs Summary

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Durability Method** | 3x Replication | Erasure Coding (e.g., RS 10,4) | Erasure coding for cost; replication for hot data latency |
| **Consistency** | Strong | Eventual | Strong for modern systems (S3 2020+); eventual acceptable for CDN-backed media |
| **Chunking** | Fixed-length | Content-defined (CDC) | Fixed for simplicity; CDC when deduplication matters |
| **Metadata Storage** | Co-located | Separated service | Separated for scale (independent scaling of metadata vs data) |
| **Storage Tiering** | Single tier | Multi-tier lifecycle | Multi-tier for cost optimization; single for simplicity |

---

## Interview Readiness Checklist

| Concept | Must Understand | Common Pitfalls |
|---------|----------------|-----------------|
| Durability vs. Availability | 11 nines durability, 4 nines availability | Confusing the two; durability is about data loss |
| Erasure Coding | RS(n,k) basics, storage overhead math | Not explaining why it's better than 3x replication for cost |
| Chunking | Fixed vs variable, multipart upload | Forgetting about assembly and ordering |
| Metadata Service | Separation from data, scalability | Treating metadata as trivial; it's often the bottleneck |
| Consistency Model | S3 strong consistency evolution | Assuming eventual is still the S3 model |
| Storage Classes | Hot/Warm/Cold/Archive trade-offs | Not discussing lifecycle transitions |
| Multi-Region | Cross-region replication, latency | Assuming synchronous replication is feasible |

---

## References & Further Reading

### Industry Documentation
- [Amazon S3 Developer Guide](https://docs.aws.amazon.com/s3/)
- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [MinIO Design Documentation](https://min.io/docs/minio/linux/index.html)

### Engineering Blogs & Papers
- [Amazon S3 Strong Consistency Announcement (2020)](https://aws.amazon.com/blogs/aws/amazon-s3-update-strong-read-after-write-consistency/)
- [Facebook Haystack: Finding a Needle in Haystack](https://www.usenix.org/legacy/event/osdi10/tech/full_papers/Beaver.pdf)
- [Twitter Blobstore: Petabyte Scale Media Storage](https://blog.twitter.com/engineering)
- [Backblaze Vault Architecture](https://www.backblaze.com/blog/vault-cloud-storage-architecture/)

### Academic Papers
- [Reed-Solomon Error Correction (Original)](https://ieeexplore.ieee.org/document/1057464)
- [Erasure Coding in Windows Azure Storage](https://www.usenix.org/conference/atc12/technical-sessions/presentation/huang)
- [Copyset Replication for Random Node Failures](https://www.usenix.org/conference/atc13/technical-sessions/presentation/cidon)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-20 | Initial comprehensive design |
