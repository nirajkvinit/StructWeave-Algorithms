# 14.7 AI-Native SMB Workforce Scheduling & Gig Management — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **AI-powered schedule generation** — Automatically generate weekly schedules based on predicted labor demand, employee availability, skills/certifications, labor law constraints, employee preferences, and cost targets; support single-click schedule generation with manager review and approval workflow | Solver must produce a feasible schedule within 10 seconds for businesses with ≤ 100 employees; support incremental re-optimization when constraints change mid-week |
| FR-02 | **Demand forecasting engine** — Predict labor demand at 15-minute granularity using historical POS/sales data, weather forecasts, local event calendars, holiday schedules, and business-specific patterns; provide demand forecasts 14 days in advance with confidence intervals | Forecast accuracy: MAPE ≤ 15% for businesses with 8+ weeks of data; cold-start accuracy within 25% using industry priors and transfer learning; support manual override with AI-assisted blending |
| FR-03 | **Labor law compliance engine** — Enforce jurisdiction-specific labor regulations including overtime rules (daily/weekly), mandatory rest periods, predictive scheduling ordinances (advance notice, premium pay for changes), minor work restrictions, break requirements, and split-shift rules; validate all schedule versions before publication | Support 50+ state and 15+ municipal rule sets; rules are versioned and updated within 72 hours of legislative changes; block hard violations, warn on soft violations with override-and-document capability |
| FR-04 | **Shift swap and open shift marketplace** — Enable employees to post shifts for swap, claim open shifts, and request time-off through a self-service mobile interface; automatically validate swaps against compliance rules and skill requirements; support manager approval workflows | Swap validation latency ≤ 500 ms; auto-match suggestions based on availability and skills; configurable auto-approval for swaps that pass all compliance checks; notification delivery within 5 seconds |
| FR-05 | **Gig worker marketplace integration** — Broadcast unfillable shifts to a pool of pre-vetted gig workers; match gig workers by skills, certifications, proximity, reliability score, and rate; integrate accepted gig workers into the same schedule view with identical operational controls | Gig worker response time target: fill 80% of broadcast shifts within 60 minutes; support rate negotiation within manager-defined ranges; consolidated invoicing across employee payroll and gig worker payments |
| FR-06 | **Geofenced attendance tracking** — Verify clock-in/clock-out via GPS geofencing (configurable radius 50–500m), optional facial recognition, and schedule-aware time windows; generate automated timesheets; detect anomalies (GPS spoofing, buddy punching, phantom hours) | GPS accuracy ≤ 10m with spoofing detection; clock-in window configurable (default: 5 minutes before to 15 minutes after shift start); timesheet auto-generation with exception flagging for manager review |
| FR-07 | **Real-time overtime and cost tracking** — Monitor accumulated work hours against overtime thresholds in real-time; provide predictive alerts when employees approach daily/weekly overtime limits; calculate real-time labor cost as a percentage of projected revenue | Alert managers 2 hours before an employee would enter overtime; dashboard shows live labor-cost-to-revenue ratio; support overtime budget allocation per department/location |
| FR-08 | **Multi-location management** — Support cross-location employee sharing, location-level labor budgets, jurisdiction-specific compliance rules per location, and portfolio-level analytics; enable floater employees who work across multiple locations | Unified schedule view across locations; cross-location shift assignment with travel time consideration; per-location compliance rule binding; roll-up reporting at organization level |
| FR-09 | **Employee communication hub** — Push schedule updates, shift reminders, open shift notifications, and compliance alerts via push notification, SMS, and in-app messaging; support two-way messaging between managers and employees | Notification delivery ≤ 5 seconds for schedule changes; read receipts for compliance-critical communications; configurable notification preferences per employee; multi-language support |
| FR-10 | **POS and payroll integration** — Integrate with popular SMB POS systems (for demand data) and payroll providers (for timesheet export); support bi-directional sync for employee records, pay rates, and time entries | Pre-built integrations with 10+ POS systems and 10+ payroll providers; webhook-based real-time sync; CSV/API export for unsupported systems; data mapping configuration per integration |
| FR-11 | **Schedule templates and auto-scheduling rules** — Allow managers to define recurring schedule templates, auto-assignment rules (e.g., "always schedule Sarah for Sunday brunch"), and constraint overrides; support copy-forward from previous weeks with AI-adjusted modifications | Template library per business; rule priority system for conflict resolution; AI respects templates as soft constraints unless they violate hard constraints |
| FR-12 | **Reporting and analytics dashboard** — Provide analytics on labor cost trends, schedule efficiency (actual vs. optimal staffing), overtime patterns, compliance violation history, employee utilization, gig worker usage, and forecasting accuracy; support export for accounting and regulatory purposes | Real-time dashboards with hourly refresh; historical trend analysis with 12-month lookback; exportable reports in standard formats; benchmark comparison against industry averages |
| FR-13 | **Time-off and availability management** — Allow employees to set recurring availability, request time-off (paid/unpaid), and declare unavailability; integrate availability into the scheduling optimizer as hard constraints; support approval workflows with automatic coverage suggestions | Calendar-based availability UI; PTO balance tracking; auto-suggest replacement workers when approving time-off; blackout date configuration for peak periods |
| FR-14 | **Manager mobile app** — Provide a mobile-first management interface for schedule review/approval, real-time staffing dashboard, shift filling, employee communication, and clock-in oversight; support offline access for schedule viewing | Schedule generation to approval in ≤ 3 taps; real-time staffing heatmap; one-tap shift broadcast to gig pool; offline schedule cache with sync-on-reconnect |

