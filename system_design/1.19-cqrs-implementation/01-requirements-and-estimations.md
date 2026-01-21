# Requirements and Estimations

## Overview

This document defines the functional and non-functional requirements for a CQRS (Command Query Responsibility Segregation) implementation, along with capacity planning estimates for different scale scenarios.

---

## Functional Requirements

### Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Accept commands that modify system state | Must Have |
| FR-2 | Process queries against optimized read models | Must Have |
| FR-3 | Maintain separate write and read data stores | Must Have |
| FR-4 | Synchronize read models from write model changes | Must Have |
| FR-5 | Support multiple read models for different query patterns | Should Have |
| FR-6 | Track projection processing position (checkpoints) | Must Have |
| FR-7 | Support projection rebuilding without downtime | Should Have |
| FR-8 | Provide command idempotency guarantees | Must Have |

### Command Side Requirements

```
┌────────────────────────────────────────────────────────────────────┐
│ COMMAND PROCESSING REQUIREMENTS                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Command Validation                                              │
│     • Validate command structure and data types                    │
│     • Validate business rules and invariants                       │
│     • Reject invalid commands with detailed errors                 │
│                                                                     │
│  2. Command Execution                                               │
│     • Execute commands in order (per aggregate/entity)             │
│     • Support optimistic concurrency control                       │
│     • Return success/failure status (not query data)               │
│                                                                     │
│  3. Event Publishing                                                │
│     • Publish domain events after successful command               │
│     • Guarantee at-least-once event delivery                       │
│     • Maintain event ordering within aggregate                     │
│                                                                     │
│  4. Idempotency                                                     │
│     • Track processed command IDs                                  │
│     • Return cached result for duplicate commands                  │
│     • Expire idempotency keys after configurable TTL               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Query Side Requirements

```
┌────────────────────────────────────────────────────────────────────┐
│ QUERY PROCESSING REQUIREMENTS                                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Read Model Optimization                                         │
│     • Denormalized schemas for query patterns                      │
│     • Pre-computed aggregates and summaries                        │
│     • Indexed for specific query patterns                          │
│                                                                     │
│  2. Query Types Supported                                           │
│     • Point queries (by ID)                                        │
│     • List queries with pagination                                 │
│     • Search queries with filtering                                │
│     • Aggregation queries                                          │
│                                                                     │
│  3. Freshness Indicators                                            │
│     • Return last-updated timestamp                                │
│     • Optionally return version/position                           │
│     • Support "wait for consistency" option                        │
│                                                                     │
│  4. Caching                                                         │
│     • Cache-friendly responses                                     │
│     • Support conditional requests (ETag, If-Modified-Since)       │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Projection Management Requirements

| Requirement | Description |
|-------------|-------------|
| Checkpoint tracking | Persist last processed event position per projection |
| Idempotent handlers | Same event processed multiple times yields same result |
| Error handling | Dead letter queue for failed events, alerting |
| Rebuild capability | Rebuild projection from scratch without downtime |
| Schema migration | Update read model schema without data loss |

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| Command latency (p50) | < 50ms | Fast user feedback |
| Command latency (p99) | < 100ms | Predictable worst case |
| Query latency (p50) | < 20ms | Snappy UI |
| Query latency (p99) | < 50ms | Consistent experience |
| Projection lag (p50) | < 1s | Near real-time updates |
| Projection lag (p99) | < 5s | Bounded staleness |
| Command throughput | 10,000 cmd/s | Peak write capacity |
| Query throughput | 100,000 qps | Read-heavy workloads |

### Consistency Requirements

