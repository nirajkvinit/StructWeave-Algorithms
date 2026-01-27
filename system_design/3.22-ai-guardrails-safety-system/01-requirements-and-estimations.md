# Requirements & Estimations

## Functional Requirements

### P0 - Must Have (Core Safety)

| Category | Requirement | Description |
|----------|-------------|-------------|
| **Prompt Injection** | Multi-stage detection | Detect direct/indirect injection via regex, classifier, and LLM-judge ensemble |
| **Prompt Injection** | Attack classification | Categorize attacks (ignore instructions, role hijacking, data exfiltration) |
| **Jailbreak Prevention** | Pattern matching | Detect DAN, roleplay, "ignore previous", encoding bypasses |
| **Jailbreak Prevention** | Token confidence analysis | Detect anomalous response patterns via log probability |
| **Content Moderation** | Input filtering | Block toxic, hateful, violent, sexual, self-harm content |
| **Content Moderation** | Output filtering | Filter inappropriate LLM responses before delivery |
| **PII Detection** | Entity recognition | Detect email, SSN, credit cards, phone numbers, addresses, names |
| **PII Handling** | Configurable actions | Support block, mask (redact), log-only modes per entity type |
| **Topic Control** | Boundary enforcement | Restrict conversations to approved topics via denylist/allowlist |
| **Policy Enforcement** | Rule evaluation | Execute declarative policies with conditions and actions |

### P1 - Should Have (Enhanced Protection)

| Category | Requirement | Description |
|----------|-------------|-------------|
| **Multi-turn Safety** | Context tracking | Detect gradual manipulation across conversation turns |
| **Instruction Hierarchy** | Privilege levels | Enforce system > developer > user instruction priority |
| **Retrieval Rails** | Source validation | Verify trustworthiness of RAG-retrieved content |
| **Retrieval Rails** | Hallucination grounding | Check response alignment with source documents |
| **Execution Rails** | Tool authorization | Validate tool calls match allowed actions |
| **Execution Rails** | Parameter sanitization | Prevent injection through tool parameters |
| **Feedback Loop** | Continuous learning | Collect false positive/negative signals for model improvement |
| **Appeal Workflow** | Human escalation | Route blocked requests to human review queue |

### P2 - Nice to Have (Advanced Features)

| Category | Requirement | Description |
|----------|-------------|-------------|
| **Multimodal Safety** | Image/audio moderation | Extend content filtering to non-text modalities |
| **Automated Reasoning** | Factual verification | Use logical reasoning to verify response accuracy |
| **Watermarking** | Output attribution | Embed detectable patterns in LLM outputs |
| **Model Extraction** | Query pattern detection | Detect systematic probing attempts |
| **Anomaly Detection** | Behavioral analysis | Identify unusual usage patterns per user/tenant |
| **A/B Testing** | Policy experimentation | Test policy changes on traffic subsets |

---

## Non-Functional Requirements

### Performance

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Guardrail Latency (p50)** | <30ms | Minimal user-perceptible delay |
| **Guardrail Latency (p99)** | <100ms | Acceptable even for complex detections |
| **LLM-Judge Latency** | <500ms | Only used for borderline cases (~5% of traffic) |
| **Cold Start** | <2s | Acceptable for serverless deployments |

### Accuracy

| Metric | Target | Rationale |
|--------|--------|-----------|
| **True Positive Rate (Recall)** | >95% | Catch nearly all actual attacks |
| **False Positive Rate** | <1% | Minimize blocking legitimate users |
| **PII Detection Precision** | >94% | Industry benchmark (Microsoft Presidio) |
| **PII Detection Recall** | >89% | Balance precision and recall |

### Scalability

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Throughput per Node** | 10,000 req/sec | Support high-volume applications |
| **Horizontal Scale** | Linear to 100+ nodes | Handle enterprise traffic spikes |
| **Concurrent Policies** | 1,000+ active | Multi-tenant with custom policies |

### Availability & Reliability

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Availability** | 99.99% | Critical path for LLM safety |
| **Failover Time** | <30s | Automatic recovery from node failures |
| **Data Durability** | 99.999999% | Audit logs must not be lost |

### Security

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Encryption at Rest** | AES-256 | Protect stored policies and logs |
| **Encryption in Transit** | TLS 1.3 | Secure all network communication |
| **Audit Log Retention** | 90 days minimum | Compliance requirement |

---

## Capacity Estimations

### Baseline Assumptions

