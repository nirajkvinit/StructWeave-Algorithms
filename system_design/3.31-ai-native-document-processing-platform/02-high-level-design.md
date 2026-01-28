# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WebApp["Web Application"]
        RESTAPI["REST API Clients"]
        EmailGW["Email Gateway"]
        Scanner["Scanner/MFP"]
        SFTP["SFTP/S3"]
    end

    subgraph Gateway["API Gateway Layer"]
        Auth["Auth & Rate Limit"]
        Validator["Request Validator"]
        Router["Request Router"]
    end

    subgraph Ingestion["Ingestion Layer"]
        DocReceiver["Document Receiver"]
        FormatNorm["Format Normalizer"]
        MetadataExt["Metadata Extractor"]
        QueueWriter["Queue Writer"]
    end

    subgraph Processing["Processing Pipeline"]
        subgraph PreProcess["Pre-Processing"]
            PageSplit["Page Splitter"]
            ImgEnhance["Image Enhancer"]
            LangDetect["Language Detector"]
        end

        subgraph OCRStage["OCR Stage"]
            OCRRouter["OCR Router"]
            Tesseract["Tesseract<br/>(Open-source)"]
            Textract["Textract<br/>(Tables/Forms)"]
            DocTR["DocTR<br/>(Deep Learning)"]
        end

        subgraph AIModels["AI Model Pipeline"]
            Classifier["Classification<br/>(LayoutLMv3)"]
            Extractor["Extraction<br/>(Donut/GPT-4V)"]
            ValidatorSvc["Validation<br/>(Rules + ML)"]
        end
    end

    subgraph Agentic["Agentic Orchestration"]
        Coordinator["Coordinator Agent"]
        AgentRegistry["Agent Registry"]
        ConfRouter["Confidence Router"]
        ExceptionHandler["Exception Handler"]
    end

    subgraph HITL["Human-in-the-Loop"]
        ReviewQueue["Review Queue"]
        AnnotationUI["Annotation UI"]
        FeedbackCollector["Feedback Collector"]
    end

    subgraph DataLayer["Data Layer"]
        DocStore[("Document Store<br/>(Object Storage)")]
        ExtractedDB[("Extracted Data<br/>(PostgreSQL)")]
        VectorDB[("Vector Store<br/>(Embeddings)")]
        AuditStore[("Audit Logs<br/>(Immutable)")]
        ModelRegistry[("Model Registry")]
    end

    subgraph Integration["Integration Layer"]
        WebhookDispatch["Webhook Dispatcher"]
        ERPConnector["ERP Connectors"]
        CRMConnector["CRM Connectors"]
        ExportService["Export Service"]
    end

    Clients --> Gateway
    Gateway --> Ingestion
    Ingestion --> Processing
    Processing --> Agentic
    Agentic --> HITL
    Agentic --> Integration

    Processing --> DataLayer
    HITL --> DataLayer
    Integration --> DataLayer

    FeedbackCollector -.->|"Corrections"| ModelRegistry

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef ingestion fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef processing fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef agentic fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef hitl fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef integration fill:#efebe9,stroke:#5d4037,stroke-width:2px

    class WebApp,RESTAPI,EmailGW,Scanner,SFTP client
    class Auth,Validator,Router gateway
    class DocReceiver,FormatNorm,MetadataExt,QueueWriter ingestion
    class PageSplit,ImgEnhance,LangDetect,OCRRouter,Tesseract,Textract,DocTR,Classifier,Extractor,ValidatorSvc processing
    class Coordinator,AgentRegistry,ConfRouter,ExceptionHandler agentic
    class ReviewQueue,AnnotationUI,FeedbackCollector hitl
    class DocStore,ExtractedDB,VectorDB,AuditStore,ModelRegistry data
    class WebhookDispatch,ERPConnector,CRMConnector,ExportService integration
