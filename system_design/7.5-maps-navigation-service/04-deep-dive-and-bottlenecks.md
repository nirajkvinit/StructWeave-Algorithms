# Deep Dive & Bottlenecks — Maps & Navigation Service

## Deep Dive 1: Tile System Architecture

### Raster vs Vector Tiles

| Aspect | Raster Tiles (PNG) | Vector Tiles (MVT) |
|---|---|---|
| **Data format** | Pre-rendered pixel images | Geometric primitives (points, lines, polygons) + metadata |
| **Size per tile** | 20–50KB average | 5–20KB average |
| **Rendering** | Server-side (pre-baked) | Client-side (GPU-accelerated) |
| **Style customization** | None — style is baked into image | Full — client applies style at render time |
| **Retina / HiDPI** | Requires 2× or 4× tiles (more storage) | Renders at native device resolution |
| **Map rotation / tilt** | Pixelated at angles | Smooth vector rendering |
| **Labels** | Baked into tile (overlap at boundaries) | Client places labels dynamically (no overlap) |
| **Data extraction** | Pixels only — no metadata | Rich — hover/click exposes feature properties |
| **Storage (planet)** | 1–2PB (all zooms) | 100–200TB (all zooms) |
| **Bandwidth savings** | Baseline | **60–75% smaller than raster** |

**Modern systems use vector tiles (MVT format).** The client downloads compact geometric data and renders it locally using the device GPU, enabling real-time style changes (day/night mode), smooth rotation, and retina-quality display.

### Tile Pyramid Structure

The tile system uses a **quadtree decomposition** of the globe. At zoom level 0, the entire world is one tile. Each zoom level subdivides every tile into 4 children:

```
Zoom 0: 1 tile (world)
         ┌───┬───┐
Zoom 1:  │0,0│1,0│  = 4 tiles
         ├───┼───┤
         │0,1│1,1│
         └───┴───┘

Total tiles at zoom z = 4^z = 2^z × 2^z
```

| Zoom | Tiles | What's Visible | Generation Strategy |
|---|---|---|---|
| 0–5 | 1 – 1K | Continents, countries | **Pre-generate** (trivial count) |
| 6–12 | 4K – 17M | States, cities, major roads | **Pre-generate** (manageable) |
| 13–16 | 67M – 4.3B | City blocks, all roads, buildings | **On-demand + persistent cache** |
| 17–22 | 17B – 17.6T | Building details, addresses | **On-demand + TTL cache** |

### Pre-Generation vs On-Demand Strategy

**Hybrid approach:**
- **Zoom 0–12**: Pre-generate all tiles offline during data pipeline runs. Total: ~17M tiles at ~10KB each = ~170GB. Easily fits in object storage and CDN warm-up.
- **Zoom 13–22**: Generate on first request, cache in object storage and CDN. Most high-zoom tiles are never requested (oceans, deserts, uninhabited areas). Only popular areas (cities) get generated.

### Tile Invalidation on Road Changes

When the map data pipeline detects a road network change:

1. Compute the **bounding box** of the changed area
2. Convert bounding box to **affected tile addresses** at each zoom level
3. Delete affected tiles from object storage
4. Send **CDN cache invalidation** (purge) for those tile URLs
5. Next request triggers re-generation with updated data

This is **delta invalidation** — a road change in downtown Manhattan only invalidates tiles covering that area, not the entire planet.

### CDN Cache Strategy

```
Client requests: GET /tiles/14/8529/5765.mvt
  → CDN edge checks local cache
  → HIT: respond in < 50ms (99%+ of the time)
  → MISS: forward to origin
    → Origin checks object storage
    → Found: respond + CDN caches (Cache-Control: public, max-age=43200)
    → Not found: generate tile → store → respond → CDN caches
  → Client caches locally (ETag-based validation on next request)
```

**Cache-Control headers:**
- `public, max-age=43200` — CDN and client cache for 12 hours
- `ETag` — content hash for conditional requests (304 Not Modified)
- CDN TTL: 12 hours for popular tiles; longer for low-zoom tiles

---

## Deep Dive 2: Real-Time Traffic System

### Data Sources

