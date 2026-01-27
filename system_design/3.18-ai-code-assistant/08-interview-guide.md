# Interview Guide

## Interview Pacing (45 Minutes)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    45-Minute Interview Pacing                        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Phase 1: Requirements & Clarification (5-7 min)                  ││
│  │                                                                  ││
│  │ • Clarify scope (inline completion? chat? agent?)               ││
│  │ • Understand scale (users, requests/day)                        ││
│  │ • Identify key constraints (latency, privacy)                   ││
│  │ • Ask about deployment model (cloud vs self-hosted)             ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Phase 2: High-Level Design (12-15 min)                           ││
│  │                                                                  ││
│  │ • Draw system architecture on whiteboard                        ││
│  │ • Explain key components (IDE plugin, API, LLM inference)       ││
│  │ • Discuss data flow for completion request                      ││
│  │ • Cover context retrieval (RAG, symbol index)                   ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Phase 3: Deep Dive (15-18 min) - Choose 1-2 areas               ││
│  │                                                                  ││
│  │ Option A: Latency Optimization                                   ││
│  │   • Speculative decoding, caching, model tiering                ││
│  │                                                                  ││
│  │ Option B: Context Assembly                                       ││
│  │   • Token budgeting, RAG, symbol resolution                     ││
│  │                                                                  ││
│  │ Option C: Security (Agent Mode)                                  ││
│  │   • Prompt injection, sandboxing, permissions                   ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Phase 4: Scalability & Trade-offs (5-7 min)                      ││
│  │                                                                  ││
│  │ • Discuss scaling strategy (multi-region, GPU clusters)         ││
│  │ • Cover cost optimization                                       ││
│  │ • Trade-off: latency vs quality vs cost                         ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Phase 5: Wrap-up (3-5 min)                                       ││
│  │                                                                  ││
│  │ • Summarize key design decisions                                ││
│  │ • Mention monitoring/observability                              ││
│  │ • Q&A with interviewer                                          ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Clarification Questions

### Essential Questions to Ask

| Question | Why It Matters | Possible Answers |
|----------|----------------|------------------|
| "What types of completions - inline only or also chat/agent?" | Scope impacts complexity significantly | Inline only = simpler; Agent = security focus |
| "What's the expected scale - users and requests?" | Determines infrastructure choices | 10K users vs 10M users = very different |
| "What's the latency requirement for inline completion?" | Most critical constraint | <200ms typical; <100ms aggressive |
| "Cloud-only or need self-hosted option?" | Affects architecture | Self-hosted adds complexity |
| "How sensitive is the code? Enterprise or consumer?" | Security requirements | Enterprise = air-gap, audit, compliance |
| "Do users need repository-wide context?" | RAG complexity | Single file = simple; repo-wide = indexing |

### Sample Clarification Dialog

```
Candidate: "Before I dive in, let me clarify a few things. When you say
'code assistant', are we talking about inline completion like GitHub
Copilot, or also chat and autonomous agent capabilities?"

Interviewer: "Start with inline completion, but we'd like to support
chat as a stretch goal."

Candidate: "Got it. What scale should I design for?"

Interviewer: "Let's say 1 million daily active users, with potential
to grow to 10 million."

Candidate: "And what's our latency budget for inline completions?"

Interviewer: "We need it to feel instant - under 200ms ideally."

Candidate: "Perfect. One more question - is code privacy a major concern?
Are we dealing with enterprise customers?"

Interviewer: "Yes, enterprise is our primary market. Privacy is critical."

Candidate: "Great, that tells me I need to focus on secure architecture
with options for self-hosting. Let me start with the high-level design..."
```

---

## Architecture to Draw

