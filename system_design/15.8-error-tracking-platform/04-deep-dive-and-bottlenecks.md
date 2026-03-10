# Deep Dive & Bottlenecks — Error Tracking Platform

## Critical Component 1: The Fingerprinting Engine

### Why This Is Critical

The fingerprinting engine is the intellectual core of the platform. It determines whether two error events represent the same bug or different bugs. Get it wrong, and the platform's primary value proposition collapses:

- **Over-grouping** (merging unrelated bugs): Developers waste time investigating a single issue that actually contains multiple root causes. Fixing one doesn't fix the others, eroding trust.
- **Under-grouping** (splitting one bug into many issues): The issue list explodes with duplicates. A bug affecting 10,000 users appears as 50 separate issues with 200 users each, making severity assessment impossible.

The grouping accuracy directly determines developer productivity and platform adoption.

### How It Works Internally

The engine operates as a **priority chain of grouping strategies**:

1. **Client-side fingerprint** — The SDK developer explicitly sets `fingerprint: ["payment-gateway-timeout"]`. This takes absolute precedence. Used for known error patterns where the default algorithm fails.

2. **Server-side fingerprint rules** — Project-level rules authored in a declarative syntax: `type:NetworkError message:"timeout*" → fingerprint: ["network-timeout"]`. Evaluated in order; first match wins.

3. **Stack trace-based grouping** — The default and most common strategy. The algorithm:
   - Filters to in-app frames only (excludes library/framework code)
   - Normalizes each frame: strips line numbers (too volatile), lowercases filenames, strips data-like suffixes
   - Concatenates exception type + normalized frames into a string
   - Computes SHA-256 hash as the fingerprint
   - Platform-specific behaviors: JavaScript uses filename + context line (function names are unstable after minification); Python uses module + function + context line; native platforms use demangled function names only

4. **Exception-based grouping** — Fallback when no stack trace is available. Uses exception type + cleaned exception message (stripped of data-like content: timestamps, UUIDs, numbers, URLs).

5. **Message-based grouping** — Last resort for errors with no stack trace and no structured exception. Strips all data-like content from the message and hashes the skeleton. Highly prone to over-grouping.

**Hierarchical grouping** is an advanced feature that produces multiple hash levels. The primary hash groups events into an issue. Secondary hashes enable sub-grouping within the issue UI, showing developers distinct code paths that contribute to the same top-level issue. This addresses the limitation that a single hash can't capture partial similarity.

### Failure Modes

| Failure Mode | Cause | Impact | Mitigation |
|-------------|-------|--------|------------|
| **Hash collision** | Different stack traces produce same hash after normalization | Unrelated bugs merged into one issue | Include more frame information (context lines); allow manual split |
| **Hash instability** | Code refactoring changes function names/filenames | Same bug appears as new issue after deploy | Normalize aggressively (strip module paths, version suffixes); use context lines as stable identifiers |
| **Framework noise** | Framework frames dominate the stack trace | Bugs in different user code group together because they share framework call stack | Filter to in-app frames; maintain per-platform frame classification rules |
| **Message stripping over-aggression** | Data stripping removes meaningful parts of error message | Different errors like "table users not found" and "table orders not found" merge | Preserve domain-specific identifiers; allow custom stripping rules |
| **Minification without source maps** | JavaScript stack traces contain mangled names | All errors from the same minified file collapse into one issue | Strongly encourage source map upload; warn when symbolication fails |

### Handling Failures

- **Manual merge/split:** Developers can merge multiple issues into one or split an issue into multiple. These overrides persist and take precedence over algorithmic grouping for future events.
- **Grouping version migration:** When the algorithm improves, existing issues aren't retroactively re-grouped (would cause chaos). Instead, new grouping versions create new issues, and the platform auto-links "similar" issues across versions.
- **Feedback loop:** Track merge/split rates as quality signals. A spike in manual merges indicates the algorithm is under-grouping; a spike in splits indicates over-grouping. These metrics drive algorithm improvements.

---

## Critical Component 2: Source Map Symbolication Service

### Why This Is Critical

Modern web applications ship minified JavaScript where a stack trace looks like `a.js:1:34523` instead of `UserProfile.render (user-profile.js:142:8)`. Without symbolication, stack traces are unreadable and issues are ungroupable (all errors from the same minified file produce identical fingerprints). Symbolication is the gateway to useful error tracking for web and mobile applications.

### How It Works Internally

