# Interview Guide

## 45-Minute Interview Pacing

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|-----------------|
| **1. Requirements** | 5 min | Clarify tax types, geographic scope, real-time vs batch, transaction scale, multi-tenancy | Functional requirements, scale numbers, key SLOs |
| **2. High-Level Design** | 10 min | Jurisdiction resolution, rate lookup, calculation pipeline, core services | System diagram, tax calculation flow, component responsibilities |
| **3. Deep Dive** | 15 min | Pick 2--3: jurisdiction resolution, rate lookup engine, nexus determination, exemption management | Detailed design of critical paths with trade-offs |
| **4. Scale & Reliability** | 10 min | Peak transaction volume, rate update propagation, multi-tenant isolation, audit integrity | Sharding approach, consistency model, degradation strategy |
| **5. Wrap-Up** | 5 min | Extensions, e-invoicing compliance, ML classification, cross-border | Prioritized improvement list |

### Meta-Commentary: Why This Problem Is Harder Than It Looks

A tax calculation engine appears to be a simple rate-lookup-and-multiply problem. In reality, a production-grade system involves:

- **Geospatial resolution**: A single street address can fall under 5+ overlapping tax jurisdictions (country, state, county, city, special district), each with independent rates and rules
- **Temporal versioning**: Tax rates change constantly---a system must know exactly which rate applied at the exact moment a transaction occurred
- **Product taxability matrix**: A "granola bar" is taxed as food (exempt) in one state but as candy (taxable) in another, based on ingredient composition
- **Nexus determination**: Whether a seller even owes tax in a jurisdiction depends on physical presence, economic thresholds, and marketplace facilitator rules---a real-time compliance calculation in itself
- **Compound taxation**: Some jurisdictions tax on top of other taxes (Canadian GST + PST), while others use inclusive pricing (EU VAT)

The interviewer is evaluating: jurisdiction resolution accuracy, temporal correctness of rate application, nexus awareness, and the ability to handle the combinatorial explosion of tax rules across geographies. Do not oversimplify into a flat rate lookup.

---

## Phase 1: Requirements Gathering (5 min)

### Questions to Ask the Interviewer

1. **"What tax types are in scope---US sales tax only, or also VAT, GST, and customs duties?"**
   *Why*: US sales tax is destination-based with 13,000+ jurisdictions. VAT is invoice-based with reverse-charge rules. GST has input-credit chains. Each demands fundamentally different calculation logic.

2. **"What is the geographic scope---single country or global?"**
   *Why*: US-only means ~13,000 jurisdictions with state-specific sourcing rules. Global adds 100+ countries, each with unique tax regimes, e-invoicing mandates, and withholding tax requirements.

3. **"Do we need real-time calculation, batch processing, or both?"**
   *Why*: Real-time serves checkout flows with sub-100ms latency requirements. Batch handles end-of-day reconciliation, retroactive rate corrections, and filing aggregation.

4. **"What transaction volume are we targeting?"**
   *Why*: 100 TPS requires a different architecture than 100,000 TPS. High-volume systems need pre-computed rate caches, sharded jurisdiction lookups, and async audit logging.

5. **"Is this multi-tenant SaaS or a single-tenant enterprise deployment?"**
   *Why*: Multi-tenant adds tenant-specific tax configurations, product taxability overrides, nexus profiles, and exemption certificate stores---all requiring strict data isolation.

6. **"Do we need nexus determination, or does the caller provide the applicable jurisdictions?"**
   *Why*: Nexus determination requires tracking seller presence, economic thresholds, and marketplace facilitator status across every jurisdiction---effectively a separate sub-system.

7. **"Is exemption certificate management in scope?"**
   *Why*: Enterprise B2B transactions frequently involve tax exemptions. Managing certificate capture, validation, expiration tracking, and audit-ready storage is substantial.

8. **"Do we need compliance filing, or just calculation?"**
   *Why*: Filing adds return generation, remittance scheduling, jurisdiction-specific form mapping, and amendment workflows.

### Establishing Constraints

