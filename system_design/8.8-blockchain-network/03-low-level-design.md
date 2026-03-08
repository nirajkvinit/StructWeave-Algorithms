# Low-Level Design

## Data Models

### Block Header

```
BlockHeader:
  parentHash:       bytes32       // Hash of parent block header
  ommersHash:       bytes32       // Hash of ommers (uncle) list
  beneficiary:      address       // Fee recipient (proposer)
  stateRoot:        bytes32       // Root of world state trie after execution
  transactionsRoot: bytes32       // Root of transaction trie
  receiptsRoot:     bytes32       // Root of receipt trie
  logsBloom:        bytes256      // Bloom filter for log entries
  difficulty:       uint256       // Legacy (0 in PoS)
  number:           uint64        // Block height
  gasLimit:         uint64        // Maximum gas for this block
  gasUsed:          uint64        // Total gas consumed by transactions
  timestamp:        uint64        // Unix timestamp
  extraData:        bytes[0..32]  // Arbitrary data (max 32 bytes)
  baseFeePerGas:    uint256       // EIP-1559 base fee
  withdrawalsRoot:  bytes32       // Root of validator withdrawals trie
  blobGasUsed:      uint64        // EIP-4844 blob gas consumed
  excessBlobGas:    uint64        // Running excess for blob fee calculation
  parentBeaconRoot: bytes32       // Beacon chain parent root
```

### Transaction (EIP-1559 Type 2)

```
Transaction:
  type:                 uint8       // 0x02 for EIP-1559
  chainId:              uint256     // Network identifier (prevents replay)
  nonce:                uint64      // Sender's transaction count
  maxPriorityFeePerGas: uint256     // Tip to block proposer
  maxFeePerGas:         uint256     // Maximum total fee willing to pay
  gasLimit:             uint64      // Maximum gas units for execution
  to:                   address     // Recipient (null for contract creation)
  value:                uint256     // Native currency to transfer (in wei)
  data:                 bytes       // Calldata (function selector + arguments)
  accessList:           []AccessTuple // EIP-2930 storage access hints
  v, r, s:              uint256     // ECDSA signature components

AccessTuple:
  address:    address
  storageKeys: []bytes32
```

### Account State

```
Account:
  nonce:       uint64    // Number of transactions sent (EOA) or contracts created (contract)
  balance:     uint256   // Native currency balance in wei
  storageRoot: bytes32   // Root hash of the account's storage trie (empty for EOAs)
  codeHash:    bytes32   // Hash of the contract bytecode (empty hash for EOAs)

// Account key in state trie = Keccak256(address)
// Storage key in storage trie = Keccak256(slot_number)
```

### Transaction Receipt

```
Receipt:
  status:            uint8       // 1 = success, 0 = revert
  cumulativeGasUsed: uint64      // Total gas used up to this tx in the block
  logsBloom:         bytes256    // Bloom filter for this receipt's logs
  logs:              []LogEntry  // Event logs emitted during execution
  effectiveGasPrice: uint256     // Actual gas price paid (base + priority)
  gasUsed:           uint64      // Gas consumed by this transaction

LogEntry:
  address: address               // Contract that emitted the event
  topics:  []bytes32 (max 4)     // Indexed event parameters
  data:    bytes                 // Non-indexed event parameters
```

### Validator Record (Beacon State)

```
Validator:
  pubkey:                   BLSPubKey   // BLS12-381 public key
  withdrawalCredentials:    bytes32     // Withdrawal address commitment
  effectiveBalance:         uint64      // Effective stake (max 32 ETH, in Gwei)
  slashed:                  bool        // Whether validator has been slashed
  activationEligibilityEpoch: uint64   // When eligible for activation
  activationEpoch:          uint64      // When activated
  exitEpoch:                uint64      // When exited (FAR_FUTURE if active)
  withdrawableEpoch:        uint64      // When stake can be withdrawn
```

### Mempool Entry

```
MempoolEntry:
  txHash:          bytes32
  transaction:     Transaction
  sender:          address       // Recovered from signature
  effectiveGasPrice: uint256     // min(maxFee, baseFee + maxPriorityFee)
  receivedAt:      timestamp
  localOrigin:     bool          // true if submitted directly to this node
  promotable:      bool          // true if nonce == account.nonce (executable)
```

