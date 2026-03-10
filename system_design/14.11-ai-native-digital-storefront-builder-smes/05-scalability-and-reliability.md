# 14.11 AI-Native Digital Storefront Builder for SMEs — Scalability & Reliability

## Scaling Strategy

### Tier 1: Stateless Service Scaling

All API services (product manager, order manager, inventory manager, store builder) are stateless and horizontally scalable behind a load balancer. Auto-scaling policies:

| Service | Scaling Metric | Scale-up Threshold | Scale-down Threshold | Min/Max Instances |
|---|---|---|---|---|
| Storefront API | Request rate + latency p95 | > 70% CPU or p95 > 100ms | < 30% CPU for 10 min | 10 / 200 |
| Product Manager | Request rate | > 60% CPU | < 25% CPU for 15 min | 5 / 100 |
| Inventory Manager | Event queue depth | > 1000 pending events | < 100 pending events | 5 / 50 |
| Store Builder | Active store creations | > 50 concurrent builds | < 10 concurrent builds | 3 / 30 |
| Order Manager | Order rate | > 500 orders/min | < 100 orders/min | 5 / 80 |

### Tier 2: Database Scaling

**Product catalog database (write-heavy, read-heavy):**
- **Sharding strategy:** Hash-based sharding on `store_id` across 64 shards. Each shard holds ~47K stores with ~2.3M products.
- **Shard rebalancing:** When a shard exceeds 80% capacity, the shard is split using consistent hashing. New stores are assigned to the lightest shard.
- **Read replicas:** 2 read replicas per shard for dashboard queries and analytics. Replica lag alert at 5 seconds.

**Order database (write-heavy, time-series-like):**
- **Partitioning:** Range-partitioned by `placed_at` month. Current month partition is on fast storage; older partitions on standard storage.
- **Hot partition:** Orders from the current day are additionally cached in a distributed cache for rapid order status lookups.

**Inventory database (contention-hot):**
- **Dedicated cluster:** Inventory records are on a separate database cluster from product and order data to isolate contention.
- **In-memory cache:** Hot inventory records (products with active sessions) are cached with write-through semantics. Cache TTL: 30 seconds.
- **Optimistic locking:** Version-based concurrency control prevents lost updates without pessimistic locks that would create bottlenecks.

### Tier 3: CDN and Edge Scaling

**Storefront delivery architecture:**

```
Customer request → CDN edge node (cache hit? → serve)
                               ↓ (cache miss)
                        Origin shield (regional cache)
                               ↓ (shield miss)
                        Origin server (SSG renderer)
                               ↓
                        Generate page → cache at all layers
```

- **CDN nodes:** 200+ edge locations globally, concentrated in India (40+ PoPs)
- **Cache hit ratio target:** > 95% for storefront pages
- **Cache invalidation:** Product update → targeted purge of affected URLs (product page, category page, homepage if featured product)
- **TTL strategy:** Static assets (images, CSS, JS): 1 year with content-hash URLs. Product pages: 5 minutes at edge, with stale-while-revalidate for 60 seconds.

### Tier 4: AI/GPU Scaling

**Content generation GPU pool:**

| Pool | Purpose | Instance Type | Min/Max | Scaling Metric |
|---|---|---|---|---|
| Sync | Store creation (latency-critical) | GPU instances (inference-optimized) | 4 / 20 | Queue depth + wait time |
| Async | Bulk generation, regeneration | GPU instances (throughput-optimized) | 2 / 15 | Queue depth |
| Image | Visual analysis + processing | GPU instances | 3 / 12 | Image queue depth |

**Cost optimization:**
- Spot/preemptible instances for async pool (60% cost savings; job checkpointing handles preemption)
- Model quantization (INT8) for inference reduces GPU memory, allowing 2× batch size per GPU
- Request coalescing: multiple small inference requests batched into single GPU call

### Tier 5: Event Bus Scaling

**Partition strategy:**
- Product events: partitioned by `product_id` (ensures per-product ordering)
- Order events: partitioned by `store_id` (ensures per-store ordering)
- Inventory events: partitioned by `product_id` (matches inventory contention patterns)

**Consumer scaling:**
- Each channel adapter runs as a consumer group with configurable parallelism
- WhatsApp adapter: 10 consumers (limited by API rate limits, not processing capacity)
- Web adapter: 50 consumers (CDN invalidation is fast)
- Marketplace adapters: 5-20 consumers per marketplace (varies by API limits)

---

## Multi-Region Strategy

### Active-Passive with Regional CDN

**Architecture:** Single primary region for writes (product management, order processing, store creation). CDN distributes read traffic globally. Analytics queries routed to regional read replicas.

**Rationale:** The merchant base is primarily India-focused. Multi-region active-active introduces catalog consistency challenges (split-brain for product updates) that are not justified until the platform expands to multiple countries.

**Regional read replicas:**
- India North (primary): All writes + reads
- India South: Read replica for storefront serving + analytics
- Singapore: Read replica for Southeast Asian storefront traffic
- Frankfurt: Read replica for European storefront traffic (if merchants target global customers)

### Future: Active-Active for Multi-Country

When the platform expands to multiple countries:
- Each country gets its own write region for local merchants
- Cross-country product sharing uses asynchronous replication
- Payment orchestration is region-specific (different gateways per country)
- Content generation models are region-specific (different languages, SEO strategies)

---

## Fault Tolerance

### Failure Scenario 1: Payment Gateway Outage

**Impact:** Customers cannot complete purchases on affected stores.

**Detection:** Health checker pings each gateway every 30 seconds. If success rate drops below 90% in a 5-minute window, gateway is marked DEGRADED.

