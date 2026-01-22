# Interview Guide

[← Back to Observability](./07-observability.md) | [Back to Index](./00-index.md)

---

## 45-Minute Interview Pacing

| Phase | Time | Focus | Deliverables |
|-------|------|-------|--------------|
| **Clarify** | 5 min | Requirements gathering | Scope, scale, constraints |
| **High-Level** | 10 min | Architecture design | Component diagram, data flow |
| **Deep Dive** | 15 min | Critical component | Scheduling algorithm, failure handling |
| **Scale & Reliability** | 10 min | Production concerns | Scaling strategy, fault tolerance |
| **Wrap-up** | 5 min | Trade-offs, questions | Summary, alternatives |

---

## Phase 1: Clarifying Questions (5 minutes)

### Essential Questions to Ask

| Question | Why It Matters | Expected Answer Range |
|----------|---------------|----------------------|
| "What scale of jobs are we supporting?" | Determines architecture complexity | 1K-10M+ scheduled jobs |
| "What types of jobs?" | Cron vs DAG vs event-triggered | Usually cron + some DAGs |
| "What's the execution guarantee?" | At-least-once vs exactly-once | Usually at-least-once |
| "Multi-tenant or single tenant?" | Isolation requirements | Often multi-tenant |
| "What's the typical job duration?" | Worker design, checkpointing | Seconds to hours |
| "What happens on failure?" | Retry strategy | Retry with backoff |

### Sample Dialogue

```
You: "Before I dive in, I'd like to clarify a few things. First, what scale
     are we designing for—thousands or millions of scheduled jobs?"

Interviewer: "Let's say millions of jobs, with thousands executing concurrently."

You: "Got it. And are these primarily cron-style recurring jobs, or do we need
     to support complex workflows with dependencies between tasks?"

Interviewer: "Mostly cron jobs, but we should support basic DAG workflows."

You: "For execution guarantees, is at-least-once acceptable if jobs are
     designed to be idempotent, or do we need exactly-once semantics?"

Interviewer: "At-least-once is fine."

You: "Perfect. Let me also confirm—is this multi-tenant, where different
     customers have isolated job namespaces?"

Interviewer: "Yes, multi-tenant with tenant isolation."
```

---

## Phase 2: High-Level Design (10 minutes)

### Quick Architecture Sketch

```
┌─────────────────────────────────────────────────────────────────┐
│                     DISTRIBUTED JOB SCHEDULER                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────┐         ┌──────────────────┐                     │
│   │ Clients │────────▶│   API Gateway    │                     │
│   └─────────┘         └────────┬─────────┘                     │
│                                │                                │
│                                ▼                                │
│                     ┌──────────────────┐                       │
│                     │ Scheduler Cluster │◀──── ZooKeeper        │
│                     │  (Leader-based)   │      (Leader Election)│
│                     └────────┬─────────┘                       │
│                              │                                  │
│              ┌───────────────┼───────────────┐                 │
│              │               │               │                  │
│              ▼               ▼               ▼                  │
│         ┌────────┐     ┌────────┐     ┌────────┐              │
│         │ Queue  │     │ Queue  │     │ Queue  │              │
│         │ Part 1 │     │ Part 2 │     │ Part N │              │
│         └───┬────┘     └───┬────┘     └───┬────┘              │
│             │              │              │                    │
│             ▼              ▼              ▼                    │
│         ┌────────┐     ┌────────┐     ┌────────┐              │
│         │Worker  │     │Worker  │     │Worker  │              │
│         │Pool A  │     │Pool B  │     │Pool C  │              │
│         └────────┘     └────────┘     └────────┘              │
│                                                                 │
│   ┌──────────────────────────────────────────────────────┐    │
│   │              Metadata Store (PostgreSQL)              │    │
│   │  Jobs | Executions | DAGs | Task Dependencies         │    │
│   └──────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Points to Mention

1. **Scheduler Cluster:** Leader-based for simplicity, ZooKeeper for election
2. **Task Queue:** Decouples scheduler from workers, provides buffering
3. **Worker Pool:** Horizontally scalable, pull-based consumption
4. **Metadata Store:** Source of truth for jobs and execution history

### Data Flow to Explain

```
Job Submission:
Client → API → Scheduler → DB (store job, calculate next_run_time)

