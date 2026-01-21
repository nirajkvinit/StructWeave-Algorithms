# Security and Compliance

[← Back to Index](./00-index.md)

---

## Event Immutability and Audit Trails

### Natural Audit Capabilities

Event sourcing provides built-in audit capabilities that traditional systems require additional work to achieve.

```
┌────────────────────────────────────────────────────────────────────┐
│ AUDIT TRAIL CAPABILITIES                                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ What Event Sourcing Provides:                                      │
│                                                                     │
│ 1. Complete History                                                │
│    Every state change is recorded as an event                      │
│    No data is ever "lost" due to updates                          │
│    Can reconstruct state at any point in time                      │
│                                                                     │
│ 2. Tamper Evidence                                                  │
│    Events are append-only                                          │
│    Modifications would require changing historical records         │
│    Easy to detect if done (checksums, signatures)                  │
│                                                                     │
│ 3. Attribution                                                      │
│    Events include metadata: who, when, why                        │
│    Correlation IDs link related actions                            │
│    Causation IDs show event relationships                          │
│                                                                     │
│ 4. Temporal Queries                                                 │
│    "What was the account balance on Dec 31?"                      │
│    "Who modified this record last month?"                         │
│    "What changes happened during the incident?"                    │
│                                                                     │
│ Example Audit Query:                                                │
│                                                                     │
│   SELECT * FROM events                                             │
│   WHERE stream_id LIKE 'account-%'                                 │
│     AND metadata->>'user_id' = 'user-123'                         │
│     AND timestamp BETWEEN '2024-01-01' AND '2024-01-31'           │
│   ORDER BY global_position                                         │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Event Metadata for Audit

```
┌────────────────────────────────────────────────────────────────────┐
│ AUDIT METADATA SCHEMA                                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Standard Audit Fields in Event Metadata:                           │
│                                                                     │
│ {                                                                   │
│   // Who                                                           │
│   "user_id": "user-123",                                          │
│   "user_email": "john@example.com",                               │
│   "user_roles": ["admin", "support"],                             │
│   "impersonated_by": null,  // If admin impersonating              │
│                                                                     │
│   // When                                                          │
│   "timestamp": "2024-01-15T10:30:00Z",                            │
│   "server_timestamp": "2024-01-15T10:30:00.123Z",                 │
│                                                                     │
│   // Where                                                         │
│   "source_ip": "192.168.1.100",                                   │
│   "user_agent": "Mozilla/5.0...",                                 │
│   "service_name": "order-service",                                │
│   "service_version": "1.2.3",                                     │
│   "host": "order-service-pod-abc123",                             │
│                                                                     │
│   // Context                                                       │
│   "correlation_id": "req-789",                                    │
│   "causation_id": "evt-456",  // Triggering event                 │
│   "session_id": "sess-xyz",                                       │
│   "request_id": "req-abc",                                        │
│                                                                     │
│   // Business Context                                              │
│   "reason": "Customer requested change",                          │
│   "ticket_id": "SUPPORT-123"                                      │
│ }                                                                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## GDPR and Right to Erasure

### The GDPR Challenge

Event sourcing's immutability conflicts with GDPR's "right to erasure" (Article 17). This is one of the most significant challenges in event-sourced systems.

