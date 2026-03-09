# Scalability & Reliability — Pastebin

## 1. Scalability

### 1.1 Horizontal vs Vertical Scaling

| Component | Scaling Approach | Rationale |
|---|---|---|
| **API Servers** | Horizontal | Stateless request handling; add instances behind load balancer |
| **Metadata DB** | Vertical first, then horizontal (sharding) | Relational DB benefits from larger instances; shard when single node maxes out |
| **Object Storage** | Horizontal (built-in) | Object storage services scale automatically; no manual intervention |
| **Cache Cluster** | Horizontal | Add nodes to consistent hashing ring; auto-rebalance |
| **Key Generation Service** | Horizontal | Multiple KGS instances with non-overlapping key ranges |
| **Expiration Workers** | Horizontal | Partition work by slug prefix ranges; each worker handles a shard |
| **Abuse Detection** | Horizontal | Stateless content scanning; parallelizable |

### 1.2 Auto-Scaling Strategy

```
Auto-Scaling Rules:

API Servers:
├── Scale-out trigger: CPU > 60% OR request queue depth > 100 OR P99 latency > 500ms
├── Scale-in trigger: CPU < 20% AND request queue depth < 10 for 10 minutes
├── Min instances: 3 (across availability zones)
├── Max instances: 20
├── Cooldown: 3 minutes between scaling events
└── Health check: HTTP GET /health (checks DB connectivity + cache connectivity)

Expiration Workers:
├── Scale-out trigger: Expired paste backlog > 100,000
├── Scale-in trigger: Backlog < 10,000 for 30 minutes
├── Min instances: 1
├── Max instances: 5
└── Work distribution: Each worker claims a slug prefix range

Abuse Detection Workers:
├── Scale-out trigger: Content scan queue depth > 500
├── Scale-in trigger: Queue depth < 50 for 10 minutes
├── Min instances: 2
├── Max instances: 10
└── Note: Async scanning allows decoupling from write path latency
```

### 1.3 Database Scaling

#### Metadata Store Scaling Path

```
Stage 1: Single Primary with Read Replicas (0 - 1M pastes/day)
├── Primary handles all writes (~23 QPS average, ~70 QPS peak)
├── 2-3 read replicas handle read queries
├── Replication lag: <100ms (acceptable for paste reads)
├── Expiration sweep runs against replicas
└── Bottleneck: Primary write throughput at ~5K writes/sec

Stage 2: Vertical Scaling of Primary (1M - 5M pastes/day)
├── Upgrade primary to larger instance (more CPU, RAM, IOPS)
├── Add more read replicas (up to 5-7)
├── Add connection pooling proxy between API and DB
└── Bottleneck: Single primary I/O at ~10K writes/sec

Stage 3: Horizontal Sharding (5M+ pastes/day)
├── Shard key: slug prefix (first 2 characters)
├── Number of shards: 16 (covers 62^2 = 3,844 logical partitions mapped to 16 physical)
├── Shard routing: Application-level routing based on slug prefix
├── Each shard: primary + 2 read replicas
├── Cross-shard queries: Only needed for user's paste listing (user_id index)
│   → Solved by maintaining a separate user_pastes lookup table
└── Bottleneck: Effectively eliminated for single-paste operations

Migration Strategy (Stage 2 → Stage 3):
├── Phase 1: Deploy shard-aware application code with all traffic going to single shard
├── Phase 2: Create new shards, begin writing new pastes to appropriate shard
├── Phase 3: Background migration of existing pastes to correct shards
├── Phase 4: Cut over reads to shard-aware routing
└── Phase 5: Decommission original single-node primary
```

#### Content Store Scaling

```
Object Storage Scaling:
├── Inherently horizontal — object storage scales to exabytes
├── No sharding decisions needed
├── Key design: prefix with first 2 chars of content_hash
│   → Ensures even distribution across storage partitions
├── Cross-region replication: configure for disaster recovery
└── Cost optimization: lifecycle policies move cold content to cheaper tiers

Scaling concern: Request rate limits
├── Most object storage services limit to ~5,500 GET/s and ~3,500 PUT/s per prefix
├── Mitigation: Randomized prefixes (content_hash is already random)
├── Additional mitigation: CDN and application cache absorb 80%+ of reads
└── Rarely a practical bottleneck
```

### 1.4 Caching Layers