```
"Based on our discussion, I'll design a tax calculation engine that:
 - Supports US sales tax + VAT + GST across 50+ countries
 - Resolves 13,000+ US jurisdictions via address-level geolocation
 - Handles 50,000 line-item calculations per second at peak
 - Returns tax determination in < 50ms (p99) for real-time checkout
 - Supports multi-tenant SaaS with per-tenant nexus profiles
 - Maintains temporal accuracy: transaction date determines applicable rates
 - Provides exemption certificate validation and management
 - Stores complete audit trail with 7+ year retention for compliance
 - Propagates rate changes to all nodes within 60 seconds"
```

---

## Phase 2: High-Level Design (10 min)

### Recommended Approach

1. **Start with the tax calculation request flow**: API request with (seller, buyer, items, addresses) -> address validation -> jurisdiction resolution -> nexus check -> rate lookup -> taxability determination -> calculation -> audit log -> response.
2. **Identify core services**: Address Validation, Jurisdiction Resolver, Nexus Engine, Rate Lookup, Product Taxability, Calculation Engine, Exemption Manager, Audit Store.
3. **Draw the data flow**: Show how a single API call fans out to multiple jurisdiction lookups and collapses into a tax determination response.
4. **Highlight the key design decision**: The jurisdiction resolution pipeline---this is what separates a toy system from a production engine.

### Common Mistakes at This Phase

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Treating tax as a single rate lookup | A transaction may span 5+ overlapping jurisdictions, each with different rates, rules, and product exemptions | Model jurisdiction resolution as a tree: country -> state -> county -> city -> special district |
| Ignoring temporal dimension | Tax rates change constantly; applying current rates to past transactions causes audit failures | Every rate has effective_from and effective_to dates; transaction date selects the applicable version |
| Assuming all tax types work the same | Sales tax, VAT, and GST have fundamentally different calculation models | Design a pluggable tax-type strategy layer that handles destination-based, origin-based, invoice-based, and reverse-charge models |
| Skipping nexus determination | Without nexus, you cannot know if tax is even owed in a jurisdiction | Include nexus as a first-class check in the calculation pipeline, before rate lookup |
| Hard-coding product taxability | A "dietary supplement" is taxable in Texas but exempt in New York | Build a product-category-to-taxability matrix per jurisdiction, updated independently of rate tables |

---

## Phase 3: Deep Dive (15 min)

### Deep Dive Option A: Jurisdiction Resolution

**Key points to cover:**
- **Address normalization**: Standardize input addresses using postal validation. "123 Main St, Apt 4B" and "123 Main Street #4B" must resolve identically.
- **Geocoding**: Convert validated addresses to latitude/longitude coordinates. This is essential because ZIP codes do not align with tax jurisdiction boundaries.
- **Geospatial lookup**: Use polygon-based boundary data (TIGER/Line or equivalent) to determine which jurisdictions contain a given coordinate. A single point may fall in 5+ overlapping polygons (state, county, city, transit district, school district).
- **Jurisdiction hierarchy**: Return the full stack of applicable jurisdictions with their relationship (stacking vs. replacing). Some special districts add rates on top of city rates; others override them.
- **Caching strategy**: Cache address-to-jurisdiction mappings aggressively. Addresses rarely change jurisdictions, but invalidate on boundary updates.
- **Boundary change handling**: Jurisdictions annex territories, merge, or split. Maintain versioned boundary data with effective dates. Historical transactions use historical boundaries.

**Impressive addition**: "ZIP codes span jurisdiction boundaries---a single ZIP can cover parts of multiple cities and counties. Relying on ZIP alone introduces systematic tax errors. The engine must geocode to a rooftop-level coordinate."

### Deep Dive Option B: Rate Lookup and Temporal Versioning

