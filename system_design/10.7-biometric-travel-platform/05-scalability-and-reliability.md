# Scalability & Reliability — Biometric Travel Platform

## 1. Scaling Strategy

### 1.1 Edge Node Scaling

The primary scaling axis is the number of airport touchpoints. Each touchpoint edge node is a self-contained compute unit that processes biometric verifications independently.

**Horizontal Scaling Model:**

```
Scaling by Touchpoint Count:

Small Airport (5M passengers/year):
  - 30-50 touchpoint edge nodes
  - 1 airport edge cluster (4 nodes)
  - 10-20 concurrent active galleries
  - Peak: ~20 verifications/sec

Medium Airport (20M passengers/year):
  - 100-200 touchpoint edge nodes
  - 2 airport edge clusters (8 nodes each)
  - 30-50 concurrent active galleries
  - Peak: ~80 verifications/sec

Large Hub (60M+ passengers/year):
  - 400-600 touchpoint edge nodes
  - 4 airport edge clusters (8 nodes each)
  - 50-100 concurrent active galleries
  - Peak: ~200 verifications/sec

Scaling is linear: adding 100 touchpoints adds 100 independent compute nodes.
No central bottleneck because matching runs locally on each edge node.
```

**Edge Node Auto-Scaling:**

Edge nodes are physical hardware and cannot be dynamically added, but their workload distribution can be optimized:

```
ALGORITHM DynamicTouchpointLoadBalancing(airport):
    // Monitor real-time load per touchpoint
    FOR each touchpoint_zone IN [check_in, security, boarding]:
        zone_nodes = GetEdgeNodes(airport, touchpoint_zone)
        zone_load = CalculateZoneLoad(zone_nodes)  // verifications/sec

        IF zone_load > ZONE_CAPACITY * 0.85:
            // High load: redistribute passengers to adjacent zones
            adjacent_zones = GetAdjacentZones(touchpoint_zone)
            FOR adj_zone IN adjacent_zones:
                IF CalculateZoneLoad(adj_zone) < adj_zone.capacity * 0.60:
                    RedirectPassengerFlow(touchpoint_zone, adj_zone)
                    UpdateDigitalSignage(adj_zone, "BIOMETRIC AVAILABLE")
                    BREAK

        IF zone_load > ZONE_CAPACITY * 0.95:
            // Critical: open manual lanes to absorb overflow
            ActivateManualOverflowLanes(touchpoint_zone)
            AlertOperations("CAPACITY_CRITICAL", touchpoint_zone)
```

### 1.2 Cloud Service Scaling

Cloud services handle enrollment processing, gallery construction, journey orchestration, and analytics.

**Service-Level Scaling:**

| Service | Scaling Trigger | Scaling Action | Min/Max Instances |
|---|---|---|---|
| **Enrollment Service** | Enrollment rate > 80% capacity | Add instances (stateless) | 3 / 20 |
| **Gallery Manager** | Gallery build queue depth > 10 | Add builder workers | 2 / 15 |
| **Journey Orchestrator** | Event backlog > 1000 | Add consumer instances | 4 / 30 |
| **Credential Verifier** | Verification latency p99 > 150ms | Add instances | 3 / 20 |
| **Consent Manager** | Revocation queue depth > 50 | Add processors | 2 / 10 |
| **Analytics Pipeline** | Processing lag > 5 minutes | Add stream processors | 2 / 20 |

**Gallery Manager Scaling During Flight Banks:**

```
Morning Flight Bank (6:00-8:00 AM):
  Normal: 5 galleries built per hour
  Peak: 40 galleries in 2 hours = 20 galleries/hour

Gallery Build Pipeline:
  1. Query DCS for passenger manifest: ~500ms
  2. Resolve enrolled passengers: ~200ms per passenger (batched)
     For 250 passengers: ~2 seconds (50-way parallel lookup)
  3. Fetch encrypted templates: ~1 second (batch)
  4. Build gallery structure: ~100ms
  5. Encrypt for target edge nodes: ~500ms
  6. Distribute to edge nodes: ~2 seconds

  Total per gallery: ~6 seconds
  20 galleries/hour with 3 workers: each worker handles ~7 galleries/hour
  (6 seconds build + 54 seconds idle per gallery = easily manageable)

  Scale to 10 workers during morning peak for safety margin
```

### 1.3 Multi-Airport Federation Scaling

As the platform expands from a single airport to a nationwide network:

```
Federation Scaling Architecture:

Single Airport:
  - Self-contained deployment
  - Local biometric store, gallery manager, journey orchestrator
  - Direct integration with local AODB and airline systems

Regional Cluster (5-10 airports):
  - Shared credential trust infrastructure
  - Shared blockchain network for credential anchoring
  - Cross-airport enrollment recognition
  - Regional consent propagation
  - Each airport retains local biometric processing

National Network (50+ airports):
  - Federated identity layer (cross-airport enrollment lookup)
  - National blockchain consortium
  - Centralized consent management with regional caches
  - Shared model distribution and update infrastructure
  - Airport-level autonomy for all real-time operations

International (IATA One ID alignment):
  - Cross-border credential recognition
  - International DID trust framework
  - ICAO DTC interoperability
  - Country-level data residency compliance
  - No biometric template sharing across borders (credential-only)
```

**Federation Data Flow:**

```
Cross-Airport Enrollment Recognition:

Passenger enrolls at Airport A (Delhi):
  1. Template stored on passenger device
  2. Verifiable Credential issued by Airport A enrollment authority
  3. Credential hash anchored to shared blockchain

Passenger uses biometric at Airport B (Mumbai):
  1. Passenger presents VC at touchpoint
  2. Airport B verifies VC signature (Airport A is trusted issuer)
  3. Airport B verifies VC not revoked (shared revocation registry)
  4. Airport B performs 1:1 match using template from passenger wallet
  5. No template transfer from Airport A to Airport B required

Data that crosses airport boundaries:
  - Credential hashes (on blockchain)
  - Revocation status (shared registry)
  - Issuer public keys (federation trust store)
  - Analytics aggregates (anonymized)

Data that NEVER crosses airport boundaries:
  - Biometric templates
  - Passenger PII
  - Journey events (local only)
  - Consent records (managed by data controller at enrollment airport)
```

---

## 2. Fault Tolerance

### 2.1 Edge Node Resilience

Edge nodes must operate independently when cloud connectivity is lost:

**Offline Operation Modes:**

| Mode | Trigger | Capabilities | Duration |
|---|---|---|---|
| **Normal** | Full cloud connectivity | All features | Indefinite |
| **Degraded** | Cloud latency > 500ms | Local matching + cached gallery, async event delivery | Hours |
| **Offline** | No cloud connectivity | Local matching + cached gallery, local event buffer | Up to 4 hours |
| **Emergency** | Edge node hardware failure | Manual fallback only | Until replacement |

**Offline Operation Design:**

```
ALGORITHM EdgeNodeOfflineOperation(node):
    // Detect connectivity loss
    IF CloudHealthCheck() == TIMEOUT:
        SetMode(OFFLINE)

        // Capabilities available offline:
        // 1. 1:1 matching: YES (template from wallet, matching runs locally)
        // 2. 1:N matching: YES (if gallery was pre-staged)
        // 3. Credential verification: PARTIAL
        //    - Signature verification: YES (cached issuer keys)
        //    - Revocation check: STALE (last known status)
        //    - New enrollments: NO (cannot anchor to blockchain)
        // 4. Journey orchestration: LOCAL ONLY
        //    - Cannot propagate status to other touchpoints
        //    - Buffer events for later sync

        // Buffer verification events locally
        local_buffer = OpenLocalEventBuffer(max_size=10000_events)

        WHILE mode == OFFLINE:
            event = ProcessNextVerification()

            // Accept verifications with relaxed revocation check
            // Log that revocation was stale
            event.metadata["revocation_check"] = "STALE"
            event.metadata["offline_mode"] = True

            local_buffer.Append(event)

            // Periodically try to reconnect
            IF PeriodicCloudHealthCheck() == OK:
                SetMode(RECONNECTING)
                DrainLocalBuffer(local_buffer)
                SetMode(NORMAL)
```

### 2.2 Gallery Resilience

Flight galleries are critical for boarding gate operation. Multiple layers of resilience ensure gallery availability:

```
Gallery Resilience Layers:

Layer 1: Pre-staging Buffer
  - Gallery built 90 minutes before departure
  - If first build fails, retry every 5 minutes
  - 18 retry opportunities before boarding starts

Layer 2: Edge Node Caching
  - Once distributed, gallery persists on edge node until explicit purge
  - Edge node survives gallery manager outage
  - Gallery remains valid even if gallery manager crashes

Layer 3: Redundant Distribution
  - Each boarding gate has primary and backup edge nodes
  - Gallery distributed to both
  - If primary fails, backup activates within 5 seconds

Layer 4: On-Demand Rebuild
  - If gallery corrupted (hash mismatch), trigger emergency rebuild
  - Emergency rebuild uses cached manifest + cached templates
  - Completes in < 30 seconds (vs. 6 seconds normal)

Layer 5: Graceful Degradation
  - If gallery completely unavailable, fall back to 1:1 mode
  - Passenger scans boarding pass to identify themselves
  - Edge node performs 1:1 match against wallet template
  - Slightly slower but still biometric
```

