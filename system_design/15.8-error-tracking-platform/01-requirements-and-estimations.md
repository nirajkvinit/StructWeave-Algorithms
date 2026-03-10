# Requirements & Estimations — Error Tracking Platform

## Functional Requirements

### Core Features

1. **Error Event Ingestion** — Accept error events from SDKs across all major platforms (JavaScript, Python, Java, Go, Ruby, iOS, Android, .NET) via a lightweight envelope protocol. Each event includes exception type, stack trace, breadcrumbs, tags, user context, device/OS info, and release version. Support batched and compressed payloads. Target <1% CPU overhead on client applications.

2. **Stack Trace Symbolication** — Automatically de-obfuscate and symbolicate stack traces using uploaded source maps (JavaScript), ProGuard mapping files (Android), dSYM files (iOS), and debug symbol files (native). Map minified function names and line numbers back to original source code. Cache resolved source maps per release for fast lookup.

3. **Error Fingerprinting & Issue Grouping** — Apply a multi-strategy fingerprinting algorithm to group similar error events into issues. Strategies include: stack trace-based grouping (normalize frames, hash function names and filenames), exception type + message grouping (with data stripping), custom client-side fingerprints, and server-side fingerprint rules. Support hierarchical grouping for sub-issue drill-down.

4. **Release Tracking & Regression Detection** — Associate every error event with a release version. Track first-seen and last-seen timestamps per issue per release. Automatically detect regressions: an issue marked as resolved that reappears in a new release triggers a regression alert. Provide release health dashboards showing crash-free session rates, new issues, and error volume deltas.

5. **Alerting & Notifications** — Rule-based and metric-based alert conditions: new issue detected, issue regression, error count exceeds threshold (absolute or percentage), spike in error rate. Deliver alerts via email, webhook, chat integrations, and push notification. Support per-project alert rules with configurable frequency caps.

6. **Issue Management & Triage** — Assign issues to team members, set priority levels, link to external issue trackers. Support bulk operations (merge, ignore, resolve). Track issue lifecycle: unresolved → ignored / resolved → regressed. Provide first-seen, last-seen, event count, affected user count per issue.

7. **Search & Analytics** — Full-text search across error messages, tags, and breadcrumbs. Faceted filtering by release, environment, browser, OS, custom tags. Time-series charts for error trends. Top-N queries (most frequent issues, most affected users). Support saved searches and dashboards.

8. **Context & Breadcrumbs** — Display the chronological trail of user actions (clicks, navigations, API calls), console logs, and system events leading up to the error. Show request/response data, environment variables (redacted), and custom context set by developers.

### Out of Scope

- Application performance monitoring (APM) / distributed tracing — complementary but separate system
- Log aggregation and full-text log search
- Uptime monitoring and synthetic checks
- Feature flag management
- User session replay (video recording)

---

## Non-Functional Requirements

### CAP Theorem Position

**AP (Availability + Partition Tolerance)** — Error ingestion must never be rejected due to internal consistency issues. SDKs retry on failure, so at-least-once delivery is acceptable. Eventual consistency for issue counts and aggregations is fine as long as no events are lost. Strong consistency is required only for issue state transitions (resolve, merge) and alert rule evaluation.

### Consistency Model

**Tiered Consistency:**
- **Event ingestion:** Eventual consistency — events may arrive out of order; deduplication handles retries
- **Issue metadata (counts, first-seen):** Eventual consistency — counters converge within seconds
- **Issue state (resolved, assigned):** Sequential consistency — state transitions must be ordered to prevent lost updates
- **Alert evaluation:** Read-your-writes — alert rules must see the latest event counts to avoid missed or duplicate alerts
- **Billing/quota:** Linearizable — quota decrements must be exactly-once to prevent over/under-billing

### Availability Target

| Component | Target | Rationale |
|-----------|--------|-----------|
| Ingestion API (Relay) | 99.95% | SDKs buffer locally and retry; brief outages acceptable |
| Event processing pipeline | 99.9% | Events are queued; processing can catch up after delays |
| Web UI / API | 99.9% | Standard web application availability |
| Alerting pipeline | 99.95% | Delayed alerts reduce the platform's core value |
| Source map storage | 99.9% | Symbolication can be deferred; events stored unsymbolicated |

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Event ingestion (SDK → accepted) | <50ms | <200ms | <500ms |
| Event processing (accepted → stored) | <2s | <5s | <15s |
| New issue alert (first event → notification) | <10s | <30s | <60s |
| Issue detail page load | <500ms | <1.5s | <3s |
| Search query (7-day window) | <1s | <3s | <5s |
| Trend aggregation (30-day) | <2s | <5s | <10s |
| Source map symbolication | <500ms | <2s | <5s |

### Durability Guarantees

