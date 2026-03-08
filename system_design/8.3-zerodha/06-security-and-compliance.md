# Security & Compliance

## Regulatory Framework

### SEBI (Securities and Exchange Board of India) Requirements

| Requirement | Description | Implementation |
|-------------|-------------|----------------|
| **KYC/AML** | Know Your Customer and Anti-Money Laundering verification before account opening | eKYC via Aadhaar, PAN verification, in-person verification (IPV), bank account validation |
| **Audit Trail** | Every order, modification, cancellation must be logged with timestamps | Append-only audit log with microsecond timestamps, client IP, device fingerprint |
| **Margin Rules** | SEBI-mandated minimum margins for all segments; upfront margin collection | Real-time margin computation (SPAN + exposure); block margin before order |
| **Client Fund Segregation** | Client funds must be kept separate from broker's own funds | Separate bank accounts per client; daily reconciliation with exchange obligations |
| **Circuit Breakers** | Trading halts at index ±10%, ±15%, ±20% movements | Real-time index monitoring; automatic order rejection during halt |
| **Position Limits** | Maximum open positions per client per instrument | Pre-trade position limit checks; end-of-day position reporting to exchange |
| **Trade Reporting** | All trades reported to exchange within mandated timeframe | Automated trade file generation; reconciliation with exchange trade log |
| **Risk-Based Supervision** | Brokers classified by risk level; enhanced monitoring for high-risk | Automated risk scoring; real-time exposure monitoring dashboard |
| **Cyber Security Framework** | SEBI circular on cyber security for brokers | Annual system audit, penetration testing, incident response plan |
| **Business Continuity** | Disaster recovery and business continuity plan | DR site, annual DR drill, documented BCP |

---

## Authentication & Authorization

### Two-Factor Authentication (Mandatory)

```
Login Flow:
    1. User enters user_id + password
    2. System validates credentials against salted hash (bcrypt, cost=12)
    3. System prompts for second factor:
       - TOTP (Time-based One-Time Password) via authenticator app
       - OR PIN (6-digit numeric PIN set by user)
    4. On success: issue session token (JWT, 8-hour expiry for market day)
    5. Session bound to: user_id, device_fingerprint, IP_subnet

API Authentication:
    1. API users obtain api_key (permanent) + api_secret (permanent)
    2. Daily login: POST /session/token with api_key + request_token + checksum
       checksum = SHA256(api_key + request_token + api_secret)
    3. Access token valid for one trading day (until midnight)
    4. Access token required for all subsequent API calls
    5. Rate limit: 3 requests/second per access token (order APIs)
                   1 request/second per access token (historical data)
```

### Session Security

```
Session Protections:
    - Single active session per device type (web, mobile, API)
    - New login on same device type invalidates previous session
    - Session token rotation every 2 hours
    - Immediate invalidation on password change
    - Suspicious activity detection: login from new device → email alert

Rate Limiting:
    Order placement:   10 orders/second per user
    Order modification: 5 modifications/second per user
    API calls:         3 requests/second per access token
    Login attempts:    5 failures → 30-minute lockout
    WebSocket:         3,000 instrument subscriptions per connection
```

---

## Data Security

### Encryption

```
Data in Transit:
    - Client ↔ API: TLS 1.3 (mandatory)
    - WebSocket: WSS (TLS-encrypted WebSocket)
    - API Gateway ↔ Internal services: mTLS (mutual TLS)
    - Broker ↔ Exchange: Encrypted leased line + FIX session-level encryption
    - Database replication: TLS-encrypted streams

Data at Rest:
    - Database: full-disk encryption
    - Redis: encrypted memory (where supported) + encrypted persistence files
    - Object storage: server-side encryption for contract notes, reports
    - Backup media: AES-256 encryption
    - Audit logs: encrypted, tamper-evident (hash chain)

Sensitive Data Handling:
    - PAN numbers: encrypted at rest, masked in display (XXXXX1234A)
    - Bank account numbers: encrypted, never logged in plaintext
    - Aadhaar numbers: not stored post-KYC (SEBI mandate)
    - Trading passwords: salted bcrypt hash only
    - API secrets: hashed, never retrievable
```

### Network Security

```
DDoS Protection (Critical During Market Hours):
    - Layer 3/4: traffic scrubbing via upstream ISP / DDoS mitigation service
    - Layer 7: WAF with rate limiting, bot detection
    - Application: per-user rate limits, API key throttling
    - WebSocket: connection rate limiting (max 10K new connections/sec per server)
    - During market hours: any DDoS that causes downtime = regulatory penalty

Network Segmentation:
    - DMZ: API gateways, load balancers
    - Application zone: OMS, risk engine, position service
    - Data zone: databases, Redis, Kafka
    - Exchange zone: FIX gateways, feed handlers (co-located)
    - Management zone: monitoring, logging, admin tools
    - No direct path from DMZ to data zone
```

---

## Audit Trail

### What Gets Logged