### 2.3 Blockchain Resilience

The permissioned blockchain anchors credential hashes and revocation status:

```
Blockchain Fault Tolerance:

Consensus: PBFT with 3f+1 nodes (tolerates f Byzantine failures)
  - 7 validator nodes across 3 data centers
  - Tolerates 2 simultaneous node failures
  - Transaction finality: < 2 seconds

Node Distribution:
  - Data Center A: 3 validators (primary)
  - Data Center B: 2 validators
  - Data Center C: 2 validators

Failure Scenarios:
  1. Single validator failure: No impact (PBFT continues with 6/7)
  2. Data center failure: Continue with 4-5 validators (sufficient)
  3. Network partition (2 DCs separated): Majority partition continues
  4. Complete blockchain outage:
     - Credential issuance paused (enrollments buffer)
     - Credential verification continues (signatures verifiable without chain)
     - Revocation checks use last-known status from cache
     - Recovery: replay buffered transactions on chain restoration

Note: Blockchain outage does NOT block biometric matching.
The chain is used for credential anchoring and revocation,
both of which have cached fallbacks.
```

### 2.4 Service-Level Fault Tolerance

```
Critical Service Recovery:

Biometric Matching Engine (Cloud fallback):
  - Primary: Edge node local matching
  - Secondary: Cloud GPU cluster (adds 100-200ms latency)
  - Tertiary: Manual document check
  - RTO: 0 (instant failover to cloud or manual)

Journey Orchestrator:
  - Primary: Active instance with event sourcing
  - Secondary: Standby instance with event replay
  - Event store: Replicated across 3 availability zones
  - RTO: < 30 seconds (standby promotion)
  - Impact during failover: Events buffered at edge, replayed on recovery

Enrollment Service:
  - Primary: Active-active across 2+ instances
  - Queue-based intake: enrollment requests survive instance failures
  - RPO: 0 (request in queue, not lost)
  - RTO: < 60 seconds
  - Impact: Enrollment queue backs up, no data loss

Consent Manager:
  - Primary: Active with synchronous write to audit store
  - Audit store: Replicated with strong consistency
  - RPO: 0 (consent changes are critical records)
  - RTO: < 30 seconds
  - Impact: Consent changes delayed but never lost
```

---

## 3. Disaster Recovery

### 3.1 DR Architecture

```
Disaster Recovery Tiers:

Tier 0 (Edge Layer) — No DR needed:
  - Edge nodes are physically at the airport
  - If airport is operational, edge nodes are operational
  - Edge nodes operate independently of cloud
  - DR focus: spare hardware on-site for rapid replacement

Tier 1 (Airport Edge Cluster) — Active-Passive:
  - Primary cluster in airport data center
  - Passive standby in secondary airport facility (or nearby data center)
  - Shared storage replicated synchronously
  - Failover time: < 5 minutes
  - Automatic failover on primary health check failure

Tier 2 (Cloud Services) — Multi-Region Active-Active:
  - Enrollment, consent, analytics across 2+ cloud regions
  - Active-active for enrollment (route to nearest region)
  - Active-passive for blockchain validators (single consensus group)
  - RPO: 0 for consent data, < 1 minute for analytics
  - RTO: < 15 minutes for full regional failover

Tier 3 (Blockchain) — Distributed by Design:
  - Validators in 3+ data centers (inherently disaster-resistant)
  - Tolerate loss of any single data center
  - Recovery: add replacement validators, replay chain state
```

### 3.2 Data Backup Strategy

```
Data Category: Biometric Templates
  Backup: NOT backed up centrally (privacy-by-design)
  Template lives on passenger device only
  If device is lost: passenger re-enrolls
  This is a feature, not a bug — no central biometric database to breach

Data Category: Verifiable Credentials
  Backup: Credential data on blockchain (immutable, distributed)
  Passenger wallet backup via device cloud backup (encrypted)
  Credential can be re-issued by enrollment authority if needed

Data Category: Consent Records
  Backup: Continuous replication to secondary region
  Retention: 7 years (regulatory requirement)
  Backup frequency: Synchronous replication (RPO = 0)
  Tested restore: Monthly

Data Category: Journey Events
  Backup: Daily snapshots to object storage
  Retention: 90 days (hot), 1 year (warm), 7 years (cold)
  Backup frequency: Every 6 hours (incremental)
  RPO: < 6 hours

Data Category: Gallery Data
  Backup: NOT backed up (ephemeral, rebuilt on demand)
  Gallery can be rebuilt from DCS manifest + enrollment data in < 30 seconds

Data Category: Edge Node Configuration
  Backup: Central configuration management system
  Node configuration is declarative (model version, thresholds, certificates)
  Full node rebuild from config: < 30 minutes
```

