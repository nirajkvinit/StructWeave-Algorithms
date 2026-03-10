# Requirements & Estimations — Data Mesh Architecture

## Functional Requirements

### Core Features (Must-Have)

| # | Requirement | Description |
|---|------------|-------------|
| F1 | **Data Product Registration** | Domain teams register data products with schema, owner, SLOs, access policies, and lineage metadata in a central catalog |
| F2 | **Data Product Discovery** | Consumers search and browse a catalog of data products by domain, topic, quality score, freshness, and semantic tags |
| F3 | **Data Contract Management** | Producers define and publish machine-readable contracts; consumers subscribe to contracts; breaking changes trigger validation failures |
| F4 | **Federated Governance Policy Engine** | Global policies (naming conventions, PII classification, retention rules, quality thresholds) are encoded as computational rules and automatically enforced at data product publish time |
| F5 | **Cross-Domain Lineage** | Track data product dependencies across domain boundaries — which data products feed into which downstream products, enabling impact analysis and root-cause debugging |
| F6 | **Self-Serve Data Product Publishing** | Platform provides templates, CI/CD pipelines, and infrastructure provisioning so domain teams can publish data products without platform engineering support |
| F7 | **Access Management** | Fine-grained, policy-driven access control where data product owners define access policies and the platform enforces them across all consumption interfaces |
| F8 | **Data Quality & SLO Monitoring** | Continuous monitoring of data product freshness, completeness, schema conformance, and custom quality rules with SLO tracking and alerting |

### Extended Features (Nice-to-Have)

| # | Requirement | Description |
|---|------------|-------------|
| E1 | **Cross-Domain Query Federation** | Execute SQL queries that join data products from multiple domains without data movement via a federated query engine |
| E2 | **Automated Data Product Versioning** | Semantic versioning of data products with backward-compatible schema evolution and deprecation workflows |
| E3 | **Data Product Marketplace** | Internal marketplace where consumers rate, review, and request data products — driving a feedback loop to improve quality |
| E4 | **Cost Attribution** | Track compute and storage costs per data product and charge back to the owning domain, creating economic incentives for efficient data management |
| E5 | **AI-Assisted Metadata Enrichment** | Automatically classify data products, suggest tags, detect PII, and generate documentation from schema and sample data |

### Out of Scope

- Real-time stream processing engine (handled by domain-specific streaming infrastructure)
- Data transformation logic within domains (owned by domain teams using their preferred tools)
- BI/analytics dashboarding (consuming applications built on top of data products)
- Operational databases (data mesh governs analytical data products, not transactional systems)

---

## Non-Functional Requirements

### Architectural Philosophy

**AP with strong governance guarantees** — Data mesh is not a transactional system with strict consistency requirements. Data products are eventually consistent (published on different cadences by independent domains). However, governance policies must be strongly enforced — a data product that violates access control or quality policies must never become discoverable.

| Property | Choice | Justification |
|----------|--------|---------------|
| Consistency | Eventual (data products), Strong (governance) | Domains publish independently; governance violations must be caught before publication |
| Availability | High for catalog and discovery | Consumers must always be able to discover and access published data products |
| Partition Tolerance | Required | Domains operate independently; platform must function even when individual domains are offline |

### Performance Targets

| Metric | Target | Context |
|--------|--------|---------|
| Catalog search latency | < 200 ms (p50), < 500 ms (p99) | Full-text search across data product metadata |
| Data product registration | < 30 seconds | Including schema validation, policy evaluation, and catalog update |
| Governance policy evaluation | < 5 seconds per product | Evaluate all applicable global and domain-local policies |
| Contract validation | < 10 seconds | Schema compatibility check against all registered consumers |
| Lineage query (1 hop) | < 100 ms | Direct upstream/downstream dependencies |
| Lineage query (full graph) | < 2 seconds | Complete dependency graph for a data product |
| Cross-domain federated query | < 30 seconds (p50) | JOIN across 2-3 data products from different domains |
| Access policy evaluation | < 50 ms | Per-request access control check at query time |

