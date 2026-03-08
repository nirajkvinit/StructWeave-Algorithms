# Observability

## Key Metrics

### Service-Level Metrics (RED)

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| **Request rate** | API requests per second by endpoint | >2x baseline for 5 min (anomaly) |
| **Error rate** | 5xx errors / total requests | >0.1% for 5 min |
| **Duration (p50)** | Median response time by endpoint | >200ms for calendar view |
| **Duration (p99)** | Tail latency by endpoint | >1s for calendar view |

### Calendar-Specific Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| **Event creation latency (p99)** | Time from API request to DB commit | >1s for 5 min |
| **Free-busy query latency (p99)** | End-to-end free-busy computation time | >200ms for 5 min |
| **Free-busy cache hit rate** | Cache hits / (hits + misses) | <70% for 10 min |
| **Recurring expansion latency (p99)** | RRULE expansion time per master event | >500ms |
| **Reminder delivery lag** | fire_time - actual_delivery_time | >60s for any reminder |
| **Reminder delivery success rate** | Successfully delivered / total fired | <99% for 5 min |
| **Booking conversion rate** | Confirmed bookings / slot views | Tracked, not alerted |
| **Booking double-booking incidents** | Events where two bookings overlap | >0 (critical alert) |
| **CalDAV sync success rate** | Successful syncs / total sync attempts | <95% for 10 min |
| **CalDAV sync latency** | Event change to sync delivery time | >30s for 10 min |
| **Recurring expansion backlog** | Queued re-materialization jobs | >10K for 5 min |

### Infrastructure Metrics (USE)

| Resource | Utilization | Saturation | Errors |
|----------|------------|------------|--------|
| **Primary DB CPU** | >70% sustained | Connection pool exhaustion | Replication errors |
| **Read replica lag** | N/A | >5s replication lag | Replica disconnection |
| **Cache memory** | >85% capacity | Eviction rate | Connection failures |
| **Timer store** | >70% capacity | Unclaimed bucket count | Write failures |
| **Notification queue** | >80% capacity | Queue depth growing | Dead letter entries |

---

## Logging

### Structured Log Events

| Event | Log Level | Fields | Purpose |
|-------|-----------|--------|---------|
| `event.created` | INFO | event_id, calendar_id, user_id, is_recurring, attendee_count | Track event creation patterns |
| `event.updated` | INFO | event_id, user_id, changed_fields, scope (all/this/following) | Track modification patterns |
| `event.deleted` | INFO | event_id, user_id, scope, was_recurring | Track deletion patterns |
| `rsvp.changed` | INFO | event_id, attendee_id, old_status, new_status | Track RSVP flows |
| `freebusy.query` | DEBUG | user_ids, time_range, cache_hit, latency_ms | Performance analysis |
| `freebusy.cache_miss` | INFO | user_id, reason (expired/invalidated/cold) | Cache effectiveness |
| `reminder.fired` | INFO | reminder_id, event_id, user_id, method, lag_ms | Reminder accuracy |
| `reminder.failed` | WARN | reminder_id, event_id, user_id, method, error | Delivery failures |
| `booking.slot_viewed` | DEBUG | booking_link_id, date, slot_count | Booking funnel analysis |
| `booking.reserved` | INFO | booking_link_id, event_id, guest_email_hash | Booking success tracking |
| `booking.conflict` | WARN | booking_link_id, slot, reason | Double-booking prevention |
| `sync.completed` | INFO | calendar_id, protocol, changes_count, latency_ms | Sync health |
| `sync.failed` | WARN | calendar_id, protocol, error, retry_count | Sync failures |
| `rrule.expanded` | DEBUG | master_event_id, instance_count, expansion_time_ms | Expansion performance |
| `rrule.error` | ERROR | master_event_id, rrule, error | Invalid recurrence rules |
| `acl.changed` | INFO | calendar_id, grantee_id, old_role, new_role, actor_id | Security audit |
| `timezone.update` | INFO | affected_timezones, affected_events_count | Timezone DB updates |

### Log Format

```
{
  "timestamp": "2026-03-10T08:45:12.345Z",
  "level": "INFO",
  "service": "event-service",
  "instance_id": "evt-svc-us-east-03",
  "trace_id": "abc123def456",
  "span_id": "span-789",
  "event_type": "event.created",
  "user_id": "user-alice",
  "calendar_id": "cal-work-alice",
  "event_id": "evt-daily-standup",
  "is_recurring": true,
  "attendee_count": 8,
  "latency_ms": 142,
  "shard_id": "shard-07"
}
```

### Log Retention

| Log Category | Hot Storage | Warm Storage | Cold Storage |
|-------------|-------------|-------------|-------------|
| API access logs | 7 days | 30 days | 1 year |
| Event mutation logs | 30 days | 90 days | 3 years |
| Security/audit logs | 90 days | 1 year | 7 years |
| Performance/debug logs | 3 days | 14 days | 90 days |
| Notification delivery logs | 7 days | 30 days | 1 year |

---

## Distributed Tracing

### Key Trace Spans

