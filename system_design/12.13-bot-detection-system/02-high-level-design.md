# 02 — High-Level Design: Bot Detection System

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        B1[Web Browser]
        B2[Mobile App]
        B3[API Client]
        B4[Bot / Scraper]
    end

    subgraph Edge["Edge Evaluation Layer (CDN PoPs)"]
        EJ[JS Challenge Injector]
        EF[Edge Fingerprint Cache]
        EM[Edge ML Model\nGBT 100 features]
        EB[Edge Bot Decision\nAllow / Challenge / Block]
    end

    subgraph Signal["Signal Ingestion Layer"]
        SB[Beacon Collector\nBehavioral Events]
        SF[Fingerprint Extractor]
        SN[Network Signal Analyzer\nIP · TLS · ASN]
    end

    subgraph Scoring["Real-Time Scoring Service"]
        RS[Feature Assembly\nSession + Network + Device]
        RM[Cloud ML Inference\nNeural Net 500 features]
        RD[Risk Decision Engine\nThreshold + Challenge Router]
    end

    subgraph Session["Session Reputation Store"]
        SC[(Distributed Cache\nSession State)]
        SH[(Fingerprint DB\nDevice History)]
    end

    subgraph Challenge["Challenge-Response Service"]
        CJ[JS Challenge Generator\nPoW + Environment Probe]
        CI[CAPTCHA Issuer\nInteractive Tasks]
        CV[Challenge Verifier\nCryptographic Token Check]
    end

    subgraph ML["ML Platform"]
        MT[Training Pipeline\nDaily Retraining]
        MM[Model Registry\nVersioned Models]
        MS[Shadow Scoring\nA/B Test Engine]
    end

    subgraph Intel["Threat Intelligence"]
        TI[IP Reputation Feeds]
        TB2[Bot Signature DB]
        TH[Honeypot Telemetry]
    end

    subgraph Ops["Operations"]
        OD[Detection Dashboard]
        OA[Alert Manager]
        OL[Audit Log Store]
    end

    B1 & B2 --> EJ
    B3 --> Edge
    B4 --> Edge
    EJ -->|inject JS| B1 & B2
    B1 & B2 -->|behavioral beacon| SB
    B1 & B2 -->|fingerprint payload| SF
    B3 & B4 -->|headers, TLS| SN

    Edge --> EF
    EF -->|cache hit| EB
    EF -->|cache miss| Scoring

    SB & SF & SN --> RS
    RS --> SC & SH
    RS --> RM
    RM --> RD
    RD -->|score + action| EB
    RD --> Challenge

    EB -->|allow| Clients
    EB -->|challenge| Challenge
    EB -->|block| OL

    CV -->|pass| EB
    CV -->|fail| CI

    TI & TB2 & TH --> RS
    MT --> MM --> Edge & RM
    MS --> MT
    OD & OA --> Ops

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class B1,B2,B3,B4 client
    class EJ,EB,RD api
    class SB,SF,SN,RS,RM,CJ,CI,CV,MT,MS service
    class SH,OL,MM,TB2,TH,TI data
    class EF,SC cache
