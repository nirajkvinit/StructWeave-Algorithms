# Security & Compliance

[← Back to Index](./00-index.md)

---

## Security Considerations

### ID Predictability

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ID PREDICTABILITY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Snowflake IDs are PREDICTABLE by design:                                   │
│  ─────────────────────────────────────────                                  │
│  • Timestamp component: Known if you know the creation time                 │
│  • Machine ID: Fixed per generator                                          │
│  • Sequence: Increments within millisecond                                  │
│                                                                              │
│  Example attack scenario:                                                    │
│  ────────────────────────                                                   │
│  1. Attacker creates order at 10:00:00.000                                  │
│  2. Receives ID: 7157846372921344000                                        │
│  3. Can estimate IDs created around same time:                              │
│     • 7157846372921344001 (next order same ms)                              │
│     • 7157846372921348096 (next millisecond)                                │
│  4. Attacker enumerates IDs to access other users' orders                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ CRITICAL: IDs are NOT a security mechanism!                            ││
│  │                                                                         ││
│  │ ALWAYS verify authorization:                                            ││
│  │ • Check that requesting user owns the resource                         ││
│  │ • Never rely on "hard to guess" IDs for security                       ││
│  │ • Treat IDs as public information                                       ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Mitigation strategies:                                                      │
│  ────────────────────────                                                   │
│  1. Always enforce authorization checks (primary defense)                   │
│  2. Rate limit ID-based lookups                                             │
│  3. Use compound keys (user_id + order_id) for lookups                     │
│  4. Consider opaque IDs for external APIs (hash or encrypt)                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Information Leakage

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       INFORMATION LEAKAGE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  What Snowflake IDs reveal:                                                  │
│  ───────────────────────────                                                │
│                                                                              │
│  1. TIMESTAMP (41 bits)                                                      │
│     • Exact creation time (millisecond precision)                           │
│     • Activity patterns (when users are active)                             │
│     • Business volume (ID growth rate)                                      │
│                                                                              │
│     Risk: Competitor analysis, user behavior profiling                      │
│     Mitigation: Accept trade-off for sortability, or use UUID v4           │
│                                                                              │
│  2. MACHINE ID (10 bits)                                                     │
│     • Number of datacenters (5 bits → max 32)                               │
│     • Workers per datacenter (5 bits → max 32)                              │
│     • Infrastructure topology                                                │
│                                                                              │
│     Risk: Attacker learns about infrastructure scale                        │
│     Mitigation: Treat as non-sensitive, or randomize visible portion       │
│                                                                              │
│  3. SEQUENCE (12 bits)                                                       │
│     • Volume within millisecond                                              │
│     • Traffic spikes                                                         │
│                                                                              │
│     Risk: Estimate concurrent request volume                                │
│     Mitigation: Generally low risk, hard to act on                          │
│                                                                              │
│  Example information extraction:                                             │
│  ───────────────────────────────                                            │
│  ID: 7157846372921344042                                                    │
│  Extracted:                                                                  │
│    timestamp = 1705789200123 → Jan 20, 2024 15:00:00.123 UTC               │
│    datacenter = 1                                                            │
│    worker = 3                                                                │
│    sequence = 42 (42nd ID in this millisecond)                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Comparison: Security Properties by Format

| Property | Auto-Inc | UUID v4 | UUID v7 | Snowflake | ULID |
|----------|----------|---------|---------|-----------|------|
| **Predictable** | Very | No | Partially | Yes | Partially |
| **Enumerable** | Easy | No | Somewhat | Easy | Somewhat |
| **Reveals timestamp** | No | No | Yes | Yes | Yes |
| **Reveals infra** | No | No | No | Yes | No |
| **Brute-forceable** | Easy | No | No | Easy | No |

**Recommendation:** If security through obscurity is needed, use UUID v4. But always implement proper authorization regardless of ID format.

---

## Threat Model

