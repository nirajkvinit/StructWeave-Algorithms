# Security and Compliance

## Authentication

### Identity Provider Integration

```
Authentication Architecture:

                    ┌─────────────────────┐
                    │   Identity Provider   │
                    │   (Corporate AD,      │
                    │    Okta, Azure AD)     │
                    └──────────┬────────────┘
                               │
                    ┌──────────▼────────────┐
                    │   SAML 2.0 / OIDC     │
                    │   Protocol Handler     │
                    └──────────┬────────────┘
                               │
                    ┌──────────▼────────────┐
                    │   DMS Auth Service     │
                    │   - Validate assertion │
                    │   - Map groups → roles │
                    │   - Issue session token│
                    │   - MFA verification   │
                    └──────────┬────────────┘
                               │
                    ┌──────────▼────────────┐
                    │   Session Store        │
                    │   - JWT tokens (short) │
                    │   - Refresh tokens     │
                    │   - Device tracking    │
                    └───────────────────────┘
```

### Authentication Flow

```
PSEUDOCODE: Enterprise SSO Authentication

FUNCTION authenticate_user(request):
    // Check existing session
    session_token = request.headers["Authorization"]
    IF session_token:
        session = validate_jwt(session_token)
        IF session.valid AND NOT session.expired:
            RETURN session.user

    // Initiate SSO flow
    tenant = resolve_tenant(request.host)
    idp_config = get_idp_config(tenant.id)

    SWITCH idp_config.protocol:
        CASE "SAML":
            // Redirect to SAML IdP
            authn_request = build_saml_request(idp_config)
            REDIRECT TO idp_config.sso_url + "?SAMLRequest=" + encode(authn_request)

        CASE "OIDC":
            // Redirect to OIDC provider
            auth_url = build_oidc_auth_url(idp_config, {
                scope: "openid profile email groups",
                response_type: "code",
                redirect_uri: DMS_CALLBACK_URL
            })
            REDIRECT TO auth_url

FUNCTION handle_sso_callback(assertion_or_code):
    // Validate assertion/token
    user_claims = validate_assertion(assertion_or_code)

    // Map IdP groups to DMS roles
    idp_groups = user_claims.groups  // e.g., ["Engineering", "Admins"]
    dms_roles = map_groups_to_roles(idp_groups)
    // Engineering → Contributor, Admins → Admin

    // Provision user on first login (Just-In-Time provisioning)
    user = find_or_create_user(
        external_id = user_claims.sub,
        email = user_claims.email,
        display_name = user_claims.name,
        roles = dms_roles,
        tenant_id = tenant.id
    )

    // Issue session tokens
    access_token = issue_jwt(user, ttl=15*MINUTES)
    refresh_token = issue_refresh_token(user, ttl=8*HOURS)

    // MFA enforcement (if required by tenant policy)
    IF tenant.require_mfa AND NOT user_claims.mfa_verified:
        RETURN { requires_mfa: true, mfa_challenge_token: token }

    RETURN { access_token, refresh_token, user }
```

### Multi-Factor Authentication

```
MFA Enforcement Policies:

Tenant-Level:
├── "All users must use MFA" → Enforce on every login
├── "MFA for admins only" → Enforce for admin role
├── "MFA for external access" → Enforce outside corporate network
└── "Step-up MFA for sensitive operations" → Re-verify for permission changes, share creation

Supported MFA Methods:
├── TOTP (authenticator app) → Most common
├── FIDO2/WebAuthn (hardware key) → Most secure
├── SMS (fallback) → Least secure, discouraged
└── Push notification (mobile app) → Good UX balance

Step-Up MFA for Sensitive Operations:
├── Change permissions on confidential documents → Re-verify
├── Create external share links → Re-verify
├── Break document locks → Re-verify
├── Release legal holds → Re-verify
├── Export eDiscovery results → Re-verify
└── Modify retention policies → Re-verify
```

---

## Authorization

### ACL Inheritance Model

