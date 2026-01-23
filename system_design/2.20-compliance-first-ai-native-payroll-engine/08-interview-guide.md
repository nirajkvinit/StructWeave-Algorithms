# Interview Guide: Compliance-First AI-Native Payroll Engine

> **Navigation**: [← Observability](./07-observability.md) | [Index](./00-index.md)

---

## Overview

This guide prepares you for system design interviews focused on AI-native payroll platforms. Payroll is unique because it combines **regulatory complexity** (7,040+ US jurisdictions), **zero-error tolerance** (employees depend on accurate pay), and **AI-driven automation** (parsing legal documents into rules).

---

## 45-Minute Interview Pacing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INTERVIEW TIMELINE                                    │
├──────────┬──────────────────────────────────────────────────────────────────┤
│  0-5min  │ CLARIFICATION: Scope, jurisdictions, scale, compliance focus     │
│  5-15min │ HIGH-LEVEL: Architecture, rule engine, calculation pipeline      │
│ 15-30min │ DEEP DIVE: Rule extraction OR calculation OR multi-jurisdiction  │
│ 30-40min │ SCALE: Batch processing, deadline guarantees, disaster recovery  │
│ 40-45min │ TRADE-OFFS: Build vs buy, accuracy vs speed, AI vs rules engine  │
└──────────┴──────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Clarification Questions (0-5 minutes)

### Questions to Ask the Interviewer

| Category | Question | Why It Matters |
|----------|----------|----------------|
| **Scope** | "Are we focusing on US-only or international payroll?" | US has 7,040 tax jurisdictions; international adds currency, labor laws |
| **Tenant Type** | "SMB (100 employees) or Enterprise (50K+ employees)?" | Affects batch processing, calculation parallelism |
| **AI Focus** | "Is AI rule extraction a core feature or enhancement?" | Changes architecture complexity significantly |
| **Compliance** | "Which regulations are highest priority—FLSA, ACA, GDPR, SOX?" | Determines audit depth, data residency requirements |
| **Accuracy** | "What's acceptable error rate for calculations?" | Trick question—answer is always 0% for payroll |

### Scope Confirmation Statement

> "I'll design a multi-tenant SaaS payroll platform that uses AI to extract rules from legal documents, requires human approval before rule activation, automatically applies rules based on employee jurisdiction, and provides explainable gross-to-net calculations. I'll focus on [US payroll / international] with [SMB / enterprise] scale."

---

## Phase 2: High-Level Design (5-15 minutes)

