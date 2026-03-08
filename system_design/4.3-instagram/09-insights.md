# Key Insights: Instagram

## Insight 1: Mandatory Media Processing Pipeline -- Every Post Is Compute-Intensive

**Category:** System Modeling
**One-liner:** Unlike text-first platforms where media is optional, Instagram cannot serve any content until media processing completes, making the processing pipeline the system's true critical path.

**Why it matters:** On Twitter, a tweet is immediately available after a database write. On Instagram, every single post requires image compression, thumbnail generation (three sizes: 1440px preview, 250px thumbnail, blur thumbhash), EXIF stripping for privacy, and content moderation -- all before the post is visible to anyone. For video, add AV1/H.264 transcoding, ABR variant generation, Super Resolution enhancement, and HLS manifest creation. At 1,100 uploads per second (3,300+ at peak), the processing pipeline is not a background optimization -- it is the write path. Instagram's architectural answer is to split the write into two phases: an immediate acknowledgment to the client (the post "exists" in pending state) and async processing that makes it visible. This deferred-visibility pattern is unique to media-first platforms and fundamentally changes how you think about write latency: the user perceives sub-second writes, but actual content availability may take seconds to minutes for video.

---

## Insight 2: AV1 Codec Adoption with Two-Phase Encoding for Latency vs Quality

**Category:** Cost Optimization
**One-liner:** Publish immediately with a quick H.264 encode at a single bitrate, then replace it with a superior AV1 encode in the background -- achieving 94% compute cost reduction and 30% better compression.

**Why it matters:** Video encoding historically consumed 80%+ of Instagram's compute resources. The naive approach was to encode every video in all quality tiers before making it available, which was both slow (minutes of processing) and expensive. Instagram's two-phase strategy is the key innovation: Phase 1 produces a single-bitrate H.264 encode for immediate availability (fast, cheap, good enough), while Phase 2 produces multi-bitrate AV1 encodes that replace the H.264 versions when ready. AV1 delivers 30% better compression than H.264 at equivalent quality, and now serves 70%+ of video watch time. The 94% compute reduction comes not from AV1 itself (which is actually more expensive to encode) but from eliminating the upfront multi-bitrate encoding -- most videos are watched in only one or two quality tiers, so on-demand or background encoding for the rest eliminates wasted work. This tiered encoding strategy applies to any media platform balancing upload latency against serving quality.

---

## Insight 3: Defense-in-Depth TTL for Stories Expiration

**Category:** Distributed Transactions
**One-liner:** Stories expire via five independent TTL mechanisms (Cassandra row TTL, Redis EXPIREAT, CDN cache TTL, scheduled expiration service, client-side validation) because no single mechanism can guarantee precise 24-hour expiration across a distributed system.

**Why it matters:** "Delete this content after exactly 24 hours" sounds simple but is extremely hard at global scale. A single TTL mechanism always has failure modes: Cassandra's compaction might delay row deletion, Redis might miss an EXPIREAT due to memory pressure, CDN caches across 200+ PoPs might serve stale content, and clients might have cached Stories locally while offline. Instagram's answer is defense-in-depth: each layer independently enforces expiration, so even if one or two mechanisms fail, the content still disappears. The Expiration Service runs every minute, querying for Stories expiring in the next 60 seconds and scheduling precise deletion tasks. When a Story expires, the service atomically removes it from Redis, invalidates CDN cache entries, updates the Stories tray for all followers, and either archives it (for Highlights) or schedules blob deletion with a 24-hour grace period. Client-side validation adds a final safety net: the app checks `expires_at < localTime()` before displaying any Story, with clock-skew tolerance of 5 minutes and server-authoritative fallback for larger discrepancies.

---

## Insight 4: Andromeda -- Sublinear Inference Cost for Explore Retrieval

**Category:** Data Structures
**One-liner:** Instagram's Andromeda retrieval engine replaces fixed ANN search with a deep neural network that achieves 10,000x model capacity improvement with sublinear inference cost -- meaning the model can grow without proportionally increasing serving latency.

**Why it matters:** Traditional Explore retrieval uses a two-tower embedding model: compute a user embedding, run Approximate Nearest Neighbor (ANN) search against a pre-built index of item embeddings, return top-K candidates. This works but has a fundamental limitation: retrieval quality is bounded by embedding dimensionality, and increasing dimensionality linearly increases ANN search cost. Andromeda (deployed December 2024) replaces this with a deep neural network customized per user, achieving 14% improvement in content quality. The architectural breakthrough is sublinear inference cost -- the model's capacity (number of parameters, embedding dimensions) can grow by orders of magnitude without proportionally increasing serving time, because the inference path is selective rather than exhaustive. This matters for the 50ms retrieval budget: traditional ANN search over 300 million eligible posts forces a trade-off between recall and latency, while Andromeda achieves better recall within the same latency budget.

