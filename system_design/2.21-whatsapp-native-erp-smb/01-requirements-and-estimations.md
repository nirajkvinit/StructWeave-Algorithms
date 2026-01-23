# Requirements & Capacity Estimations

[Back to Index](./00-index.md)

---

## Functional Requirements

### P0 - Must Have (Core WhatsApp-Native Operations)

| Module | Capability | WhatsApp Interaction |
|--------|------------|---------------------|
| **Inventory Management** | Query stock levels | "Stock check [product]" → Current quantity |
| | Update stock | Photo of stock count → OCR update |
| | Low stock alerts | Proactive message when below threshold |
| **Order Management** | Create order | WhatsApp Flow wizard OR natural language |
| | Track order status | Order ID → Status timeline |
| | Cancel/modify order | "Cancel order [ID]" → Confirmation |
| **Invoice Generation** | Create invoice | "Invoice for [customer]" → PDF generated |
| | Share invoice | Auto-send via WhatsApp message |
| | Payment link | UPI deep link embedded in message |
| **Customer Management** | Customer lookup | Phone number → Order history |
| | Catalog sync | WhatsApp Catalog ↔ Inventory sync |
| **Expense Tracking** | Log expense | Photo of receipt → OCR extraction |
| | Categorization | AI-suggested category, manual override |

### P1 - Important (Business Growth)

| Module | Capability | Implementation |
|--------|------------|----------------|
| **GST Compliance** | Invoice numbering | Auto-generated GST-compliant format |
| | Tax calculation | CGST/SGST/IGST based on location |
| | HSN codes | Product ↔ HSN mapping |
| | GSTR export | Data export for filing |
| **Basic Accounting** | Daily summary | "Aaj ka sale" → Revenue breakdown |
| | Outstanding receivables | Pending payments list |
| | Cash vs UPI split | Payment method breakdown |
| **ONDC Integration** | Order receipt | ONDC order → WhatsApp notification |
| | Catalog publish | Inventory → ONDC seller catalog |

### P2 - Nice to Have (Future)

| Module | Capability | Notes |
|--------|------------|-------|
| **Advanced Reporting** | Custom date range reports | "Last week ka report" |
| **Multi-location** | Warehouse selection | For businesses with multiple stores |
| **Staff Access** | Role-based permissions | Different WhatsApp numbers, different access |
| **Automated Reordering** | Purchase order generation | When stock hits reorder level |

### Out of Scope

- Complex manufacturing/BOM
- HR/Payroll modules
- Advanced financial reporting (balance sheet, P&L)
- Multi-currency (India focus only)
- Complex approval workflows
- Real-time collaborative editing

---

## Non-Functional Requirements

### Availability & Reliability

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Core ERP Availability** | 99.9% | SMB tolerance for occasional downtime |
| **WhatsApp Message Delivery** | 99.5% | WhatsApp API SLA |
| **Graceful Degradation** | 100% | ERP works when WhatsApp is down (via companion app) |
| **Data Durability** | 99.999% | Critical business data |

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Message Response Time** | <2s (p95) | Webhook receipt → response sent |
| **AI Intent Classification** | <200ms (p95) | NLU processing time |
| **OCR Extraction** | <5s (p95) | Receipt/invoice processing |
| **Invoice PDF Generation** | <3s (p95) | Template rendering |
| **Order Flow Completion** | <30s (end-to-end) | Full order wizard |

### Scalability

| Dimension | Target | Growth Strategy |
|-----------|--------|-----------------|
| **Tenants** | 100K Year 1 → 500K Year 5 | Shared DB with RLS |
| **Messages/Day** | 10M → 50M | Horizontal webhook workers |
| **Peak TPS** | 500 messages/sec | Festival pre-scaling |
| **Storage/Tenant** | 100MB average | Tiered storage (hot/warm/cold) |

### Consistency Model

| Data Type | Consistency | Rationale |
|-----------|-------------|-----------|
| **Orders** | Strong | Financial integrity |
| **Invoices** | Strong | GST compliance, no duplicate numbers |
| **Inventory** | Strong (server-authoritative) | Prevent overselling |
| **Analytics** | Eventual (<1 min lag) | Acceptable for reporting |
| **Offline Operations** | Eventual (sync on reconnect) | Offline-first architecture |