### Whiteboard Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                   AI Code Assistant Architecture                     │
│                                                                      │
│  IDE Layer                                                           │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [VS Code Plugin]  [JetBrains]  [Vim]                         │  │
│  │       │                │           │                           │  │
│  │       └────────────────┼───────────┘                           │  │
│  │                        │                                       │  │
│  │              [Local Context Agent]                             │  │
│  │              • Tree-sitter parsing                             │  │
│  │              • File watching                                   │  │
│  └────────────────────────┼──────────────────────────────────────┘  │
│                           │                                         │
│                    HTTPS / WebSocket                                │
│                           │                                         │
│  Backend                  ▼                                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   [API Gateway]                                │  │
│  │                   • Auth • Rate Limit • Route                  │  │
│  └────────────────────────┼──────────────────────────────────────┘  │
│                           │                                         │
│         ┌─────────────────┼─────────────────┐                      │
│         │                 │                 │                       │
│         ▼                 ▼                 ▼                       │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐                 │
│  │ Completion │   │   Chat     │   │   Agent    │                 │
│  │  Service   │   │  Service   │   │  Service   │                 │
│  └─────┬──────┘   └─────┬──────┘   └─────┬──────┘                 │
│        │                │                │                         │
│        └────────────────┼────────────────┘                         │
│                         │                                          │
│                         ▼                                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              [Context Assembly Service]                        │  │
│  │              • Token budgeting                                 │  │
│  │              • Prompt construction                             │  │
│  └────────────────────────┬──────────────────────────────────────┘  │
│                           │                                         │
│         ┌─────────────────┼─────────────────┐                      │
│         │                 │                 │                       │
│         ▼                 ▼                 ▼                       │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐                 │
│  │  Symbol    │   │  Semantic  │   │  Lexical   │                 │
│  │  Index     │   │  Search    │   │  Search    │                 │
│  │(Tree-sitter)│   │(Vector DB)│   │  (BM25)    │                 │
│  └────────────┘   └────────────┘   └────────────┘                 │
│                         │                                          │
│                         ▼                                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              [LLM Inference Layer]                             │  │
│  │   [Model Router] ──► [Fast Model] [Standard] [Premium]        │  │
│  │                       (StarCoder)  (GPT-4o)   (Opus)          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                         │                                          │
│                         ▼                                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              [Post-Processing]                                 │  │
│  │   [Syntax Check] ──► [Security Scan] ──► [Ranking]            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Data Layer                                                         │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐                 │
│  │  Vector DB │   │   Redis    │   │  Postgres  │                 │
│  │ (Embeddings)│   │  (Cache)   │   │  (Users)   │                 │
│  └────────────┘   └────────────┘   └────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Deep Dive Options

### Option A: Latency Optimization

**Key Points to Cover:**

1. **Latency Budget**
   - Total: <200ms
   - Network: ~30ms
   - Context assembly: ~30ms
   - LLM inference: ~100ms
   - Post-processing: ~10ms

2. **Speculative Decoding**
   ```
   Draft model (1B) generates 5 tokens → 50ms
   Verify model (70B) checks all at once → 100ms
   Total: ~150ms vs 5 × 100ms = 500ms traditional
   ```

3. **Caching Strategy**
   - L1: Exact prompt cache (5% hit rate)
   - L2: Semantic cache (35% hit rate)
   - L3: KV attention cache (40% hit rate within session)

4. **Model Tiering**
   - Simple completions (70%) → Fast model (<100ms)
   - Medium complexity (25%) → Standard model (~150ms)
   - Complex tasks (5%) → Premium model (~300ms)

**Talking Points:**
- "The key insight is that most completions are simple - variable names, imports. We don't need GPT-4 for those."
- "Speculative decoding is a game-changer - we get large model quality with small model latency."
- "Caching is critical but tricky - code context changes constantly."

### Option B: Context Assembly

**Key Points to Cover:**

1. **Context Sources (Priority Order)**
   - Cursor prefix (highest value)
   - Cursor suffix (FIM mode)
   - Imported symbol definitions
   - Open tabs / recent files
   - Semantically similar code (RAG)

2. **Token Budgeting Algorithm**
   ```
   Total: 8K tokens
   - System prompt: 500 (fixed)
   - Prefix: 2500 (variable)
   - Suffix: 500 (FIM)
   - Symbols: 1500 (variable)
   - Similar code: 1000 (variable)
   - Output reserve: 500 (fixed)
   ```

