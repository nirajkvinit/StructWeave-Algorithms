# Requirements & Capacity Estimations

## 1. Functional Requirements

### Core Features (In Scope)

| # | Feature | Description |
|---|---------|-------------|
| F1 | **File Upload** | Upload files of any type/size (up to 50 GB per file) |
| F2 | **File Download** | Download files and folders with resume support |
| F3 | **File Sync** | Automatic bidirectional sync across all connected devices |
| F4 | **Delta Sync** | Transfer only modified blocks, not entire files |
| F5 | **Block-Level Dedup** | Content-addressable storage to eliminate duplicate blocks |
| F6 | **Revision History** | Maintain version history with restore capability (30-180 days) |
| F7 | **File/Folder Sharing** | Share via links or direct grants with permission levels (view/edit/comment) |
| F8 | **Offline Access** | Mark files for offline use; queue changes for sync on reconnect |
| F9 | **Conflict Resolution** | Detect and resolve concurrent edits across devices |
| F10 | **Search** | Full-text search across file names, content, and metadata |
| F11 | **Notifications** | Real-time notifications for file changes across shared content |
| F12 | **Trash & Recovery** | Soft delete with recovery window |

### Out of Scope

- Real-time collaborative document editing (Google Docs / OT/CRDT --- separate system)
- Media transcoding or preview generation (handled by separate services)
- Email integration
- AI-powered content analysis (treated as separate overlay service)

---

## 2. Non-Functional Requirements

### CAP Theorem Choice

**AP with strong metadata consistency** --- The system prioritizes availability and partition tolerance for file content (users must always be able to access their files), while metadata operations (file tree structure, permissions, sharing) require strong consistency to prevent phantom files, orphaned blocks, or permission escalation.

### Consistency Model

| Component | Model | Justification |
|-----------|-------|---------------|
| Metadata (file tree, permissions) | **Strong consistency** | Users must see accurate file structure; split-brain on permissions is a security risk |
| File content (block storage) | **Eventual consistency** | Blocks are immutable and content-addressed --- eventually all replicas converge |
| Sync state | **Causal consistency** | Edits must be applied in causal order; concurrent edits create conflicted copies |
| Sharing/ACLs | **Strong consistency** | Revoking access must take effect immediately |

### Availability Target

- **99.99% (four nines)** for file access --- 52.6 minutes downtime/year
- **99.999% (five nines)** for metadata operations --- 5.26 minutes downtime/year
- Dropbox Magic Pocket targets >99.99% availability

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Metadata lookup (file list) | 10ms | 50ms | 100ms |
| Small file upload (<1 MB) | 100ms | 300ms | 500ms |
| Block upload (4 MB chunk) | 200ms | 800ms | 1500ms |
| Sync notification delivery | 50ms | 200ms | 500ms |
| Search query | 100ms | 500ms | 1000ms |
| File download start (first byte) | 50ms | 200ms | 500ms |

### Durability Guarantees

- **99.9999999999% (twelve nines)** annual durability for stored data
- Achieved through erasure coding (6+3 Reed-Solomon) across multiple availability zones
- Dropbox Magic Pocket exceeds this target

---

## 3. Capacity Estimations (Back-of-Envelope)

### Assumptions

- Target scale: 500 million MAU, 100 million DAU
- Average files per user: 5,000
- Average file size: 500 KB (mix of documents, photos, small videos)
- Average storage per user: 2.5 GB
- Daily active sync operations per DAU: 50 file events
- Read:Write ratio: 3:1 (most files are written once, read/synced multiple times)
- Deduplication ratio: 3:1 (every 3 blocks stored, 1 is unique on average)
- Peak-to-average ratio: 5x (morning sync bursts, Monday spikes)

### Estimations

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| **MAU** | 500M | Given |
| **DAU** | 100M | 20% of MAU |
| **Read:Write Ratio** | 3:1 | Reads (download/sync) dominate |
| **QPS (average)** | ~58K | 100M DAU x 50 ops/day / 86,400s |
| **QPS (peak)** | ~290K | 58K x 5 (peak multiplier) |
| **Total files** | 2.5 trillion | 500M users x 5,000 files |
| **Logical storage** | 1.25 EB | 500M x 2.5 GB |
| **Physical storage (post-dedup)** | ~420 PB | 1.25 EB / 3 (dedup ratio) |
| **Physical storage (with erasure coding)** | ~630 PB | 420 PB x 1.5 (6+3 RS overhead) |
| **Storage growth/year** | ~100 PB | ~15% annual growth |
| **Bandwidth (average)** | ~30 GB/s | 58K QPS x 500 KB avg |
| **Bandwidth (peak)** | ~150 GB/s | 290K QPS x 500 KB avg |
| **Metadata entries** | ~5 trillion | 2.5T files + folders, versions, shares |
| **Metadata storage** | ~5 PB | 5T entries x ~1 KB avg metadata per entry |
| **Cache size (hot metadata)** | ~500 TB | Top 10% of metadata (~80% of requests) |

### Storage Projections

| Timeframe | Logical Storage | Physical Storage (post-dedup + EC) |
|-----------|----------------|-------------------------------------|
| Year 1 | 1.25 EB | 630 PB |
| Year 3 | 1.9 EB | 960 PB |
| Year 5 | 2.9 EB | 1.45 EB |

---

## 4. SLOs / SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.99% (file access), 99.999% (metadata) | Uptime monitoring, synthetic probes |
| **Latency (p99)** | <500ms metadata, <1.5s block upload | End-to-end request tracing |
| **Durability** | 99.9999999999% | Annual data loss rate measurement |
| **Error rate** | <0.1% of API requests | 5xx response ratio |
| **Sync latency** | <5s for file change propagation | Time from save to notification on other devices |
| **Throughput** | 290K QPS peak sustained | Load testing, production monitoring |
| **Recovery** | RTO <15 min, RPO <1 min | Disaster recovery drills |

---

## 5. Traffic Patterns

### Daily Pattern

```
QPS
 ^
 |     ____
 |    /    \        ____
 |   /      \      /    \
 |  /        \    /      \
 | /          \__/        \___
 +-----------------------------> Time
   6am  9am  12pm  3pm  6pm  9pm

   Morning sync peak    Afternoon collaboration peak
```

### Key Observations

1. **Monday morning spike**: Users return to work, all devices sync weekend changes (up to 10x average)
2. **Business hours skew**: B2B usage (Dropbox Business, Google Workspace) concentrates traffic 9am-6pm
3. **Geographic rolling peak**: As business hours sweep across time zones, peak migrates
4. **Large file bursts**: Video/design files create localized bandwidth spikes
5. **Seasonal patterns**: End-of-quarter reporting, tax season for accounting firms

---

## 6. Data Categories

| Category | Examples | % of Storage | Access Pattern |
|----------|----------|-------------|----------------|
| **Documents** | PDFs, DOCX, spreadsheets | 15% | Frequent read/write, high dedup |
| **Media** | Photos, videos, audio | 60% | Write-once-read-many, low dedup |
| **Code/Config** | Source files, configs | 5% | Very frequent read/write, high dedup |
| **Archives** | ZIP, TAR, backups | 15% | Write-once-read-rarely |
| **Other** | Misc binary, temp files | 5% | Varies |
