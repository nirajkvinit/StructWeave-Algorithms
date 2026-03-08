# Key Insights: Netflix Open Connect CDN

## Insight 1: Atomic File Rename to Solve Fill-vs-Serve Race Condition

**Category:** Atomicity
**One-liner:** Write incoming content to a temporary file, verify integrity, then atomically rename to the final path -- ensuring that serve requests never read partially-written data.

**Why it matters:** An OCA simultaneously fills content (background writes) and serves content (user reads). Without careful coordination, a client could request a file that's mid-download, receiving corrupted or truncated data. The rename pattern (write to X.tmp, verify hash, rename X.tmp to X, then update content index) leverages the filesystem's atomic rename guarantee: the file either exists at its final path (complete and verified) or it doesn't. Requests for not-yet-renamed files return 404, and the client falls back to the next OCA in its manifest. This is a zero-coordination solution -- no locks, no semaphores, no distributed consensus -- just filesystem semantics. The pattern applies to any system that must update content in-place while serving reads.

---

## Insight 2: Cache Miss Classification as a Feedback Loop

**Category:** Caching
**One-liner:** Classify every cache miss into categories (health, prediction, capacity) by joining steering logs with OCA serving logs, creating actionable intelligence for each category.

**Why it matters:** A raw cache miss metric tells you something is wrong; a classified miss tells you exactly what to fix. Netflix's classification system joins two data streams in real-time: the steering service's decision (which OCA should have served this request) and the OCA's actual response. If the expected OCA was overloaded, it's a health miss -- add capacity. If the content wasn't on the expected OCA, it's a prediction miss -- improve the ML model. If the content existed but had insufficient copies, it's a capacity miss -- increase replication factor. This closed-loop system means every cache miss feeds back into the component responsible for preventing it. Without classification, you'd be guessing at root causes; with it, each category has its own alert threshold and remediation playbook.

---

## Insight 3: BGP AS-PATH Length as a Proxy for Network Proximity

**Category:** Edge Computing
**One-liner:** Use BGP AS-PATH length (number of autonomous systems traversed) as the primary factor in OCA selection, because fewer network hops directly correlates with lower latency and higher throughput.

**Why it matters:** Traditional CDNs use geographic distance (GeoDNS) or anycast routing to select edge servers, both of which are imprecise -- a geographically close server may be many network hops away. Open Connect's steering service uses actual BGP routing data: an embedded OCA within the user's ISP has AS-PATH length 1 (same network), an IXP storage OCA has AS-PATH length 2 (one hop across the peering point). The scoring formula weights AS-PATH length highest (multiplied by 10000), then health (multiplied by 1000), then load (multiplied by 500), then estimated latency. This means a slightly loaded embedded OCA always beats an idle IXP OCA, which is correct because the embedded OCA avoids all inter-network transit. This is a case where the right abstraction (network topology) beats the naive one (physical distance).

---

## Insight 4: Manifest Versioning with Delta Updates and Grace Periods

**Category:** Consistency
**One-liner:** Generate incremental fill manifests based on the OCA's current version, and impose a 24-hour grace period before deleting recently-filled content to prevent thrashing.

**Why it matters:** The nightly fill cycle creates a race condition: while an OCA is executing fill manifest v1, popularity changes trigger manifest v2. If v2 immediately evicts content that v1 just spent hours downloading, the fill bandwidth is wasted and the OCA thrashes between manifests. The solution is threefold: (1) OCAs report their current manifest version, (2) the control plane generates a delta (add/delete/keep) rather than a full manifest, and (3) any content filled within the last 24 hours is protected from eviction regardless of popularity changes. This grace period absorbs prediction volatility and prevents the fill system from fighting itself. The broader principle is that any system with a slow write path (multi-hour fill) needs dampening to prevent oscillation from fast-changing inputs.

---

## Insight 5: BFD for Sub-Second Failure Detection Over BGP

**Category:** Resilience
**One-liner:** Layer Bidirectional Forwarding Detection (BFD) on top of BGP to detect OCA failures in under 1 second, bypassing BGP's 90-second hold timer.

