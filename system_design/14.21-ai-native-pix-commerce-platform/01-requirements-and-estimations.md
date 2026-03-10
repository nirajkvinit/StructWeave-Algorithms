# Requirements & Estimations — AI-Native PIX Commerce Platform

## Functional Requirements

| ID | Requirement | Description |
|---|---|---|
| FR-01 | **PIX QR Code Payments** | Generate static and dynamic (COB/COBV) QR codes following the BR Code/EMVCo specification; host dynamic charge endpoints with JWT-encoded payment details; support expiration, single-use, and amount-locked QR variants; embed merchant order metadata for automated reconciliation |
| FR-02 | **PIX Key Management** | Register and manage merchant PIX keys (CPF, CNPJ, phone, email, random/EVP) in the DICT; handle key portability and ownership claims; support multiple keys per merchant account with routing rules; AI-assisted key selection recommending the optimal key type for each merchant's use case |
| FR-03 | **PIX Automático (Recurring)** | Implement mandate-based recurring billing: customer authorization flow, mandate registration with amount/frequency/start-date, automated charge submission 2-10 days before billing date per BCB rules, mandate lifecycle management (creation, modification, cancellation), retry logic for failed debits, and AI-predicted churn scoring |
| FR-04 | **PIX por Aproximação (NFC)** | Support contactless PIX payments via NFC-enabled terminals; integrate with digital wallet providers; enforce R$500 per-transaction limit; sub-3-second terminal-to-settlement latency; device compatibility management across Android NFC variants |
| FR-05 | **Split Payment Orchestration** | Configure split rules per marketplace seller (percentage or fixed amount splits); embed split instructions in PIX initiation; atomic multi-party settlement via SPI; support commission deduction, logistics fee allocation, and platform fee extraction; real-time split tracking dashboards |
| FR-06 | **AI Fraud Detection** | Pre-transaction fraud scoring completing in <200ms: device fingerprinting, behavioral biometrics, transaction graph analysis against DICT data, velocity anomaly detection, social engineering pattern recognition, geolocation consistency checks; configurable risk thresholds per merchant segment |
| FR-07 | **Instant Settlement & Reconciliation** | Real-time matching of SPI settlement confirmations (endToEndId) against merchant orders; automated discrepancy detection (amount mismatch, missing settlement, duplicates); settlement reporting with merchant-level and transaction-level granularity; AI-powered anomaly detection for systematic reconciliation gaps |
| FR-08 | **Nota Fiscal Integration** | Auto-generate NF-e (goods), NFS-e (services), or NFC-e (consumer retail) for each PIX payment; compute correct tax rates (ICMS, ISS, PIS, COFINS) based on merchant location, product category, and applicable tax regime; submit XML to SEFAZ via web services; handle rejection, correction, and cancellation flows |
| FR-09 | **MED (Special Return Mechanism)** | Implement BCB's Mecanismo Especial de Devolução workflow: receive fraud reports from payer PSPs, block funds in receiving account within mandated timeframe, trace fund movement across accounts (MED 2.0 multi-hop tracing), execute return transfers, and maintain audit trail for BCB compliance |
| FR-10 | **Merchant Onboarding & KYC** | AI-assisted merchant registration: CNPJ validation, Receita Federal data verification, beneficial ownership analysis, risk scoring based on business category and transaction projections, automated PSP enrollment with SPI connectivity testing, and ongoing due diligence monitoring |
| FR-11 | **Dynamic Pricing QR** | AI-generated dynamic pricing embedded in QR payloads: time-of-day pricing adjustments, demand-based surge pricing for high-traffic periods, loyalty discount application, bundle pricing for multi-item orders, and A/B testing of pricing strategies via different QR endpoint configurations |
| FR-12 | **PIX Copia e Cola** | Generate and validate text-based PIX payment strings for digital commerce (e-commerce checkout, in-app payments, messaging-based sales); payload validation following BR Code specification; deep-link integration for mobile banking app redirection |

---

## Out of Scope

| Item | Rationale |
|---|---|
| **Card payment processing** | Platform is PIX-native; card acquiring is handled by separate payment processors |
| **International remittances** | PIX is a domestic-only system; cross-border transfers use different BCB infrastructure |
| **Cryptocurrency/Drex integration** | Brazil's CBDC (Drex) is still in pilot phase and operates on separate rails |
| **Lending/credit products** | PIX Garantias and credit lines are separate financial products requiring distinct licensing |
| **Physical terminal hardware** | Platform provides software APIs; terminal hardware manufacturing/distribution is out of scope |

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| **QR Code Generation Latency** | p50 < 50ms, p99 < 200ms | Dynamic QR must be displayed instantly in merchant POS or e-commerce checkout; includes charge endpoint creation and payload signing |
| **DICT Key Lookup** | p50 < 5ms, p99 < 20ms | Key resolution is on the critical path of every PIX transaction; cached locally with DICT sync protocol for updates |
| **Fraud Scoring Latency** | p50 < 50ms, p99 < 200ms | Must complete before SPI submission; exceeding 200ms risks transaction timeout on the payer's PSP side |
| **End-to-End PIX Settlement** | p95 < 10 seconds | BCB target; includes payer authentication, DICT lookup, SPI message routing, and settlement confirmation |
| **Nota Fiscal Generation** | p50 < 2s, p99 < 8s | SEFAZ web service response time varies by state; generation should not block payment confirmation to merchant |
| **PIX Automático Billing** | 100% of mandates processed by scheduled time | Billing requests must be submitted 2-10 days before due date; zero tolerance for missed billing windows |
| **System Availability** | 99.99% (52 min downtime/year) | PIX operates 24/7/365; merchant payment acceptance cannot have scheduled downtime windows |
| **Settlement Reconciliation** | 99.95% auto-matched within 30 seconds | Less than 0.05% of transactions should require manual reconciliation investigation |