```
Multi-Layer Cache Architecture:

Layer 1: Browser Cache
├── Cache-Control: public, max-age=300 (public pastes)
├── ETag: content_hash (conditional requests)
├── Effect: Repeat visits to same paste are instant
└── Coverage: Only helps same user, same browser

Layer 2: CDN Edge Cache
├── Geographically distributed across 50+ PoPs
├── Cache key: slug + format (html/raw/embed)
├── TTL: 5 minutes (public), no-store (private)
├── Hit rate: 80-90% of read traffic
├── Effect: Reduces origin traffic by 5-10x
└── Invalidation: Async purge on delete; TTL-based for expiration

Layer 3: Application Cache (In-Memory Cluster)
├── Distributed in-memory store (3-5 nodes, consistent hashing)
├── Stores: paste metadata + content for hot pastes
├── TTL: 1 hour
├── Eviction: LRU
├── Size: ~10 GB (top 20% of accessed pastes)
├── Hit rate: 60-70% of origin requests (after CDN miss)
└── Anti-thrashing: Bloom filter prevents single-access pastes from entering cache

Layer 4: Database Query Cache
├── Prepared statement cache on DB connection pool
├── Result cache for frequent queries (recent pastes, user paste lists)
├── TTL: 60 seconds
└── Size: ~1 GB per DB instance

Overall effect:
├── 100 read requests arrive at CDN
├── 80 served by CDN (80% hit rate)
├── 20 reach origin → 14 served by app cache (70% hit rate)
├── 6 reach database → 4 served by query cache (65% hit rate)
├── 2 require full DB query + object storage fetch
└── Net: 98% of reads never touch the database
```

### 1.5 Hot Paste Mitigation

```
Detection:
├── View counter exceeds 1,000/minute for a single slug
├── CDN reports elevated origin fetches for single URL
└── Cache node reports hot key (single key >5% of ops)

Response (Progressive):

Level 1: Extend CDN TTL
├── Increase Cache-Control max-age from 300 to 3600 for the hot paste
├── Effect: CDN absorbs more traffic, fewer origin hits
└── Trade-off: Longer staleness window if paste is deleted

Level 2: Cache Replication
├── Replicate hot paste data to ALL cache nodes (not just consistent hash owner)
├── Any cache node can serve the request
├── Effect: Distributes load across cluster instead of one node
└── Trade-off: Uses more cache memory; invalidation must hit all nodes

Level 3: Origin Request Coalescing
├── When multiple concurrent cache misses arrive for same slug:
│   First request fetches from DB, remaining requests wait
│   All concurrent requests get same response
├── Effect: Collapses N concurrent DB queries into 1
└── Implementation: In-process lock keyed on slug

Level 4: Static File Serving
├── For extremely viral pastes (>100K views/hour):
│   Pre-render as static HTML file, serve directly from CDN
│   Bypass application entirely
├── Effect: Zero origin load
└── Trade-off: Manual intervention; static file won't reflect deletion
```

---

## 2. Reliability & Fault Tolerance

### 2.1 Single Points of Failure Analysis

| Component | SPOF Risk | Mitigation |
|---|---|---|
| **Load Balancer** | High | Active-passive LB pair with health check failover; DNS-based failover for total LB failure |
| **API Gateway** | Medium | Multiple instances behind LB; stateless design |
| **Metadata DB Primary** | High | Synchronous replication to standby; automatic failover (30-60s) |
| **Object Storage** | Low | Built-in replication (3x); cross-region replication for DR |
| **Cache Cluster** | Medium | Consistent hashing with replicas; cache miss falls through to DB (degraded, not down) |
| **KGS** | High | Multiple KGS instances with non-overlapping ranges; fallback to UUID generation |
| **CDN** | Low | Multi-PoP redundancy; failover to origin on CDN failure |
| **Expiration Workers** | Low | Delayed cleanup is acceptable; auto-restart on crash |

### 2.2 Redundancy Strategy

```
Active-Active Components (stateless):
├── API Servers: N instances across 3 availability zones
├── Abuse Detection Workers: N instances, work from shared queue
└── Expiration Workers: N instances, partition work by slug range

Active-Passive Components (stateful):
├── Metadata DB: Primary + synchronous standby + async read replicas
├── KGS: Primary + warm standby (separate key ranges pre-loaded)
└── Analytics DB: Primary + async replica

Multi-Copy Components:
├── Object Storage: 3x replication within region, cross-region copy for DR
├── Cache: Each key replicated to 1 additional node
└── CDN: Content cached at 50+ global edge locations
```

