# 14.11 AI-Native Digital Storefront Builder for SMEs — Interview Guide

## 45-Minute Interview Pacing

| Time | Phase | Focus | Interviewer Goals |
|---|---|---|---|
| 0:00–3:00 | **Problem Exploration** | Clarify scope: what kind of storefronts, what channels, what merchant persona | Does the candidate ask about user segments, scale, and constraints before designing? |
| 3:00–10:00 | **Requirements & Estimations** | Functional requirements, capacity estimation, SLO definition | Can the candidate derive realistic numbers and distinguish critical from nice-to-have requirements? |
| 10:00–22:00 | **High-Level Design** | Architecture, key components, data flow for store creation and multi-channel sync | Does the candidate naturally decompose into services? Do they address the headless commerce pattern? |
| 22:00–35:00 | **Deep Dive** | Pick 1-2 areas: multi-channel sync, AI content pipeline, dynamic pricing, or payment orchestration | Can the candidate go deep on concurrency, consistency trade-offs, and failure modes? |
| 35:00–42:00 | **Scalability & Reliability** | Multi-tenant scaling, CDN strategy, fault tolerance for critical paths | Does the candidate address noisy neighbor, graceful degradation, and disaster recovery? |
| 42:00–45:00 | **Wrap-up** | Summary of trade-offs, areas they'd revisit with more time | Can the candidate articulate what they optimized for and what they consciously deferred? |

---

## Probing Questions by Phase

### Phase 1: Problem Exploration

**Opening prompt:** "Design an AI-powered platform that lets small businesses create online stores and sell across multiple channels."

**Good clarifying questions from the candidate:**

| Question | What It Reveals |
|---|---|
| "What's the merchant persona — technically savvy or completely non-technical?" | Understanding of zero-code UX constraints |
| "Which sales channels must be supported?" | Scope awareness; multi-channel complexity |
| "What's the expected scale — hundreds of stores or millions?" | Capacity thinking early in the process |
| "Is this primarily India-focused or global?" | Payment and localization implications |
| "Do merchants have existing product data or are they starting from scratch?" | AI content generation scope |

**Red flag:** Candidate immediately starts drawing boxes without asking any questions.

### Phase 2: Requirements & Estimations

**Probing questions:**

1. "How would you estimate the storage requirements for product images across 3 million stores?"
   - **Strong answer:** Works through: products per store × images per product × variants per image × average size. Considers CDN replication factor. Distinguishes hot vs. cold storage.
   - **Weak answer:** "We'd need a lot of storage." No calculation.

2. "What SLOs would you set for storefront page load time, and why those specific numbers?"
   - **Strong answer:** References Core Web Vitals (LCP < 2.5s), cites impact on conversion rate and SEO ranking. Distinguishes TTFB (CDN concern) from LCP (rendering concern).
   - **Weak answer:** "It should be fast, maybe under 5 seconds."

3. "How many concurrent store creations should the system handle during peak?"
   - **Strong answer:** Derives from daily creation rate, assumes 60% concentrated in 3 hours, accounts for burst factor. Notes GPU capacity as the bottleneck.
   - **Weak answer:** "We can auto-scale."

### Phase 3: High-Level Design

**Probing questions:**

1. "How do you keep product data consistent across the merchant's website, WhatsApp catalog, and Instagram shop?"
   - **Strong answer:** Event-sourced architecture with per-channel adapters. Explains per-product event ordering. Addresses channel API rate limits and schema differences.
   - **Weak answer:** "We'd sync via a cron job that pushes updates every hour."

2. "How does the AI generate product descriptions from images?"
   - **Strong answer:** Multi-stage pipeline: image analysis → attribute extraction → LLM generation → quality evaluation → multilingual generation. Discusses quality thresholds and human-in-the-loop for initial products.
   - **Weak answer:** "We send the image to GPT and get a description back."

3. "What happens when a customer buys the last item on the website, but the same item is still shown as available on Instagram?"
   - **Strong answer:** Explains inventory reservation system, event-driven sync with latency bounds, safety buffer per channel, and the trade-off between overselling risk and listing availability.
   - **Weak answer:** "We'd update all channels immediately." (Ignores API latency and rate limits.)

### Phase 4: Deep Dive

**Option A: Multi-Channel Sync Deep Dive**

1. "Each channel has different constraints — WhatsApp limits descriptions to 5000 chars, Instagram requires square images. How do you handle this?"
   - **Strong answer:** Channel projection engine that transforms the canonical product model into channel-compliant representations. Lossy transformation (truncation, cropping) with quality preservation. Constraint validation before push.
   - **Weak answer:** "We'd store a separate version of the product for each channel." (Data duplication nightmare.)

