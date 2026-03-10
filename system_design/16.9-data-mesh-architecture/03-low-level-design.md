# Low-Level Design — Data Mesh Architecture

## Data Model

### Data Product Descriptor

The data product descriptor is the fundamental metadata record — a machine-readable YAML specification that fully describes a data product's schema, ownership, quality guarantees, and access policies.

```
┌──────────────────────────────────────────────────────────────┐
│ Data Product Descriptor                                       │
├──────────────────┬───────────────────────────────────────────┤
│ id               │ Globally unique URN (urn:dp:<domain>:<name>:<version>) │
│ name             │ Human-readable name                        │
│ domain           │ Owning business domain                     │
│ owner            │ Team and individual accountable             │
│ version          │ Semantic version (major.minor.patch)        │
│ status           │ DRAFT / PUBLISHED / DEPRECATED / RETIRED   │
│ description      │ Purpose, business context, intended use     │
│ schema           │ Typed column definitions with constraints   │
│ data_contract_id │ Reference to the governing data contract    │
│ quality_rules    │ Freshness, completeness, uniqueness rules   │
│ slo              │ Declared SLOs (freshness, availability)     │
│ access_policy    │ Who can read, under what conditions         │
│ lineage          │ Declared upstream dependencies              │
│ output_ports     │ Interfaces for consumption (SQL, API, file) │
│ tags             │ Searchable classification tags               │
│ created_at       │ Timestamp of initial publication             │
│ updated_at       │ Timestamp of last modification               │
└──────────────────┴───────────────────────────────────────────┘
```

### Data Contract Schema

```
┌──────────────────────────────────────────────────────────────┐
│ Data Contract                                                 │
├──────────────────┬───────────────────────────────────────────┤
│ contract_id      │ Globally unique identifier                 │
│ producer_id      │ Data product URN of the producer           │
│ version          │ Contract version (semantic versioning)     │
│ schema           │ Field definitions with types and constraints│
│   ├─ field_name  │ Column/field name                          │
│   ├─ data_type   │ STRING, INT64, FLOAT64, TIMESTAMP, etc.   │
│   ├─ nullable    │ Whether NULL values are permitted          │
│   ├─ description │ Semantic meaning of the field              │
│   └─ constraints │ Uniqueness, range, enum, regex patterns    │
│ quality          │ Quality expectations                       │
│   ├─ freshness   │ Maximum age of data (e.g., < 24 hours)    │
│   ├─ completeness│ Minimum non-NULL percentage per field      │
│   ├─ uniqueness  │ Fields that must be unique                 │
│   └─ custom_rules│ Domain-specific validation expressions     │
│ evolution_rules  │ Allowed schema changes                     │
│   ├─ compatibility│ BACKWARD, FORWARD, FULL, NONE            │
│   ├─ allowed_ops │ Add column, widen type, make nullable      │
│   └─ forbidden_ops│ Remove column, narrow type, rename        │
│ sla              │ Service-level agreement                    │
│   ├─ availability│ Minimum uptime percentage                  │
│   ├─ latency     │ Maximum query response time                │
│   └─ update_freq │ How often data is refreshed                │
│ consumers        │ List of registered consumer subscriptions  │
│ effective_from   │ When this contract version takes effect    │
│ deprecated_at    │ When this version is scheduled for sunset  │
└──────────────────┴───────────────────────────────────────────┘
```

### Governance Policy Model

```
┌──────────────────────────────────────────────────────────────┐
│ Governance Policy                                             │
├──────────────────┬───────────────────────────────────────────┤
│ policy_id        │ Globally unique identifier                 │
│ name             │ Human-readable policy name                 │
│ scope            │ GLOBAL / DOMAIN / DATA_PRODUCT             │
│ category         │ NAMING, QUALITY, SECURITY, COMPLIANCE, ... │
│ rule_type        │ SCHEMA_CHECK / QUALITY_CHECK / ACCESS_CHECK│
│ rule_definition  │ Executable rule (expression or code ref)   │
│ severity         │ ERROR (blocks publish) / WARNING (advisory)│
│ message_template │ Human-readable violation message            │
│ applies_to       │ Filter: which products/domains this covers │
│ created_by       │ Governance federation member                │
│ version          │ Policy version                             │
│ active           │ Whether policy is currently enforced       │
└──────────────────┴───────────────────────────────────────────┘
```

### Lineage Graph Model

The lineage service maintains a directed acyclic graph (DAG) where:

- **Nodes** represent data products, columns, transformation steps, and consumers
- **Edges** represent data flow dependencies (upstream → downstream)

