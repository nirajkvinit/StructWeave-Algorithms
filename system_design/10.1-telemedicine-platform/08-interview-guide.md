# Interview Guide — Telemedicine Platform

---

## 1. 45-Minute Pacing Guide

### Phase 1: Requirements Clarification (5 minutes)

**Goal:** Demonstrate structured thinking by asking targeted questions before jumping into design.

**Key questions to ask the interviewer:**
- "What's the expected scale — are we designing for a single health system or a multi-tenant SaaS platform?"
- "Should we focus on video consultation, scheduling, or both?"
- "Is HIPAA compliance a hard requirement, or are we in a non-US market?"
- "Do we need to support remote patient monitoring, or is this video-only?"
- "What's the expected concurrent video session count — thousands or hundreds of thousands?"

**Narrative to deliver:**
> "I'd like to clarify scope. A telemedicine platform spans video infrastructure, scheduling, clinical documentation, prescribing, and compliance. I'll focus on the three hardest problems: real-time video at scale with HIPAA compliance, scheduling optimization with conflict prevention, and the PHI data architecture. I'll touch on RPM and EHR integration at a high level."

**What to write on the whiteboard:**
- Core entities: Patient, Provider, Appointment, Encounter, VideoSession
- Key constraints: HIPAA, real-time video latency < 200ms, no double-booking
- Scale numbers: 1M daily consultations, 25K concurrent video, 50M patients

### Phase 2: High-Level Architecture (10 minutes)

**Goal:** Draw a clean architecture diagram showing major components and their interactions.

**Key components to draw:**
1. Client layer (patient app, provider dashboard)
2. API Gateway with auth
3. Video infrastructure (signaling server, SFU cluster, TURN servers)
4. Core services (scheduling, encounter, prescribe, billing, RPM, notification)
5. Data layer (relational DB for PHI, time-series for RPM, object storage for recordings)
6. Event backbone for async communication and audit trail

**Narrative to deliver:**
> "I'm separating the video plane from the API plane because they have fundamentally different requirements. Video needs sub-200ms latency with real-time media forwarding — it goes through SFU servers, not the API gateway. The API plane handles scheduling, documentation, and clinical workflows through REST microservices. Both planes write to the event backbone for audit trail compliance. Notice the polyglot persistence — relational for transactional data, time-series for RPM, object storage for recordings."

**Critical to mention:**
- SFU architecture choice (explain why not MCU)
- Separate scheduling database (explain hot-path isolation)
- Event-driven audit trail (explain HIPAA compliance)
- PHI segmentation across data stores

### Phase 3: Deep Dive (20 minutes)

Pick **two** of the following based on interviewer interest. Be prepared for all three.

#### Deep Dive Option A: Video Infrastructure

**Talking points:**
- WebRTC signaling flow: SDP offer/answer, ICE negotiation
- SFU vs MCU trade-off (SFU preserves E2EE, lower CPU, but clients download N-1 streams)
- Simulcast: 3 quality layers, bandwidth estimator selects appropriate layer
- TURN server fallback: needed for ~10% of sessions behind symmetric NATs
- Session recording: SFU stream tap → encrypt → object storage (consent required)
- Reconnection: ICE restart for network changes, SFU failover for node failure

**Algorithm to sketch:**
- Video routing: region selection based on latency + load + health score
- Quality adaptation: MOS-based quality switching

**Scale considerations:**
- 500 sessions per SFU server → 50+ servers for 25K concurrent
- Cascading SFU for cross-region consultations
- Auto-scaling: predictive (10-min lookahead) + reactive (70% threshold)

#### Deep Dive Option B: Scheduling System

**Talking points:**
- Double-booking prevention: SELECT FOR UPDATE + version column + serializable isolation
- Availability calculation: template-based slot generation, subtract booked, cache for 30s
- Provider matching: weighted scoring (specialty, language, continuity, rating, availability)
- No-show prediction: logistic model on historical behavior, lead time, engagement signals
- Overbooking strategy: allow 1 extra booking when no-show probability > 35%
- Waitlist management: auto-fill on cancellation with priority ordering

