# High-Level Design

[Back to Index](./00-index.md) | [Previous: Requirements](./01-requirements-and-estimations.md) | [Next: Low-Level Design →](./03-low-level-design.md)

---

## System Architecture

```mermaid
flowchart TB
    subgraph DeviceLayer["Device Layer"]
        direction LR
        MQTT[MQTT<br/>Devices]
        OPCUA[OPC-UA<br/>PLCs]
        HTTP[HTTP<br/>Sensors]
        MODBUS[Modbus<br/>Controllers]
    end

    subgraph EdgeNode["Edge Processing Node"]
        subgraph Ingestion["Ingestion Layer"]
            PROTO[Protocol<br/>Adapter]
            VALIDATE[Schema<br/>Validator]
            ENRICH[Event<br/>Enricher]
        end

        subgraph Processing["Processing Layer"]
            ROUTER[Stream<br/>Router]
            WINDOW[Windowing<br/>Engine]
            AGG[Aggregation<br/>Engine]
            CEP[Complex Event<br/>Processor]
        end

        subgraph Storage["Storage Layer"]
            BUFFER[(Store-and-Forward<br/>Buffer)]
            STATE[(State<br/>Store)]
            CACHE[(Query<br/>Cache)]
        end

        subgraph Egress["Egress Layer"]
            SYNC[Cloud Sync<br/>Manager]
            QUERY[Query<br/>Service]
            ALERT[Alert<br/>Engine]
        end
    end

    subgraph CloudLayer["Cloud Layer"]
        INGEST[Ingest<br/>Gateway]
        LAKE[(Data<br/>Lake)]
        CONTROL[Control<br/>Plane]
        MONITOR[Monitoring<br/>Service]
    end

    %% Device to Edge connections
    MQTT --> PROTO
    OPCUA --> PROTO
    HTTP --> PROTO
    MODBUS --> PROTO

    %% Ingestion flow
    PROTO --> VALIDATE
    VALIDATE --> ENRICH
    ENRICH --> ROUTER

    %% Processing flow
    ROUTER --> BUFFER
    ROUTER --> WINDOW
    WINDOW --> AGG
    AGG --> STATE
    AGG --> CEP

    %% Storage interactions
    STATE --> CACHE
    BUFFER --> SYNC
    AGG --> SYNC

    %% Egress flow
    CACHE --> QUERY
    STATE --> ALERT
    SYNC --> INGEST

    %% Cloud connections
    INGEST --> LAKE
    CONTROL -.->|Config| EdgeNode
    EdgeNode -.->|Metrics| MONITOR

    style DeviceLayer fill:#e3f2fd
    style EdgeNode fill:#f3e5f5
    style CloudLayer fill:#fff3e0
```

---

## Component Descriptions

### Device Layer

| Component | Protocol | Data Type | Typical Sources |
|-----------|----------|-----------|-----------------|
| **MQTT Adapter** | MQTT 3.1.1/5.0 | Telemetry, events | IoT sensors, gateways |
| **OPC-UA Adapter** | OPC-UA Binary/JSON | Industrial data | PLCs, SCADA, HMIs |
| **HTTP Adapter** | REST/WebSocket | JSON payloads | Web-enabled devices |
| **Modbus Adapter** | Modbus TCP/RTU | Register values | Legacy industrial equipment |

### Ingestion Layer

| Component | Responsibility | Output |
|-----------|---------------|--------|
| **Protocol Adapter** | Convert device protocols to internal format | Normalized events |
| **Schema Validator** | Validate event structure, reject malformed | Valid events |
| **Event Enricher** | Add metadata (timestamp, edge_id, sequence) | Enriched events |

### Processing Layer

| Component | Responsibility | State |
|-----------|---------------|-------|
| **Stream Router** | Route events to appropriate processors | Stateless |
| **Windowing Engine** | Assign events to time windows | Window boundaries |
| **Aggregation Engine** | Compute statistics within windows | Partial aggregates |
| **Complex Event Processor** | Detect patterns across events | Pattern state |

### Storage Layer

| Component | Purpose | Durability |
|-----------|---------|------------|
| **Store-and-Forward Buffer** | Hold events for cloud sync | Persistent (WAL) |
| **State Store** | Window state, checkpoints | Persistent (RocksDB/SQLite) |
| **Query Cache** | Recent aggregates for fast queries | In-memory (LRU) |

### Egress Layer

| Component | Responsibility | Downstream |
|-----------|---------------|------------|
| **Cloud Sync Manager** | Batch and upload data to cloud | Cloud ingest gateway |
| **Query Service** | Serve local queries for aggregates | Local dashboards, APIs |
| **Alert Engine** | Evaluate thresholds, trigger alerts | Notification systems |

---

## Data Flow Patterns

### Pattern 1: Normal Operation (Write Path)

