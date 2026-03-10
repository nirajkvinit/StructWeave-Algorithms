# Scalability & Reliability — AI-Native WhatsApp+PIX Commerce Assistant

## Scalability

### Horizontal vs. Vertical Scaling

| Component | Scaling Strategy | Rationale |
|---|---|---|
| **Webhook Gateway** | Horizontal (stateless) | Pure HTTP receiver; scale by adding instances behind load balancer |
| **Deduplication Service** | Horizontal with shared Redis | Stateless check against centralized Redis cluster |
| **Text Parser (LLM)** | Horizontal (GPU pool) | Each instance loads model independently; route by availability |
| **Speech-to-Text** | Horizontal (GPU pool) | Independent processing per audio file; no shared state |
| **Computer Vision** | Horizontal (GPU pool) | Independent processing per image; no shared state |
| **Conversation State Machine** | Horizontal with sticky routing | Route by conversation_id hash to maintain cache locality; any node can handle any conversation via shared store |
| **Payment Orchestrator** | Horizontal with distributed lock | Stateless service; exactly-once via lock per user |
| **PIX SPI Gateway** | Vertical (limited by SPI connection pool) | BCB allocates fixed connection capacity per PSP; vertical scaling within allocation |
| **Transaction Ledger DB** | Vertical + read replicas | Write-heavy ACID store; scale reads with replicas; shard by user_id if needed |
| **Message Queue** | Horizontal (partitioned) | Kafka-style partitioning by conversation_id; add partitions for throughput |

### Auto-Scaling Triggers

| Component | Metric | Scale-Up Trigger | Scale-Down Trigger | Min/Max Instances |
|---|---|---|---|---|
| Webhook Gateway | Request rate | >800 req/s per instance | <200 req/s per instance | 4 / 50 |
| LLM Inference | GPU utilization | >70% utilization | <30% utilization | 8 / 40 (GPU) |
| STT Engine | Queue depth | >100 pending audio | <20 pending audio | 4 / 20 (GPU) |
| CV Engine | Queue depth | >50 pending images | <10 pending images | 2 / 15 (GPU) |
| Conversation Engine | CPU utilization | >65% | <25% | 6 / 30 |
| Payment Orchestrator | Active payments | >50 concurrent per instance | <10 concurrent per instance | 4 / 20 |
| Outbound Message Sender | Queue depth | >5,000 pending messages | <500 pending messages | 2 / 10 |

### Database Scaling Strategy

**Conversation Store (Document DB):**
- Hash-sharded by user_id (16 shards initially, expandable to 64)
- Each shard handles ~2M users
- TTL-based auto-expiry for conversations older than 24 hours
- Read replicas for analytics queries (not on the payment path)

**Transaction Ledger (Relational DB):**
- Partitioned by `settled_at` (monthly partitions)
- Primary for writes; 2 synchronous replicas for durability
- Read replicas for balance queries and transaction history
- Archive partitions older than 12 months to cold storage; retain metadata in hot tier for 5 years

**DICT Cache (In-Memory Store):**
- Redis Cluster with 6 nodes (3 primary, 3 replica)
- Keyspace: ~50M PIX keys cached (most frequently used subset of DICT)
- Memory: ~50GB (1KB per key entry including metadata)
- Background refresh from BCB DICT feed every 15 minutes
- On cache miss: synchronous DICT query (30-50ms) with result cached

### Caching Layers

| Layer | Technology | Data | Hit Rate | Latency |
|---|---|---|---|---|
| **L1 (in-process)** | Local LRU cache | Active conversation state | ~60% | <1ms |
| **L2 (distributed)** | Redis Cluster | Conversation state, user profiles, dedup keys | ~85% | 2-5ms |
| **DICT cache** | Dedicated Redis | PIX key → account mappings + fraud metadata | ~92% | 2ms |
| **Template cache** | In-process | WhatsApp message templates | ~99% | <0.1ms |
| **Model cache** | GPU memory | Loaded AI model weights | ~100% | N/A (resident) |

### Hot Spot Mitigation

