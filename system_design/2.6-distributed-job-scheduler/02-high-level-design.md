# High-Level Design

[← Back to Requirements](./01-requirements-and-estimations.md) | [Next: Low-Level Design →](./03-low-level-design.md)

---

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        API[API Gateway]
        UI[Web Dashboard]
        CLI[CLI Tool]
    end

    subgraph Scheduler["Scheduler Cluster"]
        S1[Scheduler Leader]
        S2[Scheduler Standby]
        S3[Scheduler Standby]
    end

    subgraph Coordination["Coordination Layer"]
        ZK[Coordination Service<br/>ZooKeeper/etcd]
    end

    subgraph Storage["Storage Layer"]
        DB[(Metadata Store<br/>PostgreSQL)]
        DBR[(Read Replica)]
    end

    subgraph Queue["Task Queue"]
        Q1[Queue Partition 1]
        Q2[Queue Partition 2]
        Q3[Queue Partition N]
    end

    subgraph Workers["Worker Pool"]
        W1[Worker 1]
        W2[Worker 2]
        W3[Worker N]
    end

    subgraph External["External Systems"]
        BLOB[Blob Storage<br/>Logs & Artifacts]
        NOTIFY[Notification Service]
        METRICS[Metrics System]
    end

    API --> S1
    UI --> API
    CLI --> API

    S1 <--> ZK
    S2 <--> ZK
    S3 <--> ZK

    S1 --> DB
    S1 --> Q1
    S1 --> Q2
    S1 --> Q3

    DB --> DBR

    W1 --> Q1
    W2 --> Q2
    W3 --> Q3

    W1 --> DB
    W2 --> DB
    W3 --> DB

    W1 --> BLOB
    W2 --> BLOB
    W3 --> BLOB

    S1 --> NOTIFY
    S1 --> METRICS
    W1 --> METRICS
```

---

## Component Overview

| Component | Responsibility | Technology Options |
|-----------|----------------|-------------------|
| **API Gateway** | Request routing, auth, rate limiting | NGINX, Kong, custom |
| **Scheduler Cluster** | Poll due jobs, dispatch to queue | Custom service |
| **Coordination Service** | Leader election, distributed locks | ZooKeeper, etcd, Consul |
| **Metadata Store** | Job definitions, execution history | PostgreSQL, MySQL |
| **Task Queue** | Buffer tasks for workers | Kafka, RabbitMQ, SQS |
| **Worker Pool** | Execute job logic | Kubernetes pods, VMs |
| **Blob Storage** | Execution logs, artifacts | Object storage |

---

## Data Flow Diagrams

### Job Submission Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Gateway
    participant S as Scheduler
    participant DB as Metadata Store

    C->>API: POST /jobs (job definition)
    API->>API: Authenticate & Validate
    API->>S: Forward request
    S->>S: Parse cron expression
    S->>S: Calculate next_run_time
    S->>DB: INSERT job record
    DB-->>S: Job ID
    S->>S: Update in-memory index
    S-->>API: Job created
    API-->>C: 201 Created {job_id}
```

### Scheduling Loop (Core Flow)

```mermaid
sequenceDiagram
    participant S as Scheduler Leader
    participant DB as Metadata Store
    participant Q as Task Queue
    participant W as Worker

    loop Every 1 second
        S->>DB: SELECT jobs WHERE next_run_time <= NOW()
        DB-->>S: Due jobs list

        loop For each due job
            S->>DB: UPDATE job SET status='DISPATCHED'
            S->>DB: INSERT execution record
            S->>Q: Enqueue task message
            Q-->>S: Ack
            S->>DB: UPDATE job SET next_run_time = calculate_next()
        end
    end

    W->>Q: Poll for tasks
    Q-->>W: Task message
    W->>DB: UPDATE execution SET status='RUNNING'
    W->>W: Execute job logic
    W->>DB: UPDATE execution SET status='COMPLETED'
    W->>Q: Ack message
```

### DAG Workflow Execution

