# Key Insights: Identity & Access Management (IAM)

## Insight 1: Policy Compilation with AST Optimization Turns Authorization into a Sub-Millisecond Decision

**Category:** Caching
**One-liner:** Pre-compiling policies into optimized ASTs with constant folding, short-circuit reordering, and evaluation function generation converts runtime policy evaluation from an interpretation task to a near-instant function call.

**Why it matters:** A naive policy engine that parses JSON policy documents and evaluates them on every request would add 10-50ms of latency to every API call. Policy compilation eliminates this overhead by performing expensive operations once at deployment time. Constant folding evaluates static conditions at compile time (e.g., "if resource_type == 'S3'" becomes a no-op for policies that only apply to S3). Short-circuit ordering rearranges conditions to put the most likely-to-fail checks first, reducing average evaluation depth. The compiled evaluator function is paired with a fingerprint (SHA-256 of the optimized AST) that serves as the cache key. Combined with three-tier caching (L1 in-process at <1ms, L2 Redis at <5ms, L3 database at <50ms), the system achieves sub-millisecond p99 for 95%+ of authorization decisions. The general principle: any system evaluating user-defined rules at high frequency should compile those rules into optimized representations at write time.

---

## Insight 2: Refresh Token Rotation with Family-Based Reuse Detection Catches Token Theft

**Category:** Security
**One-liner:** Each refresh token is single-use, and reuse of an already-consumed token triggers immediate revocation of the entire token family (all tokens issued from the original authorization), detecting token theft even after the attacker has used the stolen token.

