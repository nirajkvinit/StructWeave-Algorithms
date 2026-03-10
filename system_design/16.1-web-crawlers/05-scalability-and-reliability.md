# Scalability & Reliability — Web Crawlers

## Scalability

### Horizontal vs. Vertical Scaling

| Component | Scaling Strategy | Rationale |
|-----------|-----------------|-----------|
| URL Frontier | **Horizontal (partitioned)** | Each partition owns a consistent-hash range of hosts; partitions operate independently; add partitions for more host capacity |
| Fetcher Workers | **Horizontal** | Stateless workers behind a work-queue pattern; add workers for more concurrent connections |
| DNS Resolver Cache | **Horizontal (sharded)** | Shard by host hash; each shard caches a subset of domains |
| Content Processing Pipeline | **Horizontal** | Stateless parsers and link extractors; scale with fetcher throughput |
| URL Dedup (Bloom Filter) | **Horizontal (per-partition)** | Each frontier partition maintains its own Bloom filter; no cross-partition queries |
| Content Dedup Store | **Horizontal (sharded)** | Shard by content hash; uniform distribution |
| Page Store (Object Storage) | **Horizontal (built-in)** | Object storage scales horizontally by design |
| URL Database | **Horizontal (sharded)** | Shard by host; all URLs for a host are co-located with their frontier partition |
| Recrawl Scheduler | **Horizontal (partitioned)** | Each instance handles a subset of frontier partitions |
| robots.txt Cache | **Horizontal (per-fetcher)** | Each fetcher worker group maintains its own cache; populated on-demand |

### Auto-Scaling Triggers

| Component | Metric | Scale-Up Threshold | Scale-Down Threshold | Cooldown |
|-----------|--------|-------------------|----------------------|----------|
| Fetcher Workers | Queue depth (URLs waiting) | >10,000 per partition for >5 min | <500 per partition for >15 min | 10 min |
| Content Processors | Processing lag | >30s lag behind fetchers | <5s lag for >15 min | 5 min |
| DNS Resolvers | Cache miss rate | >10% miss rate | <2% miss rate for >30 min | 15 min |
| Frontier Partitions | URLs per partition | >500M URLs per partition | <100M URLs per partition | 1 hour |

### Scaling the Fetcher Fleet

The fetcher fleet is the most horizontally scalable component. Each worker is stateless — it requests URLs from the frontier, fetches them, and reports results. Key scaling considerations:

**Geographic Distribution:** Fetcher workers are deployed in data centers worldwide to minimize network latency to target hosts. A fetcher in Europe handles European hosts; a fetcher in Asia handles Asian hosts. The frontier partitions route URLs to the geographically closest fetcher group.

| Region | Fetcher Workers | Estimated Hosts Covered |
|--------|----------------|------------------------|
| North America | 1,500 | ~150M hosts |
| Europe | 1,500 | ~150M hosts |
| Asia-Pacific | 1,200 | ~130M hosts |
| Rest of World | 800 | ~70M hosts |

**Connection Pool Management:** Each worker maintains persistent connection pools to frequently crawled hosts. The pool manager evicts connections idle for >30 seconds and limits total connections per worker to the OS file descriptor limit (~10,000). At 200-500 active connections per worker, 5,000 workers maintain ~1.5 million concurrent connections.

**Bandwidth Allocation:** Total inbound bandwidth is ~50 TB/day (~4.6 Gbps sustained). Distributed across 5,000 workers, each worker averages ~1 Mbps — well within a single machine's capability. Peak bandwidth is handled by temporary scale-up of workers.

### Scaling the Frontier

The frontier is the most challenging component to scale because it is stateful (it holds the URL queues and politeness state) and latency-sensitive (fetchers block on dequeue).

**Partition Strategy:**

```
partition_id = consistent_hash(host) % num_partitions
```

With 256 partitions, each partition manages ~2M hosts and ~40M URLs. Each partition runs on a dedicated machine with:
- ~500 MB for back queue heap and host mapping
- ~500 MB for Bloom filter (partition-local)
- ~2 GB for front queues (hot portion; cold URLs on disk)

