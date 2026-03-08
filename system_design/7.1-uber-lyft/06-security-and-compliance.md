# Security & Compliance

## Overview

A ride-hailing platform handles uniquely sensitive data: real-time location of millions of people, payment information, driver identity documents, and trip history that can reveal personal patterns (home address, work location, frequented places). Security failures have legal, financial, and physical safety consequences.

---

## Authentication & Authorization

### Authentication

| Actor | AuthN Method | Token Type | Lifetime |
|-------|-------------|------------|----------|
| Rider (mobile app) | Phone number + OTP; Social login (OAuth2) | JWT access token + refresh token | Access: 1 hour; Refresh: 30 days |
| Driver (mobile app) | Phone number + OTP; Document verification | JWT access token + refresh token | Access: 1 hour; Refresh: 30 days |
| Internal services | mTLS (mutual TLS) | X.509 certificates | Rotated every 90 days |
| Admin portal | SSO (OIDC) + MFA | Session token | 8 hours; MFA re-prompt every 2 hours |
| Third-party API | API key + OAuth2 client credentials | Bearer token | API key: rotated quarterly; Token: 1 hour |

### Authorization Model

```
PSEUDOCODE: Permission Model

ROLE_PERMISSIONS = {
    "rider": [
        "trip.request", "trip.cancel_own", "trip.view_own", "trip.rate",
        "payment.add_method", "payment.view_own",
        "profile.view_own", "profile.edit_own"
    ],
    "driver": [
        "trip.accept", "trip.decline", "trip.start", "trip.complete",
        "trip.view_own", "trip.rate",
        "earnings.view_own", "profile.view_own", "profile.edit_own",
        "location.update"
    ],
    "city_operations": [
        "trip.view_city", "driver.view_city", "surge.view_city",
        "surge.configure_city", "driver.suspend_city"
    ],
    "global_admin": [
        "*"  // All permissions
    ],
    "support_agent": [
        "trip.view_any", "trip.refund", "rider.view_any", "driver.view_any",
        "rider.suspend", "driver.suspend"
    ]
}

FUNCTION authorize(actor, action, resource):
    // Step 1: Check role permissions
    IF action NOT IN ROLE_PERMISSIONS[actor.role]:
        RETURN DENY

    // Step 2: Check resource ownership (for _own actions)
    IF action.endswith("_own"):
        IF resource.owner_id != actor.id:
            RETURN DENY

    // Step 3: Check geographic scope (for _city actions)
    IF action.endswith("_city"):
        IF resource.city_id != actor.assigned_city_id:
            RETURN DENY

    RETURN ALLOW
```

---

## Driver Background Check and Identity Verification

### Verification Flow

```
Driver Registration Pipeline:
1. Identity verification
   - Government-issued ID (driver's license, passport)
   - Face match: selfie compared to ID photo (liveness detection)
   - Name and DOB cross-check against government database

2. Background check
   - Criminal record check (national + local)
   - Driving record check (violations, suspensions)
   - Sex offender registry check
   - Terrorism watchlist check

3. Vehicle verification
   - Vehicle registration document
   - Insurance certificate (minimum coverage)
   - Vehicle inspection report (roadworthiness)
   - Vehicle photos (exterior, interior, license plate)

4. Ongoing monitoring
   - Annual background re-check
   - Continuous driving record monitoring
   - Real-time safety incident review
   - Random vehicle inspection requests
```

### Document Storage

- All identity documents are encrypted at rest with per-document keys
- Documents are stored in object storage with access logging
- Access requires specific role + audit log entry
- Documents are automatically purged after regulatory retention period (varies by jurisdiction)

---

## Location Privacy

### Rider Location Privacy

