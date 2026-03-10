# 12.18 Marketplace Platform

## System Overview

A two-sided marketplace platform is a transaction-mediated network connecting independent sellers and buyers at scale, where the platform's core value proposition is trust, discovery, and transaction safety—not inventory ownership. Unlike a retailer that buys and resells goods, the marketplace operator earns a take rate (percentage of transaction value) while bearing the engineering burden of simultaneously serving two populations with opposing incentives: buyers who want the lowest price, maximum choice, and guaranteed delivery, and sellers who want maximum visibility, fast payouts, and minimal fees. At production scale—hundreds of millions of listings, tens of thousands of concurrent transactions, and a global seller base spanning professional merchants and casual individuals—the engineering challenges cluster around four axes: search and discovery (ranking 200M+ heterogeneous listings for relevance and conversion), trust and safety (detecting counterfeit goods, fraudulent listings, fake reviews, and account takeover at ingestion and transaction time), payments and escrow (holding buyer funds in regulated escrow until delivery is confirmed while managing multi-party splits between platform, seller, and payment processor), and seller quality governance (computing composite seller health scores that incentivize good behavior without unfairly penalizing new entrants). The cross-cutting challenge is that all four subsystems must interoperate: a seller's quality score affects their search ranking, their trust level affects their payment hold period, and their listing quality affects both search recall and buyer conversion. Any naive decomposition that siloes these concerns produces a system where optimizing one axis degrades another.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Architecture Style** | Event-driven microservices with a synchronous transaction core (payment + inventory reservation) and asynchronous surrounding systems (ranking updates, trust scoring, notifications) |
| **Core Abstraction** | The *listing lifecycle record*: state machine capturing listing creation, active indexing, buyer interest signals, transaction completion, and post-transaction dispute/review state |
| **Network Effects** | Demand-side (more buyers → more seller revenue → more sellers) and supply-side (more listings → better search → more buyers); platform value scales super-linearly with GMV |
| **Search Ranking** | Multi-factor learning-to-rank model combining relevance signals (title/description match, category), quality signals (seller score, listing completeness), and behavioral signals (conversion rate, click-through, view dwell time) |
| **Trust Surface** | Four primary attack vectors: fake listings (counterfeit/non-existent items), fake reviews (coordinated boosting or competitor bombing), payment fraud (stolen card transactions), account takeover (credential stuffing attacks on seller accounts) |
| **Payment Model** | Escrow-based: buyer payment held until delivery window closes or delivery confirmed; split disbursement into seller net proceeds minus take rate minus payment processing fee |
| **Seller Quality Score** | Composite signal: review score (weighted recency), on-time shipping rate, dispute rate, policy violation history, response time; drives search rank boost/penalty and payout hold period |
| **Dispute Resolution** | Time-bounded buyer protection window; automated resolution for low-value disputes; human review queue for high-value or complex cases |
| **Scalability Challenge** | Search index freshness (newly listed items must appear in results within seconds), price/inventory consistency (no oversell), payment settlement SLAs, and review fraud detection latency |
| **Regulatory Surface** | Payment processing (PCI-DSS, PSD2 SCA), marketplace facilitator tax obligations (collect/remit sales tax), seller KYC/KYB for large-volume merchants, consumer protection (return windows, counterfeit liability) |

---

## Quick Navigation

