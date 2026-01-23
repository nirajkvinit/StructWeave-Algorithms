# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WebClient["Web Browser<br/>(WebRTC)"]
        MobileClient["Mobile App<br/>(WebRTC)"]
        PhoneClient["Phone/SIP<br/>(PSTN Gateway)"]
    end

    subgraph Edge["Media Edge Layer"]
        LB["Load Balancer"]
        TURN["TURN Servers<br/>(NAT Traversal)"]
        SFU["SFU Cluster<br/>(Media Routing)"]
        RecordingSvc["Recording Service"]
    end

    subgraph Speech["Speech Processing Layer"]
        VAD["Voice Activity<br/>Detection"]
        ASR["Streaming ASR<br/>(Deepgram/Whisper)"]
        TTS["Streaming TTS<br/>(ElevenLabs)"]
        AudioProc["Audio Processing<br/>(Noise, Echo)"]
    end

    subgraph Orchestration["LLM Orchestration Layer"]
        Conductor["Interview<br/>Conductor"]
        ContextMgr["Context<br/>Manager"]
        QuestionGen["Question<br/>Generator"]
        FollowUp["Follow-up<br/>Detector"]
    end

    subgraph Evaluation["Evaluation Layer"]
        RubricScorer["Rubric<br/>Scorer"]
        LLMJudge["LLM-as-Judge"]
        Consensus["Multi-LLM<br/>Consensus"]
        BiasChecker["Bias<br/>Checker"]
    end

    subgraph Data["Data Layer"]
        SessionDB[(Session DB<br/>PostgreSQL)]
        TranscriptDB[(Transcript Store<br/>PostgreSQL)]
        EvalDB[(Evaluation Store<br/>PostgreSQL)]
        CacheLayer[(Cache<br/>Redis)]
        ObjectStore[(Recordings<br/>Object Storage)]
    end

    subgraph Compliance["Compliance Layer"]
        AuditLog["Audit Logger"]
        ConsentMgr["Consent Manager"]
        DIMonitor["DI Monitor"]
        Explainer["Explainability<br/>Service"]
    end

    subgraph External["External Services"]
        CodeSandbox["Code Execution<br/>Sandbox"]
        Calendar["Calendar<br/>Integration"]
        ATS["ATS<br/>Integration"]
    end

    %% Client connections
    WebClient --> LB
    MobileClient --> LB
    PhoneClient --> LB
    LB --> TURN
    TURN --> SFU

    %% Media flow
    SFU --> RecordingSvc
    SFU --> AudioProc
    AudioProc --> VAD
    VAD --> ASR

    %% Speech to LLM
    ASR --> Conductor
    Conductor --> ContextMgr
    Conductor --> QuestionGen
    Conductor --> FollowUp
    QuestionGen --> TTS
    TTS --> SFU

    %% Evaluation flow
    ASR --> TranscriptDB
    Conductor --> RubricScorer
    RubricScorer --> LLMJudge
    LLMJudge --> Consensus
    Consensus --> BiasChecker
    BiasChecker --> EvalDB

    %% Data storage
    RecordingSvc --> ObjectStore
    Conductor --> SessionDB
    Conductor --> CacheLayer

    %% Compliance
    RubricScorer --> AuditLog
    BiasChecker --> DIMonitor
    LLMJudge --> Explainer

    %% External
    Conductor --> CodeSandbox
    Conductor --> Calendar
    BiasChecker --> ATS
```

---

## Data Flow Diagrams

### Real-Time Speech Flow

```mermaid
sequenceDiagram
    participant C as Candidate
    participant SFU as Media Server
    participant VAD as Voice Activity
    participant ASR as Speech-to-Text
    participant LLM as Interview Conductor
    participant TTS as Text-to-Speech

    Note over C,TTS: Target: <300ms mouth-to-ear

    C->>SFU: Audio stream (WebRTC)
    SFU->>VAD: Audio frames (20ms)

    loop Every 20ms frame
        VAD->>VAD: Detect speech activity
        alt Speech detected
            VAD->>ASR: Audio chunk
            ASR-->>LLM: Partial transcript (streaming)
        end
    end

    Note over VAD,ASR: 85-100ms VAD + 150ms ASR

    VAD->>LLM: Speech end signal
    ASR->>LLM: Final transcript

    LLM->>LLM: Generate response
    LLM-->>TTS: Response text (streaming)

    Note over LLM,TTS: 200ms LLM + 75ms TTS first chunk

    loop Token streaming
        TTS-->>SFU: Audio chunks
        SFU-->>C: Audio playback
    end
