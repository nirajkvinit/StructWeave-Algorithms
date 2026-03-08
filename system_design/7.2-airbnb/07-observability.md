# Observability

## 1. Key Metrics

### 1.1 Business Metrics (North Star)

| Metric | Description | Target | Measurement |
|--------|-------------|--------|-------------|
| **Booking conversion rate** | Searches resulting in a booking | > 2.5% | (bookings / searches) per day |
| **Booking success rate** | Booking attempts that complete successfully | > 85% | (confirmed bookings / booking attempts) per hour |
| **Search-to-click rate** | Searches where user clicks a listing | > 40% | (searches with click / total searches) per hour |
| **Guest cancellation rate** | Confirmed bookings cancelled by guest | < 5% | (cancellations / confirmed bookings) per week |
| **Host cancellation rate** | Confirmed bookings cancelled by host | < 1% | (host cancellations / confirmed bookings) per week |
| **Double-booking rate** | Bookings for already-booked dates | 0% | Continuous monitoring; any occurrence is P1 |
| **Average booking value** | Average total booking amount | Tracked, no target | Per booking |
| **Host payout timeliness** | Payouts completed within 24h of check-in | > 99.5% | (on-time payouts / total payouts) per day |
| **Review submission rate** | Completed stays with guest review | > 70% | (reviews / completed stays) per week |

### 1.2 Service-Level Metrics

#### Search Service
| Metric | Granularity | Target |
|--------|-------------|--------|
| Search QPS | Per instance, per cluster | Track; alert on deviation > 50% from baseline |
| Search latency (p50/p95/p99) | Per instance | p50 < 200ms, p95 < 500ms, p99 < 800ms |
| Elasticsearch query latency | Per query type | < 100ms p99 |
| ML ranking inference latency | Per instance | < 50ms p99 |
| Cache hit rate (Redis) | Per cluster | > 60% |
| Cache hit rate (Elasticsearch query cache) | Per shard | > 35% |
| Zero-result rate | Per location | < 5% (indicates index or geo coverage issue) |
| Stale result rate | Sampled | < 2% (listing booked but shown in results) |

#### Availability Service
| Metric | Granularity | Target |
|--------|-------------|--------|
| Lock acquisition latency (p50/p95/p99) | Per instance | p50 < 5ms, p95 < 20ms, p99 < 100ms |
| Lock acquisition failure rate | Per instance | < 0.5% (indicates contention) |
| Lock hold duration (p50/p95/p99) | Per instance | p50 < 50ms, p95 < 200ms, p99 < 5s |
| Lock timeout rate | Per instance | < 0.01% (lock held too long and expired) |
| Calendar read latency | Per instance | p99 < 50ms |
| Calendar write latency | Per instance | p99 < 100ms |
| Cache invalidation lag | Per cluster | < 1s p99 |
| iCal sync success rate | Per listing | > 95% |
| iCal sync latency | Per listing | < 30s p99 |

#### Booking Service
| Metric | Granularity | Target |
|--------|-------------|--------|
| Booking creation latency (p50/p95/p99) | Per instance | p50 < 200ms, p95 < 350ms, p99 < 500ms |
| Booking attempt rate | Per instance, per listing | Track; alert on spike |
| Booking failure rate by reason | Per reason code | Track individually |
| → Availability conflict (409) | - | Track; rising trend indicates index staleness |
| → Payment failure (402) | - | < 3% of attempts |
| → Validation error (422) | - | < 1% of attempts |
| → Internal error (5xx) | - | < 0.1% of attempts |
| Request-to-book approval rate | Per host | Track; < 50% triggers host coaching |
| Request-to-book response time | Per host | < 12 hours median |

#### Payment Service
| Metric | Granularity | Target |
|--------|-------------|--------|
| Authorization success rate | Per processor, per card type | > 97% |
| Authorization latency (p50/p95/p99) | Per processor | p50 < 500ms, p95 < 1.5s, p99 < 3s |
| Capture success rate | Per processor | > 99.5% |
| Hold expiry rate | Daily | < 0.5% (holds expiring before capture) |
| Refund processing latency | Per request | < 5 business days |
| Payout success rate | Per method type | > 99% |
| Payout latency (initiation to completion) | Per method | Track; alert > 5 business days |
| Chargeback rate | Monthly | < 0.1% (industry threshold for gateway termination) |
| Reconciliation discrepancy rate | Daily | < 0.01% |

#### Trust & Safety Service
| Metric | Granularity | Target |
|--------|-------------|--------|
| Risk assessment latency (p50/p99) | Per instance | p50 < 50ms, p99 < 200ms |
| Fraud detection true positive rate | Weekly | > 80% |
| Fraud detection false positive rate | Weekly | < 5% |
| Identity verification success rate | Daily | > 85% |
| Identity verification latency | Per request | < 30s (automated), < 24h (manual) |
| Content moderation queue depth | Continuous | < 1000 items |
| Content moderation SLA compliance | Daily | > 95% reviewed within 24h |

