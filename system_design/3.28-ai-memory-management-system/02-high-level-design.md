# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        SDK["Python/JS SDK"]
        API["REST API"]
        AGENT["Agent Frameworks<br/>(LangChain, CrewAI)"]
    end

    subgraph Gateway["API Gateway"]
        LB["Load Balancer"]
        AUTH["Auth Service"]
        RL["Rate Limiter"]
    end

    subgraph Services["Memory Services"]
        WRITER["Memory Writer<br/>(Extraction + Storage)"]
        READER["Memory Reader<br/>(Retrieval + Ranking)"]
        CONSOL["Consolidation Service"]
        FORGET["Forgetting Service"]
    end

    subgraph Processing["Processing Layer"]
        EXTRACT["Entity Extractor<br/>(LLM-based)"]
        EMBED["Embedding Service"]
        RANK["Ranking Engine"]
        FUSION["Fusion Service<br/>(RRF)"]
    end

    subgraph Storage["Storage Layer"]
        VECTOR[("Vector DB<br/>(Episodic)")]
        GRAPH[("Graph DB<br/>(Semantic)")]
        PG[("PostgreSQL<br/>(Metadata)")]
        CACHE[("Redis<br/>(Hot Cache)")]
    end

    subgraph Queue["Message Queue"]
        KAFKA["Kafka<br/>(Write Events)"]
    end

    Clients --> Gateway
    Gateway --> Services

    WRITER --> EXTRACT
    WRITER --> EMBED
    WRITER --> KAFKA
    KAFKA --> VECTOR
    KAFKA --> GRAPH
    KAFKA --> PG

    READER --> CACHE
    READER --> FUSION
    FUSION --> VECTOR
    FUSION --> GRAPH
    FUSION --> RANK

    CONSOL --> VECTOR
    CONSOL --> PG
    FORGET --> VECTOR
    FORGET --> PG

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef process fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef queue fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class SDK,API,AGENT client
    class LB,AUTH,RL gateway
    class WRITER,READER,CONSOL,FORGET service
    class EXTRACT,EMBED,RANK,FUSION process
    class VECTOR,GRAPH,PG,CACHE storage
    class KAFKA queue
```

---

## Component Descriptions

### Client Layer

| Component | Purpose | Integration |
|-----------|---------|-------------|
| **Python/JS SDK** | Native language bindings | `mem0.add()`, `mem0.search()` |
| **REST API** | HTTP interface for any language | Standard REST endpoints |
| **Agent Frameworks** | LangChain, CrewAI, Letta integrations | Memory tools for agents |

### API Gateway

| Component | Purpose | Configuration |
|-----------|---------|---------------|
| **Load Balancer** | Distribute traffic | Round-robin with health checks |
| **Auth Service** | Validate API keys, JWT | Per-request authentication |
| **Rate Limiter** | Protect from abuse | 1000 req/min per user |

### Memory Services

| Service | Responsibility | Scaling |
|---------|----------------|---------|
| **Memory Writer** | Extract, embed, store memories | Horizontal, queue-backed |
| **Memory Reader** | Retrieve, rank, return memories | Horizontal, cache-heavy |
| **Consolidation Service** | Compress old memories | Background workers |
| **Forgetting Service** | Decay and delete memories | Scheduled jobs |

### Processing Layer

| Component | Technology | Latency |
|-----------|------------|---------|
| **Entity Extractor** | GPT-4o-mini, Claude Haiku | 50-100ms |
| **Embedding Service** | text-embedding-3-small | 20-50ms |
| **Ranking Engine** | Custom scoring algorithm | 5-10ms |
| **Fusion Service** | Reciprocal Rank Fusion | 5ms |

### Storage Layer

| Store | Data | Technology Options |
|-------|------|-------------------|
| **Vector DB** | Embeddings, episodic memories | Pinecone, Weaviate, Qdrant, pgvector |
| **Graph DB** | Entities, relationships | Neo4j, Memgraph, Neptune |
| **PostgreSQL** | Metadata, user info, sessions | PostgreSQL with pgvector |
| **Redis** | Hot memory cache | Redis Cluster |

---

## Data Flow: Memory Formation

```mermaid
sequenceDiagram
    participant Client
    participant API as API Gateway
    participant Writer as Memory Writer
    participant Extract as Entity Extractor
    participant Embed as Embedding Service
    participant Queue as Kafka
    participant Vector as Vector DB
    participant Graph as Graph DB

    Client->>API: POST /v1/memories {content, user_id}
    API->>API: Authenticate, Rate Limit
    API->>Writer: Create Memory Request

    par Extraction & Embedding
        Writer->>Extract: Extract entities & facts
        Extract-->>Writer: {entities, facts, events}
        Writer->>Embed: Generate embedding
        Embed-->>Writer: vector[1536]
    end

    Writer->>Writer: Calculate importance score
    Writer->>Queue: Publish MemoryCreated event
    Writer-->>Client: {memory_id, status: "processing"}

    par Async Storage
        Queue->>Vector: Store embedding + metadata
        Queue->>Graph: Store entities + relationships
    end

    Note over Vector,Graph: Async write, eventually consistent
