# Scalability & Reliability — AI-Native Mobile Money Super App Platform

## Scaling Strategy: From 1,000 to 12,000 TPS

### Current Scale and Growth Trajectory

M-Pesa's infrastructure evolved from ~1,000 TPS (2020) to 4,000 TPS (2024) to a target of 8,000–12,000 TPS (2026) as the platform transitioned to cloud-native architecture. The scaling challenge is not just raw throughput—it's maintaining sub-second latency, exactly-once financial semantics, and 99.995% availability while scaling 12× in 5 years.

### Ledger Scaling — The Core Bottleneck

The double-entry ledger is the serialization point for all financial transactions. Every P2P transfer, cash-in, cash-out, bill payment, and loan disbursement must write to this ledger with ACID guarantees. Scaling strategies:

**1. Wallet-Level Sharding:** Partition wallets across database shards using consistent hashing on `wallet_id`. A P2P transfer between two wallets on different shards requires a distributed transaction (two-phase commit). To minimize cross-shard transactions:
- Route wallet pairs that frequently transact together to the same shard (affinity-based sharding using transaction graph analysis)
- For cross-shard transactions, use a saga pattern with compensation: debit sender (shard A) → credit receiver (shard B); if credit fails, compensate by crediting sender back

**2. Country-Level Isolation:** Each country's ledger operates independently—no cross-country ledger transactions exist (cross-border remittance uses corridor-specific settlement). This provides natural isolation: Kenya's peak hours (8 AM–8 PM EAT) partially overlap with but don't fully coincide with Ghana's (8 AM–8 PM GMT), distributing load temporally.

**3. Read Replicas for Non-Transactional Queries:** Balance checks, transaction history, and analytics queries route to read replicas with <100ms replication lag. Only balance-modifying operations hit the primary.

**4. Hot Wallet Partitioning:** Super-agent wallets, merchant wallets, and system fee wallets receive thousands of concurrent transactions. These hot wallets use balance bucketing: the wallet's balance is split across 10–50 partitions, each updated independently. Total balance = sum of partitions. This reduces contention by the partition factor.

### USSD Session Scaling — Millions of Concurrent Sessions

At peak, the platform handles ~1,700 USSD sessions per second, with an average session duration of 35 seconds. This means ~60,000 concurrent sessions. Scaling considerations:

**Session Store:** In-memory distributed cache with hash-based sharding on `session_id`. Each session consumes ~500 bytes. At 60,000 concurrent sessions: 30 MB total—trivially fits in memory. The bottleneck isn't storage; it's the per-MNO connection pool to USSD gateways.

**MNO Gateway Connections:** Each MNO USSD gateway limits concurrent connections (typically 50–500 per application). With 3–5 MNOs per country and 7 countries, the platform maintains 100+ gateway connections. Connection pooling with backpressure prevents overwhelming any single gateway.

**Geographic Routing:** USSD sessions are routed to the nearest data center based on the originating MNO's gateway location. This minimizes network latency (critical for the 500ms-per-screen budget) and keeps session state local to one data center (no cross-DC session replication needed given the ephemeral nature of USSD sessions).

### Fraud Detection Scaling

The fraud detection engine must evaluate every transaction inline (<200ms). At 12,000 TPS peak, this means 12,000 ML inference calls per second:

**Feature Store:** Pre-computed features (user behavioral profile, transaction velocity counters, device history) are cached in a low-latency key-value store. Feature retrieval: <5ms.

**Model Serving:** The ML model ensemble runs on dedicated inference nodes with GPU acceleration for the neural network component and CPU for the gradient boosted tree component. Horizontal scaling: add inference nodes behind a load balancer. Each node handles ~1,000 inferences/second.

**Rule Engine:** The fast rule engine (SIM swap check, velocity check, blacklist) runs on the transaction processing nodes themselves (no network hop). Rules are synced from a central configuration store with eventual consistency (1-minute propagation).

---

## Fault Tolerance in Infrastructure-Constrained Environments

### MNO USSD Gateway Failure

MNO gateways are the single point of failure the platform cannot fully control. When a gateway becomes unresponsive:

1. **Detection:** Health checks every 5 seconds; declare unhealthy after 3 consecutive failures (15 seconds).
2. **Failover:** If the MNO provides a secondary gateway, route traffic there. If not, USSD service for that MNO is unavailable—no platform-side workaround exists.
3. **Mitigation:** Push notification to app users on that MNO suggesting they use the app instead of USSD. SMS broadcast to frequent USSD users: "USSD temporarily unavailable. Dial *334# to retry in 10 minutes."
4. **Queue-and-replay:** For pending USSD sessions that were interrupted, mark as orphaned and send SMS fallback if transactions were in-flight.

### Power and Connectivity Outages

Entire regions may lose connectivity due to power outages affecting cell towers (common in rural Africa and during storm seasons):

1. **Regional failover:** If a data center loses connectivity to the MNO gateways serving a region, transactions from that region simply stop arriving—no platform action needed for active transactions.
2. **Agent offline mode:** Agents in the affected area switch to offline mode on their POS devices. Transactions are recorded locally with cryptographic tokens and synced when connectivity returns.
3. **Flood control on recovery:** When connectivity returns, the platform receives a burst of store-and-forward transactions from all agents and devices in the affected region simultaneously. The ingestion pipeline uses rate limiting and priority queuing (critical transactions first, balance checks last) to absorb the burst without overloading the ledger.

### Database Failover

**Primary-secondary replication** with synchronous writes to the primary and one synchronous replica (zero data loss). Asynchronous replication to 1-2 additional replicas for read scaling.