---

## 2. Critical Alerts

### 2.1 P1 Alerts (Page Immediately)

| Alert | Condition | Impact | Runbook |
|-------|-----------|--------|---------|
| **Double booking detected** | Any booking created for already-booked dates | Platform integrity | Immediately cancel second booking; investigate lock failure; notify affected parties |
| **Booking service error rate > 1%** | 5xx rate exceeds 1% for 2 minutes | Revenue loss | Check downstream dependencies (Availability, Payment); check DB connectivity |
| **Payment service error rate > 0.5%** | 5xx rate exceeds 0.5% for 2 minutes | Revenue loss + guest impact | Check payment gateway connectivity; circuit breaker status; fallback to backup processor |
| **Calendar lock timeout rate > 0.5%** | Lock TTL expirations > 0.5% of acquisitions | Risk of availability data corruption | Check Redis cluster health; check for long-running transactions; increase TTL if DB is slow |
| **Database primary unreachable** | Health check failures for 15 seconds | All writes blocked | Verify automatic failover triggered; if not, manual promotion of standby |
| **Payment hold capture failure rate > 1%** | Capture attempts failing for confirmed bookings | Guests not charged; revenue loss | Check gateway status; verify hold references valid; manual intervention for affected bookings |
| **Chargeback rate > 0.1%** | Monthly chargeback rate exceeds threshold | Gateway contract at risk | Increase fraud detection thresholds; add 3DS requirement; review recent fraud patterns |

### 2.2 P2 Alerts (Respond within 15 minutes)

| Alert | Condition | Impact |
|-------|-----------|--------|
| **Search latency p99 > 2s** | Sustained for 5 minutes | Degraded user experience, reduced bookings |
| **Elasticsearch cluster health: YELLOW** | Replica shards unassigned | Reduced query throughput; single point of failure |
| **Redis cluster node down** | One master node unreachable | Reduced cache capacity; lock manager degraded |
| **Event stream consumer lag > 5 minutes** | Calendar events not processed | Search index staleness; increased 409 conflicts |
| **Payout failure rate > 2%** | Host payouts failing | Host trust impact |
| **Identity verification service down** | External provider unreachable for 10 minutes | New user onboarding blocked |

### 2.3 P3 Alerts (Respond within 1 hour)

| Alert | Condition | Impact |
|-------|-----------|--------|
| **Search latency p99 > 1s** | Sustained for 15 minutes | Slightly degraded experience |
| **Cache hit rate drops below 40%** | Redis hit rate decline | Increased database load |
| **iCal sync failure rate > 10%** | External calendar sync failing | Risk of cross-platform double bookings |
| **Review submission rate drops > 20%** | Week-over-week decline | Potential review service issue |
| **Photo upload error rate > 5%** | Upload/processing failures | Host onboarding friction |
| **Notification delivery rate < 95%** | Email/push delivery failures | Guest/host may miss booking updates |

---

## 3. Logging Strategy

### 3.1 Structured Log Format

```
{
  "timestamp": "2025-07-15T10:30:45.123Z",
  "level": "INFO",
  "service": "booking-service",
  "instance_id": "booking-svc-7b4d9-abc12",
  "trace_id": "abc123def456",
  "span_id": "789ghi012",
  "correlation_ids": {
    "request_id": "req-uuid-001",
    "booking_id": "book-uuid-001",
    "listing_id": "list-uuid-001",
    "user_id": "user-uuid-001"
  },
  "event": "booking.created",
  "message": "Booking confirmed for listing",
  "attributes": {
    "check_in": "2025-07-20",
    "check_out": "2025-07-25",
    "nights": 5,
    "total_amount": 942.38,
    "booking_type": "instant_book",
    "lock_duration_ms": 85,
    "payment_auth_duration_ms": 1250
  },
  "duration_ms": 1450
}
```

### 3.2 Log Levels by Service

| Service | DEBUG | INFO | WARN | ERROR |
|---------|-------|------|------|-------|
| Booking | Lock details, DB queries | Booking created/cancelled | Retry attempts, slow queries | Failed bookings, DB errors |
| Payment | Gateway request/response (redacted) | Auth/capture/refund events | Hold expiry warnings, retry | Payment failures, reconciliation mismatches |
| Availability | Lock acquire/release | Calendar updates, iCal sync | Lock contention warnings | Lock timeouts, DB write failures |
| Search | Query construction details | Search executed, results count | Slow queries, cache misses | ES cluster errors, ML service failures |
| Trust | Risk signal details | Verification results | Elevated risk bookings | Blocked bookings, fraud detections |

