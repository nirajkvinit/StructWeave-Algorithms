# 13.7 AI-Native Construction & Engineering Platform — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **BIM model ingestion and intelligence** — Parse IFC/Revit models, extract element hierarchy, perform automated clash detection, generate constructability reports, track model versions with change impact analysis | Support models with 500K+ elements; clash detection completes within 10 minutes for full model; incremental clash detection within 30 seconds for partial updates |
| FR-02 | **Automated progress tracking** — Ingest 360-degree imagery from daily site walks, reconstruct 3D point clouds, register against BIM coordinates, and determine element-level completion status | Process 100,000+ images per site per day; element detection accuracy ≥ 90%; completion status updated within 4 hours of capture |
| FR-03 | **Real-time safety monitoring** — Analyze video feeds from fixed cameras and drone streams using CV models to detect PPE non-compliance, exclusion zone violations, struck-by hazards, and near-miss events | Support 200+ camera feeds per site; alert latency ≤ 500 ms for life-threatening hazards; PPE detection accuracy ≥ 95% |
| FR-04 | **AI cost estimation** — Generate probabilistic cost estimates from BIM quantities, historical project data, material price feeds, and labor market indices; auto-update estimates on design changes | Estimate accuracy within ±10% at design development stage; Monte Carlo simulation with 10,000 scenarios; cost breakdown to element level |
| FR-05 | **Resource optimization** — Optimize crew assignments, equipment allocation, and material delivery schedules using constraint-based solvers considering trade dependencies, spatial conflicts, and productivity data | Support 50+ concurrent trades; crew optimization cycle ≤ 5 minutes; equipment utilization target ≥ 75% |
| FR-06 | **Risk prediction and delay forecasting** — Score each schedule activity's delay probability using ML models trained on historical project data, weather forecasts, subcontractor performance, and supply chain signals | Predict delays 2–4 weeks in advance; risk model retrained weekly; alert when activity delay probability exceeds 60% |
| FR-07 | **Site digital twin** — Maintain a living 3D model synchronized with site reality via point cloud fusion from cameras, LiDAR, and drones; support temporal versioning and deviation analysis | Point cloud registration accuracy ≤ 2 cm; daily temporal snapshots; deviation heat map generation within 1 hour of capture |
| FR-08 | **Quality inspection management** — Track inspection requests, schedule inspectors, record inspection results with photo evidence linked to BIM elements, manage punch lists with automated defect detection | Support regulatory and quality inspection workflows; defect detection accuracy ≥ 85%; punch list auto-generation from CV analysis |
| FR-09 | **Subcontractor performance scoring** — Track and score subcontractor performance across productivity, quality, safety, and schedule adherence dimensions using objective site data | Performance scores updated daily; historical scoring across 1,000+ subcontractors; predictive scoring for new subcontractor qualification |
| FR-10 | **Document and RFI management** — Manage construction documents (drawings, specifications, submittals, RFIs) with version control, automated routing, and AI-assisted response generation | Support 50,000+ documents per project; RFI response time tracking; automated drawing revision comparison |
| FR-11 | **Material tracking and logistics** — Track material orders, deliveries, on-site inventory, and installation; predict material shortages; optimize delivery scheduling to minimize site storage | Integration with procurement systems; delivery prediction accuracy within ±1 day; JIT optimization reducing site storage by 30% |
| FR-12 | **Drone survey management** — Plan automated drone flight paths, process photogrammetry and LiDAR captures, generate orthomosaics, point clouds, and volumetric measurements | Support daily drone surveys; point cloud processing within 2 hours; volumetric accuracy ≤ 3% error |
| FR-13 | **Earned value management** — Calculate earned value metrics (CPI, SPI, EAC, ETC) automatically from progress tracking and cost data; generate performance trend reports | EVM metrics updated daily; automated variance analysis; forecast-at-completion projections with confidence intervals |
| FR-14 | **Handover and commissioning** — Generate as-built documentation, compile O&M manuals, create digital handover packages linking BIM elements to installed equipment data, warranties, and maintenance schedules | Automated as-built model generation; commissioning checklist tracking; warranty expiration alerting |

---

## Out of Scope

