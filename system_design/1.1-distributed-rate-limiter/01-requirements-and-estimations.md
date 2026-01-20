# Requirements & Capacity Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features (In Scope)

1. **Rate Limit Enforcement**
   - Limit requests per user/client/API key within a time window
   - Support multiple granularities: per-second, per-minute, per-hour, per-day
   - Return appropriate response when limit exceeded (HTTP 429)

2. **Multiple Limiting Dimensions**
   - By User ID (authenticated requests)
   - By IP Address (unauthenticated/anonymous requests)
   - By API Key (service-to-service)
   - By Endpoint (different limits for different APIs)
   - Composite keys (e.g., user + endpoint)

3. **Configurable Limits**
   - Define different limits for different user tiers (free, premium, enterprise)
   - Support dynamic limit updates without service restart
   - Allow temporary limit overrides (burst allowances)

4. **Rate Limit Information**
   - Return remaining quota in response headers
   - Provide time-to-reset information
   - Support quota inquiry endpoint

5. **Multiple Algorithm Support**
   - Token Bucket (burst-tolerant)
   - Sliding Window (accurate)
   - Fixed Window (simple)

### Out of Scope

- Request throttling/queuing (delaying requests instead of rejecting)
- Cost-based rate limiting (limiting by compute cost, not count)
- Machine learning-based adaptive limiting
- Geographic-specific limits
- Real-time billing integration

---

## Non-Functional Requirements

### CAP Theorem Choice

**AP (Availability + Partition Tolerance)** with **Eventual Consistency**

**Justification:**
- Rate limiting is not a financial transaction requiring strong consistency
- Small over-limits (allowing slightly more than N requests) are acceptable
- Blocking legitimate traffic due to consistency issues is worse than slight over-admission
- Distributed systems inherently face network partitions

### Consistency Model

| Scenario | Consistency Requirement |
|----------|------------------------|
| Single datacenter | Strong preferred, eventual acceptable |
| Multi-datacenter | Eventual consistency required |
| Edge deployment | Local-first with async sync |

**Acceptable Inconsistency Window:** 1-5 seconds

### Availability Target

| Tier | Target | Downtime/Year |
|------|--------|---------------|
| Standard | 99.9% | 8.76 hours |
| **Target** | **99.99%** | **52.6 minutes** |
| Premium | 99.999% | 5.26 minutes |

**Rationale:** Rate limiter is on the critical path for all API requests. Every millisecond of downtime affects entire API availability.

### Latency Targets

| Percentile | Target | Justification |
|------------|--------|---------------|
| p50 | < 1ms | Typical case, minimal overhead |
| p95 | < 3ms | Most requests fast |
| **p99** | **< 5ms** | Tail latency bound |
| p99.9 | < 10ms | Extreme cases acceptable |

**Context:** Rate limit check adds to every API request. If backend API p99 is 100ms, rate limiter should add < 5% overhead.

### Durability

| Data Type | Durability Requirement |
|-----------|----------------------|
| Rate limit counts | Best effort (loss = temporary over-limit) |
| Configuration | Durable, replicated |
| Audit logs | Durable for compliance period |

**Trade-off:** Count data can be regenerated from traffic; losing it temporarily allows burst but recovers automatically.

### Throughput

- **Target:** 1 million rate limit checks per second
- **Per-node:** 50,000+ checks/second
- **Horizontal scaling** required for higher throughput

---

## Capacity Estimations (Back-of-Envelope)

### Assumptions

- Large-scale API platform (similar to Stripe/GitHub scale)
- 100 million daily active users
- Average 100 API calls per user per day
- Peak traffic 3x average
- Rate limit data retained for rolling window (max 1 hour)

### Traffic Estimates

| Metric | Calculation | Value |
|--------|-------------|-------|
| **DAU** | Given | 100M users |
| **Daily Requests** | 100M × 100 | 10B requests/day |
| **Average QPS** | 10B / 86,400 | ~115,000 QPS |
| **Peak QPS** | 115K × 3 | ~350,000 QPS |
| **Target Design QPS** | 350K × 3 (headroom) | **~1M QPS** |

### Read/Write Ratio

