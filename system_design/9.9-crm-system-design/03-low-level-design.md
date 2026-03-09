# Low-Level Design

## Data Model

### Physical Storage: Multi-Tenant Generic Tables

The CRM platform does not create dedicated database tables per custom object or per tenant. Instead, all data is stored in a set of shared generic tables. The metadata engine maps each tenant's virtual schema (custom objects and fields) to specific columns in these generic tables.

#### Core Data Tables

```
TABLE mt_data (partitioned by org_id)
──────────────────────────────────────────────
org_id              VARCHAR(18)    -- Tenant identifier (partition key)
record_id           VARCHAR(18)    -- Globally unique record ID (primary key)
object_type_id      VARCHAR(18)    -- FK to metadata_object (which custom/standard object)
name                VARCHAR(255)   -- Record name (display label)
owner_id            VARCHAR(18)    -- FK to user record (record owner)
created_by          VARCHAR(18)    -- FK to user record
created_date        TIMESTAMP
last_modified_by    VARCHAR(18)    -- FK to user record
last_modified_date  TIMESTAMP
is_deleted          BOOLEAN        -- Soft delete flag (recycle bin support)

-- Typed generic columns for custom field storage
string_col_001      VARCHAR(255)
string_col_002      VARCHAR(255)
...
string_col_100      VARCHAR(255)
long_text_col_001   TEXT           -- For textarea/rich text fields
long_text_col_002   TEXT
...
long_text_col_010   TEXT
number_col_001      DECIMAL(18,6)
number_col_002      DECIMAL(18,6)
...
number_col_050      DECIMAL(18,6)
date_col_001        DATE
date_col_002        DATE
...
date_col_025        DATE
datetime_col_001    TIMESTAMP
datetime_col_002    TIMESTAMP
...
datetime_col_025    TIMESTAMP
boolean_col_001     BOOLEAN
...
boolean_col_025     BOOLEAN

INDEX idx_mt_data_org_type (org_id, object_type_id)
INDEX idx_mt_data_org_owner (org_id, owner_id)
INDEX idx_mt_data_org_name (org_id, object_type_id, name)
INDEX idx_mt_data_modified (org_id, last_modified_date)

-- Custom indexes (tenant-defined, stored in metadata)
-- Created dynamically based on metadata_index definitions
```

#### Relationship Table

```
TABLE mt_relationship
──────────────────────────────────────────────
org_id              VARCHAR(18)
relationship_id     VARCHAR(18)    -- Primary key
parent_record_id    VARCHAR(18)    -- FK to mt_data.record_id
child_record_id     VARCHAR(18)    -- FK to mt_data.record_id
relationship_def_id VARCHAR(18)    -- FK to metadata_relationship
relationship_type   ENUM('lookup', 'master_detail', 'many_to_many')
sort_order          INT            -- For ordered child lists

INDEX idx_rel_parent (org_id, parent_record_id, relationship_def_id)
INDEX idx_rel_child (org_id, child_record_id, relationship_def_id)
```

#### Activity Table

```
TABLE activity
──────────────────────────────────────────────
org_id              VARCHAR(18)
activity_id         VARCHAR(18)    -- Primary key
activity_type       ENUM('email', 'call', 'meeting', 'task', 'note')
subject             VARCHAR(255)
description         TEXT
who_id              VARCHAR(18)    -- Polymorphic: Contact or Lead
what_id             VARCHAR(18)    -- Polymorphic: Account, Opportunity, or Custom Object
owner_id            VARCHAR(18)
status              VARCHAR(50)    -- e.g., 'Completed', 'Open', 'In Progress'
priority            VARCHAR(20)
due_date            DATE
completed_date      TIMESTAMP
created_date        TIMESTAMP
last_modified_date  TIMESTAMP

-- Email-specific fields
email_from          VARCHAR(255)
email_to            TEXT           -- JSON array of recipients
email_cc            TEXT
email_message_id    VARCHAR(255)   -- For threading
email_thread_id     VARCHAR(255)
is_tracked          BOOLEAN        -- Email open/click tracking enabled
open_count          INT
click_count         INT

INDEX idx_activity_who (org_id, who_id, created_date DESC)
INDEX idx_activity_what (org_id, what_id, created_date DESC)
INDEX idx_activity_owner (org_id, owner_id, due_date)
```

