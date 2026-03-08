# Security & Compliance

## Authentication & Authorization

### User Authentication

```
Authentication flow:
├── Registration: email + password (bcrypt, cost factor 12)
├── Login: email/password → JWT access token (15 min) + refresh token (30 days)
├── MFA: optional TOTP for travel agents, mandatory for admin roles
├── Social login: Google, Apple (OAuth2 PKCE flow)
└── Session management: refresh token rotation on each use

JWT claims:
{
  "sub": "user-uuid",
  "role": "TRAVELER|AGENT|AIRLINE_ADMIN|PLATFORM_ADMIN",
  "permissions": ["search", "book", "manage_own_bookings"],
  "iss": "flight-booking-system",
  "exp": 1702300000,
  "iat": 1702299100
}
```

### API Authorization (RBAC)

| Endpoint | Traveler | Agent | Airline Admin | Platform Admin |
|----------|----------|-------|---------------|----------------|
| POST /search | Yes | Yes | Yes | Yes |
| POST /bookings/hold | Yes | Yes | No | No |
| GET /bookings/:id | Own only | Own + assigned | Airline flights | All |
| DELETE /bookings/:id | Own only | Own + assigned | No | All |
| GET /pnr/:code | Own only | Any | Airline PNRs | All |
| POST /checkin | Own only | Own + assigned | No | No |
| PUT /inventory | No | No | Own airline | All |
| GET /analytics | No | Commission report | Airline report | Full dashboard |

### GDS API Authentication

```
GDS connectivity:
├── Amadeus: OAuth2 client credentials + API key per agency (IATA code)
├── Sabre: SOAP WS-Security with X.509 certificate + session token
├── Travelport: Universal API with credentials + target branch
├── NDC airlines: mTLS (mutual TLS) with airline-issued certificates
└── All: API keys rotated quarterly, stored in secrets manager
```

---

## PCI-DSS Compliance

### Scope Minimization

The booking system **never sees raw card numbers**. Payment is handled through scope-minimizing architecture:

```
Payment flow (PCI-DSS SAQ A-EP):

1. Frontend loads payment gateway's JavaScript SDK
2. Card details entered directly into gateway's iframe/SDK
3. SDK tokenizes card → returns single-use token (e.g., "tok_visa_4242")
4. Token sent to Booking Service → forwarded to Payment Service
5. Payment Service calls gateway API with token
6. Gateway charges the card, returns transaction reference
7. Payment Service stores: token (masked), transaction ref, amount
   └── NEVER stores: full card number, CVV, expiry

Stored payment data:
├── Card token: "tok_visa_4242" (tokenized, cannot be reversed)
├── Last 4 digits: "4242" (for display only)
├── Card brand: "VISA"
├── Transaction reference: "ch_abc123"
└── Amount, currency, timestamp
```

### PCI Controls

| Control | Implementation |
|---------|---------------|
| Network segmentation | Payment Service runs in isolated network segment; no direct access from search/booking services |
| Encryption in transit | TLS 1.3 for all API calls; mTLS between Payment Service and gateway |
| No card data logging | Structured logging with automatic PII redaction; card fields never serialized |
| Access control | Payment Service accessible only via internal API gateway; no direct external access |
| Monitoring | Anomaly detection on payment patterns; alerts on unusual transaction volumes |
| Penetration testing | Annual PCI-DSS audit + quarterly ASV scans |

---

## PII Protection

### Sensitive Data Classification

| Data | Classification | Storage | Access |
|------|---------------|---------|--------|
| Passport number | **Critical PII** | AES-256-GCM encrypted at rest; dedicated encryption key | Booking creation, check-in, APIS reporting only |
| Date of birth | **PII** | Encrypted at rest | Booking creation, APIS reporting |
| Full name | **PII** | Plaintext (needed for search/display) | All booking-related services |
| Email / Phone | **PII** | Plaintext | Notification service, booking retrieval |
| Frequent flyer # | **Sensitive** | Encrypted at rest | Booking creation, airline sync |
| Payment tokens | **Sensitive** | Encrypted at rest | Payment service only |

### Encryption Architecture

```
Key management:
├── Master key: HSM-backed, never exported
├── Data encryption keys (DEKs): per-table, rotated monthly
├── Envelope encryption: DEKs encrypted by master key
└── Key rotation: zero-downtime re-encryption via background job

Field-level encryption:
├── passport_number_encrypted = AES-256-GCM(passport_number, DEK_passengers)
├── Indexed fields (email, pnr_code): use deterministic encryption for lookups
└── Search-incompatible fields (passport): use randomized encryption (more secure)
```

### Data Masking in Logs

```
Log sanitization rules:
├── Passport: "US12345678" → "US****5678"
├── Email: "john.doe@email.com" → "j***@e***.com"
├── Phone: "+1-555-123-4567" → "+1-555-***-4567"
├── Card token: never logged (excluded from structured log schema)
├── PNR code: logged as-is (needed for debugging, not PII by itself)
└── Full name: logged as-is (needed for support troubleshooting)
```

---

## GDPR Compliance