Job Execution:
Scheduler polls DB → Dispatches to Queue → Worker pulls → Executes → Updates DB
```

---

## Phase 3: Deep Dive (15 minutes)

The interviewer will likely ask you to deep dive into one of these areas:

### Deep Dive Option A: Scheduling Algorithm

**What to cover:**

1. **Polling Loop Design**
   - Scheduler polls DB every 1 second
   - Query: `WHERE next_run_time <= NOW() AND status = 'ACTIVE'`
   - Use `FOR UPDATE SKIP LOCKED` to prevent duplicates

2. **Deduplication Strategy**
   - Optimistic locking with version field
   - Queue-level deduplication by execution_id
   - Idempotent job design as final safety

3. **Next Run Time Calculation**
   - Parse cron expression into schedule
   - Calculate next match after current time
   - Handle timezone and DST edge cases

**Sample explanation:**
```
"The scheduler uses a polling loop that runs every second. It queries for jobs
where next_run_time is in the past and status is ACTIVE. To prevent duplicate
dispatch when using a safety buffer, I use FOR UPDATE SKIP LOCKED—this lets
other transactions skip rows that are already being processed.

For the next run time, I parse the cron expression into a schedule object,
then iterate forward from the current time until I find a match. DST handling
is tricky—I recommend storing schedules in UTC internally to avoid ambiguity
during spring-forward and fall-back transitions."
```

### Deep Dive Option B: Failure Handling

**What to cover:**

1. **Scheduler Failure**
   - Leader election with ZooKeeper ephemeral nodes
   - Failover time < 10 seconds
   - New leader recovers in-flight executions

2. **Worker Failure**
   - Heartbeat monitoring
   - Tasks reassigned after timeout
   - Checkpointing for long-running jobs

3. **Execution Failure**
   - Retry with exponential backoff
   - Circuit breaker for downstream failures
   - Dead letter queue for poison messages

**Sample explanation:**
```
"For scheduler failures, I use ZooKeeper's ephemeral sequential nodes for
leader election. Each scheduler creates an ephemeral node and watches the
one before it. If the leader dies, its ephemeral node is deleted, and the
next scheduler becomes leader—typically within 10 seconds.

For worker failures, each worker sends heartbeats. If a worker misses three
heartbeats, we mark its executions as failed and schedule retries. For long
jobs, workers checkpoint progress periodically so we can resume from the
last checkpoint instead of starting over.

For job failures, I implement exponential backoff—first retry after 1 minute,
then 2, 4, 8, up to a maximum. If a job repeatedly fails, it goes to a dead
letter queue for manual investigation."
```

### Deep Dive Option C: DAG Execution

**What to cover:**

1. **Dependency Graph**
   - Store tasks and dependencies in DB
   - Topological sort to determine execution order
   - Track in-degree for ready task detection

2. **Parallel Execution**
   - Tasks with no pending dependencies run in parallel
   - As tasks complete, unblock dependent tasks
   - Dispatch newly ready tasks immediately

3. **Partial Failure Handling**
   - Options: fail-fast, fail-downstream, continue
   - Retry individual tasks without rerunning entire DAG
   - Allow manual intervention for stuck DAGs

---

## Phase 4: Scale & Reliability (10 minutes)

### Scaling Discussion Points

| Component | Scaling Strategy | Trigger |
|-----------|-----------------|---------|
| Schedulers | Partition by tenant/job hash | > 5M jobs |
| Workers | Auto-scale on queue depth | Queue > 1000 |
| Database | Read replicas + sharding | Query latency |
| Queue | Add partitions | Throughput limit |

### Reliability Discussion Points

| Failure Mode | Mitigation | Recovery Time |
|--------------|------------|---------------|
| Scheduler crash | Leader election | < 10s |
| Worker crash | Heartbeat + reassignment | < 60s |
| Database failure | Replica promotion | < 30s |
| Queue failure | Multi-broker replication | < 10s |
| Region failure | Cross-region failover | < 5 min |

### Sample Scaling Response

```
"To scale the scheduler, I'd partition jobs by tenant ID hash. Each scheduler
instance handles a subset of tenants. This lets us scale horizontally as we
add more tenants. For workers, I'd use auto-scaling based on queue depth—when
the queue exceeds 1000 messages for 5 minutes, we spin up more workers.