| Parameter | Value | Source |
|-----------|-------|--------|
| **Daily Active Users** | 100,000 | Enterprise AI platform |
| **Requests per User per Day** | 10 | Average chatbot interaction |
| **Total Requests per Day** | 1,000,000 | 100K × 10 |
| **Average Prompt Size** | 500 tokens (~2KB) | Typical user message |
| **Average Response Size** | 300 tokens (~1.2KB) | Typical LLM response |
| **Peak Traffic Multiplier** | 3x | Business hours concentration |

### Traffic Calculations

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Requests per Second (avg)** | 1M / 86,400 | ~12 req/sec |
| **Requests per Second (peak)** | 12 × 3 | ~36 req/sec |
| **Requests per Second (design)** | 36 × 10 (headroom) | 360 req/sec |

### Storage Calculations

| Data Type | Calculation | Daily | Monthly |
|-----------|-------------|-------|---------|
| **Audit Logs** | 1M req × 5KB/req | 5 GB | 150 GB |
| **Detection Results** | 1M req × 1KB/req | 1 GB | 30 GB |
| **Policy Definitions** | 1,000 policies × 10KB | 10 MB | 10 MB |
| **Pattern Database** | 10,000 patterns × 1KB | 10 MB | 10 MB |
| **Embedding Cache** | 100K unique prompts × 3KB | 300 MB | - |
| **Total Storage** | - | ~6.5 GB | ~180 GB |

### Compute Requirements

| Component | Specification | Count | Rationale |
|-----------|---------------|-------|-----------|
| **Guardrail API Nodes** | 4 vCPU, 8GB RAM | 3 | Handle 360 req/sec with redundancy |
| **Classifier Inference** | GPU (T4/A10) or 8 vCPU | 2 | ML model serving |
| **Policy Engine** | 2 vCPU, 4GB RAM | 2 | Rule evaluation |
| **Audit Log Storage** | SSD, 500 GB | 3 (replicated) | ClickHouse/TimescaleDB |

---

## SLOs & SLAs

### Service Level Objectives

| SLO | Target | Measurement Window | Alert Threshold |
|-----|--------|-------------------|-----------------|
| **Availability** | 99.99% | Monthly | <99.95% |
| **Latency (p50)** | <30ms | Hourly | >50ms |
| **Latency (p99)** | <100ms | Hourly | >200ms |
| **Detection Accuracy** | >95% | Weekly (sampled) | <92% |
| **False Positive Rate** | <1% | Weekly (sampled) | >2% |
| **Error Rate** | <0.1% | Hourly | >0.5% |

### Error Budget Policy

| SLO Violation | Response |
|---------------|----------|
| **>0.01% budget consumed in 1 hour** | Alert on-call, investigate |
| **>10% budget consumed in 1 day** | Halt non-critical deployments |
| **>50% budget consumed in 1 week** | Incident review, mandatory fixes |
| **Budget exhausted** | Feature freeze, all hands on reliability |

---

## Constraints & Assumptions

### Technical Constraints

| Constraint | Impact |
|------------|--------|
| **No GPU requirement** | Classifiers must run on CPU or be GPU-optional |
| **Stateless design** | No session affinity required for horizontal scaling |
| **Cloud-agnostic** | No vendor-specific services in core architecture |
| **Model size limit** | Classifiers <500MB for fast loading |

### Business Constraints

| Constraint | Impact |
|------------|--------|
| **Latency budget** | Total guardrail overhead <50ms for user experience |
| **Cost per request** | <$0.0001 for guardrail processing (excluding LLM) |
| **Compliance** | Must support SOC 2, HIPAA, GDPR audit requirements |

### Assumptions

| Assumption | Risk if Invalid |
|------------|-----------------|
| **Attack patterns are learnable** | Novel attacks may bypass detection |
| **Users accept <1% false positives** | Higher FP rates cause user complaints |
| **LLM providers return token probabilities** | FJD technique unavailable otherwise |
| **Policies are updated infrequently** | Frequent updates may cause cache invalidation storms |

---

## Scope Boundaries

### In Scope

- Input validation (prompt injection, jailbreak, PII, toxicity)
- Output validation (content moderation, PII redaction)
- Policy definition and evaluation
- Audit logging and compliance
- Integration with LLM gateways and agents
- Real-time and async processing modes

### Out of Scope

- LLM training or fine-tuning
- Model hosting/serving (use existing infrastructure)
- User authentication (handled by upstream gateway)
- Business logic validation (application-specific)
- Cost optimization (handled by LLM gateway)
