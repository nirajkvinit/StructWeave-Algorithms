# Observability

## Metrics (USE/RED)

### Key Business Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|----------------|
| `signing.success_rate` | Percentage of signing requests that complete successfully | < 99.9% |
| `signing.latency_p99` | 99th percentile signing latency (ms) | > 2000ms |
| `dkg.success_rate` | Percentage of DKG ceremonies completing without retry | < 99% |
| `policy.deny_rate` | Percentage of transactions denied by policy | Sudden spike > 2x baseline |
| `gas.sponsorship_daily_usd` | Total gas sponsored in USD | > $3M (budget overrun) |
| `balance.staleness_p99` | Maximum age of cached balance data (seconds) | > 30s |
| `nonce.gap_count` | Number of nonce gaps detected across all addresses | > 0 (any gap is actionable) |

### Infrastructure Metrics (USE Method)

| Resource | Utilization | Saturation | Errors |
|----------|------------|------------|--------|
| **MPC Signer CPU** | CPU % during signing ceremonies | Signing queue depth | Failed MPC rounds |
| **HSM Operations** | Operations/sec per HSM module | Pending HSM requests | HSM timeout/error count |
| **TEE Memory** | Enclave memory usage % | Enclave page swap rate | Attestation failures |
| **Redis Cache** | Memory usage %; hit rate | Eviction rate | Connection errors |
| **Database** | Connection pool usage %; query time | Query queue depth | Deadlock count; replication lag |
| **RPC Nodes** | Request rate per node | Queue depth at node | HTTP 429/500 error rate |

### Service Metrics (RED Method)

| Service | Rate | Errors | Duration |
|---------|------|--------|----------|
| **Signing Orchestrator** | Signing requests/sec | Failed signings/sec; policy denials/sec | p50/p95/p99 signing latency |
| **Policy Engine** | Evaluations/sec | Evaluation errors/sec | p50/p95/p99 evaluation time |
| **Nonce Manager** | Nonce acquisitions/sec | Gap detections/sec; lock timeouts/sec | p50/p95/p99 acquisition time |
| **Balance Aggregator** | Queries/sec; cache hit rate | Stale responses/sec; fetch failures/sec | p50/p95/p99 response time |
| **AA Service** | UserOps submitted/sec | Bundler rejections/sec; reverted UserOps/sec | p50/p95/p99 submission-to-inclusion time |
| **Chain Adapter** | RPC calls/sec per chain | RPC errors/sec per chain | p50/p95/p99 RPC latency per chain |

### Dashboard Design

**Executive Dashboard:**
- Total assets under management (updated hourly)
- Daily signing volume (trend chart, 30-day)
- Signing success rate (real-time, last 24h)
- Gas sponsorship spend vs. budget
- Active wallets (DAU/MAU trend)

**Operations Dashboard:**
- Signing latency heatmap (by chain, by custody type)
- MPC signer node health (per-node CPU, memory, active sessions)
- HSM pool utilization and queue depth
- Nonce gap tracker (real-time, by chain)
- Pre-signing triple inventory (per wallet tier)

**Chain-Specific Dashboard (per blockchain):**
- RPC node health and latency
- Gas price trend and estimation accuracy
- Transaction confirmation times (mempool → confirmed)
- Pending transaction queue depth
- Block reorg detection events

**Security Dashboard:**
- Policy evaluation outcomes (allow/deny/pending breakdown)
- Key refresh operations (scheduled vs. emergency)
- Failed authentication attempts (by method)
- Anomalous signing patterns (unusual volume, unusual destinations)
- Travel Rule compliance rate

---

## Logging

### What to Log

| Event Category | Log Level | Fields | Example |
|---------------|-----------|--------|---------|
| **Signing request received** | INFO | request_id, wallet_id, chain, tx_type, source_ip | `Signing request received wallet=wlt_123 chain=ethereum` |
| **Policy evaluation result** | INFO | request_id, wallet_id, policy_id, result, rules_evaluated | `Policy evaluation result=approved rules=3 latency=8ms` |
| **MPC ceremony started** | INFO | session_id, wallet_id, quorum_nodes, protocol | `MPC ceremony started session=mpc_456 nodes=[1,2]` |
| **MPC round completed** | DEBUG | session_id, round_number, duration_ms | `MPC round 1 completed session=mpc_456 duration=45ms` |
| **Signing completed** | INFO | request_id, wallet_id, tx_hash, total_latency_ms | `Signing completed tx_hash=0xabc latency=180ms` |
| **Signing failed** | ERROR | request_id, wallet_id, error_code, error_message, retry_count | `Signing failed error=HSM_TIMEOUT retry=1` |
| **Nonce gap detected** | WARN | chain_id, address, expected_nonce, actual_nonce | `Nonce gap detected chain=ethereum expected=43 actual=45` |
| **Key refresh initiated** | INFO | wallet_id, old_version, new_version, reason | `Key refresh wallet=wlt_123 v1->v2 reason=scheduled` |
| **Policy change** | WARN | org_id, policy_id, changed_by, change_type | `Policy updated org=org_789 by=admin_001` |
| **Recovery initiated** | WARN | wallet_id, recovery_type, guardian_count | `Recovery initiated wallet=wlt_123 type=social guardians=3` |
| **Suspicious activity** | ALERT | wallet_id, reason, details | `Suspicious: 50 txns in 1min from wallet=wlt_123` |

### Log Levels Strategy

