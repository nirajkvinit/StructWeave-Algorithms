# 14.2 AI-Native Conversational Commerce Platform (WhatsApp-First) — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **Webhook ingestion and message processing** — Receive inbound messages, delivery status updates, and read receipts from WhatsApp Cloud API via HTTPS webhooks; validate X-Hub-Signature-256 for authenticity; deduplicate at-least-once deliveries; route to appropriate processing pipeline based on message type (text, interactive reply, media, order, payment status) | Must acknowledge with HTTP 200 within 20 seconds; handle webhook verification challenge for initial setup; support concurrent processing of 10,000+ webhooks/second during broadcast reply surges |
| FR-02 | **Conversational AI engine** — Classify user intent from natural language messages (browse, search, add-to-cart, checkout, order-status, support, complaint); extract entities (product names, quantities, colors, sizes, price ranges); maintain multi-turn conversation context with coreference resolution ("show me the red one" → resolve to most recent product); generate contextual responses in the customer's language | Support 12+ Indian languages with code-mixing detection; intent classification accuracy >92% on production traffic; sub-500ms classification latency; graceful fallback to human agent on confidence <0.7 |
| FR-03 | **Catalog management and sync** — Maintain merchant product catalog with up to 500 SKUs per business number; bidirectional sync with WhatsApp Commerce Manager via Meta's Catalog API; support bulk upload (CSV/spreadsheet), individual product CRUD, and real-time stock/price updates; transform catalog data into interactive message formats (single-product, multi-product up to 30 items, catalog browse) | Sync latency <5 minutes for stock updates; handle image optimization for WhatsApp (max 5 MB per image); category and variant management; search indexing with vernacular query support |
| FR-04 | **Cart management** — Maintain per-customer shopping cart within conversation context; support add, remove, update quantity, and clear operations via natural language commands; display cart summary as formatted WhatsApp message; handle cart persistence across conversation sessions (customer returns after 2 days to complete purchase); apply discount codes and promotional pricing | Cart TTL of 7 days; stock reservation at checkout initiation (not at add-to-cart to avoid phantom locks); cart recovery messaging for abandoned carts (24-hour template message) |
| FR-05 | **Order processing and lifecycle** — Create orders from confirmed carts; manage order state machine (created → payment_pending → paid → confirmed → processing → shipped → out_for_delivery → delivered → completed); send automated WhatsApp template messages at each state transition; support order cancellation, return initiation, and refund processing via conversational flow | Order confirmation within 30 seconds of payment; unique order ID generation; integration with merchant's fulfillment workflow (webhook callbacks or dashboard) |
| FR-06 | **Payment integration** — Generate and send in-chat payment requests using WhatsApp's order-details message format with UPI intent links; process payment confirmations via payment gateway webhooks; support multiple payment methods (UPI, cards, net banking, wallets, COD); handle payment timeouts with automated reminders; reconcile payments with orders | Payment confirmation latency <30 seconds; retry logic for failed payment webhook delivery; partial payment support; refund processing within 5-7 business days |
| FR-07 | **Broadcast campaign engine** — Create and schedule template-based broadcast campaigns with audience segmentation (by purchase history, engagement recency, location, language preference); personalize messages with dynamic variables (customer name, product recommendations, order updates); enforce WhatsApp frequency caps (max 2 marketing messages per user per 24 hours); monitor quality rating and pause campaigns if rating degrades | Support audience sizes up to 1M contacts; campaign scheduling with timezone awareness; A/B testing of template variants (up to 3 variants with statistical significance testing); cost estimation before send |
| FR-08 | **Multi-agent routing and handoff** — Route conversations between AI chatbot and human agents based on query complexity, confidence score, and customer priority; support skill-based routing (sales, support, returns, technical) and language-based routing; transfer full conversation context including AI classification history and customer profile; manage agent availability, workload balancing, and SLA timers | Agent assignment latency <10 seconds; support for agent collision prevention (two agents don't pick up same conversation); conversation takeover and return-to-bot flows; after-hours auto-response with queue position |
| FR-09 | **Customer profile and CRM** — Build and maintain customer profiles from conversation history (purchase history, browsing patterns, language preference, preferred payment method, address, engagement score); segment customers for targeted campaigns; track customer lifetime value and purchase frequency | Profile built incrementally from conversations—no registration required; merge duplicate profiles (same customer messaging from different numbers); GDPR-style data export and deletion on request |
| FR-10 | **Merchant back-office dashboard** — Provide web-based dashboard for merchants to manage catalog, view orders, configure chatbot flows, create broadcast campaigns, monitor analytics (messages, orders, revenue, conversion rates), manage team members and agent assignments, and configure business settings (operating hours, auto-replies, greeting messages) | Mobile-responsive design for merchants who manage business from phone; real-time order notifications; daily/weekly business summary reports via WhatsApp to merchant |
| FR-11 | **Shipping and logistics integration** — Integrate with shipping aggregators for order fulfillment; generate shipping labels and tracking numbers; send tracking updates to customers via WhatsApp template messages; support multiple shipping partners with automated selection based on serviceability, speed, and cost | Support for 10+ shipping partners; real-time tracking status polling; estimated delivery date calculation; return pickup scheduling |
| FR-12 | **Template management and approval** — Manage library of WhatsApp message templates; submit templates to Meta for approval via API; track approval status; support template categories (marketing, utility, authentication, service); version templates with rollback capability; provide template builder with variable insertion and preview | Template approval monitoring with retry on rejection; template performance analytics (open rate, click rate, reply rate); automated template category classification to prevent miscategorization penalties |
| FR-13 | **Analytics and reporting** — Track end-to-end conversion funnel (message received → intent classified → catalog browsed → cart created → checkout initiated → payment completed → order delivered); measure AI resolution rate, agent productivity, broadcast campaign performance, and revenue attribution; generate merchant-facing reports | Real-time dashboard updates; cohort analysis by acquisition channel; revenue per conversation metric; cost per acquisition via broadcast ROI calculation |
| FR-14 | **WhatsApp Flows integration** — Support WhatsApp Flows for structured data collection (customer address, product customization, feedback forms) that require form-like input unsuitable for free-text conversation; design and deploy flows for checkout, registration, and survey use cases; collect structured responses and integrate into order/profile data | Flow completion rate tracking; fallback to conversational collection if flow fails; flow versioning and A/B testing |

---

## Out of Scope

- **Non-WhatsApp messaging channels** — Platform is WhatsApp-first; no Instagram, Facebook Messenger, Telegram, or SMS integration
- **Merchant website or app builder** — No web storefront generation; commerce happens entirely within WhatsApp
- **Warehouse management or fulfillment operations** — Integration with external shipping partners only; no internal logistics
- **Financial lending or credit products** — No BNPL (buy-now-pay-later) or merchant lending features
- **Marketplace aggregation** — Each merchant operates their own WhatsApp business number; no multi-merchant marketplace discovery

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Webhook acknowledgment (p99) | ≤ 5 s | WhatsApp retries after 20s timeout; must acknowledge well within window to prevent retry storms |
| Message processing latency (p95) | ≤ 2 s from webhook receipt to outbound response sent | Chat-native feel requires near-instant responses; users expect WhatsApp-speed delivery |
| Intent classification latency (p99) | ≤ 500 ms | Must not be bottleneck in message processing pipeline |
| Catalog search latency (p99) | ≤ 300 ms | Product search must feel instantaneous within conversation flow |
| Outbound message delivery (p95) | ≤ 3 s from send API call to delivery confirmation | WhatsApp Cloud API delivery time; platform controls only the send-side latency |
| Payment link generation (p99) | ≤ 2 s | Checkout flow must not have perceptible delay |
| Agent routing latency (p99) | ≤ 10 s | Customer should not wait long for agent assignment after escalation |
| Broadcast campaign throughput | 1M messages within 60 min | Large campaigns must complete within a reasonable window for time-sensitive promotions |
| Catalog sync latency (p95) | ≤ 5 min from inventory change to WhatsApp catalog update | Stock accuracy critical to prevent overselling |

### Reliability & Availability

| Metric | Target |
|---|---|
| Webhook ingestion availability | 99.99% — any downtime means lost customer messages with no recovery mechanism |
| Message processing pipeline availability | 99.95% — messages are queued so brief processing outages cause delay, not loss |
| Conversational AI service availability | 99.9% — fallback to human routing if AI is down |
| Payment processing availability | 99.9% — depends on external payment gateway uptime |
| Catalog sync service availability | 99.9% — brief outages cause sync lag, not data loss |
| Broadcast campaign service availability | 99.9% — scheduled campaigns can tolerate brief delays |
| Message durability | 99.999999999% (11 nines) — conversation history is the system of record for orders and disputes |
| Ordering guarantee | Per-conversation causal ordering for all messages and state transitions |

### Security & Compliance

| Requirement | Specification |
|---|---|
| WhatsApp Business Policy | Compliance with Meta's Commerce Policy, template messaging rules, frequency caps, and opt-in requirements; quality rating monitoring with automated corrective actions |
| Payment security | PCI-DSS compliance for payment data handling; tokenization of card data; UPI transaction verification via payment gateway webhooks |
| Data privacy | Customer conversation data encrypted at rest (AES-256) and in transit (TLS 1.3); GDPR-style data export and deletion; opt-in consent for marketing messages |
| Consent management | Explicit opt-in required before sending marketing template messages; opt-out processing within 24 hours; consent audit trail |
| Merchant data isolation | Strict tenant isolation—merchant A cannot access merchant B's customer data, conversations, or catalog; tenant ID enforced at every data access layer |

### Scalability Targets

| Metric | Target |
|---|---|
| Merchants (tenants) on platform | 100,000 active merchants |
| Messages processed per day | 50M inbound + 80M outbound = 130M total |
| Concurrent active conversations | 500,000 simultaneous conversations |
| Orders processed per day | 2M orders across all merchants |
| Broadcast messages per day | 30M template messages |
| Catalog items managed | 20M products across all merchants (avg 200 per merchant) |
| Customer profiles | 200M unique customer profiles |

---

## Capacity Estimations

### Message Processing Volume

**Assumptions:**
- 100,000 active merchants
- Average merchant: 500 inbound + 800 outbound messages/day
- Peak merchants (top 1%): 50,000 inbound + 80,000 outbound messages/day
- Broadcast campaigns add 30M outbound template messages/day

```
Message throughput:
  Inbound baseline: 50M / 86,400 sec = ~580 messages/sec
  Outbound baseline: 80M / 86,400 sec = ~926 messages/sec
  Broadcast peak: 30M in 4-hour prime window = ~2,083 messages/sec additional
  Combined peak (10 AM - 2 PM): 5x concentration = ~7,500 messages/sec
  Festival season peak: 3x baseline = ~22,500 messages/sec

  Per message processing pipeline:
    Webhook validation + deduplication: ~5 ms
    Intent classification (NLP): ~100 ms
    Business logic (catalog search, cart update, etc.): ~200 ms
    Response generation: ~150 ms
    Outbound API call to WhatsApp: ~300 ms
    Total wall-clock: ~500 ms (pipeline parallelized where possible)
```

### Conversation State Storage

```
Conversation state:
  500,000 concurrent active conversations
  Per conversation state: ~10 KB (cart, context window, classification history)
  Active state: 500K × 10 KB = 5 GB (fits in distributed cache)

  Conversation history (append-only):
    Average conversation: 30 messages × 500 bytes = 15 KB
    200M customer profiles × avg 10 conversations = 2B conversations
    Total history: 2B × 15 KB = 30 TB
    With compression: ~10 TB
    Retention: 2 years (merchant disputes + analytics)
```

### Catalog Storage and Sync

```
Catalog data:
  20M products across 100K merchants
  Per product: 2 KB metadata + 500 KB images (3 images avg) = ~502 KB
  Total catalog data: 20M × 2 KB = 40 GB (metadata)
  Total images: 20M × 500 KB = 10 TB (object storage)
  Search index: ~200 GB (inverted index + embeddings for vernacular search)

Catalog sync operations:
  Stock/price updates: 2M updates/day (avg 20 per merchant)
  Meta Catalog API calls: 2M/day
  Per sync: ~500 ms (API call to Meta)
  Daily compute: 2M × 500 ms = 1,000,000 seconds = ~11.6 CPU-days
  With 100 sync workers: handles peak within processing windows
```

### Broadcast Campaign Volume

```
Broadcast processing:
  30M template messages/day
  Concentrated in 2 sending windows (10 AM - 12 PM, 6 PM - 8 PM)
  Per window: 15M messages in 2 hours = ~2,083 messages/sec

  Per broadcast message:
    Audience filter + personalization: ~5 ms
    Template rendering: ~2 ms
    Frequency cap check: ~3 ms
    WhatsApp API call: ~300 ms
    Total: ~310 ms per message

  With 500 broadcast workers: 500 / 0.31 = ~1,600 messages/sec per worker pool
  Need 2 worker pools for peak throughput

  Cost estimation:
    Marketing template: ₹0.80 per message (India rate)
    30M messages/day: ₹2.4 crore/day = ₹72 crore/month
    Cost optimization (frequency capping, smart batching): ~20% savings
```

### Order Processing Volume

```
Order pipeline:
  2M orders/day across 100K merchants
  Per order lifecycle:
    Cart to order conversion: ~100 ms
    Payment link generation: ~200 ms
    Payment webhook processing: ~50 ms
    Order confirmation message: ~300 ms
    Shipping label generation: ~500 ms
    5 status update messages: 5 × 300 ms = 1,500 ms
    Total per order: ~2,650 ms of compute

  Daily compute: 2M × 2.65 s = 5,300,000 seconds = ~61.3 CPU-days
  With 200 order workers: handles peak with headroom

  Average order value: ₹800
  Daily GMV: 2M × ₹800 = ₹160 crore
  Monthly GMV: ₹4,800 crore (~$580M)
```

### NLP Processing Compute

```
NLP pipeline:
  50M inbound messages/day requiring classification
  Per message:
    Language detection: ~10 ms
    Code-mixing normalization: ~20 ms
    Intent classification: ~50 ms
    Entity extraction: ~30 ms
    Coreference resolution: ~40 ms
    Total NLP: ~150 ms

  Daily compute: 50M × 150 ms = 7,500,000 seconds = ~86.8 CPU-days
  With GPU inference (batch processing):
    Batch size 32, GPU throughput 500 classifications/sec
    Need ~28 GPU-hours/day for classification
    With 4 GPU workers: handles baseline within processing capacity
```

### Storage Summary

```
Conversation history (2-year retention):           ~10 TB (compressed)
Customer profiles (200M):                          ~200 GB
Catalog metadata (20M products):                   ~40 GB
Catalog images (20M products):                     ~10 TB (object storage)
Search index (catalog + vernacular):               ~200 GB
Order records (2M/day, 2-year):                    ~2 TB
Payment transaction logs (2-year):                 ~500 GB
Broadcast campaign records (1-year):               ~1 TB
Analytics materialized views:                      ~500 GB
Merchant configuration and templates:              ~50 GB
AI model artifacts and training data:              ~2 TB
Message queue (in-flight):                         ~50 GB (peak)
```

---

## SLO Summary

| SLO | Target | Measurement Window |
|---|---|---|
| Webhook acknowledgment p99 | ≤ 5 s | Rolling 1-hour |
| Message processing latency p95 | ≤ 2 s | Rolling 1-hour |
| Intent classification p99 | ≤ 500 ms | Rolling 1-hour |
| Catalog search p99 | ≤ 300 ms | Rolling 1-hour |
| Agent routing p99 | ≤ 10 s | Rolling 1-hour |
| Broadcast throughput | 1M messages in 60 min | Per campaign |
| Catalog sync latency p95 | ≤ 5 min | Rolling 1-hour |
| Webhook ingestion availability | 99.99% | Monthly |
| Message processing availability | 99.95% | Monthly |
| AI service availability | 99.9% | Monthly |
| Message durability | 99.999999999% | Annual |
| Conversation ordering guarantee | Per-conversation causal ordering | Per conversation |
| Frequency cap compliance | 100% adherence to WhatsApp limits | Per 24-hour window |
