# Interview Guide

## 45-Minute Interview Pacing

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| **0-5 min** | Clarify Requirements | Scope, scale, constraints | Ask about channels, resolution targets, action types |
| **5-15 min** | High-Level Design | Core architecture, data flow | Omnichannel gateway, AI agent layer, backend integration |
| **15-30 min** | Deep Dive | 1-2 critical components | Intent detection OR human handoff OR action execution |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failures, alternatives | Latency optimization, LLM fallbacks, degradation |
| **40-45 min** | Wrap Up | Summary, open questions | Highlight trade-offs, ask clarifying questions |

---

## Phase 1: Clarify Requirements (0-5 min)

### Questions to Ask the Interviewer

| Question | Why It Matters |
|----------|----------------|
| "What channels need support?" | Determines omnichannel complexity (chat vs voice vs all) |
| "What's the target resolution rate?" | Sets AI capability bar (60% vs 80% very different) |
| "What actions should AI take autonomously?" | Defines action scope (read-only vs full transactions) |
| "What's the expected scale?" | Drives architecture decisions (1K vs 10M conversations/day) |
| "Are there compliance requirements?" | GDPR, HIPAA change data handling significantly |
| "What's the latency requirement?" | Chat vs voice have very different constraints |
| "Is human handoff required?" | Affects escalation architecture |

### Scope Boundaries to Establish

**In Scope (Typical):**
- Customer-facing chat, possibly voice
- Intent detection and response generation
- Action execution on backend systems
- Human escalation with context
- Basic analytics and monitoring

