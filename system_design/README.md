# System Design Documentation

This directory contains comprehensive system design documents for various distributed systems and applications. Each design follows a structured template covering requirements, architecture, algorithms, scalability, security, observability, and interview preparation.

---

## Structure

Each system design is organized in its own numbered directory following the topic numbering from the master list:

```
system_design/
├── README.md                           # This file
├── 1.1-distributed-rate-limiter/       # Topic 1.1
├── 1.2-distributed-load-balancer/      # Topic 1.2 (upcoming)
├── ...
```

### Document Structure Per Topic

Each system design directory contains 9 standardized documents:

| File | Purpose |
|------|---------|
| `00-index.md` | Overview, quick navigation, complexity rating |
| `01-requirements-and-estimations.md` | Functional/Non-functional requirements, capacity planning, SLOs |
| `02-high-level-design.md` | Architecture diagrams, data flow, key decisions |
| `03-low-level-design.md` | Data model, API design, algorithms (pseudocode) |
| `04-deep-dive-and-bottlenecks.md` | Critical components, race conditions, bottleneck analysis |
| `05-scalability-and-reliability.md` | Scaling strategies, fault tolerance, disaster recovery |
| `06-security-and-compliance.md` | Threat model, AuthN/AuthZ, compliance |
| `07-observability.md` | Metrics, logging, tracing, alerting |
| `08-interview-guide.md` | 45-min pacing, trap questions, trade-offs |

---

## Completed Designs

| # | Topic | Status | Link |
|---|-------|--------|------|
| 1.1 | Distributed Rate Limiter | Completed | [View](./1.1-distributed-rate-limiter/00-index.md) |
| 1.2 | Distributed Load Balancer | Completed | [View](./1.2-distributed-load-balancer/00-index.md) |
| 1.3 | Distributed Key-Value Store | Completed | [View](./1.3-distributed-key-value-store/00-index.md) |
| 1.4 | Distributed LRU Cache | Completed | [View](./1.4-distributed-lru-cache/00-index.md) |
| 1.5 | Distributed Log-Based Broker | Completed | [View](./1.5-distributed-log-based-broker/00-index.md) |
| 1.6 | Distributed Message Queue | Completed | [View](./1.6-distributed-message-queue/00-index.md) |
| 1.7 | Distributed Unique ID Generator | Completed | [View](./1.7-distributed-unique-id-generator/00-index.md) |
| 1.8 | Distributed Lock Manager | Completed | [View](./1.8-distributed-lock-manager/00-index.md) |
| 1.9 | Consistent Hashing Ring | Completed | [View](./1.9-consistent-hashing-ring/00-index.md) |
| 1.10 | Service Discovery System | Completed | [View](./1.10-service-discovery-system/00-index.md) |
| 1.11 | Configuration Management System | Completed | [View](./1.11-configuration-management-system/00-index.md) |
| 1.12 | Blob Storage System | Completed | [View](./1.12-blob-storage-system/00-index.md) |
| 1.13 | High-Performance Reverse Proxy | Completed | [View](./1.13-high-performance-reverse-proxy/00-index.md) |
| 1.14 | API Gateway Design | Completed | [View](./1.14-api-gateway-design/00-index.md) |
| 1.15 | Content Delivery Network (CDN) | Completed | [View](./1.15-content-delivery-network-cdn/00-index.md) |
| 1.16 | DNS System Design | Completed | [View](./1.16-dns-system-design/00-index.md) |
| 1.17 | Distributed Transaction Coordinator | Completed | [View](./1.17-distributed-transaction-coordinator/00-index.md) |
| 1.18 | Event Sourcing System | Completed | [View](./1.18-event-sourcing-system/00-index.md) |
| 1.19 | CQRS Implementation | Completed | [View](./1.19-cqrs-implementation/00-index.md) |
| 2.1 | Cloud Provider Architecture | Completed | [View](./2.1-cloud-provider-architecture/00-index.md) |
| 2.2 | Container Orchestration System | Completed | [View](./2.2-container-orchestration-system/00-index.md) |
| 2.3 | Function-as-a-Service (FaaS) | Completed | [View](./2.3-function-as-a-service/00-index.md) |
| 2.4 | CI/CD Pipeline Build System | Completed | [View](./2.4-cicd-pipeline-build-system/00-index.md) |
| 2.5 | Identity & Access Management (IAM) | Completed | [View](./2.5-identity-access-management/00-index.md) |
| 2.6 | Distributed Job Scheduler | Completed | [View](./2.6-distributed-job-scheduler/00-index.md) |
| 2.7 | Feature Flag Management | Completed | [View](./2.7-feature-flag-management/00-index.md) |
| 2.8 | Edge Computing Platform | Completed | [View](./2.8-edge-computing-platform/00-index.md) |
| 2.9 | Multi-Region Active-Active Architecture | Completed | [View](./2.9-multi-region-active-active/00-index.md) |
| 2.10 | Zero Trust Security Architecture | Completed | [View](./2.10-zero-trust-security-architecture/00-index.md) |
| 2.11 | Service Mesh Design | Completed | [View](./2.11-service-mesh-design/00-index.md) |
| 2.12 | Edge-Native Application Platform | Completed | [View](./2.12-edge-native-application-platform/00-index.md) |
| 2.13 | Edge AI/ML Inference | Completed | [View](./2.13-edge-ai-ml-inference/00-index.md) |
| 2.14 | Edge Data Processing | Completed | [View](./2.14-edge-data-processing/00-index.md) |
| 2.15 | Edge-Native Feature Flags | Completed | [View](./2.15-edge-native-feature-flags/00-index.md) |
| 2.16 | Secret Management System | Completed | [View](./2.16-secret-management-system/00-index.md) |
| 2.17 | Highly Resilient Status Page System | Completed | [View](./2.17-highly-resilient-status-page/00-index.md) |
| 2.18 | AI Native Cloud ERP SaaS | Completed | [View](./2.18-ai-native-cloud-erp-saas/00-index.md) |
| 2.19 | AI Native ATS Cloud SaaS | Completed | [View](./2.19-ai-native-ats-cloud-saas/00-index.md) |
| 2.20 | Compliance-First AI-Native Payroll Engine | Completed | [View](./2.20-compliance-first-ai-native-payroll-engine/00-index.md) |
| 2.21 | WhatsApp Native ERP for SMB | Completed | [View](./2.21-whatsapp-native-erp-smb/00-index.md) |
| 2.22 | AI Native Offline First POS | Completed | [View](./2.22-ai-native-offline-first-pos/00-index.md) |
| 2.23 | Compliance First AI Native EMR/EHR/PHR | Completed | [View](./2.23-compliance-first-ai-native-emr-ehr-phr/00-index.md) |

