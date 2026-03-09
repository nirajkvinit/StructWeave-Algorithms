# 11.1 Online Learning Platform

## System Overview

An Online Learning Platform is the digital backbone of modern education, orchestrating video delivery, course management, learner progress tracking, assessment engines, recommendation systems, certificate issuance, and instructor analytics at scale. Modern platforms like massive open online course (MOOC) providers serve tens of millions of learners simultaneously, delivering adaptive bitrate video through global CDN networks, tracking granular learning progress across thousands of courses, running real-time assessment engines that handle millions of quiz submissions daily, and issuing verifiable digital credentials anchored to open standards. These platforms adopt microservices architectures with event-driven progress pipelines, multi-tier caching for video segments and course metadata, content-addressed storage for DRM-protected media, and ML-powered recommendation engines that personalize learning paths—achieving sub-second video start times, 99.9% progress durability, 30%+ improvement in course completion rates through personalization, and supporting concurrent live sessions with hundreds of thousands of participants.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Architecture Style** | Microservices with event-driven progress tracking, CQRS for catalog reads, and CDN-heavy media delivery |
| **Core Abstraction** | Course as a hierarchical content graph (Program > Course > Module > Lesson > Content Block) with learner state overlay |
| **Processing Model** | Streaming for progress events and analytics; batch for transcoding, recommendation training, and certificate generation |
| **AI Integration** | ML for course recommendations, adaptive learning paths, content quality scoring, fraud detection in assessments |
| **Content Delivery** | Multi-CDN adaptive bitrate streaming (HLS/DASH) with DRM encryption and offline download support |
| **Assessment Engine** | Real-time auto-grading, peer review orchestration, plagiarism detection, and adaptive question selection |
| **Data Consistency** | Strong consistency for progress/grades, eventual consistency for analytics/recommendations |
| **Availability Target** | 99.95% for video playback, 99.99% for progress persistence, 99.9% for assessment submission |
| **Credential System** | Open Badges 3.0 compliant digital certificates with cryptographic verification and optional blockchain anchoring |
| **Extensibility** | Plugin-based content types (video, interactive lab, simulation), LTI integration for third-party tools |

---

## Quick Navigation

| Document | Focus Area |
|---|---|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flows, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API contracts, core algorithms |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Video pipeline, progress tracking, assessment engine |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Threat model, DRM, FERPA/COPPA, credential verification |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-minute pacing, trade-offs, common pitfalls |
| [09 - Insights](./09-insights.md) | Key architectural insights and cross-cutting patterns |

---

## What Differentiates This System

| Dimension | Traditional LMS | Modern Online Learning Platform |
|---|---|---|
| **Video Delivery** | Single-quality download or basic streaming | Adaptive bitrate streaming (HLS/DASH) with multi-CDN failover and DRM |
| **Content Model** | Flat file uploads (PDF, SCORM packages) | Hierarchical content graph with interactive elements, labs, and simulations |
| **Progress Tracking** | Coarse completion flags (done/not done) | Granular sub-second progress events with resume-to-exact-position capability |
| **Assessment** | Static multiple-choice quizzes | Adaptive question selection, peer review, code execution sandboxes, plagiarism detection |
| **Personalization** | Manual course selection only | ML-powered recommendations, adaptive learning paths, skill gap analysis |
| **Credentials** | PDF certificates with no verification | Cryptographically signed Open Badges with blockchain-anchored verification |
| **Scale** | Hundreds to thousands of concurrent users | Millions of concurrent learners, tens of thousands of courses |
| **Offline Support** | None | Encrypted offline downloads with progress sync on reconnection |
| **Analytics** | Basic completion reports | Real-time learning analytics, engagement heatmaps, drop-off analysis, A/B testing |
| **Monetization** | Single license fee | Subscriptions, per-course purchase, enterprise B2B licensing, freemium tiers |

---

## What Makes This System Unique