- **Architectural design** — Building design, space planning, and aesthetic decisions (separate design tools)
- **Structural engineering analysis** — Finite element analysis, wind load simulation, and seismic design (separate engineering software)
- **Accounting and payroll** — General ledger, accounts payable, payroll processing (separate ERP/accounting systems)
- **Real estate development** — Land acquisition, feasibility studies, financing, and sales/leasing (separate development platforms)
- **Facility management** — Post-occupancy building operations, HVAC optimization, and tenant management (separate FM systems)

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Safety alert latency (p99) | ≤ 500 ms | Life-threatening hazard detection must trigger immediate intervention |
| Progress image processing (p95) | ≤ 4 h from capture | Daily progress updates must be available for morning planning meetings |
| BIM clash detection — incremental (p99) | ≤ 30 s | Design changes must be validated before team coordination meetings |
| BIM clash detection — full model (p95) | ≤ 10 min | Initial model upload and periodic full scans |
| Cost estimate recalculation (p95) | ≤ 5 min | Design change cost impact must be available for decision-making |
| Risk score update (p95) | ≤ 15 min | Schedule risk must reflect latest field data for daily standup |
| Digital twin point cloud registration (p95) | ≤ 1 h | Deviation analysis must be available same-day |
| Resource optimization solve (p95) | ≤ 5 min | Crew assignments must be generated before shift start |
| Drone survey processing (p95) | ≤ 2 h | Survey results needed for same-day analysis |

### Reliability & Availability

| Metric | Target |
|---|---|
| Safety monitoring availability | 99.99% (≤ 52 min downtime/year) — safety-critical system |
| Progress tracking pipeline availability | 99.9% — degraded tracking acceptable for short periods |
| BIM intelligence service availability | 99.9% — batch-oriented, catch-up acceptable |
| Cost estimation service availability | 99.5% — on-demand, not real-time critical |
| Risk prediction service availability | 99.9% — daily updates critical for project management |
| Edge compute autonomous operation | ≥ 24 h without cloud connectivity — safety monitoring must continue |
| Data durability for captured imagery | 99.999% — regulatory and legal requirement for construction records |
| Event ordering guarantee | Causal ordering per site per camera for all safety and progress events |

### Scalability

| Metric | Target |
|---|---|
| Sites managed concurrently | 500+ active construction sites |
| Cameras per site | 200+ fixed cameras + 10 drone feeds |
| Images processed per day (all sites) | 25M+ images (360-degree captures + safety feeds) |
| BIM model size | Up to 2M elements per model (large hospital/airport projects) |
| Point cloud size per capture | Up to 50 GB per drone survey; 500 GB cumulative per site |
| Workers tracked per site | Up to 5,000 workers across all trades |
| Subcontractors managed | 10,000+ across all projects |
| Schedule activities per project | Up to 50,000 activities in CPM schedule |
| Historical projects for ML training | 50,000+ completed projects |
| Concurrent users (project teams) | 25,000+ across all sites |

### Security & Compliance

| Requirement | Specification |
|---|---|
| Construction data sovereignty | Project data stored in jurisdictionally appropriate regions; export controls for defense/government projects |
| BIM intellectual property | Model access controls with per-element permissions; watermarking for shared models; export audit trail |
| Worker privacy | Facial recognition prohibited for productivity tracking; safety CV uses PPE/zone detection only; GDPR/local labor law compliance |
| Safety compliance | OSHA reporting integration; automated incident documentation; audit trail for safety alerts and responses |
| Financial data protection | Cost estimates, bid data, and subcontractor pricing protected with role-based access and encryption at rest |
| Site access control | Multi-factor authentication for site systems; physical-digital access correlation for secure areas |

---

## Capacity Estimations

### Site Imagery Volume

**Assumptions:**
- 500 active construction sites
- Average 50 360-degree cameras per site capturing every 30 seconds during work hours (10h)
- Each 360-degree image: ~15 MB (8K resolution equirectangular)
- Drone surveys: 2 flights per site per week

```
360-degree camera imagery:
  Per camera per day: 1,200 images × 15 MB = 18 GB/day
  Per site: 50 cameras × 18 GB = 900 GB/day
  All sites: 500 × 900 GB = 450 TB/day (raw captures)
  With 10x JPEG compression vs raw: ~45 TB/day stored
  30-day retention (hot): ~1.35 PB
  Project lifetime retention (compressed 5x): varies by project duration

Safety camera feeds (video):
  200 cameras per site × 15 FPS × 10 hours = 108M frames/site/day
  Edge-processed: only keyframes + alert clips stored (~5% of frames)
  Per site storage: ~50 GB/day (keyframes + 30-sec alert clips)
  All sites: 500 × 50 GB = 25 TB/day

Drone surveys:
  2 flights/site/week × 500 sites = 1,000 surveys/week
  Per survey: ~500 GB (LiDAR point cloud + RGB imagery)
  Weekly drone data: ~500 TB/week
  Post-processed point clouds (decimated): ~50 GB per survey
  Weekly processed: ~50 TB/week
```

### BIM Processing Volume

