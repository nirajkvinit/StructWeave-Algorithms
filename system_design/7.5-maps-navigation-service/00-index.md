# Maps & Navigation Service

## System Overview

A Maps & Navigation Service is a globally distributed platform that renders interactive maps, computes optimal routes, provides real-time traffic information, and delivers turn-by-turn navigation guidance. Think Google Maps, Apple Maps, or OpenStreetMap-powered services.

What makes maps architecturally unique is the convergence of **massive geometric data** (the entire planet's road network), **graph-theoretic algorithms** (shortest path with billions of nodes), **real-time streaming** (millions of probe vehicles reporting GPS traces), and **extreme read amplification** (a single map view triggers 20–40 tile fetches). The system must serve billions of tile requests per day at sub-100ms latency while simultaneously ingesting live traffic data and computing routes across continental-scale road networks.

---

## Key Characteristics

| Characteristic | Details |
|---|---|
| **Read/Write Ratio** | Extremely read-heavy (~99.9% reads for tiles); write-heavy for traffic ingestion |
| **Scale** | 1B+ DAU, 300B+ tile requests/day, 700M+ road network nodes |
| **Latency** | Tiles: p99 < 100ms (CDN); Routes: p99 < 2s city-level; Geocoding: p99 < 200ms |
| **Data Volume** | Road graph ~50GB compressed; all zoom-level tiles ~100s of TB in vector format |
| **Freshness** | Traffic: < 5 min lag; Road changes: < 24 hours |
| **Complexity Rating** | Very High — geometric data, graph algorithms, real-time streaming, global CDN |

---

## Key Architectural Themes

1. **Tile Serving at CDN Scale** — Pre-generated and on-demand vector tiles served from global CDN edge nodes with 99%+ cache hit rates
2. **Graph-Based Routing with Contraction Hierarchies** — Preprocessing the road network into a hierarchy enabling millisecond-level cross-country route queries
3. **Real-Time Traffic Ingestion** — Millions of probe vehicles stream GPS traces through Kafka into a map-matching and speed-aggregation pipeline
4. **Geocoding & Spatial Indexing** — Address-to-coordinate resolution using text normalization, fuzzy matching, and geohash-based spatial indexes
5. **Navigation Session Management** — Stateful turn-by-turn guidance with live rerouting on traffic changes or missed turns

---

## Quick Navigation

| # | Document | Description |
|---|---|---|
| 01 | [Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity math |
| 02 | [High-Level Design](./02-high-level-design.md) | Architecture diagram, data flows, key decisions |
| 03 | [Low-Level Design](./03-low-level-design.md) | Data models, APIs, core algorithms (pseudocode) |
| 04 | [Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Tile system, traffic pipeline, geocoding at scale |
| 05 | [Scalability & Reliability](./05-scalability-and-reliability.md) | CDN strategy, graph partitioning, offline maps |
| 06 | [Security & Compliance](./06-security-and-compliance.md) | Rate limiting, privacy, geopolitical compliance |
| 07 | [Observability](./07-observability.md) | Metrics, alerts, distributed tracing |
| 08 | [Interview Guide](./08-interview-guide.md) | 45-minute pacing, trade-offs, trap questions |
| 09 | [Key Insights](./09-insights.md) | 14 architectural insights for interviews |

---

## Core Components at a Glance

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT APPS                          │
│              (Web, iOS, Android)                        │
├─────────────────────────────────────────────────────────┤
│                 CDN EDGE NODES                          │
│          (99%+ tile cache hit rate)                     │
├──────────┬──────────┬──────────┬────────┬──────────────┤
│ Tile API │Route API │Geocode   │Search  │Traffic API   │
│          │          │API       │API     │              │
├──────────┴──────────┴──────────┴────────┴──────────────┤
│              BACKEND SERVICES                           │
│  Tile Server │ Route Service │ Geocoding │ Traffic      │
│              │ (CH Engine)   │ Service   │ Processor    │
├─────────────────────────────────────────────────────────┤
│                 DATA LAYER                              │
│  Object Storage │ Graph Store │ Spatial DB │ Redis      │
│  (tiles)        │ (in-memory) │ (geocoding)│ (traffic)  │
├─────────────────────────────────────────────────────────┤
│              DATA PIPELINE                              │
│  OSM Ingest → Graph Builder → Tile Generator            │
│  Probe GPS → Map Matching → Speed Aggregation           │
└─────────────────────────────────────────────────────────┘
```

---

## What Makes This System Uniquely Hard

- **Planetary-scale graph** — The entire road network (700M nodes, 1.5B edges) must fit in memory for fast routing
- **Geometric complexity** — Coordinate projections, tile pyramids, spatial indexing across 23 zoom levels
- **Algorithm depth** — Contraction Hierarchies is a research-level optimization (1000× faster than naive Dijkstra)
- **Freshness vs performance** — Pre-generating tiles for speed vs reflecting road changes within hours
- **Multi-modal routing** — Driving, walking, cycling, and transit each require different graph representations
- **Geopolitical sensitivity** — Disputed territories must render differently based on user's country

---

## Sources

- Google Maps Platform Architecture Documentation
- Mapbox Vector Tile Specification and Tiling Service
- Geisberger et al., "Contraction Hierarchies: Faster and Simpler Hierarchical Routing in Road Networks"
- OpenStreetMap Wiki — Map Data Pipeline and Rendering Architecture
- Nominatim Geocoding Architecture Documentation