```

### Interview Session Lifecycle

```mermaid
sequenceDiagram
    participant Candidate
    participant Scheduler
    participant Session as Session Manager
    participant Conductor
    participant Evaluator
    participant Storage

    Candidate->>Scheduler: Request interview slot
    Scheduler->>Session: Create session
    Session->>Storage: Store session metadata
    Session-->>Candidate: Confirmation + link

    Note over Candidate,Storage: Interview Day

    Candidate->>Session: Join interview
    Session->>Conductor: Initialize context
    Conductor->>Conductor: Load job requirements
    Conductor->>Conductor: Load question bank

    loop Interview turns (15-25 questions)
        Conductor->>Candidate: Ask question (via TTS)
        Candidate->>Conductor: Response (via ASR)
        Conductor->>Conductor: Analyze response
        Conductor->>Conductor: Generate follow-up or next question
        Conductor->>Storage: Store transcript segment
    end

    Conductor->>Session: Interview complete
    Session->>Evaluator: Trigger evaluation

    par Parallel evaluation
        Evaluator->>Evaluator: Rubric scoring (LLM 1)
        Evaluator->>Evaluator: Rubric scoring (LLM 2)
    end

    Evaluator->>Evaluator: Calculate consensus
    Evaluator->>Evaluator: Bias check (DI)
    Evaluator->>Storage: Store evaluation
    Evaluator-->>Candidate: Thank you message
```

### Evaluation Flow

```mermaid
sequenceDiagram
    participant Transcript
    participant Scorer as Rubric Scorer
    participant LLM1 as LLM Judge 1
    participant LLM2 as LLM Judge 2
    participant Consensus
    participant BiasCheck
    participant Storage

    Transcript->>Scorer: Full transcript + rubric

    par Multi-LLM evaluation
        Scorer->>LLM1: Evaluate (with CoT)
        Scorer->>LLM2: Evaluate (with CoT)
        LLM1-->>Scorer: Scores + reasoning
        LLM2-->>Scorer: Scores + reasoning
    end

    Scorer->>Consensus: Compare scores
    Consensus->>Consensus: Calculate Cohen's Kappa

    alt Kappa >= 0.6
        Consensus->>BiasCheck: Accept scores
    else Kappa < 0.6
        Consensus->>Scorer: Flag for human review
    end

    BiasCheck->>BiasCheck: Calculate DI by demographic

    alt DI >= 0.8
        BiasCheck->>Storage: Store evaluation
    else DI < 0.8
        BiasCheck->>Storage: Alert + human review flag
    end
```

---

## Key Architectural Decisions

### Decision 1: Cascaded Pipeline vs Native Speech-to-Speech

| Option | Cascaded (ASR → LLM → TTS) | Native (OpenAI Realtime API) |
|--------|---------------------------|------------------------------|
| **Latency** | ~800-1100ms (unoptimized), ~300ms (streaming) | ~300ms native |
| **Control** | Full control over each component | Black box |
| **Explainability** | Complete transcript + decision audit | Limited |
| **Vendor Lock-in** | Mix providers | Single vendor |
| **Cost** | Pay per component | Single pricing |
| **Customization** | Swap ASR/TTS providers | Limited |

**Recommendation:** **Cascaded for enterprise** - compliance requirements demand full audit trails and explainability. Native S2S for consumer-facing applications where latency is paramount.

### Decision 2: WebRTC Topology

| Option | P2P | SFU | MCU |
|--------|-----|-----|-----|
| **Latency** | Lowest | +20-50ms | +50-100ms |
| **Recording** | Complex (client-side) | Easy (server-side) | Easy |
| **Scalability** | 2 participants max | 20-30 participants | 50+ participants |
| **Server Load** | None | Forward only | Mix/transcode |
| **Use Case** | 1:1 interviews | Panel interviews | Large broadcasts |

**Recommendation:** **SFU for most cases** - server-side recording is essential for compliance, and latency overhead is acceptable. P2P only for simple 1:1 with client-side recording.

```mermaid
flowchart LR
    subgraph P2P["P2P (Not Recommended)"]
        C1[Candidate] <--> C2[AI Server]
    end

    subgraph SFU_Arch["SFU (Recommended)"]
        Cand[Candidate] --> SFU_Server[SFU Server]
        SFU_Server --> AI[AI Processing]
        SFU_Server --> Recorder[Recorder]
        AI --> SFU_Server
        SFU_Server --> Cand
    end
