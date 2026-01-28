# Scalability & Reliability

## Scalability Strategy

### Horizontal Scaling Architecture

```mermaid
flowchart TB
    subgraph Global["Global Layer"]
        DNS["GeoDNS"]
        GLB["Global Load<br/>Balancer"]
    end

    subgraph Region1["Region: US-East"]
        LB1["Regional LB"]
        subgraph K8s1["Kubernetes Cluster"]
            GW1["Gateway<br/>(5-20 pods)"]
            CHAT1["Chat Service<br/>(10-50 pods)"]
            VOICE1["Voice Service<br/>(10-30 pods)"]
            AI1["AI Service<br/>(5-20 pods)"]
        end
        REDIS1[("Redis<br/>Cluster")]
        PG1[("PostgreSQL<br/>Primary")]
    end

    subgraph Region2["Region: EU-West"]
        LB2["Regional LB"]
        subgraph K8s2["Kubernetes Cluster"]
            GW2["Gateway<br/>(5-20 pods)"]
            CHAT2["Chat Service<br/>(10-50 pods)"]
            VOICE2["Voice Service<br/>(10-30 pods)"]
            AI2["AI Service<br/>(5-20 pods)"]
        end
        REDIS2[("Redis<br/>Cluster")]
        PG2[("PostgreSQL<br/>Replica")]
    end

    DNS --> GLB
    GLB --> LB1
    GLB --> LB2

    LB1 --> K8s1
    K8s1 --> REDIS1
    K8s1 --> PG1

    LB2 --> K8s2
    K8s2 --> REDIS2
    K8s2 --> PG2

    PG1 -.->|"Async<br/>Replication"| PG2
    REDIS1 -.->|"Cross-Region<br/>Sync"| REDIS2

    classDef global fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef region fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class DNS,GLB global
    class LB1,GW1,CHAT1,VOICE1,AI1,LB2,GW2,CHAT2,VOICE2,AI2 region
    class REDIS1,PG1,REDIS2,PG2 data
```

### Service Scaling Characteristics

| Service | Scaling Trigger | Min Pods | Max Pods | Scale Speed |
|---------|-----------------|----------|----------|-------------|
| **Gateway** | CPU > 70%, QPS | 5 | 50 | Fast (30s) |
| **Chat Service** | Active sessions | 10 | 100 | Medium (60s) |
| **Voice Service** | Concurrent calls | 10 | 50 | Fast (30s) |
| **AI Service** | Queue depth, latency | 5 | 30 | Slow (120s) |
| **HITL Service** | Queue size | 3 | 20 | Medium (60s) |
| **Embedding Service** | Queue depth | 3 | 15 | Slow (120s) |

### Auto-Scaling Configuration

```yaml
# Horizontal Pod Autoscaler for Chat Service
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: chat-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: chat-service
  minReplicas: 10
  maxReplicas: 100
  metrics:
    # Scale on active WebSocket connections
    - type: Pods
      pods:
        metric:
          name: active_sessions
        target:
          type: AverageValue
          averageValue: "100"  # 100 sessions per pod
    # Scale on CPU
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    # Scale on memory
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

### Database Scaling Strategy

```mermaid
flowchart TB
    subgraph Writes["Write Path"]
        WRITE["Write Request"]
        PRIMARY["PostgreSQL<br/>Primary"]
    end

    subgraph Reads["Read Path"]
        READ["Read Request"]
        ROUTER["Read Router"]
        REPLICA1["Replica 1<br/>(Same Region)"]
        REPLICA2["Replica 2<br/>(Cross Region)"]
        REPLICA3["Replica 3<br/>(Analytics)"]
    end

    subgraph Cache["Caching Layer"]
        CACHE_CHECK{"Cache<br/>Hit?"}
        REDIS["Redis Cache"]
    end

    WRITE --> PRIMARY
    PRIMARY -->|"Streaming<br/>Replication"| REPLICA1
    PRIMARY -->|"Async<br/>Replication"| REPLICA2
    PRIMARY -->|"Logical<br/>Replication"| REPLICA3

    READ --> CACHE_CHECK
    CACHE_CHECK -->|"Yes"| REDIS
    CACHE_CHECK -->|"No"| ROUTER
    ROUTER -->|"Recent data"| REPLICA1
    ROUTER -->|"Geographic"| REPLICA2

    classDef write fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    classDef read fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    classDef cache fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class WRITE,PRIMARY write
    class READ,ROUTER,REPLICA1,REPLICA2,REPLICA3 read
    class CACHE_CHECK,REDIS cache
