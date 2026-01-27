# High-Level Design

## System Architecture Overview

The AI Voice Assistant architecture is organized into six distinct layers, spanning from on-device processing to cloud-based services. This hybrid approach balances latency, accuracy, and privacy requirements.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI Voice Assistant Architecture                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │                         1. DEVICE LAYER                                 ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ ││
│  │  │  Smart   │  │  Mobile  │  │   Car    │  │ Wearable │  │  Smart   │ ││
│  │  │ Speaker  │  │  Phone   │  │Infotain. │  │  Watch   │  │   TV     │ ││
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ ││
│  │       │             │             │             │             │        ││
│  │       └─────────────┴─────────────┴─────────────┴─────────────┘        ││
│  │                                   │                                     ││
│  │                      ┌────────────┴────────────┐                       ││
│  │                      │   ON-DEVICE ENGINE      │                       ││
│  │                      │  • Wake Word (DSP/NPU)  │                       ││
│  │                      │  • VAD (Voice Activity) │                       ││
│  │                      │  • Audio Encoder (Opus) │                       ││
│  │                      │  • Local NLU (optional) │                       ││
│  │                      │  • Offline Skills       │                       ││
│  │                      └────────────┬────────────┘                       ││
│  └───────────────────────────────────│────────────────────────────────────┘│
│                                      │ Encrypted Audio Stream               │
│                                      ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │                       2. EDGE/GATEWAY LAYER                             ││
│  │                                                                         ││
│  │     ┌─────────────────────────────────────────────────────────────┐    ││
│  │     │                   REGIONAL GATEWAY                           │    ││
│  │     │  • TLS 1.3 Termination    • Device Authentication           │    ││
│  │     │  • WebSocket Management   • Request Routing                 │    ││
│  │     │  • Rate Limiting          • DDoS Protection                 │    ││
│  │     └─────────────────────────────────────────────────────────────┘    ││
│  └────────────────────────────────────┬───────────────────────────────────┘│
│                                       │                                     │
│  ┌────────────────────────────────────▼───────────────────────────────────┐│
│  │                    3. SPEECH PROCESSING LAYER                           ││
│  │                                                                         ││
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                   ││
│  │  │  STREAMING  │   │  ACOUSTIC   │   │  LANGUAGE   │                   ││
│  │  │     ASR     │──▶│    MODEL    │──▶│    MODEL    │                   ││
│  │  │  (RNN-T)    │   │ (Conformer) │   │ (Rescoring) │                   ││
│  │  └─────────────┘   └─────────────┘   └─────────────┘                   ││
│  │         │                                    │                          ││
│  │         │         Partial Transcripts        │ Final Transcript         ││
│  │         └─────────────▶ ◯ ◀──────────────────┘                          ││
│  └────────────────────────────────────┬───────────────────────────────────┘│
│                                       │                                     │
│  ┌────────────────────────────────────▼───────────────────────────────────┐│
│  │                        4. NLU LAYER                                     ││
│  │                                                                         ││
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                   ││
│  │  │   INTENT    │   │    SLOT     │   │   ENTITY    │                   ││
│  │  │ CLASSIFIER  │   │   FILLER    │   │ RESOLUTION  │                   ││
│  │  │ (JointBERT) │   │  (BIO Tags) │   │  (Linking)  │                   ││
│  │  └─────────────┘   └─────────────┘   └─────────────┘                   ││
│  │         │                │                  │                           ││
│  │         └────────────────┴──────────────────┘                           ││
│  │                          │                                              ││
│  │              Intent + Slots + Entities                                  ││
│  └────────────────────────────────────┬───────────────────────────────────┘│
│                                       │                                     │
│  ┌────────────────────────────────────▼───────────────────────────────────┐│
│  │                   5. DIALOGUE MANAGEMENT LAYER                          ││
│  │                                                                         ││
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                   ││
│  │  │  CONTEXT    │   │   POLICY    │   │    LLM      │                   ││
│  │  │  TRACKER    │   │  SELECTOR   │   │   ROUTER    │                   ││
│  │  │ (Dialogue   │   │  (Skill     │   │ (Alexa+/    │                   ││
│  │  │   State)    │   │  Selection) │   │  Gemini)    │                   ││
│  │  └─────────────┘   └─────────────┘   └─────────────┘                   ││
│  │         │                │                  │                           ││
│  │         └────────────────┴──────────────────┘                           ││
│  │                          │                                              ││
│  │              Skill Selection Decision                                   ││
│  └────────────────────────────────────┬───────────────────────────────────┘│
│                                       │                                     │
│  ┌────────────────────────────────────▼───────────────────────────────────┐│
│  │                    6. SKILL EXECUTION LAYER                             ││
│  │                                                                         ││
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐           ││
│  │  │ 1P SKILLS │  │ 3P SKILLS │  │SMART HOME │  │  LLM CHAT │           ││
│  │  │ (Weather, │  │ (Lambda/  │  │ (Zigbee,  │  │ (Gemini,  │           ││
│  │  │  Music)   │  │  Webhook) │  │  Matter)  │  │  Claude)  │           ││
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘           ││
│  │        │              │              │              │                   ││
│  │        └──────────────┴──────────────┴──────────────┘                   ││
│  │                                │                                        ││
│  │                        Skill Response                                   ││
│  └────────────────────────────────┬───────────────────────────────────────┘│
│                                   │                                         │
│  ┌────────────────────────────────▼───────────────────────────────────────┐│
│  │                   7. RESPONSE GENERATION LAYER                          ││
│  │                                                                         ││
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                   ││
│  │  │    NLG      │   │  STREAMING  │   │   AUDIO     │                   ││
│  │  │ (Template/  │──▶│    TTS      │──▶│  ENCODER    │                   ││
│  │  │   LLM)      │   │   (VITS)    │   │   (Opus)    │                   ││
│  │  └─────────────┘   └─────────────┘   └─────────────┘                   ││
│  │                                             │                           ││
│  │                                    Audio Stream to Device               ││
│  └─────────────────────────────────────────────┼───────────────────────────┘│
│                                                │                            │
│                                                ▼                            │
│                                    ┌──────────────────┐                    │
│                                    │  Device Playback │                    │
│                                    └──────────────────┘                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Layer | Component | Responsibility | Key Technologies |
|-------|-----------|----------------|------------------|
| **Device** | Wake Word Engine | Always-on trigger detection | CNN + MFCC, DSP/NPU |
| **Device** | VAD | Detect speech vs silence | Energy-based, WebRTC VAD |
| **Device** | Audio Encoder | Compress audio for transmission | Opus codec @ 32kbps |
| **Device** | Local NLU | Offline command processing | TensorFlow Lite, ONNX |
| **Edge** | Gateway | Connection management, auth | Envoy, custom WebSocket |
| **Speech** | ASR Engine | Streaming speech-to-text | Conformer + RNN-T |
| **Speech** | Language Model | Transcription rescoring | N-gram, neural LM |
| **NLU** | Intent Classifier | Determine user intent | JointBERT, DIET |
| **NLU** | Slot Filler | Extract parameters | BIO tagging, CRF |
| **NLU** | Entity Resolver | Link to knowledge base | Entity embeddings |
| **Dialogue** | Context Tracker | Maintain conversation state | Session store, Redis |
| **Dialogue** | Policy Selector | Choose action/skill | Rule-based + ML |
| **Dialogue** | LLM Router | Route to LLM for complex queries | Confidence threshold |
| **Skills** | First-Party | Core functionality | Microservices |
| **Skills** | Third-Party | Developer ecosystem | Serverless functions |
| **Skills** | Smart Home | Device control | Matter, Zigbee, WiFi |
| **Response** | NLG | Generate natural response | Templates + LLM |
| **Response** | TTS Engine | Synthesize speech | VITS, FastSpeech2 |