### Architecture Layers to Present

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│         Admin Portal │ Employee Self-Service │ API Gateway                 │
├────────────────────────────────────────────────────────────────────────────┤
│                           RULE MANAGEMENT LAYER                             │
│    Legal Parser │ Rule Extractor │ Human Review │ Rule Versioning          │
├────────────────────────────────────────────────────────────────────────────┤
│                          PAYROLL SERVICE LAYER                              │
│    Rule Engine │ Calculation Engine │ Tax Engine │ Explainability          │
├────────────────────────────────────────────────────────────────────────────┤
│                             AI PLATFORM LAYER                               │
│       Self-hosted vLLM │ NER Models │ Document OCR │ Confidence Scoring    │
├────────────────────────────────────────────────────────────────────────────┤
│                              DATA LAYER                                     │
│    Employee DB │ Rule Store │ Tax Tables │ Audit Logs │ Document Store     │
└────────────────────────────────────────────────────────────────────────────┘
```

### Key Points to Emphasize

1. **Human-in-the-Loop is Non-Negotiable**: AI extracts rules but humans approve before activation
2. **Self-Hosted LLM**: PII never leaves the tenant's data boundary
3. **Rule Versioning**: Append-only with effective dates for audit trail
4. **Explainability**: Every calculation line cites the rule and jurisdiction
5. **Tax Table Partnership**: Build rule engine, partner for tax tables (ADP, Symmetry)

### Data Flow Summary

```
Legal Document → OCR → Section Parser → NER → LLM Extraction →
Confidence Score → Human Review Queue → Approval → Rule Store →
Calculation Engine (gross-to-net) → Explainable Output → Paycheck
```

---

## Phase 3: Deep Dive Options (15-30 minutes)

The interviewer will pick ONE area. Be prepared to go deep on any of these:

### Option A: AI Legal Document Parsing

**Architecture to Draw**:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Document  │───▶│     OCR     │───▶│   Section   │───▶│     NER     │
│   Ingestion │    │   (Textract)│    │   Chunking  │    │  (SpaCy)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
                                                                ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Human     │◀───│  Confidence │◀───│    Rule     │◀───│     LLM     │
│   Review    │    │   Scoring   │    │Classification    │  Extraction │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Key Technical Details**:
- **OCR Quality**: 98%+ accuracy required; use document layout analysis
- **Section Detection**: Legal documents have predictable structure (sections, subsections, definitions)
- **NER Entities**: WAGE_TYPE, TAX_RATE, EFFECTIVE_DATE, JURISDICTION, THRESHOLD
- **LLM Prompt**: Include document context, extracted entities, and structured output schema
- **Confidence Scoring**: Ensemble of LLM confidence + entity coverage + rule completeness
- **Human Review**: Rules below 0.85 confidence always require human review

**Failure Modes**:
| Failure | Impact | Mitigation |
|---------|--------|------------|
| OCR error on tax rate | Wrong calculations | Dual OCR + human verification |
| LLM hallucination | Fake rule created | Require source citation with page number |
| Context window exceeded | Incomplete extraction | Sliding window with overlap |
| Ambiguous language | Multiple interpretations | Flag for legal review |

### Option B: Multi-Jurisdiction Rule Engine

**Architecture to Draw**:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         JURISDICTION HIERARCHY                              │
│                                                                             │
│                           ┌─────────────┐                                   │
│                           │   FEDERAL   │                                   │
│                           └──────┬──────┘                                   │
│                    ┌─────────────┼─────────────┐                            │
│              ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐                      │
│              │    CA     │ │    NY     │ │    TX     │                      │
│              └─────┬─────┘ └─────┬─────┘ └───────────┘                      │
│         ┌─────────┼─────────┐   │                                          │
│   ┌─────┴─────┐ ┌─┴───────┐│┌──┴───────┐                                   │
│   │ SF (city) │ │LA County││ │NYC (city)│                                   │
│   └───────────┘ └─────────┘│ └──────────┘                                   │
│                            │                                                │
│                      ┌─────┴─────┐                                          │
│                      │LA (city)  │                                          │
│                      └───────────┘                                          │
└────────────────────────────────────────────────────────────────────────────┘
```

**Key Technical Details**:
- **Rule Resolution Algorithm**:
  ```
  1. Get employee work location(s) and residence
  2. Query all applicable jurisdictions (may be 5-10)
  3. For each rule type:
     a. Check if jurisdiction has specific rule
     b. Fall back to parent jurisdiction if not
  4. Apply conflict resolution:
     - Wages: Most favorable to employee
     - Tax withholding: All applicable
     - Leave: Most generous
  ```

- **Caching Strategy**:
  ```
  L1: Hot jurisdiction combos (CA-SF, NY-NYC) → 10K entries
  L2: Individual jurisdiction rules → 50K entries
  L3: Database with effective date filtering
  TTL: Invalidate on rule publish, max 1 hour
  ```

- **Reciprocity Handling**: Some states have agreements (e.g., PA-NJ) where only work state taxes apply

**Failure Modes**:
| Failure | Impact | Mitigation |
|---------|--------|------------|
| Missing jurisdiction rule | Incorrect tax/wage | Require base rule, alert on gaps |
| Stale cache | Apply old rate | Event-driven invalidation |
| Conflict resolution wrong | Legal exposure | Log decision, allow override |

### Option C: Calculation Engine with Explainability

