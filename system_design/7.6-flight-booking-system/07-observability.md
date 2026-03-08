# Observability

## Key Metrics

### Search Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `search.latency.p50` | Median search response time | < 1.5s | > 2s for 5 min |
| `search.latency.p95` | 95th percentile search latency | < 2.5s | > 3.5s for 5 min |
| `search.latency.p99` | 99th percentile search latency | < 3s | > 5s for 5 min |
| `search.throughput` | Searches per second | ~1,160 avg | < 500 (unexpected drop) |
| `search.cache.hit_rate` | L2 cache hit percentage | > 80% | < 60% for 10 min |
| `search.results.count.avg` | Average results per search | > 30 | < 10 (provider issue) |
| `search.empty_results_rate` | % of searches with zero results | < 5% | > 15% for 10 min |
| `search.fanout.provider_count` | Providers queried per search (avg) | 4-5 | < 3 (circuit breakers open) |

### GDS Provider Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `gds.{provider}.latency.p50` | Provider-specific response time | < 1s | > 2s for 5 min |
| `gds.{provider}.latency.p99` | Provider tail latency | < 2s | > 3s for 5 min |
| `gds.{provider}.success_rate` | % successful calls | > 99% | < 95% for 5 min |
| `gds.{provider}.timeout_rate` | % calls that timeout | < 1% | > 5% for 5 min |
| `gds.{provider}.circuit_state` | CLOSED / OPEN / HALF_OPEN | CLOSED | OPEN for > 2 min |
| `gds.{provider}.calls_per_sec` | API call rate (cost tracking) | varies | > 2× normal |
| `gds.all_providers.healthy_count` | Number of healthy providers | 5 | < 3 |

### Booking Funnel Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `booking.hold.latency.p99` | Time to create seat hold | < 3s | > 5s for 5 min |
| `booking.hold.success_rate` | % successful holds | > 95% | < 85% for 10 min |
| `booking.hold.expiry_rate` | % holds that expire without payment | < 30% | > 50% (UX issue?) |
| `booking.payment.latency.p99` | Payment processing time | < 3s | > 5s for 5 min |
| `booking.payment.success_rate` | % successful payments | > 98% | < 95% for 10 min |
| `booking.ticket.latency.p99` | Time to issue ticket | < 5s | > 10s for 5 min |
| `booking.ticket.success_rate` | % successful ticket issuances | > 99% | < 95% for 5 min |
| `booking.conversion.search_to_hold` | Search → hold conversion | ~1% | < 0.3% (pricing issue?) |
| `booking.conversion.hold_to_ticket` | Hold → ticket conversion | ~70% | < 50% (payment/UX issue) |
| `booking.saga.failure_rate` | % sagas that require compensation | < 2% | > 5% for 10 min |
| `booking.saga.stuck_count` | Sagas in incomplete state > 30 min | 0 | > 5 |

### Inventory Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `inventory.sync.lag_seconds` | Time since last GDS inventory sync | < 300s | > 600s |
| `inventory.sold_out.false_positive_rate` | Local shows available, GDS says sold out | < 5% | > 15% |
| `inventory.hold_release.pending_count` | Expired holds awaiting cleanup | < 100 | > 500 |
| `inventory.hold_release.latency.p99` | Time to release expired hold | < 5s | > 30s |

### Price Alert Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `alerts.active_count` | Number of active price alerts | monitoring | > 10M (resource concern) |
| `alerts.check_latency.p99` | Time to check one alert | < 500ms | > 2s |
| `alerts.trigger_rate` | % alerts triggered per check cycle | monitoring | sudden spike (data issue?) |
| `alerts.delivery_latency.p99` | Time from trigger to user notification | < 30 min | > 1 hour |

---

## Booking Funnel Dashboard

```
Funnel visualization (real-time, last 24 hours):

     Search Requests    ████████████████████████████ 100M (100%)
           │
     Results Returned   ███████████████████████████  95M  (95%)
           │
     Fare Selected      █████                        5M   (5%)
           │
     Hold Created       ████                         4M   (4%)
           │
     Payment Attempted  ███                          3M   (3%)
           │
     Payment Succeeded  ██▌                          2.8M (2.8%)
           │
     Ticket Issued      ██▌                          2.7M (2.7%)
           │
     Booking Confirmed  ██▌                          2.7M (2.7%)

Drop-off analysis:
├── Search → Results:    5% empty results (niche routes, past dates)
├── Results → Select:   95% browse-only (price comparison, not ready to book)
├── Select → Hold:      20% price changed at verification, 5% sold out
├── Hold → Payment:     25% abandoned (price too high, user distracted, hold expired)
├── Payment → Ticket:    7% payment failures (declined cards, 3DS failures)
├── Ticket → Confirmed:  < 1% GDS ticketing failures (manual resolution queue)
```

