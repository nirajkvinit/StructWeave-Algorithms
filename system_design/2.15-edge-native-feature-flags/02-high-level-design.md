# High-Level Design

[← Back to Index](./00-index.md) | [Previous: Requirements](./01-requirements-and-estimations.md) | [Next: Low-Level Design →](./03-low-level-design.md)

---

## Architecture Overview

The edge-native feature flags system consists of three main layers:
1. **Control Plane** (Origin): Flag management, source of truth
2. **Sync Layer**: Push-based distribution to edge nodes
3. **Edge Layer**: Local evaluation at each PoP

```mermaid
flowchart TB
    subgraph Users["Global Users"]
        U1["User (US West)"]
        U2["User (EU)"]
        U3["User (APAC)"]
    end

    subgraph EdgeLayer["Edge Layer (200+ PoPs)"]
        subgraph PoP1["Edge PoP - US West"]
            EW1["Edge Worker"]
            FS1["Flag Store<br/>(In-Memory)"]
            SC1["Segment Cache"]
        end

        subgraph PoP2["Edge PoP - EU Central"]
            EW2["Edge Worker"]
            FS2["Flag Store<br/>(In-Memory)"]
            SC2["Segment Cache"]
        end

        subgraph PoP3["Edge PoP - APAC"]
            EW3["Edge Worker"]
            FS3["Flag Store<br/>(In-Memory)"]
            SC3["Segment Cache"]
        end
    end

    subgraph SyncLayer["Sync Layer"]
        SSE["SSE Streaming<br/>Service"]
        Push["Push Distribution<br/>Service"]
        KV["Global KV Store<br/>(Backup)"]
    end

    subgraph ControlPlane["Control Plane (Origin)"]
        API["Flag Management<br/>API"]
        DB["Flag Database"]
        Audit["Audit Log"]
        Analytics["Analytics<br/>Aggregation"]
    end

    U1 --> EW1
    U2 --> EW2
    U3 --> EW3

    EW1 --> FS1
    EW2 --> FS2
    EW3 --> FS3

    FS1 --> SC1
    FS2 --> SC2
    FS3 --> SC3

    SSE -.->|Stream Updates| FS1
    SSE -.->|Stream Updates| FS2
    SSE -.->|Stream Updates| FS3

    Push -->|Push on Change| KV
    KV -.->|Fallback Read| FS1
    KV -.->|Fallback Read| FS2
    KV -.->|Fallback Read| FS3

    API --> DB
    API --> Audit
    DB --> SSE
    DB --> Push

    EW1 -.->|Metrics| Analytics
    EW2 -.->|Metrics| Analytics
    EW3 -.->|Metrics| Analytics

    style EdgeLayer fill:#e8f5e9
    style SyncLayer fill:#e3f2fd
    style ControlPlane fill:#fff3e0
```

---

## Push-Based Distribution Model

### Why Push Over Pull?

| Aspect | Push-Based | Pull-Based |
|--------|------------|------------|
| **First Request Latency** | <5ms (pre-positioned) | Cold start penalty |
| **Staleness** | <1 second | Cache TTL dependent |
| **Origin Load** | Proportional to changes | Proportional to requests |
| **Bandwidth** | Efficient (only changes) | Wasteful (full fetches) |
| **Complexity** | Higher (streaming infra) | Lower (simple HTTP) |

**Decision:** Use **push-based distribution** for flag configs to eliminate cold start and achieve sub-second propagation.

### Push Flow Architecture

```mermaid
sequenceDiagram
    participant Admin as Admin UI
    participant API as Control Plane API
    participant DB as Flag Database
    participant Stream as SSE Service
    participant Edge as Edge PoPs (200+)
    participant KV as Global KV

    Admin->>API: Update flag config
    API->>DB: Persist change
    API->>Stream: Notify change

    par Push to Streaming
        Stream->>Edge: SSE push (all PoPs)
    and Push to KV (backup)
        API->>KV: Write latest config
    end

    Note over Edge: Each PoP updates<br/>in-memory store

    Edge-->>Edge: Flag evaluation<br/>uses new config
```

---

## Data Flow Patterns

### Read Path (Flag Evaluation)

```mermaid
sequenceDiagram
    participant User
    participant Edge as Edge Worker
    participant Mem as In-Memory Store
    participant KV as KV Store (Fallback)
    participant Origin as Control Plane

    User->>Edge: Request with user context

    Edge->>Mem: Lookup flag config

    alt Cache Hit
        Mem-->>Edge: Return config
        Edge->>Edge: Evaluate rules locally
        Edge-->>User: Return variation
    else Cache Miss
        Edge->>KV: Fetch from KV
        alt KV Hit
            KV-->>Edge: Return config
            Edge->>Mem: Update cache
            Edge->>Edge: Evaluate rules
            Edge-->>User: Return variation
        else KV Miss
            Edge->>Origin: Fetch from origin
            Origin-->>Edge: Return config
            Edge->>Mem: Update cache
            Edge->>Edge: Evaluate rules
            Edge-->>User: Return variation
        end
    end
```