**Why it matters:** Refresh tokens are long-lived and powerful -- they can generate new access tokens. If an attacker steals a refresh token, they can silently maintain access indefinitely. Single-use rotation means every refresh generates a new refresh token (RT1 produces RT2, RT2 produces RT3). When RT1 is used a second time (either by the legitimate client who didn't receive RT2, or by an attacker who stole RT1), the system detects reuse and revokes the entire family (RT1, RT2, RT3, and any future tokens). The legitimate user must re-authenticate, but the attacker's access is immediately terminated. The family_id links all tokens back to the original authorization, enabling this cascade revocation. The trade-off is that network failures during rotation can trigger false positives (the client sent RT1, received RT2, but the response was lost, so it retries with RT1). The broader lesson: in any credential chain, make each credential single-use and treat reuse as a compromise indicator.

---

## Insight 3: Security Stamps Provide Instant Cross-Session Invalidation on Password Change

**Category:** Consistency
**One-liner:** Every session stores the user's security_stamp at creation time, and every session validation compares it against the current stamp -- when a password change generates a new stamp, all existing sessions are immediately invalidated.

**Why it matters:** The classic session invalidation problem is that sessions are stored in distributed caches (Redis shards across regions) and there's no practical way to atomically delete all of them. Security stamps solve this without touching session storage: when the user changes their password or triggers any security-relevant event, a new security_stamp (UUID) is written to the user record. On the next request, session validation loads the user record (cached briefly) and compares stamps. Mismatch means the session was created before the security event, and it's immediately revoked. This is an O(1) check per request rather than an O(sessions) deletion operation. The same pattern works for user deactivation, permission changes, or any event that should invalidate existing sessions. The broader principle: instead of finding and destroying all instances of stale state, embed a version marker and check it on access.

---

## Insight 4: Risk-Based MFA Scoring Balances Security with User Experience

**Category:** Security
**One-liner:** A multi-signal risk score (device trust, location, time, behavior patterns, IP reputation) determines whether MFA is required and which methods are offered, eliminating unnecessary friction for low-risk logins while escalating protection for anomalous ones.

**Why it matters:** Requiring MFA on every login degrades user experience and leads to MFA fatigue. Skipping MFA entirely leaves accounts vulnerable. Risk-based scoring threads the needle: a known device from a known location during business hours scores low risk and skips MFA. An unknown device from a new country at 3am scores high risk and requires the strongest available method (WebAuthn, not SMS). The scoring model combines six signal categories: device recognition (unknown = +20, suspicious = +40), location analysis (new location = +15, impossible travel = +50), time analysis (unusual hour = +10), behavior (recent failed attempts = +25, credential stuffing pattern = +40), request characteristics (Tor = +30, known bad IP = +50), and account factors (new account = +10, dormant = +15). MFA method selection is also risk-aware: high-risk scenarios exclude SMS (susceptible to SIM swapping) and only allow phishing-resistant methods. The general principle: adaptive security that escalates enforcement based on risk signals provides better protection at lower user friction.

---

## Insight 5: XFetch Probabilistic Early Expiration Prevents Cache Stampedes on Policy Updates

**Category:** Caching
**One-liner:** Instead of all cache entries expiring simultaneously and causing a thundering herd to the policy database, each request probabilistically recomputes the cache entry earlier as it approaches expiration, distributing refresh load over time.

**Why it matters:** In an IAM system serving 100K+ authorization decisions per second, a cache miss storm is catastrophic. If a popular policy's cache entry expires and 1,000 concurrent requests all see the miss simultaneously, all 1,000 hit the policy database. The XFetch algorithm adds a probabilistic early refresh: as the TTL decreases, the probability that any given request triggers a background refresh increases exponentially. With `early_expiry_probability = exp(-remaining_ttl * beta / base_ttl)`, a request when TTL is 90% remaining has near-zero probability of refreshing, while a request at 10% remaining has a high probability. The first request that decides to refresh acquires a distributed lock and fetches the fresh value while all other requests continue using the stale (but valid) cached value. This distributes refresh load over time instead of concentrating it at expiry. Combined with push-based invalidation for policy updates, this creates a cache system that's both responsive and stampede-proof.

---

## Insight 6: JWT Key Rotation with Overlapping Validity Achieves Zero-Downtime Signing Key Changes

**Category:** Security
**One-liner:** New signing keys are added to the JWKS before becoming the active signing key, and old keys are removed only after the maximum token lifetime has elapsed, ensuring no valid token is ever unverifiable.

**Why it matters:** JWT signing keys must be rotated periodically, but a naive rotation (replace old key with new key) breaks all existing tokens signed with the old key. The overlapping validity approach works in five stages: (1) generate new key pair, (2) publish new public key to JWKS endpoint (now both old and new keys are listed), (3) mark old key as "deprecated" but still valid for verification, (4) switch signing to new key (new tokens use new key, old tokens still verify against old key), (5) after max_access_token_lifetime has elapsed, remove old key (all tokens signed with it have expired). The JWKS endpoint is served via CDN with appropriate cache headers. This pattern ensures that at any point in time, every non-expired token can be verified against the published JWKS. The broader principle: in any credential rotation scheme, the transition period must last at least as long as the maximum lifetime of credentials issued under the old scheme.

---

## Insight 7: TOTP Anti-Replay via Last-Used Counter Prevents Code Reuse Within the Valid Window

**Category:** Security
**One-liner:** Recording the last successfully used TOTP counter and rejecting any code with a counter less than or equal to it prevents replay attacks within the 30-second window, even though the code itself is still technically valid.

**Why it matters:** TOTP codes are valid for 30 seconds (one period), and most implementations accept +/-1 period for clock drift tolerance, creating a 90-second window where the same code is valid. Without anti-replay protection, an attacker who intercepts a TOTP code can reuse it within this window. The `last_used_counter` field records the highest counter value successfully used. Any subsequent attempt with the same or lower counter is rejected, even if the HMAC computation produces a valid code. This uses `constant_time_compare` to prevent timing side-channel attacks on the comparison. The broader lesson: in any time-based credential system, validating that the credential is mathematically correct is necessary but not sufficient -- you must also verify it hasn't been used before.

---

## Insight 8: 100:1 Validation-to-Login Asymmetry Demands Separate Optimization Strategies

**Category:** Scaling
**One-liner:** Token validation (100x the volume of logins) must be optimized for throughput and latency (local JWT verification, cached public keys), while login flows can tolerate higher latency for stronger security (Argon2id hashing, MFA ceremonies).

**Why it matters:** IAM traffic is bimodal: the "cold path" (authentication, login) is infrequent but security-critical, while the "warm path" (token validation, authorization decisions) is extremely high-volume but must be fast. Optimizing both paths identically produces either insecure logins (fast but weak hashing) or slow API calls (full auth check per request). JWT-based validation enables the warm path to be entirely local: verify the signature against a cached public key, check the expiry, extract claims -- no network call needed. Meanwhile, the cold path uses memory-hard Argon2id hashing (resistant to GPU attacks), WebAuthn challenge-response ceremonies, and full session creation with device fingerprinting. The architectural implication is that these paths should be separate services with different scaling profiles: the login service scales for security (CPU-intensive), while the validation service scales for throughput (I/O-optimized). The general principle: identify the volume asymmetry in your access patterns and optimize each path for its dominant constraint.
