# Requirements and Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Event Append** | Append events to streams with optimistic concurrency | P0 |
| **Event Read** | Read events from a stream (forward/backward, from position) | P0 |
| **Stream Management** | Create, list, and manage event streams | P0 |
| **Optimistic Concurrency** | Prevent concurrent writes with expected version checks | P0 |
| **Global Ordering** | Assign unique global position to each event | P0 |
| **Subscriptions** | Subscribe to streams for real-time event delivery | P0 |
| **Projections** | Build and maintain read models from event streams | P0 |
| **Snapshotting** | Store and retrieve aggregate snapshots | P1 |
| **Catch-up Subscriptions** | Read historical events then switch to live | P1 |
| **Metadata** | Store event and stream metadata | P1 |
| **Event Categories** | Group streams by type (e.g., all order streams) | P2 |
| **Persistent Subscriptions** | Server-side subscription with checkpointing | P2 |

### Event Store Operations

```
┌────────────────────────────────────────────────────────────────────┐
│ EVENT STORE OPERATIONS                                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Write Operations:                                                   │
│ • Append events to stream                                          │
│ • Create stream (implicit on first append)                         │
│ • Store snapshot                                                   │
│ • Update stream metadata                                           │
│                                                                     │
│ Read Operations:                                                    │
│ • Read events from stream (by position range)                      │
│ • Read events from $all stream (global ordering)                   │
│ • Read stream metadata                                             │
│ • Read snapshot                                                    │
│ • Get stream length/head position                                  │
│                                                                     │
│ Subscription Operations:                                            │
│ • Subscribe to stream (volatile - live only)                       │
│ • Subscribe from position (catch-up + live)                        │
│ • Subscribe to $all stream                                         │
│ • Subscribe to category                                            │
│ • Acknowledge event (persistent subscriptions)                     │
│                                                                     │
│ Projection Operations:                                              │
│ • Create/update projection                                         │
│ • Start/stop projection                                            │
│ • Query projection state                                           │
│ • Reset projection (rebuild)                                       │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### API Operations

| Operation | Type | Description |
|-----------|------|-------------|
| Append Events | Sync | Append one or more events to a stream |
| Read Stream Forward | Sync | Read events from position N forward |
| Read Stream Backward | Sync | Read events from position N backward |
| Read All Forward | Sync | Read all events from global position |
| Get Stream Metadata | Sync | Get stream configuration and metadata |
| Subscribe to Stream | Async | Real-time event subscription |
| Subscribe to All | Async | Subscribe to all events globally |
| Create Projection | Sync | Define a new projection |
| Get Projection State | Sync | Query current projection state |
| Store Snapshot | Sync | Persist aggregate snapshot |
| Load Snapshot | Sync | Retrieve latest snapshot |

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Append Latency (p50)** | < 5ms | Fast writes for command handling |
| **Append Latency (p99)** | < 20ms | Consistent write performance |
| **Read Latency (p50)** | < 10ms | Quick state reconstruction |
| **Read Latency (p99)** | < 50ms | Handles longer streams |
| **Subscription Delivery** | < 100ms | Near real-time projections |
| **Replay Throughput** | > 50K events/sec | Fast projection rebuilds |
| **Write Throughput** | > 10K events/sec | High-volume systems |

### Scalability Targets

| Metric | Scale | Notes |
|--------|-------|-------|
| **Total Events** | Billions | Years of history |
| **Streams** | 100M+ | One per aggregate instance |
| **Events per Stream** | Up to 1M | Long-lived aggregates |
| **Event Size** | Up to 1MB | Typical: 1-10KB |
| **Concurrent Writers** | 10K+ | Application instances |
| **Concurrent Subscribers** | 100K+ | Projections and consumers |
| **Projections** | 1000+ | Multiple read models |

### Reliability Requirements

| Requirement | Target | Mechanism |
|-------------|--------|-----------|
| **Availability** | 99.99% | Multi-node replication |
| **Durability** | 99.9999% | Synchronous replication, WAL |
| **Event Ordering** | Strict within stream | Single writer per stream |
| **Global Ordering** | Total ordering | Centralized position assignment |
| **Data Loss** | Zero | Replicated before acknowledgment |
| **Recovery Time** | < 30 seconds | Automatic failover |

### Consistency Guarantees

```
┌────────────────────────────────────────────────────────────────────┐
│ CONSISTENCY MODEL                                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Event Store (Write Side):                                          │
│ • Strong consistency within a stream                               │
│ • Optimistic concurrency control                                   │
│ • Linearizable writes with expected version                        │
│                                                                     │
│ Projections (Read Side):                                           │
│ • Eventually consistent by default                                 │
│ • Configurable: sync projections for strong consistency           │
│ • Projection lag depends on processing speed                       │
│                                                                     │
│ CAP Position:                                                       │
│ • Event Store: CP (Consistency + Partition Tolerance)             │
│ • Projections: AP (Availability + Partition Tolerance)            │
│                                                                     │
│ Guarantees:                                                         │
│ • Events in a stream have strict ordering (causal)                │
│ • Global position provides total ordering across streams          │
│ • Subscriptions deliver events in order (within stream)           │
│ • Projections process events in global order                      │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Capacity Estimation

