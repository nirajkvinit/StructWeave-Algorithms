# Feature Flag Management System

[← Back to System Design Index](../README.md)

---

## Overview

A **Feature Flag Management System** (also known as feature toggles or feature switches) enables engineering teams to control software behavior dynamically without deploying new code. Unlike traditional configuration management that focuses on static settings, feature flags provide runtime-controllable switches with sophisticated targeting rules, gradual rollouts, and A/B experimentation capabilities.

This design covers production-grade systems like **LaunchDarkly**, **Statsig**, **Unleash**, and **GrowthBook** that power feature releases at companies serving billions of flag evaluations daily. The architecture emphasizes sub-millisecond local evaluation, real-time global propagation, and statistically rigorous experimentation.

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| **Traffic Pattern** | Extremely read-heavy (1M+ reads : 1 write) | Aggressive caching at SDK and edge layer |
| **Consistency Model** | Eventual for flag delivery; strong for experiments | Staleness budget trade-offs per use case |
| **Latency Sensitivity** | Sub-10ms p99 for SDK evaluation | Local evaluation mandatory; no network hop |
| **Update Propagation** | < 200ms globally | Real-time streaming (SSE) required |
| **Scale** | 10K+ flags, 1M+ evaluations/second | CDN/Edge deployment pattern |
| **Evaluation Guarantee** | Deterministic (same input = same output) | Consistent hashing for bucketing |

---

## Complexity Rating

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Overall** | **Medium-High** | Combines distributed caching, streaming, and statistics |
| **Flag Evaluation Engine** | Medium | Rule matching with multiple operators |
| **Consistent Bucketing** | Medium-High | Sticky rollouts, experiment integrity |
| **Real-time Streaming** | High | SSE at scale with millions of connections |
| **Experimentation Engine** | High | Statistical significance, sample ratio mismatch |
| **Edge Evaluation** | Medium | CDN workers, staleness trade-offs |

---

## Document Navigation