```
Permission Inheritance:

Root Folder (ACL: Group "All Employees" = READ)
│
├── Engineering/ (inherits: All Employees = READ)
│   │            (adds: Group "Engineering" = WRITE)
│   │
│   ├── Designs/ (inherits: All Employees = READ, Engineering = WRITE)
│   │            (adds: Group "Design Team" = FULL_CONTROL)
│   │
│   └── Code/    (breaks inheritance)
│                (own ACL: Group "Engineering" = FULL_CONTROL)
│                (note: "All Employees" no longer have READ here)
│
├── Finance/    (inherits: All Employees = READ)
│               (adds: Group "Finance" = WRITE)
│               (adds: DENY Group "Interns" = ALL)  ← Explicit deny
│
└── Legal/      (breaks inheritance)
                (own ACL: Group "Legal" = FULL_CONTROL)
                (nobody else has any access)
```

### RBAC Role Definitions

| Role | Permissions | Typical Assignment |
|------|------------|-------------------|
| **Viewer** | Read, Download, Search | External collaborators |
| **Contributor** | Read, Write, Upload, Download, Search | Regular employees |
| **Editor** | Read, Write, Upload, Download, Check-out, Search, Comment | Department members |
| **Manager** | All of Editor + Share, Set Metadata, Manage Versions | Team leads |
| **Admin** | All + Manage Permissions, Break Locks, Manage Retention | IT administrators |
| **Compliance Officer** | Read All + Legal Hold, eDiscovery, Audit Reports | Legal/compliance team |

### Permission Evaluation Algorithm

```
PSEUDOCODE: Permission Evaluation with Deny Override

FUNCTION evaluate_permission(user_id, resource_id, requested_permission):
    // Step 1: Get user's principals (user, groups, roles)
    principals = get_user_principals(user_id)
    // e.g., [user_id, "Engineering", "Senior_Engineers", "Contributor"]

    // Step 2: Build effective ACL by walking hierarchy
    resource = get_resource(resource_id)
    hierarchy = get_resource_hierarchy(resource)
    // e.g., [root, Engineering, Designs, document]

    allows = []
    denies = []

    FOR level IN hierarchy:
        IF level.inherit_permissions == false AND level != hierarchy[0]:
            // Inheritance broken: reset
            allows = []
            denies = []

        acl_entries = get_acl_entries(level.id)
        FOR entry IN acl_entries:
            IF entry.principal_id IN principals:
                IF entry.effect == "DENY":
                    denies.append(entry)
                ELSE:
                    allows.append(entry)

    // Step 3: Apply deny-overrides rule
    // Explicit DENY at any level overrides any ALLOW
    FOR deny IN denies:
        IF deny.permission == requested_permission OR deny.permission == "ALL":
            log_event(PERMISSION_DENIED, {
                user_id, resource_id, permission: requested_permission,
                reason: "Explicit deny by " + deny.principal_type + ":" + deny.principal_id
            })
            RETURN DENIED

    // Step 4: Check for explicit ALLOW
    FOR allow IN allows:
        IF allow.permission == requested_permission OR allow.permission == "FULL_CONTROL":
            RETURN ALLOWED

    // Step 5: No match → deny by default
    RETURN DENIED
```

### Permission Change Propagation

```
PSEUDOCODE: ACL Change Propagation

FUNCTION update_acl(resource_id, resource_type, acl_changes, actor_id):
    // Validate actor has permission to change ACL
    IF NOT evaluate_permission(actor_id, resource_id, "MANAGE_PERMISSIONS"):
        THROW ForbiddenError("Cannot modify permissions")

    // Apply ACL changes
    FOR change IN acl_changes:
        SWITCH change.action:
            CASE "ADD":
                insert_acl_entry(resource_id, resource_type, change.principal, change.permission, change.effect)
            CASE "REMOVE":
                delete_acl_entry(resource_id, resource_type, change.principal, change.permission)
            CASE "MODIFY":
                update_acl_entry(change.entry_id, change.new_permission, change.new_effect)

    // Invalidate permission cache for affected resources
    IF resource_type == "FOLDER":
        // Must invalidate for this folder and all descendants
        descendant_ids = get_all_descendant_ids(resource_id)
        FOR id IN [resource_id] + descendant_ids:
            invalidate_permission_cache(id)
    ELSE:
        invalidate_permission_cache(resource_id)

    // Audit log
    log_event(ACL_CHANGED, {
        resource_id, resource_type, changes: acl_changes,
        actor_id, affected_documents: count_affected_documents(resource_id)
    })
```

