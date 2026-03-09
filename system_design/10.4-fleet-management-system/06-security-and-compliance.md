# Security & Compliance — Fleet Management System

## 1. Threat Model

### 1.1 Threat Actors

| Actor | Motivation | Capability | Primary Targets |
|---|---|---|---|
| **Vehicle thieves** | Steal vehicles, disable tracking | Physical access to telematics unit, basic technical skills | Telematics hardware, GPS antenna, tracking disable |
| **Cargo thieves** | Steal high-value cargo | Insider knowledge of routes, GPS spoofing equipment | Route plans, vehicle positions, geofence data |
| **Disgruntled drivers** | Falsify HOS records, avoid tracking | Physical access to ELD, knowledge of system | ELD/HOS records, duty status, tamper detection |
| **Competitors** | Industrial espionage, route intelligence | Social engineering, API abuse | Route data, customer lists, fleet utilization |
| **External attackers** | Data theft, ransomware, system disruption | Sophisticated tools, network attacks | Cloud infrastructure, APIs, stored PII |
| **Nation-state actors** | Supply chain disruption, surveillance | Advanced persistent threats, zero-days | Fleet operations, critical infrastructure logistics |

### 1.2 STRIDE Threat Analysis

| Threat | Component | Attack Vector | Mitigation |
|---|---|---|---|
| **Spoofing** | MQTT broker | Fake vehicle connecting with stolen credentials | X.509 mutual TLS with hardware-bound certificates |
| **Spoofing** | GPS receiver | GPS signal spoofing to falsify location | Cross-validate GPS with cell tower triangulation + speed plausibility |
| **Tampering** | ELD records | Driver modifying duty status records retroactively | Cryptographic signing + append-only log + server-side validation |
| **Tampering** | Telematics unit | Physical disconnection or signal jamming | Tamper detection sensors + disconnect alerts + last-known-position alerts |
| **Repudiation** | HOS compliance | Driver denying they were driving at a specific time | Engine-synced automatic recording + non-repudiable timestamps |
| **Info Disclosure** | Location API | Unauthorized access to vehicle/driver positions | OAuth 2.0 + fleet-scoped authorization + rate limiting |
| **DoS** | MQTT broker | Connection flood from compromised devices | Connection rate limiting + device certificate revocation |
| **Elevation of Privilege** | Fleet admin portal | Account takeover → access to all fleet data | MFA + role-based access + fleet isolation |

---

## 2. Security Architecture

### 2.1 Defense in Depth

```
Layer 1: Vehicle/Device Security
  ├── Hardware-bound X.509 certificates (secure element)
  ├── Encrypted firmware with secure boot
  ├── Tamper-evident enclosure with disconnect detection
  ├── On-device data encryption (AES-256)
  └── Secure OTA update channel with code signing

Layer 2: Transport Security
  ├── Mutual TLS 1.3 for all MQTT connections
  ├── Certificate pinning in vehicle firmware
  ├── TLS 1.3 for all REST/gRPC service communication
  ├── mTLS for inter-service communication
  └── Certificate rotation every 90 days (automated)

Layer 3: API Security
  ├── OAuth 2.0 + OpenID Connect for user authentication
  ├── API key + HMAC signing for partner integrations
  ├── Fleet-scoped authorization (users only see their fleet data)
  ├── Rate limiting per client, per API, per fleet
  └── Input validation and request sanitization

Layer 4: Data Security
  ├── AES-256 encryption at rest for all stored data
  ├── Field-level encryption for PII (driver name, license, phone)
  ├── Database-level Transparent Data Encryption (TDE)
  ├── Encryption key management with automatic rotation
  └── Data masking in non-production environments

Layer 5: Application Security
  ├── RBAC with fleet/region scoping
  ├── Audit logging of all administrative actions
  ├── Session management with sliding expiration
  ├── CSRF protection on all state-changing endpoints
  └── Content Security Policy (CSP) for web dashboard

Layer 6: Infrastructure Security
  ├── Network segmentation (vehicle ingestion separate from user APIs)
  ├── Container security scanning in CI/CD pipeline
  ├── Runtime container isolation (no privileged containers)
  ├── Secrets management (no credentials in code or config)
  └── DDoS protection at network edge
```

