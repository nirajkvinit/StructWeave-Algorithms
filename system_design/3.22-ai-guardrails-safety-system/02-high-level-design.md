# High-Level Design

## System Architecture Overview

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        APP[Applications]
        AGENT[AI Agents]
        RAG[RAG Systems]
        SDK[Client SDKs]
    end

    subgraph Gateway["LLM Gateway Layer"]
        GW[API Gateway]
        AUTH[Auth Service]
        ROUTE[Router]
    end

    subgraph Guardrails["Guardrails Engine"]
        direction TB
        ORCH[Rail Orchestrator]

        subgraph Rails["Rail Pipeline"]
            INPUT[Input Rails]
            DIALOG[Dialog Rails]
            RETRIEVAL[Retrieval Rails]
            EXEC[Execution Rails]
            OUTPUT[Output Rails]
        end

        POLICY[Policy Engine]
        CACHE[Detection Cache]
    end

    subgraph Detection["Detection Services"]
        INJECT[Injection Detector]
        JAIL[Jailbreak Detector]
        MOD[Content Moderator]
        PII[PII Detector]
        TOPIC[Topic Classifier]
        HALL[Hallucination Checker]
    end

    subgraph ML["ML Infrastructure"]
        EMBED[Embedding Service]
        CLASS[Classifier Service]
        JUDGE[LLM-as-Judge]
    end

    subgraph Storage["Data Layer"]
        RULES[(Policy Store)]
        AUDIT[(Audit Logs)]
        VECTORS[(Vector Index)]
        PATTERNS[(Pattern DB)]
    end

    subgraph External["External"]
        LLM[LLM Providers]
        TOOLS[Tool Services]
    end

    Clients --> Gateway
    GW --> ORCH
    ORCH --> Rails
    Rails --> Detection
    Detection --> ML
    ORCH --> POLICY
    POLICY --> RULES
    ORCH --> AUDIT
    Detection --> VECTORS
    Detection --> PATTERNS
    ORCH --> LLM
    EXEC --> TOOLS

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef guardrails fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef detection fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef ml fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef storage fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef external fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class APP,AGENT,RAG,SDK client
    class GW,AUTH,ROUTE gateway
    class ORCH,INPUT,DIALOG,RETRIEVAL,EXEC,OUTPUT,POLICY,CACHE guardrails
    class INJECT,JAIL,MOD,PII,TOPIC,HALL detection
    class EMBED,CLASS,JUDGE ml
    class RULES,AUDIT,VECTORS,PATTERNS storage
    class LLM,TOOLS external
```

---

## Component Responsibilities

| Component | Layer | Responsibility | Key Technologies |
|-----------|-------|----------------|------------------|
| **Rail Orchestrator** | Guardrails | Coordinate rail execution, early-exit on block | State machine, async pipeline |
| **Input Rails** | Guardrails | Pre-LLM validation of user prompts | Injection/jailbreak/PII detectors |
| **Dialog Rails** | Guardrails | Conversation state, multi-turn safety | Context tracker, instruction hierarchy |
| **Retrieval Rails** | Guardrails | RAG content validation | Source scoring, relevance filter |
| **Execution Rails** | Guardrails | Tool call authorization | Parameter validator, action allowlist |
| **Output Rails** | Guardrails | Post-LLM response filtering | Content mod, PII redaction |
| **Policy Engine** | Guardrails | Declarative rule evaluation | Colang interpreter, rule indexer |
| **Injection Detector** | Detection | Prompt injection classification | Regex + classifier + LLM ensemble |
| **Jailbreak Detector** | Detection | Jailbreak pattern matching | FJD, pattern DB, behavior analysis |
| **Content Moderator** | Detection | Toxicity/harm classification | Multi-label classifier (Aegis-style) |
| **PII Detector** | Detection | Entity extraction and validation | NER + regex + Presidio patterns |
| **Topic Classifier** | Detection | Topic boundary enforcement | Embedding similarity, allowlist |
| **Hallucination Checker** | Detection | Grounding verification | Automated reasoning, RAG alignment |
| **Embedding Service** | ML | Text vectorization | Sentence transformers |
| **Classifier Service** | ML | ML model inference | ONNX runtime, batch inference |
| **LLM-as-Judge** | ML | Complex case evaluation | LLM API with structured output |

---

## Data Flow: Request Processing

### Happy Path (All Rails Pass)

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant O as Orchestrator
    participant I as Input Rails
    participant D as Dialog Rails
    participant R as Retrieval Rails
    participant E as Execution Rails
    participant L as LLM
    participant Out as Output Rails
    participant A as Audit Log

    C->>O: Request (messages, config)

    O->>I: Validate input
    I->>I: Injection check (5ms)
    I->>I: Jailbreak check (10ms)
    I->>I: PII detection (10ms)
    I->>I: Content moderation (5ms)
    I-->>O: Pass (confidence: 0.98)

    O->>D: Check dialog context
    D->>D: Multi-turn analysis
    D->>D: Instruction hierarchy
    D-->>O: Pass

    O->>R: Validate retrieved content
    R->>R: Source scoring
    R->>R: Relevance check
    R-->>O: Pass

    O->>E: Validate tool calls
    E->>E: Authorization check
    E->>E: Parameter sanitization
    E-->>O: Pass

    O->>L: Forward to LLM
    L-->>O: Response

    O->>Out: Validate output
    Out->>Out: Content moderation
    Out->>Out: PII redaction
    Out->>Out: Policy compliance
    Out-->>O: Pass (response modified)

    O->>A: Log result (async)
    O-->>C: Response (verdict: pass, latency: 45ms)
```

