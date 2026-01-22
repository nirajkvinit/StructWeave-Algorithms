---
id: M329
old_id: A151
slug: redundant-connection
title: Redundant Connection
difficulty: medium
category: medium
topics: ["graph"]
patterns: []
estimated_time_minutes: 30
frequency: high
related_problems:
  - id: M330
    title: Longest Univalue Path
    difficulty: medium
  - id: M336
    title: Number of Distinct Islands
    difficulty: medium
  - id: M337
    title: Max Area of Island
    difficulty: medium
prerequisites:
  - Union-Find data structure
  - Graph traversal (DFS/BFS)
  - Tree properties
strategy_ref: ../prerequisites/graphs.md
---
# Redundant Connection

## Problem

You're given an undirected graph that was originally a tree (connected, no cycles) but has had exactly one extra edge added to it. The graph has n nodes numbered 1 to n, and you receive the edge list as an array where each element `edges[i] = [ai, bi]` represents an undirected connection between nodes ai and bi.

Your task is to identify which edge, when removed, would restore the graph to a valid tree. If multiple edges could work, return the one that appears last in the input array.

The key insight is understanding what makes a tree: a tree with n nodes has exactly n-1 edges and contains no cycles. Since your input has n edges, exactly one is redundant. When you add an edge that connects two nodes already in the same connected component, you create a cycle, making that edge the culprit.

For example, consider edges = [[1,2], [1,3], [2,3]]. After adding [1,2] and [1,3], nodes 1, 2, and 3 are connected in a tree structure. When you add [2,3], you create a triangle (a cycle), so [2,3] is the redundant edge to remove.

The challenge is efficiently detecting which edge creates the cycle as you process edges sequentially. You can't just remove edges and test connectivity; you need to track connected components dynamically as edges are added.

## Why This Matters

Understanding cycle detection in graphs is fundamental for many real-world systems: detecting circular dependencies in build systems, finding redundant connections in networks to improve reliability, validating data integrity in databases, and optimizing routing in communication networks.

This problem introduces the Union-Find (Disjoint Set Union) data structure, one of the most elegant and practical data structures in computer science. Union-Find excels at tracking dynamic connectivity and appears in Kruskal's minimum spanning tree algorithm, network connectivity analysis, and image segmentation.

Learning to identify when a problem needs Union-Find versus DFS/BFS is a valuable algorithmic skill. Union-Find provides near-constant time operations for connectivity queries, making it ideal for this problem.

## Constraints

- n == edges.length
- 3 <= n <= 1000
- edges[i].length == 2
- 1 <= ai < bi <= edges.length
- ai != bi
- There are no repeated edges.
- The given graph is connected.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding Tree Properties</summary>

A tree with `n` nodes has exactly `n-1` edges. Since the input has `n` edges, exactly one edge is redundant. The key insight is that when you add an edge that connects two nodes already in the same connected component, you create a cycle.

Think about processing edges one at a time. How can you track which nodes are already connected?

</details>

<details>
<summary>Hint 2: Union-Find Approach</summary>

Use the Union-Find (Disjoint Set Union) data structure to track connected components as you process edges sequentially. For each edge `[u, v]`:

1. Check if `u` and `v` are already in the same component (using `find` operation)
2. If they are, this edge creates a cycle - it's the redundant edge
3. If they aren't, merge their components (using `union` operation)

Since you want the last redundant edge in the input, process edges in order and return the first edge that creates a cycle.

</details>

<details>
<summary>Hint 3: Implementation Details</summary>

Implement Union-Find with path compression and union by rank for optimal performance:

```
parent[i] = i initially (each node is its own parent)
rank[i] = 0 initially

find(x):
  if parent[x] != x:
    parent[x] = find(parent[x])  # path compression
  return parent[x]

union(x, y):
  px, py = find(x), find(y)
  if px == py: return False  # already connected
  if rank[px] < rank[py]:
    parent[px] = py
  elif rank[px] > rank[py]:
    parent[py] = px
  else:
    parent[py] = px
    rank[px] += 1
  return True
```

The first edge where `union` returns `False` is your answer.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| DFS for Each Edge | O(n²) | O(n) | Check for cycle after adding each edge |
| Union-Find (naive) | O(n²) | O(n) | Without path compression optimization |
| Union-Find (optimized) | O(n α(n)) | O(n) | With path compression and union by rank |

Note: α(n) is the inverse Ackermann function, which grows extremely slowly (effectively constant for practical values).

## Common Mistakes

### Mistake 1: Returning First Edge Instead of Last
```python
# WRONG: Processing edges in reverse or checking all edges
def findRedundantConnection(edges):
    parent = list(range(len(edges) + 1))

    # Wrong: collecting all redundant edges and returning first
    redundant = []
    for u, v in edges:
        if find(u, parent) == find(v, parent):
            redundant.append([u, v])
        else:
            union(u, v, parent)

    return redundant[0]  # Should return last, not first!
```

**Why it's wrong**: The problem asks for the last redundant edge in the input. Since there's only one redundant edge, you should return immediately when you find it (which will be the last/only one).

### Mistake 2: Incorrect Union-Find Implementation
```python
# WRONG: No path compression or union by rank
def find(x, parent):
    while parent[x] != x:
        x = parent[x]  # Missing path compression
    return x

def union(x, y, parent):
    px, py = find(x, parent), find(y, parent)
    parent[px] = py  # No rank consideration
```

**Why it's wrong**: While this basic implementation is functionally correct, it can degrade to O(n) per operation in worst case. Path compression and union by rank optimize it to nearly O(1) amortized time.

### Mistake 3: Off-by-One Indexing
```python
# WRONG: Incorrect parent array initialization
def findRedundantConnection(edges):
    n = len(edges)
    parent = list(range(n))  # Bug: should be range(n+1)

    for u, v in edges:
        # u and v are 1-indexed, but parent only goes 0 to n-1
        if find(u, parent) == find(v, parent):  # Index error!
            return [u, v]
```

**Why it's wrong**: Nodes are numbered from 1 to n, so the parent array needs indices from 0 to n (size n+1), even though index 0 won't be used.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Redundant Connection II | Hard | Directed graph with one extra edge (handle root conflicts) |
| Find All Redundant Edges | Medium | Return all edges that could be removed to form a tree |
| Minimum Redundant Connection | Hard | Remove minimum edges to make graph a tree (multiple extra edges) |
| Weighted Graph Version | Hard | Find redundant edge with minimum weight |

## Practice Checklist

- [ ] **First attempt**: Solve independently (45 min time limit)
- [ ] **Implement**: Code Union-Find from scratch without looking up
- [ ] **Optimize**: Implement both path compression and union by rank
- [ ] **Test**: Verify with graphs of different shapes (star, line, cycle)
- [ ] **Spaced repetition**: Revisit after 3 days
- [ ] **Interview practice**: Explain Union-Find in under 3 minutes
- [ ] **Variations**: Solve Redundant Connection II (directed version)
- [ ] **Final review**: Solve again after 1 week without hints

**Strategy**: See [Graph Pattern](../prerequisites/graphs.md)
