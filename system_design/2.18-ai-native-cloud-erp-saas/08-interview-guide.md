# AI Native Cloud ERP SaaS - Interview Guide

> **Navigation**: [Index](./00-index.md) | [Requirements](./01-requirements-and-estimations.md) | [HLD](./02-high-level-design.md) | [LLD](./03-low-level-design.md) | [Deep Dive](./04-deep-dive-and-bottlenecks.md) | [Scale](./05-scalability-and-reliability.md) | [Security](./06-security-and-compliance.md) | [Observability](./07-observability.md) | **Interview Guide**

---

## 1. Interview Pacing (45 Minutes)

### Time Allocation

| Time | Phase | Focus | Key Activities |
|------|-------|-------|----------------|
| 0-5 min | **Clarification** | Requirements Gathering | Ask about ERP modules, AI requirements, compliance |
| 5-15 min | **High-Level Design** | Architecture | Core components, data isolation, AI platform |
| 15-30 min | **Deep Dive** | Critical Component | LLM serving OR agent orchestration OR compliance |
| 30-40 min | **Scale & Reliability** | Non-Functional | Multi-tenancy, GPU scaling, disaster recovery |
| 40-45 min | **Wrap-Up** | Trade-offs | Summarize decisions, discuss alternatives |

---

### Phase 1: Clarification (0-5 minutes)

#### Questions to Ask

**ERP Scope:**
- Which ERP modules are in scope? (Finance, HR, Supply Chain, CRM?)
- Are we building from scratch or integrating with existing systems?
- What's the target market? (SMB, mid-market, enterprise?)

**AI Requirements:**
- What AI capabilities are required? (Document processing, forecasting, chatbot?)
- Must AI models be self-hosted, or can we use cloud APIs?
- What's the expected AI workload? (Queries per day, document volume?)

**Compliance:**
- Which compliance frameworks apply? (SOC 2, GDPR, HIPAA, PCI-DSS?)
- Are there data residency requirements?
- Is this handling PII, PHI, or financial data?

**Scale:**
- How many tenants are expected? What's the tenant size distribution?
- What's the expected transaction volume?
- What are the availability requirements?

#### Example Clarification Dialog

```
Candidate: "Before I start, I'd like to clarify a few things. First, which
ERP modules are we focusing on?"

Interviewer: "Finance and HR as P0, Supply Chain as P1."

Candidate: "Got it. For AI capabilities, are we required to self-host models,
or can we use cloud APIs like OpenAI?"

Interviewer: "Self-hosted is preferred due to data sensitivity."

Candidate: "Understood. And for compliance - are we targeting SOC 2, GDPR,
or both?"

Interviewer: "Both, plus HIPAA since we have healthcare clients."

Candidate: "Perfect. One more - approximately how many tenants and what
tier distribution?"

Interviewer: "About 10,000 total - mostly SMB, around 100 enterprise."
```

---

### Phase 2: High-Level Design (5-15 minutes)

#### Key Points to Cover

1. **Multi-Tenant Architecture**
   - Logical isolation with tenant-specific encryption
   - Shared infrastructure for cost efficiency
   - Dedicated pools for enterprise tenants

2. **Core ERP Services**
   - Finance module (GL, AP/AR, Reconciliation)
   - HR module (Employee records, Payroll, Time tracking)
   - Event-driven architecture for audit trail

3. **AI Platform Layer**
   - Self-hosted LLM serving (vLLM architecture)
   - RAG pipeline for document intelligence
   - Multi-agent orchestration for automation

4. **Data Architecture**
   - Event sourcing for transactional data
   - CQRS for query optimization
   - Vector database for semantic search

#### Architecture Sketch

Draw these components on the whiteboard:

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│              (Rate Limiting, Auth, Routing)                  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  ERP Services │   │  AI Platform  │   │ Tenant Mgmt   │
│  Finance, HR  │   │  LLM, RAG     │   │ Billing       │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Event Bus   │   │ Vector Store  │   │  GPU Cluster  │
│   (Kafka)     │   │ (Embeddings)  │   │  (vLLM)       │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Tenant 1 │  │ Tenant 2 │  │ Tenant N │  │  Audit   │     │
│  │  (DEK-1) │  │  (DEK-2) │  │  (DEK-N) │  │   Logs   │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 3: Deep Dive (15-30 minutes)

