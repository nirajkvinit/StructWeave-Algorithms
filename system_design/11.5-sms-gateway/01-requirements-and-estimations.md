# Requirements & Estimations — SMS Gateway

## Functional Requirements

### Core Features (Must Have)

| # | Requirement | Description |
|---|---|---|
| FR-1 | **Message Submission API** | Accept outbound (MT) messages via REST API with sender ID, destination number, message body, and optional scheduling |
| FR-2 | **Carrier Routing & Submission** | Route messages to optimal carrier via SMPP protocol based on cost, delivery rate, and destination |
| FR-3 | **Delivery Status Tracking** | Track message lifecycle (queued → submitted → delivered/failed/undelivered) via DLR processing and expose status via API and webhooks |
| FR-4 | **Inbound Message Handling (MO)** | Receive mobile-originated messages from carriers and deliver to customer applications via webhook |
| FR-5 | **Number Provisioning** | Search, purchase, and manage phone numbers (local, toll-free, short codes, 10DLC) across countries |
| FR-6 | **Concatenated Message Support** | Automatically split long messages into segments with UDH headers and track segment-level delivery |
| FR-7 | **Character Encoding** | Auto-detect and encode messages in GSM-7 (160 chars) or UCS-2 (70 chars) based on content |
| FR-8 | **Opt-Out Management** | Automatically process STOP/UNSUBSCRIBE keywords and maintain opt-out lists per sender/number |
| FR-9 | **Webhook Callbacks** | Deliver status updates and inbound messages to customer-configured webhook endpoints with retry |
| FR-10 | **Two-Way Messaging** | Support conversational messaging with session tracking between sender numbers and recipients |

### Extended Features (Should Have)

| # | Requirement | Description |
|---|---|---|
| FR-11 | **Message Scheduling** | Accept messages with future send times and execute at the scheduled time |
| FR-12 | **Campaign Management** | Batch message submission with throttling, A/B testing, and campaign-level analytics |
| FR-13 | **Number Pooling** | Distribute outbound traffic across a pool of numbers with sticky sender assignment |
| FR-14 | **Content Templating** | Variable substitution in pre-approved message templates for compliance |
| FR-15 | **RCS Fallback** | Attempt RCS delivery first, automatically fall back to SMS if RCS unavailable |
| FR-16 | **Alpha Sender ID** | Support alphanumeric sender IDs where carrier/country regulations permit |
| FR-17 | **MMS Support** | Send multimedia messages with images, audio, and video attachments |

### Out of Scope

- Voice calling and IVR systems
- WhatsApp/Telegram/Signal integration (separate channel services)
- End-user mobile applications
- Carrier network infrastructure (SMSC operation)
- SIM card management and eSIM provisioning

---

## Non-Functional Requirements

### Performance

| Metric | Target | Rationale |
|---|---|---|
| **API response time (p50)** | < 100ms | Message acceptance must feel instant to callers |
| **API response time (p99)** | < 300ms | Tail latency budget for compliance checks + queue insertion |
| **API-to-carrier submission (p50)** | < 200ms | Competitive with direct carrier integration |
| **API-to-carrier submission (p99)** | < 1s | Accounts for carrier SMPP response variability |
| **DLR processing latency (p50)** | < 500ms | Near-real-time status updates for customers |
| **Webhook delivery (p50)** | < 2s | Customer receives status within seconds of carrier DLR |
| **Routing decision time** | < 5ms | Must not become throughput bottleneck |

### Reliability & Consistency

| Requirement | Target | Justification |
|---|---|---|
| **API availability** | 99.99% (52 min downtime/year) | Enterprise SLA expectation for messaging infrastructure |
| **Message durability** | 99.999% | Once accepted, a message must never be silently lost |
| **Delivery pipeline availability** | 99.95% | Carrier outages may cause degraded but not total failure |
| **Data consistency model** | Strong consistency for message state; eventual for analytics | Message state transitions must be atomic; analytics can lag by minutes |
| **Idempotency** | Client-provided idempotency keys with 24-hour dedup window | Prevent duplicate sends on API retries |

### CAP Theorem Positioning

**CP with high availability** — Message state must be consistent (a message cannot be simultaneously "delivered" and "failed"), and we sacrifice partition tolerance in the message state store by using synchronous replication. Analytics and reporting tolerate eventual consistency and can run on eventually-consistent replicas.

---

## Capacity Estimations

### Assumptions

| Parameter | Value | Source |
|---|---|---|
| Total customers | 200,000 active accounts | Enterprise + SMB mix |
| Daily message volume | 1 billion messages/day | Top-tier SMS platform scale |
| Peak-to-average ratio | 3:1 | Holiday/promotional spikes |
| Average message size (metadata) | 1 KB | Includes headers, routing metadata, content |
| DLR-to-message ratio | 1.2:1 | Some carriers send multiple DLR updates per message |
| Concatenated message ratio | 15% | Messages exceeding 160 GSM-7 chars |
| Average segments per concat message | 2.5 | Most long messages are 2-3 segments |
| Inbound (MO) to outbound (MT) ratio | 1:10 | Predominantly outbound A2P traffic |
| Number inventory | 20 million numbers | Across all types and countries |
| Webhook callback rate | 80% of messages | Not all customers configure webhooks |

### Throughput Calculations