```mermaid
sequenceDiagram
    participant D as Device
    participant P as Protocol Adapter
    participant V as Validator
    participant R as Router
    participant W as Window Engine
    participant A as Aggregator
    participant B as Buffer
    participant S as Sync Manager
    participant C as Cloud

    D->>P: Raw event (MQTT/OPC-UA)
    P->>V: Normalized event
    V->>V: Validate schema
    V->>R: Valid event

    par Parallel Processing
        R->>B: Store for sync
        R->>W: Process in window
    end

    W->>W: Assign to window
    W->>A: Window complete
    A->>A: Compute aggregates
    A->>B: Store aggregate

    Note over S,C: Periodic sync (every 30s-5min)
    S->>B: Fetch pending batches
    S->>C: Upload batch
    C-->>S: ACK with offset
    S->>B: Mark synced
```

### Pattern 2: Network Outage and Recovery

```mermaid
sequenceDiagram
    participant D as Device
    participant E as Edge Node
    participant B as Buffer
    participant S as Sync Manager
    participant C as Cloud

    Note over E,C: Network Available
    D->>E: Events
    E->>B: Buffer events
    S->>C: Sync batch
    C-->>S: ACK

    Note over E,C: Network Outage Begins
    D->>E: Events continue
    E->>B: Buffer grows
    S-xC: Sync fails
    S->>S: Retry with backoff

    Note over B: Buffer: 10% → 50% → 80%

    Note over E,C: Network Restored
    S->>C: Resume sync

    loop Drain backlog
        S->>B: Fetch oldest batch
        S->>C: Upload (priority: aggregates first)
        C-->>S: ACK
        S->>B: Mark synced
    end

    Note over B: Buffer drains to normal
```

### Pattern 3: Local Query Path

```mermaid
sequenceDiagram
    participant Q as Query Client
    participant QS as Query Service
    participant C as Cache
    participant S as State Store
    participant B as Buffer

    Q->>QS: GET /aggregates?window=5m
    QS->>C: Check cache

    alt Cache Hit
        C-->>QS: Cached result
        QS-->>Q: Return cached
    else Cache Miss
        QS->>S: Query state store
        S-->>QS: Aggregates
        QS->>C: Update cache
        QS-->>Q: Return fresh
    end

    Note over Q,QS: Raw data query
    Q->>QS: GET /events?last=100
    QS->>B: Query buffer
    B-->>QS: Recent events
    QS-->>Q: Return events
```

---

## Key Architectural Decisions

### Decision 1: Ingestion Model

| Option | Pros | Cons |
|--------|------|------|
| **Push-only** | Real-time, simple devices | Edge must handle bursts |
| **Pull-only** | Edge controls pace | Polling overhead, latency |
| **Hybrid (Recommended)** | Best of both | More complex |

**Recommendation: Hybrid**
- Devices **push** events to edge (real-time)
- Edge **pulls** from cloud for config (controlled)
- Cloud **pulls** from edge for sync (backpressure-friendly)

### Decision 2: State Management

| Option | Pros | Cons |
|--------|------|------|
| **Stateless (process and forget)** | Simple, fast recovery | No windowing, limited analytics |
| **In-memory state** | Fast processing | Lost on restart |
| **Persistent state (Recommended)** | Survives restarts | Slower writes |

**Recommendation: Persistent State with Checkpointing**
- Use RocksDB or SQLite for durability
- Checkpoint every 30 seconds
- Recover from last checkpoint on restart

### Decision 3: Consistency Model

| Option | Pros | Cons |
|--------|------|------|
| **Strong consistency** | Always correct | Unavailable offline |
| **Eventual consistency (Recommended)** | Available offline | Temporary inconsistency |
| **Causal consistency** | Preserves order | More complex |

**Recommendation: Eventual Consistency with Causal Ordering**
- Each device stream maintains causal order (sequence numbers)
- Cross-device operations are eventually consistent
- CRDTs handle conflicts during sync

### Decision 4: Windowing Strategy

| Window Type | Use Case | Trigger |
|-------------|----------|---------|
| **Tumbling** | Regular reporting (every 5 min) | Time-based |
| **Sliding** | Moving averages | Time-based with overlap |
| **Session** | Activity-based grouping | Inactivity gap |
| **Count-based** | Fixed batch sizes | Event count |

**Recommendation: Tumbling Windows as Default**
- 1-minute, 5-minute, 1-hour windows for different granularities
- Sliding windows for alerting (detect spikes)
- Session windows for user/device activity

### Decision 5: Sync Strategy

| Option | Pros | Cons |
|--------|------|------|
| **Continuous streaming** | Real-time cloud visibility | High bandwidth, complex |
| **Fixed interval batch** | Simple, predictable | Delayed visibility |
| **Adaptive batch (Recommended)** | Balances both | More complex |

**Recommendation: Adaptive Batch Sync**
- Normal: Sync every 1-5 minutes
- Backlog: Increase batch size, prioritize aggregates
- Critical: Stream immediately (alerts, anomalies)

---

## Time Synchronization Architecture