### Privacy & Compliance

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| **Data Localization** | India DPDP | All data stored in India (Mumbai/Chennai) |
| **Consent Management** | India DPDP | WhatsApp Flow for explicit consent |
| **Right to Erasure** | India DPDP | Cryptographic deletion within 30 days |
| **Audit Logging** | India DPDP | Immutable logs, 7-year retention |
| **GST Compliance** | Indian Tax Law | Auto-calculation, e-invoice support |

---

## Capacity Estimations

### User Base Assumptions

| Metric | Value | Rationale |
|--------|-------|-----------|
| **Target SMBs** | 100,000 Year 1 | India SMB market, WhatsApp penetration |
| **Active Businesses** | 70,000 (70%) | Daily active in business context |
| **Avg Employees/Business** | 2 | Owner + 1 staff typical for micro-SMB |
| **Avg Customers/Business** | 500 | Typical retail/service SMB |

### Message Volume

| Category | Calculation | Result |
|----------|-------------|--------|
| **Business Messages/Day** | 70K active × 50 messages avg | 3.5M |
| **Customer Messages/Day** | 70K × 100 customer interactions | 7M |
| **Total Messages/Day** | Business + Customer | **10.5M** |
| **Peak Multiplier** | Festival (Diwali) = 10x | 105M/day |

### Transaction Volume

| Transaction | Calculation | Result |
|-------------|-------------|--------|
| **Orders/Day** | 70K businesses × 7 orders avg | **500K** |
| **Invoices/Day** | 70K × 4 invoices avg | **280K** |
| **Expense Entries/Day** | 70K × 3 expenses avg | **210K** |
| **Inventory Updates/Day** | 70K × 5 updates avg | **350K** |

### QPS Calculations

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Avg Message QPS** | 10.5M / 86,400 | **122 QPS** |
| **Peak Message QPS** | 122 × 4 (burst factor) | **488 QPS** |
| **Festival Peak QPS** | 122 × 10 | **1,220 QPS** |
| **Webhook Processing** | Peak × 1.5 (overhead) | **750 QPS** |

### Storage Estimations

| Data Type | Size/Unit | Volume/Year | Total |
|-----------|-----------|-------------|-------|
| **Orders** | 2 KB | 180M orders | 360 GB |
| **Order Lines** | 500 B | 540M lines | 270 GB |
| **Invoices (metadata)** | 1 KB | 100M invoices | 100 GB |
| **Invoice PDFs** | 100 KB | 100M invoices | 10 TB |
| **Expense Receipts** | 200 KB | 75M receipts | 15 TB |
| **Inventory Records** | 1 KB | 500K SKUs × 365 | 180 GB |
| **Audit Logs** | 500 B | 1B events | 500 GB |
| **Total Year 1** | | | **~27 TB** |

### Storage Growth

| Year | Tenants | Data Volume | Rationale |
|------|---------|-------------|-----------|
| Year 1 | 100K | 27 TB | Initial adoption |
| Year 2 | 200K | 70 TB | 2x tenants + historical |
| Year 3 | 350K | 150 TB | Growth + retention |
| Year 5 | 500K | 400 TB | Market maturity |

### Bandwidth Estimations

| Traffic Type | Calculation | Result |
|--------------|-------------|--------|
| **Inbound Webhooks** | 10M × 2KB avg | 20 GB/day |
| **Outbound Messages** | 10M × 5KB avg (incl media) | 50 GB/day |
| **PDF Downloads** | 300K × 100KB | 30 GB/day |
| **Receipt Uploads** | 200K × 200KB | 40 GB/day |
| **Total Daily** | | **140 GB/day** |
| **Peak Bandwidth** | 140 GB / 8 hours active | **5 MB/s avg** |
| **Burst Bandwidth** | Peak × 5 | **25 MB/s** |

---

## SLOs & SLAs

### Service Level Objectives

| Service | Metric | Target | Measurement |
|---------|--------|--------|-------------|
| **Message Processing** | Availability | 99.9% | Successful webhook responses |
| **Message Processing** | Latency (p95) | <2s | End-to-end response time |
| **Order Creation** | Success Rate | 99.5% | Completed orders / attempts |
| **Invoice Generation** | Latency (p95) | <5s | Request to PDF ready |
| **Payment Callbacks** | Processing | 99.9% | UPI/Razorpay webhook handling |
| **OCR Extraction** | Accuracy | 90% | Correct field extraction |
| **AI Intent Classification** | Accuracy | 95% | Correct intent detection |