| Operation | Percentage | QPS at Peak |
|-----------|------------|-------------|
| Rate limit check (read+write) | 100% | 1M |
| Config reads | 0.01% | 100 |
| Config updates | 0.001% | 10 |

**Note:** Every rate limit check involves both a read (current count) and write (increment). However, with atomic operations, this is effectively a single operation.

### Storage Estimates

**Per-User Storage (Token Bucket):**
```
Key: user_id:endpoint (avg 50 bytes)
Value: {tokens: int, last_refill: timestamp} (16 bytes)
TTL metadata: 8 bytes
Total per entry: ~75 bytes
```

**Total Storage:**

| Metric | Calculation | Value |
|--------|-------------|-------|
| Active rate limit entries | 100M users × 5 endpoints | 500M entries |
| Storage per entry | 75 bytes | 75 bytes |
| **Total raw storage** | 500M × 75B | **~37.5 GB** |
| With overhead (2x) | 37.5 × 2 | **~75 GB** |
| With replication (3x) | 75 × 3 | **~225 GB** |

### Bandwidth Estimates

| Direction | Calculation | Value |
|-----------|-------------|-------|
| Request size | ~100 bytes (key + metadata) | 100B |
| Response size | ~50 bytes (allowed/denied + headers) | 50B |
| **Inbound bandwidth** | 1M × 100B | **100 MB/s** |
| **Outbound bandwidth** | 1M × 50B | **50 MB/s** |
| **Total bandwidth** | 150 MB/s | **~1.2 Gbps** |

### Cache Size

| Cache Layer | Purpose | Size |
|-------------|---------|------|
| Local (per-node) | Hot keys, reduce Redis calls | 1-2 GB |
| Distributed (Redis) | Source of truth | 75-100 GB |
| Config cache | Rate limit rules | 100 MB |

### Infrastructure Estimate

| Component | Count | Specification |
|-----------|-------|---------------|
| Rate Limiter Nodes | 20-30 | 8 CPU, 16GB RAM each |
| Redis Cluster | 6-9 nodes | 32GB RAM, SSD |
| Network | 10 Gbps | Between components |

---

## SLOs / SLAs

### Service Level Objectives (Internal)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Availability** | 99.99% | (1 - error_responses / total_requests) × 100 |
| **Latency (p99)** | < 5ms | End-to-end check latency |
| **Throughput** | 1M QPS | Sustained peak capacity |
| **Error Rate** | < 0.01% | Non-rate-limit errors |
| **Accuracy** | > 99.9% | Requests within ±1% of configured limit |

### Service Level Agreements (External)

| Metric | Commitment | Penalty |
|--------|------------|---------|
| Availability | 99.9% monthly | Service credits |
| False positives | < 0.1% | Investigation SLA |
| Configuration propagation | < 30 seconds | Best effort |

### Error Budget

| Period | Allowed Downtime | Allowed Errors |
|--------|-----------------|----------------|
| Monthly (99.99%) | 4.32 minutes | 0.01% of requests |
| Quarterly | 13 minutes | Rolling calculation |

---

## Constraints & Assumptions

### Technical Constraints

1. **Network latency** to distributed store adds 0.5-2ms baseline
2. **Clock skew** between nodes can be up to 100ms
3. **Memory** is the primary constraint for in-memory stores
4. **Single key operations** must complete atomically

### Business Constraints

1. Rate limiting must not become a single point of failure
2. Legitimate users should rarely experience rate limiting
3. Configuration changes must propagate within 30 seconds
4. Audit trail required for limit changes

### Assumptions

1. Client identifiers (user ID, API key, IP) are provided by upstream services
2. Time synchronization (NTP) is available with < 100ms accuracy
3. Network between rate limiter and storage is reliable (same datacenter)
4. Load balancer provides sticky sessions when needed

---

## Success Criteria

| Criteria | Measurement | Target |
|----------|-------------|--------|
| Overhead added to API calls | p99 latency increase | < 5ms |
| Protection effectiveness | Attack traffic blocked | > 99% |
| Legitimate user impact | False positive rate | < 0.1% |
| Operational burden | On-call pages/week | < 1 |
