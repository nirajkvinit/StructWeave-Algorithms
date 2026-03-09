# Scalability & Reliability — Email Delivery System

## 1. Scalability Strategy

### 1.1 Horizontal Scaling Architecture

```mermaid
flowchart TB
    subgraph Ingestion["Ingestion Tier (Stateless)"]
        API1[API Server 1]
        API2[API Server 2]
        API_N[API Server N]
        SMTP1[SMTP Server 1]
        SMTP2[SMTP Server 2]
    end

    subgraph Processing["Processing Tier (Stateless)"]
        TPL1[Template Worker 1]
        TPL2[Template Worker 2]
        SIGN1[DKIM Signer 1]
        SIGN2[DKIM Signer 2]
    end

    subgraph Queue["Queue Tier (Stateful)"]
        Q1[Queue Partition 1<br/>gmail.com · yahoo.com]
        Q2[Queue Partition 2<br/>outlook.com · aol.com]
        Q3[Queue Partition 3<br/>Custom Domains A-M]
        Q4[Queue Partition 4<br/>Custom Domains N-Z]
    end

    subgraph MTA["MTA Tier (IP-Affine)"]
        MTA1[MTA Fleet 1<br/>IPs: 1-50<br/>Region: US-East]
        MTA2[MTA Fleet 2<br/>IPs: 51-100<br/>Region: US-West]
        MTA3[MTA Fleet 3<br/>IPs: 101-150<br/>Region: EU-West]
        MTA4[MTA Fleet 4<br/>IPs: 151-200<br/>Region: AP-South]
    end

    subgraph Tracking["Tracking Tier (Edge-Deployed)"]
        TRACK1[Tracking PoP 1<br/>US-East]
        TRACK2[Tracking PoP 2<br/>US-West]
        TRACK3[Tracking PoP 3<br/>Europe]
        TRACK4[Tracking PoP 4<br/>Asia-Pacific]
    end

    LB[Load Balancer] --> API1 & API2 & API_N
    LB --> SMTP1 & SMTP2
    API1 & API2 & API_N --> TPL1 & TPL2
    TPL1 & TPL2 --> SIGN1 & SIGN2
    SIGN1 & SIGN2 --> Q1 & Q2 & Q3 & Q4
    Q1 --> MTA1 & MTA2
    Q2 --> MTA2 & MTA3
    Q3 --> MTA3 & MTA4
    Q4 --> MTA4 & MTA1

    classDef stateless fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef stateful fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef affine fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class API1,API2,API_N,SMTP1,SMTP2,TPL1,TPL2,SIGN1,SIGN2 stateless
    class Q1,Q2,Q3,Q4 stateful
    class MTA1,MTA2,MTA3,MTA4 affine
    class TRACK1,TRACK2,TRACK3,TRACK4 edge
```

### 1.2 Scaling Dimensions

| Component | Scaling Type | Scaling Trigger | Scaling Unit |
|---|---|---|---|
| **API Gateway** | Horizontal (stateless) | Request rate > 80% capacity | Add API server instances |
| **SMTP Ingestion** | Horizontal (stateless) | Concurrent connections > 80% | Add SMTP server instances |
| **Template Engine** | Horizontal (stateless) | CPU utilization > 70% | Add rendering workers |
| **DKIM Signer** | Horizontal (stateless) | Signing queue depth > 1000 | Add signing workers |
| **Queue Partitions** | Horizontal (by domain hash) | Partition size > threshold | Split partition (repartition by domain) |
| **MTA Fleet** | Horizontal (by IP pool) | Queue drain rate < ingestion rate | Add MTA workers + allocate new IPs |
| **Tracking Servers** | Horizontal (edge PoPs) | Request latency > 50ms P95 | Add instances at edge locations |
| **Suppression Store** | Horizontal (by hash prefix) | Lookup latency > 5ms P99 | Add storage nodes; redistribute shards |
| **Webhook Workers** | Horizontal (by account) | Webhook backlog > 10 min | Add webhook delivery workers |
| **Analytics Pipeline** | Horizontal (by time partition) | Processing lag > 5 min | Add stream processors |

### 1.3 Auto-Scaling Configuration

| Component | Min Instances | Max Instances | Scale-Up Trigger | Scale-Down Trigger | Cooldown |
|---|---|---|---|---|---|
| API servers | 10 | 200 | QPS > 70K per instance | QPS < 30K per instance | 3 min up, 10 min down |
| Template workers | 20 | 500 | CPU > 70% | CPU < 30% | 2 min up, 15 min down |
| MTA workers | 50 | 1000 | Queue depth > 100K msgs | Queue depth < 10K msgs | 5 min up, 30 min down |
| Tracking servers | 5 per region | 50 per region | Latency P95 > 30ms | Latency P95 < 10ms | 1 min up, 10 min down |
| Webhook workers | 10 | 300 | Backlog > 5 min | Backlog < 30 sec | 2 min up, 10 min down |

