# Requirements & Estimations — AI-Native WhatsApp+PIX Commerce Assistant

## Functional Requirements

### Core Features (In Scope)

1. **Text-Based Payment Initiation** — Parse natural language Portuguese text messages to extract payment intent, amount, recipient (PIX key or contact name), and optional memo; handle colloquialisms, abbreviations, and code-switching
2. **Voice Message Payment** — Transcribe WhatsApp voice messages (Opus codec) using speech-to-text, extract payment entities, resolve recipient ambiguity, and present interpreted request for user confirmation
3. **QR Code Photo Recognition** — Detect and decode PIX QR codes (static BR Code and dynamic COB/COBV) from user-submitted photos; handle perspective distortion, partial occlusion, and low-resolution images
4. **Document/Screenshot OCR** — Extract PIX keys, boleto barcodes, and invoice amounts from screenshots, price lists, and forwarded images
5. **Secure Payment Execution** — Pre-fill transaction parameters from AI extraction, hand off to secure banking context for biometric/PIN authentication, execute PIX settlement via SPI, and return settlement confirmation
6. **In-Chat Receipt Generation** — Deliver structured transaction receipts within the WhatsApp conversation, including transaction ID (endToEndId), amount, recipient, timestamp, and optional NFC-e fiscal document
7. **Multi-Turn Conversation Management** — Track payment flow state across multiple messages, handle amendments ("actually make it R$75"), disambiguation ("which Maria?"), and interruptions (unrelated messages mid-flow)
8. **Balance & Transaction History Queries** — Respond to balance inquiries and recent transaction lookups within the conversational interface
9. **Group Expense Splitting** — Parse requests to split payments among multiple recipients, calculate individual shares, and initiate multiple PIX transactions
10. **Conversational Fraud Detection** — Detect social engineering indicators (coached responses, unusual transaction patterns, new high-value recipients) and apply progressive friction

### Explicitly Out of Scope

