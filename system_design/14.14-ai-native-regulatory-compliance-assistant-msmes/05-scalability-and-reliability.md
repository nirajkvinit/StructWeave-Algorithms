# 14.14 AI-Native Regulatory & Compliance Assistant for MSMEs — Scalability & Reliability

## Scalability Architecture

### Dimension 1: Business Growth Scaling (1M → 10M Businesses)

The system must scale from 3M to 10M+ registered businesses without proportional cost increase. The key challenge is that obligation computation is per-business (each business has a unique obligation set), but the underlying regulatory knowledge graph is shared.

**Strategy: Shared Knowledge Graph + Per-Business Obligation Cache**

```
Scaling Model:
├── Regulatory Knowledge Graph: Scales with regulation count (O(R))
│   └── Shared across all businesses; grows at ~500 nodes/year
├── Obligation Mapping Cache: Scales with business count (O(B))
│   └── Pre-computed obligation sets per business profile archetype
│   └── 80% of MSMEs fall into ~200 distinct archetypes (same state, industry, size bracket)
│   └── Archetype-based caching reduces unique computations from 10M to ~200
├── Deadline Instances: Scales with B × obligations-per-business (O(B × D))
│   └── Partitioned by due_date for range queries
│   └── Partition pruning: queries only touch current + next month partition
└── Notifications: Scales with B × reminders-per-obligation (O(B × D × R))
    └── Pre-computed and queued; dispatch is the only real-time component
```

**Archetype-Based Obligation Caching:** Instead of computing obligations for each of 10M businesses individually, the system identifies business archetypes: a "Proprietorship, Textile Manufacturing, Maharashtra, 5-10 employees, Turnover ₹50L-1Cr" archetype has the same set of applicable obligations as every other business matching those parameters. When a new business registers with matching parameters, its obligation set is cloned from the archetype cache (O(1) lookup) rather than computed via graph traversal (O(V+E) traversal). The cache is invalidated when regulations change—but only for affected archetypes, not all of them.

### Dimension 2: Regulatory Content Growth

The regulatory knowledge graph grows with new regulations, amendments, and notifications. India adds ~2,000 regulatory changes/year across central and state governments. The graph must support efficient traversal even as it grows.

**Strategy: Time-Partitioned Graph Views**

```
Graph View Strategy:
├── Current View: Active regulations as of today
│   └── Pre-materialized subgraph excluding expired/superseded nodes
│   └── Used for all obligation mapping queries
│   └── Refreshed daily (batch) + incrementally on new regulations
├── Historical View: Full graph including all versions
│   └── Used for audit trail and "what was applicable on date X" queries
│   └── Stored in append-only format with temporal edges
└── Preview View: Upcoming regulations (published but not yet effective)
    └── Used for proactive alerts ("Starting April 2026, you'll need to file monthly")
    └── Separate from current view to avoid premature obligation creation
```

### Dimension 3: Document Vault Scaling

150 TB of compliance documents across 3M businesses, growing at ~50 TB/year. Documents have long retention requirements (7+ years for tax documents, 10+ years for legal documents).

**Strategy: Tiered Storage with Access-Pattern-Based Promotion**

```
Storage Tiers:
├── Hot Tier (current FY + 1 previous FY): ~40 TB
│   └── Fast object storage with SSD-backed metadata
│   └── Sub-second retrieval for active documents
├── Warm Tier (2-5 years old): ~80 TB
│   └── Standard object storage
│   └── 2-5 second retrieval; acceptable for audit preparation
├── Cold Tier (5+ years old): ~30 TB
│   └── Archive storage
│   └── Minutes to retrieve; rarely accessed except for legal disputes
└── Promotion Rules:
    └── Document accessed during audit → promote to hot for 90 days
    └── Regulation referenced in new amendment → promote related docs to warm
    └── Business actively preparing filing → promote related period docs to hot
```

---

## Reliability Architecture

### Critical Path Identification

