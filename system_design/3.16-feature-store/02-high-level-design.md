# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture Overview

A production Feature Store consists of three core subsystems: the **Feature Registry** (metadata management), the **Offline Store** (training data), and the **Online Store** (real-time serving). These are connected by **Materialization Pipelines** that sync features from offline to online storage.

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        DS[Data Scientists]
        TRAIN[Training Pipeline]
        INFER[Inference Service]
        EXPLORE[Feature Explorer UI]
    end

    subgraph Gateway["API Layer"]
        SDK[Feature Store SDK]
        API[Feature Store API]
        AUTH[Auth Service]
    end

    subgraph Registry["Feature Registry"]
        META[(Metadata Store)]
        CATALOG[Feature Catalog]
        VERSION[Version Control]
    end

    subgraph OfflineStore["Offline Store"]
        LAKE[(Data Lake<br/>Parquet/Delta)]
        PIT[PIT Join Engine]
        BATCH_READ[Batch Reader]
    end

    subgraph OnlineStore["Online Store"]
        KV[(Key-Value Store<br/>Redis/DynamoDB)]
        CACHE[Feature Cache]
        ONLINE_READ[Online Reader]
    end

    subgraph Materialization["Materialization Layer"]
        BATCH_MAT[Batch Materializer]
        STREAM_MAT[Stream Materializer]
        SCHEDULER[Job Scheduler]
    end

    subgraph DataSources["Data Sources"]
        DW[(Data Warehouse)]
        STREAM[Event Streams]
        DB[(Databases)]
    end

    DS --> SDK --> API
    TRAIN --> SDK
    INFER --> SDK
    EXPLORE --> API

    API --> AUTH
    AUTH --> META

    API --> PIT --> LAKE
    API --> ONLINE_READ --> KV
    ONLINE_READ --> CACHE

    DW --> BATCH_MAT
    STREAM --> STREAM_MAT
    DB --> BATCH_MAT

    BATCH_MAT --> LAKE
    BATCH_MAT --> KV
    STREAM_MAT --> KV
    SCHEDULER --> BATCH_MAT

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef registry fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef offline fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef online fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef materialize fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef source fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class DS,TRAIN,INFER,EXPLORE client
    class SDK,API,AUTH gateway
    class META,CATALOG,VERSION registry
    class LAKE,PIT,BATCH_READ offline
    class KV,CACHE,ONLINE_READ online
    class BATCH_MAT,STREAM_MAT,SCHEDULER materialize
    class DW,STREAM,DB source
```

---

## Component Responsibilities

| Component | Responsibility | Key Decisions |
|-----------|---------------|---------------|
| **Feature Store SDK** | Client library for Python/Spark | Lazy evaluation, batch optimization |
| **Feature Store API** | REST/gRPC endpoints | Async for batch, sync for online |
| **Auth Service** | API key validation, RBAC | Feature-level permissions |
| **Metadata Store** | Feature definitions, schemas | Versioned, searchable |
| **Feature Catalog** | Discovery, lineage, tags | Graph-based relationships |
| **Data Lake** | Historical feature storage | Time-partitioned, columnar |
| **PIT Join Engine** | Point-in-time retrieval | Temporal join correctness |
| **Key-Value Store** | Latest feature values | Entity-keyed, low latency |
| **Feature Cache** | Hot entity caching | LRU eviction, TTL-based |
| **Batch Materializer** | Scheduled offline→online sync | Idempotent, incremental |
| **Stream Materializer** | Real-time feature updates | Exactly-once semantics |
| **Job Scheduler** | Materialization orchestration | DAG-based, retry logic |

---

## Dual-Store Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DUAL-STORE ARCHITECTURE                           │
├────────────────────────────────┬────────────────────────────────────┤
│         OFFLINE STORE          │          ONLINE STORE              │
├────────────────────────────────┼────────────────────────────────────┤
│ • Historical data              │ • Latest values only               │
│ • Column-oriented (Parquet)    │ • Key-value oriented (Redis)       │
│ • High latency OK (minutes)    │ • Sub-10ms required                │
│ • PB-scale storage             │ • TB-scale storage                 │
│ • Point-in-time joins          │ • Point lookups                    │
│ • Batch processing             │ • Real-time serving                │
│ • Training data generation     │ • Model inference                  │
│ • Analytics and exploration    │ • Low-latency predictions          │
├────────────────────────────────┼────────────────────────────────────┤
│ Storage: Data Lake (Delta)     │ Storage: Redis/DynamoDB/Cassandra  │
│ Query: Spark SQL               │ Query: Key-Value GET               │
│ Scale: Horizontal partitioning │ Scale: Sharding by entity key      │
└────────────────────────────────┴────────────────────────────────────┘
                           │
                           │  Materialization
                           │  (Batch + Streaming)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DATA FLOW DIRECTION                              │
│   Data Sources → Offline Store → Materialization → Online Store     │
│                        ↓                                             │
│                  Training Pipeline (reads from Offline)              │
│                  Inference Service (reads from Online)               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Feature Registration Flow

```mermaid
sequenceDiagram
    autonumber
    participant DS as Data Scientist
    participant SDK as Feature Store SDK
    participant API as Feature Store API
    participant Registry as Feature Registry
    participant Validator as Schema Validator

    DS->>SDK: define_feature_view(name, entities, schema, source)
    SDK->>SDK: Validate DSL syntax
    SDK->>API: POST /v1/feature-views

    API->>Registry: Check if feature view exists
    alt Already Exists
        Registry-->>API: Existing version
        API->>Validator: Validate schema compatibility
        Validator-->>API: Compatible / Breaking change
        alt Breaking Change
            API-->>SDK: Error: Schema incompatible
            SDK-->>DS: Raise exception
        end
    end

    API->>Registry: Store feature view definition
    Registry->>Registry: Assign version, create audit log
    Registry-->>API: Feature view ID, version

    API->>API: Register materialization job (if configured)
    API-->>SDK: Success (feature_view_id)
    SDK-->>DS: FeatureView object
