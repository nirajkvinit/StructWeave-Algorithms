# Interview Guide — SMS Gateway

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Actions |
|---|---|---|---|
| 0-5 min | **Clarify & Scope** | Understand requirements, scale, constraints | Ask about scale (messages/day), geographic scope, number types, compliance needs |
| 5-15 min | **High-Level Architecture** | Core components, data flow, key decisions | Draw API → routing → queue → SMPP → carrier pipeline; explain async model |
| 15-30 min | **Deep Dive** | 1-2 critical components in depth | SMPP connection management OR routing engine OR DLR state machine |
| 30-40 min | **Scale, Reliability & Trade-offs** | Bottlenecks, failure handling, cost optimization | Carrier failover, backpressure, priority queuing, delivery vs. cost trade-off |
| 40-45 min | **Wrap Up** | Compliance, monitoring, evolution | TCPA/10DLC, observability approach, RCS migration path |

---

## Phase-by-Phase Guide

### Phase 1: Clarify & Scope (0-5 min)

**Questions to ask the interviewer:**

| Question | Why It Matters | Expected Answer Range |
|---|---|---|
| "What's the target message volume?" | Determines architecture complexity | 1M/day (simple) to 1B/day (complex) |
| "Domestic only or international?" | Affects routing complexity | US-only = simpler; 200+ countries = multi-carrier routing needed |
| "What message types? OTP, marketing, transactional?" | Determines priority queuing and compliance needs | Mix matters for queue design |
| "Do we need two-way messaging?" | Adds MO path, webhook infrastructure | Usually yes for production systems |
| "What delivery SLA? Real-time or batch acceptable?" | Shapes async design and queue depth tolerance | OTP: < 5s; marketing: < 5 min |
| "Number types: short codes, long codes, toll-free?" | Impacts provisioning, routing, and TPS limits | Usually all three for full platform |

**Scoping statement example:**
> "I'll design a Twilio-style SMS gateway handling 1B+ messages/day across 200+ countries, supporting outbound (MT) and inbound (MO) messaging with OTP/transactional/marketing priorities, carrier integration via SMPP, delivery tracking via DLR, and compliance with TCPA/10DLC. I'll focus the deep dive on carrier connection management and the routing engine."

### Phase 2: High-Level Architecture (5-15 min)

**What to draw:**
1. Customer API tier (stateless, horizontally scaled)
2. Compliance engine (TCPA check, opt-out, content filter)
3. Routing engine (least-cost routing with carrier scoring)
4. Carrier-partitioned message queue (priority lanes)
5. SMPP connection pool (per-carrier TPS enforcement)
6. DLR processor (async status normalization)
7. Webhook dispatcher (status callbacks to customers)

**Key points to make:**
- **Async pipeline**: API accepts message and returns immediately (202); carrier submission is async via queue
- **Carrier-partitioned queues**: Each carrier has its own queue partition to enforce carrier-specific TPS limits
- **Event-sourced message state**: Message transitions through a state machine (accepted → queued → submitted → delivered)
- **Priority lanes**: OTP messages bypass marketing queue to meet latency SLAs

**What separates good from great answers:**
- Explaining WHY the pipeline is async (carrier latency is unpredictable)
- Identifying that the carrier SMSC is the bottleneck you cannot control
- Mentioning per-carrier TPS as the fundamental constraint

### Phase 3: Deep Dive (15-30 min)

**Choose 1-2 of these topics based on interviewer interest:**

#### Option A: SMPP Connection Management
- Explain SMPP bind types (transceiver, transmitter, receiver)
- Connection pooling with per-connection window management
- enquire_link heartbeat for keepalive
- Reconnection with exponential backoff
- In-flight PDU tracking (sequence_number → message_sid map)
- Handling carrier throttling (SMPP error 0x58)

#### Option B: Routing Engine
- Multi-factor scoring (cost 40%, delivery rate 30%, latency 15%, health 15%)
- Carrier health score calculation (EWMA of recent delivery/error rates)
- TPS-aware route selection (skip routes at capacity)
- Failover logic when primary carrier goes down
- Cost optimization with volume-committed pricing tiers