| Operation | Parent Span | Child Spans |
|-----------|-------------|-------------|
| `POST /events` (create event) | `api.create_event` | `db.write_event`, `recurrence.expand`, `freebusy.invalidate`, `mq.publish_event_created` |
| `GET /calendars/{id}/events` (calendar view) | `api.list_events` | `cache.check`, `db.query_events`, `recurrence.expand_on_demand`, `acl.check_permissions` |
| `POST /freebusy` (availability query) | `api.freebusy_query` | `cache.bitmap_lookup` (per user), `db.query_events` (cache miss), `bitmap.compute`, `bitmap.intersect` |
| `POST /booking/{slug}/reserve` | `api.reserve_slot` | `lock.acquire`, `freebusy.verify`, `event.create`, `freebusy.invalidate`, `lock.release`, `mq.publish_booking` |
| `reminder.fire` (timer trigger) | `timer.process_bucket` | `db.verify_event`, `notification.dispatch`, `push.send` / `email.send` |

### Trace Propagation

```
Trace flows across:
  Client → API Gateway → Service → Database
                      → Message Queue → Worker → Notification Provider

Trace context (W3C TraceContext format):
  traceparent: 00-{trace_id}-{span_id}-{flags}

Cross-service propagation:
  HTTP headers: traceparent, tracestate
  Message queue: trace_id in message metadata
  Timer store: trace_id stored with reminder entry (for fire-time tracing)
```

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Impact | Runbook |
|-------|-----------|--------|---------|
| **Double-booking detected** | Any resource or host has overlapping confirmed bookings | Trust violation; immediate manual resolution needed | Identify conflicting events; notify affected parties; investigate lock failure |
| **Reminder delivery halt** | 0 reminders fired in last 5 minutes (expected: >10K/min) | Users miss meetings | Check timer worker health; verify timer store connectivity; restart stuck workers |
| **Primary DB unreachable** | All health checks fail for 30s | Full write path failure | Verify network; initiate failover to replica; page DBA |
| **API error rate >1%** | 5xx rate exceeds 1% for 3 minutes | User-visible service degradation | Check error logs; identify failing dependency; circuit break if downstream |
| **Free-busy query latency >500ms (p99)** | For 5+ minutes | Scheduling experience degraded | Check cache hit rate; verify read replica health; scale cache cluster |

### Warning Alerts (Slack/Email)

| Alert | Condition | Impact | Action |
|-------|-----------|--------|--------|
| **Reminder delivery lag >30s** | Average lag exceeds 30s for 10 min | Reminders arrive after events start | Scale timer workers; check queue depth |
| **Free-busy cache hit rate <70%** | For 15+ minutes | Increased DB load; higher latency | Investigate invalidation storm; increase cache TTL; check for cache eviction |
| **Recurring expansion backlog >5K** | Queued jobs exceed 5K for 10 min | New recurring events not fully materialized | Scale expansion workers; check for pathological RRULE |
| **CalDAV sync failures >5%** | For 10+ minutes | External calendar clients out of sync | Check sync service health; verify external calendar provider availability |
| **Read replica lag >3s** | For 5+ minutes | Free-busy queries may return stale data | Monitor replication; consider promoting lagging replica |
| **Notification queue depth >50K** | For 10+ minutes | Invitation/RSVP emails delayed | Scale notification workers; check email provider rate limits |

### Informational Alerts

| Alert | Condition | Purpose |
|-------|-----------|---------|
| **Timezone database update available** | New IANA tzdata release detected | Schedule maintenance window for timezone update |
| **Booking link traffic spike** | Single booking link receives >100 requests/min | May indicate viral sharing or bot activity |
| **Storage growth anomaly** | Daily growth exceeds 2x average | Investigate potential abuse or data import |

---

## Dashboards

### Dashboard 1: Real-Time Operations

```
Panels:
  - API request rate (by endpoint) — line chart
  - API error rate (by endpoint) — line chart with threshold line at 0.1%
  - API latency p50/p95/p99 — multi-line chart
  - Active WebSocket connections — gauge
  - Events created/minute — counter
  - Free-busy queries/second — counter
```

### Dashboard 2: Reminder & Notification Health

```
Panels:
  - Reminders fired/minute vs expected — dual line chart
  - Reminder delivery lag distribution — histogram
  - Notification delivery success/failure by channel (push/email/SMS) — stacked bar
  - Timer bucket depth (current + next 5 hours) — bar chart
  - Dead letter queue depth — gauge with alert coloring
  - Notification provider response times — line chart per provider
```

### Dashboard 3: Booking Analytics

```
Panels:
  - Booking page views/hour — line chart
  - Booking conversion funnel (view → select slot → confirm) — funnel chart
  - Booking conflicts/hour — counter with alert coloring
  - Top booking links by volume — table
  - Slot availability ratio (available slots / total working slots) — gauge
  - Average booking lead time (how far in advance bookings are made) — histogram
```

### Dashboard 4: Calendar Data Health

```
Panels:
  - Free-busy cache hit rate — gauge (green >85%, yellow >70%, red <70%)
  - Read replica replication lag — per-replica line chart
  - Recurring event materialization backlog — gauge
  - CalDAV sync success rate — gauge
  - Storage utilization by shard — bar chart
  - Cross-region replication lag — per-region line chart
```

---

## Health Check Endpoints

| Endpoint | Checks | Frequency |
|----------|--------|-----------|
| `/health/live` | Process is running | 5s (load balancer) |
| `/health/ready` | DB connection + cache connection | 10s (load balancer) |
| `/health/deep` | DB read/write, cache read/write, queue publish, timer store write | 30s (monitoring system) |
| `/health/dependencies` | All downstream services reachable | 60s (monitoring system) |
