# 14.7 AI-Native SMB Workforce Scheduling & Gig Management — Scalability & Reliability

## Scaling Strategy

### Multi-Tenant Architecture Scaling

The platform serves 100,000+ businesses with a shared-infrastructure, isolated-data model. Scaling follows three axes:

| Axis | Strategy |
|---|---|
| **API tier** | Stateless API servers behind a load balancer; horizontal scaling based on request rate; each server handles any tenant (no affinity) |
| **Solver pool** | Stateless optimization workers; horizontally scaled based on queue depth; each worker handles one optimization request at a time with a hard time limit |
| **Data tier** | Sharded by tenant_id; each shard serves ~5,000 tenants; new shards added as tenant count grows |
| **Event processing** | Partitioned stream processors; each partition handles events for a subset of tenants |
| **Cache tier** | Distributed cache with tenant-prefixed keys; schedule data cached for active schedules (current + next week) |

### Scaling the Constraint Solver

The solver is the most resource-intensive component (4 vCPU, 8 GB RAM per worker for up to 30 seconds per request). Scaling strategies:

**Capacity planning:**
- Steady-state: 50 concurrent optimizations → 50 workers
- Sunday evening peak: 500 concurrent → 500 workers (10x burst)
- Peak duration: 3 hours (6 PM – 9 PM Sunday in each timezone, rolling across timezones)

**Cost optimization:**
- Solver workers run on spot/preemptible instances (60–80% cost savings). A preempted worker fails gracefully—the scheduling service retries on another worker with no data loss (the request is self-contained).
- Workers are auto-scaled with a 2-minute spin-up lag, buffered by a request queue with priority ordering (paid tiers first, then urgency-based).
- Small businesses (< 20 employees) use a lightweight solver that runs on general-purpose API servers without a dedicated worker—constraint propagation alone finds optimal solutions for small problems in < 1 second.

**Problem decomposition for large tenants:**
- Businesses with 100+ employees are decomposed by role group (kitchen staff, front-of-house, bar) and solved independently, then merged with cross-group constraint repair.
- Multi-location businesses solve each location independently, then apply cross-location constraints (shared employees, labor budget) in a coordination phase.

### Scaling Clock-In Verification

Clock-in events exhibit extreme temporal locality: 30% of daily events occur in a 30-minute window around shift boundaries. The 8 AM weekday surge creates 50,000 events/minute across all tenants.

**Scaling approach:**
- Stateless verification workers handle GPS geofence checks (< 10ms, CPU-bound) and biometric verification (50–100ms, GPU-accelerated).
- GPS verification scales linearly with horizontal workers. No shared state—each verification is independent.
- Biometric verification pre-loads employee face templates 15 minutes before shift start based on the schedule. Templates are loaded into GPU memory in batches of 1,000, reducing cold-start latency.
- Tiered processing: GPS-only verification (fast path, 10ms) runs first. If biometric is required, the result is queued for the biometric verification pool. The worker receives a "GPS verified, biometric pending" response immediately so the employee isn't blocked at the door.

### Scaling Real-Time Notifications

Schedule publication triggers a notification cascade: a single schedule publish for a 50-employee location generates 50 push notifications + 50 SMS messages (for employees without the app). During Sunday evening, 10,000 businesses publishing simultaneously creates 500,000 notifications in 30 minutes.

**Scaling approach:**
- Notification service uses a fan-out queue: one "schedule published" event produces N worker messages (one per employee).
- Push notifications are batched to mobile notification providers (batches of 1,000 for efficiency).
- SMS messages are rate-limited per carrier to avoid throttling (max 100/second per originating number; multiple numbers for throughput).
- Priority ordering: compliance-critical notifications (schedule changes triggering premium pay obligations) are processed before informational notifications (new shift assignment).

---

## Data Partitioning Strategy

### Schedule Database Partitioning

```
Partition key: tenant_id
Partition scheme: Hash-based, 64 partitions initially
```

**Rationale:** tenant_id is present in every query (multi-tenant isolation requirement). Hash partitioning distributes load evenly across partitions regardless of tenant size distribution. Each partition serves ~1,500 tenants.

**Hot partition mitigation:** A single very large tenant (1,000+ employees, multiple locations) could create a hot partition. Mitigation: tenants exceeding a size threshold (> 500 employees) are placed on dedicated partitions.

### Time-Series Data Partitioning

Demand forecast data and POS event data follow a time-series access pattern (recent data accessed frequently, old data rarely):

```
Partition key: (location_id, date_bucket)
Date bucket: weekly
Retention: Hot tier (last 90 days), warm tier (90–365 days), cold archive (1–7 years)
```

Automatic tiering moves data to cheaper storage as it ages, with the hot tier on fast storage (for real-time forecast queries) and cold tier on object storage (for annual analytics).

### Clock-In Event Partitioning

```
Partition key: (tenant_id, week)
Sort key: event_timestamp
```

Clock-in events are append-only and queried primarily by tenant + time range (for timesheet generation). Weekly partitioning aligns with the payroll cycle and keeps partition sizes manageable (~50 MB per tenant per week).

---

## Fault Tolerance

### Schedule Service Failure

**Failure mode:** The schedule service becomes unavailable.

**Impact:** Managers cannot generate or modify schedules. Employees cannot view their current schedule.

**Mitigation:**
- Schedule service is deployed as 3+ replicas behind a load balancer with health checks.
- Published schedules are cached in a distributed cache and can be served from cache even if the schedule service is down. Employees see a "read-only" schedule during outages.
- Schedule generation requests are queued durably. If the service restarts, queued requests are processed in order.
- Last-published schedule is pushed to employee mobile apps for offline access. Even a full platform outage doesn't prevent employees from viewing their current schedule.

