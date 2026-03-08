# Deep Dive & Bottlenecks

## Deep Dive 1: Ledger Consistency --- Double-Entry Bookkeeping

### The Ledger as the Source of Truth

The defining invariant of a digital wallet system is: **the ledger must always balance**. Every financial operation is recorded as a journal entry containing one or more debit entries and one or more credit entries, where the total debits exactly equal the total credits. This is not merely a best practice---it is the fundamental mechanism that prevents money from being created or destroyed within the system.

```
Invariant: For every journal entry J:
  SUM(debit_entries in J) = SUM(credit_entries in J)

Global invariant: Across the entire ledger:
  SUM(all debits) = SUM(all credits)

If either invariant is violated → the system has a bug that may be creating or losing money.
```

### Why Double-Entry Matters for Digital Wallets

In single-entry bookkeeping, a transfer is recorded as: "User A: -$50, User B: +$50." If the system crashes between these two updates, money is either destroyed (A debited but B not credited) or created (B credited but A not debited).

Double-entry eliminates this by writing both entries in a single atomic transaction, grouped by a journal_id:

```
Journal J-001: P2P Transfer
  Entry 1: DEBIT  User_A_Wallet  $50.00  (journal_id: J-001)
  Entry 2: CREDIT User_B_Wallet  $50.00  (journal_id: J-001)

Both entries committed atomically → money is neither created nor destroyed.
If transaction fails → neither entry exists → balance unchanged.
```

### Immutability Principle

Ledger entries are **append-only**. To reverse a transaction, the system creates a new compensating journal entry---it never modifies or deletes existing entries:

```
Original: Journal J-001
  DEBIT  User_A  $50.00
  CREDIT User_B  $50.00

Reversal: Journal J-001-REV
  CREDIT User_A  $50.00  (reversal: restores A's balance)
  DEBIT  User_B  $50.00  (reversal: removes from B's balance)

Both journals exist in the ledger permanently → full audit trail.
```

### Materialized vs. Computed Balances

A wallet's balance can be computed from the ledger: `balance = SUM(credits) - SUM(debits)`. But at 500M entries per day, this query is prohibitively expensive at read time. The solution is **materialized balances** updated atomically with each ledger write:

```
Within the same DB transaction:
  1. INSERT ledger entry (DEBIT, $50)
  2. UPDATE wallet SET balance_cents = balance_cents - 5000

The materialized balance is a denormalized cache of the ledger state.
Reconciliation jobs verify materialized balances match computed balances.
```

---

## Deep Dive 2: P2P Transfer Atomicity

### The Fundamental Challenge

A P2P transfer involves two wallet updates: debit sender, credit receiver. If both wallets are on the same database shard, this is a single ACID transaction. If they are on different shards---which is the common case at scale---this becomes a distributed transaction problem.

### Same-Shard Transfer (Simple Case)

When sender and receiver hash to the same database shard:

```
Single DB Transaction:
  BEGIN
    SELECT balance FROM wallets WHERE id = sender_id FOR UPDATE;  -- lock sender
    SELECT balance FROM wallets WHERE id = receiver_id FOR UPDATE; -- lock receiver
    -- Always lock in ID order to prevent deadlocks

    CHECK sender.balance >= amount;
    UPDATE wallets SET balance = balance - amount WHERE id = sender_id;
    UPDATE wallets SET balance = balance + amount WHERE id = receiver_id;
    INSERT INTO ledger_entries (DEBIT sender, CREDIT receiver);
  COMMIT
```

This is straightforward: ACID guarantees that either both updates happen or neither does.

### Cross-Shard Transfer (The Hard Case)

When sender is on Shard A and receiver is on Shard B, there is no single transaction that can span both. Three approaches exist:

**Approach 1: Saga with Compensation (Recommended)**