| Level | Use Case | Volume Expectation |
|-------|---------|-------------------|
| **DEBUG** | MPC round details, cache operations, RPC call details | High (10M+/day); sampled at 1% in production |
| **INFO** | Signing lifecycle events, policy results, balance updates | Medium (5M+/day); full retention |
| **WARN** | Nonce gaps, policy changes, degraded service, recovery events | Low (10K+/day); full retention + alerting |
| **ERROR** | Signing failures, HSM errors, MPC protocol errors | Low (< 1K/day target); full retention + immediate alerting |
| **ALERT** | Security events, key compromise indicators, compliance violations | Very Low; full retention + PagerDuty + compliance team notification |

### Structured Logging Format

```
{
  "timestamp": "2026-03-09T14:30:00.123Z",
  "level": "INFO",
  "service": "signing-orchestrator",
  "instance_id": "sign-3a",
  "trace_id": "abc123def456",
  "span_id": "789ghi",
  "event": "signing.completed",
  "wallet_id": "wlt_xyz789",
  "chain": "ethereum",
  "tx_hash": "0xdef456...",
  "latency_ms": 180,
  "mpc_session_id": "mpc_456",
  "quorum": [1, 2],
  "policy_decision": "approved",
  "nonce": 42,
  "gas_sponsored": true
}
```

**Sensitive Data Handling in Logs:**
- NEVER log key shares, encrypted share content, or HSM key references
- NEVER log full transaction payloads (log only tx_hash and calldata function selector)
- Mask user email to `n***@example.com`
- Blockchain addresses are logged in full (public data, needed for debugging)

---

## Distributed Tracing

### Trace Propagation Strategy

All services propagate W3C Trace Context headers (`traceparent`, `tracestate`). MPC ceremony rounds use a dedicated `mpc-session-id` header that correlates all inter-node communication within a single signing session.

### Key Spans to Instrument

```mermaid
flowchart TB
    subgraph Trace["Transaction Signing Trace"]
        SP1["api.sign_request
        (entry point)"]
        SP2["auth.verify_token
        (5ms)"]
        SP3["policy.evaluate
        (8ms)"]
        SP4["nonce.acquire
        (12ms)"]
        SP5["chain.build_tx
        (15ms)"]
        SP6["mpc.sign_ceremony
        (150ms)"]
        SP7["mpc.round_1
        (45ms)"]
        SP8["mpc.round_2
        (40ms)"]
        SP9["mpc.combine_sigs
        (5ms)"]
        SP10["chain.broadcast
        (50ms)"]
        SP11["audit.log_event
        (async, 3ms)"]

        SP1 --> SP2 --> SP3 --> SP4 --> SP5 --> SP6
        SP6 --> SP7 --> SP8 --> SP9
        SP6 --> SP10
        SP10 --> SP11
    end

    classDef root fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef span fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px
    classDef mpc fill:#fce4ec,stroke:#c62828,stroke-width:1px

    class SP1 root
    class SP2,SP3,SP4,SP5,SP10,SP11 span
    class SP6,SP7,SP8,SP9 mpc
```

### Cross-Service Trace Correlation

| Trace Boundary | Propagation Method |
|---------------|-------------------|
| Client → API Gateway | `X-Request-Id` header (client-generated) |
| API Gateway → Services | W3C `traceparent` header |
| Signing Orchestrator → Signer Nodes | `traceparent` + `mpc-session-id` |
| Service → Blockchain RPC | `traceparent` (for internal tracking; not sent to external nodes) |
| Service → Event Queue | Trace context embedded in message metadata |

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Escalation |
|-------|-----------|------------|
| **Signing failure rate > 1%** | error_rate(signing) > 0.01 for 2 min | Page on-call SRE immediately |
| **MPC signer node down** | Node heartbeat missing > 10s | Page on-call SRE + security team |
| **HSM unreachable** | All HSM health checks fail for 30s | Page on-call SRE + HSM vendor |
| **Nonce gap detected** | Any nonce gap on any address | Page on-call + auto-remediation attempt |
| **Key share access anomaly** | Unusual key share access pattern | Page security team immediately |
| **Signing below quorum** | Healthy signer nodes < threshold | Page CTO + SRE + security |
| **Paymaster balance critical** | Paymaster ETH balance < 24h of gas budget | Page on-call + finance team |

### Warning Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| **Signing latency degradation** | p99 > 1.5s for 5 min | Investigate MPC node performance; check HSM queue |
| **Pre-signing triple pool low** | Triples < 20% of target per wallet tier | Trigger batch pre-signing job |
| **RPC node degradation** | Error rate > 5% for specific chain | Failover to backup nodes; investigate |
| **Balance cache hit rate drop** | Hit rate < 80% for 10 min | Check cache eviction; investigate traffic pattern |
| **Gas price spike** | Gas price > 5x 1-hour average | Notify users; queue non-urgent transactions |
| **Policy evaluation latency spike** | p99 > 40ms for 5 min | Check policy cache; investigate complex policies |

### Runbook References

| Alert | Runbook |
|-------|---------|
| Signing failure rate spike | Check MPC node health → verify HSM connectivity → check nonce state → review recent deployments |
| Signer node down | Verify node status → check enclave health → activate backup node → initiate key refresh if compromise suspected |
| Nonce gap | Identify missing nonce → submit filler transaction → verify gap resolved → investigate root cause |
| Paymaster low balance | Check current balance → calculate runway → initiate replenishment → alert finance if > $100K needed |
| Key refresh failure | Verify all participating nodes healthy → check network connectivity between nodes → retry with extended timeout → escalate if 3rd retry fails |
