# Key Insights: Netflix Open Connect CDN

## Insight 1: Proactive Caching Over Reactive Caching

**Category:** Caching
**One-liner:** When the content catalog is known and demand is predictable, pre-position content during off-peak hours instead of waiting for cache misses.

**Why it matters:** Traditional CDNs cache content reactively -- the first viewer experiences a cache miss and higher latency while content is fetched from origin. Netflix's proactive model uses ML-based popularity prediction to generate per-OCA fill manifests and push content overnight, achieving a 95%+ edge hit rate. This only works because Netflix has a bounded catalog (~17,000 titles), predictable demand from a subscription model, and clear off-peak windows for fill traffic. Systems with unbounded, unpredictable content (like YouTube's UGC) cannot use this approach.

---

## Insight 2: ISP-Embedded Appliances as a Partnership Model

**Category:** Edge Computing
**One-liner:** Providing free hardware to ISPs creates a mutual-benefit partnership where Netflix reduces transit costs and ISPs reduce backbone bandwidth consumption.

**Why it matters:** Instead of operating its own PoPs (like Akamai or Cloudflare), Netflix embeds Open Connect Appliances directly inside ISP networks, placing content within a single network hop of end users. The ISP saves an estimated $1.25 billion annually in reduced backbone traffic, while Netflix gets optimal latency and control over delivery. This model requires massive scale to justify the $1+ billion hardware investment but provides advantages impossible with third-party CDNs: proactive caching, ISP-specific content tuning, and direct network topology visibility.

---

## Insight 3: Two-Tier OCA Architecture for Catalog Coverage

**Category:** Caching
**One-liner:** Storage OCAs at IXPs hold the full catalog for long-tail requests, while edge OCAs embedded in ISPs cache only popular content for low-latency delivery.

**Why it matters:** Not all content is equally popular -- a small fraction of titles accounts for most viewing. Edge OCAs (120TB, 18Gbps) inside ISPs store popular content and serve 95%+ of traffic with minimal latency. Storage OCAs (360TB, 96Gbps) at Internet Exchange Points hold the nearly complete catalog for the remaining long-tail requests. This tiered approach optimizes both storage costs (less storage at more locations) and user experience (popular content always local, rare content still accessible via IXP fallback).

---

## Insight 4: BGP-Based Steering with Multi-Signal Scoring

**Category:** Scaling
**One-liner:** Combine BGP AS-PATH length, OCA health, current load, and latency estimates into a composite score to rank candidate OCAs for each playback request.

**Why it matters:** Simple geographic routing (GeoDNS) or Anycast cannot account for OCA health, load, or content availability. Netflix's steering service performs parallel lookups of BGP topology, health scores, and content indices, then computes a composite proximity rank. Embedded OCAs (AS-PATH length 1) get the highest base score (multiplied by 10000), with health (multiplied by 1000) and load (multiplied by 500) adjustments preventing routing to degraded appliances. This multi-signal approach makes decisions in under 10ms at 100K+ requests per second globally.

---

## Insight 5: Cache Miss Classification for Systematic Improvement

**Category:** Caching
**One-liner:** Categorize every cache miss as health, prediction, or capacity to enable targeted remediation instead of treating all misses as equal.

**Why it matters:** A cache miss caused by an overloaded OCA requires different remediation than one caused by a popularity misprediction or insufficient content copies. Netflix joins steering manifests with OCA serving logs via a Kafka-Flink pipeline to classify each miss, then routes alerts and dashboards by category. This transforms cache miss management from reactive firefighting into a systematic optimization loop where each category has distinct mitigation strategies: add capacity for health misses, improve ML models for prediction misses, increase replication for capacity misses.

---

## Insight 6: Atomic File Operations for Fill-vs-Serve Race Conditions

**Category:** Atomicity
**One-liner:** Write content to a temporary file during fill, then atomically rename to the final path only after integrity verification, preventing clients from reading incomplete files.

**Why it matters:** During nightly fills, an OCA might receive a client request for a file that is currently being written. Without atomic operations, the client could read a partially downloaded, corrupted file. The rename pattern (write to .tmp, verify hash, rename to final path) leverages the filesystem's atomic rename guarantee: the file either exists at its final path (complete and verified) or it does not. Requests arriving before the rename receive a 404 and fall back to the next OCA in the steering list -- a zero-coordination solution with no locks or semaphores.

---

## Insight 7: Control Plane / Data Plane Separation

**Category:** Scaling
**One-liner:** Centralize decision-making (steering, fill manifests) in AWS while distributing content serving across 19,000+ edge appliances worldwide.

**Why it matters:** The control plane (steering service, fill controller, popularity prediction) runs centrally in AWS where it can leverage ML infrastructure and global visibility. The data plane (19,000+ OCAs) operates independently, serving content from local storage without needing real-time communication with the control plane during playback. This separation means a control plane outage prevents new playback starts but does not interrupt active streams, and the data plane scales horizontally without control plane bottlenecks.

---

## Insight 8: Fill Window Bandwidth Budgeting

**Category:** Cost Optimization
**One-liner:** Calculate fill capacity as bandwidth times window duration, then ensure daily content churn fits comfortably within available headroom.