```
Step 1: Debit sender on Shard A
  → Success: proceed to Step 2
  → Failure: abort (no compensation needed)

Step 2: Credit receiver on Shard B
  → Success: transfer complete
  → Failure: compensate Step 1 (re-credit sender on Shard A)

Guarantees: Eventual atomicity (either both happen or both are reversed)
Risk: Brief window where sender is debited but receiver not yet credited
Mitigation: Transfer appears as "PROCESSING" during the window; completes in < 500ms normally
```

**Approach 2: Transfer Ledger (Intermediate Account)**

```
Step 1: Debit sender, credit TRANSFER_HOLDING account (Shard A)
  → Both on same shard → atomic
Step 2: Debit TRANSFER_HOLDING account, credit receiver (Shard B)
  → Both on same shard → atomic

The TRANSFER_HOLDING account acts as an intermediary.
If Step 2 fails, the money sits in TRANSFER_HOLDING and a recovery job completes it.
```

**Approach 3: Serialized via Central Transfer Queue**

```
Write transfer request to a Kafka topic partitioned by sender_id.
A single consumer processes each sender's transfers sequentially:
  1. Debit sender (synchronous to sender's shard)
  2. Credit receiver (synchronous to receiver's shard)
  3. On credit failure: enqueue compensation

Guarantees: Serialized per-sender processing prevents double-spend.
Trade-off: Higher latency (queue processing adds 50-200ms).
```

### Deadlock Prevention in Same-Shard Transfers

When two concurrent transfers happen in opposite directions (A→B and B→A), locking wallets in random order causes deadlock:

```
Problem:
  Transaction 1: LOCK A, then try LOCK B (A→B transfer)
  Transaction 2: LOCK B, then try LOCK A (B→A transfer)
  → Deadlock!

Solution: Always lock wallets in sorted ID order:
  Transaction 1: LOCK min(A,B), then LOCK max(A,B)
  Transaction 2: LOCK min(A,B), then LOCK max(A,B)
  → Same order → no deadlock
```

---

## Deep Dive 3: Double-Spend Prevention

### The Double-Spend Scenario

User has $100 balance. They initiate two $80 transfers simultaneously from two devices:

```
Without protection:
  t=0: Device 1 reads balance: $100 ≥ $80 → proceed
  t=0: Device 2 reads balance: $100 ≥ $80 → proceed
  t=1: Device 1 debits $80 → balance = $20
  t=1: Device 2 debits $80 → balance = -$60 ← ILLEGAL!
```

### Prevention Mechanisms

**Mechanism 1: Pessimistic Locking (SELECT FOR UPDATE)**

```
Each transfer acquires an exclusive lock on the wallet row:
  Device 1: SELECT ... FOR UPDATE (acquires lock)
  Device 2: SELECT ... FOR UPDATE (BLOCKED, waits for lock)
  Device 1: UPDATE balance = 100 - 80 = 20, COMMIT (releases lock)
  Device 2: (acquires lock) SELECT balance → 20 < 80 → REJECT

Result: Only first transfer succeeds. Second is rejected.
Trade-off: Serializes all operations on the same wallet (limits per-wallet TPS)
```

**Mechanism 2: Optimistic Concurrency Control (Version-Based)**

```
Each wallet has a version number. Debit uses compare-and-swap:
  Device 1: Read balance=$100, version=5
  Device 2: Read balance=$100, version=5
  Device 1: UPDATE wallets SET balance=20, version=6
            WHERE id=? AND version=5 AND balance >= 80
            → rows_affected = 1 → success
  Device 2: UPDATE wallets SET balance=20, version=6
            WHERE id=? AND version=5 AND balance >= 80
            → rows_affected = 0 → version mismatch → retry
  Device 2 retry: Read balance=$20, version=6 → 20 < 80 → reject

Result: Same as pessimistic, but without explicit lock.
Trade-off: Retries under contention; better for low-contention wallets.
```

**Mechanism 3: Serialized Per-Wallet Queue**

