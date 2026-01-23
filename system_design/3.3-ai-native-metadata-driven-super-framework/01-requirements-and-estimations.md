# Requirements & Estimations

[Back to Index](./00-index.md)

---

## Functional Requirements

### Core Platform Capabilities

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-01 | Custom Object Creation | P0 | Create new data objects without code/DDL, define API name, labels, relationships |
| FR-02 | Custom Field Creation | P0 | Add fields to objects with various data types (text, number, date, picklist, lookup, formula) |
| FR-03 | Relationship Management | P0 | Define lookup, master-detail, and many-to-many relationships between objects |
| FR-04 | Formula Fields | P0 | Create calculated fields using formula expressions with functions and cross-object references |
| FR-05 | Validation Rules | P0 | Define data validation rules that prevent invalid record saves |
| FR-06 | Workflow Automation | P0 | Create triggers on record events that execute actions (field updates, emails, tasks) |
| FR-07 | Approval Processes | P1 | Multi-step approval workflows with routing, escalation, and delegation |
| FR-08 | Page Layouts | P0 | Define UI layouts per object with sections, fields, and related lists |
| FR-09 | List Views | P0 | Create filtered/sorted views of records with column selection |
| FR-10 | Permission Sets | P0 | Define object CRUD and field-level security permissions |
| FR-11 | Sharing Rules | P1 | Configure record-level access based on criteria or ownership |
| FR-12 | Role Hierarchy | P1 | Define manager-subordinate relationships for record visibility |
| FR-13 | SOQL-like Query API | P0 | Query records using declarative query language with filters, joins, aggregations |
| FR-14 | Bulk Data Operations | P1 | Import/export large volumes of records efficiently |
| FR-15 | History Tracking | P1 | Track field-level changes on records with timestamps and users |

### AI-Native Capabilities

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-AI-01 | Natural Language to Formula | P1 | Generate formula expressions from natural language descriptions |
| FR-AI-02 | Natural Language to Workflow | P1 | Create workflow rules from plain English descriptions |
| FR-AI-03 | Schema Recommendation | P1 | Suggest objects, fields, and relationships from business descriptions |
| FR-AI-04 | Natural Language Query | P1 | Convert questions to SOQL queries and return results |
| FR-AI-05 | Document Data Extraction | P2 | Extract structured data from documents (PDF, images) into records |
| FR-AI-06 | Autonomous Agents | P2 | AI agents for data entry, approval routing, anomaly detection |
| FR-AI-07 | Semantic Search | P2 | Natural language search across all objects and records |

### Out of Scope

- Real-time collaboration (document editing)
- Video/audio content management
- IoT device integration
- Blockchain integration
- Custom programming language runtime (Apex-like)

---

## Non-Functional Requirements

### Performance

| Metric | Target | Justification |
|--------|--------|---------------|
| Metadata read latency (p50) | < 10ms | Metadata lookup on every API call |
| Metadata read latency (p99) | < 50ms | Cached metadata retrieval |
| Record CRUD latency (p50) | < 100ms | Including formula evaluation, validation |
| Record CRUD latency (p99) | < 500ms | Complex records with workflows |
| Formula evaluation (simple) | < 10ms | Single-field formulas |
| Formula evaluation (cross-object) | < 100ms | Multi-hop relationship traversal |
| Query execution (simple) | < 200ms | Single object, indexed filters |
| Query execution (complex) | < 2s | Joins, aggregations, large result sets |
| UI page render (metadata fetch) | < 100ms | Layout + field metadata |
| AI formula generation | < 3s | LLM inference with context |
| Workflow trigger execution | < 500ms | Sync portion before response |

### Scalability

| Metric | Target | Justification |
|--------|--------|---------------|
| Number of tenants | 10,000+ | Enterprise SaaS scale |
| Custom objects per tenant | 500+ | Complex enterprise deployments |
| Custom fields per object | 500+ | Extensive customization needs |
| Records per tenant (large) | 100M+ | Enterprise data volumes |
| Concurrent users per tenant | 10,000+ | Large enterprise deployments |
| Metadata operations per day | 10B+ | All API calls require metadata |
| Record operations per day | 1B+ | CRUD across all tenants |
| Workflow executions per day | 100M+ | Automation at scale |

### Availability & Reliability

