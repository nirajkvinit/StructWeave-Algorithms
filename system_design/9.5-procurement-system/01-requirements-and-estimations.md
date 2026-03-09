# Requirements & Capacity Estimations

## Functional Requirements

### Core Features (In Scope)

1. **Purchase Requisition Management**
   - Create, edit, and submit purchase requisitions with line items, quantities, estimated costs, and delivery dates
   - Support for free-text, catalog-based, and punch-out requisition methods
   - Requisition templates and copy-from-previous functionality
   - Multi-line requisitions spanning different cost centers, projects, and budget categories

2. **Multi-Level Approval Workflow Engine**
   - Configurable approval chains based on amount, category, cost center, vendor risk, and custom dimensions
   - Serial, parallel, and conditional approval routing
   - Delegation (out-of-office), escalation (timeout-based), and reassignment
   - Approval via email, mobile push notification, and in-app action
   - Approval history with timestamps, comments, and delegation chain

3. **Purchase Order Lifecycle Management**
   - Automatic PO generation from approved requisitions
   - PO amendment tracking with version history and change audit trail
   - Blanket POs (standing orders) with release schedules and quantity tracking
   - PO acknowledgment tracking from vendors
   - PO change orders with re-approval workflows for material changes

4. **RFQ and Competitive Bidding**
   - Request for Quotation creation with item specifications, terms, and evaluation criteria
   - Sealed bid submission and time-locked opening
   - Reverse auction engine with real-time bidding, auto-extension, and minimum decrements
   - Weighted scoring for technical and commercial evaluation
   - Bid comparison and award recommendation

5. **Vendor Management**
   - Vendor registration, onboarding, and qualification workflows
   - Vendor performance scoring (quality, delivery, responsiveness, compliance)
   - Risk assessment with financial health, sanctions screening, and ESG scoring
   - Vendor segmentation and tiering (strategic, preferred, approved, restricted)
   - Vendor document management (certifications, insurance, tax forms)

6. **Contract Management**
   - Contract creation from negotiated terms and awarded bids
   - Milestone tracking and deliverable verification
   - Renewal and expiration alerting
   - Contract compliance enforcement during PO creation
   - Rate card and pricing schedule management

7. **Three-Way Matching**
   - Automated matching of Purchase Order ↔ Goods Receipt Note ↔ Invoice
   - Configurable tolerance thresholds (percentage and absolute) per commodity/vendor
   - Exception routing for out-of-tolerance items
   - Partial matching for split deliveries and partial invoices
   - Credit note matching and debit note processing

8. **Catalog Management**
   - Internal catalog with category hierarchy, item attributes, and pricing
   - Punch-out catalog integration via cXML/OCI protocols
   - Catalog search with faceted filtering and fuzzy matching
   - Price comparison across multiple catalog sources
   - Catalog versioning and effective dating

9. **Budget Control and Spend Analytics**
   - Real-time budget checking with encumbrance tracking
   - Maverick spend detection (off-contract, off-catalog purchases)
   - Spend cube analytics (by vendor, category, cost center, time period)
   - Savings tracking and contract compliance reporting
   - Configurable budget periods (monthly, quarterly, annual, project-based)

10. **Goods Receipt and Inspection**
    - Goods receipt note creation against PO line items
    - Quality inspection workflows with accept/reject/partial-accept outcomes
    - Return-to-vendor processing for rejected goods
    - Service entry sheets for service-based POs

### Out of Scope

- Payment processing and bank integration (handled by Accounts Payable / Treasury)
- Inventory warehousing and stock management beyond goods receipt (handled by Inventory Management)
- General ledger posting and financial reporting (handled by Accounting/GL)
- Supplier relationship management beyond transactional performance (handled by SRM platforms)
- Strategic sourcing and category management tools
- Logistics, freight management, and shipment tracking

---

## Non-Functional Requirements

### CAP Theorem and Consistency

