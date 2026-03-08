# Requirements & Estimations — Maps & Navigation Service

## Functional Requirements

### Map Rendering
- Display interactive map tiles at any zoom level (0–22) for any location on Earth
- Support pan, zoom, rotate, and tilt interactions with smooth tile loading
- Render vector tiles client-side with customizable styling (day/night mode, terrain)
- Support satellite imagery overlay and 3D building views at high zoom levels

### Routing
- Calculate optimal route between two or more points (waypoints supported)
- Support multiple travel modes: driving, walking, cycling, public transit
- Provide alternative routes ranked by time, distance, or preference
- Traffic-aware routing with real-time congestion data
- Avoid preferences: tolls, highways, ferries, unpaved roads
- Re-routing when user deviates from planned path

### Turn-by-Turn Navigation
- Real-time voice guidance with lane-level instructions
- Speed limit display and speeding alerts
- Estimated time of arrival (ETA) with continuous updates
- Incident and hazard alerts along route
- Offline navigation with pre-downloaded region data

### Geocoding
- Forward geocoding: address string → (latitude, longitude)
- Reverse geocoding: (latitude, longitude) → formatted address
- Autocomplete suggestions as user types an address
- Support multilingual address formats and scripts

### Search & Points of Interest
- POI search: "coffee shops near me", "gas stations along route"
- Category-based browsing (restaurants, hotels, hospitals)
- Business details: hours, ratings, photos, contact info
- Search results ranked by relevance, distance, and popularity

### Traffic
- Real-time traffic speed overlay on map tiles
- Incident reporting (accidents, road closures, construction)
- Historical traffic patterns for future trip planning

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|---|---|---|
| **Tile serve latency** | p99 < 100ms (CDN hit), < 500ms (origin) | Map must feel instantaneous during pan/zoom |
| **Route calculation** | p99 < 2s (city), < 5s (cross-country) | Users expect near-instant route results |
| **Geocoding latency** | p99 < 200ms | Autocomplete must feel real-time |
| **Search latency** | p99 < 300ms | POI results during navigation must be fast |
| **Tile cache hit rate** | > 99% at CDN edge | Origin cannot handle full tile request volume |
| **Traffic data freshness** | < 5 min from probe to map display | Stale traffic defeats the purpose |
| **Map data freshness** | Road changes reflected within 24 hours | New roads, closures must appear quickly |
| **Availability** | 99.99% for tile serving, 99.95% for routing | Maps is a critical service for navigation safety |
| **Offline capability** | Full navigation for downloaded regions | Users in tunnels, rural areas need offline |
| **Global coverage** | Every country, every road classification | Service must work everywhere |

### CAP Theorem Choice

**AP (Availability + Partition Tolerance)** — Tile serving and routing must remain available even during network partitions. Serving a slightly stale tile or using cached traffic data is acceptable; being unavailable is not.

---

## Scale Estimations

### Traffic Volume

| Metric | Calculation | Result |
|---|---|---|
| Daily Active Users (DAU) | Google Maps scale | **1B** |
| Map sessions per user per day | Average across casual + navigation use | **10** |
| Tiles per map session | ~30 tiles per view (pan/zoom generates more) | **30** |
| **Total tile requests/day** | 1B × 10 × 30 | **300B/day** |
| **Average tile req/sec** | 300B / 86,400 | **~3.5M req/sec** |
| **Peak tile req/sec** | 10× average (rush hour, global) | **~35M req/sec** |
| Routing queries/day | 1B users × ~1 route/day average | **~1B/day** |
| **Routing req/sec (avg)** | 1B / 86,400 | **~11.5K req/sec** |
| **Routing req/sec (peak)** | 5× average | **~58K req/sec** |
| Geocoding queries/day | Similar to routing + autocomplete | **~2B/day** |
| **Geocoding req/sec (avg)** | 2B / 86,400 | **~23K req/sec** |
| Traffic probe updates | 100M active vehicles × 1 update/30s | **~3.3M updates/sec** |

### Storage

| Data Type | Size | Notes |
|---|---|---|
| Road network graph (planet) | ~50GB compressed | 700M nodes, 1.5B edges with metadata |
| Vector tiles (all zoom levels) | ~100–200TB | Zoom 0–22, global coverage |
| Raster tiles (legacy, all zooms) | ~1–2PB | PNG format, much larger than vector |
| Geocoding spatial index | ~200GB | Addresses, POIs, spatial indexes |
| Traffic time-series (7 days) | ~5TB | Speed per edge, 5-min buckets |
| Historical traffic profiles | ~2TB | 24h × 7day per edge, aggregated |
| Satellite imagery tiles | ~10PB+ | High-resolution global coverage |
| POI database | ~500GB | Business info, reviews, photos metadata |

### Bandwidth

| Flow | Calculation | Result |
|---|---|---|
| Tile serving (CDN egress) | 300B tiles/day × 15KB avg vector tile | **~4.5PB/day** |
| Traffic probe ingestion | 3.3M updates/sec × 200 bytes | **~660MB/sec** |
| Route responses | 58K peak/sec × 5KB avg response | **~290MB/sec peak** |

---

## SLOs and SLAs

| Service | SLO | SLA (contractual) | Measurement |
|---|---|---|---|
| Tile Serving | p99 < 100ms, 99.99% availability | 99.95% uptime | CDN edge response time |
| Routing | p99 < 2s (city), 99.95% availability | 99.9% uptime | End-to-end route computation |
| Geocoding | p99 < 200ms, 99.95% availability | 99.9% uptime | Query to first result |
| Traffic Freshness | 95% of segments updated within 5 min | 90% within 10 min | Probe-to-display lag |
| Navigation ETA | Within ±15% of actual arrival 90% of time | ±20% accuracy | Predicted vs actual |
| Map Data Freshness | Road changes in < 24h | < 48h for critical changes | Change detection to tile update |

---

## Key Constraints

- **CDN is mandatory** — No origin server farm can handle 35M req/sec tile traffic; 99%+ must be served from CDN cache
- **In-memory graph required** — Disk-based shortest path on 700M nodes is too slow; the road graph must reside in RAM
- **Preprocessing is essential** — Raw Dijkstra on the planet's road network takes minutes; Contraction Hierarchies preprocessing trades offline hours for online milliseconds
- **Multi-region deployment** — Users in Tokyo expect tiles from a nearby edge node, not from a US data center
- **Offline-first for navigation** — Active navigation must survive network loss (tunnels, rural areas)
