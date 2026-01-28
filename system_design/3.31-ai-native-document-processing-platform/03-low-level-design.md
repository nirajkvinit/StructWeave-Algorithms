# Low-Level Design

## Data Models

### Document Schema

```yaml
Document:
  # Primary identifiers
  document_id: uuid                    # Unique document identifier
  tenant_id: uuid                      # Multi-tenant isolation
  batch_id: uuid                       # Optional batch grouping
  correlation_id: string               # External reference ID

  # Source information
  source:
    channel: enum                      # email, api, upload, scan, sftp
    received_at: timestamp
    sender: string                     # Email sender or API client
    original_filename: string
    content_type: string               # application/pdf, image/tiff
    metadata: jsonb                    # Channel-specific metadata

  # Document content
  content:
    file_path: string                  # Object storage path
    file_size_bytes: int
    file_hash: string                  # SHA-256 for deduplication
    total_pages: int
    pages: Page[]

  # Processing state
  processing:
    status: enum                       # pending, preprocessing, ocr, classifying,
                                       # extracting, validating, review, completed, failed
    current_stage: string
    started_at: timestamp
    completed_at: timestamp
    error: ProcessingError             # If failed
    retry_count: int
    checkpoint: jsonb                  # For resumable processing

  # Classification result
  classification:
    document_type: string              # invoice, receipt, contract, form
    confidence: float                  # 0.0 - 1.0
    model_version: string
    alternatives: ClassificationResult[] # Top-3 alternatives

  # Extraction results
  extractions: Extraction[]

  # Validation results
  validation:
    passed: boolean
    errors: ValidationError[]
    warnings: ValidationWarning[]

  # HITL tracking
  hitl:
    required: boolean
    review_type: enum                  # classification, extraction, validation
    assigned_to: string
    assigned_at: timestamp
    completed_at: timestamp
    corrections: Correction[]

  # Audit trail
  audit:
    created_at: timestamp
    updated_at: timestamp
    created_by: string
    processing_history: ProcessingEvent[]

  # Indexes
  indexes:
    - tenant_id, status                # Tenant processing queue
    - tenant_id, document_type         # Type-based queries
    - tenant_id, received_at           # Time-based queries
    - file_hash                        # Deduplication
    - batch_id                         # Batch queries
```

### Page Schema

```yaml
Page:
  page_id: uuid
  document_id: uuid
  page_number: int                     # 1-indexed

  # Image data
  image:
    path: string                       # Object storage path
    width: int
    height: int
    dpi: int
    format: string                     # png, jpeg, tiff

  # Pre-processing results
  preprocessing:
    deskew_angle: float
    quality_score: float               # 0.0 - 1.0
    is_blank: boolean
    language: string                   # Detected language (ISO 639-1)

  # OCR results
  ocr:
    engine: string                     # tesseract, textract, doctr
    text: string                       # Full page text
    confidence: float
    words: Word[]
    lines: Line[]
    blocks: Block[]
    tables: Table[]

  # Layout analysis
  layout:
    regions: Region[]                  # Header, footer, body, sidebar
    reading_order: int[]               # Block IDs in reading order
```

### Extraction Schema

```yaml
Extraction:
  extraction_id: uuid
  document_id: uuid
  page_number: int

  # Field information
  field:
    name: string                       # vendor_name, invoice_number, total
    type: enum                         # string, number, date, currency, boolean
    required: boolean
    schema_version: string

  # Extracted value
  value:
    raw: any                           # As extracted
    normalized: any                    # After normalization
    display: string                    # Formatted for display

  # Confidence and location
  confidence: float                    # 0.0 - 1.0
  bounding_box:
    x: int
    y: int
    width: int
    height: int
    page: int

  # Extraction method
  method:
    model: string                      # layoutlmv3, donut, gpt4v
    model_version: string
    extraction_type: enum              # model, rule, human, default

  # Validation
  validation:
    is_valid: boolean
    errors: string[]
    warnings: string[]

  # HITL
  hitl:
    reviewed: boolean
    original_value: any                # Before correction
    corrected_by: string
    corrected_at: timestamp
```

### Agent Task Schema