```
Reliability Tiers:
├── Tier 1: Zero-Tolerance (99.99%)
│   ├── Notification delivery for penalty-bearing deadlines
│   └── Document vault data durability
│
├── Tier 2: High Reliability (99.95%)
│   ├── Dashboard and calendar access
│   ├── Filing assistance service
│   └── Document upload and classification
│
├── Tier 3: Standard Reliability (99.9%)
│   ├── Regulatory ingestion pipeline
│   ├── Audit readiness scoring
│   └── Analytics and reporting
│
└── Tier 4: Best Effort (99.5%)
    ├── Plain-language summarization (LLM-dependent)
    ├── Threshold monitoring (batch)
    └── Compliance health score computation
```

### Notification Delivery Reliability

The most critical reliability requirement: penalty-bearing deadline reminders must achieve 99.99% delivery.

```
Reliability Stack:
├── Generation Redundancy
│   ├── Primary: Cron-based generator computes next-day notifications at 2 AM
│   ├── Secondary: Watchdog process at 4 AM verifies all expected notifications are queued
│   └── Tertiary: Real-time generator catches any missed scheduled notifications
│
├── Queue Durability
│   ├── Notifications written to durable message queue with replication factor 3
│   ├── Consumer acknowledgment required; unacked messages re-delivered after 5 min
│   └── Dead letter queue for persistently failing notifications → human review
│
├── Multi-Channel Redundancy
│   ├── Critical notifications sent on 2+ channels simultaneously
│   ├── Delivery confirmation tracked per channel independently
│   └── If no channel confirms delivery within 30 min → escalation alert
│
└── Audit Trail
    ├── Every notification lifecycle event logged immutably
    ├── Enables post-incident analysis: "Was the GST reminder sent? When? To whom?"
    └── Legal defensibility: proves the platform fulfilled its obligation to remind
```

### Knowledge Graph Consistency

The regulatory knowledge graph is the single source of truth for obligation computation. Inconsistency (e.g., a partially applied amendment) could cause incorrect obligation mapping for millions of businesses.

**Strategy: Versioned Graph with Atomic Updates**

```
Update Protocol:
1. Parse and validate new regulation completely before touching the graph
2. Create new graph version (snapshot isolation)
3. Apply all changes (node updates, edge additions, supersedes marking) atomically
4. Run validation checks:
   ├── No orphaned nodes (every obligation has a parent regulation)
   ├── No circular dependencies in amendment chains
   ├── Applicability rules reference valid business fields
   └── Deadline rules produce valid dates for test profiles
5. If validation passes: promote new version to "current"
6. If validation fails: rollback, log error, alert for manual review
7. Obligation recomputation triggered only after version promotion
```

### Disaster Recovery

```
RPO/RTO Targets:
├── Document Vault: RPO = 0 (synchronous replication), RTO = 15 min
├── Business Database: RPO = 1 min (async replication), RTO = 10 min
├── Knowledge Graph: RPO = 1 hour (hourly snapshots), RTO = 30 min
├── Notification Queue: RPO = 0 (synchronous replication), RTO = 5 min
└── Search Index: RPO = N/A (reconstructible from source data), RTO = 2 hours
```

---

## Multi-Tenant Architecture

### Tenant Isolation Model

Every business is a tenant. The system handles 3M+ tenants with varying sizes (micro enterprises with 5 obligations vs. medium enterprises with 200+ obligations).

```
Isolation Boundaries:
├── Data Isolation
│   ├── Business data: Row-level isolation with business_id column in all tables
│   ├── Documents: Object storage path includes business_id prefix
│   ├── Notifications: Queued and delivered per business_id
│   └── Search index: Filtered by business_id at query time
│
├── Compute Isolation
│   ├── Shared compute pools for all tenants (no per-tenant instances)
│   ├── Per-tenant rate limiting on API calls (prevent noisy neighbor)
│   ├── Priority queuing: premium tier businesses get faster processing
│   └── Resource quotas: document storage limits per pricing tier
│
└── Feature Isolation
    ├── Free tier: Basic calendar, email reminders, 100 MB document storage
    ├── Standard tier: All channels, 5 GB storage, filing assistance
    └── Premium tier: Unlimited storage, audit packs, CA collaboration, priority support
```