| Aspect | Choice | Justification |
|--------|--------|---------------|
| **CAP Preference** | CP (Consistency + Partition Tolerance) | Financial documents (POs, invoices, budget commitments) require strong consistency; a duplicate PO or lost approval is a financial control failure |
| **Consistency Model** | Strong for transactional data; Eventual for analytics and search | Budget encumbrances, PO states, and approval decisions must be immediately consistent; spend dashboards and vendor scores can lag by minutes |
| **Availability Target** | 99.95% (26 minutes downtime/year) | Business-critical but not life-critical; procurement can tolerate brief windows of unavailability during maintenance |
| **Durability** | Zero data loss for financial documents | Every PO, invoice, and approval action must be durably persisted before acknowledgment; WAL + synchronous replication |

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Requisition creation | 200ms | 500ms | 1s |
| Approval action (approve/reject) | 150ms | 400ms | 800ms |
| Budget check | 100ms | 300ms | 600ms |
| Three-way match execution | 500ms | 2s | 5s |
| Catalog search | 200ms | 500ms | 1s |
| PO generation from requisition | 300ms | 800ms | 2s |
| Reverse auction bid submission | 100ms | 200ms | 500ms |
| Spend analytics query | 2s | 5s | 10s |
| Vendor search / lookup | 150ms | 400ms | 800ms |

---

## Capacity Estimations (Back-of-Envelope)

### Assumptions
- Multi-tenant SaaS serving ~5,000 enterprise customers
- ~2M total users (requesters + approvers + buyers + AP staff + vendor managers)
- ~400K daily active users (20% of total)
- Average 8 working hours per day, 250 working days per year
- Business-hours-weighted traffic (80% of requests in 8-hour window)

### Core Estimations

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| **DAU / MAU** | 400K / 1.5M | 20% daily active rate; 75% monthly active rate |
| **Read:Write Ratio** | 5:1 | Users check statuses, search catalogs, and view dashboards far more often than creating documents |
| **Requisitions per day** | 200K | 50M POs/year ÷ 250 days × 1.0 req-to-PO ratio (some reqs rejected) |
| **POs created per day** | 200K | 50M/year ÷ 250 working days |
| **Invoices processed per day** | 400K | 100M/year ÷ 250 days |
| **Approval actions per day** | 300K | ~1.5 approvals per requisition × 200K reqs |
| **Three-way matches per day** | 500K | 400K invoices × 1.25 (some require multiple match attempts) |
| **Budget check operations per day** | 1M | Every req, PO, and amendment triggers a budget check |
| **Catalog searches per day** | 2M | ~5 searches per requisition creation |
| **QPS (average)** | ~120 | Total daily operations ÷ 28,800 seconds (8-hour window) × read multiplier |
| **QPS (peak)** | ~600 | 5× average during month-end/quarter-end spikes |
| **Reverse auction concurrent users** | ~10K | Large auction events with 500+ bidders across multiple simultaneous auctions |

### Storage Estimations

| Data Type | Size per Record | Annual Volume | Year 1 Storage | Year 5 Storage |
|-----------|----------------|---------------|----------------|----------------|
| Purchase Orders (header + lines) | ~5 KB | 50M | 250 GB | 1.25 TB |
| Purchase Requisitions | ~3 KB | 60M | 180 GB | 900 GB |
| Invoices | ~4 KB + 500 KB (scan/PDF) | 100M | 50 TB | 250 TB |
| Goods Receipt Notes | ~2 KB | 80M | 160 GB | 800 GB |
| Vendor Records | ~10 KB | 2M (new/updated) | 20 GB | 100 GB |
| Contracts + Attachments | ~200 KB avg | 1M | 200 GB | 1 TB |
| Approval Audit Logs | ~1 KB | 300M | 300 GB | 1.5 TB |
| Catalog Items | ~2 KB | 500M (total) | 1 TB | 2 TB |
| Spend Analytics (aggregated) | N/A | N/A | 500 GB | 2.5 TB |
| **Total (structured)** | | | ~2.5 TB | ~10 TB |
| **Total (with attachments)** | | | ~55 TB | ~260 TB |

### Bandwidth Estimations

