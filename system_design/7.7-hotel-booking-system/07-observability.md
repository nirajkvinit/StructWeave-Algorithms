# Observability

## Key Metrics

### Business Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **Booking conversion rate** | Bookings / unique search sessions | 2-4% | < 1.5% (30-min window) |
| **Search-to-detail rate** | Property detail views / searches | 30-40% | < 20% (30-min window) |
| **Detail-to-book rate** | Bookings / property detail views | 8-12% | < 5% (30-min window) |
| **Hold-to-confirm rate** | Confirmed bookings / holds created | 70-80% | < 50% (30-min window) |
| **Cancellation rate** | Cancellations / bookings (7-day rolling) | < 25% | > 35% |
| **Revenue per search** | Total booking revenue / searches | Varies by market | < 50% of 7-day average |
| **Average daily rate (ADR)** | Total room revenue / rooms sold | Varies by market | Tracked, not alerted |
| **Occupancy rate** | Rooms sold / rooms available | Varies by property | Tracked, not alerted |
| **RevPAR** | Revenue per available room (ADR × occupancy) | Varies | Tracked, not alerted |

### System Performance Metrics

| Metric | Description | SLO | Alert Threshold |
|--------|-------------|-----|-----------------|
| **Search latency p50** | Median search response time | < 800ms | > 1.2s (5-min window) |
| **Search latency p99** | 99th percentile search response | < 2s | > 3s (5-min window) |
| **Availability check latency p99** | Per-property availability lookup | < 200ms | > 500ms |
| **Booking confirmation latency p99** | End-to-end booking flow | < 3s | > 5s |
| **Payment success rate** | Successful payments / payment attempts | > 99% | < 97% (15-min window) |
| **Channel sync latency p99** | Time from booking to all-channel update | < 5s | > 15s |
| **Channel sync success rate** | Successful syncs / total sync attempts | > 99.9% | < 99% (1-hour window) |
| **Hold expiry rate** | Expired holds / total holds | < 30% | > 50% (1-hour window) |
| **Cache hit rate (search)** | Cache hits / total search queries | > 60% | < 40% (15-min window) |
| **Cache hit rate (availability)** | Cache hits / availability lookups | > 50% | < 30% |

### Infrastructure Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| **DB connection pool utilization** | Active connections / pool size | > 80% |
| **DB replication lag** | Standby lag behind primary | > 1 second |
| **Event bus consumer lag** | Unconsumed messages per partition | > 10,000 messages |
| **Redis memory utilization** | Used memory / max memory | > 75% |
| **Search index refresh latency** | Time from update to searchable | > 5 seconds |
| **Availability shard CPU** | Per-shard CPU utilization | > 70% |
| **Payment gateway latency p99** | Response time from payment provider | > 3 seconds |

---

## Logging Strategy

### Log Levels and Categories

```
Log levels:
  ERROR:  Payment failures, booking failures, data inconsistencies
  WARN:   Circuit breaker state changes, high latency, retry events
  INFO:   Booking confirmed, cancellation processed, channel sync complete
  DEBUG:  Availability check details, rate computation steps, cache hit/miss
```

### Structured Log Format

```
{
  "timestamp": "2025-12-20T14:30:22.456Z",
  "level": "INFO",
  "service": "booking-orchestrator",
  "trace_id": "abc-123-def-456",
  "span_id": "span-789",
  "event": "booking_confirmed",
  "reservation_id": "RES-456",
  "property_id": "P-1234",
  "total_amount": 607.50,
  "currency": "USD",
  "payment_method": "credit_card",
  "booking_source": "direct",
  "duration_ms": 1847,
  "steps": {
    "availability_check_ms": 45,
    "rate_computation_ms": 12,
    "payment_preauth_ms": 890,
    "payment_capture_ms": 780,
    "reservation_create_ms": 120
  }
}
```

### Key Log Events

| Event | Level | Service | Purpose |
|-------|-------|---------|---------|
| `search_executed` | INFO | Search | Track search patterns, latency, result count |
| `availability_check` | DEBUG | Availability | Cache hit/miss, available rooms, query latency |
| `hold_created` | INFO | Booking | Hold ID, property, dates, expiry time |
| `hold_expired` | INFO | Booking | Hold ID, property, dates (indicates abandoned booking) |
| `booking_confirmed` | INFO | Booking | Full booking details, timing breakdown |
| `booking_cancelled` | INFO | Booking | Cancellation reason, refund amount, penalty |
| `payment_failed` | ERROR | Payment | Failure reason, gateway error code, retry count |
| `payment_captured` | INFO | Payment | Amount, gateway reference, timing |
| `channel_sync_sent` | INFO | Channel Mgr | Channel, property, payload summary, latency |
| `channel_sync_failed` | ERROR | Channel Mgr | Channel, error, retry count, will-retry flag |
| `circuit_breaker_open` | WARN | Any | Service, target, failure count, open duration |
| `overbooking_detected` | WARN | Availability | Property, date, overbooked count, walk risk |
| `rate_parity_violation` | WARN | Channel Mgr | Property, channel, rate deviation |
| `review_fraud_flagged` | WARN | Review | Review ID, fraud score, fraud signals |

### Sensitive Data Handling in Logs

```
NEVER log:
  - Full credit card numbers
  - CVV / CVC codes
  - Guest passwords or authentication tokens
  - Full email addresses (log hash or masked version)

Mask in logs:
  - Guest name: "J*** D***"
  - Email: "j***@example.com"
  - Phone: "+33*****678"
  - Card: "****1234"
```

---

## Distributed Tracing

### Trace Propagation