| Hot Spot | Cause | Mitigation |
|---|---|---|
| **Salary-day surge** | 5th, 15th, 30th of month: 3-5x traffic | Pre-scale 12 hours before; priority queue management |
| **Viral merchant** | Single merchant generates thousands of QR code scans | Rate limit per merchant; cache merchant QR metadata |
| **Celebrity endorsement** | Sudden onboarding spike | Auto-scale webhook gateway; graceful onboarding queue |
| **Single user spam** | Bot or misbehaving client sends thousands of messages | Per-user rate limit (50 messages/hour); progressive throttling |
| **DICT hot key** | Popular merchant PIX key queried thousands of times | Local cache with 15-minute TTL; pre-warm popular keys |

---

## Reliability & Fault Tolerance

### Single Points of Failure (SPOF) Analysis

| Component | SPOF Risk | Mitigation |
|---|---|---|
| **WhatsApp Cloud API** | External dependency; if Meta's API is down, no messages in or out | Cannot mitigate; this is the channel. Graceful degradation: notify users via push notification to use the banking app directly |
| **Redis dedup cluster** | If dedup fails, duplicates pass through | Multi-node Redis Cluster with auto-failover; Layer 3 (DB) catches duplicates |
| **PIX SPI connection** | BCB SPI downtime prevents all settlements | Extremely rare (PIX operates 24/7); queue payments with user notification; PIX SPI has <5 minutes annual downtime historically |
| **LLM inference cluster** | GPU failure disables text understanding | Multi-node GPU pool; fallback to regex extraction for simple patterns |
| **Transaction DB primary** | Write path blocked | Synchronous replication with automatic failover; RPO=0 for financial data |

### Redundancy Strategy

| Component | Redundancy | Failover Time |
|---|---|---|
| Webhook Gateway | N+2 instances across 3 availability zones | Instant (load balancer routes around failures) |
| Redis Cluster | 3 primary + 3 replica nodes, cross-AZ | <30 seconds (automatic sentinel failover) |
| Transaction DB | 1 primary + 2 synchronous replicas, cross-AZ | <60 seconds (automatic failover with RPO=0) |
| Conversation DB | 3 replicas per shard, cross-AZ | <30 seconds |
| GPU Pool (LLM) | N+4 GPU nodes (tolerate loss of 4 simultaneously) | Immediate (requests routed to available GPUs) |
| GPU Pool (STT/CV) | N+2 GPU nodes each | Immediate |
| Message Queue | 3x replication factor per partition | <10 seconds (ISR failover) |

### Failover Mechanisms

**Webhook Gateway Failover:**
- Load balancer health checks every 5 seconds
- Unhealthy instance removed from pool within 10 seconds
- Webhook retries from WhatsApp (up to 7 attempts over 24 hours) provide inherent retry

**AI Pipeline Failover:**

```
FUNCTION process_with_fallback(message, modality):
    TRY with timeout(SLA_TIMEOUT[modality]):
        RETURN primary_pipeline(message, modality)
    CATCH TimeoutError:
        metrics.increment("ai.timeout", modality=modality)
        RETURN fallback_pipeline(message, modality)
    CATCH ServiceUnavailable:
        metrics.increment("ai.unavailable", modality=modality)
        RETURN fallback_pipeline(message, modality)

FUNCTION fallback_pipeline(message, modality):
    SWITCH modality:
        CASE TEXT:
            // Regex-based extraction for common patterns
            RETURN regex_extract(message.text)
        CASE AUDIO:
            // Ask user to type instead
            send_message(message.from, "Processamento de áudio indisponível. Por favor, digite sua solicitação.")
            RETURN null
        CASE IMAGE:
            // Ask user to enter details manually
            send_message(message.from, "Processamento de imagem indisponível. Por favor, insira a chave PIX manualmente.")
            RETURN null
```

### Circuit Breaker Patterns

| Service | Failure Threshold | Open Duration | Half-Open Strategy |
|---|---|---|---|
| LLM Inference | 5 failures in 10 seconds | 30 seconds | Allow 1 request; if success, close |
| STT Engine | 3 failures in 10 seconds | 30 seconds | Allow 1 request |
| CV Engine | 3 failures in 10 seconds | 30 seconds | Allow 1 request |
| WhatsApp Send API | 10 failures in 5 seconds | 15 seconds | Allow 3 requests (batch) |
| DICT Query | 5 failures in 10 seconds | 60 seconds | Allow 1 request; use stale cache during open |
| SPI Gateway | 2 failures in 30 seconds | 120 seconds | Allow 1 small-value transaction as probe |