For the database, I'd start with read replicas for status queries and
analytics, keeping writes on the primary. If write throughput becomes a
bottleneck, I'd shard by tenant ID—each tenant's jobs live on one shard.

For reliability, the key is no single point of failure. ZooKeeper gives us
automatic scheduler failover. Workers are stateless, so we can lose any
worker and the job gets reassigned. The database uses synchronous replication
to a standby that can be promoted instantly."
```

---

## Common Trade-offs to Discuss

### Trade-off 1: Leader-Based vs Active-Active Scheduling

| Approach | Pros | Cons | When to Choose |
|----------|------|------|----------------|
| Leader-Based | Simple, no duplicate dispatch | Failover delay | < 10M jobs |
| Active-Active | Higher availability | Complex deduplication | > 10M jobs, strict availability |

**Your position:** "I'd start with leader-based for simplicity. The failover
delay of < 10 seconds is acceptable for most use cases. If we need higher
availability, we can add scheduler partitioning later."

### Trade-off 2: Push vs Pull Task Distribution

| Approach | Pros | Cons | When to Choose |
|----------|------|------|----------------|
| Push | Lower latency | Requires health tracking | Latency-critical |
| Pull | Natural backpressure | Polling overhead | Variable load |

**Your position:** "Pull-based with long polling is my preference. Workers
control their own capacity, and the queue provides natural buffering. If we
need lower latency for specific jobs, we can add a separate push-based path."

### Trade-off 3: Database vs Queue for Job Storage

| Approach | Pros | Cons | When to Choose |
|----------|------|------|----------------|
| Database | Queryable, durable | Polling overhead | Need rich queries |
| Queue | Low latency | Hard to query | Simple dispatch |
| Hybrid | Best of both | More components | Production systems |

**Your position:** "I'd use a hybrid approach. The database is the source of
truth for job definitions—it's queryable and durable. The queue is for task
dispatch—it's optimized for high-throughput, low-latency delivery. This
separation of concerns is the standard pattern in systems like Airflow."

---

## Trap Questions & Strong Answers

### Trap 1: "How do you guarantee exactly-once execution?"

**Bad answer:** "We can use distributed transactions."

**Strong answer:**
```
"Exactly-once execution is extremely difficult in distributed systems. Instead,
I'd implement at-least-once delivery with idempotent job design. Each execution
has a unique ID. If a job runs twice with the same execution ID, it checks if
it already completed and returns early. This gives us effectively once
semantics without the complexity of distributed transactions."
```

### Trap 2: "What if two schedulers dispatch the same job?"

**Bad answer:** "That won't happen with our design."

**Strong answer:**
```
"This is a real risk, especially during leader transitions or with a safety
buffer. I prevent it at three levels: First, database-level with optimistic
locking—only one scheduler can successfully update the job status. Second,
queue-level deduplication using the execution ID as a deduplication key.
Third, worker-level idempotency—the worker checks if the execution already
completed before running. Even if duplicates slip through, the job only
runs once effectively."
```

### Trap 3: "What about jobs scheduled during DST transitions?"

**Bad answer:** "We store times in UTC so DST doesn't matter."

**Strong answer:**
```
"Good question—DST is tricky. Storing in UTC helps but doesn't solve
everything. During spring-forward, 2:30 AM might not exist—a job scheduled
at that time would be skipped. During fall-back, 1:30 AM happens twice—the
job could run twice.

