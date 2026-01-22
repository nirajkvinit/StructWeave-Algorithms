---
title: "Trees"
category: data-structures
difficulty: beginner
estimated_time_minutes: 25
prerequisites: []
---

# Trees

## What is a Tree?

A **tree** is a hierarchical data structure consisting of nodes connected by edges, with a single root node and no cycles.

Think of a family tree, file system, or organizational chart - trees naturally represent hierarchical relationships.

## Tree Terminology

```mermaid
graph TB
    ROOT[1<br/>Root<br/>Height: 3<br/>Depth: 0]
    ROOT --> L1A[2<br/>Internal Node<br/>Height: 2<br/>Depth: 1]
    ROOT --> L1B[3<br/>Internal Node<br/>Height: 1<br/>Depth: 1]

    L1A --> L2A[4<br/>Leaf<br/>Height: 0<br/>Depth: 2]
    L1A --> L2B[5<br/>Leaf<br/>Height: 0<br/>Depth: 2]

    L1B --> L2C[6<br/>Leaf<br/>Height: 0<br/>Depth: 2]

    style ROOT fill:#FFD700
    style L2A fill:#90EE90
    style L2B fill:#90EE90
    style L2C fill:#90EE90
```

### Key Terms

- **Root:** Top node (no parent)
- **Parent:** Node with children
- **Child:** Node with a parent
- **Sibling:** Nodes with same parent
- **Leaf:** Node with no children
- **Internal Node:** Node with at least one child
- **Edge:** Connection between nodes
- **Path:** Sequence of nodes connected by edges
- **Height:** Longest path from node to leaf
- **Depth:** Distance from root to node
- **Level:** All nodes at same depth

### Important Properties

| Property | Definition | Example |
|----------|------------|---------|
| Height of tree | Height of root | 3 in diagram above |
| Depth of node | Distance from root | Node 4 has depth 2 |
| Height of node | Longest path to leaf | Node 2 has height 2 |
| Level | Set of nodes at depth d | Level 1: {2, 3} |

## Binary Trees vs N-ary Trees

### Binary Tree
Each node has **at most 2 children** (left and right).

```mermaid
graph TB
    A[1] --> B[2]
    A --> C[3]
    B --> D[4]
    B --> E[5]
    C --> F[6]
    C --> G[7]

    style A fill:#e1f5ff
    style B fill:#e1f5ff
    style C fill:#e1f5ff
    style D fill:#90EE90
    style E fill:#90EE90
    style F fill:#90EE90
    style G fill:#90EE90
```

**Node Structure:**
```
class TreeNode:
    value
    left  → TreeNode
    right → TreeNode
```

### N-ary Tree
Each node can have **any number of children**.

```mermaid
graph TB
    A[1] --> B[2]
    A --> C[3]
    A --> D[4]
    A --> E[5]

    B --> F[6]
    B --> G[7]

    C --> H[8]

    style A fill:#e1f5ff
```

**Node Structure:**
```
class TreeNode:
    value
    children → List[TreeNode]
```

## Tree Traversals

Different ways to visit all nodes in a tree.

### 1. Depth-First Traversals (DFS)

#### Inorder (Left, Root, Right)
```mermaid
graph TB
    A[2<br/>visit 2nd] --> B[1<br/>visit 1st]
    A --> C[3<br/>visit 3rd]

    style A fill:#FFD700
    style B fill:#90EE90
    style C fill:#FFB6C1
```

**Order:** 1 → 2 → 3
**Use:** Get sorted order in BST

#### Preorder (Root, Left, Right)
```mermaid
graph TB
    A[2<br/>visit 1st] --> B[1<br/>visit 2nd]
    A --> C[3<br/>visit 3rd]

    style A fill:#90EE90
    style B fill:#FFD700
    style C fill:#FFB6C1
```

**Order:** 2 → 1 → 3
**Use:** Create copy of tree, prefix expression

#### Postorder (Left, Right, Root)
```mermaid
graph TB
    A[2<br/>visit 3rd] --> B[1<br/>visit 1st]
    A --> C[3<br/>visit 2nd]

    style A fill:#FFB6C1
    style B fill:#90EE90
    style C fill="#FFD700"
```

**Order:** 1 → 3 → 2
**Use:** Delete tree, postfix expression

### Visual Comparison of DFS Traversals

```mermaid
graph TB
    subgraph "Tree"
        A[4] --> B[2]
        A --> C[6]
        B --> D[1]
        B --> E[3]
        C --> F[5]
        C --> G[7]
    end

    PRE[Preorder: 4,2,1,3,6,5,7]
    IN[Inorder: 1,2,3,4,5,6,7]
    POST[Postorder: 1,3,2,5,7,6,4]

    style PRE fill:#90EE90
    style IN fill:#FFD700
    style POST fill:#FFB6C1
```

