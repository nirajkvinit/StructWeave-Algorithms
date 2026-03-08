# Scalability & Reliability

## Horizontal Scaling Strategy

### Service-Level Scaling

| Service | Scaling Dimension | Strategy |
|---------|------------------|----------|
| **API Gateway** | Request rate | Stateless; scale by adding nodes behind load balancer. Each node handles ~10K req/s. |
| **WebSocket Gateway** | Connection count | Stateful (connection affinity); scale by adding nodes. Each node handles ~100K connections. Use consistent hashing on user ID for routing. |
| **Ticket Service** | Write throughput | Stateless application tier; scale horizontally. Database sharded by `tenant_id`. |
| **Chat Service** | Message throughput + connections | Scale with WebSocket Gateway. Chat DB partitioned by `tenant_id` and time. |
| **Knowledge Base Service** | Read throughput | Stateless; cache-heavy. CDN for public articles. Search engine scales independently. |
| **AI/ML Service** | Inference throughput | Scale by adding inference nodes. GPU nodes for transformer models; CPU nodes for lightweight models. Batch requests for efficiency. |
| **SLA Engine** | Timer count | Timer workers partitioned by `tenant_id` hash. Each worker manages timers for a subset of tenants. |
| **Notification Service** | Delivery throughput | Queue-driven; scale consumers. Separate queues per channel (email, push, webhook). |
| **Automation Service** | Event throughput | Queue-driven; scale consumers. Rule evaluation parallelized across workers. |

### Tenant-Aware Auto-Scaling

```
PSEUDOCODE: Tenant-Aware Scaling

FUNCTION evaluate_scaling_need():
    // Global metrics
    global_qps = get_metric("api_gateway.request_rate")
    global_ws_connections = get_metric("ws_gateway.connection_count")

    // Tenant-level metrics
    hot_tenants = get_tenants_exceeding_threshold(
        metric = "ticket_creation_rate",
        threshold = 10x_average
    )

    // Scale API Gateway based on global QPS
    IF global_qps > 80% of capacity:
        scale_up("api_gateway", by=ceil(global_qps / capacity_per_node))

    // Scale WebSocket Gateway based on connections
    IF global_ws_connections > 80% of capacity:
        scale_up("ws_gateway", by=ceil(global_ws_connections / connections_per_node))

    // Isolate hot tenants
    FOR tenant IN hot_tenants:
        IF tenant.plan == "enterprise" AND NOT has_dedicated_pool(tenant.id):
            provision_dedicated_pool(tenant.id)
            // Route tenant's traffic to dedicated pool
            update_routing_table(tenant.id, "dedicated")
```

---

## Database Scaling

### Sharding Strategy

**Shard key: `tenant_id`**

All core tables (tickets, events, conversations, messages, articles, SLA timers) are sharded by `tenant_id`. This ensures:
- All data for a single tenant is co-located on the same shard
- Queries scoped to a tenant never cross shards
- Tenant isolation is enforced at the data layer

```
PSEUDOCODE: Shard Routing

FUNCTION get_shard(tenant_id):
    // Consistent hashing with virtual nodes
    shard_id = consistent_hash(tenant_id, num_virtual_nodes=256)
    RETURN shard_map[shard_id]

// Shard rebalancing when adding new shards:
// 1. Add new shard to the hash ring
// 2. Tenants that hash to the new shard are migrated
// 3. Migration is live: dual-write during transition, then cutover
// 4. Average impact: 1/N of tenants migrate when adding 1 shard to N shards
```

**Shard sizing guidelines:**
- Target: ~5,000 tenants per shard (150K tenants / 30 shards)
- Large enterprise tenants get dedicated shards
- Each shard is a primary + 2 read replicas
- Shard capacity: 2TB data, 10K write QPS, 50K read QPS

### Read Replica Strategy

