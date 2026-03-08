# Key Insights: Snapchat

## Insight 1: Volatile Memory as a Deletion Guarantee, Not a Performance Optimization

**Category:** Data Structures
**One-liner:** Store ephemeral Snap metadata in RAM-only clusters (no disk persistence) so that deletion is guaranteed by the laws of physics -- power off equals data gone.

**Why it matters:** Most systems treat RAM as a cache layer in front of durable storage. Snapchat inverts this: volatile memory is the primary store for ephemeral content metadata, specifically because it lacks durability. If a volatile cluster node crashes, the Snaps on it are simply gone -- which is the desired behavior for ephemeral content. There is no backup to restore from, no WAL to replay, no replica that might resurrect deleted data. This makes deletion auditable and legally defensible for GDPR and privacy compliance. The trade-off is higher cost (RAM vs. disk) and data loss on cluster failure, but for content designed to disappear, data loss is feature-correct. Any system with a "right to be forgotten" requirement should consider whether making deletion a consequence of storage design is stronger than making it a consequence of application logic.

---

## Insight 2: Multi-Layer CDN Expiration for Stories TTL Coordination

**Category:** Caching
**One-liner:** Enforce 24-hour Story expiration through four independent layers -- CDN TTL headers, signed URL expiry, active edge purging, and client-side enforcement -- because no single layer is reliable enough alone.

**Why it matters:** A Story must disappear at exactly 24 hours across 100+ CDN edge PoPs worldwide. Relying solely on Cache-Control headers risks clock skew between edges; relying solely on active purge risks network partitions delaying the purge command. Snapchat stacks four independent mechanisms: (1) CDN max-age headers as the first-line defense, (2) signed URLs with embedded expiry timestamps so the CDN rejects requests past expiry even if the cache is stale, (3) active invalidation workers that send parallel purge requests to every PoP, and (4) client-side expiry checks as a final safety net. If any three layers fail, the fourth still enforces deletion. This defense-in-depth approach to TTL enforcement applies to any system where time-bounded content visibility is a product requirement: rotating passwords, limited-time offers, or embargo-protected media releases.

---

## Insight 3: On-Device ML with a 16.67ms Frame Budget

**Category:** Edge Computing
**One-liner:** AR Lens inference runs entirely on-device within a 16.67ms per-frame budget (60 FPS), using model quantization and pipelined execution to avoid cloud round-trips.

**Why it matters:** Cloud-based AR inference would add 50-200ms of network latency per frame, making the experience visually laggy and unusable. By running the entire pipeline on-device -- face detection (3ms), landmark detection (2ms), SnapML inference (5ms), effect rendering (3ms), compositing (1ms) -- Snapchat keeps total frame time under 13ms with 3.5ms of headroom. The key engineering trick is pipeline parallelism: while frame N is being rendered, frame N+1's face detection is already running. Model quantization (INT8 instead of FP32) provides a 4x size reduction and 2-4x speed improvement at minimal quality loss. This on-device ML pattern is increasingly relevant for any application where real-time visual processing is needed: video conferencing filters, medical imaging assistants, or industrial quality inspection.

---

## Insight 4: Graceful View Window for Sender-Initiated Deletion

**Category:** Atomicity
**One-liner:** When a sender deletes a Snap while a recipient is actively viewing it, mark it for deferred deletion (30-second max window) rather than yanking the media mid-stream.

**Why it matters:** If media is deleted from storage while a recipient is in the middle of watching a 10-second video, the stream breaks -- creating a jarring user experience and potential data inconsistency in view tracking. The graceful view window solves this by checking for active viewers before executing deletion. If viewers exist, the Snap is marked as "pending deletion" and a forced deletion is scheduled 30 seconds later as a hard backstop. This separates the authorization to delete (immediate) from the execution of deletion (deferred until safe). The same pattern applies to any system where resource cleanup must respect in-flight consumers: database connection draining during shutdown, rolling deployments of stateful services, or file handle cleanup in shared storage systems.

---

## Insight 5: H3 Hexagonal Indexing with K-Anonymity for Snap Map

