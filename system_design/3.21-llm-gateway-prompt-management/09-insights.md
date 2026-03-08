# Key Insights: LLM Gateway / Prompt Management

## Insight 1: Semantic Caching with Two-Stage Verification

**Category:** Caching
**One-liner:** Meaning-based caching with entity-aware verification eliminates false positives that would return Paris weather for a London query.

**Why it matters:** Exact-match caching achieves only 15-25% hit rates for LLM requests because users phrase identical questions differently. Semantic caching using vector similarity raises hit rates to 40-50%, but naive implementations produce dangerous false positives -- "How do I reset my password?" matches "How do I reset my PIN?" at 0.91 similarity. The two-stage approach first retrieves candidates at a slightly relaxed threshold (0.90), then applies strict verification: exact threshold check (0.95), entity consistency (named entities must match), TTL validation, and multi-turn context compatibility. This layered verification is what makes semantic caching production-safe rather than a demo trick. The entity extraction step is particularly clever -- it uses fast regex for locations, quantities, and dates rather than expensive NLP, keeping verification under 5ms.

---

## Insight 2: Optimistic Token Reservation with Reconciliation

**Category:** Traffic Shaping
**One-liner:** Reserve estimated tokens before streaming begins, then reconcile the difference atomically after the stream completes -- solving the fundamental tension between pre-request rate limiting and unknown output length.

**Why it matters:** Streaming LLM responses create an impossible dilemma: rate limiting must happen before the request (to prevent overuse), but the actual token count is unknown until the stream finishes. Blocking mid-stream to enforce limits destroys user experience. The optimistic reservation pattern resolves this by reserving max_tokens (or a model-specific default) upfront, counting tokens approximately during streaming using a fast 4-characters-per-token heuristic, and then reconciling with the provider's exact count at stream completion. The reconciliation uses Redis DECRBY to atomically return unused tokens to the quota. Critically, the abort path only charges for tokens actually received, preventing unfair billing on interrupted streams. This reservation-reconciliation pattern applies to any metered resource where consumption is unknown at authorization time.

---

## Insight 3: Request Coalescing to Eliminate Duplicate LLM Calls

**Category:** Contention
**One-liner:** When multiple identical requests arrive concurrently, only one goes to the LLM -- the others wait on a shared future, eliminating wasted tokens and duplicate API costs.

**Why it matters:** Without coalescing, two identical requests arriving 50ms apart both get cache misses, both call the LLM, and both pay full token cost. The second response overwrites the first in cache, wasting money and introducing potential inconsistency. The coalescer uses a dictionary of in-flight futures keyed by cache key. The first request creates a future and executes; subsequent identical requests simply await that future. When the first completes, all waiters receive the same result. The lock scope is minimal -- only held during the pending-check and future-creation, not during the actual LLM call. This is conceptually similar to singleflight in Go or request deduplication in CDNs, but applied at the LLM gateway layer where each duplicate costs real money in tokens.

---

## Insight 4: Atomic Lua Scripts for Token-Based Rate Limiting

**Category:** Atomicity
**One-liner:** Token-per-minute rate limiting requires atomic check-and-increment in a single Redis roundtrip -- a read-then-write approach allows concurrent requests to both see remaining capacity and both proceed, exceeding the limit.

**Why it matters:** Traditional request-per-second rate limiting uses simple counters, but LLM rate limiting counts tokens-per-minute where each request consumes a variable number of tokens. Two concurrent requests reading 45,000 tokens used (limit 50,000) both see 5,000 remaining, both reserve 5,000, and actual usage hits 55,000 -- exceeding the limit by 10%. The Lua script atomically reads the counter, checks against the limit, and increments in a single Redis evaluation with no interleaving possible. It returns a tuple of (allowed, remaining, TTL), giving clients everything they need in one roundtrip. This pattern is essential wherever variable-sized resource consumption must be bounded -- not just tokens, but bandwidth, storage quotas, or credit-based billing.

---

