# Scalability & Reliability

## Horizontal Scaling Strategy

### Service Scaling Matrix

| Component | Stateless | Scaling Trigger | Min | Max | Strategy |
|-----------|-----------|-----------------|-----|-----|----------|
| **Ingestion API** | Yes | QPS > 500/pod | 3 | 20 | HPA on request rate |
| **Pre-processing Workers** | Yes | Queue depth > 100 | 5 | 50 | HPA on queue depth |
| **OCR Workers (GPU)** | Yes | GPU util > 70% | 4 | 24 | Manual/KEDA on queue |
| **Classification Workers (GPU)** | Yes | Queue depth > 50 | 2 | 12 | HPA on queue depth |
| **Extraction Workers (GPU)** | Yes | Queue depth > 50 | 4 | 24 | HPA on queue depth |
| **Validation Workers** | Yes | CPU > 70% | 3 | 15 | HPA on CPU |
| **HITL Backend** | Yes | Concurrent users | 2 | 10 | HPA on connections |
| **Integration Workers** | Yes | Queue depth > 100 | 2 | 10 | HPA on queue depth |

### Auto-Scaling Configuration

```yaml
# Horizontal Pod Autoscaler for Extraction Workers
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: extraction-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: extraction-worker
  minReplicas: 4
  maxReplicas: 24
  metrics:
    # Primary: Queue depth
    - type: External
      external:
        metric:
          name: kafka_consumer_lag
          selector:
            matchLabels:
              topic: extraction-tasks
        target:
          type: AverageValue
          averageValue: "50"
    # Secondary: GPU utilization
    - type: Pods
      pods:
        metric:
          name: gpu_utilization
        target:
          type: AverageValue
          averageValue: "70"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 25
          periodSeconds: 120
```

### GPU Node Pool Auto-Scaling

```yaml
# KEDA ScaledObject for GPU workers
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: ocr-worker-scaler
spec:
  scaleTargetRef:
    name: ocr-worker
  minReplicaCount: 4
  maxReplicaCount: 24
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka:9092
        consumerGroup: ocr-workers
        topic: ocr-tasks
        lagThreshold: "100"
    - type: prometheus
      metadata:
        serverAddress: http://prometheus:9090
        metricName: ocr_queue_depth
        threshold: "50"
        query: |
          sum(kafka_consumer_lag{topic="ocr-tasks"})
```

---

## Document Routing and Partitioning

### Partitioning Strategy

| Dimension | Strategy | Rationale |
|-----------|----------|-----------|
| **Tenant** | Separate Kafka partitions | Isolation, fair scheduling |
| **Document Type** | Specialized worker pools | Optimized model loading |
| **Priority** | Dedicated high-priority queues | SLA guarantees |
| **Region** | Geo-partitioning | Data residency compliance |

### Kafka Topic Architecture

```mermaid
flowchart TB
    subgraph Producers["Document Producers"]
        INGEST["Ingestion<br/>Service"]
    end

    subgraph Topics["Kafka Topics"]
        subgraph ByPriority["By Priority"]
            URGENT["documents.urgent<br/>(3 partitions)"]
            HIGH["documents.high<br/>(6 partitions)"]
            NORMAL["documents.normal<br/>(12 partitions)"]
        end

        subgraph ByStage["By Processing Stage"]
            OCR_T["ocr.tasks<br/>(12 partitions)"]
            CLASS_T["classification.tasks<br/>(6 partitions)"]
            EXTRACT_T["extraction.tasks<br/>(12 partitions)"]
            VALIDATE_T["validation.tasks<br/>(6 partitions)"]
        end

        subgraph Results["Results"]
            COMPLETED["documents.completed<br/>(6 partitions)"]
            FAILED["documents.failed<br/>(3 partitions)"]
        end
    end

    subgraph Consumers["Worker Pools"]
        OCR_W["OCR Workers"]
        CLASS_W["Classification Workers"]
        EXTRACT_W["Extraction Workers"]
        VALIDATE_W["Validation Workers"]
    end

    INGEST --> URGENT
    INGEST --> HIGH
    INGEST --> NORMAL

    URGENT --> OCR_T
    HIGH --> OCR_T
    NORMAL --> OCR_T

    OCR_T --> OCR_W
    CLASS_T --> CLASS_W
    EXTRACT_T --> EXTRACT_W
    VALIDATE_T --> VALIDATE_W

    OCR_W --> CLASS_T
    CLASS_W --> EXTRACT_T
    EXTRACT_W --> VALIDATE_T
    VALIDATE_W --> COMPLETED
    VALIDATE_W --> FAILED

    classDef producer fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef topic fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef consumer fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class INGEST producer
    class URGENT,HIGH,NORMAL,OCR_T,CLASS_T,EXTRACT_T,VALIDATE_T,COMPLETED,FAILED topic
    class OCR_W,CLASS_W,EXTRACT_W,VALIDATE_W consumer
```