**Why it matters:** With a 10 GbE fill interface and 8-hour off-peak window, each edge OCA has a maximum fill capacity of 36 TB per night. At 5% daily catalog churn on 120 TB, only 6 TB of fill is needed -- giving 6x headroom. This margin absorbs new season releases (e.g., 10 episodes at 50 GB each = 500 GB) and codec-change refreshes. Priority-based fill ordering ensures the most popular content arrives first in case the window is constrained, and out-of-cycle fills handle urgent content outside the normal window.

---

## Insight 9: NVMe I/O as the True Bottleneck, Not Network

**Category:** Scaling
**One-liner:** On flash-based OCAs, disk read bandwidth (96 Gbps for 4 NVMe drives) is the limiting factor, not the 100 GbE network interface.

**Why it matters:** System architects often assume network is the bottleneck for content delivery, but Netflix's analysis shows that NVMe sequential read throughput limits serving capacity. Optimizations like zero-copy sendfile(), hot content in page cache, sequential read patterns, and NUMA-aware memory allocation all target disk I/O efficiency. The latest 400 Gbps OCA flips this relationship with 18 NVMe drives (432 Gbps aggregate), making the 4x100 GbE network the new bottleneck -- a desirable state since it means drives have headroom for page cache misses and concurrent fill operations.

---

## Insight 10: BGP Convergence Mitigation with Independent Health Checks

**Category:** Resilience
**One-liner:** BGP can take up to 90 seconds to detect a peer failure, so layer independent HTTP health probes every 10 seconds and pre-compute failover paths.

**Why it matters:** Standard BGP keepalive (30s) and hold time (90s) mean that after an OCA failure, the steering service could continue routing to it for up to 90 seconds. Independent health checks at 10-second intervals detect failures much faster, while BFD (Bidirectional Forwarding Detection) achieves sub-second detection. Combined with pre-computed failover paths and client-side fallback URLs in the playback manifest, the effective failover time drops from minutes to seconds. The client simply tries the next URL in its manifest.

---

## Insight 11: Manifest Versioning with Delta Updates and Grace Periods

**Category:** Consistency
**One-liner:** Generate incremental fill manifests with content that was recently filled protected by a 24-hour grace period to prevent wasteful download-then-delete cycles.

**Why it matters:** Popularity predictions change daily, meaning a new fill manifest might obsolete content that was just downloaded in the previous cycle. Without a grace period, OCAs would waste bandwidth downloading content only to delete it the next day. Delta-based manifests with 24-hour retention for recently-filled content smooth out prediction oscillations and reduce unnecessary fill traffic. The broader principle: any system with a slow write path (multi-hour fill) needs dampening to prevent oscillation from fast-changing inputs.

---

## Insight 12: File-Level Popularity Prediction at Regional Granularity

**Category:** Caching
**One-liner:** Predict popularity for each individual encoding profile (100-200 per title) per region, not just at the title level, to optimize cache allocation for diverse device landscapes.

**Why it matters:** A title might be popular in India but not in Brazil, and mobile users need different encoding profiles than 4K TV viewers. Predicting at file-level granularity (considering each bitrate/resolution/codec variant separately) per region allows OCAs to store exactly the files that local users will request. This maximizes the effective cache hit rate from limited edge storage (120 TB) by avoiding wasted space on encoding profiles that no local device will use.

---

## Insight 13: Proactive Caching Reframes Cache Misses as Design Failures

**Category:** Caching
**One-liner:** In a proactive caching system, every cache miss represents a failure in prediction, capacity, or health -- unlike reactive CDNs where cache misses are expected and routine.

**Why it matters:** Reactive CDNs accept cache misses as normal behavior -- the first request for any content always misses. Open Connect's proactive model fundamentally reframing cache misses: if content was supposed to be on an OCA but was not, something went wrong in the prediction pipeline, the fill window was insufficient, or the OCA was unhealthy. This transforms cache miss rate from a passive metric into an active quality signal, with a rising miss rate triggering investigation into specific failure modes. The prerequisite is content predictability -- Netflix's curated catalog of 17,000 titles is forecastable in a way that a UGC platform's content never could be.

---

## Insight 14: Health-Augmented Steering with Real-Time Request Metrics

**Category:** Resilience
**One-liner:** Supplement periodic health reports with real-time error rate and latency metrics to detect OCA degradation between health check intervals.

**Why it matters:** A health check every 10 seconds leaves a window where an OCA can become overloaded and still receive traffic based on its last healthy report. The steering service closes this gap by tracking per-OCA request success rates and p99 latency in real time. If recent errors exceed the threshold, the reported health score is halved; if latency exceeds the threshold, it is reduced by 30%. This composite health signal is both proactive (periodic checks) and reactive (request-level feedback), eliminating the blind spot between health check intervals.

---

## Insight 15: Multiple IXP Presence for Regional Fault Tolerance

**Category:** Resilience
**One-liner:** Deploy storage OCAs at multiple IXPs per region so that a single IXP outage does not leave embedded OCAs without a fill source or cache miss fallback.

**Why it matters:** If an entire IXP goes offline (power, network), all storage OCAs at that location become unavailable. Embedded OCAs lose their fill source and their cache miss fallback path. Multiple IXP presence per region ensures BGP automatically withdraws the failed IXP's routes and the steering service redirects to the alternate IXP within seconds. Embedded OCAs have a 24+ hour content buffer from their last fill, providing resilience during extended IXP outages. For critical content, a direct S3 fill path bypasses the IXP entirely.

---
