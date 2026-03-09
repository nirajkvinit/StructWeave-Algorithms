# Deep Dive & Bottlenecks

## 1. Month-End Close --- The ERP's Hardest Batch Problem

Financial close is the single most stressful batch operation in any ERP. During a 4--8 hour window, the system must process thousands of concurrent journal entries, execute inter-company eliminations across dozens of legal entities, revalue foreign-currency balances, generate accruals, and produce a trial balance consistent to the cent. It requires strict serializability---eventual consistency is not acceptable for regulatory reporting.

| Constraint | Typical Scale | Impact |
|-----------|--------------|--------|
| Journal entries per close | 50K--500K | Sustain 2,000+ entries/sec |
| Legal entities | 10--200 | Each runs its own sub-close before consolidation |
| Currency pairs | 30--80 | Every non-functional-currency balance needs revaluation |
| Inter-company transactions | 5K--50K | Must net to zero after elimination |
| Target window | 4--8 hours | CFO expects next-morning reporting readiness |

### Close Pipeline

```mermaid
flowchart TB
    A[Trigger Close] --> B[Pre-Close Validations]
    B --> C{Pass?}
    C -->|No| D[Block + Notify]
    C -->|Yes| E[Accrual Generation]
    E --> F[Currency Revaluation]
    F --> G[Inter-Company Elimination]
    G --> H[Trial Balance]
    H --> I{Balanced?}
    I -->|No| J[Suspense + Alert]
    I -->|Yes| K[Financial Statements]
    K --> L[Lock Period]

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class A,B client
    class C,I api
    class D,J queue
    class E,F,G service
    class H,K,L data
```

### Parallelization and Idempotency

```pseudocode
FUNCTION execute_month_end_close(period, entity_list):
    -- Phase 1: Entity-level parallelism (each entity closes independently)
    close_tasks = []
    FOR EACH entity IN entity_list:
        close_tasks.APPEND(ASYNC execute_entity_close(period, entity))
    entity_results = AWAIT_ALL(close_tasks)

    -- Fail fast on any entity failure
    FOR EACH result IN entity_results:
        IF result.status == FAILED:
            RAISE CloseFailure(result.entity, result.error)

    -- Phase 2: Bottom-up consolidation (parallel within each hierarchy level)
    FOR EACH level IN build_entity_hierarchy(entity_list).bottom_up():
        AWAIT_ALL([ASYNC consolidate(parent, parent.children, period) FOR parent IN level])

    -- Phase 3: Final validation
    trial_balance = compute_trial_balance(root_entity, period)
    ASSERT trial_balance.total_debits == trial_balance.total_credits

FUNCTION execute_entity_close(period, entity):
    checkpoint = load_checkpoint(entity, period)
    -- Resume from last successful stage (idempotent: each stage does DELETE + INSERT)
    IF checkpoint.stage < ACCRUALS:
        generate_accruals(entity, period)
        save_checkpoint(entity, period, ACCRUALS)
    IF checkpoint.stage < REVALUATION:
        revalue_currency_balances(entity, period)
        save_checkpoint(entity, period, REVALUATION)
    IF checkpoint.stage < TRIAL_BALANCE:
        compute_entity_trial_balance(entity, period)
        save_checkpoint(entity, period, TRIAL_BALANCE)
```

Each journal entry carries a **deterministic idempotency key** `HASH(entity_id, period, stage, source_account, currency)`. Restart safety is guaranteed by delete-then-insert within the stage scope. Account-range partitioning (1000--1999 Assets, 2000--2999 Liabilities, etc.) enables parallel trial balance aggregation across workers.

---

## 2. Tenant Data Isolation --- The Noisy Neighbor Problem

### Query-Level Isolation

In shared-schema multi-tenancy, every query must be scoped. A single missed `WHERE tenant_id = ?` leaks data. Defense-in-depth uses both database-enforced row-level security and application-layer predicate injection:

```pseudocode
POLICY tenant_isolation ON all_tables:
    USING (tenant_id = current_session.tenant_id)
    WITH CHECK (tenant_id = current_session.tenant_id)

FUNCTION setup_connection(tenant_id):
    conn = pool.acquire()
    conn.execute("SET app.current_tenant = ?", tenant_id)
    RETURN conn
```

