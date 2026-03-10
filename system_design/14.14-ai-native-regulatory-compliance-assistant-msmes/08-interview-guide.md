# 14.14 AI-Native Regulatory & Compliance Assistant for MSMEs — Interview Guide

## 45-Minute Interview Pacing

| Phase | Time | Focus | What to Evaluate |
|---|---|---|---|
| **Phase 1: Problem Exploration** | 0-8 min | Understand the compliance domain; identify key challenges for MSMEs | Can the candidate identify the core tension: regulatory complexity vs. MSME resource constraints? Do they ask about multi-jurisdiction, deadline computation, and notification reliability? |
| **Phase 2: High-Level Design** | 8-20 min | Architecture: regulatory ingestion pipeline, obligation mapping, notification system, document vault | Does the design separate the regulatory knowledge graph from per-business obligation computation? Is the notification system designed for reliability, not just speed? |
| **Phase 3: Deep Dive** | 20-35 min | Choose one: regulatory text parsing, deadline computation engine, or notification reliability | Can the candidate reason about NLP for legal text, temporal computation with exceptions, or guaranteed delivery with multi-channel fallback? |
| **Phase 4: Scalability & Trade-offs** | 35-42 min | Scaling to millions of businesses; handling regulatory change cascades; cost optimization | Does the candidate identify archetype-based caching for obligation mapping? Can they reason about notification thundering herd? |
| **Phase 5: Wrap-up** | 42-45 min | Extensions, blind spots, what they'd do differently | Self-awareness about design trade-offs; ability to identify gaps |

---

## Opening Problem Statement

> "Design an AI-powered regulatory compliance assistant for small and medium businesses in India. The system should automatically determine which regulations apply to a business, track deadlines, send reminders, and help prepare for audits. A typical MSME might have 50-200 compliance obligations per year across tax, labor, environmental, and licensing regulations."

### Clarifying Questions the Candidate Should Ask

| Question | Why It Matters | Good vs. Weak Answer |
|---|---|---|
| "How many jurisdictions does a business typically operate in?" | Multi-jurisdiction is the core complexity driver | **Good:** "Because each state has different labor laws and professional tax, a 3-state business has 3× the compliance surface" / **Weak:** "I'll assume single jurisdiction for simplicity" |
| "What's the penalty structure for missed compliance?" | Drives notification reliability requirements | **Good:** "This determines our notification SLO—if penalties are ₹50/day, we need near-zero missed reminders" / **Weak:** Doesn't ask about consequences |
| "How do regulations change over time?" | Regulatory change tracking is a core feature | **Good:** "We need a pipeline that detects amendments and updates the obligation map automatically" / **Weak:** "We'll have an admin manually update regulations" |
| "Do businesses have dedicated compliance staff?" | MSMEs typically don't—drives UX decisions | **Good:** "If the owner is the compliance manager, we need proactive push notifications, not a dashboard they need to check" / **Weak:** Assumes a compliance department exists |
| "What document types need to be managed?" | Drives document vault design | **Good:** "PDFs, scanned receipts, digital acknowledgments—we need OCR and auto-classification" / **Weak:** "We'll have a file upload feature" |

---

## Phase 2: High-Level Design Evaluation

### Expected Architecture Components

| Component | Must Have | Nice to Have | Red Flag If Missing |
|---|---|---|---|
| **Regulatory Knowledge Graph** | Graph or hierarchical store for regulations, sections, obligations | Versioned graph with temporal queries | Storing regulations as flat rules or config files |
| **Obligation Mapping Engine** | Maps business parameters to applicable obligations | Archetype-based caching, event-driven recomputation | Manual obligation assignment or static checklist |
| **Deadline Computation Engine** | Computes deadlines from rules + business parameters | Holiday adjustment, government extensions, dependency chains | Fixed calendar dates without parameterization |
| **Notification Service** | Multi-channel reminders with staged delivery | Guaranteed delivery protocol, fallback channels, escalation | Single-channel or best-effort delivery |
| **Document Vault** | Secure storage with classification | Content-addressed storage, tamper evidence, full-text search | Generic file storage without compliance-specific features |
| **Regulatory Ingestion Pipeline** | Ingest from government sources, extract obligations | NLP for obligation extraction, impact analysis | Manual regulatory updates only |

### Design Trade-offs to Discuss

