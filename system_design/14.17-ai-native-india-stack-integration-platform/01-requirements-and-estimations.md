# Requirements & Estimations — AI-Native India Stack Integration Platform

## Functional Requirements

| # | Requirement | Details |
|---|---|---|
| FR-1 | **Aadhaar eKYC Integration** | Support both OTP-based and biometric-based eKYC flows; handle the full UIDAI authentication lifecycle including OTP generation, PID block encryption (2048-bit RSA), XML-DSIG signing, and encrypted KYC response decryption; return normalized identity data (name, address, DOB, photo, gender) from the eKYC response; support Aadhaar Paperless Offline eKYC (XML-based) as a non-UIDAI-dependent alternative |
| FR-2 | **Account Aggregator Consent Management** | Implement the full AA consent lifecycle per ReBIT specifications: consent request creation (specifying FIDataRange, ConsentMode, fetchType, Frequency, DataLife), consent status tracking (PENDING → ACTIVE → PAUSED → REVOKED → EXPIRED), consent artefact storage and validation, and consent notification handling from the AA; support both ONE-TIME and PERIODIC consent modes |
| FR-3 | **AA Financial Data Fetch** | Fetch financial information from FIPs via the AA channel: initiate FI data fetch sessions, handle session-level encryption (Diffie-Hellman key exchange using curve25519), decrypt and parse FIData across all ReBIT-specified FI types (DEPOSIT, TERM_DEPOSIT, RECURRING_DEPOSIT, CREDIT_CARD, MUTUAL_FUNDS, ETF, INSURANCE, SIP); normalize data across different FIP implementations |
| FR-4 | **DigiLocker Document Access** | Integrate with DigiLocker Pull API and Issuer API: fetch documents using document URIs (IssuerId-DocType-DocId format), support both PDF and XML document formats, validate digital signatures on fetched documents, handle issuer-specific schema variations; support common document types (PAN, driving license, GST certificate, FSSAI license, Udyam registration) |
| FR-5 | **eSign Integration** | Integrate with eSign Service Providers (ESP) via the eSign API: support Aadhaar OTP-based document signing, handle document hash generation and submission, receive and embed signed certificates in documents; ensure legal validity under Section 3A of the IT Act 2000; support batch signing for multi-page agreements |
| FR-6 | **UPI Payment Orchestration** | Integrate with UPI for payment collection and disbursement: initiate collect requests, handle UPI callbacks for payment confirmation, support UPI Lite for sub-₹500 micro-transactions, VPA validation, and real-time payment status tracking; support mandate registration for recurring payments (e.g., EMI collection) |
| FR-7 | **AI Credit Scoring** | Ingest AA financial data (bank statements, mutual fund holdings, insurance policies) and produce credit scores for thin-file applicants: extract 200+ features (income regularity, expense patterns, GST correlation, UPI merchant payments, bounce rates), run gradient-boosted scoring model, generate explainable score components for RBI compliance, and output lending recommendations |
| FR-8 | **Cross-DPI Workflow Orchestration** | Compose multi-DPI workflows as configurable DAGs: loan origination (eKYC → AA consent → data fetch → credit score → DigiLocker doc fetch → offer generation → eSign → UPI disbursal), MSME onboarding (eKYC → DigiLocker GST pull → AA consent → cash flow analysis), and custom workflows defined by business clients; support pause/resume at any workflow step |
| FR-9 | **Cross-DPI Fraud Detection** | Detect fraud patterns that span multiple DPI components: synthetic identity (eKYC passes but AA shows zero financial history), consent stuffing (FIU requests maximum-scope AA consent for a minimal use case), velocity attacks (same Aadhaar used for multiple eKYC across different entities in short time), device anomalies across eKYC sessions, and round-tripping in UPI + AA data |
| FR-10 | **Unified Identity Resolution** | Maintain a cross-DPI identity graph linking Aadhaar number, AA customer identifiers, DigiLocker account, UPI VPAs, PAN, and mobile number; handle identifier changes (mobile number portability, UPI VPA changes); provide identity confidence scoring based on the strength and recency of verification signals |
| FR-11 | **Consent Analytics Dashboard** | Provide business clients with real-time visibility into consent lifecycle: active consents by type, consent conversion rates, data fetch success rates per FIP, consent expiry alerts, revocation patterns, and regulatory compliance status; support consent audit trail export for regulatory inspection |
| FR-12 | **Multi-Tenant API Gateway** | Expose unified REST APIs to business clients with tenant isolation: per-tenant rate limiting, API key management, webhook configuration for async DPI callbacks, sandbox environment for integration testing (mock DPI responses), and usage-based billing metering |

