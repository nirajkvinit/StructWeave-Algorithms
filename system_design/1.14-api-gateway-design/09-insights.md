# Key Insights: API Gateway Design

[← Back to Index](./00-index.md)

---

## Insight 1: The Trie-Based Router with LRU Cache Achieves O(1) Amortized Routing at 100K+ RPS

**Category:** Data Structures
**One-liner:** A radix trie handles O(k) path matching (k = path depth), but an LRU route cache with 80-95% hit rate converts most lookups to O(1) since traffic follows a Zipfian distribution.
**Why it matters:** At 100K+ requests per second, even O(k) per request adds up. The insight is that real API traffic is heavily skewed -- a small number of routes handle the vast majority of requests. A 10,000-entry LRU cache with 5-minute TTL captures the top routes by frequency, and the cache key (method + host + path) ensures that the most common request patterns are resolved from memory without trie traversal. Cache invalidation triggers on route CRUD, config reload, and TTL expiration keep the cache consistent. The trie itself uses a priority system where exact matches beat parameter matches and longer paths beat shorter paths, with stable sorting for deterministic behavior.

---

## Insight 2: Hybrid Local + Global Rate Limiting Balances Accuracy Against Latency

**Category:** Traffic Shaping
**One-liner:** Local-only rate limiting across N gateway nodes allows N times the intended limit; synchronous Redis on every request adds 2ms latency; the hybrid approach achieves ~98% accuracy at 0.5ms overhead.
**Why it matters:** Distributed rate limiting is fundamentally a distributed state problem. With 3 gateway nodes and a 100 req/sec limit, local-only limiting allows 300 req/sec (each node thinks it has the full budget). Synchronous Redis check on every request is accurate but adds a network hop to the hot path. The hybrid design gives each node a "fair share" local token bucket (limit / numNodes) for fast rejection, then asynchronously batches checks against a global Redis counter. Requests clearly over the local limit are rejected immediately (0ms), borderline requests are checked globally (~0.5ms), and the Redis Lua script uses atomic INCR with rollback on overflow to prevent the read-then-write race condition.

---

## Insight 3: JWK Caching with Circuit Breaker Prevents IdP Outages from Cascading to All API Traffic

**Category:** Resilience
**One-liner:** Caching JWK key sets with stale-on-error fallback and circuit-breaker-protected refresh means the gateway can validate tokens for hours even if the identity provider is completely down.
**Why it matters:** JWT validation requires the public key from the identity provider's JWKS endpoint. If the gateway fetches this key on every request, an IdP outage blocks all authenticated traffic. Caching the JWK set with a 1-hour TTL, background refresh 10 minutes before expiry, and circuit-breaker-protected fetches means the gateway is resilient to IdP failures. The critical design choice is falling back to stale cache entries when the circuit breaker is open rather than failing authentication. This trades theoretical security (a revoked key might be used during the staleness window) for practical availability (the entire API continues working). The hybrid token revocation approach -- short-lived tokens (15 min) + Redis blacklist for emergencies -- limits the blast radius of this tradeoff.

---

## Insight 4: Config Snapshot Per Request Eliminates the Config-Reload Race Condition

**Category:** Atomicity
**One-liner:** Capturing an immutable configuration snapshot at request start ensures the entire request lifecycle uses a consistent view, even if config changes mid-request.
**Why it matters:** Without config snapshots, a request that starts with route R1 version 1 might find that R1's plugin configuration has changed between the routing phase and the plugin execution phase. The fix is simple but its absence causes subtle bugs: at request start, capture configStore.snapshot() and use that immutable snapshot for all decisions (route matching, plugin loading, upstream selection). This pattern must be combined with canary config deployments and gradual rollout (10% to 50% to 100%) because even with snapshots, different gateway nodes may temporarily have different configs during propagation, leading to inconsistent routing across the fleet for ~150ms.

---

## Insight 5: Circuit Breaker State Transitions Must Use Compare-and-Swap to Prevent Duplicate Opens

**Category:** Contention
**One-liner:** When multiple threads simultaneously detect failure threshold breach, naive state transition logic opens the circuit multiple times; CAS ensures exactly-once state change.
**Why it matters:** The circuit breaker pattern protects upstreams from cascading failures, but its own state machine has a race condition. When error count hits 5 (threshold), multiple request threads may simultaneously try to transition CLOSED to OPEN. Without atomic compare-and-swap, the circuit opens multiple times, potentially resetting the recovery timer incorrectly. The CAS loop -- read current state, check if still CLOSED, atomically swap to OPEN, retry if CAS fails -- ensures exactly one thread performs the transition. This is a textbook example of how shared mutable state in concurrent systems requires lock-free synchronization even for simple boolean state machines.

---

## Insight 6: Plugin Chain Latency Budget Forces Architectural Tradeoffs Between Features and Performance

**Category:** Scaling
**One-liner:** With a 5ms total gateway overhead budget, each plugin in a 10-plugin chain gets only 500 microseconds -- forcing async execution for non-critical plugins and strict per-plugin timeouts.
**Why it matters:** The API gateway sits on the hot path of every request, and its value proposition (centralized cross-cutting concerns) directly conflicts with its performance requirement (minimal overhead). The plugin chain architecture means latency is additive: Auth (1.5ms) + Rate Limit (0.5ms) + Transform (0.2ms) + Custom Plugins (0.6ms) + Routing (0.2ms) = 3ms minimum. Adding just two more plugins can exceed the 5ms budget. This forces three design decisions: logging and analytics plugins must execute asynchronously (fire-and-forget), optional plugins must fail open (skip on timeout rather than block), and plugin results must be cached where possible (route cache, auth token cache). The tension between "add one more plugin" and "stay under 5ms" is the defining architectural constraint.

---

## Insight 7: WebSocket JWT Expiry Creates a Long-Lived Connection Authentication Gap

**Category:** Security
**One-liner:** A JWT validated during WebSocket upgrade can expire during a connection that lasts hours, creating an authentication gap that REST APIs never face.
**Why it matters:** REST APIs validate tokens per request, so expiry is naturally enforced. WebSocket connections persist across token lifetimes, meaning a user whose access has been revoked can continue using an established WebSocket connection until it disconnects. The solution requires periodic token expiry checks on active connections: send a "token_refresh_required" message when expiry approaches, and force-close with code 4001 when the token actually expires. This introduces WebSocket-specific complexity (connection metadata tracking, periodic sweep, custom close codes) that does not exist in request-response protocols and is frequently overlooked in gateway designs.

---

## Insight 8: Streaming Large Bodies Avoids the Memory-Explosion Trap of Request Buffering

**Category:** Scaling
**One-liner:** Buffering a 100 MB request body in gateway memory before forwarding to upstream multiplies memory usage by concurrent request count; streaming directly to upstream uses constant memory.
**Why it matters:** The default behavior of many gateways is to fully buffer request and response bodies for transformation. At 1,000 concurrent requests with 100 MB bodies, this requires 100 GB of gateway memory. The solution is a size-based threshold: bodies below a buffer threshold (e.g., 1 MB) are buffered for transformation, while larger bodies are streamed pipe-style directly to upstream. This means body transformation plugins cannot operate on streamed requests, creating a feature tradeoff. The 413 Payload Too Large response at the gateway layer provides a hard upper bound, but the streaming threshold is the non-obvious knob that prevents memory exhaustion under normal operation.