**Algorithm to sketch:**
- Slot optimization: priority scheduling with urgency classes + fragmentation minimization
- Cache invalidation: event-driven invalidation on booking/cancel + 30s TTL

**Scale considerations:**
- 500 availability queries/sec → cache-aside pattern essential
- Partition by provider_id for write isolation
- Time-range partitioning for historical queries

#### Deep Dive Option C: HIPAA Compliance Architecture

**Talking points:**
- PHI segmentation: identity data, clinical data, operational data in separate stores with separate keys
- Encryption: AES-256 at rest, TLS 1.3 in transit, DTLS-SRTP for video, field-level for high-sensitivity
- Audit trail: event-driven, append-only, hash chain for tamper evidence, 7-year retention
- Minimum necessary principle: each API declares PHI fields needed; data layer returns only those
- Consent management: granular consent per provider/purpose/data category with revocation
- Breach response: 4-factor risk assessment, 60-day notification, encryption safe harbor

**Algorithm to sketch:**
- Consent evaluation: runtime check on every PHI access
- De-identification: Safe Harbor (remove 18 identifiers) or Expert Determination (k-anonymity)

### Phase 4: Scalability and Trade-offs (8 minutes)

**Key trade-offs to discuss:**

**Trade-off 1: SFU vs MCU**

| Dimension | SFU | MCU |
|---|---|---|
| E2E Encryption | Preserved | Broken (must decrypt to mix) |
| Server CPU | Low (forward only) | High (decode + mix + encode) |
| Client bandwidth | Higher (download N-1 streams) | Lower (single mixed stream) |
| Latency | Lower (~50ms less) | Higher (encode/decode cycle) |
| Session recording | Easy (tap encrypted streams) | Easy (mixed output) |
| **Best for** | **1:1 and small multi-party** | Large groups (100+) |

> "For telemedicine, SFU is the clear choice. 95% of sessions are 1:1 where SFU has zero disadvantage. The 5% multi-party (patient + provider + specialist) caps at 4-6 participants where SFU client bandwidth is manageable. The E2EE preservation is crucial for HIPAA."

**Trade-off 2: Strong vs. Eventual Consistency for Scheduling**

| Approach | Benefit | Cost |
|---|---|---|
| Strong (serializable) | Zero double-bookings | Higher latency, lower throughput |
| Eventual (optimistic) | Higher throughput, lower latency | Rare double-bookings need compensation |
| **Chosen: Strong** | Double-booking is a patient safety issue | Mitigate latency with caching reads |

> "I chose strong consistency for writes with cached reads. A double-booking in healthcare means two patients show up expecting the same provider — this is unacceptable. The read path (availability queries) can tolerate 30 seconds of staleness via cache, but the write path (booking) must be serializable."

**Trade-off 3: PHI Segmentation vs. Unified Data Model**

| Approach | Benefit | Cost |
|---|---|---|
| Segmented (3 stores) | Breach blast radius limited; minimum necessary enforced structurally | Application-level joins; operational complexity |
| Unified | Simpler queries; easier development | Single breach exposes everything; minimum necessary enforced only by policy |
| **Chosen: Segmented** | Defense in depth for PHI | Cross-store coordination via event backbone |

### Phase 5: Wrap-Up (2 minutes)

**Summary statement:**
> "To summarize: I designed a telemedicine platform with three key architectural decisions — SFU-based video for E2EE and low latency, separated scheduling with strong consistency for double-booking prevention, and segmented PHI storage for defense-in-depth HIPAA compliance. The system handles 1M daily consultations with 25K concurrent video sessions, auto-scales SFU infrastructure for 10x surge, and maintains a tamper-evident audit trail for regulatory compliance."

**Extensions to mention if time permits:**
- Multi-region deployment with geo-routed video
- AI-assisted clinical documentation
- Remote patient monitoring with anomaly detection
- EHR interoperability via FHIR R4

---

## 2. Common Mistakes to Avoid

