# 14.5 AI-Native B2B Supplier Discovery & Procurement Marketplace — Scalability & Reliability

## Scaling the Search and Matching Pipeline

### Challenge: 50M+ Product Listings with Sub-500ms Query Latency

The search infrastructure must index 50M+ product listings with hybrid retrieval (keyword + vector), handle 870 queries/sec at peak, and maintain p95 latency ≤ 500ms. The total index footprint (~185 GB) exceeds single-node memory capacity, requiring distributed search.

### Scaling Strategy: Sharded Search Architecture

```
Search cluster architecture:
  Sharding strategy: product listings distributed by category-aware hash
    - Hash function: hash(category_prefix + listing_id) mod num_shards
    - Category-aware: listings in the same leaf category land on the same shard
      (optimizes filter queries that restrict to a single category)
    - 8 primary shards, each holding ~6.25M listings

  Per shard:
    Inverted index: ~6.25 GB
    Vector indices (4 HNSW graphs): ~14.4 GB
    Attribute filter bitsets: ~2.5 GB
    Total per shard: ~23 GB
    Memory requirement: 32 GB per node (23 GB index + 9 GB OS/query processing)

  Read replicas:
    3 replicas per shard for query distribution
    Total search nodes: 8 shards × 3 replicas = 24 nodes
    Write path: updates go to primary shard, async replicate to replicas (< 1 min lag)

  Query routing:
    - Scatter-gather pattern: query dispatched to all 8 primary shards in parallel
    - Each shard returns top-50 candidates with scores
    - Coordinator node merges 8 × 50 = 400 candidates, applies global re-ranking
    - Returns top-20 to the buyer
    - Latency: max(shard_latencies) + merge_time ≈ 80ms + 50ms = 130ms (text queries)

  Auto-scaling:
    - Add read replicas when per-shard query latency p95 > 400ms
    - Shard splitting when any shard exceeds 10M listings
    - Pre-scale replicas from 3 to 5 before known procurement cycles (quarter-end)
```

### Scaling the Vector Index

The HNSW (Hierarchical Navigable Small World) vector index is the most memory-intensive component. With 50M vectors across 4 sub-fields, the total index size is ~115 GB.

```
HNSW scaling parameters:
  Current configuration:
    M (max connections per node): 16
    ef_construction (build-time beam width): 200
    ef_search (query-time beam width): 100
    Recall@100: >95%
    Build time: ~8 hours for full 50M index (per field)
    Incremental insert: ~1ms per vector (500K inserts/day = 500 seconds total)

  Scaling strategies for growth beyond 100M listings:
    Option A: Increase shard count from 8 to 16 (halve per-shard index size)
    Option B: Tiered index — hot tier (30M active listings) in HNSW,
              cold tier (old/inactive listings) in flat index with lower recall
    Option C: Product quantization — compress 384-dim float32 vectors to
              int8 quantized vectors (4× memory reduction, ~2% recall loss)
              Reduces total vector index from 115 GB to ~30 GB

  Chosen approach: Tiered index + sharding
    Hot tier: listings updated in last 180 days (~30M) in HNSW
    Cold tier: older listings (~20M) in IVF-Flat index
    Hot tier handles 95% of search results
    Cold tier is searched only when hot tier returns < 20 results
```

### Scaling Catalog Ingestion

During large supplier onboarding events, the catalog ingestion pipeline must handle burst uploads:

```
Catalog ingestion pipeline scaling:
  Baseline: 500K new SKUs/day = ~6 SKUs/sec
  Burst: Large supplier uploads 100,000 SKUs in a single batch
  Peak: 10 concurrent large uploads = 1M SKUs queued

  Pipeline stages (each independently scalable):
    Stage 1: Format validation and schema normalization
      Throughput: 1,000 SKUs/sec per worker
      Auto-scale: 2-20 workers based on queue depth
      Burst handling: 1M SKUs / 1,000/sec / 20 workers = 50 seconds

    Stage 2: Attribute extraction (NLP on descriptions)
      Throughput: 50 SKUs/sec per worker (GPU-intensive)
      Auto-scale: 5-50 workers
      Burst handling: 1M / 50 / 50 = 400 seconds (~7 minutes)

    Stage 3: Category classification
      Throughput: 200 SKUs/sec per worker
      Auto-scale: 3-30 workers
      Burst handling: 1M / 200 / 30 = 167 seconds (~3 minutes)

    Stage 4: Entity resolution (duplicate detection)
      Throughput: 20 SKUs/sec per worker (requires index lookup per item)
      Auto-scale: 5-100 workers
      Burst handling: 1M / 20 / 100 = 500 seconds (~8 minutes)

    Stage 5: Embedding generation
      Throughput: 50 SKUs/sec per GPU worker
      Auto-scale: 2-20 GPU workers
      Burst handling: 1M / 50 / 20 = 1,000 seconds (~17 minutes)

    Stage 6: Index insertion
      Throughput: 500 SKUs/sec per shard (8 shards in parallel)
      Burst handling: 1M / 500 / 8 = 250 seconds (~4 minutes)

  Total burst processing time: ~40 minutes for 1M SKUs
  SLA: bulk upload acknowledged within 30 minutes for up to 100K SKUs;
       within 2 hours for up to 1M SKUs
```