### 3.3 PII in Logs

```
PII handling rules:
  NEVER log:  credit card numbers, passwords, government ID numbers, full bank account numbers
  HASH:       email addresses, phone numbers (log hashed versions for correlation)
  MASK:       IP addresses (last octet zeroed for analytics logs)
  ALLOW:      user UUIDs, booking IDs, listing IDs, amounts, dates, status codes

  Example:
    WRONG: "Guest john@email.com booked with card 4242424242424242"
    RIGHT: "Guest user-uuid-001 booked with card ending 4242"
```

---

## 4. Distributed Tracing

### 4.1 Trace Scope

Every user-facing request generates a trace that spans all involved services:

```
Booking creation trace:
  Span 1: API Gateway (auth, rate limit, routing)          [5ms]
    └─ Span 2: Booking Service (orchestration)             [total: 1450ms]
       ├─ Span 3: Trust Service (risk assessment)          [45ms]
       ├─ Span 4: Availability Service (check + reserve)   [85ms]
       │    ├─ Span 5: Redis (lock acquire)                [2ms]
       │    ├─ Span 6: PostgreSQL (calendar read)          [15ms]
       │    ├─ Span 7: PostgreSQL (calendar write)         [20ms]
       │    └─ Span 8: Redis (lock release + cache update) [3ms]
       ├─ Span 9: Payment Service (authorize)              [1250ms]
       │    └─ Span 10: Payment Gateway (external)         [1200ms]
       ├─ Span 11: PostgreSQL (create booking record)      [25ms]
       └─ Span 12: Event Stream (publish event)            [5ms]
           └─ (async) Span 13: Notification Service        [200ms]
```

### 4.2 Trace Sampling Strategy

| Request Type | Sample Rate | Rationale |
|-------------|-------------|-----------|
| Booking creation | 100% | Every booking traced (low volume, high value) |
| Booking cancellation | 100% | Every cancellation traced |
| Payment operations | 100% | All financial transactions traced |
| Search queries | 5% | High volume; sample sufficient for latency analysis |
| Listing page views | 1% | Very high volume; minimal unique insights per request |
| Calendar reads | 2% | High volume; sample for cache hit analysis |
| Health checks | 0% | No diagnostic value |

### 4.3 Critical Trace Annotations

```
Booking traces include these custom annotations:
  booking.type:              "instant_book" | "request_to_book"
  booking.listing_popularity: "hot" | "normal" | "cold"
  availability.lock_waited:   true | false
  availability.lock_duration_ms: number
  payment.gateway_used:       "processor_a" | "processor_b"
  payment.3ds_required:       true | false
  trust.risk_score:           0.0 - 1.0
  trust.action:               "allow" | "verify" | "review" | "block"
```

---

## 5. SLO Dashboards

### 5.1 Primary SLO Dashboard

```
Dashboard: "Platform Health - SLO Overview"
Refresh: 30 seconds

Panels:
┌────────────────────────────────────────────────────────────┐
│  Booking SLO: 99.99%                                       │
│  Current: 99.97%  ▼  Error budget: 2.1 min remaining       │
│  [=====================================---------]           │
│  30-day trend: ~~~~~~~~~~~~                                │
├──────────────────────────────┬─────────────────────────────┤
│  Search Availability: 99.9%  │  Search Latency p99: 800ms  │
│  Current: 99.95%  ✓          │  Current: 620ms  ✓          │
│  Budget: 38 min remaining    │  1h trend: ～～～～          │
├──────────────────────────────┼─────────────────────────────┤
│  Payment Success: 99.99%     │  Calendar Lock p99: 100ms   │
│  Current: 99.98%  ✓          │  Current: 45ms  ✓           │
│  Budget: 3.8 min remaining   │  1h trend: ～～～～          │
├──────────────────────────────┼─────────────────────────────┤
│  Double Booking Rate: 0%     │  Payout Timeliness: 99.5%   │
│  Current: 0%  ✓              │  Current: 99.8%  ✓          │
│  Any occurrence = P1         │  Budget: on track            │
└──────────────────────────────┴─────────────────────────────┘
```

### 5.2 Booking Funnel Dashboard

```
Dashboard: "Booking Funnel Health"
Refresh: 1 minute

Funnel visualization:
  Searches:              100,000    (100%)
  └─ Listing clicks:     42,000    (42%)
     └─ Booking attempts:  3,500    (3.5%)
        └─ Avail check pass: 3,100  (88.6% of attempts)
           └─ Payment auth pass: 2,950 (95.2% of checks)
              └─ Booking confirmed: 2,900 (98.3% of auths)

Drop-off analysis:
  Avail → Payment (11.4% drop): Calendar conflicts
  Payment → Confirmed (4.8% drop): Payment failures
  Auth → Booking (1.7% drop): System errors

Trend: Compare to same hour yesterday, same day last week
```

