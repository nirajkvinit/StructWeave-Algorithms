---
id: H091
old_id: A152
slug: redundant-connection-ii
title: Redundant Connection II
difficulty: hard
category: hard
topics: ["array", "tree", "graph"]
patterns: []
estimated_time_minutes: 45
strategy_ref: ../strategies/data-structures/trees.md
---
# Redundant Connection II

## Problem

You are given a directed graph with `n` nodes labeled from `1` to `n`. Originally, this graph formed a valid rooted tree where one node serves as the root, every other node is reachable from the root, and each non-root node has exactly one incoming edge (one parent). However, one extra directed edge has been added to this structure.

The graph is represented as a 2D array `edges`, where each pair `[ui, vi]` indicates a directed edge from parent node `ui` to child node `vi`.

Your objective is to identify which edge can be removed to restore the valid rooted tree structure. If multiple edges could be removed to achieve this, return the one that appears last in the input array.


**Diagram:**

Example 1: Directed graph with cycle
```
  1 → 2
  ↓   ↓
  4 ← 3  (extra edge: 4→1 creates cycle)
```

Example 2: Node with two parents
```
  1 → 2
      ↓
  5 → 3 ← 4  (node 3 has two parents: 2 and 4)
```


## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Constraints

- n == edges.length
- 3 <= n <= 1000
- edges[i].length == 2
- 1 <= ui, vi <= n
- ui != vi

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [Array Pattern](../strategies/data-structures/trees.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
There are two types of invalid configurations in a directed tree with one extra edge: (1) a node with two parents, or (2) a cycle without a node having two parents. Use Union-Find to detect cycles while tracking parent conflicts.
</details>

<details>
<summary>🎯 Main Approach</summary>
First, check if any node has two incoming edges. If found, mark both as candidates. Then use Union-Find to detect cycles: if a node with two parents exists, remove the second edge that causes issues; if only a cycle exists without dual parents, remove the edge that completes the cycle.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Process edges sequentially with Union-Find. When you encounter a node with two parents, try removing the second edge first (it appears later). If that doesn't work, the first edge must be removed. For cycle-only cases, the last edge forming the cycle is always removable.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(n) | Try removing each edge and validate |
| Union-Find | O(n·α(n)) | O(n) | α(n) is inverse Ackermann function |
| Optimal | O(n·α(n)) | O(n) | Single pass with Union-Find |

## Common Mistakes

1. **Not handling both invalid cases**
   ```python
   # Wrong: Only checking for cycles
   def findRedundant(edges):
       parent = list(range(len(edges) + 1))
       for u, v in edges:
           if find(parent, u) == find(parent, v):
               return [u, v]  # Misses dual-parent case

   # Correct: Check for dual parents first
   def findRedundant(edges):
       candidates = []
       parent_count = {}
       for u, v in edges:
           parent_count[v] = parent_count.get(v, 0) + 1
           if parent_count[v] == 2:
               candidates.append([u, v])
       # Then apply Union-Find logic
   ```

2. **Removing wrong edge when node has two parents**
   ```python
   # Wrong: Always removing first edge found
   if len(candidates) == 2:
       return candidates[0]  # Should try second first

   # Correct: Try removing later edge first
   if len(candidates) == 2:
       # Try removing second edge, fall back to first
       return candidates[1] if isValid(edges, candidates[1]) else candidates[0]
   ```

3. **Incorrect Union-Find implementation for directed graphs**
   ```python
   # Wrong: Using standard Union-Find without considering direction
   def union(parent, x, y):
       parent[find(parent, x)] = find(parent, y)  # Ignores edge direction

   # Correct: Process edges respecting parent-child relationship
   def union(parent, child, par):
       # In directed graph, child points to parent
       if find(parent, child) == child:
           parent[child] = par
           return True
       return False  # Cycle detected
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Redundant Connection I | Medium | Undirected graph, simpler Union-Find |
| Find Critical Edges | Hard | Identify all edges whose removal disconnects graph |
| Detect Cycle in Directed Graph | Medium | No edge removal requirement |
| Course Schedule II | Medium | Topological sort on directed graph |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (dual parents, cycle-only, edge order)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Union-Find](../../strategies/data-structures/union-find.md) | [Tree Algorithms](../../strategies/data-structures/trees.md)