### 2. Breadth-First Traversal (BFS)

Also called **level-order traversal** - visit nodes level by level.

```mermaid
graph TB
    subgraph "Level Order"
        A[1<br/>Level 0] --> B[2<br/>Level 1]
        A --> C[3<br/>Level 1]
        B --> D[4<br/>Level 2]
        B --> E[5<br/>Level 2]
        C --> F[6<br/>Level 2]
    end

    ORDER[Order: 1 → 2 → 3 → 4 → 5 → 6]

    style ORDER fill:#FFD700
```

**Implementation:** Use a queue
**Use:** Find shortest path, level-by-level processing

### Traversal Visualization

```mermaid
graph LR
    subgraph "DFS: Stack/Recursion"
        D1[Go Deep First]
        D1 --> D2[Backtrack]
        D2 --> D3[Explore Next]
    end

    subgraph "BFS: Queue"
        B1[Visit Current Level]
        B1 --> B2[Add Children to Queue]
        B2 --> B3[Move to Next Level]
    end
```

## Binary Search Trees (BST)

A **binary search tree** has a special property:
- Left subtree < Node value
- Right subtree > Node value
- This property holds for **every node**

```mermaid
graph TB
    A[8<br/>Root] --> B[3<br/>all < 8]
    A --> C[10<br/>all > 8]

    B --> D[1]
    B --> E[6]

    E --> F[4]
    E --> G[7]

    C --> H[14]

    H --> I[13]

    style A fill:#FFD700
    style B fill:#90EE90
    style C fill:#FFB6C1
```

**BST Property Visualization:**
```
For node 8:
  Left subtree: {1, 3, 4, 6, 7} all < 8 ✓
  Right subtree: {10, 13, 14} all > 8 ✓
```

### BST Operations

| Operation | Average Case | Worst Case | Notes |
|-----------|-------------|------------|-------|
| Search | O(log n) | O(n) | O(n) if unbalanced |
| Insert | O(log n) | O(n) | Insert at correct leaf |
| Delete | O(log n) | O(n) | Complex: 3 cases |
| Min/Max | O(log n) | O(n) | Leftmost/rightmost |
| Inorder | O(n) | O(n) | Gives sorted order |

### BST Search Example

```mermaid
graph TB
    subgraph "Search for 6"
        A[8<br/>6 < 8 → go left] --> B[3<br/>6 > 3 → go right]
        A -.-> C[10]

        B -.-> D[1]
        B --> E[6<br/>Found! ✓]
    end

    style A fill:#e1f5ff
    style B fill:#e1f5ff
    style E fill:#90EE90
```

### BST Insert Example

```mermaid
graph TB
    subgraph "Insert 5"
        A[8<br/>5 < 8 → left] --> B[3<br/>5 > 3 → right]
        A --> C[10]

        B --> D[1]
        B --> E[6<br/>5 < 6 → left]

        E --> NEW[5<br/>Insert here! ✓]
        E --> G[7]
    end

    style NEW fill:#90EE90
```

## Balanced vs Unbalanced Trees

### Balanced Tree
Height ≈ log(n) - each subtree has similar size.

```mermaid
graph TB
    A[4<br/>Height: 2] --> B[2<br/>Height: 1]
    A --> C[6<br/>Height: 1]

    B --> D[1<br/>Height: 0]
    B --> E[3<br/>Height: 0]

    C --> F[5<br/>Height: 0]
    C --> G[7<br/>Height: 0]

    style A fill:#90EE90
```

**Properties:**
- Height = O(log n)
- Operations = O(log n)
- Well-distributed nodes

### Unbalanced Tree (Degenerate)
Height = n - like a linked list!

```mermaid
graph TB
    A[1<br/>Height: 6] --> B[2<br/>Height: 5]
    B --> C[3<br/>Height: 4]
    C --> D[4<br/>Height: 3]
    D --> E[5<br/>Height: 2]
    E --> F[6<br/>Height: 1]
    F --> G[7<br/>Height: 0]

    style A fill:#FFB6C1
```

**Problems:**
- Height = O(n)
- Operations = O(n)
- No better than linked list!

### Why Balance Matters

```mermaid
graph LR
    subgraph "Balanced BST"
        B1[Search: O log n]
        B2[Insert: O log n]
        B3[Delete: O log n]
    end

    subgraph "Unbalanced BST"
        U1[Search: O n]
        U2[Insert: O n]
        U3[Delete: O n]
    end

    style B1 fill:#90EE90
    style B2 fill:#90EE90
    style B3 fill:#90EE90
    style U1 fill:#FFB6C1
    style U2 fill:#FFB6C1
    style U3 fill:#FFB6C1
```

### Self-Balancing Trees (Overview)

- **AVL Tree:** Strict balancing (height diff ≤ 1)
- **Red-Black Tree:** Relaxed balancing (used in Java TreeMap)
- **B-Tree:** Multi-way tree (used in databases)
- **Splay Tree:** Move accessed items to root