| Source | Update Frequency | Coverage | Accuracy |
|---|---|---|---|
| **Probe vehicles** (GPS from navigation apps) | Every 1–30 seconds | Excellent in urban areas | High (direct speed measurement) |
| **Connected vehicles** (OEM telematics) | Every 5–60 seconds | Growing | High |
| **Fixed road sensors** (inductive loops, cameras) | Continuous | Limited to instrumented roads | Very high |
| **Commercial data providers** | Aggregated | Good | Moderate |

Probe vehicles are the **primary source** at scale — millions of active navigation sessions provide dense coverage without per-road infrastructure investment.

### Map Matching Pipeline

Raw GPS traces are noisy (10–30m accuracy) and must be **snapped to the road network** to determine which road segment a vehicle is traversing.

```mermaid
---
config:
  theme: neutral
  look: neo
---
flowchart LR
    GPS[Raw GPS Traces] --> FILTER[Noise Filter — Remove Outliers]
    FILTER --> CANDIDATE[Candidate Generation — Nearby Road Segments]
    CANDIDATE --> HMM[HMM Viterbi — Most Likely Road Sequence]
    HMM --> SPEED[Speed Computation per Segment]
    SPEED --> AGG[Rolling Average Aggregation]
    AGG --> REDIS[Redis — Current Speeds]
    AGG --> TSDB[Time-Series DB — Historical]

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef store fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class GPS input
    class FILTER,CANDIDATE,HMM,SPEED,AGG process
    class REDIS,TSDB store
```

**Hidden Markov Model (HMM) for Map Matching:**
- **States**: Candidate road segments within 50m of each GPS point
- **Emission probability**: Based on perpendicular distance from GPS point to road segment (Gaussian, σ = 10m)
- **Transition probability**: Based on how well the route distance between consecutive candidates matches the great-circle distance between GPS points
- **Viterbi algorithm** finds the most probable sequence of road segments

### Speed Aggregation

```
Per road segment (edge), maintain a rolling 5-minute weighted average:

  currentBucket = roundToFiveMin(now())
  key = "traffic:{edge_id}:{currentBucket}"

  For each new speed observation:
    redis.INCR(key + ":count")
    redis.INCRBYFLOAT(key + ":sum", observed_speed)
    redis.EXPIRE(key, 7200)  // 2-hour TTL

  Average speed = sum / count
  Congestion = classify(avgSpeed / freeFlowSpeed)
    > 0.8 → FREE_FLOW
    > 0.5 → MODERATE
    > 0.2 → HEAVY
    ≤ 0.2 → STANDSTILL
```

### Traffic Model: Historical + Real-Time Blend

Each road segment maintains a **24h × 7day historical speed profile** — 2,016 slots (288 five-minute slots per day × 7 days). This captures recurring patterns (morning rush, weekend lull).

**Real-time blending** combines historical baseline with live probe data:
- If real-time confidence is high (many probes): weight real-time 70%, historical 30%
- If real-time confidence is low (few probes): weight real-time 30%, historical 70%
- If no real-time data: use historical baseline
- If neither: fall back to posted speed limit

### Incident Detection

```
IF speed on segment drops below 20% of free-flow speed:
  AND drop occurred within last 10 minutes:
  AND multiple independent probes confirm the slowdown:
  → Flag as POTENTIAL_INCIDENT

IF adjacent upstream segments also show propagating slowdown:
  → Confirm INCIDENT
  → Generate alert for navigation rerouting
  → Publish to Traffic API for map overlay
```

### Queue Propagation Model

When a segment becomes congested, vehicles queue up on **upstream** segments. The system models this backward propagation:

1. Detect congestion on segment S
2. Estimate queue length based on flow rate vs capacity
3. Propagate reduced speeds to upstream segments proportionally
4. Update affected edge weights for routing

---

## Deep Dive 3: Geocoding at Scale

### Forward Geocoding Pipeline

