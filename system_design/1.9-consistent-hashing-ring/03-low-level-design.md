# Low-Level Design

[← Back to Index](./00-index.md)

---

## Data Structures

### Core Ring Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONSISTENT HASH RING DATA STRUCTURE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STRUCTURE ConsistentHashRing:                                       │
│      ring: SortedArray<RingPosition>    // Sorted by hash position  │
│      nodeMap: Map<NodeId, Node>         // Physical node details    │
│      vnodeCount: Integer                // Default vnodes per node  │
│      hashFunction: HashFunction         // MD5, xxHash, etc.        │
│                                                                      │
│  STRUCTURE RingPosition:                                             │
│      position: UInt64          // Hash value (position on ring)     │
│      nodeId: String            // Physical node identifier          │
│      vnodeIndex: Integer       // Virtual node index (0 to V-1)     │
│                                                                      │
│  STRUCTURE Node:                                                     │
│      id: String                // Unique identifier                 │
│      address: String           // Network address (host:port)       │
│      weight: Integer           // Relative capacity weight          │
│      zone: String              // Availability zone (optional)      │
│      positions: List<UInt64>   // All vnode positions for this node │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Memory Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  MEMORY LAYOUT (Example: 100 nodes, 150 vnodes each)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Ring Array (sorted by position):                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Index │ Position (8B) │ NodeId Ptr (8B) │ VNode Index (4B)   │   │
│  ├───────┼───────────────┼─────────────────┼────────────────────┤   │
│  │ 0     │ 0x00001A3F... │ → "node-001"    │ 42                 │   │
│  │ 1     │ 0x00002B4E... │ → "node-057"    │ 18                 │   │
│  │ 2     │ 0x00003C5D... │ → "node-023"    │ 91                 │   │
│  │ ...   │ ...           │ ...             │ ...                │   │
│  │ 14999 │ 0xFFFFFE21... │ → "node-089"    │ 133                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Total Entries: 100 × 150 = 15,000                                  │
│  Memory per Entry: 8 + 8 + 4 = 20 bytes                             │
│  Total Ring Memory: 15,000 × 20 = 300 KB                            │
│                                                                      │
│  Node Map (hash table):                                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ NodeId      │ Address         │ Weight │ Zone   │ Positions  │   │
│  ├─────────────┼─────────────────┼────────┼────────┼────────────┤   │
│  │ "node-001"  │ "10.0.1.1:6379" │ 1      │ "us-1" │ [150 pos]  │   │
│  │ "node-002"  │ "10.0.1.2:6379" │ 2      │ "us-2" │ [300 pos]  │   │
│  │ ...         │ ...             │ ...    │ ...    │ ...        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Node Map Memory: ~100 × 200 = 20 KB                                │
│  TOTAL: ~320 KB for 100 nodes                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Hash Function Selection

### Requirements for Hash Function

| Requirement | Description | Why Important |
|-------------|-------------|---------------|
| **Uniform Distribution** | Output evenly covers hash space | Prevents clustering of positions |
| **Deterministic** | Same input always produces same output | Consistency across nodes |
| **Fast** | < 100 ns for typical keys | On critical path |
| **Collision Resistant** | Low probability of same hash | Avoid position conflicts |

### Hash Function Comparison

| Function | Speed | Distribution | Output Size | Common Use |
|----------|-------|--------------|-------------|------------|
| MD5 | ~300 ns | Excellent | 128-bit | Ketama (Memcached) |
| MurmurHash3 | ~50 ns | Excellent | 128-bit | General purpose |
| xxHash | ~20 ns | Excellent | 64-bit | High performance |
| CityHash | ~30 ns | Excellent | 64-bit | Google internal |
| CRC32 | ~10 ns | Good | 32-bit | Redis |

### Ketama Hash (MD5-based)

```
ALGORITHM KetamaHash(key: String) → UInt32:
    // Standard Ketama algorithm used by Memcached clients

    INPUT:
        key: The key to hash

    PROCESS:
        // Compute MD5 hash (16 bytes / 128 bits)
        md5_bytes = MD5(key)

        // Take first 4 bytes as little-endian uint32
        hash = (md5_bytes[3] << 24)
             | (md5_bytes[2] << 16)
             | (md5_bytes[1] << 8)
             | (md5_bytes[0])

    RETURN hash  // 32-bit position on ring

    // Note: For virtual nodes, hash(nodeId + "-" + vnodeIndex)
```

