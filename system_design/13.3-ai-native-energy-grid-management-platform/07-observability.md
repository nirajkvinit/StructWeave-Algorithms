# 13.3 AI-Native Energy & Grid Management Platform — Observability

## Observability Philosophy

Grid management platform observability operates under unique constraints compared to typical software systems. The platform manages physical infrastructure where monitoring gaps can lead to equipment damage, blackouts, and regulatory violations. Observability must cover three distinct planes: the **physical grid** (voltage, frequency, equipment health), the **computational pipeline** (state estimation, OPF, forecasting), and the **DER fleet** (device connectivity, dispatch compliance, communication health). Each plane has different latency requirements—grid metrics need sub-second visibility, pipeline health needs second-level visibility, and DER fleet metrics can tolerate minute-level aggregation.

---

## Grid Operations Metrics

### Frequency and Power Balance

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `grid.frequency_hz` | System frequency (nominal 60 Hz / 50 Hz) | 60.000 ± 0.020 Hz | < 59.95 or > 60.05 Hz |
| `grid.ace_mw` | Area Control Error (actual vs. scheduled interchange) | ± 50 MW | |ACE| > 100 MW for > 5 min |
| `grid.total_load_mw` | Total system load | Per forecast | Deviation > 5% from forecast |
| `grid.total_generation_mw` | Total generation output | Matches load + losses | Imbalance > 2% |
| `grid.renewable_penetration_pct` | Renewable generation as % of total load | Informational | > 80% (situational awareness) |
| `grid.spinning_reserve_mw` | Available spinning reserve capacity | ≥ largest single contingency | < contingency requirement |
| `grid.tie_line_deviation_mw` | Deviation from scheduled tie-line flows | ± 20 MW | |deviation| > 50 MW |

### Equipment Health

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `equipment.transformer.loading_pct` | Transformer loading as % of rating | < 80% normal | > 100% emergency |
| `equipment.transformer.oil_temp_c` | Transformer top-oil temperature | < 85°C | > 95°C |
| `equipment.transformer.dga_h2_ppm` | Dissolved hydrogen gas (indicates arcing) | < 100 ppm | > 300 ppm |
| `equipment.line.loading_pct` | Transmission line thermal loading | < 85% | > 100% (thermal violation) |
| `equipment.line.sag_meters` | Conductor sag (thermal expansion) | < clearance limit | Within 1 meter of ground clearance |
| `equipment.breaker.operation_count` | Cumulative breaker operations | < mechanical life limit | > 80% of rated operations |
| `equipment.capacitor.reactive_output_mvar` | Capacitor bank output | Per dispatch command | Deviation > 10% from command |

### Voltage Quality

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `voltage.bus_pu` | Per-bus voltage magnitude (per-unit) | 0.95 – 1.05 pu | < 0.93 or > 1.07 pu |
| `voltage.violation_count` | Number of buses with voltage outside limits | 0 | > 0 |
| `voltage.customer_service_v` | Customer service voltage (120V/240V nominal) | 114V – 126V | < 108V or > 132V (ANSI C84.1) |
| `voltage.harmonic_thd_pct` | Total harmonic distortion | < 5% | > 8% |

---

## Computational Pipeline Metrics

### State Estimation

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `se.computation_time_ms` | State estimation wall-clock time | < 500 ms | > 800 ms (approaching cycle limit) |
| `se.chi_squared` | Weighted residual norm (goodness of fit) | < 1.2 × expected | > 2.0 (model mismatch) |
| `se.bad_data_count` | Measurements flagged as bad data per cycle | < 10 | > 50 (sensor array failure) |
| `se.observability_pct` | % of network that is observable | 100% | < 98% (unmonitored zones) |
| `se.convergence_iterations` | Number of Newton-Raphson iterations | 3–5 | > 8 (convergence difficulty) |
| `se.topology_changes_per_hour` | Breaker status changes detected | Informational | > 20/hour (unusual switching activity) |

### Optimal Power Flow

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `opf.computation_time_ms` | OPF solve wall-clock time | < 1,500 ms | > 2,500 ms |
| `opf.objective_cost_per_mwh` | Generation cost from OPF solution | Market-competitive | > 2x historical average |
| `opf.constraint_violations` | Number of binding/violated constraints | 0 violations | > 0 violations |
| `opf.relaxation_gap_pct` | Gap between SOCP relaxation and AC feasibility check | < 0.1% | > 1% (relaxation not tight) |
| `opf.dispatch_change_mw` | Total set-point change from previous cycle | Informational | > 500 MW/cycle (unusual ramp) |