```
Order Audit Record:
    {
        event_id:           UUID
        event_type:         ORDER_PLACED | ORDER_MODIFIED | ORDER_CANCELLED |
                            ORDER_REJECTED | ORDER_FILLED | ORDER_PARTIALLY_FILLED
        order_id:           UUID
        user_id:            UUID
        timestamp:          TIMESTAMP_MICROSECONDS
        exchange_timestamp: TIMESTAMP_MICROSECONDS (if applicable)
        instrument_token:   INTEGER
        order_details:      { side, type, qty, price, trigger_price }
        previous_state:     { status, qty, price }  (for modifications)
        new_state:          { status, qty, price }
        risk_check_result:  { margin_checked, margin_blocked, checks_passed }
        source:             WEB | MOBILE | API
        client_ip:          STRING
        device_fingerprint: STRING
        api_key:            STRING (for API orders)
        session_id:         STRING
        latency_us:         INTEGER (processing time in microseconds)
    }

Login Audit Record:
    {
        event_type:     LOGIN_SUCCESS | LOGIN_FAILURE | LOGOUT | SESSION_EXPIRED
        user_id:        UUID
        timestamp:      TIMESTAMP
        client_ip:      STRING
        device_info:    { type, os, browser, fingerprint }
        auth_method:    PASSWORD_TOTP | PASSWORD_PIN | API_TOKEN
        failure_reason: STRING (if failure)
        geo_location:   { country, city } (derived from IP)
    }
```

### Audit Log Storage

```
Properties:
    - Append-only (no updates, no deletes)
    - Tamper-evident: each record includes hash of previous record (hash chain)
    - Immutable: stored on WORM (Write Once Read Many) storage
    - Retention: 7 years (SEBI mandate for trade records)
    - Searchable: indexed by user_id, order_id, timestamp, event_type

Storage:
    Hot (0-90 days):   PostgreSQL with partition by date
    Warm (90 days - 2 years): Columnar store for analytics queries
    Cold (2-7 years):  Compressed archive in object storage

Volume:
    ~50M audit events/day (orders + modifications + fills + logins)
    ~2.5 KB per event
    Daily: 125 GB/day
    Annual: 31 TB/year
    7-year: 217 TB
```

---

## Insider Trading Detection

### Surveillance Patterns

```
Pattern 1: Pre-Announcement Trading
    - Monitor for unusual volume/position buildup before corporate announcements
    - Alert if: user builds large position in stock X,
      and stock X has corporate announcement within next 7 days
    - Cross-reference with insider lists provided by companies

Pattern 2: Front-Running Detection
    - Detect if broker employees trade ahead of large client orders
    - Monitor: employee order timestamp vs. client order timestamp for same instrument
    - Alert if: employee BUY precedes large client BUY by < 30 minutes

Pattern 3: Circular Trading
    - Detect wash trades: same person trading with themselves via multiple accounts
    - Monitor: trades where buyer and seller accounts share same PAN/address/phone
    - Alert if: synchronized buy-sell pattern across linked accounts

Pattern 4: Spoofing Detection
    - Large orders placed and cancelled before execution to manipulate price
    - Monitor: order-to-cancel ratio > 90% for a user on a single instrument
    - Alert if: repeated pattern of place-cancel within 1 second

Reporting:
    - Suspicious Transaction Reports (STR) filed with Financial Intelligence Unit
    - Exchange surveillance teams notified of flagged patterns
    - Monthly compliance reports to SEBI
```

---

## Threat Model

| Threat | Attack Vector | Impact | Mitigation |
|--------|--------------|--------|------------|
| **Account Takeover** | Phished credentials | Unauthorized trades, fund withdrawal | 2FA mandatory, device binding, transaction PIN for withdrawals |
| **API Key Theft** | Leaked API credentials in code | Automated unauthorized trading | API key scoping (read-only vs. trade), IP allowlisting, daily access token rotation |
| **DDoS During Market Hours** | Volumetric or application-layer attack | Users cannot trade, regulatory penalty | Multi-layer DDoS protection, traffic scrubbing, geographic filtering |
| **Man-in-the-Middle** | Network interception | Order manipulation, data theft | TLS 1.3, certificate pinning in mobile apps, mTLS for internal |
| **Insider Threat** | Rogue employee | Front-running, data exfiltration | Least privilege access, employee trade monitoring, database audit |
| **SQL Injection** | Malformed API parameters | Data breach, order manipulation | Parameterized queries, input validation, WAF rules |
| **Order Replay Attack** | Replaying previously valid FIX messages | Duplicate order execution | Sequence numbers in FIX protocol, idempotency keys, timestamp validation |
| **Price Manipulation** | Spoofing, layering, wash trading | Artificial price movement | Surveillance systems, order-to-trade ratio monitoring, SEBI reporting |

---

## Compliance Automation

```
Daily Compliance Tasks:
    06:00: Generate margin shortfall report (clients below minimum margin)
    07:00: Process client fund segregation verification
    08:00: Upload previous day's trade file to exchange
    09:00: Receive settlement obligations from clearing corporation
    16:00: Reconcile trades with exchange trade file (100% match required)
    17:00: Generate risk exposure report for SEBI
    18:00: Process contract note generation and delivery to clients

Monthly Compliance:
    - Client-wise position limit report
    - Net worth calculation and submission
    - Investor grievance report
    - Anti-money laundering review

Annual Compliance:
    - System audit by SEBI-empaneled auditor
    - Cyber security audit
    - Business continuity plan review and DR drill
    - KYC re-verification for dormant accounts
```
