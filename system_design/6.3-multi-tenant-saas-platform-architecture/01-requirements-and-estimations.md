# Requirements & Capacity Estimations

## Functional Requirements

### Core Features (In Scope)

1. **Tenant Lifecycle Management** -- Provisioning, onboarding, configuration, suspension, and decommissioning of tenant organizations
2. **Metadata-Driven Schema** -- Tenants define custom objects, fields, relationships, and validation rules without physical schema changes
3. **Universal Data Storage** -- A single shared data model (pivoted/EAV) stores all tenant data with org-level partitioning
4. **Customization Engine** -- Formula fields, validation rules, workflow automation, and triggers execute per-tenant logic
5. **Governor Limits Enforcement** -- Per-transaction and per-org resource quotas preventing any tenant from monopolizing shared resources
6. **Tenant-Aware Query Engine** -- Translates virtual schema queries into physical database operations with mandatory OrgID filtering
7. **Security Model** -- Org-level isolation, profile-based permissions, field-level security, role hierarchy, sharing rules
8. **API Platform** -- REST and bulk APIs with per-tenant rate limiting, authentication, and versioning
9. **Tenant Administration** -- Self-service configuration of custom fields, objects, page layouts, and automation rules

### Explicitly Out of Scope

- UI rendering engine / front-end framework (covered separately)
- App marketplace / extension installation
- Billing and subscription management
- Data migration tooling (ETL/import wizards)
- Mobile SDKs and offline sync
- AI/ML model training per tenant

---

## Non-Functional Requirements

### CAP Theorem Choice

**CP (Consistency + Partition Tolerance)** for transactional operations within a tenant. Justification: SaaS platforms handle business-critical data (financial records, customer data, contracts). A stale read or lost write is unacceptable for individual tenant operations.

**AP for cross-tenant analytics** -- eventual consistency is acceptable when aggregating data across organizations for platform-level reporting.

### Consistency Model

| Operation Type | Consistency | Justification |
|---------------|-------------|---------------|
| Single-tenant CRUD | **Strong** (linearizable) | Business data integrity, user expectations |
| Metadata changes | **Strong** with cache invalidation | Custom field additions must be immediately visible |
| Cross-tenant analytics | **Eventual** (seconds lag) | Aggregated platform metrics can tolerate delay |
| Audit logs | **Strong** (append-only) | Compliance requires accurate, ordered audit trail |

### Availability Target

**99.99%** (< 52 minutes downtime per year)

Justification: Enterprise SaaS customers sign SLAs requiring four-nines. Salesforce targets 99.9%+ (trust.salesforce.com reports), ServiceNow targets 99.996%.

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Simple CRUD (single record) | 20ms | 80ms | 200ms |
| List query (filtered, indexed) | 50ms | 150ms | 300ms |
| Complex query (joins, formulas) | 100ms | 300ms | 500ms |
| Metadata lookup (cached) | 2ms | 5ms | 10ms |
| Bulk API (1,000 records) | 1s | 3s | 5s |
| Report generation | 500ms | 2s | 5s |

### Durability Guarantees

- **Zero data loss** for committed transactions (RPO = 0 for sync replication)
- All mutations written to Write-Ahead Log (WAL) before acknowledgment
- Cross-region async replication with RPO < 5 seconds for DR

---

## Capacity Estimations (Back-of-Envelope)

### Assumptions

- **10,000 tenant organizations** (ranging from 5-user startups to 50,000-user enterprises)
- **Average 200 users per org**, 20% DAU
- **Average 50 custom objects per org**, 30 custom fields per object
- **Average record size**: 2 KB (after flex column storage)

### Calculations

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Total registered users | 2M | 10,000 orgs x 200 users avg |
| DAU | 400K | 2M x 20% |
| Read QPS (average) | 40,000 | 400K users x 6 reads/min / 60s |
| Write QPS (average) | 4,000 | 10:1 read:write ratio |
| Read QPS (peak) | 120,000 | 3x average during business hours |
| Write QPS (peak) | 12,000 | 3x average |
| Total records (Year 1) | 5B | 10,000 orgs x 500K records avg |
| Storage - Data (Year 1) | 10 TB | 5B records x 2 KB |
| Storage - Indexes (Year 1) | 5 TB | ~50% of data size (typed index copies) |
| Storage - Metadata (Year 1) | 500 GB | 10K orgs x 50 objects x 30 fields x metadata overhead |
| Storage - Audit Logs (Year 1) | 8 TB | 400K DAU x 50 actions/day x 365 x 1 KB |
| Total Storage (Year 1) | ~24 TB | Data + Indexes + Metadata + Audit |
| Storage (Year 5) | ~120 TB | ~5x growth (new tenants + data accumulation) |
| Bandwidth (egress) | 5 Gbps avg | 40K QPS x 16 KB avg response |
| Metadata cache size | 50 GB | Hot metadata for active orgs (10K orgs x 5 MB avg) |
| Data cache (hot records) | 500 GB | Top 20% frequently accessed records |

### Tenant Distribution (Power Law)

| Tier | Orgs | Users/Org | % of Total QPS | Storage/Org |
|------|------|-----------|----------------|-------------|
| Enterprise | 100 (1%) | 10,000-50,000 | 40% | 500 GB - 5 TB |
| Professional | 2,000 (20%) | 100-1,000 | 35% | 10 - 100 GB |
| Basic | 7,900 (79%) | 5-50 | 25% | 100 MB - 5 GB |

---

## SLOs / SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Availability** | 99.99% | Measured per-instance, excluding planned maintenance windows |
| **Latency (p99)** - CRUD | < 200ms | Measured at API gateway, per-tenant percentiles |
| **Latency (p99)** - Query | < 500ms | Complex queries with joins and formula evaluation |
| **Error Rate** | < 0.1% | 5xx errors / total requests, per-tenant |
| **Throughput** | 120K QPS (peak) | Sustained across all tenants |
| **Tenant Isolation** | Zero cross-tenant data leaks | Continuous validation via automated tests |
| **Metadata Sync** | < 100ms | Time for schema change to propagate to all app servers |
| **Data Durability** | 99.999999999% (11 nines) | Multi-AZ replication + backups |
| **Recovery (RTO)** | < 15 minutes | Per-tenant failover to standby instance |
| **Recovery (RPO)** | < 5 seconds | Async replication lag to DR region |

### Governor Limits (Per-Transaction)

| Resource | Synchronous Limit | Asynchronous Limit |
|----------|-------------------|-------------------|
| Query count | 100 | 200 |
| Records retrieved | 50,000 | 50,000 |
| DML statements | 150 | 150 |
| CPU time | 10,000 ms | 60,000 ms |
| Heap memory | 6 MB | 12 MB |
| External callouts | 100 | 100 |
| Callout timeout | 120 s | 120 s |
| Future calls | 50 | 50 |

### Per-Org Daily Limits

| Resource | Limit |
|----------|-------|
| API calls | Based on license count (e.g., 1,000/user/day for Enterprise) |
| Bulk API batches | 15,000 per rolling 24 hours |
| Async operations | 250,000 per rolling 24 hours |
| Storage (data) | Based on license (e.g., 10 GB base + 20 MB per user) |
| Storage (files) | Based on license (e.g., 10 GB base + 2 GB per user) |
