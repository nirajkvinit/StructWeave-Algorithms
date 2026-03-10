# Security & Compliance — AI-Native Agent Banking Platform for Africa

## Threat Model

### Threat Actors and Motivations

| Actor | Motivation | Capability | Primary Attacks |
|---|---|---|---|
| **Rogue Agent** | Commission fraud, float theft | Physical access to device, knowledge of system flows | Phantom transactions, float diversion, unauthorized fees, split transactions |
| **Organized Crime Ring** | Money laundering, large-scale fraud | Multiple compromised agents, synthetic identities, technical sophistication | Collusion rings, identity fraud, structuring (smurfing), cash-out attacks |
| **Device Thief** | Access to agent's float and customer data | Physical possession of stolen device | Unauthorized transactions using stolen device, data extraction |
| **Biometric Spoofer** | Impersonate customers for unauthorized withdrawals | Printed photos, fake fingerprints, deepfake videos | Spoofing attacks on biometric verification (87% of failed biometric verifications in Southern Africa are AI-spoofing related) |
| **Network Attacker** | Intercept or modify transactions in transit | Network access, MITM capability | Transaction tampering, replay attacks, session hijacking |
| **Insider (Platform Staff)** | Data theft, unauthorized access | Platform credentials, database access | Customer data exfiltration, balance manipulation, audit log tampering |
| **State-Sponsored** | Surveillance, sanctions evasion | Advanced persistent threat capability | Biometric database compromise, transaction surveillance, identity linking |

### Attack Surface Map

```mermaid
---
config:
  theme: neutral
  look: neo
---
flowchart LR
    subgraph Physical["Physical Attack Surface"]
        DEV[Agent Device<br/>Theft / Tampering]
        BIO[Biometric Sensor<br/>Spoofing]
        CASH[Cash Handling<br/>Float Diversion]
    end

    subgraph Network["Network Attack Surface"]
        CELL[Cellular Network<br/>MITM / Interception]
        USSD_A[USSD Channel<br/>Session Hijacking]
        API_A[API Endpoints<br/>Injection / DDoS]
    end

    subgraph Application["Application Attack Surface"]
        AUTH_A[Authentication<br/>Credential Theft]
        TXN_A[Transaction Logic<br/>Replay / Tampering]
        SYNC_A[Offline Sync<br/>Conflict Exploitation]
    end

    subgraph Data["Data Attack Surface"]
        BIODB_A[Biometric Database<br/>Mass Exfiltration]
        LEDGER_A[Ledger System<br/>Balance Manipulation]
        PII[Customer PII<br/>Identity Theft]
    end

    classDef physical fill:#fce4ec,stroke:#c62828,stroke-width:2px
    classDef network fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef app fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class DEV,BIO,CASH physical
    class CELL,USSD_A,API_A network
    class AUTH_A,TXN_A,SYNC_A app
    class BIODB_A,LEDGER_A,PII data
```

---

## Authentication and Access Control

### Multi-Layer Agent Authentication

```
Authentication Stack (Bottom to Top):

Layer 4: Transaction Authorization
         Per-transaction biometric or PIN for high-value transactions
         ↑
Layer 3: Session Authentication
         Agent PIN + device attestation at session start
         Session timeout: 15 min idle, 8 hours absolute
         ↑
Layer 2: Device Binding
         IMEI/serial locked to agent profile
         Device attestation checks for rooting/tampering
         Geo-fence validation against registered location
         ↑
Layer 1: Device Provisioning
         One-time secure provisioning with platform-signed certificate
         Hardware-backed key storage where available
         Remote wipe capability registered
```

### Customer Authentication Tiers

| Transaction Risk | Auth Required | Example Transactions |
|---|---|---|
| **Low** (< ₦5,000) | Phone number + Agent confirmation | Airtime purchase, low-value bill payment |
| **Medium** (₦5,000 - ₦50,000) | Biometric (single factor) OR PIN | Standard deposit/withdrawal |
| **High** (₦50,000 - ₦100,000) | Biometric + PIN (dual factor) | Large withdrawal, account-to-account transfer |
| **Very High** (> ₦100,000 or first-time) | Biometric + PIN + OTP | First-time large transaction, new payee |

### Device Security

| Control | Implementation | Purpose |
|---|---|---|
| **Device attestation** | Platform checks device integrity at each session start; detects rooted, jailbroken, or emulated devices | Prevents transaction processing on compromised devices |
| **Geo-fencing** | GPS + cell tower triangulation validates device is within registered radius (200m default per CBN mandate) | Prevents agent from operating outside approved location |
| **Remote wipe** | Platform can remotely erase all cached data (biometric templates, transaction queue, encryption keys) | Mitigates device theft risk |
| **Encrypted storage** | All local data encrypted with device-bound key stored in hardware security module (where available) or software keystore | Protects data at rest on device |
| **Screen overlay detection** | Detects malicious overlay apps that could capture PINs or biometric data | Prevents credential harvesting malware |
| **Certificate pinning** | Agent app validates server certificate against pinned certificate hash | Prevents MITM attacks via rogue certificates |

---

## Biometric Security