```

### Decision 3: ASR Provider Strategy

| Option | Self-Hosted (Whisper) | Cloud (Deepgram) | Hybrid |
|--------|----------------------|------------------|--------|
| **Latency** | 400-500ms | 150ms | Best of both |
| **Privacy** | Full control | Data transmitted | Selective |
| **Cost** | GPU infrastructure | Per-minute pricing | Variable |
| **Accuracy** | Good | Excellent | Excellent |
| **Scaling** | Manual | Auto | Mixed |

**Recommendation:** **Hybrid approach**
- Cloud (Deepgram) for standard interviews - better latency
- Self-hosted (Whisper) for sensitive industries (healthcare, finance)

### Decision 4: LLM Deployment

| Option | Cloud API | Self-Hosted | Hybrid |
|--------|-----------|-------------|--------|
| **Latency** | Variable (network) | Consistent | Optimized |
| **Privacy** | Data leaves infra | Full control | Selective |
| **Cost** | Pay per token | Infrastructure | Variable |
| **Scaling** | Unlimited | Capacity-bound | Mixed |

**Recommendation:** **Hybrid**
- Cloud API for question generation (less sensitive)
- Self-hosted for evaluation (candidate data stays internal)

---

## Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---------|----------|---------------|
| Sync vs Async | Streaming (async chunks) | Real-time conversation requirement |
| Event-driven vs Request-response | Event-driven for speech | Non-blocking pipeline |
| Push vs Pull | Push (server → client) | AI initiates questions |
| Stateful vs Stateless | Stateful sessions | Interview context must persist |
| Read vs Write heavy | Write-heavy (transcripts) | Continuous recording |
| Real-time vs Batch | Real-time speech, batch evaluation | Hybrid based on use case |
| Edge vs Origin | Edge for media, origin for data | Latency optimization |

---

## Component Responsibilities

### Client Layer

| Component | Responsibility |
|-----------|----------------|
| Web Client | WebRTC media, UI rendering, local audio processing |
| Mobile Client | Native WebRTC, push notifications |
| PSTN Gateway | SIP/PSTN bridging for phone interviews |

### Media Edge Layer

| Component | Responsibility |
|-----------|----------------|
| Load Balancer | Route to nearest region, health checks |
| TURN Servers | NAT traversal, relay when P2P fails |
| SFU Cluster | Media routing, recording triggers |
| Recording Service | Capture, encode, store media streams |

### Speech Processing Layer

| Component | Responsibility |
|-----------|----------------|
| Voice Activity Detection | Detect speech boundaries, reduce false triggers |
| Streaming ASR | Convert speech to text in real-time |
| Streaming TTS | Convert text to speech with minimal latency |
| Audio Processing | Noise suppression, echo cancellation, AGC |

### LLM Orchestration Layer

| Component | Responsibility |
|-----------|----------------|
| Interview Conductor | Manage conversation flow, turn-taking |
| Context Manager | Maintain conversation history, job context |
| Question Generator | Generate relevant questions based on context |
| Follow-up Detector | Identify when follow-up questions are needed |

### Evaluation Layer

| Component | Responsibility |
|-----------|----------------|
| Rubric Scorer | Apply evaluation rubric to responses |
| LLM-as-Judge | Generate scores with chain-of-thought reasoning |
| Multi-LLM Consensus | Ensure inter-rater reliability |
| Bias Checker | Monitor disparate impact across demographics |

---

## Multi-Region Deployment

```mermaid
flowchart TB
    subgraph Global["Global Layer"]
        DNS["GeoDNS"]
        GLB["Global Load Balancer"]
    end

    subgraph US["US Region"]
        US_Edge["US Media Edge"]
        US_Speech["US Speech Services"]
        US_LLM["US LLM Cluster"]
        US_DB[(US Database)]
    end

    subgraph EU["EU Region"]
        EU_Edge["EU Media Edge"]
        EU_Speech["EU Speech Services"]
        EU_LLM["EU LLM Cluster"]
        EU_DB[(EU Database)]
    end

    subgraph APAC["APAC Region"]
        APAC_Edge["APAC Media Edge"]
        APAC_Speech["APAC Speech Services"]
        APAC_LLM["APAC LLM Cluster"]
        APAC_DB[(APAC Database)]
    end

    DNS --> GLB
    GLB --> US_Edge
    GLB --> EU_Edge
    GLB --> APAC_Edge

    US_Edge --> US_Speech --> US_LLM --> US_DB
    EU_Edge --> EU_Speech --> EU_LLM --> EU_DB
    APAC_Edge --> APAC_Speech --> APAC_LLM --> APAC_DB

    US_DB <-.->|Async Replication| EU_DB
    EU_DB <-.->|Async Replication| APAC_DB
