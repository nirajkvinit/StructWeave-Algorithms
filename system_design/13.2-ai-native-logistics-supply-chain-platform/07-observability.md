# 13.2 AI-Native Logistics & Supply Chain Platform — Observability

## Observability Philosophy

The logistics platform has four distinct observability audiences with fundamentally different concerns:

1. **Engineering teams**: Ingestion throughput, solver latency, infrastructure health, pipeline lag
2. **Operations teams**: On-time delivery rates, route efficiency, warehouse productivity, fleet utilization
3. **Supply chain planners**: Forecast accuracy, inventory health, demand anomalies, disruption impact
4. **Compliance teams**: Cold chain compliance rates, driver HOS violations, audit trail completeness, regulatory SLA adherence

Each audience needs purpose-built dashboards. Raw infrastructure metrics (CPU utilization, stream lag) are necessary but insufficient—the system must emit business-semantic metrics from within application logic: "delivery SLA breach rate" cannot be computed from infrastructure counters alone.

---

## Key Metrics

### Delivery Performance Metrics (Operations)

| Metric | Description | Alert Threshold |
|---|---|---|
| **On-time delivery rate (OTD)** | % of shipments delivered within the SLA window | < 95% per carrier or per lane (sustained 24h) |
| **ETA accuracy (MAE)** | Mean absolute error between predicted and actual arrival time | > 60 min MAE for road shipments; > 4h for ocean |
| **Route plan adherence** | % of stops visited in the planned sequence (no skips or resequencing) | < 85% (indicates poor route quality or driver non-compliance) |
| **Delivery exception rate** | % of deliveries with exceptions (damaged, refused, address error) | > 5% for a single carrier or depot |
| **Average stops per route** | Route density indicating optimization effectiveness | < 12 stops/route for urban delivery (under-utilization) |
| **Vehicle utilization** | % of vehicle capacity (weight or volume) used per route | < 60% sustained (indicates consolidation opportunity) |
| **Proof-of-delivery capture rate** | % of deliveries with photo/signature POD | < 90% (compliance or app adoption issue) |
| **Last-mile cost per delivery** | Total route cost / deliveries completed | > 20% above lane benchmark |

### Forecast Accuracy Metrics (Planning)

| Metric | Description | Alert Threshold |
|---|---|---|
| **WMAPE (Weighted Mean Absolute Percentage Error)** | Forecast accuracy weighted by demand volume | > 30% at SKU-location level; > 15% at category-region level |
| **Forecast bias** | Systematic over- or under-forecasting (mean signed error) | |bias| > 10% sustained for 2+ weeks → model retraining |
| **P90 coverage rate** | % of actual demand values falling below the P90 quantile forecast | < 85% (model underestimates uncertainty) or > 98% (overestimates → excess inventory) |
| **Pinball loss by quantile** | Quantile-specific forecast quality metric | Degradation > 20% from baseline triggers review |
| **Regime change detection** | CUSUM control chart on forecast error detecting persistent shift | CUSUM crossing threshold → SEV-3 alert + planner notification |
| **New SKU forecast accuracy** | Accuracy for SKUs with < 12 weeks of history | Tracked separately; > 50% WMAPE expected; flag if > 70% |

### Warehouse Productivity Metrics (Operations)

| Metric | Description | Alert Threshold |
|---|---|---|
| **Picks per hour (PPH)** | Total picks completed / labor hours (human + AMR) | < 80% of warehouse benchmark → slotting or path issue |
| **AMR utilization** | % of AMR fleet actively performing tasks (not idle or charging) | < 60% (over-provisioned or task assignment issue) |
| **AMR deadhead distance** | Distance AMRs travel without carrying inventory (empty trips) | > 30% of total distance → path or slotting inefficiency |
| **Wave completion rate** | % of waves completed before cutoff time | < 95% → wave planning or capacity issue |
| **Bin fill rate** | % of warehouse bins occupied | > 95% (space pressure) or < 50% (under-utilized facility) |
| **Dock door turnaround time** | Time from truck arrival to departure at dock | > 120 min average → dock scheduling or staffing issue |
| **Slotting effectiveness** | Reduction in average pick travel distance after slotting optimization | < 5% improvement after re-slot → slotting model quality issue |

### Fleet Health Metrics (Fleet Management)