### Identified Threats

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           THREAT MODEL                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Threat 1: ID ENUMERATION ATTACK                                            │
│  ─────────────────────────────────                                          │
│  Attack: Iterate through IDs to access resources                            │
│  Example:                                                                    │
│    GET /api/orders/7157846372921344000                                      │
│    GET /api/orders/7157846372921344001                                      │
│    GET /api/orders/7157846372921344002                                      │
│    ...                                                                       │
│                                                                              │
│  Impact: Unauthorized access to data                                         │
│  Likelihood: High (IDs are predictable)                                     │
│  Mitigation:                                                                 │
│    • ALWAYS check authorization (user owns resource)                        │
│    • Rate limit requests per user                                           │
│    • Log and alert on enumeration patterns                                  │
│    • Use compound keys: /api/users/{user_id}/orders/{order_id}             │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Threat 2: TIMING ANALYSIS                                                   │
│  ──────────────────────────                                                 │
│  Attack: Extract timestamps to analyze user behavior                        │
│  Example: Track when specific user created accounts/orders                  │
│                                                                              │
│  Impact: Privacy violation, competitive intelligence                        │
│  Likelihood: Medium                                                          │
│  Mitigation:                                                                 │
│    • Accept trade-off (most systems do)                                     │
│    • Use separate public-facing ID if needed                               │
│    • Document in privacy policy                                             │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Threat 3: ID EXHAUSTION (DoS)                                              │
│  ─────────────────────────────                                              │
│  Attack: Generate requests to exhaust ID space                              │
│  Example: Flood system with requests requiring new IDs                      │
│                                                                              │
│  Impact: Service unavailability                                              │
│  Likelihood: Low (4B IDs/sec is hard to exhaust)                            │
│  Mitigation:                                                                 │
│    • Rate limit at API layer                                                │
│    • Monitor ID generation rate                                             │
│    • Scale generators if legitimate traffic                                 │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Threat 4: MACHINE ID COLLISION (Internal)                                  │
│  ─────────────────────────────────────────                                  │
│  Attack: Misconfiguration leads to duplicate machine IDs                    │
│  Example: Two services configured with same machine_id                      │
│                                                                              │
│  Impact: Duplicate IDs, data corruption                                      │
│  Likelihood: Low-Medium (operational error)                                 │
│  Mitigation:                                                                 │
│    • Use ZooKeeper/etcd for automatic assignment                           │
│    • Validate on startup (check for conflicts)                             │
│    • Alert on duplicate detection                                           │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Threat 5: CLOCK MANIPULATION                                               │
│  ─────────────────────────────                                              │
│  Attack: Attacker with system access manipulates clock                      │
│  Example: Set clock back to generate duplicate IDs                          │
│                                                                              │
│  Impact: Duplicate IDs, data corruption                                      │
│  Likelihood: Very low (requires system access)                              │
│  Mitigation:                                                                 │
│    • Detect clock backward movement, refuse generation                      │
│    • Monitor NTP drift                                                       │
│    • Use hardware security modules for high-security cases                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Threat Summary Table

| Threat | Impact | Likelihood | Risk | Mitigation Priority |
|--------|--------|------------|------|---------------------|
| ID Enumeration | High | High | **Critical** | Must implement authz |
| Timing Analysis | Medium | Medium | Medium | Accept or obfuscate |
| ID Exhaustion | High | Low | Low | Standard rate limiting |
| Machine ID Collision | High | Low | Medium | Proper ID management |
| Clock Manipulation | High | Very Low | Low | Detection + alerting |

---

## Authentication & Authorization

### API Security (If Centralized Service)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    API SECURITY FOR ID SERVICE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  If using centralized ID generation service:                                │
│                                                                              │
│  Authentication:                                                             │
│  ────────────────                                                           │
│  • Use mTLS between services (service mesh)                                 │
│  • API keys for external clients                                            │
│  • JWT for user-attributed requests                                         │
│                                                                              │
│  Authorization:                                                              │
│  ──────────────                                                             │
│  • Service-level: Which services can generate IDs                          │
│  • Namespace-level: Separate ID spaces per tenant (multi-tenant)           │
│  • Rate limiting: Per-service quotas                                        │
│                                                                              │
│  Example RBAC:                                                               │
│  ─────────────                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Role              │ Permissions                                         ││
│  ├───────────────────┼─────────────────────────────────────────────────────┤│
│  │ id-generator-read │ Generate IDs (POST /ids)                            ││
│  │ id-generator-admin│ + View stats, configure (POST /config)              ││
│  │ id-generator-debug│ + Parse IDs (GET /ids/{id}/info)                    ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Request example with authentication:                                        │
│  ─────────────────────────────────────                                      │
│  POST /api/v1/ids                                                            │
│  Authorization: Bearer <service-token>                                       │
│  X-Request-ID: <trace-id>                                                   │
│  X-Service-Name: order-service                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Resource Authorization Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                RESOURCE AUTHORIZATION WITH SNOWFLAKE IDs                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WRONG (insecure):                                                           │
│  ─────────────────                                                          │
│  // Assumes ID is hard to guess - IT'S NOT!                                 │
│  GET /api/orders/{order_id}                                                 │
│  → Returns order if exists, regardless of who owns it                       │
│                                                                              │
│  CORRECT (secure):                                                           │
│  ─────────────────                                                          │
│  // Always verify ownership                                                  │
│  GET /api/orders/{order_id}                                                 │
│  → Check: order.user_id == authenticated_user.id                           │
│  → If not owner: return 404 (not 403, to prevent enumeration)              │
│                                                                              │
│  BETTER (compound route):                                                    │
│  ────────────────────────                                                   │
│  // User ID in route makes ownership explicit                               │
│  GET /api/users/{user_id}/orders/{order_id}                                │
│  → Verify: user_id == authenticated_user.id                                │
│  → Then verify: order.user_id == user_id                                   │
│                                                                              │
│  Authorization pseudocode:                                                   │
│  ─────────────────────────                                                  │
│  FUNCTION get_order(order_id, requesting_user):                             │
│      order = database.find_order(order_id)                                  │
│      IF order IS NULL THEN                                                  │
│          RETURN 404 "Not Found"                                             │
│      IF order.user_id != requesting_user.id THEN                           │
│          // Return 404, not 403, to prevent enumeration                     │
│          RETURN 404 "Not Found"                                             │
│      RETURN 200 order                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Security

