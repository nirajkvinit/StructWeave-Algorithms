# Secret Management System - Observability

## Metrics

### Core System Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `vault_core_unsealed` | Gauge | `cluster` | 1 if unsealed, 0 if sealed |
| `vault_core_active` | Gauge | `cluster` | 1 if active (leader), 0 otherwise |
| `vault_core_leadership_setup_failed` | Counter | `cluster` | Leadership setup failures |
| `vault_core_leadership_lost` | Counter | `cluster` | Leadership transitions |
| `vault_core_step_down` | Counter | `cluster` | Voluntary step-downs |

### Request Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `vault_http_request_total` | Counter | `method`, `path`, `status_code` | Total HTTP requests |
| `vault_http_request_duration_seconds` | Histogram | `method`, `path` | Request latency distribution |
| `vault_http_active_requests` | Gauge | `method` | Currently processing requests |

### Authentication Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `vault_auth_login_total` | Counter | `auth_method`, `status` | Login attempts |
| `vault_auth_login_duration_seconds` | Histogram | `auth_method` | Login latency |
| `vault_token_creation_total` | Counter | `auth_method`, `token_type` | Tokens created |
| `vault_token_revocation_total` | Counter | `reason` | Tokens revoked |
| `vault_token_count` | Gauge | `namespace` | Active tokens |

### Secret Engine Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `vault_secret_kv_read_total` | Counter | `mount`, `namespace` | KV read operations |
| `vault_secret_kv_write_total` | Counter | `mount`, `namespace` | KV write operations |
| `vault_secret_kv_delete_total` | Counter | `mount`, `namespace` | KV delete operations |
| `vault_secret_database_creds_total` | Counter | `mount`, `role` | Dynamic DB credentials generated |
| `vault_secret_pki_cert_issued_total` | Counter | `mount`, `role` | Certificates issued |
| `vault_secret_transit_encrypt_total` | Counter | `mount`, `key` | Transit encrypt operations |
| `vault_secret_transit_decrypt_total` | Counter | `mount`, `key` | Transit decrypt operations |

### Lease Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `vault_expire_num_leases` | Gauge | `namespace` | Active leases count |
| `vault_expire_lease_expirations` | Counter | `namespace` | Leases expired |
| `vault_expire_lease_revocations` | Counter | `namespace`, `reason` | Leases revoked |
| `vault_expire_lease_renewal_total` | Counter | `namespace` | Lease renewals |
| `vault_expire_lease_renewal_duration_seconds` | Histogram | | Renewal latency |

### Policy Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `vault_policy_evaluation_total` | Counter | `result` | Policy evaluations (allow/deny) |
| `vault_policy_evaluation_duration_seconds` | Histogram | | Policy eval latency |
| `vault_policy_cache_hit_total` | Counter | | Policy cache hits |
| `vault_policy_cache_miss_total` | Counter | | Policy cache misses |

### Replication Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `vault_replication_merkle_commit_index` | Gauge | `cluster` | Replication progress |
| `vault_replication_wal_gc_count` | Counter | `cluster` | WAL garbage collections |
| `vault_replication_wal_last_segment` | Gauge | `cluster` | Last WAL segment |
| `vault_replication_primary_connection_status` | Gauge | `secondary` | 1 if connected |

### Audit Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `vault_audit_log_request_total` | Counter | `backend`, `status` | Audit write attempts |
| `vault_audit_log_response_total` | Counter | `backend`, `status` | Audit response logs |
| `vault_audit_log_duration_seconds` | Histogram | `backend` | Audit write latency |
| `vault_audit_log_failure_total` | Counter | `backend` | Audit failures |

---

## Prometheus Metric Definitions

```yaml
# Core health metrics
- name: vault_core_unsealed
  type: gauge
  help: "Vault seal status (1=unsealed, 0=sealed)"
  labels: [cluster_name]

- name: vault_core_active
  type: gauge
  help: "Vault leadership status (1=leader, 0=standby)"
  labels: [cluster_name]

# Request metrics
- name: vault_http_request_total
  type: counter
  help: "Total HTTP requests processed"
  labels: [method, path_template, status_code]

- name: vault_http_request_duration_seconds
  type: histogram
  help: "HTTP request latency in seconds"
  labels: [method, path_template]
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]

# Authentication metrics
- name: vault_auth_login_total
  type: counter
  help: "Login attempts by auth method and status"
  labels: [auth_method, status]  # status: success, failure

- name: vault_token_count
  type: gauge
  help: "Current number of active tokens"
  labels: [namespace, token_type]

# Lease metrics
- name: vault_expire_num_leases
  type: gauge
  help: "Number of active leases"
  labels: [namespace]

- name: vault_expire_lease_expirations
  type: counter
  help: "Number of leases that have expired"
  labels: [namespace]

# Policy metrics
- name: vault_policy_evaluation_duration_seconds
  type: histogram
  help: "Time to evaluate policy decisions"
  labels: []
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05]

# Audit metrics
- name: vault_audit_log_request_total
  type: counter
  help: "Audit log write operations"
  labels: [backend, status]  # status: success, failure
```