---

## Alert Tiers

### Tier 1: Critical (Page On-Call Immediately)

| Alert | Condition | Impact |
|-------|-----------|--------|
| **All GDS Unhealthy** | `gds.all_providers.healthy_count < 2` for 2 min | Booking impossible, search severely degraded |
| **Booking Service Down** | `booking.ticket.success_rate < 50%` for 5 min | Revenue loss, customer impact |
| **Payment Gateway Down** | `booking.payment.success_rate < 80%` for 5 min | Cannot complete bookings |
| **Database Primary Unreachable** | PostgreSQL primary health check fails | All writes blocked |
| **Saga Stuck Queue Growing** | `booking.saga.stuck_count > 20` | Tickets not being issued, manual intervention needed |

### Tier 2: Warning (Notify On-Call, 15-min Response)

| Alert | Condition | Impact |
|-------|-----------|--------|
| **Search Latency Degraded** | `search.latency.p99 > 5s` for 10 min | User experience degradation |
| **Cache Hit Rate Low** | `search.cache.hit_rate < 60%` for 15 min | GDS cost spike, higher latency |
| **Single GDS Unhealthy** | `gds.{provider}.circuit_state == OPEN` for 5 min | Reduced search results from one source |
| **Hold Expiry Rate High** | `booking.hold.expiry_rate > 50%` for 30 min | UX issue or bot activity |
| **Inventory Sync Stale** | `inventory.sync.lag_seconds > 600` | Stale availability data |
| **Hold Release Backlog** | `inventory.hold_release.pending_count > 500` | Phantom sold-out seats |

### Tier 3: Informational (Daily Review)

| Alert | Condition | Purpose |
|-------|-----------|---------|
| **Conversion Rate Change** | `booking.conversion.search_to_hold` changes > 20% | Business metric tracking |
| **GDS Cost Spike** | `gds.{provider}.calls_per_sec` > 2× baseline | Budget monitoring |
| **Search Volume Anomaly** | Search traffic > 3× or < 0.5× expected | Traffic anomaly detection |
| **Price Alert Backlog** | Alert check cycle > 2 hours behind | Feature degradation |

---

## Distributed Tracing

### Trace Context

Every request carries a trace ID through the entire flow:

```
Search trace example:
trace_id: "abc-123-def-456"
├── span: API Gateway (2ms)
│   └── span: BFF Service (5ms)
│       └── span: Search Aggregation (1,800ms total)
│           ├── span: Redis L2 Cache check (2ms) → MISS
│           ├── span: Amadeus API call (820ms) → 45 results
│           ├── span: Sabre API call (1,200ms) → 38 results
│           ├── span: Travelport API call (1,500ms) → 40 results
│           ├── span: BA NDC API call (600ms) → 12 results
│           ├── span: Norwegian LCC call (TIMEOUT at 2,000ms) → 0 results
│           ├── span: Deduplication (15ms) → 72 unique
│           ├── span: Pricing enrichment (50ms)
│           ├── span: Ranking (8ms)
│           └── span: Redis cache write (3ms)

Booking trace example:
trace_id: "xyz-789-uvw-012"
├── span: API Gateway (2ms)
│   └── span: BFF Service (3ms)
│       └── span: Booking Orchestrator (3,200ms total)
│           ├── span: Inventory check (15ms)
│           ├── span: GDS createPNR (1,800ms) → PNR "ABC123"
│           ├── span: Inventory decrement (10ms)
│           ├── span: PNR Service create booking (25ms)
│           └── span: Redis hold key set (2ms)
│       --- (user fills payment form) ---
│       └── span: Payment Processing (2,100ms total)
│           ├── span: Fare re-verification (800ms)
│           ├── span: Payment gateway charge (1,200ms)
│           ├── span: GDS issue ticket (1,500ms)
│           ├── span: PNR Service update (20ms)
│           └── span: Kafka publish event (5ms)
```

### Trace Sampling Strategy