```

### Formation Pipeline Steps

| Step | Input | Output | Latency |
|------|-------|--------|---------|
| 1. Receive | Conversation turn | Validated request | 5ms |
| 2. Extract | Raw text | Entities, facts, events | 50-100ms |
| 3. Embed | Text content | 1536-dim vector | 20-50ms |
| 4. Score | Memory + context | Importance score | 5ms |
| 5. Queue | Memory object | Event published | 5ms |
| 6. Store | Event | Persisted data | Async |
| **Total (sync)** | | | **85-165ms** |

---

## Data Flow: Memory Retrieval

```mermaid
sequenceDiagram
    participant Client
    participant API as API Gateway
    participant Reader as Memory Reader
    participant Cache as Redis Cache
    participant Fusion as Fusion Service
    participant Vector as Vector DB
    participant Graph as Graph DB
    participant Rank as Ranking Engine

    Client->>API: POST /v1/memories/search {query, user_id, top_k}
    API->>Reader: Search Request

    Reader->>Cache: Check hot memory cache

    alt Cache Hit
        Cache-->>Reader: Cached memories
    else Cache Miss
        par Multi-Source Retrieval
            Reader->>Fusion: Hybrid search request
            Fusion->>Vector: Vector similarity search
            Vector-->>Fusion: Vector results
            Fusion->>Graph: Graph traversal
            Graph-->>Fusion: Graph results
        end

        Fusion->>Fusion: RRF fusion
        Fusion-->>Reader: Fused candidates
    end

    Reader->>Rank: Rank by importance
    Rank-->>Reader: Ranked memories
    Reader->>Cache: Update cache (async)
    Reader-->>Client: {memories[], scores[]}
```

### Retrieval Pipeline Steps

| Step | Input | Output | Latency |
|------|-------|--------|---------|
| 1. Parse | Query string | Validated request | 2ms |
| 2. Cache Check | user_id + query hash | Hit or miss | 2ms |
| 3. Embed Query | Query text | Query vector | 20ms |
| 4. Vector Search | Query vector | Top-K candidates | 15-30ms |
| 5. Graph Traversal | Recent memory IDs | Related memories | 20-40ms |
| 6. RRF Fusion | Multiple result sets | Unified ranking | 5ms |
| 7. Importance Rank | Candidates | Final ranking | 5ms |
| 8. Format | Memories | Response | 2ms |
| **Total** | | | **70-105ms** |

---

## Data Flow: Context Injection

```mermaid
sequenceDiagram
    participant Agent
    participant Memory as Memory System
    participant LLM

    Agent->>Memory: Get context for prompt
    Memory->>Memory: Search relevant memories
    Memory->>Memory: Format within token budget
    Memory-->>Agent: Memory context string

    Agent->>Agent: Inject into system prompt
    Agent->>LLM: Complete prompt with memory
    LLM-->>Agent: Response

    Agent->>Memory: Store new memories (async)
```

### Context Injection Format

```
<system>
You are a helpful assistant with access to the user's memory.

<user_memories>
- User prefers Python for coding tasks
- User's name is Alex, works at TechCorp
- Last week, user asked about Kubernetes deployment
- User is working on a machine learning project
</user_memories>

Use this context to personalize your responses.
</system>
```

---

## Memory Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Extracted: New conversation turn

    Extracted --> Embedding: LLM extraction complete
    Embedding --> Stored: Embedding generated

    Stored --> Active: Write confirmed

    Active --> Accessed: Query matches
    Accessed --> Active: Access count++

    Active --> Consolidating: Age > threshold OR<br/>Token budget exceeded
    Consolidating --> Archived: Summary created

    Active --> Decaying: Importance < threshold
    Decaying --> Forgotten: Importance < deletion_threshold
    Decaying --> Active: Accessed (importance boost)

    Archived --> Recalled: Archive search matches
    Recalled --> Active: Promoted back

    Forgotten --> [*]: Deleted

    note right of Active
        Normal state for memories
        Subject to decay over time
    end note

    note right of Consolidating
        Background process
        Creates summary, archives original
    end note
```