```
┌──────────────────────────────────────────────────────────────┐
│ Lineage Node                                                  │
├──────────────────┬───────────────────────────────────────────┤
│ node_id          │ Unique identifier                          │
│ node_type        │ DATA_PRODUCT / COLUMN / TRANSFORM / CONSUMER│
│ entity_ref       │ Reference to the catalog entity             │
│ domain           │ Owning domain                              │
│ metadata         │ Type-specific attributes                    │
└──────────────────┴───────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Lineage Edge                                                  │
├──────────────────┬───────────────────────────────────────────┤
│ source_id        │ Upstream node                              │
│ target_id        │ Downstream node                            │
│ edge_type        │ DERIVES_FROM / TRANSFORMS / CONSUMED_BY    │
│ transformation   │ Description of the transformation logic    │
│ confidence       │ AUTO_DETECTED / DECLARED / INFERRED        │
│ created_at       │ When this dependency was recorded          │
└──────────────────┴───────────────────────────────────────────┘
```

### Indexing Strategy

| Index Type | Structure | Use Case |
|-----------|-----------|----------|
| **Full-Text Search Index** | Inverted index on product name, description, tags | Catalog discovery by keyword |
| **Domain Index** | B-tree on domain field | Filter products by domain |
| **Quality Score Index** | Sorted index on composite quality score | Rank products by trustworthiness |
| **Lineage Adjacency Index** | Graph adjacency list | Fast upstream/downstream traversal |
| **Contract Consumer Index** | B-tree on (producer_id, consumer_id) | Find all consumers of a contract |
| **Policy Scope Index** | B-tree on (scope, category) | Fast policy lookup during evaluation |

---

## API Design

### Data Product Catalog API

```
POST   /v1/catalog/products                       → Register new data product
GET    /v1/catalog/products                       → List/search data products
GET    /v1/catalog/products/{product_id}          → Get product details
PUT    /v1/catalog/products/{product_id}          → Update product metadata
DELETE /v1/catalog/products/{product_id}          → Deprecate/retire product

GET    /v1/catalog/products/{product_id}/schema   → Get current schema
GET    /v1/catalog/products/{product_id}/versions → List all versions

GET    /v1/catalog/search?q={query}&domain={domain}&quality_min={score}
       → Full-text search with filters
```

**Product Registration Request:**

```
POST /v1/catalog/products
Content-Type: application/yaml
Authorization: Bearer {domain_team_token}

Request:
  id: "urn:dp:sales:customer-ltv:1.0.0"
  name: "Customer Lifetime Value"
  domain: "sales"
  owner:
    team: "sales-analytics"
    contact: "sales-data@company.com"
  schema:
    fields:
      - name: customer_id
        type: STRING
        nullable: false
        description: "Unique customer identifier"
      - name: ltv_score
        type: FLOAT64
        nullable: false
        description: "Predicted lifetime value in USD"
      - name: segment
        type: STRING
        nullable: false
        description: "Customer segment classification"
  quality:
    freshness: "< 24 hours"
    completeness:
      customer_id: 100%
      ltv_score: 99.5%
  output_ports:
    - type: SQL
      endpoint: "trino://catalog/sales/customer_ltv"
    - type: FILE
      format: PARQUET
      location: "object-storage://sales/customer-ltv/latest/"

Response:
  status: "PUBLISHED"
  product_id: "urn:dp:sales:customer-ltv:1.0.0"
  governance_result:
    passed: true
    policies_evaluated: 12
    warnings: 1
    warning_details: ["WARN: Consider adding PII classification for customer_id"]
  registered_at: "2026-03-10T14:30:00Z"
```

### Governance API

```
POST   /v1/governance/policies                    → Create governance policy
GET    /v1/governance/policies                    → List policies (by scope/category)
PUT    /v1/governance/policies/{policy_id}        → Update policy
DELETE /v1/governance/policies/{policy_id}        → Deactivate policy

POST   /v1/governance/evaluate                    → Evaluate product against all applicable policies
GET    /v1/governance/evaluate/{product_id}/history → Past evaluation results
```

### Lineage API

```
GET    /v1/lineage/{product_id}/upstream          → Get upstream dependencies
GET    /v1/lineage/{product_id}/downstream        → Get downstream dependents
GET    /v1/lineage/{product_id}/graph?depth={n}   → Full dependency graph to depth N
GET    /v1/lineage/{product_id}/impact            → Impact analysis (who breaks if this changes)

POST   /v1/lineage/declare                        → Declare lineage dependency
```

### Access Management API

```
POST   /v1/access/request                         → Request access to a data product
GET    /v1/access/products/{product_id}/policies   → Get access policies
POST   /v1/access/evaluate                        → Evaluate access for a consumer identity
GET    /v1/access/audit/{product_id}              → Access audit log
```