```

**Read Scaling:**
- 3+ read replicas for read-heavy workloads
- Geographic replicas for latency reduction
- Connection pooling (PgBouncer) for connection management
- Read routing based on query type and freshness requirements

**Write Scaling:**
- Vertical scaling of primary (up to 64 vCPUs, 256GB RAM)
- Sharding by tenant_id for multi-tenant deployments
- Write batching for high-throughput events
- Async writes for non-critical data (analytics, logs)

### Caching Strategy

| Cache Layer | Technology | TTL | Use Case |
|-------------|------------|-----|----------|
| **L1: Pod Memory** | In-process | 60s | Hot session state |
| **L2: Redis Local** | Redis Cluster | 5m | Session state, rate limits |
| **L3: Redis Global** | Redis with replication | 30m | Customer profiles, knowledge |
| **L4: CDN** | CloudFlare/Fastly | 24h | Static assets, widget code |

```yaml
# Cache Configuration
cache_config:
  session_state:
    l1_enabled: true
    l1_ttl: 60
    l2_enabled: true
    l2_ttl: 1800  # 30 minutes
    write_through: true

  customer_profile:
    l1_enabled: false
    l2_enabled: true
    l2_ttl: 300  # 5 minutes
    invalidation: "event_based"

  knowledge_base:
    l1_enabled: false
    l2_enabled: true
    l2_ttl: 3600  # 1 hour
    warming: "scheduled"

  llm_responses:
    l1_enabled: false
    l2_enabled: true
    l2_ttl: 86400  # 24 hours
    key_strategy: "content_hash"
```

### Message Queue Scaling

```mermaid
flowchart LR
    subgraph Producers["Producers"]
        P1["Chat Service"]
        P2["Voice Service"]
        P3["API Gateway"]
    end

    subgraph Kafka["Kafka Cluster"]
        subgraph Topic1["conversation-events"]
            PART1["Partition 0"]
            PART2["Partition 1"]
            PART3["Partition 2"]
            PARTN["Partition N"]
        end
    end

    subgraph Consumers["Consumer Groups"]
        subgraph CG1["AI Processing"]
            C1["Consumer 1"]
            C2["Consumer 2"]
            CN["Consumer N"]
        end
        subgraph CG2["Analytics"]
            A1["Analytics 1"]
            A2["Analytics 2"]
        end
    end

    P1 --> PART1
    P1 --> PART2
    P2 --> PART2
    P2 --> PART3
    P3 --> PARTN

    PART1 --> C1
    PART2 --> C2
    PART3 --> CN

    PART1 --> A1
    PART2 --> A1
    PART3 --> A2
    PARTN --> A2
```

**Kafka Configuration:**
```yaml
# Topic: conversation-events
partitions: 24  # Scale with consumers
replication_factor: 3
min_insync_replicas: 2

# Partition key: conversation_id
# Ensures message ordering per conversation

# Consumer group: ai-processing
consumers: 12  # Match partitions / 2
auto_offset_reset: latest
enable_auto_commit: false  # Manual commit for exactly-once

# Consumer group: analytics
consumers: 4
auto_offset_reset: earliest
```

---

## Reliability & Fault Tolerance

### Single Points of Failure (SPOF) Analysis

| Component | SPOF Risk | Mitigation | Recovery Time |
|-----------|-----------|------------|---------------|
| **API Gateway** | Medium | Multi-pod, multi-AZ | < 30s (failover) |
| **Database Primary** | High | Streaming replication + auto-failover | < 60s |
| **Redis Cluster** | Medium | Cluster mode, multi-AZ | < 30s |
| **Kafka** | Medium | Multi-broker, replication | < 60s |
| **LLM API** | High | Multi-provider fallback | < 5s (fallback) |
| **Voice Gateway** | Medium | Multiple SIP trunks | < 30s |
| **DNS** | Low | Multiple providers | < 5min (propagation) |

### LLM Provider Failover

```mermaid
flowchart TD
    REQ["LLM Request"] --> ROUTER["LLM Router"]

    ROUTER --> CHECK1{"Primary<br/>Healthy?"}
    CHECK1 -->|"Yes"| PRIMARY["OpenAI GPT-4"]
    CHECK1 -->|"No"| CHECK2

    CHECK2{"Secondary<br/>Healthy?"}
    CHECK2 -->|"Yes"| SECONDARY["Anthropic Claude"]
    CHECK2 -->|"No"| CHECK3

    CHECK3{"Tertiary<br/>Healthy?"}
    CHECK3 -->|"Yes"| TERTIARY["Google Gemini"]
    CHECK3 -->|"No"| FALLBACK["Cached Response<br/>+ Escalation"]

    PRIMARY --> RESP["Response"]
    SECONDARY --> RESP
    TERTIARY --> RESP
    FALLBACK --> RESP

    subgraph HealthCheck["Health Monitoring"]
        HC["Health Checker<br/>(every 10s)"]
        HC --> PRIMARY
        HC --> SECONDARY
        HC --> TERTIARY
    end