**Architecture to Draw**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GROSS-TO-NET CALCULATION PIPELINE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   GROSS PAY         PRE-TAX           FEDERAL TAX       STATE TAX           │
│  ┌─────────┐      ┌─────────┐        ┌─────────┐      ┌─────────┐          │
│  │ Hours × │      │ 401(k)  │        │ Federal │      │  State  │          │
│  │  Rate   │─────▶│  HSA    │───────▶│  Income │─────▶│ Income  │          │
│  │+ Bonus  │      │  FSA    │        │   Tax   │      │   Tax   │          │
│  └─────────┘      └─────────┘        └─────────┘      └─────────┘          │
│                                                              │              │
│   LOCAL TAX         FICA             POST-TAX        NET PAY               │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐           │
│  │  City   │◀─────│Social   │◀─────│  Roth   │◀─────│  Final  │           │
│  │ County  │      │Security │      │ Benefits│      │ Amount  │           │
│  │ School  │      │Medicare │      │Garnish  │      │         │           │
│  └─────────┘      └─────────┘      └─────────┘      └─────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Technical Details**:
- **Decimal Precision**: Use BigDecimal with 4 decimal places, bank rounding
- **YTD Tracking**: Critical for wage base limits (SS: $168,600 for 2024)
- **Calculation Order**: Pre-tax deductions reduce taxable income; order matters
- **Explain Generation**: Each line records rule_id, jurisdiction, formula, inputs

**Sample Explanation Output**:
```json
{
  "line": "Federal Income Tax",
  "amount": 1250.00,
  "formula": "taxable_income × bracket_rate",
  "inputs": {
    "taxable_income": 5000.00,
    "bracket": "22%",
    "ytd_income": 45000.00
  },
  "rule": {
    "id": "FED-IRS-2024-001",
    "source": "IRS Publication 15-T, 2024",
    "effective_date": "2024-01-01"
  }
}
```

**Failure Modes**:
| Failure | Impact | Mitigation |
|---------|--------|------------|
| Rounding accumulation | Penny differences over year | Re-calculate from scratch monthly |
| YTD drift | Wrong wage base | Reconciliation checks |
| Missing wage type | Calculation fails | Require mapping on setup |

---

## Phase 4: Scalability & Reliability (30-40 minutes)

### Batch Processing Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          PAY RUN PHASES                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: PREP          PHASE 2: CALC         PHASE 3: REVIEW              │
│  ┌───────────────┐      ┌───────────────┐     ┌───────────────┐            │
│  │ Snapshot rules│      │ Parallel calc │     │ Flag outliers │            │
│  │ Load roster   │─────▶│ Workers (100) │────▶│ Human approve │            │
│  │ Validate data │      │ Checkpoint    │     │ Fix exceptions│            │
│  └───────────────┘      └───────────────┘     └───────────────┘            │
│                                                        │                    │
│  PHASE 4: FINALIZE      PHASE 5: REPORT                                    │
│  ┌───────────────┐      ┌───────────────┐                                  │
│  │ Generate ACH  │      │ Pay stubs     │                                  │
│  │ Tax deposits  │◀─────│ GL entries    │                                  │
│  │ Lock pay run  │      │ Compliance    │                                  │
│  └───────────────┘      └───────────────┘                                  │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Key Scaling Numbers

| Metric | Target | Approach |
|--------|--------|----------|
| 10K employee batch | <30 min | 100 parallel workers, 6 employees/second |
| 100K employee batch | <4 hours | 500 workers, partitioned by department |
| Rule lookup | <5ms | Redis cache, jurisdiction combo keys |
| AI extraction | 50 docs/day | GPU cluster, priority queue |

### Disaster Recovery for Payroll

**Critical Insight**: Payroll has hard deadlines (payday). Missing a deadline is catastrophic.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    DISASTER RECOVERY TIERS                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TIER 1: Active-Active             TIER 2: Failover                        │
│  ┌─────────────────────────┐       ┌─────────────────────────┐             │
│  │ Primary in US-EAST-1    │       │ If primary fails:       │             │
│  │ Hot standby US-WEST-2   │       │ RPO: 0 (sync replication)│            │
│  │ Sync replication        │       │ RTO: 15 minutes         │             │
│  └─────────────────────────┘       └─────────────────────────┘             │
│                                                                             │
│  TIER 3: Manual Fallback                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Export last successful calculation → Process manually → Reconcile   │   │
│  │ Critical for: Tax deposits (penalties), Direct deposits (trust)     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 5: Trade-offs Discussion (40-45 minutes)