### Reference System: E-commerce Platform

**Assumptions:**
- 10M active users
- 1M orders per day
- Each order generates ~20 events (created, items added, payment, shipping, etc.)
- 5M product views per day (each generates 1 event)
- 90-day event retention for hot storage
- 7-year archive for compliance

### Event Volume Calculations

```
┌────────────────────────────────────────────────────────────────────┐
│ EVENT VOLUME ESTIMATION                                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Daily Event Generation:                                            │
│   Order events: 1M orders × 20 events = 20M events/day            │
│   User activity: 5M views × 1 event = 5M events/day               │
│   System events: 500K events/day                                   │
│   Total: ~25M events/day                                           │
│                                                                     │
│ Event Rate:                                                         │
│   Average: 25M / 86,400 = ~290 events/sec                         │
│   Peak (10x): ~3,000 events/sec                                    │
│   Black Friday (50x): ~15,000 events/sec                          │
│                                                                     │
│ Event Size:                                                         │
│   Metadata (type, timestamp, stream, version): ~200 bytes         │
│   Typical payload: ~500 bytes                                      │
│   Average event size: ~700 bytes                                   │
│                                                                     │
│ Daily Storage:                                                      │
│   25M events × 700 bytes = 17.5 GB/day                            │
│   With indexes: ~25 GB/day                                         │
│                                                                     │
│ 90-Day Hot Storage:                                                │
│   25 GB × 90 days = 2.25 TB                                       │
│                                                                     │
│ 7-Year Archive:                                                    │
│   25 GB × 365 days × 7 years = 64 TB                              │
│   Compressed (5:1): ~13 TB                                         │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Stream and Snapshot Sizing

```
┌────────────────────────────────────────────────────────────────────┐
│ STREAM AND SNAPSHOT ESTIMATION                                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Stream Count:                                                       │
│   Order streams: 1M/day × 365 = 365M/year                         │
│   User streams: 10M (long-lived)                                   │
│   Product streams: 1M                                              │
│   Total active streams: ~400M                                      │
│                                                                     │
│ Events per Stream:                                                  │
│   Order: ~20 events (short-lived)                                 │
│   User: ~1000 events/year (activity history)                      │
│   Product: ~100 events/year (updates)                             │
│                                                                     │
│ Snapshot Strategy:                                                  │
│   Snapshot every 100 events                                        │
│   Order streams: No snapshots (short)                             │
│   User streams: 10 snapshots/year each                            │
│   Product streams: 1 snapshot/year each                           │
│                                                                     │
│ Snapshot Storage:                                                   │
│   Average snapshot size: 5KB                                       │
│   User snapshots: 10M × 10 × 5KB = 500 GB/year                    │
│   Product snapshots: 1M × 1 × 5KB = 5 GB/year                     │
│   Total: ~500 GB/year                                              │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Projection Sizing

