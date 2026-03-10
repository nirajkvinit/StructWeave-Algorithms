# 14.14 AI-Native Regulatory & Compliance Assistant for MSMEs — Low-Level Design

## Data Models

### Business Profile

```
BusinessProfile {
    business_id          UUID            PK
    gstin                String          UNIQUE, nullable (not all MSMEs have GST)
    pan                  String          UNIQUE
    business_name        String
    business_type        Enum            [proprietorship, partnership, llp, pvt_ltd, opc]
    industry_codes       String[]        NIC codes for industry classification
    incorporation_date   Date

    // Compliance-critical parameters
    employee_count       Integer         triggers ESI/PF thresholds
    annual_turnover      Decimal         triggers GST filing frequency, audit thresholds
    states_of_operation  String[]        jurisdiction set
    municipal_areas      String[]        municipal jurisdiction set
    activities           String[]        [manufacturing, trading, services, food, hazardous]

    // Derived compliance parameters
    size_classification  Enum            [micro, small, medium] — computed from investment + turnover
    gst_filing_frequency Enum            [monthly, quarterly, annual] — derived from turnover
    pf_applicable        Boolean         derived from employee_count >= 20 (or voluntary)
    esi_applicable       Boolean         derived from employee_count >= 10

    created_at           Timestamp
    updated_at           Timestamp
    parameter_version    Integer         incremented on every parameter change
}
```

### Regulatory Knowledge Graph Nodes

```
RegulationNode {
    node_id              UUID            PK
    node_type            Enum            [act, section, rule, notification, circular, obligation]

    // Identity
    title                String          "CGST Act 2017, Section 39(1)"
    short_title          String          "GSTR-3B Monthly Filing"
    jurisdiction         String          "central" | state code | municipal code
    jurisdiction_level   Enum            [central, state, municipal]

    // Content
    full_text            Text            original legal text
    plain_summary        Text            AI-generated plain-language summary
    effective_date       Date
    sunset_date          Date            nullable — for provisions with expiry

    // Applicability
    applicability_rules  JSON            structured criteria for who this applies to
    /*  Example:
        {
            "conditions": [
                {"field": "gst_filing_frequency", "op": "eq", "value": "monthly"},
                {"field": "states_of_operation", "op": "contains", "value": "any"}
            ],
            "logic": "AND"
        }
    */

    // Obligation details (for obligation nodes)
    obligation_type      Enum            [filing, payment, registration, renewal, report, inspection]
    frequency            Enum            [one_time, monthly, quarterly, half_yearly, annual, event_triggered]
    deadline_rule        JSON            temporal computation rule (see Deadline Computation)
    penalty_rule         JSON            penalty calculation for non-compliance
    preparation_days     Integer         estimated days needed to prepare

    // Metadata
    source_url           String
    last_verified        Timestamp
    version              Integer
}
```

### Regulatory Graph Edges

```
RegulationEdge {
    edge_id              UUID            PK
    source_node_id       UUID            FK → RegulationNode
    target_node_id       UUID            FK → RegulationNode
    edge_type            Enum            [contains, amends, derives_from, depends_on,
                                          supersedes, references, conflicts_with,
                                          triggers_threshold]
    metadata             JSON            additional edge context
    effective_date       Date
    created_at           Timestamp
}
```

### Compliance Obligation Instance

```
ObligationInstance {
    instance_id          UUID            PK
    business_id          UUID            FK → BusinessProfile
    regulation_node_id   UUID            FK → RegulationNode

    // Computed deadline
    due_date             Date
    extended_due_date    Date            nullable — government extension
    period_start         Date            for periodic filings (e.g., month start)
    period_end           Date            for periodic filings (e.g., month end)

    // Status tracking
    status               Enum            [upcoming, due_soon, overdue, completed,
                                          not_applicable, waived]
    completed_at         Timestamp       nullable
    completion_evidence  UUID            FK → Document (filing receipt)

    // Notification state
    reminder_stage       Integer         current reminder stage (0=not started, 1=90d, etc.)
    last_reminder_sent   Timestamp
    assignee_user_id     UUID            FK → User (who is responsible)
    acknowledged         Boolean

    // Penalty tracking
    penalty_accrued      Decimal         computed daily for overdue items

    created_at           Timestamp
    updated_at           Timestamp
}
```

### Compliance Document