#### Option C: DLR State Machine
- Carrier message ID correlation challenge (non-unique, format mismatches)
- Status normalization (carrier-specific codes → platform states)
- Valid state transition enforcement
- DLR timeout handling (72-hour window)
- Orphaned DLR handling
- Late DLR resolution (updating "unknown" to "delivered")

### Phase 4: Scale, Reliability & Trade-offs (30-40 min)

**Bottlenecks to discuss:**
1. **Carrier TPS ceiling**: Cannot scale beyond carrier-imposed limits → solution is multi-carrier routing
2. **DLR correlation at scale**: 50K+ DLRs/sec requiring fast lookups → write-through cache with TTL
3. **Webhook fan-out**: Customer endpoints may be slow → async I/O with per-endpoint circuit breakers
4. **Hot number problem**: Popular numbers concentrate load → partition by message_sid, not by number

**Failure scenarios to walk through:**
- Carrier goes down: automatic rerouting, in-flight message handling, gradual recovery
- Flash sale traffic spike: priority queuing preserves OTP, marketing absorbs delay
- Customer webhook endpoint down: circuit breaker, retry queue, DLQ with manual recovery

### Phase 5: Wrap Up (40-45 min)

- **Compliance**: TCPA consent, 10DLC registration pipeline, time-of-day restrictions
- **Monitoring**: Delivery rate dashboards, carrier health scoring, DLR lag tracking
- **Evolution**: RCS as next-gen SMS with automatic fallback, rich messaging capabilities

---

## Trade-offs Discussion

### Trade-off 1: Synchronous vs. Asynchronous Message Submission

| | Synchronous | Asynchronous |
|---|---|---|
| **Pros** | Customer knows carrier accepted immediately; simpler mental model | Decouples API from carrier latency; higher throughput; carrier degradation doesn't affect API |
| **Cons** | API latency = carrier latency (10ms-30s); thread pool exhaustion risk; carrier outage = API outage | Customer gets SID before delivery; must use webhooks/polling for status; more complex state machine |
| **Recommendation** | **Asynchronous** — industry standard for a reason. Carrier latency is too variable to expose to API consumers. Return 202 immediately. |

### Trade-off 2: Cost Optimization vs. Delivery Rate

| | Optimize for Cost | Optimize for Delivery |
|---|---|---|
| **Pros** | Lower per-message cost; better margins | Higher delivery rates; better customer satisfaction |
| **Cons** | Lower delivery rates via cheap carriers; more "unknown" statuses | Higher cost; smaller profit margins |
| **Recommendation** | **Configurable per message type** — OTP/transactional messages route for delivery rate (highest-quality carrier); marketing routes for cost with minimum delivery rate floor (90%). Customer can override. |

### Trade-off 3: Single-Carrier Simplicity vs. Multi-Carrier Routing

| | Single Carrier | Multi-Carrier |
|---|---|---|
| **Pros** | Simpler integration; fewer failure modes; stronger carrier relationship | Redundancy; cost competition; geographic coverage; no single-carrier SPOF |
| **Cons** | SPOF; no pricing leverage; limited geographic coverage | Complex routing logic; N carrier integrations to maintain; DLR normalization across carriers |
| **Recommendation** | **Multi-carrier** for any serious production system. Even with 2-3 carriers per major market, the reliability improvement justifies the complexity. |

### Trade-off 4: Carrier-Partitioned vs. Destination-Partitioned Queues

| | Carrier-Partitioned | Destination-Partitioned |
|---|---|---|
| **Pros** | Natural TPS enforcement per carrier; easy to drain/disable a carrier | Natural geographic affinity; messages to same country processed together |
| **Cons** | Messages to same destination may go through different carriers via different queues | A single carrier serving multiple destinations can be overwhelmed by aggregate queue traffic |
| **Recommendation** | **Carrier-partitioned** — TPS limits are per-carrier, so the queue structure should match the constraint. Geographic routing is handled by the routing engine before queue insertion. |

