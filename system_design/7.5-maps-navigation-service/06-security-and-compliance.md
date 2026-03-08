# Security & Compliance — Maps & Navigation Service

## Authentication & Authorization

### API Key Model (B2B Clients)

| Client Type | Authentication | Access |
|---|---|---|
| Business API consumers | API key in header (`X-API-Key`) | Tile, Route, Geocode, Search APIs |
| Premium partners | API key + IP allowlist | Higher rate limits, SLA guarantees |
| Internal services | mTLS (mutual TLS) | Full access, no rate limits |

### End-User Authentication (B2C Apps)

| Feature | Authentication | Rationale |
|---|---|---|
| Map viewing (tiles) | None (public) | Tiles are public data; unauthenticated for performance |
| Routing | None or light (device fingerprint) | Low-risk, stateless queries |
| Navigation sessions | OAuth2 bearer token | Stateful sessions tied to user account |
| Saved places / history | OAuth2 bearer token | Personal data requires authentication |
| Traffic reporting | OAuth2 or anonymous + device ID | Balance contribution ease with abuse prevention |

---

## Rate Limiting

### Per-API Rate Limits

| API | Free Tier | Standard Tier | Enterprise Tier |
|---|---|---|---|
| Tile API | 1,000 req/min | 10,000 req/min | 100,000 req/min |
| Route API | 50 req/min | 500 req/min | 5,000 req/min |
| Geocode API | 50 req/min | 500 req/min | 5,000 req/min |
| Search API | 100 req/min | 1,000 req/min | 10,000 req/min |
| Traffic API | 20 req/min | 200 req/min | 2,000 req/min |
| Navigation API | 10 sessions/min | 100 sessions/min | 1,000 sessions/min |

### Abuse Protection

| Threat | Detection | Mitigation |
|---|---|---|
| Tile scraping (bulk download) | High tile request rate from single key/IP | Progressive rate limiting → CAPTCHA → block |
| Route API abuse (competitor data harvesting) | Unusual origin/destination patterns | Anomaly detection; require API key with billing |
| Geocoding enumeration | Sequential address queries | Rate limit per IP; require authentication for bulk |
| GPS spoofing (fake traffic probes) | Speed/location inconsistencies | Validate probe physics (max acceleration, speed limits) |
| DDoS on tile origin | Sudden cache-miss spike | CDN absorbs; origin auto-scales; serve stale on overload |

### Hotspot Protection

Popular locations generate disproportionate tile traffic. For example, a major event (concert, sports game) causes thousands of users to view the same area simultaneously:

- **CDN naturally handles this**: popular tiles are cached at every edge node
- **Thundering herd on new tiles**: Use request coalescing at origin — if 100 simultaneous requests arrive for the same uncached tile, only 1 triggers generation; the other 99 wait for the result
- **Rate limit per geographic cell**: Prevent one area from monopolizing origin tile generation capacity

---

## Privacy

### Probe Vehicle Data Privacy

GPS traces from probe vehicles are the most sensitive data in the system. A raw trace reveals where a person drove, when, and how fast.

**Anonymization pipeline:**

```
Raw probe data:
  { user_id: "abc123", trace: [(lat, lng, time), ...] }

Step 1 — Strip user identity:
  { probe_id: random_uuid(), trace: [(lat, lng, time), ...] }
  // probe_id rotates every session; no link to user account

Step 2 — Truncate trace endpoints:
  Remove first 200m and last 200m of trace
  // Prevents identification of home/work addresses

Step 3 — Temporal fuzzing:
  Add random offset ±30 seconds to timestamps
  // Prevents exact timeline reconstruction

Step 4 — Aggregate before storage:
  Convert trace to per-segment speeds
  Store only: { edge_id, timestamp_bucket, speed_kmh }
  // Individual traces are NEVER stored long-term
```

### Navigation History