```
┌────────────────────────────────────────────────────────────────────┐
│ GDPR CHALLENGE                                                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ GDPR Requirements:                                                  │
│ • Users can request deletion of personal data                      │
│ • Must delete within 30 days                                       │
│ • Must delete from all systems, including backups                  │
│                                                                     │
│ Event Sourcing Reality:                                            │
│ • Events are immutable by design                                   │
│ • Personal data is embedded in events                              │
│ • Deleting events breaks aggregate consistency                     │
│ • Replaying events may re-create deleted data                      │
│                                                                     │
│ Conflict: Immutability vs Right to Erasure                         │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### GDPR Compliance Strategies

```
┌────────────────────────────────────────────────────────────────────┐
│ GDPR COMPLIANCE STRATEGIES                                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Strategy 1: Crypto-Shredding                                       │
│ ───────────────────────────                                        │
│                                                                     │
│ How it works:                                                       │
│ 1. Each user has a unique encryption key                           │
│ 2. Personal data in events encrypted with user's key               │
│ 3. To "delete": destroy the encryption key                         │
│ 4. Data remains but is unreadable                                  │
│                                                                     │
│ Event Structure:                                                    │
│ {                                                                   │
│   "event_type": "UserProfileUpdated",                              │
│   "user_id": "user-123",  // Not encrypted (needed for routing)   │
│   "encrypted_data": "base64...",  // Encrypted with user key      │
│   "key_id": "key-user-123-v1"                                     │
│ }                                                                   │
│                                                                     │
│ Deletion Process:                                                   │
│ 1. Receive deletion request                                        │
│ 2. Delete key "key-user-123-v1" from key management service       │
│ 3. Events still exist but encrypted_data is unreadable            │
│ 4. Projections rebuilt will skip/anonymize this user               │
│                                                                     │
│ Pros: Events remain, integrity preserved                           │
│ Cons: Key management complexity, replay challenges                 │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│ Strategy 2: Personal Data Externalization                          │
│ ─────────────────────────────────────────                          │
│                                                                     │
│ Store personal data separately, events reference by ID             │
│                                                                     │
│ Event (no PII):                                                    │
│ {                                                                   │
│   "event_type": "OrderCreated",                                    │
│   "order_id": "order-123",                                         │
│   "customer_ref": "cust-ref-456"  // Reference, not PII           │
│ }                                                                   │
│                                                                     │
│ Personal Data Store (deletable):                                   │
│ {                                                                   │
│   "ref": "cust-ref-456",                                          │
│   "name": "John Doe",                                              │
│   "email": "john@example.com",                                     │
│   "address": "123 Main St"                                        │
│ }                                                                   │
│                                                                     │
│ Deletion Process:                                                   │
│ 1. Delete record from Personal Data Store                          │
│ 2. Events remain with reference to deleted user                    │
│ 3. Reads show "[Deleted User]" or similar                         │
│                                                                     │
│ Pros: Clean separation, simple deletion                            │
│ Cons: Extra lookups, data model changes needed                    │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│ Strategy 3: Event Tombstoning                                      │
│ ──────────────────────────────                                     │
│                                                                     │
│ Replace events with tombstone markers                              │
│                                                                     │
│ Original Event:                                                     │
│ {                                                                   │
│   "event_type": "UserRegistered",                                  │
│   "user_id": "user-123",                                          │
│   "email": "john@example.com"                                      │
│ }                                                                   │
│                                                                     │
│ After Erasure:                                                      │
│ {                                                                   │
│   "event_type": "EventRedacted",                                   │
│   "original_type": "UserRegistered",                               │
│   "redaction_reason": "GDPR_ERASURE",                             │
│   "redacted_at": "2024-01-15T10:00:00Z"                           │
│ }                                                                   │
│                                                                     │
│ Pros: Clear audit trail of deletion                                │
│ Cons: Aggregate replay affected, complex                           │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Recommended GDPR Approach

| Data Type | Strategy | Rationale |
|-----------|----------|-----------|
| **PII in events** | Crypto-shredding | Preserves event integrity |
| **User profiles** | Externalization | Easy to delete |
| **Audit events** | Retain (legal basis) | Legitimate interest |
| **Financial data** | Retain (legal obligation) | Tax/regulatory requirements |
| **Analytics** | Anonymize | Aggregate data not personal |

---

## Encryption Strategies

### Encryption Layers

