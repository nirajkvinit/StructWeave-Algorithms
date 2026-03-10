# 13.5 AI-Native Agriculture & Precision Farming Platform — Security & Compliance

## Threat Landscape

Precision agriculture platforms face a unique threat profile that combines traditional SaaS security concerns with physical-world safety implications, IoT device vulnerabilities, and sensitive agricultural data that has economic and national security significance.

### Threat Categories

| Threat | Attack Vector | Impact |
|---|---|---|
| **Spray controller manipulation** | Compromised edge firmware or model; adversarial ML inputs | Crop destruction (spray herbicide on crops), environmental contamination (over-application), financial loss |
| **Farm data theft** | API credential compromise; insider access | Competitive intelligence (yield data reveals farm profitability); commodity market manipulation (aggregate yield data moves futures prices) |
| **Sensor data poisoning** | Compromised LoRaWAN devices or gateways | Incorrect prescriptions (over/under-fertilization, wrong irrigation), failed yield predictions |
| **Satellite imagery interception** | Man-in-the-middle on imagery provider API | Reconnaissance of farm operations; crop condition intelligence |
| **Equipment sabotage** | Compromised ISOBUS commands via malicious prescription files | Equipment damage, field damage, operator safety risk |
| **Ransomware during critical windows** | Encryption of prescription maps and field data during spray/planting season | Operational paralysis during time-sensitive agricultural windows; farmers forced to pay because biological deadlines cannot wait |

---

## Data Ownership and Privacy

### Farmer Data Rights

Agricultural data ownership is a contentious and regulated area. The platform must enforce clear data governance:

```
Data classification:
  FARMER_OWNED:
    - Field boundaries, soil test results, yield maps
    - Planting records, chemical application records
    - Equipment telemetry from farmer-owned equipment
    - Prescription maps generated for farmer's fields
    → Farmer has full export, delete, and portability rights

  PLATFORM_GENERATED:
    - Satellite-derived vegetation indices (computed from public data)
    - Aggregated insights (county-level yield trends, regional pest pressure)
    - Model weights trained on aggregate data
    → Platform retains rights; farmer gets read access for their geography

  SHARED (requires explicit consent):
    - Anonymized yield data contributed to training datasets
    - Benchmark comparisons (farmer's field vs. regional average)
    - Agronomist annotations and scouting reports
    → Opt-in sharing; revocable consent; anonymized before aggregation
```

### Data Portability (ADAPT Framework)

The platform must support the Agriculture Data Application Programming Toolkit (ADAPT) standard for data portability:

- **Export formats:** Shapefiles, GeoTIFF, ISO 11783 (ISOBUS) task files, CSV for tabular data
- **Export scope:** All FARMER_OWNED data exportable within 72 hours of request
- **No vendor lock-in:** Prescriptions exported in equipment-vendor-neutral formats; field boundaries in standard GeoJSON
- **Transfer to competitor:** Farmer can authorize direct data transfer to another precision ag platform via standard API

### Operator Privacy

Equipment operators (tractor drivers, spray rig operators) generate location and performance data during operations:

- **Location tracking:** GPS position logged every 5 seconds during equipment operation
- **Performance metrics:** Acres/hour, fuel consumption, idle time, speed patterns
- **Consent model:** Operator must acknowledge data collection at start of each session via equipment display
- **Data minimization:** Detailed operator tracks retained for 90 days for operational use; aggregated to per-field summaries after 90 days
- **Access control:** Only farm owner and designated agronomist can view operator-level detail; third parties see only aggregate field metrics

---

## IoT and Edge Security

### LoRaWAN Sensor Security