2. "What happens when the merchant directly edits a product on Instagram instead of through your platform?"
   - **Strong answer:** Drift detection via periodic reconciliation scans. Configurable conflict resolution policies (platform-wins, channel-wins, merchant-decides). Explains the trade-off between data sovereignty and consistency.

**Option B: Dynamic Pricing Deep Dive**

1. "How do you prevent the pricing engine from recommending prices that destroy the merchant's margin?"
   - **Strong answer:** Margin floor enforcement with merchant-configurable minimum margin. Price recommendation is a suggestion, not auto-applied. Explains the tension between competitive pricing and profitability.

2. "How do you handle the cold-start problem for new products with no demand data?"
   - **Strong answer:** Category-level priors from similar products. Competitor price anchoring. Conservative pricing strategy for new products (match competitor median, not undercut).

**Option C: Payment Orchestration Deep Dive**

1. "How do you reconcile payments across three different gateways?"
   - **Strong answer:** Three-way reconciliation: platform records vs. gateway settlement reports vs. bank credits. Daily automated reconciliation with mismatch categories and escalation procedures.

2. "What happens when a payment gateway goes down mid-transaction?"
   - **Strong answer:** Distinguishes between pre-authorization failure (retry on backup) and post-authorization failure (check gateway status before retrying to prevent double-charge). Circuit breaker pattern.

### Phase 5: Scalability & Reliability

1. "One merchant's store goes viral — 100× normal traffic. How do you prevent this from affecting other merchants?"
   - **Strong answer:** CDN absorbs read traffic (no origin impact for page views). Database-level: connection pooling with per-tenant limits. Automatic shard migration for sustained high traffic. Explains noisy neighbor mitigation without over-engineering.

2. "Your content generation GPU cluster goes down. What happens to new store creation?"
   - **Strong answer:** Graceful degradation: store creation proceeds with template-based descriptions. Products queued for AI generation when GPUs recover. Merchant informed that content will be enhanced. Distinguishes between latency-critical sync path and throughput-critical async path.

---

## Trap Questions

### Trap 1: "Should we use a separate database for each merchant?"

**The trap:** This sounds like good isolation but is operationally disastrous at scale (millions of databases).

**Correct reasoning:** Database-per-tenant provides excellent isolation but creates an operational nightmare: millions of schema migrations, millions of connection pools, backup complexity, monitoring complexity. The correct approach is shared database with row-level tenant isolation, with automatic shard migration for the top 0.1% of merchants by traffic.

**Follow-up:** "What about a merchant who demands data isolation for compliance reasons?"
- **Strong answer:** Offer a premium tier with dedicated database shard; the application layer is unchanged (same tenant_id filtering), only the physical database differs.

### Trap 2: "Should we store all channel-specific product data in the canonical product record?"

**The trap:** Temptation to denormalize everything into one big product document with channel-specific fields.

**Correct reasoning:** The canonical product record stores the merchant's intent (product attributes, pricing, images). Channel-specific representations are derived projections, not primary data. Storing WhatsApp-specific descriptions alongside Instagram-specific descriptions in the canonical record creates a bloated, tangled data model that breaks the single-responsibility principle.

**Correct approach:** Canonical product + channel projection engine + channel listing records that cache the projected state.

### Trap 3: "Should we auto-apply dynamic pricing recommendations?"

**The trap:** Full automation sounds efficient but removes merchant agency and creates trust issues.

**Correct reasoning:** SME merchants are deeply attached to their pricing decisions. Auto-changing prices without explicit approval leads to: (1) merchant distrust of the platform, (2) potential margin erosion the merchant doesn't understand, (3) regulatory risk if prices change in ways that violate consumer protection rules. The correct approach is AI-recommended prices with one-tap merchant approval. A future opt-in "auto-pricing" mode with strict guardrails (min margin, max change per day) is a premium feature.

### Trap 4: "Can we do real-time sync across all channels?"

**The trap:** "Real-time" suggests pushing every change to every channel immediately.

**Correct reasoning:** Channels have API rate limits, batch preferences, and different latency tolerances. True real-time sync to all channels simultaneously is impossible and unnecessary. Inventory updates need near-real-time sync (overselling risk). Catalog updates (description changes) can tolerate minutes of delay. Image updates may require processing time (resizing, format conversion) before sync. The correct approach is priority-based async sync with SLO-based guarantees.

### Trap 5: "Should we build our own CDN for storefront delivery?"

