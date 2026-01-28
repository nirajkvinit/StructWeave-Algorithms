# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Sources["Data Sources"]
        S1["Confluence/Wiki"]
        S2["SharePoint/Drive"]
        S3["Slack/Teams"]
        S4["Email Archives"]
        S5["Code Repos"]
        S6["Tickets/Issues"]
    end

    subgraph Ingestion["Ingestion Layer"]
        CONN["Connectors<br/>(Change Detection)"]
        CHUNK["Semantic Chunker<br/>(500-1000 tokens)"]
        QUEUE["Kafka Queue<br/>(Partitioned)"]
    end

    subgraph Construction["Construction Layer"]
        subgraph Extraction["Extraction Pipeline"]
            NER["Entity Extractor<br/>(GLiNER + SpaCy)"]
            REL["Relation Extractor<br/>(LLM-based)"]
            CONF["Confidence Scorer"]
        end
        subgraph Resolution["Resolution Pipeline"]
            BLOCK["Blocker<br/>(Name + Phonetic + LSH)"]
            MATCH["Matcher<br/>(Semantic + Rules)"]
            MERGE["Merger<br/>(Canonical Selection)"]
        end
        LINK["Entity Linker<br/>(Graph Integration)"]
    end

    subgraph Storage["Storage Layer"]
        GRAPH[("Graph Database<br/>(Neo4j/FalkorDB)<br/>Entities + Relations")]
        VECTOR[("Vector Database<br/>(Pinecone/Weaviate)<br/>Embeddings")]
        DOC[("Document Store<br/>(PostgreSQL/S3)<br/>Source Chunks")]
        META[("Metadata Store<br/>(PostgreSQL)<br/>Provenance")]
    end

    subgraph Processing["Background Processing"]
        COMM["Community Detector<br/>(Leiden Algorithm)"]
        SUMM["Summarizer<br/>(LLM per Community)"]
        EMBED["Embedder<br/>(Batch Updates)"]
    end

    subgraph Retrieval["Retrieval Layer"]
        subgraph GraphRAG["GraphRAG Engine"]
            LOCAL["Local Search<br/>(Entity-centric)"]
            GLOBAL["Global Search<br/>(Community-based)"]
            DRIFT["DRIFT Search<br/>(Iterative)"]
        end
        REASON["Multi-hop Reasoner<br/>(Decompose + Verify)"]
        ASSEMBLE["Context Assembler"]
    end

    subgraph Query["Query Interface"]
        API["REST/GraphQL API"]
        LLM["LLM Generator"]
        CACHE[("Redis Cache<br/>(Results + Entities)")]
    end

    Sources --> CONN --> CHUNK --> QUEUE
    QUEUE --> NER --> REL --> CONF
    CONF --> BLOCK --> MATCH --> MERGE --> LINK
    LINK --> GRAPH & VECTOR & DOC & META

    GRAPH --> COMM --> SUMM
    SUMM --> VECTOR
    GRAPH --> EMBED --> VECTOR

    API --> CACHE
    CACHE --> LOCAL & GLOBAL & DRIFT
    LOCAL --> GRAPH & VECTOR
    GLOBAL --> GRAPH & VECTOR
    DRIFT --> GRAPH & VECTOR
    LOCAL & GLOBAL & DRIFT --> REASON --> ASSEMBLE --> LLM
    LLM --> API

    classDef source fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef ingest fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef construct fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef store fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef process fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    classDef retrieve fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef query fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class S1,S2,S3,S4,S5,S6 source
    class CONN,CHUNK,QUEUE ingest
    class NER,REL,CONF,BLOCK,MATCH,MERGE,LINK construct
    class GRAPH,VECTOR,DOC,META store
    class COMM,SUMM,EMBED process
    class LOCAL,GLOBAL,DRIFT,REASON,ASSEMBLE retrieve
    class API,LLM,CACHE query