```

---

## Component Descriptions

### Ingestion Layer

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **Document Receiver** | Accept documents from all channels, validate format | REST API, SMTP listener, S3 events |
| **Format Normalizer** | Convert all formats to standardized PDF/images | ImageMagick, Ghostscript, LibreOffice |
| **Metadata Extractor** | Extract file metadata (size, pages, type) | Apache Tika, custom parsers |
| **Queue Writer** | Write processing jobs to message queue | Kafka producer, SQS |

### Pre-Processing

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **Page Splitter** | Split multi-page documents into individual pages | PyMuPDF, pdf2image |
| **Image Enhancer** | Deskew, denoise, binarize, enhance contrast | OpenCV, Pillow |
| **Language Detector** | Identify document language for OCR routing | fastText, langdetect |

### OCR Stage

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **OCR Router** | Route to appropriate OCR engine based on document type | Custom router |
| **Tesseract** | Open-source OCR for standard documents | Tesseract 5.x |
| **Textract** | Managed OCR for tables, forms, handwriting | Amazon Textract |
| **DocTR** | Deep learning OCR for complex layouts | DocTR (Mindee) |

### AI Model Pipeline

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **Classifier** | Classify document type with confidence | LayoutLMv3, CLIP |
| **Extractor** | Extract fields based on document type schema | Donut, GPT-4V (fallback) |
| **Validator** | Validate extracted data against business rules | Custom rules engine, ML anomaly detection |

### Agentic Orchestration

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **Coordinator Agent** | Orchestrate multi-agent workflow, manage retries | Temporal, custom |
| **Agent Registry** | Register and discover available agents | etcd, Consul |
| **Confidence Router** | Route based on confidence thresholds | Custom decision engine |
| **Exception Handler** | Handle errors, escalate to HITL | Custom, alerting integration |

### Human-in-the-Loop

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **Review Queue** | Prioritized queue of items needing review | Redis, PostgreSQL |
| **Annotation UI** | Web interface for document annotation | React, Canvas-based |
| **Feedback Collector** | Collect corrections, feed into training pipeline | Event streaming |

### Data Layer

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **Document Store** | Store raw documents with versioning | S3, MinIO |
| **Extracted Data** | Store structured extraction results | PostgreSQL, MongoDB |
| **Vector Store** | Store document embeddings for similarity | Pinecone, Qdrant |
| **Audit Logs** | Immutable processing history | Kafka, ClickHouse |
| **Model Registry** | Version and serve ML models | MLflow, custom |

---

## Data Flow: Document Processing

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Ingestion
    participant OCR
    participant Classifier
    participant Extractor
    participant Validator
    participant ConfRouter as Confidence Router
    participant HITL
    participant Integration
    participant Storage

    Client->>Gateway: Submit document
    Gateway->>Gateway: Authenticate, rate limit
    Gateway->>Ingestion: Forward document

    Ingestion->>Storage: Store raw document
    Ingestion->>Ingestion: Normalize format
    Ingestion->>OCR: Queue for OCR

    OCR->>OCR: Pre-process (deskew, enhance)
    OCR->>OCR: Extract text + layout
    OCR->>Classifier: Send OCR result

    Classifier->>Classifier: Classify document type
    Classifier->>ConfRouter: Classification result + confidence

    alt High Confidence (>90%)
        ConfRouter->>Extractor: Route to extraction
    else Low Confidence (<90%)
        ConfRouter->>HITL: Route to review queue
        HITL->>HITL: Human reviews classification
        HITL->>Extractor: Confirmed classification
    end

    Extractor->>Extractor: Extract fields per schema
    Extractor->>ConfRouter: Extraction result + field confidences

    alt All Fields High Confidence
        ConfRouter->>Validator: Route to validation
    else Some Low Confidence Fields
        ConfRouter->>HITL: Route low-confidence fields
        HITL->>HITL: Human reviews/corrects fields
        HITL->>Validator: Corrected fields
    end

    Validator->>Validator: Apply business rules
    Validator->>Storage: Store extracted data

    alt Validation Passed
        Validator->>Integration: Trigger export
        Integration->>Integration: Send to ERP/CRM
        Integration->>Client: Webhook notification
    else Validation Failed
        Validator->>HITL: Route validation errors
        HITL->>HITL: Human resolves errors
        HITL->>Validator: Retry validation
    end
```