**The trap:** Custom CDN sounds like it offers more control.

**Correct reasoning:** CDN is a commodity infrastructure where providers have invested billions in global edge networks. Building a custom CDN for 3 million storefronts would be cost-prohibitive and under-performing vs. established CDN providers with 200+ PoPs globally. The correct approach is leveraging CDN-as-a-service with custom cache invalidation logic and origin shield configuration.

---

## Common Mistakes

| Mistake | Why It's Wrong | Better Approach |
|---|---|---|
| Designing a monolithic e-commerce platform | Ignores the multi-channel projection complexity and AI integration requirements | Headless commerce with channel projection engine |
| Treating all channels the same | Each channel has fundamentally different schemas, constraints, and APIs | Channel adapter pattern with per-channel schema transformation |
| Ignoring the AI quality problem | AI-generated content has variable quality; blindly publishing creates merchant distrust | Quality scoring with thresholds; human-in-the-loop for initial products |
| Over-indexing on consistency at the expense of availability | Channel sync doesn't need strong consistency; inventory sync does | Tiered consistency: strong for inventory, eventual for catalog |
| Ignoring payment reconciliation | Treating payment as a single API call | Multi-gateway routing with three-way reconciliation |
| Forgetting about mobile-first | Designing for desktop when 85%+ of Indian e-commerce traffic is mobile | Mobile-first responsive design with adaptive image sizing |
| Not addressing the cold-start problem | How do you recommend prices or themes for a brand-new merchant? | Category-level priors, competitor anchoring, progressive personalization |

---

## Trade-Off Discussions

### Trade-off 1: Store Creation Speed vs. Content Quality

- **Optimize for speed:** Use pre-generated templates with product-specific variable substitution; store live in 30 seconds
- **Optimize for quality:** Full AI pipeline with multi-stage evaluation; store live in 5 minutes
- **Balanced approach (recommended):** Generate "good enough" descriptions synchronously for immediate store launch; upgrade to high-quality descriptions asynchronously within 1 hour; merchant notified of content improvements

### Trade-off 2: Multi-Channel Consistency vs. Channel-Specific Optimization

- **Maximize consistency:** Same description, same images, same price across all channels
- **Maximize per-channel optimization:** Different descriptions (SEO-optimized for web, mobile-optimized for WhatsApp), different images (aspect ratio optimized per channel), potentially different prices (marketplace commission offset)
- **Balanced approach:** Consistent pricing and inventory across channels (trust and compliance); channel-optimized content (descriptions, images) derived from the canonical product record via projection

### Trade-off 3: Merchant Autonomy vs. AI Automation

- **Full automation:** AI makes all decisions; merchant just uploads products and collects money
- **Full control:** AI provides tools but merchant makes every decision manually
- **Balanced approach:** AI makes sensible defaults with easy overrides. First 5 products require manual review. After trust is established, auto-publish with confidence thresholds. Pricing is always suggestions, never auto-applied (unless merchant opts in to auto-pricing).

---

## Scoring Rubric

| Dimension | Exceptional (4) | Strong (3) | Adequate (2) | Needs Improvement (1) |
|---|---|---|---|---|
| **Problem Decomposition** | Identifies headless pattern, channel projection, and AI pipeline as distinct problems with different consistency requirements | Separates core commerce from AI and sync concerns | Basic service decomposition | Monolithic design or vague "microservices" |
| **Multi-Channel Complexity** | Addresses schema translation, API rate limits, drift detection, and conflict resolution with concrete strategies | Recognizes channel differences; proposes adapter pattern | Mentions multi-channel but treats channels uniformly | Ignores channel-specific constraints |
| **AI Integration** | Discusses quality scoring, cold-start, progressive improvement, and graceful degradation when AI is down | Proposes AI pipeline with quality checks | Mentions AI for content generation | "We use AI" without architectural detail |
| **Consistency Model** | Tiered consistency: strong for inventory, eventual for catalog, with clear rationale and failure analysis | Discusses CAP trade-offs; chooses eventual consistency with justification | Mentions consistency but doesn't differentiate by data type | Either ignores consistency or demands strong consistency everywhere |
| **Scalability** | Multi-tenant with noisy-neighbor mitigation, CDN strategy, and GPU scaling. Addresses 3M+ stores | Proposes auto-scaling with reasonable capacity estimates | Mentions scaling vaguely | No scaling discussion |
| **Payment & Reliability** | Multi-gateway routing, reconciliation, COD verification, and graceful degradation for gateway failures | Proposes multiple gateways with failover | Single payment gateway integration | Payment treated as trivial |