### Mistake 1: Treating Video as an Embedded Widget

| Aspect | Wrong Approach | Correct Approach |
|---|---|---|
| **What they do** | "We'll just embed a third-party video SDK" | Design the video infrastructure as a first-class system component |
| **Why it's wrong** | Third-party SDKs may not offer HIPAA-compliant recording, E2EE, or SFU topology control | You need control over media routing, quality adaptation, and compliance |
| **What to say** | | "I'm designing the SFU layer explicitly because we need control over media routing for HIPAA compliance, clinical quality profiles, and session recording with consent management" |

### Mistake 2: Ignoring No-Show Problem

| Aspect | Wrong Approach | Correct Approach |
|---|---|---|
| **What they do** | Simple calendar booking with no consideration for no-shows | Address the 15-25% no-show rate as a first-class problem |
| **Why it's wrong** | Provider time is the most expensive resource; 20% no-shows mean 20% revenue loss | Prediction + overbooking + reminders can reduce no-shows by 50% |
| **What to say** | | "I'm adding a no-show prediction model that feeds into the overbooking strategy. With a 20% baseline no-show rate, intelligent overbooking recovers 10-15% of provider capacity" |

### Mistake 3: HIPAA as an Afterthought

| Aspect | Wrong Approach | Correct Approach |
|---|---|---|
| **What they do** | Design the system first, then add encryption and audit logs | HIPAA shapes every architectural decision from the start |
| **Why it's wrong** | Retrofitting HIPAA onto an existing architecture is extremely expensive and error-prone | Segmented PHI, field-level access control, and audit trails must be foundational |
| **What to say** | | "I'm designing with PHI segmentation from day one. Identity data, clinical data, and operational data live in separate stores with separate encryption keys. Every service declares exactly which PHI fields it needs, enforced by the data layer" |

---

## 3. Trap Questions and How to Handle Them

### Trap 1: "Why not just use peer-to-peer WebRTC without an SFU?"

**Candidate error:** Agree that P2P is simpler and sufficient.

**Correct response:**
> "P2P WebRTC works for pure 1:1 calls, but we need an SFU for three reasons: (1) session recording requires a server-side media tap — in P2P, neither peer records reliably; (2) multi-party consults (patient + provider + specialist) require N×(N-1) connections in P2P, which doesn't scale; (3) the SFU enables server-side adaptive bitrate control and simulcast layer selection, giving us better quality management. The SFU doesn't break E2EE — it forwards encrypted packets without decryption."

### Trap 2: "Can we store all data in one database for simplicity?"

**Candidate error:** Agree for simplicity, or argue for microservice-per-database without justification.

**Correct response:**
> "A single database is tempting for simplicity, but telemedicine data is fundamentally heterogeneous. RPM vital signs are time-series data with 500M points/day — a relational DB would collapse under that write load. Video recordings are binary blobs that belong in object storage. Audit logs need append-only immutable storage. And the HIPAA minimum necessary principle is structurally harder to enforce when everything is in one database — any breach exposes everything. Polyglot persistence maps each data type to its optimal store while the event backbone maintains consistency."

### Trap 3: "Do we really need to worry about double-booking with only 1M appointments/day?"

**Candidate error:** Assume low volume means contention is unlikely.

**Correct response:**
> "1M daily appointments averages to ~12/second, but booking traffic is heavily concentrated. Between 8-10 AM, a popular provider might receive 5 booking requests in the same second for the same slot. At peak (open enrollment, flu season), booking rate can spike 10x. More importantly, the consequence of a double-booking is a patient showing up expecting care and not getting it — the correctness requirement is absolute, not probabilistic. Serializable isolation on the booking path is essential."

### Trap 4: "What if we skip encryption for internal service-to-service communication?"

**Candidate error:** Agree that internal traffic doesn't need encryption.

**Correct response:**
> "Internal-only encryption exemption is a common misconception. HIPAA requires encryption of ePHI in transit — this includes internal networks. A compromised internal service or container could sniff unencrypted traffic. More practically, mutual TLS between services also provides authentication — each service proves its identity, preventing a compromised service from impersonating another. The overhead is minimal with a service mesh handling TLS termination via sidecar."