All maintain O(log n) operations through rotations.

## Common Tree Properties

### Complete Binary Tree
All levels filled except possibly last, which fills left to right.

```mermaid
graph TB
    A[1] --> B[2]
    A --> C[3]
    B --> D[4]
    B --> E[5]
    C --> F[6]

    style A fill:#90EE90
    style B fill:#90EE90
    style C fill:#90EE90
    style D fill:#90EE90
    style E fill:#90EE90
    style F fill:#90EE90
```

**Use:** Heaps are complete binary trees

### Full Binary Tree
Every node has 0 or 2 children (no nodes with 1 child).

```mermaid
graph TB
    A[1] --> B[2]
    A --> C[3]
    B --> D[4]
    B --> E[5]

    style A fill:#FFD700
    style B fill:#FFD700
    style C fill:#90EE90
    style D fill:#90EE90
    style E fill:#90EE90
```

### Perfect Binary Tree
All internal nodes have 2 children, all leaves at same level.

```mermaid
graph TB
    A[1] --> B[2]
    A --> C[3]
    B --> D[4]
    B --> E[5]
    C --> F[6]
    C --> G[7]

    style A fill:#90EE90
    style B fill:#90EE90
    style C fill:#90EE90
    style D fill:#90EE90
    style E fill:#90EE90
    style F fill:#90EE90
    style G fill:#90EE90
```

**Properties:**
- Total nodes = 2^h - 1
- Leaf nodes = 2^(h-1)
- Most "efficient" shape

## Common Tree Patterns

### Pattern 1: Recursive Traversal
Most tree problems are naturally recursive:
```
function traverse(node):
    if node is null: return
    process(node)
    traverse(node.left)
    traverse(node.right)
```

### Pattern 2: Level-Order (BFS)
Use queue for level-by-level processing:
```
queue = [root]
while queue not empty:
    node = queue.dequeue()
    process(node)
    enqueue left and right children
```

### Pattern 3: Path Problems
Track path from root to current node:
- Sum root-to-leaf paths
- Find path with target sum
- All paths to leaves

### Pattern 4: Subtree Problems
Check property recursively:
- Is valid BST?
- Is balanced?
- Is symmetric?

### Pattern 5: Ancestor Problems
Use recursion return values:
- Lowest common ancestor
- Distance between nodes
- Path between nodes

## Tree Complexity Summary

| Property | Binary Tree | BST (Balanced) | BST (Unbalanced) |
|----------|-------------|----------------|------------------|
| Height | O(n) | O(log n) | O(n) |
| Search | O(n) | O(log n) | O(n) |
| Insert | N/A | O(log n) | O(n) |
| Delete | N/A | O(log n) | O(n) |
| Space | O(n) | O(n) | O(n) |
| Traversal | O(n) | O(n) | O(n) |

## When to Use Trees

### Trees Excel At:
- ✅ Hierarchical data (file system, org chart)
- ✅ Fast search in sorted data (BST)
- ✅ Range queries (BST)
- ✅ Priority operations (heap - special tree)
- ✅ Expression parsing (syntax trees)

### Avoid Trees When:
- ❌ Need constant-time access by index
- ❌ Frequent insertions/deletions at arbitrary positions
- ❌ Data is not hierarchical
- ❌ Simple sequential processing

## Common Pitfalls

1. **Null pointer errors:** Always check if node is null
2. **Not handling edge cases:** Empty tree, single node
3. **Wrong traversal order:** Choose correct traversal for problem
4. **Modifying tree during traversal:** Can break iteration
5. **Stack overflow:** Deep recursion on unbalanced tree
6. **Confusing height and depth:** Height goes down, depth goes up

## Practice Strategy

Master these problems in order:

**Basic Traversals:**
1. Binary Tree Inorder Traversal (recursion and iteration)
2. Binary Tree Level Order Traversal (BFS)
3. Maximum Depth of Binary Tree (recursion)

**BST Operations:**
4. Validate Binary Search Tree (property checking)
5. Lowest Common Ancestor of BST (BST property usage)
6. Insert into BST (BST modification)

**Advanced:**
7. Path Sum (root-to-leaf paths)
8. Symmetric Tree (recursion pattern)
9. Serialize/Deserialize Binary Tree (encoding/decoding)

## Key Takeaways

1. Trees are **recursive structures** - most solutions use recursion
2. **BST property** enables O(log n) operations when balanced
3. **Traversal order matters** - choose based on problem needs
4. **Balanced trees** maintain O(log n) height
5. **Inorder traversal of BST** gives sorted order
6. Many problems combine multiple patterns (traversal + path tracking)

Understanding trees is fundamental for advanced data structures (heaps, tries, segment trees) and graph algorithms!