| Direction | Calculation | Bandwidth |
|-----------|-------------|-----------|
| **Inbound (writes)** | 600K write ops/day × 5 KB avg = 3 GB/day | ~350 KB/s avg |
| **Inbound (attachments)** | 100K uploads/day × 500 KB avg = 50 GB/day | ~6 MB/s avg |
| **Outbound (reads)** | 3M read ops/day × 10 KB avg = 30 GB/day | ~3.5 MB/s avg |
| **Peak bandwidth** | 5× average | ~50 MB/s |

### Cache Sizing

| Cache Layer | Data | Estimated Size |
|-------------|------|----------------|
| **Approval queue cache** | Active approval tasks per user | ~2 GB (400K users × 5 KB per user queue) |
| **Budget cache** | Current budget balances by cost center | ~500 MB (100K cost centers × 5 KB each) |
| **Catalog search cache** | Popular search results and category pages | ~10 GB |
| **Vendor profile cache** | Frequently accessed vendor data | ~5 GB (500K active vendors × 10 KB) |
| **Session/auth cache** | Active user sessions and permissions | ~4 GB |
| **Total cache** | | ~22 GB |

---

## SLOs / SLAs

| Metric | Target | Measurement | Escalation |
|--------|--------|-------------|------------|
| **Availability** | 99.95% | Synthetic health checks every 30s from multiple regions | Page on-call if < 99.9% over 5-minute window |
| **Requisition-to-PO latency** | < 2s (system processing, excluding human approval time) | End-to-end trace from approval completion to PO creation | Alert if p99 > 5s |
| **Three-way match accuracy** | > 98% auto-match rate | Correct matches ÷ total match attempts | Review matching rules if < 95% |
| **Budget check latency** | < 300ms (p95) | Time from budget check request to response | Alert if p99 > 1s |
| **Approval notification delivery** | < 30s from approval request creation | Time from workflow engine emit to notification receipt | Alert if p95 > 2 min |
| **Auction bid acknowledgment** | < 200ms (p99) | WebSocket round-trip from bid submission to confirmation | Circuit-break auction if p99 > 1s |
| **Search latency** | < 500ms (p95) | Catalog and vendor search response time | Degrade to cached results if index unavailable |
| **Data durability** | Zero loss for financial documents | WAL verification, replication lag monitoring | Halt writes if replication lag > 10s |
| **Audit completeness** | 100% of state transitions logged | Audit log count vs. state transition events | Alert on any discrepancy |
| **Error rate** | < 0.1% for write operations | Failed writes ÷ total write attempts | Page if > 0.5% over 5-minute window |

---

## Tenant Isolation Model

| Tier | Isolation Level | Database | Compute | Use Case |
|------|----------------|----------|---------|----------|
| **Enterprise** | Dedicated schema, shared cluster | Dedicated schema with row-level security | Shared compute pool with resource quotas | Large enterprises with regulatory requirements |
| **Business** | Shared schema, tenant-ID partitioning | Shared tables with mandatory tenant_id predicate | Shared compute pool | Mid-market companies |
| **Standard** | Fully shared | Shared tables, shared indexes | Shared compute, best-effort resource allocation | Small businesses and trial accounts |

---

## Traffic Patterns

```
Daily Traffic Profile (UTC, global enterprise mix):

Hour:  00  02  04  06  08  10  12  14  16  18  20  22
       |   |   |   |   |   |   |   |   |   |   |   |
Load:  ██                                          ██
       ██  █                                     █  ██
       ██  ██  █              ██                 ██  ██
       ██  ██  ██  ██  ████████████  ██████████████  ██
       ██  ██  ██  ██████████████████████████████████  ██

Notes:
- Asia-Pacific peak: 02:00-08:00 UTC
- Europe peak: 08:00-16:00 UTC
- Americas peak: 14:00-22:00 UTC
- Month-end spike: 3-5x normal traffic (last 3 business days)
- Quarter-end spike: 5-8x normal (last 5 business days)
- Year-end: 8-10x normal with budget flush behavior
```