**Rebalancing:** When adding partitions, hosts are redistributed via consistent hashing with virtual nodes. During rebalancing, affected hosts are temporarily frozen (no new fetches) until their URL state is migrated. Migration takes ~10 minutes per partition.

### Database Scaling Strategy

The URL database uses a wide-column store sharded by host:

| Shard Key | Rationale |
|-----------|-----------|
| `host` | All URLs for a host are co-located; enables efficient per-host queries (all URLs for a host, host crawl stats, etc.) |

**Read Replicas:** The URL database is read-heavy (recrawl scheduler scans, admin queries, analytics). Read replicas serve these workloads while the primary handles writes from crawl result reports.

**Time-Series Partitioning:** Crawl events are partitioned by time (daily tables). Old partitions are archived or dropped according to the retention policy.

### Caching Layers

| Layer | What It Caches | Size | TTL | Hit Rate |
|-------|---------------|------|-----|----------|
| L1: Fetcher-local | robots.txt, DNS, recent content hashes | ~1 GB per worker | robots.txt: 24h; DNS: varies; hashes: 1h | 95%+ for DNS |
| L2: Regional | robots.txt (shared across fetchers), popular host metadata | ~50 GB per region | 24h | 80%+ for robots.txt |
| L3: Bloom filter (per partition) | URL membership | ~500 MB per partition | Rebuilt every 24h | N/A (probabilistic) |

### Hot Spot Mitigation

| Hot Spot | Cause | Mitigation |
|----------|-------|------------|
| Popular hosts (news.example.com) | High volume of discovered URLs for a single host | Per-host URL budget in frontier; excess URLs stored in overflow queue |
| Frontier partition imbalance | Consistent hash maps a disproportionate number of high-volume hosts to one partition | Virtual nodes in consistent hashing; monitor per-partition queue depth; rebalance if skew >2x |
| Content dedup hot keys | Many pages share near-identical boilerplate, clustering SimHash queries | Dedicated hot-key shard; partition by SimHash prefix |

---

## Reliability & Fault Tolerance

### Single Points of Failure (SPOF) Identification

| Component | SPOF Risk | Mitigation |
|-----------|-----------|------------|
| Frontier partition | Loss of a partition halts crawling for ~2M hosts | Primary-standby replication; standby takes over within seconds |
| DNS resolver | DNS failure blocks all fetching | Multiple resolver instances; fallback to upstream resolvers |
| Content dedup store | Dedup service outage causes duplicate fetches | Degraded mode: skip dedup, accept duplicates; reconcile later |
| URL database | DB outage prevents crawl result storage | Write-ahead log on fetchers; replay on DB recovery |
| Object storage | Page content cannot be stored | Local disk buffer on fetcher machines; retry writes when storage recovers |

### Redundancy Strategy

- **Frontier:** Each partition runs primary + standby with synchronous replication of queue state. Standby monitors primary heartbeat and takes over within 5 seconds.
- **Fetcher Fleet:** N+20% over-provisioning. If 20% of workers fail, remaining workers absorb the load.
- **DNS Resolver:** 3 resolver instances per region with round-robin load balancing.
- **Content Store:** Object storage provides built-in replication (3 replicas by default).

### Failover Mechanisms

**Frontier Partition Failover:**
1. Primary sends heartbeat to standby every 1 second
2. Standby detects 3 missed heartbeats (3 seconds)
3. Standby promotes itself to primary
4. Fetchers reconnect to new primary (frontier client retries with backoff)
5. URLs in-flight (checked out by fetchers from old primary) are re-enqueued after lease timeout (5 minutes)

**Fetcher Worker Failure:**
- URLs checked out by the failed worker are not acknowledged within the lease timeout (5 minutes)
- Frontier automatically re-enqueues leased-but-unacknowledged URLs
- No data loss; minor delay in crawling those URLs

### Circuit Breaker Patterns