### Metadata Tables

```
TABLE metadata_object
──────────────────────────────────────────────
org_id              VARCHAR(18)
object_id           VARCHAR(18)    -- Primary key
api_name            VARCHAR(80)    -- e.g., 'Account', 'CustomProject__c'
label               VARCHAR(80)
plural_label        VARCHAR(80)
is_custom           BOOLEAN
data_table_name     VARCHAR(50)    -- Physical table assignment (e.g., 'mt_data')
is_searchable       BOOLEAN
is_reportable       BOOLEAN
key_prefix          VARCHAR(3)     -- 3-char prefix for record IDs (e.g., '001' for Account)
description         TEXT
created_date        TIMESTAMP
last_modified_date  TIMESTAMP

INDEX idx_meta_obj (org_id, api_name) UNIQUE
```

```
TABLE metadata_field
──────────────────────────────────────────────
org_id              VARCHAR(18)
field_id            VARCHAR(18)    -- Primary key
object_id           VARCHAR(18)    -- FK to metadata_object
api_name            VARCHAR(80)    -- e.g., 'Email', 'CustomBudget__c'
label               VARCHAR(80)
data_type           ENUM('string', 'number', 'currency', 'date', 'datetime',
                         'boolean', 'picklist', 'multi_picklist', 'email',
                         'phone', 'url', 'textarea', 'rich_text', 'formula',
                         'auto_number', 'lookup', 'master_detail')
physical_column     VARCHAR(50)    -- Column in mt_data (e.g., 'string_col_042')
length              INT
precision           INT
scale               INT
is_required         BOOLEAN
is_unique           BOOLEAN
is_indexed          BOOLEAN        -- Custom index on this field
default_value       TEXT           -- Default value expression
formula_expression  TEXT           -- For formula fields
lookup_object_id    VARCHAR(18)    -- For lookup/master_detail: target object
picklist_values     JSONB          -- For picklist: [{value, label, isActive, sortOrder}]
help_text           TEXT
is_custom           BOOLEAN
created_date        TIMESTAMP

INDEX idx_meta_field (org_id, object_id, api_name) UNIQUE
INDEX idx_meta_field_col (org_id, physical_column)
```

```
TABLE metadata_relationship
──────────────────────────────────────────────
org_id              VARCHAR(18)
relationship_id     VARCHAR(18)
parent_object_id    VARCHAR(18)    -- FK to metadata_object
child_object_id     VARCHAR(18)    -- FK to metadata_object
relationship_name   VARCHAR(80)    -- e.g., 'Contacts' (child relationship name on parent)
field_id            VARCHAR(18)    -- FK to metadata_field (the lookup/master_detail field)
relationship_type   ENUM('lookup', 'master_detail')
cascade_delete      BOOLEAN        -- Master-detail: delete children when parent deleted
rollup_fields       JSONB          -- [{field_id, operation: 'SUM'|'COUNT'|'MIN'|'MAX', filter}]

INDEX idx_meta_rel (org_id, parent_object_id)
INDEX idx_meta_rel_child (org_id, child_object_id)
```

```
TABLE metadata_validation_rule
──────────────────────────────────────────────
org_id              VARCHAR(18)
rule_id             VARCHAR(18)
object_id           VARCHAR(18)    -- FK to metadata_object
name                VARCHAR(80)
is_active           BOOLEAN
error_condition     TEXT           -- Boolean expression (e.g., 'Amount < 0')
error_message       TEXT           -- Displayed when condition is TRUE (validation fails)
error_field_id      VARCHAR(18)    -- Field to display error on (optional)
evaluation_order    INT

INDEX idx_meta_val (org_id, object_id, is_active)
```

