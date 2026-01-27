# High-Level Design

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              IDE / Editor Layer                                  │
│                                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│
│  │   VS Code   │  │  JetBrains  │  │  Vim/NeoVim │  │     Web Editor          ││
│  │   Plugin    │  │   Plugin    │  │   Plugin    │  │     (Monaco)            ││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘│
│         │                │                │                      │              │
│         └────────────────┴────────────────┴──────────────────────┘              │
│                                    │                                             │
│                    ┌───────────────┴───────────────┐                            │
│                    │      Local Context Agent      │                            │
│                    │  • File watcher               │                            │
│                    │  • Tree-sitter parser         │                            │
│                    │  • Local embedding cache      │                            │
│                    └───────────────┬───────────────┘                            │
└────────────────────────────────────│────────────────────────────────────────────┘
                                     │
                                     │ HTTPS/WebSocket
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Edge / Gateway Layer                                   │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                        Global Load Balancer                               │  │
│  │                  (GeoDNS + Anycast + Health Checks)                       │  │
│  └────────────────────────────────┬─────────────────────────────────────────┘  │
│                                   │                                             │
│  ┌────────────────────────────────┴─────────────────────────────────────────┐  │
│  │                          API Gateway                                      │  │
│  │  • Authentication (OAuth2, API Keys)                                      │  │
│  │  • Rate Limiting (per user, per org)                                      │  │
│  │  • Request Routing                                                        │  │
│  │  • TLS Termination                                                        │  │
│  └────────────────────────────────┬─────────────────────────────────────────┘  │
│                                   │                                             │
│  ┌────────────────────────────────┴─────────────────────────────────────────┐  │
│  │                        Edge Cache Layer                                   │  │
│  │  • Prompt cache (semantic similarity)                                     │  │
│  │  • Popular completion cache                                               │  │
│  │  • Session state cache                                                    │  │
│  └────────────────────────────────┬─────────────────────────────────────────┘  │
└───────────────────────────────────│─────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Completion Service Layer                                 │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      Request Router                                      │   │
│  │  • Completion type detection (inline, FIM, chat)                         │   │
│  │  • Model selection (fast vs. quality)                                    │   │
│  │  • Priority queue assignment                                             │   │
│  └─────────────────────────────┬───────────────────────────────────────────┘   │
│                                │                                                │
│       ┌────────────────────────┼────────────────────────┐                      │
│       │                        │                        │                       │
│       ▼                        ▼                        ▼                       │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐                │
│  │   Inline    │        │    FIM      │        │    Chat     │                │
│  │ Completion  │        │ Completion  │        │   Handler   │                │
│  │   Service   │        │   Service   │        │   Service   │                │
│  └──────┬──────┘        └──────┬──────┘        └──────┬──────┘                │
│         │                      │                      │                        │
│         └──────────────────────┴──────────────────────┘                        │
│                                │                                                │
│                                ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    Context Assembly Service                              │   │
│  │  • Token budgeting                                                       │   │
│  │  • Priority-based context selection                                      │   │
│  │  • Semantic deduplication                                                │   │
│  └─────────────────────────────┬───────────────────────────────────────────┘   │
└────────────────────────────────│────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Context Retrieval Layer                                   │
│                                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│
│  │   Symbol    │  │  Semantic   │  │   Lexical   │  │    Documentation       ││
│  │   Index    │  │   Search    │  │   Search    │  │      Retriever          ││
│  │ (Tree-sitter)│  │ (Vector DB) │  │   (BM25)    │  │   (External RAG)       ││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘│
│         │                │                │                      │              │
│         └────────────────┴────────────────┴──────────────────────┘              │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Retrieval Fusion                                  │   │
│  │  • Reciprocal Rank Fusion (RRF)                                          │   │
│  │  • Score normalization                                                   │   │
│  │  • Relevance filtering                                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          LLM Inference Layer                                     │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       Model Router                                       │   │
│  │  • Intelligent prompt routing (simple → fast, complex → capable)         │   │
│  │  • Load balancing across model replicas                                  │   │
│  │  • Failover to backup providers                                          │   │
│  └────────────────────────────────┬────────────────────────────────────────┘   │
│                                   │                                             │
│       ┌───────────────────────────┼───────────────────────────┐                │
│       │                           │                           │                 │
│       ▼                           ▼                           ▼                 │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐            │
│  │   Fast      │          │  Standard   │          │   Premium   │            │
│  │   Models    │          │   Models    │          │   Models    │            │
│  │ (StarCoder) │          │  (GPT-4o)   │          │ (Opus 4.5)  │            │
│  │  <100ms     │          │  ~200ms     │          │  ~350ms     │            │
│  └─────────────┘          └─────────────┘          └─────────────┘            │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                   Inference Optimization                                 │   │
│  │  • Speculative decoding (draft → verify)                                 │   │
│  │  • KV cache management                                                   │   │
│  │  • Continuous batching                                                   │   │
│  │  • Prompt caching                                                        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       Post-Processing Layer                                      │
│                                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│
│  │   Syntax    │  │  Security   │  │   Ranking   │  │     Formatting         ││
│  │ Validation  │  │   Filter    │  │   Service   │  │      Service           ││
│  │             │  │             │  │             │  │                        ││
│  │ • Parse     │  │ • Secrets   │  │ • Top-k     │  │ • Indentation          ││
│  │   check     │  │ • Vuln      │  │ • Diversity │  │ • Style                ││
│  │ • Bracket   │  │ • Injection │  │ • History   │  │ • Language             ││
│  │   balance   │  │             │  │             │  │                        ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Data Layer                                              │
│                                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│
│  │   Vector    │  │   Cache     │  │   Object    │  │     Analytics          ││
│  │  Database   │  │   (Redis)   │  │   Storage   │  │      Store             ││
│  │             │  │             │  │             │  │                        ││
│  │ • Embeddings│  │ • Sessions  │  │ • Indexes   │  │ • Usage data           ││
│  │ • Repo index│  │ • Prompts   │  │ • Backups   │  │ • Telemetry            ││
│  │             │  │ • KV cache  │  │             │  │ • Metrics              ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility | Key Technologies |
|-----------|---------------|------------------|
| **IDE Plugin** | Capture keystrokes, display suggestions, handle UI | LSP, Tree-sitter, WebSocket |
| **Local Context Agent** | File watching, local parsing, caching | Tree-sitter, SQLite |
| **API Gateway** | Auth, rate limiting, routing | OAuth2, JWT, rate limiters |
| **Edge Cache** | Reduce latency, cache popular completions | Redis, CDN |
| **Request Router** | Route to appropriate completion service | Load balancing, priority queues |
| **Context Assembly** | Build optimal prompt within token budget | Tokenizers, priority algorithms |
| **Symbol Index** | Fast symbol lookup via AST parsing | Tree-sitter, inverted index |
| **Semantic Search** | Vector similarity for code chunks | Vector DB, embedding models |
| **Model Router** | Select optimal model for request | Routing logic, health checks |
| **Inference Engine** | Run LLM inference with optimizations | vLLM, TensorRT-LLM |
| **Post-Processing** | Validate, filter, rank suggestions | Parsers, security scanners |