### Key Trade-off Decisions

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Rule Engine** | Commercial BRMS (Drools) | Custom Rule DSL | **Custom DSL** - Payroll-specific semantics, audit requirements |
| **Tax Calculation** | Build in-house | Partner (Symmetry, Vertex) | **Hybrid** - Partner for tables, build engine for control |
| **Legal Parsing LLM** | Cloud API (GPT-4) | Self-hosted (vLLM) | **Self-hosted** - PII never leaves boundary, EU AI Act compliance |
| **Jurisdiction Data** | Build from scratch | Partner (BNA, Paychex) | **Partner + AI** - Partner for base, AI for change detection |
| **Batch vs Real-time** | Batch all calculations | Real-time per employee | **Batch** - Consistency, audit trail, reconciliation |

### Trade-off Deep Dive: Build vs Partner for Tax Tables

**Build Arguments**:
- Full control over update timing
- No vendor lock-in
- Can handle custom client rules

**Partner Arguments**:
- 7,040 jurisdictions updated continuously
- Tax table providers have compliance teams
- Liability shifts to partner for accuracy

**Recommendation**: Partner for tables, build the engine
- Tax tables change daily; maintaining is full-time job
- Partners (Symmetry, ADP) have 40+ years of data
- Build calculation engine for transparency and customization

---

## Trap Questions & Good Answers

### Question 1: "Why not just use Symmetry or ADP's API?"

**Trap**: Thinking this is about tax calculation only

**Good Answer**:
> "Symmetry and ADP are excellent for tax calculations, and I'd partner with them for tax tables. However, they don't solve the AI rule discovery problem. Our differentiation is:
> 1. AI-driven extraction of labor law rules (minimum wage, overtime, leave)
> 2. Human-in-the-loop governance for compliance
> 3. Automatic jurisdiction mapping without manual configuration
> 4. Explainable calculations that cite legal sources
>
> I'd use Symmetry for tax tables and build the rule engine around it."

### Question 2: "AI extracts a wrong rule and it affects 10K employees. What happens?"

**Trap**: Focusing only on rollback mechanism

**Good Answer**:
> "This shouldn't happen due to our human-in-the-loop design:
> 1. **Prevention**: AI-extracted rules require human approval before activation
> 2. **Detection**: New rules run in shadow mode against last pay run; variance report goes to payroll admin
> 3. **Containment**: Rules have effective dates; we never delete, only supersede
> 4. **Recovery**: If it does happen:
>    - Identify affected employees via rule_version linkage
>    - Calculate correction amount per employee
>    - Generate retro-pay in next pay run (not off-cycle to avoid tax complications)
>    - Audit log shows exactly what happened for compliance
> 5. **Root Cause**: Review extraction pipeline; add to test suite"

### Question 3: "Employee works in California but lives in Texas. How does tax work?"

**Trap**: Not knowing reciprocity rules

**Good Answer**:
> "This is a common multi-state scenario:
> 1. **Work State (CA)**: Must withhold CA state income tax
> 2. **Residence State (TX)**: Texas has no state income tax, so no withholding
> 3. **No Reciprocity**: CA doesn't have reciprocity with any state, so CA taxes based on work days
> 4. **Resolution**: Employee files CA non-resident return; may owe CA taxes
> 5. **Our System**:
>    - Detects both jurisdictions from employee profile
>    - Applies CA withholding rules for work-state
>    - Skips TX withholding (no income tax)
>    - Explains to employee why CA tax applies"

### Question 4: "How do you achieve 100% calculation accuracy?"

**Trap**: Saying "we test a lot"

