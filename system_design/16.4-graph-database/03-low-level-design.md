# Low-Level Design — Graph Database

## Data Model

### Physical Storage Layout

The graph database uses four dedicated store files, each with fixed-size records for O(1) positional lookups:

```
node_store:         64 bytes per record
relationship_store: 64 bytes per record
property_store:     variable (128 bytes average, overflow chains)
label_store:        32 bytes per record
```

### Node Record Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Node Record (64 bytes)                                      │
├──────────────┬──────────────────────────────────────────────┤
│ in_use       │ 1 bit — is this record active?               │
│ node_id      │ 8 bytes — globally unique node identifier    │
│ first_rel_id │ 8 bytes — pointer to first relationship      │
│ first_prop_id│ 8 bytes — pointer to first property record   │
│ label_bitmap │ 8 bytes — inline label IDs (up to 4 labels)  │
│ label_ptr    │ 8 bytes — overflow pointer for >4 labels     │
│ dense_flag   │ 1 bit — true if node is a supernode          │
│ group_ptr    │ 8 bytes — pointer to relationship group      │
│              │          (used only for dense/supernodes)     │
│ reserved     │ remaining bytes for alignment and future use  │
└──────────────┴──────────────────────────────────────────────┘
```

### Relationship Record Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Relationship Record (64 bytes)                              │
├──────────────┬──────────────────────────────────────────────┤
│ in_use       │ 1 bit — is this record active?               │
│ rel_id       │ 8 bytes — globally unique relationship ID    │
│ start_node   │ 8 bytes — pointer to source node record      │
│ end_node     │ 8 bytes — pointer to target node record      │
│ rel_type     │ 4 bytes — relationship type ID               │
│ start_prev   │ 8 bytes — prev relationship of start node    │
│ start_next   │ 8 bytes — next relationship of start node    │
│ end_prev     │ 8 bytes — prev relationship of end node      │
│ end_next     │ 8 bytes — next relationship of end node      │
│ first_prop   │ 8 bytes — pointer to first property record   │
│ flags        │ 2 bytes — direction, constraints metadata    │
└──────────────┴──────────────────────────────────────────────┘
```

**Key insight:** Each relationship record contains four pointers forming two doubly-linked lists — one for the source node's relationship chain and one for the target node's chain. This enables bidirectional traversal without index lookups.

### Relationship Chain Visualization

```mermaid
---
config:
  theme: base
  look: neo
---
flowchart LR
    subgraph NodeA["Node A (Person: Alice)"]
        A_first["first_rel → R1"]
    end

    subgraph Rels["Relationship Chain for Node A"]
        R1["R1: KNOWS → Bob"]
        R2["R2: WORKS_AT → Acme"]
        R3["R3: LIVES_IN → NYC"]
    end

    subgraph NodeB["Node B (Person: Bob)"]
        B_first["first_rel → R1"]
    end

    A_first --> R1
    R1 -->|"start_next"| R2
    R2 -->|"start_next"| R3
    R3 -->|"start_prev"| R2
    R2 -->|"start_prev"| R1

    B_first --> R1

    classDef node fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef rel fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class A_first,B_first node
    class R1,R2,R3 rel
```

### Property Storage

Properties use a linked-list of fixed-size blocks with inline short values and overflow pointers for large values:

```
┌─────────────────────────────────────────────────────────┐
│ Property Record (128 bytes)                             │
├──────────────┬──────────────────────────────────────────┤
│ key_id       │ 4 bytes — property key (from key store)  │
│ type         │ 1 byte — INT, FLOAT, STRING, BOOL, etc.  │
│ value_inline │ 32 bytes — value stored inline if fits    │
│ value_ptr    │ 8 bytes — pointer to overflow (strings)   │
│ next_prop    │ 8 bytes — pointer to next property record │
│ entity_ref   │ 8 bytes — back-pointer to owning node/rel │
│ reserved     │ remaining bytes                           │
└──────────────┴──────────────────────────────────────────┘
```

### Indexing Strategy

| Index Type | Structure | Use Case |
|-----------|-----------|----------|
| **Label Index** | Bitmap index | Fast scan of all nodes with a given label |
| **Property Index** | B+ tree | Equality and range lookups on property values |
| **Composite Index** | B+ tree on (label, prop1, prop2) | Multi-property lookups |
| **Full-Text Index** | Inverted index (Lucene-style) | Text search across properties |
| **Vertex-Centric Index** | Per-node B+ tree on edge properties | Efficient neighbor filtering on supernodes |
| **Spatial Index** | R-tree | Geospatial point/range queries |

