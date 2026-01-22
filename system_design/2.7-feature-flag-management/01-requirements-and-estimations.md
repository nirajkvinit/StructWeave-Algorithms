# Requirements & Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Requirements (P0)

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-1 | **Flag CRUD** | Create, read, update, delete, and archive feature flags |
| FR-2 | **Flag Types** | Support boolean, string (multivariate), number, and JSON flags |
| FR-3 | **Targeting Rules** | Define rules based on user attributes and context |
| FR-4 | **Percentage Rollouts** | Gradual rollout with sticky bucketing (same users stay in bucket) |
| FR-5 | **SDK Evaluation** | Client and server SDKs perform local flag evaluation |
| FR-6 | **Real-time Updates** | Propagate flag changes to all SDKs within 200ms |
| FR-7 | **Default Values** | Return safe defaults when flags unavailable |

### Important Requirements (P1)

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-8 | **Segments** | Reusable user segments for targeting across flags |
| FR-9 | **A/B Testing** | Run experiments with statistical significance analysis |
| FR-10 | **Audit Trail** | Complete history of all flag changes with attribution |
| FR-11 | **Environments** | Separate flag configurations per environment (dev/staging/prod) |
| FR-12 | **Projects** | Organize flags into logical projects |
| FR-13 | **Kill Switch** | Instantly disable any flag globally |

### Nice-to-Have Requirements (P2)

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-14 | **Scheduled Rollouts** | Time-based flag activation/deactivation |
| FR-15 | **Flag Dependencies** | Prerequisite flags that must be enabled |
| FR-16 | **Approval Workflows** | Require approval for production changes |
| FR-17 | **Webhooks** | Notify external systems of flag changes |
| FR-18 | **Multi-armed Bandits** | Automatic traffic optimization to winning variants |

---

## Flag Types

| Type | Description | Example Use Case |
|------|-------------|------------------|
| **Boolean** | Simple on/off toggle | Feature release, kill switch |
| **String** | Multiple string variations | Button text, experiment variants |
| **Number** | Numeric values | Timeout thresholds, limits |
| **JSON** | Complex structured data | UI configuration, algorithm parameters |

---

## Targeting Rule Types

| Rule Type | Description | Example |
|-----------|-------------|---------|
| **Individual Targeting** | Specific user IDs | `user_id IN [user_123, user_456]` |
| **Attribute Equals** | Exact attribute match | `country == "US"` |
| **Attribute Contains** | Substring match | `email CONTAINS "@company.com"` |
| **Attribute In List** | Value in set | `plan IN ["premium", "enterprise"]` |
| **Semver Comparison** | Version matching | `app_version >= "2.0.0"` |
| **Regex Match** | Pattern matching | `email MATCHES ".*@test\.com"` |
| **Date Comparison** | Time-based rules | `signup_date > "2024-01-01"` |
| **Segment Membership** | Reusable segments | `user IN segment("beta_users")` |
| **Percentage Rollout** | Random percentage | `10% of users` |

### Rule Evaluation Order

1. **Kill Switch** - If flag is off, return off variation immediately
2. **Individual Targets** - Check explicit user ID targeting first
3. **Targeting Rules** - Evaluate rules in priority order
4. **Default Rule** - Apply percentage rollout for remaining users

---

## Non-Functional Requirements

### Performance

| Metric | Target | Rationale |
|--------|--------|-----------|
| **SDK Evaluation Latency** | < 10ms p99 | Must not impact application performance |
| **Local Evaluation** | < 1ms p99 | After SDK initialization |
| **Update Propagation** | < 200ms global | Real-time feature control |
| **API Response Time** | < 100ms p99 | Admin operations |
| **SDK Initialization** | < 500ms | Application startup |

### Availability

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Control Plane** | 99.9% | Admin operations can tolerate brief outages |
| **Data Plane (Streaming)** | 99.99% | SDKs must receive updates |
| **SDK Evaluation** | 99.999% | Local evaluation with cached flags |

### Scalability

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Flags per Organization** | 10K+ | Large enterprises |
| **Evaluations per Second** | 1M+ globally | High-traffic applications |
| **Concurrent SDK Connections** | 100K+ per region | SSE streaming |
| **Targeting Rules per Flag** | 100+ | Complex targeting scenarios |

### Reliability

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Flag Configuration Durability** | 99.999999% | Never lose flag definitions |
| **Evaluation Consistency** | 100% | Same input must produce same output |
| **Offline Resilience** | Indefinite | SDKs work without network |

---

## Capacity Estimations

### Assumptions

| Parameter | Value | Notes |
|-----------|-------|-------|
| Organizations | 10,000 | Multi-tenant SaaS |
| Flags per Organization | 500 average | Range: 10 to 10,000 |
| Total Flags | 5,000,000 | 10K orgs × 500 flags |
| Evaluations per Flag per Day | 1,000,000 | High-traffic flags |
| Average Flag Payload Size | 2 KB | Including targeting rules |
| Context Size per Evaluation | 500 bytes | User attributes |
| SDK Connections per Org | 1,000 average | Server instances + clients |