---

## Logging

### Log Levels and Usage

| Level | Use Case | Examples |
|-------|----------|----------|
| **ERROR** | Operation failures, security events | Auth failure, audit write failed |
| **WARN** | Degraded state, approaching limits | High lease count, replication lag |
| **INFO** | Normal operations | Startup, leader election, config reload |
| **DEBUG** | Troubleshooting | Request details, policy evaluation |
| **TRACE** | Deep debugging | Full request/response, crypto ops |

### Structured Log Format

```json
{
    "timestamp": "2024-01-15T10:30:00.123456Z",
    "level": "info",
    "message": "Authentication successful",
    "logger": "auth.oidc",
    "component": "auth",
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "auth_method": "oidc",
    "client_ip": "10.0.1.50",
    "user_id": "user@example.com",
    "policies": ["default", "myapp-policy"],
    "token_accessor": "0e9e354a-520f-df04-6867-ee81cae3d42d",
    "duration_ms": 45
}
```

### Security-Sensitive Events (Always Logged)

| Event | Log Level | Required Fields |
|-------|-----------|-----------------|
| Authentication attempt | INFO/WARN | auth_method, client_ip, success |
| Token creation | INFO | accessor, policies, ttl |
| Token revocation | INFO | accessor, reason |
| Secret access | INFO (via audit) | path, operation, accessor |
| Policy change | INFO | policy_name, action |
| Seal/unseal | WARN | action, operator (if known) |
| Configuration change | INFO | path, action |
| Leader election | WARN | old_leader, new_leader |

### Audit Log Format

```json
{
    "time": "2024-01-15T10:30:00.123456Z",
    "type": "request",
    "auth": {
        "client_token": "hmac-sha256:abc123def456...",
        "accessor": "0e9e354a-520f-df04-6867-ee81cae3d42d",
        "display_name": "token-approle-myapp",
        "policies": ["default", "myapp-policy"],
        "token_policies": ["default", "myapp-policy"],
        "identity_policies": [],
        "metadata": {
            "role_name": "myapp-role"
        },
        "entity_id": "7d2e3179-f69b-450c-7179-ac8ee8bd8ca9",
        "token_type": "service",
        "token_ttl": 3600,
        "token_issue_time": "2024-01-15T10:00:00Z"
    },
    "request": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "operation": "read",
        "mount_type": "kv",
        "mount_accessor": "kv_abc123",
        "client_token": "hmac-sha256:abc123def456...",
        "client_token_accessor": "0e9e354a-520f-df04-6867-ee81cae3d42d",
        "namespace": {
            "id": "root",
            "path": ""
        },
        "path": "secret/data/myapp/config",
        "data": null,
        "policy_override": false,
        "remote_address": "10.0.1.50",
        "remote_port": 54321,
        "wrap_ttl": 0,
        "headers": {
            "x-forwarded-for": ["10.0.1.50"],
            "user-agent": ["vault-agent/1.15.0"]
        }
    },
    "response": {
        "mount_type": "kv",
        "mount_accessor": "kv_abc123",
        "data": {
            "data": "hmac-sha256:response_data_hmac...",
            "metadata": "hmac-sha256:metadata_hmac..."
        }
    },
    "error": ""
}
```

---

## Distributed Tracing

### Key Spans to Instrument

```
Request Trace Example:
└── vault.http.request (50ms)
    ├── vault.auth.token_lookup (2ms)
    │   └── vault.storage.read (1ms)
    ├── vault.policy.evaluate (1ms)
    │   └── vault.policy.cache.lookup (0.2ms)
    ├── vault.secret.kv.read (5ms)
    │   ├── vault.barrier.decrypt (1ms)
    │   └── vault.storage.read (3ms)
    ├── vault.audit.log (2ms)
    │   ├── vault.audit.file.write (1ms)
    │   └── vault.audit.syslog.write (1ms)
    └── vault.http.response (1ms)
```

### Trace Context Propagation

```
TRACING_CONFIGURATION:

    // Request ID used as trace ID
    trace_id = request.headers.get("X-Request-Id") OR generate_uuid()

    // Propagate through all operations
    context = TraceContext(
        trace_id=trace_id,
        span_id=generate_span_id(),
        parent_span_id=request.headers.get("X-Parent-Span-Id")
    )

    // Include in audit logs for correlation
    audit_entry.trace_id = trace_id

    // Forward to downstream services
    response.headers["X-Trace-Id"] = trace_id
```

### Critical Paths to Trace