---

## Insight 5: Three-Tier Feature Store for ML Serving at 90 Million Predictions Per Second

**Category:** Caching
**One-liner:** Split ML features into online (Redis, <5ms), offline (data warehouse, daily), and real-time (streaming pipeline, <1s) tiers, each optimized for its access pattern and freshness requirement.

**Why it matters:** Instagram's Explore system extracts 65 billion features and makes 90 million predictions per second. Serving all these features from a single store would either sacrifice latency (if using a durable store) or freshness (if using only pre-computed caches). The three-tier architecture matches feature freshness to access pattern: the online store (Redis + custom caching) serves pre-computed user embeddings and interest clusters at <5ms p99, refreshed every 5-15 minutes; the offline store (data warehouse) provides 30-day behavioral aggregates for model training, refreshed daily; the real-time store (streaming pipeline) captures current session actions, time since last open, and device context at <1 second latency. The critical design choice is the fallback strategy: if the online store has a latency spike, the system uses cached user features (stale but fast) and supplements with real-time features (fresh but limited), rather than blocking on the slow lookup. This tiered approach ensures that a failure in any single feature tier degrades recommendation quality but never blocks serving.

---

## Insight 6: Lazy CDN Invalidation with Client-Side Validation for Ephemeral Content

**Category:** Edge Computing
**One-liner:** Rather than explicitly invalidating Stories across 200+ CDN PoPs (which creates a continuous invalidation storm at 350K expirations per minute), use short TTL headers and rely on client-side expiration checks.

**Why it matters:** At 500 million daily Stories with 24-hour lifetimes, approximately 350,000 Stories expire every minute. Explicitly invalidating each across 200+ CDN edge locations would generate 70 million invalidation requests per minute -- an unsustainable load on the CDN control plane. Instagram's solution inverts the problem: instead of push-based invalidation, use pull-based expiration. CDN cache entries for Stories are set with short TTL headers (minutes, not hours), so they naturally expire and get refreshed on the next request. Client-side validation acts as the final guard: before displaying any Story, the app checks the `expires_at` timestamp locally. If the Story has expired, it is removed from the local cache and the Stories tray is refreshed from the server. This means a user might briefly see an expired Story in their tray, but upon tapping it, the client validates and removes it -- a 1-2 minute tolerance that is acceptable for ephemeral content. The architectural lesson is that for high-volume expiration events, lazy invalidation (short TTLs + client validation) is vastly more efficient than eager invalidation (explicit cache purges).

---

## Insight 7: Last-Write-Wins with Client Timestamps for Follow/Unfollow Toggle Races

**Category:** Consistency
**One-liner:** Rapid follow/unfollow toggling can cause request reordering where the unfollow arrives before the follow, leaving the user in the wrong state -- solve with client-side debouncing and server-side timestamp comparison.

**Why it matters:** When a user rapidly taps the follow button, the follow and unfollow requests may arrive at the server out of order due to network jitter. If the unfollow request (sent second) arrives and processes before the follow request (sent first), the follow wins and the user ends up following -- the opposite of their intent. Instagram's solution is bidirectional: client-side debouncing prevents sending a new request while one is pending (`pendingFollow[user_id] = true`), and server-side last-write-wins with timestamp comparison rejects stale requests. The server checks `current.updated_at > client_timestamp` and discards the request if it is older than the current state. This is a pragmatic compromise: it does not guarantee strong consistency (a sufficiently delayed request could still cause issues), but it eliminates the most common race condition (rapid toggling) without requiring distributed locks. The pattern applies to any toggle-style user action where out-of-order processing would produce a visibly wrong result.

---

## Insight 8: Super Resolution as a Bandwidth Multiplier on Both Server and Client

**Category:** Edge Computing
**One-liner:** Apply ML-based video upscaling on the server before encoding (to create a better source for compression) and on the client during playback (to enhance low-bitrate streams without additional bandwidth).

**Why it matters:** Instagram's dual-sided Super Resolution strategy attacks the quality-bandwidth trade-off from both ends. On the server, Video Super Resolution (VSR) enhances lower ABR tiers before AV1 encoding, creating a higher-quality source that compresses more efficiently -- the paradox is that enhancing quality before compression can actually reduce file size because the encoder has fewer compression artifacts to work around. This runs on CPU (Intel OpenVINO, <10ms per frame) without requiring expensive GPUs. On the client, on-device VSR using ExecuTorch runtime upscales low-bitrate streams using the device GPU (Metal on iOS, Vulkan on Android), delivering higher perceived quality without any additional bandwidth. The combined effect is that a user on a slow connection sees quality comparable to a mid-tier bitrate while only downloading the lowest tier. This dual-sided approach is unique to Instagram among social platforms and represents a convergence of ML and video engineering that trades compute for bandwidth.

---

*[← Back to Index](./00-index.md)*