The interviewer will likely pick one area for deep dive. Prepare for all three:

#### Option A: Self-Hosted LLM Serving

**Key Points:**
- vLLM with PagedAttention for memory efficiency
- Continuous batching for throughput optimization
- Model registry with versioning and rollback
- GPU cluster management with fair scheduling
- Request routing based on tenant tier

**Technical Details:**
```
Request Flow:
1. Query arrives at AI Gateway
2. Rate limit check (tenant quota)
3. Request queued with priority (enterprise > SMB)
4. Batch formation (continuous batching)
5. GPU worker processes batch
6. Response returned with token usage

Memory Management:
- PagedAttention: 4KB blocks, on-demand allocation
- KV cache sharing across requests in batch
- Preemption for long-running requests
```

**Failure Modes:**
- GPU OOM → Graceful preemption, queue buffering
- Model corruption → Health checks, automatic rollback
- Latency spikes → Queue depth alerts, autoscaling

#### Option B: Multi-Agent Orchestration

**Key Points:**
- Agent registry with capability discovery
- Orchestrator pattern (not peer-to-peer for governance)
- Shared memory with tenant isolation
- Action gating for high-risk operations
- Feedback loop for continuous improvement

**Technical Details:**
```
Agent Workflow:
1. Exception/trigger detected
2. Orchestrator selects appropriate agent(s)
3. Agent generates action plan
4. Governance check (permissions, limits)
5. Human approval for high-risk actions
6. Execution with monitoring
7. Result evaluation and learning

Governance Layers:
- Permission check: Does agent have access?
- Scope check: Is action within bounds?
- Risk check: Does action require approval?
- Audit: Log all decisions and actions
```

**Failure Modes:**
- Agent loops → Max iteration limits, cycle detection
- Conflicting actions → Orchestrator arbitration
- Resource starvation → Fair scheduling, timeouts

#### Option C: Compliance Architecture

**Key Points:**
- Encryption hierarchy (Master → KEK → DEK)
- Row-level security with tenant context
- Audit logging with cryptographic chain
- Right to erasure (cryptographic deletion)
- Differential privacy for analytics

**Technical Details:**
```
Encryption Hierarchy:
Master Key (HSM)
  └── KEK per Region (wrapped by Master)
        └── DEK per Tenant (wrapped by KEK)
              └── Data encrypted with DEK

Right to Erasure:
1. Receive deletion request
2. Verify identity and authorization
3. Mark tenant for deletion
4. Delete DEK (data becomes unreadable)
5. Purge cached data
6. Generate compliance certificate
```

**Failure Modes:**
- Key compromise → Rotation, re-encryption
- Audit log tampering → Cryptographic chain validation
- Cross-tenant access → Query rewriting, RLS enforcement

---

### Phase 4: Scale & Reliability (30-40 minutes)

#### Scaling Strategy

| Component | Scaling Approach | Trigger |
|-----------|------------------|---------|
| API Gateway | Horizontal | Request rate > threshold |
| ERP Services | Horizontal | CPU > 70% |
| GPU Cluster | Vertical + Horizontal | Queue depth, latency |
| Database | Read replicas + Sharding | Query latency, connections |
| Vector Store | Horizontal | Index size, query latency |

#### Key Numbers to Know

- **Tenants**: 10,000 total (9,800 SMB, 100 enterprise)
- **DAU**: 500,000 (50 per tenant average)
- **Transactions**: 100M/day
- **AI Requests**: 10M/day
- **GPU Fleet**: 40 A100s baseline, autoscale to 80
- **Storage**: 500TB Year 1

#### Disaster Recovery

- **RPO**: 1 minute (synchronous replication for hot path)
- **RTO**: 15 minutes (automated failover)
- **Strategy**: Active-passive multi-region
- **Key rotation**: Zero-downtime with dual-key period

---

### Phase 5: Wrap-Up (40-45 minutes)

#### Summarize Key Decisions

