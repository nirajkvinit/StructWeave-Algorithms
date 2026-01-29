# High-Level Design

## Table of Contents
- [System Architecture](#system-architecture)
- [Component Overview](#component-overview)
- [Data Flow](#data-flow)
- [Key Architectural Decisions](#key-architectural-decisions)
- [Technology Choices](#technology-choices)
- [Integration Architecture](#integration-architecture)

---

## System Architecture

### Complete Architecture Diagram

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer"]
        WEB["Web Application<br/>(React/Vue)"]
        WORD["Microsoft Word<br/>Add-in"]
        OUTLOOK["Outlook<br/>Add-in"]
        MOBILEAPI["Mobile API<br/>(iOS/Android)"]
    end

    subgraph Gateway["API Gateway Layer"]
        APIGW["API Gateway"]
        AUTH["Authentication<br/>(OAuth 2.0/OIDC)"]
        RATELIMIT["Rate Limiter"]
        ROUTER["Request Router"]
    end

    subgraph IngestionLayer["Document Ingestion Layer"]
        UPLOAD["Upload Service"]
        QUEUE["Document Queue"]
        OCR["OCR Engine<br/>(Tesseract/Cloud Vision)"]
        NORMALIZER["Format Normalizer"]
        CHUNKER["Document Chunker"]
    end

    subgraph ProcessingLayer["AI Processing Layer"]
        subgraph NLPPipeline["Legal NLP Pipeline"]
            NER["Legal NER<br/>(SpaCy/GLiNER)"]
            CLAUSE["Clause Extractor<br/>(Legal-BERT)"]
            RELATION["Relation Extractor"]
        end
        subgraph RiskEngine["Risk Analysis Engine"]
            RISKSCORE["Risk Scorer"]
            PLAYBOOK["Playbook Comparator"]
            ANOMALY["Anomaly Detector"]
        end
        subgraph ResearchEngine["Research Engine"]
            SEMANTIC["Semantic Search"]
            CITATION["Citation Verifier"]
            MEMO["Memo Generator"]
        end
    end

    subgraph AILayer["Foundation Model Layer"]
        LLMGW["LLM Gateway"]
        GPT["GPT-4 / Claude"]
        EXPLAIN["Explainability<br/>Engine"]
        AGENT["Negotiation Agent"]
    end

    subgraph KnowledgeLayer["Knowledge Layer"]
        GRAPHDB[("Legal Knowledge<br/>Graph (Neo4j)")]
        VECTORDB[("Vector Store<br/>(Pinecone)")]
        CASELAW[("Case Law Index<br/>(Elasticsearch)")]
        PLAYBOOKS[("Playbook<br/>Repository")]
        DOCSTORE[("Document Store<br/>(Object Storage)")]
    end

    subgraph ComplianceLayer["Compliance Layer"]
        PRIVGW["Privilege Gateway"]
        PII["PII Detector"]
        AUDIT["Audit Logger"]
        LEGALHOLD["Legal Hold<br/>Manager"]
        CONSENT["Consent Manager"]
    end

    subgraph IntegrationLayer["Integration Layer"]
        CLM["CLM Systems<br/>(Ironclad/Agiloft)"]
        DMS["Document Management<br/>(iManage/NetDocs)"]
        EDISCOVERY["E-Discovery<br/>(Relativity)"]
        MATTER["Matter Management"]
    end

    %% Client to Gateway
    WEB --> APIGW
    WORD --> APIGW
    OUTLOOK --> APIGW
    MOBILEAPI --> APIGW
    APIGW --> AUTH --> RATELIMIT --> ROUTER

    %% Gateway to Ingestion
    ROUTER --> UPLOAD
    UPLOAD --> QUEUE
    QUEUE --> OCR --> NORMALIZER --> CHUNKER

    %% Ingestion to Processing
    CHUNKER --> NER
    NER --> CLAUSE --> RELATION
    CLAUSE --> RISKSCORE
    RISKSCORE --> PLAYBOOK
    PLAYBOOK --> ANOMALY
    NER --> SEMANTIC
    SEMANTIC --> CITATION --> MEMO

    %% Processing to AI Layer
    CLAUSE --> LLMGW
    RISKSCORE --> LLMGW
    LLMGW --> GPT
    GPT --> EXPLAIN
    EXPLAIN --> AGENT

    %% Knowledge Layer connections
    NER --> GRAPHDB
    CLAUSE --> VECTORDB
    SEMANTIC --> CASELAW
    PLAYBOOK --> PLAYBOOKS
    NORMALIZER --> DOCSTORE

    %% Compliance Layer
    ROUTER --> PRIVGW
    NER --> PII
    AUDIT --> GRAPHDB
    PRIVGW --> LEGALHOLD
    PRIVGW --> CONSENT

    %% Integration Layer
    ROUTER --> CLM
    ROUTER --> DMS
    AUDIT --> EDISCOVERY
    ROUTER --> MATTER

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef ingestion fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef processing fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ai fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef knowledge fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef compliance fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef integration fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class WEB,WORD,OUTLOOK,MOBILEAPI client
    class APIGW,AUTH,RATELIMIT,ROUTER gateway
    class UPLOAD,QUEUE,OCR,NORMALIZER,CHUNKER ingestion
    class NER,CLAUSE,RELATION,RISKSCORE,PLAYBOOK,ANOMALY,SEMANTIC,CITATION,MEMO processing
    class LLMGW,GPT,EXPLAIN,AGENT ai
    class GRAPHDB,VECTORDB,CASELAW,PLAYBOOKS,DOCSTORE knowledge
    class PRIVGW,PII,AUDIT,LEGALHOLD,CONSENT compliance
    class CLM,DMS,EDISCOVERY,MATTER integration
```

---

## Component Overview

### Layer 1: Client Layer

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **Web Application** | Primary user interface | Contract upload, review dashboard, research |
| **Word Add-in** | In-document analysis | Real-time clause highlighting, risk flags |
| **Outlook Add-in** | Email integration | Contract attachment processing |
| **Mobile API** | Mobile access | Approval workflows, notifications |

### Layer 2: API Gateway Layer

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **API Gateway** | Single entry point | Request routing, SSL termination |
| **Authentication** | Identity verification | OAuth 2.0, OIDC, SAML for enterprise SSO |
| **Rate Limiter** | Abuse prevention | Per-user, per-tenant limits |
| **Request Router** | Traffic distribution | Route to appropriate service |

### Layer 3: Document Ingestion Layer

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **Upload Service** | Document reception | Multi-part upload, resume support |
| **Document Queue** | Async processing | Priority queuing, dead letter |
| **OCR Engine** | Text extraction | Multi-engine fallback, language detection |
| **Format Normalizer** | Standardization | PDF/DOCX/TIFF to unified format |
| **Document Chunker** | Semantic segmentation | Page, section, paragraph boundaries |

### Layer 4: AI Processing Layer

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **Legal NER** | Entity extraction | Parties, dates, amounts, jurisdictions |
| **Clause Extractor** | Clause identification | 500+ clause types, boundary detection |
| **Relation Extractor** | Entity relationships | Party-clause, clause-obligation links |
| **Risk Scorer** | Risk assessment | Multi-factor scoring, severity levels |
| **Playbook Comparator** | Standard compliance | Deviation detection, suggestion |
| **Anomaly Detector** | Unusual terms | Market position comparison |
| **Semantic Search** | Legal research | Case law, statute retrieval |
| **Citation Verifier** | Reference validation | Shepardizing, currency check |
| **Memo Generator** | Document synthesis | Research memo, summary generation |

### Layer 5: Foundation Model Layer

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **LLM Gateway** | Model routing | Load balancing, fallback, cost optimization |
| **GPT-4 / Claude** | Reasoning engine | Complex analysis, generation |
| **Explainability Engine** | Reasoning chains | Citation-backed explanations |
| **Negotiation Agent** | Autonomous actions | Redlining, counter-proposals |

### Layer 6: Knowledge Layer

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **Legal Knowledge Graph** | Entity relationships | Multi-hop reasoning, precedent chains |
| **Vector Store** | Semantic retrieval | Clause embeddings, similarity search |
| **Case Law Index** | Full-text search | Jurisdictional filtering, date ranges |
| **Playbook Repository** | Standard templates | Version control, approval workflows |
| **Document Store** | Raw storage | Immutable storage, deduplication |

### Layer 7: Compliance Layer

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **Privilege Gateway** | Confidentiality protection | Classification, access control |
| **PII Detector** | Sensitive data identification | Names, SSNs, addresses |
| **Audit Logger** | Activity tracking | Immutable logs, timestamp |
| **Legal Hold Manager** | Preservation | Hold triggers, release |
| **Consent Manager** | Data subject rights | Consent tracking, withdrawal |

### Layer 8: Integration Layer

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **CLM Systems** | Contract lifecycle | Ironclad, Agiloft, Icertis |
| **Document Management** | Storage integration | iManage, NetDocuments |
| **E-Discovery** | Litigation support | Relativity, Logikcull |
| **Matter Management** | Case tracking | Aderant, Elite |

---

## Data Flow

### Contract Review Flow

```mermaid
sequenceDiagram
    autonumber
    participant Attorney
    participant WebApp
    participant APIGateway
    participant PrivilegeGW
    participant UploadSvc
    participant DocQueue
    participant OCR
    participant NERSvc
    participant ClauseSvc
    participant RiskSvc
    participant LLMGateway
    participant ExplainEngine
    participant KnowledgeGraph
    participant AuditLog

    Attorney->>WebApp: Upload contract (PDF/DOCX)
    WebApp->>APIGateway: POST /contracts/analyze
    APIGateway->>PrivilegeGW: Check privilege classification
    PrivilegeGW->>AuditLog: Log access attempt
    PrivilegeGW-->>APIGateway: Access granted
    APIGateway->>UploadSvc: Store document
    UploadSvc->>DocQueue: Enqueue for processing
    DocQueue->>OCR: Extract text
    OCR->>NERSvc: Named entity recognition

    par Parallel Processing
        NERSvc->>ClauseSvc: Extract clauses
        NERSvc->>KnowledgeGraph: Store entities
    end

    ClauseSvc->>RiskSvc: Score risks
    RiskSvc->>LLMGateway: Generate risk analysis
    LLMGateway->>ExplainEngine: Create explanation chain
    ExplainEngine->>KnowledgeGraph: Link citations

    ExplainEngine-->>WebApp: Return analysis result
    WebApp-->>Attorney: Display review dashboard

    Note over AuditLog: All steps logged with timestamps
```

### Due Diligence Batch Flow

```mermaid
sequenceDiagram
    autonumber
    participant MandATeam
    participant WebApp
    participant DDOrchestrator
    participant DocQueue
    participant WorkerPool
    participant ClassifierSvc
    participant ClauseSvc
    participant RiskSvc
    participant ReportGenerator
    participant NotificationSvc

    MandATeam->>WebApp: Create DD project
    MandATeam->>WebApp: Upload data room (5000 docs)
    WebApp->>DDOrchestrator: Initialize project
    DDOrchestrator->>DocQueue: Batch enqueue documents

    loop For each document (parallelized)
        DocQueue->>WorkerPool: Assign to worker
        WorkerPool->>ClassifierSvc: Classify document type
        ClassifierSvc->>ClauseSvc: Extract relevant clauses
        ClauseSvc->>RiskSvc: Identify risks
        RiskSvc->>DDOrchestrator: Report findings
    end

    DDOrchestrator->>DDOrchestrator: Aggregate results
    DDOrchestrator->>ReportGenerator: Generate deal summary
    ReportGenerator->>NotificationSvc: Notify completion
    NotificationSvc-->>MandATeam: Email with report link

    Note over DDOrchestrator: Progress tracked throughout
```

### Legal Research Flow

```mermaid
sequenceDiagram
    autonumber
    participant Attorney
    participant WebApp
    participant ResearchSvc
    participant VectorDB
    participant CaseLawIndex
    participant CitationVerifier
    participant LLMGateway
    participant MemoGenerator
    participant KnowledgeGraph

    Attorney->>WebApp: Enter research question
    WebApp->>ResearchSvc: POST /research/query

    par Multi-Source Search
        ResearchSvc->>VectorDB: Semantic search
        ResearchSvc->>CaseLawIndex: Keyword search
        ResearchSvc->>KnowledgeGraph: Graph traversal
    end

    VectorDB-->>ResearchSvc: Relevant passages
    CaseLawIndex-->>ResearchSvc: Case matches
    KnowledgeGraph-->>ResearchSvc: Related entities

    ResearchSvc->>ResearchSvc: Rank and merge results
    ResearchSvc->>CitationVerifier: Validate citations
    CitationVerifier-->>ResearchSvc: Verified citations

    ResearchSvc->>LLMGateway: Synthesize answer
    LLMGateway->>MemoGenerator: Generate memo
    MemoGenerator-->>WebApp: Return research memo
    WebApp-->>Attorney: Display with citations
```

---

## Key Architectural Decisions

### Decision 1: Hybrid Model Strategy

```mermaid
flowchart LR
    subgraph Input["Document Input"]
        DOC["Contract"]
    end

    subgraph Tier1["Tier 1: Specialized Models"]
        LEGALBERT["Legal-BERT<br/>Clause Extraction"]
        SPACY["SpaCy Legal<br/>NER"]
        GLINER["GLiNER<br/>Zero-shot NER"]
    end

    subgraph Tier2["Tier 2: Foundation Models"]
        GPT["GPT-4"]
        CLAUDE["Claude"]
    end

    subgraph Tier3["Tier 3: Human Review"]
        HITL["Attorney Review"]
    end

    DOC --> LEGALBERT
    DOC --> SPACY
    DOC --> GLINER

    LEGALBERT -->|High confidence| OUTPUT["Output"]
    SPACY -->|High confidence| OUTPUT
    GLINER -->|High confidence| OUTPUT

    LEGALBERT -->|Low confidence| GPT
    SPACY -->|Low confidence| CLAUDE
    GLINER -->|Low confidence| GPT

    GPT -->|High confidence| OUTPUT
    CLAUDE -->|High confidence| OUTPUT

    GPT -->|Low confidence| HITL
    CLAUDE -->|Low confidence| HITL

    HITL --> OUTPUT

    classDef tier1 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef tier2 fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef tier3 fill:#fce4ec,stroke:#880e4f,stroke-width:2px

    class LEGALBERT,SPACY,GLINER tier1
    class GPT,CLAUDE tier2
    class HITL tier3
```

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Primary Processing** | Specialized models (Legal-BERT, SpaCy) | Fast, deterministic, cost-effective |
| **Complex Reasoning** | Foundation models (GPT-4, Claude) | Flexibility for novel situations |
| **Fallback** | Human-in-the-loop | Professional responsibility requirement |
| **Routing** | Confidence-based | Optimize cost vs. accuracy tradeoff |

### Decision 2: Knowledge Representation

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Structure** | Property Graph (Neo4j) | Multi-hop reasoning for precedents |
| **Embeddings** | Vector Store (Pinecone) | Semantic similarity for clauses |
| **Full-text** | Elasticsearch | Case law keyword search |
| **Integration** | GraphRAG pattern | Combine graph + vector retrieval |

### Decision 3: Explainability Architecture

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Approach** | Chain-of-Thought with citations | Attorney trust, court defensibility |
| **Granularity** | Per-extraction explanation | Fine-grained audit trail |
| **Storage** | Immutable explanation store | Compliance, reproducibility |
| **Presentation** | Layered (summary → detail) | Different user needs |

### Decision 4: Compliance-First Design

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Data Training** | No client data in training | Preserve attorney-client privilege |
| **Processing Isolation** | Tenant-isolated compute | Data segregation |
| **Audit Trail** | Append-only, immutable | E-discovery requirements |
| **Access Control** | Attribute-based (ABAC) | Granular privilege management |

### Architecture Pattern Checklist

| Pattern | Decision | Notes |
|---------|----------|-------|
| **Sync vs Async** | Async for processing, Sync for queries | Queue-based document processing |
| **Event-driven vs Request-response** | Event-driven for pipeline | Document state machine |
| **Push vs Pull** | Pull for processing, Push for notifications | Worker-based scaling |
| **Stateless vs Stateful** | Stateless services | Session state in Redis |
| **Read-heavy vs Write-heavy** | Read-heavy (80:20) | Cache aggressively |
| **Real-time vs Batch** | Both modes supported | Contract review vs. due diligence |
| **Edge vs Origin** | Origin processing | Compliance requirements |

---

## Technology Choices

### Document Processing Stack

| Component | Primary Choice | Alternative | Selection Criteria |
|-----------|---------------|-------------|-------------------|
| **OCR** | Cloud Vision API | Tesseract 5 | Accuracy, language support |
| **PDF Parsing** | pdf.js + Apache Tika | PyMuPDF | Format coverage |
| **Layout Analysis** | LayoutLMv3 | Donut | Table/form extraction |
| **Document Store** | Object Storage (S3-compatible) | MinIO | Durability, cost |

### NLP and ML Stack

| Component | Primary Choice | Alternative | Selection Criteria |
|-----------|---------------|-------------|-------------------|
| **Legal NER** | SpaCy (legal model) + GLiNER | Flair NER | Legal entity coverage |
| **Clause Extraction** | Legal-BERT fine-tuned | Longformer | Context window, accuracy |
| **Embeddings** | OpenAI Ada-002 | Cohere Embed | Quality, cost balance |
| **Semantic Search** | Pinecone | Weaviate | Scale, latency |

### Foundation Model Stack

| Component | Primary Choice | Alternative | Selection Criteria |
|-----------|---------------|-------------|-------------------|
| **Reasoning** | GPT-4 Turbo | Claude 3.5 Sonnet | Context window, accuracy |
| **Gateway** | Custom (LangChain) | Portkey | Cost optimization, routing |
| **Orchestration** | LangGraph | Temporal | Agent workflows |
| **Guardrails** | Custom + NeMo | Guardrails AI | Legal-specific rules |

### Data Storage Stack

| Component | Primary Choice | Alternative | Selection Criteria |
|-----------|---------------|-------------|-------------------|
| **Graph Database** | Neo4j | FalkorDB | Query performance, maturity |
| **Vector Store** | Pinecone | pgvector | Scale, managed service |
| **Search Index** | Elasticsearch | Vespa | Full-text, hybrid search |
| **Relational** | PostgreSQL | CockroachDB | ACID, familiarity |
| **Cache** | Redis | Memcached | Data structures, persistence |
| **Queue** | Apache Kafka | RabbitMQ | Throughput, durability |

---

## Integration Architecture

### External System Integration

```mermaid
flowchart LR
    subgraph LegalTechPlatform["AI Legal Tech Platform"]
        CORE["Core Platform"]
        WEBHOOK["Webhook Service"]
        SYNC["Sync Service"]
    end

    subgraph CLMSystems["CLM Systems"]
        IRONCLAD["Ironclad"]
        AGILOFT["Agiloft"]
        ICERTIS["Icertis"]
    end

    subgraph DMSSystems["Document Management"]
        IMANAGE["iManage"]
        NETDOCS["NetDocuments"]
        SHAREPOINT["SharePoint"]
    end

    subgraph EDiscovery["E-Discovery"]
        RELATIVITY["Relativity"]
        LOGIKCULL["Logikcull"]
    end

    subgraph Productivity["Productivity"]
        OUTLOOK["Outlook"]
        TEAMS["Teams"]
        SLACK["Slack"]
    end

    subgraph IAM["Identity"]
        OKTA["Okta"]
        AZURE_AD["Azure AD"]
    end

    CORE <-->|REST API| IRONCLAD
    CORE <-->|REST API| AGILOFT
    CORE <-->|REST API| ICERTIS

    CORE <-->|REST API| IMANAGE
    CORE <-->|REST API| NETDOCS
    CORE <-->|Graph API| SHAREPOINT

    CORE -->|Export| RELATIVITY
    CORE -->|Export| LOGIKCULL

    WEBHOOK -->|Notifications| OUTLOOK
    WEBHOOK -->|Notifications| TEAMS
    WEBHOOK -->|Notifications| SLACK

    SYNC <-->|SCIM/OIDC| OKTA
    SYNC <-->|SCIM/OIDC| AZURE_AD

    classDef platform fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef external fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class CORE,WEBHOOK,SYNC platform
    class IRONCLAD,AGILOFT,ICERTIS,IMANAGE,NETDOCS,SHAREPOINT,RELATIVITY,LOGIKCULL,OUTLOOK,TEAMS,SLACK,OKTA,AZURE_AD external
```

### Integration Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **REST API** | Synchronous operations | Contract upload, query results |
| **Webhooks** | Event notifications | Analysis complete, risk alerts |
| **File Sync** | Document management | Bi-directional sync with DMS |
| **SCIM** | User provisioning | Enterprise identity sync |
| **OAuth 2.0** | Authorization | Delegated access to external systems |

### API Gateway Configuration

```
Rate Limits:
  - Contract Analysis: 100 requests/minute per user
  - Legal Research: 200 requests/minute per user
  - Batch Upload: 10 requests/minute per user
  - Due Diligence: 5 projects/hour per user

Timeout Configuration:
  - Contract Analysis: 120 seconds
  - Legal Research: 30 seconds
  - Batch Processing: 300 seconds (async)

Circuit Breaker:
  - LLM Gateway: 50% failure rate triggers open
  - OCR Service: 30% failure rate triggers open
  - Recovery: Half-open after 60 seconds
```

---

## Deployment Architecture

### Multi-Region Deployment

```mermaid
flowchart TB
    subgraph GlobalLayer["Global Layer"]
        DNS["GeoDNS"]
        CDN["CDN (Static Assets)"]
    end

    subgraph USRegion["US Region (Primary)"]
        USLB["Load Balancer"]
        USAPP["Application Cluster"]
        USDB["Database (Primary)"]
        USGRAPH["Knowledge Graph"]
    end

    subgraph EURegion["EU Region"]
        EULB["Load Balancer"]
        EUAPP["Application Cluster"]
        EUDB["Database (Replica)"]
        EUGRAPH["Knowledge Graph"]
    end

    subgraph Shared["Shared Services"]
        LLMAPI["LLM API (US)"]
        CASELAW["Case Law Service"]
        AUDIT["Audit Service"]
    end

    DNS --> USLB
    DNS --> EULB
    CDN --> USLB
    CDN --> EULB

    USLB --> USAPP --> USDB
    USAPP --> USGRAPH
    EULB --> EUAPP --> EUDB
    EUAPP --> EUGRAPH

    USAPP --> LLMAPI
    EUAPP --> LLMAPI
    USAPP --> CASELAW
    EUAPP --> CASELAW
    USAPP --> AUDIT
    EUAPP --> AUDIT

    USDB -.->|Replication| EUDB

    classDef global fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef us fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef eu fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef shared fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class DNS,CDN global
    class USLB,USAPP,USDB,USGRAPH us
    class EULB,EUAPP,EUDB,EUGRAPH eu
    class LLMAPI,CASELAW,AUDIT shared
```

### Data Residency Requirements

| Region | Data Stored | Processing | Rationale |
|--------|-------------|------------|-----------|
| **US** | US client documents | Full processing | Primary market |
| **EU** | EU client documents | Full processing | GDPR compliance |
| **APAC** | APAC client documents | Limited (roadmap) | Expansion planned |

---

## Summary

The AI-Native Legal Tech Platform architecture prioritizes:

1. **Explainability**: Every AI decision is traceable to source with citation chains
2. **Compliance**: Attorney-client privilege, e-discovery, and audit requirements are built-in
3. **Flexibility**: Hybrid model strategy balances speed, accuracy, and cost
4. **Scale**: Event-driven architecture supports both real-time and batch workloads
5. **Integration**: Open APIs enable seamless workflow with existing legal tech stack