---

## Data Flow Diagrams

### Inline Completion Flow

```mermaid
sequenceDiagram
    participant IDE as IDE Plugin
    participant LCA as Local Context Agent
    participant GW as API Gateway
    participant CS as Completion Service
    participant CR as Context Retrieval
    participant LLM as LLM Inference
    participant PP as Post-Processing

    IDE->>IDE: User types character
    IDE->>IDE: Debounce (150ms)
    IDE->>LCA: Get local context
    LCA->>LCA: Parse with Tree-sitter
    LCA-->>IDE: Symbol info, imports

    IDE->>GW: Completion request
    Note over GW: Auth + Rate limit
    GW->>CS: Route request

    CS->>CR: Fetch additional context
    CR->>CR: Semantic + Lexical search
    CR-->>CS: Relevant code snippets

    CS->>CS: Assemble prompt (token budget)
    CS->>LLM: Generate completion
    LLM->>LLM: Speculative decoding
    LLM-->>CS: Raw completions

    CS->>PP: Process suggestions
    PP->>PP: Syntax check + Security scan
    PP-->>CS: Filtered suggestions

    CS-->>GW: Ranked completions
    GW-->>IDE: Suggestions (top-k)
    IDE->>IDE: Display inline
```

### Repository Indexing Flow

```mermaid
sequenceDiagram
    participant User as User
    participant IDE as IDE Plugin
    participant IW as Index Worker
    participant TP as Tree-sitter Parser
    participant EM as Embedding Model
    participant VDB as Vector Database
    participant SI as Symbol Index

    User->>IDE: Enable repo indexing
    IDE->>IW: Trigger index job

    loop For each file
        IW->>TP: Parse file
        TP-->>IW: AST + Symbols
        IW->>SI: Store symbols

        IW->>IW: Chunk file (semantic boundaries)
        IW->>EM: Generate embeddings
        EM-->>IW: Chunk embeddings
        IW->>VDB: Store vectors
    end

    IW-->>IDE: Index complete

    Note over IDE,VDB: Incremental updates on file changes
```

