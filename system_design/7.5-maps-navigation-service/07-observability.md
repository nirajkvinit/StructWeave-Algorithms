# Observability — Maps & Navigation Service

## Key Metrics Dashboard

### Tile Serving Metrics

| Metric | Target | Alert Threshold | Measurement Point |
|---|---|---|---|
| CDN cache hit rate | > 99% | < 95% → page | CDN analytics |
| Tile serve latency p50 (CDN hit) | < 20ms | > 50ms → warn | CDN edge logs |
| Tile serve latency p99 (CDN hit) | < 50ms | > 100ms → warn | CDN edge logs |
| Origin tile serve latency p99 | < 200ms | > 500ms → page | Origin access logs |
| On-demand tile generation latency p99 | < 500ms | > 2s → page | Tile Rendering Service |
| Tile generation errors | < 0.01% | > 0.1% → page | Tile Rendering Service |
| Object storage read latency p99 | < 100ms | > 300ms → warn | Storage SDK metrics |
| Tiles generated per hour | Baseline ± 20% | > 2× baseline → investigate | Pipeline metrics |

### Routing Metrics

| Metric | Target | Alert Threshold | Measurement Point |
|---|---|---|---|
| Route calculation latency p50 | < 200ms | > 500ms → warn | Route Service |
| Route calculation latency p99 (city) | < 2s | > 3s → page | Route Service |
| Route calculation latency p99 (cross-country) | < 5s | > 8s → page | Route Service |
| Route success rate | > 99.5% | < 98% → page | Route API |
| Graph memory utilization | < 85% | > 90% → warn | Route Service instances |
| CH preprocessing duration | < 4 hours | > 6 hours → warn | Pipeline metrics |
| Alternative routes computed per request | ~2.5 avg | — | Route Service |

### Geocoding Metrics

| Metric | Target | Alert Threshold | Measurement Point |
|---|---|---|---|
| Geocoding latency p99 | < 200ms | > 500ms → page | Geocoding Service |
| Autocomplete latency p99 | < 100ms | > 200ms → warn | Geocoding Service |
| Geocoding accuracy (correct in top 3) | > 95% | < 90% → investigate | Sampled human eval |
| Reverse geocoding latency p99 | < 100ms | > 200ms → warn | Geocoding Service |
| Spatial DB query latency p99 | < 50ms | > 100ms → warn | DB metrics |
| Read replica lag | < 1s | > 5s → page | DB replication metrics |

### Traffic Pipeline Metrics

| Metric | Target | Alert Threshold | Measurement Point |
|---|---|---|---|
| Probe-to-display freshness | < 5 min | > 10 min → page | End-to-end pipeline |
| Kafka consumer lag (per partition) | < 10K messages | > 100K → page | Kafka consumer group |
| Map matching success rate | > 98% | < 95% → warn | Map Matching Service |
| Redis write latency p99 | < 5ms | > 20ms → warn | Redis cluster metrics |
| Speed observations per minute | Baseline ± 30% | > 50% drop → page | Speed Aggregator |
| Incident detection rate | — | Sudden spike → investigate | Traffic analysis |

### Navigation Session Metrics

| Metric | Target | Alert Threshold | Measurement Point |
|---|---|---|---|
| Active navigation sessions | — | > 2× normal → scale alert | Navigation Service |
| Reroute rate | 5–15% of sessions | > 30% → investigate | Navigation Service |
| ETA accuracy (predicted vs actual) | Within ±15% for 90% of trips | < 80% → investigate | Post-trip analysis |
| Session creation latency p99 | < 3s | > 5s → warn | Navigation API |
| Position update processing latency p99 | < 200ms | > 500ms → warn | Navigation Service |
| Session store read/write latency p99 | < 50ms | > 100ms → warn | Session store metrics |

---

## Alerting Tiers

### P1 — Immediate Page (< 5 min response)

| Alert | Condition | Impact |
|---|---|---|
| CDN cache hit rate < 90% | Massive miss storm hitting origin | Origin overload → tile serving failure |
| Route Service unresponsive | Health check failures across 50%+ instances | Users cannot get routes |
| Kafka consumer lag > 1M per partition | Traffic pipeline stalled | Traffic data going stale; routing accuracy degrades |
| Tile generation pipeline stalled > 1 hour | No new tiles being generated | Map data changes not reflected |

### P2 — Urgent Warning (< 30 min response)

| Alert | Condition | Impact |
|---|---|---|
| CDN cache hit rate < 95% | Elevated miss rate | Increased origin load; potential latency |
| Traffic freshness > 10 min | Pipeline slowing | Routing still uses historical baseline |
| Route latency p99 > 5s | Routing slowdown | Poor user experience for long routes |
| Geocoding accuracy < 90% | Index quality issue | Users getting wrong locations |

### P3 — Monitor (next business day)

| Alert | Condition | Impact |
|---|---|---|
| CH preprocessing > 6 hours | Slow graph build | Delayed road network updates |
| ETA accuracy < 85% | Traffic model drift | Users losing trust in ETAs |
| Tile generation error rate > 0.05% | Rendering edge cases | Some tiles may be missing |

---

## Distributed Tracing

### Route Request Trace