"To summarize our design:
1. **Multi-tenant architecture** with logical isolation and tenant-specific encryption
2. **Self-hosted LLM** using vLLM for privacy and latency
3. **Event sourcing** for complete audit trail
4. **Multi-agent orchestration** with governance enforcement
5. **99.99% availability** with multi-region deployment"

#### Mention Trade-offs

"Key trade-offs we made:
- Self-hosted LLM vs cloud API: Chose privacy over simplicity
- Shared DB vs DB-per-tenant: Chose cost efficiency with encryption isolation
- Strong vs eventual consistency: Strong for transactions, eventual for analytics"

---

## 2. Trade-offs Discussion

### Major Architectural Decisions

| Decision | Option A | Option B | Our Choice | Rationale |
|----------|----------|----------|------------|-----------|
| AI Model Hosting | Self-hosted (vLLM) | Cloud API (OpenAI) | **Self-hosted** | Data sovereignty, latency, compliance |
| Multi-Tenancy | Shared DB with RLS | DB per tenant | **Shared DB** | Cost-efficient at scale, encryption provides isolation |
| Consistency Model | Strong everywhere | Eventual everywhere | **Hybrid** | Strong for transactions, eventual for analytics |
| Agent Architecture | Central orchestrator | Peer-to-peer agents | **Orchestrator** | Better governance, easier auditing |
| Event Architecture | Traditional CRUD | Event sourcing | **Event sourcing** | Compliance audit trail, replay capability |
| Vector Database | Embedded (in-process) | Dedicated cluster | **Dedicated** | Scale, multi-tenant isolation |

### Deep Trade-off Analysis

#### Self-Hosted vs Cloud AI

**Self-Hosted Advantages:**
- Data never leaves your infrastructure
- Predictable latency (no network to cloud)
- Compliance with data residency requirements
- No per-token costs at scale
- Model fine-tuning flexibility

**Self-Hosted Disadvantages:**
- GPU infrastructure complexity
- Model upgrade responsibility
- Higher initial investment
- Specialized ML ops team needed

**When to Choose Cloud:**
- Prototyping phase
- Low volume (< 100K requests/day)
- Non-sensitive data
- Limited ML expertise

#### Shared vs Dedicated Databases

**Shared DB Advantages:**
- Lower cost per tenant
- Simpler operations
- Efficient resource utilization
- Easier feature rollouts

**Shared DB Disadvantages:**
- Noisy neighbor risk
- Complex migration (if isolation needed later)
- Schema changes affect all tenants

**Hybrid Approach (Our Choice):**
- Shared DB for SMB tenants
- Dedicated DB option for enterprise
- Encryption provides logical isolation
- Tenant-aware connection pooling

---

## 3. Trap Questions and Responses

### Question 1: "Why not just use OpenAI API?"

**Bad Answer**: "Self-hosting is better because we control everything."

**Good Answer**: "For an ERP handling sensitive financial and HR data, self-hosting provides three critical benefits:

1. **Data Sovereignty**: ERP data includes PII, financial records, and potentially PHI. With self-hosted models, data never leaves our controlled environment, which is required for GDPR Article 28 and HIPAA.

2. **Latency Predictability**: ERP users expect sub-second responses. Cloud API latency is variable (200ms-2s), while self-hosted provides consistent <100ms inference for most queries.

3. **Cost at Scale**: At 10M AI requests/day, cloud API costs would be approximately $10K-50K/day. Self-hosted amortizes to ~$3K/day including GPU costs.

However, we might use cloud APIs for non-sensitive features like help documentation search or for initial prototyping."

---

### Question 2: "What if a GPU fails mid-inference?"

**Bad Answer**: "We have redundant GPUs."

**Good Answer**: "GPU failures during inference are handled at multiple levels:

1. **Request Level**: Requests are idempotent with unique IDs. If a GPU fails mid-inference, the request times out and is automatically retried on another GPU. The client sees increased latency but gets correct results.

2. **Model Level**: We maintain at least 2 replicas of each model across different GPUs. The load balancer health checks GPU endpoints every 5 seconds.

3. **Cluster Level**: NVIDIA DCGM monitors GPU health (temperature, memory errors, utilization). Degraded GPUs are drained gracefully before failure.

