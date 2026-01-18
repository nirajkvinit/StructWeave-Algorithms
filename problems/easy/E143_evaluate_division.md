---
id: E143
old_id: I198
slug: evaluate-division
title: Evaluate Division
difficulty: easy
category: easy
topics: ["array", "graph", "dfs", "bfs", "union-find"]
patterns: ["graph-traversal", "weighted-edges"]
estimated_time_minutes: 15
frequency: medium
related_problems:
  - M399
  - M990
  - H839
prerequisites:
  - graph representation
  - DFS/BFS traversal
  - union-find basics
strategy_ref: ../strategies/data-structures/graphs.md
---
# Evaluate Division

## Problem

You are given equations representing division relationships between variables, along with their numeric results. Using these known relationships, you must evaluate queries asking for other division results.

**Input structure:**
- Array `equations` where `equations[i] = [Ai, Bi]` represents two variable names (strings)
- Array `values` where `values[i]` gives the result of `Ai / Bi` (a positive double)
- Array `queries` where `queries[j] = [Cj, Dj]` asks you to compute `Cj / Dj`

**The challenge:** Given only direct division relationships, you must compute indirect ones through transitive calculation. For example, if you know `a/b = 2.0` and `b/c = 3.0`, you can deduce that `a/c = 6.0` by multiplying the relationships (since `a = 2b` and `b = 3c`, therefore `a = 6c`).

**Special cases to handle:**
- If a query involves undefined variables (not appearing in any equation), return `-1.0`
- Any variable divided by itself equals `1.0` (e.g., `a/a = 1.0`)
- If no path connects two variables, the division is undefined, return `-1.0`

The key insight is recognizing this as a graph problem where variables are nodes and division results are weighted directed edges. Finding `x/y` becomes finding a path from x to y and multiplying edge weights along that path.

**Note:** All inputs are guaranteed valid with no contradictions or division by zero in the given equations.

## Why This Matters

This problem demonstrates how to model abstract relationships as graphs, a powerful technique used in knowledge graphs (semantic web, recommendation systems), unit conversion systems (converting meters to feet via intermediate units), currency exchange (finding exchange rates through intermediary currencies), and dependency resolution (build systems, package managers).

The weighted graph traversal pattern appears in network routing (finding paths with capacity constraints), scientific computing (solving systems of equations), and social network analysis (finding connection strength between people). Understanding that division creates reciprocal edges (`a/b = 2.0` implies `b/a = 0.5`) teaches graph symmetry properties.

This problem also introduces the concept of path products (multiplying weights along a path), which differs from typical shortest-path problems that sum weights. This multiplicative path calculation appears in probability computations and compounding relationships.

## Examples

**Example 1:**
- Input: `equations = [["a","b"],["b","c"]], values = [2.0,3.0], queries = [["a","c"],["b","a"],["a","e"],["a","a"],["x","x"]]`
- Output: `[6.00000,0.50000,-1.00000,1.00000,-1.00000]`
- Explanation: We know a / b = 2.0 and b / c = 3.0. Therefore a / c = 6.0 (by multiplication), b / a = 0.5 (reciprocal). Since 'e' and 'x' are undefined, queries involving them return -1.0. Any variable divided by itself equals 1.0.

**Example 2:**
- Input: `equations = [["a","b"],["b","c"],["bc","cd"]], values = [1.5,2.5,5.0], queries = [["a","c"],["c","b"],["bc","cd"],["cd","bc"]]`
- Output: `[3.75000,0.40000,5.00000,0.20000]`

**Example 3:**
- Input: `equations = [["a","b"]], values = [0.5], queries = [["a","b"],["b","a"],["a","c"],["x","y"]]`
- Output: `[0.50000,2.00000,-1.00000,-1.00000]`

## Constraints