### Retry Strategies

| Operation | Strategy | Max Retries | Backoff |
|---|---|---|---|
| Webhook processing | Rely on WhatsApp retries (7 attempts over 24h) | N/A | WhatsApp-managed |
| AI inference | Immediate retry on transient error | 2 | 100ms, 500ms |
| DICT lookup | Immediate retry with cache fallback | 1 | 200ms, then use stale cache |
| SPI submission | Exponential backoff (financial operation) | 3 | 1s, 5s, 15s |
| WhatsApp message send | Exponential backoff with jitter | 5 | 200ms, 500ms, 1s, 2s, 5s |
| Receipt generation | Async retry via dead-letter queue | 10 | 1s, 5s, 30s, 1m, 5m... |

### Graceful Degradation

| Degradation Level | Trigger | Behavior |
|---|---|---|
| **Level 0 (Normal)** | All systems healthy | Full multimodal processing, all features active |
| **Level 1 (AI Degraded)** | LLM or STT unavailable | Regex extraction for text; voice messages deferred; QR still works |
| **Level 2 (Partial Outage)** | Multiple AI services down | Text-only with regex; explicit structured input prompts ("Envie: PIX R$[valor] para [chave]") |
| **Level 3 (Payment Only)** | Conversation engine degraded | Direct payment links without conversational interface; banking app deep links |
| **Level 4 (Read Only)** | Payment execution unavailable | Balance queries and transaction history only; payment requests queued |
| **Level 5 (Offline)** | WhatsApp API unreachable | Push notification to users: "Use o app do banco diretamente" |

### Bulkhead Pattern

| Bulkhead | Isolated Resources | Purpose |
|---|---|---|
| **Payment processing** | Dedicated thread pool (200 threads), separate connection pool to DB | Payment transactions never starved by AI processing load |
| **Voice processing** | Dedicated GPU allocation (40% of GPU pool) | STT workload doesn't compete with LLM inference |
| **Outbound messaging** | Separate rate limiter per message priority | Receipt messages never delayed by marketing messages |
| **Per-user processing** | Max 5 concurrent messages per user | Misbehaving client can't exhaust system resources |

---

## Disaster Recovery

### RTO / RPO Targets

| Component | RTO | RPO | Justification |
|---|---|---|---|
| **Payment execution path** | 5 minutes | 0 (zero data loss) | Financial transactions are irrevocable; cannot lose settlement records |
| **Conversation engine** | 15 minutes | 5 minutes | Conversations can be re-initiated; small data loss acceptable |
| **AI pipeline** | 30 minutes | N/A (stateless) | Models reloaded from registry; no persistent state to recover |
| **Analytics & reporting** | 4 hours | 1 hour | Non-critical path; batch processes can re-run |

### Backup Strategy

| Data | Backup Type | Frequency | Retention | Location |
|---|---|---|---|---|
| Transaction ledger | Continuous WAL replication + daily snapshots | Continuous + daily | 5 years | Cross-region object storage |
| Conversation store | Daily snapshots | Every 6 hours | 90 days | Same region, different AZ |
| User profiles | Daily snapshots | Daily | 2 years | Cross-region |
| Audit logs | Append-only with daily integrity verification | Continuous | 5 years | Cross-region, immutable storage |
| AI models | Version-controlled in model registry | On each training run | All versions retained | Cross-region object storage |
| Configuration | Version-controlled in Git | On each change | Indefinite | Git repository |

### Multi-Region Considerations

Brazil-specific constraints:
- **Data sovereignty**: LGPD requires personal data of Brazilian citizens to be stored in Brazil or in countries with adequate data protection laws
- **SPI connectivity**: PIX SPI is accessible only from within the RSFN (national financial network); the primary data center must be in Brazil
- **Latency**: Users are concentrated in Southeast Brazil (São Paulo, Rio de Janeiro); primary region should be São Paulo
- **DR region**: Secondary region in another Brazilian city (e.g., Brasilia or Campinas) for regulatory compliance

**Active-Passive DR:**
- Primary: São Paulo data center (all traffic)
- Secondary: Brasilia data center (warm standby, receives replicated data)
- Failover trigger: >5 minutes of primary unavailability detected by external health checks
- Failover time: ~15 minutes (DNS switch + warm instance scaling)
- Failback: Manual, after verification of data consistency between regions
