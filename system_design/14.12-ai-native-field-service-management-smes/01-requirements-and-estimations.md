# 14.12 AI-Native Field Service Management for SMEs — Requirements & Estimations

## Functional Requirements

| ID | Requirement | Description | Notes |
|---|---|---|---|
| **FR-01** | **AI Job Scheduling** | System automatically assigns incoming service requests to optimal technicians based on skills, location, availability, vehicle inventory, SLA urgency, and customer preferences; re-optimizes incrementally on every schedule disruption | Must produce assignment within 5 seconds; supports manual override by dispatcher |
| **FR-02** | **Route Optimization** | Compute Pareto-optimal routes for each technician considering time windows, real-time traffic, break requirements, and emergency slack; re-route dynamically when schedule changes | Vehicle Routing Problem with Time Windows (VRPTW); 15-minute re-optimization cycles |
| **FR-03** | **Work Order Management** | Full lifecycle management of service requests: creation (manual, IoT-triggered, recurring), assignment, dispatch, execution (status tracking, notes, photos), completion, and invoicing | Support for parent-child work orders (multi-visit jobs), templates per service type |
| **FR-04** | **Offline-First Mobile App** | Technicians can view jobs, update status, capture photos/signatures, generate invoices, and collect payments entirely offline; data syncs automatically when connectivity resumes | CRDT-based conflict resolution; delta sync protocol; embedded local database |
| **FR-05** | **Customer Communication** | Automated notifications across the service lifecycle: booking confirmation, day-before reminders, real-time ETA updates (GPS-driven), technician arrival alerts, post-service summaries, and feedback requests | Multi-channel: SMS, WhatsApp, email; merchant-customizable templates |
| **FR-06** | **Invoice Generation** | On-device invoice creation with complex pricing: flat-rate service books, time-and-materials calculation, warranty coverage verification, membership discounts, tax computation; digital signature capture | Deterministic pricing engine with versioned price books; PDF generation offline |
| **FR-07** | **Payment Collection** | Accept payments on-site via mobile POS (card tap/swipe/insert), UPI, bank transfer, or cash with receipt generation; automatic reconciliation with accounting systems | Offline payment queuing for card transactions; real-time UPI verification when online |
| **FR-08** | **IoT Predictive Maintenance** | Ingest sensor telemetry from connected equipment (HVAC, plumbing, electrical); detect anomalies; estimate remaining useful life; auto-generate preventive work orders when failure probability exceeds threshold | Support for multiple sensor types: vibration, temperature, pressure, power draw |
| **FR-09** | **Vehicle Inventory Tracking** | Real-time visibility into parts and materials on each technician's vehicle; automatic replenishment order generation; parts transfer suggestions between nearby technicians | Barcode/QR scanning for parts check-in/check-out; integration with supplier catalogs |
| **FR-10** | **Customer Equipment Profiles** | Maintain detailed equipment records per customer location: make, model, serial number, installation date, service history, warranty status, connected IoT sensors, and maintenance schedule | Equipment hierarchy (site → system → unit → component); QR code tagging |
| **FR-11** | **Technician Skill Management** | Track certifications, skill levels, training history, and specializations per technician; auto-filter assignments based on job skill requirements; alert on expiring certifications | Skill-to-job-type matching matrix; certification renewal workflow |
| **FR-12** | **Reporting & Analytics** | Dashboard showing fleet utilization, first-time-fix rate, average response time, revenue per technician, customer satisfaction scores, and AI scheduling effectiveness metrics | Daily AI-generated operational briefing; trend analysis; anomaly detection |

---

## Out of Scope

- **Equipment sales and e-commerce**: Platform manages service operations only, not product retail
- **Apprenticeship and training content delivery**: Skill tracking but not learning management
- **Full ERP/accounting**: Integration with external accounting systems, not replacement
- **Building/facility management**: Focus on dispatched field service, not fixed-site facility operations
- **Customer self-service portals for complex configuration**: Customers can book service and view history, not configure system parameters

---

## Non-Functional Requirements

### Performance SLOs

| Operation | Target | P99 Target | Measurement |
|---|---|---|---|
| Schedule optimization (single job insertion) | < 3 seconds | < 5 seconds | Time from new job creation to technician assignment |
| Full schedule re-optimization (50-tech fleet) | < 10 seconds | < 20 seconds | Time to re-solve after major disruption |
| Mobile app job list load (offline) | < 200 ms | < 500 ms | Local database query time on technician device |
| Mobile app sync (delta) | < 5 seconds | < 15 seconds | Time to sync changes when connectivity resumes |
| ETA calculation update | < 2 seconds | < 5 seconds | GPS position to customer-facing ETA |
| Invoice generation (on-device) | < 3 seconds | < 5 seconds | From "generate invoice" tap to PDF preview |
| IoT telemetry ingestion | < 30 seconds | < 60 seconds | Sensor reading to anomaly detection evaluation |
| Customer notification delivery | < 30 seconds | < 60 seconds | From trigger event to SMS/WhatsApp delivery |
| API response (CRUD operations) | < 200 ms | < 500 ms | Server-side processing time |
| Search (customer/job lookup) | < 300 ms | < 800 ms | Full-text search across customer and job records |

### Reliability & Availability

| Requirement | Target | Notes |
|---|---|---|
| Overall platform availability | 99.9% (8.76 hrs downtime/year) | Excludes planned maintenance windows |
| Scheduling engine availability | 99.95% | Critical path — manual fallback if down |
| Mobile app offline capability | 100% core workflows | Job view, status update, photo, signature, invoice must work fully offline |
| Data durability | 99.999999% (8 nines) | All job records, invoices, customer data |
| Sync reliability | 99.99% | No data loss during offline-to-online sync |
| IoT pipeline availability | 99.5% | Degraded mode acceptable; batch catch-up on recovery |
| Payment processing uptime | 99.95% | Fallback to offline queuing when payment gateway unavailable |
| RTO (Recovery Time Objective) | < 30 minutes | Full service restoration after infrastructure failure |
| RPO (Recovery Point Objective) | < 1 minute | Maximum data loss window |