```
All operations for a wallet are routed to a single-threaded processor:
  Queue for Wallet A: [Transfer $80 (Device 1), Transfer $80 (Device 2)]
  Processor:
    Process Transfer 1: balance $100 → $20 ✓
    Process Transfer 2: balance $20 < $80 → reject ✗

Result: Natural serialization eliminates concurrency.
Trade-off: Queue depth affects latency during bursts.
```

**Recommended approach**: Pessimistic locking for wallets with moderate activity (vast majority). The per-wallet lock duration is very short (< 5ms), so contention is low for normal users. For "hot wallets" (merchant wallets receiving thousands of payments per second), use the serialized queue approach.

---

## Deep Dive 4: Hot Wallet Problem

### What Is a Hot Wallet?

A "hot wallet" is a wallet that receives an extreme number of concurrent transactions, creating a database row-level lock bottleneck. In a digital wallet system, this primarily affects:

1. **Popular merchant wallets** (e.g., a coffee chain receiving 10,000 payments/minute)
2. **Platform system accounts** (escrow, fee collection, promotional accounts)
3. **Viral P2P scenarios** (celebrity collecting donations from millions of fans)

### The Contention Bottleneck

```
Normal wallet: ~5 transactions/hour → lock held for ~5ms → no contention
Hot merchant wallet: 10,000 transactions/minute = 166 TPS
  → Each waits for lock on the same row
  → Lock contention causes queuing: latency grows linearly
  → At 166 TPS with 5ms lock time: ~830ms average wait → unacceptable
```

### Solutions for Hot Wallets

**Solution 1: Sub-Wallets (Sharded Balance)**

```
Split merchant's balance across N sub-wallets:
  MerchantWallet_001 (sub-wallet 1): balance $500
  MerchantWallet_002 (sub-wallet 2): balance $500
  MerchantWallet_003 (sub-wallet 3): balance $500
  ...
  MerchantWallet_016 (sub-wallet 16): balance $500

Each payment credits a random sub-wallet → 16x less contention.
Total balance = SUM(sub-wallet balances) = $8,000.

For merchant debits (withdrawals): debit from sub-wallets sequentially
or periodically rebalance sub-wallets.

Trade-off: Withdrawal is more complex; balance query reads 16 rows.
```

**Solution 2: Async Credit Batching**

```
Instead of crediting the merchant wallet per transaction:
1. Credits are written to a staging table (append-only, no lock contention)
2. A background job batches credits every N seconds:
   - Sum all pending credits for the merchant
   - Apply single UPDATE to merchant wallet balance

Batch interval: 1-5 seconds (latency acceptable for merchant settlement)
1,000 individual credits → 1 batch update = 1000x less contention

Trade-off: Merchant sees settlement with slight delay (seconds, not instant).
```

**Solution 3: In-Memory Accumulator with Periodic Flush**

```
Redis counter accumulates credits in real-time:
  INCRBY merchant:WAL-456:pending_credits 2500   // $25.00 payment

Periodic flush (every 5 seconds):
  pending = GETDEL merchant:WAL-456:pending_credits
  UPDATE wallets SET balance_cents = balance_cents + pending
  INSERT INTO ledger_entries (batch credit entry)

Trade-off: Redis failure could lose pending credits.
Mitigation: WAL (write-ahead log) in Kafka before Redis increment.
```

---

## Deep Dive 5: Refund and Reversal Handling

### Refund Types

```
1. Full Refund: Reverse entire transaction
   Original: DEBIT User $25, CREDIT Merchant $24.50, CREDIT Platform $0.50
   Refund:   CREDIT User $25, DEBIT Merchant $24.50, DEBIT Platform $0.50

2. Partial Refund: Reverse portion of transaction
   Original: DEBIT User $100, CREDIT Merchant $98, CREDIT Platform $2
   Refund:   CREDIT User $30, DEBIT Merchant $29.40, DEBIT Platform $0.60

3. Dispute Reversal: User disputes, funds held pending investigation
   Step 1: DEBIT Merchant $25, CREDIT Dispute_Holding $25
   Step 2 (user wins): DEBIT Dispute_Holding $25, CREDIT User $25
   Step 2 (merchant wins): DEBIT Dispute_Holding $25, CREDIT Merchant $25
```