### Virtual Node Position Generation

```
ALGORITHM GenerateVNodePositions(nodeId: String, vnodeCount: Integer) → List<UInt64>:
    // Generate deterministic positions for a node's virtual nodes

    positions = []

    FOR i FROM 0 TO vnodeCount - 1:
        // Create unique identifier for this vnode
        vnodeKey = nodeId + "#" + ToString(i)

        // Hash to get position
        position = Hash(vnodeKey)

        positions.append(position)

    RETURN positions

    // Example:
    // nodeId = "server-1", vnodeCount = 3
    // vnodeKey[0] = "server-1#0" → hash → 0x1A3F...
    // vnodeKey[1] = "server-1#1" → hash → 0x8B2C...
    // vnodeKey[2] = "server-1#2" → hash → 0xD4E7...
```

---

## Core Algorithms

### Algorithm 1: Initialize Ring

```
ALGORITHM InitializeRing(nodes: List<Node>, vnodeCount: Integer) → Ring:
    // Create a new consistent hash ring

    INPUT:
        nodes: List of physical nodes with their properties
        vnodeCount: Default virtual nodes per unit weight

    PROCESS:
        ring = new SortedArray<RingPosition>()
        nodeMap = new HashMap<String, Node>()

        FOR EACH node IN nodes:
            // Calculate actual vnode count based on weight
            actualVnodes = vnodeCount * node.weight

            // Generate positions for all vnodes
            positions = GenerateVNodePositions(node.id, actualVnodes)

            // Add to ring
            FOR i FROM 0 TO actualVnodes - 1:
                ringPos = new RingPosition(
                    position: positions[i],
                    nodeId: node.id,
                    vnodeIndex: i
                )
                ring.insert(ringPos)  // Maintains sorted order

            // Store node info
            node.positions = positions
            nodeMap[node.id] = node

        ring.sort()  // Ensure sorted by position

    RETURN (ring, nodeMap)

    COMPLEXITY:
        Time: O(N × V × log(N × V)) where N = nodes, V = vnodes
        Space: O(N × V)
```

### Algorithm 2: GetNode (Key Lookup)

```
ALGORITHM GetNode(key: String) → Node:
    // Find the node responsible for a key

    INPUT:
        key: The data key to look up

    PROCESS:
        // Step 1: Hash the key to get ring position
        keyPosition = Hash(key)

        // Step 2: Binary search for first position >= keyPosition
        index = BinarySearchCeiling(ring, keyPosition)

        // Step 3: Handle wrap-around (if key hashes beyond last position)
        IF index == -1 OR index >= ring.length:
            index = 0  // Wrap to first position

        // Step 4: Get the node from the ring position
        ringPos = ring[index]
        node = nodeMap[ringPos.nodeId]

    RETURN node

    COMPLEXITY:
        Time: O(log(N × V))
        Space: O(1)

    EXAMPLE:
        key = "user:12345"
        keyPosition = Hash("user:12345") = 0x3F7A2B1C

        Ring positions: [0x1000..., 0x3000..., 0x5000..., 0x8000...]
        Binary search finds index 2 (first position >= 0x3F7A...)

        Return node at ring[2]
```

### Algorithm 3: GetNNodes (Replication)

```
ALGORITHM GetNNodes(key: String, n: Integer, zoneAware: Boolean = false) → List<Node>:
    // Find N distinct physical nodes for replication

    INPUT:
        key: The data key
        n: Number of replicas needed
        zoneAware: Whether to prefer different availability zones

    PROCESS:
        keyPosition = Hash(key)
        index = BinarySearchCeiling(ring, keyPosition)
        IF index == -1: index = 0

        result = []
        seenNodes = Set()
        seenZones = Set()

        // Walk clockwise around the ring
        startIndex = index
        WHILE result.length < n AND attempts < ring.length:
            ringPos = ring[index]
            node = nodeMap[ringPos.nodeId]

            // Skip if we've already included this physical node
            IF node.id NOT IN seenNodes:
                // Zone-aware: also check zone uniqueness
                IF NOT zoneAware OR node.zone NOT IN seenZones:
                    result.append(node)
                    seenNodes.add(node.id)
                    IF zoneAware:
                        seenZones.add(node.zone)

            // Move clockwise
            index = (index + 1) % ring.length
            attempts++

        // If not enough zone-unique nodes, relax constraint
        IF result.length < n AND zoneAware:
            // Fall back to non-zone-aware to fill remaining
            WHILE result.length < n AND attempts < ring.length * 2:
                ringPos = ring[index]
                node = nodeMap[ringPos.nodeId]
                IF node.id NOT IN seenNodes:
                    result.append(node)
                    seenNodes.add(node.id)
                index = (index + 1) % ring.length
                attempts++

    RETURN result

    COMPLEXITY:
        Time: O(n × V) worst case, O(n) typical
        Space: O(n)
```