```
ComplianceDocument {
    document_id          UUID            PK
    business_id          UUID            FK → BusinessProfile

    // Content-addressed storage
    content_hash         String          SHA-256 of document content
    storage_path         String          object storage path
    file_size            Integer         bytes
    mime_type            String

    // AI-classified metadata
    regulation_node_id   UUID            FK → RegulationNode (nullable until classified)
    document_type        Enum            [filing_receipt, acknowledgment, challan,
                                          certificate, license, inspection_report,
                                          return_form, assessment_order, notice, other]
    assessment_period    String          "2025-26" or "2025-Q3" or "2025-10"
    confidence_score     Float           classification confidence (0-1)

    // Extracted fields
    extracted_fields     JSON            {challan_no, filing_date, amount, ack_number, ...}
    ocr_text             Text            full OCR text for search indexing

    // Metadata
    uploaded_by          UUID            FK → User
    upload_source        Enum            [app, email, whatsapp, api]
    uploaded_at          Timestamp
    verified_by          UUID            nullable — human verification
    verified_at          Timestamp       nullable
}
```

### Notification Record

```
NotificationRecord {
    notification_id      UUID            PK
    business_id          UUID            FK → BusinessProfile
    user_id              UUID            FK → User
    obligation_id        UUID            FK → ObligationInstance (nullable for regulatory updates)

    notification_type    Enum            [deadline_reminder, regulatory_change, threshold_alert,
                                          gap_alert, overdue_escalation, audit_readiness]
    severity             Enum            [critical, high, medium, low]
    channel              Enum            [whatsapp, sms, email, push]

    // Content
    title                String
    body                 Text
    action_url           String          deep link to relevant screen

    // Delivery tracking
    scheduled_at         Timestamp
    sent_at              Timestamp       nullable
    delivered_at         Timestamp       nullable
    read_at              Timestamp       nullable
    acknowledged_at      Timestamp       nullable
    delivery_status      Enum            [pending, sent, delivered, read, failed, expired]
    failure_reason       String          nullable
    retry_count          Integer         default 0

    created_at           Timestamp
}
```

---

## API Contracts

### Business Profile API

```
POST /api/v1/businesses
Request:
{
    "gstin": "27AABCU9603R1ZM",
    "pan": "AABCU9603R",
    "business_name": "Sharma Textiles",
    "business_type": "pvt_ltd",
    "industry_codes": ["13111"],
    "employee_count": 45,
    "annual_turnover": 8500000,
    "states_of_operation": ["MH", "GJ"],
    "activities": ["manufacturing", "trading"]
}
Response: 201
{
    "business_id": "uuid",
    "obligations_count": 87,
    "next_deadline": {
        "obligation": "GSTR-3B Filing (October 2025)",
        "due_date": "2025-11-20",
        "days_remaining": 15
    },
    "compliance_score": 0,
    "onboarding_checklist": [
        {"step": "Upload existing licenses", "priority": "high"},
        {"step": "Connect accounting software", "priority": "medium"},
        {"step": "Invite your accountant", "priority": "medium"}
    ]
}
```

### Compliance Calendar API

```
GET /api/v1/businesses/{business_id}/calendar?month=2025-11&status=upcoming,due_soon
Response: 200
{
    "month": "2025-11",
    "obligations": [
        {
            "instance_id": "uuid",
            "title": "GSTR-3B Filing — October 2025",
            "regulation": "CGST Act, Section 39(1)",
            "due_date": "2025-11-20",
            "status": "due_soon",
            "severity": "high",
            "penalty_rule": "₹50/day + 18% interest on tax due",
            "preparation_days": 3,
            "assignee": {"user_id": "uuid", "name": "Ramesh (Accountant)"},
            "dependencies": [],
            "documents_needed": ["Sales register", "Purchase register", "Input tax credit details"],
            "pre_fill_available": true
        }
    ],
    "summary": {
        "total_obligations": 12,
        "completed": 3,
        "upcoming": 7,
        "overdue": 2,
        "risk_score": 72
    }
}
```

### Document Upload API

```
POST /api/v1/businesses/{business_id}/documents
Content-Type: multipart/form-data
Fields: file, source (app|email|whatsapp), notes (optional)

Response: 202
{
    "document_id": "uuid",
    "content_hash": "sha256:a1b2c3...",
    "classification": {
        "status": "processing",
        "estimated_completion": "10s"
    }
}

// Classification webhook (async)
POST /webhooks/document-classified
{
    "document_id": "uuid",
    "classification": {
        "document_type": "filing_receipt",
        "regulation": "GSTR-3B",
        "period": "2025-10",
        "confidence": 0.94,
        "extracted_fields": {
            "ack_number": "GSTN/2025/10/A1234",
            "filing_date": "2025-11-18",
            "tax_paid": 45000
        }
    },
    "linked_obligation_id": "uuid"
}
```

### Regulatory Change Feed API

