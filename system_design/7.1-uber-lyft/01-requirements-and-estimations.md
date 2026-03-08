# Requirements & Estimations

## Functional Requirements

### Rider Requirements

| ID | Requirement | Description |
|----|------------|-------------|
| R1 | Request a ride | Specify pickup and dropoff locations, select vehicle type (economy, premium, XL) |
| R2 | See nearby drivers | View available drivers on the map in real-time |
| R3 | Get fare estimate | Receive upfront pricing before confirming the ride request |
| R4 | Track driver in real-time | See driver location, ETA to pickup, and route during the trip |
| R5 | Rate and review | Rate driver (1-5 stars) and leave feedback after trip completion |
| R6 | Payment | Pay via stored payment method (card, wallet); view trip receipt |
| R7 | Trip history | View past trips with details (route, fare, driver, date) |
| R8 | Cancel ride | Cancel a requested or in-progress ride (with applicable fees) |

### Driver Requirements

| ID | Requirement | Description |
|----|------------|-------------|
| D1 | Go online/offline | Toggle availability to receive trip requests |
| D2 | Receive trip offers | Get notified of nearby trip requests with pickup details |
| D3 | Accept/decline trips | Accept or decline a trip offer within a time window (15-20s) |
| D4 | Navigation | Receive turn-by-turn directions to pickup and dropoff |
| D5 | Trip lifecycle actions | Mark arrived at pickup, start trip, complete trip |
| D6 | Earnings dashboard | View daily/weekly earnings, trip history, ratings |
| D7 | Surge zone visibility | See surge pricing zones on the map to optimize positioning |

### Matching & Dispatch Requirements

| ID | Requirement | Description |
|----|------------|-------------|
| M1 | Find nearest available driver | Query geospatial index for available drivers near the rider |
| M2 | Dispatch trip offer | Send trip request to the best-matched driver |
| M3 | Handle accept/decline | If driver declines or times out, re-dispatch to next best candidate |
| M4 | Re-dispatch on failure | Support up to 3 dispatch attempts before notifying the rider of no available drivers |

### Pricing Requirements

| ID | Requirement | Description |
|----|------------|-------------|
| P1 | Upfront fare estimate | Calculate fare based on estimated route distance, duration, base rate, and surge multiplier |
| P2 | Surge multiplier | Compute dynamic pricing multiplier based on real-time supply/demand ratio per zone |
| P3 | Final fare calculation | Calculate actual fare at trip end based on actual distance/duration traveled |
| P4 | Fare lock-in | Lock the upfront fare for a window (5 min) so rider sees a stable price |

### Location Requirements

| ID | Requirement | Description |
|----|------------|-------------|
| L1 | Driver location ingestion | Ingest real-time GPS coordinates from all online drivers every 4 seconds |
| L2 | Rider location during trip | Track rider location for trip progress and ETA updates |
| L3 | Geospatial index | Maintain an in-memory geospatial index of all available driver locations |

### Trip Lifecycle

```
REQUESTED -> DISPATCHED -> ACCEPTED -> DRIVER_EN_ROUTE -> DRIVER_ARRIVED -> IN_PROGRESS -> COMPLETED
                |              |                                                |
                v              v                                                v
           NO_DRIVERS     DECLINED/TIMEOUT                                  CANCELLED
           (rider notified)  (re-dispatch)
```

---

## Non-Functional Requirements

| Requirement | Target | Justification |
|-------------|--------|---------------|
| **Matching Latency** | p95 < 1s | Riders expect near-instant driver assignment |
| **Location Update Lag** | p95 < 2s | Driver position must be fresh for accurate matching |
| **ETA Accuracy** | < 2 min error for trips < 15 min | Trust and rider satisfaction |
| **Availability** | 99.99% (52 min downtime/year) | Revenue-critical; every minute of downtime = lost trips |
| **Surge Update Frequency** | Every 1-2 minutes | Must reflect real-time market conditions |
| **Trip State Durability** | Zero trip state loss | Active trips must survive any single component failure |
| **Payment Processing** | 99.99% success rate | Failed payments damage trust and driver earnings |
| **Global Scale** | 10,000+ cities, 70+ countries | Regional deployment with city-level data locality |

### CAP Theorem Choice

