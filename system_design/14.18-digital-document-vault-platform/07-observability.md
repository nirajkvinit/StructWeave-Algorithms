# Observability — Digital Document Vault Platform

## Key Metrics

### Business Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| **Documents Issued per Hour** | Rate of new documents pushed by issuers | Baseline varies by time | < 50% of same-hour-last-week baseline |
| **Consent Grant Rate** | % of consent requests approved by subscribers | > 70% | < 50% (may indicate UX confusion or spam requests) |
| **Document Access Success Rate** | % of document retrievals that return content (including cached) | > 99.5% | < 98% |
| **Active Subscribers (DAU)** | Daily active users accessing vaults | ~15 million | < 10 million (possible platform issue) or > 30 million (surge preparation) |
| **Requester API Adoption** | Number of active requesters making API calls/day | Growing trend | Sudden drop > 20% (possible API issue) |
| **Self-Upload Volume** | Documents uploaded by subscribers per hour | ~83,000/hour | > 200,000/hour (may indicate bot abuse) |
| **Consent Revocation Rate** | % of granted consents that are later revoked | < 10% | > 25% (may indicate trust issue or consent fatigue) |

### Technical Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| **API Latency (P50/P95/P99)** | End-to-end response time per endpoint | P50 < 200ms, P99 < 1s | P99 > 2s for any endpoint |
| **URI Resolution Latency** | Time to resolve document URI from issuer | P50 < 500ms, P99 < 3s | P99 > 4s |
| **Cache Hit Rate** | % of document retrievals served from cache | > 85% aggregate | < 70% (cache warming issue) |
| **PKI Verification Latency** | Time for full signature + chain + CRL check | P50 < 50ms, P99 < 200ms | P99 > 500ms |
| **Consent Flow End-to-End** | Time from requester request to access token delivery | P50 < 3s, P99 < 8s | P99 > 15s |
| **Error Rate (5xx)** | % of requests returning server errors | < 0.1% | > 0.5% |
| **Error Rate (4xx, excluding auth)** | Client errors excluding expected 401s | < 2% | > 5% |
| **Queue Depth (OCR)** | Pending OCR processing jobs | < 500 | > 5,000 (processing backlog) |
| **Queue Depth (Notifications)** | Pending push notifications | < 1,000 | > 10,000 |
| **Database Replication Lag** | Lag between primary and secondary region | < 500ms | > 2s |
| **Connection Pool Utilization** | % of database connection pool in use | < 70% | > 85% |

### AI Model Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| **OCR Accuracy** | Character-level accuracy on known document types | > 99% for printed, > 95% for handwritten | < 97% for printed |
| **Classification Accuracy** | Correct document type prediction rate | > 95% | < 90% |
| **Fraud Detection Precision** | % of flagged documents that are actually fraudulent | > 80% | < 60% (too many false positives) |
| **Fraud Detection Recall** | % of actually fraudulent documents that are flagged | > 90% | < 75% (missing real fraud) |
| **OCR Processing Time** | Time per document for OCR extraction | P50 < 3s, P99 < 10s | P99 > 15s |
| **Classification Latency** | Time for document type prediction | P50 < 500ms | > 2s |
| **Model Inference Throughput** | Documents processed per GPU per second | > 10 | < 5 (model degradation or resource constraint) |

### Per-Issuer Metrics

| Metric | Description | Alert Threshold |
|---|---|---|
| **Issuer API Availability** | % of successful health checks per issuer | < 95% over 1 hour |
| **Issuer API Latency** | P99 response time per issuer | > 2× issuer's SLA latency |
| **Issuer Push Rate** | Documents pushed per hour per issuer | > 10× normal (potential compromise or bulk event) |
| **Issuer Signature Verification Failure Rate** | % of pushed documents failing signature check | > 1% (possible certificate issue) |
| **Circuit Breaker State** | Current state per issuer (CLOSED/OPEN/HALF_OPEN) | Any issuer in OPEN state |