3. **Hybrid Retrieval**
   - BM25 (lexical): Fast, good for exact matches
   - Embeddings (semantic): Captures meaning
   - Reciprocal Rank Fusion: Combine both

4. **Symbol Resolution**
   - Tree-sitter for AST parsing
   - Pre-index on file open
   - Cache resolved definitions

**Talking Points:**
- "Context is everything - more context isn't always better due to attention degradation."
- "We use hybrid retrieval because code has both exact tokens (function names) and semantic patterns."
- "Token budgeting is an optimization problem - maximize value within fixed budget."

### Option C: Security (Agent Mode)

**Key Points to Cover:**

1. **Threat Model**
   - Prompt injection (direct and indirect)
   - Data exfiltration via completions
   - Agent mode privilege escalation
   - Malicious code generation

2. **Defense Layers**
   - Input sanitization (strip injection patterns)
   - Structured prompts (clear role separation)
   - Output validation (syntax, security scan)
   - Sandboxing (file/network/terminal restrictions)

3. **Agent Sandboxing**
   - Filesystem: Workspace only, exclude .env, credentials
   - Network: Package registries only
   - Terminal: Command allowlist, approval for destructive

4. **Prompt Injection Defense**
   ```
   [SYSTEM] You are a code assistant. [/SYSTEM]
   <user_code>
   {potentially_malicious_content}
   </user_code>
   [INSTRUCTION] Generate completion only. [/INSTRUCTION]
   ```

**Talking Points:**
- "Agent mode is high-risk - we're giving LLM access to filesystem and terminal."
- "Indirect injection is the scariest - malicious content in repo gets RAG'd into prompt."
- "Defense in depth is essential - no single layer is sufficient."

---

## Trade-off Discussions

### Latency vs Quality vs Cost

| Choice | Latency | Quality | Cost |
|--------|---------|---------|------|
| Small local model | Best | Lower | Lowest |
| Large cloud model | Worst | Best | Highest |
| Tiered routing | Good | Good | Medium |
| Speculative decoding | Good | Best | Medium |

**When interviewer asks: "How do you balance these?"**

> "It depends on the use case. For inline completion, latency is king - users won't wait 500ms. I'd use tiered routing: 70% of requests go to a fast model because they're simple. For the complex 5%, users accept slightly longer latency because the quality matters more. Speculative decoding gives us the best balance - large model quality with smaller latency."

### Privacy vs Features

| Approach | Privacy | Features |
|----------|---------|----------|
| Fully local | Highest | Limited context, smaller models |
| Self-hosted cloud | High | Full features, more ops burden |
| Cloud with telemetry off | Medium | Full features |
| Cloud with telemetry on | Lower | Best personalization |

**When interviewer asks: "Enterprise customers need privacy. How?"**

> "We offer a spectrum. At minimum, we never train on customer code - that's table stakes. For sensitive enterprises, we support self-hosted deployment in their VPC. The code never leaves their network. We sacrifice some features like cross-repo learning, but privacy is preserved. For regulated industries like finance, we can even do air-gapped deployment with local models."

### Consistency vs Availability

| Component | Priority | Reason |
|-----------|----------|--------|
| Completions | Availability | Users need suggestions even if slightly stale |
| Repository index | Availability | Eventual consistency acceptable |
| User auth/billing | Consistency | Must be accurate |

---

## Trap Questions and Answers

### Trap 1: "Why not just use a longer context window?"

**Bad answer:** "Yes, we should just use 128K context and include everything."

**Good answer:**
> "Longer context windows help but aren't a silver bullet. First, cost scales linearly with context - 128K tokens at GPT-4 prices is expensive for every request. Second, there's attention degradation - models struggle with information in the middle of very long contexts. Third, latency increases. We're better off with smart context selection - 8K tokens of highly relevant code beats 128K of everything."