---

## Encryption

### Encryption Architecture

```
Encryption Layers:

Layer 1: In-Transit Encryption
├── TLS 1.3 for all client-server communication
├── mTLS for service-to-service communication
├── Certificate pinning for mobile apps
└── HSTS headers with preload

Layer 2: At-Rest Encryption (Server-Side)
├── Object storage: AES-256-GCM, per-object keys
├── Metadata DB: Transparent Data Encryption (TDE)
├── Search index: Encrypted at filesystem level
├── Audit logs: Encrypted at storage level
└── Backups: Encrypted with separate backup keys

Layer 3: Envelope Encryption (Key Management)
├── Data Encryption Key (DEK): per-document or per-tenant
├── Key Encryption Key (KEK): stored in HSM/KMS
├── Tenant Master Key (TMK): per-tenant, in KMS
└── Root Key: in HSM, never leaves hardware

Layer 4: Client-Side Encryption (Optional, Premium)
├── Document encrypted before upload
├── Only key holder can decrypt
├── Server stores encrypted blob (zero-knowledge)
├── Key management: customer-managed keys
└── Trade-off: no server-side search, no thumbnails
```

### Key Hierarchy

```
Key Hierarchy:

Root Key (HSM)
├── Tenant Master Key 1 (KMS)
│   ├── DEK for Document A (encrypted by TMK-1)
│   ├── DEK for Document B (encrypted by TMK-1)
│   └── DEK for Document C (encrypted by TMK-1)
│
├── Tenant Master Key 2 (KMS)
│   ├── DEK for Document X (encrypted by TMK-2)
│   └── DEK for Document Y (encrypted by TMK-2)
│
└── Backup Encryption Key (KMS)
    └── Used to encrypt all backup artifacts

Key Rotation:
├── DEK rotation: on every new version (new key per version)
├── TMK rotation: annually or on demand
├── Root key rotation: every 2 years or on demand
├── Rotation is transparent: old data re-encrypted in background
```

```
PSEUDOCODE: Envelope Encryption for Documents

FUNCTION encrypt_document(tenant_id, content):
    // Generate document-specific DEK
    dek = generate_random_key(256)  // AES-256

    // Encrypt content with DEK
    iv = generate_random_iv(96)     // 96-bit IV for AES-GCM
    encrypted_content = aes_gcm_encrypt(content, dek, iv)

    // Encrypt DEK with tenant master key
    tmk = kms.get_key(tenant_id + ":master")
    encrypted_dek = kms.encrypt(dek, tmk)

    // Store encrypted DEK alongside document metadata
    RETURN {
        encrypted_content: encrypted_content,
        encrypted_dek: encrypted_dek,
        iv: iv,
        key_id: tmk.key_id,
        algorithm: "AES-256-GCM"
    }

FUNCTION decrypt_document(tenant_id, encrypted_document):
    // Decrypt DEK using tenant master key
    tmk = kms.get_key(encrypted_document.key_id)
    dek = kms.decrypt(encrypted_document.encrypted_dek, tmk)

    // Decrypt content with DEK
    content = aes_gcm_decrypt(
        encrypted_document.encrypted_content,
        dek,
        encrypted_document.iv
    )

    // Securely wipe DEK from memory
    secure_zero(dek)
    RETURN content
```

---

## Data Loss Prevention (DLP)

### Content Scanning Architecture