### 2.3 Failover Scenarios

```
Scenario 1: Metadata DB Primary Failure
────────────────────────────────────────
Detection: Health check failure (3 consecutive misses over 15 seconds)
Failover:
  1. Synchronous standby promoted to primary (30-60 seconds)
  2. Application connection pool reconnects to new primary
  3. Read replicas re-point to new primary
  4. Old primary investigated and rebuilt as new standby
Impact: 30-60 seconds of write unavailability; reads continue from replicas
RTO: 60 seconds | RPO: 0 (synchronous replication)

Scenario 2: Cache Cluster Node Failure
──────────────────────────────────────
Detection: Health check failure or connection timeout
Failover:
  1. Consistent hashing ring updated to remove failed node
  2. Requests for failed node's keys route to next node in ring
  3. Cache miss rate temporarily increases (cold cache on new owner)
  4. Application gracefully degrades to DB reads
Impact: Temporary latency increase (cache misses); no data loss
RTO: <5 seconds | RPO: N/A (cache is ephemeral)

Scenario 3: Object Storage Degradation
──────────────────────────────────────
Detection: Elevated error rates or latency from object storage
Failover:
  1. Circuit breaker opens after 5 failures in 10 seconds
  2. Reads served from cache (if available) or return 503
  3. Writes buffer in local queue, retry when circuit closes
  4. Circuit half-opens after 30 seconds, sends probe request
Impact: Cache hits still served; cache misses return 503
RTO: Depends on provider; typically <5 minutes

Scenario 4: KGS Failure
───────────────────────
Detection: Key claim requests timing out or erroring
Failover:
  1. Switch to fallback KGS instance (warm standby with separate key range)
  2. If all KGS instances down: fallback to UUID-based key generation
     (longer URLs but zero downtime)
  3. Alert ops team to investigate and restore primary KGS
Impact: Potentially longer paste URLs during UUID fallback
RTO: <5 seconds (automatic fallback)
```

### 2.4 Circuit Breaker Configuration

```
Circuit Breaker Settings:

Object Storage Circuit:
├── Failure threshold: 5 failures in 10 seconds
├── Open state duration: 30 seconds
├── Half-open probe: 1 request allowed
├── Success threshold to close: 3 consecutive successes
└── Fallback: Serve from cache or return 503

Abuse Detection Circuit:
├── Failure threshold: 10 failures in 30 seconds
├── Open state duration: 60 seconds
├── Half-open probe: 1 request allowed
├── Success threshold to close: 5 consecutive successes
└── Fallback: Skip abuse detection (allow paste creation with post-hoc scanning)

Metadata DB Circuit:
├── Failure threshold: 3 failures in 5 seconds
├── Open state duration: 15 seconds
├── Half-open probe: 1 read query
├── Success threshold to close: 3 consecutive successes
└── Fallback: Serve from cache (reads), queue writes (creates)
```

### 2.5 Graceful Degradation

```
Degradation Levels:

Level 0: Fully Operational
├── All features available
├── Full abuse scanning, syntax highlighting, analytics
└── SLOs met

Level 1: Analytics Degraded
├── Trigger: Analytics pipeline or view counter overloaded
├── Impact: View counts frozen, analytics dashboard stale
├── User experience: Pastes still created and read normally
└── Recovery: Analytics backfill from event log when restored

Level 2: Abuse Detection Bypassed
├── Trigger: Abuse detection service down (circuit open)
├── Impact: Pastes created without content scanning
├── Mitigation: Post-hoc scanning queue; rate limits still enforced
├── User experience: Normal for legitimate users
└── Risk: Potential malicious content uploaded during window

Level 3: Read-Only Mode
├── Trigger: Metadata DB primary failure + standby promotion in progress
├── Impact: No new pastes; existing pastes readable from replicas + cache
├── User experience: Clear "read-only" banner; retry guidance
└── Duration: 30-60 seconds typical

Level 4: Cache-Only Mode
├── Trigger: Both DB and object storage degraded
├── Impact: Only cached pastes serveable; no creates, no cache-miss reads
├── User experience: Popular pastes still work; others return 503
└── Duration: Minutes; escalation to incident

Level 5: Full Outage
├── Trigger: Cascading failure across multiple components
├── Impact: Service unavailable
├── User experience: Static error page served from CDN
└── Response: Incident management, multi-team response
```