**Key points to cover:**
- **Rate table structure**: Each jurisdiction has one or more rate entries, each with an effective date range, product category applicability, and rate type (percentage, flat fee, tiered).
- **Temporal query**: Given (jurisdiction_id, product_category, transaction_date), return the exact rate in effect. Use a bitemporal model: valid_time (when the rate was legally effective) and system_time (when the system recorded it).
- **Compound rates**: The total tax for a US address is often the sum of state rate + county rate + city rate + special district rate. Each is looked up independently and summed.
- **Rate change propagation**: New rates are published by authorities weeks to months in advance. Ingest them as future-effective entries. No system downtime for rate changes.
- **Caching with TTL alignment**: Cache rate lookups with TTL set to the next known rate change date for that jurisdiction. Rates with no pending changes get longer TTLs.
- **Fallback hierarchy**: If a specific product category rate is not defined for a jurisdiction, fall back to the general rate for that jurisdiction.

**Impressive addition**: "Bitemporal modeling lets us answer two distinct questions: 'What rate was legally in effect on March 1st?' and 'What rate did our system believe was in effect on March 1st?' This distinction is critical for audit trail reconstruction and retroactive corrections."

### Deep Dive Option C: Nexus Determination

**Key points to cover:**
- **Physical nexus**: Seller has offices, warehouses, employees, or inventory in a jurisdiction. Maintained as a static configuration per tenant.
- **Economic nexus**: Seller exceeds a revenue or transaction count threshold in a jurisdiction (e.g., $100K revenue or 200 transactions in a calendar year). Requires real-time aggregation.
- **Marketplace facilitator**: The marketplace (not the individual seller) is responsible for tax collection when it meets facilitator thresholds. Requires tracking at the marketplace level.
- **Threshold monitoring**: Maintain running counters of (revenue, transaction_count) per (seller, jurisdiction, period). Alert when approaching 80% of the threshold. Auto-enable collection when exceeded.
- **Effective date management**: Nexus is not retroactive in most jurisdictions. When a threshold is crossed, tax collection begins on the next applicable transaction, not retroactively.
- **Nexus profile per tenant**: Each tenant maintains a nexus map---jurisdictions where they are registered, jurisdictions where economic nexus has been triggered, and jurisdictions where they have voluntarily registered.

**Impressive addition**: "Economic nexus thresholds differ by jurisdiction---some use trailing 12 months, some use calendar year, some use either. The threshold engine must support multiple window types and reset schedules per jurisdiction."

### Deep Dive Option D: Exemption Certificate Management

**Key points to cover:**
- **Certificate lifecycle**: Capture -> Validate -> Store -> Apply -> Expire -> Renew. Each stage has different requirements.
- **Validation rules**: Certificates have jurisdiction-specific formats, required fields, and validity periods. Some require state-level API verification.
- **Application logic**: At calculation time, check if the buyer has a valid, non-expired exemption certificate for the specific jurisdiction and product category. Partial exemptions are common (exempt on manufacturing inputs but not office supplies).
- **Audit readiness**: Store the original certificate image, extracted data, validation result, and the transactions to which it was applied. Auditors need to trace from a zero-tax transaction back to the certificate.
- **Expiration management**: Proactively notify sellers when buyer certificates approach expiration. Queue renewal requests automatically.

---

## Trap Questions and How to Handle Them

### 1. "How do you handle a jurisdiction boundary change?"

**Good answer**: "Jurisdiction boundaries are versioned with effective dates, just like tax rates. When a territory is annexed by a city, a new boundary polygon version is published with an effective date. Transactions before that date use the old boundary; transactions after use the new boundary. The geocoding cache is invalidated for affected coordinates. For retroactive corrections, re-running a historical transaction uses the boundary data that was effective on the original transaction date, not the current boundaries."

### 2. "What happens when a tax rate changes mid-transaction?"

**Good answer**: "The transaction date---specifically, the date the sale is considered complete---determines the applicable rate. For a checkout flow, the rate is locked at the moment of invoice generation, not at cart-add time. If a customer adds items at 11:55 PM on December 31st but completes purchase at 12:05 AM on January 1st, the January 1st rates apply. The system records the transaction timestamp, the rates applied, and the rate version IDs for auditability."

### 3. "How do you calculate tax for a marketplace transaction?"