### Trap 2: "How do you prevent the model from generating insecure code?"

**Bad answer:** "We rely on the model's training to generate secure code."

**Good answer:**
> "We can't fully rely on the model - it's trained on real code which includes vulnerabilities. We implement multi-layer defense: First, real-time security scanning on generated code using SAST-like pattern matching for common vulnerabilities - SQL injection, command injection, hardcoded secrets. Second, we validate against known-bad patterns. Third, we flag hallucinated dependencies that could be typosquatting attacks. For agent mode, we add human-in-the-loop for security-sensitive operations."

### Trap 3: "What if the LLM provider has an outage?"

**Bad answer:** "We'd show an error message and wait."

**Good answer:**
> "We design for provider resilience. First, we use circuit breakers - after 5 failures in a minute, we stop hitting the failing provider. Second, we maintain multi-provider capability - if OpenAI is down, we fail over to Anthropic or our self-hosted backup. Third, for temporary blips, our cache often has similar completions. Fourth, for prolonged outages, we gracefully degrade to a smaller local model. Users get suggestions, just potentially lower quality."

### Trap 4: "How do you handle prompt injection when using RAG?"

**Bad answer:** "We trust the code in the repository since users added it."

**Good answer:**
> "Indirect prompt injection via RAG is our biggest security concern. Malicious code could be committed to a shared repo, retrieved via RAG, and injected into the prompt. We defend with: First, input sanitization - strip instruction-like patterns from retrieved content. Second, structured prompts with clear delimiters for untrusted content. Third, output validation - check if completion contains suspicious patterns or instruction leakage. Fourth, for high-risk agent mode, we limit RAG to user's own recent files, not shared repos."

### Trap 5: "Why not just run the model locally on the user's machine?"

**Bad answer:** "That would be too slow on most machines."

**Good answer:**
> "Local models are compelling for privacy and latency, and we should support them. However, there's a quality gap - the best completion models are 70B+ parameters, requiring high-end GPUs most developers don't have. We take a hybrid approach: run a small local model (3B) for simple completions like variable names, but use cloud models for complex generations. This gets us 70% of completions with near-zero latency while preserving quality for the complex 30%."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Do Instead |
|---------|---------------|---------------------|
| **Ignoring latency constraints** | 500ms completion is unusable | Always start with latency budget |
| **Treating code as plain text** | Missing AST structure, imports | Discuss Tree-sitter, symbol resolution |
| **Single LLM approach** | Expensive, high latency | Model tiering, speculative decoding |
| **No caching** | Wasteful, slow | Multi-level cache strategy |
| **Ignoring security** | Agent mode is dangerous | Sandboxing, injection defense |
| **Over-engineering context** | More isn't better | Token budgeting, priority-based selection |
| **Forgetting privacy** | Enterprise blocker | Self-hosted option, data handling policies |

---

## Quick Reference Card

### Numbers to Remember

| Metric | Value |
|--------|-------|
| Target inline latency | <200ms (P99 <300ms) |
| Typical token budget | 8K tokens |
| Acceptance rate benchmark | >30% |
| GitHub Copilot daily requests | 400M+ |
| Speculative decoding speedup | 2-4x |
| Cache hit rate target | >40% |

### Key Algorithms

| Algorithm | Purpose |
|-----------|---------|
| **Fill-in-the-Middle (FIM)** | Complete code given prefix AND suffix |
| **Speculative Decoding** | Draft with small model, verify with large |
| **Reciprocal Rank Fusion** | Combine lexical + semantic search results |
| **Token Budgeting** | Allocate context within limit |

### Architecture Components

| Component | Technology |
|-----------|------------|
| Parsing | Tree-sitter |
| Vector search | Embedding + HNSW |
| Lexical search | BM25 |
| Cache | Redis + semantic cache |
| Inference | vLLM, TensorRT-LLM |
| Models | GPT-4o, Claude, StarCoder |

### Security Layers

1. Input sanitization
2. Structured prompts
3. Output validation
4. Execution sandboxing