### 1.4 Database Scaling Strategy

| Data Store | Scaling Approach | Details |
|---|---|---|
| **Account/Config DB (PostgreSQL)** | Vertical + read replicas | Low write volume; 1 primary + 3 read replicas; vertical scale for write capacity |
| **Message Store (Cassandra)** | Horizontal sharding | Partition by account_id; add nodes linearly with volume growth; 3x replication |
| **Suppression Store (Redis + RocksDB)** | Hash-partitioned cluster | 32 shards by email_hash prefix; each shard: 1 Redis primary + 1 replica backed by RocksDB |
| **Event Store (ClickHouse)** | Time-partitioned + sharded | Partition by hour, shard by account_id; add shards for write throughput |
| **Template Store (MongoDB)** | Replica set per region | Low volume; 1 primary + 2 secondaries per region; shard only if > 100M templates |

### 1.5 Caching Layers

| Layer | Technology | Data | Size | Hit Rate | TTL |
|---|---|---|---|---|---|
| **L1: Process-local** | In-memory hash map | DNS MX records, compiled templates, DKIM keys | 256 MB per worker | > 99% | 5-60 min |
| **L2: Shared cache** | Redis cluster | Domain config, suppression bloom filter segments, rate counters | 100 GB cluster | > 95% | 1-15 min |
| **L3: CDN edge cache** | Edge servers | Static assets (tracking pixel GIF) | Distributed | > 99% | 24 hours |
| **Negative cache** | L1 + L2 | Invalid domains, NXDOMAIN results | Part of L1/L2 | High | 1 hour |

### 1.6 Hot Spot Mitigation

| Hot Spot | Cause | Mitigation |
|---|---|---|
| **Gmail queue** | 60%+ of consumer email goes to Gmail | Multiple queue partitions for gmail.com; distribute across 50+ sending IPs |
| **Large campaign burst** | Single customer sends 10M+ campaign | Campaign throttling: max 500K/hour per customer on shared IPs; dedicated IP customers can burst higher |
| **Popular tracking pixel** | Viral marketing email generates millions of opens | Edge-deployed tracking servers; pre-computed pixel response; async event logging |
| **Single suppression hash prefix** | Unlucky hash distribution concentrates lookups | Consistent hashing with virtual nodes; dynamic rebalancing on load detection |
| **Webhook endpoint for large customer** | Single customer generates 100M+ events/day | Dedicated webhook worker pool for high-volume customers; event batching (100 events/POST) |

---

## 2. Reliability & Fault Tolerance

### 2.1 Single Points of Failure Analysis

| Component | SPOF Risk | Redundancy Strategy |
|---|---|---|
| **API Gateway** | Low (stateless) | Multiple instances behind load balancer; health-checked; instant failover |
| **Queue System** | High (stateful) | Replicated partitions (3x); leader election; WAL-based durability |
| **Suppression Store** | Critical (compliance) | Multi-region replication; bloom filter provides degraded-mode coverage |
| **DKIM Signing** | Medium (signing keys) | Key material in KMS with multi-AZ replication; local key cache for 15-min fallback |
| **DNS Resolution** | Medium (dependency) | Dedicated resolver cluster; aggressive caching; fallback to public resolvers |
| **IP Pool** | Low (distributed) | IPs spread across multiple data centers; automated failover to healthy pools |

### 2.2 Redundancy Architecture

```mermaid
flowchart TB
    subgraph Primary["Primary Region (Active)"]
        P_API[API + SMTP<br/>Ingestion]
        P_QUEUE[Queue<br/>Cluster]
        P_MTA[MTA<br/>Fleet]
        P_DB[(Primary<br/>Databases)]
    end

    subgraph Secondary["Secondary Region (Warm Standby)"]
        S_API[API + SMTP<br/>Ingestion]
        S_QUEUE[Queue<br/>Cluster]
        S_MTA[MTA<br/>Fleet]
        S_DB[(Replica<br/>Databases)]
    end

    subgraph Shared["Shared Services (Multi-Region)"]
        SUPP_GLOBAL[Global Suppression<br/>Multi-Region Active]
        DNS_GLOBAL[DNS Infrastructure<br/>Anycast]
        TRACK_GLOBAL[Tracking Servers<br/>Edge-Deployed]
    end

    P_API --> P_QUEUE --> P_MTA
    S_API --> S_QUEUE --> S_MTA
    P_DB -->|Async Replication| S_DB
    P_QUEUE -->|Queue Mirroring| S_QUEUE

    P_API --> SUPP_GLOBAL
    S_API --> SUPP_GLOBAL
    P_MTA --> DNS_GLOBAL
    S_MTA --> DNS_GLOBAL

    classDef primary fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef secondary fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef shared fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class P_API,P_QUEUE,P_MTA,P_DB primary
    class S_API,S_QUEUE,S_MTA,S_DB secondary
    class SUPP_GLOBAL,DNS_GLOBAL,TRACK_GLOBAL shared
```