```

**Failover Logic:**
```
ALGORITHM: LLM Request with Failover
INPUT: prompt, model_preference
OUTPUT: response

providers = [
  {name: "openai", model: "gpt-4", weight: 0.7, healthy: true},
  {name: "anthropic", model: "claude-3", weight: 0.2, healthy: true},
  {name: "google", model: "gemini-pro", weight: 0.1, healthy: true}
]

1. SELECT primary provider based on weight + health
2. TRY request with timeout (5s for intent, 30s for generation)
3. IF success: RETURN response
4. IF failure (timeout, rate limit, error):
   - Mark provider unhealthy (30s cooldown)
   - SELECT next healthy provider
   - RETRY
5. IF all providers fail:
   - Check response cache
   - IF cache hit: RETURN cached response
   - ELSE: Escalate to human with apology message

Health Recovery:
- Probe unhealthy providers every 10s
- 3 consecutive successes → mark healthy
- Circuit breaker: Open after 5 failures in 60s
```

### Circuit Breaker Pattern

```mermaid
stateDiagram-v2
    [*] --> Closed: Initial State

    Closed --> Open: Failure threshold<br/>exceeded (5 in 60s)
    Closed --> Closed: Success

    Open --> HalfOpen: Timeout (30s)

    HalfOpen --> Closed: Probe succeeds<br/>(3 consecutive)
    HalfOpen --> Open: Probe fails

    note right of Closed: All requests pass through
    note right of Open: All requests fail fast
    note right of HalfOpen: Limited requests for testing
```

**Implementation:**
```yaml
circuit_breaker:
  crm_service:
    failure_threshold: 5
    failure_window_seconds: 60
    open_timeout_seconds: 30
    half_open_max_requests: 3
    success_threshold: 3

  llm_service:
    failure_threshold: 3
    failure_window_seconds: 30
    open_timeout_seconds: 15
    half_open_max_requests: 2
    success_threshold: 2

  payment_service:
    failure_threshold: 2
    failure_window_seconds: 60
    open_timeout_seconds: 60
    half_open_max_requests: 1
    success_threshold: 3
```

### Retry Strategy

| Service | Max Retries | Backoff | Timeout | Idempotent |
|---------|-------------|---------|---------|------------|
| **LLM API** | 3 | Exponential (1s, 2s, 4s) | 30s | Yes |
| **CRM Read** | 2 | Linear (500ms) | 5s | Yes |
| **CRM Write** | 1 | None | 10s | No (idempotency key) |
| **Payment** | 0 | None | 30s | No (manual retry) |
| **Knowledge Retrieval** | 2 | Linear (200ms) | 3s | Yes |
| **Email Send** | 3 | Exponential (1s, 5s, 30s) | 60s | Yes (dedup key) |

### Graceful Degradation

```mermaid
flowchart TD
    FULL["Full Service<br/>100%"] --> DEG1{"LLM<br/>Degraded?"}

    DEG1 -->|"Yes"| SIMPLE["Simplified Responses<br/>(templates + rules)"]
    DEG1 -->|"No"| CHECK2

    CHECK2{"Knowledge<br/>Degraded?"}
    CHECK2 -->|"Yes"| NORAG["No RAG<br/>(base knowledge only)"]
    CHECK2 -->|"No"| CHECK3

    CHECK3{"Backend<br/>Degraded?"}
    CHECK3 -->|"Yes"| READONLY["Read-Only Mode<br/>(no actions)"]
    CHECK3 -->|"No"| CHECK4

    CHECK4{"Human Agents<br/>Unavailable?"}
    CHECK4 -->|"Yes"| CALLBACK["Callback Queue<br/>(promise to call back)"]
    CHECK4 -->|"No"| FULL

    SIMPLE --> ESCALATE["Faster Human<br/>Escalation"]
    NORAG --> ESCALATE
    READONLY --> ESCALATE
    CALLBACK --> QUEUE["Queue for<br/>Later Resolution"]
