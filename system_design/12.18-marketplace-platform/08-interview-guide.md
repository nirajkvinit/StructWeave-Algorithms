# 12.18 Marketplace Platform — Interview Guide

## Overview

Designing a two-sided marketplace is a senior/staff-level system design question that tests breadth across distributed transactions, search and ranking, trust systems, financial architecture, and network effects thinking. Unlike single-sided platform questions (e.g., "design a social feed"), marketplace questions require candidates to simultaneously consider two user populations with opposing incentives and a platform that mediates between them. The hardest problems are not infrastructural (scaling a database) but architectural (how do you maintain consistency across inventory, payment, escrow, and order state without 2PC across microservices?).

**Typical time allocation:** 45–55 minutes

---

## 45-Minute Interview Pacing

| Phase | Time | Focus |
|---|---|---|
| Requirements clarification | 5–7 min | Two-sided nature, scale, key features (search? payments? reviews?) |
| Back-of-envelope estimation | 5–7 min | Listings count, QPS, storage, transaction volume |
| High-level architecture | 8–10 min | Core services, data flow, key design decisions |
| Deep dive (interviewer-directed) | 12–15 min | Search ranking OR payment escrow OR trust & safety |
| Extensions and trade-offs | 5–7 min | Fraud, consistency, multi-region, seller quality |
| Wrap-up and questions | 2–3 min | |

---

## Opening Phase: Requirements Clarification

### Questions the Candidate Should Ask

**Scope definition:**
- "Is this a physical goods marketplace or does it also include digital goods and services?"
- "Are we building for both buyers and sellers, or focusing on one side first?"
- "What's the primary differentiator we're optimizing for — breadth of selection, price, trust, or speed of delivery?"

**Scale:**
- "What's the approximate number of active listings? Millions or hundreds of millions?"
- "What's the daily transaction volume and average order value?"
- "What's our target search latency — sub-100ms or is 500ms acceptable?"

**Features:**
- "Is an escrow/buyer protection system required, or do we trust sellers to fulfill?"
- "Do we need a review and rating system in scope?"
- "Is dispute resolution in scope, or handled by a human team outside the system?"

**Trust and compliance:**
- "What's the seller mix — mostly businesses, individual casual sellers, or both?"
- "Are we handling payments ourselves, or integrating with an external payment processor?"
- "Are there specific regulatory markets in scope (EU, US) that affect compliance requirements?"

### Strong Candidate Signal

A strong candidate immediately identifies the two-sided nature as the central design challenge—that optimizing for buyer experience (breadth, relevance, low price) can conflict with seller experience (visibility, fast payout, minimal fees)—and asks which side the platform is more willing to trade off. They also quickly identify the atomic transaction challenge: inventory reservation, payment, and escrow creation must succeed together or roll back together.

---

## Deep Dive Phase: Common Interviewer Probes

### Deep Dive 1: Search Ranking Architecture

**Interviewer prompt:** "How would you design the search ranking system for 300 million listings? Walk me through the architecture."

**Strong response covers:**
- Multi-stage pipeline necessity: ANN recall → LTR re-rank → hard filters → personalization (not a single scoring function applied to all 300M)
- Feature groups: relevance (title match), quality (seller score), behavioral (CTR, conversion), freshness (listing age), price signals
- Near-real-time indexing for new listings (not batch rebuild)
- Separation of availability signal from rank signal (availability cache updated on every sale; rank index updated on a slower cycle)
- How seller quality score acts as a multiplicative rank modifier (not a separate filter)
- Offline evaluation via NDCG against human-labeled queries; online evaluation via A/B on conversion

**Trap question:** "Why not just use a keyword search with seller rating as a filter? That seems simpler."