- 1 <= equations.length <= 20
- equations[i].length == 2
- 1 <= Ai.length, Bi.length <= 5
- values.length == equations.length
- 0.0 < values[i] <= 20.0
- 1 <= queries.length <= 20
- queries[i].length == 2
- 1 <= Cj.length, Dj.length <= 5
- Ai, Bi, Cj, Dj consist of lower case English letters and digits.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Tier 1 Hint - Core Concept
Model this as a weighted directed graph where each variable is a node and each equation creates two edges: if a/b = 2.0, add edge a→b with weight 2.0 and edge b→a with weight 0.5. To answer a query c/d, find a path from c to d and multiply all edge weights along the path. If no path exists or either variable is undefined, return -1.

### Tier 2 Hint - Implementation Details
Build an adjacency list graph: `graph[a] = [(b, value)]` where value = a/b. For each equation, add both directions. For queries, use DFS or BFS to find a path. DFS approach: from start node, explore neighbors and multiply accumulated product by edge weight. Use a visited set to avoid cycles. If you reach the target, return the product; if no path exists, return -1.

### Tier 3 Hint - Optimization Strategy
Use DFS with memoization for efficiency. Graph construction: O(E) where E = len(equations). Each query: O(V + E) in worst case. Total: O(E + Q*(V+E)) where Q = len(queries). Alternative: Union-Find with weighted edges can optimize repeated queries, but DFS is simpler. Handle edge cases: self-division (a/a = 1.0), undefined variables, disconnected components.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| DFS per Query | O(E + Q*(V+E)) | O(V+E) | Build graph + search for each query |
| BFS per Query | O(E + Q*(V+E)) | O(V+E) | Similar to DFS |
| Floyd-Warshall | O(V³) | O(V²) | Precompute all pairs (overkill) |
| Union-Find with Weights | O(E*α(V) + Q*α(V)) | O(V) | Weighted union-find, amortized |

## Common Mistakes

### Mistake 1: Forgetting reciprocal edges
```python
# Incomplete - only adds one direction
def calcEquation(equations, values, queries):
    graph = {}
    for (a, b), val in zip(equations, values):
        graph.setdefault(a, []).append((b, val))
        # Missing: graph.setdefault(b, []).append((a, 1/val))

    # Query logic...
```

**Why it's wrong:** If we only store a→b, we can't find paths from b→a. Must add both directions.

**Fix:** Add reciprocal edge with inverse weight.

### Mistake 2: Not handling cycles in DFS
```python
# Wrong - infinite loop on cycles
def dfs(graph, start, end, product):
    if start == end:
        return product

    # Missing visited set!
    for neighbor, val in graph.get(start, []):
        result = dfs(graph, neighbor, end, product * val)
        if result != -1:
            return result
    return -1
```

**Why it's wrong:** Without visited tracking, DFS can loop infinitely on cycles.

**Fix:** Pass visited set and mark nodes as visited.

### Mistake 3: Not checking for undefined variables
```python
# Incomplete - doesn't check if variables exist
def calcEquation(equations, values, queries):
    graph = {}
    # Build graph...

    results = []
    for c, d in queries:
        # Should check: if c not in graph or d not in graph
        result = dfs(graph, c, d, 1.0, set())
        results.append(result)
    return results
```

**Why it's wrong:** If a variable doesn't appear in equations, it's undefined and should return -1.0.

**Fix:** Check `if c not in graph or d not in graph: return -1.0` before DFS.

## Variations

| Variation | Difference | Difficulty Δ |
|-----------|-----------|-------------|
| Evaluate multiplication chains | Multiply instead of divide | 0 |
| Evaluate with inequalities | Include < and > relationships | +1 |
| Find all reachable divisions | List all computable a/b pairs | +1 |
| Verify equation consistency | Check if new equation contradicts existing | +1 |
| Optimize for many queries | Precompute all paths | +1 |
| Add new equations dynamically | Support updates to graph | +1 |

## Practice Checklist

Track your progress on this problem:

- [ ] Solved using graph + DFS approach
- [ ] Handled all edge cases (undefined vars, self-division)
- [ ] Implemented BFS alternative solution
- [ ] After 1 day: Re-solved from memory
- [ ] After 1 week: Solved in < 15 minutes
- [ ] Explained graph modeling to someone

**Strategy**: See [Graph Traversal Pattern](../strategies/data-structures/graphs.md)
