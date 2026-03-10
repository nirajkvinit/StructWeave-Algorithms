# Observability — AI-Native Mobile Money Super App Platform

## Key Metrics

### Transaction Health Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `txn.success_rate` | Percentage of transactions completing successfully (excluding user cancellations) | > 99.5% | < 99.0% over 5-min window |
| `txn.latency.p50` | Median end-to-end transaction latency | < 1.5s | > 2.5s |
| `txn.latency.p99` | 99th percentile transaction latency | < 5s | > 8s |
| `txn.throughput` | Transactions per second | Variable (1,000–8,000 TPS) | > 90% of provisioned capacity |
| `txn.reversal_rate` | Percentage of committed transactions subsequently reversed | < 0.1% | > 0.3% |
| `ledger.balance_sum` | Sum of all wallet balances vs. trust account total | Exact match (zero discrepancy) | Any non-zero discrepancy |
| `ledger.double_entry_violations` | Journal entries where debits ≠ credits | 0 | Any violation |

### USSD Session Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `ussd.session_completion_rate` | Sessions that reach their intended terminal state | > 92% | < 88% |
| `ussd.timeout_rate` | Sessions terminated by MNO timeout | < 5% | > 8% |
| `ussd.orphaned_post_commit_rate` | Sessions that dropped after transaction committed | < 0.5% | > 1% |
| `ussd.response_latency.p95` | 95th percentile platform response time per USSD screen | < 500ms | > 1s |
| `ussd.gateway_connection_pool` | Active connections per MNO gateway vs. limit | < 80% of limit | > 90% of limit |
| `ussd.error_rate_by_mno` | Error rate segmented by mobile network operator | < 1% per MNO | > 3% for any single MNO |

### Agent Network Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `agent.float_utilization` | Agent's current float / maximum float limit | 20%–80% | < 10% or > 95% |
| `agent.float_alerts_open` | Number of agents currently below float minimum | < 2% of agents | > 5% of agents |
| `agent.rebalance_response_time` | Time from float alert to dealer rebalancing action | < 4 hours (urban), < 8 hours (rural) | > 8 hours (urban), > 24 hours (rural) |
| `agent.offline_transaction_queue` | Count of unsynced offline transactions across all agents | < 1,000 | > 5,000 |
| `agent.daily_reconciliation_rate` | Percentage of agents completing daily cash reconciliation | > 90% | < 80% |

### Fraud Detection Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `fraud.detection_latency.p95` | Time from transaction submission to fraud decision | < 200ms | > 500ms |
| `fraud.block_rate` | Percentage of transactions blocked by fraud engine | 0.1%–0.5% | > 1% (may indicate false positives) or < 0.05% (may indicate detection gaps) |
| `fraud.false_positive_rate` | Blocked transactions that were legitimate (measured from appeal resolutions) | < 5% of blocks | > 10% of blocks |
| `fraud.sim_swap_detection_time` | Time between SIM swap event and wallet freeze | < 30s (real-time MNOs), < 4h (polling) | > 60s (real-time), > 8h (polling) |
| `fraud.model_drift_score` | Statistical drift in fraud model feature distributions | < 0.1 PSI | > 0.2 PSI (retrain trigger) |

### Credit Scoring & Lending Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `lending.approval_rate` | Percentage of loan requests approved | 60%–75% | < 50% or > 85% |
| `lending.default_rate_30d` | Loans overdue >30 days as percentage of disbursed | < 4% | > 6% |
| `lending.disbursement_latency` | Time from approval to wallet credit | < 30s | > 60s |
| `credit.score_computation_latency` | Fresh credit score computation time | < 5s | > 10s |
| `credit.model_auc` | Area under ROC curve for credit model | > 0.75 | < 0.70 |

---

## Logging Architecture

### Log Categories

| Category | Content | Retention | Volume |
|---|---|---|---|
| **Transaction audit log** | Immutable record of every ledger write: journal ID, wallet IDs, amounts, before/after balances, timestamp, channel, fraud score | 7 years (regulatory) | ~90M entries/day |
| **USSD session log** | Session ID, MSISDN (masked), menu navigation path, timing per screen, terminal state (complete/timeout/error) | 90 days | ~50M entries/day |
| **Fraud decision log** | Transaction ID, feature values, model scores, decision, contributing signals | 2 years | ~90M entries/day |
| **API access log** | Developer app ID, endpoint, request/response (PII redacted), latency, status code | 1 year | ~40M entries/day |
| **Agent activity log** | Agent ID, transaction type, float balance changes, reconciliation events | 2 years | ~15M entries/day |
| **System operational log** | Application logs, error traces, deployment events, configuration changes | 30 days | Variable |