```
GET /api/v1/businesses/{business_id}/regulatory-changes?since=2025-11-01
Response: 200
{
    "changes": [
        {
            "change_id": "uuid",
            "published_date": "2025-11-05",
            "source": "CBIC Notification No. 47/2025",
            "original_url": "https://...",
            "impact_level": "high",
            "summary": {
                "title": "GST Filing Frequency Change for Turnover > ₹5 Crore",
                "plain_language": "Your GST filing changes from quarterly to monthly starting April 2026 because your turnover crossed ₹5 crore.",
                "action_required": "No immediate action. Monthly filing starts from April 2026. System will update your calendar automatically.",
                "penalty_info": "Late monthly filing: ₹50/day up to ₹5,000",
                "affected_obligations": ["GSTR-3B", "GSTR-1"]
            }
        }
    ]
}
```

### Audit Readiness API

```
GET /api/v1/businesses/{business_id}/audit-readiness?regulation=gst&period=2024-25
Response: 200
{
    "readiness_score": 78,
    "regulation": "GST",
    "period": "2024-25",
    "gaps": [
        {
            "gap_type": "missing_document",
            "description": "GSTR-3B filing receipt for March 2025 not uploaded",
            "severity": "high",
            "action": "Upload the GSTR-3B acknowledgment for March 2025"
        },
        {
            "gap_type": "mismatch",
            "description": "Input tax credit claimed (₹2,45,000) doesn't match purchase register total (₹2,52,000)",
            "severity": "medium",
            "action": "Reconcile ITC with purchase register and upload reconciliation statement"
        }
    ],
    "audit_pack": {
        "available": true,
        "download_url": "/api/v1/businesses/{id}/audit-pack/gst/2024-25",
        "documents_included": 47,
        "last_generated": "2025-11-10T08:00:00Z"
    }
}
```

---

## Core Algorithms

### Algorithm 1: Obligation Mapping via Knowledge Graph Traversal

```
function computeObligations(businessProfile):
    applicableObligations = []

    // Step 1: Determine jurisdiction set
    jurisdictions = ["central"]
    jurisdictions.addAll(businessProfile.states_of_operation)
    jurisdictions.addAll(businessProfile.municipal_areas)

    // Step 2: Traverse knowledge graph for each jurisdiction
    for jurisdiction in jurisdictions:
        regulationNodes = knowledgeGraph.getNodes(
            jurisdiction = jurisdiction,
            nodeType = "obligation"
        )

        for node in regulationNodes:
            if evaluateApplicability(node.applicability_rules, businessProfile):
                obligation = createObligationInstance(node, businessProfile)
                applicableObligations.add(obligation)

    // Step 3: Resolve conflicts (state overrides central)
    applicableObligations = resolveJurisdictionConflicts(applicableObligations)

    // Step 4: Compute dependency ordering
    applicableObligations = topologicalSort(applicableObligations, byDependencyEdges)

    return applicableObligations

function evaluateApplicability(rules, profile):
    for condition in rules.conditions:
        fieldValue = profile.getField(condition.field)
        if not evaluate(fieldValue, condition.op, condition.value):
            if rules.logic == "AND": return false
        else:
            if rules.logic == "OR": return true
    return rules.logic == "AND"
```

### Algorithm 2: Deadline Computation with Calendar Adjustments

```
function computeDeadline(obligationNode, businessProfile, periodEnd):
    rule = obligationNode.deadline_rule

    // Step 1: Base deadline from rule
    if rule.type == "fixed_day_of_month":
        baseDate = Date(periodEnd.year, periodEnd.month + rule.offset_months, rule.day)
    elif rule.type == "days_after_period_end":
        baseDate = periodEnd + rule.days
    elif rule.type == "fixed_annual_date":
        baseDate = Date(periodEnd.year + rule.year_offset, rule.month, rule.day)
    elif rule.type == "event_relative":
        eventDate = getBusinessEvent(businessProfile, rule.event_type)
        baseDate = eventDate + rule.days_after_event

    // Step 2: Apply jurisdiction-specific overrides
    if jurisdictionOverride = getJurisdictionDeadline(
        obligationNode, businessProfile.states_of_operation
    ):
        baseDate = jurisdictionOverride

    // Step 3: Apply government extensions
    if extension = getActiveExtension(obligationNode.node_id, periodEnd):
        baseDate = extension.extended_date

    // Step 4: Holiday adjustment
    while isHoliday(baseDate, businessProfile.primaryJurisdiction)
          or isWeekend(baseDate):
        baseDate = baseDate + 1 day

    return baseDate
```

### Algorithm 3: Regulatory Change Detection and Impact Analysis