```

### Offline Retrieval Flow (Training Data with PIT Joins)

```mermaid
sequenceDiagram
    autonumber
    participant Pipeline as Training Pipeline
    participant SDK as Feature Store SDK
    participant API as Feature Store API
    participant Engine as PIT Join Engine
    participant Lake as Data Lake

    Pipeline->>SDK: get_historical_features(entity_df, feature_views)
    Note over Pipeline,SDK: entity_df has (entity_key, event_timestamp)

    SDK->>API: POST /v1/features/historical
    API->>API: Resolve feature view versions

    API->>Engine: Execute PIT join
    Engine->>Lake: Read feature data (partitioned by time)

    loop For each feature view
        Engine->>Engine: Temporal join (asof join)
        Note over Engine: feature_ts <= entity_event_ts
        Engine->>Engine: Apply TTL filter
    end

    Engine->>Engine: Merge all feature columns
    Engine-->>API: Result DataFrame

    API-->>SDK: Feature data (Parquet or Arrow)
    SDK-->>Pipeline: pandas/Spark DataFrame
```

### Online Retrieval Flow (Real-Time Inference)

```mermaid
sequenceDiagram
    autonumber
    participant Model as Inference Service
    participant SDK as Feature Store SDK
    participant Cache as Feature Cache
    participant Online as Online Store

    Model->>SDK: get_online_features(entity_keys, feature_views)
    SDK->>SDK: Batch entity keys

    SDK->>Cache: Check cache for entities
    alt Cache Hit (partial)
        Cache-->>SDK: Cached features
    end

    SDK->>Online: GET features for cache misses
    Online->>Online: Parallel key lookups
    Online-->>SDK: Feature values

    SDK->>Cache: Update cache
    SDK->>SDK: Merge cached + fetched
    SDK->>SDK: Apply default values for missing

    SDK-->>Model: Feature dict per entity
```

### Batch Materialization Flow

```mermaid
sequenceDiagram
    autonumber
    participant Scheduler as Job Scheduler
    participant Mat as Batch Materializer
    participant Lake as Data Lake
    participant Online as Online Store
    participant Monitor as Monitoring

    Scheduler->>Mat: Trigger materialization job
    Mat->>Lake: Read source data (incremental)
    Note over Mat,Lake: Since last materialization timestamp

    Mat->>Mat: Deduplicate by entity key
    Mat->>Mat: Apply transformations
    Mat->>Mat: Compute latest value per entity

    Mat->>Online: Upsert features (batched)
    Online->>Online: Update entity keys
    Online-->>Mat: Ack

    Mat->>Lake: Write materialization checkpoint
    Mat->>Monitor: Emit metrics (rows, latency, errors)

    Mat-->>Scheduler: Job complete
    Scheduler->>Scheduler: Schedule next run
```

### Streaming Materialization Flow

```mermaid
sequenceDiagram
    autonumber
    participant Source as Event Stream
    participant Stream as Stream Materializer
    participant State as State Store
    participant Online as Online Store
    participant Monitor as Monitoring

    Source->>Stream: Event (entity_key, features, timestamp)
    Stream->>State: Get current state for entity
    State-->>Stream: Current aggregations

    Stream->>Stream: Update aggregations
    Note over Stream: Windows, counts, sums, etc.

    Stream->>State: Save updated state
    Stream->>Online: Write updated features

    Stream->>Monitor: Emit processing metrics

    Note over Source,Online: Continuous processing with checkpointing