### 2.3 Failover Mechanisms

| Scenario | Detection | Failover | RTO | RPO |
|---|---|---|---|---|
| **Primary API down** | Health check failures (3 consecutive) | DNS failover to secondary region API | < 60 seconds | 0 (stateless) |
| **Queue partition leader failure** | Heartbeat timeout (10s) | Follower promotion via leader election | < 30 seconds | 0 (replicated writes) |
| **MTA worker crash** | Process health check | Messages redistributed to other workers in pool | < 10 seconds | 0 (messages still in queue) |
| **Suppression store failure** | Lookup timeout > 5ms | Fail-closed: reject sends until restored; bloom filter allows ~99% accurate filtering in degraded mode | < 5 minutes | 0 (replicated) |
| **Entire primary region down** | Region-level health monitoring | Route all traffic to secondary; promote replica DBs | < 5 minutes | < 30 seconds (async replication lag) |
| **DKIM KMS unavailable** | Key retrieval timeout | Use locally cached keys (15-min TTL); queue messages if cache expired | 0 (cache hit) / < 15 min (cache miss) | 0 |

### 2.4 Circuit Breaker Patterns

```
FUNCTION deliver_with_circuit_breaker(message, destination_domain):
    breaker = get_circuit_breaker(destination_domain)

    IF breaker.state == OPEN:
        // ISP is rejecting — don't attempt, queue for later
        requeue_with_delay(message, breaker.reset_timeout)
        RETURN DEFERRED

    IF breaker.state == HALF_OPEN:
        // Allow single probe to test recovery
        IF NOT breaker.try_acquire_probe():
            requeue_with_delay(message, 30_SECONDS)
            RETURN DEFERRED

    result = attempt_smtp_delivery(message, destination_domain)

    IF result == SUCCESS:
        breaker.record_success()
        IF breaker.state == HALF_OPEN:
            breaker.transition(CLOSED)
        RETURN DELIVERED

    ELSE IF result == TEMPORARY_FAILURE:
        breaker.record_failure()
        IF breaker.failure_count > THRESHOLD:  // e.g., 50 failures in 5 min
            breaker.transition(OPEN)
            breaker.set_reset_timeout(exponential_backoff())
            ALERT("Circuit breaker opened for " + destination_domain)
        requeue_with_delay(message, calculated_backoff())
        RETURN DEFERRED

    ELSE IF result == PERMANENT_FAILURE:
        handle_bounce(message, result)
        RETURN BOUNCED

CIRCUIT_BREAKER_CONFIG:
    failure_threshold: 50 failures in 5-minute window
    success_threshold: 10 successes to close from half-open
    open_duration: 60 seconds (initial), exponential to max 30 minutes
    half_open_probes: 1 message every 30 seconds
```

### 2.5 Retry Strategies

| Retry Scenario | Strategy | Max Retries | Backoff | Max Duration |
|---|---|---|---|---|
| **SMTP 4xx (temp failure)** | Exponential backoff + jitter | 5 retries | 1m, 5m, 30m, 2h, 12h | 72 hours |
| **DNS resolution failure** | Immediate retry with fallback MX | 3 retries | 1s, 5s, 30s | 5 minutes |
| **TLS handshake failure** | Retry without TLS (if permitted by policy) | 2 retries | Immediate | N/A |
| **Connection refused** | Backoff + IP rotation | 5 retries | 5m, 15m, 1h, 4h, 12h | 48 hours |
| **Webhook delivery failure** | Exponential backoff | 8 retries | 30s, 1m, 5m, 30m, 1h, 4h, 12h, 24h | 72 hours |
| **Template rendering failure** | No retry (fail fast) | 0 | N/A | Return error to API caller |
| **Suppression lookup timeout** | Fail-closed (block send) | 2 retries | 100ms, 500ms | 1 second |

### 2.6 Graceful Degradation