### Refund Race Condition

```
Problem: Merchant wallet has $50. Two refunds of $40 arrive simultaneously.

  Refund 1: Merchant balance $50 ≥ $40 → debit $40 → balance $10
  Refund 2: Merchant balance $10 < $40 → CANNOT REFUND from merchant wallet

Solution: Platform covers the deficit from a reserve account:
  Refund 2: DEBIT Platform_Reserve $40, CREDIT User $40
  Merchant now owes platform $40 → deducted from next settlement

This is why platforms maintain reserve accounts (receivables from merchants).
```

---

## Bottleneck Analysis

### Bottleneck 1: Ledger Write Throughput

```
Problem: 57,870 peak ledger writes/sec across all shards
         Single PostgreSQL shard maxes at ~15,000 writes/sec with durability

Impact: Insufficient shards → write latency increases → transaction latency degrades

Mitigations:
1. Shard by wallet_id: 8-16 shards for 500M wallets
   - 57,870 / 16 = ~3,617 writes/shard/sec (well within capacity)
2. Append-only ledger: no UPDATE contention on ledger table
3. Batch insert: group multiple ledger entries in single INSERT
4. Separate hot path (writes) from cold path (history queries)
```

### Bottleneck 2: Per-Wallet Lock Contention

```
Problem: Popular wallets (merchants, platform accounts) become lock bottlenecks
         166 TPS on single wallet → 830ms average lock wait

Impact: Payment latency for popular merchants exceeds SLO

Mitigations:
1. Sub-wallets: split hot wallets into 16 sub-wallets (reduces contention 16x)
2. Async credit batching: batch merchant credits every 1-5 seconds
3. Detect hotspots: alert when wallet TPS exceeds threshold → auto-split
```

### Bottleneck 3: Cross-Shard P2P Transfers

```
Problem: ~40% of P2P transfers cross shard boundaries
         Saga pattern adds 50-200ms latency for compensation setup
         Failure of Step 2 requires compensating Step 1

Impact: Cross-shard transfers are slower than same-shard

Mitigations:
1. Locality-aware sharding: co-locate frequent transfer pairs
   (analyze social graph, place friends on same shard)
2. Transfer holding account per shard: reduces cross-shard hops
3. Pre-authorize: debit sender first (fast path),
   credit receiver async (eventual, < 2s guarantee)
```

### Bottleneck 4: Fraud Detection Latency

```
Problem: Inline fraud scoring must complete within 100ms
         ML model needs 50+ features: velocity, device, behavioral, network graph
         Feature retrieval from multiple stores adds latency

Impact: Fraud scoring exceeds budget → transaction latency degrades
        Or: skip fraud check → fraud losses increase

Mitigations:
1. Pre-computed feature store: velocity counters updated on each transaction
   (e.g., Redis: INCR user:123:txn_count_1h, EXPIRE 3600)
2. Model co-location: run inference on same node as feature store
3. Tiered scoring: simple rules (< 10ms) first, ML model only for gray zone
4. Async deep analysis: approve low-risk instantly, flag medium-risk for async review
```

### Bottleneck 5: Reconciliation at Scale

```
Problem: Verifying ledger consistency across 500M ledger entries/day
         Full reconciliation scan is expensive

Impact: Late detection of ledger imbalance → financial loss or regulatory issue

Mitigations:
1. Streaming reconciliation: verify each journal at write time
   (sum debits = sum credits check inline before commit)
2. Incremental hourly reconciliation: only check entries since last run
3. Partitioned reconciliation: each shard reconciles independently
4. Escrow reconciliation: daily comparison of SUM(user balances) vs bank escrow
```