**Good answer**: "Marketplace facilitator laws require the marketplace---not the individual seller---to collect and remit tax in jurisdictions where the marketplace meets facilitator thresholds. The engine must determine: (1) Does the marketplace have facilitator obligations in this jurisdiction? (2) If yes, the marketplace is the responsible party and its nexus profile applies. (3) If no, fall back to the seller's nexus profile. This creates a two-tier nexus resolution: check marketplace facilitator status first, then seller nexus. The response includes the responsible party ID for remittance tracking."

### 4. "What if two jurisdictions claim tax authority?"

**Good answer**: "This is the sourcing rules problem. US states use either origin-based sourcing (tax based on seller location) or destination-based sourcing (tax based on buyer location). When seller and buyer are in different states, destination-based rules almost always apply for interstate transactions. Within a single state, the sourcing rule varies. The engine maintains a sourcing-rule configuration per jurisdiction and applies it deterministically. For international transactions, VAT place-of-supply rules add another layer---digital services are taxed at the customer's location under EU rules."

### 5. "How do you test tax calculations?"

**Good answer**: "Four layers: (1) Golden dataset testing---a curated set of 10,000+ known-correct tax calculations covering edge cases, updated when rates change. (2) Rate change regression---when a new rate is ingested, automatically re-run all golden dataset entries affected by that jurisdiction and compare results. (3) Boundary edge case testing---addresses on jurisdiction borders, addresses in overlapping special districts. (4) Cross-validation against a secondary tax data provider---run a sample of production calculations through an independent source and flag discrepancies. All of this runs in CI/CD before any rate data or code change reaches production."

### 6. "What about tax on tax (compound taxation)?"

**Good answer**: "This is critical for systems supporting multiple tax regimes. In Canada, some provinces apply PST on the GST-inclusive amount---the provincial tax is calculated on (price + federal tax), not on price alone. In Brazil, ICMS, PIS, and COFINS compound in complex ways. The calculation engine must support a directed acyclic graph of tax dependencies, not just parallel addition. Each jurisdiction's tax rule specifies whether it applies to the base price, the base price plus specific other taxes, or the tax-inclusive total. The calculation order is topologically sorted based on these dependencies."

### 7. "Can't you just use a flat tax table with ZIP code lookups?"

**Good answer**: "ZIP codes are postal delivery routes, not tax boundaries. A single ZIP code can span multiple cities, counties, and even states. In Colorado alone, there are 700+ home-rule jurisdictions with independent tax rates that do not align with ZIP boundaries. ZIP-based lookup introduces systematic errors that create audit liability. Production systems require rooftop-level geocoding against jurisdiction boundary polygons. ZIP-level approximation is acceptable only as a fallback when precise address data is unavailable, and should be flagged as approximate in the audit trail."

### 8. "Why not just call an external tax API for every calculation?"

**Good answer**: "Three issues: (1) Latency---a round-trip to an external service adds 50--200ms, unacceptable for high-volume checkout flows processing 50K TPS. (2) Availability---your checkout uptime is now coupled to a third-party SLA. (3) Cost---per-transaction pricing at scale becomes prohibitive. The better architecture is to ingest rate data and boundary data from authoritative sources, maintain a local calculation engine, and use the external API as a cross-validation source, not a runtime dependency. This gives you sub-10ms calculation latency, independent availability, and predictable costs."

---

## Trade-Off Discussions