```

---

## Component Descriptions

### Ingestion Layer

| Component | Purpose | Key Responsibilities |
|-----------|---------|---------------------|
| **Connectors** | Integrate with data sources | OAuth authentication, incremental sync, change detection, rate limiting |
| **Semantic Chunker** | Split documents into meaningful units | Respect section boundaries, 500-1000 token chunks, overlap handling |
| **Kafka Queue** | Decouple ingestion from processing | Partitioned by source, exactly-once delivery, backpressure handling |

### Construction Layer

| Component | Purpose | Key Responsibilities |
|-----------|---------|---------------------|
| **Entity Extractor** | Identify named entities | Multi-model ensemble (GLiNER for zero-shot, SpaCy for speed, LLM for complex), entity type classification |
| **Relation Extractor** | Find relationships | LLM-based extraction with structured output, relation type taxonomy, directional relationships |
| **Confidence Scorer** | Assess extraction quality | Ensemble voting, model agreement, context quality signals |
| **Blocker** | Reduce resolution candidates | Multiple blocking keys (name prefix, Soundex, LSH), union of candidate sets |
| **Matcher** | Score entity similarity | Name similarity (Jaro-Winkler), semantic similarity (embeddings), type matching, combined scoring |
| **Merger** | Create canonical entities | Transitive closure, canonical selection (oldest or highest confidence), property merging |
| **Entity Linker** | Integrate with graph | Create/update nodes and edges, maintain provenance links |

### Storage Layer

| Component | Purpose | Technology Options |
|-----------|---------|-------------------|
| **Graph Database** | Store entities and relationships | Neo4j (enterprise), FalkorDB (real-time), Neptune (AWS), TigerGraph (analytics) |
| **Vector Database** | Store embeddings for semantic search | Pinecone (managed), Weaviate (hybrid), pgvector (integrated) |
| **Document Store** | Store source chunks | PostgreSQL (structured), S3 (blob), Elasticsearch (search) |
| **Metadata Store** | Track provenance and lineage | PostgreSQL with audit tables |

### Background Processing

| Component | Purpose | Schedule |
|-----------|---------|----------|
| **Community Detector** | Cluster related entities | Daily full run, incremental for hot areas |
| **Summarizer** | Generate community descriptions | After community detection, on-demand for queries |
| **Embedder** | Update entity embeddings | Real-time for new entities, batch for property changes |

### Retrieval Layer

| Component | Purpose | Key Responsibilities |
|-----------|---------|---------------------|
| **Local Search** | Entity-centric retrieval | Start from query entities, K-hop traversal, relevance pruning |
| **Global Search** | Theme-based retrieval | Search community summaries, retrieve representative entities |
| **DRIFT Search** | Iterative refinement | Initial broad search, refine based on results, converge to answer |
| **Multi-hop Reasoner** | Complex question answering | Decompose into sub-questions, answer with graph evidence, verify each step |
| **Context Assembler** | Prepare LLM input | Rank and select context, fit within token budget, format for LLM |

---

## Data Flow: Knowledge Construction

```mermaid
sequenceDiagram
    participant Source as Data Source
    participant Conn as Connector
    participant Chunk as Chunker
    participant Queue as Kafka
    participant NER as Entity Extractor
    participant Rel as Relation Extractor
    participant Res as Entity Resolver
    participant Graph as Graph DB
    participant Vector as Vector DB

    Source->>Conn: New/updated document
    Conn->>Conn: Change detection
    Conn->>Chunk: Document content
    Chunk->>Chunk: Semantic segmentation
    Chunk->>Queue: Chunks with metadata

    Queue->>NER: Chunk batch
    NER->>NER: Multi-model extraction
    NER->>Rel: Entities with spans
    Rel->>Rel: LLM relation extraction
    Rel->>Res: Entities + Relations

    Res->>Res: Generate blocking keys
    Res->>Graph: Query candidates
    Graph-->>Res: Existing entities
    Res->>Res: Score matches
    Res->>Res: Merge decisions

    Res->>Graph: Create/update entities
    Res->>Graph: Create relationships
    Res->>Vector: Update embeddings
    Graph-->>Res: Confirmation

    Note over Graph,Vector: Background: Community detection & summarization