---

## Scaling the RFQ Pipeline

### Challenge: Quarter-End Procurement Surge

Enterprise procurement teams concentrate purchasing in the last two weeks of each quarter (budget utilization pressure). RFQ volume increases from 100K/day to 300K/day, creating a 3x surge in:
- Specification parsing (NLP processing)
- Supplier matching (search queries)
- Bid collection processing
- Award recommendation computation

```
Quarter-end scaling plan:
  Pre-scaling (T-7 days):
    - Increase specification parsing workers: 10 → 30
    - Increase matching service instances: 5 → 15
    - Increase bid processing workers: 5 → 15
    - Pre-warm search index caches with frequently queried categories

  During surge:
    RFQ creation rate: ~3.5 RFQs/sec (peak hour: ~10.5/sec)
    Specification parsing: 30 workers × 0.5 RFQs/sec = 15 RFQs/sec capacity ✓
    Supplier matching: 15 instances × 2 matches/sec = 30 matches/sec capacity ✓
    RFQ distribution: 10 instances × 5 distributions/sec = 50/sec capacity ✓

  Bid collection:
    300K RFQs × 4.2 bids average = 1.26M bids/day
    Bid processing: 15 workers × 10 bids/sec = 150 bids/sec = 12.96M/day ✓

  Post-surge (T+14 days):
    Gradual scale-down over 5 days as RFQ volume normalizes
    Monitor conversion rates: quarter-end RFQs have higher conversion (budget pressure)
```

---

## Scaling the Trust Scoring Pipeline

### Challenge: Continuous Trust Updates at Scale

With 5M trust signal events per day and 500K active suppliers, the trust scoring system must process updates in near-real-time while maintaining consistency across all consumers (search, RFQ routing, supplier dashboard).

```
Trust scoring architecture:
  Real-time path (per-signal updates):
    Event ingestion: Kafka topic partitioned by supplier_id
    Processing: 10 consumer workers, each handling ~6 events/sec
    Per-event processing: ~40ms
    End-to-end latency: signal event → trust score updated ≤ 5 seconds
    Concurrency: supplier_id partitioning ensures single-writer per supplier
                 (no concurrent updates to the same supplier's score)

  Batch path (daily recalculation):
    Full recalculation of all 500K supplier trust scores
    Purpose: consistency checkpoint (correct accumulated floating-point errors),
             cross-supplier ranking computation, decay application
    Processing: 20 workers × 25K suppliers each = 500K suppliers
    Per-supplier: ~100ms (read all signals, recompute from scratch)
    Duration: 500K × 100ms / 20 workers = 2,500 seconds ≈ 42 minutes

  Caching:
    Trust scores cached at search nodes for enrichment
    Cache refresh: every 60 seconds (trust score changes are not latency-critical
                   for search ranking — a 60-second stale score is acceptable)
    Cache invalidation: explicit invalidation on significant score changes
                        (e.g., supplier suspended, trust drops below threshold)

  Storage scaling:
    Current: 500K suppliers × 11 KB = 5.5 GB (fits in single node)
    Growth: up to 2M suppliers → 22 GB (still fits in single node with 64 GB RAM)
    Beyond 2M: partition by supplier_id hash across 2-4 nodes
```

---

## Reliability Architecture

### Search Service: Four-Nines Availability (99.99%)

The search service is the primary buyer-facing interface. Every minute of downtime directly impacts buyer engagement and GMV.

```
Redundancy architecture:
  Application layer:
    - Multi-zone deployment: 3 availability zones
    - Each zone has a complete set of search shards (8 shards × 1 replica = 8 nodes)
    - Any single zone can handle full search traffic independently
    - Zone-level failover: DNS-based health checking, 30-second TTL
    - Total search nodes: 24 (8 shards × 3 zones)

  Index consistency:
    - Write to primary shard, async replicate to zone replicas
    - Maximum replication lag: 60 seconds
    - If a zone falls behind by >5 minutes, remove from rotation
    - Index rebuild from catalog database as fallback (2-hour RTO for full rebuild)

  Degraded mode:
    - If vector index unavailable: fall back to keyword-only search
      (reduced relevance but functional — handles 70% of queries adequately)
    - If specification matching unavailable: disable spec upload, serve text search only
    - If re-ranking service unavailable: return raw retrieval scores
      (less personalized but still relevant results)
```

