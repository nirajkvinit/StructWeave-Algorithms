# High-Level Design — Wearable Health Monitoring Platform

## 1. System Architecture

```mermaid
flowchart TB
    subgraph Wearable["Wearable Device Layer"]
        SENSORS[Sensor Array<br/>PPG · ECG · Accel · Temp · SpO2]
        MCU[Microcontroller<br/>Signal Processing · TinyML]
        BUF[Local Buffer<br/>Flash Storage · 72h Capacity]
        BLE[BLE 5.x Radio<br/>Batched Transfer]
    end

    subgraph Phone["Phone Gateway Layer"]
        APP[Companion App<br/>Sync Manager · Data Aggregator]
        SDK[Platform SDK<br/>HealthKit · Health Connect]
        QUEUE[Upload Queue<br/>Store-and-Forward]
    end

    subgraph Gateway["Cloud Gateway Layer"]
        APIGW[API Gateway<br/>Auth · Rate Limiting · TLS]
        SYNCAPI[Sync Ingestion API<br/>Dedup · Validation · Routing]
        ALERTAPI[Alert Fast-Path API<br/>Priority Routing]
    end

    subgraph Stream["Stream Processing Layer"]
        INGEST[Ingestion Pipeline<br/>Normalization · Quality Scoring]
        CEP[Complex Event Processing<br/>Multi-Signal Correlation]
        ANOMALY[Real-Time Anomaly<br/>Detection Engine]
    end

    subgraph Core["Core Services"]
        direction TB
        subgraph VitalsDomain["Vitals Domain"]
            HR[Heart Rate<br/>Service]
            SPO2[SpO2 Monitoring<br/>Service]
            ECG_SVC[ECG Analysis<br/>Service]
            TEMP[Temperature<br/>Service]
        end
        subgraph WellnessDomain["Wellness Domain"]
            SLEEP[Sleep Analysis<br/>Service]
            ACTIVITY[Activity Tracking<br/>Service]
            STRESS[Stress & Recovery<br/>Service]
            SCORE[Health Score<br/>Engine]
        end
        subgraph ClinicalDomain["Clinical Domain"]
            ALERT[Alert Management<br/>Service]
            RPM[Remote Patient<br/>Monitoring Service]
            REPORT[Clinical Report<br/>Generator]
        end
        subgraph UserDomain["User Domain"]
            PROFILE[User Profile<br/>Service]
            DEVICE[Device Management<br/>Service]
            CONSENT[Consent Management<br/>Service]
        end
    end

    subgraph Intelligence["AI/ML Layer"]
        BASELINE[Baseline Learning<br/>Engine]
        TREND[Longitudinal Trend<br/>Analysis]
        RISK[Risk Prediction<br/>Engine]
        POPULATION[Population Health<br/>Analytics]
    end

    subgraph Data["Data Layer"]
        TSDB[(Time-Series DB<br/>Sensor Telemetry)]
        DOCDB[(Document DB<br/>User Profiles · Devices)]
        RELDB[(Relational DB<br/>Clinical Records · Consents)]
        CACHE[(Distributed Cache<br/>Recent Vitals · Sessions)]
        LAKE[(Data Lake<br/>De-identified Analytics)]
    end

    subgraph Integration["Integration Layer"]
        FHIR[FHIR R4 Gateway<br/>EHR Integration]
        NOTIFY[Notification Service<br/>Push · SMS · Email]
        PHYSICIAN[Physician Dashboard<br/>API]
    end

    subgraph Clients["Client Layer"]
        MOBILE[User Mobile App<br/>Health Dashboard]
        WEB[Web Dashboard<br/>User Portal]
        CLINICAL[Physician<br/>Dashboard]
        RESEARCH[Research<br/>Portal]
    end

    SENSORS --> MCU --> BUF --> BLE
    BLE --> APP
    APP --> SDK
    APP --> QUEUE --> APIGW
    ALERTAPI -.->|fast path| ANOMALY
    APIGW --> SYNCAPI --> INGEST
    SYNCAPI --> ALERTAPI
    INGEST --> CEP --> ANOMALY
    INGEST --> STREAM_BUS[Event Streaming<br/>Platform]

    STREAM_BUS --> HR & SPO2 & ECG_SVC & TEMP
    STREAM_BUS --> SLEEP & ACTIVITY & STRESS
    ANOMALY --> ALERT
    ALERT --> NOTIFY --> MOBILE & CLINICAL
    SCORE --> TREND --> RISK

    HR & SPO2 & ECG_SVC --> TSDB
    SLEEP & ACTIVITY --> TSDB
    PROFILE & DEVICE & CONSENT --> DOCDB
    ALERT & RPM --> RELDB
    BASELINE & TREND --> LAKE

    RPM --> FHIR
    REPORT --> FHIR
    FHIR --> CLINICAL

    classDef device fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef phone fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef stream fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ml fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef integration fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class SENSORS,MCU,BUF,BLE device
    class APP,SDK,QUEUE phone
    class APIGW,SYNCAPI,ALERTAPI gateway
    class INGEST,CEP,ANOMALY,STREAM_BUS stream
    class HR,SPO2,ECG_SVC,TEMP,SLEEP,ACTIVITY,STRESS,SCORE,ALERT,RPM,REPORT,PROFILE,DEVICE,CONSENT service
    class BASELINE,TREND,RISK,POPULATION ml
    class TSDB,DOCDB,RELDB,LAKE data
    class CACHE cache
    class FHIR,NOTIFY,PHYSICIAN integration
    class MOBILE,WEB,CLINICAL,RESEARCH client
```

