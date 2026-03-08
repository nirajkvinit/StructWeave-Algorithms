# Requirements & Estimations

## Functional Requirements

### Core Features

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| F1 | **Spaces** | Wiki namespaces that group related pages; each space has its own page tree, permissions, and settings | P0 |
| F2 | **Page Hierarchy** | Tree-structured pages within a space; pages can have child pages to arbitrary depth (practical limit ~15 levels) | P0 |
| F3 | **Page CRUD** | Create, read, update, and delete pages with rich content (text, headings, tables, code blocks, macros, embeds, attachments) | P0 |
| F4 | **Version History** | Every page save creates a version; users can view, compare (diff), and restore any previous version | P0 |
| F5 | **Full-Text Search** | Search across all accessible pages by content, title, labels, author; faceted filtering by space, date, label | P0 |
| F6 | **Space Permissions** | Space-level access control: admin, editor, viewer roles; group and individual grants | P0 |
| F7 | **Page Permissions** | Page-level overrides that restrict or extend space-level defaults; inheritance down the page tree | P0 |
| F8 | **Cross-Page Linking** | Link to other pages by title or ID; automatic backlink tracking; broken link detection on page delete/move | P0 |
| F9 | **Labels/Tags** | User-defined labels on pages for categorization; label-based search and navigation | P1 |
| F10 | **Templates** | Predefined page blueprints (meeting notes, decision record, runbook); variable substitution at creation time | P1 |
| F11 | **Inline Comments** | Comments anchored to specific text ranges within a page; threaded discussions; resolution workflow | P1 |
| F12 | **@Mentions** | Mention users, pages, or spaces in page content and comments; trigger notifications | P1 |
| F13 | **Watch/Notifications** | Watch a page or space for changes; configurable notification delivery (email, in-app, webhook) | P1 |
| F14 | **Page Analytics** | View count, unique viewers, edit frequency, last editor; space-level dashboards | P2 |
| F15 | **Export** | Export pages or page trees to PDF, Word, or HTML; async for large exports | P2 |
| F16 | **AI Features** | Auto-generated page summaries, smart search with semantic understanding, related page recommendations | P2 |
| F17 | **Audit Trail** | Immutable log of all page views (optional), edits, permission changes, and administrative actions | P1 |
| F18 | **Attachments** | Upload files (images, documents, archives) to pages; inline rendering for images; storage quotas | P1 |

### Feature Interaction Matrix

```
         F1   F2   F3   F4   F5   F6   F7   F8   F9   F10  F11  F12  F13
F1 Spaces  .   dep  dep  .    dep  dep  dep  .    .    dep  .    .    dep
F2 Hier.  dep   .   dep  .    .    .    dep  dep  .    dep  .    .    .
F3 CRUD   dep  dep   .   dep  dep  dep  dep  dep  dep  dep  dep  dep  dep
F4 Vers.   .    .   dep   .    .    .    .    .    .    .    .    .    .
F5 Search dep   .   dep   .    .   dep  dep  dep  dep  .    .    .    .
F6 SpPerm dep   .    .    .   dep   .   dep  .    .    .    .    .    .
F7 PgPerm dep  dep   .    .   dep  dep   .   .    .    .    .    .    .
F8 Links   .   dep  dep   .   dep  .    .    .    .    .    .    .    .
F9 Labels  .    .   dep   .   dep  .    .    .    .    .    .    .    .
F10 Tmpl  dep  dep  dep   .    .    .    .    .    .    .    .    .    .
F11 Comm   .    .   dep   .   dep  .   dep  .    .    .    .   dep  dep
F12 @Ment  .    .   dep   .   dep  .    .   dep  .    .   dep   .   dep
F13 Watch dep   .   dep   .    .   dep  dep  .    .    .    .    .    .

dep = depends on / interacts with
```

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Availability** | 99.99% (52 min downtime/year) | Enterprise SLA; knowledge base is critical infrastructure |
| **Page Load Latency** | p50 < 100ms, p99 < 200ms | Perceived as instant; users navigate between pages frequently |
| **Search Latency** | p50 < 200ms, p99 < 1s | Interactive search-as-you-type requires sub-second response |
| **Page Save Latency** | p50 < 500ms, p99 < 2s | Save should feel immediate but can tolerate slight delay |
| **Search Index Freshness** | < 30 seconds | Newly created pages should be searchable within 30 seconds |
| **Permission Check Latency** | p99 < 10ms | Every page load and search result requires permission verification |
| **Concurrent Readers per Page** | 10,000+ | Popular pages (company announcements, onboarding) get massive read traffic |
| **Concurrent Editors per Page** | 1-10 (with conflict handling) | Wiki-style editing; not real-time co-editing by default |
| **Data Durability** | 99.999999999% (11 nines) | Page content must never be lost |
| **Export Throughput** | 100-page PDF in < 60 seconds | Background task with progress tracking |
| **API Rate Limits** | 100 req/min per user (REST), 1000 req/min per API key | Prevent abuse while supporting integrations |

