# Interview Guide — Incident Management System

## 1. Forty-Five-Minute Pacing

| Phase | Minutes | Focus | Key Deliverables |
|-------|---------|-------|-----------------|
| **Requirements** | 0-7 | Scope the system; clarify alert sources, notification channels, scale | Written functional/non-functional requirements; capacity estimates |
| **High-Level Design** | 7-20 | Draw the architecture; data flow from alert to notification | Architecture diagram with all major components; explain the alert lifecycle |
| **Deep Dive** | 20-35 | Go deep on 1-2 components (dedup engine, escalation state machine, or notification pipeline) | Algorithms, data structures, handling race conditions |
| **Scalability & Reliability** | 35-42 | Address the meta-reliability problem; alert storms; multi-region | Scaling strategy, fault tolerance, degraded modes |
| **Wrap-up** | 42-45 | Trade-offs, monitoring, future improvements | Summary of key decisions and their justifications |

---

## 2. Requirements Phase (Minutes 0-7)

### 2.1 Clarifying Questions to Ask

| Question | Why It Matters |
|----------|---------------|
| "What's the scale — how many monitored services and teams?" | Determines whether you need a single-region or multi-region design |
| "What notification channels are required?" | Phone/SMS have fundamentally different reliability and cost profiles than push/Slack |
| "What's the expected alert volume during normal operations vs. a major incident?" | Drives capacity planning and determines whether dedup is a must-have |
| "Do we need automated remediation (runbooks) or just notification?" | Adds significant security complexity if runbooks can modify production |
| "What availability does the incident platform itself need?" | Surfaces the meta-reliability requirement early |
| "Is this a multi-tenant SaaS or a single-organization deployment?" | Multi-tenant adds tenant isolation, noisy-neighbor protection |

### 2.2 Requirements You Should Propose

Even if the interviewer doesn't mention them, demonstrate awareness of:
- **Alert deduplication** — Without it, the system is useless during storms
- **Escalation policies** — Without them, a sleeping on-call engineer means a missed incident
- **Multi-channel notification with failover** — Single-channel systems have single points of failure
- **Post-incident review** — Shows you understand the learning loop, not just the fire-fighting

---

## 3. High-Level Design Phase (Minutes 7-20)

### 3.1 Components to Draw

At minimum, your architecture must include:

1. **Alert Ingestion Gateway** — API + normalizer (don't skip normalization)
2. **Durable Queue** — Between ingestion and processing (explain why: decoupling, zero alert loss)
3. **Deduplication Engine** — With fingerprint store
4. **On-Call Resolver** — Schedule evaluation
5. **Escalation Engine** — Timer-driven, separate from lifecycle manager
6. **Notification Dispatcher** — Multi-channel with failover
7. **Incident Database** — State persistence
8. **Analytics / Postmortem** — Learning loop

### 3.2 Data Flow to Trace

Walk through the happy path: Alert arrives → normalized → queued → fingerprint computed → dedup check → new incident created → on-call resolved → escalation started → L1 notified → L1 acknowledges → escalation cancelled.

Then trace the failure path: L1 doesn't acknowledge → timer fires → L2 notified → L2 acknowledges.

### 3.3 Common Mistakes in This Phase

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| No queue between ingestion and processing | Alert storms will overwhelm processing; alerts will be lost | Always show a durable queue for decoupling |
| Dedup and incident creation in the same box | These are different concerns with different scaling profiles | Separate components with clear interfaces |
| Single notification channel | "Just send a push notification" ignores that phones can be on DND, batteries die, apps crash | Multi-channel with preference-based routing |
| Ignoring the meta-reliability problem | If the platform is down, who pages you about the platform being down? | Mention meta-monitoring early; it impresses interviewers |

---

## 4. Deep Dive Phase (Minutes 20-35)

The interviewer will likely ask you to go deep on one of these. Be prepared for all three.

### 4.1 Deep Dive: Alert Deduplication

**Key points to cover:**
- Fingerprint computation (hash of dedup_key)
- Sliding window with TTL extension
- The contention problem during storms (atomic CAS)
- Multi-layer dedup: exact → rule-based → time-window → ML semantic
- Trade-off: over-grouping (hiding incidents) vs. under-grouping (noise)

**Trap question:** "What if two different incidents produce the same fingerprint?"
- **Good answer:** The dedup_key is configurable by the integration. If the key is too coarse (e.g., just "service_name"), different incidents will collide. The default key includes source + class + service, which is specific enough for most cases. For critical services, customers can add custom fields to the dedup_key to increase specificity.

### 4.2 Deep Dive: Escalation State Machine

**Key points to cover:**
- State diagram: L1_notified → L2_notified → L3_notified → repeat or exhausted
- Timer management: persistent timer wheel with crash recovery
- The ACK/escalation race condition (optimistic concurrency with generation counter)
- Design choice: unnecessary notification (safe) vs. missed escalation (dangerous)

**Trap question:** "What happens if the escalation engine crashes and restarts?"
- **Good answer:** Timers are persisted to a durable store. On restart, the engine loads all pending timers and fires any that are overdue. This may cause a burst of escalation notifications, but "late notification" is always better than "no notification." The generation counter on the escalation state prevents duplicate processing.

### 4.3 Deep Dive: Notification Delivery

**Key points to cover:**
- Channel selection based on user preferences × severity × time-of-day
- Per-channel retry logic with exponential backoff
- Channel failover chain (push → SMS → phone)
- Phone call specifics: voicemail detection, IVR for acknowledgment, multi-provider failover
- Notification dedup (don't page the same person twice for the same incident)

**Trap question:** "How do you guarantee notification delivery?"
- **Good answer:** You can't guarantee delivery for any single channel (phones can be off, push tokens expire, SMS gets spam-filtered). You guarantee delivery through redundancy: multiple channels with failover, multiple providers per channel, and escalation as the ultimate backstop. If L1 doesn't respond through any channel, L2 is paged. The system doesn't guarantee delivery to one person — it guarantees that someone is notified.

---

## 5. Scalability & Reliability Phase (Minutes 35-42)

### 5.1 Must-Discuss Topics

1. **Alert storm scaling** — How the system handles 100x normal alert volume
2. **The meta-reliability paradox** — The incident platform must be more reliable than everything it monitors
3. **Multi-region active-active** — Why single-region is unacceptable for this system
4. **Degraded mode operation** — What happens when components fail (queue bypass, cache-only scheduling, push-only notifications)

### 5.2 Key Trade-Offs to Articulate

| Trade-Off | Option A | Option B | Recommended |
|-----------|----------|----------|-------------|
| Dedup accuracy vs. noise | Conservative dedup (more incidents, less risk of hiding problems) | Aggressive dedup (fewer incidents, risk of over-grouping) | Start conservative, tune toward aggressive per-service |
| Notification latency vs. cost | Phone every engineer immediately | Push first, phone only after push timeout | Per-severity: phone for P1, push-first for P3 |
| Consistency vs. availability for incident state | Strong consistency (CP) | Eventual consistency (AP) | AP with domain-specific conflict resolution (ACK wins over escalation) |
| Single-region simplicity vs. multi-region reliability | Cheaper, simpler, lower latency | Survives region failure, more complex | Multi-region is non-negotiable for incident platforms |
| Fingerprint dedup vs. ML grouping | Deterministic, debuggable, fast | More flexible, can group "related but different" alerts | Fingerprint as baseline; ML as optional enhancement |

---

## 6. Evaluation Criteria

### 6.1 What Strong Candidates Demonstrate

| Signal | Example |
|--------|---------|
| **Understands the meta-reliability problem** | Proactively mentions that the incident platform must not share infrastructure with what it monitors |
| **Thinks about failure modes, not just happy paths** | Discusses what happens when telephony providers go down, when the database fails during a storm |
| **Designs for alert storms** | Includes dedup, backpressure, and graceful degradation in the initial design, not as an afterthought |
| **Handles race conditions in the escalation engine** | Identifies the ACK/escalation timer race and proposes a concrete solution |
| **Considers the human element** | Discusses alert fatigue, on-call burden, and why notification channel selection matters |
| **Traces the complete lifecycle** | Can walk through alert → dedup → route → notify → acknowledge → resolve → postmortem without gaps |

### 6.2 What Weak Candidates Do

| Anti-Pattern | Problem |
|-------------|---------|
| Treat it as "just a notification system" | Miss dedup, escalation, lifecycle management, and postmortems |
| Skip deduplication | The system is useless during storms without dedup — this is the core technical challenge |
| Single notification channel | "We'll just send an email" — emails get lost in spam, ignored at night, and provide no delivery guarantee |
| Don't address the meta-reliability problem | If your incident platform goes down with the infrastructure, you've designed a system that fails precisely when it's needed most |
| Over-engineer with ML from the start | ML-based dedup is a luxury; start with fingerprint-based dedup and prove it works first |
| Ignore the escalation timer race condition | Shows lack of experience with concurrent state machines |

---

## 7. Variations and Follow-Ups

| Variation | Key Differences |
|-----------|----------------|
| "Design for a 10-person startup vs. 10,000-person enterprise" | Startup: single schedule, Slack-only notification, no runbooks. Enterprise: multi-team, multi-channel, full automation |
| "Add AI-powered incident response" | Auto-correlation of alerts with recent deployments; auto-suggested remediation; auto-generated postmortems |
| "Design just the on-call scheduling system" | Deep dive into rotation algorithms, override handling, fairness metrics, timezone complexity |
| "Focus on the notification pipeline only" | Deep dive into multi-channel delivery, provider failover, delivery guarantees, and cost optimization |
| "How would you migrate from PagerDuty to a custom system?" | Data migration, dual-running period, integration rewiring, rollback strategy |

---

## 8. Quick Reference: Numbers to Know

| Metric | Value | Source |
|--------|-------|--------|
| PagerDuty SLA | 99.9% web availability, zero scheduled downtime | Industry benchmark |
| Median P1 MTTR (high-performing teams) | 30-45 minutes | Industry surveys |
| Median P1 MTTA | 3-5 minutes | Industry surveys |
| Alert storm multiplier | 50-100x normal volume | Common during cascading failures |
| Dedup ratio during storms | 50:1 to 500:1 | Depends on architecture and failure mode |
| Phone call setup latency | 5-15 seconds | Telephony provider dependent |
| Push notification latency | 0.5-3 seconds | Push service dependent |
| On-call rotation size (healthy) | 4-8 engineers per rotation | Industry best practice |
| After-hours pages (healthy team) | < 2 per week per engineer | SRE best practice |
