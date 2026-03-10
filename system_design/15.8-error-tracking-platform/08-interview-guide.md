# Interview Guide — Error Tracking Platform

## Interview Pacing (45-min format)

| Time | Phase | Focus |
|------|-------|-------|
| 0-5 min | **Clarify** | Scope the system: real-time error tracking with SDKs, grouping, alerting. Clarify: web-only or multi-platform? Single-tenant or multi-tenant? Scale (events/sec)? |
| 5-15 min | **High-Level** | Draw the pipeline: SDK → Relay → Bus → Processing (normalize, symbolicate, fingerprint) → Storage (columnar + relational) → Alert engine. Explain the split between columnar (events) and relational (issues). |
| 15-30 min | **Deep Dive** | Pick 1-2: fingerprinting algorithm (stack trace normalization, fallback chain, merge/split), OR source map symbolication (lookup, parsing, caching, retro-symbolication), OR spike protection (baseline, sampling, quota). |
| 30-40 min | **Scale & Trade-offs** | Discuss: spike absorption (message bus), fingerprint cache invalidation on algorithm upgrades, cross-tenant isolation, multi-region data residency. Bottlenecks: source map parsing thundering herd, alert evaluation during spikes. |
| 40-45 min | **Wrap Up** | Summarize key decisions. Mention: observability of the platform itself (meta-monitoring), PII scrubbing, DSN security model. Handle follow-ups. |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **The grouping problem is the system:** Unlike most systems where the "core algorithm" is one component among many, the fingerprinting/grouping algorithm IS the product. If grouping is wrong, the platform is useless regardless of how well everything else works. Spend 30-40% of your deep-dive time here.

2. **Bursty by nature:** Error traffic is the opposite of steady-state. It correlates with incidents — exactly when the system is most needed, it faces its highest load. The architecture must handle 100x spikes without degradation.

3. **The source map bootstrapping problem:** After every deploy, the first errors arrive before source maps are uploaded. The system must gracefully handle this temporal gap and retro-symbolicate when maps arrive.

4. **Security inversion:** The DSN (auth token) is necessarily embedded in client-side code and is publicly visible. The security model must assume the auth token is compromised and defend via rate limiting, origin validation, and payload sanitization.

5. **Developer experience is the product:** Unlike infrastructure systems where operators are the users, error tracking serves developers. The UI's speed, the quality of stack traces, and the accuracy of grouping directly determine adoption. Technical excellence alone isn't enough — it must be usable.

### Where to Spend Most Time

- **Fingerprinting algorithm** (~35%): This is the differentiator. Explain the strategy chain (custom → rules → stack trace → exception → message), platform-specific normalization, and the precision-recall trade-off.
- **Ingestion pipeline with spike handling** (~25%): The relay → bus → worker pipeline, spike protection, and quota management.
- **Symbolication** (~20%): Source map lifecycle, caching strategy, retro-symbolication.
- **Storage design** (~20%): Why columnar for events and relational for issues; the consistency model between them.

---

## Trade-offs Discussion

### Trade-off 1: Grouping Precision vs Recall

| Decision | Over-Group (High Recall) | Under-Group (High Precision) | Recommendation |
|----------|--------------------------|-------------------------------|----------------|
| | Pros: Fewer issues in the list; developers see consolidated view | Pros: Each issue is a single root cause; debugging is straightforward | **Lean toward precision (under-group)** |
| | Cons: Multiple bugs merged into one issue; fix one, others persist | Cons: Same bug appears as 50 issues; duplicated triage effort | Developers can merge issues manually; splitting is much harder. Better to err on the side of separate issues. |

### Trade-off 2: Symbolication Latency vs Event Freshness

| Decision | Synchronous Symbolication | Asynchronous with Retro-Symbolication | Recommendation |
|----------|---------------------------|---------------------------------------|----------------|
| | Pros: Events always shown with resolved stack traces | Pros: Events visible immediately; symbolication doesn't block pipeline | **Asynchronous** |
| | Cons: Blocks event visibility until source map is available; processing pipeline slows during deploy surges | Cons: Brief window where events show minified traces; UI must handle "pending symbolication" state | The value of seeing events immediately (even with raw traces) outweighs the cost of temporary unresolved frames. |

### Trade-off 3: Event Fidelity vs Cost

| Decision | Store All Fields | Store Aggregates + Sampled Events | Recommendation |
|----------|-----------------|-----------------------------------|----------------|
| | Pros: Full debugging context for every event; no information loss | Pros: 10-50x storage reduction; faster queries | **Full events for recent data; sampled for old data** |
| | Cons: Expensive storage at scale (15 TB / 30 days); query performance degrades | Cons: Cannot inspect individual events from 3 months ago; debugging historical issues is limited | Use tiered retention: full events for 30 days, sampled representative events + aggregated counters for 90+ days. |

### Trade-off 4: Real-time Alerts vs Alert Fatigue

| Decision | Alert on Every New Issue | Alert with Threshold + Frequency Cap | Recommendation |
|----------|--------------------------|--------------------------------------|----------------|
| | Pros: No new issue goes unnoticed | Pros: Developers aren't overwhelmed; only significant issues trigger alerts | **Threshold + frequency cap** |
| | Cons: During deploys, dozens of new issues trigger a flood of alerts; developers mute everything | Cons: Some low-frequency issues may not trigger alerts immediately | Default: alert on new issues affecting >1% of sessions OR >10 occurrences in 5 minutes. Allow customization per project. |