| Trade-off | Option A | Option B | Best Answer |
|---|---|---|---|
| **Knowledge representation** | Rule engine (IF-THEN rules per regulation) | Knowledge graph (semantic relationships between regulations) | Graph for complex relationships; acknowledge rule engine is simpler for straightforward obligations |
| **Obligation computation** | Batch nightly for all businesses | Event-driven on parameter/regulation change | Event-driven with explanation of the eventual consistency trade-off |
| **Notification reliability** | Fire-and-forget with retry | Guaranteed delivery with multi-channel fallback and reconciliation | Guaranteed delivery with clear reasoning about penalty cost exceeding infrastructure cost |
| **Document integrity** | Path-based storage with access logging | Content-addressed storage with cryptographic hashing | Content-addressed with explanation of why compliance documents need tamper evidence |

---

## Phase 3: Deep Dive Options

### Option A: Regulatory Text Parsing (NLP Focus)

**Prompt:** "Let's dive into how the system ingests a new government notification and extracts actionable obligations."

**Strong Signals:**
- Identifies the challenge of legal language ambiguity (nested conditionals, cross-references to other sections)
- Proposes multi-stage pipeline: parse → classify → extract entities → resolve references → create obligations
- Discusses confidence scoring and human-in-the-loop for low-confidence extractions
- Handles multi-language regulatory sources (state governments publish in regional languages)
- Mentions the challenge of scanned PDFs requiring OCR with legal font recognition

**Weak Signals:**
- "Just use an LLM to read the PDF and extract the obligations" (ignores structured extraction needs)
- No mention of reference resolution (regulations constantly reference other regulations)
- No confidence thresholds or human review mechanism

### Option B: Deadline Computation Engine (Temporal Reasoning Focus)

**Prompt:** "Walk me through how the system computes the exact due date for a GST filing for a specific business."

**Strong Signals:**
- Identifies that deadlines depend on multiple parameters (turnover bracket, filing frequency, jurisdiction)
- Handles conditional deadlines (monthly vs. quarterly filer based on turnover threshold)
- Discusses holiday calendar management with jurisdiction-specific holidays
- Addresses government deadline extensions as a runtime override
- Identifies dependency chains (annual return depends on monthly returns)
- Mentions the recomputation trigger when a business crosses a threshold mid-year

**Weak Signals:**
- Hardcoded dates without parameterization
- No awareness of holiday adjustments
- No concept of deadline dependencies

### Option C: Notification Reliability (Distributed Systems Focus)

**Prompt:** "How do you ensure that a business never misses a critical deadline reminder? The penalty is ₹50/day."

**Strong Signals:**
- Quantifies the reliability requirement (99.99% delivery = ≤ 1 missed per 10,000)
- Designs multi-channel delivery with fallback (WhatsApp → SMS → email → escalation)
- Implements reconciliation to detect missing notifications (absence monitoring)
- Addresses the thundering herd problem when millions of reminders are due on the same day
- Discusses the trade-off between notification fatigue (too many reminders) and coverage (zero missed deadlines)
- Considers idempotency for retry scenarios (duplicate notification is better than zero)