### Resource and Cache Isolation

| Resource | Isolation Mechanism | Enforcement Point |
|---------|---------------------|-------------------|
| DB connections | Per-tenant pools (large), shared with fair scheduling (small) | Connection proxy |
| CPU | cgroup-based quotas per tenant tier | Container orchestrator |
| I/O bandwidth | Priority classes; premium tenants get higher IOPS ceiling | Block storage |
| Concurrent queries | Max active queries per tenant (50 standard, 200 enterprise) | Admission controller |

Cache keys are namespaced `tenant:{id}:{key}`. Per-tenant memory quotas prevent any single tenant from dominating shared cache---LRU eviction targets the over-quota tenant first.

### Bloom Filter Tenant Routing

For partitioned tables, per-partition Bloom filters answer "does this partition contain data for tenant X?" in O(1), skipping irrelevant partitions entirely:

```pseudocode
FUNCTION query_with_bloom_routing(tenant_id, query, partitions):
    relevant = [p FOR p IN partitions IF p.bloom_filter.MIGHT_CONTAIN(tenant_id)]
    RETURN execute_query(query, relevant)
```

---

## 3. Custom Field Performance --- EAV's Achilles' Heel

Enterprise customers add custom fields to any entity. The EAV pattern offers flexibility but degrades query performance---filtering on 3 custom fields requires 3 self-joins, each multiplying cost.

| Approach | Write Cost | Read (1 filter) | Read (3 filters) | Index Support |
|----------|-----------|-----------------|-------------------|---------------|
| Classic EAV | 1x | 8--12x | 25--40x | Poor |
| JSON column (no index) | 1.2x | 5--8x | 15--25x | None |
| JSON + GIN index | 1.5x | 1.5--2x | 2--4x | Equality |
| Hybrid wide-table | 2x | 1.1x | 1.3x | Full |
| Materialized view over EAV | 1x + refresh | 1.2x | 1.5x | Full |

### Tiered Storage Strategy

```pseudocode
FUNCTION resolve_custom_field_storage(tenant_id, entity_type, field_def):
    freq = get_field_query_frequency(tenant_id, entity_type, field_def.name)
    IF freq.queries_per_day > 1000:
        schedule_column_promotion(entity_type, field_def)  -- async DDL
        RETURN TIER_1_PHYSICAL_COLUMN
    ELSE IF freq.queries_per_day > 10:
        RETURN TIER_2_JSON_INDEXED    -- GIN-indexed JSON column
    ELSE:
        RETURN TIER_3_EAV            -- classic flexibility
```

Indexing strategies: **sparse indexes** (only non-null rows), **partial indexes** (scoped to heavy-usage tenant_ids), **expression indexes** (`LOWER(custom_data->>'field')` for case-insensitive search). A nightly job analyzes query patterns and auto-promotes fields across tiers.

---

## 4. Cross-Module Transaction Consistency

### Procure-to-Pay Saga

The P2P flow spans Procurement, Inventory, Accounts Payable, and General Ledger. A saga with compensating transactions replaces distributed transactions:

```mermaid
sequenceDiagram
    participant PO as Procurement
    participant GR as Inventory
    participant INV as Accounts Payable
    participant GL as General Ledger
    participant DLQ as Dead Letter Queue

    PO->>GR: Goods Receipt (PO ref)
    GR->>GR: Validate qty <= PO open qty
    GR-->>PO: Update PO received qty
    INV->>INV: Three-Way Match
    alt Match Success
        INV->>GL: Post journal entry
        GL-->>INV: Confirm posting
    else Match Failure
        INV->>DLQ: Exception queue
    end
    alt GL posting fails
        GL->>GL: Reverse entry
        GL->>INV: Reopen invoice
    end
```

### Three-Way Match Algorithm

