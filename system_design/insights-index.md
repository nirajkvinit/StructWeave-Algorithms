# System Design Insights Index

A cross-reference of key architectural insights extracted from each system design topic. Each insight is tagged with a **category** for cross-topic pattern recognition.

> **How to use this index:**
> - Scan by **category** to find recurring patterns across different systems
> - Click topic links to read the full insight with "why it matters" context
> - Use for quick interview prep -- the one-liners are designed to be memorable

---

## Categories Quick Reference

| Category | Description | Topics Count |
|----------|-------------|:------------:|
| Contention | Managing concurrent access to shared resources | 1 |
| Traffic Shaping | Controlling request flow, queuing, backpressure | 1 |
| Resilience | Failure handling, graceful degradation, circuit breakers | 2 |
| Atomicity | All-or-nothing operations, distributed transactions | 1 |
| Distributed Transactions | Saga, outbox, two-phase patterns | 1 |
| System Modeling | Fundamental constraints that shape architecture | 1 |
| Scaling | Horizontal/vertical scaling strategies | 1 |
| Edge Computing | Processing at the edge, CDN-level logic | 1 |
| Data Structures | Choosing the right data structure for scale | 1 |
| External Dependencies | Managing third-party service limitations | 1 |

---

## Insights by Topic

### 6.6 Ticketmaster [View](./6.6-ticketmaster/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | Redis SETNX as the Contention Absorber -- move contention from DB to in-memory atomic ops | Contention |
| 2 | Virtual Waiting Room with Leaky Bucket -- CDN-served static page + metered admission | Traffic Shaping |
| 3 | The Taylor Swift Lesson -- every error must say whether to retry; hard caps prevent unbounded growth | Resilience |
| 4 | All-or-Nothing Multi-Seat Holds -- partial holds create orphaned inventory | Atomicity |
| 5 | Idempotent Payments with Outbox Pattern -- bridge the gap between payment and state transition | Distributed Transactions |
| 6 | Finite, Non-Fungible Inventory -- each seat is unique; supply is fixed; can't "add more" | System Modeling |
| 7 | Pre-Scaling for Known Spikes -- proactive scaling beats reactive auto-scaling for predictable events | Scaling |
| 8 | Edge-Side Token Validation -- reject invalid/bot traffic at CDN, never hit origin | Edge Computing |
| 9 | Seat State Bitmaps -- 1 bit per seat for O(1) checks and O(N/8) memory | Data Structures |
| 10 | Bulkhead Isolation -- on-sale traffic pool isolated from browsing and admin | Resilience |
| 11 | Payment Gateway as True Bottleneck -- external TPS limits cap your checkout throughput | External Dependencies |

---

## Pending Insights (Topics Without 09-insights.md)

### 1. Core Infrastructure & Components

| # | Topic | Directory | Status |
|---|-------|-----------|--------|
| 1.1 | Distributed Rate Limiter | [View](./1.1-distributed-rate-limiter/) | Pending |
| 1.2 | Distributed Load Balancer | [View](./1.2-distributed-load-balancer/) | Pending |
| 1.3 | Distributed Key-Value Store | [View](./1.3-distributed-key-value-store/) | Pending |
| 1.4 | Distributed LRU Cache | [View](./1.4-distributed-lru-cache/) | Pending |
| 1.5 | Distributed Log-Based Broker | [View](./1.5-distributed-log-based-broker/) | Pending |
| 1.6 | Distributed Message Queue | [View](./1.6-distributed-message-queue/) | Pending |
| 1.7 | Distributed Unique ID Generator | [View](./1.7-distributed-unique-id-generator/) | Pending |
| 1.8 | Distributed Lock Manager | [View](./1.8-distributed-lock-manager/) | Pending |
| 1.9 | Consistent Hashing Ring | [View](./1.9-consistent-hashing-ring/) | Pending |
| 1.10 | Service Discovery System | [View](./1.10-service-discovery-system/) | Pending |
| 1.11 | Configuration Management System | [View](./1.11-configuration-management-system/) | Pending |
| 1.12 | Blob Storage System | [View](./1.12-blob-storage-system/) | Pending |
| 1.13 | High-Performance Reverse Proxy | [View](./1.13-high-performance-reverse-proxy/) | Pending |
| 1.14 | API Gateway Design | [View](./1.14-api-gateway-design/) | Pending |
| 1.15 | Content Delivery Network (CDN) | [View](./1.15-content-delivery-network-cdn/) | Pending |
| 1.16 | DNS System Design | [View](./1.16-dns-system-design/) | Pending |
| 1.17 | Distributed Transaction Coordinator | [View](./1.17-distributed-transaction-coordinator/) | Pending |
| 1.18 | Event Sourcing System | [View](./1.18-event-sourcing-system/) | Pending |
| 1.19 | CQRS Implementation | [View](./1.19-cqrs-implementation/) | Pending |