**Source map structure:** A source map is a JSON file containing a VLQ (Variable-Length Quantity) encoded mapping from generated positions (line:column in minified code) to original positions (file:line:column in source code), plus an array of original source filenames and a names array for identifier mapping.

**Symbolication pipeline:**

1. **Source map lookup:** Given the error's release version and the minified filename from the stack frame, query the source map index: `(release="frontend@2.4.1", filename="~/static/js/app.min.js")` → source map storage path.

2. **Source map parsing:** Parse the VLQ-encoded `mappings` field into a position lookup table. This is CPU-intensive for large source maps (10-50 MB decoded). The parsed result is cached in-memory using an LRU cache keyed by `(release, filename)`.

3. **Position resolution:** For each stack frame, binary search the parsed mappings to find the original file, line, column, and function name corresponding to the generated position.

4. **Context extraction:** Retrieve the original source file content (embedded in the source map or referenced externally) and extract the surrounding code lines for display in the UI.

5. **Frame enrichment:** Replace the minified frame with the resolved original frame. Mark the frame with a `symbolicated: true` flag.

### Failure Modes

| Failure Mode | Cause | Impact | Mitigation |
|-------------|-------|--------|------------|
| **Missing source map** | Not uploaded for this release; upload delayed by CI/CD pipeline | Events stored with minified frames; grouping degrades | Queue events for retro-symbolication; alert on missing source maps |
| **Mismatched source map** | Source map doesn't match the deployed code (version mismatch) | Wrong file/line resolution; misleading stack traces | Validate source map checksum against deployed bundle; require release-locked uploads |
| **Oversized source maps** | Large monorepo bundles produce 50+ MB source maps | Parsing timeout; memory pressure on symbolicator nodes | Stream-parse the VLQ mappings; set size limits; encourage code splitting |
| **Stale cache** | Cached source map from old release served for new release | Incorrect symbolication | Key cache by `(release, filename)` — different releases never collide |
| **Source map without sources** | `sourcesContent` field empty; original files not embedded | Position resolved but no context lines displayed | Accept gracefully; show resolved position without context |

### Handling Failures

- **Retro-symbolication queue:** When a source map upload arrives, query for unsymbolicated events matching that release and re-process them. This handles the upload-lag scenario.
- **Symbolication timeout:** If parsing exceeds 5 seconds for a single frame, store the raw frame and flag the event as "partially symbolicated." Retry during off-peak hours.
- **Source map size budget:** Enforce a per-release source map size limit (default: 500 MB total). Warn during upload if exceeded.

---

## Critical Component 3: Spike Protection & Quota Management

### Why This Is Critical

Error events are inherently bursty. A single bad deploy can increase error volume by 100x in seconds. Without spike protection:
- One project's error storm overwhelms the processing pipeline, increasing latency for all projects
- A customer's monthly event quota is consumed in minutes by a single incident
- The columnar store receives an overwhelming burst that degrades query performance for all users

### How It Works Internally

**Three-layer protection:**

1. **SDK-side rate limiting:** The relay returns `429` with `X-Sentry-Rate-Limits` headers specifying per-category (error, transaction, attachment) cooldown periods. The SDK respects these and drops/samples events locally. This is the first line of defense and reduces network bandwidth during spikes.

2. **Relay-side spike detection:** The relay tracks per-project event rates in a sliding window (1-minute buckets). A spike is detected when the current rate exceeds the project's spike threshold, which is computed from a 7-day weighted historical baseline with hourly seasonality. When a spike is detected:
   - Dynamic sampling is applied: events are accepted probabilistically based on `hash(event_id) % 100 < sample_rate`
   - Consistent hashing on event_id ensures the same event is always accepted or rejected (prevents partial event sets)
   - The sample rate is logged with each accepted event so analytics can extrapolate true volumes

3. **Quota enforcement:** Each organization has an event quota (monthly or daily). Quota counters are tracked in the cache cluster (Redis) with atomic increments. When the quota is 80% consumed, a warning notification is sent. When exhausted, all events for the organization are rejected with `429` until the next billing period.

### Failure Modes

| Failure Mode | Cause | Impact | Mitigation |
|-------------|-------|--------|------------|
| **Baseline cold start** | New project has no historical data | Spike threshold defaults to a low value; normal traffic flagged as spike | Use organization-level baseline as initial estimate; ramp up over first week |
| **Seasonal false positive** | Legitimate traffic pattern change (product launch, marketing campaign) | Real events unnecessarily throttled | Allow manual threshold override; detect sustained rate increases (>1 hour) and adjust baseline |
| **Quota race condition** | Distributed relay nodes independently decrement quota | Slight over-acceptance (~1-2%) due to stale quota reads | Acceptable imprecision; reconcile with hourly batch accounting; hard-limit at 110% |
| **Noisy neighbor in bus** | High-volume project floods message bus partition | Other projects' events delayed | Separate partitions per project tier; priority queues for premium customers |