| Trade-Off | Option A | Option B | Recommended | Reasoning |
|-----------|----------|----------|-------------|-----------|
| **Pre-computed rates vs on-the-fly calculation** | Pre-compute and cache the full tax rate for every (address, product_category) combination | Compute jurisdiction stack and sum rates at request time | **On-the-fly with caching** | The combinatorial space of (address x product_category) is too large to pre-compute exhaustively; on-the-fly calculation with aggressive caching of jurisdiction resolution results provides accuracy without storage explosion |
| **Synchronous vs asynchronous calculation** | Synchronous: block until result is ready | Asynchronous: return a calculation ID and poll/callback for result | **Synchronous for real-time, async for batch** | Checkout flows require synchronous sub-50ms responses; end-of-day reconciliation, retroactive corrections, and filing aggregation use async batch pipelines |
| **Centralized vs distributed rate tables** | Single source of truth in one database cluster | Replicate rate tables to regional nodes | **Distributed with leader-follower** | Rate tables are read-heavy (millions of lookups per second) and write-infrequent (rate changes are batched). Replicate to regional nodes for low-latency reads; propagate writes from a single leader within 60 seconds |
| **Exact geo-lookup vs ZIP-code approximation** | Geocode every address to lat/long and resolve against boundary polygons | Use ZIP code to jurisdiction mapping table | **Exact with ZIP fallback** | Exact geocoding is necessary for audit-grade accuracy; ZIP fallback serves incomplete addresses with an "approximate" flag. Log all fallback usages for compliance review |
| **Pull vs push model for rate updates** | Engine polls authoritative sources on a schedule | Rate publishers push updates via webhooks or event streams | **Push with pull reconciliation** | Push provides near-real-time propagation of rate changes; a daily pull reconciliation job catches any missed updates and validates consistency |
| **Strong vs eventual consistency for tax rules** | All nodes see the same rates at the same time | Nodes may serve stale rates for a brief window | **Eventual with bounded staleness** | Strong consistency requires distributed locks that destroy throughput. Eventual consistency with a 60-second propagation SLA is acceptable because rate changes are published with future effective dates---the propagation window is far smaller than the advance notice period |

---

## Scoring Rubric

### Junior Level (Meets Bar)
- Identifies the basic flow: receive transaction, look up rate, multiply, return
- Mentions that tax rates vary by location
- Designs a simple rate table with state-level granularity
- Basic API design with input/output parameters

### Mid Level (Solid)
- Understands jurisdiction hierarchy (state + county + city)
- Mentions that rates change over time and transactions need point-in-time accuracy
- Addresses caching for rate lookups
- Discusses product-level taxability differences
- Considers basic multi-tenancy

### Senior Level (Strong Hire)
- Designs jurisdiction resolution with geocoding and polygon-based boundaries
- Implements bitemporal rate versioning with effective date management
- Addresses nexus determination with physical and economic thresholds
- Handles exemption certificate lifecycle management
- Discusses compound taxation and tax-on-tax scenarios
- Proposes rate change propagation strategy with bounded staleness
- Designs for 50K+ TPS with caching and regional replication
- Maintains audit-grade logging with immutable event store

### Staff Level (Exceptional)
- Designs the jurisdiction resolver as a geospatial service with versioned boundary data and boundary-change propagation
- Analyzes sourcing rules (origin vs destination) as a configurable policy layer
- Discusses marketplace facilitator rules and two-tier nexus resolution
- Proposes ML-based product classification with human-in-the-loop for tax category mapping
- Designs cross-border taxation with VAT reverse-charge, place-of-supply rules, and withholding tax
- Addresses e-invoicing compliance across multiple regimes (India, EU, Brazil, Saudi Arabia)
- Proposes a golden-dataset regression testing framework for rate change validation
- Discusses the regulatory compliance dimension: how the system adapts to new legislation (e.g., a new state adopting economic nexus)

---

## Red Flags (What NOT to Say)