### Trade-off 5: Immediate DLR Webhook vs. Batched Callbacks

| | Immediate | Batched (every N seconds) |
|---|---|---|
| **Pros** | Lowest latency; customer knows status ASAP | Fewer HTTP connections; more efficient network usage; reduces customer endpoint load |
| **Cons** | High webhook volume (28K/sec); customer endpoint must handle high throughput | Added latency (up to batch window); more complex batching logic |
| **Recommendation** | **Immediate by default with batching as option** — OTP status callbacks must be immediate; marketing campaigns can opt into batched callbacks to reduce endpoint load. |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---|---|---|
| "Why not just use HTTP to connect to carriers?" | Understand SMPP's role and limitations | "SMPP is the telco standard with persistent connections enabling high TPS and async DLR delivery. HTTP is simpler but doesn't support the async DLR push model natively. We support both—SMPP for high-volume carriers, HTTP adapters for modern MVNOs." |
| "Why not store messages in a relational database?" | Test understanding of write-heavy workloads | "At 1B messages/day, a single relational DB can't handle 11.5K writes/sec. We use partitioned NoSQL for messages (write-optimized, time-partitioned for TTL) and relational DB for configuration/billing (transactional consistency needed). It's polyglot persistence matching access patterns." |
| "What if a carrier lies about delivery?" | Test trust boundary awareness | "Some carriers fabricate 'delivered' DLRs without handset confirmation. We track per-carrier delivery rate correlation (DLR says delivered vs. actual customer engagement metrics). Carriers with consistently inflated rates get lower trust scores in routing. We also document DLR reliability per carrier for customer transparency." |
| "Can't you just retry failed messages forever?" | Test understanding of message validity | "Messages have a validity period (default 24h for marketing, 5 min for OTP). Retrying an OTP after 5 minutes is worse than not delivering—the code has expired. Retrying marketing messages after 24h wastes money and annoys recipients. The retry policy must be message-type-aware." |
| "Why is this harder than email delivery?" | Test protocol understanding | "SMS is harder in 3 ways: (1) Carrier TPS limits create hard throughput ceilings that don't exist in SMTP; (2) DLR feedback is unreliable/delayed whereas email bounces are immediate; (3) Regulatory penalties are per-message ($1,500/msg under TCPA) vs. per-incident for email. The compliance surface area per message is much larger." |
| "How would you handle 100x scale?" | Forward-thinking architecture | "100B/day means 1.15M msg/sec. Three changes: (1) Edge routing—regional routing engines near carrier PoPs to reduce latency; (2) Per-country SMPP connector tiers—dedicated infrastructure for top-10 markets; (3) Carrier-local message queues—queue as close to carrier as possible. The API tier scales linearly; the carrier tier is the ceiling we negotiate." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---|---|---|
| Ignoring carrier TPS limits | The most fundamental constraint; you can't throw hardware at it | Design around carrier TPS as the primary constraint; build multi-carrier routing |
| Making the API synchronous | Coupling API latency to carrier response time | Accept asynchronously (202); deliver via queue |
| Using a single message queue | No way to enforce per-carrier TPS or priority | Carrier-partitioned queues with priority lanes |
| Ignoring encoding complexity | SMS ≠ UTF-8 text; GSM-7 vs. UCS-2 changes message capacity by 2.3x | Auto-detect encoding; handle concatenation |
| Treating all messages equally | OTP and marketing have wildly different latency requirements | Priority queuing with message-type-aware routing and retry policies |
| Forgetting about DLR unreliability | Assuming carriers always send accurate DLRs | Build timeout handling, orphan detection, carrier trust scoring |
| Overlooking compliance | TCPA violations are $500-$1,500 per message | Compliance check is on the critical path, before routing |
| Designing for one country | US-only design misses international routing complexity | Design for multi-country from the start; country-specific carrier rules |

---

## Questions to Ask Interviewer