```
TABLE metadata_workflow_rule
──────────────────────────────────────────────
org_id              VARCHAR(18)
workflow_id         VARCHAR(18)
object_id           VARCHAR(18)
name                VARCHAR(80)
is_active           BOOLEAN
trigger_type        ENUM('on_create', 'on_update', 'on_create_or_update')
entry_criteria      JSONB          -- Filter conditions for when rule fires
evaluation_criteria ENUM('created', 'created_and_every_edit', 'created_and_criteria_met')
actions             JSONB          -- [{type, config}] - field updates, emails, tasks, callouts
time_dependent_actions JSONB       -- [{delay, unit, actions}] - scheduled future actions

INDEX idx_meta_wf (org_id, object_id, is_active)
```

### Standard CRM Objects (Virtual Schema via Metadata)

These are standard objects that exist in every tenant's metadata by default, mapped to generic columns:

```
VIRTUAL TABLE Lead
──────────────────────────────────────────────
record_id           → mt_data.record_id
first_name          → mt_data.string_col_001
last_name           → mt_data.string_col_002
email               → mt_data.string_col_003
phone               → mt_data.string_col_004
company             → mt_data.string_col_005
title               → mt_data.string_col_006
industry            → mt_data.string_col_007  (picklist)
lead_source         → mt_data.string_col_008  (picklist)
status              → mt_data.string_col_009  (picklist: New, Working, Qualified, Converted)
rating              → mt_data.string_col_010  (picklist: Hot, Warm, Cold)
annual_revenue      → mt_data.number_col_001
number_of_employees → mt_data.number_col_002
lead_score          → mt_data.number_col_003
is_converted        → mt_data.boolean_col_001
converted_account_id → mt_data.string_col_011  (lookup)
converted_contact_id → mt_data.string_col_012  (lookup)
converted_opportunity_id → mt_data.string_col_013  (lookup)
converted_date      → mt_data.date_col_001
```

```
VIRTUAL TABLE Opportunity
──────────────────────────────────────────────
record_id           → mt_data.record_id
opportunity_name    → mt_data.name
account_id          → mt_data.string_col_001  (master_detail to Account)
stage               → mt_data.string_col_002  (picklist: Prospecting, Qualification, Proposal,
                                                Negotiation, Closed Won, Closed Lost)
amount              → mt_data.number_col_001
probability         → mt_data.number_col_002  (auto-set from stage mapping)
close_date          → mt_data.date_col_001
forecast_category   → mt_data.string_col_003  (Pipeline, Best Case, Commit, Closed)
lead_source         → mt_data.string_col_004
next_step           → mt_data.string_col_005
type                → mt_data.string_col_006  (New Business, Existing Business)
is_won              → mt_data.boolean_col_001
is_closed           → mt_data.boolean_col_002
```

---

## API Design

### REST API --- Record Operations

```
# Create record
POST /api/v2/sobjects/{objectApiName}
Headers: Authorization: Bearer {token}
Body: { "FirstName": "Jane", "LastName": "Doe", "Email": "jane@example.com", "Company": "Acme" }
Response: 201 Created
{ "id": "00Q5g000008XXXX", "success": true }

# Read record
GET /api/v2/sobjects/{objectApiName}/{recordId}
Response: 200 OK
{ "Id": "00Q5g000008XXXX", "FirstName": "Jane", "LastName": "Doe", ... }

# Update record
PATCH /api/v2/sobjects/{objectApiName}/{recordId}
Body: { "Status": "Qualified", "Rating": "Hot" }
Response: 204 No Content

# Delete record (soft delete to recycle bin)
DELETE /api/v2/sobjects/{objectApiName}/{recordId}
Response: 204 No Content

# Query records (SOQL)
GET /api/v2/query?q=SELECT Id, Name, Email FROM Lead WHERE Status = 'New' ORDER BY CreatedDate DESC LIMIT 100
Response: 200 OK
{
  "totalSize": 2450,
  "done": false,
  "nextRecordsUrl": "/api/v2/query/01g5g000008XXXX-2000",
  "records": [ { "Id": "...", "Name": "...", "Email": "..." }, ... ]
}
```

### Bulk API --- Batch Operations