### Anti-Spoofing Measures

| Attack Vector | Detection Method | Response |
|---|---|---|
| **Printed photo** | Liveness detection: blink detection, head movement request, depth estimation via structured light | Reject match; flag agent for review if >3 spoofing attempts |
| **Screen replay (video)** | Moiré pattern detection, screen reflection analysis, challenge-response (random pose request) | Reject match; temporary device lockout |
| **Fake fingerprint (silicone)** | Pulse detection (capacitive sensors), sweat pore analysis, temperature sensing (on supported hardware) | Reject match; escalate to fraud team |
| **Deepfake video** | AI-generated artifact detection, temporal consistency checks, device camera metadata validation | Reject match; account freeze pending investigation |
| **3D mask** | IR-based depth analysis (where hardware supports), skin texture analysis under varying lighting | Reject match; high-severity alert |

### Biometric Template Protection

Biometric templates (the mathematical representations extracted from raw biometric captures) are sensitive data that cannot be changed if compromised (unlike passwords). Protection strategy:

1. **Cancelable biometrics**: Apply a one-way transformation to raw biometric templates before storage; if templates are compromised, generate new templates using a different transformation function
2. **Template encryption**: Encrypt templates at rest using key hierarchy (master key → per-country key → per-region key)
3. **Secure enclaves**: Biometric matching on server runs in trusted execution environments where the decrypted template is never exposed to the host operating system
4. **Access logging**: Every template access (read, match, update) logged with accessor identity, purpose, and timestamp; anomalous access patterns (bulk reads, off-hours access) trigger alerts
5. **Retention limits**: Raw biometric images (photos, fingerprint scans) deleted after template extraction; only mathematical templates retained

### Biometric Database Breach Containment

If a biometric database partition is compromised:

1. **Immediate**: Revoke all templates in affected partition; switch affected customers to PIN-only authentication
2. **24 hours**: Re-enroll affected customers with new cancelable biometric transformation
3. **Ongoing**: Forensic analysis to determine breach scope and attack vector
4. **Notification**: Regulatory notification within 72 hours per data protection requirements

---

## Multi-Jurisdiction Compliance

### Regulatory Framework Matrix

| Requirement | Nigeria (CBN) | Kenya (CBK) | Tanzania (BOT) | Ghana (BOG) |
|---|---|---|---|---|
| **Agent licensing** | Super-agent license required; ₦10M min fine for unlicensed operation | Agent banking guidelines 2010; banks designate agents | Agent banking regulations 2013; BOT approval required | Agent guidelines under Payment Systems Act |
| **Agent exclusivity** | Yes (from April 2026) | No | No | No |
| **Geo-fencing** | Mandatory for all agent devices | Not required | Not required | Not required |
| **KYC tiers** | 3 tiers (Tier 1: ₦50K daily; Tier 2: ₦200K; Tier 3: ₦500K) | 2 tiers (simplified, full) | 2 tiers based on transaction value | 3 tiers aligned with AML guidelines |
| **Transaction limits** | Customer: ₦100K daily, ₦500K weekly; Agent: ₦1.2M daily cash-out | Varies by tier | TZS 3M daily | GHS 5,000 daily |
| **STR reporting** | Real-time to NFIU | Within 24 hours to FRC | Within 3 days to FIU | Within 72 hours to FIC |
| **Data residency** | In-country (NDPA 2023) | In-country (Data Protection Act 2019) | Regional (East Africa) | In-country (Data Protection Act 2012) |
| **Agent records** | Must keep all transaction data; accurate records; report irregularities | 5-year retention | 7-year retention | 5-year retention |
| **Identity system** | NIN (National Identification Number) | Huduma Namba | NIDA | Ghana Card (GhanaPostGPS) |

### Compliance Engine Architecture

```
ALGORITHM EvaluateTransactionCompliance(transaction, agent, customer)
    country ← agent.country_code
    rules ← ComplianceRuleStore.GetRules(country, transaction.type)

    results ← []

    FOR each rule in rules:
        SWITCH rule.type:
            CASE "TRANSACTION_LIMIT":
                daily_total ← GetDailyTotal(customer.id, country)
                IF daily_total + transaction.amount > rule.daily_limit:
                    results.Add(VIOLATION(rule, "DAILY_LIMIT_EXCEEDED"))

            CASE "AGENT_LIMIT":
                agent_daily ← GetAgentDailyTotal(agent.id)
                IF agent_daily + transaction.amount > rule.agent_daily_limit:
                    results.Add(VIOLATION(rule, "AGENT_DAILY_LIMIT"))

            CASE "KYC_TIER_CHECK":
                IF customer.kyc_tier < rule.minimum_tier:
                    results.Add(VIOLATION(rule, "KYC_TIER_INSUFFICIENT"))

            CASE "GEO_FENCE":
                IF rule.geo_fence_required:
                    distance ← DistanceFromRegistered(transaction.location, agent)
                    IF distance > agent.geo_fence_radius:
                        results.Add(VIOLATION(rule, "GEO_FENCE_BREACH"))

            CASE "OPERATING_HOURS":
                IF transaction.time NOT IN rule.allowed_hours:
                    results.Add(WARNING(rule, "OUTSIDE_OPERATING_HOURS"))

            CASE "STR_THRESHOLD":
                IF transaction.amount >= rule.str_threshold:
                    QueueSTR(transaction, agent, customer)
                    results.Add(INFO(rule, "STR_FILED"))

    // Evaluate results
    violations ← results.Filter(type == VIOLATION)
    IF violations.Any():
        RETURN ComplianceResult(BLOCKED, violations)

    warnings ← results.Filter(type == WARNING)
    IF warnings.Any():
        RETURN ComplianceResult(ALLOWED_WITH_FLAGS, warnings)

    RETURN ComplianceResult(ALLOWED, [])
```

