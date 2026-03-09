# 11.5 SMS Gateway

## System Overview

An SMS Gateway is the mission-critical telecommunications middleware that bridges enterprise applications with global carrier networks, translating API calls into SMPP (Short Message Peer-to-Peer) protocol messages, routing them through optimal carrier paths, tracking delivery status via DLR (Delivery Report) callbacks, and managing bidirectional messaging (MO/MT) across hundreds of carriers in 200+ countries. Modern SMS platforms like Twilio-scale providers process billions of messages daily, maintaining persistent SMPP connections to hundreds of carrier SMSCs (Short Message Service Centers), executing intelligent least-cost routing decisions in single-digit milliseconds, handling carrier-specific encoding (GSM-7 vs UCS-2) and concatenation (UDH headers), managing regulatory compliance across jurisdictions (TCPA in the US, GDPR in Europe, TRAI in India), and supporting the transition to RCS (Rich Communication Services) as the next-generation messaging standard. These platforms adopt event-driven architectures with carrier-aware message queues, connection pooling with per-carrier TPS (Transactions Per Second) throttling, real-time DLR state machines, number intelligence services, and multi-tier failover—achieving sub-200ms API-to-carrier submission latency, 99.99% platform availability, 95%+ delivery rates across Tier-1 markets, and supporting both A2P (Application-to-Person) and P2P (Person-to-Person) traffic patterns.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Architecture Style** | Microservices with event-driven message pipeline, carrier-specific connection pools, and asynchronous DLR processing |
| **Core Abstraction** | Message as a stateful entity transitioning through submission → queued → submitted → delivered/failed lifecycle with carrier-specific routing metadata |
| **Processing Model** | Real-time for message submission and DLR processing; batch for number provisioning, compliance audits, and analytics aggregation |
| **Protocol Stack** | SMPP v3.4/v5.0 for carrier connectivity, HTTP/REST for customer API, SS7/SIGTRAN for legacy carrier integration, GSMA RCS API for rich messaging |
| **Routing Engine** | Least-cost routing with carrier scoring (delivery rate, latency, cost), geographic affinity, number type awareness (short code, long code, toll-free), and real-time failover |
| **Encoding Handling** | GSM-7 (160 chars), UCS-2/UTF-16 (70 chars), concatenation via UDH headers with segment reassembly tracking |
| **Data Consistency** | Strong consistency for message state transitions and billing; eventual consistency for analytics and delivery rate metrics |
| **Availability Target** | 99.99% for API acceptance, 99.95% for end-to-end delivery pipeline, 99.999% for message durability (no message loss) |
| **Compliance Framework** | TCPA consent management, 10DLC brand/campaign registration, short code provisioning, GDPR data handling, country-specific opt-out enforcement |
| **Scalability Model** | Horizontal scaling of stateless API and routing tiers; connection-pooled SMPP tier scaled per carrier; partitioned message queues by destination region |

---

## Quick Navigation

| Document | Focus Area |
|---|---|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning with SMS-specific math |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, MT/MO data flows, carrier integration topology |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, SMPP connection management, routing algorithms, API contracts |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Carrier connection management, DLR state machine, message queue bottlenecks |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Carrier failover, multi-region routing, connection pool scaling |
| [06 - Security & Compliance](./06-security-and-compliance.md) | TCPA, 10DLC, GDPR, message content filtering, fraud detection |
| [07 - Observability](./07-observability.md) | Delivery rate dashboards, carrier health monitoring, DLR latency tracking |
| [08 - Interview Guide](./08-interview-guide.md) | 45-minute pacing, SMS-specific traps, trade-off discussions |
| [09 - Insights](./09-insights.md) | Key architectural insights and cross-cutting patterns |

---

## What Differentiates This System

| Dimension | Basic SMS API Wrapper | Production SMS Gateway |
|---|---|---|
| **Carrier Integration** | Single carrier, single SMPP connection | Hundreds of carriers, pooled connections with per-carrier TPS enforcement |
| **Routing** | Static carrier assignment | Dynamic least-cost routing with real-time carrier scoring, geographic affinity, and failover |
| **Number Management** | Manual number assignment | Automated number provisioning, 10DLC registration, short code management, number pooling |
| **Encoding** | ASCII only, no concatenation support | GSM-7/UCS-2 auto-detection, UDH concatenation, carrier-specific encoding overrides |
| **Delivery Tracking** | Fire-and-forget | Full DLR state machine with carrier-specific status mapping, webhook callbacks, and retry logic |
| **Compliance** | Manual opt-out handling | Automated TCPA consent management, opt-out keyword detection, campaign registration, country-specific rules |
| **Bidirectional** | Outbound only (MT) | Full MO/MT support with webhook routing, keyword matching, and session management |
| **Failover** | No redundancy | Automatic carrier failover, message re-routing, connection health monitoring |
| **Scale** | Hundreds of messages/sec | Millions of messages/sec with carrier-aware backpressure and queue management |
| **Analytics** | Basic send counts | Real-time delivery rates per carrier/country/campaign, latency percentiles, cost analytics |