---

## 4. Capacity Planning

### 4.1 Growth Model

```
Year 1 (Launch):
  Airports: 5 (pilot)
  Passengers enrolled: 2M/year
  Daily verifications: 100,000
  Edge nodes: 250
  Cloud compute: 20 vCPUs, 4 GPUs

Year 2 (Expansion):
  Airports: 20
  Passengers enrolled: 15M/year
  Daily verifications: 800,000
  Edge nodes: 1,500
  Cloud compute: 80 vCPUs, 8 GPUs

Year 3 (National):
  Airports: 50+
  Passengers enrolled: 50M/year
  Daily verifications: 3,000,000
  Edge nodes: 5,000+
  Cloud compute: 200 vCPUs, 16 GPUs

Key Scaling Observations:
  - Cloud compute scales sub-linearly (edge does the heavy lifting)
  - Edge node count scales linearly with airport count
  - Blockchain load grows linearly but stays manageable (<100 TPS)
  - Consent storage grows linearly: ~100 GB/year (trivial)
```

### 4.2 Load Testing Strategy

```
Load Testing Levels:

Level 1: Component Testing
  - Biometric matching engine: 1000 matches/sec sustained
  - Credential verification: 500 verifications/sec sustained
  - Gallery build: 100 galleries in 10 minutes
  - Consent revocation propagation: 1000 revocations in 5 minutes

Level 2: Touchpoint Simulation
  - Simulate 200 concurrent touchpoints
  - Each touchpoint: 20 passengers/minute
  - Mixed workload: 70% 1:1, 20% 1:N, 10% enrollment
  - Duration: 4 hours (simulate morning peak)

Level 3: Multi-Airport Federation
  - Simulate 10 airports with cross-airport enrollment
  - Test credential verification across airport boundaries
  - Test consent revocation propagation across federation
  - Simulate blockchain under federation load

Level 4: Chaos Engineering
  - Kill random edge nodes during peak load
  - Disconnect cloud connectivity for 30 minutes
  - Corrupt gallery data mid-boarding
  - Simulate DDoS on enrollment endpoints
  - Revoke 10,000 consents simultaneously
```

---

## 5. Performance Optimization

### 5.1 Inference Optimization on Edge Nodes

```
Optimization 1: Model Quantization
  - Convert FP32 model to INT8 quantization
  - 4x reduction in model size (250 MB -> 62 MB)
  - 2-3x inference speedup on NPU
  - Accuracy loss: < 0.2% TAR (acceptable)

Optimization 2: Batch Processing at Gates
  - During boarding, multiple passengers approach simultaneously
  - Batch face detection: process 4 frames in single GPU pass
  - Batch template extraction: 4 templates in single forward pass
  - Throughput improvement: 2.5x vs. sequential processing

Optimization 3: Template Caching
  - Cache recently verified templates on edge node (last 100)
  - If same passenger re-scans (e.g., gate change), skip extraction
  - Cache hit rate during re-scans: ~30%
  - Saves 40ms per cached hit

Optimization 4: Adaptive Quality Threshold
  - During low-load periods: strict quality threshold (quality > 80)
  - During peak periods: relaxed threshold (quality > 60)
  - Lower quality images slightly reduce match accuracy
  - But avoid re-capture delays that would slow throughput
  - Threshold adjusts automatically based on queue depth
```

### 5.2 Network Optimization

```
Gallery Distribution Optimization:
  - Delta compression: Only send changed entries for gallery updates
  - Gallery size: 5000 x 2.5 KB = 12.5 MB (full)
  - Typical delta (late enrollment): 1 entry = 2.5 KB
  - Compression ratio (full gallery): 3:1 (12.5 MB -> 4.2 MB)

Event Batching:
  - Edge nodes batch verification events: every 1 second or 10 events
  - Reduces network round-trips by 5-10x
  - Acceptable for journey orchestrator (non-real-time)
  - Exception: security events (watchlist hits) sent immediately

Credential Caching:
  - Cache verified credentials for 30 minutes on edge node
  - Same passenger at multiple touchpoints: skip re-verification
  - Cache keyed by credential_id + passenger_did
  - Cache invalidated on revocation event
```

---

*Next: [Security & Compliance ->](./06-security-and-compliance.md)*