My approach: Store schedules in UTC internally. When calculating the next
run time, convert to the job's timezone, find the next match, then check
if that time actually exists. If it's in the skipped hour, advance to the
next valid time. If it's in the repeated hour, pick the first occurrence.
I'd also allow jobs to specify behavior: 'skip', 'run at nearest valid time',
or 'run twice'."
```

### Trap 4: "How do you handle a job that runs forever?"

**Bad answer:** "We set a timeout and kill it."

**Strong answer:**
```
"Long-running jobs need special handling. First, I'd require a timeout on
every job—even if it's 24 hours. Second, for legitimately long jobs, I'd
implement checkpointing. The job saves progress periodically, and if it
times out, the next execution resumes from the last checkpoint instead of
starting over.

For truly infinite loops (bugs), the timeout kills the job and it goes to
a failed state. After max retries, it goes to a dead letter queue. We'd
also monitor for jobs that consistently timeout—that's a signal the job
needs investigation."
```

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| Starting with exactly-once | Over-complicates design | Start with at-least-once + idempotency |
| Single scheduler, no failover | Single point of failure | Leader election from day one |
| Ignoring timezone handling | Subtle, hard-to-debug issues | Store UTC, handle DST explicitly |
| No job timeout | Resource leaks, stuck workers | Require timeout on every job |
| Synchronous job execution | Doesn't scale, blocks scheduler | Async via queue |
| No circuit breakers | Cascade failures | Fail fast on downstream issues |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│              DISTRIBUTED JOB SCHEDULER - INTERVIEW              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CLARIFY (5 min)                                                │
│  • Scale: How many jobs? Executions/second?                     │
│  • Types: Cron? DAG? Event-triggered?                           │
│  • Guarantee: At-least-once or exactly-once?                    │
│  • Tenancy: Single or multi-tenant?                             │
│                                                                 │
│  HIGH-LEVEL (10 min)                                            │
│  • Scheduler cluster (leader-based + ZK)                        │
│  • Task queue (decoupling + buffering)                          │
│  • Worker pool (pull-based, auto-scaled)                        │
│  • Metadata store (jobs, executions, DAGs)                      │
│                                                                 │
│  DEEP DIVE (15 min) - Pick ONE                                  │
│  • Scheduling: Polling, deduplication, cron parsing             │
│  • Failures: Leader election, retries, checkpointing            │
│  • DAG: Topological sort, parallel execution, partial failure   │
│                                                                 │
│  SCALE (10 min)                                                 │
│  • Schedulers: Partition by tenant                              │
│  • Workers: Auto-scale on queue depth                           │
│  • DB: Read replicas → sharding                                 │
│                                                                 │
│  KEY TRADE-OFFS                                                 │
│  • Leader vs Active-Active: Start simple                        │
│  • Push vs Pull: Pull for backpressure                          │
│  • DB vs Queue: Hybrid (both)                                   │
│                                                                 │
│  AVOID                                                          │
│  • Exactly-once without justification                           │
│  • Single scheduler without failover                            │
│  • Ignoring DST edge cases                                      │
│  • No job timeouts                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Follow-up Questions to Expect

| Question | Key Points in Your Answer |
|----------|---------------------------|
| "How would you handle priority jobs?" | Separate priority queues, weighted fair share |
| "What metrics would you monitor?" | Dispatch latency, queue depth, failure rate, worker utilization |
| "How do you test this system?" | Unit tests, integration tests, chaos engineering, load testing |
| "What would you build first?" | MVP: Single scheduler, basic cron, single queue |
| "How is this different from Airflow?" | Similar concepts; Airflow is DAG-focused, we're cron-focused |

---

**Back to:** [Index](./00-index.md)