```pseudocode
FUNCTION three_way_match(po, goods_receipt, invoice):
    tolerances = get_tenant_tolerances()
    exceptions = []
    FOR EACH line IN invoice.lines:
        po_line = find_matching_po_line(po, line.item_id)
        gr_line = find_matching_gr_line(goods_receipt, line.item_id)
        IF gr_line IS NULL:
            exceptions.APPEND(MatchException("NO_GR", line))
            CONTINUE
        IF ABS(gr_line.qty - line.qty) / gr_line.qty > tolerances.qty_pct:
            exceptions.APPEND(MatchException("QTY_MISMATCH", line, gr_line))
        IF ABS(po_line.unit_price - line.unit_price) / po_line.unit_price > tolerances.price_pct:
            exceptions.APPEND(MatchException("PRICE_MISMATCH", line, po_line))
    IF exceptions.IS_EMPTY():
        RETURN MatchResult(MATCHED, auto_approve = TRUE)
    ELSE:
        RETURN MatchResult(FAILED, exceptions)
```

Failed cross-module events land in a **dead letter queue** with exponential backoff retry. After max retries, the event escalates to an exception dashboard and triggers compensating transactions upstream.

---

## 5. Extension Sandbox Security

### Sandbox Architecture

```mermaid
flowchart TB
    A[Tenant Script] --> B[Parser + AST Analysis]
    B --> C{Safe?}
    C -->|No| D[Reject]
    C -->|Yes| E[Sandbox Runtime]
    E --> F[Whitelisted APIs]
    F --> G[(Tenant-Scoped Data)]
    E --> H[Resource Monitor]
    H -->|Exceeded| I[Kill + Circuit Breaker]

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class A client
    class B,C,H api
    class D,I queue
    class E,F service
    class G data
```

| Resource | Limit | Enforcement |
|---------|-------|-------------|
| CPU time | 500ms per invocation | Wall-clock timer; killed on breach |
| Memory | 64 MB heap | Allocator cap; OOM triggers termination |
| I/O ops | 100 reads, 20 writes | Counted at data access layer |
| Network | Blocked entirely | No outbound calls |
| Loop iterations | 10,000 max | Iteration counter injected at parse time |

The sandbox exposes a **whitelist API surface**---read-heavy by default, write operations require explicit permission grants in the extension manifest. All API calls are audit-logged. A **circuit breaker** trips after N resource-limit violations within a sliding window, disabling the extension until the tenant admin acknowledges and re-enables it.

---

## 6. Multi-Currency at Scale

| Aspect | Real-Time Revaluation | Batch Revaluation |
|--------|----------------------|-------------------|
| Trigger | Every transaction posting | Scheduled (daily/monthly) |
| Performance impact | 2--5ms per transaction | Concentrated batch window |
| Use case | Treasury, FX desks | Standard month-end close |

Most deployments use **batch revaluation** at month-end with real-time spot-rate conversion at transaction time for display only.

### Unrealized Gain/Loss and Triangulation

```pseudocode
FUNCTION compute_unrealized_gain_loss(entity, period_end_date):
    rates = load_period_end_rates(period_end_date)
    entries = []
    FOR EACH balance IN query_open_balances(entity, period_end_date):
        IF balance.currency == entity.functional_currency: CONTINUE
        restated = balance.amount_original * rates.get_rate(balance.currency, entity.functional_currency)
        delta = restated - balance.amount_functional_currency
        IF ABS(delta) > ROUNDING_THRESHOLD:
            entries.APPEND(JournalEntry(
                amount = ABS(delta), reversing = TRUE,
                idempotency_key = HASH(entity.id, period_end_date, balance.account_id, balance.currency)
            ))
    RETURN entries

FUNCTION get_exchange_rate(source, target, rate_table):
    direct = rate_table.get(source, target)
    IF direct IS NOT NULL: RETURN direct
    -- Triangulate through USD or EUR
    FOR EACH base IN ["USD", "EUR"]:
        r1 = rate_table.get(source, base)
        r2 = rate_table.get(base, target)
        IF r1 IS NOT NULL AND r2 IS NOT NULL: RETURN r1 * r2
    RAISE NoExchangeRateAvailable(source, target)
```

### Jurisdiction-Specific Rounding

| Currency | Decimals | Rounding Rule | Smallest Unit |
|----------|---------|---------------|---------------|
| USD | 2 | Half-up | 0.01 |
| JPY | 0 | Half-up | 1 |
| BHD | 3 | Half-up | 0.001 |
| EUR | 2 | Half-even (banker's) | 0.01 |

Cumulative rounding adjustments are tracked and posted to a dedicated rounding-difference account at period end, keeping the trial balance in perfect equilibrium.