```
┌────────────────────────────────────────────────────────────────────┐
│ PROJECTION ESTIMATION                                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Projection Types:                                                   │
│   1. Order List (for customer)                                     │
│   2. Product Inventory                                             │
│   3. Revenue Analytics                                             │
│   4. User Dashboard                                                │
│   5. Search Index                                                  │
│                                                                     │
│ Projection Processing Rate:                                        │
│   Must keep up with: 3,000 events/sec (peak)                      │
│   Processing overhead: ~1ms/event                                  │
│   Required: 3+ projection workers                                  │
│                                                                     │
│ Projection Storage:                                                 │
│   Varies by projection type                                        │
│   Order List: 1M orders × 1KB = 1 GB                              │
│   Inventory: 1M products × 500 bytes = 500 MB                     │
│   Analytics: Aggregated, ~10 GB                                    │
│   Total projections: ~50 GB                                        │
│                                                                     │
│ Checkpoint Storage:                                                 │
│   Per projection: ~100 bytes                                       │
│   Total: Negligible                                                │
│                                                                     │
│ Rebuild Time (cold start):                                         │
│   90 days × 25M events = 2.25B events                             │
│   At 50K events/sec = ~12 hours                                    │
│   With parallelism (10x): ~1.2 hours                              │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Infrastructure Sizing

```
┌────────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE REQUIREMENTS                                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Event Store Cluster:                                               │
│   Nodes: 3-5 (for HA and read scaling)                            │
│   CPU: 8-16 cores per node                                        │
│   Memory: 64-128 GB per node (caching)                            │
│   Storage: NVMe SSD, 1-2 TB per node                              │
│   Network: 10 Gbps                                                 │
│                                                                     │
│ Projection Workers:                                                 │
│   Instances: 5-10                                                  │
│   CPU: 4-8 cores                                                   │
│   Memory: 16-32 GB                                                 │
│                                                                     │
│ Read Model Databases:                                              │
│   Type: PostgreSQL/MongoDB for projections                        │
│   Size: 100-500 GB per read model                                 │
│   Replicas: 2-3 for read scaling                                  │
│                                                                     │
│ Snapshot Store:                                                    │
│   Storage: Object storage or dedicated DB                          │
│   Size: 500 GB - 1 TB                                             │
│                                                                     │
│ Archive Storage:                                                   │
│   Type: Object storage (cold)                                     │
│   Size: 15 TB (compressed, 7 years)                               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Service Level Objectives (SLOs)

### Latency SLOs

| Operation | p50 | p95 | p99 | p99.9 |
|-----------|-----|-----|-----|-------|
| Append Event | 3ms | 8ms | 15ms | 30ms |
| Read Stream (100 events) | 5ms | 15ms | 30ms | 50ms |
| Read with Snapshot | 3ms | 10ms | 20ms | 40ms |
| Subscription Delivery | 50ms | 100ms | 200ms | 500ms |
| Projection Query | 5ms | 20ms | 50ms | 100ms |
| Snapshot Read | 2ms | 5ms | 10ms | 20ms |

### Availability SLOs

| Component | SLO | Allowed Downtime/Year |
|-----------|-----|----------------------|
| Event Store (writes) | 99.99% | 52.6 minutes |
| Event Store (reads) | 99.99% | 52.6 minutes |
| Projections | 99.9% | 8.76 hours |
| Subscriptions | 99.9% | 8.76 hours |
| Snapshot Store | 99.99% | 52.6 minutes |
| Admin API | 99.9% | 8.76 hours |

### Data SLOs

| Metric | Target |
|--------|--------|
| Event Durability | 99.9999% |
| Event Ordering (stream) | 100% correct |
| Global Position Accuracy | 100% monotonic |
| Projection Lag (p99) | < 5 seconds |
| Snapshot Freshness | < 100 events behind |

---

## Use Cases

### Primary Use Case: Order Lifecycle

```
┌────────────────────────────────────────────────────────────────────┐
│ ORDER LIFECYCLE EVENT SOURCING                                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Stream: "order-{orderId}"                                          │
│                                                                     │
│ Events:                                                             │
│   1. OrderCreated                                                  │
│      {customerId, items[], shippingAddress}                        │
│                                                                     │
│   2. ItemAdded                                                     │
│      {productId, quantity, price}                                  │
│                                                                     │
│   3. ItemRemoved                                                   │
│      {productId}                                                   │
│                                                                     │
│   4. OrderSubmitted                                                │
│      {submittedAt}                                                 │
│                                                                     │
│   5. PaymentReceived                                               │
│      {paymentId, amount, method}                                   │
│                                                                     │
│   6. OrderConfirmed                                                │
│      {confirmedAt}                                                 │
│                                                                     │
│   7. OrderShipped                                                  │
│      {trackingNumber, carrier}                                     │
│                                                                     │
│   8. OrderDelivered                                                │
│      {deliveredAt, signature}                                      │
│                                                                     │
│ Projections:                                                        │
│   • OrderSummary: Current state for customer view                 │
│   • OrderHistory: Full timeline for support                       │
│   • RevenueByDay: Aggregated for analytics                        │
│   • InventoryLevels: Product availability                         │
│                                                                     │
│ Benefits:                                                           │
│   • Complete audit trail                                           │
│   • Easy to answer "what was order state at time T?"              │
│   • Can rebuild any view from events                              │
│   • Support debugging ("why did this order fail?")                │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Secondary Use Case: User Activity Tracking

```
┌────────────────────────────────────────────────────────────────────┐
│ USER ACTIVITY TRACKING                                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Stream: "user-{userId}"                                            │
│                                                                     │
│ Events:                                                             │
│   UserRegistered, ProfileUpdated, PasswordChanged,                 │
│   EmailVerified, PreferencesChanged, ProductViewed,                │
│   ItemAddedToCart, OrderPlaced, ReviewSubmitted                    │
│                                                                     │
│ Projections:                                                        │
│   • UserProfile: Current profile state                            │
│   • ActivityFeed: Recent actions for dashboard                    │
│   • Recommendations: ML features from behavior                    │
│   • SecurityAudit: Login/password change history                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Use Case: Financial Transactions