### 2. Cloud & Platform Engineering

| # | Topic | Directory | Status |
|---|-------|-----------|--------|
| 2.1 | Cloud Provider Architecture | [View](./2.1-cloud-provider-architecture/) | Pending |
| 2.2 | Container Orchestration System | [View](./2.2-container-orchestration-system/) | Pending |
| 2.3 | Function-as-a-Service (FaaS) | [View](./2.3-function-as-a-service/) | Pending |
| 2.4 | CI/CD Pipeline Build System | [View](./2.4-cicd-pipeline-build-system/) | Pending |
| 2.5 | Identity & Access Management | [View](./2.5-identity-access-management/) | Pending |
| 2.6 | Distributed Job Scheduler | [View](./2.6-distributed-job-scheduler/) | Pending |
| 2.7 | Feature Flag Management | [View](./2.7-feature-flag-management/) | Pending |
| 2.8 | Edge Computing Platform | [View](./2.8-edge-computing-platform/) | Pending |
| 2.9 | Multi-Region Active-Active | [View](./2.9-multi-region-active-active/) | Pending |
| 2.10 | Zero Trust Security Architecture | [View](./2.10-zero-trust-security-architecture/) | Pending |
| 2.11 | Service Mesh Design | [View](./2.11-service-mesh-design/) | Pending |
| 2.12 | Edge-Native Application Platform | [View](./2.12-edge-native-application-platform/) | Pending |
| 2.13 | Edge AI/ML Inference | [View](./2.13-edge-ai-ml-inference/) | Pending |
| 2.14 | Edge Data Processing | [View](./2.14-edge-data-processing/) | Pending |
| 2.15 | Edge-Native Feature Flags | [View](./2.15-edge-native-feature-flags/) | Pending |
| 2.16 | Secret Management System | [View](./2.16-secret-management-system/) | Pending |
| 2.17 | Highly Resilient Status Page | [View](./2.17-highly-resilient-status-page/) | Pending |
| 2.18 | AI Native Cloud ERP SaaS | [View](./2.18-ai-native-cloud-erp-saas/) | Pending |
| 2.19 | AI Native ATS Cloud SaaS | [View](./2.19-ai-native-ats-cloud-saas/) | Pending |
| 2.20 | Compliance-First AI-Native Payroll Engine | [View](./2.20-compliance-first-ai-native-payroll-engine/) | Pending |
| 2.21 | WhatsApp Native ERP for SMB | [View](./2.21-whatsapp-native-erp-smb/) | Pending |
| 2.22 | AI Native Offline First POS | [View](./2.22-ai-native-offline-first-pos/) | Pending |
| 2.23 | Compliance First AI Native EMR/EHR/PHR | [View](./2.23-compliance-first-ai-native-emr-ehr-phr/) | Pending |
| 2.24 | AI-Powered Clinical Decision Support | [View](./2.24-ai-powered-clinical-decision-support/) | Pending |
| 2.25 | Compliance First AI Native Pharmacy OS | [View](./2.25-compliance-first-ai-native-pharmacy-os/) | Pending |
| 2.26 | Compliance First AI Native HMS | [View](./2.26-compliance-first-ai-native-hms/) | Pending |

### 3. Artificial Intelligence & Machine Learning