### Payment and Escrow Service: Four-Nines Availability (99.99%)

Financial transactions require the highest reliability and consistency guarantees.

```
Escrow service architecture:
  Deployment: separate cluster from marketplace services (blast radius isolation)
  Database: synchronous replication across 2 zones (RPO = 0)
  Application: active-active across 2 zones with distributed transaction coordination

  Consistency model:
    - All escrow operations use serializable isolation level
    - Double-entry bookkeeping: every escrow operation creates balanced debit + credit entries
    - Automated reconciliation: hourly balance check against banking partner
    - Discrepancy alert: any balance mismatch > ₹1 triggers immediate investigation

  Failure handling:
    - Payment gateway timeout: idempotent retry with exponential backoff (3 retries)
    - Double-payment prevention: idempotency key per escrow operation
    - Partial failure: if deposit succeeds but database write fails,
      reconciliation daemon detects orphaned deposit within 15 minutes
    - Refund failure: queue for manual processing; buyer notified of delay
```

### Failure Modes and Recovery

| Failure Mode | Impact | Detection | Recovery |
|---|---|---|---|
| **Search shard failure** | ~12.5% of listings missing from results (one shard) | Health check failure, incomplete result count | Traffic routed to zone replica of failed shard; rebuild shard from catalog DB if needed |
| **Vector index corruption** | Degraded search relevance (keyword-only fallback) | Recall monitoring drops below 85% | Switch to keyword-only mode; rebuild vector index from embeddings (2 hours) |
| **Catalog database failure** | No new listings or updates; existing index continues serving | Connection timeout, write failure | Failover to synchronous replica (RPO=0, RTO <30s); ingestion queue buffers updates |
| **Trust scoring service down** | Search ranking degraded (no trust signals); RFQ routing uses cached scores | Health check failure | Use last-known trust scores (cached, max 1 hour stale); RFQ routing falls back to capability-only matching |
| **RFQ service failure** | Buyers cannot create new RFQs; existing RFQs continue | Health check, error rate spike | Auto-restart (10s); queue pending RFQs in message broker for processing after recovery |
| **Escrow service failure** | New payments blocked; existing escrows continue | Health check, payment error rate | Failover to standby (RPO=0, RTO <30s); new orders queued pending recovery |
| **Sanctions screening down** | Cross-border orders blocked (fail-closed) | Health check failure | Fail-closed: block all cross-border orders; domestic orders unaffected; manual override requires compliance team approval |
| **Embedding generation pipeline down** | New listings not searchable via vector search | Queue depth growing, processing stopped | New listings searchable via keyword only; backlog processed on recovery |

### Data Durability

```
Transaction records (orders, payments, escrow):
  - Synchronous replication across 2 zones
  - RPO: 0 (zero data loss)
  - RTO: < 30 seconds (automatic failover)
  - Backup: daily snapshot to object storage; 8-year retention
  - Encryption: AES-256 at rest, TLS 1.3 in transit

Catalog database:
  - Synchronous replication across 2 zones
  - RPO: 0
  - RTO: < 30 seconds
  - Backup: 6-hourly snapshots; 1-year retention
  - Source of truth for search index rebuilds

Search indices:
  - Asynchronous replication
  - RPO: < 5 minutes
  - RTO: keyword index rebuild from catalog DB: 1 hour
         vector index rebuild from embeddings: 2 hours
  - Acceptable: search index is a derived view of catalog data

Trust score store:
  - Asynchronous replication
  - RPO: < 1 minute
  - RTO: < 5 minutes (failover to replica)
  - Rebuild from signal events: 42 minutes (batch recalculation)

Price benchmark database:
  - Asynchronous replication
  - RPO: < 10 minutes
  - RTO: < 15 minutes
  - Rebuild from transaction history: 4 hours

Document store (images, PDFs, certificates):
  - Object storage with cross-region replication
  - RPO: < 1 hour
  - Durability: 99.999999999% (11 nines)
  - Retention: varies by document type (certificates: 3 years; order docs: 8 years)
```

---

## Handling Peak Events

### Scenario: Quarter-End Procurement Surge — 3x RFQ Volume

During the last two weeks of each fiscal quarter, enterprise procurement teams rush to utilize remaining budgets and complete annual procurement plans. RFQ volume increases from 100K/day to 300K/day.

