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