| Document | Focus |
|---|---|
| [01 — Requirements & Estimations](./01-requirements-and-estimations.md) | Functional requirements, capacity math, SLOs |
| [02 — High-Level Design](./02-high-level-design.md) | System architecture, data flows, key design decisions |
| [03 — Low-Level Design](./03-low-level-design.md) | Data models, API contracts, core algorithms |
| [04 — Deep Dives & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Search ranking, payment escrow, trust & safety, review fraud |
| [05 — Scalability & Reliability](./05-scalability-and-reliability.md) | Index scaling, payment consistency, surge handling |
| [06 — Security & Compliance](./06-security-and-compliance.md) | PCI-DSS, KYC/AML, fraud prevention, tax compliance |
| [07 — Observability](./07-observability.md) | GMV metrics, search quality, trust signal health |
| [08 — Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, scoring rubric |
| [09 — Insights](./09-insights.md) | 8 key architectural insights |

---

## What Differentiates Naive vs. Production

| Dimension | Naive Approach | Production Reality |
|---|---|---|
| **Search Ranking** | BM25 keyword match with basic filters | Multi-stage retrieval pipeline: ANN recall → learning-to-rank re-ranker → diversity injection → personalization layer; seller quality score as multiplicative rank modifier |
| **Payment** | Simple charge at checkout | Escrow hold → conditional release on delivery confirmation or timeout; multi-party split (seller net + platform fee + tax remittance); dispute hold extending escrow window |
| **Seller Quality** | Average star rating | Composite score: recency-weighted review average + on-time shipping rate + dispute rate + response time + policy violation tiers; normalized within category to avoid cross-category unfairness |
| **Review Fraud** | No detection | Graph-based coordinated behavior detection; velocity anomalies (burst reviews on new listings); reviewer-seller relationship graph (same IP, prior purchase history required); ML classifier trained on confirmed fraud patterns |
| **Trust & Safety** | Human-reviewed reports only | Multi-layer: listing image perceptual hash against known-counterfeit database; NLP classifier on title/description; seller behavioral anomaly detection; buyer-seller communication NLP scan for off-platform payment solicitation |
| **Inventory Consistency** | Database row lock at checkout | Two-phase reservation: soft reserve at add-to-cart (TTL'd), hard commit at payment capture; optimistic concurrency for multi-seller cart scenarios |
| **Payout Timing** | Immediate transfer | Rolling hold period based on seller trust tier; new sellers: 7-day hold; established sellers: 2-day hold; dispute-extended holds with automated freeze; regulatory compliance for large disbursements (KYC verification gate) |
| **Dispute Resolution** | Email-based manual process | Automated resolution for common patterns (item not received + carrier confirmation of delivery → reject claim; item not received + no scan past label creation → auto-refund); human review escalation with case scoring |

---

## What Makes This System Unique

### Two-Sided Network Effects as an Engineering Constraint

Most distributed systems serve a single user population. A marketplace must simultaneously optimize for two populations whose interests conflict at every design decision. The search ranking system must balance seller visibility (sellers want their listings seen) against buyer relevance (buyers want to find exactly what they need). The review system must protect buyers from fraudulent sellers while protecting sellers from fraudulent buyers and competitor bombing. The payment escrow must protect buyers from non-delivery while ensuring sellers receive timely payment that doesn't threaten their cash flow. Every architectural decision must be evaluated from both sides of the market—a capability most engineering systems never need.

### Trust as a Computed, Not Observed, Signal

Unlike social platforms where trust is indicated by verified identity or follower counts, marketplace trust is a continuously computed multi-dimensional score derived from hundreds of behavioral signals. A seller with 4.9 stars and 10,000 reviews is not intrinsically trustworthy—those reviews may be systematically faked. The trust system's job is to distinguish genuine reputation from manufactured reputation, which requires not just analyzing review content and scores, but modeling the social graph of reviewer-seller relationships, the timing and velocity of reviews, the behavioral fingerprints of reviewing accounts, and cross-platform signals about the seller's identity. This computed trust score then flows into every other subsystem—ranking, payout timing, buyer protection guarantees, and listing policy enforcement—making it one of the most architecturally central components in the entire system.

### The Payment System Is a Regulated Financial Product

Most system design conversations treat payments as a black box (call the payment processor API). In a marketplace, the platform is a payment facilitator or marketplace operator under financial regulation—which means it holds buyer funds in escrow, performs seller identity verification, remits collected sales tax to tax authorities, monitors for money laundering patterns, and is subject to PCI-DSS compliance for all cardholder data touching its infrastructure. The payment system is not just an engineering component; it is a regulated financial product that imposes audit, compliance, and security requirements that shape the entire system architecture.

### Search Freshness and Consistency Are in Direct Tension

A marketplace with hundreds of millions of listings and sellers adding thousands of new listings per second must make new listings discoverable within seconds (freshness) while maintaining a consistent, ranked view of inventory that doesn't produce results pointing to sold-out items (consistency). Traditional search indexes optimize for read throughput with batch refresh cycles—incompatible with marketplace freshness requirements. The production solution requires a near-real-time index update pipeline with a separate availability signal that short-circuits stale listing retrieval before the result reaches the buyer.