---

## Concurrency & Race Conditions

### Race Condition 1: Concurrent Fingerprint Upsert

**Scenario:** Two events with the same fingerprint arrive simultaneously. Both workers query the database, find no existing issue, and both attempt to create a new issue.

**Solution:** Use a database UPSERT with a unique constraint on `(project_id, fingerprint_hash)`:

```
INSERT INTO issues (project_id, fingerprint_hash, title, first_seen, ...)
VALUES ($1, $2, $3, $4, ...)
ON CONFLICT (project_id, fingerprint_hash)
DO UPDATE SET
    event_count = issues.event_count + 1,
    last_seen = GREATEST(issues.last_seen, EXCLUDED.first_seen)
RETURNING issue_id, (xmax = 0) AS is_new
```

The `xmax = 0` trick distinguishes between an INSERT (new issue) and an UPDATE (existing issue), which determines whether to trigger a "new issue" alert.

### Race Condition 2: Issue State Transition Conflicts

**Scenario:** Developer A resolves an issue while Developer B assigns it, simultaneously.

**Solution:** Last-write-wins is acceptable for this use case. The `updated_at` timestamp ensures the UI shows the most recent state. For critical transitions (resolve → regress), the regression detector uses compare-and-swap: only transition from RESOLVED to REGRESSED if the current status is still RESOLVED.

### Race Condition 3: Quota Decrement Under Spike

**Scenario:** 50 relay nodes simultaneously decrement the project quota counter in Redis.

**Solution:** Use Redis `INCRBY` (atomic increment) for quota tracking. Accept ~1-2% overage from read-check-write races on the "quota exhausted?" check. Reconcile with a periodic batch job. Hard-reject when the counter exceeds 110% of quota.

---

## Bottleneck Analysis

### Bottleneck 1: Source Map Parsing Latency

**Problem:** Large source maps (10-50 MB) take 1-5 seconds to parse. During a deploy, hundreds of events from the new release arrive before the source map cache is warm, causing a parsing thundering herd.

**Mitigation:**
- **Pre-warm cache on upload:** When a source map is uploaded, immediately parse and cache it. This means the first event after deploy hits a warm cache.
- **Parsing queue with deduplication:** If multiple events need the same source map parsed simultaneously, only one worker parses it; others wait on a shared future/promise.
- **Stream parsing:** Parse VLQ mappings incrementally instead of loading the entire source map into memory.
- **Bounded concurrency:** Limit concurrent source map parsing to prevent memory exhaustion (each parsed map can consume 200-500 MB in memory).

### Bottleneck 2: Fingerprint Cache Invalidation During Algorithm Upgrades

**Problem:** When the fingerprinting algorithm is updated, the cached fingerprint for an event's attributes may produce a different hash. This creates a period where the same bug produces two different fingerprints (old algorithm and new algorithm), splitting a single issue into two.

**Mitigation:**
- **Versioned fingerprints:** Store the algorithm version alongside the fingerprint. During migration, compute both old and new fingerprints and link them.
- **Gradual rollout:** Roll out the new algorithm project-by-project. Provide a preview tool that shows how grouping would change before committing.
- **Never re-group retroactively:** New algorithm applies only to new events. Existing issue→fingerprint mappings are preserved. Auto-link "similar" issues across algorithm versions.

### Bottleneck 3: Alert Evaluation During Spikes

**Problem:** During an error spike, thousands of new events arrive per second. The alert engine must evaluate rules for each event without itself becoming a bottleneck. If alert evaluation falls behind, developers receive notifications minutes after a problem starts.

**Mitigation:**
- **Pre-filter in the pipeline:** Tag events with `is_new_issue`, `is_regression`, and `exceeds_rate_threshold` during processing. The alert engine only evaluates rules for tagged events, ignoring the vast majority.
- **Rate-limit alert delivery:** No more than 1 alert per rule per frequency window (configurable, default: 5 minutes). This prevents alert flooding during spikes.
- **Separate alert queue:** Alert evaluation runs on a dedicated message bus topic with its own consumer group, isolated from the main event processing path.