---

## Out of Scope

| # | Item | Rationale |
|---|---|---|
| 1 | **Direct-to-consumer lending** | Platform provides AI scoring and DPI integration as infrastructure; actual lending decisions and fund management are the business client's responsibility |
| 2 | **Operating as an Account Aggregator** | Platform integrates with existing licensed AAs (Finvu, OneMoney, Anumati, etc.) rather than seeking NBFC-AA license |
| 3 | **Aadhaar enrollment or update** | Platform consumes Aadhaar authentication; enrollment and biometric update are UIDAI's domain |
| 4 | **UPI payment app (PSP)** | Platform integrates with UPI via existing PSP infrastructure rather than becoming a Payment Service Provider |
| 5 | **DigiLocker issuer operations** | Platform fetches documents from DigiLocker; issuing documents to DigiLocker is the government department's responsibility |
| 6 | **Offline/rural access** | Platform operates as a cloud-based API layer; offline-first architectures for rural connectivity are a separate system concern |

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| **eKYC Response Time (OTP)** | < 8 seconds end-to-end (includes OTP delivery + user input + UIDAI verification) | UIDAI's OTP delivery takes 2-10 seconds; platform overhead must be < 500ms |
| **eKYC Response Time (biometric)** | < 3 seconds end-to-end | Biometric capture and matching is faster than OTP; UIDAI target is 1-2 seconds |
| **AA Consent Creation** | < 2 seconds | Consent creation is a platform-side operation; should not depend on FIP latency |
| **AA Data Fetch (per FIP)** | < 15 seconds p50, < 45 seconds p95 | Large private bank FIPs respond in 2-5 seconds; smaller FIPs may take 30-90 seconds; platform sets 90-second timeout |
| **DigiLocker Document Fetch** | < 5 seconds for cached issuers, < 15 seconds for first-time fetch | Issuer response times vary; platform caches issuer endpoint metadata |
| **eSign Completion** | < 12 seconds (includes OTP for signing) | Similar to eKYC OTP flow; document hash submission adds ~500ms |
| **UPI Payment Confirmation** | < 5 seconds for success callback | NPCI mandates turnaround within 30 seconds; most complete in 2-5 seconds |
| **AI Credit Score Generation** | < 3 seconds after data ingestion | Feature extraction from 12 months of bank data (~2,000-5,000 transactions) must complete in <2 seconds; model inference in <500ms |
| **Workflow Orchestration Overhead** | < 200ms per workflow step transition | Workflow engine must not add perceptible latency beyond the DPI API call itself |
| **API Gateway Latency** | < 50ms overhead (p99) for request routing, auth, rate limiting | Gateway must not become a bottleneck for latency-sensitive DPI calls |

### Reliability & Availability

| Metric | Target | Rationale |
|---|---|---|
| **Platform Availability** | 99.95% (< 4.38 hours/year downtime) | Financial services grade; must exceed the availability of underlying DPI components |
| **eKYC Success Rate** | > 92% (first attempt) | UIDAI OTP delivery success is ~95%; biometric match success is ~85-90%; platform must optimize retry and fallback strategies |
| **AA Data Fetch Success Rate** | > 90% (across all FIPs) | FIP-level success varies from 70% to 97%; platform must track and route around poor-performing FIPs |
| **Workflow Completion Rate** | > 85% (end-to-end, no manual intervention) | Multi-step workflows have compounding failure probability; each step at 95% → 5 steps = 77%; platform must implement retry, resume, and fallback |
| **Data Durability** | Zero consent artefact loss; zero audit log loss | Consent artefacts and audit logs are regulatory evidence; replicated across 3+ availability zones |
| **Disaster Recovery** | RPO: 0 (consent/audit data), < 5 minutes (analytics); RTO: < 15 minutes | Consent and regulatory data must never be lost; analytics can tolerate brief gaps |