### AML/CFT Controls

| Control | Implementation | Regulatory Basis |
|---|---|---|
| **Transaction monitoring** | Real-time rule engine evaluates every transaction against typology patterns (structuring, rapid movement, unusual geographic patterns) | FATF Recommendation 20; country-specific AML laws |
| **Suspicious Transaction Reports (STR)** | Automated STR generation for transactions matching predefined criteria; manual STR capability for compliance officers | NFIU Act (Nigeria); Proceeds of Crime Act (Kenya) |
| **Sanctions screening** | Every customer and agent screened against consolidated sanctions lists (UN, AU, country-specific) at onboarding and periodically | UNSC Resolutions; country-specific sanctions regulations |
| **PEP screening** | Politically exposed person screening at account opening and periodic re-screening | FATF Recommendation 12 |
| **Enhanced Due Diligence (EDD)** | Triggered for high-risk customers (PEP matches, high-value transactions, cross-border activity); requires additional documentation and senior approval | Risk-based approach per FATF |
| **Record retention** | All transaction records, KYC documents, and STRs retained for 5-7 years (varies by jurisdiction); tamper-evident storage with audit trail | Country-specific record retention laws |

---

## Data Protection

### Personal Data Classification

| Category | Examples | Protection Level | Retention |
|---|---|---|---|
| **Biometric data** | Fingerprint templates, facial embeddings, raw images | Highest — encrypted at rest and in transit; access-controlled; cancelable templates | Templates: account lifetime + 1 year; Raw images: deleted after template extraction |
| **Financial data** | Transaction records, balances, float history | High — encrypted at rest; access logging; regulatory retention requirements | 5-7 years per jurisdiction |
| **Identity data** | Name, national ID number, date of birth, address | High — encrypted at rest; minimized collection; consent-based | Account lifetime + regulatory retention |
| **Device data** | IMEI, GPS coordinates, device fingerprint | Medium — encrypted; pseudonymized for analytics | 1 year after device decommissioning |
| **Behavioral data** | Transaction patterns, login times, feature usage | Medium — anonymized for ML training; consent-based for profiling | 2 years; anonymized after |

### Privacy-by-Design Principles

1. **Data minimization**: Collect only what is necessary for the specific function; biometric raw images deleted after template extraction; GPS precision reduced for analytics (grid-level, not exact location)
2. **Purpose limitation**: Data collected for KYC cannot be used for marketing without explicit consent; fraud detection uses transaction patterns, not personal demographics
3. **Consent management**: Explicit consent captured at enrollment for biometric collection, data processing, and cross-border data transfer; consent records maintained with tamper-evident logging
4. **Right to deletion**: Customer can request account closure and data deletion; biometric templates deleted; transaction records retained for regulatory minimum period in anonymized form
5. **Data portability**: Customer can export their transaction history in machine-readable format (regulatory requirement in some jurisdictions)

---

## Incident Response

### Security Incident Severity Levels

| Level | Definition | Example | Response Time | Escalation |
|---|---|---|---|---|
| **P1 — Critical** | Active exploitation affecting financial integrity or mass data breach | Ledger manipulation; biometric DB exfiltration; active fraud campaign | < 15 min response | CISO + CEO + Regulators |
| **P2 — High** | Potential financial loss or data exposure | Compromised agent credentials; unauthorized API access; single-agent fraud ring | < 1 hour response | CISO + Engineering Lead |
| **P3 — Medium** | Security control failure without immediate exploitation | Failed device attestation spike; unusual bulk API calls; geo-fence bypass | < 4 hours response | Security Team Lead |
| **P4 — Low** | Security anomaly requiring investigation | Unusual login patterns; minor compliance deviation; failed spoofing attempt | Next business day | Security Analyst |

### Agent Device Compromise Protocol

When a device is reported stolen or suspected compromised:

1. **Immediate (< 5 minutes)**: Remote wipe command sent to device; agent session invalidated; agent account suspended; all pending offline transactions from that device flagged for review
2. **Within 1 hour**: Analyze all transactions from the device in the last 24 hours for anomalies; freeze customer accounts that transacted on the device if anomalies detected; notify affected customers
3. **Within 24 hours**: Complete forensic analysis; file regulatory notifications; coordinate with law enforcement if financial loss confirmed
4. **Recovery**: Issue new device; re-provision with fresh credentials; re-activate agent with enhanced monitoring for 30 days