| Metric | Description | Alert Threshold |
|---|---|---|
| **Predictive maintenance accuracy** | % of predicted failures that occurred within the predicted horizon | < 70% (model under-predicting) or > 95% with many false positives |
| **Unplanned breakdown rate** | Vehicle breakdowns not predicted by maintenance model | > 2% of fleet per month |
| **Driver safety score distribution** | Distribution of driver safety scores (hard braking, speeding, fatigue indicators) | > 10% of drivers below safety threshold → training intervention |
| **Fuel efficiency (km/L or kWh/km)** | Per-vehicle fuel consumption normalized by route characteristics | > 15% above fleet average for same vehicle type → driver behavior or maintenance issue |
| **Telematics connectivity rate** | % of fleet vehicles reporting telematics within expected interval | < 95% → device or connectivity issue |
| **HOS compliance rate** | % of drivers in compliance with hours-of-service regulations | < 100% → immediate alert (regulatory violation) |

### Cold Chain Metrics (Compliance)

| Metric | Description | Alert Threshold |
|---|---|---|
| **Temperature excursion rate** | % of cold chain shipments with ≥ 1 temperature excursion | > 2% → investigation of equipment or process failure |
| **Excursion detection latency** | Time from excursion start to alert generation | > 60 seconds → sensor or pipeline issue |
| **Compliance documentation completeness** | % of cold chain shipments with complete audit trail (no gaps) | < 100% → immediate compliance alert |
| **Sensor connectivity gap rate** | % of cold chain shipments with > 30 min unverified interval | > 5% → sensor placement or connectivity review |

### Infrastructure Metrics (Engineering)

| Metric | Description | Alert Threshold |
|---|---|---|
| **Telemetry ingestion lag** | Stream consumer lag in seconds | > 30 sec → SEV-2 alert |
| **VRP solver p99 latency** | 99th percentile of route optimization computation time | > 5 sec for incremental; > 30 sec for full solve |
| **ETA computation throughput** | ETA predictions per second | < 15,000/sec (below required throughput for 5M shipments × 5-min cycle) |
| **Digital twin state freshness** | Age of oldest AMR position in digital twin | > 5 sec → AMR connectivity or twin update issue |
| **Forecast pipeline duration** | End-to-end time for daily forecast generation | > 4 hours → pipeline scaling needed |
| **Event processing error rate** | % of telemetry events that fail processing | > 0.1% → data quality or schema issue |

---

## Distributed Tracing

Every shipment is assigned a trace_id at creation. This trace_id propagates through all downstream processing:

```
Trace propagation:
  Order received → trace_id generated at API gateway
  ↓
  Route optimization → trace_id in solver request
  Carrier assignment → trace_id in carrier API call
  Telemetry ingestion → trace_id enriched per shipment
  ETA prediction → trace_id in inference request
  Customer notification → trace_id in notification event
  Proof-of-delivery → trace_id in POD record

Use cases:
  - Debug why a specific shipment's ETA was inaccurate (trace: which telemetry events
    were received, what features were extracted, what model produced the ETA)
  - Investigate a delivery SLA breach (trace: order time → route assignment → dispatch →
    each stop arrival vs. plan → where did the delay occur?)
  - Cold chain investigation (trace: all sensor readings, any excursions, who received
    the alert, what disposition was made)
  - Carrier dispute resolution (trace: shipment timeline shows carrier's actual vs.
    committed performance with timestamps from multiple independent sources)
```

---

## Alerting and On-Call Design

### Alert Tiers

| Tier | Condition | Response |
|---|---|---|
| **SEV-1 (Page immediately)** | Route engine unavailable (all new orders unassignable); telemetry ingestion stopped (no visibility); warehouse orchestrator down (AMR fleet halted); cold chain system failure (no excursion detection) | On-call engineer paged immediately; operations backup plan activated |
| **SEV-2 (Page within 15 min)** | Telemetry lag > 60 sec; VRP solver p99 > 10 sec; ETA pipeline throughput < 50% of target; single warehouse orchestrator down | On-call engineer paged |
| **SEV-3 (Business hours)** | Forecast accuracy degradation (WMAPE spike); OTD rate below threshold for a carrier or lane; driver safety score cluster below threshold; model drift detected | Operations analyst or ML engineer notified |
| **SEV-4 (Weekly digest)** | Vehicle utilization below target; warehouse bin fill rate trending high; forecast bias accumulating; carrier scorecard changes | Weekly operations review report |