| Requirement | Implementation |
|-------------|---------------|
| **Right to Access** | GET /api/v1/users/:id/data-export → returns all PNR data, booking history, price alerts in JSON/CSV |
| **Right to Erasure** | DELETE /api/v1/users/:id/data → anonymize PII in bookings; delete price alerts; retain anonymized booking records for financial/legal compliance |
| **Data Portability** | Same as access; machine-readable JSON format |
| **Consent Management** | Explicit consent for marketing emails, price alert notifications; separate consent for data sharing with airlines |
| **Data Minimization** | Passport data only collected at booking (not search); deleted 30 days after trip completion |
| **Breach Notification** | Automated incident classification; 72-hour notification pipeline to DPA |
| **Retention Policy** | Active bookings: indefinite; completed trip PNR: 5 years (legal/financial); passenger PII: 1 year post-trip; search history: 90 days |

**Legal hold exception**: Completed flight PNRs cannot be deleted during the 5-year retention period due to aviation regulatory requirements (ICAO Annex 9, national border control laws).

---

## Aviation-Specific Compliance

### APIS (Advance Passenger Information System)

Airlines are legally required to transmit passenger data to destination country authorities before departure:

```
APIS data required:
├── Full name (as on passport)
├── Date of birth
├── Gender
├── Nationality
├── Passport number and expiry date
├── Country of issuance
├── Destination address (for US-bound flights)
└── Redress number / Known Traveler number (US)

Transmission timing:
├── US (CBP): 72 hours before departure (for Secure Flight)
├── EU (EES/ETIAS): at check-in or before departure
├── Other: varies by country (typically at check-in)

System responsibility:
├── Collect APIS data during booking (mandatory fields)
├── Validate format (ICAO MRTD format for names)
├── Transmit to airline's DCS (Departure Control System)
├── Airline DCS transmits to government authority
└── Store transmission confirmation for audit trail
```

### Fare Advertising Regulations

```
US DOT (Department of Transportation):
├── Must display total price including all mandatory taxes and fees
├── Must not display "base fare" without total prominently
├── Baggage fees must be disclosed before purchase
└── 24-hour free cancellation rule (for bookings made 7+ days before departure)

EU (Regulation 1008/2008):
├── Final price must be indicated at all times
├── Taxes, fees, charges, and surcharges must be broken down
├── Optional services clearly identified as such
└── Currency clearly stated
```

---

## Threat Model

### Threat 1: Seat Inventory Exhaustion (Denial of Inventory)

```
Attack: Bots repeatedly hold seats without completing payment, blocking legitimate users

Impact: Revenue loss from held-but-unpaid seats; actual customers see "sold out"

Mitigations:
├── Hold limit: max 3 active holds per user / IP / session
├── CAPTCHA: on booking hold page (invisible reCAPTCHA, escalate to challenge on suspicion)
├── Behavioral analysis: detect bot patterns (rapid sequential holds, no mouse movement)
├── Progressive TTL: first hold = 15 min, subsequent holds for same user = 10 min, 5 min
├── Device fingerprinting: track device ID across sessions
└── IP rate limiting: max 10 hold requests per IP per hour
```

### Threat 2: Price Scraping

```
Attack: Competitors or aggregators scrape all fares at high frequency

Impact: GDS cost explosion (each scrape triggers expensive API calls); competitive intelligence leak

Mitigations:
├── Rate limiting: 100 searches per IP per hour (tiered by user tier)
├── Bot detection: browser fingerprinting, JavaScript challenges
├── Search throttling: progressive delays for high-frequency searchers
├── Honeypot routes: detect scrapers by monitoring searches on fake routes
└── Legal: Terms of Service prohibit automated scraping; DMCA for cached fare data
```

### Threat 3: PNR Manipulation

```
Attack: Attacker modifies PNR to change passenger name, add segments, or cancel others' bookings

Impact: Unauthorized travel, financial loss, passenger safety risk

Mitigations:
├── PNR access: requires booking_id + user authentication (PNR code alone is insufficient)
├── Sensitive changes: name change, new segment → require re-authentication (step-up auth)
├── GDS change logging: all PNR modifications logged with user, timestamp, IP
├── Audit trail: immutable append-only log of all booking state changes
└── Anomaly detection: alert on unusual PNR modification patterns (bulk changes, name changes close to departure)
```

### Threat 4: Payment Fraud

```
Attack: Stolen credit cards used to book flights

Impact: Chargebacks, financial loss, regulatory scrutiny

Mitigations:
├── 3D Secure 2 (3DS2): strong customer authentication for card payments
├── ML fraud scoring: evaluate transaction risk based on passenger history, booking pattern, IP geolocation
├── Velocity checks: max 5 bookings per card per day, max $10,000 per card per week
├── AVS (Address Verification): match billing address with card issuer
├── Manual review queue: high-risk transactions flagged for human review before ticketing
└── Chargeback management: automated dispute response with booking evidence
```

---

## Security Architecture Summary

```
Security layers:
├── Edge: WAF (rate limiting, SQL injection, XSS protection)
├── Transport: TLS 1.3 everywhere, mTLS for GDS connections
├── Authentication: JWT + refresh token rotation + MFA
├── Authorization: RBAC with row-level security (own bookings only)
├── Data: AES-256 encryption at rest, field-level for PII
├── Payment: PCI-DSS scope minimization via tokenization
├── Logging: PII redaction, audit trail, tamper-evident logs
├── Monitoring: anomaly detection, fraud scoring, real-time alerting
└── Compliance: GDPR, APIS, fare advertising, PCI-DSS
```