### Idempotency

- All registration and policy creation operations accept an optional `Idempotency-Key` header
- Re-registration of the same product version returns the existing record without side effects
- Policy evaluation is inherently idempotent (same input → same output)

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Catalog search (read) | 1,000/min per consumer | Sliding window |
| Product registration (write) | 100/min per domain | Sliding window |
| Governance evaluation | 200/min per domain | Sliding window |
| Lineage query | 500/min per consumer | Sliding window |
| Access evaluation | 10,000/min per consumer | Sliding window |

### Versioning

- API versioned via URL path: `/v1/catalog/products`
- Data products use semantic versioning: `MAJOR.MINOR.PATCH`
- Contracts specify compatibility mode (BACKWARD, FORWARD, FULL)

---

## Core Algorithms

### 1. Data Product Discovery and Ranking

```
FUNCTION discover_products(query, filters, consumer_context):
    // Step 1: Full-text search on metadata
    candidates = search_index.query(query)

    // Step 2: Apply filters (domain, quality, freshness, tags)
    filtered = List()
    FOR EACH product IN candidates:
        IF matches_filters(product, filters):
            filtered.add(product)

    // Step 3: Compute relevance score
    FOR EACH product IN filtered:
        text_score = compute_text_relevance(query, product.metadata)
        quality_score = product.quality_composite_score  // 0.0 - 1.0
        freshness_score = compute_freshness_score(product.last_updated)
        popularity_score = compute_popularity(product.consumption_count)
        trust_score = product.slo_compliance_rate  // % of time SLOs are met

        // Weighted composite ranking
        product.rank = (0.30 * text_score) +
                       (0.25 * quality_score) +
                       (0.20 * trust_score) +
                       (0.15 * freshness_score) +
                       (0.10 * popularity_score)

    // Step 4: Boost products from consumer's own domain
    FOR EACH product IN filtered:
        IF product.domain == consumer_context.domain:
            product.rank *= 1.15  // 15% boost for same-domain

    // Step 5: Sort and return top-K
    SORT filtered BY rank DESCENDING
    RETURN filtered[0:K]

// Time:  O(n * log(n)) where n = candidate count
// Space: O(n) for scoring and sorting
```

### 2. Federated Governance Policy Evaluation

```
FUNCTION evaluate_governance(product_descriptor):
    // Step 1: Collect applicable policies
    applicable = List()
    FOR EACH policy IN all_active_policies:
        IF policy.scope == GLOBAL:
            applicable.add(policy)
        ELSE IF policy.scope == DOMAIN AND policy.applies_to == product_descriptor.domain:
            applicable.add(policy)
        ELSE IF policy.scope == DATA_PRODUCT AND policy.applies_to == product_descriptor.id:
            applicable.add(policy)

    // Step 2: Sort by priority (SECURITY > COMPLIANCE > QUALITY > NAMING)
    SORT applicable BY category_priority DESCENDING

    // Step 3: Evaluate each policy
    results = List()
    has_error = FALSE
    FOR EACH policy IN applicable:
        result = execute_policy_rule(policy.rule_definition, product_descriptor)

        IF result.passed == FALSE:
            results.add({
                policy: policy,
                severity: policy.severity,
                message: format_message(policy.message_template, result.details)
            })
            IF policy.severity == ERROR:
                has_error = TRUE

    // Step 4: Return evaluation result
    RETURN {
        passed: NOT has_error,
        total_evaluated: applicable.size(),
        errors: results.filter(r => r.severity == ERROR),
        warnings: results.filter(r => r.severity == WARNING),
        evaluated_at: current_timestamp()
    }

// Time:  O(p * c) where p = number of policies, c = average rule evaluation cost
// Space: O(p) for results
```

### 3. Data Contract Compatibility Validation