| Red Flag | Why It's Problematic | What to Say Instead |
|----------|---------------------|-------------------|
| "Tax is just price times rate" | Ignores jurisdiction stacking, product taxability, exemptions, and nexus | "Tax determination is a pipeline: resolve jurisdictions, check nexus, determine product taxability per jurisdiction, look up temporal rates, handle exemptions, then calculate" |
| "We'll use ZIP codes to determine tax jurisdiction" | ZIP codes cross jurisdiction boundaries, causing systematic errors | "We need rooftop-level geocoding against jurisdiction boundary polygons; ZIP is only an approximate fallback" |
| "Just store the current tax rate" | No temporal versioning means retroactive audits will fail | "Every rate has effective_from/effective_to dates; the transaction date selects the applicable version" |
| "Sales tax and VAT are basically the same" | Sales tax is single-stage destination-based; VAT is multi-stage invoice-based with input credits | "Each tax type requires a different calculation strategy: sales tax sums jurisdiction rates, VAT computes net liability across the supply chain" |
| "We don't need to worry about nexus---just charge tax everywhere" | Over-collection is illegal in jurisdictions where the seller has no nexus; under-collection creates audit liability | "Nexus determination is a prerequisite to calculation---you must know where you owe tax before you can calculate it" |
| "Exemptions are just a boolean flag on the customer" | Exemptions are jurisdiction-specific, product-category-specific, time-limited, and require certificate documentation | "Exemptions are a matrix of (buyer, jurisdiction, product_category, certificate, validity_period)---each dimension must be validated at calculation time" |
| "We'll handle rate changes in the next deployment" | Rate changes happen continuously across 13,000+ jurisdictions; code deployments cannot keep pace | "Rate data is ingested as configuration, not code. Future-effective rates are loaded ahead of time and activate automatically on their effective date" |

---

## Extension Topics (If Time Permits)

### 1. E-Invoicing Compliance
India (GST e-invoicing via IRP), EU (Peppol and ViDA), Brazil (NF-e), and Saudi Arabia (ZATCA FATOORA) each mandate different real-time invoice reporting formats. The engine must generate jurisdiction-specific XML/JSON payloads, submit to government portals, and store signed acknowledgments. This is increasingly a real-time requirement---India requires e-invoice generation before goods can be shipped.

### 2. ML-Based Product Classification
Tax categories are notoriously ambiguous. Is a "chocolate-covered pretzel" candy (taxable) or food (exempt)? ML models trained on product descriptions, ingredient lists, and historical classification decisions can auto-suggest tax categories. A human-in-the-loop review queue handles low-confidence predictions. The model improves continuously as reviewers confirm or correct suggestions.

### 3. Real-Time Nexus Threshold Monitoring
As a seller processes transactions, the system maintains running aggregates of (revenue, transaction_count) per jurisdiction. When a seller approaches 80% of an economic nexus threshold, the system proactively alerts them. When the threshold is crossed, the system automatically enables tax collection for that jurisdiction on subsequent transactions and notifies the seller of registration obligations.

### 4. Cross-Border Transaction Tax Determination
International transactions involve import duties, customs valuations, de minimis thresholds, trade agreement preferences, and withholding taxes. The engine must determine: (a) the harmonized system (HS) code for the product, (b) applicable duty rates based on origin/destination country and trade agreements, (c) whether a de minimis exemption applies, (d) VAT/GST liability in the destination country, and (e) any withholding tax on digital services.

### 5. Tax Filing and Remittance Automation
Aggregate calculated taxes by jurisdiction and filing period. Generate jurisdiction-specific return formats (hundreds of unique form layouts across US states alone). Schedule remittance payments aligned with jurisdiction-specific due dates. Handle amendments when rate corrections or audit adjustments require re-filing. Track payment acknowledgments and manage penalty/interest calculations for late filings.

---

## Sample Whiteboard Walkthrough

### Step 1: Start With the API Contract (1 min)

Draw the API boundary first. Write the request and response on the board:

```
REQUEST:  POST /v1/tax/calculate
{
  seller_id, buyer_address, ship_from_address,
  line_items: [{ product_id, category, quantity, unit_price }],
  transaction_date, exemption_certificate_id?
}

RESPONSE:
{
  total_tax, line_items: [{
    jurisdictions: [{ name, type, rate, tax_amount }],
    item_tax_total, taxable_amount, exempt_amount
  }],
  audit_token
}
```

### Step 2: Draw the Core Pipeline (3 min)

Draw left-to-right, showing the calculation as a pipeline:

```
API Gateway -> Address Validator -> Jurisdiction Resolver
    -> Nexus Checker -> Exemption Validator
    -> Rate Lookup -> Taxability Engine -> Calculator -> Audit Logger
```

