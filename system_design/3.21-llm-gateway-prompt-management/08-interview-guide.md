# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Deliverables |
|------|-------|-------|--------------|
| **0-5 min** | Clarify | Ask questions, scope the problem | Requirements list, constraints |
| **5-15 min** | High-Level | Core components, architecture | System diagram on whiteboard |
| **15-30 min** | Deep Dive | 1-2 critical components | Algorithm details, trade-offs |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failure scenarios | Mitigation strategies |
| **40-45 min** | Wrap Up | Summary, handle follow-ups | Key decisions recap |

---

## Must-Ask Clarification Questions

| Question | Why It Matters | Impact on Design |
|----------|---------------|------------------|
| "Single provider or multi-provider?" | Determines failover complexity | Routing algorithm, normalization |
| "What's the caching requirement?" | Cost vs. freshness trade-off | Multi-tier cache architecture |
| "Scale in tokens per day?" | Infrastructure sizing | Capacity planning, sharding |
| "Need real-time cost tracking?" | Attribution system complexity | Data pipeline design |
| "Streaming support required?" | Token accounting complexity | Response handling |
| "Prompt versioning needed?" | Adds config management | Database schema, API design |
| "What's the latency budget?" | Determines caching strategy | Local embedding vs. API |

---

## What to Draw on the Whiteboard

### Initial Architecture (5-10 min mark)

```
DRAW THIS FIRST:
═══════════════════════════════════════════════════════════════════

     ┌─────────────────────────────────────────────────────────┐
     │                   Client Applications                    │
     │              (SDK, REST API, Streaming)                  │
     └─────────────────────────┬───────────────────────────────┘
                               │
     ┌─────────────────────────▼───────────────────────────────┐
     │                    LLM GATEWAY                           │
     │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
     │  │   Auth   │  │  Cache   │  │   Rate   │  │ Routing │ │
     │  │(Virt Key)│  │(Multi-   │  │  Limit   │  │ (Smart) │ │
     │  │          │  │ tier)    │  │ (Token)  │  │         │ │
     │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
     └─────────────────────────┬───────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    ┌────▼────┐          ┌─────▼─────┐         ┌────▼────┐
    │ OpenAI  │          │ Anthropic │         │  Local  │
    └─────────┘          └───────────┘         └─────────┘
```

### Detailed Architecture (15-20 min mark)