```

**Data Residency Considerations:**
- EU candidate data stays in EU region (GDPR)
- Recordings stored in candidate's region
- Evaluation results replicated globally for analytics

---

## Technology Stack Summary

| Layer | Primary Technology | Alternatives |
|-------|-------------------|--------------|
| Media Transport | WebRTC + LiveKit | Mediasoup, Janus |
| SFU | LiveKit | Mediasoup, Jitsi |
| TURN | Coturn | Twilio TURN |
| Speech Recognition | Deepgram Nova-3 | AssemblyAI, Whisper |
| Speech Synthesis | ElevenLabs Flash v2.5 | PlayHT, Azure TTS |
| Voice Activity | Silero VAD | WebRTC VAD |
| LLM Inference | OpenAI GPT-4 / Claude | Self-hosted Llama |
| Orchestration | Pipecat | LiveKit Agents, Vapi |
| Database | PostgreSQL | CockroachDB |
| Cache | Redis | Memcached |
| Message Queue | Kafka | RabbitMQ |
| Object Storage | S3-compatible | MinIO |
| Observability | Datadog / Grafana | New Relic |

---

## Integration Points

### External System Integrations

```mermaid
flowchart LR
    subgraph AIInterview["AI Interviewer System"]
        Core["Core Platform"]
    end

    subgraph Inbound["Inbound Integrations"]
        ATS["ATS Systems<br/>(Greenhouse, Lever)"]
        Calendar["Calendar<br/>(Google, Outlook)"]
        HRIS["HRIS<br/>(Workday, BambooHR)"]
    end

    subgraph Outbound["Outbound Integrations"]
        Notify["Notification<br/>(Email, SMS)"]
        Analytics["Analytics<br/>(BI Tools)"]
        Audit["Audit Systems<br/>(SIEM)"]
    end

    ATS -->|Candidate data| Core
    Calendar -->|Availability| Core
    HRIS -->|Job requirements| Core

    Core -->|Results| ATS
    Core -->|Invites| Notify
    Core -->|Metrics| Analytics
    Core -->|Logs| Audit
```

### API Gateway Design

| Endpoint Category | Auth Method | Rate Limit |
|------------------|-------------|------------|
| Public (scheduling) | API Key | 100/min |
| Candidate (interview) | JWT (short-lived) | 10/min |
| Admin (management) | OAuth 2.0 + MFA | 1000/min |
| Webhook (integrations) | HMAC signature | 500/min |
| Internal (services) | mTLS | Unlimited |