```
DLP Pipeline:

Document Upload/Share Event
    │
    ▼
┌──────────────────────────────────────┐
│           DLP Scanner                 │
│                                      │
│  Rule Engine:                        │
│  ├── PII Detection                   │
│  │   ├── SSN pattern (regex)         │
│  │   ├── Credit card (Luhn + regex)  │
│  │   ├── Email addresses             │
│  │   ├── Phone numbers               │
│  │   └── National ID formats         │
│  │                                   │
│  ├── Sensitive Content               │
│  │   ├── Financial data patterns     │
│  │   ├── Healthcare identifiers      │
│  │   ├── Password/credential strings │
│  │   └── Custom keyword lists        │
│  │                                   │
│  └── Classification                  │
│      ├── PUBLIC (no restrictions)     │
│      ├── INTERNAL (no external share) │
│      ├── CONFIDENTIAL (restricted)    │
│      └── RESTRICTED (encrypted only)  │
│                                      │
└──────────────┬───────────────────────┘
               │
    ┌──────────▼──────────┐
    │   Policy Evaluator   │
    │                      │
    │  Actions:            │
    │  ├── ALLOW           │
    │  ├── WARN (log)      │
    │  ├── BLOCK (prevent) │
    │  ├── ENCRYPT (force) │
    │  └── QUARANTINE      │
    └──────────────────────┘
```

```
PSEUDOCODE: DLP Policy Enforcement

FUNCTION evaluate_dlp_policy(document_id, action, context):
    document = get_document(document_id)
    content = extract_text(document)
    classification = get_classification(document_id)

    // Run content scanners
    scan_results = []
    FOR scanner IN active_scanners:
        findings = scanner.scan(content)
        scan_results.extend(findings)

    // Evaluate policies against findings and action
    FOR policy IN get_active_policies(document.tenant_id):
        IF policy.matches(action, classification, scan_results):
            SWITCH policy.action:
                CASE "BLOCK":
                    log_event(DLP_BLOCKED, {
                        document_id, action, policy_id: policy.id,
                        findings: redact(scan_results)
                    })
                    RETURN {
                        allowed: false,
                        reason: policy.user_message,
                        policy_id: policy.id
                    }

                CASE "WARN":
                    log_event(DLP_WARNING, {
                        document_id, action, policy_id: policy.id,
                        findings: redact(scan_results)
                    })
                    // Allow but log

                CASE "ENCRYPT":
                    force_encryption(document_id)
                    log_event(DLP_ENCRYPTED, { document_id, policy_id: policy.id })

                CASE "QUARANTINE":
                    quarantine_document(document_id, policy.id)
                    notify_admin(DLP_QUARANTINE, document_id)
                    RETURN { allowed: false, reason: "Document quarantined for review" }

    RETURN { allowed: true }
```

---

## Compliance Standards

### HIPAA Controls

| Control | Implementation |
|---------|---------------|
| Access Control (164.312(a)(1)) | RBAC with minimum necessary access; role-based document access |
| Audit Controls (164.312(b)) | Immutable audit log of all PHI access; 6-year retention |
| Integrity Controls (164.312(c)(1)) | Content hashing (SHA-256); version history; tamper detection |
| Transmission Security (164.312(e)(1)) | TLS 1.3 in transit; AES-256 at rest |
| Person/Entity Auth (164.312(d)) | SSO with MFA; unique user identification |
| BAA Support | Tenant-level BAA configuration; dedicated compliance reports |

### SOX Controls

| Control | Implementation |
|---------|---------------|
| Document Retention | 7-year retention for financial documents; automated enforcement |
| Access Trail | Complete audit trail of document access and modifications |
| Segregation of Duties | Separate roles for document creation, approval, and publishing |
| Change Management | Version control with mandatory check-in comments |
| Evidence Preservation | Legal hold for audit-relevant documents |

### GDPR Controls

| Control | Implementation |
|---------|---------------|
| Right to Erasure (Art. 17) | User data deletion (unless legal hold); cascade to versions, metadata, audit anonymization |
| Data Portability (Art. 20) | Bulk export of user's documents and metadata in standard formats |
| Data Residency | Per-tenant data residency configuration; storage in designated regions only |
| Consent Management | Consent records for external sharing; withdrawal support |
| Data Processing Records | Automated records of processing activities per Art. 30 |
| DPO Support | Data protection officer dashboard; compliance reports |
| Breach Notification | 72-hour breach detection and notification workflow |

### ISO 27001 Controls