---

## Capacity Estimations

### Baseline Assumptions

| Parameter | Value | Source/Rationale |
|---|---|---|
| **Business clients (tenants)** | 500 (Year 1) → 2,000 (Year 3) | NBFCs, fintechs, banks, insurance companies, digital lenders |
| **Monthly active end-users** | 10 million (Year 1) → 50 million (Year 3) | MSMEs and individuals going through India Stack-powered workflows |
| **eKYC transactions/month** | 15 million (Year 1) → 80 million (Year 3) | India processes 150 million+ Aadhaar auth/month total; platform captures 10% → 50% of digital lending segment |
| **AA consent requests/month** | 8 million (Year 1) → 40 million (Year 3) | AA ecosystem processed 2.61 billion account links; growing at 40% annually |
| **AA data fetch sessions/month** | 12 million (Year 1) → 60 million (Year 3) | ~1.5 fetches per consent (initial + periodic refresh) |
| **DigiLocker document fetches/month** | 5 million (Year 1) → 25 million (Year 3) | GST certificates, PAN, Udyam registration for MSME workflows |
| **eSign operations/month** | 3 million (Year 1) → 15 million (Year 3) | Loan agreements, mandate registrations, onboarding documents |
| **UPI transactions/month** | 20 million (Year 1) → 100 million (Year 3) | Disbursals, EMI collections, mandate payments |
| **AI credit scoring/month** | 8 million (Year 1) → 40 million (Year 3) | Roughly 1:1 with AA consent requests |

### Throughput Calculations

| Flow | Peak QPS | Calculation |
|---|---|---|
| **eKYC requests** | ~1,200 QPS | 80M/month ÷ 30 days ÷ 8 peak hours ÷ 3600s × 4x peak multiplier |
| **AA consent creation** | ~620 QPS | 40M/month with similar peak distribution |
| **AA data fetch** | ~930 QPS | 60M/month; data fetches cluster during business hours |
| **DigiLocker fetch** | ~390 QPS | 25M/month; less peaky than eKYC |
| **eSign requests** | ~230 QPS | 15M/month; distributed across business hours |
| **UPI transactions** | ~1,550 QPS | 100M/month; payments peak around payroll cycles and month-end |
| **AI credit scoring** | ~620 QPS | Triggered by AA data fetch completion; same peak pattern |
| **Total platform QPS** | ~5,500 QPS peak | Sum of all DPI flows at peak; provision for 2x headroom = 11,000 QPS |

### Storage Estimations

| Data Type | Size per Record | Monthly Volume | Monthly Growth | Retention |
|---|---|---|---|---|
| **Consent artefacts** | ~2 KB (AA) / ~500 bytes (others) | 40M AA + 80M eKYC + 15M eSign | ~150 GB/month | 7 years (regulatory) |
| **AA financial data** (processed features) | ~5 KB per account per fetch | 60M fetches × avg 2 accounts | ~600 GB/month | Consent duration (1-12 months) |
| **eKYC response data** | ~1 KB (anonymized/hashed) | 80M records | ~80 GB/month | Deleted after use per UIDAI guidelines; audit hash retained 5 years |
| **DigiLocker documents** | ~200 KB avg (PDF) | 25M documents | ~5 TB/month | Consent duration; purged on revocation |
| **Audit logs** | ~500 bytes per event | ~500M events/month (all DPI interactions) | ~250 GB/month | 7 years (regulatory) |
| **AI model features** | ~2 KB per scoring event | 40M scoring events | ~80 GB/month | 3 years (model retraining + explainability) |
| **Identity graph** | ~1 KB per user node | 50M users | ~50 GB total (updates in place) | Account lifetime |
| **Workflow state** | ~3 KB per workflow instance | 80M workflows/month | ~240 GB/month | 90 days active; archived 3 years |
| **Total Year 3** | | | ~6.5 TB/month new data | ~80 TB active; ~200 TB archived |