---

## Agentic Workflow Architecture

```mermaid
flowchart TB
    subgraph Coordinator["Coordinator Agent"]
        ORCH["Workflow<br/>Orchestrator"]
        STATE["State Manager"]
        RETRY["Retry Handler"]
    end

    subgraph Agents["Specialized Agents"]
        PARSER["Parser Agent"]
        CLASSIFIER["Classifier Agent"]
        EXTRACTOR["Extractor Agent"]
        VALIDATOR["Validator Agent"]
        EXCEPTION["Exception Agent"]
    end

    subgraph Models["Model Pool"]
        LAYOUTLM["LayoutLMv3"]
        DONUT["Donut"]
        GPT4V["GPT-4V"]
        RULES["Rules Engine"]
    end

    subgraph Memory["Shared Memory"]
        CONTEXT["Document Context"]
        RESULTS["Intermediate Results"]
        CONFIDENCE["Confidence Scores"]
    end

    DOC["Document"] --> ORCH
    ORCH --> PARSER
    PARSER --> CLASSIFIER
    CLASSIFIER --> EXTRACTOR
    EXTRACTOR --> VALIDATOR

    PARSER --> LAYOUTLM
    CLASSIFIER --> LAYOUTLM
    EXTRACTOR --> DONUT
    EXTRACTOR -.->|"Fallback"| GPT4V
    VALIDATOR --> RULES

    PARSER --> CONTEXT
    CLASSIFIER --> RESULTS
    EXTRACTOR --> RESULTS
    VALIDATOR --> CONFIDENCE

    PARSER -.->|"Error"| EXCEPTION
    CLASSIFIER -.->|"Low Confidence"| EXCEPTION
    EXTRACTOR -.->|"Low Confidence"| EXCEPTION
    VALIDATOR -.->|"Failed"| EXCEPTION

    EXCEPTION --> RETRY
    RETRY --> ORCH

    classDef coordinator fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef agent fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef model fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef memory fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class ORCH,STATE,RETRY coordinator
    class PARSER,CLASSIFIER,EXTRACTOR,VALIDATOR,EXCEPTION agent
    class LAYOUTLM,DONUT,GPT4V,RULES model
    class CONTEXT,RESULTS,CONFIDENCE memory
```

### Agent Responsibilities

| Agent | Input | Output | Failure Mode |
|-------|-------|--------|--------------|
| **Parser Agent** | Raw document + OCR | Document structure, sections, tables | Retry with different OCR engine |
| **Classifier Agent** | Parsed document | Document type + confidence | Fallback to zero-shot + HITL |
| **Extractor Agent** | Document type + schema | Field values + confidences | Fallback to foundation model |
| **Validator Agent** | Extracted fields + rules | Validation result + errors | Route to HITL for resolution |
| **Exception Agent** | Any failed task | Recovery action or escalation | Escalate to human operators |

---

## Key Architectural Decisions

### Decision 1: Foundation Model vs Specialized Models

| Option | Pros | Cons |
|--------|------|------|
| **Foundation Only (GPT-4V)** | Flexible, zero-shot, handles novel docs | Expensive ($0.01/image), slow (2-3s), privacy concerns |
| **Specialized Only (LayoutLMv3)** | Fast (50ms), cheap, on-prem privacy | Requires training data, limited to trained types |
| **Hybrid Approach** | Best of both: speed + flexibility | Complexity in routing |

**Decision:** `Hybrid Approach`

**Rationale:**
- Use specialized models (LayoutLMv3, Donut) as primary for trained document types (80% of volume)
- Use foundation models (GPT-4V, Claude) as fallback for low-confidence or novel documents (20%)
- Route based on classification confidence threshold
- Result: 80% cost savings vs foundation-only, 15% accuracy improvement vs specialized-only