```yaml
AgentTask:
  task_id: uuid
  document_id: uuid
  parent_task_id: uuid                 # For task hierarchies

  # Agent information
  agent:
    type: enum                         # parser, classifier, extractor, validator, exception
    name: string
    version: string

  # Task details
  task:
    action: string                     # classify, extract_field, validate
    input_data: jsonb
    parameters: jsonb

  # Execution
  execution:
    status: enum                       # pending, running, completed, failed, cancelled
    started_at: timestamp
    completed_at: timestamp
    duration_ms: int
    retry_count: int

  # Results
  result:
    output_data: jsonb
    confidence: float
    error: string
    stack_trace: string

  # Lineage
  lineage:
    created_at: timestamp
    created_by: string                 # Coordinator or parent agent
    model_used: string
    model_version: string
```

### Extraction Schema Definition

```yaml
ExtractionSchema:
  schema_id: uuid
  document_type: string                # invoice, receipt, contract

  # Version control
  version: string                      # semver
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp

  # Field definitions
  fields:
    - name: string
      display_name: string
      type: enum                       # string, number, date, currency, boolean, array
      required: boolean
      validation_rules:
        - rule: string                 # regex, range, enum, custom
          params: jsonb
      extraction_hints:
        - labels: string[]             # "Invoice Number", "Inv #", "Invoice No."
          position: string             # header, body, footer
      default_value: any
      confidence_threshold: float      # Field-specific threshold

  # Document-level rules
  validation_rules:
    - name: string
      type: enum                       # cross_field, external_lookup, custom
      rule: string
      error_message: string
```

---

## API Design

### Document Submission API

```yaml
POST /v1/documents
Content-Type: multipart/form-data

Request:
  file: binary                         # Required: Document file
  metadata:                            # Optional: Additional metadata
    document_type_hint: string         # Hint for classification
    priority: enum                     # normal, high, urgent
    callback_url: string               # Webhook for completion
    external_id: string                # Caller's reference ID
    custom_fields: object              # Application-specific data
    batch_id: string                   # Group documents into batch

Headers:
  Authorization: Bearer <token>
  X-Tenant-ID: <tenant_id>
  X-Idempotency-Key: <uuid>            # For retry safety

Response: 202 Accepted
  document_id: uuid
  status: "accepted"
  estimated_completion: timestamp
  tracking_url: string                 # URL to check status

Errors:
  400: Invalid file format or metadata
  401: Authentication failed
  403: Tenant not authorized
  413: File too large (max 50MB)
  429: Rate limit exceeded
  500: Internal server error
```

### Document Status API

```yaml
GET /v1/documents/{document_id}

Headers:
  Authorization: Bearer <token>
  X-Tenant-ID: <tenant_id>

Response: 200 OK
  document_id: uuid
  status: enum                         # pending, processing, review, completed, failed
  progress:
    stage: string                      # current processing stage
    percentage: int                    # 0-100
  classification:
    document_type: string
    confidence: float
  extractions:
    - field_name: string
      value: any
      confidence: float
      needs_review: boolean
  validation:
    passed: boolean
    errors: string[]
  hitl:
    required: boolean
    review_type: string
    queue_position: int                # If in queue
  timestamps:
    received_at: timestamp
    processing_started_at: timestamp
    completed_at: timestamp
  processing_time_ms: int

Errors:
  404: Document not found
  403: Not authorized to access document
```

### Batch Submission API

```yaml
POST /v1/batches
Content-Type: application/json

Request:
  batch_name: string
  documents:
    - file_url: string                 # Pre-signed URL or S3 path
      metadata: object
  callback_url: string
  priority: enum

Response: 202 Accepted
  batch_id: uuid
  document_count: int
  status: "accepted"

GET /v1/batches/{batch_id}
Response: 200 OK
  batch_id: uuid
  status: enum                         # pending, processing, completed, partial
  total_documents: int
  processed: int
  succeeded: int
  failed: int
  documents:
    - document_id: uuid
      status: enum
      document_type: string
```

### HITL Review Queue API