```
FUNCTION validate_contract_compatibility(new_schema, existing_contract, compatibility_mode):
    violations = List()

    IF compatibility_mode == BACKWARD:
        // New schema must be readable by existing consumers
        // Allowed: add optional columns, widen types
        // Forbidden: remove columns, narrow types, add required columns

        FOR EACH field IN existing_contract.schema.fields:
            new_field = new_schema.find_field(field.name)

            IF new_field is NULL:
                violations.add("REMOVED_FIELD: " + field.name + " exists in contract but missing in new schema")

            ELSE IF NOT is_type_compatible(field.data_type, new_field.data_type):
                violations.add("INCOMPATIBLE_TYPE: " + field.name + " changed from " +
                              field.data_type + " to " + new_field.data_type)

            ELSE IF field.nullable == TRUE AND new_field.nullable == FALSE:
                violations.add("NULLABLE_RESTRICTION: " + field.name + " was nullable, now required")

        FOR EACH new_field IN new_schema.fields:
            IF new_field NOT IN existing_contract.schema.fields:
                IF new_field.nullable == FALSE AND new_field.default is NULL:
                    violations.add("REQUIRED_ADDITION: New required field " +
                                  new_field.name + " without default breaks existing consumers")

    ELSE IF compatibility_mode == FORWARD:
        // Existing consumers must be able to read new schema
        // (inverse of backward)
        violations = validate_forward(new_schema, existing_contract)

    ELSE IF compatibility_mode == FULL:
        // Both backward and forward compatible
        backward_violations = validate_contract_compatibility(new_schema, existing_contract, BACKWARD)
        forward_violations = validate_contract_compatibility(new_schema, existing_contract, FORWARD)
        violations = backward_violations + forward_violations

    RETURN {
        compatible: violations.is_empty(),
        violations: violations,
        compatibility_mode: compatibility_mode
    }

FUNCTION is_type_compatible(old_type, new_type):
    // Type widening rules
    compatible_promotions = {
        INT32: [INT64, FLOAT64],
        INT64: [FLOAT64],
        FLOAT32: [FLOAT64],
        STRING: [STRING]  // STRING is terminal
    }
    RETURN new_type == old_type OR new_type IN compatible_promotions[old_type]

// Time:  O(f) where f = number of fields in schema
// Space: O(v) where v = number of violations
```

### 4. Cross-Domain Lineage Traversal

```
FUNCTION trace_lineage(product_id, direction, max_depth):
    // BFS traversal of the lineage DAG
    visited = HashSet()
    queue = Queue()
    result = Graph()

    queue.enqueue((product_id, depth=0))
    visited.add(product_id)

    WHILE queue is not empty:
        (current_id, depth) = queue.dequeue()

        IF depth >= max_depth:
            CONTINUE

        IF direction == UPSTREAM:
            edges = lineage_graph.get_incoming_edges(current_id)
        ELSE:  // DOWNSTREAM
            edges = lineage_graph.get_outgoing_edges(current_id)

        FOR EACH edge IN edges:
            neighbor_id = edge.source IF direction == UPSTREAM ELSE edge.target

            result.add_edge(edge)

            IF neighbor_id NOT IN visited:
                visited.add(neighbor_id)
                queue.enqueue((neighbor_id, depth + 1))

                // Annotate with cross-domain flag
                neighbor_domain = get_domain(neighbor_id)
                current_domain = get_domain(current_id)
                IF neighbor_domain != current_domain:
                    edge.metadata["cross_domain"] = TRUE

    // Enrich nodes with catalog metadata
    FOR EACH node_id IN visited:
        product = catalog.get(node_id)
        result.nodes[node_id].metadata = {
            name: product.name,
            domain: product.domain,
            quality_score: product.quality_score,
            status: product.status
        }

    RETURN result

// Time:  O(V + E) where V = visited products, E = lineage edges
// Space: O(V + E) for the result graph
```

### 5. Impact Analysis (What Breaks If This Product Changes)

```
FUNCTION impact_analysis(product_id, proposed_change):
    // Step 1: Find all downstream dependents (transitive)
    downstream = trace_lineage(product_id, DOWNSTREAM, max_depth=10)

    // Step 2: For each downstream product, check contract compatibility
    impacts = List()
    FOR EACH dependent IN downstream.nodes:
        contract = get_contract_between(product_id, dependent.id)

        IF contract is not NULL:
            compatibility = validate_contract_compatibility(
                proposed_change.new_schema,
                contract,
                contract.evolution_rules.compatibility
            )

            IF NOT compatibility.compatible:
                impacts.add({
                    product: dependent,
                    contract: contract,
                    violations: compatibility.violations,
                    severity: "BREAKING",
                    distance: downstream.shortest_path_length(product_id, dependent.id)
                })

    // Step 3: Sort by severity and distance (closest dependents first)
    SORT impacts BY (severity DESC, distance ASC)

    RETURN {
        total_downstream: downstream.nodes.size(),
        breaking_impacts: impacts.filter(i => i.severity == "BREAKING"),
        non_breaking_downstream: downstream.nodes.size() - impacts.size(),
        recommendation: IF impacts.is_empty() THEN "SAFE_TO_PUBLISH"
                       ELSE "COORDINATE_WITH_" + impacts.size() + "_CONSUMERS"
    }

// Time:  O(D * F) where D = downstream products, F = fields per schema
// Space: O(D) for impact results
```