### Partition Key Strategy

```
FUNCTION CalculatePartitionKey(document)
  // Ensure same tenant's documents go to same partition for ordering
  base_key = hash(document.tenant_id)

  // Add priority lane
  IF document.priority == "urgent" THEN
    partition = base_key % 3  // Only 3 urgent partitions
  ELSE IF document.priority == "high" THEN
    partition = base_key % 6  // 6 high partitions
  ELSE
    partition = base_key % 12  // 12 normal partitions
  END IF

  RETURN partition
```

---

## Replication Strategy

### Data Replication

| Component | Replication Factor | Cross-AZ | Cross-Region | Consistency |
|-----------|-------------------|----------|--------------|-------------|
| **Document Store (S3)** | 3 | Yes | Optional | Eventual |
| **Extracted Data (PostgreSQL)** | 3 | Yes | Async standby | Strong |
| **Audit Logs (ClickHouse)** | 3 | Yes | Yes | Eventual |
| **Kafka** | 3 | Yes | No (separate clusters) | Strong |
| **Redis Cache** | 2 | Yes | No | Eventual |
| **Model Registry** | 2 | Yes | Yes | Strong |

### Database Replication Architecture

```mermaid
flowchart TB
    subgraph Primary["Primary Region (us-east-1)"]
        PG_PRIMARY["PostgreSQL<br/>Primary"]
        PG_SYNC1["PostgreSQL<br/>Sync Replica 1"]
        PG_SYNC2["PostgreSQL<br/>Sync Replica 2"]

        PG_PRIMARY -->|"Sync"| PG_SYNC1
        PG_PRIMARY -->|"Sync"| PG_SYNC2
    end

    subgraph Secondary["Secondary Region (us-west-2)"]
        PG_ASYNC["PostgreSQL<br/>Async Replica"]
    end

    PG_PRIMARY -->|"Async<br/>(~1s lag)"| PG_ASYNC

    subgraph ReadRouting["Read Routing"]
        WRITES["Writes"] --> PG_PRIMARY
        READS["Reads"] --> LB["Load Balancer"]
        LB --> PG_SYNC1
        LB --> PG_SYNC2
    end

    classDef primary fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef replica fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef routing fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class PG_PRIMARY primary
    class PG_SYNC1,PG_SYNC2,PG_ASYNC replica
    class WRITES,READS,LB routing
```

---

## Fault Tolerance

### Circuit Breaker Configuration

| Service | Failure Threshold | Recovery Time | Fallback |
|---------|------------------|---------------|----------|
| **OCR (Textract)** | 50% in 30s | 60s | DocTR/Tesseract |
| **Foundation Model (GPT-4V)** | 30% in 30s | 120s | Specialized model only |
| **Database** | 30% in 10s | 30s | Cache reads, queue writes |
| **HITL Service** | 50% in 60s | 120s | Auto-approve high confidence |
| **Export Webhook** | 50% in 60s | 300s | Retry queue |

### Circuit Breaker Implementation

```yaml
# Resilience4j configuration
resilience4j:
  circuitbreaker:
    instances:
      textract:
        registerHealthIndicator: true
        slidingWindowSize: 10
        minimumNumberOfCalls: 5
        failureRateThreshold: 50
        waitDurationInOpenState: 60s
        permittedNumberOfCallsInHalfOpenState: 3
        automaticTransitionFromOpenToHalfOpenEnabled: true

      foundation-model:
        slidingWindowSize: 20
        failureRateThreshold: 30
        waitDurationInOpenState: 120s
        slowCallDurationThreshold: 10s
        slowCallRateThreshold: 50

  retry:
    instances:
      textract:
        maxAttempts: 3
        waitDuration: 2s
        exponentialBackoffMultiplier: 2
        retryExceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
```