### State Transitions

| From | To | Trigger | Action |
|------|-----|---------|--------|
| Extracted | Embedding | Extraction complete | Generate embedding |
| Embedding | Stored | Embedding ready | Write to storage |
| Stored | Active | Write confirmed | Available for retrieval |
| Active | Accessed | Query match | Increment access count |
| Active | Consolidating | Age/budget trigger | Start consolidation job |
| Consolidating | Archived | Summary created | Archive original |
| Active | Decaying | Low importance | Apply decay function |
| Decaying | Forgotten | Below threshold | Schedule deletion |
| Decaying | Active | Access | Boost importance |

---

## Key Architectural Decisions

### Decision 1: Hybrid Storage Model

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Vector-only** | Simple, fast similarity search | No relationship queries | |
| **Graph-only** | Rich relationships | Poor semantic search | |
| **Hybrid (Vector + Graph)** | Best of both | Complexity, sync needed | **Selected** |

**Rationale:** Different query patterns require different storage. "Find memories about Python" uses vector similarity. "What else do I know about this project?" uses graph traversal. Hybrid enables both.

### Decision 2: Retrieval Strategy

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Dense only** | Fast, simple | Misses keyword matches | |
| **Sparse only** | Exact matches | Misses semantic | |
| **Hybrid (Dense + Sparse + Temporal)** | Best recall | Latency cost | **Selected** |

**Rationale:** Memory queries are diverse. "meeting with Sarah" needs keyword match. "discussions about scaling" needs semantic. "last week's conversation" needs temporal. Fusion with RRF combines all.

### Decision 3: Consolidation Trigger

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Time-based** | Predictable | May consolidate prematurely | |
| **Token budget** | Efficient for LLM | May delay needed consolidation | |
| **Hybrid (Time OR Budget)** | Balanced | More complex | **Selected** |

**Rationale:** Time-based ensures old memories don't linger. Budget-based ensures active users don't hit limits. Combining catches both scenarios.

### Decision 4: Async vs Sync Writes

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Synchronous** | Immediate consistency | Higher latency | |
| **Asynchronous** | Lower latency | Eventual consistency | **Selected** |

**Rationale:** Memory writes shouldn't block agent responses. Users expect immediate responses, and memories being available on the *next* turn is acceptable.

### Decision 5: Memory Extraction Model

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Large LLM (GPT-4)** | Best accuracy | Expensive, slow | |
| **Small LLM (GPT-4o-mini)** | Good accuracy, fast, cheap | Slightly lower quality | **Selected** |
| **Fine-tuned model** | Best for domain | Training overhead | For enterprise |

**Rationale:** Extraction is high-volume. Small models provide 85%+ accuracy at 10x lower cost and 5x lower latency.

---

## Technology Choices

### Vector Database Selection

| Technology | Use Case | Pros | Cons |
|------------|----------|------|------|
| **Pinecone** | Managed, high-scale | Serverless, auto-scaling | Vendor lock-in |
| **Weaviate** | Self-hosted, hybrid | Vector + BM25, GraphQL | Ops overhead |
| **Qdrant** | Performance-critical | Rust, low latency | Smaller ecosystem |
| **pgvector** | PostgreSQL integration | Single database | Scale limits |

**Recommendation:** Pinecone for managed production, pgvector for startups/cost-sensitive.

### Graph Database Selection

| Technology | Use Case | Pros | Cons |
|------------|----------|------|------|
| **Neo4j** | Full-featured graphs | Rich query language | Cost at scale |
| **Memgraph** | Real-time graphs | Performance | Smaller community |
| **Neptune** | AWS ecosystem | Managed | AWS lock-in |

**Recommendation:** Neo4j for feature richness, Memgraph for latency-critical.

### Message Queue Selection

| Technology | Use Case | Pros | Cons |
|------------|----------|------|------|
| **Kafka** | High-throughput events | Durability, replay | Complexity |
| **Redis Streams** | Low-latency | Simple, fast | Less durable |
| **SQS** | AWS managed | Serverless | AWS-only |

**Recommendation:** Kafka for durability and event replay (consolidation auditing).

---

## MemGPT Virtual Context Architecture

The MemGPT approach treats the LLM as an "operating system" that manages its own memory:

```mermaid
flowchart TB
    subgraph Context["Main Context (LLM Window)"]
        direction TB
        SYSTEM["System Instructions<br/>(Read-only, 2K tokens)"]
        PERSONA["Agent Persona<br/>(Editable, 500 tokens)"]
        HUMAN["User Information<br/>(Editable, 500 tokens)"]
        FIFO["Message Queue<br/>(FIFO, variable)"]
    end

    subgraph External["External Storage"]
        RECALL["Recall Memory<br/>(Conversation DB)"]
        ARCHIVE["Archival Memory<br/>(Vector DB)"]
    end

    subgraph Tools["Memory Tools"]
        T1["core_memory_append"]
        T2["core_memory_replace"]
        T3["archival_memory_insert"]
        T4["archival_memory_search"]
        T5["conversation_search"]
    end

    LLM["LLM Agent"] -->|"Edits via tools"| PERSONA
    LLM -->|"Edits via tools"| HUMAN
    LLM -->|"Sends messages"| FIFO

    FIFO -->|"Overflow"| RECALL
    LLM -->|"archival_memory_insert"| ARCHIVE
    LLM -->|"archival_memory_search"| ARCHIVE
    LLM -->|"conversation_search"| RECALL

    Tools --> LLM

    classDef context fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef external fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef tools fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class SYSTEM,PERSONA,HUMAN,FIFO context
    class RECALL,ARCHIVE external
    class T1,T2,T3,T4,T5 tools
```

### MemGPT Memory Tools

| Tool | Purpose | When Used |
|------|---------|-----------|
| `core_memory_append` | Add to persona/human block | Learn new permanent facts |
| `core_memory_replace` | Update persona/human block | Correct outdated information |
| `archival_memory_insert` | Store to vector DB | Save important details for later |
| `archival_memory_search` | Query vector DB | Retrieve specific past information |
| `conversation_search` | Search conversation history | Find what was discussed when |

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async** | Async writes, sync reads | Writes shouldn't block responses |
| **Event-driven vs Request-response** | Both | Events for writes, request-response for reads |
| **Push vs Pull** | Pull (query-based) | Memories retrieved on demand |
| **Stateless vs Stateful services** | Stateless | State in storage layer |
| **Read-heavy vs Write-heavy** | Read-heavy (5:1) | More retrievals than new memories |
| **Real-time vs Batch** | Real-time reads, batch consolidation | Different latency requirements |
| **Edge vs Origin** | Origin (centralized) | Memory must be consistent |

---

## Integration Points

### LangChain Integration

```python
from langchain.memory import Mem0Memory

memory = Mem0Memory(
    api_key="...",
    user_id="user_123"
)

# In agent
agent = create_react_agent(
    llm=llm,
    tools=tools,
    memory=memory  # Automatic memory injection
)
```

### Direct API Integration

```python
import mem0

client = mem0.Client(api_key="...")

# Add memory
client.add(
    messages=[{"role": "user", "content": "I prefer Python"}],
    user_id="user_123"
)

# Search
results = client.search(
    query="coding preferences",
    user_id="user_123",
    limit=5
)

# Get context for prompt
context = client.get_context(
    query="help with coding",
    user_id="user_123",
    max_tokens=500
)
```

---

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Region1["Region: US-East"]
        LB1["Load Balancer"]

        subgraph K8s1["Kubernetes Cluster"]
            API1["API Pods (x10)"]
            WORKER1["Worker Pods (x5)"]
        end

        subgraph Data1["Data Layer"]
            VDB1[("Vector DB Primary")]
            GDB1[("Graph DB Primary")]
            PG1[("PostgreSQL Primary")]
            REDIS1[("Redis Primary")]
        end
    end

    subgraph Region2["Region: US-West (DR)"]
        LB2["Load Balancer"]

        subgraph Data2["Data Layer (Replica)"]
            VDB2[("Vector DB Replica")]
            GDB2[("Graph DB Replica")]
            PG2[("PostgreSQL Replica")]
        end
    end

    USERS["Users"] --> CDN["CDN / Global LB"]
    CDN --> LB1
    CDN -.->|"Failover"| LB2

    VDB1 -->|"Async Replication"| VDB2
    GDB1 -->|"Async Replication"| GDB2
    PG1 -->|"Streaming Replication"| PG2

    classDef lb fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef compute fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class LB1,LB2,CDN lb
    class API1,WORKER1 compute
    class VDB1,GDB1,PG1,REDIS1,VDB2,GDB2,PG2 data
```