### Bandwidth Estimations

| Direction | Calculation | Bandwidth |
|---|---|---|
| **Inbound from DPI providers** | AA data: 60M × 50 KB avg = 3 TB/month; DigiLocker: 25M × 200 KB = 5 TB; eKYC: 80M × 2 KB = 160 GB | ~8.2 TB/month |
| **Outbound to DPI providers** | Request payloads: ~135M requests × 2 KB avg | ~270 GB/month |
| **Inbound from business clients** | API requests: ~200M/month × 1 KB avg | ~200 GB/month |
| **Outbound to business clients** | Responses + webhooks: ~200M × 3 KB avg | ~600 GB/month |
| **Peak bandwidth** | 8.2 TB/month ÷ 30 ÷ 8 hours × 4x peak ÷ 3600 | ~15 Gbps peak inbound |

---

## Cost Drivers

| Component | Cost Factor | Optimization Strategy |
|---|---|---|
| **Aadhaar authentication** | UIDAI charges ₹20 per eKYC transaction (reduced from ₹50) | Batch eKYC where possible; cache results within session validity; use Paperless Offline eKYC (free) for low-risk flows |
| **AA data fetch** | AA charges per consent + per fetch session | Optimize consent duration to reduce re-consent frequency; batch multi-FIP fetches under single consent where user has accounts at multiple banks |
| **eSign charges** | ESP charges per signature (₹5-15 per signature via CDAC) | Batch multi-page documents into single eSign operation; cache signing certificates within validity window |
| **Compute for AI scoring** | GPU/CPU for real-time feature extraction + model inference at 620 QPS peak | Pre-compute common features; use model distillation for production inference; batch scoring during off-peak hours for non-time-sensitive workflows |
| **Storage** | 80 TB active data with 7-year retention for regulatory data | Tiered storage: hot (recent 90 days) → warm (1 year) → cold (7-year archive); aggressive compression for audit logs (5:1 ratio typical) |
| **DPI API gateway bandwidth** | 15 Gbps peak; cross-region data transfer for DR | Compress payloads where possible; regional DPI endpoint routing to minimize cross-region transfer; CDN for static DigiLocker documents |

---

## DPI-Specific SLA Expectations

Understanding the SLA characteristics of each upstream DPI component is critical for setting realistic platform-level targets and designing appropriate fallback strategies.

### UIDAI (Aadhaar Authentication)

| Parameter | Value | Notes |
|---|---|---|
| **Uptime SLA** | ~99.5% | UIDAI maintains dedicated data centers; occasional planned maintenance windows |
| **OTP Delivery Latency** | 2-30 seconds | Highly dependent on telecom network; Jio/Airtel faster than BSNL/Vi |
| **OTP Validity** | 10 minutes | Standard UIDAI OTP validity window |
| **Auth Response Time** | 1-3 seconds (after OTP submitted) | CIDR lookup and match; consistent for OTP; variable for biometric |
| **Rate Limits** | Per-ASA quota; typically 50-500 TPS per AUA | Quota negotiation required; higher tiers available |
| **Error Rate** | ~3-8% (OTP); ~10-15% (biometric) | OTP errors: delivery failure, timeout, wrong entry; Biometric: quality issues, mismatch |
| **Maintenance Windows** | Scheduled: monthly 2-4 hour windows | Usually late night; advance notification provided |

### Account Aggregator Ecosystem

| Parameter | Value | Notes |
|---|---|---|
| **AA Provider Uptime** | 95-99% (varies by AA) | Newer AAs have lower reliability than established ones |
| **FIP Response Time** | 2-90 seconds (highly variable) | Large private banks: 2-5s; Public sector: 5-15s; Small/cooperative: 15-90s |
| **FIP Success Rate** | 70-97% (varies by FIP) | Some FIPs return partial data on timeout; some fail silently |
| **Consent Approval Callback** | 1-10 seconds after user approves | AA-dependent; webhook delivery reliability varies |
| **Data Freshness** | Real-time to T-1 (end of previous business day) | Most FIPs provide T-0 for savings; T-1 for statements |
| **Max Data Range** | Typically 24 months | Some FIPs limit to 12 months for performance reasons |
| **Concurrent Sessions** | Limited per AA-FIP pair | Some FIPs throttle at 10-50 concurrent sessions |