```
ADD THESE DETAILS:
═══════════════════════════════════════════════════════════════════

CACHE LAYER (multi-tier):
┌─────────────────────────────────────────────────────────────┐
│  Request                                                     │
│     │                                                        │
│     ▼                                                        │
│  ┌─────────────┐   miss   ┌─────────────┐   miss   ┌──────┐ │
│  │ Exact Cache │────────▶│Semantic Cache│────────▶│ LLM  │ │
│  │  (Redis)    │          │ (Vector DB)  │          │      │ │
│  │  <1ms       │          │  15-30ms     │          │      │ │
│  └─────────────┘          └─────────────┘          └──────┘ │
│       │ hit                    │ hit                        │
│       ▼                        ▼                            │
│  ┌─────────────────────────────────────────────┐           │
│  │             Return Cached Response           │           │
│  │             (0 tokens charged)               │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘

RATE LIMITING (token-aware):
┌─────────────────────────────────────────────────────────────┐
│  Virtual Key Budget Hierarchy:                              │
│                                                              │
│  Organization ($10K/month)                                   │
│  ├── Team A ($5K/month)                                     │
│  │   ├── Key 1: 100K TPM, $1K/month                        │
│  │   └── Key 2: 50K TPM, $500/month                        │
│  └── Team B ($3K/month)                                     │
│      └── Key 3: 200K TPM, $2K/month                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Trap Questions & Strong Answers

### Trap 1: "Why not just use an API Gateway like Kong?"

**Weak Answer:** "We could add plugins to Kong for LLM support."

**Strong Answer:**

"Traditional API gateways lack critical LLM-specific features:

1. **Token-aware rate limiting**: HTTP gateways count requests, not tokens. A single request can cost $0.001 or $1.00 depending on token count. We need TPM/TPH limits, not RPS.

2. **Semantic caching**: URL-based caching doesn't work for LLMs. 'What is the capital of France?' and 'Tell me France's capital city' should hit the same cache entry.

3. **Cost attribution**: We need per-token cost tracking with different input/output pricing. Traditional gateways don't understand LLM pricing models.

4. **Response normalization**: Each provider (OpenAI, Anthropic, Google) has different formats. Clients need a unified API to switch providers without code changes.

5. **Streaming token accounting**: We need to count tokens during streaming, not after. This requires understanding SSE streams and tokenization.

Kong with plugins could work for a prototype, but for production we need purpose-built LLM-aware components. The cost savings from proper caching alone (30-50%) justifies the specialized system."

---

### Trap 2: "How do you handle semantic cache false positives?"

**Weak Answer:** "Set a high similarity threshold like 0.99."

**Strong Answer:**

"False positives in semantic caching are a quality vs. cost trade-off. I'd use a multi-layered approach:

1. **Threshold tuning per use case**:
   - High-stakes (medical, legal): 0.99 threshold, accept ~5% hit rate
   - General Q&A: 0.95 threshold, ~25% hit rate, ~2% false positive rate
   - FAQ/chatbot: 0.90 threshold, ~40% hit rate, higher tolerance

2. **Two-stage verification**:
   - Stage 1: Fast vector similarity search
   - Stage 2: Context verification - check system prompt compatibility and conversation history match

3. **Entity-aware matching**:
   - 'Weather in Paris' and 'Weather in London' have high similarity but different entities
   - Extract entities and require key entity overlap

4. **Staleness detection**:
   - TTL based on content type (news: hours, docs: days)
   - Version tags for prompt templates

5. **Client opt-out**: `X-Cache-Control: no-semantic` header for sensitive requests

The key insight: semantic caching is a spectrum. Start conservative (0.95), measure false positive rate via user feedback, adjust per use case. A 2% false positive rate with 25% hit rate often makes sense."

---

### Trap 3: "How do you rate limit streaming responses?"

**Weak Answer:** "Count tokens after the stream completes."

**Strong Answer:**

"Streaming creates a timing challenge: we need to rate limit before starting, but don't know the final count. Solution: **optimistic reservation with reconciliation**.

**Before stream starts:**
```
1. Estimate output tokens (use max_tokens if set, else model default)
2. Reserve estimated + input tokens from rate limit
3. If reserve fails → 429 Rate Limited
4. If succeeds → start stream
```

**During streaming:**
```
1. Each chunk: approximate token count (chars/4)
2. Track running total for monitoring
3. If approaching limit: log warning (don't interrupt)
```

**After stream completes:**
```
1. Get exact count from provider's usage field (or tokenizer)
2. Reconcile: actual - reserved
3. If actual < reserved: refund difference
4. If actual > reserved: charge difference (may briefly exceed limit)
```

**Why this works:**
- Users prefer starting a request that might slightly exceed vs. being blocked
- The brief overage is bounded by max_tokens
- Reconciliation happens in milliseconds after stream ends
- Add a 10% buffer to reservations for safety

**Edge cases:**
- Stream abort: charge only for received tokens
- Provider error: refund unreceived portion
- Budget exhausted mid-stream: complete request, then lock key"

---

### Trap 4: "What happens when all providers are rate limited?"

**Weak Answer:** "Return 429 to the client."

**Strong Answer:**

"429 should be the last resort, not the first response. Multi-layered handling:

1. **Prevention - Distributed awareness**:
   - Track each provider's rate limit status globally
   - Weighted routing: send less traffic to nearly-exhausted providers
   - Spread requests across multiple provider accounts

2. **Graceful queuing**:
   - Instead of immediate 429, queue the request
   - Return `202 Accepted` with:
     ```json
     {
       "status": "queued",
       "queue_id": "abc123",
       "estimated_wait_seconds": 30,
       "poll_url": "/v1/queue/abc123"
     }
     ```
   - Process queue when any provider recovers

3. **Request prioritization in queue**:
   - Premium customers get priority
   - Shorter requests first (less quota impact)
   - Age-based priority to prevent starvation

4. **Fallback models**:
   - Configure fallback chain: `gpt-4o` → `claude-3-opus` → `gpt-4o-mini` → `local-llama`
   - Smaller/cheaper models often have separate higher limits
   - Mark response as degraded so client knows

5. **Circuit breaker at gateway level**:
   - If all providers consistently limited, stop accepting new requests
   - Better than building infinite queue

The key insight: users prefer waiting 30 seconds over immediate failure. Queue with transparency beats 429."

---

### Trap 5: "How do you ensure accurate cost attribution across different pricing models?"

**Weak Answer:** "Store the token count and multiply by the rate."

**Strong Answer:**

"LLM pricing is complex - different input/output rates, model tiers, and cached token discounts. Here's a robust approach:

1. **Pricing configuration per model**:
   ```yaml
   gpt-4o:
     input_per_1k: 0.0025
     output_per_1k: 0.01
     cached_input_per_1k: 0.00125  # 50% discount
   claude-3-opus:
     input_per_1k: 0.015
     output_per_1k: 0.075
   ```

2. **Cost calculation at request completion**:
   ```
   cost = (input_tokens × input_rate / 1000) +
          (output_tokens × output_rate / 1000) +
          (cached_tokens × cached_rate / 1000)
   ```

3. **Real-time tracking pipeline**:
   - Emit token usage event to Kafka/queue immediately
   - ClickHouse consumer aggregates by minute
   - Near-real-time dashboards (< 1 min delay)
   - End-of-day reconciliation with provider bills

4. **Multi-dimensional attribution**:
   - Every request tagged with: virtual_key, team_id, org_id, project, model
   - Enables slicing: cost by team, by model, by project

5. **Handling pricing changes**:
   - Version pricing configs with effective dates
   - Historical queries use pricing valid at request time
   - Alert when provider announces price changes

6. **Reconciliation with provider bills**:
   - Daily job: our calculated cost vs. provider invoice
   - Flag discrepancies > 1%
   - Investigate: usually missing requests or pricing config drift"

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Do Instead |
|---------|---------------|---------------------|
| Treating as traditional API gateway | Missing LLM-specific features | Emphasize token-awareness, semantic caching |
| Single provider design | Single point of failure | Multi-provider with automatic failover |
| Ignoring streaming | Most LLM apps use streaming | Design for streaming from the start |
| Exact match cache only | Low hit rate (~15%) | Multi-tier: exact + semantic + prefix |
| Request-based rate limiting | Doesn't reflect actual cost | Token-based rate limiting (TPM) |
| Post-hoc cost tracking | Can't prevent budget overruns | Real-time token accounting, budget enforcement |
| Ignoring response normalization | Provider lock-in | Unified response format (OpenAI-compatible) |
| Forgetting about failover latency | Users notice provider switches | Pre-warm connections, fast failover |
| Not considering prompt size | Large prompts expensive | Context window limits, summarization |
| Overcomplicating day 1 | Analysis paralysis | Start simple, iterate |

---

## Quick Reference Card

### Key Numbers

| Metric | Typical Value |
|--------|---------------|
| Gateway overhead (p50) | 15-25ms |
| Gateway overhead (p99) | 50-100ms |
| Exact cache lookup | <1ms |
| Semantic cache lookup | 15-30ms |
| Embedding generation (local) | 10-15ms |
| Cache hit rate (exact) | 20-40% |
| Cache hit rate (semantic) | 10-30% |
| Combined cost savings | 30-50% |
| Provider TTFT (GPT-4o) | 200-500ms |
| Token counting overhead | <1ms |

### Key Algorithms

| Algorithm | Purpose | Complexity |
|-----------|---------|------------|
| Semantic similarity | Cache matching | O(log n) vector search |
| Token bucket | Rate limiting | O(1) per check |
| Weighted random | Provider selection | O(p) where p = providers |
| Exponential backoff | Retry logic | O(1) |
| Luhn check | Credit card validation | O(n) digits |
| Context hashing | Multi-turn cache keys | O(m) messages |

### Key Technologies

| Category | Options |
|----------|---------|
| **Gateway frameworks** | Portkey, Helicone, LiteLLM, custom |
| **Semantic cache** | GPTCache, Portkey, Vector DB + custom |
| **Rate limiting** | Redis + Lua, custom sliding window |
| **Vector DB** | Pinecone, Qdrant, Weaviate, Milvus |
| **Embedding models** | OpenAI text-embedding-3, all-MiniLM, E5 |
| **Observability** | Langfuse, LangSmith, Helicone, Datadog |
| **Analytics** | ClickHouse, TimescaleDB, Prometheus |

### Key Formulas

```
Cost Calculation:
cost = (input_tokens × input_rate) + (output_tokens × output_rate)

Cache Hit Rate:
hit_rate = cache_hits / (cache_hits + cache_misses)

Cost Savings:
savings = cache_hit_rate × average_request_cost

Token Estimation (rough):
tokens ≈ characters / 4  (for English, GPT models)

Budget Burn Rate:
burn_rate = spend_last_hour × 24 × 30
```

---

## Deep Dive Options

When interviewer asks "pick a component to go deeper," choose based on the interviewer's interest:

### Option A: Semantic Caching (Algorithm-focused)

Focus on:
- Embedding model selection (latency vs. quality)
- Similarity threshold tuning
- False positive mitigation (two-stage verification)
- Context compatibility checking
- Cache invalidation strategies

### Option B: Token-Aware Rate Limiting (Systems-focused)

Focus on:
- Atomic reservation with Lua scripts
- Hierarchical budgets (user → team → org)
- Streaming token accounting
- Budget enforcement at reservation time
- Reconciliation after completion

### Option C: Multi-Provider Failover (Reliability-focused)

Focus on:
- Circuit breaker implementation
- Response normalization across providers
- Request transformation
- Weighted provider scoring
- Graceful degradation strategies

---

## Questions to Ask Interviewer

| Question | Purpose |
|----------|---------|
| "What's the expected scale in terms of tokens per day?" | Size the system appropriately |
| "Is this single-tenant or multi-tenant?" | Affects isolation design |
| "What's the consistency requirement for cost tracking?" | Real-time vs. eventual |
| "Are there specific compliance requirements?" | HIPAA, SOC2, GDPR |
| "Is prompt versioning in scope?" | Adds significant complexity |
| "What's the budget for infrastructure?" | Managed vs. self-hosted trade-offs |