### Write Path (Flag Update)

```mermaid
sequenceDiagram
    participant Admin
    participant API as Control Plane
    participant DB as Database
    participant Stream as Streaming Service
    participant Edge as Edge PoPs

    Admin->>API: Update flag
    API->>API: Validate config
    API->>DB: Write with version
    DB-->>API: Confirm

    API->>Stream: Broadcast change event

    loop For each PoP
        Stream->>Edge: Push delta update
        Edge->>Edge: Apply to in-memory store
        Edge-->>Stream: ACK
    end

    API-->>Admin: Success (propagation started)
```

---

## Key Architectural Decisions

### 1. Streaming Protocol Selection

| Protocol | Latency | Reliability | Complexity | Decision |
|----------|---------|-------------|------------|----------|
| **SSE (Server-Sent Events)** | <1s | Good (auto-reconnect) | Medium | **Selected** |
| WebSocket | <1s | Good | Higher | Overkill for unidirectional |
| Long Polling | 1-10s | Lower | Low | Too slow |
| gRPC Streaming | <1s | Excellent | High | Complex for edge deployment |

**Rationale:** SSE provides sub-second delivery with automatic reconnection, works over HTTP (CDN-friendly), and has native browser support for debugging.

### 2. Edge Storage Strategy

```mermaid
flowchart LR
    subgraph StorageLayers["Storage Layers (Fastest → Slowest)"]
        L1["L1: In-Memory<br/>(Edge Worker)"]
        L2["L2: Edge KV<br/>(Per-PoP)"]
        L3["L3: Global KV<br/>(Replicated)"]
        L4["L4: Origin DB<br/>(Source of Truth)"]
    end

    L1 -->|Miss| L2
    L2 -->|Miss| L3
    L3 -->|Miss| L4

    style L1 fill:#c8e6c9
    style L2 fill:#dcedc8
    style L3 fill:#fff9c4
    style L4 fill:#ffcdd2
```

| Layer | Latency | Capacity | Durability | Use Case |
|-------|---------|----------|------------|----------|
| L1: In-Memory | <1ms | ~50MB | None (ephemeral) | Hot path evaluation |
| L2: Edge KV | 1-5ms | 1GB | Per-PoP | Cold start, worker restart |
| L3: Global KV | 5-20ms | Unlimited | Replicated | Cross-PoP consistency |
| L4: Origin | 50-200ms | Unlimited | Persistent | Source of truth |

### 3. Consistency Model

| Requirement | Model | Implementation |
|-------------|-------|----------------|
| **Flag reads** | Eventual | In-memory cache with streaming updates |
| **Flag writes** | Strong | Origin DB with transactions |
| **Propagation guarantee** | Best-effort, bounded | SSE + heartbeat + reconciliation |
| **Staleness budget** | <1 second (99th percentile) | Streaming latency SLO |

### 4. Bootstrap Strategy

To eliminate cold start latency for new users/sessions:

```mermaid
sequenceDiagram
    participant Browser
    participant Edge as Edge Worker
    participant App as Origin App Server
    participant Flags as Flag Service

    Browser->>Edge: Initial page request
    Edge->>App: Proxy to origin
    App->>Flags: Get flags for user
    Flags-->>App: Flag values
    App->>App: Embed flags in HTML
    App-->>Edge: HTML with bootstrap data
    Edge-->>Browser: Response with flags

    Note over Browser: JavaScript SDK<br/>uses embedded flags<br/>(no network request)
```

**Bootstrap Payload (embedded in HTML):**
```
<script>
  window.__FLAG_BOOTSTRAP__ = {
    "version": "v123",
    "flags": {
      "new-checkout": { "value": true, "variation": 1 },
      "dark-mode": { "value": false, "variation": 0 }
    }
  };
</script>
```

---

## Component Responsibilities

### Control Plane Components

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **Flag Management API** | CRUD operations, validation | REST/GraphQL API |
| **Flag Database** | Persistent storage, versioning | Relational DB (strong consistency) |
| **Audit Service** | Change logging, compliance | Append-only log |
| **Streaming Service** | SSE to edge nodes | Event streaming platform |
| **Analytics Aggregator** | Collect edge metrics | Time-series DB |

### Edge Layer Components

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **Edge Worker** | Request handling, evaluation | V8 Isolate / WASM |
| **In-Memory Store** | Hot flag cache | Worker memory (Map/Object) |
| **Segment Cache** | User segment memberships | LRU cache |
| **Evaluator** | Rule matching, bucketing | Local computation |
| **Metrics Collector** | Usage tracking | Async batched |

---

## Sync Architecture Deep Dive

### Streaming Connection Model

