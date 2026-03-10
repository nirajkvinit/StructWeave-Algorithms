# 13.3 AI-Native Energy & Grid Management Platform — High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Sources["Data Sources"]
        SCADA[SCADA / RTU\nSubstation Telemetry]
        AMI[AMI Head-End\nSmart Meter Reads]
        WX[Weather Feeds\nNWP + Satellite + Radar]
        DER[DER Devices\nSolar / Battery / EV / HVAC]
        MKT[Market Data\nPrices + Schedules]
        SAT[Satellite Imagery\nVegetation + Infrastructure]
    end

    subgraph Gateway["Ingestion & Gateway Layer"]
        SGWY[SCADA Gateway\nDNP3 / IEC 61850 Protocol]
        AGWY[AMI Ingestion Gateway\nMesh Radio / Cellular / PLC]
        DGWY[DER Communication Gateway\nIEEE 2030.5 / OpenADR 3.0]
        MGWY[Market API Gateway\nBid Submission + Settlement]
    end

    subgraph Stream["Stream Processing Layer"]
        SEP[State Estimation Processor\nWeighted Least Squares]
        MEP[Meter Event Processor\nVEE + Anomaly Detection]
        DEP[DER Telemetry Processor\nAvailability + SoC Tracking]
        WXP[Weather Data Processor\nNWP Ensemble Fusion]
    end

    subgraph Core["Core Intelligence Services"]
        OPF[Grid Optimization Engine\nOPF + Contingency Analysis]
        RFS[Renewable Forecast Service\nEnsemble Probabilistic]
        DRO[Demand Response Orchestrator\nSignal Dispatch + Verification]
        VPP[VPP Dispatch Controller\nPortfolio Optimization]
        OPD[Outage Prediction Service\nFailure Probability Models]
        MBO[Market Bidding Optimizer\nStochastic Co-optimization]
    end

    subgraph Analytics["Analytics & Detection Layer"]
        THF[Theft Detection Engine\nConsumption Pattern Analysis]
        LDA[Load Disaggregation\nAppliance-Level Analytics]
        FLR[FLISR Controller\nFault Location + Isolation]
        SDF[Storm Damage Forecaster\nWeather + Vulnerability Models]
    end

    subgraph Data["Data Layer"]
        TSS[(Time-Series Store\nSCADA + AMI Telemetry)]
        GRD[(Grid Model DB\nNetwork Topology)]
        DDB[(DER Registry\nDevice State + Enrollment)]
        FCS[(Forecast Store\nRenewable Predictions)]
        MKS[(Market Position Store\nBids + Settlements)]
        AUD[(Audit Store\nControl Actions + Compliance)]
    end

    subgraph Consumer["Consumer Layer"]
        OPR[Grid Operator Console\nControl Room HMI]
        DRP[DR Program Portal\nCustomer Enrollment]
        CDA[Customer Dashboard\nUsage + Solar + EV Analytics]
        MKD[Market Trader Dashboard\nPositions + P&L]
        CRW[Field Crew App\nOutage + Restoration]
    end

    SCADA --> SGWY
    AMI --> AGWY
    WX & SAT --> WXP
    DER --> DGWY
    MKT --> MGWY

    SGWY --> SEP
    AGWY --> MEP
    DGWY --> DEP

    SEP --> OPF & FLR
    MEP --> THF & LDA
    DEP --> VPP & DRO
    WXP --> RFS & SDF

    OPF --> GRD & OPR
    RFS --> FCS & MBO & VPP
    DRO --> DDB & DRP
    VPP --> MBO & DDB
    OPD --> CRW & OPR
    MBO --> MKS & MKD
    FLR --> OPR & CRW

    SEP --> TSS
    MEP --> TSS
    DEP --> TSS
    OPF --> AUD
    VPP --> AUD
    DRO --> AUD
    THF --> AUD

    LDA --> CDA
    DRP --> DGWY

    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef consumer fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class SCADA,AMI,WX,DER,MKT,SAT source
    class SGWY,AGWY,DGWY,MGWY gateway
    class SEP,MEP,DEP,WXP,OPF,RFS,DRO,VPP,OPD,MBO,THF,LDA,FLR,SDF service
    class TSS,GRD,DDB,FCS,MKS,AUD data
    class OPR,DRP,CDA,MKD,CRW consumer