| Read Pattern | Replica Usage |
|-------------|---------------|
| Agent ticket list | Read from primary (strong consistency needed for assignment) |
| Ticket detail view | Read from replica (1-2s lag acceptable) |
| Customer ticket history | Read from replica |
| Knowledge base articles | Read from replica + CDN cache |
| Analytics and reporting | Dedicated analytics replica (higher lag acceptable) |
| Search | Dedicated search engine (async indexed) |

---

## Caching Strategy

### Multi-Layer Cache Architecture

```
Layer 1: CDN (Edge Cache)
├── Public knowledge base articles (TTL: 5 min)
├── Customer widget JavaScript/CSS (TTL: 24h)
└── Static assets (images, logos) (TTL: 7d)

Layer 2: Application Cache (Distributed)
├── Tenant configuration (TTL: 5 min, invalidate on change)
├── SLA policies per tenant (TTL: 5 min, invalidate on change)
├── Business calendars (TTL: 1 hour)
├── Agent skills and status (TTL: 30s, high churn)
├── Routing rules per tenant (TTL: 5 min, invalidate on change)
├── Automation rules per tenant (TTL: 5 min, invalidate on change)
├── Active SLA timer state (TTL: none, actively managed)
└── Session data (TTL: 24h)

Layer 3: Local Process Cache (In-Memory)
├── Frequently accessed tenant configs (TTL: 60s)
├── AI model inference cache (input hash → result) (TTL: 5 min)
└── Business hour computations (date + calendar → schedule) (TTL: 1 hour)
```

### Cache Invalidation Strategy

```
PSEUDOCODE: Event-Driven Cache Invalidation

FUNCTION on_tenant_config_change(tenant_id, changed_fields):
    // Invalidate tenant config cache
    cache.delete("tenant_config:" + tenant_id)

    // If SLA policy changed, recalculate active timers
    IF "sla_policies" IN changed_fields:
        cache.delete("sla_policies:" + tenant_id)
        trigger_sla_recalculation(tenant_id)

    // If routing rules changed, invalidate compiled rules
    IF "routing_rules" IN changed_fields:
        cache.delete("routing_rules:" + tenant_id)
        cache.delete("compiled_rules:" + tenant_id)

    // If business hours changed, invalidate calendar cache
    IF "business_hours" IN changed_fields:
        cache.delete("business_calendar:" + tenant_id)
        trigger_sla_recalculation(tenant_id)

FUNCTION on_agent_status_change(agent_id, tenant_id, new_status):
    // Agent went online/offline; update availability cache
    cache.delete("agent_availability:" + tenant_id)
    cache.update_sorted_set(
        "online_agents:" + tenant_id,
        member = agent_id,
        score = IF new_status == "online" THEN now().timestamp ELSE 0
    )
```

---

## Queue-Based Async Processing

### Event Bus Architecture

```
PSEUDOCODE: Event Bus with Consumer Groups

// Topic structure:
// ticket-events     → Ticket lifecycle events (created, updated, assigned, solved)
// chat-events       → Chat events (conversation started, message sent, ended)
// sla-events        → SLA events (timer created, warning, breach)
// notification-jobs → Notification delivery tasks
// webhook-jobs      → Webhook delivery tasks
// indexing-jobs     → Search index update tasks
// analytics-events  → Raw events for analytics pipeline

// Consumer group isolation:
// Each downstream service has its own consumer group
// A single event on "ticket-events" is consumed by:
//   - SLA Engine (consumer group: sla-engine)
//   - Routing Service (consumer group: routing-service)
//   - Automation Service (consumer group: automation-service)
//   - Notification Service (consumer group: notification-service)
//   - Analytics Pipeline (consumer group: analytics-pipeline)
//   - Search Indexer (consumer group: search-indexer)

// Partitioning: events partitioned by tenant_id
// Ensures ordered processing per tenant
// Allows parallel processing across tenants
```

### Dead Letter Queue and Retry Strategy

