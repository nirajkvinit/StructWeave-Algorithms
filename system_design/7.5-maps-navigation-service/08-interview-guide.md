# Interview Guide — Maps & Navigation Service

## 45-Minute Pacing

| Time | Phase | Focus |
|---|---|---|
| 0–5 min | **Clarify Scope** | What aspects? (tile serving + routing + geocoding? all three? focus area?) What scale? Mobile-first or API platform? |
| 5–15 min | **High-Level Architecture** | Tile system + routing system + traffic pipeline. Draw the CDN → origin → object storage flow. Show Route Service with in-memory graph. |
| 15–28 min | **Deep Dive: Routing Algorithm** | This is the key differentiator. Explain Dijkstra limitations → A* improvement → Contraction Hierarchies breakthrough. Walk through preprocessing + bidirectional query. |
| 28–38 min | **Tile System + Traffic** | CDN-first architecture, vector vs raster, tile pyramid. Traffic probe ingestion via message queue → map matching → speed aggregation. |
| 38–43 min | **Scalability & Trade-offs** | Graph partitioning, offline maps, geocoding scaling. Discuss key trade-offs. |
| 43–45 min | **Wrap-up** | Summarize decisions, mention areas for further exploration (ETA ML models, 3D tiles, transit routing). |

---

## Opening: Scope Clarification Questions

Ask these before designing:

1. **"Which aspects should I focus on?"** — Full maps platform or specific subsystem (routing only, tile serving only)?
2. **"What travel modes?"** — Driving only, or also walking/cycling/transit? (Transit adds massive complexity)
3. **"What scale?"** — City-level service or global (Google Maps scale)?
4. **"Real-time traffic required?"** — Dramatically changes routing architecture
5. **"Offline support needed?"** — Adds on-device routing and tile packaging
6. **"API platform or consumer app?"** — B2B (API keys, rate limits) vs B2C (user accounts, history)

---

## What Makes Maps Uniquely Hard

Present these to the interviewer to demonstrate depth:

### 1. The Routing Algorithm is a Real Computer Science Problem
- Dijkstra on 700M nodes: **minutes** per query
- A*: **10–30 seconds** (with good heuristic)
- Contraction Hierarchies: **< 5 milliseconds** (with hours of preprocessing)
- This is not just "use a graph database" — it requires understanding preprocessing-based speedup techniques

### 2. The Tile System Inverts Traditional Architecture
- At 35M req/sec, the CDN is not a cache — it IS the serving infrastructure
- Origin handles < 1% of traffic
- This is one of the most extreme CDN-dependency architectures in any system

### 3. Geometric Complexity
- Web Mercator projection distorts distances near poles
- Tile coordinates follow a quadtree decomposition (not simple grid)
- Spatial indexing (S2 cells, geohash) is fundamental to every subsystem

### 4. Data Freshness vs Serving Performance
- Pre-generating tiles is fast to serve but slow to update
- On-demand generation is always fresh but adds latency
- Hybrid approach (pre-gen low zoom, on-demand high zoom) balances both

### 5. Multi-Modal Routing
- Driving: road graph with speed limits, one-way streets, turn restrictions
- Walking: pedestrian paths, crosswalks, stairs, elevation
- Cycling: bike lanes, elevation preference, surface type
- Transit: schedule-based, transfers, real-time delays
- Each mode needs a **different graph representation**

---

## Key Trade-Offs Table