### Algorithm 4: AddNode

```
ALGORITHM AddNode(node: Node) → KeysToMigrate:
    // Add a new node to the ring

    INPUT:
        node: The new node to add

    PROCESS:
        actualVnodes = vnodeCount * node.weight
        positions = GenerateVNodePositions(node.id, actualVnodes)
        keysToMigrate = []

        FOR i FROM 0 TO actualVnodes - 1:
            pos = positions[i]

            // Find the node that currently owns this position
            // (the successor of this position before insertion)
            currentOwnerIndex = BinarySearchCeiling(ring, pos)
            IF currentOwnerIndex == -1: currentOwnerIndex = 0
            currentOwner = nodeMap[ring[currentOwnerIndex].nodeId]

            // Find the predecessor position (to determine key range)
            predIndex = (currentOwnerIndex - 1 + ring.length) % ring.length
            predPos = ring[predIndex].position

            // Keys in range (predPos, pos] will migrate from currentOwner to newNode
            keysToMigrate.append({
                fromNode: currentOwner,
                toNode: node,
                rangeStart: predPos,
                rangeEnd: pos
            })

            // Insert new position into ring
            ringPos = new RingPosition(pos, node.id, i)
            ring.insert(ringPos)  // Maintain sorted order

        // Register node
        node.positions = positions
        nodeMap[node.id] = node

    RETURN keysToMigrate

    COMPLEXITY:
        Time: O(V × log(N × V)) for V insertions
        Space: O(V) for new positions

    KEY MIGRATION:
        Only keys in the new node's ranges need to migrate
        Total keys migrated ≈ K/(N+1) where K = total keys, N = current nodes
```

### Algorithm 5: RemoveNode

```
ALGORITHM RemoveNode(nodeId: String) → KeysToMigrate:
    // Remove a node from the ring

    INPUT:
        nodeId: ID of the node to remove

    PROCESS:
        node = nodeMap[nodeId]
        IF node == NULL:
            RETURN Error("Node not found")

        keysToMigrate = []

        // For each vnode position, find where keys should go
        FOR EACH pos IN node.positions:
            // Find this position in the ring
            index = BinarySearchExact(ring, pos)

            // Find predecessor and successor
            predIndex = (index - 1 + ring.length) % ring.length
            succIndex = (index + 1) % ring.length

            predPos = ring[predIndex].position
            succNode = nodeMap[ring[succIndex].nodeId]

            // Keys in range (predPos, pos] will migrate to successor
            keysToMigrate.append({
                fromNode: node,
                toNode: succNode,
                rangeStart: predPos,
                rangeEnd: pos
            })

            // Remove position from ring
            ring.remove(index)

        // Unregister node
        nodeMap.remove(nodeId)

    RETURN keysToMigrate

    COMPLEXITY:
        Time: O(V × log(N × V))
        Space: O(V)

    KEY MIGRATION:
        All keys from removed node go to their successors
        Total keys migrated = K/N (exactly one node's worth)
```

---

## Binary Search Implementation

### BinarySearchCeiling

```
ALGORITHM BinarySearchCeiling(ring: SortedArray, target: UInt64) → Integer:
    // Find index of smallest element >= target

    IF ring.isEmpty():
        RETURN -1

    left = 0
    right = ring.length - 1
    result = -1

    WHILE left <= right:
        mid = left + (right - left) / 2

        IF ring[mid].position >= target:
            result = mid
            right = mid - 1
        ELSE:
            left = mid + 1

    RETURN result

    // If result == -1, wrap around to index 0
```

---

## Alternative Algorithm: Jump Hash