```
PSEUDOCODE: Retry with Exponential Backoff

FUNCTION process_webhook_delivery(job):
    max_retries = 5
    base_delay = 1  // seconds

    FOR attempt IN range(1, max_retries + 1):
        TRY:
            response = http_post(
                url = job.target_url,
                body = job.payload,
                headers = {
                    "X-Webhook-Signature": hmac(job.secret, job.payload),
                    "X-Webhook-ID": job.id,
                    "X-Webhook-Attempt": attempt
                },
                timeout = 10 seconds
            )

            IF response.status >= 200 AND response.status < 300:
                mark_delivered(job.id)
                RETURN

            IF response.status >= 400 AND response.status < 500:
                // Client error; do not retry
                mark_failed(job.id, response.status, "client_error")
                RETURN

        CATCH timeout_error, connection_error:
            // Transient failure; retry
            PASS

        // Exponential backoff with jitter
        delay = base_delay * (2 ^ attempt) + random(0, 1)
        sleep(delay)

    // All retries exhausted
    move_to_dead_letter_queue(job)
    increment_tenant_failure_count(job.tenant_id, job.target_url)

    // Circuit breaker: disable webhook after 10 consecutive failures
    IF get_consecutive_failures(job.tenant_id, job.target_url) >= 10:
        disable_webhook(job.webhook_subscription_id)
        notify_tenant_admin(job.tenant_id, "Webhook disabled due to persistent failures")
```

---

## Circuit Breakers for Third-Party Integrations

```
PSEUDOCODE: Circuit Breaker Pattern

STRUCTURE CircuitBreaker:
    state: "closed" | "open" | "half_open"
    failure_count: int
    failure_threshold: int  // e.g., 5
    reset_timeout: duration  // e.g., 60 seconds
    last_failure_at: timestamp
    half_open_max_requests: int  // e.g., 3

FUNCTION call_with_circuit_breaker(breaker, operation):
    IF breaker.state == "open":
        IF now() - breaker.last_failure_at > breaker.reset_timeout:
            breaker.state = "half_open"
            breaker.half_open_attempts = 0
        ELSE:
            RAISE CircuitOpenError("Service unavailable, circuit is open")

    TRY:
        result = operation()

        IF breaker.state == "half_open":
            breaker.half_open_attempts += 1
            IF breaker.half_open_attempts >= breaker.half_open_max_requests:
                breaker.state = "closed"
                breaker.failure_count = 0

        RETURN result

    CATCH error:
        breaker.failure_count += 1
        breaker.last_failure_at = now()

        IF breaker.failure_count >= breaker.failure_threshold:
            breaker.state = "open"
            emit_alert("circuit_opened", breaker.service_name)

        RAISE error

// Circuit breakers applied to:
// - External email delivery service
// - External SMS delivery service
// - Tenant webhook endpoints (per-endpoint breaker)
// - AI model inference service
// - Third-party CRM integrations
```

---

## Multi-Region Deployment

### Active-Passive with Read Replicas

```
Primary Region (US-East):
├── All write operations
├── Primary database shards
├── SLA timer workers (authoritative)
├── AI model training
└── Analytics pipeline

Secondary Region (EU-West):
├── Read-only API for EU tenants (data sovereignty)
├── Database read replicas (async replication, <5s lag)
├── WebSocket Gateway (local connections, messages relayed to primary)
├── CDN edge for knowledge base
└── Local cache layer

Disaster Recovery Region (US-West):
├── Cold standby database replicas
├── Configuration replicas
├── Failover target: <15 min RTO
└── RPO: <1 minute (async replication lag)
```

### Data Sovereignty

```
PSEUDOCODE: Region-Aware Routing

FUNCTION route_request(request, tenant_id):
    tenant = get_tenant_config(tenant_id)

    IF tenant.data_region == "EU":
        // Data must stay in EU; route to EU database shard
        RETURN eu_shard_router.route(tenant_id)
    ELSE:
        RETURN default_shard_router.route(tenant_id)

// EU tenants:
// - Primary database in EU region
// - SLA timers processed in EU region
// - Chat messages stored in EU region
// - Cross-region replication DISABLED for data sovereignty
// - Analytics aggregated in EU region
```