---

## Logging Strategy

### Log Levels and Purpose

```
FATAL: System-critical failures requiring immediate human intervention
    Examples: Database primary unresponsive, HSM connection lost, all regions failing health checks
    Action: Auto-page on-call SRE + incident commander

ERROR: Request-level failures that affect user experience
    Examples: URI resolution failed after retries, consent token validation error,
              PKI verification failure for a known-good issuer
    Action: Aggregate and alert if rate exceeds threshold

WARN: Degraded operation or unusual conditions
    Examples: Serving cached document (issuer unavailable), CRL update delayed,
              fraud score above 0.4 but below flagging threshold
    Action: Dashboard visibility; investigate if persistent

INFO: Normal operational events (structured, machine-parseable)
    Examples: Document retrieved, consent granted, subscriber authenticated,
              issuer health check passed
    Action: Used for operational dashboards and audit trail

DEBUG: Detailed diagnostic information (enabled per-service, not in production by default)
    Examples: Cache hit/miss details, PKI certificate chain walk steps,
              OCR confidence scores per character
    Action: Enabled temporarily for troubleshooting specific issues
```

### Structured Log Format

```
{
    "timestamp": "2026-03-10T14:30:00.123Z",
    "level": "INFO",
    "service": "vault-service",
    "instance": "vault-service-7",
    "region": "north",
    "trace_id": "abc123def456",
    "span_id": "span789",
    "event": "document_retrieved",
    "subscriber_id_hash": "sha256:abcdef...",  // Never log raw subscriber ID
    "document_type": "DRVLC",
    "source": "CACHE_L2",
    "latency_ms": 45,
    "issuer_id": "RTO-DL",
    "verification_status": "VERIFIED",
    "cache_age_seconds": 3600
}
```

### PII Protection in Logs

- **Never log**: Raw national ID numbers, mobile numbers, email addresses, document content, subscriber names
- **Hash before logging**: subscriber_id, device_id (use SHA-256 with salt)
- **Safe to log**: Document type codes, issuer IDs, requester IDs, consent IDs, event types, timestamps, latencies, status codes
- **Configurable redaction**: A log redaction pipeline strips any field matching PII patterns (phone number regex, ID number formats) before logs reach the aggregation layer

---

## Distributed Tracing

### Trace Propagation

Every request receives a trace ID at the API Gateway, propagated through all downstream services:

```
Subscriber App → API Gateway → Vault Service → URI Resolver → Issuer API
       │              │              │              │              │
       └── trace_id: "abc123" propagated through all hops ────────┘

Each service adds a span:
    span_1: api-gateway (auth check, routing) - 5ms
    span_2: vault-service (metadata lookup, cache check) - 15ms
    span_3: uri-resolver (issuer endpoint lookup) - 2ms
    span_4: uri-resolver.http-call (actual issuer API call) - 450ms
    span_5: verification-service (PKI check) - 30ms
    span_6: vault-service (response assembly) - 3ms

Total: 505ms (of which 450ms is issuer API latency)
```

### Cross-System Trace Context

For consent flows that span requester → platform → subscriber → platform → requester:

```
Phase 1: Requester initiates consent request
    trace_id: "req-123", span: requester-to-platform

Phase 2: Platform notifies subscriber
    trace_id: "req-123", span: consent-engine-to-notification

Phase 3: Subscriber approves (new trace, linked to original)
    trace_id: "sub-456", linked_trace: "req-123"
    span: subscriber-app-to-consent-engine

Phase 4: Token delivered to requester
    trace_id: "req-123", span: consent-engine-to-requester-callback

Correlation: linked_trace connects the subscriber's approval
             to the requester's original request
```

### Issuer Latency Attribution

Since issuer API latency dominates document retrieval time, the tracing system attributes latency to specific issuers:

```
Daily Issuer Latency Report:
    RTO-DL:     P50=120ms, P99=800ms,  availability=99.9%  ✅
    CBSE:       P50=200ms, P99=2500ms, availability=98.5%  ⚠️
    Income Tax: P50=350ms, P99=3800ms, availability=97.2%  ⚠️
    University-X: P50=800ms, P99=5000ms, availability=92.1% 🔴
```

This data feeds into issuer SLA monitoring and is shared with issuers to help them improve their API performance.

---

## Alerting Rules

### Critical Alerts (P1 — Immediate Response)

| Alert | Condition | Notification |
|---|---|---|
| **Platform Unavailable** | Health check failures from 2+ regions | Page on-call SRE + incident commander; auto-failover |
| **Database Primary Down** | Primary DB unreachable for > 30 seconds | Page DBA + SRE; auto-promote secondary |
| **Consent Integrity Violation** | Any consent record fails HMAC validation | Page security team; potential tampering |
| **Mass Auth Failure** | Authentication failure rate > 50% for 2 minutes | Page SRE; possible identity provider outage |
| **PKI Infrastructure Down** | CRL/OCSP responder unreachable for > 10 minutes | Page security team; document verification degraded |
| **Fraud Spike** | Fraud detection rate > 5× baseline for 30 minutes | Page security + fraud team; possible coordinated attack |

### High Alerts (P2 — Response Within 30 Minutes)

| Alert | Condition | Notification |
|---|---|---|
| **Issuer Down (Critical)** | Identity or Tax issuer in OPEN circuit breaker for > 5 min | Notify SRE + issuer relations team |
| **Error Rate Elevated** | 5xx error rate > 1% for 5 minutes | Notify on-call SRE |
| **Replication Lag** | DB replication lag > 5 seconds for 3 minutes | Notify DBA |
| **OCR Queue Backlog** | Queue depth > 10,000 for 10 minutes | Notify ML ops team |
| **Cache Hit Rate Drop** | Aggregate cache hit rate < 60% for 15 minutes | Notify SRE; possible cache infrastructure issue |

### Warning Alerts (P3 — Response Within 4 Hours)

| Alert | Condition | Notification |
|---|---|---|
| **Issuer Degraded** | Any issuer P99 latency > 2× SLA for 30 minutes | Notify issuer relations team |
| **Storage Approaching Limit** | Object storage > 80% of provisioned capacity | Notify infrastructure team |
| **Certificate Expiry Warning** | Any issuer certificate expiring within 30 days | Notify issuer + security team |
| **API Rate Limit Violations** | Any requester hitting rate limits > 100 times/hour | Notify requester support team |

---

## Dashboards

### Operations Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ DIGITAL DOCUMENT VAULT — OPERATIONS DASHBOARD               │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ DAU: 15.2M   │ Docs Served: │ Error Rate:  │ Uptime:        │
│ ↑ 3% vs      │ 42.8M today  │ 0.04%        │ 99.97%         │
│ yesterday     │              │              │ (this month)   │
├──────────────┴──────────────┴──────────────┴────────────────┤
│ API Latency (last 1 hour)                                   │
│ ──── P50: 180ms  ──── P95: 450ms  ──── P99: 820ms         │
│ [sparkline graph showing last 24 hours]                     │
├─────────────────────────────────────────────────────────────┤
│ Cache Performance            │ Issuer Health                │
│ L1 Hit: 42%                  │ Healthy: 1,871 (96.6%)      │
│ L2 Hit: 33%                  │ Degraded: 52 (2.7%)         │
│ L3 Hit: 18%                  │ Down: 13 (0.7%)             │
│ Aggregate: 87%               │ [list of DOWN issuers]      │
├──────────────────────────────┴──────────────────────────────┤
│ Regional Distribution        │ Queue Depths                 │
│ North: 58% traffic           │ OCR: 234 pending             │
│ South: 32% traffic           │ Notifications: 567 pending   │
│ West: 10% traffic            │ Consent: 12 pending          │
└──────────────────────────────┴──────────────────────────────┘
```

### Security Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ SECURITY DASHBOARD                                          │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Auth Failures│ Fraud Flags  │ Consent      │ Active         │
│ Today: 45K   │ Today: 234   │ Violations:  │ Threats:       │
│ (0.22%)      │ (0.012%)     │ 3            │ 0              │
├──────────────┴──────────────┴──────────────┴────────────────┤
│ SIM Swap Detection                                          │
│ Detected: 12 today | Blocked: 12 | False Positives: 2      │
├─────────────────────────────────────────────────────────────┤
│ Top Auth Failure IPs         │ Requester API Abuse          │
│ 203.0.113.x: 450 attempts   │ All within limits            │
│ 198.51.100.x: 230 attempts  │                              │
├──────────────────────────────┴──────────────────────────────┤
│ Certificate Status                                          │
│ Expiring < 30 days: 3 issuers                               │
│ Expiring < 7 days: 0                                        │
│ CRL Last Updated: 2 hours ago (on schedule)                 │
└─────────────────────────────────────────────────────────────┘
```

