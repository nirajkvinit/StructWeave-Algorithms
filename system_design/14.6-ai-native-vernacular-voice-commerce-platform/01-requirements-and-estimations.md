# 14.6 AI-Native Vernacular Voice Commerce Platform — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **Multilingual ASR engine** — Convert spoken audio in 22+ Indian languages (plus English and code-mixed variants) into accurate text transcripts; support streaming recognition for real-time phone calls and batch recognition for WhatsApp voice notes; handle narrowband telephony audio (8 kHz) and wideband smartphone audio (16 kHz+) | Word error rate (WER) ≤ 15% for top 8 languages (Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati); WER ≤ 25% for low-resource languages; code-mixed speech WER ≤ 20%; streaming partial results within 200 ms |
| FR-02 | **Language detection and routing** — Automatically detect the speaker's language from the first 2–3 seconds of audio; continuously monitor for language switches within a session; route audio to the appropriate language-specific or multilingual ASR model | Detection accuracy ≥ 95% within 3 seconds; support mid-sentence code-switching detection; handle 22+ language variants including major dialects (Bhojpuri, Rajasthani, Marwari treated as dialect clusters) |
| FR-03 | **Voice-native product search and resolution** — Map spoken product references (including vernacular names, brand names, colloquial terms, and quantity expressions) to canonical product catalog entries through a multi-stage pipeline: entity extraction → vernacular name normalization → fuzzy phonetic matching → catalog lookup → disambiguation | Support 500,000+ SKU catalog; vernacular name dictionary with 50,000+ regional product synonyms across 22 languages; phonetic matching tolerance for ASR errors; disambiguation dialog for ambiguous matches (≤ 3 candidates presented) |
| FR-04 | **Conversational dialog management** — Maintain multi-turn dialog state for commerce interactions including product discovery, cart management, order placement, delivery scheduling, and complaint resolution; support slot-filling for structured data (address, payment method, delivery time) alongside open-ended conversational exchanges | Context retention across 20+ turns; graceful handling of topic switches, corrections, and interruptions; slot-filling with confirmation for critical fields (quantity, total amount); dialog history persistence for session resumption |
| FR-05 | **Text-to-speech synthesis** — Generate natural-sounding speech responses in 22+ languages with appropriate prosody, intonation, and speaking rate; support regional accent matching (respond in a prosodic style matching the user's dialect); dynamically adjust for numbers, currency, addresses, and product names | Mean opinion score (MOS) ≥ 3.8/5.0 for top 8 languages; latency ≤ 300 ms for first audio chunk; SSML support for emphasis, pauses, and pronunciation customization; speaking rate adaptation based on user profile (slower for new/elderly users) |
| FR-06 | **Telephony gateway** — Handle inbound and outbound phone calls via SIP trunking with real-time bidirectional audio streaming; support concurrent call capacity scaling; provide DTMF fallback for input in low-connectivity scenarios; manage call transfer to human agents with context preservation | Support 10,000+ concurrent calls at peak; call setup latency ≤ 2 seconds; barge-in detection (user interrupts system speech); echo cancellation and noise suppression at the gateway level; call recording with consent management |
| FR-07 | **WhatsApp voice note commerce** — Process inbound WhatsApp voice notes (variable length 1–120 seconds, Opus codec); extract commerce intent and entities; generate voice note or text responses; manage asynchronous multi-turn commerce conversations through the WhatsApp Business API | Voice note processing latency ≤ 5 seconds for 30-second message; support mixed voice-and-text conversations; product image and catalog card delivery via WhatsApp; order confirmation via interactive message templates |
| FR-08 | **Outbound voice campaign orchestration** — Execute outbound calling campaigns for order confirmations, delivery notifications, payment reminders, promotional offers, and customer re-engagement; generate dynamic call scripts personalized per customer based on order history, language preference, and time-of-day optimization | Campaign throughput: 100,000+ calls per day; answer rate optimization via time-of-day and day-of-week scheduling; DND (Do Not Disturb) registry compliance; dynamic script generation with personalized product recommendations; call outcome classification (answered, voicemail, callback requested) |
| FR-09 | **Voice-based order management** — Enable full order lifecycle management through voice: place new orders, modify existing orders (add/remove items, change quantities), cancel orders, track delivery status, and initiate returns/refunds—all through spoken conversation without requiring any text input or visual interface | Order placement confirmation with item-by-item verbal verification; real-time inventory check during voice session; address capture and verification through spoken dialog; payment initiation via voice with OTP confirmation |
| FR-10 | **Voice payment processing** — Facilitate payment completion through voice channel: read out total amount, initiate UPI payment request, guide COD (cash on delivery) selection, verify OTP through spoken digits, and confirm payment status—maintaining PCI compliance throughout the voice interaction | UPI collect request generation within voice session; OTP capture via DTMF or spoken digits (with digit-by-digit confirmation); payment confirmation read-back; support for COD, UPI, and prepaid wallet payment modes |
| FR-11 | **Vernacular product catalog enrichment** — Continuously expand the multilingual product synonym dictionary by mining voice interaction logs (with consent) to discover new regional product names, brand name pronunciations, quantity expressions, and colloquial terms that are not in the existing lexicon | Automated synonym candidate extraction from mismatched voice sessions; human-in-the-loop validation for new synonyms; per-language synonym coverage tracking; monthly synonym dictionary growth target of 500+ new entries |
| FR-12 | **Voice analytics and quality monitoring** — Analyze voice interaction patterns to measure ASR accuracy per language, intent detection accuracy, order conversion rates, call completion rates, and customer satisfaction; sample and review voice interactions for quality assurance | Per-language WER tracking on production traffic; intent accuracy monitoring per commerce flow; conversation drop-off funnel analysis; automated quality scoring of voice interactions; sentiment analysis from voice prosody |
| FR-13 | **Human agent handoff** — Seamlessly transfer complex or failed voice interactions to human agents; provide the agent with full conversation transcript, detected intent, partial cart state, and customer profile; support warm transfer (AI introduces the situation to the agent) and cold transfer | Handoff latency ≤ 5 seconds; full context transfer including ASR transcript, detected entities, cart state; agent can see real-time ASR of ongoing caller speech; escalation triggers: repeated ASR failures, customer frustration detection, complex complaint |
| FR-14 | **Feature phone and USSD fallback** — Support voice commerce on feature phones via IVR with ASR; provide USSD-based menu fallback for areas with poor voice quality; handle missed-call-based callback initiation for zero-cost access | DTMF + ASR hybrid input on IVR; USSD session management with 180-second timeout; missed-call trigger for outbound callback; feature phone compatibility testing across 50+ handset models |

---

## Out of Scope

- **Visual commerce features** — No image-based product search, AR try-on, or video commerce; this system is purely voice-first
- **Full marketplace operations** — No seller onboarding, inventory management, or logistics management; the platform integrates with existing commerce backends
- **Credit and lending** — No buy-now-pay-later or credit scoring; payment processing is limited to immediate settlement methods (UPI, COD, wallet)
- **Physical store management** — No POS integration, barcode scanning, or in-store navigation; the platform operates exclusively through remote voice channels
- **Content creation and publishing** — No voice-based content management, podcast creation, or audio advertising; voice is used solely for commerce transactions

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| ASR streaming latency (p95) | ≤ 300 ms per audio chunk | Real-time conversation requires partial results within human perception threshold |
| End-to-end voice response latency (p95) | ≤ 1.2 s (voice-in to first audio byte out) | Beyond 1.5 s, conversational flow breaks; users repeat themselves causing ASR confusion |
| Language detection latency (p99) | ≤ 500 ms from first speech | Must route to correct ASR model before significant audio is lost |
| TTS first-byte latency (p95) | ≤ 300 ms | Streaming TTS must begin before full response text is generated |
| Product resolution latency (p95) | ≤ 500 ms (entity extraction + catalog match) | Must complete within the NLU → response generation window |
| WhatsApp voice note processing (p95) | ≤ 5 s for 30-second voice note | Asynchronous but user expects near-real-time response |
| Outbound call connection (p95) | ≤ 3 s from dial to first ring | Standard telephony expectation |
| Human agent handoff (p95) | ≤ 5 s with full context transfer | User should not perceive a delay or need to repeat information |

### Reliability & Availability

| Metric | Target |
|---|---|
| Voice platform availability | 99.95% (≤ 4.4 hours downtime/year) |
| ASR service availability | 99.99% for top 8 languages; 99.9% for remaining languages |
| Telephony gateway availability | 99.99% — call drops are unacceptable during active conversations |
| Dialog manager availability | 99.95% — stateful sessions must survive component restarts |
| Commerce backend integration | 99.9% — depends on upstream catalog and order management systems |
| Voice data durability | 99.999999999% (11 nines) for transaction-linked recordings |
| Session state durability | Session state must survive single-node failures; replicated across 2+ nodes |

### Scalability

| Metric | Target |
|---|---|
| Concurrent phone calls | 10,000 (peak: 25,000 during festivals/promotions) |
| WhatsApp voice notes processed per day | 500,000 (peak: 1.5M) |
| Outbound calls per day | 100,000 (campaigns) + 200,000 (transactional notifications) |
| Unique daily active voice users | 2M |
| Product catalog size | 500,000 SKUs × 22 languages of metadata |
| Vernacular synonym dictionary entries | 500,000+ mappings |
| ASR model variants hosted concurrently | 30+ (22 languages × narrowband/wideband × domain variants) |
| Voice interaction logs stored per day | 50 TB (raw audio) + 5 TB (transcripts + metadata) |

### Security & Compliance

| Requirement | Specification |
|---|---|
| Voice data privacy | Audio recordings encrypted at rest (AES-256) and in transit (TLS 1.3/SRTP); recording consent obtained verbally at call start; configurable retention periods (7–90 days) with auto-deletion |
| Telephony regulation | TRAI (India) compliance for outbound calling: DND registry check, calling hours (9 AM–9 PM), caller ID display; per-country compliance for international markets |
| Biometric voice data | Voice prints (if used for authentication) classified as sensitive personal data; stored separately from audio recordings; explicit opt-in consent required; right to deletion honored within 48 hours |
| Payment security | OTP spoken over phone never stored in plaintext; DTMF OTP input preferred over spoken digits; PCI DSS compliance for voice-initiated payment flows; no credit card numbers captured via voice |
| Data localization | Voice data for Indian users stored within India; cross-border data transfer compliance for multi-country deployment |

---

## Capacity Estimations

### Concurrent Calls and Messages

| Parameter | Value | Derivation |
|---|---|---|
| Daily active users (DAU) | 2M | Target for mature platform serving MSME commerce |
| Voice sessions per DAU | 1.5 | Mix of ordering (1/day) and tracking/support (0.5/day) |
| Total daily voice sessions | 3M | 2M × 1.5 |
| Average session duration | 3.5 min (phone calls), 45 s cumulative (WhatsApp voice notes) | Commerce calls are longer than support queries |
| Peak concurrent phone calls | 25,000 | 3M sessions × 0.4 phone ratio × 3.5 min / (16 peak hours × 60 min) × 3x peak multiplier |
| Peak concurrent WhatsApp sessions | 50,000 | Higher concurrency but lower resource per session |
| Phone call minutes per day | 4.2M minutes | 3M × 0.4 × 3.5 min |
| WhatsApp voice note minutes per day | 1.35M minutes | 3M × 0.6 × 0.75 min |

### Audio Processing Compute

| Parameter | Value | Derivation |
|---|---|---|
| ASR inference per phone call minute | 60 forward passes (1 per second, streaming) | 200 ms chunks with 100 ms overlap |
| Total ASR inferences per day | 333M | (4.2M + 1.35M) min × 60 inferences/min |
| ASR GPU-seconds per inference | 0.015 s (A100 with optimized model) | Batch size 1, streaming mode |
| Total ASR GPU-hours per day | 1,388 hours | 333M × 0.015 / 3600 |
| TTS inferences per day | 6M | ~2 TTS responses per session × 3M sessions |
| TTS GPU-seconds per inference | 0.08 s (average 5-second response) | Streaming synthesis on A100 |
| Total TTS GPU-hours per day | 133 hours | 6M × 0.08 / 3600 |
| NLU inferences per day | 15M | ~5 NLU calls per session × 3M sessions |
| NLU GPU-seconds per inference | 0.02 s | Transformer-based intent + entity model |
| Total NLU GPU-hours per day | 83 hours | 15M × 0.02 / 3600 |
| **Total GPU-hours per day** | **~1,604 hours** | ASR dominant; ~67 A100 GPUs running 24/7 |

### Storage

| Parameter | Value | Derivation |
|---|---|---|
| Raw audio per day | 44 TB | 5.55M minutes × 8 kHz × 16-bit mono = ~5.3 TB (narrowband) + smartphone audio at higher bitrate; Opus compressed ~8:1 |
| Compressed audio per day | 5.5 TB | 44 TB / 8 (Opus compression) |
| Transcripts and metadata per day | 2 GB | ~3M sessions × 700 bytes average transcript |
| Dialog state snapshots per day | 1.5 GB | 3M sessions × 500 bytes average state |
| Audio retention (30-day default) | 165 TB | 5.5 TB × 30 days |
| Monthly storage growth (metadata only, after audio TTL) | 105 GB | Transcripts + metadata + analytics aggregates |

### Bandwidth

| Parameter | Value | Derivation |
|---|---|---|
| Inbound audio bandwidth (peak) | 3.2 Gbps | 25,000 concurrent calls × 128 kbps (Opus) |
| Outbound audio bandwidth (peak) | 3.2 Gbps | Symmetric for TTS responses |
| Internal ASR pipeline bandwidth | 6.4 Gbps | Bidirectional audio + metadata |
| WhatsApp API bandwidth | 500 Mbps | Voice note upload/download + media messages |
| **Total peak bandwidth** | **~13.3 Gbps** | Dominated by concurrent phone call audio |

### Compute (GPU Infrastructure)

| Parameter | Value | Derivation |
|---|---|---|
| ASR model VRAM per language | 2–4 GB (distilled), 8–12 GB (full) | Distilled models for high-traffic languages; full models for low-resource |
| Total ASR models loaded | 30+ variants | 22 languages × narrowband/wideband; some share multilingual models |
| GPU memory for model hosting | 160 GB | Mix of distilled and full models across GPU pool |
| Peak ASR GPU utilization | 80% of 100 A100s | 25,000 concurrent calls each needing ~15 ms/inference every second |
| TTS model hosting | 40 GB | 22 language voices, each 1–2 GB |
| NLU model hosting | 20 GB | Shared multilingual transformer + language-specific heads |
| **Total GPU infrastructure** | **~120 A100 (80 GB) GPUs** | Including headroom for failover and burst capacity |