| Degradation Level | Trigger | Behavior |
|---|---|---|
| **Level 0: Normal** | All systems healthy | Full functionality |
| **Level 1: Marketing pause** | Queue depth > 5M or ISP throttling heavy | Pause marketing sends; prioritize transactional |
| **Level 2: Tracking disabled** | Tracking server overload | Send emails without tracking pixel/click wrapping; disable open/click reporting |
| **Level 3: Template bypass** | Template engine down | Send raw HTML (pre-rendered by customer) only; reject template-based sends |
| **Level 4: Webhook pause** | Webhook backlog > 1 hour | Queue all webhook events; resume when backlog clears |
| **Level 5: Read-only API** | Critical system failure | Accept no new messages; serve status queries only; display maintenance notice |

### 2.7 Bulkhead Pattern

```mermaid
flowchart TB
    subgraph TransactionalBulkhead["Transactional Bulkhead"]
        T_QUEUE[Dedicated Queue<br/>Capacity: 100K msg/s]
        T_MTA[Dedicated MTA Pool<br/>50 Workers · 100 IPs]
        T_TRACK[Priority Tracking<br/>Dedicated Pool]
    end

    subgraph MarketingBulkhead["Marketing Bulkhead"]
        M_QUEUE[Dedicated Queue<br/>Capacity: 500K msg/s]
        M_MTA[Shared MTA Pool<br/>200 Workers · 500 IPs]
        M_TRACK[Standard Tracking<br/>Shared Pool]
    end

    subgraph WebhookBulkhead["Webhook Bulkhead"]
        W_QUEUE[Event Queue<br/>Capacity: 200K evt/s]
        W_WORKERS[Webhook Workers<br/>Per-Customer Isolation]
    end

    API[API Gateway] -->|priority: transactional| T_QUEUE
    API -->|priority: marketing| M_QUEUE
    T_MTA --> W_QUEUE
    M_MTA --> W_QUEUE

    classDef transactional fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef marketing fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef webhook fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class T_QUEUE,T_MTA,T_TRACK transactional
    class M_QUEUE,M_MTA,M_TRACK marketing
    class W_QUEUE,W_WORKERS webhook
```

---

## 3. Disaster Recovery

### 3.1 Recovery Objectives

| Data Category | RPO | RTO | Strategy |
|---|---|---|---|
| **Messages in queue** | 0 (zero data loss) | < 5 minutes | Synchronous replication within region; async cross-region |
| **Suppression lists** | 0 (zero data loss) | < 2 minutes | Multi-region active-active replication |
| **Account/domain config** | < 30 seconds | < 5 minutes | Synchronous replication; automated failover |
| **Engagement events** | < 5 minutes | < 30 minutes | Async replication; data lake provides backup |
| **Analytics aggregates** | < 1 hour | < 2 hours | Recomputable from raw events |

### 3.2 Backup Strategy

| Data | Backup Frequency | Retention | Storage |
|---|---|---|---|
| Account/domain config | Continuous (WAL streaming) | 30 days point-in-time | Cross-region object storage |
| Suppression lists | Continuous replication + daily snapshot | 90 days | Multi-region key-value store |
| DKIM private keys | Stored in KMS (inherently replicated) | Key lifecycle managed | Key management service |
| Queue state | WAL-based with continuous checkpointing | Until message delivered or expired | Local SSD + replicated WAL |
| Analytics data | Daily incremental + weekly full | 1 year full, 3 years aggregated | Data lake in object storage |

### 3.3 Multi-Region Deployment

| Region | Role | Components | IP Pool |
|---|---|---|---|
| US-East | Primary (ingestion + delivery) | Full stack: API, Queue, MTA, Analytics | 200 IPs |
| US-West | Secondary (warm standby + delivery) | Full stack (standby) + active MTA fleet | 150 IPs |
| EU-West | Active (delivery + GDPR processing) | MTA fleet + regional analytics + data residency | 100 IPs |
| AP-South | Active (delivery) | MTA fleet + tracking PoP | 50 IPs |

### 3.4 Chaos Engineering

| Test | Frequency | What It Validates |
|---|---|---|
| Kill random MTA worker | Daily | Queue redistribution and message recovery |
| Block ISP connectivity | Weekly | Circuit breaker activation and queue backpressure |
| Suppress store failover | Weekly | Fail-closed behavior and bloom filter degraded mode |
| Primary region outage | Monthly | Full failover to secondary region |
| DNS resolver failure | Weekly | Cache fallback and resolver failover |
| DKIM KMS outage | Monthly | Local key cache fallback |

---

*Previous: [Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Next: [Security & Compliance ->](./06-security-and-compliance.md)*