```
function processRegulatoryDocument(newDocument, source):
    // Step 1: Parse and extract text
    parsedText = documentParser.parse(newDocument)

    // Step 2: Detect if this is a new regulation or amendment
    existingNodes = knowledgeGraph.findSimilar(parsedText, threshold=0.85)

    if existingNodes is empty:
        // New regulation
        changeType = "new_regulation"
        affectedNodes = []
    else:
        // Amendment to existing regulation
        changeType = "amendment"
        previousVersion = existingNodes[0]
        diff = semanticDiff(previousVersion.full_text, parsedText)
        affectedNodes = identifyAffectedNodes(previousVersion, diff)

    // Step 3: Extract obligations from new/changed text
    obligations = nlpPipeline.extractObligations(parsedText)
    // NER: who (applicability), what (obligation), when (deadline),
    //       how_much (penalty), where (jurisdiction)

    // Step 4: Update knowledge graph
    for obligation in obligations:
        node = createOrUpdateNode(obligation)
        knowledgeGraph.upsert(node)

    // Step 5: Find affected businesses
    affectedBusinesses = []
    for node in affectedNodes + obligations:
        businesses = businessDB.query(
            matchesApplicability(node.applicability_rules)
        )
        affectedBusinesses.addAll(businesses)

    // Step 6: Recompute obligations for affected businesses
    for business in affectedBusinesses.deduplicate():
        obligationService.recomputeAsync(business.business_id)

    // Step 7: Generate notifications
    summary = nlpPipeline.generatePlainLanguageSummary(
        changeType, diff, obligations
    )
    notificationService.dispatchRegulatoryChange(
        affectedBusinesses, summary
    )
```

### Algorithm 4: Audit Readiness Scoring

```
function computeAuditReadiness(businessId, regulation, period):
    score = 100  // Start with perfect score, deduct for gaps
    gaps = []

    // Step 1: Get all obligations for this regulation and period
    obligations = obligationStore.query(
        business_id = businessId,
        regulation = regulation,
        period = period
    )

    for obligation in obligations:
        // Check 1: Filing completion
        if obligation.status == "overdue":
            score -= 15  // Major deduction for missed filing
            gaps.add(Gap("missing_filing", obligation, severity="critical"))
        elif obligation.status == "completed":
            // Check 2: Filing evidence
            if not documentVault.hasDocument(obligation.completion_evidence):
                score -= 5  // Filed but no receipt uploaded
                gaps.add(Gap("missing_receipt", obligation, severity="high"))
            else:
                // Check 3: Document integrity
                doc = documentVault.get(obligation.completion_evidence)
                if not verifyHash(doc):
                    score -= 10  // Integrity issue
                    gaps.add(Gap("integrity_issue", obligation, severity="critical"))

    // Step 2: Check supporting documents
    requiredDocs = getRequiredSupportingDocs(regulation, period)
    for docType in requiredDocs:
        if not documentVault.hasDocumentOfType(businessId, docType, period):
            score -= 3
            gaps.add(Gap("missing_supporting_doc", docType, severity="medium"))

    // Step 3: Cross-reference validation
    crossRefIssues = validateCrossReferences(businessId, regulation, period)
    for issue in crossRefIssues:
        score -= issue.severity_weight
        gaps.add(issue)

    return AuditReadiness(
        score = max(0, score),
        gaps = gaps.sortBy(severity descending),
        audit_pack_ready = score >= 70
    )
```

---

## Database Schema Decisions

| Data Store | Technology Choice | Rationale |
|---|---|---|
| **Regulatory Knowledge Graph** | Graph database (property graph model) | Natural representation of regulation hierarchies, amendment chains, and applicability relationships; efficient multi-hop traversal for obligation mapping |
| **Business Profiles** | Relational database | Structured, transactional data with ACID requirements; frequent updates to parameters; complex queries for threshold monitoring |
| **Document Vault** | Object storage with metadata in relational DB | Content-addressed blob storage for documents; metadata (classification, extracted fields) in relational DB for querying; separation of blob storage from metadata enables independent scaling |
| **Compliance Deadlines** | Relational database with time-series optimization | Deadline queries are time-range heavy ("all deadlines in next 30 days"); partitioned by due_date for efficient range scans |
| **Notification Queue** | Message queue with scheduled delivery | Decouples notification generation from delivery; supports scheduled future delivery; retry semantics for failed deliveries |
| **Search Index** | Full-text search engine | Document vault search across OCR text, extracted fields, and regulatory text; faceted search by regulation, period, document type |
| **Notification History** | Append-only time-series store | High write volume (8M/day); queries primarily by business_id + time range; append-only nature suits time-series storage |