### Consent Analytics Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ CONSENT ANALYTICS                                           │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Requests     │ Approved     │ Denied       │ Revoked        │
│ Today: 2.8M  │ 2.1M (75%)  │ 0.4M (14%)  │ 0.3M (11%)    │
├──────────────┴──────────────┴──────────────┴────────────────┤
│ Top Requesters by Volume     │ Avg Time to Approval         │
│ 1. Bank-A: 180K requests     │ P50: 45 seconds              │
│ 2. Bank-B: 145K requests     │ P90: 4 minutes               │
│ 3. Employer-C: 98K requests  │ P99: 25 minutes              │
├──────────────────────────────┴──────────────────────────────┤
│ Most Requested Document Types                               │
│ 1. PAN Card (PANCR): 35%                                    │
│ 2. Aadhaar (ADHAR): 28%                                     │
│ 3. Income Tax Return (ITRTN): 15%                           │
│ 4. Driving License (DRVLC): 12%                             │
│ 5. Education Certificates: 10%                              │
└─────────────────────────────────────────────────────────────┘
```

---

## SLI/SLO Monitoring

### Service Level Indicators

| SLI | Measurement | Good Event Definition |
|---|---|---|
| **Availability** | Ratio of successful (non-5xx) responses to total requests | Response status < 500 |
| **Document Retrieval Latency** | Time from request to document content delivered | Response time < 1s |
| **Consent Flow Latency** | Time from consent request to access token delivery | Total flow time < 10s |
| **Verification Latency** | Time for PKI verification response | Response time < 1s |
| **Data Freshness** | Age of cached document relative to issuer's version | Cache age < configured TTL |

### SLO Definitions and Error Budgets

| SLO | Target | Error Budget (30-day) | Burn Rate Alert |
|---|---|---|---|
| **Availability** | 99.95% | 21.6 minutes | 1-hour burn rate > 10× → page; 6-hour burn rate > 5× → ticket |
| **Document Retrieval (< 1s)** | 99.0% | 7.2 hours | 1-hour burn rate > 14× → page |
| **Consent Flow (< 10s)** | 95.0% | 36 hours | 6-hour burn rate > 6× → ticket |
| **Verification (< 1s)** | 99.5% | 3.6 hours | 1-hour burn rate > 14× → page |
| **Data Freshness** | 99.9% | 43.2 minutes | 1-hour burn rate > 10× → page |

### Error Budget Policy

When an SLO's error budget is exhausted:
1. **Feature freeze**: No new deployments until error budget is replenished
2. **Reliability sprint**: Engineering team prioritizes reliability improvements
3. **Post-mortem requirement**: Any incident consuming > 50% of monthly error budget requires a written post-mortem with action items
4. **Issuer escalation**: If an issuer's availability is the primary budget consumer, escalate to issuer relations for SLA enforcement