---

## API Design

### JSON-RPC Endpoints (Client-Facing)

#### Transaction Submission

```
Method: eth_sendRawTransaction
Input:
  signedTxBytes: bytes           // RLP-encoded signed transaction

Output:
  txHash: bytes32                // Transaction hash

Errors:
  - NONCE_TOO_LOW: nonce < account.nonce
  - INSUFFICIENT_FUNDS: balance < value + gasLimit * maxFeePerGas
  - GAS_LIMIT_EXCEEDED: gasLimit > block.gasLimit
  - ALREADY_KNOWN: transaction already in mempool

Validation Steps:
  1. Decode RLP and verify transaction structure
  2. Recover sender address from ECDSA signature
  3. Verify chainId matches network
  4. Check nonce >= account.nonce
  5. Check balance >= value + gasLimit * maxFeePerGas
  6. Check gasLimit >= intrinsic gas (21000 + calldata cost)
  7. Insert into mempool priority queue
  8. Gossip to connected peers
```

#### State Queries

```
Method: eth_getBalance
Input:
  address: address
  blockTag: "latest" | "finalized" | "safe" | uint64
Output:
  balance: uint256 (in wei)

Method: eth_call
Input:
  from:     address (optional)
  to:       address
  data:     bytes (calldata)
  value:    uint256 (optional)
  gas:      uint64 (optional)
  blockTag: "latest" | uint64
Output:
  result: bytes (return data from EVM execution)
Note: Executes against state without creating a transaction

Method: eth_getTransactionReceipt
Input:
  txHash: bytes32
Output:
  receipt: Receipt | null (null if not yet included)

Method: eth_getLogs
Input:
  fromBlock: uint64
  toBlock:   uint64
  address:   address (optional filter)
  topics:    []bytes32 (optional indexed parameter filters)
Output:
  logs: []LogEntry
```

#### Chain Information

```
Method: eth_blockNumber
Output: uint64 (latest block number)

Method: eth_getBlockByNumber
Input:
  blockNumber: uint64 | "latest" | "finalized"
  fullTxs:     bool (true = include full txns, false = only hashes)
Output: Block

Method: eth_gasPrice
Output: uint256 (suggested gas price based on recent blocks)

Method: eth_feeHistory
Input:
  blockCount:        uint64
  newestBlock:       uint64 | "latest"
  rewardPercentiles: []float
Output:
  baseFeePerGas:  []uint256
  gasUsedRatio:   []float
  reward:         [][]uint256 (priority fees at each percentile)
```

### Engine API (Consensus → Execution Internal)

```
Method: engine_newPayloadV3
Input:
  executionPayload: ExecutionPayload   // Block to validate and execute
  expectedBlobVersionedHashes: []bytes32
  parentBeaconBlockRoot: bytes32
Output:
  status: "VALID" | "INVALID" | "SYNCING"
  latestValidHash: bytes32

Method: engine_forkchoiceUpdatedV3
Input:
  forkchoiceState:
    headBlockHash:      bytes32
    safeBlockHash:      bytes32
    finalizedBlockHash: bytes32
  payloadAttributes: (optional, for block building)
    timestamp:    uint64
    prevRandao:   bytes32
    feeRecipient: address
    withdrawals:  []Withdrawal
Output:
  status: "VALID" | "INVALID" | "SYNCING"
  payloadId: bytes8 (if building a new block)
```

---

## Core Algorithms

### EIP-1559 Base Fee Adjustment

```
FUNCTION calculateBaseFee(parentBlock):
    parentGasTarget = parentBlock.gasLimit / 2

    IF parentBlock.gasUsed == parentGasTarget:
        RETURN parentBlock.baseFeePerGas   // No change

    IF parentBlock.gasUsed > parentGasTarget:
        // Block was more than half full → increase base fee
        gasUsedDelta = parentBlock.gasUsed - parentGasTarget
        feeDelta = parentBlock.baseFeePerGas * gasUsedDelta / parentGasTarget / 8
        RETURN parentBlock.baseFeePerGas + max(feeDelta, 1)

    ELSE:
        // Block was less than half full → decrease base fee
        gasUsedDelta = parentGasTarget - parentBlock.gasUsed
        feeDelta = parentBlock.baseFeePerGas * gasUsedDelta / parentGasTarget / 8
        RETURN max(parentBlock.baseFeePerGas - feeDelta, 0)
```