- **Trip state machine**: **CP** (Consistency + Partition tolerance). A trip cannot be in two states simultaneously. If the network partitions, we prefer rejecting updates over allowing inconsistent trip states.
- **Driver location index**: **AP** (Availability + Partition tolerance). A slightly stale driver location (2-4 seconds old) is acceptable; refusing to serve location queries is not.
- **Surge pricing**: **AP**. Stale surge multipliers (up to 2 minutes old) are better than no pricing data.

---

## Scale Estimations

### Traffic

| Metric | Calculation | Value |
|--------|-------------|-------|
| Trips per day | Given (Uber 2025 data) | 28M |
| Average trips/second | 28M / 86,400 | ~325 TPS |
| Peak trips/second (3x) | 325 * 3 | ~1,000 TPS |
| Active drivers (global) | Given | 5.4M |
| Peak concurrent online drivers | ~65% of active | ~3.5M |
| Location updates/second | 3.5M / 4s interval | **875K writes/s** |
| Peak location updates/second (1.5x) | 875K * 1.5 | **~1.3M writes/s** |
| Rider app API calls/second | 28M trips * 20 API calls avg / 86,400 | ~6,500 QPS |
| Driver app API calls/second | 3.5M * (location + status) | ~900K QPS |

### Storage

| Data | Calculation | Size |
|------|-------------|------|
| Trip record size | ~2KB (rider, driver, route, fare, timestamps) | 2KB |
| Trip storage/day | 28M * 2KB | ~56 GB/day |
| Trip storage/year | 56 GB * 365 | ~20 TB/year |
| Location update size | ~100 bytes (driver_id, lat, lng, timestamp, heading, speed) | 100 B |
| Location updates/day | 875K * 86,400 | 75.6B updates |
| Location data/day (raw) | 75.6B * 100B | ~7.5 TB/day (hot storage retained for hours, then archived) |
| Driver profile storage | 5.4M * 5KB | ~27 GB |
| Rider profile storage | 150M * 3KB | ~450 GB |

### Memory (In-Memory Geospatial Index)

| Data | Calculation | Size |
|------|-------------|------|
| Per driver entry | driver_id (16B) + lat/lng (16B) + geohash/H3 (8B) + status (1B) + timestamp (8B) + metadata (16B) | ~65 bytes |
| Total active drivers in memory | 3.5M * 65B | ~230 MB |
| With index overhead (2x) | 230 MB * 2 | ~460 MB |
| Per-city index (large city, 100K drivers) | 100K * 65B * 2 | ~13 MB |

The geospatial index is remarkably small---a single server can hold the entire global driver index in memory. The challenge is write throughput (875K updates/s), not memory capacity.

### Bandwidth

| Direction | Calculation | Bandwidth |
|-----------|-------------|-----------|
| Location ingestion (inbound) | 875K * 100B | ~87 MB/s |
| Rider map updates (outbound) | 100K concurrent riders * 5KB update * 1/5s | ~100 MB/s |
| WebSocket connections (concurrent) | ~3.5M drivers + ~500K riders | ~4M connections |

---

## SLOs / SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Matching success rate | > 95% of requests result in a matched driver | requests_matched / requests_total |
| Matching latency (p95) | < 1,000 ms | Time from ride request to driver notification |
| Matching latency (p50) | < 400 ms | Median matching time |
| Location ingestion lag (p95) | < 2,000 ms | Time from driver GPS reading to index update |
| ETA accuracy | < 2 min error for 90% of trips < 15 min | |actual_arrival - predicted_arrival| |
| Trip state consistency | Zero dual-state trips | No trip in two states simultaneously |
| Platform availability | 99.99% | Measured per city (regional) |
| Payment success rate | > 99.99% | Successful charges / attempted charges |
| Surge price freshness | Updated every 1-2 minutes per zone | Time since last surge computation |

---

## Capacity Planning Summary

```
                    +--------------------------+
                    |   PEAK LOAD PROFILE      |
                    +--------------------------+
                    | Location writes:  1.3M/s |
                    | Trip requests:    1K/s   |
                    | WebSocket conns:  4M     |
                    | Geo index memory: 460MB  |
                    | Trip storage:     20TB/yr|
                    +--------------------------+

Key bottleneck: Location write throughput (875K-1.3M writes/s)
Key constraint: Matching latency (<1s end-to-end)
Key risk:       Network partition between rider and driver during active trip
```