### PII Protection in Logs

All logging infrastructure enforces PII protection:
- **MSISDN masking:** Phone numbers logged as `+254***5678` (last 4 digits only) in operational logs. Full MSISDN available only in audit logs with access-controlled query interface.
- **PIN exclusion:** PIN fields are never logged, even in encrypted form. USSD session logs record `PIN_ENTERED: true/false`, never the PIN value.
- **Balance redaction:** Wallet balances in operational logs are logged as ranges (`balance_band: "1K-10K"`) rather than exact values.
- **Structured redaction engine:** A centralized redaction engine processes all logs before storage, applying field-specific redaction rules. New log fields default to "redact" until explicitly marked safe.

---

## Distributed Tracing

### Trace Context Propagation

Every transaction generates a trace that spans multiple services. The trace context includes:
- **Trace ID:** Globally unique identifier for the end-to-end transaction flow
- **Span ID:** Per-service segment identifier
- **Channel marker:** USSD/APP/SMS/AGENT to identify the originating channel
- **Country code:** For multi-country log correlation

### Key Trace Spans

A P2P transfer trace includes these spans:

```
[USSD Gateway] session_handler          →  15ms
  └─[Idempotency] dedup_check           →   3ms
  └─[Fraud] rule_engine                 →   8ms
  └─[Fraud] ml_inference                → 120ms
  └─[Ledger] balance_check              →   5ms
  └─[Ledger] journal_write              →  45ms
    └─[Ledger] sync_replication         →  18ms
  └─[Notification] sms_dispatch         →  25ms (async, not on critical path)
  └─[USSD Gateway] render_confirmation  →   2ms
Total critical path:                     → 216ms (within 500ms budget)
```

### Cross-Service Correlation

For transactions that span multiple internal services (e.g., a nano-loan disbursement that involves the credit scoring service, lending service, and transaction engine), traces are correlated via the trace ID. The tracing system provides:
- **Waterfall visualization:** Timeline view showing each service's contribution to total latency
- **Dependency map:** Auto-generated service dependency graph from trace data
- **Latency attribution:** Which service contributed the most latency to the critical path
- **Error propagation:** When a transaction fails, which service in the chain raised the error

---

## Alerting Framework

### Alert Priority Levels

| Priority | Response SLA | Escalation | Examples |
|---|---|---|---|
| **P0 — Critical** | Acknowledge in 5 min, resolve or mitigate in 30 min | Immediate page to on-call SRE + engineering lead + compliance team (if financial) | Ledger balance discrepancy, transaction success rate <95%, platform-wide outage, mass fraud event |
| **P1 — High** | Acknowledge in 15 min, resolve in 2 hours | Page on-call SRE | Single MNO USSD gateway failure, fraud detection latency >500ms, database failover triggered, agent float crisis (>10% of agents below minimum) |
| **P2 — Medium** | Acknowledge in 1 hour, resolve in 8 hours | Notification to team channel | Elevated timeout rates for one MNO, credit model drift approaching retrain threshold, SMS delivery delays |
| **P3 — Low** | Address during business hours | Dashboard notification | Minor API error rate increase, single agent reconciliation discrepancy, non-critical service degradation |

### Alert Suppression and Correlation

- **Alert grouping:** Multiple alerts triggered by the same root cause (e.g., MNO gateway failure causing USSD timeout spike AND transaction success rate drop AND agent offline queue growth) are grouped into a single incident.
- **Maintenance windows:** Scheduled MNO maintenance windows suppress expected alerts. Alerts that persist beyond the maintenance window end time auto-escalate.
- **Flap detection:** Metrics that oscillate around a threshold don't generate repeated alerts. First alert fires; subsequent alerts suppressed for a cooldown period (configurable per metric).

---

## Dashboards

### 1. Executive Dashboard (Business Health)

