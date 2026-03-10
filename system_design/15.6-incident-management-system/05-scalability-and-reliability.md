# Scalability & Reliability — Incident Management System

## 1. The Meta-Reliability Paradox

The incident management system has a unique reliability requirement that no other system in the infrastructure shares: **it must be more available than the systems it monitors.** When the database goes down, the incident platform must page the DBA. When the Kubernetes cluster fails, the platform must still deliver notifications. When the network partitions, the platform must still function on both sides of the partition.

This creates the "meta-reliability paradox": the system that alerts you about failures cannot itself depend on any system that might fail.

### 1.1 Dependency Minimization

| Dependency | Risk | Mitigation |
|-----------|------|------------|
| **Primary database** | DB failure = no incident state | Multi-region replicated database with automatic failover; degraded mode falls back to in-memory state |
| **Message queue** | Queue failure = alert processing stops | Multi-AZ queue cluster; fallback to direct processing (bypass queue) under failure |
| **Telephony provider** | Provider outage = no phone notifications | Multi-provider with automatic failover; hot standby provider |
| **DNS** | DNS failure = integrations can't reach the platform | Static IP endpoints published alongside DNS names; long TTLs on critical DNS records |
| **TLS certificates** | Cert expiry = API becomes unreachable | Certificate monitoring as a separate system with independent notification path |
| **Configuration store** | Config store failure = stale schedules/policies | Local config cache with hours-long TTL; the platform can operate on cached config indefinitely |

### 1.2 Independence from Shared Infrastructure

The incident platform must NOT share:
- **Compute clusters** with the applications it monitors (if the cluster goes down, the monitoring platform goes down with it)
- **Network segments** with the monitored infrastructure (network partition must not isolate the alerting path)
- **Identity providers** that could become unavailable during an outage (engineers must be able to log in and acknowledge incidents even if SSO is down)
- **Monitoring systems** that are themselves monitored (circular dependency)

---

## 2. Multi-Region Active-Active Architecture

### 2.1 Architecture Overview

```mermaid
flowchart TB
    subgraph Region_A["Region A (Primary)"]
        LB_A[Load Balancer]
        API_A[API Cluster]
        PROC_A[Processing Cluster]
        DB_A[(Database Primary)]
        Q_A[(Queue Cluster)]
    end

    subgraph Region_B["Region B (Secondary)"]
        LB_B[Load Balancer]
        API_B[API Cluster]
        PROC_B[Processing Cluster]
        DB_B[(Database Replica)]
        Q_B[(Queue Cluster)]
    end

    subgraph Global["Global Layer"]
        GSLB[Global Server Load Balancer]
        REPL[Cross-Region Replication]
    end

    subgraph External["External Channels"]
        TEL[Telephony Providers]
        PUSH[Push Services]
        CHAT[Chat Platforms]
    end

    GSLB --> LB_A & LB_B
    LB_A --> API_A --> PROC_A
    LB_B --> API_B --> PROC_B
    PROC_A --> DB_A & Q_A
    PROC_B --> DB_B & Q_B
    DB_A <-->|Sync Replication| REPL
    REPL <-->|Sync Replication| DB_B
    PROC_A & PROC_B --> TEL & PUSH & CHAT

    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class LB_A,LB_B,GSLB api
    class API_A,API_B,PROC_A,PROC_B,REPL service
    class DB_A,DB_B data
    class Q_A,Q_B queue
    class TEL,PUSH,CHAT client
```

### 2.2 Data Replication Strategy

| Data Type | Replication Mode | Conflict Resolution | Rationale |
|-----------|-----------------|---------------------|-----------|
| **Alert ingestion** | Write to local region only | No conflict (alerts are immutable) | Alerts are accepted at whichever region receives them |
| **Incident state** | Synchronous cross-region | Last-writer-wins with status precedence | Acknowledged > Triggered; Resolved > Acknowledged |
| **Escalation timers** | Active in one region per incident | Leader election by incident ID hash | Prevents duplicate escalation across regions |
| **Schedules & policies** | Async replication with <1s lag | Version vector with merge | Config changes are low-frequency and non-conflicting |
| **Notification records** | Write-local, async replicate | Append-only (no conflict) | Records are immutable once created |