### Contingency Screening

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `contingency.screening_time_s` | Full N-1 screening wall-clock time | < 30 s | > 45 s |
| `contingency.violations_count` | Contingencies with post-contingency violations | 0 | > 0 (RAS must be armed) |
| `contingency.most_severe_loading_pct` | Worst post-contingency line loading | < 100% | > 110% |
| `contingency.ras_armed_count` | Number of armed remedial action schemes | Informational | > 10 (system under stress) |

---

## Renewable Forecast Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `forecast.mae_mw` | Mean absolute error (last 24h, per plant) | < 8% of nameplate | > 15% sustained for > 6h |
| `forecast.bias_mw` | Systematic over/under-forecast (7-day rolling) | ± 2% of nameplate | |bias| > 5% (model drift) |
| `forecast.calibration_pit` | PIT histogram uniformity (Kolmogorov-Smirnov) | p-value > 0.05 | p-value < 0.01 (miscalibrated) |
| `forecast.ramp_event_hit_rate` | % of actual ramp events detected in advance | > 80% | < 60% |
| `forecast.ramp_false_alarm_ratio` | % of ramp alerts that were false alarms | < 30% | > 50% |
| `forecast.nwp_staleness_min` | Time since latest NWP model ingested | < 120 min | > 360 min (NWP feed down) |
| `forecast.pipeline_latency_min` | End-to-end forecast pipeline time | < 5 min | > 15 min |

---

## DER Fleet Metrics

### Device Connectivity

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `der.online_count` | DERs currently communicating | > 95% of enrolled | < 90% (communication issue) |
| `der.heartbeat_timeout_count` | DERs missing heartbeat > 5 minutes | < 2% of fleet | > 5% |
| `der.communication_latency_p95_ms` | Round-trip communication time | < 5,000 ms | > 10,000 ms |
| `der.certificate_expiry_30d_count` | DERs with certificates expiring within 30 days | 0 | > 100 (renewal pipeline issue) |
| `der.firmware_outdated_count` | DERs on outdated firmware | < 5% | > 15% |

### VPP Performance

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `vpp.dispatch_compliance_pct` | % of DERs that complied with dispatch signal | > 90% | < 80% |
| `vpp.delivery_vs_commitment_pct` | Actual delivered MW vs. market commitment | > 95% | < 90% (penalty risk) |
| `vpp.response_time_p95_s` | Time from dispatch signal to measured response | < 10 s (freq reg) | > 30 s |
| `vpp.battery_avg_soc_pct` | Average SoC across battery fleet | 40–80% | < 20% or > 95% (fleet exhaustion/saturation) |
| `vpp.ev_plugged_in_pct` | % of enrolled EVs currently plugged in | Informational | < 20% during committed period |
| `vpp.market_revenue_per_mw_day` | Revenue earned per MW of VPP capacity per day | Market-dependent | < 50% of 30-day average |

### Demand Response

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `dr.event_count_mtd` | DR events dispatched month-to-date | Per program rules | > program limit (customer fatigue) |
| `dr.participation_rate_pct` | % of enrolled customers who responded | > 70% | < 50% |
| `dr.load_reduction_mw` | Actual load reduction achieved | > 80% of target | < 60% of target |
| `dr.rebound_peak_pct` | Post-event rebound peak as % of normal load | < 110% | > 125% (stagger failure) |

---

## AMI Pipeline Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `ami.ingestion_rate_readings_per_sec` | Current meter read ingestion rate | Per expected schedule | < 50% of expected during collection window |
| `ami.queue_depth` | Message queue depth for meter reads | < 1M readings | > 5M readings (backlog forming) |
| `ami.vee_pass_rate_pct` | % of readings passing validation | > 99% | < 97% (data quality issue) |
| `ami.estimation_rate_pct` | % of intervals requiring estimation (gap fill) | < 2% | > 5% (communication degradation) |
| `ami.collection_success_rate_pct` | % of meters successfully collected in window | > 98% | < 95% |
| `ami.theft_alerts_daily` | Theft detection alerts generated per day | < 0.1% of meters | > 0.5% (threshold too sensitive or real spike) |

---

## Dashboard Structure

### Control Room Primary Display