### Graceful Degradation Levels

```mermaid
flowchart TB
    subgraph Level0["L0: Normal Operation"]
        L0_DESC["Full pipeline active<br/>All models available<br/>HITL operational"]
    end

    subgraph Level1["L1: Degraded - Foundation Models Unavailable"]
        L1_DESC["Specialized models only<br/>Higher HITL rate<br/>Novel documents queued"]
    end

    subgraph Level2["L2: Degraded - OCR Service Issues"]
        L2_DESC["Single OCR engine<br/>Reduced throughput<br/>Quality may vary"]
    end

    subgraph Level3["L3: Degraded - HITL Unavailable"]
        L3_DESC["Auto-approve high confidence<br/>Queue low confidence<br/>Accuracy may drop"]
    end

    subgraph Level4["L4: Minimal - Critical Failure"]
        L4_DESC["Ingestion only<br/>No processing<br/>Queue for later"]
    end

    L0_DESC -->|"Foundation API down"| L1_DESC
    L0_DESC -->|"OCR service down"| L2_DESC
    L0_DESC -->|"HITL service down"| L3_DESC
    L1_DESC -->|"Multiple failures"| L4_DESC
    L2_DESC -->|"Multiple failures"| L4_DESC
    L3_DESC -->|"Multiple failures"| L4_DESC

    classDef normal fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef degraded fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef critical fill:#ffebee,stroke:#c62828,stroke-width:2px

    class L0_DESC normal
    class L1_DESC,L2_DESC,L3_DESC degraded
    class L4_DESC critical
```

### Degradation Decision Matrix

| Trigger | Degradation Level | Actions |
|---------|------------------|---------|
| Foundation model 429s > 30% | L1 | Use specialized only, queue complex docs |
| Textract unavailable | L2 | Route all to DocTR/Tesseract |
| HITL service down | L3 | Auto-approve > 85% confidence, queue rest |
| Database write latency > 5s | L1 | Buffer writes, async persistence |
| GPU availability < 50% | L2 | Reduce batch size, increase queue tolerance |
| Multiple services down | L4 | Accept ingestion only, stop processing |

---

## Disaster Recovery

### Recovery Objectives

| Scenario | RTO | RPO | Strategy |
|----------|-----|-----|----------|
| **Single Node Failure** | 30s | 0 | Kubernetes auto-restart |
| **AZ Failure** | 5 min | 0 | Multi-AZ deployment |
| **Region Failure** | 15 min | 5 min | Active-passive failover |
| **Data Corruption** | 1 hour | 15 min | Point-in-time recovery |
| **Complete System Failure** | 4 hours | 1 hour | Backup restoration |

### Multi-Region Architecture

```mermaid
flowchart TB
    subgraph Primary["Primary Region (Active)"]
        subgraph PrimaryCompute["Compute"]
            P_API["API Gateway"]
            P_WORKERS["Workers"]
            P_HITL["HITL Service"]
        end
        subgraph PrimaryData["Data"]
            P_DB["PostgreSQL<br/>(Primary)"]
            P_S3["S3 Bucket"]
            P_KAFKA["Kafka"]
        end
    end

    subgraph Secondary["Secondary Region (Standby)"]
        subgraph SecondaryCompute["Compute (Scaled Down)"]
            S_API["API Gateway<br/>(Standby)"]
            S_WORKERS["Workers<br/>(Minimal)"]
        end
        subgraph SecondaryData["Data"]
            S_DB["PostgreSQL<br/>(Async Replica)"]
            S_S3["S3 Bucket<br/>(Cross-Region Replication)"]
        end
    end

    subgraph GlobalServices["Global Services"]
        DNS["Route 53<br/>Health Check"]
        CDN["CloudFront"]
    end

    DNS --> P_API
    DNS -.->|"Failover"| S_API
    CDN --> P_S3
    CDN --> S_S3

    P_DB -->|"Async Replication"| S_DB
    P_S3 -->|"Cross-Region Replication"| S_S3

    classDef primary fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef secondary fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef global fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class P_API,P_WORKERS,P_HITL,P_DB,P_S3,P_KAFKA primary
    class S_API,S_WORKERS,S_DB,S_S3 secondary
    class DNS,CDN global
```