### Partitioning / Sharding Key Selection

| Strategy | How It Works | Pros | Cons |
|----------|-------------|------|------|
| **Hash on Node ID** | Nodes assigned to partitions by hash(node_id) | Even distribution | Random cuts through graph; many cross-partition edges |
| **Community-Based** | Detect communities (Louvain/Metis), colocate each community | Minimizes cross-partition edges | Expensive rebalancing; skewed partition sizes |
| **Property Sharding** | Graph topology on one shard; property data distributed | Traversals stay local | Properties require network fetch |
| **Label-Based** | Partition by node label (Users → Shard A, Posts → Shard B) | Predictable placement | Cross-label traversals always cross partitions |

**Recommendation:** Community-based partitioning for offline rebalancing, with hash-based assignment for new nodes between rebalancing cycles. Property sharding as a complementary strategy for supernodes whose properties dominate storage.

---

## API Design

### Query Endpoint (GQL/Cypher)

```
POST /db/{database}/query
Content-Type: application/json
Authorization: Bearer {token}

Request:
{
  "statement": "MATCH (a:Person {name: $name})-[:KNOWS]->(b:Person) RETURN b.name, b.age",
  "parameters": { "name": "Alice" },
  "timeout_ms": 5000,
  "read_consistency": "strong",
  "max_results": 100
}

Response:
{
  "results": [
    { "b.name": "Bob", "b.age": 30 },
    { "b.name": "Carol", "b.age": 28 }
  ],
  "metadata": {
    "rows_returned": 2,
    "execution_time_ms": 3.2,
    "db_hits": 47,
    "plan_cache_hit": true
  }
}
```

### Transaction Endpoint

```
POST /db/{database}/tx/begin
  → { "tx_id": "tx-abc-123", "expires_at": "..." }

POST /db/{database}/tx/{tx_id}/query
  → Execute query within transaction

POST /db/{database}/tx/{tx_id}/commit
  → Commit all mutations

POST /db/{database}/tx/{tx_id}/rollback
  → Discard all mutations
```

### Node/Edge CRUD (REST)

```
POST   /db/{database}/nodes                 → Create node
GET    /db/{database}/nodes/{id}            → Read node
PUT    /db/{database}/nodes/{id}/properties → Update properties
DELETE /db/{database}/nodes/{id}            → Delete node (and edges)

POST   /db/{database}/edges                 → Create edge
GET    /db/{database}/edges/{id}            → Read edge
DELETE /db/{database}/edges/{id}            → Delete edge
```

### Idempotency

- All write operations accept an optional `Idempotency-Key` header
- The server deduplicates writes by storing the key-to-result mapping in a TTL-bounded cache (24 hours)
- Transaction commits are inherently idempotent (same tx_id cannot commit twice)

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Query (read) | 10,000/min per client | Sliding window |
| Query (write) | 2,000/min per client | Sliding window |
| Transaction begin | 500/min per client | Sliding window |
| Analytics query | 50/min per client | Fixed window |
| Admin operations | 100/min per client | Fixed window |

### Versioning

- API versioned via URL path: `/v1/db/{database}/query`
- GQL/Cypher language version specified in query metadata
- Schema version tracked per database for migration support

---

## Core Algorithms

### 1. Breadth-First Traversal (BFS)

```
FUNCTION bfs_traverse(start_node, max_depth, edge_filter, node_filter):
    visited = HashSet()
    queue = Queue()
    results = List()

    queue.enqueue((start_node, depth=0))
    visited.add(start_node.id)

    WHILE queue is not empty:
        (current, depth) = queue.dequeue()

        IF depth > max_depth:
            CONTINUE

        IF node_filter(current):
            results.add(current)

        // Follow relationship chain via physical pointers
        rel = current.first_relationship
        WHILE rel is not NULL:
            neighbor = rel.other_node(current)

            IF edge_filter(rel) AND neighbor.id NOT IN visited:
                visited.add(neighbor.id)
                queue.enqueue((neighbor, depth + 1))

            rel = rel.next_relationship_for(current)

    RETURN results

// Time:  O(V + E) where V = visited vertices, E = traversed edges
// Space: O(V) for visited set + queue
```

### 2. Bidirectional Dijkstra (Shortest Weighted Path)

