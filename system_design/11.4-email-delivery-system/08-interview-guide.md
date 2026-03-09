# Interview Guide — Email Delivery System

## 1. Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Actions |
|---|---|---|---|
| 0–5 min | **Clarify & Scope** | Understand requirements, ask smart questions | Ask about scale (transactional vs. marketing), ISP targets, SLA requirements |
| 5–10 min | **Core Abstractions** | Define the email lifecycle and key components | Draw the message pipeline: Ingest → Validate → Render → Sign → Queue → Deliver |
| 10–20 min | **High-Level Architecture** | System components, data flow, queue design | Multi-stage queue with domain partitioning; MTA fleet; tracking infrastructure |
| 20–35 min | **Deep Dive** | Pick 2 critical components for depth | IP reputation management OR adaptive ISP throttling OR bounce handling |
| 35–42 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios, reliability | Suppression lookup at scale, shared IP isolation, ISP blocking recovery |
| 42–45 min | **Wrap Up** | Summarize decisions, handle follow-ups | Recap key trade-offs; mention what you'd add with more time |

---

## 2. Clarifying Questions to Ask

### 2.1 Must-Ask Questions

| Question | Why It Matters | What It Reveals |
|---|---|---|
| "Are we designing for transactional email, marketing email, or both?" | Radically different requirements: transactional = low latency, marketing = high throughput | Shapes queue architecture, priority model, and ISP throttling strategy |
| "What's the target sending volume? Millions/day or billions/month?" | Determines whether you need a simple SMTP relay or a full MTA fleet with IP pools | Drives scaling decisions, IP management complexity, and infrastructure cost |
| "Do we need to manage sender reputation, or assume a single trusted sender?" | Single sender = simpler; multi-tenant with shared IPs = the hard problem | Reveals the multi-tenancy isolation and reputation management challenge |
| "What's the delivery SLA? Sub-second for password resets, or minutes are fine?" | Determines whether you need priority queues and dedicated transactional paths | Shapes queue architecture and ISP throttling strategy |
| "Do we need engagement tracking (opens, clicks)?" | Tracking adds significant infrastructure: pixel servers, click proxies, bot detection | Determines whether tracking is in scope or out of scope |

### 2.2 Advanced Questions (Demonstrate Depth)

| Question | What It Shows |
|---|---|
| "Should we handle ISP-specific throttling, or treat all recipients equally?" | You understand that Gmail, Microsoft, and Yahoo have different rate limits and policies |
| "Do we need DMARC alignment, or just basic SPF/DKIM?" | You know email authentication is multi-layered and ISPs now mandate full alignment |
| "How do we handle the shared IP reputation problem?" | You understand the core multi-tenancy challenge unique to email platforms |
| "Should opens/clicks count bot activity, or filter for human engagement?" | You're aware of Apple MPP, Gmail image proxy, and enterprise scanner challenges |
| "What's our position on fail-open vs. fail-closed for suppression checks?" | You understand the trade-off: miss suppressed addresses (compliance risk) vs. block all sends (availability risk) |

---

## 3. Key Design Decisions & Trade-offs

### 3.1 Trade-off Matrix