```

---

## Data Flow: GraphRAG Query

```mermaid
sequenceDiagram
    participant User as User
    participant API as API Gateway
    participant Cache as Redis Cache
    participant GR as GraphRAG Engine
    participant Local as Local Search
    participant Global as Global Search
    participant Graph as Graph DB
    participant Vector as Vector DB
    participant LLM as LLM

    User->>API: Natural language query
    API->>Cache: Check cache
    Cache-->>API: Cache miss

    API->>GR: Route query
    GR->>GR: Classify query type

    alt Entity-focused query
        GR->>Local: Local search
        Local->>Local: Extract query entities
        Local->>Vector: Semantic entity match
        Vector-->>Local: Candidate entities
        Local->>Graph: K-hop traversal
        Graph-->>Local: Subgraph
        Local->>Local: Relevance ranking
        Local-->>GR: Context (entities + relations + chunks)
    else Theme/summary query
        GR->>Global: Global search
        Global->>Vector: Community embedding search
        Vector-->>Global: Relevant communities
        Global->>Graph: Get community summaries
        Graph-->>Global: Summaries
        Global->>Global: Map-reduce extraction
        Global-->>GR: Context (summaries + key entities)
    end

    GR->>GR: Assemble context
    GR->>LLM: Query + Context
    LLM->>LLM: Generate response
    LLM-->>GR: Response

    GR->>GR: Verify against graph (optional)
    GR-->>API: Final response
    API->>Cache: Store result
    API-->>User: Response with citations
```

---

## GraphRAG Search Modes

### Local Search (Entity-Centric)

```mermaid
flowchart LR
    subgraph Query["Query Processing"]
        Q["User Query"]
        ENT["Extract Entities"]
    end

    subgraph Match["Entity Matching"]
        VEC["Vector Search"]
        FUZZY["Fuzzy Name Match"]
        CAND["Candidate Entities"]
    end

    subgraph Traverse["Graph Traversal"]
        HOP1["1-Hop: Direct Relations"]
        HOP2["2-Hop: Connected Entities"]
        HOPK["K-Hop: Extended Context"]
    end

    subgraph Context["Context Assembly"]
        RANK["Relevance Ranking"]
        PRUNE["Token Budget Pruning"]
        CTX["Final Context"]
    end

    Q --> ENT --> VEC & FUZZY --> CAND
    CAND --> HOP1 --> HOP2 --> HOPK
    HOPK --> RANK --> PRUNE --> CTX

    classDef query fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef match fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef traverse fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef context fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class Q,ENT query
    class VEC,FUZZY,CAND match
    class HOP1,HOP2,HOPK traverse
    class RANK,PRUNE,CTX context
```

### Global Search (Community-Based)

```mermaid
flowchart LR
    subgraph Query["Query Processing"]
        Q["User Query"]
        EMB["Query Embedding"]
    end

    subgraph Community["Community Search"]
        CSEARCH["Search Community Summaries"]
        TOPK["Top-K Communities"]
        HIER["Select Hierarchy Level"]
    end

    subgraph MapReduce["Map-Reduce"]
        MAP["Map: Extract Relevant Points"]
        RED["Reduce: Combine Points"]
    end

    subgraph Synthesis["Synthesis"]
        SYN["Synthesize Answer"]
        REF["Add References"]
    end

    Q --> EMB --> CSEARCH --> TOPK --> HIER
    HIER --> MAP --> RED --> SYN --> REF

    classDef query fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef comm fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef mr fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef synth fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class Q,EMB query
    class CSEARCH,TOPK,HIER comm
    class MAP,RED mr
    class SYN,REF synth
```

### DRIFT Search (Dynamic Iterative)

```mermaid
flowchart TB
    subgraph Init["Initialization"]
        Q["Query"]
        BROAD["Broad Community Search"]
    end

    subgraph Iterate["Iteration Loop"]
        EVAL["Evaluate Coverage"]
        REFINE["Generate Follow-up Queries"]
        LOCAL["Local Search on Gaps"]
        MERGE["Merge Results"]
    end

    subgraph Converge["Convergence"]
        CHECK["Sufficient Coverage?"]
        FINAL["Final Context Assembly"]
    end

    Q --> BROAD --> EVAL
    EVAL --> CHECK
    CHECK -->|No| REFINE --> LOCAL --> MERGE --> EVAL
    CHECK -->|Yes| FINAL

    classDef init fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef iter fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef conv fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class Q,BROAD init
    class EVAL,REFINE,LOCAL,MERGE iter
    class CHECK,FINAL conv
