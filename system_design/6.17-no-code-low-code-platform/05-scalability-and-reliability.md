# Scalability & Reliability

## Scaling Strategy: Two-Plane Architecture

The platform's two-plane architecture (Builder Plane + Runtime Plane) enables independent scaling:

| Plane | Traffic Profile | Scaling Strategy | Scale Factor |
|-------|----------------|------------------|-------------|
| **Builder Plane** | Low QPS, bursty (business hours), write-heavy | Scale to ~50K concurrent builders | 1x (baseline) |
| **Runtime Plane** | High QPS, sustained, read-heavy | Scale to ~2M concurrent end-users | 20-50x builder plane |
| **Connector Proxy** | Proportional to runtime QPS, I/O bound | Scale with runtime, per-connector bulkheads | Tied to runtime |
| **Sandbox (V8 Isolates)** | Subset of runtime QPS (only queries with transforms) | Scale with CPU utilization | 30-50% of runtime |

---

## Horizontal Scaling

### Query Execution Engine

The query execution engine is the highest-throughput component and must scale horizontally.

- **Stateless design**: Each query request is self-contained (app_id, query_name, user_context, client_state). No server-side session state.
- **Auto-scaling trigger**: CPU utilization > 60% for 3 minutes triggers scale-out; < 30% for 10 minutes triggers scale-in.
- **Minimum instances**: 4 (cross-zone redundancy)
- **Maximum instances**: 40 (hard cap to prevent runaway scaling)
- **Warm pool**: 2 pre-provisioned instances ready to accept traffic within 30 seconds

### App Definition Service

- **Read replicas**: Runtime app definition reads go to read replicas (4-6 instances)
- **Write path**: Builder saves go to the primary database (3-node cluster)
- **Cache layer**: Distributed cache (cluster of 2-4 nodes) fronts the read replicas
- **Cache hit rate target**: >95% for published app definitions

### Data Connector Proxy

- **Per-connector scaling**: Each connector has a dedicated connection pool. Pools are created lazily on first use and destroyed after idle timeout.
- **Connection pool limits**: Max 20 connections per connector per proxy instance. With 10 proxy instances, max 200 concurrent connections to a single customer database.
- **I/O-bound optimization**: Async I/O with non-blocking database drivers. Each proxy instance handles thousands of concurrent connections.

---

## Database Scaling

### Metadata Store (App Definitions, Permissions, Connectors)

| Strategy | Details |
|----------|---------|
| **Primary-replica** | 1 primary + 2 synchronous replicas for writes; 4 async replicas for reads |
| **Read routing** | Runtime reads -> async replicas (stale by seconds, acceptable); Builder reads -> primary (read-your-writes) |
| **Shard key** | `org_id` if needed at extreme scale (>100K orgs) |
| **Connection pooling** | PgBouncer or equivalent connection multiplexer in front of each database node |

### Audit Log Store

| Strategy | Details |
|----------|---------|
| **Time-partitioned** | Monthly partitions for efficient range queries and retention management |
| **Append-only** | No updates or deletes; compliance requirement |
| **Compression** | Column-oriented compression for historical partitions (10:1 ratio) |
| **Retention** | Hot: 90 days (fast SSD); Warm: 1 year (standard storage); Cold: 7 years (object storage) |
| **Write throughput** | Buffered writes via message queue; batch insert every 1 second |

---

## Caching Strategy

### Multi-Layer Cache

| Layer | What | TTL | Size | Invalidation |
|-------|------|-----|------|-------------|
| **L1: Client-side** | App definition, user permissions | 60s | Per-browser | Version polling (lightweight) |
| **L2: CDN** | Static app shell (HTML/JS/CSS) | 24h | Global edge | Deploy-triggered purge |
| **L3: Distributed cache** | Published app definitions, resolved permissions | 5min | 10 GB cluster | Event-driven (publish event -> evict) |
| **L4: Database read replicas** | All metadata | Real-time (replication lag) | Full dataset | Replication stream |

### Cache Warming

When a builder publishes a new app version:
1. New version is written to the primary database
2. Publish event is emitted to the message bus
3. **Pre-warm**: The new definition is proactively loaded into the distributed cache
4. **Atomic switch**: The published version pointer is updated (single atomic write)
5. **Stale eviction**: Old version is evicted from cache after the new version is warm