### Agent Mode Flow (Multi-File Edit)

```mermaid
sequenceDiagram
    participant User as User
    participant Agent as Agent Orchestrator
    participant Planner as Task Planner
    participant Tools as Tool Executor
    participant LLM as LLM
    participant IDE as IDE
    participant FS as File System

    User->>Agent: "Add authentication to all API routes"
    Agent->>Planner: Decompose task

    Planner->>LLM: Generate plan
    LLM-->>Planner: Step 1: Find routes, Step 2: Add middleware...

    loop For each step
        Planner->>Tools: Execute step

        alt File Search
            Tools->>FS: Grep/Glob
            FS-->>Tools: Matching files
        else Code Edit
            Tools->>LLM: Generate edit
            LLM-->>Tools: Code changes
            Tools->>IDE: Apply diff
        else Terminal
            Tools->>FS: Run command
            FS-->>Tools: Output
        end

        Tools-->>Planner: Step result
        Planner->>Planner: Update plan if needed
    end

    Planner-->>Agent: Task complete
    Agent->>User: Summary of changes
```

### Next Edit Suggestion Flow

```mermaid
sequenceDiagram
    participant IDE as IDE Plugin
    participant NES as Next Edit Service
    participant HA as History Analyzer
    participant LM as Location Model
    participant CM as Completion Model
    participant PP as Post-Processing

    IDE->>IDE: User makes edit
    IDE->>NES: Edit event + context

    NES->>HA: Analyze edit history
    HA-->>NES: Edit patterns, ripple candidates

    NES->>LM: Predict next edit location
    LM-->>NES: Ranked locations (file:line)

    NES->>CM: Generate edit for top location
    CM-->>NES: Suggested edit

    NES->>PP: Validate edit
    PP-->>NES: Validated suggestion

    NES-->>IDE: Next edit suggestion
    IDE->>IDE: Highlight location + show preview

    alt User accepts (Tab)
        IDE->>IDE: Apply edit, predict next
    else User rejects
        IDE->>IDE: Clear suggestion
    end
```

---

## Context Assembly Strategy

### Token Budget Allocation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Token Budget (8K example)                         │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ System Prompt (500 tokens)                                       ││
│  │ "You are a code completion assistant..."                         ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Current File Context (3000 tokens)                               ││
│  │ • Prefix before cursor (2000)                                    ││
│  │ • Suffix after cursor (500) - for FIM                            ││
│  │ • File metadata (500)                                            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Repository Context (3000 tokens)                                 ││
│  │ • Imported symbols (1000)                                        ││
│  │ • Related files (1000)                                           ││
│  │ • Similar code snippets (1000)                                   ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ External Context (1000 tokens)                                   ││
│  │ • Library documentation                                          ││
│  │ • API references                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Reserved for Output (500 tokens)                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Context Priority Rules

| Priority | Source | Selection Criteria |
|----------|--------|-------------------|
| 1 (Highest) | Cursor prefix | Lines before cursor, up to function start |
| 2 | Cursor suffix | Lines after cursor (FIM mode) |
| 3 | Imported symbols | Definitions of imported functions/classes |
| 4 | Open tabs | Recently edited related files |
| 5 | Same directory | Files in same folder |
| 6 | Test files | Corresponding test file if exists |
| 7 | Similar code | Semantically similar snippets from repo |
| 8 (Lowest) | Documentation | External library docs |