---

## 2. Data Flow Architecture

### 2.1 Primary Data Flow: Sensor → Cloud → Insight

```mermaid
flowchart LR
    subgraph Device["On-Device"]
        S[Sensor<br/>Sampling] --> DSP[Signal<br/>Processing]
        DSP --> INF[On-Device<br/>Inference]
        DSP --> BUF[Data<br/>Buffer]
        INF -->|critical alert| FAST[Fast-Path<br/>BLE Alert]
        INF --> BUF
    end

    subgraph Phone["Phone Gateway"]
        BUF -->|BLE batch| AGG[Data<br/>Aggregator]
        FAST -->|immediate| AGG
        AGG --> HK[HealthKit /<br/>Health Connect]
        AGG --> UPQ[Upload<br/>Queue]
    end

    subgraph Cloud["Cloud Processing"]
        UPQ -->|HTTPS| ING[Ingestion<br/>Pipeline]
        ING --> NORM[Normalize<br/>& Score]
        NORM --> RT[Real-Time<br/>Processing]
        NORM --> BATCH[Batch<br/>Processing]
        RT --> DETECT[Anomaly<br/>Detection]
        BATCH --> TRENDS[Trend<br/>Analysis]
        DETECT -->|alert| NOTIF[Alert<br/>Service]
        TRENDS --> HSCORE[Health<br/>Score]
    end

    classDef device fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef phone fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef cloud fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class S,DSP,INF,BUF,FAST device
    class AGG,HK,UPQ phone
    class ING,NORM,RT,BATCH,DETECT,TRENDS,NOTIF,HSCORE cloud
```

### 2.2 Critical Alert Fast Path

```mermaid
sequenceDiagram
    participant W as Wearable Device
    participant P as Phone App
    participant G as Cloud Gateway
    participant A as Anomaly Engine
    participant N as Notification Service
    participant D as Physician Dashboard

    W->>W: Detect arrhythmia (on-device ML)
    W->>P: BLE priority alert (bypasses batch queue)
    P->>P: Validate alert + attach context
    P->>G: HTTPS POST /alerts/critical
    G->>A: Route to anomaly fast-path
    A->>A: Cloud model confirmation (2nd opinion)
    A->>N: Confirmed alert → escalation
    par Parallel Notifications
        N->>P: Push notification to user
        N->>D: Push to physician dashboard
        N-->>P: SMS to emergency contacts (if configured)
    end

    Note over W,D: End-to-end target: < 10 seconds
```