### 2.3 Regional Failover

**Failure detection:** Each region monitors the other via health checks. The Global Server Load Balancer (GSLB) detects region unavailability within 30 seconds.

**Failover sequence:**
1. GSLB detects Region A is unhealthy → routes all traffic to Region B
2. Region B's processing cluster absorbs the additional load (pre-provisioned at 150% capacity)
3. Escalation timers owned by Region A are re-assigned to Region B (the timer store is replicated; Region B picks up where Region A left off)
4. Notifications in flight from Region A are retried by Region B (idempotent notification delivery prevents duplicates)

**Recovery sequence:**
1. Region A recovers → GSLB begins routing traffic to both regions
2. Database replication catches up (sync backlog)
3. Timer ownership is re-balanced across both regions

---

## 3. Scaling Alert Ingestion During Incident Storms

### 3.1 The Storm Profile

Normal: 100K alerts/day → ~70/minute
Storm: 5M alerts in 90 minutes → ~55,000/minute (800x normal)

The storm arrives suddenly (within seconds of the root cause) and sustains for 60-90 minutes.

### 3.2 Scaling Strategy

```
                    Normal Load          Storm Load
                    ──────────          ──────────
API Gateway:        4 pods              40 pods (auto-scale on request rate)
Alert Queue:        2 partitions        20 partitions (pre-provisioned)
Dedup Engine:       8 pods              20 pods (auto-scale on queue depth)
Notification:       6 pods              30 pods (auto-scale on queue depth)
```

**Pre-scaling triggers:**
- Alert rate exceeds 5x normal for 60 seconds → scale all components to storm capacity
- Single service exceeds 100 alerts/minute → scale dedup engine
- Notification queue depth exceeds 1000 → scale notification dispatcher

### 3.3 Backpressure Mechanisms

If scaling cannot keep up with the storm:

1. **Alert queue acts as buffer** — The durable queue absorbs the burst; processing catches up after the storm subsides. Queue retention is set to 7 days to survive extended outages.

2. **Ingestion-layer shedding** — If the queue itself is at capacity, the API Gateway returns `429 Too Many Requests` with a `Retry-After` header. Monitoring systems respect this and retry. This is the last resort — it means alerts are being delayed, not dropped.

3. **Dedup-window extension** — During storms, automatically extend the dedup window from 24h to 48h, causing more aggressive grouping and fewer new incidents.

4. **Notification priority queuing** — P1 notifications are processed immediately; P3/P4 notifications are deferred by up to 5 minutes during storms.

---

## 4. Fault Tolerance

### 4.1 Component Failure Matrix

| Component | Failure Impact | Recovery Strategy | RTO |
|-----------|---------------|-------------------|-----|
| **API Gateway** | New alerts not accepted | Auto-restart; health check removes unhealthy instances; clients retry | < 10s |
| **Alert Queue** | Processing paused; alerts buffered at gateway | Multi-AZ queue; automatic partition leadership handoff | < 30s |
| **Dedup Engine** | Alerts queue up; latency increases | Stateless restart; fingerprint state rebuilt from persistent store | < 60s |
| **Escalation Engine** | Timers may fire late | Timer store is durable; on restart, fires all overdue timers immediately | < 30s |
| **Notification Dispatcher** | Notifications delayed | Stateless restart; unprocessed notifications redelivered from queue | < 30s |
| **Primary Database** | Incident state reads/writes fail | Failover to replica; degraded mode uses cached state | < 60s |
| **Telephony Provider** | Phone calls fail | Automatic failover to backup provider | < 10s |
| **Entire Region** | 50% capacity loss | GSLB routes to surviving region; capacity pre-provisioned | < 30s |

### 4.2 Degraded Mode Operation