```

---

## Key Design Decisions

### Decision 1: Dual-Plane Architecture — IT/OT Separation with Controlled Data Flow

The platform enforces strict separation between the operational technology (OT) plane (SCADA, grid control, DER dispatch) and the information technology (IT) plane (analytics, forecasting, market operations, customer applications). Data flows from OT to IT through a unidirectional data diode or DMZ-based transfer mechanism; control commands flow from IT to OT only through a hardened command gateway with rate limiting, schema validation, and operator approval workflows. This separation is not just a security best practice—it is a NERC CIP regulatory requirement that mandates network segmentation between BES (Bulk Electric System) cyber systems and corporate IT networks.

**Implication:** The grid optimization engine and FLISR controller run within the OT plane with local compute and storage, operating autonomously during IT-OT link failures. The renewable forecast service, market bidding optimizer, and customer analytics run on the IT plane. VPP dispatch straddles both planes: portfolio optimization runs on IT, but dispatch signal issuance passes through the OT command gateway with per-signal validation. This dual-plane architecture doubles infrastructure cost but is non-negotiable for regulatory compliance.

### Decision 2: Streaming AMI Pipeline with Lambda Architecture for Theft Detection

Smart meter data flows through a lambda architecture: the speed layer processes meter readings in real-time for voltage monitoring, outage detection, and load disaggregation (latency: <60 seconds); the batch layer runs daily theft detection models against 90-day consumption histories for each meter (latency: 24 hours; higher accuracy). The speed layer catches sudden anomalies (meter disconnect/reconnect patterns, impossible consumption drops); the batch layer catches slow-drift fraud (gradual consumption reduction indicating meter tampering). Both layers publish alerts to a unified alert stream, deduplicated by meter ID and anomaly type.

**Implication:** The AMI ingestion gateway must handle 960M readings/day (11,111 readings/sec baseline, 120,000/sec at evening peak). The speed layer uses a streaming framework with per-meter partitioning; the batch layer runs on a distributed analytics engine with columnar storage. The theft detection model operates on per-meter feature vectors (90-day rolling statistics, neighbor comparison, weather-normalized consumption) computed incrementally as new readings arrive.

### Decision 3: Hierarchical VPP Aggregation with Probabilistic Availability Modeling

DERs are not aggregated as simple capacity sums. Each DER has a probabilistic availability model: an EV enrolled in V2G has a departure probability curve based on historical plug-in patterns; a home battery's available capacity depends on the homeowner's self-consumption priority and current state of charge (SoC); a smart thermostat's curtailment capacity depends on current indoor temperature and customer comfort settings. The VPP controller aggregates these probabilistic availability models into a portfolio-level capacity distribution, and bids into energy and ancillary service markets at confidence-adjusted quantities (e.g., bid P90 available capacity for frequency regulation, where delivery failure incurs penalties; bid P50 for day-ahead energy, where over-delivery is simply sold at spot price).

**Implication:** The DER registry must maintain real-time state for 5M+ devices (SoC, connectivity, enrollment status, historical availability patterns). The VPP optimization layer solves a stochastic portfolio optimization problem: maximize expected revenue across energy + ancillary markets, subject to probabilistic delivery constraints, battery degradation limits, and customer comfort guarantees. This is solved using scenario-based stochastic programming with 100–500 renewable generation scenarios.

### Decision 4: Continuous N-1 Contingency Screening with Pre-Armed Remedial Actions

The grid optimization engine does not just solve OPF for current conditions—it simultaneously evaluates what would happen if any single major element (generator, transmission line, transformer) were to trip. For each of the 5,000+ N-1 contingency cases, a simplified DC power flow determines whether the remaining system can carry the load without thermal violations or voltage collapse. When a contingency case shows a violation, the engine pre-computes a remedial action scheme (RAS): a set of control actions (generation redispatch, load shedding, topology switching) that would restore the system to a secure state within the post-contingency time limit. These RAS are "armed" in the control system and execute automatically if the contingency actually occurs.

**Implication:** Contingency screening must complete within the SCADA cycle (4 seconds) for the reduced set of critical contingencies (top 500 by severity), and within 30 seconds for the full N-1 set. This requires parallelized DC power flow solves across a dedicated compute cluster. The RAS arming mechanism must guarantee that pre-computed actions are still valid when executed (the grid state may have changed between RAS computation and contingency occurrence), requiring a validity check before execution.

### Decision 5: Ensemble NWP Post-Processing for Probabilistic Renewable Forecasting

Rather than relying on a single weather model, the renewable forecast service ingests output from 5–10 numerical weather prediction (NWP) models (GFS, ECMWF, NAM, HRRR, and regional models), each with different physics parameterizations, resolutions, and update frequencies. A gradient-boosted quantile regression model is trained on 3 years of historical NWP forecasts versus actual generation, learning the systematic biases and errors of each NWP model across different weather regimes, seasons, and times of day. The post-processing model produces calibrated probabilistic forecasts (quantiles P10 through P90) that outperform any single NWP model.

**Implication:** The forecast service must maintain real-time feeds from multiple NWP providers, each with different data formats, update schedules, and grid resolutions. The post-processing model must be retrained monthly as NWP models are updated by meteorological agencies (model changes alter bias characteristics). A dedicated ramp event detector runs as a post-filter: when the forecast shows >30% generation change within 60 minutes, a ramp alert is issued to the grid operator and the OPF engine increases spinning reserve requirements.

---

## Data Flow: SCADA Cycle — State Estimation to Dispatch

```mermaid
flowchart LR
    A[SCADA Scan\nRaw Measurements\n50K points / 4s] --> B[Topology Processor\nBreaker Status → \nNetwork Model Update]
    B --> C[State Estimator\nWeighted Least Squares\nBad Data Detection]
    C --> D[OPF Solver\nSOCP Relaxation\nMin-Cost Dispatch]
    D --> E{N-1 Screening\nContingency\nViolations?}
    E -->|Yes| F[RAS Computation\nRemedial Actions\nPre-arm Controls]
    E -->|No| G[Dispatch Signals\nGenerator Set Points\nTap Positions]
    F --> G
    G --> H[SCADA Output\nDNP3 Commands\nto RTUs]

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef output fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class A input
    class B,C,D,F process
    class E decision
    class G,H output