---

## 3. Disaster Recovery

### 3.1 Recovery Objectives

| Metric | Target | Rationale |
|---|---|---|
| **RTO (Recovery Time Objective)** | 30 minutes | Pastebin is not mission-critical infrastructure; users can tolerate brief outages |
| **RPO (Recovery Point Objective)** | 5 minutes | Acceptable to lose up to 5 minutes of paste creations; immutable content has lower RPO sensitivity |
| **Recovery Scope** | Full service restoration | All features including create, read, delete, and expiration |

### 3.2 Backup Strategy

```
Metadata Database:
├── Continuous WAL (Write-Ahead Log) archiving to object storage
│   RPO: ~seconds (continuous streaming)
├── Hourly logical backups (full export)
│   Retention: 30 days
├── Daily snapshot backups
│   Retention: 90 days
├── Cross-region backup replication
│   Async copy to secondary region every hour
└── Restoration test: Monthly automated restore to staging

Object Storage (Content):
├── Built-in 3x replication within region (handled by provider)
├── Cross-region replication (async, <1 hour lag)
├── Versioning enabled for accidental deletion recovery
│   Retention: 7 days of previous versions
└── Note: Content is immutable, so version history is primarily for deletion recovery

Key Pool Database:
├── Less critical — can be regenerated from scratch
├── Daily backup sufficient
└── Recovery: Generate new key batch (takes minutes, not hours)

Cache:
├── No backup needed — cache is ephemeral
├── Cache warming script available for post-recovery
└── Expected behavior: Cold cache after recovery, gradual warming over ~1 hour
```

### 3.3 Multi-Region Architecture

```
Primary Region (Active):
├── All write traffic
├── Primary metadata DB
├── Object storage (primary)
├── Cache cluster
├── KGS primary
└── All background workers

Secondary Region (Warm Standby):
├── Read replicas of metadata DB
├── Object storage (cross-region replica)
├── Cache cluster (cold — warmed on failover)
├── KGS standby (separate key range, pre-loaded)
└── No background workers until activated

CDN (Global):
├── Serves read traffic from nearest edge
├── Origin: primary region
├── On primary failure: origin switches to secondary region
└── Cache continues serving during failover (reduces impact)

Failover Process:
1. Primary region declared unhealthy (automated health check or manual)
2. DNS CNAME updated to point to secondary region (TTL: 60 seconds)
3. Secondary DB replica promoted to primary
4. KGS standby activated
5. Background workers started in secondary region
6. CDN origin updated to secondary region
7. Total failover time: 5-15 minutes (DNS propagation is main delay)
```

### 3.4 Data Integrity Verification

```
Continuous Integrity Checks:

1. Content Hash Verification (Sampling)
   ├── Every hour: randomly sample 1,000 pastes
   ├── Fetch content from object storage
   ├── Recompute SHA-256 hash
   ├── Compare with stored content_hash in metadata
   ├── Alert if mismatch (data corruption detected)
   └── Expected mismatch rate: 0 (any mismatch is a critical alert)

2. Reference Count Reconciliation (Weekly)
   ├── For each content_hash in content_blobs:
   │   actual_refs = COUNT(*) FROM pastes WHERE content_hash = X AND is_deleted = FALSE
   │   IF actual_refs != stored_reference_count:
   │       LOG_WARNING("Reference count drift", {hash, expected, actual})
   │       UPDATE content_blobs SET reference_count = actual_refs
   └── Duration: ~2-4 hours for full scan (run against replica)

3. Orphan Blob Detection (Weekly)
   ├── List all keys in object storage bucket
   ├── For each key, check if corresponding content_hash exists in content_blobs
   ├── Flag orphans (blobs with no metadata reference)
   ├── Quarantine orphans for 7 days, then delete
   └── Common cause: Race between paste creation failure and blob write success

4. Metadata-Content Consistency (Daily)
   ├── Sample 10,000 pastes where is_deleted = FALSE
   ├── Verify content blob exists in object storage
   ├── Alert on "dangling references" (metadata exists, content blob missing)
   └── Recovery: Mark paste as unavailable, alert for investigation
```