**Expected answer:** Keyword-only search fails for semantic queries ("something to wear to a beach wedding" won't match listings that say "floral sundress"). Rating as a hard filter penalizes new sellers with no reviews, harming supply-side diversity and disadvantaging legitimate new entrants. Learning-to-rank treats seller quality as a soft signal, not a binary gate—a highly relevant listing from a new seller can still rank above an irrelevant listing from a top-rated seller.

---

### Deep Dive 2: Payment Escrow and Consistency

**Interviewer prompt:** "Walk me through what happens between a buyer clicking 'Buy Now' and the seller receiving payment. What are the consistency challenges?"

**Strong response covers:**
- Two-phase inventory reservation (soft reserve at cart → hard commit at payment capture) with TTL to release abandoned carts
- Saga pattern for checkout: reserve → authorize → capture → create escrow → confirm order; each step has a compensating transaction
- Why 2PC (two-phase commit) is not the right answer: it requires all participating services to implement the XA protocol, creates tight coupling, and a coordinator failure leaves the transaction in doubt indefinitely
- Escrow as a separate financial ledger (append-only), not a balance in the operational database
- Multi-party split calculation: order total − platform fee − processing fee − tax remittance = seller net
- Disbursement hold period tied to seller trust tier; dispute as an escrow-freeze trigger

**Trap question:** "Can't you just use a database transaction to handle all of this atomically?"

**Expected answer:** A database transaction works within a single database but fails across service boundaries. The order record, inventory reservation, payment authorization, and escrow creation span at least three different services and likely three different databases. Wrapping them in a distributed transaction (2PC) creates a system that is fragile under network partitions and doesn't degrade gracefully. The saga pattern accepts that individual steps may fail and defines compensating actions (rollbacks) for each, resulting in eventual consistency without cross-service transaction coordination.

---

### Deep Dive 3: Trust & Safety System

**Interviewer prompt:** "How do you detect and prevent fake reviews on your marketplace?"

**Strong response covers:**
- Purchase verification as a hard gate (reviews only allowed after confirmed order delivery)
- Velocity signals (burst of reviews for a new seller within 24 hours)
- Graph analysis: bipartite reviewer-seller graph; coordinated attack creates dense subgraph of reviewers with no other review history
- Linguistic fingerprinting: review farms often produce syntactically similar text despite surface variation
- IP and device clustering: multiple reviewers from the same IP subnet
- Account age and review history: reviewer accounts that only review one seller are suspicious
- ML classifier trained on confirmed fraud patterns; fraud score triggers human review or suppression
- Retrospective suppression: when a coordinated campaign is detected, retroactively suppress all reviews from the campaign (not just the latest batch)

**Trap question:** "Why not just require verified purchases before allowing any review?"

**Expected answer:** Verified purchase requirement is correct and should be a hard gate. But it's not sufficient—fake reviewers can purchase cheap items (or collude with a seller to generate fake purchase records) and then leave fake reviews. The detection must go beyond purchase verification to behavioral and graph-based signals. Additionally, verified purchase requirement only addresses fake positive reviews; it doesn't catch competitor bombing (real buyer accounts leaving malicious negative reviews).

---

## Extension Questions

### Extension 1: New Seller Cold Start

"A brand new seller with no reviews, no order history, and no shipping record joins the platform. How does your ranking system handle them, and what's the risk?"

Good answer covers:
- New sellers default to a "new" trust tier with conservative search boost (below average)
- Risk: perpetual cold start trap — no visibility → no sales → no reviews → no visibility
- Mitigation: category-specific new seller boost for first 30 days OR first N listings; separate "new sellers" search facet
- Platform incentive alignment: platform needs new seller supply, so deliberately surfacing some new seller inventory is in the platform's long-term interest

### Extension 2: Multi-Currency and Cross-Border

"How does your payment and escrow system handle transactions between a US buyer and a Japanese seller?"

Good answer covers:
- FX conversion at order time vs. disbursement time (rate lock exposure to platform)
- Separate payment processor routing for regional payment methods (bank transfers in Japan are common; cards less so)
- International wire fees for disbursement; minimum payout thresholds to make cross-border economically viable
- Local currency escrow vs. converted escrow (accounting complexity)
- Additional KYC/KYB for cross-border sellers (FATF compliance, OFAC sanctions)

### Extension 3: Counterfeit Goods Detection

"A seller lists a product claiming it's a luxury brand. How do you detect and prevent counterfeit listings?"

Good answer covers:
- Brand protection program: authorized brand owners register trademarks; platform uses NLP to identify listings mentioning protected brands
- Price anomaly detection: listing claiming to be a $3,000 item priced at $200 is suspicious
- Image-based detection: seller photos can be compared to official brand product photos (similarity models); unauthorized use of brand imagery
- Proactive vs. reactive: proactive scan at listing creation; reactive from brand owner and buyer reports
- Graduated response: low-confidence → manual review; high-confidence → immediate hold pending seller verification
- Legal safe harbor: marketplace is protected under DMCA safe harbor if it acts promptly on verified brand owner complaints

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---|---|---|
| Single-sided design (optimizing only for buyers) | Ignores that seller retention and growth are equally critical | Explicitly model both buyer and seller experience at each design decision |
| 2PC for checkout consistency | Fragile across service boundaries; coordinator failure leaves transactions in doubt | Saga pattern with compensating transactions |
| Batch search index refresh | New listings invisible for hours after creation | Near-real-time incremental indexing with hot overlay |
| Hard filtering on seller rating | Freezes out new sellers; damages supply diversity | Soft ranking modifier, not a filter threshold |
| Treating reviews as just star ratings | Misses the fraud detection architecture entirely | Graph-based fraud detection, velocity analysis, purchase verification gate |
| Not separating escrow from operational DB | Financial records require different durability, compliance, and audit requirements | Append-only escrow ledger as a separate financial system |
| Ignoring the payout timing problem | Sellers need predictable cash flow; buyers need refund availability | Explicit escrow release conditions + trust-tier-based hold periods |
| No discussion of seller quality score | Quality score is the single most cross-cutting signal in the system | Introduce seller quality score early and trace its effects on ranking, payouts, and trust |

---

## Scoring Rubric

### Basic (passing score)
- Identifies key entities: listings, orders, buyers, sellers
- Designs basic checkout flow with payment
- Proposes search functionality with keyword matching
- Mentions review/rating system

### Intermediate (strong hire)
- Multi-stage search pipeline with LTR ranking
- Escrow-based payment with conditional release
- Inventory reservation to prevent oversell
- Review fraud detection at least one signal (purchase verification)
- Seller quality score as a ranking input

### Advanced (exceptional hire / staff)
- Saga pattern with compensating transactions for checkout
- Four-stage search pipeline with feature group breakdown
- Seller quality score as a multi-dimensional, asynchronously computed signal feeding multiple downstream systems
- Graph-based review fraud detection
- Payment compliance architecture (PCI tokenization, KYC tiers, AML monitoring)
- Trust tier system with payout hold periods
- Graceful degradation modes for search and payment processor failover
- Near-real-time index update with availability cache separation

### Signals of Exceptional Depth
- Unprompted discussion of the cold start problem for new sellers and how to balance it against fraud risk
- Recognizes that take rate is a business metric that the platform system must protect (accurately compute and collect across all order scenarios including disputes and refunds)
- Frames inventory reservation TTL as a competitive tool (too short → buyer frustration; too long → listing appears unavailable → lost GMV)
- Identifies the bidirectional dispute problem: fake positive reviews AND competitor bombing require different detection strategies
- Discusses the seller cash flow dependency on payout timing and how payout hold period is a trust lever, not just a fraud control

---

## Interviewer Testing Signals

Use these prompts to test specific depth:

| Test | Prompt |
|---|---|
| Consistency understanding | "Two buyers simultaneously click 'Buy Now' on the same single-quantity listing. Walk me through what happens." |
| Financial integrity | "A checkout completes but the escrow creation fails. What does your system do?" |
| Review fraud depth | "A sophisticated competitor buys 50 real items from our seller over 6 months, then leaves 50 one-star reviews. How do you detect this?" |
| Search freshness | "A seller lists an item and a buyer searches for it 15 seconds later. Is the listing in the results?" |
| Trust system tension | "A seller has a 4.8 star average but all their reviews are from accounts created in the last month. How does your quality score handle this?" |
| Payout compliance | "A new seller sells $25,000 in their first week. What happens to their payouts?" |
| Graceful degradation | "Your payment processor goes down during Black Friday. What does the buyer experience, and what happens to in-flight orders?" |