```mermaid
sequenceDiagram
    participant S as Scheduler
    participant DE as DAG Executor
    participant DB as Metadata Store
    participant Q as Task Queue
    participant W as Worker

    S->>DE: Trigger DAG workflow
    DE->>DB: Load DAG definition
    DE->>DE: Topological sort tasks
    DE->>DE: Identify ready tasks (no dependencies)

    par Execute parallel tasks
        DE->>Q: Enqueue Task A
        DE->>Q: Enqueue Task B
    end

    W->>Q: Poll Task A
    W->>W: Execute Task A
    W->>DB: Mark Task A complete

    W->>Q: Poll Task B
    W->>W: Execute Task B
    W->>DB: Mark Task B complete

    DE->>DB: Check dependencies for Task C
    Note over DE: Task C depends on A and B
    DE->>DE: A done, B done → C ready
    DE->>Q: Enqueue Task C

    W->>Q: Poll Task C
    W->>W: Execute Task C
    W->>DB: Mark Task C complete
    DE->>DB: Mark DAG complete
```

### Failure Recovery Flow

```mermaid
sequenceDiagram
    participant S1 as Scheduler Leader
    participant S2 as Scheduler Standby
    participant ZK as Coordination Service
    participant DB as Metadata Store

    Note over S1: Leader crashes
    S1--xZK: Heartbeat stops

    ZK->>ZK: Detect leader failure (timeout)
    ZK->>S2: Leadership acquired

    S2->>S2: Transition to leader mode
    S2->>DB: Query incomplete executions
    DB-->>S2: In-progress jobs list

    loop For each incomplete execution
        S2->>S2: Check worker heartbeat
        alt Worker alive
            S2->>S2: Wait for completion
        else Worker dead
            S2->>DB: Mark execution FAILED
            S2->>S2: Schedule retry (if attempts remain)
        end
    end

    S2->>S2: Resume normal scheduling loop
```

---

## Key Design Decisions

### Decision 1: Leader-Based vs Active-Active Scheduling

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| **Leader-Based** | Single scheduler processes all jobs | No duplicate executions, simpler | Failover delay |
| **Active-Active** | Multiple schedulers with partitioning | Higher availability, scales | Complex deduplication |

**Decision:** Leader-based with fast failover

**Rationale:**
- Simpler to ensure exactly-once dispatch
- ZooKeeper/etcd provides sub-second failover
- Can scale reads via replicas
- Most production systems (Airflow, Cadence) use this pattern

### Decision 2: Pull-Based vs Push-Based Task Distribution

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| **Pull-Based** | Workers poll queue for tasks | Natural backpressure, worker autonomy | Polling overhead |
| **Push-Based** | Scheduler assigns to workers directly | Lower latency, better balancing | Requires health tracking |

**Decision:** Pull-based with long polling

**Rationale:**
- Workers control their own capacity
- Queue provides natural buffering
- No need for scheduler to track worker state
- Easier to add/remove workers dynamically

### Decision 3: Job Storage - Database vs Message Queue

| Approach | Pros | Cons |
|----------|------|------|
| **Database Primary** | Queryable, durable, consistent | Polling overhead for scheduling |
| **Queue Primary** | Low latency dispatch | Hard to query, less durable |
| **Hybrid** | Best of both | More components to manage |

**Decision:** Hybrid - Database for persistence, Queue for dispatch

**Rationale:**
- Database provides durability and queryability for job definitions
- Queue provides efficient task distribution to workers
- Clear separation of concerns
- Standard pattern in Airflow, Temporal, Cadence

### Decision 4: Execution Guarantee

| Guarantee | Implementation Complexity | Use Case |
|-----------|--------------------------|----------|
| **At-Most-Once** | Low | Notifications, best-effort |
| **At-Least-Once** | Medium | Most batch jobs |
| **Exactly-Once** | Very High | Financial transactions |

**Decision:** At-least-once with idempotency support

**Rationale:**
- Exactly-once requires distributed transactions (complex, slow)
- At-least-once is achievable with retries
- Jobs should be designed idempotent anyway
- Industry standard (Airflow, Temporal, Cadence)

---

## Component Details