```

**Degradation Levels:**

| Level | Trigger | Behavior | User Impact |
|-------|---------|----------|-------------|
| **L0: Normal** | All systems healthy | Full autonomous capability | None |
| **L1: LLM Degraded** | LLM latency > 5s or errors | Template responses, faster escalation | Slower, less natural |
| **L2: Knowledge Degraded** | Vector DB down | Base knowledge only, no RAG | Less accurate answers |
| **L3: Backend Degraded** | CRM/ERP errors | Read-only, no actions | Information only |
| **L4: Partial Outage** | Multiple systems down | Human-only mode | Long wait times |
| **L5: Full Outage** | Platform down | Callback queue | Service unavailable |

---

## Disaster Recovery

### Recovery Objectives

| Scenario | RTO | RPO | Strategy |
|----------|-----|-----|----------|
| **Single Pod Failure** | < 30s | 0 | Kubernetes self-healing |
| **Single AZ Failure** | < 2min | 0 | Multi-AZ deployment |
| **Database Failure** | < 5min | < 1min | Streaming replication + failover |
| **Region Failure** | < 15min | < 5min | Cross-region failover |
| **Complete Outage** | < 1hr | < 15min | DR site activation |

### Multi-Region Architecture

```mermaid
flowchart TB
    subgraph Global["Global Traffic Management"]
        GDNS["GeoDNS<br/>(Route 53 / CloudFlare)"]
        GLB["Global Load Balancer"]
    end

    subgraph Primary["Primary Region (US-East)"]
        P_LB["Load Balancer"]
        P_APP["Application<br/>Cluster"]
        P_DB[("PostgreSQL<br/>Primary")]
        P_REDIS[("Redis<br/>Primary")]
    end

    subgraph Secondary["Secondary Region (EU-West)"]
        S_LB["Load Balancer"]
        S_APP["Application<br/>Cluster"]
        S_DB[("PostgreSQL<br/>Replica")]
        S_REDIS[("Redis<br/>Replica")]
    end

    subgraph DR["DR Region (US-West)"]
        DR_LB["Load Balancer<br/>(Standby)"]
        DR_APP["Application<br/>(Cold Standby)"]
        DR_DB[("PostgreSQL<br/>Async Replica")]
    end

    GDNS --> GLB
    GLB -->|"70%"| P_LB
    GLB -->|"30%"| S_LB
    GLB -.->|"Failover"| DR_LB

    P_DB -->|"Sync"| S_DB
    P_DB -->|"Async"| DR_DB
    P_REDIS -->|"Async"| S_REDIS

    classDef active fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    classDef standby fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef dr fill:#ffcdd2,stroke:#c62828,stroke-width:2px

    class P_LB,P_APP,P_DB,P_REDIS,S_LB,S_APP,S_DB,S_REDIS active
    class DR_LB,DR_APP,DR_DB dr
```

### Failover Procedure

```
RUNBOOK: Regional Failover

TRIGGER: Primary region unavailable for > 5 minutes

PRE-CHECKS:
1. Verify primary region is truly unavailable (not false alarm)
2. Check secondary region health
3. Verify database replica lag (must be < 30s)
4. Notify on-call team

EXECUTION:
1. Update GeoDNS to route 100% traffic to secondary
   - DNS TTL is 60s, propagation takes ~5 minutes

2. Promote secondary database to primary
   - Run: pg_ctl promote -D /var/lib/postgresql/data
   - Verify write capability

3. Update application config to use new primary
   - Deploy config change via Kubernetes ConfigMap

4. Scale secondary region to handle full load
   - Increase pod counts to match primary region sizing

5. Notify customers of potential brief service degradation

POST-FAILOVER:
1. Monitor secondary region metrics closely
2. Begin investigation of primary region failure
3. Plan failback procedure once primary is recovered

FAILBACK (when primary recovered):
1. Resync data from secondary (now primary) to original primary
2. Verify data consistency
3. Gradually shift traffic back (10% → 50% → 100%)
4. Demote secondary back to replica role
```

### Backup Strategy

| Data Type | Frequency | Retention | Storage |
|-----------|-----------|-----------|---------|
| **Database (full)** | Daily | 30 days | Cross-region object storage |
| **Database (incremental)** | Hourly | 7 days | Same region object storage |
| **Database (WAL)** | Continuous | 7 days | Streaming to archive |
| **Redis (RDB)** | Hourly | 3 days | Object storage |
| **Conversation Exports** | Real-time | 7 years | Cold storage (compliance) |
| **Model Artifacts** | On change | Forever | Versioned object storage |
| **Configuration** | On change | Forever | Git repository |

### Data Integrity Checks

```yaml
integrity_checks:
  daily:
    - name: "conversation_count_match"
      query: |
        SELECT COUNT(*) FROM conversations
        WHERE DATE(created_at) = CURRENT_DATE - 1
      compare_with: "analytics.daily_conversations"

    - name: "message_sequence_gaps"
      query: |
        SELECT conversation_id, MAX(sequence_number) - COUNT(*) as gaps
        FROM messages
        GROUP BY conversation_id
        HAVING MAX(sequence_number) - COUNT(*) > 0

    - name: "orphaned_messages"
      query: |
        SELECT COUNT(*) FROM messages m
        LEFT JOIN conversations c ON m.conversation_id = c.conversation_id
        WHERE c.conversation_id IS NULL

  weekly:
    - name: "action_result_consistency"
      description: "Verify all actions have logged results"

    - name: "customer_profile_sync"
      description: "Verify customer data matches CRM"

alerts:
  - condition: "any check fails"
    severity: "warning"
    channel: "#data-integrity"

  - condition: "orphaned_messages > 0"
    severity: "critical"
    channel: "#on-call"
```