**Out of Scope (Unless Specified):**
- Workforce management for human agents
- Full contact center infrastructure
- CRM/ERP system design (integrate, don't build)
- Marketing automation
- Telephony infrastructure

---

## Phase 2: High-Level Design (5-15 min)

### Core Architecture to Present

```
1. Channel Layer → Omnichannel gateway
   "Customers connect via chat, voice, email, etc. We normalize all
   messages into a common format."

2. Conversation Management → Session state, context
   "Each conversation has a session with customer context, intent
   history, and dialogue state."

3. AI Agent Layer → The brain
   "This is where the magic happens—intent detection, response
   generation, action planning. Key insight: this is agentic, not
   just RAG. It takes actions."

4. Knowledge Layer → RAG for answers
   "For information queries, we retrieve from a knowledge base using
   vector search."

5. Backend Integration → Action execution
   "For transactions, we call CRM, ERP, payment systems. This is what
   makes it agentic—actually doing things."

6. Human Handoff → Escalation path
   "When AI can't resolve or customer requests, we transfer with full
   context to a human agent."
```

### Key Architectural Decisions to Highlight

| Decision | State Your Choice | Brief Justification |
|----------|-------------------|---------------------|
| Agentic vs RAG-only | Agentic | "RAG caps at ~40% resolution. Actions needed for 60%+" |
| Omnichannel unified vs separate | Unified | "Customers expect seamless experience across channels" |
| Sync vs async processing | Hybrid | "Chat needs sync; actions can be async" |
| LLM strategy | Model cascade | "Small model for simple, large for complex—cost and latency" |
| State management | Redis + PostgreSQL | "Redis for active sessions, DB for persistence" |

---

## Phase 3: Deep Dive (15-30 min)

### Option A: Intent Detection Deep Dive

**When to choose:** Interviewer asks about NLU, accuracy, or AI components.

**Key points to cover:**
1. **Pipeline stages:** Preprocess → Encode → Classify → Extract entities
2. **Fast path:** Rule-based for common patterns (greetings, transfer requests)
3. **ML path:** Fine-tuned BERT for intent, separate NER for entities
4. **Context injection:** Previous intents, customer profile influence classification
5. **Confidence routing:** Below threshold → escalate or clarify
6. **Multi-intent handling:** Primary intent first, queue secondary

**Technical depth:**
```
"For a message like 'Cancel my order and refund the money', we need to:
1. Detect two intents: cancel_order (0.89) and request_refund (0.84)
2. Extract entities: no explicit order ID
3. Decide primary: cancel_order (mentioned first, slightly higher confidence)
4. Plan: Ask which order, then handle both in sequence"
```

### Option B: Human Handoff Deep Dive

**When to choose:** Interviewer asks about escalation, human agents, or customer experience.

**Key points to cover:**
1. **Escalation triggers:** Sentiment, confidence, keywords, customer request, failures
2. **Context packaging:** Full history, profile, sentiment timeline, AI suggestions
3. **Routing:** Skill-based, language, customer tier, load balancing
4. **Transfer types:** Warm (agent joins) vs cold (context passed)
5. **Queue management:** Priority, SLA monitoring, estimated wait

**Technical depth:**
```
"The context package includes:
- Full conversation transcript (not just summary)
- Customer profile with lifetime value, tier, past issues
- Sentiment timeline showing how mood changed
- What the AI tried and why it failed
- Recommended resolution for the human agent

This is critical because 71% of customers expect agents to know
their history without repeating. Bad handoff = CSAT disaster."
```

### Option C: Action Execution Deep Dive

**When to choose:** Interviewer asks about transactions, backend integration, or safety.

**Key points to cover:**
1. **Action types:** Read (query status) vs Write (refund, cancel)
2. **Authorization:** Step-up auth for sensitive actions
3. **Validation:** Parameter validation, business rules
4. **Execution:** Multi-step with rollback capability
5. **Guardrails:** Limits, approvals, audit logging
6. **Failure handling:** Retry, fallback, graceful degradation

**Technical depth:**
```
"For a refund action:
1. Validate: Check order exists, is refundable, customer authorized
2. Check limits: Auto-approve up to $100, require human for $500+
3. Execute: Call payment API with idempotency key
4. Handle failure: Retry once, then escalate with 'manual refund needed'
5. Audit: Log everything—who, what, when, why, result

This is where agentic AI gets risky. We need guardrails to prevent
the AI from refunding $10,000 because it misunderstood."
```

---

## Phase 4: Scale & Trade-offs (30-40 min)

### Scaling Discussion Points

| Challenge | Solution | Trade-off |
|-----------|----------|-----------|
| "How do you handle 10M conversations/day?" | Horizontal scaling, regional deployment | Increased ops complexity |
| "What if LLM provider goes down?" | Multi-provider fallback (OpenAI → Anthropic → Gemini) | Cost of multiple providers |
| "Voice requires sub-300ms latency" | Edge inference, streaming, smaller models | Reduced response quality |
| "How do you handle Black Friday spike?" | Auto-scaling + pre-warming + degradation modes | Cost during peak |

### Bottleneck Analysis

```
"The main bottlenecks in this system are:

1. LLM inference (800ms-2s)
   - Mitigation: Model cascade, caching, streaming

2. Knowledge retrieval (200-500ms)
   - Mitigation: Caching, pre-fetching, smaller chunks

3. Backend API calls (200-2000ms)
   - Mitigation: Parallel execution, circuit breakers, timeouts

4. Session state management
   - Mitigation: Local caching, Redis cluster, sticky sessions

Total budget for chat: 2s
Total budget for voice: 300ms

Voice is the hard constraint—we need aggressive optimization."
```

### Failure Scenarios

| Scenario | Impact | Handling |
|----------|--------|----------|
| LLM timeout | No AI response | Fallback to cached responses, faster escalation |
| CRM unavailable | Can't fetch customer data | Proceed without context, flag for human review |
| High intent confusion | Wrong responses | Lower confidence threshold, more escalations |
| Sentiment misdetection | Wrong tone, missed escalation | Conservative escalation, human review |
| Action failure | Transaction incomplete | Retry, rollback, explain to customer |

---

## Trade-offs Discussion

### Trade-off 1: Resolution Rate vs Safety

| Option | Resolution Rate | Risk | Recommendation |
|--------|-----------------|------|----------------|
| Aggressive AI | 80% | Higher error rate, customer harm | Not recommended |
| Conservative AI | 60% | Lower efficiency, higher cost | Safe default |
| Adaptive (confidence-based) | 70% | Moderate | **Recommended** |

**Talking point:**
"I'd recommend confidence-based routing. If the AI is 95%+ confident, let it act.
If it's 70-95%, ask for confirmation. Below 70%, escalate. This balances
resolution rate with safety."

### Trade-off 2: Latency vs Quality

| Option | Latency | Quality | Cost |
|--------|---------|---------|------|
| Always GPT-4 | 2-3s | Highest | $$$$ |
| Always GPT-3.5 | 500ms | Moderate | $$ |
| Model cascade | 500ms-2s | Adaptive | $$$ |

**Talking point:**
"Model cascade is the right answer. Use small fast models for simple intents
(60% of traffic), reserve GPT-4 for complex reasoning. This gets you 80% of the
quality at 40% of the cost."

### Trade-off 3: Eager Handoff vs Autonomous Resolution

| Option | Human Cost | Customer Experience | Risk |
|--------|------------|---------------------|------|
| Eager (low threshold) | High | Faster human access | Low |
| Autonomous (high threshold) | Low | Faster AI resolution OR frustration | Higher |
| Balanced | Moderate | Optimized | Moderate |

**Talking point:**
"The threshold decision is critical. Too eager = you're just a ticketing system.
Too autonomous = frustrated customers talking to a wall. I'd start conservative
(lower threshold) and tune up as the AI proves itself."

---

## Trap Questions & Best Answers

### Trap 1: "Why not just use a chatbot framework?"

**What they want:** Understanding of agentic vs retrieval-only systems.

**Best answer:**
"Traditional chatbot frameworks are retrieval-only—they fetch answers but can't
take actions. For customer service, that caps resolution at maybe 40%. The
remaining 60% are requests like 'refund my order' or 'cancel my subscription'
that require actually doing something. An agentic architecture can understand
the intent, plan the action, execute it on backend systems, and confirm the
result. That's the difference between answering 'Here's how to cancel' versus
actually canceling."

### Trap 2: "What if the AI takes a wrong action?"

**What they want:** You've thought about safety and guardrails.

**Best answer:**
"This is a critical concern. Several layers of protection:
1. **Confirmation for irreversible actions**: 'I'll cancel order #123 and refund $99.99. Should I proceed?'
2. **Limits**: Auto-approve up to $100, require human for larger amounts
3. **Guardrails**: Business rules that prevent clearly wrong actions
4. **Audit trail**: Log everything for review and rollback
5. **Monitoring**: Alert on unusual patterns (many refunds, high-value actions)
6. **Graceful failure**: If uncertain, don't act—ask or escalate

The goal is to fail safely, not fail silently."

### Trap 3: "How would you handle 100x scale?"

**What they want:** You understand scaling principles, not just 'add more servers.'

**Best answer:**
"At 100x scale:
1. **Regional deployment**: Multiple regions with data locality
2. **Async architecture**: Queue-based processing for spikes
3. **Caching aggression**: Cache everything that's cacheable—responses, embeddings, customer profiles
4. **Model optimization**: Quantized models, edge inference for latency
5. **Degradation modes**: If overwhelmed, simplify responses, faster escalation
6. **Cost optimization**: At that scale, every penny matters—self-hosted models, committed use discounts

But I'd also push back: what problem at 100x? Is it latency, cost, or throughput?
The solution depends on the constraint."

### Trap 4: "What about hallucinations in customer service?"

**What they want:** You understand AI limitations and mitigation.

**Best answer:**
"Hallucination is dangerous in customer service because you might promise things
you can't deliver. Mitigation:
1. **Grounding**: Always retrieve facts from knowledge base, don't make up policies
2. **Source citation**: AI should reference where info came from
3. **Fact-checking layer**: Post-generation check against known facts
4. **Constrained generation**: For actions, force structured output that maps to real capabilities
5. **Confidence signaling**: 'I believe X, but let me verify' vs asserting uncertain facts
6. **Monitoring**: Track corrections from humans, detect hallucination patterns

The key insight is that hallucination isn't random—it's predictable in certain
contexts (novel questions, edge cases). We can route those to humans proactively."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Designing for chat only | Voice has very different requirements | Start with hardest constraint (voice latency) |
| Ignoring handoff complexity | "Just transfer to human" isn't architecture | Design context packaging in detail |
| Single LLM provider | Creates single point of failure | Multi-provider with fallback |
| No degradation modes | System is all-or-nothing | Design graceful degradation |
| Ignoring cost | "Use GPT-4 for everything" | Model cascade, caching, optimization |
| No safety guardrails | "AI will figure it out" | Explicit limits, approvals, auditing |
| Synchronous everything | Blocks on slow operations | Async for actions, streaming for responses |
| Underestimating latency | LLMs are slow | Budget and optimize aggressively |

---

## Quick Reference Card

### Key Numbers

| Metric | Target | Why |
|--------|--------|-----|
| Resolution rate | 60-80% | Below 60% = expensive, above 80% = risky |
| Chat latency (p95) | < 2s | Beyond this feels broken |
| Voice latency (p95) | < 300ms | Required for natural conversation |
| Handoff context | 100% | Customers expect agents to know history |
| CSAT | > 4.0/5 | Below 3.8 = serious problem |

### Platform Leaders (2025-2026)

| Platform | Claim | Note |
|----------|-------|------|
| Sierra | $10B valuation, $100M ARR | Fastest growing, action-taking |
| Decagon | 70% deflection | Agent Operating Procedures |
| Intercom Fin | 66% resolution | Unified customer agent |
| Zendesk | 80% autonomous | Multi-agent approach |

### Architecture One-Liner

"Omnichannel gateway normalizes messages, AI agent layer detects intent and
plans actions, execution layer calls backends, handoff system transfers to
humans with full context when needed, all with guardrails for safety."

---

## Interview Checklist

Before wrapping up, ensure you've covered:

- [ ] Clarified scale, channels, resolution targets
- [ ] Drew omnichannel + AI agent architecture
- [ ] Explained agentic vs retrieval-only distinction
- [ ] Deep-dived on one critical component (intent/handoff/actions)
- [ ] Discussed latency constraints and optimizations
- [ ] Addressed failure modes and degradation
- [ ] Mentioned safety guardrails for autonomous actions
- [ ] Discussed trade-offs explicitly
- [ ] Asked questions to clarify ambiguity
