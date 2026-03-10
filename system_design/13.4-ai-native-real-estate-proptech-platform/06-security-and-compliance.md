# 13.4 AI-Native Real Estate & PropTech Platform — Security & Compliance

## Regulatory Landscape

Real estate technology operates under some of the most complex and consequential regulatory frameworks in any industry, spanning fair housing, consumer finance, building safety, environmental disclosure, and data privacy.

### Fair Housing and Fair Lending

| Regulation | Scope | Impact on Platform |
|---|---|---|
| **Fair Housing Act (FHA)** | Prohibits discrimination in housing based on race, color, national origin, religion, sex, familial status, disability | Tenant matching must exclude protected variables and proxies; property recommendations cannot steer users away from neighborhoods based on demographics |
| **Equal Credit Opportunity Act (ECOA)** | Requires creditors to provide specific adverse action reasons when denying credit | AVM used in lending must generate explainable valuations; tenant screening must provide adverse action notices |
| **Home Mortgage Disclosure Act (HMDA)** | Requires lenders to report loan application demographics | AVM outputs consumed by lenders inherit HMDA reporting obligations; valuation disparities are auditable |
| **Appraisal Foundation standards (USPAP)** | Professional standards for property valuation | AVM methodology must be documentable and defensible; comparable selection must be transparent |

### Building and Safety Codes

| Regulation | Scope | Impact on Platform |
|---|---|---|
| **ASHRAE 62.1** | Ventilation for acceptable indoor air quality | HVAC optimizer must maintain minimum ventilation rates per zone regardless of energy optimization objectives |
| **NFPA 72** | National Fire Alarm and Signaling Code | Fire detection and alarm systems must operate independently of building intelligence platform; response time requirements |
| **OSHA workplace standards** | Occupational safety for building occupants | CO, CO2, temperature, and humidity must stay within OSHA limits; platform must alert and actuate if limits are approached |
| **ADA compliance** | Accessibility requirements | Building intelligence must not disadvantage occupants who use accessibility features (e.g., elevators must not be deprioritized by energy optimization) |

### Data Privacy

| Regulation | Scope | Impact on Platform |
|---|---|---|
| **CCPA / CPRA** | California consumer data privacy | Property search history, saved homes, and screening data are personal information; right to deletion; opt-out of sale |
| **State tenant screening laws** | Vary by state; limit what data can be used | Some states prohibit criminal history in screening; some limit credit inquiry lookback period; platform must be configurable per jurisdiction |
| **FCRA** | Fair Credit Reporting Act | Tenant screening that uses credit data must comply with FCRA: permissible purpose, adverse action notices, consumer dispute process |
| **State biometric laws** | Illinois BIPA, Texas CUBI, Washington biometric law | Occupancy detection using facial recognition or biometric identification requires consent; prefer non-biometric methods (WiFi, badge, thermal) |

---

## Fair Housing Compliance Architecture

### Prohibited Variable Exclusion

The platform maintains a prohibited feature registry that lists variables that must never be used directly in tenant screening or property recommendation ranking:

```
Prohibited features (direct):
  - race, ethnicity, national_origin
  - religion
  - sex, gender, sexual_orientation
  - familial_status (presence of children, pregnancy)
  - disability_status
  - military/veteran_status (in some jurisdictions)
  - source_of_income (Section 8 vouchers; required in many jurisdictions)
```

**Proxy detection pipeline:**
Every feature used in tenant matching or property recommendation is tested quarterly for proxy correlation with protected classes:

1. **Statistical independence test:** For each candidate feature, compute mutual information with census-tract-level demographic composition. Features with mutual information above a threshold (calibrated per market) are flagged as potential proxies.

2. **Causal analysis:** Not all correlated features are proxies. Property value is correlated with neighborhood demographics, but this correlation reflects legitimate economic factors (school quality, amenities, employment access). The compliance team reviews flagged features to determine whether the correlation reflects a legitimate business justification or an impermissible proxy.

3. **Feature audit trail:** Every feature inclusion/exclusion decision is documented with justification, reviewer identity, and review date. This trail is available for regulatory examination.