### 2.3 Data Sync Flow

```mermaid
sequenceDiagram
    participant W as Wearable
    participant P as Phone App
    participant S as Sync API
    participant I as Ingestion Pipeline
    participant T as Time-Series DB

    W->>P: BLE connection established
    P->>W: Request sync manifest (last sync timestamp)
    W->>P: Manifest: {records: 4200, bytes: 380KB, checksum: abc123}
    P->>W: ACK, begin transfer
    loop Chunked BLE Transfer
        W->>P: Data chunk (4KB each, sequenced)
        P->>P: Validate chunk checksum
    end
    P->>P: Reassemble + decompress
    P->>P: Write to HealthKit/Health Connect
    P->>S: HTTPS POST /sync/upload (compressed payload)
    S->>S: Authenticate + validate + dedup
    S->>I: Route to ingestion pipeline
    I->>I: Normalize + quality score
    I->>T: Write to time-series store
    S->>P: 200 OK {sync_id, next_sync_hint}
    P->>W: Confirm sync → device clears buffer
```

---

## 3. Key Design Decisions

### 3.1 Phone-as-Gateway vs. Direct-to-Cloud

| Factor | Phone-as-Gateway | Direct-to-Cloud |
|---|---|---|
| **Power consumption** | Low — BLE is ~10x more efficient than Wi-Fi/cellular | High — requires on-device Wi-Fi/LTE radio |
| **Battery impact** | Minimal — leverages phone's existing radio | Significant — 2-5x battery drain increase |
| **Coverage** | Depends on phone proximity (BLE range ~30m) | Cellular coverage required |
| **Processing** | Phone provides secondary compute layer | All compute on device or cloud |
| **Latency** | Additional hop through phone | Direct connection, lower latency |
| **Cost** | No cellular modem needed on device | Requires embedded SIM + cellular modem |
| **Use case** | Consumer wearables (watch, band) | Medical-grade RPM devices |

**Decision:** Phone-as-gateway for consumer wearables (95% of devices); direct-to-cloud option for medical-grade RPM devices requiring continuous connectivity.

**Rationale:** BLE communication at ~10 mW vs. cellular at ~500 mW means 50x power efficiency. For a 300 mAh battery, this translates to 10+ days of battery life vs. ~2 days. The phone also provides a processing tier that offloads work from the constrained wearable hardware.

### 3.2 On-Device Inference vs. Cloud-Only Processing

| Factor | On-Device Inference | Cloud-Only Processing |
|---|---|---|
| **Alert latency** | < 500ms (no network dependency) | 5–30s (network + cloud processing) |
| **Privacy** | Raw signal never leaves device | All data transmitted to cloud |
| **Availability** | Works without phone/cloud | Requires connectivity for any analysis |
| **Model complexity** | Limited by MCU (256KB–2MB RAM) | Unlimited model size |
| **Accuracy** | Good for well-defined patterns | Higher accuracy with larger models |
| **Update frequency** | OTA firmware update (weeks/months) | Continuous model deployment |
| **Battery impact** | ~0.5 mW continuous inference | Zero on-device, but higher BLE/radio cost |

**Decision:** Hybrid approach — critical, time-sensitive detection (arrhythmia, fall) runs on-device; nuanced analysis (trend detection, subtle anomalies, health scoring) runs in cloud.

**Rationale:** Falls require sub-second response (to trigger emergency call); cloud round-trip cannot guarantee this. Meanwhile, longitudinal trend analysis requires weeks of data and population-scale models that don't fit on a wearable MCU.

### 3.3 Time-Series Storage Strategy

| Tier | Retention | Resolution | Storage Type | Access Pattern |
|---|---|---|---|---|
| **Hot** | 90 days | Full resolution (1 Hz HR, raw ECG) | SSD-backed time-series DB | Real-time dashboards, recent history |
| **Warm** | 1 year | 1-minute aggregates (min/max/avg/p50) | HDD-backed time-series DB | Weekly/monthly trend views |
| **Cold** | 5 years | 5-minute aggregates | Object storage with columnar format | Annual reports, research queries |
| **Archive** | 7+ years | 15-minute summaries | Compressed object storage | Regulatory compliance, legal |