```
Average QPS (messages):
  1B messages/day ÷ 86,400 sec/day = ~11,574 msg/sec

Peak QPS (messages):
  11,574 × 3 = ~34,722 msg/sec ≈ 35K msg/sec

Effective message rate (with segments):
  Base: 35K msg/sec
  Concatenated overhead: 35K × 0.15 × 1.5 additional segments = 7,875 extra segments/sec
  Total carrier submissions: 35K + 7,875 ≈ 43K submissions/sec at peak

DLR ingestion rate (peak):
  43K × 1.2 = ~51,600 DLRs/sec

Webhook dispatch rate (peak):
  35K × 0.8 = 28K webhooks/sec

Inbound (MO) message rate:
  35K ÷ 10 = 3,500 MO messages/sec

Total API request rate (peak):
  Submissions: 35K/sec
  Status queries: ~10K/sec
  Number management: ~500/sec
  Total: ~45.5K API requests/sec
```

### Storage Calculations

```
Message record storage (30-day retention):
  Daily messages: 1B
  Record size: 1 KB (metadata + content + routing info + DLR status)
  Daily storage: 1B × 1 KB = 1 TB/day
  30-day storage: 1 TB × 30 = 30 TB

DLR records (30-day retention):
  Daily DLRs: 1.2B
  DLR record size: 200 bytes (status, timestamp, carrier response)
  Daily: 1.2B × 200B = 240 GB/day
  30-day: 240 GB × 30 = 7.2 TB

Opt-out list storage:
  Estimated opt-outs: 500M number pairs (sender → recipient)
  Record size: 50 bytes
  Total: 500M × 50B = 25 GB (fits in memory)

Number inventory:
  20M numbers × 500 bytes metadata = 10 GB

Total active storage: ~40 TB (hot)
Archive storage (1 year): ~500 TB (warm/cold)
```

### Bandwidth Calculations

```
Inbound API traffic:
  45.5K req/sec × 2 KB avg request = 91 MB/sec = ~730 Mbps

Outbound carrier traffic (SMPP):
  43K submissions/sec × 300 bytes avg SMPP PDU = 12.9 MB/sec = ~103 Mbps

DLR inbound from carriers:
  51.6K DLRs/sec × 200 bytes avg = 10.3 MB/sec = ~82 Mbps

Webhook outbound:
  28K webhooks/sec × 1 KB avg = 28 MB/sec = ~224 Mbps

Total bandwidth: ~1.14 Gbps sustained, ~3.4 Gbps peak
```

### SMPP Connection Calculations

```
Total carrier submissions: 43K/sec at peak

Typical SMPP connection TPS:
  Short code: 100 TPS per connection
  Long code/10DLC: 10-30 TPS per connection
  Toll-free: 30-50 TPS per connection

Weighted average: ~50 TPS per connection

Required SMPP connections: 43K ÷ 50 = ~860 connections minimum
With headroom (60% utilization target): 860 ÷ 0.6 ≈ 1,433 connections
With redundancy (2x for failover): ~2,866 connections

Across ~400 carriers = ~7 connections per carrier (average)
  (Heavy carriers: 50-100 connections; light carriers: 1-2 connections)
```

---

## SLOs / SLAs

### Customer-Facing SLAs

| Metric | Target | Measurement | Penalty |
|---|---|---|---|
| **API Availability** | 99.99% | 5-minute rolling window, excludes scheduled maintenance | Service credits: 10% for <99.9%, 25% for <99.5% |
| **Message Acceptance Latency (p99)** | < 300ms | Time from API receipt to 202 Accepted response | Included in availability SLA |
| **Delivery Rate (Tier-1 markets)** | > 95% | Messages delivered within 60 seconds, measured daily | Not contractual; published as transparency metric |
| **Webhook Delivery (first attempt)** | < 5s | Time from DLR receipt to first webhook attempt | Best-effort; customers advised to use polling as backup |
| **DLR Completeness** | > 90% | Percentage of messages receiving a final DLR within 72 hours | Carrier-dependent; documented per carrier |

### Internal SLOs

| Metric | Target | Measurement |
|---|---|---|
| **Carrier submission latency (p99)** | < 1s | Time from queue dequeue to SMPP submit_sm_resp |
| **Queue depth per carrier** | < 10,000 messages | Real-time monitoring; triggers alerts and overflow routing |
| **SMPP connection uptime per carrier** | > 99.5% | Measured per carrier; triggers review if degraded |
| **DLR processing lag** | < 30s | Time from DLR receipt to database persistence |
| **Routing decision accuracy** | > 98% cost-optimal | Post-hoc analysis comparing chosen route vs. optimal route |
| **Duplicate detection rate** | > 99.9% | Idempotency key collision detection accuracy |
| **Compliance block rate** | 100% for known violations | No non-compliant message should reach a carrier |

---

## Capacity Planning Summary

| Resource | Specification | Scaling Trigger |
|---|---|---|
| **API tier** | 20 instances × 16 vCPU | > 70% CPU or > 40K req/sec |
| **Routing engine** | 10 instances × 8 vCPU, 32 GB RAM | > 5ms p99 routing latency |
| **SMPP connector tier** | 30 instances × 8 vCPU (connection-bound) | > 80% connection utilization per instance |
| **Message queue** | 50-partition topic, 3x replication | > 5 min consumer lag |
| **Message database (primary)** | 8-node cluster, 4 TB NVMe per node | > 70% storage or > 50K writes/sec |
| **DLR database** | 6-node cluster, 2 TB per node | > 100K writes/sec |
| **Cache layer** | 10-node cluster, 128 GB RAM per node | > 80% memory utilization |
| **Webhook dispatcher** | 15 instances × 8 vCPU | > 25K webhooks/sec |

---

*Next: [High-Level Design ->](./02-high-level-design.md)*