### Reliability Requirements

| Requirement | Target |
|---|---|
| **Zero data loss** | Every PIX transaction, settlement confirmation, and Nota Fiscal must be durably persisted before acknowledgment; write-ahead logging with synchronous replication |
| **Exactly-once settlement** | No duplicate settlements; idempotency enforced via endToEndId deduplication at the SPI integration layer |
| **Disaster recovery** | RPO = 0 (no data loss), RTO < 5 minutes; multi-region active-passive with synchronous replication for transaction data |
| **Graceful degradation** | If Nota Fiscal generation fails, payment processing continues; tax document generation retried asynchronously; if AI fraud scoring times out, fall back to rule-based scoring |

---

## Capacity Estimations

### Transaction Volume

| Metric | Value | Derivation |
|---|---|---|
| **Total PIX daily volume (Brazil)** | ~250 million transactions | BCB data: 7.9 billion monthly transactions as of late 2025 |
| **P2B (commerce) share** | ~44% of total | P2B surpassed P2P in September 2025 |
| **Daily commerce transactions** | ~110 million | 250M × 44% |
| **Platform target market share** | 2-5% of P2B | Mid-tier PSP serving SME merchants |
| **Platform daily transactions** | 2.2-5.5 million | 110M × 2-5% |
| **Peak-to-average ratio** | 3:1 | Lunch hour (11:00-13:00) and month-end spikes |
| **Peak transactions per second** | ~190 TPS (at 5% share) | 5.5M / 86,400 × 3 peak factor |

### Storage Estimates

| Data Category | Per-Transaction Size | Daily Volume (5M txns) | Monthly Storage |
|---|---|---|---|
| **Transaction records** | ~2 KB | 10 GB | 300 GB |
| **QR code payloads** | ~1 KB (dynamic) | 5 GB | 150 GB |
| **Nota Fiscal XML** | ~15 KB (authorized) | 75 GB | 2.25 TB |
| **Fraud scoring logs** | ~3 KB | 15 GB | 450 GB |
| **Settlement confirmations** | ~1 KB | 5 GB | 150 GB |
| **Audit/compliance logs** | ~2 KB | 10 GB | 300 GB |
| **Total** | ~24 KB | 120 GB/day | ~3.6 TB/month |

### Nota Fiscal Volume

| Metric | Value |
|---|---|
| **Daily NF-e/NFS-e/NFC-e** | ~5 million (one per transaction) |
| **SEFAZ API calls/day** | ~10 million (submission + status check) |
| **XML storage (5-year retention)** | ~135 TB (legally mandated retention period) |
| **Digital certificate operations** | ~5 million/day (XML signing) |

### DICT Synchronization

| Metric | Value |
|---|---|
| **Total DICT keys (Brazil)** | ~800 million registered keys |
| **Local DICT cache size** | ~50 GB (key + account mapping data) |
| **Cache refresh rate** | ~500K updates/day (new registrations, portability, deletions) |
| **Lookup rate (platform)** | ~5 million/day (one per transaction + retries) |

### Network Bandwidth

| Flow | Bandwidth |
|---|---|
| **SPI messages (inbound + outbound)** | ~50 Mbps sustained, 150 Mbps peak |
| **SEFAZ API traffic** | ~100 Mbps sustained (XML payloads are large) |
| **DICT sync traffic** | ~10 Mbps sustained |
| **Merchant API traffic** | ~200 Mbps sustained (QR generation, webhooks, dashboards) |
| **Total** | ~360 Mbps sustained, ~1 Gbps peak |

### Infrastructure Sizing

| Component | Specification |
|---|---|
| **Payment processing cluster** | 16-24 nodes, 32 vCPU / 64 GB RAM each |
| **Fraud scoring cluster** | 8-12 nodes with ML inference accelerators |
| **Database cluster** | 6-node distributed SQL cluster, 10 TB SSD per node |
| **DICT cache** | 4-node in-memory cluster, 64 GB RAM each |
| **Nota Fiscal processing** | 8-12 nodes (XML generation and SEFAZ API calls are CPU-intensive) |
| **Message queue cluster** | 6-node cluster for event streaming |