### Decision 2: Synchronous vs Asynchronous Processing

| Option | Pros | Cons |
|--------|------|------|
| **Synchronous** | Simple, immediate results | Blocks on slow operations, poor scaling |
| **Asynchronous** | Scalable, resilient, handles variable latency | Eventual consistency, complexity |

**Decision:** `Asynchronous with Queues`

**Rationale:**
- Document processing involves variable latency (OCR, LLM calls)
- HITL creates unpredictable delays (minutes to hours)
- Queue-based architecture enables independent scaling
- Allows batch optimization for GPU utilization
- Provides natural retry and dead-letter handling

### Decision 3: HITL Integration Pattern

| Option | Pros | Cons |
|--------|------|------|
| **Block and Wait** | Simple, guaranteed review | High latency, blocks pipeline |
| **Queue-Based (Selected)** | Non-blocking, scalable | Eventual consistency |
| **Parallel Processing** | Fast for high-confidence | Complexity in reconciliation |

**Decision:** `Queue-Based with Confidence Routing`

**Rationale:**
- Non-blocking: High-confidence documents complete without waiting
- Configurable thresholds per field and document type
- Priority queues for urgent documents
- Feedback loop: Corrections improve models over time

### Decision 4: OCR Strategy

| Option | Pros | Cons |
|--------|------|------|
| **Single Engine** | Simple | Limited accuracy across document types |
| **Multi-Engine Routing** | Optimal per document type | Complexity, multiple integrations |
| **OCR-Free (Donut)** | End-to-end, language-agnostic | Lower accuracy for complex layouts |

**Decision:** `Multi-Engine Routing with OCR-Free Fallback`

**Rationale:**
- Route based on document characteristics:
  - Standard text: Tesseract (fast, free)
  - Tables/forms: Textract (best accuracy)
  - Handwriting: Textract or specialized
  - Complex layouts: DocTR
- OCR-free models (Donut) for validation/comparison

### Decision 5: Storage Architecture

| Option | Pros | Cons |
|--------|------|------|
| **Single Tier** | Simple | Expensive for 7-year retention |
| **Multi-Tier (Hot/Warm/Cold)** | Cost-optimized | Complexity, retrieval latency |
| **Hybrid (Local + Cloud)** | Compliance, performance | Sync complexity |

**Decision:** `Multi-Tier Storage`

**Rationale:**
- Hot (30 days): Frequently accessed, fast retrieval
- Warm (1 year): Occasional access, lower cost
- Cold (7 years): Compliance archive, cheapest
- Automatic lifecycle policies for tier transitions
- Estimated 50% cost savings vs single-tier

---

## Technology Stack

### Core Services

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **API Gateway** | Kong / AWS API Gateway | Rate limiting, auth, routing |
| **Message Queue** | Apache Kafka | High throughput, durability, replay |
| **Task Queue** | Celery + Redis | Python workers, task routing |
| **Workflow Orchestration** | Temporal | Durable workflows, retries, visibility |
| **Service Mesh** | Istio / Linkerd | mTLS, observability, traffic management |

### AI/ML Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Model Serving** | Triton Inference Server | GPU optimization, batching |
| **Model Registry** | MLflow | Version control, deployment tracking |
| **Feature Store** | Feast | Feature management for ML models |
| **Vector Database** | Qdrant / Pinecone | Document embeddings, similarity search |
| **LLM Gateway** | LiteLLM / Portkey | Multi-provider routing, caching |

### Data Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Primary Database** | PostgreSQL | ACID, JSON support, mature |
| **Document Store** | S3 / MinIO | Scalable object storage |
| **Cache** | Redis Cluster | Session, queue, caching |
| **Search** | Elasticsearch | Full-text search, analytics |
| **Audit Log** | ClickHouse | Columnar, high-write throughput |

### OCR Engines