**Response:**
1. Automatic failover to secondary gateway for affected payment methods
2. Merchant notification: "Payment processing temporarily using backup provider. No action required."
3. In-flight transactions on failed gateway: retry on backup gateway after 30-second timeout
4. Post-recovery: verify all transactions settled correctly; run reconciliation check

**RTO:** < 2 minutes (automatic failover). **RPO:** Zero (no payment data loss; in-flight transactions retry).

### Failure Scenario 2: Content Generation Pipeline Down

**Impact:** New store creation proceeds without AI-generated descriptions; products show placeholder text.

**Detection:** GPU health monitoring + inference latency tracking. Pipeline health endpoint checked every 60 seconds.

**Response:**
1. Store creation continues with template-based descriptions (pre-generated per category)
2. Products queued for AI description generation when pipeline recovers
3. Merchant notified: "Your store is live. Product descriptions will be enhanced by AI within 24 hours."
4. Priority queue: stores created during outage get first AI processing when pipeline recovers

**RTO:** Store creation unaffected (graceful degradation). AI descriptions: recovery time + queue drain. **RPO:** Zero (no data loss; requests are durably queued).

### Failure Scenario 3: Multi-Channel Sync Failure (Channel API Down)

**Impact:** Product updates not reflected on affected channel. Risk of stale prices or oversold inventory.

**Detection:** Channel adapter health check (API ping + last successful sync timestamp). Alert if no successful sync in 30 minutes.

**Response:**
1. Events continue accumulating in the channel's event queue (durable, no data loss)
2. Inventory sync failure for a channel triggers: increase safety buffer for that channel to prevent overselling
3. If channel is down > 2 hours: temporarily delist products on that channel (if supported by channel API)
4. On recovery: drain event queue in order; prioritize inventory events over catalog updates
5. Post-recovery drift scan to verify all products are consistent

**RTO:** Automatic recovery when channel API recovers. **RPO:** Zero (event queue is durable).

### Failure Scenario 4: Database Shard Failure

**Impact:** Stores on the affected shard cannot update products or process orders.

**Detection:** Database health monitoring with 10-second heartbeat. Automated failover to standby replica within 30 seconds.

**Response:**
1. Automatic failover to synchronous standby replica (promoted to primary)
2. Application reconnects automatically via connection pool health check
3. Brief write unavailability during promotion (typically 10-30 seconds)
4. Read traffic continues serving from remaining replicas

**RTO:** 30-60 seconds (automatic promotion). **RPO:** Zero for synchronous replication; < 5 seconds for async replicas.

### Failure Scenario 5: CDN Failure (Edge Node)

**Impact:** Storefront pages slow or unavailable for customers near the affected edge.

**Detection:** CDN provider's built-in health checking and automatic failover.

**Response:**
1. CDN automatically routes traffic to next-nearest healthy edge node
2. Increased latency for affected region (additional 50-100ms) but no downtime
3. If origin shield fails: direct origin requests (highest latency, highest load)
4. Origin auto-scales to handle additional load from cache misses

**RTO:** < 30 seconds (CDN automatic failover). **RPO:** N/A (read-only static content).

---

## Disaster Recovery

### Backup Strategy

| Data | Backup Frequency | Retention | Recovery Method |
|---|---|---|---|
| Product catalog DB | Continuous WAL + daily snapshot | 30 days | Point-in-time recovery (WAL replay) |
| Order DB | Continuous WAL + daily snapshot | 7 years (compliance) | Point-in-time recovery |
| Product images | Cross-region replication (real-time) | Indefinite | Serve from replica region |
| Event store | Cross-region replication | 90 days | Replay events from replica |
| Merchant configs | Daily snapshot + change log | 90 days | Restore from snapshot |
| AI models | Versioned in model registry | All versions | Deploy previous version |

### DR Procedures

**Full region failure:**
1. DNS failover to DR region (automated, < 5 minutes)
2. DR region database promoted from read replica to read-write
3. CDN origin updated to DR region endpoints
4. Storefront serving continues from CDN cache during transition
5. Event bus consumers restart from last committed offset in DR region
6. Channel adapters reconnect from DR region (channels see brief sync gap)

**DR Testing:**
- Quarterly DR drill: simulated region failure with controlled failover
- Chaos engineering: monthly random service failures in production to verify circuit breakers and fallback paths
- Data integrity verification: weekly checksum comparison between primary and DR region databases

---

## Load Shedding and Backpressure

### Tiered Load Shedding

When the system is under extreme load (festival season, viral product), load shedding is applied in priority order:

| Priority | Service | Shedding Strategy |
|---|---|---|
| P0 (never shed) | Checkout + Payment | Reserved capacity; scale aggressively |
| P1 (last resort) | Storefront rendering | Serve stale cache; extend CDN TTL to 1 hour |
| P2 (shed under pressure) | Store creation | Queue new creations; show "high demand, your store will be ready in 15 min" |
| P3 (shed early) | AI content generation | Defer all non-critical generation; use template descriptions |
| P4 (shed first) | Analytics + Reporting | Rate limit dashboard queries; serve cached analytics |

### Backpressure Signals

- **Event queue depth > 10,000:** Channel adapters apply rate limiting; batch size increases
- **GPU queue wait > 30 seconds:** New content generation requests receive degraded-quality immediate response
- **Database connection pool > 80%:** Non-critical reads (analytics, search) routed to read replicas only
- **CDN origin requests > 5,000/s:** Increase CDN TTL dynamically; enable stale-while-revalidate for all storefront pages