| Metric | Target | Justification |
|--------|--------|---------------|
| Platform availability | 99.99% | < 52.6 min downtime/year |
| AI feature availability | 99.9% | AI degradation acceptable |
| Metadata consistency | Strong | Changes immediately visible |
| Data durability | 99.999999999% | 11 nines for record data |
| RPO (metadata) | 1 minute | Frequent metadata backups |
| RPO (records) | 5 minutes | Transaction log shipping |
| RTO | 15 minutes | Failover to standby region |

### Security & Compliance

| Requirement | Target | Justification |
|-------------|--------|---------------|
| Tenant isolation | Cryptographic | No cross-tenant data leakage |
| Encryption at rest | AES-256 | Industry standard |
| Encryption in transit | TLS 1.3 | Modern encryption |
| Authentication | OAuth 2.0, SAML 2.0 | Enterprise SSO integration |
| Audit logging | 100% coverage | All data and metadata changes |
| Compliance certifications | SOC 2, ISO 27001, GDPR | Enterprise requirements |

---

## Capacity Estimations

### Assumptions

| Parameter | Value | Source |
|-----------|-------|--------|
| Total tenants | 10,000 | Target scale |
| Active tenants (daily) | 8,000 | 80% daily active |
| Average custom objects per tenant | 100 | Mix of small and large tenants |
| Average custom fields per object | 50 | Typical customization |
| Average records per tenant | 5M | Weighted average |
| Large tenants (>50M records) | 100 | Top 1% |
| Average record size | 2 KB | Including flex columns |
| Metadata size per object | 50 KB | Definition + fields + layouts |
| Daily API calls per active tenant | 100,000 | Mix of reads and writes |
| Read:Write ratio | 80:20 | Read-heavy for queries/UI |
| Workflow triggers per write | 0.3 | 30% of writes trigger workflows |
| Formula evaluations per read | 2 | Average formula fields per query |

### Traffic Calculations

```
Daily API Calls:
= Active tenants × Calls per tenant
= 8,000 × 100,000
= 800,000,000 calls/day
= 9,259 QPS average
= ~30,000 QPS peak (3x average)

Daily Reads:
= 800M × 0.8
= 640M reads/day
= 7,407 QPS average

Daily Writes:
= 800M × 0.2
= 160M writes/day
= 1,852 QPS average

Daily Workflow Executions:
= Writes × Trigger rate
= 160M × 0.3
= 48M workflows/day

Daily Formula Evaluations:
= Reads × Formulas per read
= 640M × 2
= 1.28B formula evaluations/day

Metadata Operations:
= API calls × 3 (object lookup + field lookup + permission check)
= 800M × 3
= 2.4B metadata lookups/day (must be cached!)
```

### Storage Calculations

```
Record Storage:
= Total tenants × Average records × Record size
= 10,000 × 5M × 2 KB
= 100 TB base storage

Large Tenant Additional:
= Large tenants × (Large tenant records - Average) × Record size
= 100 × (50M - 5M) × 2 KB
= 9 TB additional

Total Record Storage (Year 1):
= 100 TB + 9 TB + 20% overhead
= ~130 TB

Metadata Storage:
= Tenants × Objects × Metadata size
= 10,000 × 100 × 50 KB
= 50 GB metadata

Audit Log Storage (Year 1):
= Writes per day × 365 × Log entry size
= 160M × 365 × 500 bytes
= ~29 TB

Search Index Storage:
= Record storage × Index ratio
= 130 TB × 0.3
= ~40 TB

Total Storage (Year 1): ~200 TB
Total Storage (Year 5): ~1 PB (assuming 50% YoY growth)
```

### Bandwidth Calculations

```
Average Response Size:
- Metadata read: 5 KB
- Record read: 2 KB
- Record write response: 1 KB
- Query response (20 records): 40 KB

Daily Egress:
= (Metadata reads × 5 KB) + (Record reads × 2 KB) + (Queries × 40 KB)
= (2.4B × 5 KB × 0.1 cache miss) + (640M × 2 KB) + (100M × 40 KB)
= 1.2 TB + 1.28 TB + 4 TB
= ~6.5 TB/day egress

Peak Bandwidth:
= Daily / 86400 × Peak multiplier
= 6.5 TB / 86400 × 3
= ~230 Gbps peak
```

### Cache Sizing