```

---

## Key Architectural Decisions

### Decision 1: Online Store Technology

| Option | Latency | Throughput | Cost | Best For |
|--------|---------|------------|------|----------|
| **Redis Cluster** | <1ms | 500K+ QPS | $$ | Ultra-low latency |
| **DynamoDB** | 1-5ms | 1M+ QPS | $$$ | Managed, auto-scaling |
| **Cassandra** | 2-10ms | 100K+ QPS | $ | Self-hosted, multi-DC |
| **Bigtable** | 2-5ms | 500K+ QPS | $$ | GCP ecosystem |

**Recommendation**: Redis for <5ms SLA, DynamoDB for managed simplicity.

### Decision 2: Offline Store Technology

| Option | Query Speed | Cost | Ecosystem | Best For |
|--------|-------------|------|-----------|----------|
| **Delta Lake** | Fast (Z-order) | $ | Databricks | Unified batch/streaming |
| **Apache Iceberg** | Fast | $ | Open, multi-engine | Cloud-agnostic |
| **Parquet on S3/GCS** | Moderate | $ | Universal | Simple, portable |
| **Data Warehouse** | Fast | $$$ | SQL-native | Existing DW investment |

**Recommendation**: Delta Lake or Iceberg for production, Parquet for simplicity.

### Decision 3: Materialization Strategy

```mermaid
flowchart TB
    Q1{Feature Freshness<br/>Requirement?}

    Q1 -->|<1 minute| STREAM[Streaming<br/>Materialization]
    Q1 -->|<15 minutes| MICRO[Micro-Batch<br/>Every 5-15 min]
    Q1 -->|<24 hours| BATCH[Batch<br/>Daily/Hourly]
    Q1 -->|Stable| LOAD[Load Once<br/>No refresh]

    STREAM --> S_TECH[Kafka + Flink/Spark Streaming]
    MICRO --> M_TECH[Spark Streaming micro-batch]
    BATCH --> B_TECH[Spark Batch + Scheduler]
    LOAD --> L_TECH[One-time ETL]

    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef strategy fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef tech fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class Q1 decision
    class STREAM,MICRO,BATCH,LOAD strategy
    class S_TECH,M_TECH,B_TECH,L_TECH tech
```

### Decision 4: Push vs Pull Materialization

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Push (Feature Store owns)** | Centralized control, SLA guarantees | Complex orchestration | Production, strict SLAs |
| **Pull (Source pushes)** | Source team ownership | Inconsistent freshness | Decentralized orgs |
| **Hybrid** | Flexibility | Complexity | Large enterprises |

**Recommendation**: Push model for critical features, hybrid for flexibility.

### Decision 5: Schema Evolution Strategy

```
Schema Changes:
─────────────────────────────────────────────────────────
BACKWARD COMPATIBLE (safe):
• Add new feature column (nullable)
• Widen numeric type (int → long)
• Add new tags/metadata

BREAKING (requires migration):
• Rename feature column
• Change data type incompatibly
• Remove feature column
• Change entity key