4. **Graceful Degradation**: If GPU capacity falls below threshold, we:
   - Increase batching aggressiveness (higher latency, same throughput)
   - Reduce context length limits temporarily
   - Queue non-urgent requests (batch jobs)
   - Alert operations for manual intervention

The key insight is that AI inference is typically not in the critical transaction path - a delayed AI response doesn't block invoice posting."

---

### Question 3: "How do you prevent cross-tenant data leakage?"

**Bad Answer**: "We use row-level security."

**Good Answer**: "Cross-tenant isolation is enforced at four layers:

1. **Query Layer**: Every database query is automatically rewritten to include tenant_id filter. This is enforced by the ORM/query builder - applications cannot bypass it.

2. **Encryption Layer**: Each tenant has a unique Data Encryption Key (DEK). Even if RLS fails, data is encrypted with different keys. Tenant A's DEK cannot decrypt Tenant B's data.

3. **Memory Layer**: For AI models, each tenant's context is isolated. We clear KV cache between requests from different tenants. RAG retrieval only searches the tenant's document index.

4. **Network Layer**: Service mesh enforces that requests carry tenant context. Any request without valid tenant context is rejected at the gateway.

For vector search specifically, we use partition isolation - each tenant's embeddings are in separate partitions with access controls. Even similarity search cannot cross partition boundaries."

---

### Question 4: "How would this change at 100x scale?"

**Bad Answer**: "We'd just add more servers."

**Good Answer**: "At 100x scale (1M tenants, 50M DAU, 10B transactions/day), several architectural changes become necessary:

1. **Database Sharding**: Move from single-cluster to globally distributed sharding. Tenant-based sharding with consistent hashing. Hot tenants get dedicated shards.

2. **Regional Deployment**: Full multi-region active-active instead of active-passive. Each region handles local tenants with cross-region replication for global enterprises.

3. **GPU Fleet**: Move from static cluster to cloud-burst model. Base capacity self-hosted, burst to cloud GPU (with data anonymization) for peak demand.

4. **Event Processing**: Replace Kafka with purpose-built stream processing (like Flink or Spark Streaming) for real-time analytics at this scale.

5. **Tenant Tiering**: Introduce more granular tiers with different SLOs. Top 100 tenants might get fully dedicated infrastructure.

6. **Caching**: Add more aggressive caching with tenant-aware invalidation. Consider precomputed views for common queries.

The architecture pattern stays the same; we're scaling each component independently based on its bottleneck."

---

### Question 5: "What about prompt injection attacks?"

**Bad Answer**: "We sanitize inputs."

**Good Answer**: "Prompt injection is a critical concern for AI-native ERPs. Our defense is multi-layered:

1. **Input Sanitization**:
   - Detect known injection patterns (IGNORE PREVIOUS, jailbreak phrases)
   - Limit special characters and control sequences
   - Truncate excessively long inputs

2. **Prompt Architecture**:
   - System prompt is hardcoded, never concatenated from user input
   - User input is clearly delimited with markers
   - Use structured output (JSON) to constrain responses

3. **Output Validation**:
   - Validate LLM outputs against expected schema
   - Reject responses that don't match expected format
   - Never execute LLM output as code or SQL directly

4. **Action Gating**:
   - High-risk actions (payments, deletions) require human approval
   - Agent actions are limited to predefined operations
   - Rate limiting on destructive actions

5. **Monitoring**:
   - Log all prompts and responses (with PII masking)
   - Anomaly detection for unusual response patterns
   - Regular red-team testing

The key principle: treat LLM output as untrusted user input. Never assume the LLM will follow instructions."

---

## 4. Common Mistakes to Avoid

### Mistake 1: Ignoring Compliance Early

**The Mistake**: Designing the architecture first, then trying to add compliance later.

**Why It's Wrong**: Compliance requirements fundamentally shape the architecture. Encryption, audit logging, and data residency can't be bolted on - they must be foundational.

**What to Do**: Ask about compliance requirements in the first 2 minutes. Let SOC 2, GDPR, and HIPAA requirements drive architectural decisions.

---

