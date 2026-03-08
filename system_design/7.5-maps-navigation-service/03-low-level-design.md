# Low-Level Design — Maps & Navigation Service

## Data Models

### Map Tile System

```
TileAddress:
  zoom       : INT (0–22)       — zoom level
  x          : INT              — tile column at this zoom
  y          : INT              — tile row at this zoom
  format     : ENUM (MVT, PNG)  — vector or raster

TileMetadata:
  zoom       : INT
  x          : INT
  y          : INT
  format     : ENUM
  generated_at : TIMESTAMP
  etag       : STRING           — content hash for cache validation
  size_bytes : INT
  source_version : STRING       — map data version used to generate

Storage Key: tiles/{zoom}/{x}/{y}.{format}
Example:     tiles/14/8529/5765.mvt
```

**Tile Pyramid Scale:**

| Zoom Level | Total Tiles | Coverage Detail |
|---|---|---|
| 0 | 1 | Entire world |
| 5 | 1,024 | Continents |
| 10 | ~1M | Cities visible |
| 12 | ~17M | City districts |
| 14 | ~268M | City blocks |
| 18 | ~69B | Buildings |
| 20 | ~1.1T | Individual structures |
| 22 | ~17.6T | Maximum detail |

---

### Road Network Graph

```
Node:
  node_id    : BIGINT (PRIMARY KEY)
  lat        : DOUBLE            — WGS84 latitude
  lng        : DOUBLE            — WGS84 longitude
  type       : ENUM (INTERSECTION, ENDPOINT, TRAFFIC_SIGNAL, TOLL_BOOTH)
  elevation  : FLOAT             — meters above sea level (for cycling/walking)

Edge:
  edge_id         : BIGINT (PRIMARY KEY)
  from_node       : BIGINT (FK → Node)
  to_node         : BIGINT (FK → Node)
  distance_m      : FLOAT          — physical distance in meters
  travel_time_s   : FLOAT          — base travel time (no traffic)
  max_speed_kmh   : SMALLINT       — speed limit
  road_class      : ENUM (MOTORWAY, TRUNK, PRIMARY, SECONDARY, TERTIARY, RESIDENTIAL, SERVICE)
  surface         : ENUM (PAVED, UNPAVED, GRAVEL)
  is_one_way      : BOOLEAN
  is_toll         : BOOLEAN
  lane_count      : SMALLINT
  restrictions    : JSON           — turn restrictions, time-based access, vehicle type
  name            : STRING         — road name for display

ContractionShortcut:
  shortcut_id     : BIGINT
  from_node       : BIGINT
  to_node         : BIGINT
  contracted_node : BIGINT         — node bypassed by this shortcut
  distance_m      : FLOAT
  travel_time_s   : FLOAT
  original_edges  : BIGINT[]       — edge IDs this shortcut represents

Planet Scale:
  ~700M nodes, ~1.5B edges, ~500M shortcut edges after CH preprocessing
  Total in-memory footprint: ~120GB (routing-optimized adjacency list)
```

---

### Traffic Speed Data

```
TrafficSpeed:
  edge_id         : BIGINT
  time_bucket     : TIMESTAMP      — 5-minute bucket (e.g., 08:15:00)
  avg_speed_kmh   : FLOAT
  sample_count    : INT            — number of probe reports in bucket
  congestion_level: ENUM (FREE_FLOW, MODERATE, HEAVY, STANDSTILL)
  confidence      : FLOAT          — 0.0 to 1.0 based on sample count

Stored in: Redis (current + last 2 hours) + Time-Series DB (7-day rolling)
Key format: traffic:{edge_id}:{bucket}
Example:    traffic:98234781:2026-03-08T08:15

HistoricalProfile:
  edge_id         : BIGINT
  day_of_week     : ENUM (MON–SUN)
  time_slot       : SMALLINT       — 0–287 (5-min slots in 24h)
  avg_speed_kmh   : FLOAT
  std_dev         : FLOAT

Stored in: Time-Series DB (persistent, updated weekly)
```

---

### Geocoding Data

```
Address:
  address_id      : BIGINT (PRIMARY KEY)
  country         : STRING
  state           : STRING
  city            : STRING
  district        : STRING
  street          : STRING
  house_number    : STRING
  postal_code     : STRING
  lat             : DOUBLE
  lng             : DOUBLE
  geohash         : STRING (precision 8)  — for spatial indexing
  display_name    : STRING                — formatted full address
  language        : STRING                — primary language code
  alt_names       : STRING[]              — multilingual names

PointOfInterest:
  poi_id          : BIGINT (PRIMARY KEY)
  name            : STRING
  category        : ENUM (RESTAURANT, HOTEL, GAS_STATION, HOSPITAL, ...)
  lat             : DOUBLE
  lng             : DOUBLE
  geohash         : STRING
  address_id      : BIGINT (FK → Address)
  rating          : FLOAT
  popularity_score: INT                   — search ranking signal
  hours           : JSON                  — opening hours per day
  tags            : STRING[]

Indexes:
  - Geohash prefix index on Address.geohash (reverse geocoding)
  - Full-text search index on Address.display_name + alt_names (forward geocoding)
  - Full-text + geohash compound index on POI (location-biased search)
```