| Decision | Option A | Option B | Recommendation |
|---|---|---|---|
| **Queue architecture** | Single queue with priority field | Multi-stage queues (priority → domain → connection) | **Option B**: Domain-level queues enable per-ISP throttling; priority separation prevents marketing from blocking transactional |
| | Pros: Simple, single consumer | Pros: Independent ISP rate control, transactional isolation | |
| | Cons: Head-of-line blocking, no ISP-specific control | Cons: More complex, multiple consumer groups | |
| **Suppression storage** | Relational DB with indexed lookups | Bloom filter + cache + persistent KV store | **Option B**: Bloom filter handles 99.9% of lookups in microseconds; critical at 115K lookups/sec |
| | Pros: ACID, familiar, rich queries | Pros: Sub-microsecond for most lookups, scales linearly | |
| | Cons: 5ms+ per lookup × 115K/sec = bottleneck | Cons: Bloom filter has false positives (0.1%); requires multi-layer approach |
| **IP pool strategy** | Single shared pool for all customers | Tiered pools (shared/premium/dedicated) with quality gates | **Option B**: Isolates bad actors; protects good senders; enables premium pricing |
| | Pros: Simple, maximum IP utilization | Pros: Reputation isolation, tiered SLA, bad-actor containment | |
| | Cons: One bad sender ruins deliverability for all | Cons: More IPs needed, complex pool management |
| **Bounce retry strategy** | Fixed retry schedule (retry every 30 min) | Adaptive exponential backoff per ISP | **Option B**: ISPs respond differently; uniform retry can trigger rate limits |
| | Pros: Predictable, simple to implement | Pros: Respects ISP signals, better delivery rates, avoids IP blocks | |
| | Cons: Wastes capacity on ISPs that won't accept yet | Cons: More complex state management per message |
| **Template rendering** | Client-side rendering (customer sends final HTML) | Server-side MJML rendering with variable interpolation | **Both**: Support both; server-side for template users, passthrough for pre-rendered HTML |
| | Pros: Customer has full control, no rendering overhead | Pros: Responsive design guaranteed, personalization, A/B testing | |
| | Cons: Inconsistent across email clients, no personalization | Cons: CPU cost, template versioning complexity |
| **Open tracking accuracy** | Count all pixel loads as opens | Bot detection to classify human vs. machine opens | **Option B**: Since 2025, ISPs and customers demand "human opens" metric; raw opens are inflated 30-50% by bots |
| | Pros: Simple, higher numbers (customers like big numbers) | Pros: Accurate signal for deliverability optimization | |
| | Cons: Misleading metrics, bad optimization decisions | Cons: Classification is imperfect, some human opens miscategorized |

### 3.2 Architecture Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| **Sync vs. async delivery** | Async (API returns 202 immediately) | Email delivery is inherently asynchronous (SMTP is store-and-forward); blocking the API on delivery would require minutes of connection hold |
| **Custom MTA vs. off-the-shelf** | Custom MTA for delivery; standard components elsewhere | The MTA's per-ISP throttling, connection pooling, and IP rotation logic is the platform's core differentiator; generic SMTP servers don't provide this |
| **Event sourcing for message lifecycle** | Yes | Message state (accepted → queued → delivered → opened) is naturally an append-only event log; enables replay, audit, and webhook replay |
| **DKIM key storage** | HSM/KMS, never extractable | DKIM private keys are the crown jewels; compromise means anyone can sign emails as your customer's domain |
| **Suppression fail-mode** | Fail-closed (block sends) | Sending to suppressed address = compliance violation + reputation damage; blocking all sends temporarily is less harmful than legal liability |

---

## 4. Trap Questions & How to Handle

### 4.1 Common Trap Questions

| Trap Question | What Interviewer Wants | Best Answer |
|---|---|---|
| "Why not just use a simple SMTP server and scale horizontally?" | Understand that email delivery isn't just SMTP | "A basic SMTP server handles the protocol, but the hard problem is deliverability. ISPs throttle, block, and filter based on IP reputation, authentication, and engagement signals. Without per-ISP throttling, bounce management, and reputation tracking, scaling SMTP servers just means getting blocked faster." |
| "Why do you need a multi-stage queue? Can't one queue handle everything?" | Test understanding of per-ISP requirements | "A single queue creates head-of-line blocking. If Gmail is throttling us, all messages — including those to Outlook — wait behind the Gmail backlog. Domain-partitioned queues let each ISP drain independently. Add priority separation to prevent marketing campaigns from blocking transactional emails." |
| "Can't you just check if an email exists before sending?" | Understand that recipient validation is unreliable | "SMTP VRFY is disabled by almost all ISPs (it's an anti-spam measure). You can verify MX records exist for a domain, but you cannot verify individual mailboxes pre-send. The only reliable signal is the SMTP response during actual delivery — which is why bounce handling is architecturally critical." |
| "Why not encrypt all emails end-to-end?" | Understand protocol limitations | "SMTP doesn't natively support end-to-end encryption. TLS encrypts the transport (server-to-server), but the receiving server decrypts. S/MIME and PGP exist for end-to-end, but require recipient key management which > 99% of recipients don't have. Our focus is transport security (TLS, MTA-STS, DANE) and authentication (DKIM, DMARC)." |
| "What if the suppression database goes down?" | Test failure mode thinking | "We fail closed — block all sends until restored. This sounds drastic, but the alternative (sending to suppressed addresses) violates CAN-SPAM, triggers spam complaints, and damages IP reputation. The bloom filter running in-process provides partial coverage (~99.9% accurate) as a degraded mode." |
| "How do you handle a customer who sends 10 million emails to a bad list?" | Test multi-tenant isolation thinking | "This is the shared IP reputation problem. Quality gates monitor per-account bounce rates and complaint rates in real-time. If a customer exceeds thresholds (e.g., > 5% bounce rate), we auto-suspend their sending before they damage the shared IP pool. Enterprise customers on dedicated IPs only damage their own reputation." |
| "Why not just retry forever instead of bouncing?" | Understand ISP relationship dynamics | "Infinite retries are worse than bouncing. If an ISP rejects with 5xx, retrying wastes our sending capacity, annoys the ISP, and doesn't help the undeliverable address. More importantly, ISPs monitor retry behavior — aggressive retrying damages sender reputation. The 72-hour retry window for soft bounces (RFC recommendation) balances delivery probability against reputation cost." |

