# Key Insights: Identity & Access Management (IAM)

[← Back to Index](./00-index.md)

---

## Insight 1: Multi-Tier Policy Caching Achieves Sub-Millisecond Authorization at Scale

**Category:** Caching
**One-liner:** A three-tier policy cache (L1 in-process at <1ms, L2 distributed Redis at <5ms, L3 database at <50ms) ensures that the vast majority of authorization decisions are made without any network call, turning a potential bottleneck into an O(1) memory lookup.

**Why it matters:** Every API request in a zero-trust system requires an authorization decision. At 100K+ requests per second, even a 5ms database query per decision would saturate the policy store. The L1 in-process cache (100ms TTL) serves most requests with sub-millisecond latency because policy documents change infrequently. The L2 distributed cache absorbs L1 misses across instances. The critical challenge is cache invalidation: when a policy changes, stale cached decisions could grant access to revoked users or deny access to newly authorized ones. Push-based invalidation via an event bus ensures all instances invalidate their L1 caches within milliseconds of a policy change, while the short L1 TTL provides a safety net if the invalidation message is lost. This pattern -- aggressively cache authorization decisions with event-driven invalidation -- is the standard approach at every major IAM provider.

---

## Insight 2: Policy Compilation Converts Runtime Interpretation into Pre-Optimized Evaluation

**Category:** Data Structures
**One-liner:** Pre-compiling policy documents into optimized ASTs with constant folding, short-circuit reordering, and index annotations reduces evaluation time by eliminating repeated parsing and enabling fail-fast condition checking.

**Why it matters:** A naive policy engine parses the policy document on every evaluation request, traversing JSON structures and interpreting conditions dynamically. Policy compilation transforms this into a pre-optimized evaluation function: constants are folded at compile time, conditions are reordered so likely-false checks execute first (fail-fast), and common subexpressions are eliminated. The compiled policy also extracts the list of required attributes, enabling batch fetching of context data instead of lazy lookups during evaluation. The fingerprint (SHA-256 of the optimized AST) serves as an efficient cache invalidation key -- if the fingerprint has not changed, the cached compiled policy is still valid. This is the same optimization pipeline that database query planners, regex engines, and JIT compilers use: front-load the compilation cost (milliseconds, done once) to reduce per-evaluation cost (microseconds, done millions of times).

---

## Insight 3: Refresh Token Rotation with Family-Based Reuse Detection Catches Token Theft

**Category:** Security
**One-liner:** Each refresh token is used exactly once and replaced with a new one; if an old token is reused, the entire token family is revoked, immediately locking out both the attacker and the legitimate user to force re-authentication.

**Why it matters:** Refresh tokens are long-lived and high-value -- if stolen, they grant persistent access. Simple refresh token expiration limits the damage window but does not detect theft. Rotation with reuse detection does: each refresh token belongs to a family (F1), and when RT1 is exchanged for RT2, RT1 is marked as used. If RT1 is presented again (by an attacker who stole it before the user rotated), the system detects the reuse, revokes all tokens in family F1, and invalidates the session. Both the attacker and the legitimate user lose access, forcing the legitimate user to re-authenticate (a mild inconvenience) while completely cutting off the attacker. The trade-off is that network issues causing a client to retry a refresh request can trigger false-positive revocation. Mitigations include short grace periods for duplicate requests and ensuring the client stores the new refresh token before discarding the old one.

---

## Insight 4: JWT Key Rotation Requires a Deprecation Grace Period Equal to Maximum Token Lifetime

**Category:** Security
**One-liner:** When rotating JWT signing keys, the old key must remain in the JWKS for verification (but not signing) for at least as long as the longest-lived token it signed, preventing valid tokens from becoming unverifiable.

**Why it matters:** JWT validation is stateless -- the verifier downloads the public key from the JWKS endpoint and checks the signature locally. If the signing key is rotated and the old key is immediately removed from JWKS, every token signed with that key becomes unverifiable, causing a mass authentication failure. The correct rotation sequence is: generate new key, add to JWKS, start signing with new key, mark old key as deprecated (still in JWKS for verification), and only remove the old key after max_access_token_lifetime has elapsed. CDN caching of the JWKS endpoint adds another consideration: the CDN might serve a stale JWKS that does not include the new key for its cache TTL duration. The JWKS cache TTL should be shorter than the key rotation period to ensure verifiers can always find the current key. This graceful deprecation pattern applies to any system with distributed key verification.

---

## Insight 5: Security Stamps Enable Instant Global Session Invalidation Without Distributed Coordination

**Category:** Consistency
**One-liner:** Each user has a security stamp (a UUID) stored in both the user record and every session; changing the user's password or revoking access updates the stamp, causing all existing sessions to fail validation on their next request.

