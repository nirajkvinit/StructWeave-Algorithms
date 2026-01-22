# Distributed Job Scheduler

[← Back to System Design Index](../README.md)

---

## Overview

A **Distributed Job Scheduler** is a system that coordinates the reliable execution of tasks across multiple machines at scale. Unlike traditional single-server cron jobs, a distributed scheduler ensures jobs execute reliably even when infrastructure fails, supports millions of scheduled jobs, and enables complex workflow orchestration through DAG (Directed Acyclic Graph) dependencies.

This design covers cron-at-scale systems like **Apache Airflow**, **Temporal**, **Cadence**, and **Uber Peloton** that power mission-critical batch processing, data pipelines, and workflow automation at companies processing billions of jobs monthly.

---

## Key Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Traffic Pattern** | Write-heavy for job submissions; read-heavy for status queries |
| **Consistency Model** | Strong consistency for job state; eventual consistency acceptable for metrics |
| **Availability Target** | 99.99% (52 minutes downtime/year) |
| **Latency Sensitivity** | Sub-second for immediate jobs; seconds acceptable for scheduled jobs |
| **Scale** | 10M+ scheduled jobs, 100K+ executions/second |
| **Execution Guarantee** | At-least-once with idempotency support |

---

## Complexity Rating

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Overall** | **High** | Distributed coordination, failure handling, exactly-once semantics |
| **Distributed Coordination** | Very High | Leader election, distributed locking, consensus |
| **Failure Handling** | Very High | Mid-execution failures, partial DAG completion |
| **Time Handling** | High | Timezone, DST, clock skew across nodes |
| **Scaling** | High | Database hotspots, queue contention |

---

## Document Navigation

| # | Document | Description |
|---|----------|-------------|
| 01 | [Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning |
| 02 | [High-Level Design](./02-high-level-design.md) | Architecture, data flow, key decisions |
| 03 | [Low-Level Design](./03-low-level-design.md) | Data model, API design, algorithms |
| 04 | [Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Scheduler, worker, DAG executor deep dives |
| 05 | [Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, DR |
| 06 | [Security & Compliance](./06-security-and-compliance.md) | AuthN/AuthZ, threat model, data protection |
| 07 | [Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| 08 | [Interview Guide](./08-interview-guide.md) | Pacing, trade-offs, trap questions |

---

## Core Components

| Component | Responsibility | Key Challenges |
|-----------|---------------|----------------|
| **Scheduler Service** | Polls due jobs, dispatches to workers | Leader election, distributed coordination |
| **Metadata Store** | Persists job definitions, state, history | High write throughput, query performance |
| **Task Queue** | Buffers jobs for worker consumption | Ordering, deduplication, backpressure |
| **Worker Pool** | Executes job logic, reports results | Scaling, isolation, resource management |
| **DAG Executor** | Resolves dependencies, orchestrates workflows | Topological ordering, partial failure handling |
| **Coordination Service** | Leader election, distributed locks | Consensus, split-brain prevention |

---

## Scheduling Algorithm Comparison

| Algorithm | Description | Pros | Cons | Best For |
|-----------|-------------|------|------|----------|
| **FCFS** | First-Come-First-Served | Simple, predictable | Head-of-line blocking, no priority | Single-tenant, low scale |
| **Priority Queue** | Jobs sorted by priority level | Critical jobs first | Priority inversion, starvation | SLA-driven workloads |
| **Fair Share** | Equal time allocation per tenant | Multi-tenant fairness | Complex tracking | Multi-tenant SaaS |
| **Weighted Fair Share** | Proportional allocation by weight | Flexible fairness | Most complex | Premium tier pricing |
| **Delay Scheduling** | Wait briefly for data locality | Better data locality | Added latency | Data-intensive jobs |

---

## Architecture Pattern Comparison

| Pattern | Description | Pros | Cons |
|---------|-------------|------|------|
| **Leader-Based** | Single active scheduler, passive standbys | Simple coordination, no duplicate executions | Single point of failure during failover |
| **Active-Active** | Multiple schedulers with work partitioning | Higher availability, horizontal scaling | Complex deduplication, partition management |
| **Pull-Based Workers** | Workers poll queue for tasks | Natural backpressure, worker autonomy | Polling overhead, delayed pickup |
| **Push-Based Workers** | Scheduler assigns tasks directly | Lower latency, better load balancing | Requires worker health tracking |

---

## Execution Guarantee Comparison

| Guarantee | Description | Implementation | Trade-off |
|-----------|-------------|----------------|-----------|
| **At-Most-Once** | Job runs zero or one time | No retries, ack before execution | Simple but may miss jobs |
| **At-Least-Once** | Job runs one or more times | Retry on failure, ack after execution | May duplicate; requires idempotency |
| **Exactly-Once** | Job effects occur exactly once | Transactional processing + deduplication | Complex; higher latency |

**Recommendation:** At-least-once with idempotent job design is the industry standard (Airflow, Temporal, Cadence).

---

## Real-World References

| System | Company | Scale | Key Innovation |
|--------|---------|-------|----------------|
| **Cadence/Temporal** | Uber | 12B+ workflows/month, 270B+ actions/month | Durable execution, workflow replay |
| **Airflow** | Airbnb (origin) | De facto standard for data pipelines | DAG-based workflow definition |
| **Peloton** | Uber | Unified resource scheduler | Co-schedules batch, stateless, stateful |
| **Dynein** | Airbnb | Delayed job queueing | At-least-once with ~10s accuracy |
| **BDP Scheduler** | Netflix | Workflow-as-a-service | YAML/Java/Python DSLs |

---

## Related Systems

| System | Relationship |
|--------|--------------|
| [Distributed Message Queue](../1.6-distributed-message-queue/00-index.md) | Task queue implementation |
| [Distributed Lock Manager](../1.8-distributed-lock-manager/00-index.md) | Coordination primitives |
| [Service Discovery](../1.10-service-discovery-system/00-index.md) | Worker registration |
| [Configuration Management](../1.11-configuration-management-system/00-index.md) | Job configuration storage |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                  DISTRIBUTED JOB SCHEDULER                      │
├─────────────────────────────────────────────────────────────────┤
│  SCALE TARGETS                                                  │
│  • 10M+ scheduled jobs                                          │
│  • 100K+ executions/second                                      │
│  • 99.99% availability                                          │
│  • Sub-second scheduling latency                                │
├─────────────────────────────────────────────────────────────────┤
│  KEY PATTERNS                                                   │
│  • Leader election (ZooKeeper/etcd)                             │
│  • Pull-based task distribution                                 │
│  • At-least-once + idempotency                                  │
│  • DAG topological execution                                    │
├─────────────────────────────────────────────────────────────────┤
│  CRITICAL DECISIONS                                             │
│  • Leader-based vs Active-Active scheduling                     │
│  • Push vs Pull task distribution                               │
│  • Database vs Message Queue for job storage                    │
│  • Checkpointing granularity                                    │
├─────────────────────────────────────────────────────────────────┤
│  INTERVIEW FOCUS AREAS                                          │
│  • Exactly-once execution challenges                            │
│  • Distributed coordination                                     │
│  • Failure recovery mid-execution                               │
│  • Timezone/DST handling                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

**Next:** [Requirements & Estimations →](./01-requirements-and-estimations.md)