### 4.2 Advanced Trap Questions

| Trap Question | Best Answer |
|---|---|
| "How do you measure deliverability if you don't control the receiving side?" | "We use three approaches: (1) Seed-based monitoring — maintain test accounts at major ISPs and send seed emails to verify inbox vs. spam placement; (2) ISP postmaster tools — Gmail Postmaster Tools, Microsoft SNDS provide aggregated delivery data; (3) Engagement feedback — if recipients open and click, it's in the inbox. None are perfect, but together they give 90%+ visibility." |
| "What happens when Gmail changes their filtering algorithm?" | "This is a constant reality, not a hypothetical. Gmail's November 2025 enforcement phase fundamentally changed from warnings to active rejection. Our architecture handles this through: (1) Real-time monitoring detects drops within minutes; (2) Adaptive throttling automatically reduces rates on increased deferrals; (3) Postmaster team relationships provide advance notice; (4) A/B testing on sending patterns identifies what the new algorithm favors." |
| "How do you prevent your own platform from being used for phishing?" | "Layered defense: (1) New accounts have strict sending limits and content scanning; (2) Domain verification prevents sending from unowned domains; (3) Content scanning checks URLs against phishing databases; (4) Behavioral monitoring detects high bounce rates (indicating scraped lists); (5) Automated suspension when thresholds exceeded; (6) Human compliance team reviews edge cases. Even with all this, some abuse gets through — the key is detection speed (minutes, not hours)." |

---

## 5. Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Do Instead |
|---|---|---|
| **Treating email as simple send-and-forget** | Email delivery is a complex negotiation with ISPs that control the receiving side | Discuss ISP relationships, reputation management, and the feedback loop between delivery signals and sending behavior |
| **Designing a single queue for all traffic** | Different recipient domains have different rate limits; transactional and marketing have different latency requirements | Design multi-stage queues: priority separation → domain partitioning → IP assignment |
| **Ignoring sender reputation** | Reputation determines inbox placement more than content quality | Make reputation management a first-class architectural component with monitoring, warming, and isolation |
| **Assuming you can validate recipients before sending** | SMTP VRFY is disabled; pre-validation is unreliable | Design for bounces as a normal part of the system; build robust bounce classification and suppression |
| **Choosing fail-open for suppression checks** | Sending to suppressed addresses is a legal violation and reputation destroyer | Always fail-closed for compliance data; design the suppression store for extreme availability |
| **Using sequential connections for SMTP** | Opening new SMTP connection per message wastes 50-60ms per message in handshake overhead | Connection pooling, SMTP pipelining, batch delivery per connection |
| **Ignoring bot detection for engagement tracking** | Apple MPP, Gmail proxy, and enterprise scanners inflate open/click rates by 30-50% | Bot classification is now mandatory for accurate metrics (since 2025 ISP mandates) |
| **Over-engineering the template engine** | Template rendering is important but well-understood; not the novel challenge | Spend depth on the MTA pipeline, reputation management, or bounce handling — the unique challenges |

---

## 6. Quick Reference Cards

### 6.1 Email Authentication Stack

| Protocol | What It Does | DNS Record | Key Detail |
|---|---|---|---|
| **SPF** | Authorizes sending IPs | TXT on sender domain | 10-lookup limit; `include:` counts toward limit |
| **DKIM** | Signs email content cryptographically | TXT or CNAME on `selector._domainkey.domain` | RSA-2048 or Ed25519; header + body hash |
| **DMARC** | Policy for SPF/DKIM failures | TXT on `_dmarc.domain` | Policies: `none`, `quarantine`, `reject`; requires SPF or DKIM alignment |
| **ARC** | Preserves auth through forwarding | Added by intermediate servers | Chain of trust for forwarded/mailing list emails |
| **BIMI** | Displays brand logo in inbox | TXT on `default._bimi.domain` | Requires DMARC `p=reject` + VMC certificate |
| **MTA-STS** | Enforces TLS for receiving | JSON at `https://mta-sts.domain/.well-known/mta-sts.txt` | Prevents downgrade attacks to plaintext SMTP |