| # | Topic | Directory | Status |
|---|-------|-----------|--------|
| 3.1 | AI Interviewer System | [View](./3.1-ai-interviewer-system/) | Pending |
| 3.2 | ML Models Deployment System | [View](./3.2-ml-models-deployment-system/) | Pending |
| 3.3 | AI-Native Metadata-Driven Super Framework | [View](./3.3-ai-native-metadata-driven-super-framework/) | Pending |
| 3.4 | MLOps Platform | [View](./3.4-mlops-platform/) | Pending |
| 3.5 | Uber Michelangelo ML Platform | [View](./3.5-uber-michelangelo-ml-platform/) | Pending |
| 3.6 | Netflix Metaflow ML Workflow Platform | [View](./3.6-netflix-metaflow-ml-workflow-platform/) | Pending |
| 3.7 | Netflix Runway Model Lifecycle | [View](./3.7-netflix-runway-model-lifecycle/) | Pending |
| 3.8 | Meta FBLearner Flow ML Platform | [View](./3.8-meta-fblearner-flow-ml-platform/) | Pending |
| 3.9 | Airbnb BigHead ML Platform | [View](./3.9-airbnb-bighead-ml-platform/) | Pending |
| 3.10 | Open-Source ML Platform | [View](./3.10-open-source-ml-platform/) | Pending |
| 3.11 | AIOps System | [View](./3.11-aiops-system/) | Pending |
| 3.12 | Recommendation Engine | [View](./3.12-recommendation-engine/) | Pending |
| 3.13 | LLM Training & Inference Architecture | [View](./3.13-llm-training-inference-architecture/) | Pending |
| 3.14 | Vector Database | [View](./3.14-vector-database/) | Pending |
| 3.15 | RAG System | [View](./3.15-rag-system/) | Pending |
| 3.16 | Feature Store | [View](./3.16-feature-store/) | Pending |
| 3.17 | AI Agent Orchestration Platform | [View](./3.17-ai-agent-orchestration-platform/) | Pending |
| 3.18 | AI Code Assistant | [View](./3.18-ai-code-assistant/) | Pending |
| 3.19 | AI Voice Assistant | [View](./3.19-ai-voice-assistant/) | Pending |
| 3.20 | AI Image Generation Platform | [View](./3.20-ai-image-generation-platform/) | Pending |
| 3.21 | LLM Gateway / Prompt Management | [View](./3.21-llm-gateway-prompt-management/) | Pending |
| 3.22 | AI Guardrails & Safety System | [View](./3.22-ai-guardrails-safety-system/) | Pending |
| 3.23 | LLM Inference Engine | [View](./3.23-llm-inference-engine/) | Pending |
| 3.24 | Multi-Agent Orchestration Platform | [View](./3.24-multi-agent-orchestration-platform/) | Pending |
| 3.25 | AI Observability & LLMOps Platform | [View](./3.25-ai-observability-llmops-platform/) | Pending |
| 3.26 | AI Model Evaluation & Benchmarking | [View](./3.26-ai-model-evaluation-benchmarking-platform/) | Pending |
| 3.27 | Synthetic Data Generation Platform | [View](./3.27-synthetic-data-generation-platform/) | Pending |
| 3.28 | AI Memory Management System | [View](./3.28-ai-memory-management-system/) | Pending |
| 3.29 | AI-Native Hybrid Search Engine | [View](./3.29-ai-native-hybrid-search-engine/) | Pending |
| 3.30 | AI-Native Video Generation Platform | [View](./3.30-ai-native-video-generation-platform/) | Pending |
| 3.31 | AI-Native Document Processing (IDP) | [View](./3.31-ai-native-document-processing-platform/) | Pending |
| 3.32 | AI-Native Enterprise Knowledge Graph | [View](./3.32-ai-native-enterprise-knowledge-graph/) | Pending |
| 3.33 | AI-Native Customer Service Platform | [View](./3.33-ai-native-customer-service-platform/) | Pending |
| 3.34 | AI-Native Real-Time Personalization | [View](./3.34-ai-native-real-time-personalization-engine/) | Pending |
| 3.35 | AI-Native Translation & Localization | [View](./3.35-ai-native-translation-localization-platform/) | Pending |
| 3.36 | AI-Native Data Pipeline (EAI) | [View](./3.36-ai-native-data-pipeline-eai/) | Pending |
| 3.37 | AI-Native Legal Tech Platform | [View](./3.37-ai-native-legal-tech-platform/) | Pending |
| 3.38 | AI-Native Autonomous Vehicle Platform | [View](./3.38-ai-native-autonomous-vehicle-platform/) | Pending |
| 3.39 | AI-Native Proactive Observability | [View](./3.39-ai-native-proactive-observability-platform/) | Pending |