```
Every user request receives a trace_id at the API Gateway.
The trace_id propagates through all service calls:

Search trace example:
  [trace: abc-123]
    → API Gateway (5ms)
      → BFF Service (3ms)
        → Search Service (780ms)
          → Search Index query (120ms)
          → Availability Service - batch check (450ms)
            → Redis cache check (2ms)
            → DB query for cache misses (380ms)
          → Rate Service - compute rates (180ms)
            → Redis rate cache (1ms)
            → Rate computation (150ms)
        → Response serialization (15ms)

Booking trace example:
  [trace: def-456]
    → API Gateway (5ms)
      → BFF Service (3ms)
        → Booking Orchestrator (1847ms)
          → Availability Service - check+hold (45ms)
          → Rate Service - verify price (12ms)
          → Payment Service - pre-auth (890ms)
            → Payment Gateway API call (850ms)
          → Reservation DB write (120ms)
          → Payment Service - capture (780ms)
            → Payment Gateway API call (740ms)
        → Event Bus publish (5ms)
          → Channel Manager (async, not in request path)
          → Notification Service (async, not in request path)
```

### Trace Sampling Strategy

```
Sampling rates:
  - Booking flow: 100% (every booking is traced - revenue critical)
  - Search flow: 10% (high volume, sample sufficiently)
  - Payment flow: 100% (financial compliance)
  - Channel sync: 100% (reliability critical)
  - Review submission: 50%
  - Property extranet: 20%

Error traces: always captured (100%) regardless of sampling rate
Slow traces (> 2× SLO): always captured
```

---

## Alerting Rules

### Critical Alerts (Page On-Call)

| Alert | Condition | Window | Action |
|-------|-----------|--------|--------|
| Booking success rate drop | < 95% | 5 min | Investigate payment or availability service |
| Payment failure spike | > 5% failure rate | 5 min | Check payment gateway status; failover if needed |
| Availability service down | Health check failures on > 50% of shards | 1 min | Trigger failover; scale remaining shards |
| All channel sync failing | 0 successful syncs for any channel | 5 min | Check channel API status; open circuit breaker |
| Database replication lag | > 10 seconds | 1 min | Investigate standby; prepare for failover |
| Zero bookings | No bookings processed | 10 min | Investigate full pipeline (search → book → pay) |

### Warning Alerts (Notification)

| Alert | Condition | Window | Action |
|-------|-----------|--------|--------|
| Search latency degradation | p99 > 3s | 15 min | Check search index health; cache hit rates |
| Conversion rate drop | < 1.5% | 30 min | Check search quality; price competitiveness |
| Hold expiry rate high | > 50% | 1 hour | Check payment flow; UX issues; bot activity |
| Channel sync latency high | p99 > 30s | 15 min | Check channel API latency; scale sync workers |
| Cache hit rate low | < 40% search cache | 15 min | Check cache cluster health; invalidation storm |
| Overbooking risk | Property > 95% of overbooking limit | Continuous | Notify property manager; consider closing sales |
| Event bus consumer lag | > 50,000 messages | 5 min | Scale consumer workers |

---

## Booking Funnel Analytics

### Funnel Stages

```
Stage 1: Search
  - Unique search sessions
  - Search refinements per session
  - Popular destinations and dates
  - Filter usage patterns

Stage 2: Property View
  - Click-through rate from search results
  - Time spent on property page
  - Room type comparison rate
  - Photo gallery engagement

Stage 3: Room Selection
  - Room type selected
  - Rate plan selected (flexible vs. non-refundable)
  - Rate plan comparison time

Stage 4: Hold
  - Hold creation success rate
  - Hold creation latency
  - Hold expiry rate (abandoned at payment)

Stage 5: Payment
  - Payment method distribution
  - Payment success rate
  - Payment failure reasons
  - Time to complete payment form

Stage 6: Confirmation
  - Booking confirmation success rate
  - Time from search start to confirmation
  - Booking source distribution (direct vs. channel)

Stage 7: Post-Booking
  - Modification rate
  - Cancellation rate and timing
  - Review submission rate
  - Repeat booking rate
```

### Funnel Dashboard

```
Real-time funnel metrics (updated every minute):

  Searches         ████████████████████████████████  50,000/hr (100%)
  Property Views   ██████████████                    18,000/hr (36%)
  Room Selections  ████████                           8,000/hr (16%)
  Holds Created    ██████                             5,500/hr (11%)
  Payments Made    ████                               4,200/hr (8.4%)
  Confirmed        ████                               3,800/hr (7.6%)
                                                      ↑ alerts if < 3%

Drop-off analysis:
  Search → View:    64% drop (normal: users browse)
  View → Selection: 56% drop (price sensitivity, comparison shopping)
  Selection → Hold: 31% drop (availability issues, rate changes)
  Hold → Payment:   24% drop (payment friction, price shock at total)
  Payment → Confirm: 10% drop (payment failures, technical errors)
```

### A/B Testing Observability

```
Every search and booking event includes:
  - experiment_id: active A/B test identifier
  - variant: control or treatment
  - user_segment: new, returning, loyalty member

This enables:
  - Conversion rate comparison per variant
  - Revenue impact estimation
  - Statistical significance calculation
  - Automatic rollback if variant degrades key metrics
```

---

## Health Checks

```
Service health check endpoints:
  GET /health/live   → 200 if process is running
  GET /health/ready  → 200 if service can handle requests

Readiness check includes:
  - Database connection pool has available connections
  - Redis cluster is reachable
  - Event bus producer can connect
  - Payment gateway is reachable (for Payment Service)
  - Search index is queryable (for Search Service)

Health check interval: 5 seconds
Failure threshold: 3 consecutive failures → mark unhealthy
Recovery threshold: 2 consecutive successes → mark healthy
```