### 5.3 Per-Service Dashboard Template

```
Dashboard: "{Service Name} Health"
Refresh: 30 seconds

Row 1: Golden Signals
  ├─ Request rate (QPS): time series with 7-day overlay
  ├─ Error rate (%): time series with SLO threshold line
  ├─ Latency (p50/p95/p99): time series
  └─ Saturation: CPU, memory, connections, queue depth

Row 2: Service-Specific Metrics
  (varies by service - see section 1.2)

Row 3: Dependencies
  ├─ Downstream service latency
  ├─ Database query latency
  ├─ Cache hit rate
  └─ Circuit breaker status (CLOSED/OPEN/HALF-OPEN)

Row 4: Infrastructure
  ├─ Pod count (current vs. desired)
  ├─ CPU/memory per pod
  ├─ Network I/O
  └─ Recent deployments (marked as annotations on charts)
```

---

## 6. Anomaly Detection

### 6.1 Automated Anomaly Detection

```
Monitored signals with automated anomaly detection:

  1. Booking rate:
     → Model: Seasonal decomposition (hourly, daily, weekly patterns)
     → Alert if actual < predicted - 3σ for 10 minutes
     → Indicates: payment issues, availability bugs, or UX regression

  2. Search-to-booking conversion:
     → Model: Moving average with confidence bands
     → Alert if conversion drops > 30% vs. 7-day average
     → Indicates: ranking degradation, pricing issues, or trust signals

  3. Payment authorization rate:
     → Model: Per-processor baseline
     → Alert if rate drops > 2% below baseline for 5 minutes
     → Indicates: processor outage or fraud rule change

  4. Calendar lock contention:
     → Model: Baseline contention rate per time-of-day
     → Alert if contention > 3x baseline for 10 minutes
     → Indicates: hot listing spike or lock manager degradation

  5. iCal sync success rate:
     → Model: Per-listing historical success rate
     → Alert if > 20% of syncs failing for 1 hour
     → Indicates: external calendar feed issues or parsing bugs
```

---

## 7. Runbooks

### 7.1 High Booking Error Rate Runbook

```
Trigger: Booking service 5xx rate > 1% for 2 minutes

Step 1: Identify error type
  → Query: booking service error logs, last 5 minutes, group by error type
  → Common types: DB connection, lock timeout, payment gateway, validation

Step 2: Check downstream dependencies
  → Dashboard: booking service dependency health
  → Check: Availability Service (locks), Payment Service, Calendar DB
  → Each has its own health endpoint and latency metrics

Step 3: If Availability Service issue:
  → Check Redis cluster health (lock manager)
  → Check Calendar DB replication lag
  → If Redis node down: verify automatic failover; may need manual promotion

Step 4: If Payment Service issue:
  → Check payment gateway circuit breaker status
  → If primary gateway open: verify backup gateway routing
  → If all gateways down: enable "deferred payment" mode (accept booking, retry payment)

Step 5: If Database issue:
  → Check connection pool exhaustion
  → Check slow query log for queries > 1s
  → Check disk I/O and CPU on database primary
  → If primary down: verify automatic failover to standby

Step 6: Mitigation applied → monitor error rate for 10 minutes
  → If recovering: close incident
  → If not recovering: escalate to P1, engage database/infrastructure team
```

### 7.2 Calendar Lock Timeout Escalation Runbook

```
Trigger: Lock timeout rate > 0.5% for 5 minutes

Step 1: Check lock hold duration distribution
  → If p99 lock hold > 5s: indicates slow downstream (DB or payment)
  → If p99 lock hold < 1s but timeouts occurring: indicates Redis issue

Step 2: Check for hot listings
  → Query: lock acquisition attempts per listing, last 15 minutes, top 10
  → If one listing has 10x normal traffic: likely viral listing
  → Mitigation: enable queue-based booking for that specific listing

Step 3: Check Redis cluster health
  → Memory usage, CPU, connection count, replication lag
  → If a master node is overloaded: check key distribution across slots

Step 4: Check Calendar DB performance
  → Slow query log for listing_calendar queries
  → Connection pool utilization
  → Index health (REINDEX if needed, but schedule during low traffic)

Step 5: Temporary mitigation
  → Reduce lock TTL from 10s to 5s (faster lock release on abandoned attempts)
  → Increase lock retry delay from 2s to 5s (reduce contention)
  → Enable "fast fail" mode: if lock not acquired in 500ms, return 409 immediately
```
