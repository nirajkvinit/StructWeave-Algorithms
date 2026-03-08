# Scalability & Reliability

## Horizontal Scaling Strategy

### Stateless Service Tier

All core services (Envelope Service, Signer Workflow Service, Signature Capture Service, etc.) are stateless. State lives in the relational database, object storage, and distributed cache. This enables:

- **Auto-scaling**: Add/remove service instances based on request rate
- **Zero-downtime deployment**: Rolling updates with health checks
- **Regional deployment**: Services replicated across regions

### Scaling by Component

| Component | Scaling Strategy | Auto-Scale Trigger | Min / Max Instances |
|-----------|-----------------|-------------------|-------------------|
| API Gateway | Horizontal | Request rate > 10K req/s per instance | 4 / 50 |
| Envelope Service | Horizontal | CPU > 70% or request latency p99 > 500ms | 4 / 40 |
| Signer Workflow Service | Horizontal | Active signing sessions > 1K per instance | 4 / 30 |
| Signature Capture Service | Horizontal | Signing ops/s > 50 per instance | 4 / 30 |
| Document Processing Service | Horizontal (CPU-intensive) | CPU > 60% or queue depth > 100 | 8 / 100 |
| PDF Rendering Service | Horizontal (CPU-intensive) | CPU > 60% or render queue > 200 | 8 / 80 |
| Document Sealing Service | Horizontal | Sealing queue depth > 50 | 4 / 40 |
| Notification Service | Horizontal | Queue depth > 1K messages | 4 / 30 |
| Audit Service | Horizontal | Write throughput > 5K events/s per instance | 4 / 20 |
| Bulk Send Workers | Horizontal | Bulk queue depth > 500 messages | 2 / 50 |

---

## Document Storage Architecture

### Object Storage Tiers

Completed documents are immutable. Storage costs are managed via tiering:

| Tier | Access Pattern | Storage | When |
|------|---------------|---------|------|
| **Hot** | Frequent reads (signing in progress, recently completed) | Standard object storage | 0-30 days after creation |
| **Warm** | Occasional reads (download, audit queries) | Infrequent-access tier | 30 days - 1 year |
| **Cold** | Rare reads (legal hold, compliance queries) | Archive tier | 1 year - retention limit |
| **Glacier** | Near-zero reads (regulatory retention) | Deep archive | Beyond standard retention |

### Content-Addressed Storage

Sealed documents use content-addressed addressing:

```
storage_key = "sealed/" + SHA256(document_bytes)[:16] + "/" + envelope_id + "/" + document_id + ".pdf"
```

**Benefits**:
- Built-in deduplication (same content = same hash prefix)
- Tamper detection (if content changes, hash changes, key no longer valid)
- Efficient integrity verification (recompute hash, compare to key)

### Storage Organization

```
Object Storage Layout:
├── uploads/                    # Original uploaded documents
│   └── {org_id}/{envelope_id}/{document_id}/original.pdf
├── converted/                  # PDF conversions
│   └── {org_id}/{envelope_id}/{document_id}/converted.pdf
├── rendered/                   # Page images for signing UI (cached)
│   └── {envelope_id}/{document_id}/page-{n}.png
├── signatures/                 # Signature images
│   └── {envelope_id}/{signer_id}/{signature_id}.png
├── sealed/                     # Completed, immutable documents
│   └── {envelope_id}/
│       ├── {document_id}.pdf   # Sealed PDF with embedded signatures
│       ├── certificate.pdf     # Certificate of completion
│       └── audit_trail.pdf     # Audit trail PDF
└── bulk/                       # Bulk send data
    └── {batch_id}/recipients.json
```

---

## Audit Log Architecture

### Append-Only Writes

The audit log uses an append-only storage model:

- **Primary store**: Relational database with append-only constraints (no UPDATE or DELETE permissions on audit tables for application users)
- **Secondary store**: Immutable append-only log (write-once storage) for tamper resistance
- **Read replicas**: For audit queries without impacting write performance

### Write Path Optimization

```
Audit Event Write Path:
1. Application writes to primary relational DB (synchronous)
2. Change data capture (CDC) streams to:
   a. Immutable backup store (async, <5s lag)
   b. Search index for full-text audit queries (async, <30s lag)
   c. Analytics pipeline for compliance dashboards (async, <5m lag)
```

### Audit Log Partitioning

| Strategy | Implementation | Purpose |
|----------|---------------|---------|
| **Shard by envelope_id** | Hash-based sharding | Co-locate audit events with envelope data |
| **Time-based partitioning** | Monthly partitions within each shard | Efficient range queries for compliance |
| **Archive partitioning** | Move partitions older than 1 year to cold storage | Cost management |

---

## Workflow State Sharding

### Shard by envelope_id

All data for an envelope (envelope record, signers, fields, signatures, audit events) is co-located on the same database shard. This ensures:

- Atomic transactions for envelope state changes
- No cross-shard queries for the signing critical path
- Natural isolation---one envelope's load does not affect another

### Shard Distribution

```
Shard assignment: consistent_hash(envelope_id) → shard_id

Example with 16 shards:
  envelope_id "abc-123" → hash → shard 7
  All tables for this envelope: shard 7
  (envelopes, signers, fields, signatures, audit_events)
```

### Cross-Shard Queries

Some queries span shards:
- "All envelopes sent by user X" → scatter-gather across shards, merge by timestamp
- "All envelopes for organization Y" → scatter-gather, filtered by org_id
- Search index (separate from sharded DB) handles full-text and filtered queries efficiently