### 2.2 Vehicle Authentication

```
Device Provisioning (Manufacturing):
  1. Generate RSA-2048 key pair inside vehicle's secure element
  2. CSR (Certificate Signing Request) sent to fleet CA
  3. Fleet CA issues X.509 device certificate
     - Subject: CN=vehicle_{vehicle_id}, O={fleet_org}
     - Extensions: device serial, vehicle VIN (hashed)
     - Validity: 3 years
  4. Certificate chain stored in secure element (private key never exported)
  5. CA certificate + CRL distribution point configured on device

Runtime Authentication:
  1. Vehicle connects to MQTT broker over TLS 1.3
  2. Broker requests client certificate (mutual TLS)
  3. Vehicle presents X.509 certificate from secure element
  4. Broker validates:
     a. Certificate signature chain to trusted CA
     b. Certificate not on CRL (Certificate Revocation List)
     c. Vehicle ID in certificate matches MQTT client ID
     d. Certificate not expired
  5. Connection established — vehicle authenticated

Certificate Revocation:
  - Stolen vehicle → immediate certificate revocation
  - CRL push to all broker nodes within 60 seconds
  - OCSP stapling for real-time revocation checking
  - Revoked device cannot reconnect to any broker
```

### 2.3 GPS Anti-Spoofing

```
Multi-Layer GPS Validation:

Layer 1: Signal-Level Checks (on device)
  - Monitor GPS signal strength (spoofed signals often stronger than natural)
  - Check carrier-to-noise ratio for anomalies
  - Multi-constellation cross-validation (GPS vs. GLONASS vs. Galileo)

Layer 2: Position Plausibility (server-side)
  - Speed check: Distance between consecutive points / time elapsed ≤ max possible speed
  - Acceleration check: Speed change between points ≤ physical acceleration limits
  - Teleportation detection: Jump > 1km in < 10 seconds → flag as suspect
  - Altitude sanity: Compare against terrain elevation database

Layer 3: Cross-Reference Validation
  - Cell tower triangulation comparison (separate from GPS)
  - Wi-Fi positioning where available (different attack vector)
  - CAN bus odometer cross-reference (distance driven should match GPS distance)
  - Engine data correlation (vehicle can't be moving at highway speed with engine off)

Layer 4: Historical Pattern Analysis
  - Compare route against known road network (GPS positions should be on roads)
  - Detect impossible patterns (vehicle in ocean, inside building continuously)
  - Flag sudden consistent position (GPS fixed to one point = possible replay attack)
```

---

## 3. Regulatory Compliance

### 3.1 ELD/FMCSA Compliance

The Electronic Logging Device mandate is the most prescriptive compliance requirement:

| Requirement | Implementation |
|---|---|
| **Automatic driving detection** | Engine RPM + vehicle speed from OBD-II; driving = vehicle moving AND engine on |
| **Tamper resistance** | Cryptographic signing of all records; disconnect detection sensor; anti-rollback firmware |
| **Engine synchronization** | ELD must connect to engine ECM via diagnostic port; cannot be simulated |
| **Data retention** | 6 months of ELD records available for audit; 7 days of supporting documents |
| **Transfer methods** | Bluetooth transfer to inspector's device; web service API; email; USB (if applicable) |
| **Graph grid display** | 24-hour graph grid showing duty status changes; must be displayable on device |
| **Malfunction detection** | Self-diagnosis of power, engine sync, timing, positioning, data recording, data transfer |
| **Unidentified driving** | Track driving events when no driver is logged in; assign to driver within 7 days |

**ELD Data Record Format (per FMCSA):**
```
ELD Record:
  record_status:    ACTIVE | INACTIVE_CHANGED | INACTIVE_CHANGE_REQUESTED | INACTIVE_CHANGE_REJECTED
  record_origin:    AUTO (engine-synced) | DRIVER (manual entry) | OTHER_USER | UNIDENTIFIED
  event_type:       CHANGE_DUTY_STATUS | INTERMEDIATE_LOG | DRIVER_LOGIN | ENGINE_POWER_ON | ...
  event_code:       OFF_DUTY | SLEEPER_BERTH | DRIVING | ON_DUTY_NOT_DRIVING
  date:             YYYYMMDD
  time:             HHMMSS (vehicle local time)
  accumulated_hours: Engine hours at event time
  accumulated_miles: Odometer at event time
  latitude:         DD.MM (degrees and minutes, per FMCSA spec)
  longitude:        DDD.MM
  distance_since_last: Miles since previous event
  elapsed_engine_hours: Engine hours since previous event
  sequence_id:      Monotonically increasing per device
  cmv_vin:          Vehicle Identification Number (hashed for storage)
```

