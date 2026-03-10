# Observability — Package Registry

## 1. Metrics

### 1.1 Download Metrics

| Metric | Type | Labels | Purpose |
|---|---|---|---|
| `registry.downloads.total` | Counter | `package`, `version`, `region`, `source` (cdn/origin) | Total download volume tracking |
| `registry.downloads.latency` | Histogram | `region`, `source`, `cache_status` (hit/miss) | Download latency distribution |
| `registry.downloads.bandwidth_bytes` | Counter | `region`, `source` | Bandwidth consumption tracking |
| `registry.downloads.errors` | Counter | `error_type` (404, 500, timeout), `region` | Download failure tracking |
| `registry.cdn.hit_rate` | Gauge | `content_type` (artifact/metadata), `region` | CDN effectiveness monitoring |
| `registry.cdn.origin_rps` | Gauge | `endpoint` | Origin server load (should be <2% of total) |

### 1.2 Publish Metrics

| Metric | Type | Labels | Purpose |
|---|---|---|---|
| `registry.publish.total` | Counter | `status` (success/failure/conflict), `scope` | Publish volume and success rate |
| `registry.publish.latency` | Histogram | `stage` (auth, validate, store, commit) | Per-stage publish latency breakdown |
| `registry.publish.artifact_size_bytes` | Histogram | `scope` | Package size distribution |
| `registry.publish.new_packages` | Counter | `scope` | New package creation rate |
| `registry.publish.new_versions` | Counter | `scope` | New version creation rate |
| `registry.publish.validation_errors` | Counter | `error_type` (name, version, manifest, size) | Manifest validation failure patterns |

### 1.3 Security Metrics

| Metric | Type | Labels | Purpose |
|---|---|---|---|
| `registry.scan.queue_depth` | Gauge | `scanner_type` | Scan backlog monitoring |
| `registry.scan.latency` | Histogram | `scanner_type`, `verdict` | Time from publish to scan completion |
| `registry.scan.verdicts` | Counter | `scanner_type`, `verdict` (clean/quarantine/review) | Scan result distribution |
| `registry.scan.quarantined` | Counter | `reason` | Quarantine events (malware, typosquat, etc.) |
| `registry.security.2fa_adoption` | Gauge | `package_tier` (hot/popular/all) | 2FA coverage across maintainers |
| `registry.security.provenance_coverage` | Gauge | `scope` | % of publishes with provenance attestation |
| `registry.security.advisory_count` | Gauge | `severity` | Active security advisories |

### 1.4 Resolution Metrics

| Metric | Type | Labels | Purpose |
|---|---|---|---|
| `registry.resolution.latency` | Histogram | `status` (success/conflict/timeout) | Dependency resolution time |
| `registry.resolution.depth` | Histogram | | Transitive dependency tree depth |
| `registry.resolution.package_count` | Histogram | | Number of packages in resolved tree |
| `registry.resolution.conflicts` | Counter | | Resolution conflicts requiring backtracking |
| `registry.resolution.cache_hit_rate` | Gauge | `cache_type` (metadata/partial_solution) | Resolution cache effectiveness |

### 1.5 Infrastructure Metrics

| Metric | Type | Labels | Purpose |
|---|---|---|---|
| `registry.storage.total_bytes` | Gauge | `type` (artifact/metadata) | Storage consumption |
| `registry.storage.deduplication_ratio` | Gauge | | Content-addressable dedup effectiveness |
| `registry.db.connections_active` | Gauge | `pool` (primary/replica) | Database connection pool utilization |
| `registry.db.query_latency` | Histogram | `query_type`, `table` | Database query performance |
| `registry.db.replication_lag_ms` | Gauge | `replica` | Read replica freshness |
| `registry.cache.hit_rate` | Gauge | `cache_name` | Cache effectiveness |
| `registry.cache.evictions` | Counter | `cache_name` | Cache pressure indicator |

---

## 2. Dashboards

### 2.1 Registry Health Dashboard

**Purpose:** Real-time overview of registry health for on-call engineers.

**Panels:**

