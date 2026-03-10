# 16.1 Web Crawlers

## Overview

A Web Crawler (also called a spider or bot) systematically traverses the World Wide Web, discovering and fetching pages to build an index for a search engine. The crawler manages a URL Frontier — a priority-ordered, politeness-aware queue of billions of URLs — and coordinates thousands of distributed fetcher workers that download pages, extract links, detect duplicates, and feed discovered URLs back into the frontier. The core challenge is maximizing coverage and freshness of a multi-trillion-page web while respecting per-host rate limits (politeness), avoiding spider traps, deduplicating content at massive scale, and operating within finite bandwidth and storage budgets.

## Key Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Write-heavy, read-heavy** | The crawler both writes (stores fetched pages, updates URL metadata) and reads (resolves URLs, checks deduplication, queries the frontier) at extreme volume — billions of operations per day |
| **Bandwidth-bound** | Network bandwidth, not CPU or disk, is the primary bottleneck; the system must maximize useful bytes fetched per second across thousands of connections |
| **Politeness-constrained** | Even with infinite bandwidth, the crawler cannot fetch faster than individual web servers allow; per-host rate limiting is a hard architectural constraint, not a nice-to-have |
| **Distributed execution** | Fetcher workers run across hundreds to thousands of machines in multiple data centers worldwide to minimize network latency to target hosts |
| **Freshness-sensitive** | A stale index degrades search quality; the crawler must continuously recrawl high-value pages while still discovering new content — a fundamental resource allocation tension |

## Complexity Rating: **Very High**

The combination of managing a frontier of billions of URLs with per-host politeness constraints, distributed fetching across thousands of workers with DNS resolution caching, multi-level deduplication (URL normalization + content fingerprinting + near-duplicate detection via SimHash), spider trap detection, adaptive recrawl scheduling based on page change frequency, and the fundamental tension between coverage, freshness, and politeness makes this one of the most architecturally demanding distributed systems.

## Quick Links

| # | Section | Description |
|---|---------|-------------|
| 01 | [Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| 02 | [High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| 03 | [Low-Level Design](./03-low-level-design.md) | Data model, API design, core algorithms (pseudocode) |
| 04 | [Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | URL Frontier, politeness engine, deduplication, spider traps |
| 05 | [Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling fetchers, frontier partitioning, disaster recovery |
| 06 | [Security & Compliance](./06-security-and-compliance.md) | Robots.txt, content safety, crawler abuse prevention |
| 07 | [Observability](./07-observability.md) | Crawl metrics, freshness dashboards, alerting |
| 08 | [Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-off frameworks |
| 09 | [Insights](./09-insights.md) | Key architectural insights and non-obvious lessons |

## Technology Landscape

| Layer | Representative Tools | Role |
|-------|---------------------|------|
| URL Frontier | Custom (Mercator-style), distributed queues | Priority scheduling, politeness enforcement, URL deduplication |
| Distributed Fetching | Custom HTTP clients, headless browsers | Page download with connection pooling, redirect following, rendering |
| Content Processing | Custom parsers, link extractors | HTML parsing, link extraction, content fingerprinting |
| Deduplication | Bloom filters, SimHash/MinHash | URL-level and content-level duplicate detection |
| DNS Resolution | Local caching resolvers | High-throughput DNS lookup with TTL-aware caching |
| Storage | Distributed file systems, columnar stores | Raw page storage, URL metadata, crawl history |
| Coordination | ZooKeeper, etcd | Worker assignment, partition management, leader election |

## Key Web Crawler Concepts Referenced

- **URL Frontier** — A data structure combining priority queues (front queues) for importance-based scheduling with per-host queues (back queues) for politeness enforcement
- **Politeness Policy** — Rules governing how frequently and aggressively the crawler fetches from a single host, derived from robots.txt directives and adaptive rate limiting
- **Crawl Budget** — The finite resources (bandwidth, time, storage) allocated to crawling, requiring careful prioritization of which URLs to fetch
- **Content Fingerprinting** — Techniques (MD5/SHA for exact duplicates, SimHash for near-duplicates) to detect pages with identical or substantially similar content
- **Spider Trap** — A set of URLs that cause the crawler to generate infinite requests (calendar pages, session IDs in URLs, infinitely deep directory structures)
- **Recrawl Scheduling** — Algorithms that determine when to revisit previously crawled pages based on their historical change frequency and importance
- **URL Normalization** — Canonicalization rules that reduce syntactically different URLs to a single canonical form (lowercasing, removing fragments, resolving relative paths)
- **Mercator Architecture** — The seminal web crawler design from Compaq/DEC that introduced the front-queue/back-queue frontier architecture