---

## What Makes This System Unique

### 1. The Carrier Network Is the Bottleneck You Cannot Control
Unlike most distributed systems where you own and scale every component, an SMS gateway's most critical dependency—the carrier SMSC—is an external system with opaque capacity, unpredictable latency, and carrier-imposed TPS limits. A Tier-1 US carrier might allow 100 TPS on a short code but only 10 TPS on a long code. Indian carriers enforce 1 SMS/sec/sender ID during certain hours. Your system must respect these heterogeneous rate limits without underutilizing available capacity, and must detect carrier degradation (increasing latency, rising error rates) in real time to trigger failover—all while the carriers provide minimal transparency into their internal state.

### 2. Message State Is Distributed Across Trust Boundaries
A message's lifecycle spans multiple independent systems: your platform (accepted → queued → submitted), the carrier SMSC (accepted → forwarded), the destination carrier (received → delivered to handset). You only have visibility into the first hop and whatever DLR callbacks the carrier chooses to send. Some carriers never send DLRs. Others send them minutes or hours later. Some fabricate "delivered" DLRs without confirming handset delivery. The system must build a reliable view of message state from unreliable, partial, and sometimes dishonest signals—a distributed consensus problem where not all participants are trustworthy.

### 3. Regulatory Compliance Varies Per Message, Not Per System
Unlike GDPR (which applies to all EU users uniformly), SMS compliance is per-message: the rules depend on the destination country, the number type used, the content category, the time of day, and the sender's registration status. A single API call might be legal via a registered 10DLC number but illegal via an unregistered long code. The compliance engine must evaluate each message individually against a continuously-evolving rule set across 200+ jurisdictions, blocking non-compliant messages before they reach carriers to avoid fines that can reach $1,500 per message under TCPA.

### 4. Cost Optimization Requires Real-Time Multi-Dimensional Routing
SMS pricing varies by carrier, destination country, number type, message volume tier, and time of day. A message to a UK mobile number might cost $0.04 via Carrier A, $0.035 via Carrier B, or $0.03 via Carrier C—but Carrier C has a 20% lower delivery rate in the UK. The routing engine must balance cost against delivery probability, latency, and carrier health in real-time, making a routing decision for every single message. This is a multi-objective optimization problem that must execute in < 5ms to avoid becoming a throughput bottleneck, with the cost landscape changing as volume commitments and carrier agreements evolve.

---

## Scale Reference Points

| Metric | Value |
|---|---|
| **Global A2P SMS market** | ~$78 billion (2026), growing at 4.2% CAGR |
| **Global A2P messages/day** | ~15–20 billion messages/day |
| **Large platform daily volume** | 500M–2B messages/day |
| **Peak messages per second** | 50,000–200,000 msg/sec |
| **Carrier integrations** | 300–800 direct carrier connections |
| **Countries supported** | 200+ countries and territories |
| **Number inventory** | 10M–50M phone numbers under management |
| **SMPP connections (active)** | 2,000–10,000 persistent TCP connections |
| **DLR callbacks/sec (peak)** | 100,000–500,000 callbacks/sec |
| **Average API-to-carrier latency** | 50–150ms (domestic), 200–500ms (international) |
| **Delivery rate (Tier-1 markets)** | 95–98% within 60 seconds |
| **Message storage (30-day retention)** | 50–200 TB (metadata + content) |

---

## Technology Landscape

| Layer | Component | Role |
|---|---|---|
| **Customer API** | REST/webhook gateway | Message submission, status queries, number management, webhook configuration |
| **Routing Engine** | Real-time decision engine | Least-cost routing, carrier selection, number type matching, geographic affinity |
| **SMPP Connection Manager** | Protocol bridge | Persistent SMPP connections to carrier SMSCs, TPS enforcement, connection health monitoring |
| **Message Queue** | Partitioned message broker | Carrier-specific queues with backpressure, priority lanes, retry scheduling |
| **DLR Processor** | Asynchronous status engine | DLR ingestion, status normalization, webhook dispatch, timeout handling |
| **Number Management** | Provisioning service | Number search, purchase, 10DLC registration, short code application, number pool management |
| **Compliance Engine** | Rule evaluation service | TCPA consent checks, opt-out enforcement, content filtering, time-of-day restrictions |
| **Encoding Service** | Character translation | GSM-7/UCS-2 detection, concatenation splitting, UDH header generation, carrier-specific overrides |
| **Billing Engine** | Usage metering | Per-message cost calculation, volume tier tracking, carrier reconciliation, customer invoicing |
| **Analytics Pipeline** | Stream + batch processing | Real-time delivery dashboards, carrier scorecards, campaign analytics, anomaly detection |
| **Fraud Detection** | ML-based filtering | Spam detection, traffic pumping identification, smishing prevention, velocity checks |
| **RCS Bridge** | Next-gen messaging | RCS Business Messaging via GSMA MaaP API, fallback to SMS, rich card rendering |

---

*Next: [Requirements & Estimations ->](./01-requirements-and-estimations.md)*
