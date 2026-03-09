# Interview Guide — Push Notification System

## 1. Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Actions |
|---|---|---|---|
| 0–5 min | **Clarify & Scope** | Understand requirements, ask smart questions | Ask about scale (millions or billions?), provider requirements (mobile only or web too?), notification types (transactional, marketing, or both?), delivery guarantees |
| 5–10 min | **High-Level Architecture** | Draw the pipeline | Sketch: Ingestion API → Queue → Fan-Out → Provider Adapters → APNs/FCM; add Device Registry and Feedback Loop |
| 10–20 min | **Core Components** | Deep dive on 2 critical areas | Fan-Out Engine (how to send to 500M devices fast) and Device Token Lifecycle (registration, rotation, cleanup) |
| 20–30 min | **Provider Integration** | Show provider expertise | Discuss APNs HTTP/2 connection management, FCM multicast batching, provider-specific rate limits, feedback processing |
| 30–40 min | **Scale & Reliability** | Address bottlenecks and failures | Multi-priority queues (transactional vs marketing isolation), provider outage handling, backpressure, retry with dedup |
| 40–45 min | **Wrap Up** | Trade-offs and extensions | Summarize key trade-offs; mention analytics, A/B testing, timezone-aware scheduling, user preferences as extensions |

---

## 2. Questions to Ask the Interviewer

### 2.1 Scoping Questions (Ask First)

| Question | Why It Matters | Impact on Design |
|---|---|---|
| "What platforms do we need to support?" | Mobile-only (APNs+FCM) is simpler than mobile+web+Huawei | Determines number of provider adapters; Web Push adds encryption complexity |
| "What's the scale—daily notification volume?" | 1M/day vs 10B/day are fundamentally different architectures | Determines queue topology, sharding strategy, caching requirements |
| "Do we need to support both transactional and marketing notifications?" | These have very different latency, priority, and compliance requirements | Determines queue isolation strategy; marketing requires campaign management, segmentation |
| "What delivery guarantee is acceptable?" | At-least-once vs exactly-once shapes the dedup architecture | At-least-once is standard; idempotency key + dedup cache for effective exactly-once |
| "Is this a multi-tenant platform or single-application?" | Multi-tenant adds credential isolation, quota management, tenant routing | Tenant isolation is a cross-cutting concern affecting every component |
| "Do we own the client SDKs or just the backend?" | Client SDK ownership means you control token registration, display logic | Without SDK control, you depend on caller providing correct tokens and handling display |

### 2.2 Follow-Up Questions (If Time Allows)

- "Should we handle notification preferences and opt-outs, or is that the caller's responsibility?"
- "Is analytics (delivery rates, open rates, CTR) in scope?"
- "Do we need to support scheduled delivery and timezone-aware sending?"
- "What's the latency requirement for transactional notifications (OTP, security alerts)?"

---

## 3. Meta-Commentary: How to Approach This Problem

### 3.1 What Makes This System Unique

The push notification system is deceptively complex. It appears simple ("send a message to a device"), but the challenges are:

1. **External dependency dominance:** You don't control the last mile. APNs, FCM, and browser push services determine when and if the notification reaches the device. Your entire architecture is designed around managing relationships with providers you don't control.

2. **Heterogeneous provider APIs:** Unlike most systems where you choose one protocol, here you must integrate with 4+ providers simultaneously, each with different auth, payload formats, rate limits, and error semantics.

3. **Fan-out as the defining scale problem:** Sending 1 notification that targets 500M devices is not 1 operation—it's 500M operations, each individually addressed with a unique device token. This is fundamentally different from pub/sub broadcast.

4. **Token entropy:** Device tokens are ephemeral and unreliable. A "healthy" system has 5-10% of its token database becoming stale every month. Token hygiene is a core reliability concern, not a cleanup job.

### 3.2 Where to Spend Most Time