**Good Answer**:
> "100% accuracy requires deterministic engineering:
> 1. **Decimal Arithmetic**: BigDecimal with fixed scale (4 places), bankers rounding
> 2. **Deterministic Rules**: No floating point; all rules are integer-based or fixed-decimal
> 3. **Idempotent Calculations**: Same inputs always produce same outputs
> 4. **Comparison Testing**: Run calculations against certified vendor (Symmetry) for first 6 months
> 5. **YTD Reconciliation**: Monthly reconcile YTD totals; alert on any drift
> 6. **Dual Calculation**: For critical pay runs, calculate twice with different workers; compare
> 7. **Penny Reconciliation**: End of year, ensure sum of all paychecks = W-2 totals"

### Question 5: "New labor law is published. How does your AI handle it?"

**Trap**: Saying AI automatically updates rules

**Good Answer**:
> "AI assists but doesn't autonomously update:
> 1. **Detection**: Regulatory change detection monitors government sources
> 2. **Alert**: System alerts compliance team: 'New CA minimum wage law detected'
> 3. **Extraction**: AI parses document, extracts candidate rules with confidence scores
> 4. **Review Queue**: Rules go to human review with:
>    - Extracted rule in our DSL format
>    - Source citation (document, page, paragraph)
>    - Effective date
>    - Affected employees count
> 5. **Approval**: Compliance officer reviews, edits if needed, approves
> 6. **Shadow Run**: New rule runs in shadow mode before full activation
> 7. **Audit Trail**: Complete chain from document to rule to approver to activation"

### Question 6: "Why store PII on a self-hosted LLM instead of using GPT-4?"

**Trap**: Not mentioning compliance requirements

**Good Answer**:
> "Several compliance-driven reasons:
> 1. **EU AI Act**: High-risk AI systems processing employment data must be auditable; cloud APIs are black boxes
> 2. **GDPR**: SSN, salary data can't leave EU data residency without DPA
> 3. **Data Minimization**: Only send document text, never employee data to extraction
> 4. **Audit**: Must explain exactly how AI reached conclusions; requires model introspection
> 5. **Cost Predictability**: At 1M+ inferences/month, self-hosted is more economical
> 6. **Model Lock-in**: Fine-tuned models for payroll domain perform better than general purpose
>
> Trade-off: Higher ops burden, but necessary for this domain."

---

## Quick Reference Card

### Architecture in 30 Seconds

```
Legal Docs → AI Extraction → Human Approval → Rule Store →
Rule Engine (jurisdiction mapping) → Calculation Engine (gross-to-net) →
Explainable Output → Paycheck
```

### Five Numbers to Remember

| Metric | Number |
|--------|--------|
| US Tax Jurisdictions | 7,040+ |
| Calculation Accuracy Target | 100% |
| Pay Run SLA | 99.99% on time |
| Human Review Threshold | <85% confidence |
| AI Extraction Daily Capacity | 50 documents |

### Key Differentiators

1. **AI Rule Discovery**: Parse PDFs of labor laws into structured rules
2. **Human-in-the-Middle**: Mandatory approval before rule activation
3. **Multi-Jurisdiction Auto-Apply**: Employee location → applicable rules
4. **Explainability**: Every calculation line cites source rule
5. **Self-Hosted AI**: PII never leaves data boundary

### Must-Mention Components

- [ ] Rule DSL for payroll-specific conditions/actions
- [ ] Append-only rule versioning with effective dates
- [ ] Jurisdiction hierarchy (Federal → State → Local)
- [ ] Tax table partnership (Symmetry/ADP)
- [ ] Confidence scoring for AI extractions
- [ ] Shadow mode for new rules
- [ ] YTD tracking for wage base limits
- [ ] Event sourcing for audit trail

### Red Flags to Avoid

| Red Flag | Why It's Bad |
|----------|-------------|
| "AI automatically updates rules" | Compliance violation—humans must approve |
| "We use floating point for money" | Rounding errors accumulate |
| "We build our own tax tables" | 7,040 jurisdictions; not feasible |
| "Same-day rollback if AI is wrong" | Rules should be shadow-tested first |
| "We send salary to OpenAI for extraction" | PII data sovereignty violation |

---

## Interview Variants

### Variant A: Startup Focused (45 minutes)

**Focus Areas**:
- MVP scope: US-only, 10 jurisdictions
- Speed to market vs compliance
- Buy vs build decisions
- Growth path to multi-jurisdiction