### Mistake 2: Over-Engineering AI Features

**The Mistake**: Spending most of the interview on advanced AI features (autonomous agents, predictive analytics) while neglecting core ERP.

**Why It's Wrong**: The "AI" is the differentiator, but the "ERP" is the foundation. An ERP that can't reliably post transactions is useless regardless of AI capabilities.

**What to Do**: Design core ERP first (finance, HR, transactions). Then add AI as an enhancement layer. Ensure AI failures don't break core workflows.

---

### Mistake 3: Underestimating GPU Infrastructure

**The Mistake**: Treating GPU serving as "just another service" or assuming cloud APIs will handle it.

**Why It's Wrong**: GPU infrastructure is fundamentally different - memory management, batching, model loading, and failure modes are all unique challenges.

**What to Do**: If self-hosted AI is required, dedicate time to explaining GPU cluster architecture, batching strategies, and failure handling.

---

### Mistake 4: Not Considering Tenant Heterogeneity

**The Mistake**: Designing for the "average" tenant without considering the distribution.

**Why It's Wrong**: In multi-tenant SaaS, the top 1% of tenants often generate 50% of load. A 10K-employee enterprise tenant behaves very differently from a 10-person SMB.

**What to Do**: Explicitly discuss tenant tiers, noisy neighbor mitigation, and dedicated resources for enterprise tenants.

---

### Mistake 5: Forgetting the Human in the Loop

**The Mistake**: Designing fully autonomous AI agents without governance.

**Why It's Wrong**: ERPs handle financial transactions and HR actions. Autonomous AI making payment decisions or firing employees is a legal and ethical minefield.

**What to Do**: Always include human approval gates for high-risk actions. Design agents as assistants, not autonomous actors.

---

## 5. Questions to Ask the Interviewer

### Clarifying Questions (Ask Early)

1. "Which ERP modules are in scope for this design?"
2. "Are we targeting SMB, mid-market, or enterprise customers - or all three?"
3. "What compliance frameworks must we support?"
4. "Is self-hosted AI a hard requirement, or can we consider hybrid approaches?"
5. "What's the expected tenant count and transaction volume?"

### Demonstrating Depth (Ask During Design)

1. "Should I dive deeper into the LLM serving architecture or the transaction processing?"
2. "Would you like me to walk through the encryption key hierarchy?"
3. "Should I discuss the failure modes for this component?"

### Showing Business Awareness (Ask in Wrap-Up)

1. "What's the go-to-market timeline? That might affect build vs. buy decisions."
2. "Are there existing systems we need to integrate with?"
3. "What's the team composition? That could influence technology choices."

---

## 6. Quick Reference Card

### Numbers to Remember

| Metric | Value | Context |
|--------|-------|---------|
| Tenants | 10,000 | 98% SMB, 1% mid-market, 1% enterprise |
| DAU | 500,000 | 50 users per tenant average |
| Transactions/day | 100M | ~10K per tenant |
| AI Requests/day | 10M | Documents, queries, forecasts |
| GPU Fleet | 40 A100s | Baseline, autoscale to 80 |
| Inference Latency | <2s | P99 target |
| Availability | 99.99% | Core transactions |
| RPO/RTO | 1min/15min | Disaster recovery |

### Key Architectural Patterns

1. **Event Sourcing + CQRS** - Audit trail, compliance
2. **Multi-tenant with encryption isolation** - Cost-efficient, secure
3. **vLLM with PagedAttention** - Efficient GPU memory
4. **Multi-agent with orchestrator** - Governance, control
5. **Saga pattern** - Distributed transactions
6. **Circuit breaker** - Graceful degradation

### Compliance Quick Reference

| Framework | Key Requirement | Technical Control |
|-----------|-----------------|-------------------|
| SOC 2 | Access controls | RBAC + audit logs |
| GDPR | Right to erasure | Cryptographic deletion |
| HIPAA | PHI protection | Encryption + access logging |
| PCI-DSS | Cardholder data | Tokenization + segmentation |

---

## 7. Sample 45-Minute Walkthrough

### Minute 0-3: Clarification