### 1. Video Is the Dominant Resource—But Not the Dominant Complexity
Video accounts for 90%+ of bandwidth and storage costs, yet the most architecturally complex components are progress tracking and assessment. Video delivery is a well-solved CDN problem, but tracking exactly where a learner paused in a 45-minute lecture, ensuring that progress is never lost even during network failures, and synchronizing that state across mobile, desktop, and offline sessions creates distributed state management challenges that rival financial transaction systems.

### 2. The Content Graph Creates a Hierarchical Dependency Problem
Unlike social media where content items are independent, learning content has prerequisites, sequencing, and hierarchical dependencies. A learner cannot access Module 3 until Module 2 is complete. A certificate requires all assessments above a threshold. A learning path spans multiple courses with branching logic. This hierarchical dependency graph must be evaluated in real-time for every navigation request, and modifications to the graph (instructor reorders a module) must not corrupt millions of in-flight learner progress records.

### 3. Assessment Integrity Is an Adversarial Problem
Every assessment is a security boundary. Learners are motivated to cheat—sharing answers, using multiple accounts, submitting plagiarized work, or exploiting timing vulnerabilities. The system must defend against these attacks while maintaining a frictionless experience for honest learners. This creates an unusual adversarial dynamic rarely seen in other system designs: the users themselves are potential attackers, and the attack surface is the application's core functionality.

### 4. Dual Audience with Conflicting Requirements
The platform serves two distinct user types with opposing needs. Learners want instant video start, seamless progress sync, and minimal friction. Instructors want rich content authoring tools, detailed analytics, and control over their intellectual property (DRM). Enterprise administrators want compliance reporting, seat management, and SSO integration. Designing APIs, data models, and access patterns that serve all three audiences without compromising any creates unique multi-tenancy challenges.

---

## Scale Reference Points

| Metric | Value |
|---|---|
| **Global EdTech market** | ~$400 billion (2026), growing at 16% CAGR |
| **Registered learners (large platform)** | 100M–150M+ registered users |
| **Monthly active learners** | 30M–50M MAU |
| **Concurrent video viewers (peak)** | 2M–5M simultaneous streams |
| **Course catalog size** | 200,000–500,000 courses |
| **Video storage (total library)** | 50–100 PB (multiple bitrate renditions) |
| **Daily video hours streamed** | 10M–30M hours/day |
| **Progress events per second** | 200,000–500,000 events/sec at peak |
| **Assessment submissions per day** | 5M–15M submissions/day |
| **Certificates issued per month** | 2M–5M certificates/month |
| **CDN bandwidth (peak)** | 10–40 Tbps |
| **Content upload rate** | 5,000–10,000 new lectures/day |

---

## Technology Landscape

| Layer | Component | Role |
|---|---|---|
| **Content Delivery** | Multi-CDN with adaptive bitrate | Global video delivery with HLS/DASH, DRM encryption, offline packaging |
| **Transcoding Pipeline** | Distributed video processing | Multi-resolution encoding, thumbnail extraction, subtitle synchronization |
| **API Gateway** | Rate-limited reverse proxy | Request routing, authentication, rate limiting, API versioning |
| **Course Service** | Content management engine | Course CRUD, content graph management, prerequisite validation |
| **Progress Service** | Event-sourced state machine | Granular progress tracking, resume position, completion calculation |
| **Assessment Engine** | Quiz/assignment processor | Question bank management, auto-grading, peer review orchestration |
| **Recommendation Engine** | Collaborative + content-based ML | Personalized course suggestions, learning path generation, skill mapping |
| **Credential Service** | Certificate generator and verifier | Open Badges issuance, blockchain anchoring, third-party verification API |
| **Search Service** | Full-text + faceted search engine | Course discovery, instructor search, skill-based filtering |
| **Analytics Pipeline** | Stream + batch processing | Learning analytics, engagement metrics, instructor dashboards, A/B testing |
| **Payment Service** | Subscription and purchase engine | Stripe-style payment processing, subscription management, B2B invoicing |
| **Notification Service** | Multi-channel delivery | Email, push, in-app notifications for deadlines, recommendations, certificates |

---

*Next: [Requirements & Estimations ->](./01-requirements-and-estimations.md)*