**Failover procedure:**
1. Primary failure detected (heartbeat timeout: 5 seconds)
2. Synchronous replica promoted to primary (automatic, <30 seconds)
3. All writes routed to new primary
4. Old primary, when recovered, joins as a new replica
5. RTO: <60 seconds. RPO: 0 (zero data loss for committed transactions)

**Split-brain prevention:** Fencing mechanism ensures only one primary can accept writes at any time. The old primary, if it recovers while the new primary is active, is prevented from accepting writes until it acknowledges the new primary's leadership.

---

## Disaster Recovery

### Multi-Region Architecture

The platform operates in an active-passive configuration across two geographic regions per country:

- **Active region:** Handles all traffic. Located near the primary MNO infrastructure in-country (e.g., Nairobi for Kenya operations).
- **Passive region:** Receives synchronous ledger replication and asynchronous replication for all other data. Located in a different city or neighboring country.
- **DR failover:** If the active region is completely lost, the passive region is promoted. RTO: <5 minutes. RPO: 0 for ledger data, <1 minute for other data.

### Ledger Integrity Verification

Continuous background process verifies ledger integrity:

1. **Balance reconciliation:** Sum of all wallet balances must equal the total held in partner bank trust accounts. Run hourly.
2. **Double-entry verification:** For every journal entry, total debits must equal total credits. Run continuously on the event stream.
3. **Cross-region comparison:** Compare ledger checksums between active and passive regions. Any divergence triggers an alert and investigation before failover is permitted.

---

## Offline and Store-and-Forward Transaction Handling

### Smartphone App Offline Mode

The smartphone app supports limited offline functionality:

1. **Balance display:** Shows the last-known balance with a "last updated" timestamp and a visual warning that the balance may not be current.
2. **Transaction queuing:** Users can initiate P2P transfers offline. The app validates the request locally (amount ≤ last-known balance, recipient format is valid) and queues it.
3. **Sync on reconnect:** When connectivity returns, queued transactions are submitted in chronological order. Each transaction goes through the full pipeline (idempotency check, fraud check, ledger write). If a transaction fails (e.g., insufficient balance because another transaction was processed from another channel), the user is notified.
4. **Conflict resolution:** If the same wallet was modified from both the app (queued offline) and USSD (online) simultaneously, the ledger's optimistic concurrency control resolves: whichever transaction commits first wins; the second transaction retries with the updated balance.

### Agent POS Offline Mode

Agent POS devices support a more robust offline mode because they handle cash transactions where the customer is physically present:

1. **Offline transaction limit:** Agents can process up to 20 offline transactions or KES 100,000 total (whichever comes first) before they must sync.
2. **Cryptographic tokens:** Each offline transaction is signed with the device's private key (hardware-backed on modern POS devices). The token includes: agent ID, customer MSISDN, amount, timestamp, and a monotonically increasing sequence number (prevents replay).
3. **Batch sync:** When connectivity returns, all offline transactions are submitted as a batch. The platform validates each token, checks cumulative float availability, and commits valid transactions.
4. **Float over-commitment risk:** If an agent processes 20 cash-in transactions offline (each debiting their e-float), but their actual e-float only covers 15, the platform commits the first 15 and rejects the last 5. The agent is responsible for resolving the rejected transactions with the affected customers. This risk is mitigated by conservative offline float limits (the offline limit is set well below the agent's actual float balance).

---

## Multi-Country Deployment Architecture

### Regulatory-Driven Data Isolation

Financial regulators in most African countries require that customer financial data resides within the country's borders (data sovereignty). The platform enforces this through:

1. **Country-specific database clusters:** Each country's ledger, wallet, and customer data runs on dedicated database clusters within that country's designated data center. No cross-country data replication for customer financial data.
2. **Shared platform services:** Non-financial services (ML model training infrastructure, developer API gateway, analytics pipeline) run in a centralized location, processing only anonymized/aggregated data.
3. **Country configuration layer:** Regulatory rules (transaction limits, KYC requirements, reporting thresholds, fee structures) are parameterized per country. A new country deployment involves: infrastructure provisioning, regulatory configuration, MNO integration, and agent network onboarding—the core transaction engine code is shared.

### Cross-Border Remittance

Transferring money between countries (e.g., Kenya → Tanzania) uses a corridor-based settlement model:

1. **Sender initiates:** Debits sender's wallet in KES.
2. **FX conversion:** Platform applies the corridor-specific exchange rate (sourced from a rate provider, refreshed every 15 minutes).
3. **Settlement:** The sender-country platform sends a settlement instruction to the receiver-country platform via a secure API.
4. **Receiver credit:** Receiver's wallet is credited in TZS.
5. **Netting:** Actual fund movement between the two country platforms' trust accounts is netted daily or hourly (depending on corridor volume), reducing the number of cross-border bank transfers.

For pan-African interoperability, the platform integrates with PAPSS (Pan-African Payment and Settlement System), which enables cross-border instant payments across 18+ African countries with settlement in local currencies.

### Per-Country Scaling

Transaction volume varies dramatically by country: Kenya (M-Pesa's home market) processes 10× the volume of a smaller market like Mozambique. The multi-country architecture handles this through:

- **Independently scaled infrastructure:** Each country's infrastructure is sized for its own peak load, not the global peak.
- **Shared ML models with country-specific fine-tuning:** The fraud detection base model is trained on global data, then fine-tuned per country to capture local fraud patterns. Credit scoring models are fully country-specific (transaction patterns differ significantly across economies).
- **Staggered rollouts:** New features deploy to smaller markets first (lower risk), then roll out to high-volume markets after validation.