```

---

## Key Design Decisions

### Decision 1: Edge-First Scoring Architecture

**Choice:** Run a lightweight gradient-boosted tree model at CDN edge nodes, making the majority of decisions without any round-trip to a central scoring service.

**Rationale:** At 5M req/sec globally, a centralized scoring service would require thousands of cores and add 30–100ms of latency per request. The majority of traffic (roughly 80%) falls into clearly human (score < 0.2) or clearly bot (score > 0.8) ranges and can be decided in < 2ms at the edge. Only borderline requests (0.2–0.8) escalate to the cloud deep model.

**Tradeoff:** Edge models must be small (< 10MB) and retrained frequently to push updates to hundreds of PoPs within 5 minutes. This constrains model complexity; the full deep model's accuracy gains can only be realized for the borderline fraction of traffic.

### Decision 2: Fail-Open on Scoring System Failure

**Choice:** When the scoring service is unavailable, edge nodes default to allowing requests through rather than blocking.

**Rationale:** The alternative—fail closed (block all traffic on failure)—would cause a site-wide outage any time the scoring system degrades. Since the scoring system is in the critical path of every request, its failure mode must favor availability over security. A brief window of degraded bot protection is recoverable; blocking all legitimate users is catastrophic for revenue.

**Tradeoff:** A targeted outage of the scoring service (via DDoS of the scorer itself) could be used as a bot evasion technique. Mitigated by defense-in-depth: WAF, rate limiting, and IP blocklists remain active even when ML scoring is unavailable.

### Decision 3: Probabilistic Risk Score Instead of Binary Verdict

**Choice:** Expose a continuous [0.0, 1.0] risk score rather than a binary allow/block decision, and let each product team configure their own thresholds.

**Rationale:** Different endpoints have different bot-tolerance tradeoffs. A public blog homepage can tolerate more bot traffic (SEO crawlers are valuable); a checkout endpoint should be extremely aggressive. A single binary verdict cannot accommodate this diversity. The score-based model lets each endpoint owner tune the challenge threshold and block threshold independently.

**Tradeoff:** Requires that downstream systems integrate the score rather than a simple boolean. Increases integration complexity. Threshold misconfiguration (too aggressive) can spike false positives; threshold too permissive misses bots.

### Decision 4: JavaScript Challenge as Primary Signal Amplifier

**Choice:** The primary detection mechanism is a JavaScript challenge injected into page responses that runs inside the browser and returns a signed payload of environment probes, proof-of-work solutions, and behavioral measurements.

**Rationale:** Server-side signals alone (IP, headers, TLS) are easily spoofed. JavaScript executing inside the browser can probe the execution environment in ways that are much harder to fake convincingly—WebGL renderer enumeration, AudioContext oscillator response, timing of cryptographic operations, presence/absence of browser APIs, and behavioral signals that only make sense with a real human and a real browser. This creates a qualitatively richer signal than header analysis.

**Tradeoff:** Requires JavaScript execution, so it cannot evaluate non-browser API clients directly. API clients are evaluated via header/TLS signals only, which are weaker. Requires careful async execution to avoid blocking page load; the JS challenge runs after page paint.

### Decision 5: Session Reputation with Decaying Trust

**Choice:** Maintain a session-level trust score that accumulates evidence across all requests in a session and decays exponentially during idle periods.

**Rationale:** Single-request evaluation is stateless and misses bot patterns that are only visible over time—e.g., an automated form-filler that navigates at superhuman speed, or a browser farm that rotates fingerprints every 5 requests. Session-level state allows the system to detect these sequential patterns and avoid re-challenging users who have recently verified their humanity.

**Tradeoff:** Requires a distributed session store with sub-millisecond reads at every edge PoP. The session store becomes a critical dependency. If the session store is unavailable, the system falls back to per-request evaluation with a neutral prior.

---

## Data Flow: Request Evaluation

```mermaid
flowchart LR
    subgraph Req["Incoming Request"]
        R1[HTTP Headers\nTLS Fingerprint]
        R2[Session Cookie\nor Token]
    end

    subgraph Edge["Edge Node"]
        E1{Session\nCached?}
        E2[Load Session\nRisk Score]
        E3[IP Reputation\nASN Check]
        E4[Edge ML\nInference]
        E5{Score\nRange?}
    end

    subgraph Actions["Action"]
        A1[Allow]
        A2[JS Challenge]
        A3[Cloud Deep\nML Evaluate]
        A4[Interactive\nCAPTCHA]
        A5[Block]
    end

    R1 & R2 --> E1
    E1 -->|hit| E2
    E1 -->|miss| E3
    E2 & E3 --> E4
    E4 --> E5
    E5 -->|score < 0.2| A1
    E5 -->|score 0.2–0.4| A2
    E5 -->|score 0.4–0.7| A3
    A3 -->|refined score < 0.5| A1
    A3 -->|refined score 0.5–0.8| A4
    A3 -->|refined score > 0.8| A5
    E5 -->|score > 0.8| A5

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class R1,R2 client
    class E1,E2,E3,E4,E5 api
    class A1,A2,A3,A4,A5 service
```

---

## Data Flow: JavaScript Challenge Pipeline

```mermaid
flowchart LR
    subgraph Browser["Browser"]
        BC[Page Loads]
        BJ[JS Challenge\nExecutes Async]
        BP[Behavioral\nEvents Captured]
        BB[Beacon Sent\nto Collector]
    end

    subgraph Server["Server Side"]
        SC[Challenge Script\nInjected into HTML]
        SB[Beacon Collector\nIngests Events]
        SF[Feature Extractor\nAggregates Signals]
        SS[Scoring Service\nUpdates Session Score]
        SV[Challenge Verifier\nPoW Validates Token]
    end

    BC --> SC
    SC --> BJ
    BJ -->|probe results| BB
    BP --> BB
    BB --> SB
    SB --> SF
    SF --> SS
    BJ -->|PoW solution| SV
    SV -->|signed token| BC

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class BC,BJ,BP,BB client
    class SC,SB,SF,SS,SV service
```

---

## Data Flow: ML Training Pipeline

```mermaid
flowchart TB
    subgraph Sources["Data Sources"]
        DS1[Behavioral Event Store\n50B vectors/day]
        DS2[Labeled Sessions\nHuman vs Bot]
        DS3[Challenge Outcomes\nPass / Fail]
        DS4[False Positive Reports\nAppeal Data]
    end

    subgraph Pipeline["Training Pipeline - Daily"]
        P1[Feature Engineering\nAggregation + Normalization]
        P2[Train/Validation Split\n80/20 stratified]
        P3[Edge Model Training\nGBT 100 features]
        P4[Deep Model Training\nNeural Net 500 features]
        P5[Calibration\nIsotonic Regression]
        P6[Shadow Scoring\nA/B Test on 5% Traffic]
        P7[Threshold Optimization\nFPR/FNR Tuning]
    end

    subgraph Deploy["Deployment"]
        D1[Model Registry\nVersioned Artifacts]
        D2[Edge Rollout\n5-min propagation]
        D3[Cloud Model Update\nBlue-Green Deploy]
    end

    DS1 & DS2 & DS3 & DS4 --> P1
    P1 --> P2
    P2 --> P3 & P4
    P3 & P4 --> P5
    P5 --> P6
    P6 -->|metrics OK| P7
    P7 --> D1
    D1 --> D2 & D3

    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class DS1,DS2,DS3,DS4 data
    class P1,P2,P3,P4,P5,P6,P7 service
    class D1,D2,D3 cache
```