```
ALGORITHM JumpHash(key: UInt64, numBuckets: Integer) → Integer:
    // Google's Jump Consistent Hash
    // O(log n) time, O(1) space, perfect distribution

    IF numBuckets <= 0:
        RETURN Error("Invalid bucket count")

    b = -1  // Current bucket
    j = 0   // Next candidate bucket

    WHILE j < numBuckets:
        b = j
        key = key * 2862933555777941757 + 1
        j = (b + 1) * (2^31 / ((key >> 33) + 1))

    RETURN b

    PROPERTIES:
        - O(ln n) iterations expected
        - Perfectly uniform distribution
        - Only ~1/n keys move when adding bucket n

    LIMITATIONS:
        - Buckets must be numbered 0, 1, 2, ...
        - Cannot remove arbitrary buckets (only from end)
        - Need indirection layer for named nodes
```

---

## Alternative Algorithm: Rendezvous Hash

```
ALGORITHM RendezvousHash(key: String, nodes: List<Node>) → Node:
    // Highest Random Weight (HRW) Hashing

    maxWeight = -infinity
    selectedNode = NULL

    FOR EACH node IN nodes:
        // Compute weight for this (key, node) pair
        combined = key + node.id
        weight = Hash(combined)

        IF weight > maxWeight:
            maxWeight = weight
            selectedNode = node

    RETURN selectedNode

    COMPLEXITY:
        Time: O(n) - must check all nodes
        Space: O(1)

    BENEFITS:
        - Simple, no ring structure needed
        - Natural support for k replicas (top k weights)
        - Perfectly uniform if hash is uniform

    BEST FOR:
        - Small clusters (< 100 nodes)
        - When simplicity is valued over lookup speed
```

---

## Alternative Algorithm: Maglev Hash

```
ALGORITHM MaglevHash:
    // Google's Maglev consistent hash for load balancers
    // O(1) lookup, but expensive table generation

    STRUCTURE MaglevTable:
        lookupTable: Array<NodeId>[M]  // M is prime, typically 65537
        nodes: List<Node>

    ALGORITHM GenerateLookupTable(nodes: List<Node>, M: Integer) → Array:
        // Generate permutation for each node
        permutation = []
        FOR EACH node IN nodes:
            offset = Hash1(node.id) % M
            skip = Hash2(node.id) % (M - 1) + 1
            permutation[node] = GeneratePermutation(offset, skip, M)

        // Fill lookup table using round-robin from permutations
        table = Array[M] filled with -1
        next = Array[nodes.length] filled with 0
        filled = 0

        WHILE filled < M:
            FOR i FROM 0 TO nodes.length - 1:
                c = permutation[nodes[i]][next[i]]
                WHILE table[c] != -1:
                    next[i]++
                    c = permutation[nodes[i]][next[i]]
                table[c] = nodes[i].id
                next[i]++
                filled++
                IF filled >= M:
                    BREAK

        RETURN table

    ALGORITHM Lookup(key: String) → NodeId:
        index = Hash(key) % M
        RETURN lookupTable[index]

    COMPLEXITY:
        Lookup: O(1)
        Table Generation: O(M × N)
        Space: O(M)

    BEST FOR:
        - High-throughput load balancers
        - Packet-per-second critical paths
```

---

## API Design

### Ring Management API

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONSISTENT HASH RING API                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Constructor:                                                        │
│  ──────────────────────────────────────────────────────────────────│
│  CreateRing(config: RingConfig) → Ring                              │
│                                                                      │
│  RingConfig:                                                         │
│      hashFunction: "md5" | "xxhash" | "murmur3"                     │
│      defaultVNodes: Integer (default: 150)                          │
│      ringSize: Integer (default: 2^32)                              │
│                                                                      │
│  ──────────────────────────────────────────────────────────────────│
│  Node Management:                                                    │
│  ──────────────────────────────────────────────────────────────────│
│  AddNode(nodeId, address, weight?, zone?) → MigrationPlan           │
│  RemoveNode(nodeId) → MigrationPlan                                 │
│  GetNodes() → List<Node>                                            │
│  GetNode(nodeId) → Node                                             │
│                                                                      │
│  ──────────────────────────────────────────────────────────────────│
│  Key Operations:                                                     │
│  ──────────────────────────────────────────────────────────────────│
│  GetNodeForKey(key) → Node                                          │
│  GetNodesForKey(key, n) → List<Node>                                │
│  GetNodesForKeyZoneAware(key, n) → List<Node>                       │
│                                                                      │
│  ──────────────────────────────────────────────────────────────────│
│  Diagnostics:                                                        │
│  ──────────────────────────────────────────────────────────────────│
│  GetRingSize() → Integer                                            │
│  GetDistribution() → Map<NodeId, Float>                             │
│  GetPositions(nodeId) → List<Position>                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Usage Example (Pseudocode)