Migration Strategy:
─────────────────────────────────────────────────────────
1. Create new feature view version
2. Run both versions in parallel
3. Migrate consumers to new version
4. Deprecate old version (90-day notice)
5. Delete old version
```

---

## Architecture Variants

### Variant 1: Feast (Open Source)

```
┌────────────────────────────────────────┐
│           Feast Architecture            │
├────────────────────────────────────────┤
│  • Provider abstraction (AWS, GCP, etc.)│
│  • Python-native SDK                    │
│  • Parquet for offline, Redis for online│
│  • CLI-driven materialization           │
├────────────────────────────────────────┤
│  Pros: Open-source, portable, simple   │
│  Cons: Limited streaming, basic UI     │
│  Best: Small-medium scale, OSS stack   │
└────────────────────────────────────────┘
```

### Variant 2: Tecton (Managed)

```
┌────────────────────────────────────────┐
│           Tecton Architecture           │
├────────────────────────────────────────┤
│  • Declarative feature definitions      │
│  • Real-time transformations            │
│  • Managed infrastructure               │
│  • Databricks/Snowflake integration     │
├────────────────────────────────────────┤
│  Pros: Full-featured, managed, support │
│  Cons: Cost, vendor lock-in            │
│  Best: Enterprise, real-time features  │
└────────────────────────────────────────┘
```

### Variant 3: Custom (Uber Palette Style)

```
┌────────────────────────────────────────┐
│        Custom Architecture              │
├────────────────────────────────────────┤
│  • Built on existing infra (Spark, etc.)│
│  • Tight ML platform integration        │
│  • Custom serving layer (gRPC)          │
│  • Feature serving groups (SLA tiers)   │
├────────────────────────────────────────┤
│  Pros: Full control, optimized for org │
│  Cons: Build + maintain cost           │
│  Best: Large scale, unique requirements│
└────────────────────────────────────────┘
```

---

## Multi-Tenant Architecture

```mermaid
flowchart TB
    subgraph Tenants["Tenants"]
        T1[Team A]
        T2[Team B]
        T3[Team C]
    end

    subgraph Gateway["Shared Gateway"]
        API[API Gateway]
        AUTH[Auth + RBAC]
    end

    subgraph Registry["Shared Registry"]
        META[(Metadata Store)]
    end

    subgraph Storage["Tenant-Isolated Storage"]
        subgraph TeamA["Team A Namespace"]
            A_OFFLINE[(Offline Store)]
            A_ONLINE[(Online Store)]
        end
        subgraph TeamB["Team B Namespace"]
            B_OFFLINE[(Offline Store)]
            B_ONLINE[(Online Store)]
        end
        subgraph TeamC["Team C Namespace"]
            C_OFFLINE[(Offline Store)]
            C_ONLINE[(Online Store)]
        end
    end

    subgraph Shared["Shared Features"]
        SHARED[(Cross-Team Features)]
    end

    T1 & T2 & T3 --> API --> AUTH
    AUTH --> META

    AUTH -->|Team A| A_OFFLINE & A_ONLINE
    AUTH -->|Team B| B_OFFLINE & B_ONLINE
    AUTH -->|Team C| C_OFFLINE & C_ONLINE

    A_OFFLINE & B_OFFLINE & C_OFFLINE -.->|Read| SHARED

    classDef tenant fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef shared fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef storage fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class T1,T2,T3 tenant
    class API,AUTH,META shared
    class A_OFFLINE,A_ONLINE,B_OFFLINE,B_ONLINE,C_OFFLINE,C_ONLINE,SHARED storage
```

**Isolation Strategies:**
- **Namespace-based**: Logical separation within shared infrastructure
- **Resource-based**: Separate storage accounts per team
- **Hybrid**: Shared registry, isolated storage

---

## Integration Points

### ML Pipeline Integration

```mermaid
flowchart LR
    subgraph Training["Training Pipeline"]
        TRAIN_DATA[Training Data<br/>Generation]
        MODEL_TRAIN[Model Training]
        EVAL[Model Evaluation]
    end

    subgraph FeatureStore["Feature Store"]
        OFFLINE[Offline Store]
        ONLINE[Online Store]
        REGISTRY[Registry]
    end

    subgraph Serving["Serving Pipeline"]
        INFER[Inference Service]
        MODEL[Model Server]
    end

    REGISTRY -->|Feature definitions| TRAIN_DATA
    OFFLINE -->|Historical features| TRAIN_DATA
    TRAIN_DATA --> MODEL_TRAIN --> EVAL

    REGISTRY -->|Feature definitions| INFER
    ONLINE -->|Real-time features| INFER
    INFER --> MODEL

    classDef train fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef fs fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef serve fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class TRAIN_DATA,MODEL_TRAIN,EVAL train
    class OFFLINE,ONLINE,REGISTRY fs
    class INFER,MODEL serve
```

### Data Platform Integration

```
Integration Points:
─────────────────────────────────────────────────────────
Data Warehouse (Snowflake, BigQuery, Redshift):
• Source for batch features
• SQL-based feature transformations
• Federated queries for exploration

Streaming Platform (Kafka, Kinesis):
• Source for streaming features
• Real-time event processing
• Change data capture (CDC)

Orchestration (Airflow, Prefect, Dagster):
• Schedule materialization jobs
• Monitor pipeline health
• Handle failures and retries

ML Platform (MLflow, SageMaker, Vertex AI):
• Feature versioning tied to experiments
• Model-to-feature lineage
• Serving infrastructure integration
```

---

## Architecture Pattern Checklist

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Online Store | Redis vs DynamoDB | **Redis Cluster** | Sub-5ms latency requirement |
| Offline Store | Delta vs Iceberg vs Parquet | **Delta Lake** | Unified batch/streaming, Spark ecosystem |
| Materialization | Push vs Pull | **Push (Feature Store owns)** | Centralized SLA management |
| Multi-Tenancy | Namespace vs Resource | **Namespace** | Cost efficiency, shared governance |
| Schema Evolution | In-place vs Versioned | **Versioned** | Backward compatibility |
| Streaming | Flink vs Spark Streaming | **Spark Streaming** | Unified with batch processing |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01 | Initial high-level design |