"Before diving in, let me understand the requirements:
- Which ERP modules? → Finance, HR, Supply Chain
- Compliance needs? → SOC 2, GDPR, HIPAA for healthcare tenants
- AI requirements? → Self-hosted preferred, document processing, forecasting, chat
- Scale? → 10K tenants, 500K DAU, 100M transactions/day
- Availability? → 99.99% for core transactions"

### Minute 3-12: High-Level Design

"Let me sketch the high-level architecture [draws diagram]:

The system has four main layers:
1. **API Gateway** - Authentication, rate limiting, tenant routing
2. **Service Layer** - ERP modules (Finance, HR, SCM) and AI Platform
3. **Event Bus** - Kafka for event sourcing and async processing
4. **Data Layer** - Tenant-isolated storage with encryption

For multi-tenancy, we use logical isolation with tenant-specific encryption keys. Each tenant's data is encrypted with a unique DEK, wrapped by a regional KEK, wrapped by the master key in HSM.

The AI platform is self-hosted using vLLM for LLM serving and a vector database for RAG. This keeps sensitive data in our infrastructure.

All transactions go through event sourcing for complete audit trail - critical for compliance."

### Minute 12-28: Deep Dive (LLM Serving)

"Let me deep dive into the LLM serving infrastructure since it's a key differentiator.

We use vLLM with PagedAttention. PagedAttention manages KV cache memory in 4KB blocks, allocated on-demand. This gives us 2-4x memory efficiency compared to naive approaches.

Request flow:
1. Query arrives at AI Gateway with tenant context
2. Rate limit check against tenant quota
3. Request queued with priority (enterprise tenants get higher priority)
4. Continuous batching - we don't wait for fixed batch size
5. GPU worker processes batch, returns responses
6. Token usage tracked for billing

For multi-tenancy, we have three options:
1. **Shared model** - All tenants share same model, tenant context in prompt
2. **Fine-tuned adapters** - Base model with tenant-specific LoRA adapters
3. **Dedicated models** - Enterprise tenants get dedicated GPU allocation

We'd use a hybrid: shared base for SMB, adapters for mid-market, dedicated for enterprise.

Failure handling:
- GPU failure: Requests timeout and retry on another GPU
- Memory pressure: Graceful preemption of long-running requests
- Latency spike: Increase batching, reduce context length temporarily"

### Minute 28-38: Scale & Reliability

"For scale, we have several strategies:

**Horizontal Scaling**:
- Stateless services scale based on CPU/memory
- GPU cluster autoscales based on queue depth
- Database read replicas for query load

**Tenant-Aware Routing**:
- Enterprise tenants routed to dedicated pools
- Noisy neighbor protection via resource quotas
- Hot tenant detection and migration

**Disaster Recovery**:
- Multi-region active-passive
- RPO: 1 minute (synchronous replication)
- RTO: 15 minutes (automated failover)
- Key backup in HSM with cross-region replication

**Reliability**:
- Circuit breakers between services
- Graceful degradation - AI features optional during outage
- Saga pattern for distributed transactions with compensation"

### Minute 38-45: Wrap-Up

"To summarize the key decisions:

1. **Self-hosted LLM** over cloud API - data sovereignty, latency, compliance
2. **Shared DB with encryption** - cost-efficient, secure through cryptography
3. **Event sourcing** - complete audit trail for compliance
4. **Orchestrator-based agents** - better governance than peer-to-peer

Trade-offs acknowledged:
- Higher ops complexity for self-hosted AI, but worth it for privacy
- Shared DB has noisy neighbor risk, mitigated by quotas and tiering

If we needed to scale 100x, main changes would be:
- Move to active-active multi-region
- Shard database by tenant
- Cloud burst for GPU capacity
- More granular tenant tiering

Any questions about specific components?"

---

> **Navigation**: [Index](./00-index.md) | [Requirements](./01-requirements-and-estimations.md) | [HLD](./02-high-level-design.md) | [LLD](./03-low-level-design.md) | [Deep Dive](./04-deep-dive-and-bottlenecks.md) | [Scale](./05-scalability-and-reliability.md) | [Security](./06-security-and-compliance.md) | [Observability](./07-observability.md) | **Interview Guide**