Label each component with its responsibility in 2--3 words. Emphasize that this is a pipeline, not a monolith---each stage can be scaled independently.

### Step 3: Expand Jurisdiction Resolution (3 min)

Zoom into the Jurisdiction Resolver. Draw the tree structure:

```
Address: "123 Main St, Boulder, CO 80302"
    -> Geocode: (40.0150, -105.2705)
    -> Polygon lookup:
        Country: US
        State: Colorado (2.90%)
        County: Boulder County (0.985%)
        City: Boulder (3.86%)
        RTD District (1.00%)
        Cultural District (0.10%)
    -> Total stacked rate: 8.845%
```

This visual demonstrates the jurisdiction stacking concept clearly.

### Step 4: Show Temporal Versioning (2 min)

Draw a timeline showing how rate versioning works:

```
Rate Timeline for Boulder City:
|---3.50%---|---3.86%---|---4.00%---|
Jan 1       Jul 1       Jan 1
2024        2024        2025

Transaction on Jun 15 2024 -> uses 3.50%
Transaction on Aug 1 2024  -> uses 3.86%
```

This makes the bitemporal concept tangible.

### Step 5: Add Data Stores and Caches (2 min)

Below the pipeline, draw the data layer:

- **Jurisdiction Boundary Store**: Geospatial index of versioned boundary polygons
- **Rate Database**: Bitemporal rate table with (jurisdiction, category, effective_date) composite key
- **Nexus Profile Store**: Per-tenant nexus configurations and economic threshold counters
- **Exemption Certificate Store**: Certificate images, metadata, and validity status
- **Audit Event Store**: Append-only log of every calculation with full input/output snapshot

Add a distributed cache layer between the pipeline and the stores for jurisdiction resolution results and rate lookups.

### Step 6: Discuss Scale and Reliability (2 min)

Annotate the diagram with scaling notes:

- Cache hit rate target: 95%+ for jurisdiction resolution (addresses repeat frequently)
- Rate table replication: leader-follower with < 60s propagation
- Calculation service: stateless, horizontally scalable behind a load balancer
- Audit store: append-only, partitioned by tenant and date, 7+ year retention
- Circuit breaker on geocoding service: fall back to ZIP-level approximation if geocoder is unavailable

---

## Quick Reference Card

### Key Numbers

| Metric | Target |
|--------|--------|
| US tax jurisdictions | ~13,000 |
| Global countries supported | 50+ |
| Calculation latency (p99) | < 50ms |
| Throughput | 50,000 line-items/second |
| Rate change propagation | < 60 seconds |
| Jurisdiction cache hit rate | > 95% |
| Audit log retention | 7+ years |
| Rate table size | ~500K active rate entries |
| Boundary data updates | Monthly |

### Critical Components to Mention

- **Jurisdiction Resolver**: Geocoding + geospatial polygon lookup with versioned boundaries
- **Rate Lookup Engine**: Bitemporal rate table with product-category-level granularity
- **Nexus Engine**: Physical + economic nexus tracking with threshold monitoring
- **Taxability Matrix**: Per-jurisdiction product category rules (taxable, exempt, reduced rate)
- **Exemption Manager**: Certificate lifecycle from capture through expiration
- **Calculation Pipeline**: Stateless, horizontally scaled computation service
- **Audit Store**: Append-only immutable log of every determination

### Differentiating Insights

1. "This is not a rate lookup problem---it is a jurisdiction resolution problem. The hard part is determining which 5 jurisdictions apply to a given address, not multiplying a number."
2. "ZIP codes are postal routes, not tax boundaries. Any system relying solely on ZIP codes will have systematic accuracy errors that create audit liability."
3. "Tax rules are data, not code. A system that requires deployments for rate changes cannot operate across 13,000 jurisdictions with independent update schedules."
4. "Nexus is the gatekeeper of the entire calculation. If you skip nexus determination, you will either over-collect (illegal) or under-collect (audit liability)."
5. "The temporal dimension is non-negotiable. Every rate, every boundary, and every nexus threshold must be queryable as-of any historical date for audit reconstruction."
