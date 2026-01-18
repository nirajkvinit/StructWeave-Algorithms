---
id: M458
old_id: A314
slug: shortest-path-visiting-all-nodes
title: Shortest Path Visiting All Nodes
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Shortest Path Visiting All Nodes

## Problem

You have an undirected graph with nodes numbered from 0 to n-1, represented as an adjacency list where `graph[i]` contains all the nodes directly connected to node `i`.

Your goal is to find the shortest path that visits every node at least once. Here's what makes this interesting:
- You can start at any node you choose
- You can end at any node (doesn't have to be where you started)
- You're allowed to revisit nodes and reuse edges as many times as needed
- You want to minimize the total number of edges traversed

For example, if you have a star-shaped graph where node 1 connects to nodes 0, 2, and 3, the shortest tour would be: start at 1, visit 0, return to 1, visit 2, return to 1, visit 3. That's 4 edges total.

Return the minimum number of edges needed to visit all nodes at least once.

## Why This Matters

This problem is a variant of the famous Traveling Salesman Problem and appears in logistics route planning, where delivery trucks need to visit all stops using the shortest route. In network topology, you might need to find the shortest "gossip path" that spreads information to all servers. Computer chip design uses similar algorithms to route signals through all components efficiently. In robotics, path planning with obstacles requires visiting all target locations with minimum movement. The bitmask state-tracking technique you'll learn is essential for dynamic programming on subsets, which appears in job scheduling with dependencies, resource allocation, and compiler optimization for register allocation.

## Examples

**Example 1:**
```
Graph: 0---1---2---3
Shortest path: 0->1->2->3 = 3 edges
(or start from any end, traverse linearly)
```

**Example 2:**
```
Graph:  0---1
         \ /
          2
          |
          3
Shortest path: Start at 1, visit 0, back to 1, visit 2, visit 3 = 4 edges
```

## Constraints

- n == graph.length
- 1 <= n <= 12
- 0 <= graph[i].length < n
- graph[i] does not contain i.
- If graph[a] contains b, then graph[b] contains a.
- The input graph is always connected.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a graph traversal problem with state tracking. The key challenge is that visiting all nodes doesn't mean finding a simple path - you can revisit nodes and edges. You need to track which nodes have been visited as a set (bitmask), and the current node position. The state is (current_node, visited_set).
</details>

<details>
<summary>🎯 Main Approach</summary>
Use BFS with state representation as (node, mask) where mask represents the set of visited nodes using bits. Start BFS from ALL nodes simultaneously (since you can start anywhere). The first state where mask equals (1 << n) - 1 (all nodes visited) gives you the shortest path. Use a visited set to avoid processing the same state twice.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Since n <= 12, a bitmask can efficiently represent visited states (2^12 = 4096 possible states per node). Use a 2D visited array or set with (node, mask) pairs. Multi-source BFS (starting from all nodes) is crucial - don't just try each starting node separately, as that would be inefficient.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n! × n) | O(n) | Try all permutations of nodes - too slow |
| BFS with Bitmask | O(n × 2^n) | O(n × 2^n) | Each of n nodes with 2^n possible visited states |

## Common Mistakes

1. **Starting from only one node**
   ```python
   # Wrong: Only starting from node 0
   queue = [(0, 1 << 0)]  # Only one starting point

   # Correct: Start from all nodes simultaneously
   queue = [(i, 1 << i) for i in range(n)]
   ```

2. **Not tracking visited states properly**
   ```python
   # Wrong: Only tracking nodes visited
   visited = set()
   visited.add(node)

   # Correct: Track (node, visited_mask) state
   visited = set()
   visited.add((node, mask))
   ```

3. **Confusing state representation**
   ```python
   # Wrong: Using list to track visited nodes (slow and complex)
   visited_nodes = [1, 0, 0, 1]

   # Correct: Using bitmask for efficient state tracking
   mask = (1 << 0) | (1 << 3)  # Nodes 0 and 3 visited
   all_visited = (1 << n) - 1  # All n nodes visited
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Traveling Salesman Problem | Hard | Must return to starting point, different optimization goal |
| Hamiltonian Path | Hard | Must visit each node exactly once (no revisiting) |
| Minimum Spanning Tree | Medium | Connect all nodes with minimum edge weight sum |
| Graph Connectivity | Easy | Just check if all nodes are reachable |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Graph BFS](../../strategies/patterns/breadth-first-search.md)
