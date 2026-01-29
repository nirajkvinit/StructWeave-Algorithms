# Requirements & Capacity Estimations

## Functional Requirements

### Core Features (Must Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Multi-Engine Translation** | Support NMT engines (DeepL, Google, Language Weaver) and LLM translation (GPT-4, Claude) | P0 |
| **Translation Memory (TM)** | Store, query, and leverage previous translations with fuzzy matching | P0 |
| **Quality Estimation (QE)** | Neural QE scoring (COMET) for all MT output | P0 |
| **Human-in-the-Loop (MTPE)** | Post-editing workflow with editor assignment and review | P0 |
| **Terminology Management** | Glossaries, style guides, brand voice enforcement | P0 |
| **File Format Support** | XLIFF, JSON, PO, strings, SRT, HTML, DOCX, Markdown | P0 |
| **Project Management** | Jobs, projects, deadlines, progress tracking | P0 |
| **API Access** | REST/GraphQL API for programmatic translation | P0 |

### Advanced Features (Should Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Adaptive Learning** | Real-time model updates from human corrections | P1 |
| **Engine Routing** | Intelligent selection of optimal engine per segment | P1 |
| **Workflow Automation** | AI agents for job assignment, QA, notifications | P1 |
| **CI/CD Integration** | Git, CMS connectors, webhook triggers | P1 |
| **Context Window** | Document-level context for LLM translation | P1 |
| **Quality Analytics** | COMET trends, human edit ratios, translator performance | P1 |
| **Batch Translation** | Bulk file upload with parallel processing | P1 |

### Extended Features (Nice to Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Multi-Modal Translation** | Image OCR, video subtitle extraction | P2 |
| **Real-Time Translation** | WebSocket-based streaming translation | P2 |
| **Custom Model Training** | Domain-specific NMT fine-tuning | P2 |
| **Translation Review Workflows** | Multi-stage review with approval chains | P2 |
| **Cost Optimization** | Token/word cost tracking, budget alerts | P2 |

### Explicitly Out of Scope

- **Interpretation services** (real-time speech-to-speech)
- **Transcription** (speech-to-text without translation)
- **Content creation** (original content generation)
- **Desktop CAT tools** (focus is cloud-native platform)
- **Legacy SMT engines** (Statistical Machine Translation)

---

## Non-Functional Requirements

### CAP Theorem & Consistency

| Decision | Choice | Justification |
|----------|--------|---------------|
| **CAP Priority** | CP for TM writes, AP for MT serving | TM consistency critical, MT can retry |
| **Consistency Model** | Strong for TM segments, Eventual for QE scores | TM is source of truth, QE is advisory |
| **Conflict Resolution** | Last-write-wins for TM, version vectors for projects | Simple TM model, complex project state |

### Availability Targets

| Component | Target | Justification |
|-----------|--------|---------------|
| Translation API | 99.9% (8.76h downtime/year) | Business-critical for CI/CD |
| TM Service | 99.95% (4.38h downtime/year) | Foundation for all translations |
| MTPE Workbench | 99.5% (43.8h downtime/year) | Human workflow is async |
| QE Service | 99.9% (8.76h downtime/year) | Critical for routing decisions |
| Admin Console | 99.5% (43.8h downtime/year) | Management not real-time critical |

### Latency Requirements

| Operation | p50 | p95 | p99 | Context |
|-----------|-----|-----|-----|---------|
| TM Lookup (exact match) | 10ms | 30ms | 50ms | Index lookup |
| TM Lookup (fuzzy match) | 30ms | 80ms | 150ms | Similarity search |
| NMT Translation (single segment) | 100ms | 200ms | 500ms | Model inference |
| LLM Translation (single segment) | 500ms | 1.5s | 3s | API call with context |
| QE Scoring (single segment) | 20ms | 50ms | 100ms | Lightweight model |
| Batch Translation (100 segments) | 5s | 15s | 30s | Parallel processing |
| File Upload & Parse | 500ms | 2s | 5s | Per MB of content |

### Durability & Data Retention

| Data Type | Durability | Retention | Justification |
|-----------|------------|-----------|---------------|
| Translation Memory | 99.999999999% (11 9s) | Indefinite | Core business asset |
| Completed Jobs | 99.999999% (8 9s) | 7 years | Audit compliance |
| QE Scores | 99.99% (4 9s) | 2 years | Analytics, not critical |
| Edit History | 99.9999% (6 9s) | 5 years | Learning, audit |
| API Logs | 99.99% (4 9s) | 90 days | Debugging |

---

## Capacity Estimations

### Assumptions