---

## Disaster Recovery

### Geo-Replication Strategy

| Data Type | Replication | RPO | RTO |
|-----------|------------|-----|-----|
| Relational DB (envelope state) | Synchronous replication to standby region | 0 (zero data loss) | < 5 minutes |
| Object storage (documents) | Cross-region replication | < 1 minute | < 10 minutes |
| Audit log | Synchronous replication + immutable backup | 0 (zero data loss) | < 5 minutes |
| HSM keys | Key backup to geographically separated HSM | N/A (keys are durable) | < 30 minutes (HSM initialization) |
| Cache | No replication (rebuilt from DB) | N/A | < 2 minutes (warm-up) |
| Search index | Async replication | < 5 minutes | < 15 minutes |

### Data Residency Compliance

Some jurisdictions require data to remain within geographic boundaries:

```
Data Residency Architecture:
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   US Region      │    │   EU Region      │    │   APAC Region    │
│                  │    │                  │    │                  │
│ DB Shard (US)    │    │ DB Shard (EU)    │    │ DB Shard (APAC)  │
│ Object Store (US)│    │ Object Store (EU)│    │ Object Store(APAC)│
│ HSM Cluster (US) │    │ HSM Cluster (EU) │    │ HSM Cluster(APAC)│
│ Audit Log (US)   │    │ Audit Log (EU)   │    │ Audit Log (APAC) │
│                  │    │                  │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
         │                       │                       │
         └───────────┬───────────┘───────────────────────┘
                     │
              Global Routing Layer
              (routes by org.data_region)
```

Organizations are assigned to a data region at creation time. All data (documents, audit logs, keys) stays within that region. The global routing layer directs API requests to the correct region.

**Cross-region envelopes**: When Signer A is in the US and Signer B is in the EU, the envelope data is stored in the sender's region. Signer B's requests are routed to the sender's region for data access, but the signing session UI is served from the nearest edge.

---

## Failure Modes and Recovery

### Failure Mode 1: HSM Unavailability

**Impact**: AES/QES signatures cannot be created. SES (click-to-sign) signatures are unaffected.

**Detection**: HSM health check fails; signing operation timeout > 500ms.

**Recovery**:
1. Circuit breaker opens for affected HSM cluster
2. Failover to secondary HSM cluster (geo-replicated keys)
3. If both clusters down: queue AES/QES signing requests with client notification ("Signature will be processed when service recovers")
4. SES signatures continue via software path
5. Alert on-call engineering

### Failure Mode 2: Signer Session Timeout

**Impact**: Signer loses progress on partially filled fields.

**Detection**: Session heartbeat stops; WebSocket disconnect.

**Recovery**:
1. Auto-save field values every 30 seconds to server
2. On reconnect, restore field values from last auto-save
3. Signing token remains valid until explicit expiry (not tied to session)
4. Signer can resume by clicking the original email link

### Failure Mode 3: PDF Generation Failure

**Impact**: Document cannot be converted, rendered, or sealed.

**Detection**: PDF processing worker returns error or timeout.

**Recovery**:
1. Retry with exponential backoff (3 attempts)
2. If conversion fails: return error to sender, suggest uploading a PDF directly
3. If rendering fails: fall back to server-side rendering (slower) or return page-by-page
4. If sealing fails: queue for retry; envelope remains in COMPLETED (not SEALED) state; signer notifications delayed

### Failure Mode 4: Database Primary Failure

**Impact**: No new envelopes can be created; active signing sessions may fail.

**Detection**: Database connection pool exhausted; health check failure.

**Recovery**:
1. Automatic failover to synchronous replica (< 30 seconds)
2. Connection pool switches to new primary
3. In-flight transactions may fail; clients retry
4. Active signing sessions: field values cached client-side; retry on submission
5. Zero data loss due to synchronous replication

### Failure Mode 5: Notification Service Failure

**Impact**: Signers not notified; signing ceremony delayed but not blocked.

**Detection**: Notification queue depth growing; email delivery rate drops.

**Recovery**:
1. Notifications are non-blocking (async via queue)
2. Messages buffered in queue; delivered when service recovers
3. Senders can manually resend notifications via API
4. Exponential backoff for email provider failures
5. Dead letter queue for messages that fail after max retries; manual investigation

---

## Caching Strategy

### Cache Layers

| Layer | What Is Cached | TTL | Invalidation |
|-------|---------------|-----|-------------|
| **CDN/Edge** | Rendered PDF page images (for signing UI) | 1 hour | On document modification (rare for active envelopes) |
| **Application Cache** | Envelope metadata, signer status, org settings | 60 seconds | Event-driven invalidation on state change |
| **Session Cache** | Active signing session data, field auto-save values | Session duration | On session end or token expiry |
| **Permission Cache** | Org membership, user roles | 5 minutes | On role change event |

### Cache Invalidation Events

```
On envelope state change → invalidate envelope metadata cache
On signature captured → invalidate signer status cache
On signer activated → invalidate envelope cache + trigger notification
On org settings change → invalidate org settings cache for all users
```

### What Is NOT Cached

- **Sealed documents**: Served directly from object storage (immutable, no invalidation needed)
- **Audit trail**: Always read from primary database (consistency requirement)
- **HSM operations**: Never cached (cryptographic operations must be fresh)
- **Signing tokens**: Always validated against database (security requirement)