This ensures zero cold-start delay for end-users after a publish.

---

## Reliability & Fault Tolerance

### Single Points of Failure (SPOF) Analysis

| Component | SPOF Risk | Mitigation |
|-----------|-----------|------------|
| **Metadata Store primary** | High | Multi-AZ deployment, automatic failover (30s), synchronous replication |
| **Credential Store** | Critical | HSM-backed, multi-AZ, encrypted backups every 6 hours |
| **API Gateway** | High | Multi-instance, health-checked, global load balancing |
| **Query Execution Engine** | Medium | Stateless, auto-scaling, cross-zone distribution |
| **Connector Proxy** | Medium | Per-connector circuit breakers; one connector down doesn't affect others |
| **Distributed Cache** | Medium | Cluster mode with automatic resharding; cache miss falls through to DB |
| **Message Queue (audit)** | Low | Clustered, replicated; audit lag is acceptable |

### Failure Modes and Recovery

#### Connector Timeout

**Scenario**: Customer's PostgreSQL database is overloaded and queries take >10s.

**Handling**:
1. Query times out after configurable timeout (default 10s)
2. Circuit breaker records the failure
3. After 5 failures in 60s, circuit breaker opens for that connector
4. Subsequent queries to that connector fail fast with a clear error message
5. After 30s, circuit breaker enters half-open state and allows 2 test queries
6. If test queries succeed, circuit breaker closes; if they fail, it re-opens

**Impact**: Only apps using that specific connector are affected. All other apps continue normally.

#### Sandbox Crash

**Scenario**: A user's JavaScript transformation causes a V8 Isolate to crash (e.g., due to a V8 engine bug or extreme memory pressure).

**Handling**:
1. Isolate crash is caught by the host process
2. The crashed isolate is destroyed and a new one is created from the warm pool
3. The specific query returns a `SandboxCrashError` to the client
4. The client displays an error state for the affected component
5. Other components and queries on the same page are unaffected
6. Alert fires if crash rate exceeds threshold (possible attack or V8 bug)

#### Metadata Store Unavailability

**Scenario**: Primary metadata store is down for failover (30-60s window).

**Handling**:
1. **Runtime (deployed apps)**: Served entirely from distributed cache. Cache TTL is 5 minutes, so runtime continues normally for up to 5 minutes without the database.
2. **Builder saves**: Queued client-side. Builder UI shows "Saving..." state; saves are retried with exponential backoff.
3. **New app loads (cache miss)**: Fail with a "Service temporarily unavailable" error. Retry after 30s.
4. **Publish operations**: Queued and retried. Builder is notified of the delay.

### Graceful Degradation

| Feature | Normal Mode | Degraded Mode | Trigger |
|---------|------------|--------------|---------|
| **Query execution** | Full pipeline | Disable transforms (raw data only) | Sandbox error rate >5% |
| **Collaboration** | Real-time presence | Disabled (single-user editing) | WebSocket service down |
| **Audit logging** | Every query logged | Log sampling (10%) | Audit store backpressure |
| **Schema introspection** | Live from connector | Cached schema (stale) | Connector timeout |
| **Version history** | Full diff view | List-only (no content diff) | Metadata store read replica lag >10s |

---

## Disaster Recovery

### Recovery Objectives

| Metric | Target | Strategy |
|--------|--------|----------|
| **RTO (Recovery Time)** | <15 minutes (runtime), <1 hour (builder) | Automated failover, multi-AZ |
| **RPO (Recovery Point)** | 0 (metadata store), <1 min (audit logs) | Synchronous replication for metadata; async for audit |

### Backup Strategy

| Data | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| **App definitions + versions** | Continuous (replication) + daily snapshot | 90 days | Cross-region object storage |
| **Connector credentials (encrypted)** | Continuous (replication) + 6-hour snapshot | 30 days | Cross-region, HSM-backed |
| **Audit logs** | Continuous stream to object storage | 7 years | Object storage, lifecycle policy |
| **Permission entries** | Continuous (replication) + daily snapshot | 90 days | Cross-region object storage |

### Multi-Region Considerations

For global enterprises, a multi-region deployment ensures low-latency runtime access:

- **Active-passive**: One primary region for writes (builder saves, publishes), multiple read replicas globally for runtime reads
- **Regional connector proxies**: Connector proxy instances in each region to minimize latency to customer databases in that region
- **CDN for app shell**: Static assets served from edge locations globally
- **Data residency**: Connector credentials and audit logs stored in the organization's designated region (compliance requirement)

---

## Multi-Tenant Isolation at Scale

### Tenant Isolation Levels

| Layer | Isolation Mechanism | Granularity | Purpose |
|-------|-------------------|-------------|---------|
| **API Gateway** | Org ID extracted from JWT; all requests scoped | Per-request | Prevent cross-org routing |
| **Metadata Store** | `org_id` column on every table; enforced in all queries | Per-query | Prevent cross-org data access |
| **Query Execution** | Separate V8 Isolate per query execution | Per-query | Prevent cross-execution memory access |
| **Connector Proxy** | Per-connector connection pool, per-org credential encryption keys | Per-connector | Prevent cross-org credential access |
| **Cache** | Cache keys prefixed with `org_id` | Per-key | Prevent cross-org cache poisoning |
| **Audit Log** | `org_id` on every event; filtered in all reads | Per-event | Prevent cross-org audit access |

### Noisy Neighbor Prevention

A single organization running 500 apps with aggressive auto-refresh queries could consume disproportionate platform resources, degrading performance for other tenants.

**Rate limiting tiers**:

| Tier | Org Size | Query QPS Limit | Concurrent Sandbox | Connector Pool Max |
|------|----------|----------------|-------------------|-------------------|
| **Free** | 1-5 users | 60/min | 2 | 5 per connector |
| **Team** | 5-50 users | 600/min | 10 | 10 per connector |
| **Business** | 50-500 users | 3,000/min | 50 | 20 per connector |
| **Enterprise** | 500+ users | 10,000/min (negotiable) | 100 | 50 per connector |

**Enforcement**:
- Sliding window rate limiter at the API Gateway, keyed by `org_id`
- Separate rate limiters for builder operations and runtime operations
- Backpressure signal: when an org hits 80% of its limit, return `X-RateLimit-Remaining` header so clients can throttle

### Hot Spot Mitigation

**Hot app**: A single deployed app used by 10,000 concurrent end-users (e.g., an all-hands dashboard).

**Mitigations**:
1. App definition cached at CDN edge (app shell) and L3 distributed cache (definition JSON)
2. Query results optionally cached for configurable TTL (per-query, off by default)
3. Per-app query rate limit prevents a single app from monopolizing query execution capacity
4. Connector proxy connection pool shared across all apps using the same connector---a hot app does not get more connections than a cold app

**Hot connector**: A single database connector receiving queries from 100+ apps.

**Mitigations**:
1. Connection pool cap (20 connections max per proxy instance)
2. Queuing: when pool is full, new queries wait up to 5s before failing
3. Circuit breaker: if the connector is consistently slow, queries fail fast
4. Alert: connector pool utilization > 80% triggers notification to org admin

---

## Capacity Planning Triggers

| Trigger | Metric | Threshold | Action |
|---------|--------|-----------|--------|
| **Scale out query engine** | CPU utilization | > 60% for 3 min | Add instances (auto-scale) |
| **Scale out connector proxy** | Connection pool utilization | > 70% across all connectors | Add proxy instances |
| **Scale out cache** | Eviction rate | > 100 evictions/min | Increase cache cluster size |
| **Add read replica** | Replica query latency | p99 > 100ms | Provision additional read replica |
| **Shard metadata store** | Database size | > 500 GB or QPS > 10K | Shard by org_id |
| **Regional expansion** | End-user latency by region | p99 > 500ms from a region | Deploy connector proxy in that region |

---

## Load Testing Strategy

| Scenario | Target | Method |
|----------|--------|--------|
| **Sustained query load** | 2,500 QPS for 1 hour | Synthetic queries against test connectors |
| **Publish storm** | 100 concurrent publishes | Simulate end-of-sprint deployment rush |
| **Sandbox stress** | 500 concurrent JS transforms | CPU-intensive transforms, verify isolation |
| **Connector failover** | Kill connector mid-query stream | Verify circuit breaker behavior |
| **Cache stampede** | Evict all cache + spike traffic | Verify thundering herd protection |
| **Metadata store failover** | Force primary failover during load | Verify <30s recovery, no data loss |
