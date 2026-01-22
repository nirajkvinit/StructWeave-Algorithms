# Requirements & Estimations

[← Back to Index](./00-index.md) | [Next: High-Level Design →](./02-high-level-design.md)

---

## Functional Requirements

### Core Features

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-1 | **Schedule Jobs** | P0 | Submit one-time or recurring jobs with cron expressions |
| FR-2 | **Execute Jobs** | P0 | Run jobs on distributed workers with configurable retries |
| FR-3 | **Query Status** | P0 | Get job definition, execution history, and current state |
| FR-4 | **Cancel Jobs** | P0 | Cancel pending or running job executions |
| FR-5 | **DAG Workflows** | P1 | Define job dependencies as directed acyclic graphs |
| FR-6 | **Pause/Resume** | P1 | Temporarily disable job scheduling without deletion |
| FR-7 | **Manual Trigger** | P1 | Execute jobs on-demand outside their schedule |
| FR-8 | **Backfill** | P2 | Execute missed runs for a time range |

### Job Types

| Type | Description | Example |
|------|-------------|---------|
| **One-Time** | Single execution at specified time | Send report at 2024-01-15 09:00 UTC |
| **Recurring** | Cron-based periodic execution | Daily backup at 02:00 UTC |
| **Delayed** | Execute after specified delay | Process order 30 minutes after creation |
| **DAG Workflow** | Multi-step with dependencies | ETL: Extract → Transform → Load |
| **Event-Triggered** | Execute when event occurs | Process file when uploaded |

### Cron Expression Support

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6, Sun=0)
│ │ │ │ │
* * * * *

Examples:
• "0 9 * * 1-5"     → 9:00 AM on weekdays
• "*/15 * * * *"    → Every 15 minutes
• "0 0 1 * *"       → First day of each month at midnight
• "0 2 * * *"       → Daily at 2:00 AM
```

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Scheduling Latency** | < 1 second | Immediate jobs should start quickly |
| **Job Dispatch Latency** | < 100 ms | Time from due to queue assignment |
| **Status Query Latency** | < 50 ms (p99) | Real-time monitoring dashboards |
| **Throughput** | 100,000+ executions/second | Large-scale batch processing |

### Availability Requirements

| Metric | Target | Calculation |
|--------|--------|-------------|
| **System Availability** | 99.99% | 52.6 minutes downtime/year |
| **Scheduler Availability** | 99.999% | No missed scheduled jobs |
| **Worker Availability** | 99.9% | Individual workers can fail |
| **Data Durability** | 99.999999999% | 11 nines for job metadata |

### Reliability Requirements

| Requirement | Target | Description |
|-------------|--------|-------------|
| **Execution Guarantee** | At-least-once | Jobs run at least once; may retry |
| **No Missed Jobs** | 100% | Scheduled jobs always execute (eventually) |
| **Recovery Time** | < 30 seconds | Scheduler failover time |
| **Data Loss** | Zero | No job definitions or history lost |

### Scalability Requirements

| Dimension | Target | Growth Projection |
|-----------|--------|-------------------|
| **Total Jobs** | 10M+ scheduled jobs | 2x yearly |
| **Concurrent Executions** | 100K+ | Peak during batch windows |
| **Tenants** | 10,000+ | Multi-tenant SaaS |
| **Workers** | 10,000+ nodes | Elastic scaling |
| **Retention** | 90 days execution history | Compliance requirement |

---

## Capacity Estimations

### Traffic Assumptions

| Metric | Value | Notes |
|--------|-------|-------|
| **Total Scheduled Jobs** | 10,000,000 | Active job definitions |
| **Recurring Jobs** | 8,000,000 (80%) | Cron-based |
| **One-Time Jobs** | 2,000,000 (20%) | Future scheduled |
| **Average Frequency** | 4 executions/day | Varies by job type |
| **Peak Multiplier** | 10x | End-of-day batch processing |

### Throughput Calculations

```
Daily Executions:
• Recurring: 8M jobs × 4 executions/day = 32M executions/day
• One-time: 2M jobs × 1 execution = 2M executions/day (amortized)
• Total: ~34M executions/day

Per-Second (Average):
• 34M / 86,400 seconds = ~400 executions/second

Per-Second (Peak at 10x):
• 400 × 10 = 4,000 executions/second

Design Target (with headroom):
• 100,000 executions/second (25x peak)
```

### Storage Estimations

#### Job Definitions

```
Per Job:
• Job ID: 16 bytes (UUID)
• Name: 100 bytes (avg)
• Cron Expression: 50 bytes
• Payload/Config: 2 KB (avg)
• Metadata: 500 bytes
• Total: ~2.7 KB per job

Total Job Storage:
• 10M jobs × 2.7 KB = 27 GB

With indexes and overhead (3x):
• 27 GB × 3 = 81 GB
```

#### Execution History

```
Per Execution Record:
• Execution ID: 16 bytes
• Job ID: 16 bytes
• Status: 20 bytes
• Timestamps: 32 bytes
• Worker ID: 16 bytes
• Result/Error: 1 KB (avg)
• Logs Reference: 100 bytes
• Total: ~1.2 KB per execution