```
[Route API Gateway] ─── 5ms ───→ [Auth & Rate Limit]
                                       │
                                  ─── 2ms ───→ [Route Service]
                                                    │
                                    ┌── 3ms ──→ [Load Graph Partition]
                                    │
                                    ├── 1ms ──→ [CH Forward Search]
                                    │              (upward Dijkstra)
                                    │
                                    ├── 1ms ──→ [CH Backward Search]
                                    │              (upward Dijkstra)
                                    │
                                    ├── 0.5ms ─→ [Find Meeting Node]
                                    │
                                    ├── 2ms ──→ [Expand Shortcuts to Full Path]
                                    │
                                    ├── 5ms ──→ [Fetch Traffic Weights from Redis]
                                    │              (batch: 50 edges)
                                    │
                                    ├── 3ms ──→ [Apply Traffic to Path]
                                    │
                                    ├── 8ms ──→ [ETA Prediction Service]
                                    │              ├── Redis read (historical)
                                    │              └── Compute ETA
                                    │
                                    ├── 2ms ──→ [Generate Instructions]
                                    │
                                    └── 1ms ──→ [Compute Alternative Routes]
                                                   (parallel, 2 more)
                                       │
                              Total: ~35ms typical
```

### Tile Request Trace

```
[CDN Edge] ─── CACHE HIT ───→ respond (< 50ms total)

[CDN Edge] ─── CACHE MISS ───→ [Origin Tile Server] ─── 15ms ───→ [Object Storage Read]
                                                     ─── or ───
                                                     ─── 100ms ──→ [On-Demand Tile Generation]
                                       │
                              Total: 50–200ms for cache miss
```

### Traffic Probe Trace

```
[Probe Vehicle] ── GPS update ──→ [Traffic API]
                                       │
                                  ── 5ms ──→ [Kafka Produce]
                                                  │
                                  ── variable ──→ [Map Matching Consumer]
                                                       │
                                    ┌── 5ms ──→ [Candidate Road Lookup]
                                    ├── 3ms ──→ [HMM Viterbi Decode]
                                    ├── 1ms ──→ [Speed Computation]
                                    └── 2ms ──→ [Redis Speed Update]
                                       │
                              Total: ~50ms processing + Kafka queue time
                              End-to-end: typically < 2 min probe-to-display
```

---

## Logging Strategy

| Service | Log Level | Key Fields | Retention |
|---|---|---|---|
| Tile API | INFO for misses, DEBUG for hits | zoom, x, y, cache_status, latency_ms | 7 days |
| Route API | INFO | origin, destination, mode, latency_ms, distance_m, status | 30 days |
| Geocoding API | INFO | query (hashed), result_count, top_confidence, latency_ms | 30 days |
| Traffic Pipeline | INFO | edge_count_updated, consumer_lag, processing_time_ms | 14 days |
| Navigation API | INFO | session_id, event_type, reroute_count, eta_accuracy | 30 days |
| Tile Generation | INFO | zoom, x, y, generation_time_ms, source_version | 14 days |

**Sampling**: Tile API logs sampled at 1% (due to extreme volume). Route and Geocoding at 100%. Traffic pipeline at 10%.

---

## Dashboard Layout

### Operations Dashboard

```
┌──────────────────┬──────────────────┬──────────────────┐
│  CDN Hit Rate     │  Origin Latency  │  Tile Gen/Hour   │
│  [99.2%] ✓        │  [145ms p99] ✓   │  [2.1M] ✓        │
├──────────────────┼──────────────────┼──────────────────┤
│  Route Latency    │  Route Success   │  Graph Memory    │
│  [180ms p50] ✓    │  [99.7%] ✓       │  [72% used] ✓    │
├──────────────────┼──────────────────┼──────────────────┤
│  Geocode Latency  │  Geocode Acc.    │  DB Replica Lag  │
│  [85ms p99] ✓     │  [96.2%] ✓       │  [0.3s] ✓        │
├──────────────────┼──────────────────┼──────────────────┤
│  Traffic Fresh.   │  Kafka Lag       │  Active Nav Sess │
│  [3.2 min] ✓      │  [2.1K msg] ✓    │  [12.5M] ✓       │
└──────────────────┴──────────────────┴──────────────────┘
```

### Map Data Pipeline Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  Pipeline Status: [RUNNING] ✓                           │
│  Last complete run: 2026-03-08 02:00 UTC                │
│  Duration: 3h 42m                                        │
│  Tiles regenerated: 1.2M (affected by 847 road changes) │
│  CH preprocessing: 2h 15m                                │
│  Graph deploy: rolling update in progress (4/6 regions)  │
│  CDN invalidations sent: 1.2M tile URLs                  │
└─────────────────────────────────────────────────────────┘
```

---

## SLO Burn Rate Monitoring

For each SLO, track the **error budget burn rate** over 1-hour and 6-hour windows:

| SLO | Monthly Budget | 1h Burn Alert | 6h Burn Alert |
|---|---|---|---|
| Tile availability 99.99% | 4.3 min downtime | > 14.4× burn rate | > 6× burn rate |
| Route availability 99.95% | 21.6 min downtime | > 14.4× burn rate | > 6× burn rate |
| Route latency p99 < 2s | 0.5% of requests over | > 14.4× burn rate | > 6× burn rate |
| Traffic freshness < 5 min | 5% of time over | > 14.4× burn rate | > 6× burn rate |

**Implementation**: Use multi-window, multi-burn-rate alerting (Google SRE approach) to balance fast detection with low false-positive rate.