| Data | Retention | User Control |
|---|---|---|
| Active navigation session | Duration of trip | Auto-deleted on session end |
| Recent destinations | 90 days | User can view and delete |
| Search history | 90 days | User can view and delete |
| Saved/favorite places | Indefinite | User can manage |
| Probe GPS traces | Aggregated to speeds immediately; raw deleted within 24h | Opt-out available |

### Data Subject Rights (GDPR/CCPA)

| Right | Implementation |
|---|---|
| Right to access | Export all personal data (saved places, history, sessions) as JSON |
| Right to deletion | Delete all personal data within 30 days; anonymized aggregates retained |
| Right to portability | Standard format export of saved places and route history |
| Right to object | Opt out of probe data collection; navigation still works without contributing |
| Data minimization | Only collect data necessary for service delivery |

---

## Geopolitical Compliance

### Disputed Territory Rendering

Maps must respect territorial disputes and render borders differently based on the **user's country of access**:

| Disputed Region | View from Country A | View from Country B | Neutral View |
|---|---|---|---|
| Region with competing claims | Shown as part of Country A | Shown as part of Country B | Shown with disputed boundary (dashed line) |

**Implementation:**
1. Determine user's country from IP geolocation or device locale setting
2. Tile server selects the appropriate **border variant** for that country
3. Pre-generate border-variant tiles for disputed regions (typically < 100 affected tiles per variant)
4. Routing near borders must also respect the user's perspective (some roads may not be shown)

### Map Data Licensing

| Data Source | License | Requirements |
|---|---|---|
| OpenStreetMap | ODbL (Open Database License) | Attribution required; share-alike for derived databases |
| Government datasets | Varies by country | Some require attribution; some restrict commercial use |
| Satellite imagery | Commercial license | Display-only; no redistribution |
| User contributions | Contributor agreement | Users grant platform usage rights |

**Attribution compliance**: Map tiles must include "© OpenStreetMap contributors" (or appropriate attribution) visible on every map view.

---

## Data Security

### Encryption

| Data State | Encryption | Details |
|---|---|---|
| In transit | TLS 1.3 | All API communication; HSTS enforced |
| Tile serving | TLS at CDN edge | CDN terminates TLS; origin connection also TLS |
| At rest (tiles) | Server-side encryption | Object storage default encryption |
| At rest (user data) | AES-256 | Navigation history, saved places |
| At rest (traffic) | Not encrypted | Aggregated, anonymized speed data |
| Probe GPS traces | AES-256 (short-lived) | Encrypted in Kafka; deleted after processing |

### Access Control

| System | Access Model |
|---|---|
| Object storage (tiles) | Public read via CDN; write restricted to pipeline service accounts |
| Road graph (in-memory) | Internal only; no external access |
| Spatial DB (geocoding) | Internal read replicas; write restricted to data pipeline |
| Redis (traffic) | Internal only; VPC-restricted |
| User data (sessions, history) | Per-user isolation; API enforces ownership checks |

---

## Compliance Matrix

| Regulation | Applicability | Key Requirements |
|---|---|---|
| GDPR | European users | Consent for probe collection; data deletion; DPO appointed |
| CCPA | California users | Do-not-sell opt-out; data disclosure on request |
| China cybersecurity law | Chinese users | Map data stored on Chinese servers; government review of map accuracy |
| India geospatial policy | Indian users | Certain map data requires government approval for export |
| Export controls | Global | Certain high-resolution mapping data may have export restrictions |

---

## Security Incident Response

| Scenario | Response |
|---|---|
| API key compromise | Revoke key immediately; issue new key; audit usage logs |
| Probe data breach | Notify affected users (if identifiable); data is anonymized, limiting impact |
| CDN compromise | Switch to backup CDN; invalidate all edge caches; re-validate origin |
| GPS spoofing attack (mass fake traffic) | Anomaly detection flags inconsistent probes; quarantine suspicious sources; rollback affected speed data |
| Tile data poisoning (tampered map data) | Validate tile checksums at CDN edge; regenerate affected tiles from trusted source |
