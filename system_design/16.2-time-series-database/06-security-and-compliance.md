# Security & Compliance --- Time-Series Database

## Authentication & Authorization

### Authentication Mechanisms

| Mechanism | Use Case | Implementation |
|---|---|---|
| **API Keys** | Agent-to-TSDB ingestion; programmatic query access | Per-tenant API keys with configurable permissions (write-only, read-only, admin); key rotation without downtime via dual-key support |
| **OAuth 2.0 / OIDC** | Dashboard users; SSO for enterprise tenants | OIDC provider integration; JWT tokens with tenant claims; refresh token rotation |
| **mTLS** | Service-to-service communication between TSDB components | Certificate-based authentication for ingesters, compactors, query engines; cert rotation via coordination service |
| **Service Account Tokens** | Kubernetes-native workloads; automated integrations | Short-lived tokens bound to service accounts; audience-restricted |

### Authorization Model

```
RBAC Model for Multi-Tenant TSDB:

Roles:
  - tenant_admin: Full access within tenant scope (create/delete metrics, manage retention, configure alerts)
  - writer: Write data points; cannot query or manage configuration
  - reader: Query data and list metrics; cannot write or modify
  - operator: Platform-wide operations (compaction, rebalancing); no tenant data access
  - super_admin: Platform administration; cross-tenant visibility for debugging

Permission Matrix:
  ┌─────────────────┬──────────┬────────┬────────┬──────────┬─────────────┐
  │ Operation       │ t_admin  │ writer │ reader │ operator │ super_admin │
  ├─────────────────┼──────────┼────────┼────────┼──────────┼─────────────┤
  │ Write data      │ ✓        │ ✓      │ ✗      │ ✗        │ ✓           │
  │ Read data       │ ✓        │ ✗      │ ✓      │ ✗        │ ✓           │
  │ Create metric   │ ✓        │ ✓      │ ✗      │ ✗        │ ✓           │
  │ Delete metric   │ ✓        │ ✗      │ ✗      │ ✗        │ ✓           │
  │ Manage retention│ ✓        │ ✗      │ ✗      │ ✗        │ ✓           │
  │ View cardinality│ ✓        │ ✗      │ ✓      │ ✓        │ ✓           │
  │ Manage compactor│ ✗        │ ✗      │ ✗      │ ✓        │ ✓           │
  │ Cross-tenant ops│ ✗        │ ✗      │ ✗      │ ✗        │ ✓           │
  └─────────────────┴──────────┴────────┴────────┴──────────┴─────────────┘
```

### Token Management

```
FUNCTION authenticate_request(request):
    // Extract tenant context from request
    tenant_id = request.header("X-Tenant-ID")
    auth_header = request.header("Authorization")

    IF auth_header.starts_with("Bearer "):
        token = auth_header.remove_prefix("Bearer ")

        // Try API key first (faster, no JWT parsing)
        api_key = lookup_api_key(token)
        IF api_key AND api_key.tenant_id == tenant_id:
            RETURN AuthContext(tenant_id, api_key.role, api_key.permissions)

        // Try JWT token
        jwt = verify_jwt(token, PUBLIC_KEY)
        IF jwt.valid AND jwt.claims.tenant_id == tenant_id:
            IF jwt.exp < NOW():
                RETURN REJECT("token expired")
            RETURN AuthContext(tenant_id, jwt.claims.role, jwt.claims.permissions)

    RETURN REJECT("unauthorized")
```

---

## Data Security

### Encryption at Rest

| Data Type | Encryption | Key Management |
|---|---|---|
| WAL files (local SSD) | Volume-level encryption (dm-crypt or equivalent) | Platform-managed keys; rotated annually |
| Block files (local disk) | Volume-level encryption | Same as WAL |
| Object storage blocks | Server-side encryption with customer-managed keys | Per-tenant encryption keys stored in key management service; key rotation triggers block re-encryption during next compaction |
| Index metadata | Encrypted as part of block files | Inherits block encryption |
| Tenant configuration | Encrypted in coordination service | Platform-managed keys |

### Encryption in Transit

| Path | Protocol | Certificate |
|---|---|---|
| Agent → Ingestion Gateway | TLS 1.3 | Gateway presents server certificate; optional mTLS for high-security agents |
| Gateway → Distributor | mTLS | Internal PKI; service mesh sidecar or direct mTLS |
| Ingester → Object Storage | TLS 1.3 | Cloud provider managed |
| Query Client → Query Frontend | TLS 1.3 | Gateway server certificate |
| Inter-component communication | mTLS | Internal PKI with automatic certificate rotation |

### PII Handling in Metric Data

Time-series metric data has a unique PII profile: the **values** themselves (CPU percentage, request count) are rarely PII, but **labels** can contain PII if developers embed user identifiers, email addresses, or IP addresses as label values.