**Why it matters:** In a distributed system with sessions cached across multiple Redis shards and application instances, instantly invalidating all sessions for a user (after password change, account compromise, or admin action) is expensive if done by enumerating and deleting each session. The security stamp pattern avoids this: when validating a session, the service compares the stamp in the session against the stamp in the user record. A password change updates the user's stamp, and on the next request, every session silently fails validation because its stamp no longer matches. No need to find or delete individual sessions -- they auto-invalidate on next use. The trade-off is an additional user record lookup during session validation, but this is efficiently mitigated with a short-TTL user cache. This is a specific instance of the broader "generation counter" pattern used in distributed caching and versioned data structures.

---

## Insight 6: The 100:1 Validation-to-Login Asymmetry Demands Different Optimization Strategies for Each Path

**Category:** Scaling
**One-liner:** Token validation happens 100 times more frequently than authentication, so the validation path must be optimized for sub-millisecond local evaluation (cached JWTs, local JWKS) while the authentication path can tolerate higher latency for security operations (Argon2id hashing, MFA ceremonies).

**Why it matters:** A system handling 100K requests/second generates 100K token validations/second but only ~1K authentications/second. Optimizing both paths equally would waste engineering effort on the cold path and under-optimize the hot path. Token validation should be fully local: JWT signature verification against a cached public key, claim validation, and a revocation check against a local bloom filter or short-TTL cache. Authentication can afford the latency of Argon2id password hashing (100-500ms by design, to resist brute force), database lookups, MFA challenge-response, and risk scoring. The architectural separation between control plane (authentication, policy management) and data plane (token validation, authorization decisions) reflects this asymmetry. Systems that fail to separate these paths often over-optimize login (making it less secure) or under-optimize validation (making it too slow).

---

## Insight 7: Risk-Based MFA Adapts Security Friction to Threat Level

**Category:** Security
**One-liner:** A risk scoring engine that evaluates device trust, location, behavior patterns, and request characteristics dynamically determines whether MFA is required and which methods are allowed, applying maximum security friction only when the threat signal justifies it.

**Why it matters:** Requiring MFA on every login creates user fatigue and encourages workarounds (weak TOTP implementations, SMS as default). Requiring no MFA leaves accounts vulnerable. Risk-based MFA threads the needle: a login from a recognized device at a usual time from a familiar IP scores low risk and may skip MFA entirely. A login from an unknown device in a new country with recent failed attempts scores high risk and requires the strongest factor (WebAuthn, not SMS). The scoring function combines signals additively: unknown device (+20), new location (+15), recent failures (+25), Tor exit node (+30), impossible travel (+50). The thresholds are tenant-configurable, allowing enterprise customers to enforce stricter policies. The broader design principle is adaptive security: match the cost of the security measure to the probability of the threat, rather than applying uniform friction everywhere.

---

## Insight 8: The Cache Stampede Problem Requires Probabilistic Early Expiration

**Category:** Caching
**One-liner:** When a popular cache entry expires, hundreds of simultaneous requests all try to recompute it at once; probabilistic early expiration (XFetch algorithm) causes a random single request to refresh the cache before it expires, preventing the stampede entirely.

**Why it matters:** In an IAM system, policy cache entries and session data are accessed by thousands of requests per second. When a TTL expires, all concurrent requests find an empty cache and simultaneously query the database to rebuild it, creating a load spike that can cascade into an outage. The XFetch algorithm solves this elegantly: as the TTL approaches expiration, each request has a small probability (exponentially increasing as TTL decreases) of proactively refreshing the cache while it is still valid. In practice, exactly one request refreshes the cache shortly before expiration, and all other requests continue using the still-valid cached value. A distributed lock (SETNX) provides a secondary defense: if a stampede does occur, only the lock holder recomputes while others wait or use stale data. This pattern is essential for any high-traffic system with shared cache entries that have finite TTLs.

---

## Insight 9: Session Anomaly Detection Catches Hijacking Through Impossible Travel and Context Shifts

**Category:** Security
**One-liner:** By comparing each request's IP geolocation, user agent, and timing against the session's original context, the system detects session hijacking indicators like impossible travel (country change in minutes) and browser fingerprint switches.

**Why it matters:** A stolen session cookie grants full access with no additional authentication. Session anomaly detection provides a second line of defense: if a session created from New York suddenly issues requests from Moscow five minutes later, the "impossible travel" heuristic flags it as likely stolen. Similarly, a session that switches from Chrome on macOS to Firefox on Linux is suspicious. The severity scoring is graduated: same country, different city is medium risk (might be VPN or mobile roaming), while different country in minutes is high risk. Concurrent sessions from geographically impossible locations trigger the highest alerts. The response is also graduated: low-risk anomalies may trigger background logging, medium-risk anomalies may require step-up MFA, and high-risk anomalies may immediately revoke the session. The key engineering challenge is avoiding false positives from legitimate scenarios (VPN usage, travel, multiple devices), which requires tuning thresholds based on per-user behavioral baselines.