```

---

## Technology Choices

### Graph Database Selection

| Technology | Pros | Cons | Best For |
|------------|------|------|----------|
| **Neo4j** | Mature ecosystem, Cypher query language, enterprise features, 100TB+ with Infinigraph | Cost at scale, single-writer architecture | Enterprise deployments with complex queries |
| **FalkorDB** | Sub-50ms latency, Redis-compatible, sparse matrix optimization | Newer, smaller community | Real-time AI applications, GraphRAG |
| **Amazon Neptune** | Fully managed, AWS integration, auto-scaling | AWS lock-in, less flexible | Cloud-native AWS environments |
| **TigerGraph** | 100B+ edges, parallel processing, GSQL | Steep learning curve, cost | Massive-scale analytics |
| **ArangoDB** | Multi-model (document + graph), flexible | Graph performance trade-offs | Teams needing document + graph |

**Recommendation:** Neo4j for enterprise scale with mature tooling, FalkorDB for real-time performance-critical applications.

### Vector Database Selection

| Technology | Pros | Cons | Best For |
|------------|------|------|----------|
| **Pinecone** | Fully managed, excellent performance | Cost, vendor lock-in | Teams prioritizing simplicity |
| **Weaviate** | Hybrid search, open-source option | Operational complexity | Teams needing flexibility |
| **pgvector** | Integrated with PostgreSQL | Scale limits | Smaller deployments |
| **Qdrant** | High performance, open-source | Newer | Performance-focused teams |

**Recommendation:** Weaviate for hybrid vector + keyword search, Pinecone for managed simplicity.

### Entity Extraction Model Selection

| Model | Pros | Cons | Use Case |
|-------|------|------|----------|
| **GLiNER** | Zero-shot NER, no training needed | Less accurate than fine-tuned | Diverse entity types |
| **SpaCy** | Fast, reliable, well-tested | Requires training for custom types | Standard NER at scale |
| **LLM (GPT-4o-mini)** | Handles complex cases, flexible | Cost, latency | Complex relations, edge cases |
| **Fine-tuned BERT** | High accuracy for known types | Training data required | Domain-specific NER |

**Recommendation:** Ensemble approach - SpaCy for speed on common types, GLiNER for zero-shot, LLM for complex cases.

---

## Key Architectural Decisions

### Decision 1: Graph Model

| Option | Description | Trade-offs |
|--------|-------------|------------|
| **RDF/Triples** | Subject-predicate-object model, semantic web standards | Rigid schema, complex queries |
| **Property Graph** | Nodes and edges with arbitrary properties | More flexible, better tooling |

**Decision:** Property Graph (Neo4j/FalkorDB)
- Richer attribute support for confidence scores, timestamps
- Better performance for traversal queries
- Stronger ecosystem and tooling

### Decision 2: Entity Resolution Timing

| Option | Description | Trade-offs |
|--------|-------------|------------|
| **Online** | Resolve during ingestion | Low latency, potential inconsistency |
| **Batch** | Periodic resolution runs | More accurate, ingestion lag |
| **Hybrid** | Online for hot path, batch for cleanup | Complexity, best of both |

**Decision:** Hybrid
- Online resolution for new ingestion (fast, good-enough matching)
- Nightly batch for transitive closure and cleanup
- Weekly full resolution for quality maintenance

### Decision 3: Community Detection Algorithm

| Option | Description | Trade-offs |
|--------|-------------|------------|
| **Louvain** | Fast, widely used | Can create poorly-connected communities |
| **Leiden** | Improved quality, guarantees connectivity | Slightly slower |
| **Label Propagation** | Very fast | Lower quality |

**Decision:** Leiden
- Guarantees well-connected communities
- Better for summarization (no disconnected subgroups)
- Marginal performance difference at our scale

### Decision 4: GraphRAG Mode Default

| Option | Description | Trade-offs |
|--------|-------------|------------|
| **Local First** | Start with entity-centric search | Fast, may miss broad context |
| **Global First** | Start with community summaries | Comprehensive, slower |
| **Hybrid/Adaptive** | Classify query, choose mode | Complexity, best results |

**Decision:** Hybrid/Adaptive
- Classify query intent (specific vs broad)
- Route to appropriate search mode
- Fall back to DRIFT for complex queries

---

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Edge["Edge Layer"]
        CDN["CDN<br/>(Static Assets)"]
        LB["Load Balancer<br/>(Regional)"]
    end

    subgraph API["API Layer"]
        GW["API Gateway<br/>(Rate Limiting, Auth)"]
        APP1["App Server 1"]
        APP2["App Server 2"]
        APPN["App Server N"]
    end

    subgraph Compute["Compute Layer"]
        subgraph Query["Query Services"]
            GRAPHRAG["GraphRAG Service<br/>(Stateless)"]
            SEARCH["Search Service<br/>(Stateless)"]
        end
        subgraph Extract["Extraction Services"]
            GPU1["GPU Worker 1"]
            GPU2["GPU Worker 2"]
            GPUN["GPU Worker N"]
        end
    end

    subgraph Data["Data Layer"]
        subgraph Primary["Primary Region"]
            NEO_P[("Neo4j Primary")]
            VEC_P[("Vector DB Primary")]
            PG_P[("PostgreSQL Primary")]
        end
        subgraph Replica["Replica Region"]
            NEO_R[("Neo4j Replica")]
            VEC_R[("Vector DB Replica")]
            PG_R[("PostgreSQL Replica")]
        end
    end

    subgraph Cache["Cache Layer"]
        REDIS["Redis Cluster<br/>(Entity + Query Cache)"]
    end

    subgraph Queue["Message Layer"]
        KAFKA["Kafka Cluster<br/>(Ingestion + Events)"]
    end

    CDN --> LB --> GW
    GW --> APP1 & APP2 & APPN
    APP1 & APP2 & APPN --> GRAPHRAG & SEARCH
    GRAPHRAG & SEARCH --> REDIS
    GRAPHRAG & SEARCH --> NEO_P & VEC_P
    GRAPHRAG & SEARCH --> NEO_R & VEC_R

    KAFKA --> GPU1 & GPU2 & GPUN
    GPU1 & GPU2 & GPUN --> NEO_P & VEC_P & PG_P

    NEO_P -.-> NEO_R
    VEC_P -.-> VEC_R
    PG_P -.-> PG_R

    classDef edge fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef compute fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class CDN,LB edge
    class GW,APP1,APP2,APPN api
    class GRAPHRAG,SEARCH,GPU1,GPU2,GPUN compute
    class NEO_P,VEC_P,PG_P,NEO_R,VEC_R,PG_R data
    class REDIS cache
    class KAFKA queue
```

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| Sync vs Async communication | **Async** for ingestion, **Sync** for queries | Decouple extraction from storage, low-latency queries |
| Event-driven vs Request-response | **Event-driven** for construction, **Request-response** for retrieval | Scale extraction independently, real-time query response |
| Push vs Pull model | **Pull** for extraction workers, **Push** for cache invalidation | Workers control pace, immediate cache updates |
| Stateless vs Stateful services | **Stateless** for all services except databases | Horizontal scaling, easy recovery |
| Read-heavy vs Write-heavy | **Read-heavy** (100:1 ratio) | Optimize for query latency, eventual consistency for writes acceptable |
| Real-time vs Batch processing | **Hybrid** - real-time ingestion, batch community detection | Balance freshness with cost |
| Edge vs Origin processing | **Origin** - graphs too large for edge | Centralized graph storage, edge caching for common queries |

---

## Integration Points

### Source System Integrations

| System | Integration Method | Sync Frequency |
|--------|-------------------|----------------|
| Confluence | REST API + Webhooks | Real-time + daily full sync |
| SharePoint | Microsoft Graph API | Real-time + daily full sync |
| Slack | Events API | Real-time |
| GitHub | Webhooks + REST API | Real-time |
| Jira | Webhooks + REST API | Real-time |
| Email (Exchange) | Microsoft Graph API | Hourly batch |

### External Service Integrations

| Service | Purpose | Fallback |
|---------|---------|----------|
| OpenAI API | Entity extraction, summarization, generation | Self-hosted Llama 3 |
| Embedding API | Entity/chunk embeddings | Self-hosted sentence-transformers |
| Identity Provider | User authentication | Local user store |
| Monitoring | Metrics, logs, traces | Self-hosted Prometheus/Jaeger |
