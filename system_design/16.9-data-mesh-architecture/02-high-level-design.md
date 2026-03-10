# High-Level Design — Data Mesh Architecture

## System Architecture

```mermaid
---
config:
  theme: base
  look: neo
  themeVariables:
    primaryColor: "#e8f5e9"
    primaryBorderColor: "#2e7d32"
---
flowchart TB
    subgraph Domains["Domain Teams (Producers)"]
        D1[Domain A: Sales]
        D2[Domain B: Marketing]
        D3[Domain C: Supply Chain]
    end

    subgraph Platform["Self-Serve Data Platform"]
        subgraph Catalog["Data Product Catalog"]
            REG[Registration Service]
            DISC[Discovery & Search]
            META[(Metadata Store)]
        end

        subgraph Governance["Federated Governance Layer"]
            PE[Policy Engine]
            CV[Contract Validator]
            QM[Quality Monitor]
        end

        subgraph Infra["Platform Infrastructure"]
            PUB[Publishing Pipeline]
            ACC[Access Control Service]
            LIN[Lineage Service]
            LG[(Lineage Graph)]
        end
    end

    subgraph Consumers["Data Consumers"]
        AN[Analysts]
        DS[Data Scientists]
        APP[Applications]
        FQ[Federated Query Engine]
    end

    D1 & D2 & D3 -->|publish| PUB
    PUB --> CV
    CV --> PE
    PE --> REG
    REG --> META
    REG --> LIN
    LIN --> LG

    AN & DS & APP --> DISC
    DISC --> META
    AN & DS & APP --> FQ
    FQ --> ACC
    ACC --> D1 & D2 & D3

    QM --> META

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class D1,D2,D3 client
    class REG,DISC gateway
    class PE,CV,QM,PUB,ACC,LIN service
    class META,LG data
    class AN,DS,APP,FQ cache
```

---

## Data Flow

### Data Product Publishing Flow

```mermaid
---
config:
  theme: base
  look: neo
---
sequenceDiagram
    participant Domain as Domain Team
    participant Pipeline as Publishing Pipeline
    participant Contract as Contract Validator
    participant Policy as Policy Engine
    participant Catalog as Data Product Catalog
    participant Lineage as Lineage Service
    participant Quality as Quality Monitor

    Domain->>Pipeline: Submit data product descriptor (YAML)
    Pipeline->>Pipeline: Validate descriptor format
    Pipeline->>Contract: Validate schema against consumer contracts
    Contract->>Contract: Check backward compatibility
    Contract-->>Pipeline: Compatibility result

    alt Contract violation detected
        Pipeline-->>Domain: Reject — breaking change to consumer X
    end

    Pipeline->>Policy: Evaluate governance policies
    Policy->>Policy: Check naming conventions
    Policy->>Policy: Check PII classification
    Policy->>Policy: Check quality thresholds
    Policy->>Policy: Check access policy existence
    Policy-->>Pipeline: Policy evaluation result

    alt Policy violation detected
        Pipeline-->>Domain: Reject — policy violations listed
    end

    Pipeline->>Catalog: Register data product metadata
    Catalog-->>Pipeline: Registration confirmed
    Pipeline->>Lineage: Update lineage graph with dependencies
    Lineage-->>Pipeline: Lineage updated
    Pipeline->>Quality: Initialize SLO monitoring
    Quality-->>Pipeline: Monitoring active
    Pipeline-->>Domain: Data product published successfully
```

**Publishing flow key points:**

1. **Contract-first** — Schema compatibility with existing consumers is validated before governance policies, failing fast on breaking changes
2. **Policy-as-code** — All governance rules are machine-executable; no manual approval gates in the publishing pipeline
3. **Lineage capture** — Declared dependencies are recorded in the lineage graph at publish time, not discovered retroactively
4. **SLO activation** — Quality monitoring begins immediately upon publication with the declared freshness and quality thresholds
5. **Rejection with specifics** — Failed publications return actionable feedback identifying exactly which contracts or policies were violated

### Data Product Consumption Flow

```mermaid
---
config:
  theme: base
  look: neo
---
sequenceDiagram
    participant Consumer as Data Consumer
    participant Catalog as Discovery Service
    participant Access as Access Control
    participant Query as Federated Query Engine
    participant DomainA as Domain A Storage
    participant DomainB as Domain B Storage

    Consumer->>Catalog: Search "customer lifetime value"
    Catalog->>Catalog: Full-text search + relevance ranking
    Catalog-->>Consumer: Ranked results with quality scores, SLOs, owners

    Consumer->>Catalog: Request access to Product X
    Catalog->>Access: Evaluate access policy for consumer's identity
    Access->>Access: Check role, team, purpose-of-use
    Access-->>Consumer: Access granted (or pending owner approval)

    Consumer->>Query: SELECT * FROM domain_a.customers JOIN domain_b.orders
    Query->>Access: Validate query against access policies
    Access-->>Query: Authorized for both products
    Query->>DomainA: Fetch customer data (push down filters)
    Query->>DomainB: Fetch order data (push down filters)
    DomainA-->>Query: Customer records
    DomainB-->>Query: Order records
    Query->>Query: Execute cross-domain JOIN
    Query-->>Consumer: Unified result set
```