```mermaid
flowchart TB
    subgraph TimeSource["Time Sources"]
        GPS[GPS<br/>Receiver]
        NTP[NTP<br/>Server]
        PTP[PTP<br/>Grandmaster]
    end

    subgraph Edge["Edge Node"]
        CLOCK[System<br/>Clock]
        SYNC[Time Sync<br/>Daemon]
        DRIFT[Drift<br/>Monitor]
    end

    subgraph Devices["Devices"]
        D1[Device 1]
        D2[Device 2]
        D3[Device 3]
    end

    GPS --> PTP
    NTP --> SYNC
    PTP --> SYNC
    SYNC --> CLOCK
    CLOCK --> DRIFT

    CLOCK -->|PTP/NTP| D1
    CLOCK -->|PTP/NTP| D2
    CLOCK -->|PTP/NTP| D3

    DRIFT -->|Alert if drift > threshold| Alert[Monitoring]

    style TimeSource fill:#e8f5e9
    style Edge fill:#f3e5f5
```

**Time Accuracy Requirements:**

| Environment | Protocol | Accuracy | Use Case |
|-------------|----------|----------|----------|
| **General IoT** | NTP | < 50ms | Logging, analytics |
| **Industrial** | PTP (IEEE 1588) | < 1ms | Coordinated control |
| **TSN-Enabled** | gPTP (802.1AS) | < 1μs | Real-time automation |

---

## Deployment Topology

### Single Edge Node (Small Deployment)

```mermaid
flowchart LR
    subgraph Site["Factory / Store / Vehicle"]
        D1[Devices] --> E[Edge Node]
        D2[Devices] --> E
    end

    E -->|WAN/Cellular| C[Cloud]
```

### Hierarchical Edge (Large Deployment)

```mermaid
flowchart TB
    subgraph Level0["Level 0: Device Edge"]
        D1[Sensors]
        D2[PLCs]
        D3[Cameras]
    end

    subgraph Level1["Level 1: Gateway Edge"]
        G1[Gateway 1]
        G2[Gateway 2]
    end

    subgraph Level2["Level 2: Site Edge"]
        SE[Site Edge<br/>Server]
    end

    subgraph Level3["Level 3: Regional/Cloud"]
        CLOUD[Cloud<br/>Platform]
    end

    D1 & D2 --> G1
    D3 --> G2
    G1 & G2 --> SE
    SE --> CLOUD

    style Level0 fill:#e3f2fd
    style Level1 fill:#f3e5f5
    style Level2 fill:#fff3e0
    style Level3 fill:#e8f5e9
```

### Multi-Site with Geo-Distribution

```mermaid
flowchart TB
    subgraph Region1["Region: North America"]
        E1[Edge 1<br/>Chicago]
        E2[Edge 2<br/>Dallas]
    end

    subgraph Region2["Region: Europe"]
        E3[Edge 3<br/>Frankfurt]
        E4[Edge 4<br/>London]
    end

    subgraph Cloud["Global Cloud"]
        R1[Regional<br/>Ingest NA]
        R2[Regional<br/>Ingest EU]
        GLOBAL[Global<br/>Aggregator]
    end

    E1 & E2 --> R1
    E3 & E4 --> R2
    R1 & R2 --> GLOBAL
```

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| Sync vs Async | **Async** (message-passing internally) | Decouple components, handle backpressure |
| Event-driven vs Request-response | **Event-driven** (streaming) | Natural fit for continuous data |
| Push vs Pull | **Hybrid** (push ingest, pull sync) | Real-time ingest, controlled sync |
| Stateless vs Stateful | **Stateful** (windowed processing) | Enable aggregations and patterns |
| Read-heavy vs Write-heavy | **Write-heavy** (ingest dominates) | Optimize write path |
| Real-time vs Batch | **Micro-batch** (streaming with batched sync) | Balance latency and efficiency |
| Edge vs Origin | **Edge-first** (process locally) | Reduce latency and bandwidth |

---

## Integration Points

### Upstream (Devices → Edge)

| Protocol | Port | Format | Notes |
|----------|------|--------|-------|
| MQTT | 1883/8883 | JSON/Protobuf | TLS on 8883 |
| OPC-UA | 4840 | Binary/JSON | UA Binary preferred |
| HTTP | 8080/8443 | JSON | REST or WebSocket |
| Modbus TCP | 502 | Binary | Legacy support |

### Downstream (Edge → Cloud)

| Protocol | Format | Batching | Notes |
|----------|--------|----------|-------|
| HTTPS | JSON/Protobuf | 1000 events or 30s | Compressed (gzip/zstd) |
| gRPC | Protobuf | Streaming | Bidirectional for control |
| Kafka Protocol | Avro/Protobuf | Producer batching | If Kafka in cloud |

### Control Plane (Cloud → Edge)

| Operation | Protocol | Frequency |
|-----------|----------|-----------|
| Configuration updates | gRPC/HTTPS | On-demand |
| Heartbeat/health | HTTPS | Every 30s |
| Firmware updates | HTTPS (chunked) | On-demand |
| Time sync | NTP/PTP | Continuous |

---

[Back to Index](./00-index.md) | [Previous: Requirements](./01-requirements-and-estimations.md) | [Next: Low-Level Design →](./03-low-level-design.md)