| Engine | Use Case | Integration |
|--------|----------|-------------|
| **Tesseract 5.x** | Standard documents | Local, containerized |
| **Amazon Textract** | Tables, forms, handwriting | API |
| **DocTR** | Complex layouts | Local, GPU |
| **Azure Document Intelligence** | Alternative managed | API |

### Frontend

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **HITL Interface** | React + Canvas | Rich annotation UI |
| **Admin Dashboard** | React Admin | Configuration, monitoring |
| **Document Viewer** | PDF.js | In-browser PDF rendering |

---

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Internet
        Users["Users/Systems"]
    end

    subgraph Edge["Edge Layer"]
        CDN["CDN<br/>(CloudFlare)"]
        WAF["WAF"]
    end

    subgraph LoadBalancer["Load Balancer"]
        ALB["Application<br/>Load Balancer"]
    end

    subgraph K8s["Kubernetes Cluster"]
        subgraph Ingress["Ingress"]
            NGINX["NGINX Ingress"]
        end

        subgraph Services["Application Services"]
            API["API Service<br/>(3 replicas)"]
            Worker["Processing Workers<br/>(HPA)"]
            HITLSVC["HITL Service<br/>(2 replicas)"]
        end

        subgraph GPU["GPU Node Pool"]
            OCRPod["OCR Pods<br/>(GPU)"]
            MLPod["ML Inference Pods<br/>(GPU)"]
        end

        subgraph Data["Data Services"]
            Redis["Redis Cluster"]
            Kafka["Kafka Cluster"]
        end
    end

    subgraph Managed["Managed Services"]
        RDS["PostgreSQL<br/>(RDS/Cloud SQL)"]
        S3["Object Storage<br/>(S3)"]
        LLM["LLM APIs<br/>(OpenAI/Anthropic)"]
    end

    Users --> CDN --> WAF --> ALB
    ALB --> NGINX --> Services
    Services --> GPU
    Services --> Data
    Services --> Managed
    GPU --> Managed

    classDef edge fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef k8s fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef managed fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class CDN,WAF edge
    class NGINX,API,Worker,HITLSVC,OCRPod,MLPod,Redis,Kafka k8s
    class RDS,S3,LLM managed
```

---

## Integration Patterns

### Inbound Document Sources

| Source | Protocol | Authentication | Rate Limit |
|--------|----------|----------------|------------|
| **REST API** | HTTPS | API Key / OAuth2 | 1000 req/min |
| **Email** | SMTP/IMAP | Allowlist + SPF/DKIM | 100 emails/min |
| **SFTP** | SFTP | SSH Key | 1000 files/hour |
| **S3 Events** | S3 Notification | IAM Role | Unlimited |
| **Webhook** | HTTPS | HMAC Signature | 500 req/min |

### Outbound Integrations

| Target | Protocol | Pattern | Retry Policy |
|--------|----------|---------|--------------|
| **ERP (SAP/Oracle)** | REST/SOAP | Async webhook | 3 retries, exponential backoff |
| **CRM (Salesforce)** | REST | Async webhook | 3 retries, exponential backoff |
| **Custom Systems** | Webhook | Async | Configurable |
| **File Export** | S3/SFTP | Scheduled batch | N/A |
| **Email Notification** | SMTP | Fire and forget | No retry |

### Webhook Payload Structure

```yaml
{
  "event": "document.processed",
  "timestamp": "2024-01-15T10:30:00Z",
  "document_id": "doc-12345",
  "status": "completed",
  "classification": {
    "type": "invoice",
    "confidence": 0.95
  },
  "extractions": {
    "vendor_name": {"value": "Acme Corp", "confidence": 0.98},
    "invoice_number": {"value": "INV-001", "confidence": 0.99},
    "total_amount": {"value": 1500.00, "confidence": 0.97}
  },
  "validation": {
    "passed": true,
    "errors": []
  },
  "processing_time_ms": 4500,
  "hitl_required": false
}
```