```
Device authentication:
  - Each sensor has a unique 128-bit AppKey provisioned during manufacturing
  - Join procedure: OTAA (Over-The-Air Activation) with mutual authentication
  - Session keys (NwkSKey, AppSKey) derived per session; rotated on rejoin

Payload encryption:
  - AES-128-CTR encryption on sensor payload (application layer)
  - LoRaWAN MAC layer provides additional integrity protection (MIC)
  - End-to-end encryption: gateway cannot read sensor data (only forwards)

Gateway security:
  - Gateway authenticates to network server via TLS client certificate
  - Gateway firmware signed; verified at boot (secure boot)
  - Physical tamper detection: accelerometer-based tamper switch
    (alerts if gateway is moved from installed position)

Threat mitigation:
  - Replay attacks: LoRaWAN frame counter prevents replay
  - Rogue gateway: network server validates gateway identity;
    sensor readings from unregistered gateways are discarded
  - Jamming: LoRaWAN frequency hopping provides partial jamming resistance;
    gateway reports RF environment metrics for jamming detection
```

### Spray Controller Security

The spray controller is the most safety-critical edge device. A compromised controller could spray herbicide on crops or fail to spray weeds.

```
Secure boot chain:
  1. Hardware root of trust (TPM or secure element) verifies bootloader signature
  2. Bootloader verifies firmware signature (RSA-2048, manufacturer-signed)
  3. Firmware verifies ML model signature (platform-signed, SHA-256 digest)
  4. If any verification fails: boot into safe mode (broadcast spray, no AI targeting)

Model integrity:
  - Models signed by platform before OTA deployment
  - Edge controller verifies signature before activating new model
  - Model files encrypted at rest on edge SSD (key derived from TPM)
  - Anti-rollback: monotonic version counter prevents downgrade attacks

Operational safety constraints (hardware-enforced):
  - Maximum spray rate: hardware limiter on PWM duty cycle
    (even if software commands 100%, hardware caps at safe maximum)
  - Boom section shutoff: each 3-meter boom section has independent
    hardware safety relay; software cannot override
  - Speed interlock: spray system disables if vehicle speed exceeds
    rated maximum (prevents spray at unsafe speed)
  - Operator override: physical switch on boom to force all-nozzles-on
    or all-nozzles-off, bypassing software control
```

### Equipment Integration Security (ISOBUS)

```
ISOBUS prescription file security:
  - Prescription files (task controller format) are authenticated
    via HMAC-SHA256 before loading to equipment controller
  - Equipment controller validates HMAC using pre-shared key with platform
  - Prevents loading of tampered prescription files (e.g., altered application rates)

Rate limit safety:
  - ISOBUS rate commands validated against agronomic safety bounds
  - Maximum application rate per product encoded in equipment controller
  - If prescription exceeds safety bound, controller clamps to maximum
    and logs a safety event

Firmware update security:
  - Equipment OEM-signed firmware only
  - Platform does not have write access to core equipment firmware
  - Platform updates limited to task controller data and display content
```

---

## Agrochemical Compliance

### Application Record-Keeping

Precision spraying generates detailed application records that must comply with EPA (US) and REACH (EU) requirements:

```
Required record fields (per EPA 40 CFR 171):
  - Date and time of application
  - Product name, EPA registration number, active ingredient
  - Application rate (per acre)
  - Total quantity applied
  - Field location (legal description or GPS coordinates)
  - Crop treated
  - Target pest
  - Applicator name and certification number
  - Wind speed, temperature, humidity at time of application
  - Buffer zone compliance (distance from water bodies, sensitive areas)

Platform implementation:
  - Spray session logs automatically populate all required fields
  - GPS coordinates provide exact application boundaries
  - Weather station integration records conditions at spray time
  - Buffer zone geofencing: spray controller has geofenced no-spray zones
    pre-loaded from regulatory database; nozzles auto-disable in buffers
  - Records retained 7 years (minimum regulatory requirement)
  - Tamper-evident: spray logs signed with edge controller key at time of creation;
    any modification to historical records detected via signature verification
```

### Restricted-Use Pesticide (RUP) Tracking

```
RUP compliance:
  - Platform verifies applicator certification number before
    generating prescription for restricted-use products
  - Certification expiration tracked; alerts sent 30 days before expiry
  - Application quantities tracked against per-farm annual limits
  - Automated reporting to state agriculture department (where required)
```

### Buffer Zone Enforcement