---

## Data Flow Diagrams

### Voice Command Flow (Happy Path)

```mermaid
sequenceDiagram
    participant U as User
    participant D as Device
    participant G as Gateway
    participant ASR as ASR Service
    participant NLU as NLU Service
    participant DM as Dialogue Manager
    participant S as Skill Service
    participant TTS as TTS Service

    U->>D: "Alexa, what's the weather?"
    Note over D: Wake word detected (on-device)
    D->>D: Start audio capture
    D->>G: WebSocket: Audio stream (Opus)

    G->>ASR: Forward audio chunks
    ASR-->>G: Partial: "what's the"
    ASR-->>G: Partial: "what's the weather"
    ASR->>G: Final: "what's the weather"

    G->>NLU: Transcript
    NLU->>NLU: Intent: GetWeather, Slots: {}
    NLU->>DM: Intent + Slots

    DM->>DM: Check context, select skill
    DM->>S: Invoke WeatherSkill
    S->>S: Fetch weather data
    S->>DM: Response: "72°F and sunny"

    DM->>TTS: Generate speech
    TTS-->>G: Audio stream (chunked)
    G-->>D: Audio stream
    D->>U: "It's 72 degrees and sunny"
```

### Multi-Turn Conversation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant D as Device
    participant DM as Dialogue Manager
    participant S as Music Skill

    U->>D: "Alexa, play some music"
    D->>DM: Intent: PlayMusic, Slots: {}
    DM->>DM: Missing required slot: genre
    DM->>D: "What kind of music?"

    Note over D: Follow-up mode enabled (8s)

    U->>D: "Jazz"
    Note over D: No wake word needed
    D->>DM: Intent: FollowUp, Slots: {genre: jazz}
    DM->>DM: Merge with previous context
    DM->>S: PlayMusic(genre="jazz")
    S->>D: Start playback + "Playing jazz music"