```
┌────────────────────────────────────────────────────────────────────┐
│ ENCRYPTION ARCHITECTURE                                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Layer 1: Encryption at Rest                                        │
│ ───────────────────────────                                        │
│   Database-level encryption                                        │
│   All data encrypted on disk                                       │
│   Transparent to application                                       │
│   Protects: Physical theft, disk disposal                         │
│                                                                     │
│ Layer 2: Encryption in Transit                                     │
│ ────────────────────────────                                       │
│   TLS 1.3 for all connections                                      │
│   mTLS between services                                            │
│   Protects: Network sniffing                                       │
│                                                                     │
│ Layer 3: Field-Level Encryption                                    │
│ ───────────────────────────────                                    │
│   Sensitive fields encrypted before storage                        │
│   Application-managed keys                                         │
│   Protects: Database admins, breaches                             │
│                                                                     │
│ Layer 4: Per-User Encryption (Crypto-Shredding)                    │
│ ───────────────────────────────────────────────                    │
│   Each user's PII encrypted with unique key                        │
│   Key deletion = data "deletion"                                   │
│   Protects: GDPR compliance                                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Key Management

```
┌────────────────────────────────────────────────────────────────────┐
│ KEY MANAGEMENT FOR EVENT SOURCING                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Key Hierarchy:                                                      │
│                                                                     │
│   Master Key (HSM/KMS)                                             │
│         │                                                          │
│         ├── Tenant Key (per-tenant in multi-tenant)               │
│         │       │                                                  │
│         │       ├── User Key (per-user PII)                       │
│         │       │                                                  │
│         │       └── Data Key (bulk data)                          │
│         │                                                          │
│         └── Service Key (service-to-service)                      │
│                                                                     │
│ Key Rotation:                                                       │
│                                                                     │
│ 1. Create new key version                                          │
│ 2. New events use new key version                                  │
│ 3. Old events remain with old key (stored in metadata)            │
│ 4. Key version recorded: "key_id": "user-123-v2"                  │
│ 5. Old keys kept for decryption until data archived               │
│                                                                     │
│ Event with Key Reference:                                          │
│ {                                                                   │
│   "event_id": "evt-123",                                          │
│   "encryption": {                                                  │
│     "key_id": "user-456-v2",                                      │
│     "algorithm": "AES-256-GCM",                                   │
│     "iv": "base64..."                                             │
│   },                                                               │
│   "encrypted_data": "base64...",                                  │
│   "plaintext_metadata": {...}                                     │
│ }                                                                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Access Control

### Stream-Level Access Control

```
┌────────────────────────────────────────────────────────────────────┐
│ ACCESS CONTROL MODEL                                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Permissions:                                                        │
│                                                                     │
│ Stream Permissions:                                                 │
│   • READ: Read events from stream                                  │
│   • WRITE: Append events to stream                                 │
│   • SUBSCRIBE: Subscribe to stream events                          │
│   • DELETE: Delete stream (if supported)                           │
│   • METADATA: Read/write stream metadata                           │
│                                                                     │
│ System Permissions:                                                 │
│   • ADMIN: Full system access                                      │
│   • CREATE_STREAM: Create new streams                              │
│   • CREATE_PROJECTION: Create projections                          │
│   • READ_ALL: Read from $all stream                               │
│                                                                     │
│ Access Control Examples:                                            │
│                                                                     │
│ Stream: "order-123"                                                │
│ ACL:                                                               │
│   {                                                                │
│     "read": ["order-service", "support-team"],                    │
│     "write": ["order-service"],                                   │
│     "subscribe": ["projection-workers", "analytics"],             │
│     "metadata": ["order-service", "admin"]                        │
│   }                                                                │
│                                                                     │
│ Category: "user-*"                                                 │
│ ACL:                                                               │
│   {                                                                │
│     "read": ["user-service", "support-team"],                     │
│     "write": ["user-service"],                                    │
│     "subscribe": ["user-projections"]                             │
│   }                                                                │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Authentication and Authorization

```
┌────────────────────────────────────────────────────────────────────┐
│ AUTH ARCHITECTURE                                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Service-to-Service (Internal):                                     │
│                                                                     │
│   ┌─────────────┐   mTLS    ┌─────────────┐                       │
│   │   Service   │ ────────► │ Event Store │                       │
│   │             │  + JWT    │             │                       │
│   └─────────────┘           └─────────────┘                       │
│                                                                     │
│   JWT Claims:                                                       │
│   {                                                                │
│     "sub": "order-service",                                       │
│     "aud": "event-store",                                         │
│     "permissions": ["write:order-*", "read:product-*"],           │
│     "exp": 1705330000                                             │
│   }                                                                │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│ User Access (Admin UI):                                            │
│                                                                     │
│   ┌───────┐   OIDC    ┌─────────┐   Token   ┌─────────────┐       │
│   │ Admin │ ────────► │   IdP   │ ────────► │ Event Store │       │
│   │  UI   │           │         │           │   Admin API │       │
│   └───────┘           └─────────┘           └─────────────┘       │
│                                                                     │
│   Role-Based Access:                                               │
│   • Admin: Full access                                             │
│   • Support: Read-only access to streams                          │
│   • Developer: Read access + projection management                │
│   • Auditor: Read-only access to audit streams                    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Compliance Considerations

### Regulatory Requirements by Industry