```yaml
GET /v1/review/queue
Query Parameters:
  review_type: enum                    # classification, extraction, validation
  priority: enum                       # normal, high, urgent
  limit: int                           # Default 20, max 100
  cursor: string                       # Pagination cursor

Response: 200 OK
  items:
    - document_id: uuid
      review_type: enum
      priority: enum
      document_type: string
      created_at: timestamp
      sla_deadline: timestamp
      current_values:
        - field_name: string
          value: any
          confidence: float
      preview_url: string              # Document preview image
  next_cursor: string
  total_count: int

POST /v1/review/{document_id}/claim
Request:
  reviewer_id: string

Response: 200 OK
  claimed: boolean
  claim_expires_at: timestamp          # Auto-release after timeout

POST /v1/review/{document_id}/submit
Request:
  decision: enum                       # approve, correct, reject
  corrections:
    - field_name: string
      original_value: any
      corrected_value: any
      correction_reason: string
  classification_override:
    document_type: string
    reason: string
  notes: string

Response: 200 OK
  document_id: uuid
  status: "submitted"
  next_stage: string                   # What happens next
```

### Schema Management API

```yaml
GET /v1/schemas
Response: 200 OK
  schemas:
    - schema_id: uuid
      document_type: string
      version: string
      is_active: boolean
      field_count: int

GET /v1/schemas/{document_type}
Response: 200 OK
  schema_id: uuid
  document_type: string
  version: string
  fields: Field[]
  validation_rules: Rule[]

POST /v1/schemas
Request:
  document_type: string
  fields: Field[]
  validation_rules: Rule[]

Response: 201 Created
  schema_id: uuid
  version: "1.0.0"
```

### Webhook Events

```yaml
# Document completed
POST {callback_url}
Headers:
  X-Webhook-Signature: <hmac_sha256>
  X-Event-Type: document.completed

Body:
  event: "document.completed"
  timestamp: timestamp
  document_id: uuid
  tenant_id: uuid
  status: "completed"
  classification:
    document_type: string
    confidence: float
  extractions:
    - field_name: string
      value: any
      confidence: float
  validation:
    passed: boolean
  processing_time_ms: int
  hitl_required: boolean

# Document failed
event: "document.failed"
  error_code: string
  error_message: string
  retry_count: int
  can_retry: boolean

# HITL required
event: "document.review_required"
  review_type: enum
  fields_needing_review: string[]
  deadline: timestamp
```

---

## Core Algorithms

### Algorithm 1: Confidence-Based Routing

```
ALGORITHM ConfidenceRouter(extraction_results, thresholds, document_type)
INPUT:
  extraction_results: list of (field_name, value, confidence)
  thresholds: {
    auto_approve: float,              # e.g., 0.95
    review_required: float,           # e.g., 0.70
    per_field: {field_name: {auto_approve, review_required}}
  }
  document_type: string

OUTPUT:
  decision: (auto_approve | review | reject)
  fields_for_review: list of field_names
  routing_metadata: object

PROCEDURE:
1. Initialize:
   approved_fields = []
   review_fields = []
   rejected_fields = []

2. FOR each (field_name, value, confidence) IN extraction_results DO
   // Get field-specific threshold or default
   IF field_name IN thresholds.per_field THEN
     threshold = thresholds.per_field[field_name]
   ELSE
     threshold = {
       auto_approve: thresholds.auto_approve,
       review_required: thresholds.review_required
     }
   END IF

   // Route based on confidence
   IF confidence >= threshold.auto_approve THEN
     approved_fields.append(field_name)
   ELSE IF confidence >= threshold.review_required THEN
     review_fields.append(field_name)
   ELSE
     rejected_fields.append(field_name)
   END IF
END FOR

3. // Determine overall decision
   IF rejected_fields.length > 0 THEN
     decision = "reject"
     fields_for_review = rejected_fields + review_fields
   ELSE IF review_fields.length > 0 THEN
     decision = "review"
     fields_for_review = review_fields
   ELSE
     decision = "auto_approve"
     fields_for_review = []
   END IF

4. // Calculate review priority
   IF decision != "auto_approve" THEN
     priority = calculate_priority(
       document_type,
       fields_for_review,
       avg_confidence(review_fields)
     )
   END IF

5. RETURN {
     decision: decision,
     fields_for_review: fields_for_review,
     routing_metadata: {
       approved_count: approved_fields.length,
       review_count: review_fields.length,
       rejected_count: rejected_fields.length,
       avg_confidence: avg(all confidences),
       priority: priority
     }
   }

FUNCTION calculate_priority(document_type, fields, avg_confidence):
  base_priority = document_type_priorities[document_type]  // e.g., invoice=high
  field_importance = max(field_priorities[f] for f in fields)
  confidence_factor = 1.0 - avg_confidence  // Lower confidence = higher priority

  RETURN base_priority * field_importance * confidence_factor
```