---

## Failure Mode Analysis

| Failure Scenario | Detection | Mitigation | Recovery |
|-----------------|-----------|------------|----------|
| **Primary DB shard failure** | Health check + replication lag | Promote read replica to primary (automated failover) | <30s failover; brief read-only period during promotion |
| **WebSocket Gateway node crash** | Connection drop detected by clients | Clients auto-reconnect to different node; message replay from last_message_id | 5-10s reconnection; no message loss (messages persisted to Chat DB) |
| **SLA Timer Worker crash** | Heartbeat timeout from worker | Redistribute timer partitions to surviving workers | 10-30s redistribution; timers may check slightly late but breach detection catches up |
| **AI/ML Service unavailable** | Health check failure; inference timeout | Route all tickets to manual triage queue; use rule-based routing as fallback | Minutes; agents see "AI routing unavailable" status |
| **Message queue backlog** | Consumer lag exceeds threshold | Scale consumers; enable message batching; prioritize SLA events over analytics | Minutes to hours depending on backlog depth |
| **Search engine unavailable** | Health check failure; query timeouts | Fallback to database full-text search (degraded relevance); show "search is temporarily limited" | 5-15 min for search cluster recovery |
| **Cache cluster failure** | Connection errors; cache miss spike | Application falls through to database; increased DB load | 2-5 min for cache cluster recovery; gradual warm-up |
| **External email service outage** | Delivery failure rate spike | Queue email notifications; retry with backoff; switch to backup email provider | Minutes to hours; customer-facing emails delayed |
| **DNS/CDN failure** | External monitoring; customer reports | Failover to backup DNS; bypass CDN for critical paths | 5-30 min depending on DNS TTL |
| **Full region outage** | Cross-region health checks | Failover to DR region; DNS update to route traffic | 10-15 min RTO; <1 min RPO |

---

## Graceful Degradation Hierarchy

When the system is under extreme load or partial failure, degrade non-critical features first:

```
Level 0 (Normal): All features available
    ↓
Level 1 (Elevated Load):
    - Disable real-time analytics dashboard updates
    - Extend webhook delivery windows
    - Reduce knowledge base search result count
    ↓
Level 2 (High Load):
    - Disable AI routing; use round-robin assignment
    - Batch notification delivery (5-minute intervals)
    - Disable automation rule evaluation for non-critical rules
    - Knowledge base serves from CDN cache only (stale articles acceptable)
    ↓
Level 3 (Critical):
    - Disable all non-essential features (analytics, CSAT surveys, automations)
    - Chat widget shows "high volume" message; queue customers
    - SLA timers continue but escalation notifications are batched
    - Read-only mode for knowledge base (no edits)
    ↓
Level 4 (Emergency):
    - Accept ticket creation only (no updates, no chat)
    - SLA timers paused globally (documented as platform incident)
    - Static "We're experiencing issues" page
```

---

## Disaster Recovery

| Metric | Target | Approach |
|--------|--------|----------|
| **RTO (Recovery Time Objective)** | <15 minutes | Automated failover to DR region; pre-warmed infrastructure |
| **RPO (Recovery Point Objective)** | <1 minute | Async database replication with <1min lag; WAL shipping |
| **Backup frequency** | Continuous + daily snapshots | WAL streaming for point-in-time recovery; daily full snapshots to object storage |
| **Backup retention** | 90 days | Daily snapshots retained for 90 days; monthly snapshots for 1 year |
| **DR testing** | Monthly | Automated DR drill: failover to DR region, verify data integrity, fail back |
| **Chat session recovery** | Seamless reconnect | Messages persisted before acknowledgment; client reconnects with last_message_id |
| **SLA timer recovery** | <5 second drift | Timer state backed by durable storage; workers rebuild in-memory state from DB on startup |