| Area | Time Investment | Why |
|---|---|---|
| **Fan-Out Engine** | 30% | This is the novel scaling challenge; most other components are well-understood patterns |
| **Provider Adapter Layer** | 25% | Demonstrates domain expertise; APNs HTTP/2 connection management and FCM batching are interview differentiators |
| **Queue Topology & Priority** | 20% | The multi-lane priority queue design shows mature distributed systems thinking |
| **Token Lifecycle** | 15% | Shows awareness of operational reality (tokens go stale, feedback must be processed) |
| **Analytics & Preferences** | 10% | Mention these as important extensions; deep dive only if time allows |

### 3.3 Signal You're Sending

| Action | Signal to Interviewer |
|---|---|
| Asking about APNs vs FCM differences | "Understands domain-specific constraints, not just generic system design" |
| Separating transactional from marketing queues | "Thinks about priority isolation and SLA management" |
| Discussing token staleness and cleanup | "Considers operational reality, not just happy-path design" |
| Mentioning backpressure from provider throttling | "Understands flow control in distributed pipelines" |
| Designing for timezone-aware delivery | "Thinks about global scale and user experience" |

---

## 4. Trade-Offs Discussion

### 4.1 Key Trade-Offs

| Decision | Option A | Option B | Recommendation |
|---|---|---|---|
| **Fan-out timing** | **Eager fan-out:** Expand to device tokens at ingestion time | **Lazy fan-out:** Store notification intent; expand at send time | **Lazy fan-out** — allows preference changes to take effect between scheduling and sending; reduces storage of pre-expanded token lists |
| | Pros: Lower send-time latency; fan-out work pre-done | Pros: Fresh token data at send time; respects last-minute opt-outs | |
| | Cons: Stale tokens if delayed; ignores preference changes | Cons: Fan-out adds latency at send time; device registry must handle burst reads | |
| **Provider connection model** | **Shared connection pool:** All notifications share a global pool of provider connections | **Per-tenant connection pools:** Each tenant gets isolated connections | **Shared pool** — more efficient resource usage; per-tenant rate limits enforce isolation at the application layer |
| | Pros: Higher utilization; simpler management | Pros: True isolation; one tenant can't consume all connections | |
| | Cons: Noisy neighbor risk at connection level | Cons: Many idle connections for small tenants; connection waste | |
| **Delivery tracking granularity** | **Per-device tracking:** Track status for every device a notification was sent to | **Aggregate tracking:** Track campaign-level aggregate (sent: 10M, delivered: 9.5M) | **Per-device for transactional, aggregate for marketing** — transactional needs per-device tracking for debugging; marketing at 100M scale generates too many individual records |
| | Pros: Complete audit trail; debug specific delivery failures | Pros: Dramatically less storage; faster queries | |
| | Cons: 30B events/day of delivery tracking data | Cons: Cannot debug individual delivery failures in campaigns | |
| **Template rendering** | **Send-time rendering:** Render templates when notification is about to be sent | **Ingest-time rendering:** Render when notification is accepted | **Send-time rendering** — supports dynamic data (current price, stock status) and respects user locale changes |
| | Pros: Dynamic data; respects user state at send time | Pros: Rendering cost amortized; payload pre-computed | |
| | Cons: Rendering on critical path; template service must be available | Cons: Stale data if notification is delayed; pre-rendered per locale is expensive | |
| **Segment evaluation** | **Pre-computed materialized segments:** Periodically evaluate segments and store member lists | **Real-time evaluation:** Evaluate segment membership per-user during fan-out | **Hybrid** — pre-compute for scheduled campaigns; real-time for event-triggered segments |
| | Pros: Fast campaign start; no query load at send time | Pros: Always fresh; no stale membership | |
| | Cons: Stale membership (15-min refresh); storage for materialized lists | Cons: Slow for large segments; device registry read spike | |

### 4.2 "Why Not Just..." Challenges