### Algorithm 2: Document Classification Pipeline

```
ALGORITHM ClassifyDocument(document, ocr_result, models, config)
INPUT:
  document: Document object with pages
  ocr_result: OCR text, layout, tables
  models: {
    specialized: LayoutLMv3 classifier,
    foundation: GPT-4V classifier,
    zero_shot: CLIP classifier
  }
  config: {
    specialized_threshold: float,     # e.g., 0.85
    foundation_threshold: float,      # e.g., 0.75
    known_document_types: list
  }

OUTPUT:
  classification: (document_type, confidence, method, alternatives)

PROCEDURE:
1. // Prepare input for specialized model
   model_input = prepare_layoutlm_input(
     text = ocr_result.text,
     boxes = ocr_result.word_bounding_boxes,
     image = document.pages[0].image  // First page
   )

2. // Try specialized classifier first (fast, cheap)
   specialized_result = models.specialized.predict(model_input)

   IF specialized_result.confidence >= config.specialized_threshold THEN
     RETURN {
       document_type: specialized_result.type,
       confidence: specialized_result.confidence,
       method: "specialized",
       alternatives: specialized_result.top_3
     }
   END IF

3. // Check if document type might be unknown
   IF specialized_result.confidence < 0.5 THEN
     // Try zero-shot classification
     zero_shot_result = models.zero_shot.classify(
       image = document.pages[0].image,
       candidate_labels = config.known_document_types + ["unknown", "other"]
     )

     IF zero_shot_result.type IN ["unknown", "other"] THEN
       // Likely a new document type
       RETURN {
         document_type: "unknown",
         confidence: zero_shot_result.confidence,
         method: "zero_shot",
         alternatives: zero_shot_result.all_scores,
         needs_human_classification: true
       }
     END IF
   END IF

4. // Fallback to foundation model for uncertain cases
   foundation_prompt = build_classification_prompt(
     ocr_text = ocr_result.text[:4000],  // Truncate for context
     document_types = config.known_document_types,
     layout_hints = extract_layout_hints(ocr_result)
   )

   foundation_result = models.foundation.classify(
     image = document.pages[0].image,
     prompt = foundation_prompt
   )

   IF foundation_result.confidence >= config.foundation_threshold THEN
     RETURN {
       document_type: foundation_result.type,
       confidence: foundation_result.confidence,
       method: "foundation",
       alternatives: [specialized_result, foundation_result]
     }
   END IF

5. // Low confidence - route to HITL
   best_guess = argmax(specialized_result, foundation_result, by=confidence)
   RETURN {
     document_type: best_guess.type,
     confidence: best_guess.confidence,
     method: "ensemble_low_confidence",
     alternatives: [specialized_result, foundation_result],
     needs_human_review: true
   }

FUNCTION build_classification_prompt(ocr_text, document_types, layout_hints):
  RETURN """
  Classify this document into one of these types: {document_types}

  Document text (partial):
  {ocr_text}

  Layout observations:
  - Has tables: {layout_hints.has_tables}
  - Has header/footer: {layout_hints.has_header}
  - Estimated sections: {layout_hints.section_count}

  Return the document type and confidence (0.0-1.0).
  """
```

### Algorithm 3: Agentic Workflow Orchestration