### Scheduler Service

```
Responsibilities:
├── Poll metadata store for due jobs
├── Dispatch jobs to task queue
├── Calculate next run times
├── Handle DAG dependency resolution
├── Manage job lifecycle state machine
└── Participate in leader election

High Availability:
├── Multiple instances in cluster
├── Only leader processes jobs
├── Standby instances ready for failover
└── Heartbeat to coordination service
```

### Task Queue

```
Responsibilities:
├── Buffer tasks between scheduler and workers
├── Provide at-least-once delivery
├── Support multiple partitions for parallelism
├── Handle message acknowledgment
└── Dead-letter queue for failed messages

Partitioning Strategy:
├── By job_id hash (even distribution)
├── By tenant_id (isolation)
└── By priority (separate queues)
```

### Worker Pool

```
Responsibilities:
├── Poll task queue for work
├── Execute job logic in isolation
├── Report progress and completion
├── Handle graceful shutdown
└── Support concurrent job execution

Scaling Strategy:
├── Horizontal scaling based on queue depth
├── Auto-scaling during peak periods
├── Spot/preemptible instances for cost
└── Reserved capacity for critical jobs
```

### Metadata Store

```
Responsibilities:
├── Store job definitions
├── Track execution history
├── Maintain scheduling indexes
├── Support transactional updates
└── Provide query interface

Schema Highlights:
├── jobs (definition, schedule, config)
├── executions (run history, status)
├── dags (workflow definitions)
└── dag_tasks (task definitions within DAGs)
```

---

## Architecture Patterns

### Polling Window Pattern

To handle scheduler restarts and ensure no jobs are missed:

```
Polling Window: [NOW - buffer, NOW + lookahead]

Example with 60s buffer, 5s lookahead:
• NOW = 10:00:00
• Query: next_run_time BETWEEN 09:59:00 AND 10:00:05

Benefits:
• Catches jobs missed during brief outages
• Compensates for clock skew
• Requires idempotent execution (jobs may dispatch twice)
```

### Optimistic Locking for Job State

```
Prevent concurrent updates to same job:

UPDATE jobs
SET status = 'DISPATCHED',
    version = version + 1
WHERE job_id = ?
  AND version = ?
  AND status = 'SCHEDULED'

If rows_affected = 0:
    Another scheduler already processed this job
    Skip (deduplication)
```

### Circuit Breaker for Downstream Failures

```
When workers consistently fail:
1. CLOSED: Normal operation, jobs execute
2. OPEN: Stop dispatching jobs (downstream unhealthy)
3. HALF-OPEN: Try single job to test recovery

Prevents cascading failures when external systems are down.
```

---

## Integration Points

| Integration | Purpose | Protocol |
|-------------|---------|----------|
| **Notification Service** | Alert on job completion/failure | Webhook, Email, Slack |
| **Metrics System** | Publish execution metrics | Push (StatsD, Prometheus) |
| **Secret Manager** | Fetch job credentials | API call |
| **Blob Storage** | Store execution logs | Object storage API |
| **External APIs** | Job execution targets | HTTP, gRPC |

---

## Technology Stack Summary

| Layer | Component | Recommended Technology |
|-------|-----------|----------------------|
| **API** | Gateway | Load balancer + custom service |
| **Compute** | Scheduler | Stateless containers |
| **Compute** | Workers | Kubernetes pods / VMs |
| **Coordination** | Leader election | ZooKeeper or etcd |
| **Storage** | Metadata | PostgreSQL (with read replicas) |
| **Queue** | Task dispatch | Kafka or RabbitMQ |
| **Storage** | Logs | Object storage |
| **Observability** | Metrics | Prometheus + Grafana |

---

## High-Level Design Checklist

Before moving to low-level design, ensure:

- [ ] Clear component responsibilities defined
- [ ] Data flow for all major operations documented
- [ ] Key design decisions made with rationale
- [ ] Integration points identified
- [ ] Failure scenarios considered at high level
- [ ] Technology choices aligned with requirements

---

**Next:** [Low-Level Design →](./03-low-level-design.md)