### Blocked Request Flow

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant O as Orchestrator
    participant I as Input Rails
    participant P as Policy Engine
    participant A as Audit Log

    C->>O: Request (suspicious prompt)

    O->>I: Validate input
    I->>I: Injection check
    Note over I: High-confidence injection detected (0.95)
    I-->>O: Block (injection, confidence: 0.95)

    O->>P: Check policy for action
    P-->>O: Action: block, message: "Request blocked for safety"

    O->>A: Log blocked request (async)
    Note over A: Full audit trail stored

    O-->>C: 403 Blocked (reason: prompt_injection)
```

---

## Prompt Injection Detection Flow

```mermaid
flowchart TB
    subgraph Stage1["Stage 1: Regex (< 1ms)"]
        R1[Pattern Matching]
        R2{Match Found?}
        R3[High Confidence]
    end

    subgraph Stage2["Stage 2: Classifier (5-15ms)"]
        C1[Tokenize Input]
        C2[PromptGuard Model]
        C3{Score > Threshold?}
    end

    subgraph Stage3["Stage 3: LLM-Judge (100-500ms)"]
        L1[Construct Judge Prompt]
        L2[LLM Analysis]
        L3[Parse Verdict]
    end

    INPUT[User Prompt] --> R1
    R1 --> R2
    R2 -->|Yes, conf > 0.95| R3
    R3 --> BLOCK[Block Request]

    R2 -->|No| C1
    C1 --> C2
    C2 --> C3
    C3 -->|Yes| BLOCK
    C3 -->|Borderline 0.5-0.8| L1
    C3 -->|No, conf < 0.5| PASS[Allow Request]

    L1 --> L2
    L2 --> L3
    L3 --> DECISION{Ensemble Decision}
    DECISION -->|Inject| BLOCK
    DECISION -->|Safe| PASS

    classDef fast fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef medium fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef slow fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef result fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class R1,R2,R3 fast
    class C1,C2,C3 medium
    class L1,L2,L3 slow
    class BLOCK,PASS,INPUT,DECISION result
```

---

## PII Detection & Redaction Flow

```mermaid
flowchart LR
    subgraph Input["Input Processing"]
        TEXT[Input Text]
        NORM[Normalize Text]
    end

    subgraph Detection["Detection Pipeline"]
        REG[Regex Patterns]
        NER[NER Model]
        VAL[Validators]
        MERGE[Merge Results]
    end

    subgraph Action["Action Selection"]
        CONF{Config Action}
        MASK[Mask Entity]
        BLOCK[Block Request]
        LOG[Log Only]
    end

    subgraph Output["Output"]
        REDACTED[Redacted Text]
        AUDIT[Audit Record]
    end

    TEXT --> NORM
    NORM --> REG
    NORM --> NER
    REG --> MERGE
    NER --> MERGE
    MERGE --> VAL
    VAL --> CONF
    CONF -->|action: mask| MASK
    CONF -->|action: block| BLOCK
    CONF -->|action: log| LOG
    MASK --> REDACTED
    MASK --> AUDIT
    BLOCK --> AUDIT
    LOG --> AUDIT

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef detect fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef action fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef output fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class TEXT,NORM input
    class REG,NER,VAL,MERGE detect
    class CONF,MASK,BLOCK,LOG action
    class REDACTED,AUDIT output