### Backup Strategy

| Data Type | Backup Frequency | Retention | Storage |
|-----------|-----------------|-----------|---------|
| **PostgreSQL** | Continuous WAL + Daily full | 30 days (full), 7 days (WAL) | Cross-region S3 |
| **Document Store** | Cross-region replication | 7 years | S3 Glacier |
| **Kafka Topics** | Topic mirroring | 7 days | Secondary cluster |
| **Model Artifacts** | On change | All versions | S3 + Git LFS |
| **Configuration** | On change | All versions | Git + Secrets Manager |

### Failover Procedure

```
PROCEDURE RegionFailover(failed_region, target_region)
1. // Detection (automated)
   health_check_failures >= 3 consecutive
   OR manual trigger by operator

2. // DNS failover
   update_route53_health_check(failed_region, unhealthy)
   // Automatic failover to secondary within 60s

3. // Promote database replica
   pg_promote(target_region.db_replica)
   update_connection_strings(target_region.db)

4. // Scale up secondary compute
   scale_deployment(target_region.api, replicas=original)
   scale_deployment(target_region.workers, replicas=original)

5. // Resume processing
   resume_kafka_consumers(target_region)
   process_queued_documents()

6. // Verify
   run_health_checks(target_region)
   verify_data_consistency()

7. // Notify
   alert_operations_team()
   update_status_page()
```

---

## Caching Strategy

### Cache Layers

| Layer | Content | TTL | Size | Purpose |
|-------|---------|-----|------|---------|
| **L1: Model Cache** | Loaded ML models | Session | 50 GB | Reduce cold start |
| **L2: OCR Cache** | Page hash → OCR result | 24h | 100 GB | Deduplicate OCR |
| **L3: Schema Cache** | Document type → schema | 1h | 1 GB | Reduce DB reads |
| **L4: Classification Cache** | Doc hash → type | 1h | 10 GB | Skip reclassification |
| **L5: Result Cache** | API response cache | 5 min | 5 GB | Reduce latency |

### Cache Architecture

```mermaid
flowchart LR
    subgraph Application["Application Layer"]
        API["API Service"]
        WORKER["Worker"]
    end

    subgraph Cache["Cache Layer"]
        L1["L1: Local Memory<br/>(Per-pod)"]
        L2["L2: Redis Cluster<br/>(Shared)"]
    end

    subgraph Storage["Storage Layer"]
        DB["PostgreSQL"]
        S3["Object Storage"]
    end

    API --> L1
    L1 -->|"Miss"| L2
    L2 -->|"Miss"| DB
    L2 -->|"Miss"| S3

    WORKER --> L1
    L1 -->|"Miss"| L2

    classDef app fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef cache fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class API,WORKER app
    class L1,L2 cache
    class DB,S3 storage
```

### Cache Invalidation Strategy

| Cache Type | Invalidation Trigger | Strategy |
|------------|---------------------|----------|
| **Model Cache** | Model version change | TTL + version tag |
| **OCR Cache** | Document re-processed | TTL expiry |
| **Schema Cache** | Schema updated | Pub/Sub notification |
| **Classification Cache** | Model retrained | Version-based key |
| **Result Cache** | Document updated | Write-through invalidation |

### OCR Deduplication

```
ALGORITHM CheckOCRCache(page_image)
INPUT:
  page_image: Image to OCR

OUTPUT:
  ocr_result: Cached or fresh OCR result

PROCEDURE:
1. // Generate content hash
   image_hash = sha256(normalize(page_image))

2. // Check cache
   cached = redis.get(f"ocr:{image_hash}")
   IF cached THEN
     metrics.increment("ocr_cache_hit")
     RETURN deserialize(cached)
   END IF

3. // Cache miss - perform OCR
   metrics.increment("ocr_cache_miss")
   ocr_result = perform_ocr(page_image)

4. // Store in cache
   redis.setex(
     f"ocr:{image_hash}",
     ttl = 24 * 60 * 60,  // 24 hours
     value = serialize(ocr_result)
   )

5. RETURN ocr_result

FUNCTION normalize(image):
  // Normalize for consistent hashing
  resized = resize(image, max_dimension=2000)
  grayscale = convert_to_grayscale(resized)
  RETURN grayscale
```