- **Error events:** At-least-once delivery with deduplication; zero event loss after acceptance by the ingestion layer
- **Issue metadata:** Durable with write-ahead log; survives single-node failures
- **Source maps / debug symbols:** Replicated object storage; retained for the lifetime of the associated release (configurable, default 90 days)
- **Alert history:** Immutable audit log of all triggered alerts and delivery attempts
- **Billing events:** Write-ahead logged with exactly-once processing for accurate quota tracking

---

## Capacity Estimations (Back-of-Envelope)

**Reference deployment:** Mid-to-large SaaS platform — 10,000 organizations, 50,000 projects, serving applications with 500M monthly active users collectively.

### Event Volume

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Error events/day (normal) | ~500M | 50K projects × 10K events/day avg |
| Error events/day (spike) | ~5B | 10x during major outages/bad deploys |
| Events/sec (average) | ~5,800 | 500M / 86,400s |
| Events/sec (peak) | ~100K | Spike scenarios, correlated with deploy cycles |
| Avg event payload size | ~5 KB | Stack trace + breadcrumbs + context (compressed: ~1 KB) |
| Source map uploads/day | ~50K | Release deploys across all projects |
| Avg source map size | ~5 MB | Minified JS with mappings (compressed: ~1.5 MB) |

### Storage

| Tier | Retention | Size | Calculation |
|------|-----------|------|-------------|
| Hot (real-time queries) | 24 hours | ~500 GB | 500M events × 1 KB compressed |
| Warm (search & analytics) | 30 days | ~15 TB | 500 GB/day × 30 days |
| Cold (compliance/forensics) | 90 days | ~45 TB | 500 GB/day × 90 days |
| Source maps / debug symbols | 90 days per release | ~7.5 TB | 50K uploads/day × 1.5 MB × 90 days |
| Issue metadata (relational) | Indefinite | ~500 GB | 50M issues × 10 KB metadata |

### Compute

| Component | Resources | Calculation |
|-----------|-----------|-------------|
| Ingestion relay nodes | 30 nodes | 5,800 events/sec / 200 events/sec/node (with spike headroom) |
| Event processing workers | 50 nodes | Fingerprinting + symbolication + enrichment at ~120 events/sec/node |
| Symbolication workers | 20 nodes | Source map parsing is CPU-intensive; ~50 symbolications/sec/node |
| Analytics query cluster | 15 nodes | ClickHouse cluster for aggregation queries |
| Relational DB | 3 nodes | PostgreSQL primary + 2 read replicas for issue metadata |
| Cache cluster | 10 nodes | Redis for fingerprint cache, rate limits, quotas |

### Network Bandwidth

| Path | Bandwidth | Calculation |
|------|-----------|-------------|
| SDKs → Ingestion relay | ~8 Gbps peak | 100K events/sec × 1 KB compressed × 8 bits |
| Relay → Message queue | ~10 Gbps peak | Enriched envelopes slightly larger |
| Processing → Storage | ~5 Gbps | Processed events to columnar store |
| Source map uploads | ~1 Gbps peak | During deploy windows |

---

## SLOs / SLAs

| Metric | SLO | SLA | Measurement |
|--------|-----|-----|-------------|
| Event ingestion success rate | >99.9% | >99.5% | Accepted events / total events received |
| Event processing latency (p99) | <15s | <30s | Time from ingestion to searchable in UI |
| New issue alert latency | <30s | <60s | Time from first event to alert delivery |
| Issue grouping accuracy | >95% | >90% | Correct grouping as measured by merge/split rate |
| Search query latency (p99) | <5s | <10s | 7-day window queries |
| Platform availability | 99.95% | 99.9% | Uptime of ingestion + alerting pipeline |
| Source map symbolication rate | >99% | >95% | Events successfully symbolicated / events requiring symbolication |
| Crash-free session accuracy | >99.9% | >99.5% | Accuracy of reported crash-free rates |

---

## Constraints Unique to Error Tracking

### The Spike Problem

| Constraint | Impact |
|------------|--------|
| Correlated error bursts | A bad deploy or infrastructure failure causes all users to hit the same bug simultaneously; event volume can spike 100x in seconds |
| Quota exhaustion risk | Without spike protection, a single bad deploy can consume an organization's entire monthly event quota in minutes |
| Noisy neighbor isolation | One project's error storm must not affect other projects' ingestion or alerting latency |
| SDK-side rate limiting | Client SDKs must participate in back-pressure; the platform returns rate-limit headers that SDKs respect |

### The Grouping Dilemma

| Metric | Typical Value | Impact |
|--------|---------------|--------|
| Unique fingerprints per day | ~50K new issues | Across all projects; each needs first-occurrence alert evaluation |
| Merge rate (user-initiated) | ~2-5% of issues | Indicates under-grouping — fingerprints too specific |
| Split rate (user-initiated) | ~1-3% of issues | Indicates over-grouping — unrelated errors merged |
| False merge cost | High | Developer investigates wrong root cause; fix doesn't resolve the actual bug |
| False split cost | Medium | Same bug appears as multiple issues; duplicated triage effort |