```
FUNCTION sanitize_labels(labels, sanitization_rules):
    sanitized = {}
    FOR EACH (key, value) IN labels:
        rule = sanitization_rules.get(key)
        IF rule == "drop":
            CONTINUE  // Remove label entirely
        ELSE IF rule == "hash":
            sanitized[key] = sha256_truncate(value, 16)  // Pseudonymize
        ELSE IF rule == "allow":
            sanitized[key] = value  // Permit as-is
        ELSE:
            // Default: check against PII patterns
            IF matches_pii_pattern(value):  // email, IP, SSN patterns
                sanitized[key] = "[REDACTED]"
                log_warning("PII detected in label", key)
            ELSE:
                sanitized[key] = value
    RETURN sanitized

// Applied at ingestion gateway BEFORE data reaches storage
// Ensures PII never reaches WAL, head block, or object storage
```

---

## Threat Model

### Top Attack Vectors

| # | Attack Vector | Risk Level | Description |
|---|---|---|---|
| 1 | **Cardinality bomb** | Critical | Malicious or misconfigured agent sends metrics with high-cardinality labels (random UUIDs as label values), causing memory exhaustion and denial of service for all tenants |
| 2 | **Query-of-death** | High | Crafted query that matches millions of series or requests unbounded time range, consuming all query engine memory and CPU |
| 3 | **Tenant data exfiltration** | High | Exploiting authorization gaps to query another tenant's metric data; especially dangerous if label values leak infrastructure topology |
| 4 | **Ingestion flood DDoS** | High | Volumetric attack overwhelming ingestion pipeline with valid-format but high-volume data |
| 5 | **Label injection** | Medium | Injecting label values that exploit downstream systems (dashboard rendering, alerting rule evaluation, log aggregation) |

### Mitigations

| Attack | Mitigation |
|---|---|
| **Cardinality bomb** | Per-tenant series creation rate limit (e.g., 1000 new series/min); per-metric cardinality cap; real-time cardinality monitoring with automatic label dropping; circuit breaker on new series creation when memory exceeds threshold |
| **Query-of-death** | Per-query memory limit (e.g., 512 MB); per-query series limit (e.g., 500K); query timeout (30s default); query cost estimation before execution with rejection of estimated-expensive queries |
| **Tenant data exfiltration** | Tenant ID enforced at every layer (gateway, distributor, ingester, query engine); series-level tenant tagging; query engine injects tenant filter into every query; no cross-tenant label resolution in inverted index |
| **Ingestion flood DDoS** | Per-tenant ingestion rate limiting (token bucket); global ingestion rate cap with admission control; backpressure propagation to agents via 429 + Retry-After; IP-level rate limiting at load balancer |
| **Label injection** | Label value validation: max length (128 chars), allowed character set (alphanumeric + limited special chars), no control characters; sanitization at ingestion gateway |

### Rate Limiting & DDoS Protection

```
Three-Layer Defense:

Layer 1: Network (Load Balancer)
  - IP-based rate limiting: 10K requests/s per source IP
  - Connection limiting: 100 concurrent connections per source IP
  - TLS termination with invalid certificate rejection

Layer 2: Application (Ingestion Gateway)
  - Per-tenant token bucket: configurable samples/s limit
  - Per-tenant concurrent request limit
  - Payload size limit: 10 MB per batch
  - Series creation rate limit: separate from sample rate

Layer 3: Storage (Ingester)
  - Per-series sample rate limit: max 4 samples/s per series (15s interval minimum)
  - Memory-based admission control: reject new series when memory > 80%
  - WAL write rate limit: bound disk I/O consumption
```

---

## Compliance

### GDPR Considerations

| Requirement | Implementation |
|---|---|
| Right to erasure | Tombstone-based deletion: mark specific series for deletion; compaction physically removes data; object storage versions cleaned after retention period |
| Data minimization | Retention policies enforce automatic deletion; downsampling reduces data resolution over time; label sanitization prevents unnecessary PII collection |
| Data portability | Export API supports standard formats (Prometheus remote-read, CSV, Parquet); tenants can export their complete dataset |
| Consent & purpose | Metric collection purposes documented in data processing agreement; tenants control which metrics are collected via agent configuration |
| Cross-border transfers | Data residency controls: tenant data pinned to specific regions; object storage bucket per region; no cross-region replication without explicit consent |

### SOC 2 Considerations

| Control | Implementation |
|---|---|
| Access logging | All API calls logged with tenant, user, operation, timestamp; query text logged (with PII scrubbing) for audit trail |
| Change management | Tenant configuration changes version-controlled; compaction and retention policy changes logged with before/after |
| Availability monitoring | Platform SLOs tracked and reported; incident history maintained; uptime dashboard per tenant |
| Encryption | At-rest and in-transit encryption as detailed above; key management via dedicated service |

### Financial Data Compliance

For TSDBs storing financial time-series (tick data, trading metrics):

| Requirement | Implementation |
|---|---|
| Data immutability | Blocks on object storage are write-once (immutable after upload); WAL is append-only; no in-place modification of stored data points |
| Audit trail | Block metadata includes creation timestamp, source block IDs, and compaction history; complete chain of custody from ingestion to storage |
| Retention requirements | Configurable per-tenant retention that can exceed default (e.g., 7 years for financial data); retention policy changes logged and approved |
| Data integrity | Checksums on block files and WAL segments; checksum verification on read; corruption detected and reported |