```
# Create bulk job
POST /api/v2/jobs/ingest
Body: {
  "object": "Lead",
  "operation": "insert",
  "contentType": "CSV",
  "lineEnding": "LF"
}
Response: 201 Created
{ "id": "7505g000008XXXX", "state": "Open" }

# Upload data
PUT /api/v2/jobs/ingest/{jobId}/batches
Content-Type: text/csv
Body:
FirstName,LastName,Email,Company
Jane,Doe,jane@example.com,Acme
John,Smith,john@example.com,Globex

# Close job (starts processing)
PATCH /api/v2/jobs/ingest/{jobId}
Body: { "state": "UploadComplete" }

# Poll job status
GET /api/v2/jobs/ingest/{jobId}
Response: { "state": "JobComplete", "numberRecordsProcessed": 50000, "numberRecordsFailed": 12 }

# Get failed records
GET /api/v2/jobs/ingest/{jobId}/failedResults
```

### Streaming API --- Change Data Capture

```
# Subscribe to change events for an object
GET /api/v2/streaming/data/{objectApiName}
Headers: Accept: text/event-stream

# Server-Sent Events stream:
data: {
  "changeType": "UPDATE",
  "recordId": "0015g000008XXXX",
  "changedFields": ["Stage", "Amount"],
  "newValues": { "Stage": "Closed Won", "Amount": 150000 },
  "oldValues": { "Stage": "Negotiation", "Amount": 120000 },
  "commitTimestamp": "2025-03-15T14:30:00Z",
  "transactionKey": "abc-123-def"
}
```

### Metadata API --- Schema Operations

```
# Get object metadata
GET /api/v2/sobjects/{objectApiName}/describe
Response: {
  "name": "Lead",
  "label": "Lead",
  "fields": [
    { "name": "Email", "type": "email", "length": 255, "filterable": true, "sortable": true },
    { "name": "LeadScore", "type": "double", "precision": 8, "scale": 2, "calculated": false },
    ...
  ],
  "relationships": [ ... ],
  "validationRules": [ ... ]
}

# Create custom object
POST /api/v2/metadata/sobjects
Body: {
  "fullName": "Project__c",
  "label": "Project",
  "pluralLabel": "Projects",
  "fields": [
    { "fullName": "Budget__c", "type": "Currency", "precision": 18, "scale": 2, "required": true },
    { "fullName": "Status__c", "type": "Picklist", "values": ["Planning", "Active", "Completed"] },
    { "fullName": "Account__c", "type": "Lookup", "referenceTo": "Account" }
  ]
}
Response: 201 Created
```

---

## Core Algorithms

### Metadata-Driven Query Compilation

Translates a logical query against the virtual schema into a physical query against generic tables:

```
FUNCTION compile_query(org_id, soql_string):
    parsed = parse_soql(soql_string)    // AST: SELECT fields FROM object WHERE conditions

    // Resolve object metadata
    object_meta = metadata_cache.get(org_id, parsed.object_name)
    IF object_meta IS NULL:
        THROW ObjectNotFoundException(parsed.object_name)

    // Map logical fields to physical columns
    select_columns = []
    FOR EACH field IN parsed.select_fields:
        field_meta = object_meta.get_field(field.name)
        IF field_meta IS NULL:
            THROW FieldNotFoundException(field.name)
        IF field_meta.type == 'formula':
            select_columns.ADD(compile_formula(field_meta.formula_expression, object_meta))
        ELSE:
            select_columns.ADD(field_meta.physical_column + " AS " + field.name)

    // Build physical WHERE clause
    where_clause = "org_id = :org_id AND object_type_id = :object_type_id"
    where_clause += " AND is_deleted = false"
    FOR EACH condition IN parsed.where_conditions:
        field_meta = object_meta.get_field(condition.field)
        physical_col = field_meta.physical_column
        value = cast_value(condition.value, field_meta.data_type)
        where_clause += " AND " + physical_col + " " + condition.operator + " :param_N"

    // Handle cross-object relationships (joins)
    join_clauses = []
    FOR EACH relationship IN parsed.relationship_traversals:
        rel_meta = metadata_cache.get_relationship(org_id, relationship.name)
        join_clauses.ADD(
            "JOIN mt_relationship r ON r.parent_record_id = mt_data.record_id " +
            "AND r.relationship_def_id = :rel_id " +
            "JOIN mt_data child ON child.record_id = r.child_record_id"
        )

    // Assemble physical SQL
    physical_sql = "SELECT " + select_columns.join(", ")
    physical_sql += " FROM " + object_meta.data_table_name
    physical_sql += " " + join_clauses.join(" ")
    physical_sql += " WHERE " + where_clause
    physical_sql += compile_order_by(parsed.order_by, object_meta)
    physical_sql += " LIMIT " + MIN(parsed.limit, 50000)  // Governor limit

    RETURN physical_sql
```