**Decision:** Four-tier storage with automated continuous aggregation and tiered retention policies.

**Rationale:** A user's second-by-second heart rate from 3 years ago has no clinical value at full resolution, but the daily resting HR trend is invaluable for longitudinal analysis. Downsampling reduces storage costs by ~95% while preserving all analytically useful information.

### 3.4 Sensor Data Normalization Strategy

**Challenge:** 100+ wearable manufacturers produce heart rate data in different formats, sampling rates, units, and quality levels.

**Decision:** Canonical data model with device-specific adapter plugins.

```
Canonical Heart Rate Record:
{
  user_id:        "uuid",
  device_id:      "uuid",
  timestamp_ms:   1709942400000,
  heart_rate_bpm: 72,
  confidence:     0.95,        // 0.0-1.0 quality score
  source:         "ppg",       // ppg, ecg, manual
  context:        "resting",   // resting, active, sleep
  motion_level:   0.1,         // 0.0-1.0 motion intensity
  raw_rr_ms:      [833, 830, 835]  // Optional R-R intervals
}
```

Each device manufacturer implements an adapter that translates their proprietary format into this canonical schema. The confidence score is critical — it allows downstream analytics to weight high-quality readings more heavily and discard noise.

### 3.5 Alert Escalation Architecture

```mermaid
flowchart TB
    DETECT[Anomaly<br/>Detected] --> CLASSIFY{Severity<br/>Classification}

    CLASSIFY -->|Critical| CRIT[Critical Path]
    CLASSIFY -->|Warning| WARN[Warning Path]
    CLASSIFY -->|Informational| INFO[Info Path]

    CRIT --> USER_PUSH[User Push<br/>Notification]
    CRIT --> SOUND[Device Haptic<br/>+ Sound Alert]
    CRIT --> CHECK{User<br/>Response?}
    CHECK -->|No response 60s| EMERG[Emergency<br/>Contact SMS]
    CHECK -->|No response 5min| SOS[Emergency<br/>Services API]
    CHECK -->|Acknowledged| LOG_C[Log + Track]

    WARN --> PHYS{Physician<br/>Linked?}
    PHYS -->|Yes| PHYS_ALERT[Physician<br/>Dashboard Alert]
    PHYS -->|No| USER_WARN[User Warning<br/>Notification]
    PHYS_ALERT --> LOG_W[Log + Track]
    USER_WARN --> LOG_W

    INFO --> SUMMARY[Daily/Weekly<br/>Summary Queue]
    SUMMARY --> LOG_I[Log]

    classDef critical fill:#ffcdd2,stroke:#b71c1c,stroke-width:2px
    classDef warning fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef info fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class DETECT,CLASSIFY service
    class CRIT,USER_PUSH,SOUND,CHECK,EMERG,SOS,LOG_C critical
    class WARN,PHYS,PHYS_ALERT,USER_WARN,LOG_W warning
    class INFO,SUMMARY,LOG_I info
```

---

## 4. Component Interaction Patterns

### 4.1 Event-Driven Architecture

The platform uses an event streaming backbone for inter-service communication:

| Event | Producer | Consumers | Priority |
|---|---|---|---|
| `sensor.data.received` | Ingestion Pipeline | Vitals Services, Trend Engine | Normal |
| `alert.critical.detected` | Anomaly Engine | Alert Service, Notification Service | Critical |
| `alert.warning.detected` | Anomaly Engine | Alert Service, Trend Engine | High |
| `baseline.updated` | Baseline Engine | Anomaly Engine, Health Score | Normal |
| `sync.completed` | Sync API | Trend Engine, Activity Service | Normal |
| `device.registered` | Device Service | Profile Service, Consent Service | Normal |
| `consent.changed` | Consent Service | All data-accessing services | High |
| `ecg.recording.uploaded` | ECG Service | Clinical Report Generator, FHIR Gateway | High |

