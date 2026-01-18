---
id: M180
old_id: I216
slug: pacific-atlantic-water-flow
title: Pacific Atlantic Water Flow
difficulty: medium
category: medium
topics: ["matrix", "dfs", "bfs", "graph"]
patterns: ["dp-2d", "reverse-thinking", "multi-source-bfs"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M200", "M130", "M542"]
prerequisites: ["dfs", "bfs", "matrix-traversal"]
---
# Pacific Atlantic Water Flow

## Problem

Imagine a rectangular island represented by an `m x n` grid, positioned between two massive oceans. The Pacific Ocean touches the island along its entire top edge and left edge, while the Atlantic Ocean borders the bottom edge and right edge. Each cell in your grid has an elevation value stored in a matrix called `heights`, where `heights[r][c]` tells you how high above sea level the terrain is at row `r`, column `c`.

When rain falls on this island, water flows according to gravity and terrain: from any cell, water can flow to an adjacent cell (one step north, south, east, or west) only if the adjacent cell has an elevation that's less than or equal to the current cell. In other words, water flows downhill or across flat terrain, but never uphill. Once water reaches any cell that borders an ocean (top or left edge for Pacific, bottom or right edge for Atlantic), it flows directly into that ocean.

Your mission is to find all the cells where rainwater can reach both the Pacific and Atlantic oceans. Let's visualize this with an example:

```
         Pacific Ocean
             ~
    ~   1  2  2  3 (5)  ~  Atlantic
    ~   3  2  3 (4)(4)  ~  Ocean
    ~   2  4 (5) 3  1   ~
    ~  (6)(7) 1  4  5   ~
    ~  (5) 1  1  2  4   ~
        ~  ~  ~  ~  ~
```

The cells marked with parentheses `()` can reach both oceans. For instance, the cell with elevation 5 at position [0,4] (top-right corner) directly touches both oceans since it's on both the top edge (Pacific) and the right edge (Atlantic). The cell with elevation 7 at position [3,1] can flow left to reach the Pacific (left edge) and can also flow down and right eventually reaching the Atlantic. Notice that water flows from this elevation-7 cell to adjacent cells with equal or lower elevation.

Here's the tricky part: you can't just simulate water flowing from each cell individually, because that would be extremely slow for large grids (you'd potentially explore the entire grid multiple times for each cell). Instead, think in reverse: which cells can be reached by water flowing backward (uphill) from each ocean? A cell that can be reached from both oceans in this reverse flow is exactly a cell from which water can flow to both oceans in forward flow. The grid can be up to 200x200, and elevations range from 0 to 100,000.

## Why This Matters

This problem models watershed analysis, which is crucial in environmental science, hydrology, and geographic information systems (GIS). Urban planners use similar algorithms to determine drainage basins and predict where runoff will flow during storms, helping them design effective flood prevention systems. Ecologists analyze how water flows through landscapes to understand ecosystem connectivity and pollutant dispersion. Network engineers apply analogous thinking to routing problems: data flows from sources to destinations through networks with capacity constraints, similar to water flowing through terrain with elevation constraints.

The key algorithmic insight is "reverse thinking": instead of asking "where can water from this cell reach?" (which requires exploring from every cell), ask "which cells can reach this boundary?" (which requires only two explorations: one from Pacific borders, one from Atlantic borders). This transforms an O(m×n) × O(m×n) = O(m²×n²) problem into an O(m×n) solution. This reverse-thinking pattern appears in many graph problems: sometimes the inverse question is much easier to answer. The solution uses depth-first search (DFS) or breadth-first search (BFS) to explore reachable cells, demonstrating how graph traversal algorithms apply to grid problems. Understanding how to model a 2D grid as an implicit graph, where each cell is a node and edges connect adjacent cells with valid flows, is a foundational skill that extends to maze solving, island counting, shortest path in grids, and many other spatial reasoning problems.

## Examples

**Example 1:**
- Input: `heights = [[1]]`
- Output: `[[0,0]]`
- Explanation: Since there is only one cell and it touches both ocean borders, water from it can reach both oceans.

## Constraints

- m == heights.length
- n == heights[r].length
- 1 <= m, n <= 200
- 0 <= heights[r][c] <= 10⁵

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Think in reverse - start from the oceans</summary>

Instead of checking from each cell whether water can reach both oceans (forward thinking), start from the ocean borders and find which cells can be reached from each ocean (reverse thinking). Water flows from high to low, so in reverse, we flow from low to high (or equal).
</details>

<details>
<summary>🎯 Hint 2: Use two separate DFS/BFS traversals</summary>

Perform one DFS/BFS starting from all Pacific border cells (top row + left column), marking cells that can reach the Pacific. Then perform another DFS/BFS from all Atlantic border cells (bottom row + right column). The answer is the intersection of both sets.
</details>

<details>
<summary>📝 Hint 3: Algorithm structure</summary>

```
1. Create two boolean matrices: pacific_reachable, atlantic_reachable
2. DFS/BFS from Pacific borders (top + left):
   - Start from all cells in first row and first column
   - Move to neighbors with height >= current (reverse flow)
   - Mark cells as pacific_reachable
3. DFS/BFS from Atlantic borders (bottom + right):
   - Start from all cells in last row and last column
   - Move to neighbors with height >= current
   - Mark cells as atlantic_reachable
4. Return cells where both pacific_reachable AND atlantic_reachable
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| DFS from Both Oceans | O(m × n) | O(m × n) | Two traversals, each visits all cells once |
| BFS from Both Oceans | O(m × n) | O(m × n) | Queue-based approach |
| Brute Force (DFS from each cell) | O((m × n)²) | O(m × n) | Too slow - checking from every cell |

## Common Mistakes

### Mistake 1: Checking flow in wrong direction

```python
# Wrong: Forward flow (high to low) from ocean borders
def pacific_atlantic_wrong(heights):
    def dfs(r, c, visited):
        visited.add((r, c))
        for dr, dc in [(0,1), (1,0), (0,-1), (-1,0)]:
            nr, nc = r + dr, c + dc
            if (0 <= nr < m and 0 <= nc < n and
                heights[nr][nc] <= heights[r][c]):  # Wrong direction!
                dfs(nr, nc, visited)
```

```python
# Correct: Reverse flow (low to high) from ocean borders
def pacific_atlantic_correct(heights):
    m, n = len(heights), len(heights[0])
    pacific = set()
    atlantic = set()

    def dfs(r, c, visited):
        visited.add((r, c))
        for dr, dc in [(0,1), (1,0), (0,-1), (-1,0)]:
            nr, nc = r + dr, c + dc
            if (0 <= nr < m and 0 <= nc < n and
                (nr, nc) not in visited and
                heights[nr][nc] >= heights[r][c]):  # Reverse: flow uphill
                dfs(nr, nc, visited)

    # Start from Pacific borders
    for i in range(m):
        dfs(i, 0, pacific)
    for j in range(n):
        dfs(0, j, pacific)

    # Start from Atlantic borders
    for i in range(m):
        dfs(i, n-1, atlantic)
    for j in range(n):
        dfs(m-1, j, atlantic)

    return list(pacific & atlantic)
```

### Mistake 2: Not handling visited cells properly

```python
# Wrong: Checking visited after recursion (can cause infinite loops)
def dfs_wrong(r, c, visited):
    for dr, dc in [(0,1), (1,0), (0,-1), (-1,0)]:
        nr, nc = r + dr, c + dc
        if 0 <= nr < m and 0 <= nc < n:
            dfs(nr, nc, visited)  # Missing visited check!
    visited.add((r, c))
```

```python
# Correct: Mark visited before exploring neighbors
def dfs_correct(r, c, visited):
    visited.add((r, c))  # Mark BEFORE recursion
    for dr, dc in [(0,1), (1,0), (0,-1), (-1,0)]:
        nr, nc = r + dr, c + dc
        if (0 <= nr < m and 0 <= nc < n and
            (nr, nc) not in visited and
            heights[nr][nc] >= heights[r][c]):
            dfs(nr, nc, visited)
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Number of Islands | Medium | Count connected components in matrix - M200 |
| Surrounded Regions | Medium | Find regions not connected to border - M130 |
| 01 Matrix | Medium | Multi-source BFS for shortest distances - M542 |
| Water and Jug Problem | Medium | Similar flow constraint logic |

## Practice Checklist

- [ ] Day 1: Solve using DFS from both oceans (25-35 min)
- [ ] Day 2: Implement using BFS instead of DFS (30 min)
- [ ] Day 7: Re-solve and optimize by combining border initialization (20 min)
- [ ] Day 14: Compare with Number of Islands problem (15 min)
- [ ] Day 30: Explain why reverse thinking makes this problem easier (10 min)

**Strategy**: See [Graph Traversal Pattern](../strategies/patterns/graph-traversal.md)