**Why it matters:** BGP's keepalive/hold timer mechanism can take up to 90 seconds to detect a failed peer -- 90 seconds during which the steering service continues routing users to a dead OCA. BFD runs alongside BGP as a lightweight, fast heartbeat protocol (sub-second detection). When BFD detects a failure, it immediately signals BGP to withdraw the route, and the steering service updates its OCA rankings. Combined with pre-computed failover paths (the manifest always includes ranked fallback OCAs), the effective failover is nearly instantaneous from the client's perspective -- the player simply tries the next URL. The 90-second BGP window is acceptable for backbone routing but catastrophic for live video delivery, making BFD an essential addition.

---

## Insight 6: Proactive Caching Makes "Cache Miss" a Design Flaw, Not a Normal Event

**Category:** Caching
**One-liner:** In a proactive caching system, every cache miss represents a failure in prediction, capacity, or health -- unlike reactive CDNs where cache misses are expected and routine.

**Why it matters:** Reactive CDNs accept cache misses as normal operating behavior -- the first request for any content always misses. Open Connect's proactive model fundamentally reframes cache misses: if content was supposed to be on an OCA but wasn't, something went wrong in the prediction pipeline, the fill window was insufficient, or the OCA was unhealthy. This reframing transforms cache miss rate from a passive metric into an active quality signal. A rising miss rate triggers investigation into specific failure modes (viral content the model missed, fill window overruns, storage capacity exhaustion). The prerequisite for this shift is content predictability -- Netflix's curated catalog of 17,000 titles is forecastable in a way that YouTube's 800M user-generated videos never could be.

---

## Insight 7: NVMe-to-Network Bandwidth Ratio as the Hardware Design Constraint

**Category:** Scaling
**One-liner:** Design OCA hardware so that aggregate NVMe read bandwidth exceeds network bandwidth, making the network (not disk I/O) the serving bottleneck.

**Why it matters:** In earlier OCA designs, 4 NVMe drives at 3 GB/s each yielded 96 Gbps of read bandwidth against a 100 GbE NIC -- disk was the bottleneck, limiting actual serving throughput below network capacity. The latest 400G OCA design flips this: 18 NVMe drives at 3 GB/s each = 432 Gbps, feeding 4x100 GbE = 400 Gbps network. Now the network is the bottleneck, meaning the drives have headroom for read amplification, page cache misses, and concurrent fill operations. The optimization stack (zero-copy sendfile, hot content in page cache, sequential reads, NUMA-aware allocation) further maximizes I/O efficiency. This illustrates a hardware co-design principle: identify which physical resource (disk, network, CPU) is the bottleneck and scale the others to create headroom.

---

## Insight 8: Health-Augmented Steering with Real-Time Request Metrics

**Category:** Resilience
**One-liner:** Supplement periodic health reports (every 10s) with real-time error rate and latency metrics to detect OCA degradation between health check intervals.

**Why it matters:** A health check every 10 seconds leaves a window where an OCA can become overloaded (CPU spikes from 40% to 95%) and still be receiving traffic based on its last healthy report. The steering service closes this gap by tracking per-OCA request success rates and p99 latency in real-time. If recent errors exceed the threshold, the reported health score is halved; if latency exceeds the threshold, it's reduced by 30%. This creates a composite health signal that's both proactive (periodic checks) and reactive (request-level feedback). The broader principle is that in any load-balanced system, health checks alone are insufficient -- you need to use the actual request telemetry as a continuous health signal.

---

## Insight 9: Fill Window Arithmetic -- Why Proactive Caching Works at Netflix's Scale

**Category:** Cost Optimization
**One-liner:** A 10 GbE fill interface over an 8-hour off-peak window provides 36 TB of fill capacity against ~6 TB of daily content churn (5% of 120 TB), yielding 6x headroom.

**Why it matters:** Proactive caching only works if the fill window is long enough to transfer the daily content delta. The arithmetic validates the approach: at 10 Gbps sustained over 8 hours, each edge OCA can receive 36 TB nightly, far exceeding the typical 6 TB daily churn. This headroom absorbs spike scenarios -- a new season release (500 GB) is trivially within budget, and even a 20% catalog refresh from a codec migration fits within a few nights of prioritized filling. Pre-filling new releases days before launch further smooths demand. The lesson is that proactive caching is viable only when fill_bandwidth * fill_window >> daily_content_churn, and Netflix's parameters satisfy this inequality comfortably. A platform with higher content churn (e.g., a UGC platform) would fail this test.