```
┌────────────────────────────────────────────────────────────────────┐
│ CONSISTENCY MODEL                                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Write Side (Command Model):                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Strong consistency within aggregate boundary               │   │
│  │ • Optimistic concurrency control via version numbers        │   │
│  │ • ACID guarantees for individual commands                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Read Side (Query Model):                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Eventual consistency with bounded staleness               │   │
│  │ • Monotonic read consistency per user session               │   │
│  │ • Causal consistency where needed (version tracking)        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Cross-Side Consistency:                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Read-your-writes via version token                        │   │
│  │ • Maximum lag SLO: 5 seconds (p99)                          │   │
│  │ • Fallback to write DB for critical single-item reads      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Availability Requirements

| Component | Target | Recovery Time |
|-----------|--------|---------------|
| Command API | 99.9% | < 30 seconds |
| Query API | 99.95% | < 10 seconds |
| Write Database | 99.9% | < 1 minute |
| Read Database | 99.95% | < 30 seconds |
| Projection Engine | 99.9% | < 1 minute |
| Message Broker | 99.95% | < 30 seconds |

### Durability Requirements

| Requirement | Target |
|-------------|--------|
| Command durability | Zero data loss (sync replication) |
| Event durability | Zero data loss (persisted before ack) |
| Read model durability | Rebuildable from events |
| Checkpoint durability | At-least-once processing guarantee |

---

## Capacity Planning

### Typical Workload Patterns

```
┌────────────────────────────────────────────────────────────────────┐
│ READ:WRITE RATIO SCENARIOS                                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Scenario 1: E-commerce Product Catalog                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Read:Write Ratio = 1000:1                                    │   │
│  │ • Writes: Product updates, inventory changes (rare)         │   │
│  │ • Reads: Product browsing, search (constant)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Scenario 2: Order Management System                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Read:Write Ratio = 100:1                                     │   │
│  │ • Writes: Order creation, status updates                    │   │
│  │ • Reads: Order tracking, history, dashboards                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Scenario 3: Collaborative Document System                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Read:Write Ratio = 10:1                                      │   │
│  │ • Writes: Document edits (frequent)                         │   │
│  │ • Reads: Document rendering, search                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Scale Scenarios

#### Small Scale (Startup)

| Metric | Value |
|--------|-------|
| Daily active users | 10,000 |
| Commands per day | 100,000 |
| Queries per day | 10,000,000 |
| Read:Write ratio | 100:1 |
| Peak commands/second | 10 |
| Peak queries/second | 500 |

**Infrastructure Estimate:**
- Write DB: 1 primary + 1 replica
- Read DB: 1 instance (can be same as write replica)
- Projection workers: 1-2 instances
- Message broker: Managed service (small)

#### Medium Scale (Growth Stage)

| Metric | Value |
|--------|-------|
| Daily active users | 500,000 |
| Commands per day | 5,000,000 |
| Queries per day | 500,000,000 |
| Read:Write ratio | 100:1 |
| Peak commands/second | 500 |
| Peak queries/second | 25,000 |

**Infrastructure Estimate:**
- Write DB: 1 primary + 2 replicas (multi-AZ)
- Read DB: 3-5 read replicas or dedicated read cluster
- Projection workers: 5-10 instances (auto-scaling)
- Message broker: Dedicated cluster (3 nodes)

#### Large Scale (Enterprise)

| Metric | Value |
|--------|-------|
| Daily active users | 10,000,000 |
| Commands per day | 100,000,000 |
| Queries per day | 10,000,000,000 |
| Read:Write ratio | 100:1 |
| Peak commands/second | 10,000 |
| Peak queries/second | 500,000 |

**Infrastructure Estimate:**
- Write DB: Sharded cluster (5+ shards)
- Read DB: Multiple specialized stores (document, search, cache)
- Projection workers: 50-100 instances (auto-scaling)
- Message broker: Multi-region cluster

### Storage Estimations