### Availability Tiers

| Component | SLO | Monthly Downtime | Annual Downtime |
|-----------|-----|------------------|-----------------|
| **Core ERP Services** | 99.9% | 43 min | 8.7 hours |
| **WhatsApp Integration** | 99.5% | 3.6 hours | 43 hours |
| **AI/NLU Services** | 99% | 7.3 hours | 87 hours |
| **Companion App** | 99.9% | 43 min | 8.7 hours |

### Graceful Degradation Targets

| Degradation Level | Trigger | User Experience |
|-------------------|---------|-----------------|
| **Level 0** | Normal | Full functionality |
| **Level 1** | AI latency >5s | Template responses, no AI suggestions |
| **Level 2** | WhatsApp delayed | SMS for critical (payments) |
| **Level 3** | WhatsApp down | Companion app primary, offline queue |
| **Level 4** | Full outage | Offline mode, sync on recovery |

---

## Cost Estimations (Year 1)

### Infrastructure Costs

| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| **Compute (Webhook Workers)** | 50 instances × mid-tier | $5,000 |
| **Database (PostgreSQL)** | 3-node cluster, 2TB | $3,000 |
| **Object Storage** | 30TB (receipts, PDFs) | $1,000 |
| **Message Queue** | Redis cluster | $1,000 |
| **CDN/Edge** | Static assets, PDFs | $500 |
| **Monitoring** | Logs, metrics, tracing | $1,000 |
| **Total Infrastructure** | | **$11,500/month** |

### Third-Party Costs

| Service | Volume | Unit Cost | Monthly Cost |
|---------|--------|-----------|--------------|
| **BSP (WhatsApp API)** | 10M messages | ₹0.50/msg avg | $6,000 |
| **SMS Fallback** | 100K messages | ₹0.20/msg | $250 |
| **OCR API** | 200K documents | $0.01/doc | $2,000 |
| **UPI/Razorpay** | 500K transactions | 2% fee (passed to merchant) | $0 |
| **Total Third-Party** | | | **$8,250/month** |

### Total Monthly Cost

| Category | Cost |
|----------|------|
| Infrastructure | $11,500 |
| Third-Party | $8,250 |
| **Total** | **$19,750/month** |
| **Per Tenant** | **$0.20/month** |

---

## Key Metrics Dashboard

### Business Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Active Business Rate** | Businesses with message in 7 days | >70% |
| **Order Conversion** | Orders / Customer inquiries | >15% |
| **Invoice Payment Rate** | Paid invoices / Generated | >60% |
| **Feature Adoption** | Businesses using Flows | >40% |
| **Churn Rate** | Businesses inactive 30 days | <5% |

### Technical Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Webhook Success Rate** | 2xx responses / Total | >99.9% |
| **Message Latency (p95)** | Webhook to response sent | <2s |
| **AI Accuracy** | Correct intent classification | >95% |
| **OCR Accuracy** | Correct field extraction | >90% |
| **Offline Sync Success** | Successful syncs / Attempts | >99% |

---

## Capacity Planning Summary

```
┌─────────────────────────────────────────────────────────────────┐
│            CAPACITY PLANNING - YEAR 1                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TENANTS                    MESSAGES                            │
│  ────────                   ────────                            │
│  100K SMBs                  10M/day average                     │
│  70K active daily           500 QPS peak                        │
│  2 users/business           1,200 QPS festival                  │
│                                                                 │
│  TRANSACTIONS               STORAGE                             │
│  ────────────               ───────                             │
│  500K orders/day            27 TB Year 1                        │
│  280K invoices/day          400 TB Year 5                       │
│  350K inventory updates     Hot: 1TB, Warm: 5TB, Cold: 21TB     │
│                                                                 │
│  INFRASTRUCTURE             COST                                │
│  ──────────────             ────                                │
│  50 webhook workers         $20K/month total                    │
│  3-node database            $0.20/tenant/month                  │
│  30TB object storage        $240K/year                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