```
Sampling rules:
├── Booking flows: 100% sampled (low volume, high value)
├── Search flows: 1% sampled (high volume)
├── Search with errors: 100% sampled (always capture failures)
├── Search with latency > 5s: 100% sampled (capture slow requests)
├── GDS timeout: 100% sampled (capture provider issues)
└── Saga compensations: 100% sampled (capture failure paths)
```

---

## Structured Logging

### Log Schema

```
Standard log fields:
{
  "timestamp": "2024-12-15T14:30:00.123Z",
  "level": "INFO|WARN|ERROR",
  "service": "search-aggregation",
  "trace_id": "abc-123",
  "span_id": "span-456",
  "user_id": "usr-789",          // hashed in non-debug environments
  "booking_id": "BK-012",       // if applicable
  "pnr_code": "ABC123",         // if applicable
  "action": "gds_search|hold_seat|charge_payment|issue_ticket",
  "provider": "amadeus|sabre|travelport",
  "duration_ms": 1200,
  "status": "success|failure|timeout",
  "error_code": "GDS_TIMEOUT|SOLD_OUT|PAYMENT_DECLINED",
  "message": "Human-readable description"
}

PII redaction (automatic):
├── passport_number → "****5678"
├── email → "j***@e***.com"
├── phone → "***-***-4567"
├── card_token → NEVER logged
└── full_name → logged as-is (support needs it)
```

### Key Log Events

| Event | Level | When | Purpose |
|-------|-------|------|---------|
| `search.completed` | INFO | Every search | Latency tracking, result count |
| `search.cache_hit` | DEBUG | Cache hit | Cache effectiveness |
| `gds.call.completed` | INFO | Every GDS call | Provider performance tracking |
| `gds.circuit.state_change` | WARN | Circuit state changes | Provider health monitoring |
| `booking.hold.created` | INFO | Seat hold | Booking funnel tracking |
| `booking.hold.expired` | INFO | Hold TTL expires | Hold-to-book conversion |
| `booking.payment.completed` | INFO | Payment processed | Revenue tracking |
| `booking.ticket.issued` | INFO | Ticket issued | Booking completion |
| `booking.saga.compensation` | WARN | Saga rollback | Failure analysis |
| `booking.saga.stuck` | ERROR | Saga incomplete > 30 min | Manual intervention needed |
| `inventory.sync.stale` | WARN | Sync lag > 5 min | Data freshness issue |
| `security.suspicious_activity` | WARN | Bot detection, unusual patterns | Security monitoring |

---

## Health Check Endpoints

```
GET /health
Response:
{
  "status": "HEALTHY|DEGRADED|UNHEALTHY",
  "timestamp": "2024-12-15T14:30:00Z",
  "checks": {
    "database": {"status": "UP", "latency_ms": 5},
    "redis": {"status": "UP", "latency_ms": 2},
    "kafka": {"status": "UP", "lag": 150},
    "amadeus": {"status": "UP", "circuit": "CLOSED", "latency_p50_ms": 800},
    "sabre": {"status": "UP", "circuit": "CLOSED", "latency_p50_ms": 1100},
    "travelport": {"status": "DEGRADED", "circuit": "HALF_OPEN", "latency_p50_ms": 2500},
    "payment_gateway": {"status": "UP", "latency_ms": 200}
  }
}

Aggregation logic:
├── HEALTHY: all critical services UP
├── DEGRADED: 1+ GDS provider unhealthy OR non-critical service down
└── UNHEALTHY: database OR payment gateway OR all GDS providers down
```

---

## GDS Cost Monitoring Dashboard

```
Real-time cost tracking:

Daily GDS API call budget:
├── Amadeus:    calls today: 12.5M / budget: 15M (83%)  [$9.4M spent]
├── Sabre:      calls today: 10.2M / budget: 12M (85%)  [$7.7M spent]
├── Travelport: calls today:  8.1M / budget: 10M (81%)  [$6.1M spent]
├── NDC APIs:   calls today:  3.8M / budget: 5M  (76%)  [$1.9M spent]
└── Total:      calls today: 34.6M / budget: 42M (82%)  [$25.1M spent]

Cache savings today:
├── Cache hits:           65.4M searches (65.4%)
├── Avoided GDS calls:    65.4M × 5 providers = 327M calls avoided
├── Estimated savings:    327M × $0.75 = $245M saved
└── Cache investment:     Redis cluster: $50K/month (~$1.7K/day)
```
