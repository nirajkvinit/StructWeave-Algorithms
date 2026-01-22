# Requirements & Estimations

[Back to Index](./00-index.md) | [Next: High-Level Design →](./02-high-level-design.md)

---

## Functional Requirements

### P0 - Must Have (Core Functionality)

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-01 | **Stream Ingestion** | Accept continuous data streams from heterogeneous devices (sensors, PLCs, cameras, mobile) |
| FR-02 | **Protocol Translation** | Convert device protocols (MQTT, OPC-UA, Modbus, HTTP) to internal event format |
| FR-03 | **Local Buffering** | Store events locally with durability guarantees for offline operation |
| FR-04 | **Windowed Aggregation** | Compute aggregates (sum, avg, min, max, count) over configurable time windows |
| FR-05 | **Cloud Synchronization** | Batch-upload processed data and raw events to cloud storage |
| FR-06 | **Local Query** | Serve recent aggregates and raw data from edge cache |
| FR-07 | **Configuration Management** | Accept and apply configuration updates from cloud control plane |

### P1 - Should Have (Enhanced Features)

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-08 | **Exactly-Once Delivery** | Guarantee each event affects downstream state exactly once |
| FR-09 | **Time-Series Downsampling** | Reduce data volume via LTTB or similar algorithms before sync |
| FR-10 | **Schema Evolution** | Handle changes to event schemas without data loss |
| FR-11 | **Local Alerting** | Trigger alerts based on local thresholds without cloud dependency |
| FR-12 | **Replay Capability** | Re-process historical data from local buffer on demand |
| FR-13 | **Multi-Stream Joins** | Correlate events from multiple device streams |

### P2 - Nice to Have (Advanced Features)

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-14 | **ML Inference Integration** | Feed processed data to local ML models for predictions |
| FR-15 | **Complex Event Processing** | Detect patterns across event sequences (e.g., A followed by B within 5s) |
| FR-16 | **Multi-Tenant Isolation** | Support multiple logical tenants on shared edge infrastructure |
| FR-17 | **Edge-to-Edge Communication** | Direct data sharing between nearby edge nodes |
| FR-18 | **Time-Sensitive Networking** | Deterministic latency for critical industrial control paths |

### Out of Scope

- **Historical analytics** - Long-term analysis happens in cloud
- **ML model training** - Only inference at edge; training in cloud
- **Global coordination** - No distributed transactions across edge nodes
- **User-facing applications** - Edge serves APIs, not UIs
- **Data warehousing** - Edge is for real-time processing, not OLAP

---

## Non-Functional Requirements

### Performance

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Local Processing Latency (p50)** | < 10ms | Real-time response for local queries |
| **Local Processing Latency (p99)** | < 50ms | Bounded latency for alerting |
| **Cloud Sync Latency (p50)** | < 500ms | Near real-time visibility in cloud |
| **Cloud Sync Latency (p99)** | < 5s | Handle network variability |
| **Ingestion Throughput** | 10K-100K events/sec | Support high-frequency sensors |
| **Query Throughput** | 1K queries/sec | Local dashboards, alerts |

### Availability

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Edge Uptime** | 99.9% (8.7 hours downtime/year) | Production-critical systems |
| **Offline Operation** | 24+ hours | Survive extended network outages |
| **Data Durability** | 99.99% | No data loss during outages |
| **Recovery Time (RTO)** | < 5 minutes | Fast restart after crashes |
| **Recovery Point (RPO)** | Last checkpoint (< 1 minute) | Minimal data loss on failure |

### Scalability

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Devices per Edge Node** | 100-10,000 | Vary by deployment size |
| **Concurrent Streams** | 1,000+ | Support diverse sensor types |
| **Events per Day** | 100M-10B per node | High-frequency industrial sensors |
| **Storage Buffer** | 24-72 hours of data | Survive extended outages |
| **Edge Nodes per Deployment** | 10-10,000 | From single factory to global retail |

### Consistency

| Aspect | Guarantee | Rationale |
|--------|-----------|-----------|
| **Local Processing** | Exactly-once within node | Accurate aggregations |
| **Cloud Sync** | At-least-once with idempotency | Handle retries safely |
| **Cross-Edge** | Eventual consistency | No real-time coordination |
| **Ordering** | Causal within device stream | Preserve event relationships |
| **Time Accuracy** | < 1ms (PTP) or < 50ms (NTP) | Consistent windowing |

### Security

| Aspect | Requirement | Rationale |
|--------|-------------|-----------|
| **Device Authentication** | mTLS with device certificates | Prevent unauthorized devices |
| **Data Encryption at Rest** | AES-256 | Protect local storage |
| **Data Encryption in Transit** | TLS 1.3 | Secure all network communication |
| **Access Control** | RBAC for edge APIs | Limit administrative access |
| **Audit Logging** | All admin actions logged | Compliance and forensics |

---

## Capacity Estimations

### Reference Deployment: Industrial Manufacturing Floor

**Assumptions:**
- 500 sensors/devices per edge node
- 10 events/second per device average
- 200 bytes average event size (after compression)
- 10:1 aggregation ratio (10 raw events → 1 aggregate)
- 24-hour local retention

