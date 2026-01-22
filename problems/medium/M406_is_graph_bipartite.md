---
id: M406
old_id: A252
slug: is-graph-bipartite
title: Is Graph Bipartite
difficulty: medium
category: medium
topics: ["array", "graph"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../prerequisites/graphs.md
---
# Is Graph Bipartite

## Problem

An undirected graph with `n` nodes (labeled `0` through `n-1`) is represented as an adjacency list in a 2D array `graph`. Each `graph[u]` contains a list of nodes adjacent to node `u`, meaning there's a bidirectional edge between `u` and every node in `graph[u]`.

The graph satisfies these properties:
- No self-loops: no node has an edge to itself
- No duplicate edges: each pair of nodes has at most one edge
- Symmetric edges: if `v` appears in `graph[u]`, then `u` appears in `graph[v]`
- Possibly disconnected: the graph may consist of multiple separate components

A graph is **bipartite** if you can divide all its nodes into two disjoint sets A and B such that every edge connects a node in set A to a node in set B. In other words, no two nodes within the same set share an edge.

Think of it like coloring a map with two colors where adjacent regions must have different colors. If you can successfully color the entire graph this way, it's bipartite. This is equivalent to saying the graph contains no odd-length cycles - any cycle must have an even number of nodes.

For example, a square graph (4 nodes in a cycle) is bipartite: you can alternate colors around the cycle. But a triangle (3 nodes in a cycle) is not bipartite: you'd need three colors to ensure no adjacent nodes share a color.

Return `true` if the graph is bipartite, `false` otherwise.


**Diagram:**

```
Example 1: graph = [[1,2,3],[0,2],[0,1,3],[0,2]]

Graph visualization:
    0 ─── 1
    │  ╲╱ │
    │  ╱╲ │
    3 ─── 2

Attempting bipartite coloring:
Group A (○): {0, 2}
Group B (●): {1, 3}

Edges:
0-1: A-B ✓
0-2: A-A ✗ (both in same group)
0-3: A-B ✓
1-2: B-A ✓
2-3: A-B ✓

Not bipartite → return false

Example 2: graph = [[1,3],[0,2],[1,3],[0,2]]

Graph visualization:
    0 ─── 1
    │     │
    │     │
    3 ─── 2

Bipartite coloring:
Group A (○): {0, 2}
Group B (●): {1, 3}

Edges:
0-1: A-B ✓
0-3: A-B ✓
1-2: B-A ✓
2-3: A-B ✓

All edges connect different groups → return true
```


## Why This Matters

Bipartite graphs have important real-world applications. They naturally model relationships between two distinct types of entities: users and products (recommendation systems), students and courses (scheduling), jobs and workers (assignment problems), or any scenario where connections only exist between two categories.

This problem teaches graph coloring, a fundamental technique in graph theory. The 2-coloring approach used here extends to more complex coloring problems in register allocation, frequency assignment, and scheduling.

Understanding bipartiteness also deepens your knowledge of graph properties. The equivalence between "2-colorable" and "no odd cycles" is a beautiful mathematical insight that appears throughout discrete mathematics and theoretical computer science.

## Constraints

- graph.length == n
- 1 <= n <= 100
- 0 <= graph[u].length < n
- 0 <= graph[u][i] <= n - 1
- graph[u] does not contain u.
- All the values of graph[u] are **unique**.
- If graph[u] contains v, then graph[v] contains u.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [Array Pattern](../prerequisites/graphs.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
A graph is bipartite if and only if it contains no odd-length cycles. This is equivalent to being 2-colorable: you can color all nodes with two colors such that no adjacent nodes share the same color. Use BFS or DFS to attempt coloring, and if you find a conflict, the graph is not bipartite.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use graph coloring with BFS or DFS. Start by coloring an uncolored node with color 0, then color all its neighbors with color 1, their neighbors with color 0, and so on. If you ever try to color a node that's already colored with the opposite color, return false. Since the graph may be disconnected, repeat this process for all unvisited nodes.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use an array to track colors instead of a dictionary for better performance (-1 for unvisited, 0 and 1 for two colors). Both BFS and DFS work equally well - BFS might be slightly more intuitive for this problem. Don't forget to handle disconnected components by checking all nodes.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS with Coloring | O(V + E) | O(V) | Visit each vertex and edge once |
| DFS with Coloring | O(V + E) | O(V) | Same complexity as BFS |
| Optimal | O(V + E) | O(V) | Cannot do better than visiting all nodes/edges |

## Common Mistakes

1. **Forgetting disconnected components**
   ```python
   # Wrong: Only starting from node 0
   def isBipartite(graph):
       n = len(graph)
       color = [-1] * n
       queue = [0]
       color[0] = 0

       while queue:
           node = queue.pop(0)
           for neighbor in graph[node]:
               if color[neighbor] == -1:
                   color[neighbor] = 1 - color[node]
                   queue.append(neighbor)
               elif color[neighbor] == color[node]:
                   return False
       return True  # Missing: might have unvisited components

   # Correct: Check all nodes
   def isBipartite(graph):
       n = len(graph)
       color = [-1] * n

       for start in range(n):
           if color[start] != -1:
               continue
           queue = [start]
           color[start] = 0

           while queue:
               node = queue.pop(0)
               for neighbor in graph[node]:
                   if color[neighbor] == -1:
                       color[neighbor] = 1 - color[node]
                       queue.append(neighbor)
                   elif color[neighbor] == color[node]:
                       return False
       return True
   ```

2. **Not validating already colored nodes**
   ```python
   # Wrong: Overwriting colors without checking
   for neighbor in graph[node]:
       color[neighbor] = 1 - color[node]  # Might conflict
       queue.append(neighbor)

   # Correct: Check if already colored
   for neighbor in graph[node]:
       if color[neighbor] == -1:
           color[neighbor] = 1 - color[node]
           queue.append(neighbor)
       elif color[neighbor] == color[node]:
           return False
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Possible bipartition | Medium | Same problem, different context |
| Course schedule (detect cycle) | Medium | Related graph validation |
| Minimum height trees | Medium | Different graph property to check |
| Graph valid tree | Medium | Similar graph validation pattern |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Graph Traversal](../../prerequisites/graphs.md)