| Parameter | Value | Source |
|-----------|-------|--------|
| Enterprise customers | 500 | Target market |
| Words per customer per month | 100K-10M | Tiered usage |
| Average words per segment | 15 | Industry standard |
| Segments per TM | 1M average | Per customer |
| Language pairs per customer | 20 average | Global enterprises |
| Peak-to-average ratio | 3x | End-of-quarter spikes |
| TM reuse rate | 40% | Industry benchmark |
| Human edit rate | 30% | Post-MT correction |

### Traffic Estimations

| Metric | Calculation | Value |
|--------|-------------|-------|
| **Total words/month** | 500 customers × 2M avg words | 1B words/month |
| **Total words/day** | 1B / 30 | 33M words/day |
| **Peak words/day** | 33M × 3 | 100M words/day |
| **Segments/day (average)** | 33M / 15 words | 2.2M segments/day |
| **Segments/day (peak)** | 100M / 15 words | 6.7M segments/day |
| **Translation QPS (average)** | 2.2M / 86,400 | ~25 QPS |
| **Translation QPS (peak)** | 6.7M / 86,400 × burst | ~300 QPS |
| **TM lookups/day** | 2.2M segments × 2 lookups | 4.4M lookups/day |
| **TM lookups QPS (average)** | 4.4M / 86,400 | ~50 QPS |
| **QE inferences/day** | 2.2M segments × 0.6 (non-TM) | 1.3M QE/day |
| **Human edits/day** | 1.3M × 0.3 | 400K edits/day |

### Storage Estimations

| Data Type | Calculation | Year 1 | Year 5 |
|-----------|-------------|--------|--------|
| **TM Segments** | 500 customers × 1M segments × 1KB | 500GB | 2.5TB |
| **TM Index (fuzzy match)** | 500GB × 2 (embedding index) | 1TB | 5TB |
| **Job History** | 1B words/month × 12 × 0.1KB/word metadata | 1.2TB | 6TB |
| **Edit History** | 400K edits/day × 365 × 2KB | 300GB | 1.5TB |
| **QE Scores** | 1.3M/day × 365 × 100B | 50GB | 250GB |
| **API Logs** | 25 QPS × 86,400 × 1KB × 90 days | 200GB | 200GB |
| **Total Storage** | | **3.25TB** | **15.5TB** |

### Bandwidth Estimations

| Flow | Calculation | Value |
|------|-------------|-------|
| **Inbound (source content)** | 33M words × 6 bytes × 2 (overhead) | 400MB/day avg |
| **Outbound (translations)** | 33M words × 8 bytes × 2 | 530MB/day avg |
| **TM sync (replication)** | 500GB / 30 days incremental (1%) | 170MB/day |
| **Model updates** | 1 model × 10GB / week | 1.4GB/day |
| **Peak bandwidth** | 3x average | ~3GB/day peak |

### Compute Estimations

| Component | Calculation | Instances |
|-----------|-------------|-----------|
| **NMT Inference** | 200 QPS peak × 100ms/req → 20 concurrent | 10 GPU instances (2x redundancy) |
| **LLM Translation** | 50 QPS peak × 1.5s/req → 75 concurrent | External API (rate limit 100 RPM) |
| **QE Inference** | 300 QPS peak × 50ms/req → 15 concurrent | 5 GPU instances |
| **TM Service** | 500 QPS peak × 50ms/req → 25 concurrent | 10 CPU instances |
| **API Gateway** | 1000 QPS peak | 5 instances |
| **Workflow Engine** | 10K jobs/day concurrent | 3 instances |

---

## SLOs / SLAs

### Translation API SLOs

| Metric | SLO Target | Measurement | Alert Threshold |
|--------|------------|-------------|-----------------|
| **Availability** | 99.9% monthly | Successful responses / total | <99.5% (15min window) |
| **Latency (NMT) p95** | <500ms | End-to-end single segment | >800ms |
| **Latency (LLM) p95** | <3s | End-to-end single segment | >5s |
| **Error Rate** | <0.1% | 5xx responses | >0.5% |
| **Throughput** | 300 QPS sustained | Requests per second | <200 QPS capacity |

### Quality SLOs

| Metric | SLO Target | Measurement | Alert Threshold |
|--------|------------|-------------|-----------------|
| **COMET Score (average)** | >0.80 | Mean QE score across segments | <0.75 |
| **Human Edit Rate** | <35% | Segments requiring MTPE | >50% |
| **TM Hit Rate** | >40% | Segments served from TM | <30% |
| **Auto-Approve Rate** | >50% | Segments above QE threshold | <40% |
| **Terminology Accuracy** | >95% | Glossary term usage | <90% |

### Human Workflow SLOs