```
Model ingestion:
  Average IFC model: 500K elements, 2 GB file
  Large models (hospital, airport): 2M elements, 8 GB file
  Model updates per project: 5-10 per week (incremental)
  Full model re-uploads: 1 per month

Clash detection compute:
  Full model (500K elements): R-tree spatial indexing + pairwise geometry test
  Potential clash pairs (after spatial filtering): ~50,000
  Geometry intersection test: ~2 ms per pair
  Full scan: 50,000 × 2 ms = 100 seconds single-threaded
  Parallelized across 16 cores: ~6.25 seconds
  ML relevance filtering: 50,000 clashes × 1 ms = 50 seconds
  Total: ~60 seconds (well within 10-minute SLO)

  Incremental (1,000 changed elements): ~500 pairs × 2 ms = 1 second
  Plus ML filtering: ~1.5 seconds total (within 30-second SLO) ✓
```

### Progress Tracking Compute

```
Point cloud reconstruction:
  1,200 images per camera → photogrammetry pipeline
  Per site: 50 cameras × 1,200 images = 60,000 images/day
  Photogrammetry processing: ~2 minutes per 100 images (GPU-accelerated)
  Per site total: 600 batches × 2 min = 1,200 min = 20 hours
  Parallelized across 4 GPU workers per site: ~5 hours

BIM-to-reality comparison:
  Point cloud registration (ICP algorithm): ~10 minutes per floor
  20-floor building: ~200 minutes
  Element-level comparison: 500K elements × 5 ms = 2,500 seconds ≈ 42 min
  Total per site: ~4 hours (within SLO) ✓

All sites daily:
  500 sites × 4 GPU workers × 5 hours = 10,000 GPU-hours/day
```

### Safety CV Inference

```
Camera feeds:
  200 cameras per site × 15 FPS = 3,000 inferences/sec per site
  Per inference: ~30 ms on edge GPU (object detection + tracking)
  GPU utilization per site: 3,000 × 30 ms = 90 GPU-seconds per wall-second
  Required edge GPUs per site: 90 / 1 = 90 inference streams
  With batch processing (4 frames per batch): ~23 edge GPUs per site

Alert processing:
  PPE violation rate: ~5 per camera per hour = 1,000 alerts/hour per site
  After deduplication (same worker, 5-min window): ~200 unique alerts/hour
  Alert propagation to cloud: ~200 events/hour per site × 500 sites
  = 100,000 alerts/hour across all sites
```

### Cost Estimation Compute

```
Quantity extraction from BIM:
  500K elements × quantity computation: ~5 minutes
  Cost lookup (50,000 unit rates): ~30 seconds
  Monte Carlo simulation (10,000 scenarios):
    Per scenario: 500K elements × cost sampling = ~2 seconds
    Total: 10,000 × 2 seconds = 20,000 seconds single-threaded
    Parallelized across 100 workers: 200 seconds ≈ 3.3 minutes
  Total estimate generation: ~8 minutes (within 5-min SLO for recalc after caching) ✓

Historical project database:
  50,000 projects × average 200 cost line items = 10M records
  With element-level detail: ~500M records
  Storage: ~200 GB (columnar, compressed)
```

### Storage Summary

```
Site imagery — 360-degree (30-day hot):     ~1.35 PB
Safety keyframes + clips (30-day):          ~750 TB
Drone point clouds (project lifetime):      varies, ~2 PB cumulative
BIM models (all versions, all projects):    ~50 TB
Progress tracking point clouds (30-day):    ~200 TB
Cost estimation database:                   ~200 GB
Risk model training data:                   ~500 GB
Schedule and EVM data:                      ~50 GB
Document management:                        ~100 TB
Subcontractor performance history:          ~10 GB
Audit and compliance logs:                  ~5 TB
```

---

## SLO Summary

| SLO | Target | Measurement Window |
|---|---|---|
| Safety alert latency p99 | ≤ 500 ms | Per alert event |
| Safety CV availability | 99.99% | Annual |
| Progress tracking processing p95 | ≤ 4 h from capture | Per daily capture batch |
| BIM clash detection — incremental p99 | ≤ 30 s | Per model update |
| BIM clash detection — full p95 | ≤ 10 min | Per full model upload |
| Cost estimate recalculation p95 | ≤ 5 min | Per design change event |
| Risk score update p95 | ≤ 15 min | Per data refresh cycle |
| Digital twin registration p95 | ≤ 1 h | Per daily capture |
| Resource optimization solve p95 | ≤ 5 min | Per optimization request |
| Drone survey processing p95 | ≤ 2 h | Per survey flight |
| Edge autonomous operation | ≥ 24 h | Per connectivity loss event |
| Progress tracking accuracy | ≥ 90% element detection | Weekly validation |
| Safety detection accuracy | ≥ 95% PPE detection | Monthly calibration |
| Cost estimate accuracy | ≤ ±10% at DD stage | Per project milestone |
| Data durability (imagery) | 99.999% | Annual |