**Key Points**:
- Start with commercial tax engine (Symmetry API)
- Build AI extraction as differentiator
- Human review is non-negotiable even at MVP

### Variant B: Enterprise Migration (60 minutes)

**Focus Areas**:
- Migrating from legacy (ADP, Paychex)
- Parallel run strategy
- Data migration (employee history, YTD)
- Cutover timing (never mid-year)

**Key Points**:
- 6-month parallel run comparing outputs
- Migrate after year-end processing
- Keep legacy system read-only for 7 years (audit)

### Variant C: Global Expansion (60 minutes)

**Focus Areas**:
- Multi-currency calculations
- International labor laws (GDPR, country-specific)
- Entity-based payroll vs PEO
- Statutory contributions (pension, social security)

**Key Points**:
- Partner with in-country experts (Deel model)
- Each country is separate rule namespace
- Currency conversion at time of calculation, not payment

---

## Sample Whiteboard Progression

### Minute 5: Scope Box

```
┌─────────────────────────────────────────┐
│ SCOPE:                                  │
│ - Multi-tenant SaaS                     │
│ - US payroll (7,040 jurisdictions)      │
│ - AI rule extraction from legal docs    │
│ - Human approval required               │
│ - 10K employees per enterprise tenant   │
└─────────────────────────────────────────┘
```

### Minute 15: Architecture Skeleton

```
┌─────────────────────────────────────────────────────────────────┐
│  [Clients] → [API Gateway] → [Rule Mgmt] → [Calculation]       │
│                                   ↓              ↓              │
│                              [AI Platform]  [Tax Engine]        │
│                                   ↓              ↓              │
│                              [Rule Store]  [Audit Logs]         │
└─────────────────────────────────────────────────────────────────┘
```

### Minute 30: Deep Dive Detail (Rule Extraction)

```
┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
│  Doc PDF  │──▶│    OCR    │──▶│    NER    │──▶│    LLM    │
└───────────┘   └───────────┘   └───────────┘   └───────────┘
                                                       │
                     ┌───────────┐   ┌───────────┐    ▼
                     │  Approve  │◀──│  Review   │◀──[Queue]
                     └───────────┘   │ (Human)   │
                           │         └───────────┘
                           ▼
                     [Rule Store]
```

### Minute 40: Scale Numbers

```
┌─────────────────────────────────────────────────────────────────┐
│ SCALE TARGETS:                                                  │
│ - 10K employee batch: <30 min (100 workers, 6 emp/sec)         │
│ - Rule lookup: <5ms (Redis cache)                               │
│ - AI extraction: 50 docs/day (GPU cluster)                      │
│ - Pay run SLA: 99.99% on time                                   │
│ - RPO: 0 (sync replication)                                     │
│ - RTO: 15 minutes                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Post-Interview Reflection Checklist

After your interview, review whether you covered:

- [ ] **Clarified scope** before diving into design
- [ ] **Mentioned human-in-the-loop** as compliance requirement
- [ ] **Explained jurisdiction hierarchy** (Federal → State → Local)
- [ ] **Discussed accuracy engineering** (decimal math, deterministic rules)
- [ ] **Addressed AI data sovereignty** (self-hosted LLM)
- [ ] **Covered batch processing** for pay runs
- [ ] **Mentioned tax table partnership** vs building
- [ ] **Explained explainability** requirements
- [ ] **Discussed disaster recovery** for payroll deadlines
- [ ] **Made clear trade-off decisions** with reasoning

---

## Further Reading

| Topic | Resource |
|-------|----------|
| US Payroll Tax | IRS Publication 15 (Circular E) |
| Multi-State Taxation | UDITPA, State-specific reciprocity agreements |
| EU AI Act | Article 6, Annex III (High-risk AI systems) |
| Payroll Compliance | DOL FLSA Fact Sheets |
| Tax Engine APIs | Symmetry Tax Engine Documentation |

---

> **Navigation**: [← Observability](./07-observability.md) | [Index](./00-index.md)