### Trade-off 5: Columnar-Only vs Polyglot Storage

| Decision | Single Columnar Store | Columnar (Events) + Relational (Issues) | Recommendation |
|----------|----------------------|------------------------------------------|----------------|
| | Pros: Simpler operations; single query language | Pros: Each store optimized for its access pattern | **Polyglot** |
| | Cons: Columnar stores handle point lookups and transactions poorly; issue state management is awkward | Cons: Two systems to operate; consistency between event counts and issue counts requires synchronization | The access patterns are fundamentally different. Columnar for analytical scans (events); relational for transactional state (issues). |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just use the error message as the fingerprint?" | Test understanding of grouping nuance | Error messages contain data (timestamps, IDs, user inputs) that make identical bugs produce different messages. "User 12345 not found" and "User 67890 not found" are the same bug but different messages. Must strip data before hashing. |
| "Can't you just store everything in a relational database?" | Test storage design reasoning | At 500M events/day, relational databases cannot handle the write throughput or analytical query patterns (GROUP BY release, browser, time). Columnar stores compress 10-20x better for this data shape and scan 100x faster for aggregation queries. But relational is still needed for issue state management. |
| "What happens if the fingerprinting algorithm changes?" | Test understanding of state migration complexity | You cannot retroactively re-group all existing events — that would reassign events to different issues, breaking developer workflows. New algorithm applies only to new events. Maintain fingerprint versioning and auto-link "similar" issues across versions. Provide a preview tool before rollout. |
| "How do you handle errors from a language you don't have an SDK for?" | Test extensibility thinking | Provide a generic HTTP API that accepts structured JSON events. The server-side processing handles normalization. Any language that can make an HTTP POST can submit errors. Grouping may be less accurate without platform-specific frame normalization, but it still works via exception + message fallback. |
| "What if a customer sends 10 billion events in one day?" | Test spike handling and tenant isolation | Three-layer defense: (1) SDK-side rate limiting via `Retry-After` headers, (2) relay-side spike protection with dynamic sampling based on historical baseline, (3) hard quota enforcement. The 10B events never reach the processing pipeline — they're throttled at the relay. Other customers are unaffected due to per-project partitioning. |
| "How do you make sure source maps don't leak?" | Test security awareness | Source maps contain original source code — treat as highly sensitive. Never serve to browsers. Store with per-release encryption. Access requires authenticated admin permissions. Audit all uploads and downloads. Auto-expire after retention period. |
| "Why not use a single hash of the full stack trace?" | Test normalization understanding | Full stack traces include line numbers (change on any edit), framework version-specific frames (change on dependency update), and platform-specific variations (different browsers produce different frames). A naive hash would create a new issue every time any dependency or code line changes, even if the bug is identical. |

---

## Common Mistakes to Avoid

1. **Jumping to "just use a database" without considering event volume** — 500M events/day is ~6K events/sec. A single relational database cannot handle this write throughput, especially with the indexing needed for search. Always discuss the storage separation early.

2. **Ignoring the spike problem** — Error tracking traffic is not steady-state. Designing for average load means the system collapses during incidents — exactly when it's needed most. Spike protection must be a first-class concern, not an afterthought.

3. **Treating fingerprinting as a solved problem** — Many candidates say "hash the stack trace" and move on. The interviewer wants to hear about normalization, platform-specific handling, the fallback chain, and what happens when grouping is wrong (merge/split).

4. **Forgetting that source maps are a security concern** — Source maps contain original source code. Candidates who treat them as "just another file upload" miss the need for access control, encryption, and automatic expiration.

5. **Not discussing the DSN security model** — DSN keys are public by design (embedded in JavaScript). If you don't address how to prevent abuse of exposed keys, you've missed a critical security concern.

6. **Over-engineering day-1** — Start with the core pipeline (ingest → fingerprint → store → alert). Release tracking, breadcrumbs, and advanced analytics are important but should be discussed as extensions, not designed from scratch in a 45-minute interview.

7. **Not considering the developer experience** — This is a developer tool. If you design a technically perfect system but don't mention how the UI shows grouping reasons, how source map resolution improves stack traces, or how alert frequency caps prevent fatigue, you've missed the product perspective.

---

## Questions to Ask Interviewer

- What's the expected event volume? (Millions/day? Billions/day?)
- Multi-platform (web + mobile + backend) or single platform?
- Multi-tenant SaaS or single-tenant on-prem?
- How critical is real-time alerting vs. batch analytics?
- Are source maps / debug symbols in scope, or just raw stack traces?
- What's the retention requirement? (30 days? 1 year?)
- Do we need to handle multiple programming languages with different stack trace formats?
- Is release tracking and regression detection in scope?

---

## Follow-Up Deep-Dive Topics

If the interviewer has extra time or wants to go deeper:

1. **Hierarchical grouping:** How to show sub-groups within an issue when multiple code paths produce the same top-level fingerprint
2. **AI-assisted grouping:** Using embedding models to detect semantically similar errors that differ syntactically
3. **Session replay integration:** Linking error events to user session recordings for visual debugging
4. **Performance monitoring integration:** Correlating errors with slow transactions and infrastructure metrics
5. **On-premise deployment:** How the architecture changes when deployed in a customer's private cloud with limited resources