### Throughput Calculations

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Events per Second** | 500 devices × 10 events/sec | 5,000 events/sec |
| **Events per Day** | 5,000 × 86,400 seconds | 432M events/day |
| **Raw Data Rate** | 5,000 events/sec × 200 bytes | 1 MB/sec |
| **Raw Data per Day** | 1 MB/sec × 86,400 sec | 86 GB/day |
| **Aggregated Data per Day** | 86 GB ÷ 10 | 8.6 GB/day |

### Storage Calculations

| Storage Type | Calculation | Result |
|--------------|-------------|--------|
| **Buffer (24h raw)** | 86 GB × 1 day | 86 GB |
| **Buffer (72h raw)** | 86 GB × 3 days | 258 GB |
| **Aggregates (24h)** | 8.6 GB × 1 day | 8.6 GB |
| **State Store** | ~1KB per window × 1000 windows | ~1 MB |
| **Total Local Storage** | Buffer + Aggregates + State + OS | ~100-300 GB SSD |

### Memory Calculations

| Component | Calculation | Result |
|-----------|-------------|--------|
| **Ingestion Buffer** | 1000 events × 200 bytes × 2 (safety) | ~400 KB |
| **Window State** | 100 windows × 1000 keys × 100 bytes | ~10 MB |
| **Query Cache** | Recent 5 minutes of aggregates | ~50 MB |
| **Protocol Handlers** | 10 connections × 1 MB each | ~10 MB |
| **Processing Engine** | Base runtime + operators | ~500 MB |
| **Total RAM Required** | Sum + 50% headroom | **2-4 GB** |

### Network Calculations

| Direction | Calculation | Result |
|-----------|-------------|--------|
| **Inbound (devices)** | 1 MB/sec raw data | 1 Mbps |
| **Outbound (cloud sync)** | 8.6 GB/day aggregates | ~100 KB/sec avg |
| **Burst Sync (after outage)** | 86 GB over 4 hours | ~6 MB/sec |
| **Control Plane** | Config, heartbeats | < 1 KB/sec |
| **Minimum Uplink** | Sustained sync | **1-10 Mbps** |

### Hardware Tiers

| Tier | Hardware Profile | Use Case |
|------|------------------|----------|
| **Minimal** | Raspberry Pi 4 (4GB RAM, 64GB SD) | Small retail, kiosks |
| **Standard** | Industrial PC (8GB RAM, 256GB SSD) | Manufacturing floor |
| **High-Performance** | Edge Server (32GB RAM, 1TB NVMe) | Large factory, data center edge |
| **TSN-Enabled** | FPGA + Industrial PC | Real-time control systems |

---

## SLOs and SLAs

### Service Level Objectives

| SLO | Target | Measurement | Consequence of Miss |
|-----|--------|-------------|---------------------|
| **Ingestion Availability** | 99.9% | Events accepted / Events sent | Data loss |
| **Processing Latency (p99)** | < 50ms | Time from ingest to aggregate | Delayed alerts |
| **Sync Freshness** | < 10 minutes behind | Cloud data age vs current time | Stale dashboards |
| **Buffer Utilization** | < 80% | Used buffer / Total buffer | Risk of overflow |
| **Query Availability** | 99.5% | Successful queries / Total queries | Degraded UX |

### Error Budgets

| SLO | Target | Budget (per month) |
|-----|--------|-------------------|
| **Ingestion Availability** | 99.9% | 43.2 minutes downtime |
| **Processing Latency** | 99% within 50ms | 1% of events can exceed |
| **Sync Freshness** | 99% within 10 min | 7.2 hours delayed sync |

---

## Constraints

### Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **Limited RAM** | Cannot hold all data in memory | Streaming processing, disk spill |
| **Unreliable Network** | Cannot depend on cloud availability | Store-and-forward, local-first |
| **Clock Drift** | Inconsistent timestamps across devices | NTP/PTP synchronization |
| **Heterogeneous Devices** | Multiple protocols and formats | Protocol translation layer |
| **Remote Management** | Cannot easily access edge nodes | OTA updates, remote diagnostics |

### Business Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **Hardware Cost** | Limited compute per edge | Efficient algorithms, sampling |
| **Bandwidth Cost** | Expensive cellular/satellite | Aggregation, compression |
| **Regulatory Compliance** | Data residency requirements | Local processing, filtered sync |
| **Operational Complexity** | Managing thousands of edge nodes | Automated deployment, self-healing |

---

## Assumptions

| Assumption | Rationale | Risk if Wrong |
|------------|-----------|---------------|
| **Network returns within 72h** | Design for 3-day buffer | Data loss if longer outage |
| **Device clocks within 5s** | NTP provides reasonable sync | Incorrect windowing |
| **Events are idempotent** | Can retry safely | Duplicate processing |
| **Event order matters within device** | Causal consistency sufficient | Logic errors |
| **Cloud is eventually reachable** | No permanent air-gap | Manual data extraction needed |

---

[Back to Index](./00-index.md) | [Next: High-Level Design →](./02-high-level-design.md)
