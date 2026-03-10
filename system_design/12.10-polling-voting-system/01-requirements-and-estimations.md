# Requirements & Estimations — Polling/Voting System

## 1. Functional Requirements

### Core Features

| # | Requirement | Description |
|---|---|---|
| FR-1 | **Create Poll** | Authenticated users create polls with a question, 2-20 options, optional description, optional image per option, and configurable settings (duration, visibility, voter eligibility) |
| FR-2 | **Cast Vote** | Authenticated or anonymous users cast a vote on an active poll; system enforces one-vote-per-user per poll (for identified voting) or one-vote-per-session/IP (for anonymous voting) |
| FR-3 | **View Results** | Any user can view current vote tallies and percentages for a poll; results can be hidden until poll closes (blind poll) or shown in real time |
| FR-4 | **Real-Time Updates** | Connected clients receive result updates within 500ms of aggregation; live result animations in the client |
| FR-5 | **Poll Lifecycle** | Polls transition through states: draft → active → closed → archived; automatic closure at configured end time; manual early closure by creator |
| FR-6 | **Multiple Poll Types** | Support single-choice, multi-choice (select up to K), ranked-choice (order preferences), and yes/no binary polls |
| FR-7 | **Change/Retract Vote** | Optionally allow voters to change their vote before the poll closes; configurable per poll by the creator |
| FR-8 | **Poll Discovery** | List trending polls, recent polls, polls by category/tag; search polls by keyword |
| FR-9 | **Embed & Share** | Generate embeddable widgets and shareable links for polls; support embedding in third-party websites |
| FR-10 | **Poll Analytics** | Poll creators see detailed analytics: vote velocity over time, demographic breakdown (if available), peak voting periods |

### Advanced Features

| # | Requirement | Description |
|---|---|---|
| FR-11 | **Weighted Voting** | Support weighted votes where different voter classes have different vote weights (e.g., verified accounts count more) |
| FR-12 | **Delegation** | Allow voters to delegate their vote to another user (liquid democracy style) |
| FR-13 | **Poll Templates** | Reusable templates for common poll formats (yes/no, satisfaction scale, A/B comparison) |
| FR-14 | **Scheduled Polls** | Create polls that activate at a future time; useful for live events |
| FR-15 | **Voter Verification** | Configurable voter eligibility: open, email-verified, organization-member, invitation-only |

### Out of Scope

- Full election-grade voting with end-to-end verifiability (E2E-V)
- Blockchain-based immutable vote ledgers
- Government election compliance (VVPAT, accessibility mandates)
- Payment processing for premium poll features
- Full social networking features (profiles, followers, feeds)

---

## 2. Non-Functional Requirements

### CAP Theorem Positioning

**Choice: AP with tunable consistency**

| Scenario | Consistency | Availability | Rationale |
|---|---|---|---|
| Vote acceptance | Strong (per-user dedup) | High (99.99%) | Must prevent double-voting; use distributed locks scoped to user+poll |
| Result tallies (active poll) | Eventual (< 1s staleness) | Very High (99.99%) | Sub-second staleness acceptable; served from cache |
| Result tallies (closed poll) | Strong (exact count) | High (99.9%) | Final results must be authoritative; reconciliation phase at close |
| Poll metadata (CRUD) | Strong | High (99.9%) | Poll creation/update requires ACID guarantees |

### Performance Requirements

| Requirement | Target | Rationale |
|---|---|---|
| **Vote acceptance latency** | P50 < 15ms, P99 < 50ms | Users expect instant feedback when tapping "Vote" |
| **Result retrieval latency** | P50 < 10ms, P99 < 50ms | Results page must load instantly |
| **Result freshness** | < 500ms from vote to visible update | Real-time feel for live polling scenarios |
| **Poll creation latency** | P99 < 200ms | Standard CRUD operation |
| **Search/discovery latency** | P99 < 300ms | Acceptable for browsing/search operations |
| **WebSocket push latency** | P99 < 200ms | Time from aggregation to client receipt |

### Availability & Reliability

| Requirement | Target | Rationale |
|---|---|---|
| **Vote ingestion availability** | 99.99% | Losing votes during a live event destroys trust |
| **Result serving availability** | 99.9% | Temporary result unavailability is tolerable |
| **Vote durability** | 100% (zero vote loss) | Every accepted vote must be counted in the final tally |
| **Dedup correctness** | 100% | No user should be able to vote twice on the same poll |
| **Graceful degradation** | Queue-based buffering | Under overload: accept votes, delay result updates |

### Scalability Requirements

| Requirement | Target | Rationale |
|---|---|---|
| **Horizontal write scaling** | Linear with node count | Adding nodes proportionally increases vote throughput |
| **Burst absorption** | 10x sustained rate for 5 minutes | Viral events cause sudden spikes |
| **Auto-scale response time** | < 60 seconds | New ingestion nodes must be ready within a minute |
| **Multi-region support** | Active-active in 3+ regions | Global user base; minimize vote latency |

---

## 3. Capacity Estimations

### Traffic Profile