```

### Smart Home Control Flow

```mermaid
sequenceDiagram
    participant U as User
    participant D as Echo Device
    participant DM as Dialogue Manager
    participant SH as Smart Home Service
    participant Hub as Zigbee Hub
    participant L as Light Bulb

    U->>D: "Alexa, turn off living room lights"
    D->>DM: Intent: SmartHome, Action: TurnOff, Device: living room lights

    DM->>SH: Resolve device group
    SH->>SH: Find devices: [light1, light2, light3]

    par Parallel device control
        SH->>Hub: TurnOff(light1)
        SH->>Hub: TurnOff(light2)
        SH->>Hub: TurnOff(light3)
    end

    Hub->>L: Zigbee command
    L-->>Hub: ACK
    Hub-->>SH: Success

    SH->>DM: All devices off
    DM->>D: "Okay" (earcon + brief confirmation)
```

### LLM Routing Flow (Alexa+ Style)

```mermaid
sequenceDiagram
    participant U as User
    participant NLU as NLU Service
    participant R as LLM Router
    participant TS as Traditional Skill
    participant LLM as LLM Service

    U->>NLU: "What caused the French Revolution?"
    NLU->>NLU: Intent: GeneralQuestion (confidence: 0.6)
    NLU->>R: Intent + confidence

    R->>R: Confidence < 0.8? Route to LLM
    R->>LLM: Complex query
    LLM->>LLM: Generate grounded response
    LLM->>R: Detailed historical answer
    R->>U: Spoken response

    Note over U,LLM: Different flow for high-confidence intents

    U->>NLU: "Set a timer for 5 minutes"
    NLU->>NLU: Intent: SetTimer (confidence: 0.98)
    NLU->>R: Intent + confidence
    R->>R: Confidence >= 0.8? Use traditional
    R->>TS: SetTimer(duration=5min)
    TS->>U: "Timer set for 5 minutes"