```
┌──────────────────────────────────────────────────────────────────┐
│ GRID STATUS: NORMAL          Frequency: 60.003 Hz    Load: 15.2 GW │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Generation Mix ──────┐  ┌─ Contingency Status ────────────┐ │
│  │ Gas:     8.2 GW (54%) │  │ N-1 Violations:  0              │ │
│  │ Solar:   3.1 GW (20%) │  │ RAS Armed:       2              │ │
│  │ Wind:    1.8 GW (12%) │  │ Most Severe:     Line A-B 87%   │ │
│  │ Nuclear: 1.5 GW (10%) │  │ Last Screening:  12 sec ago     │ │
│  │ Hydro:   0.6 GW  (4%) │  │                                 │ │
│  └───────────────────────┘  └─────────────────────────────────┘ │
│                                                                  │
│  ┌─ Renewable Forecast ──────────────────────────────────────┐  │
│  │ Solar next 4h: ████████████░░░░ 3.1→0.4 GW (ramp ↓ 87%) │  │
│  │ Wind  next 4h: ████████████████ 1.8→2.1 GW (stable)      │  │
│  │ Ramp Alerts: ⚠ Solar ramp-down 5-7 PM (confidence: 92%)  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ VPP Fleet Status ───┐  ┌─ DR Status ─────────────────────┐ │
│  │ Active VPPs:    287   │  │ Program: Summer Peak DR          │ │
│  │ DERs Online: 4.7M/5M │  │ Events Today: 0                  │ │
│  │ Available:   48.2 MW  │  │ Enrolled: 2.1M customers         │ │
│  │ Dispatched:  12.5 MW  │  │ Available Load: 850 MW           │ │
│  │ Compliance:  93.1%    │  │ Last Event: 3 days ago           │ │
│  └───────────────────────┘  └─────────────────────────────────┘ │
│                                                                  │
│  ┌─ Pipeline Health ────────────────────────────────────────┐   │
│  │ State Est: 423 ms ✓  OPF: 1.2s ✓  N-1: 18s ✓           │   │
│  │ AMI Queue: 234K ✓    Forecast: 3.2 min ago ✓             │   │
│  │ DER Heartbeats: 94.2% ✓                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Alerting Strategy

### Alert Severity Classification

| Severity | Response Time | Examples | Notification Channel |
|---|---|---|---|
| **CRITICAL** | Immediate (auto-action) | Frequency deviation > 0.5 Hz, N-1 violation detected, FLISR fault detected | Audible alarm in control room + auto-remedial action |
| **HIGH** | < 5 minutes | Transformer overload > 100%, VPP delivery shortfall > 10%, SCADA communication loss to substation | Control room alarm + on-call engineer page |
| **MEDIUM** | < 30 minutes | Forecast error > 15% sustained, DER fleet online < 90%, AMI queue depth > 5M | Control room notification + email |
| **LOW** | < 4 hours | Theft detection alert, certificate expiry warning, forecast model calibration drift | Dashboard highlight + daily report |
| **INFO** | Daily review | Equipment approaching maintenance threshold, firmware update available, market revenue analysis | Daily summary email |

### Alert Deduplication and Suppression

```
Deduplication rules:
  - Same metric, same resource, same severity: suppress duplicates for 15 minutes
  - Related alerts: group by root cause
    Example: SCADA communication loss to substation X →
    suppress individual measurement timeout alerts for all points at X

Suppression during known events:
  - Planned maintenance window: suppress alerts for affected equipment
  - Active storm: elevate outage prediction alerts, suppress routine equipment alerts
  - Market volatility: suppress market price spike alerts (expected behavior)

Escalation:
  - HIGH alert unacknowledged for 10 minutes → escalate to supervisor
  - CRITICAL auto-action failure → escalate to engineering + management
  - Any NERC-reportable event → automatic compliance team notification
```

---

## Distributed Tracing for Control Actions

Every automated control action generates a trace that spans the full decision chain:

```
Trace: Dispatch Set-Point Change (Generator G5)
  ├─ [0 ms] SCADA measurement received (bus voltage 1.048 pu)
  ├─ [15 ms] State estimator processed measurement
  ├─ [520 ms] State estimation completed (grid state vector #48291)
  ├─ [540 ms] OPF solver started with new state
  ├─ [1,850 ms] OPF solution: G5 set-point 245 MW → 260 MW
  ├─ [1,860 ms] Command validation: ramp rate check PASS (15 MW/min limit, 15 MW change)
  ├─ [1,870 ms] Command authorized: signed by OPF engine service certificate
  ├─ [1,880 ms] Command sent to SCADA server
  ├─ [1,920 ms] DNP3 command sent to G5 RTU
  ├─ [2,150 ms] G5 RTU acknowledgment received
  ├─ [6,200 ms] Next SCADA scan confirms G5 output ramping (248 MW)
  └─ [10,400 ms] G5 output reaches 260 MW (verified)

Trace stored in: tamper-evident audit log
Retention: 7 years (NERC CIP requirement)
```
