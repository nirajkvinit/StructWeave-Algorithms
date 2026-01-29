# Interview Guide

## Table of Contents
- [Interview Pacing](#interview-pacing)
- [Clarifying Questions](#clarifying-questions)
- [Key Design Decisions](#key-design-decisions)
- [Trade-offs Discussion](#trade-offs-discussion)
- [Trap Questions](#trap-questions)
- [Common Mistakes](#common-mistakes)
- [Quick Reference Card](#quick-reference-card)

---

## Interview Pacing

### 45-Minute Format

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify | Scope the problem | Ask about scale, users, key features |
| **5-15 min** | High-Level | Architecture overview | Draw main components, data flow |
| **15-30 min** | Deep Dive | 1-2 critical components | Show depth, discuss trade-offs |
| **30-40 min** | Scale & Reliability | Bottlenecks, failures | Proactive problem identification |
| **40-45 min** | Wrap Up | Summary, questions | Demonstrate structured thinking |

### Phase-by-Phase Guide

#### Phase 1: Clarify (0-5 minutes)

**Goal**: Understand scope and constraints before designing.

**Must Ask**:
1. "What types of legal documents? Contracts, litigation, regulatory?"
2. "What's the scale - documents per day, concurrent users?"
3. "Is this for law firms, corporate legal, or both?"
4. "What's the acceptable latency for contract review?"
5. "Are there specific compliance requirements (privilege, GDPR)?"

**Listen For**:
- Scale indicators (enterprise vs. SMB)
- Real-time vs. batch emphasis
- Accuracy vs. speed priorities
- Compliance stringency

**Sample Dialogue**:
> "Before I start designing, I'd like to understand the scope. Are we focusing on contract analysis specifically, or also legal research and litigation support? And what scale are we targeting - a single large law firm or a multi-tenant SaaS platform?"

#### Phase 2: High-Level Design (5-15 minutes)

**Goal**: Establish architecture and key components.

**Must Cover**:
1. Client layer (Web, Word add-in, API)
2. Ingestion pipeline (upload, OCR, normalization)
3. AI processing layer (NER, clause extraction, risk scoring)
4. Knowledge layer (graph DB, vector store, case law)
5. Compliance layer (privilege, audit)

**Key Diagram**:
```
[Clients] → [API Gateway] → [Ingestion] → [AI Pipeline] → [Knowledge Store]
                              ↓                              ↓
                         [Document Store]              [Compliance/Audit]
```

**Articulate Decisions**:
- "I'm choosing a hybrid model architecture - specialized models for speed on common tasks, foundation models for complex reasoning"
- "The knowledge layer uses a graph database because legal reasoning requires multi-hop traversal"
- "Compliance is a first-class citizen, not an afterthought - privilege classification happens at ingestion"

#### Phase 3: Deep Dive (15-30 minutes)

**Goal**: Demonstrate depth in 1-2 critical areas.

**Recommended Deep Dives for Legal Tech**:

1. **Clause Extraction Pipeline** (most common)
   - Document understanding (layout, sections)
   - Classification hierarchy (category → type)
   - Confidence calibration
   - Human-in-the-loop routing

2. **Explainability Engine** (differentiator)
   - Why critical for legal AI
   - Chain-of-thought with citations
   - Validation and hallucination detection
   - Attorney-comprehensible output

3. **Multi-Jurisdictional Knowledge Graph**
   - Schema design
   - Cross-jurisdiction reasoning
   - Citation network
   - Staleness handling

**Deep Dive Template**:
```
"Let me deep dive into [component]. Here's why it's critical...
The internal architecture is...
The key algorithm is...
Failure modes include X, Y, Z, and we handle them by...
The main trade-off is... and I chose... because..."
```

#### Phase 4: Scale & Reliability (30-40 minutes)

**Goal**: Show you can identify and solve problems proactively.

**Must Address**:
1. **Bottlenecks**: LLM latency, OCR throughput, graph queries
2. **Scaling**: How does each component scale?
3. **Failures**: What happens when LLM is down? When DB fails?
4. **Data growth**: Storage, index size, query performance

**Proactive Issues to Raise**:
- "One bottleneck I anticipate is LLM latency for explanations. I'd mitigate with..."
- "A failure scenario is the knowledge graph becoming stale. I'd handle with..."
- "For data growth, we'd need to consider sharding by..."

#### Phase 5: Wrap Up (40-45 minutes)

**Goal**: Summarize and demonstrate completeness.

**Summary Template**:
> "To summarize, I've designed an AI-native legal tech platform with these key characteristics:
> 1. Hybrid model architecture for accuracy and speed
> 2. Explainability-first design for attorney trust
> 3. Compliance built in - privilege protection, audit trails
> 4. The main trade-offs I made were X vs Y, choosing X because..."

**Questions to Ask Interviewer**:
- "Is there any area you'd like me to go deeper on?"
- "Are there specific failure scenarios you're concerned about?"
- "Would you like me to discuss the security model in more detail?"

---

## Clarifying Questions

### Must-Ask Questions

| Question | Why It Matters | Impacts |
|----------|---------------|---------|
| "What document types and volumes?" | Scale architecture | Storage, processing power |
| "Real-time review or batch processing?" | Latency requirements | Sync vs async design |
| "Single tenant or multi-tenant?" | Isolation requirements | Data model, security |
| "What accuracy is acceptable?" | Model selection | HITL thresholds |
| "Privilege/compliance requirements?" | Security architecture | Entire compliance layer |

### Good Questions by Topic

**Functional Scope**:
- "Should the system handle negotiation assistance or just analysis?"
- "Is legal research (case law search) in scope?"
- "Do we need to support due diligence batch processing?"

**Scale**:
- "How many contracts per day? Per hour at peak?"
- "How many concurrent users?"
- "What's the average contract length?"

**Performance**:
- "What's acceptable latency for a single contract review?"
- "What's the target for due diligence (1000 documents)?"
- "Is 95% accuracy acceptable, or do we need 99%?"

**Compliance**:
- "Are there attorney-client privilege requirements?"
- "Which jurisdictions need to be supported?"
- "Are there specific regulations (GDPR, HIPAA)?"

---

## Key Design Decisions

### Decision Framework

For each major decision, be prepared to discuss:
1. **Options considered** (at least 2)
2. **Criteria for evaluation**
3. **Trade-offs of each option**
4. **Your recommendation and why**

### Critical Decisions for Legal Tech

#### Decision 1: Model Architecture

| Option | Pros | Cons |
|--------|------|------|
| **Specialized Models Only** | Fast, predictable, cheap | Limited flexibility, maintenance burden |
| **Foundation Models Only** | Flexible, less maintenance | Slow, expensive, hallucination risk |
| **Hybrid (Recommended)** | Best of both | Complexity, routing logic needed |

**Recommendation**: Hybrid approach with confidence-based routing.
- Specialized models handle 80% of cases (fast, cheap, accurate)
- Foundation models handle complex/novel cases (flexible)
- HITL for low confidence (professional responsibility)

#### Decision 2: Knowledge Representation

| Option | Pros | Cons |
|--------|------|------|
| **Relational DB Only** | Simple, familiar | Poor for relationships |
| **Vector DB Only** | Great for similarity | No structure for reasoning |
| **Graph + Vector (Recommended)** | Multi-hop reasoning + similarity | Complexity |

**Recommendation**: Graph database for legal knowledge + Vector store for semantic search.
- Graph enables "What cases cite this statute?" queries
- Vector enables "Find similar clauses" queries
- Combined via GraphRAG pattern

#### Decision 3: Explainability Approach

| Option | Pros | Cons |
|--------|------|------|
| **Post-hoc Explanation** | Simpler | May not reflect actual reasoning |
| **Intrinsic Interpretability** | True reasoning | Limited model choices |
| **Chain-of-Thought + Citations (Recommended)** | Verifiable, attorney-friendly | Token cost, latency |

**Recommendation**: Chain-of-thought with mandatory citations.
- Every claim linked to source document or precedent
- Confidence scores displayed
- Attorney can verify each step

#### Decision 4: Consistency Model

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Document Processing** | Eventual consistency | Async processing acceptable |
| **Audit Logs** | Strong consistency | Compliance requirement |
| **Knowledge Graph** | Eventual with version | Updates don't need to be instant |
| **User Sessions** | Strong consistency | UX requirement |

---

## Trade-offs Discussion

### Trade-off Matrix

| Trade-off | Option A | Option B | When to Choose A | When to Choose B |
|-----------|----------|----------|------------------|------------------|
| **Accuracy vs Latency** | Higher accuracy (more models, HITL) | Lower latency (simpler pipeline) | High-stakes contracts | Real-time negotiation |
| **Automation vs Control** | High automation | More HITL | Routine contracts | Complex/novel deals |
| **Explanation Depth vs Speed** | Full reasoning chain | Summary only | Due diligence reports | Quick risk scan |
| **Tenant Isolation vs Cost** | Dedicated infrastructure | Shared with logical isolation | Enterprise/regulated | SMB/startup |
| **Model Freshness vs Stability** | Frequent updates | Versioned, stable | Rapidly evolving area | Mission-critical |

### How to Discuss Trade-offs

**Template**:
> "This is a trade-off between X and Y. On one hand, [Option A] gives us [benefit] but [cost]. On the other hand, [Option B] provides [different benefit] at [different cost]. Given our requirements of [specific constraint], I'd lean toward [choice] because [reasoning]."

**Example**:
> "This is a trade-off between accuracy and latency. Using multiple models and human review gives us higher accuracy, but adds latency and cost. A simpler single-model pipeline is faster but may miss edge cases. Given that legal contracts are high-stakes and attorneys need to trust the output, I'd lean toward the higher-accuracy approach with confidence-based routing to maintain reasonable latency for clear-cut cases."

---

## Trap Questions

### Common Trap Questions and Responses

#### Trap 1: "Why not just use ChatGPT for everything?"

**What They're Testing**: Understanding of AI limitations in legal context.

**Good Answer**:
> "While foundation models like GPT-4 are powerful, they have limitations for legal use:
> 1. **Hallucination risk**: They can fabricate citations (see Mata v. Avianca case)
> 2. **Lack of explainability**: Attorneys need to verify reasoning
> 3. **Cost at scale**: Token costs add up quickly
> 4. **Latency**: 2-3 seconds per query doesn't work for real-time review
>
> Instead, I'd use a hybrid approach: specialized models for routine extraction, foundation models for complex reasoning, and always with citation verification."

#### Trap 2: "How do you handle attorney-client privilege with AI?"

**What They're Testing**: Understanding of legal/ethical constraints.

**Good Answer**:
> "Attorney-client privilege is critical and requires several safeguards:
> 1. **No training on client data**: Models are pre-trained on public data only
> 2. **Privilege classification at ingestion**: Flag privileged content immediately
> 3. **Isolated processing**: Privileged documents processed in isolated environments
> 4. **Access controls**: Only assigned attorneys can access privileged content
> 5. **Audit trails**: Complete logging of all access for discovery
>
> The key principle is that AI processing doesn't waive privilege as long as appropriate safeguards exist - this is consistent with ABA Formal Opinion 512."

#### Trap 3: "What if the AI misses a material risk in a $100M deal?"

**What They're Testing**: Failure handling, professional responsibility.

**Good Answer**:
> "This is exactly why we need human-in-the-loop and shouldn't position AI as replacing attorneys:
> 1. **Confidence thresholds**: Low confidence extractions always go to human review
> 2. **Clear disclaimers**: AI provides assistance, not legal advice
> 3. **Review workflows**: High-stakes documents require attorney sign-off
> 4. **Explainability**: Attorneys can verify AI reasoning before relying on it
> 5. **Continuous learning**: Missed issues become training examples
>
> The AI augments attorney capabilities but doesn't replace professional judgment, especially for high-stakes decisions."

#### Trap 4: "This seems over-engineered. Why not start simpler?"

**What They're Testing**: Practical thinking, avoiding premature optimization.

**Good Answer**:
> "You're right that we should be pragmatic. For an MVP, I'd focus on:
> 1. **Core extraction only**: Parties, dates, key terms - not all 500 clause types
> 2. **Single model**: Start with one good model, not an ensemble
> 3. **Basic explainability**: Show source text, not full reasoning chains
> 4. **Simple compliance**: Manual privilege tagging initially
>
> The architecture I described is the target state. We'd iterate toward it based on user feedback and actual scale needs. But I wanted to show awareness of where the system needs to go."

#### Trap 5: "How do you handle hallucinations in legal citations?"

**What They're Testing**: AI safety awareness, practical mitigation.

**Good Answer**:
> "Citation hallucination is a critical issue for legal AI. My approach:
> 1. **Mandatory verification**: Every citation checked against authoritative databases before display
> 2. **Verification status display**: Clear indicators of verified vs. unverified citations
> 3. **Confidence thresholds**: Don't show citations below confidence threshold
> 4. **Hallucination detection**: Check for impossible dates, non-existent cases, contradictions
> 5. **User training**: Attorneys trained to verify AI outputs
>
> If a citation can't be verified, we'd say 'Citation could not be verified' rather than showing potentially fabricated references."

---

## Common Mistakes

### Mistakes to Avoid

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| **Jumping to solution** | Might solve wrong problem | Ask clarifying questions first |
| **Ignoring compliance** | Legal domain is heavily regulated | Address privilege, audit, GDPR upfront |
| **Over-trusting AI** | Legal AI has real limitations | Build in verification, HITL, disclaimers |
| **Single point of failure** | Any component can fail | Design for resilience from start |
| **Ignoring explainability** | Attorneys won't trust black boxes | Make explainability a core feature |
| **Forgetting multi-tenancy** | Law firms are competitors | Strong tenant isolation |
| **Underestimating OCR** | Scanned docs are common | Plan for OCR errors and manual fallback |
| **Not discussing scale** | Shows lack of production experience | Proactively discuss bottlenecks |

### Red Flags in Your Design

- No mention of attorney-client privilege
- AI makes final decisions without human review
- No explanation for AI outputs
- No audit trail for compliance
- Single database, no replication
- No discussion of failure scenarios
- Ignoring latency requirements
- No mention of citation verification

---

## Quick Reference Card

### Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI-Native Legal Tech Platform               │
├─────────────────────────────────────────────────────────────────┤
│ CLIENTS:     Web | Word Add-in | API                           │
├─────────────────────────────────────────────────────────────────┤
│ GATEWAY:     Auth (OAuth/SAML) | Rate Limit | Privilege Check  │
├─────────────────────────────────────────────────────────────────┤
│ INGESTION:   Upload → OCR → Normalize → Chunk                  │
├─────────────────────────────────────────────────────────────────┤
│ AI PIPELINE: Legal NER → Clause Extract → Risk Score → Explain │
├─────────────────────────────────────────────────────────────────┤
│ KNOWLEDGE:   Graph DB (Neo4j) | Vector DB | Case Law Index     │
├─────────────────────────────────────────────────────────────────┤
│ COMPLIANCE:  Privilege Gateway | Audit Log | Legal Hold        │
└─────────────────────────────────────────────────────────────────┘
```

### Key Numbers

| Metric | Target |
|--------|--------|
| Contract review latency | < 30s per page |
| Due diligence batch | < 2 hours for 1000 docs |
| Clause extraction F1 | > 95% |
| Risk detection precision | > 90% |
| Availability | 99.9% |
| Explainability coverage | 100% |
| Attorney override rate | < 10% |

### Key Technologies

| Layer | Technology |
|-------|------------|
| Document Processing | LayoutLMv3, Tesseract, pdf.js |
| Legal NLP | SpaCy (legal), GLiNER, Legal-BERT |
| Foundation Models | GPT-4, Claude (via gateway) |
| Knowledge Graph | Neo4j, FalkorDB |
| Vector Store | Pinecone, Weaviate |
| Search | Elasticsearch |
| Queue | Kafka |
| Cache | Redis |

### Key Trade-offs Summary

| Trade-off | Default Choice | Rationale |
|-----------|---------------|-----------|
| Accuracy vs Latency | Accuracy | Legal is high-stakes |
| Automation vs Control | HITL for complex | Professional responsibility |
| Explanation depth | Full chain | Attorney trust |
| Tenant isolation | Strict | Privilege protection |

### Compliance Checklist

- [ ] Attorney-client privilege handling
- [ ] No training on client data
- [ ] Complete audit trails
- [ ] Explainability for all outputs
- [ ] Citation verification
- [ ] GDPR/data rights support
- [ ] E-discovery/legal hold capability
- [ ] Multi-jurisdiction support

### Questions to Ask Interviewer

1. "What types of legal documents are most important?"
2. "What's the expected scale - documents per day?"
3. "Is explainability a hard requirement?"
4. "Are there specific compliance requirements?"
5. "Real-time review or batch processing focus?"

---

## Interview Checklist

Before ending, ensure you've covered:

- [ ] Clarified requirements and constraints
- [ ] Drew high-level architecture diagram
- [ ] Discussed data model (at least key entities)
- [ ] Deep dived into 1-2 critical components
- [ ] Addressed explainability (critical for legal AI)
- [ ] Discussed privilege/compliance handling
- [ ] Identified and addressed bottlenecks
- [ ] Discussed failure scenarios and mitigation
- [ ] Made explicit trade-offs with justification
- [ ] Summarized key design decisions