```
// Initialize ring
config = {
    hashFunction: "xxhash",
    defaultVNodes: 150
}
ring = CreateRing(config)

// Add nodes
ring.AddNode("cache-1", "10.0.1.1:6379", weight=1, zone="us-east-1a")
ring.AddNode("cache-2", "10.0.1.2:6379", weight=1, zone="us-east-1b")
ring.AddNode("cache-3", "10.0.1.3:6379", weight=2, zone="us-east-1c")

// Look up node for a key
key = "user:12345"
node = ring.GetNodeForKey(key)
// node = {id: "cache-2", address: "10.0.1.2:6379", ...}

// Get replicas for a key
replicas = ring.GetNodesForKeyZoneAware(key, 3)
// replicas = [cache-2 (zone-1b), cache-3 (zone-1c), cache-1 (zone-1a)]

// Add a new node (returns migration plan)
migration = ring.AddNode("cache-4", "10.0.1.4:6379", weight=1, zone="us-east-1a")
// migration = [{from: cache-1, to: cache-4, range: [0x1234, 0x5678]}, ...]

// Application handles migration
FOR EACH segment IN migration:
    keys = segment.fromNode.GetKeysInRange(segment.range)
    segment.toNode.BulkInsert(keys)
    segment.fromNode.DeleteKeys(keys)
```

---

## Complexity Summary

| Operation | Time Complexity | Space Complexity |
|-----------|-----------------|------------------|
| Initialize Ring | O(N × V × log(N×V)) | O(N × V) |
| GetNode | O(log(N × V)) | O(1) |
| GetNNodes | O(n × V) worst, O(n) typical | O(n) |
| AddNode | O(V × log(N × V)) | O(V) |
| RemoveNode | O(V × log(N × V)) | O(V) |
| GetDistribution | O(N × V) | O(N) |

Where:
- N = Number of physical nodes
- V = Virtual nodes per physical node
- n = Number of replicas requested

---

## Implementation Considerations

### Thread Safety

```
┌─────────────────────────────────────────────────────────────────────┐
│  THREAD SAFETY PATTERNS                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Option 1: Read-Write Lock                                           │
│  ────────────────────────────                                        │
│  - Multiple concurrent readers (lookups)                             │
│  - Exclusive writer (add/remove node)                                │
│  - Good for read-heavy workloads                                     │
│                                                                      │
│  Option 2: Copy-on-Write                                             │
│  ────────────────────────────                                        │
│  - Create new ring on modification                                   │
│  - Atomically swap reference                                         │
│  - No read locks needed                                              │
│  - Best for infrequent modifications                                 │
│                                                                      │
│  Option 3: Lock-Free with Atomic Reference                           │
│  ────────────────────────────                                        │
│  - Immutable ring structures                                         │
│  - CAS to update ring reference                                      │
│  - Most scalable for high-concurrency                                │
│                                                                      │
│  RECOMMENDATION: Copy-on-Write                                       │
│  - Ring changes are rare (seconds to hours apart)                    │
│  - Lookups are constant (thousands per second)                       │
│  - Simplest to implement correctly                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Handling Position Collisions

```
ALGORITHM HandleCollision(ring, newPosition, nodeId):
    // Extremely rare with 64-bit hashes, but handle gracefully

    IF EXISTS position IN ring WHERE position.value == newPosition:
        // Option 1: Deterministic ordering by node ID
        IF nodeId < position.nodeId:
            INSERT newPosition BEFORE existingPosition
        ELSE:
            INSERT newPosition AFTER existingPosition

        // Option 2: Rehash with salt
        // newPosition = Hash(nodeId + salt)

    // With 64-bit hashes and 15,000 positions:
    // Collision probability ≈ 15000² / 2^64 ≈ 10^-11
```