| Regulation | Requirements | Event Sourcing Implications |
|------------|--------------|----------------------------|
| **GDPR** | Right to erasure | Crypto-shredding or externalization |
| **HIPAA** | PHI protection | Encryption, access logging |
| **PCI-DSS** | Cardholder data security | Tokenization, encryption |
| **SOX** | Financial record retention | 7-year retention, immutability |
| **CCPA** | Consumer data rights | Similar to GDPR |
| **SOC 2** | Security controls | Audit trails, access control |

### Data Retention Policies

```
┌────────────────────────────────────────────────────────────────────┐
│ DATA RETENTION STRATEGY                                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Event Categories and Retention:                                    │
│                                                                     │
│ 1. Financial Events                                                │
│    Retention: 7 years (regulatory)                                 │
│    Storage: Hot (1 year) → Warm (2 years) → Cold (4 years)        │
│    Cannot delete: Legal obligation                                 │
│                                                                     │
│ 2. User Activity Events                                            │
│    Retention: 90 days (or until GDPR request)                     │
│    Storage: Hot only                                               │
│    Can delete: With crypto-shredding                               │
│                                                                     │
│ 3. System/Audit Events                                             │
│    Retention: 2 years                                              │
│    Storage: Hot (30 days) → Cold (rest)                           │
│    Legitimate interest: Security                                   │
│                                                                     │
│ 4. Analytics Events (anonymized)                                   │
│    Retention: Indefinite                                           │
│    Storage: Cold storage                                           │
│    No PII: Not subject to GDPR deletion                           │
│                                                                     │
│ Implementation:                                                     │
│                                                                     │
│ Stream Metadata:                                                    │
│ {                                                                   │
│   "stream_id": "order-*",                                         │
│   "retention_policy": "financial",                                │
│   "retention_days": 2555,  // 7 years                             │
│   "encryption": "required",                                        │
│   "pii_handling": "crypto-shred"                                  │
│ }                                                                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Audit Log Requirements

```
┌────────────────────────────────────────────────────────────────────┐
│ COMPLIANCE AUDIT LOGGING                                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Required Audit Events:                                             │
│                                                                     │
│ 1. Authentication Events                                           │
│    • Login success/failure                                        │
│    • Logout                                                        │
│    • Token refresh                                                 │
│    • MFA events                                                    │
│                                                                     │
│ 2. Authorization Events                                            │
│    • Permission granted/denied                                     │
│    • Role changes                                                  │
│    • ACL modifications                                             │
│                                                                     │
│ 3. Data Access Events                                              │
│    • Stream reads (who, what, when)                               │
│    • Projection queries                                            │
│    • Bulk exports                                                  │
│                                                                     │
│ 4. Administrative Events                                           │
│    • Schema changes                                                │
│    • Configuration changes                                         │
│    • User management                                               │
│                                                                     │
│ 5. Data Modification Events                                        │
│    • All business events (inherent in event sourcing)             │
│    • Encryption key operations                                     │
│    • Deletion/redaction events                                     │
│                                                                     │
│ Audit Event Structure:                                             │
│ {                                                                   │
│   "audit_id": "aud-123",                                          │
│   "timestamp": "2024-01-15T10:30:00.123Z",                        │
│   "action": "STREAM_READ",                                        │
│   "actor": {                                                      │
│     "type": "service",                                            │
│     "id": "order-service",                                        │
│     "ip": "10.0.1.100"                                            │
│   },                                                               │
│   "resource": {                                                   │
│     "type": "stream",                                             │
│     "id": "order-123"                                             │
│   },                                                               │
│   "result": "success",                                            │
│   "metadata": {                                                   │
│     "events_read": 50,                                            │
│     "position_range": "100-150"                                   │
│   }                                                                │
│ }                                                                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Security Aspect | Implementation | Notes |
|-----------------|----------------|-------|
| **Audit trail** | Built-in via events | Include comprehensive metadata |
| **GDPR compliance** | Crypto-shredding | Per-user encryption keys |
| **Encryption at rest** | Database-level | Transparent |
| **Encryption in transit** | TLS 1.3 + mTLS | All connections |
| **Field encryption** | Application-level | Sensitive fields only |
| **Access control** | Stream-level ACLs | Service + user permissions |
| **Retention** | Policy-based | Stream metadata |
| **Audit logging** | Dedicated audit stream | Cannot be deleted |