| Panel | Visualization | Key Signals |
|---|---|---|
| **Download RPS** | Time series, split by region | Current vs 7-day-ago comparison; alert on >20% deviation |
| **CDN Hit Rate** | Gauge (target: >98%) | Artifact hit rate vs metadata hit rate |
| **Publish Rate** | Time series | Current publish rate vs daily average |
| **Error Rate** | Time series, split by endpoint | Download errors, publish errors, search errors |
| **P99 Latency** | Time series, split by endpoint | Download P99, metadata P99, publish P99 |
| **Active Quarantines** | Counter + recent list | Packages quarantined in last 24h |
| **Scan Queue Depth** | Time series | Current depth vs capacity; alert threshold |

### 2.2 Package Health Dashboard

**Purpose:** Per-package metrics for maintainers and ecosystem health monitoring.

**Panels:**

| Panel | Visualization | Data |
|---|---|---|
| **Download Trends** | Line chart (7d, 30d, 90d) | Daily downloads with version release markers |
| **Version Timeline** | Event timeline | Publish events, yank events, advisory events |
| **Dependency Health** | Table with status icons | Direct dependencies with vulnerability status |
| **Security Posture** | Scorecard | 2FA enabled, provenance present, scan status, advisory count |
| **Dependent Count** | Counter + trend | How many packages depend on this one |

### 2.3 Supply Chain Security Dashboard

**Purpose:** Ecosystem-wide security posture for the security team.

**Panels:**

| Panel | Visualization | Data |
|---|---|---|
| **Scan Pipeline** | Funnel chart | Published → scanned → clean/quarantined/review |
| **Malware Detections** | Time series + alert | Quarantined packages per day, trending |
| **Typosquatting Attempts** | Time series | Blocked and flagged typosquatting per day |
| **Provenance Adoption** | Trend line | % of publishes with valid provenance over time |
| **2FA Coverage** | Heatmap by download tier | % of maintainers with 2FA by package popularity |
| **Active Advisories** | Table sorted by severity | Open CVEs with affected package count |
| **Mean Time to Quarantine** | Gauge (target: <10 min) | Average time from publish to quarantine decision |

---

## 3. Logging

### 3.1 Structured Log Schema

All log events use a consistent structured format:

```
{
    "timestamp": "2025-06-20T14:22:00.123Z",
    "level": "INFO",
    "service": "publish-service",
    "trace_id": "abc123def456",
    "span_id": "789ghi",
    "event": "version_published",
    "package": "@scope/package-name",
    "version": "2.3.1",
    "publisher": "user-id-hash",
    "artifact_hash": "sha512-...",
    "artifact_size": 156000,
    "latency_ms": 1250,
    "metadata": {
        "dep_count": 5,
        "has_install_scripts": false,
        "has_provenance": true
    }
}
```

### 3.2 Log Categories

| Category | Retention | Volume | Purpose |
|---|---|---|---|
| **Publish events** | 2 years | ~50K/day | Audit trail, incident response |
| **Download access logs** | 30 days | ~6.7B/day | Traffic analysis, abuse detection (sampled at 1%) |
| **Security scan results** | 5 years | ~50K/day | Forensics, false positive analysis |
| **Authentication events** | 1 year | ~100K/day | Account security, brute force detection |
| **API errors** | 90 days | Variable | Debugging, reliability tracking |
| **CDN access logs** | 7 days | Billions/day | Traffic analysis (aggregated, not per-request) |

### 3.3 Download Log Sampling

At 200B downloads/month, logging every request would generate petabytes of logs. Instead:

```
FUNCTION should_log_download(request):
    // Always log errors
    IF request.status >= 400 THEN RETURN TRUE

    // Always log origin hits (cache misses)
    IF request.source == "origin" THEN RETURN TRUE

    // Sample CDN hits at 0.1%
    IF random() < 0.001 THEN RETURN TRUE

    // Always log downloads of quarantined packages
    IF request.package.scan_status == "quarantined" THEN RETURN TRUE

    RETURN FALSE
```

---

## 4. Distributed Tracing

### 4.1 Trace Propagation

Every API request receives a trace ID that propagates through all services:

```
Publish trace example:

[Client] → [API Gateway] → [Auth Service] → [Publish Service]
                                                ├→ [Blob Storage]
                                                ├→ [Metadata DB]
                                                ├→ [Transparency Log]
                                                ├→ [CDN Purge]
                                                └→ [Scan Queue]
                                                    ├→ [Malware Scanner]
                                                    ├→ [Vuln Scanner]
                                                    ├→ [Typosquat Scorer]
                                                    └→ [SBOM Generator]
```

### 4.2 Key Trace Spans