| Challenge | Naive Answer | Expert Answer |
|---|---|---|
| "Why not use FCM topics for mass sends?" | "Yeah, topics handle the fan-out for us" | "FCM topic messages don't allow per-user personalization, can't check per-user preferences or frequency caps, and give you no control over delivery pacing. At scale, you need per-device sends for any meaningful customization." |
| "Why not just use a single queue?" | "A queue is a queue; priority field handles ordering" | "A single queue with priority means a 500M-device marketing campaign fills the queue, and transactional OTP notifications wait behind it. Separate queue lanes with dedicated consumers ensure transactional latency is independent of marketing volume." |
| "Why bother with token cleanup? Just let sends fail." | "Provider feedback tells us about invalid tokens anyway" | "Sending to stale tokens wastes provider quota (FCM has per-project limits), increases error rate metrics (masking real issues), and APNs can flag excessive invalid-token sends as abuse, risking credential suspension." |
| "Why not just fire-and-forget to providers?" | "Providers handle delivery; we don't need to track" | "Without feedback processing, stale tokens accumulate indefinitely, delivery failure rates increase silently, and you have no visibility into whether notifications actually reach users. The feedback loop is what keeps the system healthy over time." |

---

## 5. Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---|---|---|
| **Treating all providers the same** | APNs uses HTTP/2 with device-level requests; FCM supports multicast; Web Push requires per-message encryption. A single abstraction leaks badly. | Design a common interface but allow provider-specific optimizations (FCM batching, APNs connection pooling, Web Push encryption) |
| **Ignoring quiet hours** | Sending marketing notifications at 3 AM annoys users and increases uninstall rate. | Timezone-aware scheduling with per-user quiet hours; high-priority (security alerts) bypasses quiet hours |
| **Synchronous API design** | Blocking on delivery makes the API unusably slow for mass sends and couples caller availability to provider availability. | 202 Accepted pattern: acknowledge receipt immediately, process asynchronously, provide status polling endpoint |
| **Flat priority model** | All notifications in one queue means a flash sale campaign blocks OTP delivery. | Multi-lane priority queues with dedicated consumers; transactional lane is never starved by marketing volume |
| **Storing rendered payloads** | Pre-rendering at ingest time means stale data if notification is delayed and per-locale explosion of stored payloads. | Render at send time; store template + data, not rendered output |
| **Ignoring provider feedback** | Not processing 410/UNREGISTERED responses means token database grows with garbage indefinitely. | Dedicated feedback processing pipeline that immediately deactivates invalid tokens |
| **No idempotency** | Network retries between caller and ingestion API cause duplicate notifications to users. | Require `Idempotency-Key` header; dedup cache with 24-hour window |
| **Monolithic fan-out** | Single process expanding 100M user segment to 200M device tokens runs out of memory. | Partitioned fan-out: split by user_id hash across workers; stream devices in pages; checkpoint progress |

---

## 6. Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---|---|---|
| "How do you guarantee a notification is delivered?" | Understand the limits of your control | "We can guarantee delivery to the provider (at-least-once with retries and dedup). But delivery to the device depends on the provider, device state (powered on, connected), and OS battery optimization. We track handoff success and provide fallback channels (email, in-app) for critical messages." |
| "Can you achieve exactly-once delivery?" | Know the distributed systems theory | "True exactly-once delivery is impossible across the provider boundary. We achieve effectively-once by using idempotency keys at ingestion, deduplication before provider handoff, and collapse keys at the device level. The provider may deliver duplicates in edge cases (network partition during ACK), but the device's notification grouping hides this from users." |
| "What if APNs goes down for an hour?" | Test failure thinking and graceful degradation | "APNs messages queue in our pipeline with configurable TTL (typically 24 hours). When APNs recovers, the backlog drains. We don't lose messages. FCM, HMS, and Web Push continue normally—provider failures are isolated by bulkhead pattern. For critical transactional notifications (security alerts), we trigger email fallback after 5 minutes of APNs failure." |
| "How do you handle 10x traffic overnight?" | Test scaling thinking beyond 'add more servers' | "The queue-based architecture inherently buffers spikes. Auto-scaling adds fan-out workers and provider adapter instances within 2 minutes. The key bottleneck is provider rate limits, not our infrastructure—we can enqueue 10x faster than providers will accept. So we activate campaign pacing to spread the 10x over the burst window while prioritizing transactional notifications." |
| "Why not use WebSockets instead of push providers?" | Understand why push notifications exist | "WebSockets require the app/browser to maintain a persistent connection—this works for in-app real-time features but not for notifications when the app is closed. Push providers maintain a single system-level connection shared across all apps, handle battery optimization, and work even when the app isn't running. They solve the 'notify the user when they're not using the app' problem that WebSockets can't." |
| "How do you handle notification fatigue?" | Think about user experience, not just infrastructure | "Three layers: (1) User-controlled preferences (per-category opt-in/out, quiet hours, max daily limit), (2) System-level frequency capping (no more than N notifications per user per hour, regardless of source), (3) ML-based send-time optimization (predict when user is most likely to engage, batch non-urgent notifications). The goal is that every notification the user sees feels valuable." |