```
┌────────────────────────────────────────────────────────────────────┐
│ FINANCIAL TRANSACTIONS                                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Stream: "account-{accountId}"                                      │
│                                                                     │
│ Events:                                                             │
│   AccountOpened, DepositMade, WithdrawalMade, TransferInitiated,  │
│   TransferCompleted, InterestApplied, FeeCharged, AccountFrozen   │
│                                                                     │
│ Critical Requirements:                                              │
│   • Immutability: Regulatory compliance                           │
│   • Auditability: Every balance change tracked                    │
│   • Reconciliation: Can replay to verify balances                 │
│   • Point-in-time: Balance at any historical moment               │
│                                                                     │
│ Projections:                                                        │
│   • CurrentBalance: Real-time balance                             │
│   • DailyStatement: End-of-day positions                          │
│   • AuditLog: Compliance reporting                                │
│   • FraudDetection: Pattern analysis                              │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Constraints and Assumptions

### Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **Event Immutability** | Cannot fix bad events | Compensating events, schema evolution |
| **Stream Ordering** | Single writer per stream | Aggregate-level concurrency only |
| **Projection Lag** | Stale reads possible | Sync projections for critical reads |
| **Event Size Limits** | Large payloads problematic | Store references, not data |
| **Schema Changes** | Old events need migration | Upcasting/downcasting |

### Operational Constraints

| Constraint | Description |
|------------|-------------|
| **Replay Time** | Long streams slow to replay |
| **Projection Rebuilds** | Can take hours for large systems |
| **Storage Growth** | Events accumulate forever |
| **Debugging Complexity** | Need tools to inspect event streams |
| **Team Learning Curve** | Different paradigm from CRUD |

### Assumptions

1. **Events are immutable**: Once written, never modified or deleted
2. **Streams are append-only**: Events only added, never removed
3. **Ordering matters**: Events must be processed in order
4. **Idempotent projections**: Reprocessing same event is safe
5. **Eventual consistency acceptable**: For most read models
6. **Event schema evolves**: Over time, event formats will change

---

## Out of Scope

| Feature | Reason | Alternative |
|---------|--------|-------------|
| **Real-time analytics** | Different problem domain | Use dedicated analytics system |
| **Full-text search** | Specialized indexing | External search engine |
| **Graph queries** | Different data model | Graph database |
| **Complex aggregations** | Compute-heavy | OLAP data warehouse |
| **Multi-region active-active** | Extreme complexity | Active-passive with failover |

---

## Comparison with Alternatives

### Storage Approach Comparison

| Approach | State | History | Query | Complexity |
|----------|-------|---------|-------|------------|
| **CRUD + Audit Log** | Direct | Separate table | Fast | Low |
| **Change Data Capture** | Direct | Derived from DB | Fast | Medium |
| **Event Sourcing** | Derived | Primary store | Projections | High |
| **Temporal Database** | Versioned | Built-in | Native | Medium |

### Event Store Implementation Options

| Option | Type | Pros | Cons |
|--------|------|------|------|
| **EventStoreDB** | Purpose-built | Native features, projections | Operational overhead |
| **PostgreSQL + custom** | RDBMS-based | Familiar, ACID | DIY projections |
| **Kafka** | Log-based | High throughput, ecosystem | No built-in projections |
| **DynamoDB Streams** | Managed | Serverless, AWS integration | Vendor lock-in |
| **Marten (PostgreSQL)** | Library | .NET native, document store | .NET only |

---

## Summary

| Category | Key Metric |
|----------|------------|
| **Scale** | 25M events/day, 400M streams |
| **Latency** | < 5ms append (p50), < 100ms subscription delivery |
| **Availability** | 99.99% event store, 99.9% projections |
| **Durability** | 99.9999% (zero data loss) |
| **Storage** | 25 GB/day, 2.25 TB hot, 13 TB archive |
| **Rebuild Time** | < 2 hours (parallelized) |