When dependencies fail, the platform enters degraded modes rather than becoming unavailable:

| Degraded Mode | Trigger | Behavior | User Impact |
|--------------|---------|----------|-------------|
| **Queue bypass** | Message queue unavailable | Alerts processed synchronously (skip queue) | Higher latency, lower throughput, but no alert loss |
| **Cache-only schedule** | Config store unavailable | Use cached schedule (may be up to 1 hour stale) | Overrides created in the last hour may not take effect |
| **Push-only notification** | Telephony providers down | Route all notifications to push + chat | No phone/SMS; push is less intrusive but still reaches the engineer |
| **Read-only mode** | Database in failover | Accept alerts (buffer in queue), serve cached incidents | New incidents queued; existing incidents visible but not updateable |

### 4.3 Chaos Engineering for the Alerting System

Since the incident platform is the system that responds to failures, it must be the most thoroughly chaos-tested system in the organization:

- **Provider failover drill** — Monthly: disable the primary telephony provider and verify failover to backup within 10 seconds
- **Region evacuation drill** — Quarterly: simulate complete region failure and verify the surviving region handles full load
- **Queue saturation drill** — Monthly: inject 100x normal alert volume and verify dedup, scaling, and backpressure behavior
- **Timer accuracy drill** — Weekly: create test incidents with known escalation timeouts and verify timers fire within ±5 seconds

---

## 5. Data Partitioning Strategy

### 5.1 Alert and Incident Partitioning

| Data | Partition Key | Strategy | Rationale |
|------|--------------|----------|-----------|
| **Alerts** | `fingerprint` hash | Hash partitioning across queue partitions | Same fingerprint → same partition → serialized dedup processing |
| **Incidents** | `incident_id` hash | Hash partitioning across database shards | Even distribution; no hotspots |
| **Notifications** | `user_id` hash | Hash partitioning | Prevents notification storms to a single user from overwhelming one partition |
| **Schedules** | `team_id` | Range partitioning | Low cardinality; co-locate team schedules for efficient resolution |
| **Timers** | `fire_at` time bucket | Time-range partitioning | Efficient "fire all timers in this second" queries |

### 5.2 Hot Partition Handling

During a storm, a single fingerprint may receive 10,000 alerts while other fingerprints receive zero. This creates a hot partition.

**Mitigation:**
- The hot partition handles only dedup counter increments (lightweight: atomic increment on `alert_count`)
- Heavy processing (incident creation, escalation) happens only once per fingerprint, not per alert
- If a single partition is overwhelmed, the queue rebalances by splitting the hot partition's key range

---

## 6. Capacity Planning

### 6.1 Scaling Dimensions

| Dimension | Metric | Scaling Action | Threshold |
|-----------|--------|---------------|-----------|
| Alert ingestion rate | Alerts/sec at API Gateway | Add API pods | > 500/sec sustained |
| Queue depth | Messages in alert queue | Add consumer pods | > 10,000 messages |
| Dedup cache size | Unique fingerprints in window | Increase memory / add cache nodes | > 1M active fingerprints |
| Notification throughput | Notifications/min | Add dispatcher pods | > 1000/min |
| Phone call concurrency | Active outbound calls | Add telephony provider capacity | > 80% of provider limit |
| Database write throughput | Writes/sec to incident store | Add database write replicas | > 5,000 writes/sec |

### 6.2 Growth Projections

| Year | Monitored Services | Daily Alerts | Peak Alerts/min | Active On-Call Users |
|------|-------------------|-------------|-----------------|---------------------|
| Year 1 | 10,000 | 20K | 10K | 2,000 |
| Year 2 | 30,000 | 60K | 30K | 5,000 |
| Year 3 | 50,000 | 100K | 58K | 10,000 |
| Year 5 | 100,000 | 200K | 120K | 20,000 |

Infrastructure cost scales sub-linearly because deduplication effectiveness improves with volume (more alerts per fingerprint → higher dedup ratio → fewer incidents → fewer notifications).