---

### Navigation Session

```
NavigationSession:
  session_id      : UUID (PRIMARY KEY)
  user_id         : BIGINT
  origin          : (lat, lng)
  destination     : (lat, lng)
  mode            : ENUM (DRIVING, WALKING, CYCLING, TRANSIT)
  route_polyline  : ENCODED_POLYLINE      — compressed path
  instructions    : Instruction[]
  current_step    : INT                   — index into instructions
  current_position: (lat, lng, heading, speed)
  eta             : TIMESTAMP
  status          : ENUM (ACTIVE, REROUTING, ARRIVED, CANCELLED)
  created_at      : TIMESTAMP
  last_update     : TIMESTAMP

Instruction:
  step_index      : INT
  maneuver        : ENUM (TURN_LEFT, TURN_RIGHT, MERGE, EXIT, U_TURN, CONTINUE, ARRIVE)
  road_name       : STRING
  distance_m      : FLOAT
  duration_s      : FLOAT
  lane_guidance   : STRING                — "left|straight|right" with active highlighted
  voice_text      : STRING                — "In 200 meters, turn right onto Elm Street"
  geometry        : ENCODED_POLYLINE      — path segment for this step
```

---

## API Design

### Tile API

```
GET /api/v1/tiles/{z}/{x}/{y}.mvt

Headers:
  If-None-Match: "{etag}"        — client-side cache validation

Response: 200 OK
  Content-Type: application/vnd.mapbox-vector-tile
  Cache-Control: public, max-age=43200   — 12 hours device cache
  ETag: "abc123"
  Body: <binary MVT data>

Response: 304 Not Modified         — tile unchanged since client last fetched
```

### Route API

```
POST /api/v1/route

Request Body:
{
  "origin": { "lat": 40.748, "lng": -73.985 },
  "destination": { "lat": 40.758, "lng": -73.979 },
  "waypoints": [],
  "mode": "DRIVING",
  "avoid": ["TOLLS"],
  "alternatives": true,
  "departure_time": "2026-03-08T08:30:00Z"
}

Response: 200 OK
{
  "routes": [
    {
      "distance_m": 2450,
      "duration_s": 480,
      "polyline": "encoded_polyline_string",
      "instructions": [
        {
          "step": 1,
          "maneuver": "TURN_RIGHT",
          "road_name": "5th Avenue",
          "distance_m": 800,
          "duration_s": 120,
          "voice_text": "Turn right onto 5th Avenue"
        }
      ],
      "traffic_summary": "MODERATE",
      "eta": "2026-03-08T08:38:00Z"
    }
  ]
}
```

### Geocoding API

```
GET /api/v1/geocode?address=Eiffel+Tower+Paris&limit=5

Response: 200 OK
{
  "results": [
    {
      "display_name": "Eiffel Tower, Champ de Mars, Paris, France",
      "lat": 48.8584,
      "lng": 2.2945,
      "type": "LANDMARK",
      "confidence": 0.98
    }
  ]
}

GET /api/v1/reverse?lat=48.8584&lng=2.2945

Response: 200 OK
{
  "address": {
    "street": "5 Avenue Anatole France",
    "district": "7th Arrondissement",
    "city": "Paris",
    "country": "France",
    "postal_code": "75007"
  }
}
```

### Search API

```
GET /api/v1/search?query=coffee+shops&lat=40.748&lng=-73.985&radius=1000&limit=10

Response: 200 OK
{
  "results": [
    {
      "poi_id": 12345,
      "name": "Blue Bottle Coffee",
      "category": "CAFE",
      "lat": 40.749,
      "lng": -73.984,
      "distance_m": 150,
      "rating": 4.5,
      "hours": "07:00-19:00"
    }
  ]
}
```

### Traffic API

```
GET /api/v1/traffic?bounds=40.70,-74.02,40.80,-73.90

Response: 200 OK
{
  "segments": [
    {
      "edge_id": 98234781,
      "polyline": "encoded_segment",
      "speed_kmh": 25,
      "free_flow_speed_kmh": 50,
      "congestion": "HEAVY"
    }
  ],
  "updated_at": "2026-03-08T08:32:00Z"
}
```

### Navigation API