| Question | Purpose |
|---|---|
| What's the expected message volume per day? | Determines complexity tier |
| Domestic only or international messaging? | Shapes routing engine design |
| Which message types are in scope (OTP, marketing, transactional)? | Affects priority queuing and compliance |
| Do we need to support two-way (MO/MT) messaging? | Determines inbound message pipeline |
| What's the delivery latency expectation for OTP messages? | Shapes queue depth and priority design |
| Are we an aggregator or do we own carrier relationships? | Determines SMPP vs. HTTP integration depth |
| What compliance regimes are in scope (TCPA, GDPR, TRAI)? | Determines compliance engine complexity |
| Is RCS (rich messaging) in scope? | Affects protocol layer design |

---

## Quick Reference Cards

### Card 1: Message Lifecycle

```
Customer → API (100ms) → Compliance (3ms) → Encoding (1ms)
  → Routing (2ms) → Queue (5ms) → SMPP Submit (85ms)
  → Carrier (async) → DLR (async, seconds to hours)
  → DLR Processing (15ms) → Webhook (200ms) → Customer
```

### Card 2: Key Numbers

| Metric | Value |
|---|---|
| Global A2P SMS/day | 15-20 billion |
| Large platform volume | 1 billion msg/day |
| Peak rate | 35K+ msg/sec |
| SMPP connection TPS | 10-100 per connection (varies by number type) |
| GSM-7 single SMS | 160 characters |
| UCS-2 single SMS | 70 characters |
| Concatenated segment (GSM-7) | 153 chars (7 bytes for UDH) |
| TCPA fine per message | $500-$1,500 |
| 10DLC registration time | 5-10 business days |
| DLR timeout window | 72 hours (typical) |

### Card 3: SMPP Error Codes to Know

| Code | Name | Meaning | Action |
|---|---|---|---|
| 0x00000000 | ESME_ROK | Success | Message accepted |
| 0x00000001 | ESME_RINVMSGLEN | Invalid message length | Check encoding/segmentation |
| 0x00000045 | ESME_RSUBMITFAIL | Submit failed | Retry or reroute |
| 0x00000058 | ESME_RTHROTTLED | Throttled | Back off TPS |
| 0x00000088 | ESME_RREPLACEFAIL | Replace failed | Log and alert |

### Card 4: Number Type Comparison

| Type | TPS (US) | Cost | Best For | Registration |
|---|---|---|---|---|
| **Short Code** | 100-500 msg/sec | $$$ | High-volume marketing, 2FA | 8-12 weeks carrier approval |
| **Toll-Free** | 30-50 msg/sec | $$ | Moderate volume, customer service | Toll-free verification required |
| **10DLC (Local)** | 1-75 msg/sec (varies by trust) | $ | General A2P, most use cases | 10DLC brand + campaign registration |
| **Alpha Sender** | Varies by country | $ | International branding | Country-specific registration |

---

## Interview Signal Matrix

| Signal | Junior | Senior | Staff+ |
|---|---|---|---|
| **Requirements** | Lists features | Quantifies scale; identifies constraints | Identifies carrier TPS as fundamental ceiling |
| **Architecture** | HTTP → DB → carrier | Async pipeline with queue + SMPP | Carrier-partitioned queues with priority; backpressure propagation |
| **Routing** | Random carrier selection | Least-cost routing | Multi-factor scoring with health-weighted dynamic failover |
| **Encoding** | "Just send text" | Mentions GSM-7 vs. UCS-2 | Explains concatenation, UDH headers, segment billing implications |
| **Reliability** | "Add more servers" | Carrier failover, retry logic | Graceful degradation modes; priority-preserving failure; in-flight message recovery |
| **Compliance** | "Check opt-outs" | TCPA + 10DLC registration | Per-message compliance evaluation; country-specific rules; $1,500/violation risk framing |
| **DLR Handling** | "Check delivery status" | Status normalization across carriers | Trust boundary awareness; DLR reliability scoring; orphaned/late DLR handling |

---

*Next: [Insights ->](./09-insights.md)*