```mermaid
flowchart TB
    subgraph Origin["Origin Region"]
        API["API Servers"]
        Stream["SSE Servers<br/>(Horizontally Scaled)"]
        LB["Load Balancer"]
    end

    subgraph EdgeRegions["Edge Regions"]
        subgraph R1["Region: US"]
            E1["Edge Connector 1"]
            E2["Edge Connector 2"]
        end

        subgraph R2["Region: EU"]
            E3["Edge Connector 3"]
            E4["Edge Connector 4"]
        end

        subgraph R3["Region: APAC"]
            E5["Edge Connector 5"]
            E6["Edge Connector 6"]
        end
    end

    API -->|Flag Changes| Stream
    Stream --> LB

    LB -->|SSE| E1
    LB -->|SSE| E2
    LB -->|SSE| E3
    LB -->|SSE| E4
    LB -->|SSE| E5
    LB -->|SSE| E6

    E1 -.->|Distribute| PoPs1["US PoPs"]
    E2 -.->|Distribute| PoPs1
    E3 -.->|Distribute| PoPs2["EU PoPs"]
    E4 -.->|Distribute| PoPs2
    E5 -.->|Distribute| PoPs3["APAC PoPs"]
    E6 -.->|Distribute| PoPs3

    style Origin fill:#fff3e0
    style EdgeRegions fill:#e3f2fd
```

### Sync Message Types

| Message Type | Trigger | Payload | Frequency |
|--------------|---------|---------|-----------|
| **FLAG_UPDATE** | Flag changed | Delta (changed flag only) | On change |
| **SEGMENT_UPDATE** | Segment changed | Delta (changed segment) | On change |
| **FULL_SYNC** | Reconnection, drift | Complete flag set | Rare |
| **HEARTBEAT** | Keepalive | Timestamp, version | Every 30s |
| **ACK** | Update received | Version confirmed | Per update |

---

## Deployment Architecture

### Multi-Region Control Plane

```mermaid
flowchart TB
    subgraph Primary["Primary Region (US)"]
        API1["API Server"]
        DB1[("Primary DB")]
        Stream1["Stream Server"]
    end

    subgraph Secondary["Secondary Region (EU)"]
        API2["API Server (Read)"]
        DB2[("Read Replica")]
        Stream2["Stream Server"]
    end

    subgraph Edge["Global Edge"]
        E1["US PoPs"]
        E2["EU PoPs"]
        E3["APAC PoPs"]
    end

    API1 --> DB1
    DB1 -->|Replication| DB2
    API2 --> DB2

    DB1 --> Stream1
    DB2 --> Stream2

    Stream1 --> E1
    Stream1 --> E3
    Stream2 --> E2

    style Primary fill:#c8e6c9
    style Secondary fill:#fff9c4
```

### Edge Worker Deployment

| Deployment Model | Description | Use Case |
|-----------------|-------------|----------|
| **CDN Workers** | Deploy to CDN provider's edge | Cloudflare Workers, Vercel Edge |
| **Self-Hosted Edge** | Relay proxy in customer infra | Air-gapped, compliance |
| **Hybrid** | CDN + self-hosted for sensitive | Enterprise deployments |

---

## Architecture Pattern Checklist

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sync vs Async | **Async** (streaming) | Non-blocking flag updates |
| Push vs Pull | **Push** (SSE) | Eliminate cold start, sub-second propagation |
| Stateless vs Stateful | **Stateful** (cached state) | In-memory flag store for low latency |
| Read-heavy optimization | **Yes** | 1M+ reads per write |
| Edge vs Origin | **Edge evaluation** | <5ms latency requirement |
| Real-time vs Batch | **Real-time** streaming | <1 second propagation |

---

## High-Level Component Diagram

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Web["Web App"]
        Mobile["Mobile App"]
        Server["Server App"]
    end

    subgraph EdgeLayer["Edge Layer"]
        CDN["CDN / Edge Network"]
        Worker["Edge Workers"]
        Cache["Flag Cache"]
    end

    subgraph SyncLayer["Synchronization"]
        SSE["SSE Streaming"]
        GlobalKV["Global KV"]
    end

    subgraph ControlPlane["Control Plane"]
        FlagAPI["Flag API"]
        FlagDB["Flag DB"]
        Experiments["Experiment Engine"]
        Audit["Audit Log"]
    end

    subgraph Observability["Observability"]
        Metrics["Metrics"]
        Traces["Traces"]
        Alerts["Alerts"]
    end

    Web --> CDN
    Mobile --> CDN
    Server --> CDN

    CDN --> Worker
    Worker --> Cache

    SSE -->|Push| Cache
    GlobalKV -.->|Fallback| Cache

    FlagAPI --> FlagDB
    FlagAPI --> Experiments
    FlagAPI --> Audit
    FlagDB --> SSE
    FlagDB --> GlobalKV

    Worker --> Metrics
    Worker --> Traces
    Metrics --> Alerts

    style EdgeLayer fill:#e8f5e9
    style SyncLayer fill:#e3f2fd
    style ControlPlane fill:#fff3e0
    style Observability fill:#fce4ec
```

---

**Next:** [Low-Level Design →](./03-low-level-design.md)