| Decision | Option A | Option B | Recommendation | Why |
|---|---|---|---|---|
| Tile format | Raster PNG | Vector tiles (MVT) | **Vector** | 60–75% smaller; client-side rendering enables customization, rotation, retina |
| Routing algorithm | Dijkstra / A* | Contraction Hierarchies | **CH** | 1000× faster for long routes; sub-5ms vs minutes |
| Traffic data source | Fixed sensors only | Probe vehicles (crowdsourced) | **Probe vehicles** | Scale with users; no per-road infrastructure; global coverage |
| Tile generation | All tiles pre-generated | On-demand + cache | **Hybrid** | Pre-gen zoom 0–12; on-demand 13+. Balances freshness + latency |
| Graph storage | Disk-based with indexing | In-memory adjacency list | **In-memory** | Disk seek latency makes routing 100× slower; 50GB fits in modern servers |
| Graph scope | Full planet per instance | Regional partitions | **Depends on scale** | Full planet simpler but needs 128GB+ RAM; partitions for cost efficiency |
| Geocoding index | Relational DB + spatial | Full-text search engine | **Full-text search** | Better fuzzy matching, faster prefix search, built-in relevance scoring |
| Offline maps | No offline support | Region download packages | **Region packages** | Critical for tunnels, rural areas; delta updates keep size manageable |
| Traffic model | Real-time only | Historical + real-time blend | **Blend** | Historical handles low-probe areas; real-time catches anomalies |
| Map data source | Proprietary surveying only | OpenStreetMap + enrichment | **OSM + enrichment** | OSM has global coverage; enrich with commercial data for POI, imagery |

---

## Algorithm Deep Dive — How to Explain Contraction Hierarchies

### Step 1: Start with the Problem
> "Running Dijkstra on the planet's road network — 700 million nodes, 1.5 billion edges — takes minutes per query. We need sub-second routing. How?"

### Step 2: Intuition
> "Key insight: most long-distance routes use highways. If you're going from Paris to Berlin, you don't need to consider every residential street in Belgium. Contraction Hierarchies formalizes this by creating a node importance hierarchy."

### Step 3: Preprocessing (Offline)
> "We rank every node by importance — highway intersections rank high, dead-end residential streets rank low. Then we iteratively contract the least important node by adding shortcut edges that bypass it. A shortcut from A to C (bypassing B) means 'the shortest path from A to C through B has this weight.' After contracting all nodes, we have a hierarchical graph with shortcut edges."

### Step 4: Query (Online)
> "For a query from source S to target T, we run bidirectional Dijkstra — but with a twist: each search only goes upward in the hierarchy (toward more important nodes). The forward search from S climbs up; the backward search from T climbs up. They meet at a high-importance node (typically a highway). Because both searches only explore upward, the search space is tiny — typically a few thousand nodes instead of hundreds of millions."

### Step 5: Performance Numbers
> "Preprocessing takes 2–4 hours for the planet. But queries take < 5ms, even for transcontinental routes. That's a 1000× improvement over Dijkstra. The trade-off is clear: invest offline hours to save online milliseconds."

---

## Trap Questions and Strong Answers

### "Why not just run Dijkstra?"

**Weak answer**: "Dijkstra is too slow."

**Strong answer**: "Dijkstra explores nodes in order of distance from the source. On a 700M-node graph, even with a priority queue, it explores millions of nodes before reaching a distant target — taking minutes per query. At 58K route req/sec peak, that's computationally impossible. Contraction Hierarchies preprocesses the graph offline (hours) so that online queries explore only thousands of nodes (milliseconds). It's the same idea as precomputing an index for a database — invest in preprocessing to accelerate queries."

### "How do you keep tiles fresh when roads change?"

**Weak answer**: "Regenerate all tiles when data changes."

**Strong answer**: "We use delta invalidation. When a road changes, we compute its geographic bounding box, determine which tiles at each zoom level overlap that box, and invalidate only those specific tiles in CDN and object storage. For a single road change in Manhattan, this might invalidate a few hundred tiles out of billions. Next request triggers on-demand regeneration. Low-zoom tiles (zoom 0–12) are fully pre-generated nightly. Tiles carry ETags so clients can do conditional requests (304 Not Modified) to avoid re-downloading unchanged tiles."

### "How does offline navigation work?"

**Weak answer**: "Download the whole map to the device."

**Strong answer**: "Users download a region package — say, a city or country. The package contains: (1) vector tiles for that region at zoom 0–16, (2) an extracted subgraph of the road network with CH preprocessing, (3) a subset of the geocoding index for local addresses, and (4) POI data. The package for a city like London is ~100MB. Routing runs entirely on-device using the local CH graph — same algorithm, just smaller graph. Delta updates sync only changed data since the last download, reducing bandwidth by 90%+. The key limitation: no real-time traffic in offline mode, so ETAs use historical baselines."