### 4.2 Service Communication Matrix

| Pattern | Use Case | Protocol |
|---|---|---|
| **Synchronous RPC** | User-facing API calls (get vitals, get trends) | gRPC with deadline propagation |
| **Async Event** | Sensor data processing, alert generation | Event streaming platform |
| **Pub/Sub** | Multi-consumer notifications (consent changes affect all services) | Event streaming with consumer groups |
| **Request-Reply** | Cloud-side anomaly confirmation (second opinion on device alert) | gRPC with 5s timeout |
| **Batch** | Daily health score computation, population analytics | Scheduled batch with data lake |

---

## 5. Deployment Architecture

### 5.1 Multi-Region Deployment

```mermaid
flowchart TB
    subgraph US["US Region (Primary)"]
        US_GW[API Gateway] --> US_PROC[Processing Cluster]
        US_PROC --> US_DB[(User Data Store)]
        US_PROC --> US_ALERT[Alert Pipeline]
    end

    subgraph EU["EU Region (GDPR)"]
        EU_GW[API Gateway] --> EU_PROC[Processing Cluster]
        EU_PROC --> EU_DB[(User Data Store)]
        EU_PROC --> EU_ALERT[Alert Pipeline]
    end

    subgraph APAC["APAC Region"]
        APAC_GW[API Gateway] --> APAC_PROC[Processing Cluster]
        APAC_PROC --> APAC_DB[(User Data Store)]
        APAC_PROC --> APAC_ALERT[Alert Pipeline]
    end

    GLB[Global Load Balancer<br/>Geo-Routing] --> US_GW & EU_GW & APAC_GW
    US_DB -.->|metadata only| GLOBAL_META[(Global Metadata<br/>Device Registry)]
    EU_DB -.->|metadata only| GLOBAL_META
    APAC_DB -.->|metadata only| GLOBAL_META

    classDef region fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef global fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class US_GW,EU_GW,APAC_GW,GLB gateway
    class US_PROC,EU_PROC,APAC_PROC,US_ALERT,EU_ALERT,APAC_ALERT region
    class US_DB,EU_DB,APAC_DB data
    class GLOBAL_META global
```

**Key Principle:** PHI data never crosses regional boundaries. EU user health data stays in the EU region. Only de-identified metadata (device registry, feature flags, ML model versions) replicates globally.

### 5.2 Capacity Planning by Region

| Region | Users | Daily Sync Volume | Alert Pipeline Capacity |
|---|---|---|---|
| **US** | 40M | 9.6 TB/day | 4,000 alerts/sec |
| **EU** | 30M | 7.2 TB/day | 3,000 alerts/sec |
| **APAC** | 20M | 4.8 TB/day | 2,000 alerts/sec |
| **Other** | 10M | 2.4 TB/day | 1,000 alerts/sec |

---

## 6. Technology Selection Rationale

| Decision | Choice | Why Not Alternatives |
|---|---|---|
| **Device-to-phone** | BLE 5.x | Wi-Fi (10x power), cellular (50x power, adds BOM cost) |
| **Phone-to-cloud** | HTTPS/2 with gRPC | MQTT (adds complexity, phone already has HTTP stack) |
| **Medical device-to-cloud** | MQTT with QoS 2 | HTTPS (no persistent connection for continuous monitoring) |
| **Stream processing** | Managed stream processing | Batch-only (unacceptable latency for alerts) |
| **Time-series storage** | Purpose-built TSDB | Relational DB (cannot handle write throughput at scale) |
| **Clinical integration** | FHIR R4 REST API | Custom API (EHR vendors mandate FHIR compliance) |
| **ML inference (device)** | INT8 quantized TinyML | Float32 models (exceed MCU memory constraints) |
| **ML inference (cloud)** | GPU-accelerated inference | CPU-only (ECG analysis latency unacceptable) |
| **Notification delivery** | Multi-channel (push + SMS + email) | Push-only (unreliable for critical health alerts) |

---

*Next: [Low-Level Design →](./03-low-level-design.md)*