### 4. Social & Community Applications

| # | Topic | Directory | Status |
|---|-------|-----------|--------|
| 4.1 | Facebook | [View](./4.1-facebook/) | Pending |
| 4.2 | Twitter/X | [View](./4.2-twitter/) | Pending |
| 4.3 | Instagram | [View](./4.3-instagram/) | Pending |
| 4.4 | LinkedIn | [View](./4.4-linkedin/) | Pending |
| 4.5 | TikTok | [View](./4.5-tiktok/) | Pending |
| 4.6 | Tinder | [View](./4.6-tinder/) | Pending |
| 4.7 | WhatsApp | [View](./4.7-whatsapp/) | Pending |
| 4.8 | Snapchat | [View](./4.8-snapchat/) | Pending |
| 4.9 | Telegram | [View](./4.9-telegram/) | Pending |
| 4.10 | Slack/Discord | [View](./4.10-slack-discord/) | Pending |
| 4.11 | Reddit | [View](./4.11-reddit/) | Pending |

### 5. Media & Streaming Applications

| # | Topic | Directory | Status |
|---|-------|-----------|--------|
| 5.1 | YouTube | [View](./5.1-youtube/) | Pending |
| 5.2 | Netflix | [View](./5.2-netflix/) | Pending |
| 5.3 | Netflix CDN (Open Connect) | [View](./5.3-netflix-cdn/) | Pending |
| 5.4 | Spotify | [View](./5.4-spotify/) | Pending |
| 5.5 | Disney+ Hotstar | [View](./5.5-disney-hotstar/) | Pending |
| 5.6 | Google Photos | [View](./5.6-google-photos/) | Pending |
| 5.7 | Twitch | [View](./5.7-twitch/) | Pending |
| 5.8 | Podcast Platform | [View](./5.8-podcast-platform/) | Pending |

### 6. Productivity & Collaboration Tools

| # | Topic | Directory | Status |
|---|-------|-----------|--------|
| 6.1 | Cloud File Storage | [View](./6.1-cloud-file-storage/) | Pending |
| 6.2 | Document Collaboration Engine | [View](./6.2-document-collaboration-engine/) | Pending |
| 6.3 | Multi-Tenant SaaS Platform | [View](./6.3-multi-tenant-saas-platform-architecture/) | Pending |
| 6.4 | HubSpot | [View](./6.4-hubspot/) | Pending |
| 6.5 | Zoho Suite | [View](./6.5-zoho-suite/) | Pending |

---

## Cross-Reference: Insights by Category

*This section grows as more topics get their insights captured via `/captureinsights`.*

### Contention
- **6.6 Ticketmaster**: Redis SETNX as the Contention Absorber

### Traffic Shaping
- **6.6 Ticketmaster**: Virtual Waiting Room with Leaky Bucket Admission

### Resilience
- **6.6 Ticketmaster**: The Taylor Swift Lesson -- Reject with Intent
- **6.6 Ticketmaster**: Bulkhead Isolation for On-Sale vs. Browsing

### Atomicity
- **6.6 Ticketmaster**: All-or-Nothing Multi-Seat Holds

### Distributed Transactions
- **6.6 Ticketmaster**: Idempotent Payments with Outbox Pattern

### System Modeling
- **6.6 Ticketmaster**: Finite, Non-Fungible Inventory Changes Everything

### Scaling
- **6.6 Ticketmaster**: Pre-Scaling for Known Spikes

### Edge Computing
- **6.6 Ticketmaster**: Edge-Side Token Validation

### Data Structures
- **6.6 Ticketmaster**: Seat State Bitmaps for O(1) Availability

### External Dependencies
- **6.6 Ticketmaster**: Payment Gateway as the True Bottleneck