```

---

## Data Flow: VPP Dispatch Cycle

```mermaid
flowchart TB
    A[Renewable Forecast\nProbabilistic Generation] --> B[Market Position\nDay-Ahead + Real-Time]
    C[DER Availability\nProbabilistic per Device] --> D[Portfolio Optimizer\nStochastic Co-optimization]
    B --> D
    A --> D
    D --> E[Bid Generation\nEnergy + Ancillary Segments]
    E --> F[Market Submission\nISO/RTO Interface]
    F --> G{Market\nCleared?}
    G -->|Yes| H[Dispatch Signals\nPer-DER Commands\nvia IEEE 2030.5]
    G -->|No| I[Position Adjustment\nRe-optimize for\nReal-Time Market]
    I --> D
    H --> J[Response Verification\nTelemetry Confirms\nDER Compliance]
    J --> K{Delivery\nShortfall?}
    K -->|Yes| L[Backup Dispatch\nActivate Reserve DERs\nor Buy from Spot]
    K -->|No| M[Settlement\nCalculate Revenue\nUpdate P&L]
    L --> M

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef output fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class A,C input
    class B,D,E,H,I,J,L process
    class F,G,K decision
    class M output
```

---

## Component Responsibilities Summary

| Component | Primary Responsibility | Key Interface |
|---|---|---|
| **SCADA Gateway** | Protocol translation (DNP3, IEC 61850, Modbus), measurement validation, timestamp alignment | Ingests from RTUs/IEDs; produces canonical telemetry events |
| **AMI Ingestion Gateway** | Meter read reception from head-end systems, read validation (VEE), gap filling | Ingests via mesh radio/cellular/PLC head-end; publishes to speed and batch layers |
| **DER Communication Gateway** | DER device communication via IEEE 2030.5, OpenADR 3.0, OCPP 2.0; signal routing | Bidirectional: receives DER telemetry, sends dispatch commands |
| **State Estimation Processor** | Weighted least squares estimation of grid state from redundant SCADA measurements; bad data detection and topology processing | Reads SCADA telemetry; writes grid state vector; feeds OPF engine |
| **Grid Optimization Engine** | Continuous OPF solving, N-1 contingency screening, RAS computation and arming | Reads grid state + forecast + market schedule; issues dispatch set points |
| **Renewable Forecast Service** | Ensemble NWP post-processing, quantile forecast generation, ramp event detection | Ingests NWP feeds; publishes forecasts to VPP, market, and grid operator |
| **Demand Response Orchestrator** | DR program management, signal dispatch, response verification, rebound prevention | Receives dispatch orders from VPP controller; sends signals via DER gateway |
| **VPP Dispatch Controller** | DER portfolio aggregation, availability modeling, market bidding, dispatch scheduling | Reads DER telemetry + forecasts; submits bids; dispatches DERs |
| **Outage Prediction Service** | Equipment failure probability scoring, storm damage zone prediction, crew pre-positioning | Reads sensor data + weather + satellite imagery; publishes risk scores |
| **Market Bidding Optimizer** | Stochastic co-optimization across energy + ancillary markets; settlement calculation | Reads forecasts + VPP capacity; submits bids; tracks market positions |
| **Theft Detection Engine** | Consumption pattern anomaly detection, neighbor comparison, meter tamper identification | Reads 90-day meter history; publishes alerts for field investigation |
| **FLISR Controller** | Automated fault location, feeder isolation, service restoration via switching | Reads fault indicators + SCADA; issues switching commands |