### Lead Scoring Algorithm

```
FUNCTION calculate_lead_score(org_id, lead_record):
    scoring_config = metadata_cache.get_scoring_rules(org_id)

    // Phase 1: Rule-based demographic scoring
    demographic_score = 0
    FOR EACH rule IN scoring_config.demographic_rules:
        field_value = lead_record.get(rule.field_name)
        IF matches(field_value, rule.condition):
            demographic_score += rule.points
    demographic_score = CLAMP(demographic_score, 0, scoring_config.max_demographic_score)

    // Phase 2: Behavioral scoring (recency-weighted)
    behavioral_score = 0
    activities = get_recent_activities(org_id, lead_record.id, days=90)
    FOR EACH activity IN activities:
        rule = scoring_config.behavioral_rules.find(activity.type)
        IF rule IS NOT NULL:
            age_days = days_since(activity.timestamp)
            decay_factor = EXP(-scoring_config.decay_rate * age_days)
            behavioral_score += rule.points * decay_factor
    behavioral_score = CLAMP(behavioral_score, 0, scoring_config.max_behavioral_score)

    // Phase 3: ML predictive overlay (optional)
    ml_score = 0
    IF scoring_config.ml_enabled AND ml_model_exists(org_id):
        features = extract_features(lead_record, activities)
        ml_score = ml_model_predict(org_id, features) * scoring_config.max_ml_score

    // Phase 4: Weighted combination
    final_score = (scoring_config.demographic_weight * demographic_score) +
                  (scoring_config.behavioral_weight * behavioral_score) +
                  (scoring_config.ml_weight * ml_score)

    // Phase 5: Determine qualification status
    qualification = 'Unqualified'
    IF final_score >= scoring_config.sql_threshold:
        qualification = 'SQL'
    ELSE IF final_score >= scoring_config.mql_threshold:
        qualification = 'MQL'

    RETURN { score: ROUND(final_score), qualification: qualification }
```

### Trigger Execution Engine

```
FUNCTION execute_save_with_triggers(org_id, object_name, records, operation):
    // Initialize governor context for this transaction
    governor = new GovernorContext(mode='synchronous')

    // Step 1: Load metadata
    object_meta = metadata_cache.get(org_id, object_name)
    trigger_defs = metadata_cache.get_triggers(org_id, object_name, operation)

    // Step 2: System validation
    FOR EACH record IN records:
        validate_field_types(record, object_meta)
        validate_required_fields(record, object_meta)
        check_unique_constraints(record, object_meta)

    // Step 3: Before-triggers (synchronous, can modify records)
    recursion_depth = get_current_recursion_depth()
    IF recursion_depth > 16:
        THROW TriggerRecursionException("Maximum trigger depth exceeded")

    before_triggers = trigger_defs.filter(timing='before')
    FOR EACH trigger IN before_triggers:
        governor.check_limits()  // Throws if any limit exceeded
        records = trigger.execute(records, governor)
        // Trigger may have modified field values on records

    // Step 4: Custom validation rules
    validation_rules = metadata_cache.get_validation_rules(org_id, object_name)
    FOR EACH rule IN validation_rules WHERE rule.is_active:
        FOR EACH record IN records:
            IF evaluate_expression(rule.error_condition, record):
                THROW ValidationException(rule.error_message, rule.error_field)

    // Step 5: DML operation
    governor.increment_dml_count(1)
    governor.increment_dml_rows(records.length)
    governor.check_limits()
    committed_records = database.execute_dml(org_id, object_meta, records, operation)

    // Step 6: After-triggers (synchronous, may trigger cascading saves)
    after_triggers = trigger_defs.filter(timing='after')
    FOR EACH trigger IN after_triggers:
        governor.check_limits()
        trigger.execute(committed_records, governor)

    // Step 7: Workflow rule evaluation (async actions queued)
    workflow_rules = metadata_cache.get_workflows(org_id, object_name)
    FOR EACH rule IN workflow_rules WHERE rule.is_active:
        IF evaluate_entry_criteria(rule, committed_records, operation):
            FOR EACH action IN rule.actions:
                IF action.type == 'field_update':
                    // Inline field update (may re-trigger)
                    execute_field_update(action, committed_records, governor)
                ELSE:
                    // Queue async action (email, callout, task)
                    event_bus.publish('workflow_action', {
                        org_id: org_id,
                        action: action,
                        record_ids: committed_records.map(r => r.id)
                    })

    // Step 8: Rollup summary recalculation
    rollup_fields = get_affected_rollups(org_id, object_meta, committed_records)
    FOR EACH rollup IN rollup_fields:
        recalculate_rollup(rollup, governor)

    // Step 9: Publish change data capture event
    event_bus.publish('cdc', {
        org_id: org_id,
        object: object_name,
        operation: operation,
        records: committed_records,
        changed_fields: get_changed_fields(records, committed_records)
    })

    RETURN committed_records
```