| Metric | SLO Target | Measurement | Alert Threshold |
|--------|------------|-------------|-----------------|
| **Queue Wait Time** | <4 hours p95 | Time from queue to assignment | >8 hours |
| **Turnaround Time** | <24 hours p95 | Time from submission to delivery | >48 hours |
| **Editor Utilization** | 70-85% | Editing time / available time | <60% or >90% |
| **Review Pass Rate** | >90% | First-time approval rate | <80% |

### Data SLOs

| Metric | SLO Target | Measurement | Alert Threshold |
|--------|------------|-------------|-----------------|
| **TM Sync Lag** | <5 minutes | Time for TM update propagation | >15 minutes |
| **Backup RPO** | <1 hour | Maximum data loss window | >4 hours |
| **Backup RTO** | <4 hours | Recovery time | >12 hours |
| **Adaptive Learning Lag** | <24 hours | Correction to model update | >72 hours |

---

## Cost Estimation

### Infrastructure Costs (Monthly)

| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| **NMT GPU Instances** | 10 × A10G (24GB) | $15,000 |
| **QE GPU Instances** | 5 × T4 (16GB) | $3,000 |
| **CPU Instances (API, TM, Workflow)** | 25 × 8-core, 32GB | $5,000 |
| **Database (TM, Jobs)** | 4TB SSD, 3-replica | $8,000 |
| **Object Storage** | 20TB with replication | $500 |
| **LLM API Costs** | 500M tokens/month @ $10/M | $5,000 |
| **CDN & Bandwidth** | 100TB transfer | $2,000 |
| **Monitoring & Logging** | Full observability stack | $2,000 |
| **Total Infrastructure** | | **~$40,500/month** |

### Cost per Word

| Tier | Volume | Cost/Word | Breakdown |
|------|--------|-----------|-----------|
| **TM Hit (100% match)** | 40% of volume | $0.001 | Storage + lookup only |
| **NMT Only (high QE)** | 30% of volume | $0.005 | NMT inference + QE |
| **NMT + Light MTPE** | 20% of volume | $0.02 | NMT + human review |
| **LLM Translation** | 10% of volume | $0.03 | LLM API + QE |
| **Blended Average** | 100% | **$0.01/word** | Weighted average |

---

## Scalability Dimensions

### Horizontal Scaling Triggers

| Component | Metric | Scale-Up Trigger | Scale-Down Trigger |
|-----------|--------|------------------|-------------------|
| **NMT Service** | GPU utilization | >70% for 5 min | <30% for 15 min |
| **QE Service** | Inference latency p95 | >100ms | <30ms |
| **TM Service** | Query latency p95 | >100ms | <30ms |
| **API Gateway** | Request queue depth | >100 pending | <10 pending |
| **Workflow Workers** | Job queue age | >30 min oldest | <5 min oldest |

### Vertical Scaling Limits

| Component | Current | Maximum Practical | Bottleneck |
|-----------|---------|-------------------|------------|
| **TM Database** | 4TB | 64TB | Single-node query performance |
| **NMT Batch Size** | 32 segments | 128 segments | GPU memory |
| **LLM Context Window** | 8K tokens | 128K tokens | API cost, latency |
| **Concurrent Editors** | 1,000 | 10,000 | WebSocket connections |

---

## Capacity Planning Summary

```
+------------------------------------------------------------------------+
|              CAPACITY PLANNING - AI-NATIVE TRANSLATION                  |
+------------------------------------------------------------------------+
|                                                                         |
|  SCALE TARGETS                                                          |
|  -------------                                                          |
|  Words/day: 33M average, 100M peak                                     |
|  Segments/day: 2.2M average, 6.7M peak                                 |
|  Language pairs: 150+                                                   |
|  TM size: 500GB → 2.5TB (5 years)                                      |
|  Concurrent editors: 1,000                                              |
|                                                                         |
|  TRAFFIC PATTERNS                                                       |
|  ----------------                                                       |
|  Translation QPS: 25 avg, 300 peak                                     |
|  TM lookup QPS: 50 avg, 500 peak                                       |
|  QE inference QPS: 15 avg, 200 peak                                    |
|  Human edits: 400K/day                                                  |
|                                                                         |
|  INFRASTRUCTURE                                                         |
|  --------------                                                         |
|  NMT GPUs: 10 instances (A10G)                                         |
|  QE GPUs: 5 instances (T4)                                             |
|  CPU nodes: 25 instances                                                |
|  Storage: 20TB total                                                    |
|                                                                         |
|  COST TARGETS                                                           |
|  ------------                                                           |
|  Infrastructure: ~$40K/month                                           |
|  Cost per word: ~$0.01 blended                                         |
|                                                                         |
+------------------------------------------------------------------------+
```
