---
id: M255
old_id: A044
slug: number-of-provinces
title: Number of Provinces
difficulty: medium
category: medium
topics: ["graph", "union-find", "depth-first-search", "breadth-first-search"]
patterns: ["union-find", "dfs", "bfs", "connected-components"]
estimated_time_minutes: 30
frequency: high
related_problems:
  - M200_number_of_islands.md
  - M684_redundant_connection.md
  - M323_number_of_connected_components.md
prerequisites:
  - graph representations (adjacency matrix)
  - DFS/BFS basics
  - union-find (disjoint set) data structure
---
# Number of Provinces

## Problem

Given n cities where some pairs are directly connected by roads, count how many distinct provinces exist. A province is a group of cities that are connected to each other either directly or indirectly through other cities, with no connections to cities outside the group.

You receive an n × n adjacency matrix called isConnected where isConnected[i][j] equals 1 if cities i and j have a direct road between them, and 0 otherwise. The matrix is symmetric (isConnected[i][j] always equals isConnected[j][i]) and every city is considered connected to itself (isConnected[i][i] equals 1).

Think of this as a graph connectivity problem: each city is a node, each road is an edge, and each province is a connected component. If city A connects to city B, and city B connects to city C, then all three cities belong to the same province even though A and C have no direct road.

For example, with three cities where 0 and 1 are connected but 2 is isolated, you have two provinces: {0,1} and {2}. The adjacency matrix would show 1s at positions [0][1] and [1][0], with 1s along the diagonal, and 0s everywhere else.

You can solve this using depth-first search (exploring all cities reachable from each unvisited city), breadth-first search (same idea with a queue), or union-find (merging connected cities into sets and counting distinct sets). Each approach has the same time complexity, but union-find is particularly elegant for connectivity problems.

## Why This Matters

Counting connected components is fundamental to network analysis, social network clustering, circuit design, and distributed systems. When Facebook suggests friend groups or LinkedIn identifies professional networks, they're solving similar problems at scale. Union-find data structure, one solution approach, is also used in Kruskal's minimum spanning tree algorithm and in compilers for optimization passes. This problem appears frequently in interviews because it tests graph fundamentals while allowing multiple valid approaches, letting you demonstrate both breadth of knowledge and ability to choose the right tool.

## Constraints

- 1 <= n <= 200
- n == isConnected.length
- n == isConnected[i].length
- isConnected[i][j] is 1 or 0.
- isConnected[i][i] == 1
- isConnected[i][j] == isConnected[j][i]

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Think of This as Connected Components</summary>

This problem is essentially asking: "How many connected components are in an undirected graph?"

Each province is a connected component. You can solve this using:
- **DFS**: Start from each unvisited city, mark all cities reachable from it as one province
- **BFS**: Similar to DFS but using a queue
- **Union-Find**: Merge connected cities into sets; count distinct sets at the end

All three approaches work, but Union-Find is most elegant for this connectivity problem.
</details>

<details>
<summary>Hint 2: DFS/BFS Approach</summary>

Use a visited array to track which cities you've already assigned to a province:

```python
visited = [False] * n
provinces = 0

for city in range(n):
    if not visited[city]:
        provinces += 1
        # DFS/BFS to mark all cities in this province
        dfs(city, visited, isConnected)
```

In the DFS/BFS function, mark the current city as visited and recursively visit all connected cities (where isConnected[city][neighbor] == 1).
</details>

<details>
<summary>Hint 3: Union-Find Approach</summary>

Union-Find is perfect for this problem because it's designed for connectivity queries:

1. Initialize each city as its own parent (n components initially)
2. For each connection isConnected[i][j] == 1, union cities i and j
3. Count the number of distinct root parents

```python
parent = list(range(n))

def find(x):
    if parent[x] != x:
        parent[x] = find(parent[x])  # Path compression
    return parent[x]

def union(x, y):
    parent[find(x)] = find(y)

# Union all connected cities
for i in range(n):
    for j in range(i+1, n):
        if isConnected[i][j] == 1:
            union(i, j)

# Count distinct roots
return len(set(find(i) for i in range(n)))
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| DFS | O(n²) | O(n) | Visit each cell in matrix once; visited array |
| BFS | O(n²) | O(n) | Same as DFS; queue instead of recursion stack |
| Union-Find (naive) | O(n² × n) | O(n) | n² connections, O(n) find operations |
| Union-Find (optimized) | O(n² × α(n)) | O(n) | With path compression & union by rank; α(n) ≈ constant |

## Common Mistakes

### Mistake 1: Not Marking All Cities in a Province
```python
# Wrong: Only marks direct connections, not transitive ones
def findCircleNum(isConnected):
    n = len(isConnected)
    visited = [False] * n
    provinces = 0

    for i in range(n):
        if not visited[i]:
            provinces += 1
            visited[i] = True
            # Wrong: doesn't explore transitively connected cities!

    return provinces

# Correct: DFS to mark all connected cities
def findCircleNum(isConnected):
    n = len(isConnected)
    visited = [False] * n

    def dfs(city):
        visited[city] = True
        for neighbor in range(n):
            if isConnected[city][neighbor] == 1 and not visited[neighbor]:
                dfs(neighbor)

    provinces = 0
    for i in range(n):
        if not visited[i]:
            provinces += 1
            dfs(i)

    return provinces
```

### Mistake 2: Double-Counting Connections in Union-Find
```python
# Wrong: Processes each connection twice (i,j) and (j,i)
def findCircleNum(isConnected):
    n = len(isConnected)
    parent = list(range(n))

    def find(x):
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(x, y):
        parent[find(x)] = find(y)

    for i in range(n):
        for j in range(n):  # Should be range(i+1, n)
            if isConnected[i][j] == 1:
                union(i, j)

    return len(set(find(i) for i in range(n)))

# Correct: Only process upper triangle of matrix
def findCircleNum(isConnected):
    n = len(isConnected)
    parent = list(range(n))

    def find(x):
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(x, y):
        parent[find(x)] = find(y)

    for i in range(n):
        for j in range(i+1, n):  # Only upper triangle
            if isConnected[i][j] == 1:
                union(i, j)

    return len(set(find(i) for i in range(n)))
```

### Mistake 3: Not Using Path Compression in Union-Find
```python
# Inefficient: O(n) per find operation
def find(x):
    while parent[x] != x:
        x = parent[x]
    return x

# Optimized: O(α(n)) ≈ O(1) per find operation
def find(x):
    if parent[x] != x:
        parent[x] = find(parent[x])  # Path compression
    return parent[x]
```

## Variations

| Variation | Difference | Complexity Impact |
|-----------|------------|-------------------|
| Directed Graph | Connections are one-way | Use Strongly Connected Components (Kosaraju/Tarjan) |
| Weighted Connections | Cities have connection costs | Doesn't change component count, but affects path queries |
| Dynamic Connections | Add/remove connections over time | Use online Union-Find with backtracking |
| Count Province Sizes | Return size of each province | Store size array in Union-Find |

## Practice Checklist

Track your progress with spaced repetition:

- [ ] First attempt (understand connected components concept)
- [ ] Implement DFS solution
- [ ] Implement Union-Find solution
- [ ] Compare time/space trade-offs of both approaches
- [ ] After 1 day: Solve without hints
- [ ] After 1 week: Solve in under 20 minutes
- [ ] Before interview: Explain when to use Union-Find vs DFS

**Strategy**: See [Union-Find Pattern](../strategies/patterns/union-find.md) and [Graph Traversal Pattern](../strategies/patterns/graph-traversal.md)