```
Timeline:
  T-14 days: Historical patterns predict upcoming quarter-end surge
    → Pre-scale RFQ processing pipeline to 3x capacity
    → Pre-scale search infrastructure (add read replicas)
    → Alert supplier success team to ensure top suppliers are active
    → Pre-warm price benchmark cache for trending categories

  T-7 days: Early surge indicators detected (RFQ creation rate increasing)
    → Activate quarter-end pricing models (factor in budget pressure)
    → Increase supplier daily RFQ cap from 20 to 30 (suppliers expect higher volume)
    → Enable accelerated bid collection (shorten default bid deadline from 72h to 48h)

  T-0: Peak period begins
    → RFQ rate: 10.5/sec (peak hours)
    → Search query rate: 870/sec (3x normal)
    → Auto-scale: search replicas 24 → 40, RFQ workers 10 → 30
    → Monitor bid response rates — if declining, tighten supplier selection
    → Price intelligence: alert buyers when benchmark prices spike due to
       demand surge (inform purchasing decisions)

  T+14: Quarter-end peak subsides
    → Gradual scale-down over 5 days
    → Post-surge analytics: compare RFQ conversion rates, average bid counts,
       price competitiveness during surge vs. normal periods
    → Supplier feedback: survey suppliers on RFQ quality during surge
    → Model retraining: update engagement prediction model with surge data
```

### Scenario: Supplier Onboarding Event — Large Catalog Upload

A major supplier joins the platform and uploads 500,000 product listings in a single batch.

```
Timeline:
  T-0: Supplier initiates bulk catalog upload (500K listings in CSV)
    → Format validation: ~2 minutes (500K / 5,000 validations per sec)
    → Schema normalization: ~5 minutes
    → Priority queue: classified as "large onboarding" — dedicated processing lane

  T+5 min: Attribute extraction begins
    → GPU workers: 20 workers × 50 SKUs/sec = 1,000 SKUs/sec
    → Duration: 500K / 1,000 = 500 seconds ≈ 8 minutes
    → Progressive indexing: listings are indexed as they are processed,
       not waiting for entire batch to complete

  T+15 min: Entity resolution
    → 500K new listings checked against 50M existing listings
    → Candidate duplicate detection: ~25 min (20 SKUs/sec × 100 workers)
    → Flagged duplicates queued for manual review (expected: ~2% = 10K listings)

  T+45 min: Embedding generation + index insertion
    → Embedding: ~17 minutes on 20 GPU workers
    → Index insertion: ~2 minutes (500 inserts/sec × 8 shards)

  T+60 min: Onboarding complete
    → ~490K listings searchable (excluding flagged duplicates)
    → Supplier notified: "490,000 listings active; 10,000 pending review"
    → Search index fully consistent within 5 minutes of insertion

  Impact on existing search:
    → Search latency increase during indexing: <10ms (incremental HNSW insert is fast)
    → No degradation visible to other users
```

---

## Geographic Distribution

### Multi-Region Deployment for Cross-Border Trade

```
Region configuration:
  Primary region (domestic):
    - Handles all domestic Indian marketplace operations
    - 3 availability zones within region
    - All catalog, order, and payment data resides here
    - Data sovereignty: Indian business data stored in-country

  Secondary region (international):
    - Handles cross-border buyer access (international buyers searching Indian suppliers)
    - Read-only search index replica (synced from primary, < 5 min lag)
    - Sanctions screening service (local to reduce latency for international checks)
    - Cross-border trade compliance document generation
    - No transactional data stored: all orders, payments, and escrow in primary region

  CDN for static content:
    - Product images and media served from edge locations globally
    - Specification PDFs cached at edge (30-day TTL)
    - Supplier storefronts served from nearest PoP

Geographic search optimization:
  - Buyer location influences search ranking (local suppliers preferred for domestic orders)
  - Cross-border queries route to international search endpoint
    (includes export-capable suppliers only, filters by shipping region)
  - Language-specific search: query understanding supports Hindi, Tamil, Bengali,
    Gujarati, Marathi, Telugu, Kannada, Malayalam, English
  - Regional category preferences: construction materials weighted higher in
    Tier 2/3 cities; industrial components weighted higher in industrial corridors
```

### API Gateway Regional Routing

```
API gateway distribution:
  - Single global API endpoint with geographic routing
  - Domestic buyers → primary region (latency: <50ms)
  - International buyers → nearest PoP → route to primary for writes,
    secondary for read-only search
  - Rate limiting per buyer organization: 1,000 requests/minute
  - Burst handling: 3x burst allowance with token bucket
  - Partner API (ERP integrations): dedicated rate limit per integration
    (configurable per partner, default 100 requests/minute)
```