---

## Scale Estimations

### User and Traffic Assumptions

| Metric | Value | Derivation |
|--------|-------|------------|
| Total registered users | 50M | Enterprise SaaS across all tenants |
| Daily active users (DAU) | 10M (20% of total) | Typical enterprise SaaS engagement |
| Peak concurrent users | 2M | 20% of DAU during business hours |
| Pages created per day | 500K | 10M DAU x 5% create a page |
| Page edits per day | 2M | 10M DAU x 20% edit an existing page |
| Page views per day | 100M | 10M DAU x 10 page views avg |
| Search queries per day | 30M | 10M DAU x 3 searches avg |
| Total pages (cumulative) | 500M+ | Multi-year accumulation |
| Average spaces per tenant | 50 | Engineering, HR, Product, etc. |

### Traffic Patterns

| Metric | Calculation | Result |
|--------|------------|--------|
| Page views per second (avg) | 100M / 86,400 | ~1,160 views/sec |
| Page views per second (peak, 3x) | 1,160 x 3 | ~3,500 views/sec |
| Page edits per second (avg) | 2M / 86,400 | ~23 edits/sec |
| Page edits per second (peak, 5x) | 23 x 5 | ~115 edits/sec |
| Search queries per second (avg) | 30M / 86,400 | ~350 queries/sec |
| Search queries per second (peak, 3x) | 350 x 3 | ~1,050 queries/sec |
| Pages created per second (avg) | 500K / 86,400 | ~6 pages/sec |

### Data Volume Estimates

| Data Type | Calculation | Volume |
|-----------|------------|--------|
| **Page content** | 500M pages x 20KB avg | 10 TB |
| **Version history** | 10 TB x 10 versions avg | 100 TB |
| **Search index** | 10 TB x 1.5x (inverted index overhead) | 15 TB |
| **Attachments** | 500M pages x 20% have attachments x 5MB avg | 500 TB |
| **Audit log** | 100M events/day x 1KB x 365 days x 3 years | ~100 TB |
| **Permission entries** | 500M pages x 5 ACL entries avg x 100 bytes | 250 GB |
| **Cross-page link index** | 500M pages x 5 outbound links x 50 bytes | 125 GB |
| **User profiles & sessions** | 50M users x 5KB | 250 GB |
| **Labels** | 500M pages x 3 labels avg x 50 bytes | 75 GB |
| **Comments** | 500M pages x 10% have comments x 5 comments x 500 bytes | 125 GB |

### Storage Summary

| Tier | Volume | Storage Type |
|------|--------|-------------|
| Hot (current page content + metadata) | ~15 TB | SSD-backed relational DB + cache |
| Warm (version history, recent audit logs) | ~200 TB | Cost-optimized block storage |
| Cold (old versions, old audit logs, archived spaces) | ~500 TB | Object storage (tiered) |
| Search index | ~15 TB | SSD-backed search cluster |

---

## Capacity Planning

### Compute

| Service | Instances (steady) | Instances (peak) | CPU/Memory per Instance |
|---------|-------------------|------------------|------------------------|
| Page Service | 20 | 60 | 4 vCPU, 8GB RAM |
| Search Service | 30 | 50 | 8 vCPU, 32GB RAM |
| Permission Engine | 10 | 30 | 4 vCPU, 16GB RAM |
| Notification Service | 5 | 15 | 2 vCPU, 4GB RAM |
| Export Workers | 5 | 20 | 4 vCPU, 8GB RAM |
| AI/NLP Service | 10 | 20 | 8 vCPU, 32GB RAM (GPU optional) |