### Formula Field Evaluation

```
FUNCTION evaluate_formula(org_id, formula_expression, record, object_meta):
    // Parse formula into expression tree
    ast = parse_formula(formula_expression)

    FUNCTION evaluate_node(node):
        SWITCH node.type:
            CASE 'field_reference':
                field_meta = object_meta.get_field(node.field_name)
                IF node.has_relationship_prefix:
                    // Cross-object reference: Account.Industry
                    related_record = fetch_related_record(org_id, record, node.relationship)
                    RETURN related_record.get(node.field_name)
                RETURN record.get(field_meta.physical_column)

            CASE 'literal':
                RETURN node.value

            CASE 'binary_op':
                left = evaluate_node(node.left)
                right = evaluate_node(node.right)
                SWITCH node.operator:
                    CASE '+': RETURN left + right
                    CASE '-': RETURN left - right
                    CASE '*': RETURN left * right
                    CASE '/':
                        IF right == 0: RETURN NULL  // Divide by zero → null
                        RETURN left / right
                    CASE '&': RETURN CONCAT(left, right)  // String concat
                    CASE '==': RETURN left == right
                    CASE '>': RETURN left > right
                    // ... other operators

            CASE 'function_call':
                args = node.arguments.map(evaluate_node)
                SWITCH node.function_name:
                    CASE 'IF': RETURN args[0] ? args[1] : args[2]
                    CASE 'ISBLANK': RETURN args[0] IS NULL OR args[0] == ''
                    CASE 'TEXT': RETURN TO_STRING(args[0])
                    CASE 'VALUE': RETURN TO_NUMBER(args[0])
                    CASE 'TODAY': RETURN CURRENT_DATE()
                    CASE 'NOW': RETURN CURRENT_TIMESTAMP()
                    CASE 'ROUND': RETURN ROUND(args[0], args[1])
                    CASE 'MAX': RETURN MAX(args...)
                    CASE 'MIN': RETURN MIN(args...)
                    // ... other functions

    RETURN evaluate_node(ast)
```

### Territory Assignment Algorithm