---

## Capacity Estimations

### User Scale

| Parameter | Value | Basis |
|---|---|---|
| Target SME customers (businesses) | 50,000 | SMEs with 5-50 field technicians |
| Average technicians per SME | 12 | Mix of small (5-tech) and medium (50-tech) businesses |
| Total technicians on platform | 600,000 | 50,000 × 12 |
| Total dispatchers/office staff | 100,000 | ~2 per SME average |
| End customers (service recipients) | 25,000,000 | Average 500 customers per SME |
| Connected IoT devices | 2,000,000 | ~40 per SME average (connected equipment) |

### Traffic Scale

| Parameter | Calculation | Daily Volume |
|---|---|---|
| Jobs created per day | 600,000 technicians × 4 jobs/day | 2,400,000 |
| Schedule optimization requests | 2,400,000 jobs + 20% re-optimizations | 2,880,000 |
| GPS location updates | 600,000 techs × 8 hrs × 12/hr | 57,600,000 |
| Mobile app sync events | 600,000 techs × 20 syncs/day | 12,000,000 |
| IoT telemetry data points | 2,000,000 devices × 24 readings/day | 48,000,000 |
| Customer notifications | 2,400,000 jobs × 4 notifications/job | 9,600,000 |
| Invoice generations | 2,400,000 jobs × 85% completion rate | 2,040,000 |
| Photo uploads | 2,400,000 jobs × 3 photos/job | 7,200,000 |
| API calls (total) | Sum of all interactions | ~150,000,000 |
| Peak QPS (API) | 150M / 86,400 × 3 (peak factor) | ~5,200 QPS |

### Storage Estimates

| Data Type | Calculation | Annual Volume |
|---|---|---|
| Job records | 2,400,000/day × 5 KB × 365 | ~4.4 TB/year |
| GPS traces | 57,600,000/day × 100 B × 365 | ~2.1 TB/year |
| IoT telemetry | 48,000,000/day × 200 B × 365 | ~3.5 TB/year |
| Photos | 7,200,000/day × 500 KB × 365 | ~1.3 PB/year |
| Invoices (PDF) | 2,040,000/day × 200 KB × 365 | ~149 TB/year |
| Customer records | 25,000,000 × 10 KB | ~250 GB (growing) |
| Equipment profiles | 25,000,000 × 50 equip × 5 KB | ~6.25 TB |
| **Total (Year 1)** | | **~1.5 PB** |

### Compute Estimates

| Component | Requirement | Basis |
|---|---|---|
| Scheduling engine | 200 cores, 800 GB RAM | In-memory schedule graph for 50K SMEs; parallel optimization |
| Route optimization | 100 cores | Distance matrix computation, VRPTW solving |
| IoT pipeline | 50 cores, 200 GB RAM | Stream processing for 48M data points/day |
| API servers | 150 cores | 5,200 peak QPS with headroom |
| ML inference (predictive maintenance) | 40 cores + 8 GPUs | Anomaly detection, RUL estimation models |
| Notification service | 30 cores | 9.6M notifications/day with template rendering |
| Sync service | 80 cores | 12M sync events/day with conflict resolution |

### Cost Drivers

| Driver | Monthly Estimate | Notes |
|---|---|---|
| Compute (managed Kubernetes) | $45,000 | Auto-scaling; spot instances for batch workloads |
| Object storage (photos, PDFs) | $30,000 | Tiered storage; lifecycle policies for older data |
| Database (relational + document) | $25,000 | Multi-region replicas; read replicas for analytics |
| Message queue / streaming | $8,000 | Event bus for job lifecycle, IoT pipeline |
| Maps / geocoding API | $15,000 | Distance matrix, geocoding, traffic data |
| SMS / WhatsApp notifications | $35,000 | 9.6M/day at blended rate; WhatsApp Business API |
| IoT ingestion infrastructure | $10,000 | Time-series database, stream processing |
| CDN and bandwidth | $12,000 | Photo delivery, app updates |
| ML training and inference | $8,000 | Model retraining, GPU inference |
| **Total monthly** | **~$188,000** | **$3.76/SME/month infrastructure cost** |

---

## SLO Summary Dashboard

| SLO | Target | Measurement Method | Alert Threshold |
|---|---|---|---|
| Job assignment latency | P95 < 3s | Timer from job creation to assignment event | P95 > 4s for 5 min |
| Schedule re-optimization time | P95 < 10s | Timer from disruption event to new schedule | P95 > 15s for 5 min |
| Mobile sync success rate | 99.99% | Successful syncs / total sync attempts | < 99.95% over 1 hr |
| Offline workflow completion | 100% | Core workflows executable without connectivity | Any offline failure |
| ETA accuracy | ±10 min for 90% of jobs | Predicted ETA vs. actual arrival time | < 85% accuracy over 1 day |
| First-time-fix rate (AI-assisted) | > 88% | Jobs completed without follow-up visit | < 85% over 1 week |
| Invoice accuracy | 99.9% | Invoices without manual correction | < 99.5% over 1 day |
| Customer notification delivery | 99.5% | Delivered notifications / triggered notifications | < 99% over 1 hr |
| IoT anomaly detection latency | P95 < 60s | Sensor reading to anomaly alert | P95 > 120s for 15 min |
| Platform availability | 99.9% | Uptime monitoring across all services | Any service < 99.5% over 1 hr |