### LMD-GHOST Fork Choice

```
FUNCTION getHead(store):
    // Start from the latest justified checkpoint
    head = store.justifiedCheckpoint.root
    justified_slot = store.justifiedCheckpoint.epoch * SLOTS_PER_EPOCH

    WHILE true:
        children = getChildren(store, head)
        IF children is EMPTY:
            RETURN head

        // Weight each child by total attesting stake
        best = null
        bestWeight = -1
        FOR child IN children:
            weight = getLatestAttestingBalance(store, child)
            IF weight > bestWeight OR
               (weight == bestWeight AND child > best):  // Tiebreak by hash
                best = child
                bestWeight = weight

        head = best

FUNCTION getLatestAttestingBalance(store, root):
    // Sum effective balance of all validators whose latest
    // attestation supports this block or its descendants
    total = 0
    FOR validator IN store.validators:
        IF validator.latestAttestation is descendant of root:
            total += validator.effectiveBalance
    RETURN total
```

### Transaction Pool Ordering

```
FUNCTION insertTransaction(mempool, tx, sender):
    // Validate transaction
    account = getAccountState(sender)
    IF tx.nonce < account.nonce:
        REJECT "nonce too low"
    IF account.balance < tx.value + tx.gasLimit * tx.maxFeePerGas:
        REJECT "insufficient funds"

    // Calculate effective gas price
    currentBaseFee = getLatestBaseFee()
    effectivePrice = min(tx.maxFeePerGas, currentBaseFee + tx.maxPriorityFeePerGas)

    // Check for replacement (same sender + nonce)
    existing = mempool.getBySenderAndNonce(sender, tx.nonce)
    IF existing is NOT null:
        IF effectivePrice < existing.effectivePrice * 1.1:
            REJECT "replacement fee too low (need 10% bump)"
        mempool.remove(existing)

    // Classify as pending (executable) or queued (future nonce)
    IF tx.nonce == account.nonce:
        mempool.pending.insert(tx, effectivePrice)  // Priority queue by price
    ELSE:
        mempool.queued.insert(sender, tx)  // Per-sender nonce-ordered queue

    // Promote queued transactions if gap filled
    promoteQueuedTransactions(mempool, sender)

FUNCTION selectTransactionsForBlock(mempool, gasLimit, baseFee):
    selected = []
    gasUsed = 0
    senderNonces = {}  // Track nonces within this block

    // Iterate mempool by descending effective gas price
    FOR tx IN mempool.pending.descendingIterator():
        expectedNonce = senderNonces.getOrDefault(tx.sender, getAccountNonce(tx.sender))
        IF tx.nonce != expectedNonce:
            CONTINUE  // Nonce gap, skip
        IF gasUsed + tx.gasLimit > gasLimit:
            CONTINUE  // Would exceed block gas limit
        IF tx.maxFeePerGas < baseFee:
            BREAK     // All remaining txns also below base fee

        selected.append(tx)
        gasUsed += tx.gasLimit
        senderNonces[tx.sender] = expectedNonce + 1

    RETURN selected
```

### Merkle Patricia Trie Operations

```
FUNCTION trieGet(root, key):
    // key is the Keccak256 hash, treated as a nibble path
    node = db.get(root)
    keyNibbles = toNibbles(key)
    offset = 0

    WHILE offset < len(keyNibbles):
        IF node.type == BRANCH:
            nibble = keyNibbles[offset]
            child = node.children[nibble]
            IF child is EMPTY:
                RETURN null
            node = db.get(child)
            offset += 1

        ELSE IF node.type == EXTENSION:
            sharedNibbles = node.path
            IF keyNibbles[offset:offset+len(sharedNibbles)] != sharedNibbles:
                RETURN null
            node = db.get(node.child)
            offset += len(sharedNibbles)

        ELSE IF node.type == LEAF:
            remainingNibbles = node.path
            IF keyNibbles[offset:] == remainingNibbles:
                RETURN node.value
            RETURN null

    RETURN node.value

FUNCTION trieUpdate(root, key, value):
    // Returns new root hash (trie is immutable)
    keyNibbles = toNibbles(key)
    newRoot = recursiveUpdate(root, keyNibbles, 0, value)
    RETURN hash(newRoot)
```