```

---

## Policy Evaluation Flow

```mermaid
flowchart TB
    subgraph Input["Request Context"]
        MSG[Messages]
        META[Metadata]
        STATE[Conversation State]
    end

    subgraph Engine["Policy Engine"]
        LOAD[Load Active Policies]
        INDEX[Policy Index Lookup]
        MATCH[Pattern Matching]
        EVAL[Rule Evaluation]
        PRIORITY[Priority Resolution]
    end

    subgraph Actions["Policy Actions"]
        ALLOW[Allow]
        WARN[Warn + Continue]
        BLOCK[Block]
        MODIFY[Modify Response]
    end

    MSG --> INDEX
    META --> INDEX
    STATE --> INDEX
    LOAD --> INDEX
    INDEX --> MATCH
    MATCH --> EVAL
    EVAL --> PRIORITY
    PRIORITY --> ALLOW
    PRIORITY --> WARN
    PRIORITY --> BLOCK
    PRIORITY --> MODIFY

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef engine fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef action fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class MSG,META,STATE input
    class LOAD,INDEX,MATCH,EVAL,PRIORITY engine
    class ALLOW,WARN,BLOCK,MODIFY action
```

---

## Key Architectural Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| **Pipeline Architecture** | Sequential with early-exit | Parallel, waterfall | Block attacks ASAP, reduce unnecessary compute |
| **Detection Strategy** | Multi-stage ensemble | Single model, rules-only | Balance speed (regex), accuracy (classifier), coverage (LLM) |
| **Policy Language** | Declarative DSL (Colang-inspired) | Programmatic, JSON config | Human-readable, auditable, version-controlled |
| **Fail Mode** | Fail-closed (block on error) | Fail-open | Safety-first for guardrail systems |
| **State Management** | Stateless with context pass-through | Session affinity | Simpler scaling, no sticky sessions |
| **Caching** | Embedding + detection result cache | No cache, full cache | Reduce redundant computation, bounded memory |
| **Async vs Sync** | Sync for blocking, async for audit | All sync, all async | User experience + reliability |

---

## Architecture Pattern Checklist

| Pattern | Decision | Notes |
|---------|----------|-------|
| **Sync vs Async** | Sync for detection, async for logging | Blocking must be synchronous |
| **Event-driven vs Request-response** | Request-response with async events | Audit events fire-and-forget |
| **Push vs Pull** | Pull (request-driven) | No background processing needed |
| **Stateless vs Stateful** | Stateless with context | Dialog rails need conversation context passed |
| **Read-heavy vs Write-heavy** | Read-heavy (policies, patterns) | Policies cached, infrequent updates |
| **Real-time vs Batch** | Real-time detection, batch model updates | Models updated offline |
| **Edge vs Origin** | Origin processing | Complex ML models not suited for edge |

---

## Integration Points

### LLM Gateway Integration

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as LLM Gateway
    participant Guard as Guardrails
    participant LLM

    Client->>Gateway: Chat request
    Gateway->>Guard: Pre-LLM check
    Guard-->>Gateway: Pass/Block

    alt Blocked
        Gateway-->>Client: 403 Blocked
    else Passed
        Gateway->>LLM: Forward request
        LLM-->>Gateway: Response
        Gateway->>Guard: Post-LLM check
        Guard-->>Gateway: Pass/Modify
        Gateway-->>Client: Response
    end
```

### Agent Orchestration Integration

```mermaid
sequenceDiagram
    participant Agent
    participant Guard as Guardrails
    participant Tool

    Agent->>Guard: Tool call request
    Guard->>Guard: Validate tool authorization
    Guard->>Guard: Sanitize parameters

    alt Authorized
        Guard->>Tool: Execute tool
        Tool-->>Guard: Result
        Guard->>Guard: Validate result
        Guard-->>Agent: Safe result
    else Unauthorized
        Guard-->>Agent: Block (unauthorized tool)
    end
```

---

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Region1["Region: US-East"]
        LB1[Load Balancer]

        subgraph K8s1["Kubernetes Cluster"]
            API1[Guardrail API x3]
            DET1[Detector Service x2]
            POL1[Policy Engine x2]
        end

        subgraph Data1["Data Stores"]
            REDIS1[(Redis Cache)]
            PG1[(PostgreSQL)]
            CLICK1[(ClickHouse)]
        end
    end

    subgraph Region2["Region: EU-West"]
        LB2[Load Balancer]

        subgraph K8s2["Kubernetes Cluster"]
            API2[Guardrail API x3]
            DET2[Detector Service x2]
            POL2[Policy Engine x2]
        end

        subgraph Data2["Data Stores"]
            REDIS2[(Redis Cache)]
            PG2[(PostgreSQL)]
            CLICK2[(ClickHouse)]
        end
    end

    GLB[Global Load Balancer] --> LB1
    GLB --> LB2
    PG1 <-.->|Replication| PG2

    classDef lb fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef storage fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class GLB,LB1,LB2 lb
    class API1,API2,DET1,DET2,POL1,POL2 service
    class REDIS1,REDIS2,PG1,PG2,CLICK1,CLICK2 storage
```