## Insight 5: Virtual Key Hierarchy for Multi-Tenant Cost Governance

**Category:** Cost Optimization
**One-liner:** A tree-structured virtual key system maps organizational hierarchy to budget enforcement, letting teams self-serve API access while preventing any single team or application from exhausting the shared provider quota.

**Why it matters:** Enterprise LLM usage requires attribution and control at multiple levels simultaneously: the organization has a $10,000/month budget, the ML Platform team gets $5,000, and individual applications within that team get further subdivisions. Virtual keys decouple internal access control from actual provider API keys -- each virtual key carries its own TPM limits, budget caps, and allowed models, while mapping to a shared pool of underlying provider keys. This eliminates the alternative of distributing raw API keys (no governance) or routing everything through a single team (bottleneck). Budget updates during in-flight requests are handled via optimistic locking with version numbers, preventing the race where an admin reduces a budget while a request is consuming against the old limit.

---

## Insight 6: Multi-Provider Failover with Response Normalization

**Category:** Resilience
**One-liner:** Transparent failover across LLM providers requires bidirectional format translation -- transforming requests to each provider's format and normalizing responses back to a canonical format -- not just retry logic.

**Why it matters:** Simply retrying a failed OpenAI request against Anthropic doesn't work because the APIs differ fundamentally: system prompts are in messages for OpenAI but a separate parameter for Anthropic, content is a string in OpenAI but an array of typed blocks in Anthropic, stop_reason vs finish_reason, and input_tokens vs prompt_tokens. The gateway must maintain bidirectional transformers for each provider, including model name mappings (gpt-4o maps to claude-3-5-sonnet) and streaming chunk normalization (Anthropic uses typed events like content_block_delta while OpenAI uses delta objects). The failover decision tree is also provider-aware: a 429 triggers provider switch, a 400 checks if the error is retryable (model not found vs. malformed request), and timeouts get retry-then-failover. This normalization layer is what makes the gateway truly provider-agnostic rather than merely multi-provider.

---

## Insight 7: Budget Enforcement Under Concurrent Mutation

**Category:** Distributed Transactions
**One-liner:** When an admin reduces a budget while a request is in-flight, optimistic locking with version-checked reservations prevents negative budget balances without blocking either the admin or the request.

**Why it matters:** A request checks budget at $100 remaining and proceeds. The admin then reduces the budget to $50. The request completes and costs $80, leaving the budget at -$30. This race condition exists because the budget check and the cost deduction are not atomic with respect to budget mutations. The solution reads budget with a version number, reserves against that version, and the reservation fails if the version has changed (admin updated). On failure, the request re-reads the current budget and re-evaluates. On success, finalization reconciles the reservation against actual cost. The refund path handles failures by releasing the reservation atomically. This optimistic concurrency control avoids the performance penalty of locking the budget during the entire LLM request (which can take seconds), while still preventing overdraft.

---

## Insight 8: Multi-Tier Cache with Prefix Sharing

**Category:** Caching
**One-liner:** Three cache tiers -- exact match (sub-millisecond), semantic similarity (10-30ms), and provider-level prefix caching (zero overhead) -- stack multiplicatively to achieve 30-50% combined cost reduction.

**Why it matters:** Each caching tier catches a different type of redundancy. Exact match catches identical requests (same messages, model, temperature) at 20-40% hit rate with zero quality trade-off. Semantic cache catches paraphrased questions at 10-30% additional hit rate with a configurable quality trade-off (the 0.95 threshold). Provider-level prefix caching (not managed by the gateway but leveraged by it) reduces cost on shared system prompts by 50-90% on the prefix tokens. The tiers are checked in order of speed and confidence: exact match first (1ms, 100% accurate), then semantic (15-30ms, tunable accuracy), then prefix (managed by provider). A miss at all tiers results in full inference. The key insight is that these are complementary, not competing -- exact match handles the easy wins, semantic catches the long tail of rephrasing, and prefix caching reduces the base cost of every request that shares a system prompt.