```
POST /api/v1/navigate/start
{
  "origin": { "lat": 40.748, "lng": -73.985 },
  "destination": { "lat": 40.758, "lng": -73.979 },
  "mode": "DRIVING"
}
→ Response: { "session_id": "uuid", "route": {...}, "eta": "..." }

POST /api/v1/navigate/{session_id}/location
{
  "lat": 40.750, "lng": -73.983,
  "speed_kmh": 35, "heading": 45,
  "timestamp": "2026-03-08T08:33:15Z"
}
→ Response: { "next_instruction": {...}, "eta": "...", "reroute": false }

POST /api/v1/navigate/{session_id}/end
→ Response: { "summary": { "distance_m": 2450, "duration_s": 485 } }
```

---

## Core Algorithms (Pseudocode)

### 1. Contraction Hierarchies — Preprocessing

```
FUNCTION buildContractionHierarchy(graph):
    // Phase 1: Rank all nodes by importance
    importance = PriorityQueue()
    FOR EACH node IN graph.nodes:
        score = computeImportance(node, graph)
        // Score based on: edge difference, contracted neighbors, original edges
        importance.insert(node, score)

    // Phase 2: Contract nodes from least to most important
    rank = 0
    WHILE importance IS NOT EMPTY:
        node = importance.extractMin()
        node.rank = rank++

        // Find all pairs of neighbors that use this node as shortest path
        FOR EACH (u, v) WHERE shortestPath(u, v) goes through node:
            shortcutWeight = edgeWeight(u, node) + edgeWeight(node, v)

            // Only add shortcut if no shorter alternative path exists
            IF NOT existsWitnessPath(u, v, shortcutWeight, excluding=node):
                addShortcut(u, v, shortcutWeight, contracted=node)

        removeNodeFromActiveGraph(node)

        // Lazy update: recompute importance of affected neighbors
        FOR EACH neighbor OF node:
            importance.updatePriority(neighbor, computeImportance(neighbor))

    RETURN hierarchicalGraph
```

### 2. Contraction Hierarchies — Bidirectional Query

```
FUNCTION queryRoute(source, target, hierarchicalGraph):
    // Forward search: explore only UPWARD (to higher-ranked nodes)
    forwardDist = {source: 0}
    forwardPrev = {}
    forwardQueue = MinHeap([(0, source)])

    // Backward search: explore only UPWARD from target
    backwardDist = {target: 0}
    backwardPrev = {}
    backwardQueue = MinHeap([(0, target)])

    bestDist = INFINITY
    meetingNode = NULL

    WHILE forwardQueue OR backwardQueue:
        // Alternate between forward and backward
        IF forwardQueue IS NOT EMPTY:
            (dist, u) = forwardQueue.extractMin()
            IF dist > bestDist: BREAK  // cannot improve
            FOR EACH edge (u → v) WHERE v.rank > u.rank:  // upward only
                newDist = dist + edge.weight
                IF newDist < forwardDist.get(v, INFINITY):
                    forwardDist[v] = newDist
                    forwardPrev[v] = u
                    forwardQueue.insert((newDist, v))
                    // Check if backward search already reached v
                    IF v IN backwardDist AND newDist + backwardDist[v] < bestDist:
                        bestDist = newDist + backwardDist[v]
                        meetingNode = v

        // Symmetric backward step (omitted for brevity, mirrors forward)

    path = reconstructPath(meetingNode, forwardPrev, backwardPrev)
    RETURN expandShortcuts(path)  // recursively replace shortcuts with original edges

// Shortcut expansion
FUNCTION expandShortcuts(path):
    expanded = []
    FOR EACH edge IN path:
        IF edge.isShortcut:
            // Recursively expand: shortcut A→C via B becomes A→B, B→C
            expanded += expandShortcuts([edge.firstHalf, edge.secondHalf])
        ELSE:
            expanded.append(edge)
    RETURN expanded
```

### 3. Traffic-Aware Edge Weight Computation

```
FUNCTION getTrafficAwareWeight(edge, departure_time):
    // Layer 1: Historical baseline
    day = dayOfWeek(departure_time)
    slot = timeSlot(departure_time)  // 5-min bucket index (0–287)
    historical = historicalDB.get(edge.id, day, slot)

    // Layer 2: Real-time speed from probe aggregation
    currentBucket = roundToFiveMin(now())
    realtime = redis.get("traffic:{edge.id}:{currentBucket}")

    // Layer 3: Blend with confidence weighting
    IF realtime AND realtime.confidence > 0.3:
        effectiveSpeed = 0.7 * realtime.avg_speed_kmh + 0.3 * historical.avg_speed_kmh
    ELSE IF historical:
        effectiveSpeed = historical.avg_speed_kmh
    ELSE:
        effectiveSpeed = edge.max_speed_kmh  // fallback to speed limit

    // Convert to travel time
    travelTime_s = edge.distance_m / (effectiveSpeed * 1000 / 3600)
    RETURN travelTime_s
```

### 4. Tile Coordinate Computation (Slippy Map)