---

## Design Principles

All designs in this repository follow these principles:

1. **Language Agnostic** - Pseudocode only, no specific programming language
2. **Cloud Agnostic** - Generic terms (e.g., "Object Storage" not "S3")
3. **Interview Ready** - Structured for 45-minute system design interviews
4. **Production Focused** - Real-world patterns from engineering blogs
5. **Trade-off Driven** - Explicit discussion of alternatives and decisions

---

## How to Use

### For Interview Prep
1. Start with `00-index.md` for system overview
2. Review `01-requirements-and-estimations.md` for capacity planning practice
3. Study `02-high-level-design.md` and `03-low-level-design.md` for core concepts
4. Use `08-interview-guide.md` for pacing and trap questions

### For Deep Learning
1. Read all documents in order (00 → 08)
2. Focus on `04-deep-dive-and-bottlenecks.md` for distributed systems challenges
3. Study `05-scalability-and-reliability.md` for production concerns

### For Quick Reference
- Each `00-index.md` has algorithm comparison tables
- Each `08-interview-guide.md` has quick reference cards

---

## Topic Categories

| Category | Topics |
|----------|--------|
| **1. Core Infrastructure** | Rate Limiter, Load Balancer, KV Store, Cache, Message Queue, etc. |
| **2. Cloud & Platform** | Kubernetes, Serverless, CI/CD, IAM, Service Mesh, etc. |
| **3. Data Systems** | Search Engine, Time-Series DB, Graph DB, Data Warehouse, etc. |
| **4. Observability** | Metrics, Tracing, Logging, Chaos Engineering, etc. |
| **5. AI/ML** | Vector DB, RAG, Feature Store, LLM Infrastructure, etc. |
| **6-14. Applications** | Social, Media, FinTech, Enterprise, Healthcare, Gaming, etc. |

See [topics_list.md](../.claude/topics_list.md) for the complete list.

---

## References

Designs are informed by engineering blogs from:
- Stripe, Cloudflare, GitHub, Netflix, Uber
- Databricks, Airbnb, Meta, Google
- Various conference talks and papers

Each design document cites specific sources where applicable.