| Control | Implementation |
|---------|---------------|
| A.9 Access Control | ACL inheritance, RBAC, MFA, session management |
| A.10 Cryptography | Envelope encryption, key rotation, HSM-backed keys |
| A.12 Operations Security | Change management, capacity management, backup procedures |
| A.14 System Acquisition | Secure development lifecycle, vulnerability management |
| A.16 Incident Management | Security incident detection, response procedures, forensics |
| A.18 Compliance | Regular compliance audits, policy enforcement monitoring |

---

## eDiscovery

### Legal Hold and Search Architecture

```
eDiscovery Workflow:

1. Legal Counsel identifies matter
    │
    ▼
2. Create Legal Hold (matter name, custodians, scope)
    │
    ├── Identify documents by:
    │   ├── Custodian (document owner/editor)
    │   ├── Date range
    │   ├── Keywords
    │   ├── Folder scope
    │   └── Document type
    │
    ▼
3. Place Hold on identified documents
    │
    ├── Documents become immutable
    ├── Retention policies suspended
    ├── All versions preserved
    └── Notification to custodians (configurable)
    │
    ▼
4. Review & Search held content
    │
    ├── Full-text search across held documents
    ├── Filter by date, custodian, type
    ├── Preview documents in-browser
    └── Tag documents (responsive, privileged, not-responsive)
    │
    ▼
5. Export for Legal Review
    │
    ├── Export formats: native, PDF, load file (Concordance, Relativity)
    ├── Include metadata, audit trail, version history
    ├── Bates numbering for legal reference
    └── Export audit trail (what was exported, when, by whom)
    │
    ▼
6. Release Hold (when matter concludes)
    │
    ├── Documents return to normal lifecycle
    ├── Suspended retention policies resume
    └── Release logged in audit trail
```

```
PSEUDOCODE: eDiscovery Search

FUNCTION ediscovery_search(hold_id, search_criteria, user_id):
    // Verify user has eDiscovery permission
    IF NOT has_role(user_id, "COMPLIANCE_OFFICER"):
        THROW ForbiddenError("eDiscovery access requires Compliance Officer role")

    // Get documents under this hold
    held_document_ids = get_held_documents(hold_id)

    // Build search query scoped to held documents
    query = build_search_query(search_criteria)
    query.add_filter("document_id", held_document_ids)

    // Execute search (bypasses normal permission checks)
    results = search_index.query(query, size=1000)

    // Enrich with version history and audit trail
    FOR result IN results:
        result.versions = get_all_versions(result.document_id)
        result.audit_trail = get_document_audit_trail(result.document_id)
        result.custodian = get_document_owner(result.document_id)
        result.hold_date = get_hold_date(hold_id, result.document_id)

    // Log eDiscovery search
    log_event(EDISCOVERY_SEARCH, {
        hold_id, user_id, criteria: search_criteria,
        results_count: results.length
    })

    RETURN results

FUNCTION export_ediscovery(hold_id, document_ids, export_format, user_id):
    // Create export job
    export_job = create_export_job(hold_id, document_ids, export_format)

    FOR doc_id IN document_ids:
        document = get_document(doc_id)
        content = download_content(doc_id)
        metadata = get_all_metadata(doc_id)
        audit = get_document_audit_trail(doc_id)
        versions = get_all_versions(doc_id)

        // Generate Bates number
        bates_number = generate_bates_number(export_job.id, doc_id)

        // Add to export package
        add_to_export(export_job, {
            bates_number: bates_number,
            native_file: content,
            metadata: metadata,
            audit_trail: audit,
            version_history: versions,
            custodian: document.created_by
        })

    // Finalize export
    export_package = finalize_export(export_job, export_format)
    // Encrypt export package
    encrypted_package = encrypt_export(export_package, user_id)

    // Log export
    log_event(EDISCOVERY_EXPORT, {
        hold_id, user_id, document_count: document_ids.length,
        export_format, bates_range: export_job.bates_range
    })

    RETURN encrypted_package
```

---

## Audit Trail

### Immutable Audit Log Design