```
FUNCTION latLngToTile(lat, lng, zoom):
    // Web Mercator projection to tile coordinates
    n = 2 ^ zoom
    x = FLOOR((lng + 180.0) / 360.0 * n)
    lat_rad = toRadians(lat)
    y = FLOOR((1.0 - LOG(TAN(lat_rad) + 1.0 / COS(lat_rad)) / PI) / 2.0 * n)
    RETURN (zoom, x, y)

FUNCTION tileToLatLng(zoom, x, y):
    // Inverse: tile coordinates to northwest corner lat/lng
    n = 2 ^ zoom
    lng = x / n * 360.0 - 180.0
    lat_rad = ATAN(SINH(PI * (1 - 2 * y / n)))
    lat = toDegrees(lat_rad)
    RETURN (lat, lng)

FUNCTION getTilesForViewport(bounds, zoom):
    // Given map viewport bounds, return all needed tile addresses
    (topLeft_z, topLeft_x, topLeft_y) = latLngToTile(bounds.north, bounds.west, zoom)
    (botRight_z, botRight_x, botRight_y) = latLngToTile(bounds.south, bounds.east, zoom)

    tiles = []
    FOR x FROM topLeft_x TO botRight_x:
        FOR y FROM topLeft_y TO botRight_y:
            tiles.append((zoom, x, y))
    RETURN tiles  // typically 20–40 tiles for a standard viewport
```

### 5. Map Matching (Snap GPS to Road Network)

```
FUNCTION mapMatch(gpsTrace, roadNetwork):
    // Hidden Markov Model approach
    // States: candidate road segments near each GPS point
    // Emission: probability based on distance from GPS point to segment
    // Transition: probability based on route distance vs great-circle distance

    FOR EACH gpsPoint IN gpsTrace:
        candidates = roadNetwork.findNearbyEdges(gpsPoint, radius=50m)
        FOR EACH candidate IN candidates:
            emission = gaussianPDF(distance(gpsPoint, candidate), sigma=10m)
            candidate.emissionProb = emission

    // Viterbi algorithm to find most likely sequence of road segments
    FOR i FROM 1 TO LENGTH(gpsTrace) - 1:
        FOR EACH currCandidate IN candidates[i]:
            bestProb = 0
            FOR EACH prevCandidate IN candidates[i-1]:
                routeDist = shortestPathDistance(prevCandidate, currCandidate)
                greatCircleDist = haversine(gpsTrace[i-1], gpsTrace[i])
                transition = exponentialPDF(ABS(routeDist - greatCircleDist), beta=5m)
                prob = prevCandidate.bestProb * transition * currCandidate.emissionProb
                IF prob > bestProb:
                    bestProb = prob
                    currCandidate.bestPrev = prevCandidate
            currCandidate.bestProb = bestProb

    // Backtrack to find matched road segments
    RETURN backtrack(candidates)
```

### 6. Reverse Geocoding with Geohash

```
FUNCTION reverseGeocode(lat, lng):
    // Encode location to geohash (precision 8 ≈ 38m × 19m cell)
    geohash = encode(lat, lng, precision=8)

    // Query neighboring cells to handle boundary cases
    neighbors = getGeohashNeighbors(geohash)  // 8 surrounding cells + center
    allCells = [geohash] + neighbors

    // Query spatial index for addresses in these cells
    candidates = spatialDB.query(
        "SELECT * FROM addresses WHERE geohash_prefix IN {allCells} LIMIT 20"
    )

    // Rank by distance from query point
    FOR EACH candidate IN candidates:
        candidate.distance = haversine(lat, lng, candidate.lat, candidate.lng)

    ranked = SORT(candidates, BY distance ASC)

    // Return closest match, formatted per country-specific rules
    RETURN formatAddress(ranked[0])
```

### 7. ETA Prediction

```
FUNCTION predictETA(route, departure_time):
    totalTime = 0
    currentTime = departure_time

    FOR EACH edge IN route.edges:
        // Get traffic-aware travel time for this edge at projected arrival time
        edgeTime = getTrafficAwareWeight(edge, currentTime)
        totalTime += edgeTime
        currentTime = departure_time + totalTime

    // Apply intersection delay model
    FOR EACH node IN route.intermediateNodes:
        IF node.type == TRAFFIC_SIGNAL:
            totalTime += estimateSignalDelay(node, currentTime)  // avg 15–30s
        ELSE IF node.type == INTERSECTION:
            totalTime += estimateTurnDelay(node)  // avg 5–10s

    // Confidence interval based on traffic variability
    variance = SUM(edge.speedStdDev ^ 2 FOR edge IN route.edges)
    confidence95 = totalTime ± 1.96 * SQRT(variance)

    RETURN {
        estimated_seconds: totalTime,
        eta: departure_time + totalTime,
        confidence_range: confidence95
    }
```