```

---

## Key Architectural Decisions

| Decision | Choice | Rationale | Alternatives Considered |
|----------|--------|-----------|------------------------|
| **Wake Word Location** | On-device (DSP/NPU) | Privacy: no pre-wake audio sent; Latency: instant response | Cloud-based (higher accuracy but privacy risk) |
| **ASR Architecture** | Conformer + RNN-T | Best streaming accuracy; Low latency | Transformer (non-streaming), Whisper (offline) |
| **NLU Approach** | Joint intent + slot | Single model, end-to-end training | Separate intent and slot models |
| **Dialogue State** | Session-based Redis | Fast access, TTL for cleanup | PostgreSQL (slower), in-memory (no persistence) |
| **Skill Invocation** | Async with timeout | Non-blocking, graceful degradation | Sync (simpler but risky) |
| **TTS Model** | VITS | Best quality/speed trade-off | FastSpeech2 (faster), Tacotron2 (slower, higher quality) |
| **LLM Integration** | Routing-based hybrid | Cost-effective, deterministic where possible | Full LLM replacement (expensive, unpredictable) |
| **Smart Home Protocol** | Matter + legacy bridges | Industry standard, future-proof | Proprietary only (vendor lock-in) |

### Architecture Pattern Checklist

| Pattern | Decision | Notes |
|---------|----------|-------|
| Sync vs Async | **Async** | Skills execute asynchronously with timeouts |
| Event-driven vs Request-response | **Hybrid** | Events for real-time, request-response for skills |
| Push vs Pull | **Push** | Audio/responses pushed via WebSocket |
| Stateless vs Stateful | **Stateful** | Dialogue state maintained per session |
| Read-heavy vs Write-heavy | **Read-heavy** | Most queries read skill responses |
| Real-time vs Batch | **Real-time** | Voice requires immediate response |
| Edge vs Origin | **Hybrid** | Wake word on edge, ASR in cloud/edge |

---

## Multi-Region Deployment Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Global Voice Assistant Deployment                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         ┌───────────────────┐                               │
│                         │  GLOBAL CONTROL   │                               │
│                         │      PLANE        │                               │
│                         │  • User profiles  │                               │
│                         │  • Skill catalog  │                               │
│                         │  • Model registry │                               │
│                         └─────────┬─────────┘                               │
│                                   │                                          │
│           ┌───────────────────────┼───────────────────────┐                 │
│           │                       │                       │                  │
│           ▼                       ▼                       ▼                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   US-EAST       │    │   EU-WEST       │    │   AP-SOUTH      │         │
│  │   (Virginia)    │    │   (Ireland)     │    │   (Mumbai)      │         │
│  │                 │    │                 │    │                 │         │
│  │ • ASR Cluster   │    │ • ASR Cluster   │    │ • ASR Cluster   │         │
│  │ • NLU Service   │    │ • NLU Service   │    │ • NLU Service   │         │
│  │ • TTS Cluster   │    │ • TTS Cluster   │    │ • TTS Cluster   │         │
│  │ • Skill Runtime │    │ • Skill Runtime │    │ • Skill Runtime │         │
│  │ • Session Store │    │ • Session Store │    │ • Session Store │         │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘         │
│           │                      │                      │                   │
│           ▼                      ▼                      ▼                   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │  Edge PoPs      │    │  Edge PoPs      │    │  Edge PoPs      │         │
│  │  (50+ cities)   │    │  (30+ cities)   │    │  (20+ cities)   │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Regional Deployment Table

| Region | Primary Use | Languages | Data Residency |
|--------|-------------|-----------|----------------|
| **US-EAST** | North America | English, Spanish | US users |
| **US-WEST** | North America (backup) | English, Spanish | US users |
| **EU-WEST** | Europe | EN, DE, FR, IT, ES | GDPR compliance |
| **EU-CENTRAL** | Europe (backup) | EN, DE, FR, IT, ES | GDPR compliance |
| **AP-SOUTH** | India, Middle East | EN, Hindi, Arabic | Local laws |
| **AP-NORTHEAST** | Japan, Korea | Japanese, Korean | Local laws |
| **AP-SOUTHEAST** | Australia, SEA | English | Local laws |

### Data Flow Across Regions

| Data Type | Flow Pattern | Replication |
|-----------|--------------|-------------|
| **User Profiles** | Read local, write to primary | Async replication, eventual consistency |
| **Conversation History** | Region-local | No cross-region replication |
| **Skill Catalog** | Global publish, local cache | CDN distribution |
| **ASR/TTS Models** | Global publish, local storage | Periodic sync |
| **Analytics Events** | Local collection, global aggregation | Batch sync hourly |

---

## System Architecture Diagram (Mermaid)

```mermaid
flowchart TB
    subgraph Device["Device Layer"]
        direction TB
        MIC[Microphone]
        WW[Wake Word Engine]
        VAD[Voice Activity Detection]
        AE[Audio Encoder]
        SPK[Speaker]
    end

    subgraph Edge["Edge Gateway"]
        GW[WebSocket Gateway]
        AUTH[Device Auth]
        RL[Rate Limiter]
    end

    subgraph Speech["Speech Processing"]
        ASR[Streaming ASR]
        AM[Acoustic Model]
        LM[Language Model]
    end

    subgraph NLU["Natural Language Understanding"]
        IC[Intent Classifier]
        SF[Slot Filler]
        ER[Entity Resolver]
    end

    subgraph Dialogue["Dialogue Management"]
        CT[Context Tracker]
        PS[Policy Selector]
        LLMRouter[LLM Router]
    end

    subgraph Skills["Skill Execution"]
        FP[First-Party Skills]
        TP[Third-Party Skills]
        SH[Smart Home]
        LLMS[LLM Service]
    end

    subgraph Response["Response Generation"]
        NLG[NLG Engine]
        TTS[TTS Engine]
        AENC[Audio Encoder]
    end

    subgraph Data["Data Stores"]
        SESS[(Session Store)]
        PROF[(User Profiles)]
        SCAT[(Skill Catalog)]
    end

    MIC --> WW
    WW --> VAD
    VAD --> AE
    AE --> GW
    GW --> AUTH
    AUTH --> RL
    RL --> ASR
    ASR --> AM
    AM --> LM
    LM --> IC
    IC --> SF
    SF --> ER
    ER --> CT
    CT --> PS
    PS --> LLMRouter
    LLMRouter --> FP
    LLMRouter --> TP
    LLMRouter --> SH
    LLMRouter --> LLMS
    FP --> NLG
    TP --> NLG
    SH --> NLG
    LLMS --> NLG
    NLG --> TTS
    TTS --> AENC
    AENC --> GW
    GW --> SPK

    CT <--> SESS
    PS <--> PROF
    PS <--> SCAT

    classDef device fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class MIC,WW,VAD,AE,SPK device
    class GW,AUTH,RL edge
    class ASR,AM,LM,IC,SF,ER,CT,PS,LLMRouter,FP,TP,SH,LLMS,NLG,TTS,AENC service
    class SESS,PROF,SCAT data
