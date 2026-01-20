# Distributed Rate Limiter - System Design

## System Overview

A **Distributed Rate Limiter** is a critical infrastructure component that controls the rate of requests clients can make to a service within a specified time window. It protects backend services from being overwhelmed, ensures fair resource allocation among users, and provides defense against abuse and DDoS attacks.

In a distributed environment, rate limiting becomes significantly more complex as state must be synchronized or shared across multiple nodes, requiring careful consideration of consistency, latency, and fault tolerance trade-offs.

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| **Traffic Pattern** | Read-heavy | High throughput on limit checks |
| **Latency Sensitivity** | Very High | Must add minimal overhead (< 5ms p99) |
| **Consistency Requirement** | Eventual (typically) | Small over-limit acceptable for performance |
| **Availability Requirement** | Very High | Failure mode decisions critical |
| **State Management** | Shared/Distributed | Requires coordination mechanism |

---

## Complexity Rating

**Medium-High**

- Conceptually straightforward (count requests, enforce limits)
- Significant complexity in distributed coordination
- Multiple algorithm choices with different trade-offs
- Race conditions and consistency challenges
- Critical operational concerns (fail-open vs fail-closed)

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/Non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture, data flow, key decisions, diagrams |
| [03 - Low-Level Design](./03-low-level-design.md) | Data model, API design, algorithm pseudocode |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Race conditions, distributed consistency, bottleneck analysis |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Threat model, DDoS protection, security headers |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing, trade-offs, trap questions, common mistakes |

---

## Algorithm Summary

| Algorithm | Burst Handling | Memory | Accuracy | Use Case |
|-----------|---------------|--------|----------|----------|
| **Token Bucket** | Allows bursts | O(1) | High | Stripe, general APIs |
| **Leaky Bucket** | Smooths bursts | O(1) | High | Constant-rate processing |
| **Fixed Window** | Boundary spike | O(1) | Medium | GitHub API, simple cases |
| **Sliding Window Log** | Accurate | O(n) | Very High | Low-volume, high-accuracy |
| **Sliding Window Counter** | Balanced | O(1) | High | Cloudflare, high-scale |
| **GCRA** | Smooth, spacing | O(1) | Very High | Sophisticated rate shaping |

---

## Real-World References

| Company | Approach | Key Insight |
|---------|----------|-------------|
| **Stripe** | Token Bucket + Redis | 4 limiter types, traffic prioritization |
| **Cloudflare** | Sliding Window Counter | Edge enforcement, 0.003% error rate |
| **GitHub** | Fixed Window + Sharded Redis | Client-side sharding for scale |
| **Databricks** | Token Bucket | 10x tail latency improvement |

---

## Key Trade-offs at a Glance

```
Consistency ←――――――――――――――→ Latency
     ↑                           ↑
     Strong consistency          Local caching
     Single point of truth       Eventual consistency
     Higher latency              Lower latency

Accuracy ←――――――――――――――→ Memory
     ↑                           ↑
     Sliding window log          Fixed counters
     Per-request timestamps      O(1) storage
     O(n) memory                 Lower accuracy
```

---

## Related Systems

- **API Gateway** - Often integrates rate limiting
- **Load Balancer** - May implement connection-level limiting
- **CDN** - Edge-based rate limiting
- **Service Mesh** - Sidecar-based rate limiting