---

## Insight 10: Sliding Window Rate Limiting with Weighted Previous Windows Prevents Boundary Attacks

**Category:** Traffic Shaping
**One-liner:** A sliding window rate limiter that weights the previous window's count by its overlap with the current window prevents the boundary attack where an attacker sends the full limit at the end of one window and the beginning of the next, effectively doubling their rate.

**Why it matters:** Fixed-window rate limiting (e.g., 100 requests per minute) has a known vulnerability: an attacker sends 100 requests at 0:59 and 100 requests at 1:00, achieving 200 requests in 2 seconds while technically staying within the per-minute limit. The sliding window approximation solves this: the effective count is `previous_window_count * (1 - window_position) + current_window_count`, weighting the previous window's count by how much of the current window has elapsed. At 30 seconds into the current window, 50% of the previous window's count is included. This is computed atomically in Redis via a Lua script (INCR + EXPIRE + weighted calculation) to prevent race conditions across distributed instances. For authentication endpoints, this rate limiting is critical to prevent credential stuffing attacks, where attackers try thousands of username/password combinations per minute.

---

## Insight 11: RBAC Role Explosion vs ReBAC Graph Complexity Is a Fundamental Authorization Model Trade-off

**Category:** System Modeling
**One-liner:** RBAC is simple to understand but suffers role explosion at scale (N users x M resources = N*M role assignments), while ReBAC (Zanzibar-style) models permissions as relationships in a graph that scales naturally but requires complex traversal.

**Why it matters:** An enterprise application with 10 teams, 5 permission levels, and 100 resources could need 5,000 role definitions under pure RBAC to express per-resource permissions. ReBAC (as pioneered by Google Zanzibar) instead models permissions as relationships: "User A is an editor of Document B, which is in Folder C, which is owned by Organization D." Permission checks become graph traversals: can we find a path from User A to Document B through the relationship graph that grants the requested permission? This scales naturally with the relationship structure. The trade-off is evaluation complexity: RBAC is an O(1) set membership check (does the user have role X?), while ReBAC can require deep graph traversal for nested relationships. Materialization (pre-computing common paths) and traversal depth limits are essential optimizations. Most production systems use a hybrid: RBAC for coarse-grained access (admin, viewer), ReBAC for fine-grained resource-level sharing (Google Docs-style).

---

## Insight 12: Database Connection Exhaustion Under Auth Load Requires Transaction-Mode Pooling

**Category:** Contention
**One-liner:** Each authentication request holds a database connection for its entire transaction (credential lookup, session creation, audit logging), and under login burst traffic, the connection pool is exhausted within seconds without transaction-mode pooling.

**Why it matters:** Authentication is database-intensive: a single login involves a credential lookup (read), session creation (write), audit log entry (write), and potentially MFA device lookup (read). If each request holds a connection for the full duration (including Argon2id hashing at 100-500ms), a pool of 100 connections can only handle 200-1000 logins per second. Transaction-mode pooling (PgBouncer) releases the connection back to the pool between transactions, dramatically increasing throughput. Read replica routing sends credential lookups and session validations to replicas, reserving the primary for writes. Moving audit logging to an async queue removes it from the critical path entirely. The deeper lesson is that IAM systems have uniquely heavy database interactions per request compared to typical CRUD APIs, and connection management must be designed accordingly.

---

## Insight 13: Stateless JWTs vs Stateful Opaque Tokens Trade Instant Revocation for Scalability

**Category:** Consistency
**One-liner:** JWTs can be validated locally without any network call (self-contained claims, signature verification) but cannot be instantly revoked, while opaque tokens support instant revocation but require a centralized lookup on every validation.

**Why it matters:** A JWT contains all necessary claims (user ID, roles, expiry) signed by the issuer. Any service with the public key can validate it without calling the auth server, enabling massive horizontal scaling of validation. But if a user's access is revoked, the JWT remains valid until it expires (typically 5-60 minutes). Opaque tokens are random strings that require a server-side lookup, so revocation is instant (delete the token record), but every request incurs a network call to the token store. The practical solution is a hybrid: short-lived JWTs (5-15 minutes) for routine validation, combined with a revocation cache (bloom filter or Redis set of revoked JTIs) checked locally. The revocation cache is small (only contains tokens revoked before their natural expiry) and can be pushed to all instances via pub/sub. This gives near-stateless validation with a bounded revocation window.