### Anti-Steering in Property Recommendations

The property search engine must not "steer" users toward or away from neighborhoods based on demographics. This constraint affects the recommendation algorithm:

- **Prohibited signal:** The recommendation engine must not use the user's inferred race, ethnicity, or national origin to adjust which neighborhoods are recommended
- **Permitted signal:** The engine may use explicitly stated preferences (school district, commute time to workplace, price range) even if these correlate with demographic patterns, because these are legitimate housing search criteria
- **Monitoring:** A/B testing infrastructure compares recommendation distributions across user demographic groups. If users from different demographic groups receive statistically different neighborhood distributions after controlling for stated preferences, the algorithm is investigated for implicit steering

### Tenant Screening Adverse Action Compliance

When a tenant application is denied (or approved with conditions), the platform must provide specific, actionable adverse action reasons. This requires the screening model to be locally explainable:

1. For each denied application, the explainability engine computes SHAP values for the screening model's decision
2. The top 3-5 factors driving the denial are translated into standardized adverse action reason codes (per FCRA/ECOA)
3. The adverse action notice includes: specific reasons, the applicant's right to dispute, free credit report access information, and the contact information for the screening decision-maker
4. All adverse action notices are stored for 5 years in an immutable audit trail

---

## AVM Bias Detection and Mitigation

### Disparate Impact Testing

The platform runs automated disparate impact analysis monthly on AVM outputs:

```
FOR each census_tract:
  majority_group = tract.majority_demographic_group
  minority_group = tract.largest_minority_group

  majority_error = median_absolute_error(
    avm_estimates[majority_tracts], actual_prices[majority_tracts]
  )
  minority_error = median_absolute_error(
    avm_estimates[minority_tracts], actual_prices[minority_tracts]
  )

  -- Four-fifths rule: if minority accuracy < 80% of majority accuracy
  IF minority_error / majority_error > 1.25:  -- inverse: higher error = worse accuracy
    FLAG tract for review
    GENERATE detailed report with:
      - Feature importance differences between groups
      - Comparable selection patterns (are minority-area properties matched to
        lower-quality comparables?)
      - Data quality differences (fewer recent transactions in minority areas?)
```

### Appraisal Bias Detection

Beyond statistical testing, the platform monitors for individual valuation outliers that may indicate bias:

- **Reconsideration of value (ROV) tracking:** When a borrower challenges an AVM estimate, the platform logs the challenge, the original estimate, the revised estimate (if any), and the demographic characteristics of the neighborhood. A pattern of successful challenges concentrated in specific demographic areas triggers a model review.
- **Paired testing:** The platform periodically generates synthetic valuation requests for property pairs that differ only in neighborhood demographics (controlling for all property-level features). Statistically significant valuation differences between paired properties indicate potential bias in the spatial model component.

---

## Building IoT Security

### Network Segmentation

Building IoT networks are segmented into isolated zones to prevent lateral movement from a compromised sensor to building controls:

```
Zone 1: Safety Systems (air-gapped from internet)
  - Fire alarm, CO detection, emergency ventilation
  - Connected only to edge safety controller via dedicated BACnet/IP network
  - No IP connectivity to Zone 2, 3, or internet

Zone 2: Building Controls (isolated VLAN)
  - HVAC actuators, lighting controls, elevator controls
  - Connected to edge gateway via Modbus TCP on dedicated VLAN
  - Gateway mediates all commands; actuators cannot be addressed directly from internet

Zone 3: Monitoring Sensors (IoT VLAN)
  - Temperature, humidity, occupancy, energy meters
  - Read-only sensors; no actuation capability
  - Connected to edge gateway via MQTT over TLS

Zone 4: Edge Gateway (DMZ)
  - Aggregates data from Zones 2 and 3
  - Communicates with cloud via outbound-only HTTPS connections
  - Receives commands from cloud via authenticated, signed command channel
  - Command channel uses mutual TLS + command signing (each command signed with building-specific key)

Zone 5: Cloud Platform
  - Digital twin, RL optimizer, analytics
  - Commands to building pass through Zone 4 gateway; never directly to actuators
```