### Database Partitioning Strategy

```
Partition Schemes:
├── Business Profiles: Hash partitioned by business_id
│   └── Even distribution; supports efficient per-business lookups
│
├── Obligation Instances: Range partitioned by due_date
│   └── Optimized for "upcoming deadlines" queries (next 30/60/90 days)
│   └── Old partitions archived after fiscal year close
│
├── Documents: Hash partitioned by business_id
│   └── Per-business document queries are the primary access pattern
│
├── Notifications: Range partitioned by scheduled_at
│   └── Dispatch process reads current time partition
│   └── Historical queries by business_id use secondary index
│
└── Knowledge Graph: No partitioning (entire graph fits in memory for single-instance graph DB)
    └── Replicated to read replicas for query load distribution
```

---

## Capacity Planning

### Auto-Scaling Rules

| Component | Scaling Trigger | Scale Action | Cooldown |
|---|---|---|---|
| API Gateway | CPU > 70% for 3 min | Add 2 instances | 5 min |
| Obligation Mapping Service | Queue depth > 1,000 | Add 1 instance per 500 queued | 3 min |
| Notification Dispatcher | Pending queue > 10,000 | Add dispatchers proportional to queue depth | 2 min |
| Document Classification (GPU) | Queue depth > 500 | Add 1 GPU instance | 10 min (GPU startup) |
| NLP Pipeline (GPU) | Batch size > 100 docs | Add 1 GPU instance | 10 min |
| Search Cluster | Query latency p95 > 3s | Add 1 search node | 15 min (index rebalance) |

### Load Testing Scenarios

| Scenario | Description | Target Behavior |
|---|---|---|
| **Month-end filing rush** | 500K businesses accessing filing assistance simultaneously in last 3 days of month | Filing service scales to handle 10× normal; dashboard remains responsive; notifications for next-month deadlines unaffected |
| **Major regulatory change** | Government changes GST rates affecting 2M businesses; 2M obligation recomputations + 2M notifications | Obligation recomputation completes within 2 hours; notifications sent within 6 hours; dashboard shows updated obligations within 2 hours |
| **Audit season** | 100K businesses generating audit packs simultaneously in September | Audit pack generation queue processes at 50/min; p95 generation time stays < 5 min; document vault handles 10× read load |
| **New business onboarding spike** | Marketing campaign drives 50K registrations in one day (10× normal) | Obligation mapping completes within 30 seconds per business; calendar generation doesn't block onboarding flow; welcome notifications sent within 1 hour |

---

## Failure Modes and Recovery

| Failure | Impact | Detection | Recovery |
|---|---|---|---|
| Knowledge graph database down | No new obligation computations; existing obligations unaffected | Health check every 10s | Failover to read replica; promote replica to primary; rebuild from snapshot if needed |
| Notification queue loss | Scheduled notifications missing | Queue depth monitoring + expected-vs-actual notification count | Regenerate from obligation instances; send delayed notifications with updated urgency |
| Government source unavailable | Missing regulatory updates | Crawler failure alerts; daily source availability report | Retry with exponential backoff; escalate to manual monitoring if down > 48 hours |
| NLP model degradation | Low-quality obligation extraction | Confidence score distribution monitoring; human review sample rate increase | Rollback to previous model version; flag recent extractions for re-review |
| Document vault corruption | Compliance documents unreadable | Integrity check via content hash verification (daily sample) | Restore from replicated copy; verify hash matches; alert if irrecoverable |
| SMS gateway outage | Notifications not delivered via SMS | Delivery receipt monitoring; success rate drop alert | Automatic failover to alternate SMS provider; escalate critical notifications to WhatsApp + email |