**Category:** Security
**One-liner:** Index user locations using H3 hexagonal cells and enforce k-anonymity (minimum 3 users per cell) in heatmaps so that individual locations are never exposed through aggregate views.

**Why it matters:** Snap Map shows 400 million users' locations, making it a high-value privacy target. Raw location data on a heatmap could reveal individual users' positions in low-density areas. K-anonymity thresholding (cells with fewer than 3 users are hidden) prevents this by ensuring that any visible heatmap cell could represent at least 3 different people. The H3 hexagonal grid provides more uniform cell sizes than rectangular grids (no distortion at edges), and the multi-resolution approach (resolution 3 at country zoom, resolution 11 at street zoom) adapts granularity to the map zoom level. Client-side Ghost Mode goes further by suppressing location updates entirely -- no server calls, no data to leak. This layered privacy approach (client suppression + server-side k-anonymity + resolution adaptation) is essential for any location-sharing feature.

---

## Insight 6: Tiered Device Capability Models for AR Quality

**Category:** Resilience
**One-liner:** Ship three quality variants of every AR Lens (full, standard, lite) and dynamically select based on device tier, battery level, and thermal state to maintain responsiveness on all devices.

**Why it matters:** Snapchat's user base spans from flagship phones to budget devices several years old. A single quality model either excludes budget users (too slow) or wastes flagship capabilities (too simple). The three-tier approach -- full (1080p/60fps), standard (720p/30fps), lite (480p/30fps) -- ensures every user gets a functional AR experience. The dynamic selection function considers not just device capability but also battery level (below 20% forces medium quality) and thermal state (throttling forces low quality), preventing the app from draining batteries or triggering thermal shutdowns. Frame skipping under load maintains UI responsiveness even when inference cannot keep up. This adaptive quality pattern applies to any media-intensive application: video streaming bitrate ladders, game graphics settings, and real-time translation quality tiers.

---

## Insight 7: Deletion Queue Auto-Scaling with Prioritized Processing

**Category:** Traffic Shaping
**One-liner:** Auto-scale deletion workers from 10 to 100 based on queue depth, with user-initiated deletes at the highest priority and expiration-based deletes at the lowest.

**Why it matters:** During peak events (New Year's Eve, major cultural moments), Snap creation rates spike 10-20x, and the subsequent deletion wave arrives 1-30 seconds later as recipients view Snaps. If the deletion queue grows unbounded, Snaps that should have disappeared remain accessible for minutes or hours -- violating the core ephemeral promise. The three-tier priority system ensures that user-initiated deletes (someone actively pressing "delete") complete in under a second, all-viewed Snaps delete within a minute, and time-expired Snaps can tolerate up to 5 minutes of delay. The auto-scaling thresholds (20 workers at 10K queue depth, 100 workers at 1M) are calibrated to these SLOs. This priority-aware auto-scaling pattern is applicable to any system with heterogeneous urgency levels: notification delivery tiers, data pipeline processing, or content moderation queues.

---

## Insight 8: Multicloud as a Cost Optimization Strategy, Not Just Resilience

**Category:** Cost Optimization
**One-liner:** Snapchat's AWS + GCP multicloud architecture achieved a 65% cost reduction by placing workloads on whichever cloud offers the best price-performance for each service type.

**Why it matters:** The conventional wisdom is that multicloud adds operational complexity without clear benefit. Snapchat's experience demonstrates the opposite when done at sufficient scale: compute-heavy ML training runs on whichever provider offers cheaper GPU instances this quarter, storage-heavy media pipelines use whichever object storage has better egress pricing, and the service mesh (Envoy) provides a uniform abstraction over both providers. The 65% cost reduction is not from negotiation leverage alone but from workload-aware placement. The risk -- operational complexity of managing two cloud providers -- is mitigated by Kubernetes as the uniform orchestration layer and Envoy as the uniform networking layer. This approach is viable at Snapchat's scale (300+ microservices, 10M+ QPS) but would likely be net-negative for smaller organizations where the operational overhead exceeds the cost savings.