```
┌────────────────────────────────────────────────────────────────────┐
│ STORAGE CALCULATIONS (Medium Scale Example)                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Assumptions:                                                       │
│  • 5M commands/day = 1.8B commands/year                            │
│  • Average command size: 500 bytes                                 │
│  • Average event size: 300 bytes                                   │
│  • 1.5 events per command average                                  │
│  • Read model record size: 2KB (denormalized)                      │
│                                                                     │
│  Write Model Storage:                                               │
│  ├── Commands (1 year): 1.8B × 500B = 900 GB                       │
│  ├── Current state only: ~50 GB (normalized)                       │
│  └── With Event Store: 1.8B × 1.5 × 300B = 810 GB                  │
│                                                                     │
│  Read Model Storage (per projection):                               │
│  ├── Order list view: 10M records × 2KB = 20 GB                    │
│  ├── Customer history: 1M customers × 10KB = 10 GB                 │
│  └── Search index: ~30 GB (with full-text)                         │
│                                                                     │
│  Total Read Models: ~60-100 GB                                      │
│                                                                     │
│  Message Broker Retention:                                          │
│  ├── 7-day retention: 5M × 7 × 300B × 1.5 = 15.75 GB              │
│  └── 30-day retention: 67.5 GB                                     │
│                                                                     │
│  Checkpoint Store: Negligible (~100 MB)                            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Bandwidth Estimations

| Traffic Type | Calculation | Result |
|--------------|-------------|--------|
| Command ingress | 500 cmd/s × 500B | 250 KB/s |
| Event egress | 750 events/s × 300B | 225 KB/s |
| Query egress | 25,000 qps × 2KB | 50 MB/s |
| Total peak bandwidth | Sum | ~55 MB/s |

---

## Service Level Objectives (SLOs)

### Command SLOs

| SLO | Target | Measurement |
|-----|--------|-------------|
| Availability | 99.9% | Successful commands / total commands |
| Latency (p50) | < 50ms | Time from request to acknowledgment |
| Latency (p99) | < 100ms | Time from request to acknowledgment |
| Error rate | < 0.1% | Excluding validation errors |
| Durability | 100% | No acknowledged command lost |

### Query SLOs

| SLO | Target | Measurement |
|-----|--------|-------------|
| Availability | 99.95% | Successful queries / total queries |
| Latency (p50) | < 20ms | Time from request to response |
| Latency (p99) | < 50ms | Time from request to response |
| Freshness (p50) | < 1s | Lag behind write model |
| Freshness (p99) | < 5s | Lag behind write model |

### Projection SLOs

| SLO | Target | Measurement |
|-----|--------|-------------|
| Processing availability | 99.9% | Uptime of projection workers |
| Lag (p50) | < 500ms | Time from event to read model update |
| Lag (p99) | < 5s | Time from event to read model update |
| Rebuild time | < 4 hours | Full projection rebuild duration |
| Error rate | < 0.01% | Failed event processing |

---

## Error Budgets

### Monthly Error Budget Calculation

```
┌────────────────────────────────────────────────────────────────────┐
│ ERROR BUDGET (30-day month)                                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Command API (99.9% SLO):                                          │
│  ├── Total minutes: 30 × 24 × 60 = 43,200 minutes                  │
│  ├── Allowed downtime: 0.1% = 43.2 minutes                         │
│  └── Per incident budget: ~15 minutes (3 incidents max)            │
│                                                                     │
│  Query API (99.95% SLO):                                           │
│  ├── Total minutes: 43,200 minutes                                 │
│  ├── Allowed downtime: 0.05% = 21.6 minutes                        │
│  └── Per incident budget: ~7 minutes (3 incidents max)             │
│                                                                     │
│  Projection Lag (5s p99 SLO):                                      │
│  ├── Allowed violations: 1% of time = 432 minutes                  │
│  └── Typically budgeted for: deployments, rebuilds                 │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Error Budget Policies

| Budget Status | Action |
|---------------|--------|
| > 50% remaining | Normal development velocity |
| 25-50% remaining | Increased testing, careful releases |
| < 25% remaining | Reliability-focused sprint |
| Exhausted | Feature freeze, reliability only |

---

## Capacity Triggers

### Scaling Triggers

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Command latency (p99) | > 80ms | > 100ms | Scale write infrastructure |
| Query latency (p99) | > 40ms | > 50ms | Add read replicas |
| Projection lag (p99) | > 3s | > 5s | Scale projection workers |
| CPU utilization | > 70% | > 85% | Horizontal scaling |
| Disk utilization | > 70% | > 85% | Increase storage |
| Message queue depth | > 10K | > 100K | Scale consumers |

### Capacity Planning Cadence

| Timeframe | Activity |
|-----------|----------|
| Daily | Monitor real-time dashboards |
| Weekly | Review trend reports |
| Monthly | Capacity planning review |
| Quarterly | Architecture review, scaling strategy |