**Weak Signals:**
- "We'll just retry if it fails" (doesn't address the case where the notification was never generated)
- Single channel without fallback
- No reconciliation or absence detection

---

## Trap Questions

### Trap 1: "Can we just use a cron job to check all deadlines daily?"

**What it tests:** Understanding of event-driven vs. batch processing trade-offs.

**Trap:** The candidate says "yes, daily batch is fine" without considering that (a) a deadline extension published at 3 PM must be reflected before the 5 PM reminder, and (b) a business crossing a threshold at 2 PM creates a new obligation that the daily batch won't catch until tomorrow.

**Good answer:** "A daily batch is a good baseline for forward-looking calendar computation, but we also need event-driven recomputation for three scenarios: regulatory changes (deadline extensions), business parameter changes (threshold crossings), and government portal status changes. The batch handles 95% of cases; the event-driven path handles the time-sensitive 5%."

### Trap 2: "Why not store all regulations in a relational database with a `regulations` table?"

**What it tests:** Understanding of when graph databases provide genuine advantages over relational.

**Trap:** The candidate either (a) agrees without thinking about the graph nature of regulations, or (b) insists on a graph database without acknowledging that many queries are perfectly served by relational.

**Good answer:** "A relational table works for simple lookups ('show me all GST regulations'), but the core query pattern is multi-hop traversal: 'find all obligations applicable to this business' requires traversing act → sections → amendments → obligations while filtering by jurisdiction and applicability criteria. This is a natural graph query. However, transactional data (business profiles, notification records, filing history) is better served by relational databases. I'd use both: graph for the regulatory knowledge model, relational for everything else."

### Trap 3: "The system has 3 million businesses. How do you compute obligations for each one without spending 30 minutes on graph traversal?"

**What it tests:** Scalability thinking—can the candidate avoid the O(B × V) trap?

**Trap:** The candidate proposes traversing the entire graph for each business independently.

**Good answer:** "Most businesses share the same obligation set—a textile manufacturer with 20 employees in Maharashtra has the same obligations as every other textile manufacturer with 20 employees in Maharashtra. I'd create 'compliance archetypes' (unique combinations of industry, size, jurisdiction, activities) and cache the obligation set per archetype. When a business registers, we find their archetype and clone the obligation set in O(1). The graph traversal only runs once per archetype, not once per business. With ~200 archetypes covering 80% of businesses, we reduce 3M graph traversals to 200."

### Trap 4: "What happens when the GSTN portal changes its response format?"

**What it tests:** Resilience thinking for external dependencies.

**Good answer:** "Government APIs are notoriously unstable. We should: (1) wrap all government API integrations in an adapter layer that normalizes responses, (2) validate response schemas before processing, (3) maintain the last-known-good response format as fallback, (4) alert on schema mismatches rather than blindly parsing, and (5) have a manual override path where users can upload filing receipts if automated submission fails. The system should never be fully dependent on government API availability."

### Trap 5: "How do you handle a regulation that applies to businesses 'with turnover exceeding ₹5 crore in the preceding financial year' when the current FY hasn't ended yet?"

**What it tests:** Temporal reasoning about when obligations become applicable.

**Good answer:** "This is a forward-looking applicability problem. The system should: (1) monitor running turnover during the current FY, (2) when turnover crosses ₹5 crore mid-year, flag it as a 'projected threshold crossing' with confidence level, (3) send a proactive warning ('Your YTD turnover has crossed ₹5 crore—this regulation may apply to you starting next FY'), (4) when the FY ends and turnover is confirmed, convert the projection to an actual obligation, (5) handle the edge case where turnover crosses the threshold temporarily but falls back below by year-end. The key insight is that the 'preceding financial year' reference creates a lag—the obligation in FY 2026-27 is determined by FY 2025-26 turnover, so we need to watch both the current year (for warnings) and use the finalized previous year (for actual obligation activation)."

---

## Scoring Rubric

### Junior Engineer (L3-L4): Expectations

| Area | Minimum | Good | Exceptional |
|---|---|---|---|
| **Problem Understanding** | Identifies deadline tracking as the core problem | Recognizes multi-jurisdiction complexity | Articulates the difference between reactive compliance and proactive obligation inference |
| **Architecture** | Monolith or basic microservices with a database | Separates regulatory content from business obligations | Knowledge graph + obligation mapping + notification as distinct services |
| **Deep Dive** | Basic deadline computation with fixed rules | Parameterized deadlines with holiday awareness | Full temporal reasoning with dependencies and extensions |

### Senior Engineer (L5-L6): Expectations

| Area | Minimum | Good | Exceptional |
|---|---|---|---|
| **System Design** | Clean service separation with clear data flows | Event-driven obligation recomputation; archetype-based scaling | Versioned knowledge graph; absence detection for notifications; dependency DAG for deadlines |
| **Scalability** | Database partitioning; message queue for notifications | Archetype caching; tiered storage for documents | Pre-computed obligation sets with incremental updates; notification reconciliation engine |
| **Trade-offs** | Identifies 2-3 trade-offs | Discusses graph vs. relational, batch vs. event-driven, delivery guarantee levels | Quantifies trade-offs (cost of missed notification vs. infrastructure cost for guaranteed delivery) |

### Staff Engineer (L7+): Expectations

| Area | Minimum | Good | Exceptional |
|---|---|---|---|
| **System Thinking** | End-to-end design covering all major components | Identifies the meta-compliance problem (the compliance tool must be compliant) | Reasons about the regulatory knowledge graph as a living ontology with versioning, conflict resolution, and explainability requirements |
| **Operational Maturity** | Monitoring and alerting | Absence detection (monitoring for what didn't happen); SLO-based error budgets | Regulatory ingestion completeness monitoring via cross-reference; audit trail as a first-class system requirement |
| **Domain Depth** | Understands basic GST/PF compliance flow | Handles jurisdiction conflict resolution; threshold-triggered obligation activation | Reasons about temporal ambiguity in legal text; designs forward-looking obligation projection from running business metrics |