```
Audit Event Schema:
{
    "event_id": "uuid",
    "tenant_id": "uuid",
    "timestamp": "2026-03-08T14:30:00.000Z",
    "event_type": "DOCUMENT_CHECKED_IN",
    "actor": {
        "user_id": "uuid",
        "display_name": "Alice Johnson",
        "email": "alice@company.com",
        "ip_address": "10.0.1.42",
        "user_agent": "Mozilla/5.0...",
        "session_id": "uuid"
    },
    "resource": {
        "type": "DOCUMENT",
        "id": "uuid",
        "name": "Q3 Revenue Report.pdf",
        "folder_path": "/Finance/Reports/2025/"
    },
    "details": {
        "version_created": 4,
        "file_size_bytes": 245760,
        "content_hash": "sha256:abc123...",
        "change_description": "Updated quarterly figures",
        "previous_version": 3
    },
    "hash_chain": {
        "previous_hash": "sha256:def456...",
        "current_hash": "sha256:ghi789..."
    }
}
```

### Audit Event Types

| Category | Event Types |
|----------|-------------|
| **Document Lifecycle** | DOCUMENT_CREATED, DOCUMENT_UPDATED, DOCUMENT_DELETED, DOCUMENT_RESTORED, DOCUMENT_PURGED |
| **Version Control** | DOCUMENT_CHECKED_OUT, DOCUMENT_CHECKED_IN, CHECKOUT_CANCELLED, LOCK_BROKEN, LOCK_EXPIRED, VERSION_RESTORED |
| **Access** | DOCUMENT_VIEWED, DOCUMENT_DOWNLOADED, DOCUMENT_PREVIEWED, DOCUMENT_SEARCHED |
| **Permissions** | ACL_CREATED, ACL_MODIFIED, ACL_DELETED, INHERITANCE_BROKEN, INHERITANCE_RESTORED |
| **Sharing** | SHARE_CREATED, SHARE_ACCESSED, SHARE_REVOKED, SHARE_EXPIRED |
| **Workflow** | WORKFLOW_STARTED, STEP_APPROVED, STEP_REJECTED, WORKFLOW_COMPLETED, WORKFLOW_ESCALATED |
| **Compliance** | LEGAL_HOLD_PLACED, LEGAL_HOLD_RELEASED, RETENTION_DELETION, EDISCOVERY_SEARCH, EDISCOVERY_EXPORT |
| **Admin** | USER_PROVISIONED, USER_DEPROVISIONED, POLICY_CREATED, POLICY_MODIFIED, SETTINGS_CHANGED |

### Hash Chain for Tamper Detection

```
PSEUDOCODE: Tamper-Evident Audit Log

FUNCTION append_audit_event(event):
    // Get hash of previous event (for chain integrity)
    previous_event = get_latest_audit_event(event.tenant_id)
    previous_hash = previous_event.hash_chain.current_hash IF previous_event ELSE "GENESIS"

    // Compute hash of current event
    event_payload = canonical_json(event, excluding=["hash_chain"])
    current_hash = sha256(previous_hash + event_payload)

    event.hash_chain = {
        previous_hash: previous_hash,
        current_hash: current_hash
    }

    // Append to immutable store (no UPDATE or DELETE operations)
    append_to_audit_store(event)

FUNCTION verify_audit_chain(tenant_id, start_time, end_time):
    events = get_audit_events(tenant_id, start_time, end_time)

    FOR i IN range(1, events.length):
        // Verify chain link
        expected_previous = events[i-1].hash_chain.current_hash
        actual_previous = events[i].hash_chain.previous_hash

        IF expected_previous != actual_previous:
            RETURN {
                valid: false,
                break_at: events[i].timestamp,
                event_id: events[i].event_id,
                reason: "Hash chain broken: expected " + expected_previous
            }

        // Verify event hash
        event_payload = canonical_json(events[i], excluding=["hash_chain"])
        recomputed = sha256(events[i].hash_chain.previous_hash + event_payload)
        IF recomputed != events[i].hash_chain.current_hash:
            RETURN {
                valid: false,
                break_at: events[i].timestamp,
                event_id: events[i].event_id,
                reason: "Event content tampered"
            }

    RETURN { valid: true, events_verified: events.length }
```