| Path | Why | Key Metrics |
|------|-----|-------------|
| Authentication flow | Performance, security | Auth method latency, failure rate |
| Secret read | Most common operation | Cache hit rate, storage latency |
| Dynamic credential generation | External dependency | DB connection time, lease creation |
| Certificate issuance | CPU intensive | Key generation time, signing time |
| Policy evaluation | Every request | Cache effectiveness, eval complexity |

---

## Alerting

### Critical Alerts (Page Immediately)

| Alert | Condition | Severity | Response |
|-------|-----------|----------|----------|
| **VaultSealed** | `vault_core_unsealed == 0` for 1m | P1 | Unseal immediately |
| **VaultLeadershipLost** | `vault_core_active == 0` on all nodes for 2m | P1 | Investigate cluster health |
| **AuditBackendDown** | `vault_audit_log_failure_total` increasing for 1m | P1 | Restore audit, operations blocked |
| **NoLeaseExpiration** | `vault_expire_lease_expirations` = 0 for 1h | P1 | Check expiration manager |
| **StorageUnreachable** | Storage errors > 10/min for 2m | P1 | Check storage backend |

### High-Priority Alerts (Page During Business Hours)

| Alert | Condition | Severity | Response |
|-------|-----------|----------|----------|
| **HighAuthFailureRate** | Auth failures > 100/min | P2 | Check for brute force |
| **LeaseExplosion** | `vault_expire_num_leases` > 50000 | P2 | Review TTL policies |
| **ReplicationLag** | Lag > 30s for 5m | P2 | Check network, primary load |
| **HighLatencyP99** | Request p99 > 500ms for 5m | P2 | Scale up, investigate |
| **PolicyDenialSpike** | Denials > 50/min | P2 | Review policy config |

### Warning Alerts (Ticket/Review)

| Alert | Condition | Severity | Response |
|-------|-----------|----------|----------|
| **HighTokenCount** | Tokens > 100000 | P3 | Review token creation |
| **CertExpirationWarning** | CA cert expires < 30d | P3 | Rotate intermediate CA |
| **StorageGrowth** | Growth > 10%/week | P3 | Capacity planning |
| **LowCacheHitRate** | Policy cache < 80% | P3 | Tune cache, reduce policies |

### Alert Rule Examples (Prometheus)

```yaml
groups:
  - name: vault_critical
    rules:
      - alert: VaultSealed
        expr: vault_core_unsealed == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Vault is sealed"
          description: "Vault cluster {{ $labels.cluster }} is sealed. Immediate action required."
          runbook_url: "https://wiki.internal/runbooks/vault-sealed"

      - alert: VaultNoLeader
        expr: sum(vault_core_active) == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "No Vault leader elected"
          description: "No active leader in Vault cluster for 2 minutes."

      - alert: AuditBackendFailure
        expr: rate(vault_audit_log_failure_total[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Audit backend failing"
          description: "Audit backend {{ $labels.backend }} is failing. Operations may be blocked."

  - name: vault_high
    rules:
      - alert: HighAuthFailureRate
        expr: rate(vault_auth_login_total{status="failure"}[5m]) > 100
        for: 2m
        labels:
          severity: high
        annotations:
          summary: "High authentication failure rate"
          description: "Authentication failures: {{ $value }}/min on {{ $labels.auth_method }}"

      - alert: LeaseExplosion
        expr: vault_expire_num_leases > 50000
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "Too many active leases"
          description: "Active leases: {{ $value }}. Review TTL policies."

      - alert: HighRequestLatency
        expr: histogram_quantile(0.99, rate(vault_http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "High request latency"
          description: "p99 latency: {{ $value }}s"
```

---

## Dashboards