---

## Key Design Decisions

### Decision 1: Hybrid Context Retrieval

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| Lexical only (BM25) | Fast, simple | Misses semantic similarity |
| Semantic only (Embeddings) | Captures meaning | Expensive, slower |
| **Hybrid (BM25 + Embeddings)** | Best of both | More complexity |

**Decision:** Hybrid approach with Reciprocal Rank Fusion

**Rationale:** Code completion benefits from both exact token matches (variable names, function calls) and semantic understanding (similar logic patterns). The latency cost of hybrid is acceptable given caching.

### Decision 2: Model Tiering

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| Single large model | Consistent quality | High latency, cost |
| Single small model | Fast, cheap | Lower quality |
| **Tiered routing** | Optimized per-request | Routing complexity |

**Decision:** Intelligent routing with 3 tiers

**Rationale:** Most completions are simple (autocomplete tokens) and don't need a 200B parameter model. Route simple requests to fast models, complex to capable models.

```
Simple (70%):  Variable names, imports → StarCoder (3B)  → <100ms
Medium (25%):  Function bodies        → GPT-4o-mini     → ~150ms
Complex (5%):  Multi-file, agent      → GPT-4o/Opus 4.5 → ~300ms
```

### Decision 3: Local vs. Cloud Processing

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| All cloud | Best models, simple | Latency, privacy |
| All local | Privacy, offline | Limited models |
| **Hybrid** | Balanced | More complex |

**Decision:** Hybrid with local parsing, cloud inference

**Rationale:**
- Local: Tree-sitter parsing, context preparation (0-10ms)
- Cloud: LLM inference (100-300ms)

This minimizes network round trips while leveraging cloud-scale models.

### Decision 4: Caching Strategy

**Multi-Level Cache:**

| Level | What | TTL | Hit Rate |
|-------|------|-----|----------|
| L1: Edge | Exact prompt matches | 5 min | ~5% |
| L2: Semantic | Similar prompts | 15 min | ~35% |
| L3: KV Cache | LLM attention cache | Per session | ~40% |

### Decision 5: Fill-in-the-Middle Architecture

**Options:**

| Option | Training | Inference | Quality |
|--------|----------|-----------|---------|
| Separate L2R and FIM models | 2x training | Routing needed | High |
| **Unified FIM model** | Single model | Flexible | High |
| FIM fine-tuning | Lower cost | Works with base | Medium |

**Decision:** Unified FIM-capable models (like StarCoder, CodeLlama)

**Rationale:** Modern code models are trained with FIM from the start, enabling a single model to handle both L2R and FIM completions based on prompt format.

---

## Integration Points

### IDE Plugin Integration

```
┌─────────────────────────────────────────────────────────────────────┐
│                    IDE Integration Architecture                      │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                        IDE Events                               │ │
│  │  • onTextChange     • onCursorMove    • onFileOpen             │ │
│  │  • onFileSave       • onSelection     • onCommand              │ │
│  └────────────────────────────────┬───────────────────────────────┘ │
│                                   │                                  │
│                                   ▼                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     Plugin Core                                 │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │ │
│  │  │  Debouncer  │  │   Context   │  │    State    │            │ │
│  │  │             │  │  Collector  │  │   Manager   │            │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘            │ │
│  └────────────────────────────────┬───────────────────────────────┘ │
│                                   │                                  │
│                                   ▼                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    IDE APIs Used                                │ │
│  │  • Inline Completion Provider API                               │ │
│  │  • Language Server Protocol (LSP)                               │ │
│  │  • Tree-sitter Grammar API                                      │ │
│  │  • Virtual Document API                                         │ │
│  │  • Webview Panel API (for chat)                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### External System Integration

| System | Integration Method | Purpose |
|--------|-------------------|---------|
| **Git** | Local CLI | Branch info, diff context |
| **LSP Servers** | JSON-RPC | Type info, definitions |
| **Package Managers** | File parsing | Dependency info |
| **Documentation** | RAG API | External library docs |
| **CI/CD** | Webhooks | Test results, build status |
| **Issue Trackers** | MCP/API | Task context |