---

## External Sharing Security

### Security Controls for External Shares

```
External Share Security Matrix:

Control                  │ Basic │ Standard │ Restricted │
─────────────────────────┼───────┼──────────┼────────────┤
Password protection      │ No    │ Optional │ Required   │
Link expiration          │ 30d   │ 7d       │ 24h        │
Access count limit       │ No    │ 100      │ 10         │
Download allowed         │ Yes   │ Optional │ No         │
Watermark on preview     │ No    │ No       │ Yes        │
IP restriction           │ No    │ No       │ Yes        │
MFA for access           │ No    │ No       │ Yes        │
Audit trail              │ Basic │ Full     │ Full + IP  │
Admin approval required  │ No    │ No       │ Yes        │
DLP scan before share    │ No    │ Yes      │ Yes        │
Revocation               │ Manual│ Manual   │ Auto (24h) │
```

### Access Monitoring and Anomaly Detection

```
PSEUDOCODE: Share Link Anomaly Detection

FUNCTION monitor_share_access(share_id, access_event):
    share = get_share(share_id)
    recent_accesses = get_recent_accesses(share_id, last_24_hours)

    // Check for suspicious patterns
    alerts = []

    // Pattern 1: Burst access (bot/scraping)
    IF recent_accesses.count > 50:
        alerts.append({
            type: "BURST_ACCESS",
            severity: "HIGH",
            detail: "Share link accessed " + recent_accesses.count + " times in 24h"
        })

    // Pattern 2: Geographic anomaly
    locations = unique_geolocations(recent_accesses)
    IF locations.length > 5:
        alerts.append({
            type: "GEO_ANOMALY",
            severity: "MEDIUM",
            detail: "Access from " + locations.length + " different countries"
        })

    // Pattern 3: Known bad IP/ASN
    IF is_known_threat_source(access_event.ip_address):
        alerts.append({
            type: "THREAT_SOURCE",
            severity: "CRITICAL",
            detail: "Access from known threat source: " + access_event.ip_address
        })

    // Auto-revoke on critical alerts
    FOR alert IN alerts:
        IF alert.severity == "CRITICAL":
            revoke_share(share_id, reason="Auto-revoked: " + alert.type)
            notify_share_creator(share.created_by, "Share auto-revoked due to suspicious activity")

        log_event(SHARE_ANOMALY, { share_id, alert })

    RETURN alerts
```

---

## Threat Model

### Attack Surface Map

| Attack Vector | Threat | Mitigation |
|--------------|--------|------------|
| **Authentication bypass** | Unauthorized access to documents | SSO + MFA, session management, brute-force protection |
| **Broken access control** | Accessing documents without permission | ACL evaluation on every request, permission cache invalidation |
| **Injection (search)** | Search query injection | Parameterized queries, input sanitization, query DSL |
| **Insecure file upload** | Malware upload, ZIP bombs, XXE in Office docs | Virus scanning, file type validation, content extraction sandboxing |
| **Broken object-level authorization** | Accessing documents by guessing IDs | UUID v4 (unpredictable), permission check on every access |
| **Excessive data exposure** | Search results leaking unauthorized documents | Post-query permission filtering, never trust client-side filtering |
| **Insecure direct object reference** | Accessing versions/metadata via URL manipulation | Permission check at every level, not just document level |
| **SSRF via document processing** | OCR/preview service making requests to internal services | Sandboxed processing, no network access for converters |
| **Share link enumeration** | Brute-forcing share tokens | 144-bit token entropy, rate limiting, CAPTCHA after failures |
| **Privilege escalation** | User grants themselves higher permissions | Permission check: only users with MANAGE_PERMISSIONS can modify ACLs |
| **Data exfiltration** | Downloading large volumes of documents | DLP scanning, download rate limiting, anomaly detection |
| **Ransomware via API** | Bulk encryption of documents via API | Rate limiting, anomaly detection (bulk operations trigger alerts), version history enables recovery |