| Context | Location Handling |
|---------|------------------|
| Before ride request | Rider's precise location never shared with drivers |
| During matching | Only the pickup address (not rider's current location) is shared with the matched driver |
| During trip | Rider's real-time location is shared with the assigned driver only |
| After trip | Trip route stored; accessible only to the rider and support agents with audit trail |
| On the map (nearby drivers view) | Drivers shown on map are location-fuzzed (~200m randomization) to prevent tracking |

### Driver Location Privacy

| Context | Location Handling |
|---------|------------------|
| Available (waiting for rides) | Location shared with matching engine only; not exposed to riders |
| En route to pickup | Driver's real-time location shared with the matched rider only |
| During trip | Driver's location shared with the rider; stored for trip record |
| Offline | No location tracking; app does not send location data |
| On the rider map | Available drivers shown with randomized positions (~200m offset) |

### Location Data Retention

```
Real-time location data:
- In geospatial index: retained only while driver is online (evicted on offline/stale)
- In message queue: retained for 24 hours (pipeline reprocessing)

Trip location data:
- Trip route polyline: retained for 3 years (disputes, regulatory)
- Raw GPS waypoints: retained for 90 days (debugging, accuracy)
- After retention period: anonymized (driver_id and rider_id removed)

Analytics:
- Aggregated zone-level demand data: retained indefinitely (no PII)
- Individual trip data for ML training: anonymized after 1 year
```

### Location Fuzzing Algorithm

```
PSEUDOCODE: Location Fuzzing for Map Display

FUNCTION fuzz_location(lat, lng, fuzz_radius_meters=200):
    // Generate a random offset within a circle of given radius
    random_angle = random_uniform(0, 2 * PI)
    random_distance = fuzz_radius_meters * sqrt(random_uniform(0, 1))

    // Convert meters to degrees (approximate)
    delta_lat = (random_distance * cos(random_angle)) / 111320
    delta_lng = (random_distance * sin(random_angle)) / (111320 * cos(radians(lat)))

    RETURN (lat + delta_lat, lng + delta_lng)

// Applied when sending driver positions for the "nearby drivers" map view
// NOT applied for the matched driver's real-time location during an active trip
```

---

## Payment Security

### PCI-DSS Compliance

| Requirement | Implementation |
|-------------|---------------|
| Never store raw card numbers | Payment processor tokenization; only store payment tokens |
| Encrypt cardholder data in transit | TLS 1.3 for all payment API calls |
| Restrict access to cardholder data | Payment service is isolated; only accessible via internal API gateway |
| Maintain vulnerability management | Quarterly ASV (Approved Scanning Vendor) scans |
| Implement access control measures | Payment service access requires MFA + role-based access |
| Regularly test security systems | Annual penetration testing; continuous automated scanning |
| Maintain information security policy | Documented and reviewed quarterly |

### Payment Flow Security

```
Rider adds card:
1. Card details entered in the mobile app (never sent to platform servers)
2. Mobile SDK sends card details directly to the payment processor (tokenization)
3. Payment processor returns a payment token
4. Platform stores only the token + last 4 digits + card type
5. Subsequent charges use the token, never the card number

Charge flow:
1. Trip completes → Trip Service calculates fare
2. Trip Service sends charge request with payment token + amount to Payment Service
3. Payment Service calls payment processor with token
4. Payment processor charges the card and returns confirmation
5. Platform stores transaction ID (not card details)
```

---

## Anti-Fraud

### GPS Spoofing Detection

Drivers may spoof GPS to appear in surge zones or fabricate trip distance:

```
PSEUDOCODE: GPS Spoofing Detection

FUNCTION detect_gps_spoofing(driver_id, location_history):
    // Check 1: Impossible speed
    FOR i IN 1..len(location_history):
        prev = location_history[i-1]
        curr = location_history[i]
        time_delta = curr.timestamp - prev.timestamp
        distance = haversine(prev, curr)
        speed = distance / time_delta * 3600  // km/h

        IF speed > 200:  // Physically impossible for a car
            flag("impossible_speed", driver_id, speed)

    // Check 2: Location jump (teleportation)
    FOR i IN 1..len(location_history):
        prev = location_history[i-1]
        curr = location_history[i]
        IF haversine(prev, curr) > 10_km AND (curr.timestamp - prev.timestamp) < 30_seconds:
            flag("teleportation", driver_id)

    // Check 3: Sensor consistency
    // GPS location vs. cell tower triangulation vs. WiFi positioning
    IF cell_tower_location AND haversine(gps_location, cell_tower_location) > 5_km:
        flag("gps_cell_mismatch", driver_id)

    // Check 4: Mock location API detection (Android)
    IF device_reports_mock_location_enabled:
        flag("mock_location_api", driver_id)

    // Check 5: Route plausibility
    IF trip_route_distance > straight_line_distance * 3:
        flag("implausible_route", driver_id)
```

### Fake Ride Detection

Collusion between rider and driver to generate fake trips (for driver bonuses or promotions):

| Signal | Detection |
|--------|-----------|
| Same rider-driver pair repeatedly | Flag accounts with >5 trips between the same pair in a week |
| Very short trips with surge | Flag trips < 0.5 km during high surge |
| Trips starting and ending at same location | Circular trip detection |
| New accounts with immediate high-value trips | Account age + trip value correlation |
| Trips during off-peak in surge zones | Statistical anomaly in zone demand |

### Account Takeover Prevention

| Measure | Implementation |
|---------|---------------|
| Device fingerprinting | Track device ID, OS version, app version; alert on new device |
| Behavioral biometrics | Typing patterns, tap pressure, screen interaction patterns |
| Session binding | JWT bound to device ID; token invalid on different device |
| Suspicious activity alerts | Login from new city, multiple failed OTPs, payment method changes |
| Step-up authentication | Re-verify phone OTP for sensitive actions (payment change, account deletion) |

---

## Surge Pricing Transparency and Regulation

### Regulatory Compliance

| Jurisdiction | Requirement | Implementation |
|-------------|-------------|---------------|
| General | Show surge multiplier before ride confirmation | Fare estimate includes surge breakdown |
| Some US states | Cap surge during declared emergencies | Emergency surge cap flag in city config; override multiplier to max allowed |
| EU (Consumer Rights) | Clear price before commitment | Upfront fare shown; surge clearly labeled |
| India (guidelines) | Maximum surge cap (varies by state) | Per-state max_surge configuration |
| Australia | Price transparency | Fare estimate range displayed; actual fare cannot exceed estimate by >20% |

### Surge Audit Trail

Every surge computation is logged:
- Zone, timestamp, demand count, supply count, ratio, computed multiplier, applied multiplier (after caps/smoothing)
- Retained for 2 years for regulatory audits
- Accessible to city operations team and compliance officers

---

## Driver Data and Labor Compliance

### Data Subject Rights (GDPR and Similar)

| Right | Implementation |
|-------|---------------|
| Right to access | Driver can export all personal data (profile, trip history, earnings, ratings) |
| Right to erasure | Delete personal data (except legally required records); anonymize trip history |
| Right to portability | Export data in machine-readable format (JSON/CSV) |
| Right to rectification | Edit profile data; dispute ratings |
| Right to restriction | Pause data processing (effectively going offline) |

### Labor Classification Implications

Different jurisdictions classify drivers differently (independent contractor vs. employee). The system must support:

- **Per-jurisdiction earnings reporting**: Tax documents (1099 in US, equivalent in other countries)
- **Hour tracking**: Record online hours, active trip hours, breaks (required in some jurisdictions)
- **Minimum earnings guarantees**: Some jurisdictions require minimum per-trip or per-hour earnings
- **Benefits eligibility tracking**: Based on hours worked, trip count, or tenure

---

## Data Encryption

| Data | At Rest | In Transit |
|------|---------|------------|
| User PII (name, email, phone) | Encrypted with per-tenant key | TLS 1.3 |
| Payment tokens | Encrypted with dedicated payment key; HSM-backed | TLS 1.3 + certificate pinning |
| Location data | Encrypted at rest in storage | TLS 1.3 |
| Driver documents | Encrypted with per-document key | TLS 1.3 |
| Trip data | Encrypted at rest | TLS 1.3 |
| Internal service communication | N/A (in-memory) | mTLS between all services |
| Backups | Encrypted with backup-specific key; key stored in separate key management service | TLS 1.3 for transfer |

---

## Safety Features

| Feature | Implementation |
|---------|---------------|
| Emergency button | In-app emergency button shares live location with emergency services and emergency contacts |
| Trip sharing | Rider can share real-time trip progress with trusted contacts |
| Ride check | Automated detection of unusual stops, route deviations, or crashes; proactive outreach |
| Driver identity verification | Periodic selfie check during online hours to verify the registered driver is driving |
| Post-trip incident reporting | In-app reporting for safety concerns; dedicated safety response team |
| Audio recording (where legal) | Opt-in trip audio recording stored encrypted; accessible only to safety team for incident review |