### 3.2 Hours of Service Rules

```
US Federal HOS Rules (per FMCSA):

Property-Carrying Drivers:
  ┌──────────────────────────────────────────────┐
  │ 11-Hour Driving Limit                        │
  │ May drive max 11 hours after 10 consecutive  │
  │ hours off duty                               │
  ├──────────────────────────────────────────────┤
  │ 14-Hour On-Duty Window                       │
  │ Cannot drive beyond 14 hours after coming    │
  │ on duty (regardless of breaks)               │
  ├──────────────────────────────────────────────┤
  │ 30-Minute Break Requirement                  │
  │ Must take 30-minute break after 8 hours of   │
  │ cumulative driving                           │
  ├──────────────────────────────────────────────┤
  │ 60/70-Hour Limit                             │
  │ Cannot drive after 60 hours on duty in 7     │
  │ days or 70 hours in 8 days                   │
  ├──────────────────────────────────────────────┤
  │ 34-Hour Restart                              │
  │ May restart weekly clock after 34 consecutive │
  │ hours off duty                               │
  └──────────────────────────────────────────────┘

Real-Time Enforcement:
  - Countdown timers displayed to driver
  - Warnings at 30/15/5 minutes before limit
  - Alert to fleet manager when driver approaches violation
  - Predictive alert: "At current pace, driver will violate at [time]"
```

### 3.3 GDPR Compliance (EU Fleets)

Driver location data is classified as personal data under GDPR. Compliance requires:

| Principle | Implementation |
|---|---|
| **Lawful basis** | Legitimate interest (fleet safety) + employment contract + explicit consent for non-essential tracking |
| **Purpose limitation** | Location data used only for: dispatch, safety, compliance, customer ETA — not employee surveillance beyond legitimate need |
| **Data minimization** | Reduce GPS frequency when not operationally needed; don't track during off-duty hours |
| **Right to access** | Driver portal to view all data collected about them |
| **Right to erasure** | Delete driver PII upon termination (retain anonymized data for analytics) |
| **Data retention limits** | GPS data: 90 days personal, anonymized after; compliance data: per regulatory requirement |
| **DPIA** | Data Protection Impact Assessment completed and documented |
| **Cross-border transfers** | Data residency per driver's jurisdiction; EU data stays in EU |

**Privacy-Preserving Architecture:**
```
Driver Off-Duty:
  - GPS tracking suspended (or reduced to once per hour for theft protection)
  - No speed monitoring, no harsh event recording
  - Vehicle can be tracked for asset protection, but not linked to driver identity

Data Anonymization Pipeline:
  1. After retention period, driver_id → anonymized_id (irreversible hash)
  2. GPS coordinates → geohash level 4 (city-level, not street-level)
  3. Timestamps → date only (no time-of-day)
  4. Anonymized data retained for fleet analytics and route optimization training
```

### 3.4 IFTA Compliance

Interstate Fuel Tax Agreement requires tracking miles driven in each jurisdiction:

```
ALGORITHM CalculateIFTAMileage(vehicle_id, quarter):
    trips = GET_TRIPS(vehicle_id, quarter.start, quarter.end)

    jurisdiction_miles = {}
    jurisdiction_fuel = {}

    FOR EACH trip IN trips:
        gps_points = GET_GPS_TRAIL(vehicle_id, trip.start, trip.end)

        FOR i = 1 TO LENGTH(gps_points) - 1:
            segment_start = gps_points[i-1]
            segment_end = gps_points[i]
            segment_distance = HAVERSINE(segment_start, segment_end)

            // Determine jurisdiction from GPS coordinate
            jurisdiction = REVERSE_GEOCODE_JURISDICTION(segment_end)

            jurisdiction_miles[jurisdiction] += segment_distance
            // Fuel allocated proportionally by miles

        // Fuel purchases in this trip
        fuel_events = GET_FUEL_EVENTS(vehicle_id, trip.start, trip.end)
        FOR EACH fuel IN fuel_events:
            jur = REVERSE_GEOCODE_JURISDICTION(fuel.location)
            jurisdiction_fuel[jur] += fuel.volume_gallons

    RETURN IFTAReport(
        quarter = quarter,
        vehicle_id = vehicle_id,
        jurisdictions = [{
            jurisdiction: jur,
            miles_traveled: jurisdiction_miles[jur],
            fuel_purchased_gallons: jurisdiction_fuel[jur],
            fuel_tax_rate: GET_TAX_RATE(jur, quarter),
            net_tax_due: CALCULATE_NET_TAX(miles, fuel, rate)
        } FOR jur IN ALL_JURISDICTIONS]
    )
```

---

## 4. Access Control

### 4.1 Role-Based Access Control (RBAC)

| Role | Fleet Data | Vehicle Tracking | Driver PII | HOS/ELD | Routes | Admin |
|---|---|---|---|---|---|---|
| **Fleet Owner** | Full access | All vehicles | Full access | Full access | Full access | Full access |
| **Fleet Manager** | Read/Write | All vehicles | Limited (no SSN/license) | Full access | Full access | Limited |
| **Dispatcher** | Read | All vehicles | Name + phone only | View remaining hours | Create/Edit | None |
| **Maintenance Manager** | Vehicle info | Vehicle location | None | None | None | None |
| **Driver** | None | Own vehicle only | Own data only | Own logs only | Own route only | None |
| **Customer (tracking link)** | None | Assigned vehicle only (limited) | None | None | None | None |
| **DOT Inspector** | None | None | None | Specific driver ELD data | None | None |
| **API Partner** | Scoped per contract | Scoped per contract | None | None | Scoped | None |

### 4.2 Multi-Tenancy Isolation

```
Fleet Isolation Strategy:

Database Level:
  - All tables include fleet_id column
  - Row-level security policies enforce fleet isolation
  - Queries automatically filtered by authenticated user's fleet_id
  - Cross-fleet queries impossible through application layer

API Level:
  - OAuth token contains fleet_id claim
  - API gateway validates fleet_id in every request path matches token
  - Rate limits applied per fleet (prevent noisy neighbor)

Cache Level:
  - Cache keys prefixed with fleet_id
  - Cache eviction scoped to fleet

MQTT Level:
  - Topic ACL: Vehicle can only publish to fleet/{own_fleet_id}/vehicle/{own_id}/#
  - Subscribe ACL: Dashboard can only subscribe to fleet/{own_fleet_id}/#
  - Cross-fleet topic access denied at broker level
```

---

## 5. Audit and Forensics

### 5.1 Audit Trail

All security-relevant and compliance-relevant actions are captured in an immutable audit log:

```
Audit Event Schema:
  event_id:       UUID
  event_type:     STRING (ENUM of ~50 audit event types)
  timestamp:      TIMESTAMP (UTC, microsecond precision)
  actor_type:     SYSTEM | USER | DRIVER | DEVICE | API_KEY
  actor_id:       UUID
  fleet_id:       UUID
  resource_type:  STRING (vehicle, driver, route, geofence, eld_record, ...)
  resource_id:    UUID
  action:         CREATE | READ | UPDATE | DELETE | EXPORT | LOGIN | LOGOUT
  details:        JSONB (before/after values for updates)
  ip_address:     STRING
  user_agent:     STRING
  result:         SUCCESS | FAILURE | DENIED
  reason:         STRING (for failures/denials)

Audit Event Types (examples):
  - ELD_RECORD_EDITED (tracks who changed what, when, with annotation)
  - DRIVER_DUTY_STATUS_CHANGED
  - GEOFENCE_ALERT_ACKNOWLEDGED
  - VEHICLE_POSITION_EXPORTED
  - FLEET_SETTINGS_CHANGED
  - USER_LOGIN_FAILED
  - API_KEY_CREATED
  - CERTIFICATE_REVOKED

Retention: 7 years (immutable, append-only)
Access: Read-only for compliance officers; no delete/update API exists
```

---

*Next: [Observability →](./07-observability.md)*