### "How do you handle traffic from millions of vehicles?"

**Weak answer**: "Process each GPS point as it comes in."

**Strong answer**: "GPS traces flow into a message queue partitioned by geographic region. Consumer groups run map matching (HMM-based Viterbi algorithm) to snap noisy GPS points to road segments. Per segment, we compute traversal speed and update a rolling 5-minute weighted average in Redis. The system processes 3.3M updates/sec. We blend real-time speeds with historical 24h × 7day profiles — real-time for roads with many probes, historical baseline for sparse areas. Confidence weighting ensures low-sample segments don't produce noisy speed estimates."

### "Why vector tiles instead of raster?"

**Weak answer**: "They're smaller."

**Strong answer**: "Vector tiles encode geometric primitives (roads as lines, buildings as polygons) rather than pre-rendered pixels. This gives us five advantages: (1) 60–75% size reduction per tile; (2) client-side rendering enables runtime style customization (day/night mode, accessibility themes); (3) smooth rotation and tilt (raster pixelates); (4) native retina resolution without 2× tiles; (5) interactive features — hovering over a building shows its metadata because the data is structured, not pixels. The trade-off is higher client GPU usage, but modern mobile devices handle this easily."

---

## Scoring Rubric — What Interviewers Look For

| Dimension | Junior | Mid | Senior/Staff |
|---|---|---|---|
| **Scale understanding** | "Use a graph database" | "In-memory graph, needs lots of RAM" | "120GB in-memory; CH preprocessing; regional partitions for cost; full planet for simplicity" |
| **Tile system** | "Serve map images" | "CDN caching, pre-generate tiles" | "Vector tiles, quadtree pyramid, hybrid pre-gen/on-demand, delta invalidation, multi-CDN" |
| **Routing depth** | "Use shortest path algorithm" | "A* with heuristic" | "Contraction Hierarchies: preprocessing, bidirectional upward search, shortcut expansion, 1000× speedup" |
| **Traffic system** | "Get traffic data from sensors" | "Crowdsourced from phones" | "Kafka-based probe ingestion, HMM map matching, 5-min rolling aggregation, historical+real-time blend" |
| **Trade-off discussion** | Lists one option | Compares two options | Explains why, quantifies impact, discusses when each is appropriate |

---

## Common Mistakes to Avoid

1. **Ignoring the CDN** — You cannot serve 35M tile req/sec from application servers. The CDN is the system.
2. **Treating routing as a simple BFS/DFS** — Planet-scale routing is a hard algorithmic problem. Mention CH or at minimum A*.
3. **Forgetting offline mode** — Navigation must work in tunnels and areas with no connectivity.
4. **Mixing up forward/reverse geocoding** — Forward = address → coordinates; Reverse = coordinates → address.
5. **Ignoring geopolitical issues** — Maps are politically sensitive. Disputed borders must be handled per-country.
6. **Treating traffic as a simple lookup** — Map matching, aggregation, confidence weighting, and historical blending are all necessary.
7. **Not quantifying** — "Lots of tiles" is weak. "300B tiles/day, 35M/sec peak, 99%+ from CDN" is strong.

---

## Extension Topics (If Time Allows)

| Topic | Key Point |
|---|---|
| **ETA with ML** | Train model on historical trips; features include time-of-day, weather, events, road type |
| **3D Tiles** | Photorealistic 3D buildings; much larger tile data; progressive LoD (level of detail) |
| **Transit routing** | Schedule-based graph (GTFS data); time-dependent edge weights; multi-modal transfer penalties |
| **Indoor maps** | Floor plans for airports, malls; separate tile set per floor; indoor positioning (Wi-Fi, BLE) |
| **Autonomous vehicle maps** | HD maps with lane-level precision; centimeter accuracy; real-time updates for construction |
| **Map editing/crowdsourcing** | User-reported road changes → validation pipeline → map update → tile regeneration |