### 6.2 SMTP Response Code Cheat Sheet

| Code | Meaning | Classification | Action |
|---|---|---|---|
| 250 | OK, message accepted | Success | Mark delivered |
| 421 | Service not available, try later | Soft bounce | Retry with backoff |
| 450 | Mailbox unavailable (busy) | Soft bounce | Retry with backoff |
| 451 | Server error, try later | Soft bounce | Retry with backoff |
| 452 | Insufficient storage | Soft bounce | Retry after delay |
| 550 | Mailbox doesn't exist | Hard bounce | Suppress address |
| 551 | User not local | Hard bounce | Suppress address |
| 552 | Message too large | Permanent | Drop; notify sender |
| 553 | Mailbox name invalid | Hard bounce | Suppress address |
| 554 | Transaction failed | Hard bounce / Block | Investigate; may be IP block |

### 6.3 Key Numbers to Know

| Metric | Value | Context |
|---|---|---|
| Global daily email volume | ~350 billion | Total worldwide email traffic |
| Large ESP monthly volume | 100-200B emails/month | Major platform scale |
| Gmail's bulk sender threshold | 5,000 emails/day | Triggers enhanced authentication requirements |
| Gmail max connections per IP | ~100-500 | Varies by IP reputation |
| DKIM signature overhead | ~350 bytes (RSA-2048) | Per-message header cost |
| Spam complaint rate threshold | 0.3% | Google/Yahoo/Microsoft will block above this |
| IP warming period | 4-6 weeks | From cold (50/day) to warm (500K/day) |
| SMTP session overhead | 4-6 round trips | EHLO + STARTTLS + MAIL FROM + RCPT TO + DATA |
| Open rate inflation from bots | 30-50% | Apple MPP + Gmail proxy + enterprise scanners |
| Email bounce rate target | < 2% | Google/Yahoo/Microsoft requirement for bulk senders |
| One-click unsubscribe requirement | RFC 8058 | Required for marketing emails since Feb 2024 |

### 6.4 System Comparison Matrix

| Feature | Simple SMTP Relay | This System (Full ESP) | Difference |
|---|---|---|---|
| Throughput | 1K-10K/hour | 100M+/hour | 10,000x scale |
| IP management | 1-2 IPs | 500-2000+ IPs with pools | Reputation at scale |
| ISP throttling | None (send as fast as possible) | Per-ISP adaptive rate control | Deliverability optimization |
| Bounce handling | Log and ignore | Classify, suppress, score, alert | Automated list hygiene |
| Tracking | None | Open, click, unsubscribe with bot detection | Full engagement analytics |
| Authentication | Basic SPF | SPF + DKIM + DMARC + ARC + BIMI | Full authentication stack |
| Compliance | Manual | Automated CAN-SPAM, GDPR, one-click unsub | Regulatory compliance |

---

## 7. Whiteboard Tips

### 7.1 Start with This Diagram

```
Client → [API/SMTP Ingest] → [Validate + Suppress] → [Render + Sign]
                                                            ↓
ISPs ← [MTA Fleet] ← [Throttle] ← [Domain Queues] ← [Priority Queue]
  ↓                                                        ↑
[Bounce/FBL] → [Suppression Store] ─────────────────── [Validate]

[Tracking Servers] → [Event Pipeline] → [Webhooks + Analytics]
```

### 7.2 If Asked to Go Deeper, Focus On:

1. **The multi-stage queue** — This is the heart of the system. Explain priority → domain → IP stages.
2. **IP reputation management** — This is the unique challenge. No other system design has this exact problem.
3. **Suppression at scale** — The bloom filter + cache + persistent store architecture shows data structure knowledge.

### 7.3 What NOT to Focus On:

- Don't spend time on user authentication/authorization (it's standard API key auth)
- Don't deep-dive into template rendering (it's a well-understood rendering problem)
- Don't spend more than 30 seconds on "what is SMTP" — assume the interviewer knows

---

*Previous: [Observability](./07-observability.md) | Next: [Insights ->](./09-insights.md)*