```
Input: "221B Baker St, London"

Step 1 — Text Normalization:
  → lowercase: "221b baker st, london"
  → expand abbreviations: "221b baker street, london"
  → remove diacritics: (if applicable)
  → standardize separators

Step 2 — Tokenization & Parsing:
  → tokens: ["221b", "baker", "street", "london"]
  → classify: house_number="221b", street="baker street", city="london"

Step 3 — Structured Query:
  → Query spatial DB: street="baker street" AND city="london" AND house_number="221b"
  → Also query fuzzy: Levenshtein distance ≤ 2 for each token

Step 4 — Scoring & Ranking:
  → Exact match: score += 100
  → Fuzzy match: score += 80 - (edit_distance × 10)
  → Popularity: score += log(search_count)
  → User proximity: score += 50 / (1 + distance_km)

Step 5 — Return ranked results
```

### Address Format Challenges

Different countries use fundamentally different address structures:

| Country | Format | Example |
|---|---|---|
| USA | number street, city, state zip | 123 Main St, Springfield, IL 62701 |
| UK | number street, locality, city, postcode | 221B Baker Street, London NW1 6XE |
| Japan | prefecture, city, district, block, building | 東京都千代田区丸の内1-9-2 |
| India | house, street, area, city, state, PIN | 42 MG Road, Indira Nagar, Bengaluru 560038 |

The geocoding service must handle **all formats** with country-specific parsing rules.

### Multilingual Geocoding

The same location may have names in multiple languages and scripts:
- "München" (German) = "Munich" (English)
- "Москва" (Russian) = "Moscow" (English)
- "東京" (Japanese) = "Tokyo" (English)

**Solution**: Store `alt_names` array per address with all known transliterations. Query matches against all name variants.

### Reverse Geocoding Strategy

For reverse geocoding (lat, lng → address):

1. **Geohash lookup**: Encode coordinates to geohash-8 (~38m × 19m cell)
2. **Expand to neighbors**: Query the 9-cell neighborhood (center + 8 surrounding)
3. **Candidate retrieval**: Fetch all addresses within these cells from spatial index
4. **Distance ranking**: Sort by Haversine distance from query point
5. **Type prioritization**: Prefer building addresses over street-level, street-level over neighborhood-level
6. **Format**: Apply country-specific address formatting rules

---

## Bottleneck Analysis

### Tile Serving: 35M req/sec Peak

| Layer | Load | Strategy |
|---|---|---|
| CDN edge nodes | 35M req/sec | Globally distributed; this IS the serving tier |
| Origin tile servers | < 350K req/sec (< 1% miss) | Horizontal scaling; read from object storage |
| Object storage | < 350K req/sec | Inherently scalable; no bottleneck |
| Tile generation | Burst on data updates | Queue-based; prioritize popular tiles |

**Key insight**: The CDN is not a cache in front of the system — it IS the system. Origin servers only handle the long tail of rarely-requested tiles.

### Route Computation: Sub-Second at Scale

| Bottleneck | Impact | Mitigation |
|---|---|---|
| Graph memory (~120GB) | Single machine may not hold full planet | Regional partitioning + cross-region shortcuts |
| CH query on planet graph | < 5ms per query | Contraction Hierarchies reduces search space by 1000× |
| Traffic weight lookup | Additional latency per edge | Redis with local read replicas; batch prefetch route edges |
| Multiple alternatives | 3× compute for 3 routes | Run in parallel; share forward/backward search trees |

### Traffic Ingestion: 3.3M updates/sec

| Stage | Throughput | Strategy |
|---|---|---|
| GPS ingestion | 3.3M/sec | Kafka with 100+ partitions; partition by geographic region |
| Map matching | CPU-intensive per trace | Horizontally scaled consumer groups; one per region |
| Speed aggregation | 3.3M/sec Redis writes | Redis cluster; pipeline writes; batch updates |
| Historical storage | Aggregated (much less) | Time-series DB with downsampling |

### Geocoding: Fuzzy Search at 23K req/sec

| Bottleneck | Impact | Mitigation |
|---|---|---|
| Full-text fuzzy search | CPU and I/O intensive | Elasticsearch-style inverted index with n-gram tokenization |
| Multilingual normalization | Complex per query | Pre-computed normalized forms in index |
| Autocomplete (prefix search) | Must be < 100ms | Separate prefix trie index; aggressive caching of popular prefixes |