| # | Document | Description |
|---|----------|-------------|
| 01 | [Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning |
| 02 | [High-Level Design](./02-high-level-design.md) | Architecture, data flow, key decisions |
| 03 | [Low-Level Design](./03-low-level-design.md) | Data model, API design, algorithms |
| 04 | [Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Evaluation engine, bucketing, streaming deep dives |
| 05 | [Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, DR |
| 06 | [Security & Compliance](./06-security-and-compliance.md) | AuthN/AuthZ, threat model, data protection |
| 07 | [Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| 08 | [Interview Guide](./08-interview-guide.md) | Pacing, trade-offs, trap questions |

---

## Core Components

| Component | Responsibility | Key Challenge |
|-----------|---------------|---------------|
| **Control Plane** | Flag CRUD, targeting rules, audit logging | Strong consistency, version history |
| **Evaluation Service** | Flag evaluation, context processing | Sub-ms latency, caching strategy |
| **Streaming Service** | Real-time updates via SSE | Connection management at scale |
| **Client SDKs** | Local evaluation, caching, offline mode | Memory efficiency, determinism |
| **Edge Layer** | CDN-based evaluation | Staleness vs latency trade-off |
| **Experimentation Engine** | A/B test analysis, significance | Statistical accuracy, SRM detection |

---

## Bucketing Algorithm Comparison

| Algorithm | Description | Pros | Cons | Best For |
|-----------|-------------|------|------|----------|
| **Random** | New random value per evaluation | Simple | Non-deterministic, user sees flicker | Never use for feature flags |
| **Consistent Hashing** | SHA256(user_id + flag_key + salt) | Deterministic, sticky | Requires stable user ID | Standard approach |
| **Modulo Bucketing** | user_id % 100 | Fast computation | Poor distribution, collision-prone | Legacy systems |
| **Murmur Hash** | Fast non-crypto hash | Performance | Less randomness than SHA | High-throughput systems |

**Recommendation:** Consistent hashing with SHA256 truncation is the industry standard (LaunchDarkly, Statsig).

---

## Targeting Strategy Comparison

| Strategy | Description | Pros | Cons |
|----------|-------------|------|------|
| **Individual Targeting** | Explicit user ID lists | Precise control | Doesn't scale beyond thousands |
| **Segment-Based** | Reusable user groups | Maintainable, reusable | Requires segment management |
| **Attribute Rules** | Dynamic attribute matching | Flexible, scalable | Complex rule evaluation |
| **Percentage Rollout** | Random % of users | Gradual release | No targeting precision |
| **Combined** | Rules + percentage | Best of both worlds | More complex to debug |

---

## Rollout Strategy Comparison

| Strategy | Description | Use Case | Risk Level |
|----------|-------------|----------|------------|
| **Kill Switch** | Binary on/off | Emergency shutoff | Lowest |
| **Percentage Rollout** | Gradual 1% → 10% → 50% → 100% | Standard releases | Low |
| **Ring-Based** | Internal → Beta → GA | Enterprise features | Low |
| **Canary** | Small % with monitoring | Performance-sensitive | Medium |
| **Blue-Green** | 50/50 with instant switch | Database migrations | Medium |
| **Targeted Rollout** | Specific segments first | Premium features | Depends on segment |

---

## Evaluation Architecture Comparison

| Approach | Location | Latency | Context | Security | Best For |
|----------|----------|---------|---------|----------|----------|
| **Server-Side SDK** | App server | Network hop (~10-50ms) | Full server context | Rules hidden | API services |
| **Client-Side SDK** | Browser/mobile | Local (~1ms) | Limited client context | Rules exposed | Web/mobile apps |
| **Edge Evaluation** | CDN workers | Very low (~5ms) | Request context | Rules at edge | Global latency-critical |
| **Relay Proxy** | Self-hosted proxy | Low (~5ms) | Server context | Rules in DMZ | Air-gapped environments |

---

## Real-World References

| System | Company | Scale | Key Innovation |
|--------|---------|-------|----------------|
| **LaunchDarkly** | LaunchDarkly | Trillions of evaluations/month | CDN-based Flag Delivery Network, SSE streaming |
| **Statsig** | Statsig | Billions of events/day | Warehouse-native analytics, multi-armed bandits |
| **Unleash** | Open Source | 10K+ deployments | Self-hosted, extensible architecture |
| **GrowthBook** | Open Source | Growing adoption | Bayesian statistics, data warehouse integration |
| **AWS AppConfig** | Amazon | AWS-scale | Managed service, CloudWatch integration |
| **Split** | Split | Enterprise focus | Attribution, data export |

---

## Feature Flags vs Configuration Management

| Aspect | Feature Flags | Configuration Management |
|--------|--------------|-------------------------|
| **Primary Use** | Runtime behavior control | Application settings |
| **Change Frequency** | Minutes to hours | Days to weeks |
| **Update Latency** | Sub-second required | Minutes acceptable |
| **Targeting** | User/context-based rules | Environment-based |
| **Rollout** | Gradual percentage | All-or-nothing |
| **Experimentation** | A/B testing built-in | Not applicable |
| **Offline Support** | Required (SDK caching) | Nice to have |

---

## Related Systems

| System | Relationship |
|--------|--------------|
| [Configuration Management](../1.11-configuration-management-system/00-index.md) | Foundation for flag storage patterns |
| [CDN Design](../1.15-content-delivery-network-cdn/00-index.md) | Edge delivery architecture |
| [API Gateway](../1.14-api-gateway-design/00-index.md) | Request-level flag evaluation |
| [Distributed Cache](../1.4-distributed-lru-cache/00-index.md) | Flag caching strategies |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                  FEATURE FLAG MANAGEMENT SYSTEM                 │
├─────────────────────────────────────────────────────────────────┤
│  SCALE TARGETS                                                  │
│  • 10K+ flags per organization                                  │
│  • 1M+ evaluations/second                                       │
│  • Sub-10ms p99 SDK evaluation                                  │
│  • < 200ms global update propagation                            │
│  • 99.99% availability                                          │
├─────────────────────────────────────────────────────────────────┤
│  KEY PATTERNS                                                   │
│  • Consistent hashing for sticky bucketing                      │
│  • SSE streaming with polling fallback                          │
│  • Local SDK evaluation (no network hop)                        │
│  • Edge evaluation via CDN workers                              │
│  • Copy-on-write for concurrent updates                         │
├─────────────────────────────────────────────────────────────────┤
│  CRITICAL DECISIONS                                             │
│  • Server-side vs Client-side SDK evaluation                    │
│  • Push (SSE) vs Pull (polling) for updates                     │
│  • Edge vs Origin evaluation                                    │
│  • Real-time vs Batch experimentation analytics                 │
├─────────────────────────────────────────────────────────────────┤
│  INTERVIEW FOCUS AREAS                                          │
│  • Consistent bucketing for experiment integrity                │
│  • SSE streaming at scale                                       │
│  • SDK offline resilience                                       │
│  • Targeting rule evaluation performance                        │
│  • Graceful degradation modes                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

**Next:** [Requirements & Estimations →](./01-requirements-and-estimations.md)