### DigiLocker

| Parameter | Value | Notes |
|---|---|---|
| **API Uptime** | ~95-98% | Core API generally stable; individual issuer availability varies widely |
| **Document Fetch Latency** | 2-15 seconds | Depends on issuer; central government issuers faster than state-level |
| **Document Availability** | Near-100% (central) to ~60% (some states) | PAN, DL: universally available; state certificates: patchy |
| **API Rate Limits** | 100-500 requests/minute per partner | Higher limits available through API Setu partnership |
| **Document Formats** | XML (structured), PDF/A (signed) | XML preferred for automated processing; PDF for human review |

### eSign (ESP)

| Parameter | Value | Notes |
|---|---|---|
| **ESP Uptime** | ~99% (CDAC) | CDAC has better uptime than smaller ESPs |
| **Signing Latency** | 3-8 seconds (excluding OTP wait) | Certificate generation + hash signing + response |
| **OTP Delivery** | Same as UIDAI (Aadhaar-based) | eSign OTP uses Aadhaar authentication; same telecom dependency |
| **Certificate Validity** | Per-transaction (single-use certificate) | No long-lived certificates; each signature generates a new certificate |

### UPI (NPCI)

| Parameter | Value | Notes |
|---|---|---|
| **System Uptime** | ~99.9% | NPCI maintains very high availability; rare full outages |
| **Transaction Success Rate** | ~96-98% | Failures: beneficiary bank down, insufficient balance, technical decline |
| **Transaction Response Time** | 2-5 seconds (typical); 30 seconds (NPCI mandate) | Most complete in 2-5s; timeout at 30s per NPCI guidelines |
| **Settlement** | Real-time (UPI) / T+1 (NEFT fallback) | UPI provides instant credit; NEFT for fallback |
| **Transaction Limits** | ₹1 lakh (standard); ₹2 lakh (enhanced for specific categories) | Higher limits for merchant payments and specific use cases |
| **UPI Lite** | ₹500 per transaction; ₹2,000 wallet limit | Off-core-banking; faster; no SMS alert for sub-₹500 |

---

## Capacity Planning Scenarios

### Scenario 1: Diwali Lending Season (4x Peak)

During October-November (Diwali season), digital lending typically sees 3-4x normal volume as MSMEs seek working capital for inventory:

```
Normal daily volume: ~2.7M eKYC, ~1.3M AA consents, ~2M data fetches
Diwali peak: ~10M eKYC, ~5M AA consents, ~8M data fetches per day
Peak QPS: ~22,000 (vs. normal ~5,500)

Scaling requirements:
  - eKYC adapter: 30 → 120 replicas
  - AA adapter: 10 → 40 replicas
  - Feature extraction: 30 → 120 pods
  - GPU for scoring: 8 → 24 GPUs
  - DPI quota: negotiate 3x quota increase 30 days before Diwali
```

### Scenario 2: New Large Tenant Onboarding

A major bank onboarding with 10M customers expected in Month 1:

```
Additional volume: ~3.3M eKYC/month, ~2M AA consents/month
Incremental QPS: ~500 QPS additional at peak
Approach:
  - Gradual ramp over 4 weeks (25% → 50% → 75% → 100%)
  - Dedicated DPI API quota allocation for the tenant
  - Pre-provision compute before go-live
  - Dedicated monitoring dashboard for the tenant
```

### Scenario 3: FIP Outage During Peak Hours

If a major FIP (serving 20% of AA data fetches) goes down during business hours:

```
Impact: ~180 QPS of AA data fetches fail or timeout
Cascading effect: ~180 QPS of workflows pause or degrade
Mitigation:
  - Circuit breaker trips for that FIP within 60 seconds
  - Workflows proceed with partial data (other FIPs still respond)
  - Credit scores computed with coverage flag: "PARTIAL_1_OF_3_FIPS"
  - Business clients notified; can choose to wait for recovery or proceed
  - Recovery: circuit breaker probes every 30s; auto-resume when FIP is back
```