- Full banking services (loans, investments, insurance) beyond payment initiation
- WhatsApp-to-WhatsApp money transfer (Meta's native WhatsApp Pay product)
- Credit card payment processing (this system is PIX-only)
- Merchant onboarding and KYC (handled by the underlying bank/PSP)
- Physical POS terminal integration (PIX por Aproximacao / NFC)
- Cross-border payments (PIX is domestic only)

---

## Non-Functional Requirements

### CAP Theorem & Consistency

| Aspect | Choice | Justification |
|---|---|---|
| **CAP Priority** | CP for payment execution, AP for conversation state | Payment transactions must never produce inconsistent settlement; conversation state can tolerate brief staleness and eventual reconciliation |
| **Consistency Model** | Strong consistency for ledger operations; eventual consistency for conversation views and analytics | PIX settlement is atomic and irrevocable via SPI; conversation state uses event sourcing with eventual projection updates |
| **Idempotency** | Exactly-once payment semantics via WhatsApp message ID deduplication + distributed lock per conversation | WhatsApp webhooks deliver at-least-once; the payment pipeline must guarantee no duplicate settlements |

### Availability & Latency

| Metric | Target | Rationale |
|---|---|---|
| **System Availability** | 99.95% (26 min downtime/month) | Matches WhatsApp Cloud API SLA; cannot exceed the platform's own availability |
| **Webhook Acknowledgment** | p99 < 2 seconds | WhatsApp retries after 20 seconds; must acknowledge well within this window |
| **Text Intent Extraction** | p95 < 1.5 seconds | User expects near-instant response in a chat context |
| **Voice Transcription + Extraction** | p95 < 4 seconds | Voice messages average 8-15 seconds; processing should complete before user context-switches |
| **QR Code Recognition** | p95 < 3 seconds | Photo upload + CV processing + BR Code decoding + optional dynamic QR fetch |
| **Payment Confirmation (pre-auth)** | p95 < 2 seconds | Time from user confirming intent to generating the secure handoff link |
| **End-to-End Settlement** | p95 < 10 seconds | Includes SPI settlement (3-10 seconds) + receipt generation |
| **Receipt Delivery** | p99 < 5 seconds post-settlement | In-chat receipt must arrive promptly after the user completes authentication |

### Durability & Data Retention

| Data Type | Retention | Storage |
|---|---|---|
| Transaction records | 5 years (BCB regulatory requirement) | Append-only ledger with encrypted storage |
| Conversation logs | 90 days active, 2 years archived | Encrypted, PII-masked after 90 days |
| Voice message audio | 24 hours (processing only) | Deleted after transcription; only transcript retained |
| QR code images | 24 hours (processing only) | Deleted after extraction; only decoded payload retained |
| Audit logs | 5 years | Immutable, hash-chained |
| AI model artifacts | Version-controlled, indefinite | Model registry with lineage tracking |

---

## Capacity Estimations (Back-of-Envelope)

**Assumptions:**
- Target: mid-size Brazilian fintech (e.g., PicPay-scale) with 30M registered users
- 10% DAU rate (active WhatsApp banking users): 3M DAU
- Average 2.5 payment-related conversations per active user per day
- 60% text, 25% voice, 15% image/QR
- Peak traffic: 3x average (salary day, Black Friday)
- PIX transaction conversion rate: 40% of conversations result in a payment

| Metric | Estimation | Calculation |
|---|---|---|
| **Registered Users** | 30M | Mid-size Brazilian fintech |
| **DAU** | 3M | 10% of registered users |
| **Daily Conversations** | 7.5M | 3M DAU x 2.5 conversations |
| **Daily Payment Transactions** | 3M | 7.5M conversations x 40% conversion |
| **Messages per Conversation** | 4-6 avg | Intent + clarification + confirmation + receipt |
| **Daily Inbound Messages** | ~35M | 7.5M conversations x 4.7 avg messages |
| **Daily Voice Messages** | ~8.75M | 25% of 35M messages |
| **Daily Image Messages** | ~5.25M | 15% of 35M messages |
| **Average QPS (messages)** | ~405 | 35M / 86,400 seconds |
| **Peak QPS (messages)** | ~1,215 | 3x average |
| **Average QPS (payments)** | ~35 | 3M / 86,400 seconds |
| **Peak QPS (payments)** | ~105 | 3x average |
| **Voice Processing (audio hours/day)** | ~1,460 hours | 8.75M messages x avg 6 seconds each |
| **QR Images Processed/day** | ~2.6M | ~50% of image messages contain QR codes |
| **Storage (Year 1)** | ~15 TB | Transaction records + conversation logs + metadata |
| **Storage (Year 5)** | ~85 TB | Growth + 5-year retention for regulatory |
| **Bandwidth (inbound)** | ~12 Gbps peak | Voice (150KB avg) + images (200KB avg) + text |
| **Cache Size** | ~50 GB | Conversation state + user profiles + DICT cache |

---

## SLOs / SLAs

| Metric | Target | Measurement | Consequence of Breach |
|---|---|---|---|
| **Availability** | 99.95% | Successful webhook processing / total webhooks received | Payment channel offline; users revert to banking app |
| **Webhook Latency (p99)** | < 2s | Time from webhook receipt to 200 acknowledgment | WhatsApp retries, potential duplicate processing |
| **Payment Success Rate** | > 99.5% | Successful settlements / total payment attempts | Revenue loss, user trust erosion |
| **Intent Extraction Accuracy** | > 95% (text), > 90% (voice) | Correct extraction on first attempt / total extractions | Excessive confirmation loops, poor UX |
| **QR Recognition Success Rate** | > 92% | Successful QR decodes / total QR image submissions | User fallback to manual entry, frustration |
| **False Positive Fraud Rate** | < 0.5% | Legitimate transactions blocked / total transactions | User friction, support costs |
| **Receipt Delivery Latency (p95)** | < 5s post-settlement | Time from SPI confirmation to receipt message sent | User uncertainty about payment status |
| **Error Rate** | < 0.1% | 5xx errors / total requests | System degradation signal |

---

## Traffic Patterns

### Daily Pattern

```
Messages/sec
1200 |                              ****
1100 |                           ***    ***
1000 |                         **          **
 900 |                       **              **
 800 |          ****        *                  *
 700 |       ***    ***   **                    *
 600 |     **          ***                       **
 500 |   **                                        **
 400 | **                                            **
 300 |*                                                **
 200 |                                                   ***
 100 |                                                      ****
     +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
     00 02 04 06 08 10 12 14 16 18 20 22 24
                        Hour (BRT)

Peak 1: 11:00-13:00 (lunch commerce, bill payments)
Peak 2: 18:00-21:00 (evening purchases, dinner splits)
Salary days (5th, 15th, 30th): 2-3x normal volume
```

### Monthly Spikes

| Event | Multiplier | Duration |
|---|---|---|
| **Salary Days (5th, 15th, 30th)** | 2-3x | 24-48 hours |
| **Black Friday** | 5-8x | 3 days |
| **Christmas/New Year** | 3-5x | 1 week |
| **Carnival** | 2x | 4 days |
| **Back to School (February)** | 1.5x | 1 week |

---

## Cost Estimation

| Component | Monthly Cost (at scale) | Notes |
|---|---|---|
| **WhatsApp Cloud API Messages** | ~R$700K | 35M messages/day x R$0.02 per utility template + free-tier conversation messages |
| **AI/LLM Inference (text)** | ~R$400K | 21M text messages/day x LLM call per message |
| **Speech-to-Text** | ~R$250K | 8.75M voice messages/day, ~1,460 hours audio/day |
| **Computer Vision (QR + OCR)** | ~R$150K | 5.25M images/day |
| **Compute (services)** | ~R$300K | Microservices, API gateways, state management |
| **Storage** | ~R$50K | Transaction records, conversation logs, models |
| **PIX Integration (SPI/DICT)** | ~R$100K | Network connectivity, certificates, compliance |
| **Total** | ~R$1.95M/month | ~R$0.65 per active user/month |