```
FUNCTION assign_territory(org_id, record):
    // Load territory hierarchy and rules
    territories = metadata_cache.get_territory_model(org_id)
    assignment_rules = territories.get_rules_for_object(record.object_type)

    matched_territories = []
    FOR EACH rule IN assignment_rules (ordered by priority):
        IF evaluate_criteria(rule.criteria, record):
            matched_territories.ADD(rule.territory_id)
            IF rule.stop_on_match:
                BREAK

    IF matched_territories.is_empty():
        RETURN territories.default_territory

    // For multi-territory assignment, assign to all matched
    // For single-territory, use highest priority match
    IF territories.assignment_mode == 'single':
        territory = matched_territories[0]
    ELSE:
        territory = matched_territories

    // Round-robin within territory
    IF territory.assignment_method == 'round_robin':
        members = territory.get_active_members()
        next_index = (territory.last_assigned_index + 1) % members.length
        assigned_owner = members[next_index]
        territory.update_last_assigned_index(next_index)
    ELSE IF territory.assignment_method == 'capacity_weighted':
        members = territory.get_active_members()
        assigned_owner = members.min_by(m => m.current_open_leads / m.capacity)

    RETURN { territory: territory, owner: assigned_owner }
```

### Rollup Summary Calculation

```
FUNCTION recalculate_rollup(org_id, rollup_definition, governor):
    parent_object = rollup_definition.parent_object
    child_object = rollup_definition.child_object
    parent_field = rollup_definition.summary_field
    child_field = rollup_definition.source_field
    operation = rollup_definition.operation  // COUNT, SUM, MIN, MAX
    filter_criteria = rollup_definition.filter

    // Find affected parent records
    affected_parent_ids = get_affected_parent_ids(org_id, child_object, rollup_definition)

    FOR EACH parent_id IN affected_parent_ids:
        // Query child records for this parent
        governor.increment_soql_count(1)
        governor.check_limits()

        children = query(
            "SELECT {child_field} FROM {child_object} " +
            "WHERE {relationship_field} = :parent_id AND org_id = :org_id" +
            (filter_criteria ? " AND " + compile_filter(filter_criteria) : "")
        )

        // Calculate aggregate
        SWITCH operation:
            CASE 'COUNT': result = children.length
            CASE 'SUM':   result = children.sum(c => c[child_field])
            CASE 'MIN':   result = children.min(c => c[child_field])
            CASE 'MAX':   result = children.max(c => c[child_field])

        // Update parent record
        governor.increment_dml_count(1)
        governor.check_limits()
        update_record(org_id, parent_object, parent_id, { [parent_field]: result })

    RETURN affected_parent_ids.length
```

---

## Metadata Cache Architecture

```
LAYER 1: Thread-Local Cache (per-request)
    ├── Object metadata for objects accessed in current request
    ├── Field mappings for queried fields
    └── TTL: request lifetime

LAYER 2: Local Process Cache (per-app-server)
    ├── Full metadata for top 500 most-accessed tenants
    ├── Compiled formula expressions (parsed AST)
    ├── Compiled validation rules
    └── TTL: 5 minutes with event-driven invalidation

LAYER 3: Distributed Cache (shared across app servers)
    ├── Full metadata for all tenants (lazy-loaded)
    ├── Key format: org_id:metadata:{object|field|workflow}:{id}
    └── TTL: 30 minutes with event-driven invalidation

LAYER 4: Database (source of truth)
    └── metadata_object, metadata_field, metadata_relationship, etc.

INVALIDATION FLOW:
    Schema change (admin creates/modifies field)
    → Update metadata tables in database
    → Publish invalidation event: { org_id, object_id, change_type }
    → All app servers receive event, evict LAYER 2 and LAYER 3 entries
    → Next request triggers cache reload from database
```

---

## Record ID Generation

Every record has a globally unique 18-character case-insensitive ID:

```
FUNCTION generate_record_id(object_key_prefix):
    // 3-char object prefix (e.g., '001' for Account, '006' for Opportunity)
    prefix = object_key_prefix

    // 12-char unique segment (base-62 encoded)
    unique_part = base62_encode(snowflake_next_id())
    unique_part = left_pad(unique_part, 12, '0')

    // 3-char case-safety checksum (for case-insensitive comparisons)
    base_id = prefix + unique_part  // 15 chars
    checksum = compute_case_checksum(base_id)

    RETURN base_id + checksum  // 18 chars total
```

The 3-character prefix identifies the object type, enabling the platform to route record ID lookups to the correct object without a metadata query. For example, IDs starting with '00Q' are always Leads, '001' are always Accounts, and tenant-specific custom object prefixes are assigned from a reserved range.