| Span | Parent | Key Attributes |
|---|---|---|
| `publish.request` | Root | `package`, `version`, `publisher` |
| `publish.auth` | `publish.request` | `token_type`, `2fa_used` |
| `publish.validate` | `publish.request` | `manifest_valid`, `error_type` |
| `publish.store_blob` | `publish.request` | `artifact_hash`, `size_bytes`, `deduplicated` |
| `publish.write_metadata` | `publish.request` | `transaction_duration`, `dep_count` |
| `publish.transparency_log` | `publish.request` | `log_entry_id` |
| `publish.enqueue_scan` | `publish.request` | `queue_depth` |
| `scan.malware` | async from `publish.enqueue_scan` | `verdict`, `confidence`, `duration` |
| `scan.typosquatting` | async from `publish.enqueue_scan` | `risk_score`, `similar_to` |
| `download.metadata` | Root | `package`, `cache_status`, `response_size` |
| `download.artifact` | Root | `content_hash`, `cache_status`, `cdn_pop` |

---

## 5. Alerting

### 5.1 Critical Alerts (Page Immediately)

| Alert | Condition | Response |
|---|---|---|
| **Origin down** | Origin error rate > 50% for 2+ minutes | Verify CDN serving stale; engage on-call for origin recovery |
| **Mass quarantine** | > 10 packages quarantined in 1 hour | Possible coordinated attack; investigate scanner findings |
| **Metadata DB primary failure** | Replication lag > 30s or primary unreachable | Verify automated failover; check publish availability |
| **Download error spike** | Error rate > 1% for 5+ minutes | Check CDN health, origin capacity, blob storage |
| **Publish path down** | Publish success rate < 95% for 5+ minutes | Investigate auth service, DB connections, blob storage |
| **Transparency log divergence** | Log checkpoint verification fails | Possible tampering; halt publishes; investigate |

### 5.2 Warning Alerts (Investigate Within 1 Hour)

| Alert | Condition | Response |
|---|---|---|
| **Scan queue backlog** | Queue depth > 5,000 for 15+ minutes | Scale scanner fleet; check for slow scans |
| **CDN hit rate drop** | Hit rate < 95% for 30+ minutes | Investigate cache eviction patterns; check for purge storms |
| **Replication lag** | DB replica lag > 5s for 10+ minutes | Check replica health; investigate write load |
| **Download latency** | P99 > 1s for 15+ minutes | Check CDN PoP health; investigate origin latency |
| **Unusual publish pattern** | > 3× normal publish rate for 30+ minutes | Possible automated spam; investigate publisher accounts |
| **Storage growth anomaly** | Daily storage growth > 2× 7-day average | Investigate large package uploads; check dedup |

### 5.3 Informational Alerts (Review Daily)

| Alert | Condition | Response |
|---|---|---|
| **New security advisory** | New CVE affecting registry packages | Review advisory, verify automated propagation |
| **Provenance coverage milestone** | Provenance adoption crosses 10% threshold | Celebrate; adjust adoption targets |
| **Popular package ownership change** | Top-1000 package gains new maintainer | Review for social engineering attack |
| **Token usage anomaly** | Token used from unusual geography | Notify token owner; monitor for abuse |

---

## 6. Audit and Compliance Reporting

### 6.1 Automated Compliance Reports

| Report | Frequency | Contents |
|---|---|---|
| **Package integrity report** | Weekly | Random-sample blob hash verification results |
| **2FA adoption report** | Monthly | 2FA coverage by package tier |
| **Scan coverage report** | Daily | % of versions scanned, scan SLO compliance |
| **Advisory response report** | Weekly | Mean time from CVE publication to advisory creation |
| **Token hygiene report** | Monthly | Expired tokens, unused tokens, over-permissioned tokens |
| **Access control report** | Quarterly | Ownership changes, permission grants, scope memberships |

### 6.2 Incident Response Metrics

| Metric | Target | Measurement |
|---|---|---|
| **Mean time to detect malware** | < 10 minutes | Time from publish to quarantine |
| **Mean time to notify dependents** | < 1 hour | Time from quarantine to dependent notification |
| **Mean time to publish advisory** | < 24 hours | Time from CVE report to registry advisory |
| **False positive rate** | < 0.1% | Quarantined packages later determined clean |
| **False negative rate** | < 0.01% | Malware discovered after scan marked clean |