### Solver Pool Failure

**Failure mode:** All solver workers crash or become unresponsive.

**Impact:** Schedule generation requests time out. Managers see "generation failed" errors.

**Mitigation:**
- Each optimization request has a per-worker timeout (30s) and a global retry budget (3 attempts on different workers).
- If the solver pool is fully unavailable, the scheduling service falls back to a simpler heuristic scheduler (greedy assignment with constraint checking) that runs on the API server itself. This produces a lower-quality schedule but never returns "failed."
- Solver pool health is monitored via active probing (synthetic optimization requests every 60 seconds). Auto-scaling triggers new workers if healthy worker count drops below threshold.

### Compliance Engine Failure

**Failure mode:** The compliance engine is unavailable.

**Impact:** Schedules cannot be validated before publication. Shift swaps cannot be compliance-checked.

**Mitigation:**
- This is the most critical failure because publishing a non-compliant schedule creates legal liability.
- **Fail-closed policy:** If the compliance engine is unavailable, schedule publication is blocked. Managers see a clear message: "Compliance validation is temporarily unavailable. Schedule saved as draft."
- Shift swaps also fail-closed: swaps are queued but not executed until compliance can validate them.
- The compliance engine runs as 3+ replicas with rule configurations cached locally (rules change infrequently). A single healthy replica can serve all validation requests.
- Emergency override: if compliance is down for > 30 minutes, a tenant admin can publish with an explicit "compliance validation skipped" flag that creates an audit record for later review.

### Clock-In Service Failure

**Failure mode:** Employees cannot clock in via the app.

**Impact:** Attendance is not recorded. Timesheet gaps. Employees may be blocked from entering the workplace.

**Mitigation:**
- Clock-in events are buffered on the employee's mobile device if the server is unreachable. When connectivity resumes, buffered events are synced with timestamps preserved.
- Offline clock-in stores GPS coordinates and a device-local biometric check result. The server validates these retroactively during sync.
- Fallback: managers can manually record clock-in events via their app (manager override). These events are flagged as "manual entry" in the timesheet.
- The clock-in service is deployed in multiple availability zones with automatic failover.

### Database Failure

**Failure mode:** Primary database becomes unavailable.

**Impact:** All reads and writes fail for affected partitions.

**Mitigation:**
- Primary-replica configuration with automatic failover. Replica promotion completes within 30 seconds.
- Read-heavy workloads (schedule viewing, timesheet queries) are served from read replicas during normal operation, making them resilient to primary failure.
- Write-ahead log (WAL) replication ensures zero data loss during failover (synchronous replication within the same region).
- Event log (schedule modifications) is stored in a durable append-only log separate from the primary database, ensuring compliance audit trail survives database failures.

---

## Disaster Recovery

### RPO and RTO Targets

| Component | RPO (Recovery Point Objective) | RTO (Recovery Time Objective) |
|---|---|---|
| Schedule data | 0 (no data loss) | 5 minutes |
| Timesheet records | 0 (no data loss) | 5 minutes |
| Compliance audit logs | 0 (no data loss) | 15 minutes |
| Demand forecast data | 1 hour | 30 minutes |
| POS integration events | 1 hour | 30 minutes |
| User preferences/settings | 1 hour | 30 minutes |

### Cross-Region Recovery

- Schedule and timesheet data are replicated asynchronously to a secondary region (< 1 second lag during normal operation).
- In a regional failure, DNS failover routes traffic to the secondary region within 5 minutes.
- The secondary region has warm-standby solver capacity (25% of primary) that auto-scales on promotion.
- POS and weather integrations are region-independent and reconnect automatically.

### Backup Strategy

| Data Type | Frequency | Retention | Method |
|---|---|---|---|
| Schedule database | Continuous (WAL streaming) + daily full snapshot | 30 days snapshots, 7 years compliance archive | Database-native replication + object storage snapshots |
| Timesheet records | Continuous replication | 7 years (labor law retention requirement) | Append-only log with periodic snapshot to cold storage |
| Compliance rule configurations | Every change (version-controlled) | Indefinite | Version control system with object storage backup |
| Demand forecast models | After each retraining | 90 days (model versions) | Model registry with object storage |
| Biometric templates | Daily encrypted backup | Until employee termination + 90 days | Encrypted object storage with separate key management |

---

## Capacity Growth Plan

### Year 1 → Year 3 Scaling Path

| Metric | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Businesses | 10,000 | 50,000 | 150,000 |
| Workers managed | 500,000 | 2,500,000 | 7,500,000 |
| Solver pool (peak) | 50 workers | 250 workers | 750 workers |
| Database partitions | 16 | 32 | 128 |
| Clock-in events/day | 500,000 | 2,500,000 | 7,500,000 |
| Storage growth/year | 500 GB | 2.5 TB | 7.5 TB |

### Scaling Triggers

| Trigger | Action |
|---|---|
| API p99 latency > 500ms for 5 min | Auto-scale API servers +25% |
| Solver queue depth > 50 for 2 min | Auto-scale solver pool +50% |
| Clock-in verification p99 > 3s for 1 min | Auto-scale verification workers +50% |
| Database CPU > 80% sustained 10 min | Add read replica or increase shard count |
| Cache hit rate drops below 90% | Increase cache cluster size |
| Notification queue depth > 10,000 for 5 min | Auto-scale notification workers +100% |