Daily Execution Storage:
• 34M executions × 1.2 KB = 40.8 GB/day

90-Day Retention:
• 40.8 GB × 90 = 3.7 TB

With indexes (2x):
• 3.7 TB × 2 = 7.4 TB
```

#### Total Storage Summary

| Component | Storage | Growth Rate |
|-----------|---------|-------------|
| Job Definitions | 81 GB | 10 GB/month |
| Execution History | 7.4 TB | 1.2 TB/month |
| Execution Logs | 20 TB | 5 TB/month |
| **Total** | **~28 TB** | **~6 TB/month** |

### Worker Capacity

```
Assumptions:
• Average job duration: 30 seconds
• Worker can run 10 concurrent jobs
• Worker throughput: 10 jobs / 30s = 0.33 jobs/second

Workers Needed (Average):
• 400 jobs/second ÷ 0.33 = 1,200 workers

Workers Needed (Peak):
• 4,000 jobs/second ÷ 0.33 = 12,000 workers

Design Target (with 50% headroom):
• 18,000 worker capacity (elastic)
```

### Bandwidth Estimations

```
Job Dispatch (Scheduler → Queue → Worker):
• Message size: 3 KB
• Peak: 4,000 messages/second
• Bandwidth: 4,000 × 3 KB = 12 MB/s

Status Updates (Worker → Scheduler):
• Message size: 500 bytes
• Peak: 4,000 messages/second
• Bandwidth: 4,000 × 500 = 2 MB/s

Total Internal Bandwidth: ~15 MB/s (minimal)
```

---

## Service Level Objectives (SLOs)

### Availability SLOs

| SLO | Target | Measurement |
|-----|--------|-------------|
| **API Availability** | 99.99% | Successful responses / Total requests |
| **Scheduling Accuracy** | 99.999% | Jobs executed within 60s of scheduled time |
| **Zero Missed Jobs** | 100% | All scheduled jobs eventually execute |

### Latency SLOs

| SLO | Target | Percentile |
|-----|--------|------------|
| **Job Submission** | < 100 ms | p99 |
| **Status Query** | < 50 ms | p99 |
| **Scheduling Delay** | < 1 second | p99 |
| **Worker Pickup** | < 5 seconds | p99 |

### Durability SLOs

| SLO | Target | Description |
|-----|--------|-------------|
| **Job Definition Durability** | 99.999999999% | Never lose job definitions |
| **Execution Record Durability** | 99.99999% | Never lose execution history |
| **RPO** | 0 seconds | No data loss on failure |
| **RTO** | < 5 minutes | Full recovery time |

---

## Constraints and Assumptions

### Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **Clock Skew** | Up to 100ms between nodes | Use logical clocks, NTP sync |
| **Network Partitions** | Temporary node isolation | Leader election, health checks |
| **Database Limits** | Connection pool exhaustion | Connection pooling, read replicas |
| **Queue Size** | Memory limits on queue nodes | Disk-backed queues, backpressure |

### Business Constraints

| Constraint | Description |
|------------|-------------|
| **Multi-Tenancy** | Jobs isolated between tenants |
| **Compliance** | 90-day audit trail retention |
| **Cost** | Optimize for compute efficiency |
| **SLA Tiers** | Premium tenants get priority execution |

### Assumptions

| Assumption | Rationale |
|------------|-----------|
| Jobs are idempotent | Required for at-least-once guarantee |
| Job duration < 24 hours | Long jobs use checkpointing |
| Workers are stateless | Enable horizontal scaling |
| Failures are transient | Most failures recover with retry |
| Clock drift < 1 second | NTP keeps servers synchronized |

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time streaming | Use stream processing systems |
| Sub-second scheduling | Use event-driven architecture |
| Job result storage | Jobs write to external systems |
| Complex resource scheduling | Use dedicated resource managers |
| Workflow versioning | Keep initial design simple |

---

## Interview Tips: Requirements Phase

### Questions to Ask Interviewer

1. **Scale:** "How many jobs per day? What's the peak load?"
2. **Job Types:** "Cron-based only, or also DAG workflows?"
3. **Execution Guarantees:** "At-least-once acceptable, or need exactly-once?"
4. **Multi-tenancy:** "Single tenant or multi-tenant with isolation?"
5. **Job Duration:** "Typical job duration? Any long-running jobs?"
6. **Failure Handling:** "What happens when a job fails? Auto-retry?"

### Red Flags to Avoid

| Red Flag | Why It's Bad |
|----------|--------------|
| Skipping scale discussion | Can't design without knowing load |
| Assuming exactly-once | Much harder; clarify if needed |
| Ignoring failure modes | Distributed systems fail constantly |
| Over-engineering early | Start simple, add complexity as needed |

---

**Next:** [High-Level Design →](./02-high-level-design.md)