---

## Key Architectural Decisions

### 1. Decentralized Data Ownership vs. Central Data Team

| Aspect | Decentralized (Data Mesh) | Centralized (Data Lake/Warehouse) |
|--------|--------------------------|----------------------------------|
| Ownership | Domain teams own their data products | Central data engineering team owns all pipelines |
| Bottleneck | No central bottleneck; domains publish independently | Central team becomes bottleneck as domains grow |
| Quality accountability | Producer is accountable; SLOs are contractual | Central team must understand every domain's data |
| Coordination cost | Higher (many teams must follow standards) | Lower (one team, one standard) |
| Scaling | Scales with organizational growth | Breaks at 20-30 domains (central team cannot keep up) |

**Decision:** Decentralized ownership with federated governance. The central data engineering team evolves into a platform team that provides self-serve infrastructure rather than building all pipelines. This is the architectural response to the observation that centralized data teams become organizational bottlenecks that scale linearly with headcount while data complexity grows exponentially.

### 2. Contract-Driven vs. Schema-on-Read

| Aspect | Contract-Driven | Schema-on-Read |
|--------|----------------|----------------|
| Producer burden | Must declare and maintain contracts | Minimal — publish data in any format |
| Consumer reliability | Consumers can depend on guaranteed structure | Consumers must handle any structure |
| Breaking change detection | Automated at publish time | Discovered at query time (production failure) |
| Flexibility | Lower (changes require contract negotiation) | Higher (any format, any time) |
| Trust | High (contractual guarantees) | Low (hope the data looks right) |

**Decision:** Contract-driven with automated validation. The overhead of maintaining contracts is significantly lower than the cost of debugging production failures caused by undocumented schema changes. Contracts are YAML descriptors versioned alongside the data product.

### 3. Embedded Governance vs. External Governance

| Aspect | Embedded (Policy-as-Code) | External (Manual Review) |
|--------|--------------------------|-------------------------|
| Enforcement speed | Milliseconds (automated) | Days/weeks (committee review) |
| Consistency | 100% — policies apply to every product | Variable — depends on reviewer attention |
| Scalability | Scales to thousands of products | Breaks at dozens of products |
| Flexibility | Rigid (rules are binary) | Flexible (human judgment) |
| Auditability | Complete (every evaluation is logged) | Partial (meeting notes, email threads) |

**Decision:** Policy-as-code with automated enforcement. Manual review committees do not scale beyond a handful of data products. Policies are encoded as executable rules (declarative YAML or code), evaluated automatically during the publishing pipeline, and produce deterministic pass/fail results with specific violation messages.

### 4. Federated Query Engine vs. Data Replication

| Aspect | Federated Query | Data Replication |
|--------|----------------|-----------------|
| Data freshness | Always current (queries source) | Stale by replication lag |
| Cross-domain JOINs | Network-bound, latency depends on sources | Local, fast after initial replication |
| Storage cost | No duplication | Copies of all consumed products |
| Governance | Access checked at query time | Access checked at replication time |
| Complexity | Query optimization across heterogeneous sources | Replication pipeline management |

**Decision:** Federated queries as the default with optional materialized views for high-frequency cross-domain joins. This preserves the single-source-of-truth principle while allowing performance optimization where needed.

### 5. Data Product Storage Strategy

**Decision:** Domain teams choose their own storage technology (columnar store, object storage, relational database) as long as the data product exposes a standard interface (SQL-accessible via the federated query engine or API). The platform provides recommended templates but does not mandate a single storage technology — this preserves domain autonomy while ensuring interoperability through interface standardization.

### 6. Event-Driven vs. Polling for Change Notification

**Decision:** Event-driven change notifications via a central event bus. When a data product is published, updated, deprecated, or has a quality SLO violation, an event is emitted. Consumers subscribe to events for products they depend on. This enables reactive lineage updates, automated quality alerting, and consumer-side cache invalidation without polling.

---

## Architecture Pattern Checklist

- [x] **Sync vs Async communication** — Synchronous for catalog queries and access control; async for publishing pipeline and governance evaluation
- [x] **Event-driven vs Request-response** — Event-driven for data product lifecycle notifications; request-response for discovery and federated queries
- [x] **Push vs Pull model** — Push-based notifications for data product changes; pull-based for data consumption and discovery
- [x] **Stateless vs Stateful services** — Catalog and governance services are stateless (state in metadata store); lineage service maintains graph state
- [x] **Read-heavy vs Write-heavy** — Read-heavy (100:1); discovery and consumption dominate; publishing is infrequent per product
- [x] **Real-time vs Batch processing** — Batch for data product publishing (daily/hourly cadence); real-time for governance enforcement and access control
- [x] **Edge vs Origin processing** — Origin processing; governance policies must be evaluated against the full catalog, not cached at the edge