- Total daily transaction value and volume (with trend over 30 days)
- Active user count (DAU, MAU) by country
- Revenue breakdown (fees, commissions, lending interest, insurance premiums)
- Agent network health summary (% active, % below float minimum)
- Customer satisfaction proxy (transaction completion rate, support ticket volume)

### 2. Transaction Operations Dashboard

- Real-time TPS gauge with capacity headroom indicator
- Transaction success/failure/pending breakdown by channel (USSD, App, SMS, Agent)
- Latency heatmap by hour-of-day (identifying peak periods)
- Failed transaction drilldown: error category distribution (insufficient balance, fraud block, timeout, system error)
- Ledger reconciliation status (real-time balance sum verification)

### 3. USSD Health Dashboard

- Per-MNO session metrics: completion rate, timeout rate, average session duration
- Screen-by-screen latency breakdown for each transaction flow
- Orphaned session tracker (post-commit sessions that needed SMS fallback)
- Gateway connection pool utilization per MNO
- Character count analysis (screens approaching 182-char limit in any language)

### 4. Fraud Operations Dashboard

- Real-time fraud score distribution (histogram of transaction risk scores)
- Blocked/held transaction queue with analyst assignment status
- SIM swap event timeline (detections, freezes, false positives)
- Fraud type trend analysis (SIM swap, social engineering, agent collusion over time)
- Model performance metrics (precision, recall, F1 by fraud category)
- Geographic fraud heatmap

### 5. Agent Network Dashboard

- Geographic map of agent network with float status color coding (green=healthy, yellow=low, red=critical)
- Dealer rebalancing activity (requests generated vs. fulfilled)
- Agent performance leaderboard and watchlist
- Offline transaction backlog by region
- Commission disbursement tracking

### 6. Lending & Credit Dashboard

- Loan portfolio summary (total outstanding, disbursements today, repayments today)
- Default rate trends by credit score band
- Credit model performance (AUC, calibration curve, approval rate by cohort)
- Repayment waterfall (on-time, 1-30 days late, 31-60 days, 60+ days, default)
- Feature drift monitoring for credit scoring inputs

---

## SLI/SLO Framework

### Service Level Indicators (SLIs)

| SLI | Measurement Method | Good Event Definition |
|---|---|---|
| **Transaction availability** | Ratio of successful transaction API responses to total requests | Response returned within timeout AND status is not 5xx |
| **Transaction latency** | End-to-end time from request receipt to ledger commit confirmation | Latency < 3 seconds for USSD, < 2 seconds for App |
| **USSD session quality** | Ratio of sessions reaching intended terminal state to total sessions initiated | Session completes the transaction flow OR user explicitly navigates away (not timeout/error) |
| **Ledger consistency** | Continuous comparison of wallet balance sum vs. trust account total | Discrepancy = 0 |
| **Fraud detection latency** | Time from transaction ingestion to fraud decision returned | Decision returned in < 200ms |
| **SMS delivery success** | Ratio of SMS confirmations confirmed delivered by MNO to total sent | Delivery confirmation received within 30 seconds |

### Service Level Objectives (SLOs)

| SLO | Target | Error Budget (monthly) | Measurement Window |
|---|---|---|---|
| **Transaction availability** | 99.95% | 21.6 minutes of downtime | Rolling 30 days |
| **Transaction latency (USSD)** | 95% of transactions < 3s | 5% of transactions may exceed 3s | Rolling 7 days |
| **Transaction latency (App)** | 99% of transactions < 2s | 1% of transactions may exceed 2s | Rolling 7 days |
| **USSD session quality** | 92% session completion rate | 8% sessions may not complete | Rolling 7 days |
| **Ledger consistency** | 100% (zero tolerance) | Zero error budget—any discrepancy is an incident | Continuous |
| **Fraud detection latency** | 99% < 200ms | 1% may exceed 200ms | Rolling 7 days |
| **SMS delivery** | 95% delivered within 10s | 5% may be delayed or fail | Rolling 7 days |

### Error Budget Policies

- **Transaction availability:** If error budget is <25% remaining, freeze all non-critical deployments. If exhausted, engage incident response for reliability remediation.
- **Ledger consistency:** Zero tolerance. Any discrepancy triggers P0 incident immediately, regardless of error budget.
- **USSD session quality:** If completion rate drops below 88% for any single MNO for >1 hour, engage MNO technical team for joint investigation.
