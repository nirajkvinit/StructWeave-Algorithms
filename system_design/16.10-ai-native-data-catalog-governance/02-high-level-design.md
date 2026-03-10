# High-Level Design — AI-Native Data Catalog & Governance

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
    subgraph Clients["Client Layer"]
        UI[Web UI / Portal]
        API_C[API Clients]
        NLQ[NL Query Interface]
        SDK[SDK / CLI]
    end

    subgraph Gateway["API Gateway"]
        GW[API Gateway]
        AUTH[AuthN / AuthZ]
        RL[Rate Limiter]
    end

    subgraph Core["Core Services"]
        SS[Search Service]
        CS[Catalog Service]
        LS[Lineage Service]
        PS[Policy Service]
        QS[Quality Service]
    end

    subgraph AI["AI/ML Services"]
        CLS[Classification Engine]
        NLP[NL-to-SQL Engine]
        RK[Search Ranking Model]
        AD[Anomaly Detector]
    end

    subgraph Ingestion["Metadata Ingestion"]
        CR[Crawler Scheduler]
        PC[Pull Connectors]
        PH[Push Receivers]
        SP[SQL Parser / Lineage Extractor]
    end

    subgraph Storage["Storage Layer"]
        MG[(Metadata Graph DB)]
        SI[(Search Index)]
        TS[(Time-Series Quality Store)]
        AL[(Audit Log)]
    end

    subgraph Streaming["Event Streaming"]
        EB[Event Bus]
        AM[Active Metadata Processor]
    end

    UI & API_C & NLQ & SDK --> GW
    GW --> AUTH --> RL
    RL --> SS & CS & LS & PS & QS
    NLQ --> NLP
    NLP --> CS
    SS --> SI
    SS --> RK
    CS --> MG
    LS --> MG
    PS --> MG
    QS --> TS
    QS --> AD

    CR --> PC
    PC & PH --> SP
    SP --> EB
    EB --> AM
    AM --> MG & SI & TS

    CLS --> MG

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ai fill:#fce4ec,stroke:#c62828,stroke-width:2px
    classDef ingestion fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef streaming fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class UI,API_C,NLQ,SDK client
    class GW,AUTH,RL gateway
    class SS,CS,LS,PS,QS service
    class CLS,NLP,RK,AD ai
    class CR,PC,PH,SP ingestion
    class MG,SI,TS,AL storage
    class EB,AM streaming
```

## Component Descriptions

| Component | Responsibility |
|-----------|---------------|
| **API Gateway** | Routes requests, enforces authentication (OAuth2/OIDC), rate limiting, request validation |
| **Search Service** | Full-text and faceted search with usage-weighted ranking, semantic search via embeddings |
| **Catalog Service** | CRUD operations on metadata entities (tables, columns, pipelines, dashboards, glossary terms) |
| **Lineage Service** | Stores and traverses the column-level lineage graph; supports impact analysis queries |
| **Policy Service** | Evaluates tag-based access policies, column masking rules, and row filtering predicates |
| **Quality Service** | Stores profiling results, computes quality scores, detects anomalies via statistical models |
| **Classification Engine** | Runs NER models (spaCy) and regex patterns against data samples to detect PII/PHI/PCI |
| **NL-to-SQL Engine** | Converts natural language questions to SQL using LLM with catalog metadata as context |
| **Search Ranking Model** | Learns-to-rank model combining text relevance, usage frequency, freshness, quality score |
| **Crawler Scheduler** | Orchestrates periodic and incremental metadata crawls across all connected sources |
| **SQL Parser** | Parses SQL/dbt models to extract column-level lineage from AST analysis |
| **Event Bus** | Streams metadata change events (schema changes, quality signals, lineage updates) |
| **Active Metadata Processor** | Event-driven automation: triggers notifications, policy checks, lineage updates on metadata changes |

---

## Data Flow: Metadata Ingestion Path

```mermaid
---
config:
  theme: base
  look: neo
---
sequenceDiagram
    participant Source as Data Source
    participant Conn as Connector
    participant Parser as SQL Parser
    participant Bus as Event Bus
    participant AMP as Active Metadata Processor
    participant Graph as Metadata Graph
    participant Index as Search Index
    participant Class as Classification Engine

    Source->>Conn: Schema metadata (pull/push)
    Conn->>Parser: Raw metadata + SQL queries
    Parser->>Parser: AST analysis → column-level lineage
    Parser->>Bus: MetadataChangeEvent (entities + lineage)
    Bus->>AMP: Stream events
    AMP->>Graph: Upsert entities & relationships
    AMP->>Index: Update search index
    AMP->>Class: Queue new/changed columns for classification
    Class->>Class: Sample data + NER + regex
    Class->>Graph: Apply classification tags (PII, PHI, PCI)
    Graph->>AMP: Tag change triggers policy evaluation
    AMP->>AMP: Evaluate tag-based policies → auto-apply masking
```

## Data Flow: Search & Discovery Path

```mermaid
---
config:
  theme: base
  look: neo
---
sequenceDiagram
    participant User as Data Practitioner
    participant UI as Web UI
    participant GW as API Gateway
    participant SS as Search Service
    participant Rank as Ranking Model
    participant Index as Search Index
    participant Graph as Metadata Graph
    participant Policy as Policy Service

    User->>UI: Search query + filters
    UI->>GW: GET /search?q=customer&type=table
    GW->>SS: Authenticated search request
    SS->>Index: Full-text + faceted query
    Index->>SS: Candidate results (top 100)
    SS->>Rank: Re-rank by usage, quality, freshness
    Rank->>SS: Ranked results (top 20)
    SS->>Graph: Enrich with lineage depth, owner, quality score
    SS->>Policy: Filter results by user's access policies
    Policy->>SS: Visible assets only
    SS->>GW: SearchResponse (ranked, enriched, filtered)
    GW->>UI: Rendered results with facets
```

---

## Key Design Decisions

| Decision | Choice | Alternative | Rationale |
|----------|--------|-------------|-----------|
| **Metadata storage** | RDBMS (PostgreSQL) with adjacency model | Native graph database | RDBMS handles ACID transactions, schema migrations, and operational familiarity; graph queries are handled via recursive CTEs and materialized lineage paths |
| **Search engine** | Dedicated search index (OpenSearch) | RDBMS full-text search | Search requires inverted indexes, faceting, fuzzy matching, and embedding-based semantic search at scale |
| **Ingestion model** | Hybrid push + pull | Pull-only crawling | Push for real-time sources (Airflow, Spark); pull for batch sources (warehouses, BI tools) |
| **Lineage extraction** | SQL AST parsing | Query log pattern matching | AST parsing gives column-level accuracy; pattern matching misses complex CTEs and subqueries |
| **Classification approach** | Hybrid NER + regex + LLM | Regex-only | NER catches unstructured PII in free-text columns; regex handles structured patterns (SSN, email); LLM resolves ambiguous cases |
| **Policy enforcement model** | Tag-based (ABAC) | Role-based (RBAC) only | Tags compose with classification — auto-classified PII columns automatically inherit masking policies |
| **Event architecture** | Event bus with active metadata processor | Polling-based sync | Real-time responsiveness for schema changes, quality alerts, and policy triggers |
| **NL-to-SQL** | LLM with RAG over catalog metadata | Rule-based NL parser | LLM handles open-ended questions; catalog metadata provides schema context for accurate SQL generation |