```
ALGORITHM OrchestrateDocumentProcessing(document, config)
INPUT:
  document: Raw document object
  config: {
    agents: {parser, classifier, extractor, validator, exception},
    max_retries: int,
    confidence_thresholds: object,
    timeout_ms: int
  }

OUTPUT:
  processed_document: Document with extractions and validations

PROCEDURE:
1. // Initialize workflow state
   state = {
     document_id: document.id,
     current_stage: "parsing",
     history: [],
     shared_context: {},
     retry_count: 0
   }

2. // Stage 1: Parse document structure
   TRY
     parser_result = dispatch_agent(
       agent = config.agents.parser,
       task = {action: "parse", document: document},
       timeout = config.timeout_ms
     )
     state.shared_context.parsed = parser_result
     state.history.append({stage: "parsing", result: "success"})
   CATCH error
     state = handle_agent_failure(state, "parsing", error, config)
     IF state.failed THEN RETURN error_result(state)
   END TRY

3. // Stage 2: Classify document type
   TRY
     classifier_result = dispatch_agent(
       agent = config.agents.classifier,
       task = {
         action: "classify",
         parsed_document: state.shared_context.parsed
       },
       timeout = config.timeout_ms
     )

     IF classifier_result.confidence < config.confidence_thresholds.classification THEN
       // Route to HITL for classification review
       hitl_result = AWAIT route_to_hitl(
         document = document,
         review_type = "classification",
         current_value = classifier_result
       )
       classifier_result = hitl_result
     END IF

     state.shared_context.classification = classifier_result
     state.history.append({stage: "classification", result: classifier_result})
   CATCH error
     state = handle_agent_failure(state, "classification", error, config)
     IF state.failed THEN RETURN error_result(state)
   END TRY

4. // Stage 3: Extract fields based on document type
   schema = get_extraction_schema(state.shared_context.classification.document_type)

   TRY
     extractor_result = dispatch_agent(
       agent = config.agents.extractor,
       task = {
         action: "extract",
         parsed_document: state.shared_context.parsed,
         schema: schema
       },
       timeout = config.timeout_ms * 2  // Extraction takes longer
     )

     // Check field-level confidences
     low_confidence_fields = filter(
       extractor_result.extractions,
       WHERE confidence < config.confidence_thresholds.extraction
     )

     IF low_confidence_fields.length > 0 THEN
       // Retry with foundation model for low-confidence fields
       retry_result = dispatch_agent(
         agent = config.agents.extractor,
         task = {
           action: "extract_with_foundation",
           fields: low_confidence_fields,
           document: document
         }
       )
       extractor_result = merge_extractions(extractor_result, retry_result)

       // Still low confidence? Route to HITL
       still_low = filter(extractor_result, WHERE confidence < threshold)
       IF still_low.length > 0 THEN
         hitl_result = AWAIT route_to_hitl(
           document = document,
           review_type = "extraction",
           fields = still_low
         )
         extractor_result = merge_extractions(extractor_result, hitl_result)
       END IF
     END IF

     state.shared_context.extractions = extractor_result
   CATCH error
     state = handle_agent_failure(state, "extraction", error, config)
     IF state.failed THEN RETURN error_result(state)
   END TRY

5. // Stage 4: Validate extractions
   TRY
     validator_result = dispatch_agent(
       agent = config.agents.validator,
       task = {
         action: "validate",
         extractions: state.shared_context.extractions,
         schema: schema,
         business_rules: get_business_rules(
           state.shared_context.classification.document_type
         )
       },
       timeout = config.timeout_ms
     )

     IF NOT validator_result.passed THEN
       // Route validation errors to HITL
       hitl_result = AWAIT route_to_hitl(
         document = document,
         review_type = "validation",
         errors = validator_result.errors
       )

       // Re-validate after corrections
       IF hitl_result.corrected THEN
         state.shared_context.extractions = hitl_result.extractions
         validator_result = dispatch_agent(config.agents.validator, ...)
       END IF
     END IF

     state.shared_context.validation = validator_result
   CATCH error
     state = handle_agent_failure(state, "validation", error, config)
   END TRY

6. // Finalize and return
   RETURN {
     document_id: document.id,
     status: "completed",
     classification: state.shared_context.classification,
     extractions: state.shared_context.extractions,
     validation: state.shared_context.validation,
     processing_history: state.history
   }

FUNCTION handle_agent_failure(state, stage, error, config):
  state.retry_count += 1
  state.history.append({stage: stage, result: "error", error: error})

  IF state.retry_count >= config.max_retries THEN
    // Escalate to exception handler
    exception_result = dispatch_agent(
      agent = config.agents.exception,
      task = {
        action: "handle_failure",
        stage: stage,
        error: error,
        state: state
      }
    )

    IF exception_result.action == "retry_with_different_model" THEN
      state.retry_count = 0  // Reset for new approach
    ELSE IF exception_result.action == "route_to_human" THEN
      state.needs_manual_intervention = true
    ELSE
      state.failed = true
    END IF
  END IF

  RETURN state
```