### Overview Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Vault Cluster Overview                          │
├─────────────────┬─────────────────┬─────────────────┬──────────────┤
│   Seal Status   │     Leader      │   Active Nodes  │    Version   │
│   ✓ UNSEALED    │   vault-0       │      3/3        │    1.15.0    │
├─────────────────┴─────────────────┴─────────────────┴──────────────┤
│                        Request Rate (5m avg)                        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │    ▄▄▄▄▄▄▄▄▄▄                                              │    │
│  │   █████████████▄▄▄▄                                        │    │
│  │  ██████████████████████▄▄                                  │    │
│  │ ████████████████████████████                               │    │
│  └────────────────────────────────────────────────────────────┘    │
│            1,250 req/s                                              │
├─────────────────────────────────────────────────────────────────────┤
│                        Latency Distribution                         │
│  p50: 5ms    p95: 25ms    p99: 50ms    max: 120ms                  │
├───────────────────────┬─────────────────────────────────────────────┤
│     Active Leases     │              Token Count                    │
│        45,230         │                 12,450                      │
├───────────────────────┴─────────────────────────────────────────────┤
│                    Authentication by Method (24h)                   │
│  AppRole: 85%  │  Kubernetes: 10%  │  OIDC: 4%  │  Other: 1%       │
└─────────────────────────────────────────────────────────────────────┘
```

### Security Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Security Monitoring                             │
├─────────────────────────────────────────────────────────────────────┤
│                   Authentication Failures (24h)                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ▄                                              ▄           │    │
│  │ █▄                                            ▄█▄          │    │
│  │ ██▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄███          │    │
│  └────────────────────────────────────────────────────────────┘    │
│       Baseline: 50/hr        Spikes: 2 (investigated)              │
├───────────────────────┬─────────────────────────────────────────────┤
│   Policy Denials (1h) │        Top Denied Paths                     │
│         125           │   /secret/admin/* - 80                      │
│   ⚠ Above baseline    │   /sys/policies/* - 30                      │
│                       │   /pki/root/* - 15                          │
├───────────────────────┴─────────────────────────────────────────────┤
│                       Audit Log Status                              │
│   File Backend: ✓ OK       Syslog: ✓ OK       SIEM: ✓ OK           │
│   Last write: 2ms ago      Events/sec: 450                          │
├─────────────────────────────────────────────────────────────────────┤
│                    Root Token Usage (30d)                           │
│   Total uses: 3      Last used: 2024-01-10 (policy update)         │
│   ⚠ Review root token usage monthly                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Operations Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Operational Health                               │
├─────────────────────────────────────────────────────────────────────┤
│  Raft Status:                                                       │
│    Leader: vault-0.vault.svc    Term: 42    Commit Index: 1234567  │
│    Followers: vault-1 (lag: 0), vault-2 (lag: 0)                   │
├───────────────────────┬─────────────────────────────────────────────┤
│   Storage I/O (5m)    │            Replication                      │
│    Reads: 5,000/s     │   Performance Replicas: 2 (healthy)        │
│    Writes: 50/s       │   DR Replica: 1 (lag: 2s)                  │
│    Avg latency: 2ms   │                                             │
├───────────────────────┴─────────────────────────────────────────────┤
│                      Lease Expiration Queue                         │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Next 1h: 1,200 │ Next 6h: 8,500 │ Next 24h: 25,000       │    │
│  └────────────────────────────────────────────────────────────┘    │
│  Expiration rate: 200/min (normal)                                  │
├─────────────────────────────────────────────────────────────────────┤
│                      Resource Utilization                           │
│   vault-0: CPU 45% │ Mem 60% │ vault-1: CPU 30% │ Mem 55%         │
│   vault-2: CPU 32% │ Mem 58%                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Runbooks

### Runbook: Vault Sealed Emergency

```
RUNBOOK: vault-sealed-emergency
SEVERITY: P1
ON-CALL: Vault Platform Team

SYMPTOMS:
- Alert: VaultSealed
- API returns 503
- Applications failing to authenticate

INVESTIGATION:
1. Check seal status:
   curl -s https://vault.internal/v1/sys/seal-status | jq

2. Check logs for seal trigger:
   kubectl logs -l app=vault --tail=100 | grep -i seal

3. Common causes:
   - Planned maintenance (verify change calendar)
   - Node restart without auto-unseal
   - HSM/KMS connectivity issue

REMEDIATION:

If Shamir seal:
1. Page unseal key custodians (minimum 3)
2. Each custodian provides their key:
   vault operator unseal <key_share>
3. Verify unsealed:
   vault status

If Auto-unseal (KMS):
1. Check KMS connectivity:
   vault operator diagnose
2. Verify KMS key permissions
3. Restart Vault pod to trigger auto-unseal:
   kubectl delete pod vault-0

POST-INCIDENT:
- Document root cause
- Review auto-unseal reliability
- Update alerting if necessary
```

### Runbook: Audit Backend Failure

```
RUNBOOK: audit-backend-failure
SEVERITY: P1
ON-CALL: Vault Platform Team, Security On-Call

SYMPTOMS:
- Alert: AuditBackendFailure
- Operations blocked (if all backends fail)
- Missing audit logs

CRITICAL: Vault blocks all operations if ALL audit backends fail.
         This is a security feature, not a bug.

INVESTIGATION:
1. Check audit backend status:
   vault audit list -detailed

2. Test each backend:
   # File backend
   ls -la /var/log/vault/audit.log

   # Syslog backend
   logger -p auth.info "test" && journalctl -t vault

   # Socket backend
   nc -zv siem.internal 514

REMEDIATION:
1. If file backend full:
   - Rotate logs: logrotate -f /etc/logrotate.d/vault
   - Expand volume if needed

2. If syslog unreachable:
   - Restart rsyslog: systemctl restart rsyslog

3. If SIEM unreachable:
   - Temporarily disable problematic backend:
     vault audit disable siem/
   - Fix connectivity
   - Re-enable: vault audit enable socket ...

IMPORTANT: At least one audit backend must be healthy at all times.
```