```

---

## Integration Points

### External Service Integrations

| Integration | Purpose | Protocol | SLA Requirement |
|-------------|---------|----------|-----------------|
| **Music Providers** | Spotify, Apple Music | REST API, OAuth2 | <500ms, 99.9% |
| **Weather Services** | Weather data | REST API | <200ms, 99.9% |
| **Smart Home** | Device control | Matter, Zigbee, REST | <100ms, 99.95% |
| **LLM Providers** | Complex queries | REST API, streaming | <2s, 99.5% |
| **Maps/Location** | Location-based queries | REST API | <300ms, 99.9% |
| **News Providers** | News briefings | RSS, REST API | <500ms, 99.5% |
| **Calendar** | Schedule management | CalDAV, REST | <300ms, 99.9% |

### Internal Service Communication

| Communication | Pattern | Protocol | Notes |
|---------------|---------|----------|-------|
| Device ↔ Gateway | Bidirectional streaming | WebSocket over TLS | Persistent connection |
| Gateway ↔ ASR | Streaming | gRPC streaming | Chunked audio |
| ASR ↔ NLU | Request-response | gRPC | Transcript payload |
| NLU ↔ Dialogue | Request-response | gRPC | Intent + slots |
| Dialogue ↔ Skills | Async request | Message queue | With timeout |
| Skills ↔ Response | Callback | Message queue | Async response |
| TTS ↔ Gateway | Streaming | gRPC streaming | Chunked audio |

---

## Technology Stack Summary

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Device Runtime** | C/C++, TensorFlow Lite | Performance-critical, low power |
| **Gateway** | Go, Envoy | High concurrency, efficient |
| **ASR/TTS** | Python, PyTorch, CUDA | ML framework ecosystem |
| **NLU** | Python, Transformers | Hugging Face ecosystem |
| **Dialogue** | Go/Python | Business logic flexibility |
| **Skills Runtime** | Node.js, Python | Developer ecosystem |
| **Session Store** | Redis Cluster | Low latency, TTL support |
| **User Store** | PostgreSQL | ACID, relations |
| **Skill Catalog** | PostgreSQL + CDN | Consistency + distribution |
| **Message Queue** | Apache Kafka | High throughput, durability |
| **Observability** | OpenTelemetry, Prometheus | Industry standard |