### Algorithm 4: HITL Queue Prioritization

```
ALGORITHM PrioritizeReviewQueue(review_items, config)
INPUT:
  review_items: list of items needing review
  config: {
    document_type_weights: {type: weight},
    field_importance: {field: weight},
    sla_penalties: {tier: penalty_per_hour},
    reviewer_capacity: int
  }

OUTPUT:
  prioritized_queue: sorted list with priority scores

PROCEDURE:
1. FOR each item IN review_items DO
   // Calculate base priority from document type
   base_priority = config.document_type_weights.get(
     item.document_type,
     default = 1.0
   )

   // Factor in field importance
   IF item.review_type == "extraction" THEN
     field_weight = max(
       config.field_importance.get(f, 1.0)
       for f IN item.fields_needing_review
     )
   ELSE
     field_weight = 1.0
   END IF

   // SLA urgency factor
   hours_until_sla = (item.sla_deadline - now()) / 3600
   IF hours_until_sla < 0 THEN
     sla_factor = 10.0  // Already breached - highest priority
   ELSE IF hours_until_sla < 1 THEN
     sla_factor = 5.0
   ELSE IF hours_until_sla < 4 THEN
     sla_factor = 2.0
   ELSE
     sla_factor = 1.0
   END IF

   // Confidence-based urgency (lower confidence = more ambiguous = higher priority)
   confidence_factor = 1.0 + (1.0 - item.avg_confidence)

   // Age factor (older items get slight boost)
   age_hours = (now() - item.created_at) / 3600
   age_factor = 1.0 + min(age_hours / 24, 0.5)  // Max 50% boost

   // Calculate final priority score
   item.priority_score = (
     base_priority *
     field_weight *
     sla_factor *
     confidence_factor *
     age_factor
   )

2. // Sort by priority score descending
   prioritized_queue = sort(review_items, by=priority_score, desc=true)

3. // Apply fairness constraints
   // Ensure no single tenant monopolizes queue
   prioritized_queue = apply_tenant_fairness(
     prioritized_queue,
     max_per_tenant = config.reviewer_capacity * 0.3
   )

4. RETURN prioritized_queue
```

---

## Error Handling

### Error Code Taxonomy

| Code Range | Category | Example |
|------------|----------|---------|
| **1xxx** | Ingestion Errors | 1001: Invalid file format |
| **2xxx** | Pre-processing Errors | 2001: Page extraction failed |
| **3xxx** | OCR Errors | 3001: OCR timeout, 3002: Low quality image |
| **4xxx** | Classification Errors | 4001: Unknown document type |
| **5xxx** | Extraction Errors | 5001: Schema not found, 5002: Field extraction failed |
| **6xxx** | Validation Errors | 6001: Required field missing, 6002: Business rule violated |
| **7xxx** | Integration Errors | 7001: Webhook delivery failed |
| **8xxx** | System Errors | 8001: Database unavailable |

### Retry Policies

| Error Type | Retry Strategy | Max Retries | Backoff |
|------------|----------------|-------------|---------|
| **Transient (timeout, rate limit)** | Exponential backoff | 5 | 1s, 2s, 4s, 8s, 16s |
| **OCR failure** | Retry with different engine | 3 | Immediate |
| **Model failure** | Fallback to foundation model | 2 | Immediate |
| **Validation failure** | Route to HITL | 1 | N/A |
| **System errors** | Circuit breaker | 10 | 30s cooldown |

### Graceful Degradation

| Scenario | Degraded Behavior | User Impact |
|----------|-------------------|-------------|
| **Foundation model unavailable** | Use specialized models only | Lower accuracy on edge cases |
| **OCR service degraded** | Queue documents, process when available | Higher latency |
| **HITL system down** | Auto-approve high-confidence, queue rest | May miss corrections |
| **Database slow** | Use cache, async writes | Slightly stale status |