---

## 7. Quick Reference Cards

### 7.1 Numbers to Know

| Metric | Value |
|---|---|
| APNs payload limit | 4 KB |
| FCM data payload limit | 4 KB |
| FCM multicast batch size | 500 tokens |
| APNs HTTP/2 concurrent streams | ~500 per connection |
| APNs silent push throttle | ~1 per 20 minutes per device |
| FCM token staleness threshold | 270 days |
| Typical notification open rate | 5–8% |
| Typical token staleness rate | 5–10% per month |
| VAPID JWT algorithm | ECDSA P-256 |
| Web Push encryption | AES-128-GCM with ECDH key agreement |

### 7.2 Architecture Decision Cheat Sheet

| Question | Default Answer | Exception |
|---|---|---|
| Sync or async API? | Async (202 Accepted) | Device registration can be sync (201 Created) |
| Queue topology? | Multi-lane by priority | Single lane acceptable at < 1M notifications/day |
| Provider connection model? | Persistent connection pools | Web Push: per-request (each endpoint is different) |
| Delivery tracking? | Per-device for transactional, aggregate for marketing | Per-device for all if < 100M daily sends |
| Template rendering? | Server-side at send time | Client-side acceptable for data-only (silent) push |
| Segment evaluation? | Pre-computed for scheduled, real-time for event-triggered | All real-time acceptable at < 1M segment sizes |

### 7.3 Component Scaling Priorities

```
Priority 1 (Scale First):
├── Fan-Out Engine (CPU + I/O bound; partitioned by user_id hash)
├── Provider Adapter Pools (I/O bound; scale per provider independently)
└── Device Registry Cache (memory bound; expand cluster on miss rate)

Priority 2 (Scale on Demand):
├── Ingestion API (stateless; auto-scale on CPU/request rate)
├── Template Renderer (CPU bound; auto-scale on render queue depth)
└── Message Queues (add partitions for throughput; add brokers for capacity)

Priority 3 (Scale Rarely):
├── Scheduling Service (low throughput; active-passive sufficient)
├── Preference Service (cached aggressively; scale on cache miss rate)
└── Analytics Pipeline (lag-tolerant; scale when lag exceeds threshold)
```

---

## 8. Extension Topics (If Interviewer Asks)

| Extension | Key Points to Mention |
|---|---|
| **Rich notifications (images, actions)** | Images require CDN-hosted URLs (providers fetch from URL); action buttons require client-side intent handling; APNs Notification Service Extension for custom rendering |
| **Deep linking** | Notification payload includes URI scheme (app://path) or Universal Links/App Links; deferred deep linking for users who don't have the app installed yet |
| **Notification inbox (persistent)** | Server-side notification inbox as fallback for missed push; requires inbox API + pagination; sync with push delivery status |
| **Cross-device notification sync** | When user opens notification on phone, dismiss on tablet; requires notification_id correlation + sync protocol |
| **Geofencing-triggered notifications** | Client-side geofence monitoring + server-side trigger; cannot use push to "pull" location—privacy violation |
| **Progressive delivery (canary sends)** | Send to 1% of audience first; monitor error/open rates; auto-expand or halt if anomaly detected |

---

*Previous: [Observability](./07-observability.md) | Next: [Insights ->](./09-insights.md)*