### Durability & Availability

| Metric | Target |
|--------|--------|
| Catalog availability | 99.99% (52.6 min/year downtime) |
| Platform API availability | 99.95% (4.4 hours/year downtime) |
| Data product SLO compliance | > 95% of products meet their declared SLOs |
| Governance policy enforcement | 100% — no data product is discoverable without passing all policies |

---

## Capacity Estimations (Back-of-Envelope)

### Scenario: Large Enterprise Data Mesh

A Fortune 500 company with 40 business domains, 200+ domain teams, and 2,000 data products serving 5,000 data consumers (analysts, data scientists, engineers, applications).

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Business domains | 40 | Marketing, Finance, Supply Chain, HR, etc. |
| Domain teams | 200 | ~5 teams per domain |
| Data products (Year 1) | 500 | ~2.5 products per team initially |
| Data products (Year 3) | 2,000 | 4x growth as adoption matures |
| Data consumers | 5,000 | Analysts, scientists, engineers, automated pipelines |
| Catalog search QPS | 50 | 5,000 users x ~10 searches/day / 86,400 seconds |
| Data product publishes/day | 200 | 2,000 products x 10% publish daily (batch cadence) |
| Governance evaluations/day | 200 | 1:1 with publishes |
| Contract validations/day | 500 | Publishes + schema drift checks + consumer subscriptions |
| Lineage queries/day | 2,000 | Impact analysis, debugging, compliance audits |
| Access policy evaluations/hour | 50,000 | 5,000 consumers x 10 queries/hour average |
| Catalog metadata storage | 50 GB | 2,000 products x ~25 MB metadata each (schema, docs, lineage, quality history) |
| Data product storage (total) | 500 TB | Average 250 GB per product (varies widely: 1 GB to 50 TB) |
| Lineage graph size | 20K nodes, 50K edges | Products, columns, pipelines, consumers as nodes |

### Platform Infrastructure Summary

```
Catalog Service:       3 instances, 16 GB RAM, 4 vCPU each
Governance Engine:     3 instances, 8 GB RAM, 4 vCPU each
Lineage Service:       2 instances, 32 GB RAM, 8 vCPU each (graph processing)
Contract Validator:    2 instances, 8 GB RAM, 4 vCPU each
Access Control:        3 instances, 8 GB RAM, 4 vCPU each
Metadata Store:        Replicated document store, 200 GB with 3x replication
Lineage Graph Store:   Graph database, 50 GB with 3x replication
Search Index:          Full-text search cluster, 100 GB
Object Storage:        500 TB (data products themselves)
```

---

## SLOs / SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Catalog Availability | 99.99% | Percentage of successful catalog API requests |
| Discovery Latency (p99) | < 500 ms | End-to-end search including ranking and metadata enrichment |
| Governance Enforcement | 100% | No data product discoverable without passing all governance checks |
| Data Product SLO Compliance | > 95% | Percentage of data products meeting their declared freshness/quality SLOs |
| Contract Validation | < 10 seconds (p99) | Schema compatibility check against consumer contracts |
| Cross-Domain Lineage | < 2 seconds (p99) | Full dependency graph traversal |
| Platform Onboarding | < 1 day | Time for a new domain team to publish their first data product |
| Incident Detection | < 15 minutes | Time to detect a data product quality degradation |

---

## Read/Write Ratio Analysis

| Workload Type | Read:Write | Dominant Operation |
|---------------|------------|-------------------|
| Catalog discovery | 100:1 | Search, browse, metadata reads vastly exceed product registration |
| Governance evaluation | 1:1 | Each publish triggers one evaluation (balanced) |
| Lineage queries | 50:1 | Impact analysis and audits far exceed lineage graph mutations |
| Data product consumption | 200:1 | Consumers read data products far more often than producers update them |
| Access control | 500:1 | Policy evaluations per query vs. policy definition changes |
| Contract management | 20:1 | Consumer reads and validations vs. contract updates |

**Overall weighted ratio: ~100:1 (read-heavy)**