```
Metadata Cache (L2 - Distributed):
= Active tenants × Objects × Hot metadata ratio × Metadata size
= 8,000 × 100 × 0.5 × 50 KB
= 20 GB metadata cache

Permission Cache:
= Active users × Permission entries × Entry size
= 1M × 100 × 200 bytes
= 20 GB permission cache

Formula AST Cache:
= Tenants × Formula fields × AST size
= 10,000 × 1,000 × 2 KB
= 20 GB formula cache

Total L2 Cache: ~60 GB distributed cache
L1 Cache per Instance: 2 GB (hot subset)
```

---

## Capacity Summary Table

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| **DAU** | 1M users | 8K tenants × 125 avg users |
| **MAU** | 3M users | 1M DAU × 3 monthly ratio |
| **Read:Write Ratio** | 80:20 | Standard read-heavy |
| **QPS (average)** | 9,259 | 800M/day ÷ 86,400 |
| **QPS (peak)** | ~30,000 | 3x average |
| **Metadata Lookups/day** | 2.4B | 3 per API call |
| **Formula Evaluations/day** | 1.28B | 2 per read |
| **Storage (Year 1)** | 200 TB | Records + Index + Audit |
| **Storage (Year 5)** | 1 PB | 50% YoY growth |
| **Bandwidth (peak)** | 230 Gbps | Peak egress |
| **Cache Size (L2)** | 60 GB | Metadata + Permission + Formula |

---

## SLOs / SLAs

### Service Level Objectives

| Metric | SLO | Measurement Window | Measurement Method |
|--------|-----|-------------------|-------------------|
| **Availability** | 99.99% | Monthly | Uptime monitoring |
| **Metadata Read Latency (p99)** | < 50ms | Daily | APM percentiles |
| **Record CRUD Latency (p99)** | < 500ms | Daily | APM percentiles |
| **Query Latency (p99)** | < 2s | Daily | APM percentiles |
| **Error Rate** | < 0.1% | Hourly | Error count / Total requests |
| **AI Feature Availability** | 99.9% | Monthly | AI endpoint uptime |
| **AI Response Latency (p99)** | < 5s | Daily | APM percentiles |

### Service Level Agreements (Customer-Facing)

| Tier | Availability | Support Response | Data Residency | Credits |
|------|--------------|------------------|----------------|---------|
| **Enterprise** | 99.99% | 15 min (P1) | Regional options | 25% monthly |
| **Professional** | 99.9% | 1 hour (P1) | Multi-region | 10% monthly |
| **Starter** | 99.5% | 24 hours | Best effort | None |

### Error Budget

```
Monthly Error Budget (99.99%):
= 30 days × 24 hours × 60 min × (1 - 0.9999)
= 43,200 min × 0.0001
= 4.32 minutes/month

Quarterly Error Budget:
= 4.32 × 3
= 12.96 minutes/quarter

Allocation:
- Planned maintenance: 2 min/month
- Incident response: 2.32 min/month
- Reserved buffer: 0 min (no buffer at 99.99%)
```

---

## Governor Limits

To ensure platform stability and fair resource sharing, the following limits apply:

### Per-Transaction Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| SOQL queries per transaction | 100 | Prevent runaway queries |
| Records retrieved per query | 50,000 | Memory protection |
| DML statements per transaction | 150 | Database protection |
| Records processed per DML | 10,000 | Bulk operation limit |
| Formula evaluation depth | 10 | Prevent deep recursion |
| Workflow triggers depth | 5 | Prevent infinite cascades |
| CPU time per transaction | 10 seconds | Fair scheduling |
| Heap size per transaction | 12 MB | Memory protection |

### Per-24-Hour Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| API calls per tenant | 1,000,000 | Fair usage |
| Workflow emails | 1,000 | Email abuse prevention |
| Async jobs queued | 250,000 | Queue protection |
| Batch job executions | 250 | Resource sharing |

### AI Feature Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| AI formula generations per day | 1,000 | LLM cost control |
| AI query generations per day | 5,000 | LLM cost control |
| Document extractions per day | 500 | OCR/LLM cost control |
| Agent executions per day | 10,000 | Compute cost control |

---

## Tenant Tiers

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Custom Objects | 50 | 200 | Unlimited |
| Custom Fields per Object | 100 | 300 | 500 |
| Records | 1M | 10M | Unlimited |
| API Calls/day | 100K | 500K | 2M |
| Workflow Rules | 50 | 200 | 500 |
| Approval Processes | 5 | 25 | 100 |
| AI Formula Generations | 100/day | 500/day | 2,000/day |
| Users | 100 | 1,000 | Unlimited |
| Storage | 10 GB | 100 GB | 1 TB |
| Support | Community | Standard | Premium |