### Encryption Considerations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ENCRYPTION CONSIDERATIONS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Encryption at Rest:                                                         │
│  ─────────────────────                                                      │
│  • IDs themselves: NOT sensitive, no encryption needed                      │
│  • Machine ID registry (ZK/etcd): Standard cluster encryption               │
│  • Logs containing IDs: Standard log encryption                             │
│                                                                              │
│  Encryption in Transit:                                                      │
│  ──────────────────────                                                     │
│  • If centralized service: Use TLS/mTLS                                     │
│  • If embedded library: N/A (in-process)                                    │
│  • ZooKeeper communication: Enable SASL + TLS                               │
│                                                                              │
│  ID Obfuscation (optional):                                                  │
│  ───────────────────────────                                                │
│  If you need to hide the internal ID structure:                             │
│                                                                              │
│  Option 1: Hash-based mapping                                               │
│  internal_id = 7157846372921344042                                          │
│  external_id = HMAC_SHA256(internal_id, secret_key)[:16]                   │
│  → External: "a1b2c3d4e5f67890"                                             │
│  → Requires lookup table for reverse mapping                                │
│                                                                              │
│  Option 2: Encryption                                                        │
│  internal_id = 7157846372921344042                                          │
│  external_id = AES_encrypt(internal_id, key)                               │
│  → Can decrypt to get internal ID                                           │
│  → No lookup table needed                                                   │
│                                                                              │
│  Trade-offs:                                                                 │
│  • Adds complexity                                                           │
│  • Loses sortability in external layer                                      │
│  • Key rotation is challenging                                              │
│  • Usually not worth it - just implement proper authorization              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Compliance

### GDPR Considerations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GDPR CONSIDERATIONS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Are Snowflake IDs Personal Data?                                           │
│  ──────────────────────────────────                                         │
│  • IDs alone: Generally NO (not directly identifying)                       │
│  • IDs linked to user data: Part of the personal data record               │
│  • Consideration: Timestamps can reveal activity patterns                   │
│                                                                              │
│  Data Subject Rights:                                                        │
│  ─────────────────────                                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Right              │ Impact on ID System                                ││
│  ├────────────────────┼───────────────────────────────────────────────────┤│
│  │ Right to Access    │ IDs of user's records should be disclosed         ││
│  │ Right to Erasure   │ IDs should be deleted with user data              ││
│  │ Right to Portability│ IDs may be part of exported data                 ││
│  │ Right to Rectification│ IDs typically don't change (immutable)         ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Recommendations:                                                            │
│  ─────────────────                                                          │
│  • Document ID structure in privacy policy                                  │
│  • Include IDs in data subject access requests                             │
│  • Delete IDs when deleting user data                                       │
│  • Consider timestamp obfuscation if activity tracking is sensitive        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Audit Trail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUDIT TRAIL                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Snowflake IDs naturally support audit trails:                              │
│                                                                              │
│  Built-in audit information:                                                 │
│  ────────────────────────────                                               │
│  • WHEN: Timestamp embedded in ID (millisecond precision)                   │
│  • WHERE: Datacenter + Worker ID embedded                                   │
│  • SEQUENCE: Order within millisecond                                       │
│                                                                              │
│  Example audit query:                                                        │
│  ─────────────────────                                                      │
│  // Find all records created in a specific timeframe                        │
│  // Without needing a separate created_at column!                           │
│                                                                              │
│  start_id = snowflake_from_timestamp("2024-01-20 10:00:00")                │
│  end_id = snowflake_from_timestamp("2024-01-20 11:00:00")                  │
│                                                                              │
│  SELECT * FROM orders                                                        │
│  WHERE id >= start_id AND id < end_id                                       │
│                                                                              │
│  Audit logging recommendations:                                              │
│  ───────────────────────────────                                            │
│  • Log machine ID registration/deregistration                               │
│  • Log clock drift events                                                    │
│  • Log any ID generation errors                                             │
│  • Retain logs per compliance requirements                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Security Checklist

### Implementation Checklist

- [ ] Authorization enforced on all ID-based resource access
- [ ] Rate limiting in place for ID generation (if centralized)
- [ ] Machine ID assignment is secure (ZK/etcd with proper auth)
- [ ] Clock manipulation detection implemented
- [ ] Logging of security-relevant events (clock drift, errors)
- [ ] TLS enabled for any network communication
- [ ] API authentication for centralized service
- [ ] Enumeration detection/alerting in place

### Security Review Questions

1. Can an attacker access other users' resources by guessing IDs?
   - **Expected answer:** No, authorization is always checked

2. What information can an attacker learn from an ID?
   - **Expected answer:** Timestamp, approximate infrastructure scale

3. Can an attacker cause duplicate IDs?
   - **Expected answer:** Only with system access (clock manipulation)

4. How is machine ID assignment secured?
   - **Expected answer:** ZK/etcd with authentication, or static with validation