### Traffic Calculations

**Flag Evaluations:**
```
Peak evaluations = 1M flags × 100 eval/sec (peak) = 100M evaluations/second
Average evaluations = 1M flags × 10 eval/sec = 10M evaluations/second

Note: Most evaluations are local (SDK cache), not API calls
```

**API Traffic (Flag Management):**
```
Flag updates = 5M flags × 10 updates/day / 86,400 sec = ~580 writes/second
Flag reads (SDK init) = 10K orgs × 1K SDKs × 1 init/hour / 3600 = ~2,800 reads/second
```

**Streaming Connections:**
```
Total connections = 10K orgs × 1K SDKs = 10M concurrent SSE connections
Per-region (5 regions) = 2M connections/region
```

### Storage Calculations

**Flag Configuration Storage:**
```
Flag storage = 5M flags × 2 KB = 10 GB
With 10 versions per flag = 100 GB
With indexes and metadata = ~200 GB total
```

**Audit Log Storage:**
```
Audit events = 5M flags × 10 changes/day × 1 KB = 50 GB/day
1-year retention = 50 GB × 365 = ~18 TB/year
```

**Evaluation Analytics (if tracked):**
```
Evaluation events = 10M/sec × 200 bytes = 2 GB/second = 170 TB/day
Sampled at 1% = 1.7 TB/day
```

### Bandwidth Calculations

**SDK Bootstrap:**
```
SDK init = 500 flags × 2 KB = 1 MB per SDK
Peak init = 2,800/sec × 1 MB = 2.8 GB/second
```

**Streaming Updates:**
```
Flag update broadcast = 2 KB payload × 10M connections = 20 GB per update
With regional fanout = 20 GB / 5 regions = 4 GB/region/update
Updates per minute (peak) = 10 updates × 4 GB = 40 GB/minute/region
```

---

## Service Level Objectives (SLOs)

| Category | SLI | SLO | Measurement |
|----------|-----|-----|-------------|
| **Availability** | Successful evaluations / Total evaluations | 99.999% | SDK-side metric |
| **Availability** | Successful API requests / Total requests | 99.9% | Server-side metric |
| **Latency** | SDK evaluation time | < 1ms p99 | Local evaluation |
| **Latency** | Update propagation time | < 200ms p99 | End-to-end |
| **Latency** | API response time | < 100ms p99 | Control plane |
| **Freshness** | Time since last sync | < 30 seconds | SDK polling fallback |
| **Correctness** | Consistent evaluation rate | 100% | Same input = same output |
| **Durability** | Flag configuration loss | 0% | All configurations persisted |

---

## Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| **Deterministic Evaluation** | Same context must always return same flag value | Requires consistent hashing, no randomness |
| **Offline Operation** | SDKs must function without network | Requires local caching, default values |
| **No PII in Rules** | Targeting rules must not contain user PII | Compliance requirement, use hashed IDs |
| **Backward Compatibility** | SDK changes must not break existing integrations | Versioned protocols, graceful degradation |
| **Multi-tenancy** | Strict isolation between organizations | Data partitioning, access control |

---

## Assumptions

| Assumption | Description |
|------------|-------------|
| **Stable User Identity** | Applications provide consistent user IDs for bucketing |
| **Context Availability** | SDKs receive necessary user attributes for targeting |
| **Network Eventually Available** | SDKs will eventually connect (even if briefly) |
| **Flag Cardinality** | Most orgs have < 1000 flags; outliers up to 10K |
| **Update Frequency** | Flags change infrequently (hours to days, not seconds) |

---

## Out of Scope

| Item | Reason |
|------|--------|
| **Experimentation UI Design** | Focus on backend systems |
| **Statistical Analysis Algorithms** | Reference existing methods (Bayesian, Frequentist) |
| **Specific Analytics Integrations** | Platform-dependent |
| **Mobile SDK Implementation Details** | Language-specific |
| **Visual Flag Editor** | UI/UX concern |
| **Customer Data Platform Integration** | Separate system |

---

## Interview Tips: Requirements Phase

### Questions to Ask

| Question | Why It Matters |
|----------|----------------|
| "What's the expected scale - users, flags, evaluations?" | Determines caching and scaling strategy |
| "Server-side SDKs, client-side, or both?" | Affects security model and evaluation approach |
| "How critical is real-time propagation?" | Push vs poll, streaming architecture |
| "Do we need A/B testing and experimentation?" | Adds statistical complexity |
| "What's the consistency requirement?" | Eventual vs strong for different components |
| "Multi-region deployment?" | Global architecture, data replication |

### Red Flags to Avoid

| Mistake | Why It's Wrong |
|---------|---------------|
| Assuming always-online | SDKs must work offline |
| Random bucketing per request | Users see feature flicker |
| Centralized evaluation only | Adds latency, single point of failure |
| Ignoring targeting complexity | Rule evaluation can be expensive |
| Underestimating connection scale | Millions of SSE connections |

---

**Next:** [High-Level Design →](./02-high-level-design.md)