```
FUNCTION bidirectional_dijkstra(source, target, weight_property):
    forward_dist = MinHeap()   // distance from source
    backward_dist = MinHeap()  // distance from target
    forward_visited = HashMap()  // node_id → best_distance
    backward_visited = HashMap()

    forward_dist.insert(source, 0)
    backward_dist.insert(target, 0)
    best_path_length = INFINITY
    meeting_node = NULL

    WHILE forward_dist is not empty AND backward_dist is not empty:
        // Expand forward frontier
        (f_node, f_dist) = forward_dist.extract_min()

        IF f_dist >= best_path_length:
            BREAK  // cannot improve

        forward_visited[f_node.id] = f_dist

        IF f_node.id IN backward_visited:
            candidate = f_dist + backward_visited[f_node.id]
            IF candidate < best_path_length:
                best_path_length = candidate
                meeting_node = f_node

        FOR EACH neighbor, weight IN f_node.outgoing_edges(weight_property):
            new_dist = f_dist + weight
            IF neighbor.id NOT IN forward_visited OR new_dist < forward_visited[neighbor.id]:
                forward_dist.insert(neighbor, new_dist)

        // Expand backward frontier (symmetric)
        (b_node, b_dist) = backward_dist.extract_min()

        IF b_dist >= best_path_length:
            BREAK

        backward_visited[b_node.id] = b_dist

        IF b_node.id IN forward_visited:
            candidate = b_dist + forward_visited[b_node.id]
            IF candidate < best_path_length:
                best_path_length = candidate
                meeting_node = b_node

        FOR EACH neighbor, weight IN b_node.incoming_edges(weight_property):
            new_dist = b_dist + weight
            IF neighbor.id NOT IN backward_visited OR new_dist < backward_visited[neighbor.id]:
                backward_dist.insert(neighbor, new_dist)

    RETURN reconstruct_path(forward_visited, backward_visited, meeting_node)

// Time:  O(V * log(V) + E) but explores ~sqrt(V) nodes compared to unidirectional
// Space: O(V) for distance maps and heaps
```

### 3. Pattern Matching (Subgraph Isomorphism)

```
FUNCTION match_pattern(pattern_graph, data_graph, bindings):
    // pattern_graph: the query pattern (e.g., (a)-[:R]->(b)-[:S]->(c))
    // bindings: partial mapping of pattern nodes → data nodes

    IF all pattern nodes are bound:
        RETURN [bindings]  // complete match found

    // Select next unbound pattern node with most constraints (heuristic)
    p_node = select_most_constrained_unbound(pattern_graph, bindings)

    candidates = generate_candidates(p_node, pattern_graph, data_graph, bindings)

    results = List()
    FOR EACH candidate IN candidates:
        IF is_compatible(p_node, candidate, pattern_graph, bindings):
            new_bindings = bindings.copy()
            new_bindings[p_node] = candidate

            sub_results = match_pattern(pattern_graph, data_graph, new_bindings)
            results.extend(sub_results)

    RETURN results

FUNCTION generate_candidates(p_node, pattern, graph, bindings):
    // Use index-free adjacency: if a neighbor of p_node is already bound,
    // candidates are the actual neighbors of that bound node
    bound_neighbors = get_bound_neighbors(p_node, pattern, bindings)

    IF bound_neighbors is not empty:
        // Intersection of neighbor sets — much smaller than full scan
        candidate_sets = []
        FOR EACH (bound_node, rel_type) IN bound_neighbors:
            data_node = bindings[bound_node]
            neighbors = data_node.neighbors_of_type(rel_type)
            candidate_sets.append(neighbors)
        RETURN intersection(candidate_sets)
    ELSE:
        // No bound neighbors — use label index
        RETURN graph.nodes_with_label(p_node.label)

// Time:  Worst case O(n^k) where k = pattern nodes (subgraph isomorphism is NP-complete)
//        In practice, index-free adjacency and selectivity pruning make it tractable
// Space: O(k) per recursive call for bindings
```

### 4. Vertex-Centric Index Lookup (Supernode Optimization)

```
FUNCTION supernode_neighbor_lookup(node, edge_type, property_filter, limit):
    // For supernodes (>10K edges), use vertex-centric index instead of
    // scanning the full relationship chain

    IF node.is_dense:
        // Use B+ tree index on (node_id, edge_type, property_value)
        index = node.vertex_centric_index
        cursor = index.seek(edge_type, property_filter.lower_bound)

        results = List()
        WHILE cursor.valid AND cursor.edge_type == edge_type AND results.size < limit:
            IF property_filter.matches(cursor.property_value):
                results.add(cursor.target_node)
            cursor.advance()

        RETURN results
    ELSE:
        // Regular node: walk the relationship chain (fast for <10K edges)
        RETURN linear_scan_relationships(node, edge_type, property_filter, limit)

// Time:  O(log(degree) + k) for supernode (B+ tree), O(degree) for regular node
// Space: O(k) for results
```