### Trap 5: "Can't we use a simple FIFO queue for the waiting room?"

**Candidate error:** Implement a simple first-come-first-served queue.

**Correct response:**
> "A FIFO queue ignores clinical urgency. A patient with chest pain symptoms who arrives 5 minutes after a routine follow-up patient should be seen first. The waiting room needs priority scheduling that balances: (1) appointment time (earlier scheduled = higher priority), (2) clinical urgency (URGENT > ROUTINE), (3) wait time fairness (prevent starvation of lower-priority patients), and (4) provider running-late adjustments. It's a priority queue with multiple dimensions, not a simple FIFO."

---

## 4. Scoring Rubric

### Senior Engineer Level

| Criteria | Expectation |
|---|---|
| **Requirements** | Identifies core functional areas (video, scheduling, prescribing); mentions HIPAA as constraint |
| **Architecture** | Clean separation of video and API planes; identifies need for SFU; mentions event-driven audit |
| **Data model** | Identifies key entities (Patient, Provider, Appointment, Encounter); reasonable schema design |
| **Scalability** | Mentions SFU horizontal scaling; describes caching for availability queries |
| **Security** | Mentions encryption at rest and in transit; awareness of HIPAA requirements |

### Staff Engineer Level

| Criteria | Expectation |
|---|---|
| **Requirements** | Detailed capacity estimation with math; SLO tiers for different services |
| **Architecture** | Polyglot persistence with clear rationale; saga pattern for cross-service transactions; FHIR alignment |
| **Deep dive** | SFU simulcast and adaptive bitrate; scheduling conflict prevention with serializable isolation; PHI segmentation |
| **Scalability** | SFU auto-scaling with predictive + reactive triggers; database sharding strategy; cascading SFU for multi-region |
| **Trade-offs** | Articulates SFU vs MCU, strong vs eventual for scheduling, segmented vs unified PHI with clear reasoning |
| **Security** | Defense in depth layering; HIPAA Security Rule controls; breach response workflow; consent management system |

### Principal Engineer Level

| Criteria | Expectation |
|---|---|
| **System thinking** | Connects technical decisions to business outcomes (no-show reduction = revenue recovery; PHI segmentation = breach cost reduction) |
| **Innovation** | AI-driven scheduling optimization; clinical-specific video quality profiles; predictive SFU scaling |
| **Compliance mastery** | HITECH encryption safe harbor; EPCS requirements; 21st Century Cures Act interoperability mandates |
| **Failure analysis** | Split-brain prevention for multi-region; SFU node failure recovery; audit trail corruption recovery |
| **Evolution** | Platform extensibility: how to add new visit types, specialties, regions, and tenants without architectural changes |

---

## 5. Variation Questions

| Variation | Key Differences from Base Design |
|---|---|
| **"Design a mental health telehealth platform"** | Mandatory E2EE (even SFU can't see content); higher privacy requirements (42 CFR Part 2 for substance abuse); longer sessions (50 min vs 15 min); group therapy support (up to 10 participants) |
| **"Design a telehealth platform for rural areas"** | Low bandwidth optimization critical; audio-first with optional video; store-and-forward for specialist consults; SMS-based appointment management; intermittent connectivity handling |
| **"Design an urgent care telemedicine platform"** | No scheduling (on-demand only); triage queue with AI severity classification; shorter wait time SLOs (< 10 min); higher provider utilization target; integration with 911/emergency services |
| **"Design a chronic care management platform"** | RPM as primary interaction (not video); care plan adherence tracking; multi-provider care teams; longer-term relationship model; outcomes-based billing integration |
| **"Design a telemedicine platform for a hospital network"** | Single-tenant; deep EHR integration (not just FHIR API); in-network provider routing; department-level scheduling; on-campus + remote provider hybrid workflow |

---

*Previous: [Observability ←](./07-observability.md) | Next: [Insights →](./09-insights.md)*
