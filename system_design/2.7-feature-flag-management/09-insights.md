# Key Insights: Feature Flag Management

## Insight 1: Local Evaluation Eliminates the Network Hop

**Category:** Caching
**One-liner:** Feature flags must be evaluated locally in the SDK's in-memory store -- never via a network call -- because even a 10ms round-trip is unacceptable when flags are evaluated millions of times per second.

**Why it matters:** A feature flag check sits on the hot path of nearly every user-facing request. If evaluation required a network call to a central service, a single application making 50 flag checks per request at 10ms each would add 500ms of latency. The SDK maintains an in-memory copy of all flag configurations (~3MB for 1,000 flags) and evaluates locally in sub-millisecond time. Updates arrive asynchronously via SSE streaming, meaning the evaluation path has zero network dependency. This is fundamentally different from configuration management systems where a cache miss triggers a remote fetch. The entire flag ruleset is always local, and the SDK can operate indefinitely even if the backend is unreachable (using the last known state). This "full local replica" pattern is essential for any system requiring per-request decisions at scale.

---

## Insight 2: Consistent Hashing for Sticky Bucketing

**Category:** Data Structures
**One-liner:** SHA256(salt + flag_key + user_id) mod 100000 produces a deterministic bucket that guarantees a user always sees the same flag variation, and critically, that increasing a rollout percentage only adds users -- never reshuffles existing ones.

**Why it matters:** The additive rollout property is what makes gradual feature releases safe. When a flag rolls out from 10% to 50%, the users in the 10% bucket (0-9999) stay in their bucket -- only users in buckets 10000-49999 are newly included. If the algorithm reshuffled on percentage change, users would randomly flip between variations, corrupting A/B experiment data and creating a jarring user experience. The salt serves a dual purpose: it enables re-randomization when a new experiment begins on the same flag (rotate the salt), and it enables cross-flag consistency when two related flags should bucket users identically (share the salt). This deterministic-yet-controllable bucketing is the mathematical foundation that makes both gradual rollouts and rigorous experimentation possible on the same platform.

---

## Insight 3: Copy-on-Write for Concurrent Flag Updates

**Category:** Atomicity
**One-liner:** When the SDK receives a flag update via SSE while an evaluation is in progress, copy-on-write ensures the evaluation completes against a consistent snapshot rather than seeing partially updated data.

**Why it matters:** The flag store is read millions of times per second and written to (via streaming updates) tens of times per second. Traditional locking would destroy read performance. Copy-on-write solves this elegantly: a flag update creates a new immutable store object with the change applied, then atomically swaps the pointer. In-flight evaluations continue reading from the old store (which remains valid until they complete and it is garbage collected). The new store is visible to all subsequent evaluations. This is the same pattern used in persistent data structures and concurrent data stores -- it trades a small amount of memory (two copies exist briefly) for lock-free reads at any concurrency level.

---

## Insight 4: SSE Streaming with Versioned Catch-Up

**Category:** Streaming
**One-liner:** SSE connections carry a Last-Event-ID that enables the server to replay missed events on reconnect, bridging the gap between real-time push and reliable delivery.

**Why it matters:** In a system where flag updates must reach all SDKs within 200ms, polling is too slow (even at 1-second intervals, the worst-case delay is 1 second plus network time). SSE provides real-time push, but TCP connections drop -- especially on mobile networks. The Last-Event-ID mechanism turns an inherently unreliable transport into a reliable one: on reconnect, the SDK sends its last received event ID, and the server replays all events since that point. If the gap is too large (the event log has been rotated), the server sends a full "put" event with the complete flag state. This versioned catch-up pattern is the standard approach for any system requiring real-time updates with guaranteed delivery -- it avoids the complexity of bidirectional protocols like WebSockets while providing the same reliability guarantees.

---

## Insight 5: Mutual Exclusion Groups for Experiment Integrity

**Category:** Consistency
**One-liner:** When multiple A/B experiments run simultaneously, mutual exclusion groups prevent a user from being assigned to conflicting experiments, which would corrupt the statistical validity of both.

**Why it matters:** If Experiment A tests a new checkout flow and Experiment B tests a new payment UI, a user in both experiments creates an interaction effect that neither experiment's analysis can isolate. The mutual exclusion group mechanism checks whether a user is already assigned to another experiment in the same group before assigning them. This is a non-obvious requirement -- without it, experiment results are silently corrupted because the confounding variable (being in another experiment) is never controlled for. The implementation uses the same consistent hashing bucketing but adds a pre-check against existing assignments. This pattern of "traffic partitioning for statistical isolation" is critical for any platform running concurrent experiments at scale.

---

## Insight 6: Edge Evaluation with Push Invalidation

**Category:** Edge Computing
**One-liner:** Moving flag evaluation to CDN edge workers reduces latency from 50-200ms to under 10ms globally, with push invalidation plus a 30-second TTL fallback keeping edge data fresh.

**Why it matters:** For latency-sensitive applications (e-commerce checkout, real-time bidding, personalization), even a 50ms round-trip to the origin for flag evaluation is too slow. Edge evaluation stores flag configurations in an edge KV store and runs the evaluation engine in CDN workers. The staleness trade-off is managed through push invalidation (origin pushes flag changes to edge KV on update) with a TTL safety net (if push fails, the stale entry expires in 30 seconds). This hybrid approach provides the latency of aggressive caching with near-real-time freshness -- a staleness budget of seconds rather than the minutes typical of pure TTL-based caching. The pattern applies to any decision-making system where the rules change infrequently relative to the evaluation rate.

---

## Insight 7: SDK Memory Budget as a Design Constraint

**Category:** Scaling
**One-liner:** The SDK's memory footprint (~3MB for 1,000 flags with segments and indexes) is a hard constraint that shapes every design decision, from rule storage format to segment referencing.

**Why it matters:** Unlike server-side systems where you can add memory, client SDKs run inside the customer's application -- every megabyte consumed by the flag SDK is a megabyte unavailable to the application. This constraint drives several design decisions: segments are stored as references (not inlined into every rule that uses them), target lists use hash sets for O(1) lookup rather than arrays, and flags with complex targeting (~50KB each) must be the exception rather than the norm. The ~500-byte average per simple flag enables 1,000 flags in 2MB, but a handful of flags with thousands of individual targets can blow the budget. This is why segment-based targeting (define a segment once, reference it everywhere) is not just a convenience feature but an architectural necessity for memory efficiency.

---

## Insight 8: Database Write Amplification from Flag Changes

**Category:** Scaling
**One-liner:** A single flag change in the admin UI triggers a cascade of writes: database update, change log entry, Kafka event, streaming notifications to thousands of SDKs, and edge KV invalidation across all PoPs.

**Why it matters:** The read-to-write ratio of 1M:1 masks the true cost of writes. A flag update must propagate to every connected SDK (potentially millions of SSE connections), every edge KV store (hundreds of PoPs), and the audit log. Without careful design, this fan-out creates a write amplification storm that can overwhelm the streaming infrastructure. The mitigation is multi-layered: async propagation through a message bus (Kafka) decouples the write from the fan-out, regional isolation allows each region to propagate independently, and batched writes collect rapid successive changes (common during rollout adjustments) before fanning out. This write amplification pattern -- where one logical write creates N physical writes -- is a common bottleneck in any system with many subscribers to a single data source.