---

## Out of Scope

- **Full HR management** — No benefits administration, performance reviews, recruitment pipeline, or onboarding workflows; the platform focuses on scheduling, attendance, and gig integration
- **Complex project management** — No task-level assignment, Gantt charts, or resource leveling for project-based work; scheduling operates at the shift level
- **Payroll processing** — No tax calculation, direct deposit, or pay stub generation; the platform exports verified timesheets to payroll providers
- **Full gig marketplace** — No gig worker recruitment, background checks, or skills certification; gig workers are pre-vetted and onboarded through partner channels
- **Enterprise-scale scheduling** — Not designed for 1000+ employee organizations with union contracts, seniority bidding, or multi-week rotation patterns

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Schedule generation latency (p95) | ≤ 10 s for ≤ 100 employees | Manager clicks "generate" and expects a near-instant result; longer delays cause abandonment |
| Schedule generation latency (p95) | ≤ 30 s for ≤ 200 employees | Larger businesses tolerate slightly longer generation but still need interactive-speed response |
| Shift swap validation (p99) | ≤ 500 ms | Workers expect instant feedback when requesting a swap |
| Clock-in verification (p99) | ≤ 2 s | Worker standing at the door must get pass/fail quickly; longer delays cause queuing |
| Demand forecast generation (p95) | ≤ 5 s for 14-day forecast | Forecast is pre-computed and cached; interactive queries return cached results |
| Dashboard load time (p95) | ≤ 1.5 s | Real-time staffing dashboard must feel responsive |
| Notification delivery (p95) | ≤ 5 s | Schedule changes and shift alerts must reach workers promptly |
| API response latency (p95) | ≤ 200 ms for read endpoints | Mobile app responsiveness depends on fast API responses |
| Gig shift broadcast to first acceptance (p50) | ≤ 30 min | Time-critical gap filling; 80% fill rate within 60 min target |

### Reliability & Availability

| Metric | Target |
|---|---|
| Platform availability | 99.95% (≤ 4.4 hours downtime/year) |
| Schedule service availability | 99.99% — published schedules must be viewable even during partial outages |
| Clock-in service availability | 99.99% — attendance recording cannot have gaps; workers must be able to clock in |
| Compliance engine availability | 99.95% — compliance validation is critical path for schedule publication |
| Notification service availability | 99.9% — with retry and fallback to SMS |
| Data durability | 99.999999999% (11 nines) for timesheet and compliance records |
| Schedule state durability | Zero data loss; every schedule version and modification event persisted durably |

### Scalability

| Metric | Target |
|---|---|
| Total managed businesses | 100,000+ |
| Total managed workers (employees + gig) | 5,000,000+ |
| Concurrent schedule generation requests | 500 (during Sunday evening peak when managers prepare Monday schedules) |
| Clock-in events per minute (peak) | 50,000 (8 AM weekday shift-start surge across all businesses) |
| Active schedule versions in memory | 200,000 (2 per business: current week + next week) |
| Notification throughput | 100,000 per minute (schedule publish cascade) |
| POS integration events per second | 10,000 (real-time sales data ingestion) |
| Gig marketplace concurrent broadcasts | 5,000 |

### Security & Compliance