### Operations-Specific Alerting

Operations alerts are routed to a separate on-call rotation (dispatch supervisor + operations manager) for domain-appropriate response:

- Delivery SLA breach imminent (ETA exceeds SLA window for a priority shipment) → dispatch intervention
- Cold chain excursion on pharmaceutical shipment → compliance officer + logistics coordinator paged
- Multiple vehicles reporting breakdowns in same region → fleet manager paged for capacity reallocation
- Warehouse wave completion at risk before cutoff time → shift supervisor paged

---

## Dashboards

### Delivery Operations Dashboard

```
Panels:
  [1] OTD rate by carrier and by lane (rolling 7 days, daily trend)
  [2] ETA accuracy: predicted vs. actual scatter plot (last 24 hours)
  [3] Active shipments map: real-time positions with status coloring
  [4] Delivery exceptions by type (damaged, refused, not-at-home, address error)
  [5] Route efficiency: average stops/route and vehicle utilization by depot
  [6] Last-mile cost per delivery trend (rolling 30 days)
```

### Forecast & Inventory Dashboard

```
Panels:
  [1] WMAPE by product category and region (heatmap, rolling 4 weeks)
  [2] Forecast bias trend: cumulative bias by category (line chart, 12-week window)
  [3] P90 coverage rate by category (should be ~90%; flag deviations)
  [4] Regime change alerts: SKU-locations with active CUSUM alerts
  [5] Safety stock adequacy: % of SKUs with inventory below safety stock
  [6] Dead stock detection: SKUs with zero demand for 90+ days
```

### Warehouse Operations Dashboard

```
Panels:
  [1] Picks per hour by warehouse (real-time, vs. target)
  [2] AMR fleet status: idle / picking / charging / maintenance (donut chart per warehouse)
  [3] Wave completion timeline: started, in-progress, completed, at-risk
  [4] Dock door utilization and turnaround time (per warehouse)
  [5] Bin utilization heatmap (by zone and aisle)
  [6] Slotting effectiveness: pick travel distance trend (before/after re-slot)
```

### Fleet Health Dashboard

```
Panels:
  [1] Predictive maintenance: vehicles with predicted failures in next 7 days (table)
  [2] Unplanned breakdowns by region (rolling 30 days)
  [3] Driver safety score distribution (histogram, with threshold line)
  [4] Fuel efficiency by vehicle type (box plot, flag outliers)
  [5] Telematics connectivity: % of fleet reporting on time (target: 95%)
  [6] HOS compliance: any violations flagged immediately (100% target)
```

---

## Model Monitoring and Drift Detection

### ETA Model Drift

```
Process:
  Daily: Compute MAE and bias for ETA predictions by transport mode, carrier, and lane
  Compare to baseline MAE established at model deployment
  MAE increase > 20% for a carrier or lane → SEV-3 alert; investigate data quality or
    carrier behavior change
  MAE increase > 40% platform-wide → SEV-2 alert; consider emergency model retraining

Why it matters:
  Carrier behavior changes (new carrier uses slower routes), infrastructure changes
  (highway construction), or seasonal patterns not captured in training data can cause
  ETA model accuracy to degrade silently. Without drift monitoring, customers receive
  increasingly inaccurate ETAs, eroding trust.
```

### Demand Forecast Regime Change Detection

```
Process:
  Per-SKU-location: Maintain CUSUM chart on forecast error (actual - predicted)
  CUSUM threshold: 3 standard deviations of historical error
  When threshold is crossed: flag SKU-location as "regime change detected"
  Planner notified; short-window model retrained for affected SKU-locations

Why it matters:
  A competitor's product launch, a regulatory change, or a supply disruption at a key
  supplier can cause demand to shift permanently. Without detection, the model continues
  forecasting based on the old regime, causing systematic stockouts or overstock.
```

### Predictive Maintenance Model Calibration

```
Process:
  Monthly: Compare predicted failure rates vs. actual failure rates by component type
  If predicted rate < 0.7 × actual rate → model under-predicting; increase maintenance
    frequency while model is retrained
  If predicted rate > 1.5 × actual rate → model over-predicting; excess maintenance costs
    Alert fleet management team

Why it matters:
  Vehicle aging, new vehicle models in the fleet, or operating condition changes (new routes
  with different road quality) affect component failure patterns. A maintenance model trained
  on last year's fleet may not apply to this year's fleet mix.
```