| Metric | Value | Derivation |
|---|---|---|
| Registered users | 100,000,000 | Platform assumption |
| Daily active users (DAU) | 20,000,000 | 20% of registered users |
| Votes per user per day | 3 | Average across casual and active users |
| **Daily votes** | **60,000,000** | 20M × 3 |
| Active polls at any moment | 50,000 | Mix of personal, corporate, and viral polls |
| Average poll duration | 24 hours | Weighted average across poll types |
| **Average votes/second** | **694** | 60M / 86,400 |
| Peak hour factor | 3× | Evening hours in major time zones |
| **Peak votes/second** | **2,083** | 694 × 3 |
| Viral spike factor | 50× | Single viral poll (celebrity, breaking news) |
| **Single-poll spike votes/sec** | **100,000** | Viral poll with global attention |

### The Viral Poll Scenario (Capacity Ceiling)

This is the scenario that drives architecture: a celebrity with 50M followers posts a controversial 2-option poll.

| Metric | Value | Derivation |
|---|---|---|
| Follower reach | 50,000,000 | Celebrity follower count |
| Engagement rate | 5% | Typical for viral content |
| Total votes expected | 2,500,000 | 50M × 5% |
| Voting window (80% of votes) | 10 minutes | Most votes arrive shortly after posting |
| **Peak vote rate** | **~100,000 votes/sec** | 2M votes in ~20 seconds of peak surge |
| Options in poll | 2 | Binary choice (most common viral format) |
| Writes per option per second | 50,000 | 100K / 2 options |
| Single-row update throughput | ~1,000/sec | Typical database row lock throughput |
| **Required shards per option** | **50-100** | 50K / 1K = 50 minimum |

### Storage Requirements

| Metric | Value | Derivation |
|---|---|---|
| Vote record size | 64 bytes | poll_id (8B) + user_id (8B) + option_id (4B) + timestamp (8B) + metadata (36B) |
| **Daily vote storage** | **3.6 GB** | 60M × 64 bytes |
| **Monthly vote storage** | **108 GB** | 3.6 GB × 30 |
| **Annual vote storage** | **1.3 TB** | 108 GB × 12 |
| Poll metadata size | 2 KB | Question, options, settings, creator info |
| Daily new polls | 100,000 | Estimated |
| **Daily poll metadata** | **195 MB** | 100K × 2 KB |
| Dedup set entry size | 16 bytes | user_id (8B) + poll_id hash (8B) |
| Active dedup set size (per hot poll) | 160 MB | 10M voters × 16B |
| **Total active dedup memory** | **~50 GB** | Across all active polls |

### Compute Requirements

| Metric | Value | Derivation |
|---|---|---|
| Vote ingestion CPU per vote | 0.1ms | Validation + dedup check + queue publish |
| **Peak ingestion CPU** | **10 CPU-seconds/sec** | 100K × 0.1ms |
| **Ingestion nodes (peak)** | **15-20** | 10 CPU-sec / 0.7 utilization target |
| Aggregation CPU per shard merge | 0.05ms | Sum shards → update materialized view |
| Total shards (hot polls) | 10,000 | 200 hot polls × 50 shards average |
| **Aggregation CPU** | **2 CPU-seconds/sec** | 10K shards / 5 merges/sec × 0.05ms |

### Network Requirements

| Metric | Value | Derivation |
|---|---|---|
| Vote request size | 256 bytes | JSON with poll_id, option_id, auth token |
| Vote response size | 128 bytes | Confirmation + updated result snapshot |
| **Peak inbound bandwidth** | **24.4 MB/s** | 100K × 256B |
| **Peak outbound bandwidth** | **12.2 MB/s** | 100K × 128B |
| Result push payload | 512 bytes | Full result snapshot for a poll |
| Concurrent WebSocket connections | 500,000 | Active result watchers |
| Result push frequency | 2/sec | Every 500ms |
| **WebSocket outbound bandwidth** | **488 MB/s** | 500K × 512B × 2/sec |

---

## 4. Service Level Objectives (SLOs)

### Tiered SLOs

| SLO | Premium (Live Events) | Standard | Free Tier |
|---|---|---|---|
| **Vote acceptance** | 99.99% | 99.95% | 99.9% |
| **Vote acceptance latency** | P99 < 30ms | P99 < 50ms | P99 < 100ms |
| **Result freshness** | < 200ms | < 500ms | < 2s |
| **Result retrieval** | 99.99% | 99.9% | 99.5% |
| **Vote durability** | 100% | 100% | 99.99% |
| **Dedup accuracy** | 100% | 100% | 99.99% |
| **WebSocket availability** | 99.9% | 99.5% | Best effort |

### SLO Error Budget

| SLO | Monthly Budget | Allowed Failures (60M daily) |
|---|---|---|
| 99.99% vote acceptance | 4.3 min downtime | 180,000 rejected votes |
| 99.95% vote acceptance | 21.6 min downtime | 900,000 rejected votes |
| 100% vote durability | 0 lost votes | 0 lost votes |
| 100% dedup accuracy | 0 double-votes | 0 double-votes |
| < 500ms result freshness | 5% time exceeding | 1.5 hours/day stale results acceptable |

### Burn Rate Alerts

| Alert Level | Condition | Action |
|---|---|---|
| **Page (Critical)** | 14.4× burn rate over 1 hour (vote loss or double-vote detected) | Immediate incident response; halt affected poll if integrity compromised |
| **Page (High)** | 6× burn rate over 6 hours (vote latency SLO breached) | Escalate to on-call; activate additional ingestion capacity |
| **Ticket (Medium)** | 3× burn rate over 1 day (result freshness degraded) | Investigate aggregation pipeline lag |
| **Log (Low)** | 1× burn rate sustained (approaching capacity limits) | Plan scaling; review upcoming high-profile poll schedule |