| Requirement | Specification |
|---|---|
| Data privacy | Employee PII (name, phone, address, biometric data) encrypted at rest and in transit; GDPR and CCPA compliance for data access, portability, and deletion requests |
| Biometric data | Facial recognition templates stored separately from PII; explicit opt-in consent; 90-day retention with auto-deletion; never shared with third parties |
| Geolocation data | GPS coordinates collected only during clock-in/clock-out; not continuous tracking; retained for 90 days for dispute resolution; employee visibility into their own location data |
| Multi-tenancy isolation | Strict tenant data isolation at the database level; no cross-tenant data leakage; tenant-specific encryption keys |
| Labor law compliance records | Immutable audit trail of all scheduling decisions, compliance validations, and overrides; 7-year retention for regulatory audit support |
| Access control | Role-based access: Owner (full control), Manager (location-level scheduling), Employee (self-service only), Gig Worker (limited shift view and clock-in) |

---

## Capacity Estimations

### User Base and Scale

| Parameter | Value | Derivation |
|---|---|---|
| Total businesses | 100,000 | Target market: SMBs with 5–200 workers |
| Average workers per business | 50 | Mix of restaurants (20–40), retail (15–60), healthcare (30–100) |
| Total managed workers | 5,000,000 | 100K businesses × 50 workers |
| Gig worker pool | 500,000 | Pre-vetted workers across metro areas |
| Average locations per business | 1.5 | Some chains have 2–5 locations |
| Total locations | 150,000 | 100K × 1.5 |

### Schedule Data

| Parameter | Value | Derivation |
|---|---|---|
| Schedule versions per week per business | 3–5 | Initial draft + 2–3 modifications + final |
| Shifts per schedule | 175 | 50 workers × 5 shifts/week average (25 workers per day × 7 days) |
| Schedule size (serialized) | ~50 KB | 175 shifts × ~300 bytes each (worker, time, role, metadata) |
| Schedule versions stored per year | 200 per business | ~4/week × 50 weeks |
| Total schedule storage per year | 1 TB | 100K businesses × 200 versions × 50 KB |

### Demand Forecasting

| Parameter | Value | Derivation |
|---|---|---|
| Forecast data points per business per day | 96 | 24 hours × 4 (15-min intervals) |
| Historical data stored per business | 365 days × 96 = 35,040 data points | ~280 KB per business |
| POS events ingested per day | 20M | 100K businesses × 200 transactions/day |
| Weather data refreshes per day | 600K | 150K locations × 4 refreshes/day |
| Event calendar entries per month | 150K | ~1 per location (local events) |

### Clock-In/Attendance

| Parameter | Value | Derivation |
|---|---|---|
| Clock events per day | 5,000,000 | 2.5M workers active/day × 2 events (in + out) |
| Peak clock events per minute | 50,000 | 8 AM surge: 30% of daily events in 30-minute window |
| GPS data per clock event | ~200 bytes | Lat, long, accuracy, timestamp, device fingerprint |
| Biometric template per verification | ~2 KB | Facial recognition feature vector |
| Timesheet records per day | 2,500,000 | One per active worker per day |

### Storage Summary

| Data Category | Daily Volume | Annual Volume |
|---|---|---|
| Schedule data | 50 GB | 1 TB |
| Timesheet records | 2.5 GB | 900 GB |
| Clock-in events (with GPS) | 1 GB | 365 GB |
| Demand forecast data | 500 MB | 180 GB |
| POS integration events | 4 GB | 1.5 TB |
| Audit/compliance logs | 2 GB | 730 GB |
| Biometric templates | 5 GB (total, not daily) | 5 GB (rotated) |
| **Total** | **~10 GB/day** | **~4.7 TB/year** |

### Compute Estimates

| Workload | Compute Requirement |
|---|---|
| Schedule generation (peak 500 concurrent) | 500 solver instances × 4 vCPU × 8 GB RAM = 2,000 vCPU, 4 TB RAM peak |
| Demand forecasting (batch, 100K businesses) | 50 GPU-hours/day for model inference; pre-computed overnight |
| Clock-in verification (50K/min peak) | 200 instances × 2 vCPU for GPS verification; 50 instances × 4 vCPU for facial recognition |
| API serving (100K concurrent users peak) | 500 instances × 2 vCPU behind load balancer |
| Real-time event processing | 100 stream processor instances for POS, weather, and event ingestion |