```
Geofenced exclusion zones:
  - Water bodies (rivers, streams, ponds): loaded from USGS hydrography dataset
  - Residential areas: buffer from property boundaries
  - Organic fields: buffer to prevent spray drift to neighboring organic crops
  - Endangered species habitat: per-county restrictions from EPA Bulletins

Enforcement:
  - Edge spray controller has geofence database loaded pre-season
  - GPS + geofence check runs in parallel with spray decision pipeline
  - Nozzle disabled if current position is within any exclusion zone
  - Geofence override requires operator PIN + logs override event with GPS
  - Override events flagged for compliance review
```

---

## Data Security Architecture

### Multi-Tenant Isolation

```
Isolation model:
  - Farm-level data isolation (not field-level) for operational efficiency
  - Each farm is a tenant; fields within a farm share access context
  - Database: row-level security with farm_id in every table
  - Object storage: prefix-based isolation (farm_id/field_id/data_type/)
  - API: all queries scoped to authenticated user's farm_id set

Agronomist access:
  - Agronomists serve multiple farms (multi-tenant access)
  - Farm owner grants agronomist access via invitation (revocable)
  - Agronomist sees only explicitly shared fields, not all farm data
  - Audit log: every agronomist data access logged with timestamp and purpose
```

### Encryption

| Data State | Encryption Method | Key Management |
|---|---|---|
| Sensor data in transit | LoRaWAN AES-128 (end-to-end) | Per-device session keys via OTAA |
| Edge data at rest | AES-256 (SSD encryption) | Key in TPM/secure element |
| Cloud data in transit | TLS 1.3 | Platform-managed certificates |
| Cloud data at rest | AES-256 (storage-level encryption) | Platform-managed with per-tenant key wrapping |
| Prescription files | HMAC-SHA256 for integrity | Pre-shared keys between platform and equipment |
| Spray logs (archival) | AES-256 + digital signature | Long-term keys in HSM; signature for tamper evidence |

### API Security

```
Authentication:
  - Farmer/agronomist: OAuth 2.0 + PKCE (mobile and web apps)
  - Equipment integration: API key + HMAC signature per request
  - Satellite providers: mutual TLS (mTLS) for imagery API
  - LoRaWAN network server: TLS client certificate

Authorization:
  - RBAC with farm-scoped roles:
    - Farm Owner: full access to all farm data and settings
    - Farm Manager: operational access; no billing or user management
    - Agronomist: read access to shared fields; write access to prescriptions and notes
    - Equipment Operator: read-only access to assigned field prescriptions
    - Viewer: read-only dashboards (for investors, lenders, crop insurance)

Rate limiting:
  - Per-farm API rate limits (prevent runaway automation scripts)
  - Equipment API: 100 requests/min per device (sufficient for telemetry + prescription pulls)
  - Imagery API: 500 requests/hour per farm (prevent bulk download abuse)
```

---

## Regulatory Compliance Matrix

| Regulation | Scope | Platform Compliance |
|---|---|---|
| **EPA FIFRA / 40 CFR 171** | Pesticide application record-keeping (US) | Automated application records with GPS, weather, and applicator certification |
| **EU REACH / Plant Protection Products Regulation** | Chemical usage tracking (EU) | Per-field application logging with product traceability |
| **State Right-to-Farm Laws** | Notification of spray activity to neighbors | Automated neighbor notification for sensitive applications |
| **GDPR (EU)** | Operator personal data | Consent-based processing; right to erasure for operator tracks |
| **Data portability (USDA / industry)** | Farmer right to export and transfer data | ADAPT-compliant export; 72-hour data portability SLO |
| **Water use regulations** | Irrigation withdrawal permits (state-level) | Irrigation optimizer respects per-farm water allocation limits |
| **Drone regulations (FAA Part 107)** | Drone flight operations | Platform integrates airspace checks; flight logs retained per FAA requirements |
| **Food Safety Modernization Act (FSMA)** | Traceability from field to market | Field-level input tracking supports FSMA Section 204 traceability |