| Circuit | Triggers | Open Behavior | Half-Open Recovery |
|---------|----------|--------------|-------------------|
| Host circuit breaker | 5 consecutive 5xx errors from a host | Stop all fetching from host for 1 hour | Try 1 request; if success, close circuit |
| DNS resolver circuit breaker | >50% query failures in 1 minute | Switch to backup resolver | Try 10% of queries through primary |
| Content store circuit breaker | Write latency p99 > 5 seconds | Buffer writes locally; stop new writes to store | Resume writes at 10% rate |
| Frontier partition circuit breaker | Partition unresponsive for >10 seconds | Fetchers skip this partition; process URLs from other partitions | Reconnect and verify state |

### Retry Strategies

| Operation | Initial Delay | Max Delay | Max Retries | Backoff |
|-----------|--------------|-----------|-------------|---------|
| Page fetch (transient error) | 1 hour | 7 days | 5 | Exponential (1h, 4h, 1d, 3d, 7d) |
| DNS resolution failure | 10 seconds | 5 minutes | 3 | Exponential |
| robots.txt fetch failure | 5 minutes | 24 hours | 5 | Exponential |
| Content store write | 1 second | 30 seconds | 5 | Exponential with jitter |
| Frontier enqueue | 100ms | 5 seconds | 3 | Exponential with jitter |

### Graceful Degradation

| Scenario | Degraded Behavior | Recovery |
|----------|-------------------|----------|
| Content dedup service down | Fetch and store pages without dedup; accept duplicates | Batch dedup pass after service recovers |
| SimHash index down | Skip near-duplicate detection; exact-hash dedup still works | Rebuild SimHash index from content store |
| Recrawl scheduler down | No recrawls scheduled; continue first-crawl discovery | Resume recrawl scheduling from URL database on recovery |
| 50% of frontier partitions down | Crawl throughput drops by ~50%; surviving partitions continue | Restart or failover failed partitions |
| Object storage degraded | Buffer pages on local disk; slow down fetching to match write capacity | Drain local buffer to object storage when recovered |

### Bulkhead Pattern

The crawler uses bulkheads to isolate failure domains:

- **Per-region bulkhead:** Fetcher fleet in each region operates independently. A network issue in Asia does not affect European crawling.
- **Per-frontier-partition bulkhead:** Each partition is an independent crawl unit. Partition failure only affects hosts in that partition.
- **Per-host circuit breaker:** A single host's errors (5xx, timeouts) do not affect crawling of other hosts on the same partition.

---

## Disaster Recovery

### RTO (Recovery Time Objective)

| Component | RTO | Strategy |
|-----------|-----|----------|
| Frontier partitions | 30 seconds | Hot standby with automatic failover |
| Fetcher fleet | 5 minutes | Auto-scaling replaces failed workers |
| DNS cache | 2 minutes | Fallback to upstream resolvers; cache rebuilds passively |
| URL database | 15 minutes | Failover to read replica promoted to primary |
| Content store | 30 minutes | Switch to secondary object storage region |

### RPO (Recovery Point Objective)

| Data | RPO | Strategy |
|------|-----|----------|
| Frontier queue state | <5 seconds | Synchronous replication to standby |
| URL metadata | <1 minute | Continuous replication; worst case re-crawl a few pages |
| Fetched page content | <1 hour | Pages buffered on fetcher local disk; replay on recovery |
| Crawl events | <5 minutes | Write-ahead log on fetchers; async replication to crawl log store |

### Backup Strategy

- **URL database:** Daily full backup + continuous incremental (WAL shipping)
- **Frontier checkpoints:** Every 15 minutes to durable storage
- **Bloom filters:** Checkpointed hourly; can be rebuilt from URL database in ~30 minutes
- **Content store:** Object storage with cross-region replication (built-in)
- **Configuration (seed lists, trap blocklists, host overrides):** Stored in version control; deployed via CI/CD

### Multi-Region Considerations

The crawler inherently operates across regions (fetcher workers are deployed globally). The frontier and URL database can be deployed in a single primary region with fetcher workers pulling URLs over cross-region links. For full disaster recovery:

- **Active-Passive:** Primary region runs frontier + URL database; secondary region has standby replicas
- **Failover:** Promote secondary region's replicas; redirect fetcher workers to secondary frontier
- **Data sync:** Async replication of URL database; frontier state replicated synchronously to standby within the same region