### EVM Execution Loop

```
FUNCTION executeTransaction(state, tx, blockContext):
    // 1. Pre-execution validation
    sender = recoverAddress(tx)
    intrinsicGas = 21000 + calldataCost(tx.data) + accessListCost(tx.accessList)
    IF tx.gasLimit < intrinsicGas:
        FAIL "intrinsic gas too low"

    // 2. Deduct upfront cost
    upfrontCost = tx.value + tx.gasLimit * tx.effectiveGasPrice
    state[sender].balance -= upfrontCost
    state[sender].nonce += 1

    // 3. Create EVM context
    evm = createEVM(state, blockContext, tx)
    gasRemaining = tx.gasLimit - intrinsicGas

    // 4. Execute
    IF tx.to is null:
        // Contract creation
        contractAddr = deriveAddress(sender, tx.nonce)
        result = evm.create(sender, tx.value, tx.data, gasRemaining)
    ELSE:
        // Message call
        result = evm.call(sender, tx.to, tx.value, tx.data, gasRemaining)

    // 5. Post-execution
    gasUsed = tx.gasLimit - result.gasRemaining
    gasRefund = min(result.refund, gasUsed / 5)  // Cap refund at 20%
    effectiveGasUsed = gasUsed - gasRefund

    // 6. Refund unused gas
    state[sender].balance += (tx.gasLimit - effectiveGasUsed) * tx.effectiveGasPrice

    // 7. Pay proposer priority fee
    priorityFee = min(tx.maxPriorityFeePerGas, tx.maxFeePerGas - blockContext.baseFee)
    state[blockContext.coinbase].balance += effectiveGasUsed * priorityFee

    // 8. Burn base fee (removed from circulation)
    // baseFee * gasUsed is simply not credited to anyone

    RETURN Receipt(status=result.success, gasUsed=effectiveGasUsed, logs=result.logs)
```

### Kademlia Peer Discovery

```
FUNCTION findNode(targetId):
    // Find the k closest nodes to targetId using XOR distance
    k = 16  // Bucket size
    alpha = 3  // Concurrency factor

    closestKnown = routingTable.getClosest(targetId, k)
    queried = {}
    results = SortedSet(byXorDistance(targetId))
    results.addAll(closestKnown)

    WHILE true:
        // Select alpha unqueried nodes closest to target
        toQuery = results.filter(n -> n NOT IN queried).take(alpha)
        IF toQuery is EMPTY:
            BREAK

        // Query concurrently
        FOR node IN toQuery (parallel):
            queried.add(node)
            response = node.findNode(targetId)  // RPC
            IF response is SUCCESS:
                FOR peer IN response.nodes:
                    IF peer NOT IN results:
                        results.add(peer)
                        routingTable.update(peer)  // Refresh routing table

        // Terminate when closest k nodes have all been queried
        IF queried.containsAll(results.take(k)):
            BREAK

    RETURN results.take(k)
```

---

## State Trie Structure

```
World State Trie (per block):
  Key: Keccak256(account_address)  → 20-byte address → 32-byte hash → nibble path
  Value: RLP(nonce, balance, storageRoot, codeHash)

Storage Trie (per contract):
  Key: Keccak256(storage_slot)  → 32-byte slot → 32-byte hash → nibble path
  Value: RLP(storage_value)

Transaction Trie (per block):
  Key: RLP(transaction_index)
  Value: RLP(signed_transaction)

Receipt Trie (per block):
  Key: RLP(transaction_index)
  Value: RLP(receipt)

All four tries produce a 32-byte root hash stored in the block header.
```