### Network

| Path | Bandwidth (steady) | Bandwidth (peak) |
|------|-------------------|------------------|
| Client -> CDN (page assets) | 5 Gbps | 15 Gbps |
| CDN -> Origin (cache miss) | 500 Mbps | 2 Gbps |
| Application -> DB | 2 Gbps | 5 Gbps |
| Application -> Search Cluster | 1 Gbps | 3 Gbps |
| Application -> Cache | 3 Gbps | 10 Gbps |

### Database

| Database | Size | Read IOPS | Write IOPS |
|----------|------|-----------|------------|
| Primary Relational DB | 15 TB | 50K | 5K |
| Read Replicas (x3) | 15 TB each | 50K each | N/A |
| Search Cluster (12 nodes) | 15 TB total | 100K aggregate | 10K aggregate |
| Cache Cluster (20 nodes) | 500 GB total | 200K aggregate | 50K aggregate |
| Object Storage | 500+ TB | N/A (throughput-based) | N/A |

---

## SLOs by Feature

| Feature | SLO | Measurement |
|---------|-----|-------------|
| Page View | p99 < 200ms | Time from request to full page content returned |
| Page Save | p99 < 2s | Time from save click to confirmation |
| Search Query | p99 < 1s | Time from query submission to results displayed |
| Permission Check | p99 < 10ms | Time to compute effective permissions for a user on a page |
| Page Create from Template | p99 < 3s | Time from template selection to page ready for editing |
| Notification Delivery | p99 < 60s | Time from page edit to notification received by watchers |
| Search Index Update | p99 < 30s | Time from page save to page appearing in search results |
| PDF Export (single page) | p99 < 10s | Time from export request to PDF ready for download |
| PDF Export (page tree, 100 pages) | p99 < 120s | Time from export request to PDF ready |
| Version History Load | p99 < 500ms | Time to load version list for a page |
| Version Diff | p99 < 2s | Time to compute and display diff between two versions |
| Breadcrumb Load | p99 < 50ms | Time to compute and return page hierarchy breadcrumbs |
| Backlinks Query | p99 < 200ms | Time to retrieve all pages linking to a given page |
| Space Page Tree Load | p99 < 500ms | Time to load the full page tree for a space sidebar |
| Audit Log Query | p99 < 2s | Time to query and display audit log entries |

---

## Bandwidth & Throughput Calculations

### Page View Throughput

```
Peak page views: 3,500/sec
Average page payload: 50KB (HTML) + 100KB (assets via CDN) = 150KB total
Bandwidth: 3,500 x 150KB = 525 MB/sec = 4.2 Gbps

With CDN (90% cache hit rate):
  CDN serves: 3,150 views/sec x 100KB = 315 MB/sec from edge
  Origin serves: 350 views/sec x 50KB = 17.5 MB/sec
```

### Search Query Throughput

```
Peak search queries: 1,050/sec
Average query payload: 200 bytes (request), 5KB (response with snippets)
Bandwidth: 1,050 x 5KB = 5.25 MB/sec = 42 Mbps (manageable)

Search cluster internal:
  Each query fans out to all shards: 1,050 x 12 shards = 12,600 shard queries/sec
  Each shard handles: ~1,050 queries/sec
```

### Notification Fan-out

```
Worst case: Company-wide announcement page edited
Watchers: 50,000 users watching the space
Notification generation: 50,000 notifications in <60 seconds
Required throughput: ~833 notifications/sec for single event
With batching (100/batch): 8.3 batch operations/sec
```

### Version Storage

```
Page edits per day: 2M
Average diff size: 2KB (delta from previous version)
Daily version storage: 2M x 2KB = 4 GB/day
Annual version storage: 4 GB x 365 = 1.46 TB/year
With full snapshots every 10 versions: 200K x 20KB = 4 GB/day additional
Total daily: ~8 GB/day for version data
```