### Command Authentication and Authorization

Every command from the cloud to a building actuator (setpoint change, mode switch, equipment on/off) follows a chain of authentication:

1. **Command origin:** The RL optimizer or human operator issues a command via the building intelligence API
2. **Authorization check:** The command is validated against the building's authorized command set (e.g., the optimizer can adjust setpoints within ±5°F but cannot override safety systems)
3. **Command signing:** The command is signed with the building's command key (asymmetric cryptography; cloud holds signing key, edge gateway holds verification key)
4. **Rate limiting:** The edge gateway rate-limits commands (max 10 setpoint changes per zone per hour) to prevent runaway optimization loops from damaging equipment
5. **Actuator execution:** The edge gateway translates the signed command into the native protocol (BACnet write, Modbus register write) and sends to the actuator
6. **Confirmation:** The actuator confirms execution; the edge gateway logs the command and confirmation to the audit trail

### Sensor Data Integrity

Building sensors can be spoofed or tampered with (e.g., an occupant tapes a warm object to a temperature sensor to increase cooling). The platform detects anomalous sensor readings via:

- **Physical plausibility checks:** Temperature cannot change by more than 5°F in 1 minute; occupancy cannot exceed building capacity; energy cannot be negative
- **Cross-sensor consistency:** If a temperature sensor reports 85°F but all adjacent zone sensors report 72°F, the outlier is flagged
- **Temporal pattern detection:** A sensor that suddenly starts reporting constant values (stuck sensor) or perfectly periodic values (simulated data) is flagged for maintenance

---

## Data Privacy and Tenant Protection

### Data Minimization in Tenant Screening

The platform collects only the minimum data necessary for screening decisions:

| Data Category | Collected | Retention | Justification |
|---|---|---|---|
| Credit report | Yes (with consent) | 30 days after decision | FCRA permissible purpose; deleted after screening complete |
| Income verification | Yes | 30 days after decision | Rent-to-income ratio calculation |
| Rental history | Yes (with consent) | 30 days after decision | Payment history assessment |
| Criminal history | Jurisdiction-dependent | 30 days if collected | Prohibited in many jurisdictions; platform checks local law before requesting |
| Social media | Never | N/A | Not a legitimate screening factor; invasion of privacy |
| Biometric data | Never | N/A | Not relevant to tenant screening |

### Right to Deletion

When a tenant applicant exercises their right to deletion (CCPA/CPRA):
1. Screening data (credit report, income, application details) is permanently deleted
2. The screening decision record (approve/deny, date, adverse action reasons) is retained in anonymized form for 5 years (regulatory requirement)
3. The anonymized record cannot be re-linked to the individual (SSN hash is deleted; only anonymized aggregate statistics remain)

### Search History Privacy

Property search behavior (queries, viewed listings, saved homes, search frequency) is sensitive because it may reveal life circumstances (divorce, job change, financial stress). The platform:

- Stores search history only when the user is authenticated and has consented
- Provides clear UI for users to view and delete their search history
- Does not share individual search behavior with listing agents or property owners
- Uses search history for personalization only; never for advertising targeting without explicit opt-in
- Automatically purges search history after 12 months of account inactivity

---

## Compliance Monitoring Dashboard

| Metric | Target | Alert Threshold |
|---|---|---|
| AVM disparate impact ratio (minority/majority error) | ≤ 1.25 | > 1.20 |
| Adverse action notice delivery rate | 100% within 30 days | Any missed notice |
| Prohibited variable detection (proxy test) | All features tested quarterly | Any untested feature in production model |
| Building safety response time p99 | ≤ 100 ms | > 80 ms |
| ASHRAE 62.1 ventilation compliance rate | 100% | < 99.9% |
| Tenant data deletion request completion | ≤ 30 days | > 15 days |
| Credit report retention compliance | Delete within 30 days of decision | Any report retained > 35 days |
| ROV (reconsideration of value) rate by demographic group | Equal across groups (±10%) | > 20% disparity |
