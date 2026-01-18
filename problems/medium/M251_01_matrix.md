---
id: M251
old_id: A039
slug: 01-matrix
title: 01 Matrix
difficulty: medium
category: medium
topics: ["matrix", "bfs", "dynamic-programming"]
patterns: ["dp-2d", "bfs", "multi-source-bfs"]
estimated_time_minutes: 30
frequency: high
related_problems:
  - M200_number_of_islands.md
  - M286_walls_and_gates.md
  - M542_01_matrix.md
prerequisites:
  - BFS (breadth-first search)
  - dynamic programming (2D)
  - queue data structure
---
# 01 Matrix

## Problem

Given a binary matrix containing only 0s and 1s, calculate the distance from each cell to its nearest 0. Distance is measured using the Manhattan metric, where you can only move horizontally or vertically between adjacent cells (diagonal moves don't count). Each step to a neighboring cell adds 1 to the distance.

For example, if you're at a cell containing 1 and the nearest 0 is three cells away (requiring three horizontal or vertical moves), then that cell's distance is 3. Cells that already contain 0 have a distance of 0 by definition.

The challenge is that a naive approach checking every cell against every other cell would be extremely slow. With up to 10,000 cells possible, you need an efficient strategy. Two main approaches exist: multi-source breadth-first search, which simultaneously expands from all 0s outward like ripples in water, or dynamic programming with two passes that propagates distance information from different directions.

The matrix is guaranteed to have at least one 0, so every cell will have a valid distance. Your solution should handle edge cases like matrices with a single row or column, as well as patterns where all 0s cluster in one area.


**Diagram:**

```
Example 1:
Input:              Output (distances):
0 0 0               0 0 0
0 1 0       =>      0 1 0
0 0 0               0 0 0

Example 2:
Input:              Output (distances):
0 0 0               0 0 0
0 1 0       =>      0 1 0
1 1 1               1 2 1

Distance calculation explanation:
- Cells with 0 have distance 0 (they are already 0)
- Adjacent cells (up/down/left/right) are 1 step away
- Diagonal moves are NOT allowed

Example 2 detailed:
mat[2][1] = 1 -> nearest 0 is at mat[0][1] -> distance = 2 steps
mat[2][2] = 1 -> nearest 0 is at mat[0][2] -> distance = 2 steps, but also
                 can reach mat[1][2] (distance 1) then mat[0][2] (distance 1) = 2
                 OR reach mat[2][2] -> mat[1][2] -> distance = 1
Actually mat[1][2] = 0, so distance is 1
```


## Why This Matters

This problem teaches multi-source BFS, a powerful technique used in navigation systems, network routing, and geographic information systems. When Google Maps calculates the nearest coffee shop from your location, it uses similar algorithms. The pattern appears frequently in technical interviews at major tech companies because it tests your ability to optimize beyond the obvious brute-force solution. Mastering this problem also builds intuition for distance-based problems and teaches you when to flip a problem on its head (searching from all 0s instead of from all 1s).

## Constraints

- m == mat.length
- n == mat[i].length
- 1 <= m, n <= 10⁴
- 1 <= m * n <= 10⁴
- mat[i][j] is either 0 or 1.
- There is at least one 0 in mat.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Multi-Source BFS from All Zeros</summary>

Instead of running BFS from each `1` to find the nearest `0`, flip the problem: Start BFS from all `0` cells simultaneously. This is called "multi-source BFS."

Initialize a queue with all cells containing `0`, and mark cells with `1` as unvisited (e.g., infinity). Then, propagate distances outward level by level. Each level represents one step away from the nearest zero.

This transforms an O(m²n²) problem into O(mn).
</details>

<details>
<summary>Hint 2: Dynamic Programming with Two Passes</summary>

You can solve this without BFS using DP:

**First pass (top-left to bottom-right):**
- For each cell, take minimum of its current value and 1 + distance from top/left neighbors

**Second pass (bottom-right to top-left):**
- For each cell, take minimum of its current value and 1 + distance from bottom/right neighbors

Initialize all `1` cells to infinity and all `0` cells to 0.

This works because the closest `0` must be reachable from one of the four directions.
</details>

<details>
<summary>Hint 3: Optimization - Early Termination</summary>

For BFS approach:
- Use a visited set to avoid re-processing cells
- Process by levels (use queue size tracking)
- Once a cell's distance is set, it won't change (BFS finds shortest path)

For DP approach:
- No need for infinity; use max possible distance (m + n - 2)
- Two passes are sufficient (no need for iteration until convergence)
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Naive BFS per Cell | O(m²n²) | O(mn) | BFS from each 1 to find nearest 0 |
| Multi-Source BFS | O(mn) | O(mn) | Optimal for sparse matrices |
| Dynamic Programming (2 Pass) | O(mn) | O(1) | In-place update, no queue needed |
| DFS from Each 1 | O(m²n²) | O(mn) | Inefficient, not recommended |

## Common Mistakes

### Mistake 1: Running BFS from Each Cell with 1
```python
# Wrong: O(m²n²) - too slow for large matrices
def updateMatrix(mat):
    def bfs(row, col):
        # BFS to find nearest 0 from (row, col)
        queue = [(row, col, 0)]
        # ... BFS logic

    for i in range(len(mat)):
        for j in range(len(mat[0])):
            if mat[i][j] == 1:
                mat[i][j] = bfs(i, j)
    return mat

# Correct: Multi-source BFS from all 0s simultaneously
def updateMatrix(mat):
    m, n = len(mat), len(mat[0])
    queue = []
    for i in range(m):
        for j in range(n):
            if mat[i][j] == 0:
                queue.append((i, j))
            else:
                mat[i][j] = float('inf')
    # BFS from all 0s simultaneously
    # ... rest of logic
```

### Mistake 2: Incorrect DP Pass Direction
```python
# Wrong: Only one pass doesn't capture all directions
def updateMatrix(mat):
    m, n = len(mat), len(mat[0])
    for i in range(m):
        for j in range(n):
            if mat[i][j] != 0:
                top = mat[i-1][j] if i > 0 else float('inf')
                left = mat[i][j-1] if j > 0 else float('inf')
                mat[i][j] = min(top, left) + 1
    return mat  # Missing second pass!

# Correct: Two passes cover all four directions
def updateMatrix(mat):
    m, n = len(mat), len(mat[0])
    # First pass: top-left to bottom-right
    for i in range(m):
        for j in range(n):
            if mat[i][j] != 0:
                top = mat[i-1][j] if i > 0 else float('inf')
                left = mat[i][j-1] if j > 0 else float('inf')
                mat[i][j] = min(top, left) + 1

    # Second pass: bottom-right to top-left
    for i in range(m-1, -1, -1):
        for j in range(n-1, -1, -1):
            if mat[i][j] != 0:
                bottom = mat[i+1][j] if i < m-1 else float('inf')
                right = mat[i][j+1] if j < n-1 else float('inf')
                mat[i][j] = min(mat[i][j], bottom + 1, right + 1)
    return mat
```

### Mistake 3: Not Handling the Queue Properly in Multi-Source BFS
```python
# Wrong: Doesn't process level by level
def updateMatrix(mat):
    m, n = len(mat), len(mat[0])
    queue = []
    for i in range(m):
        for j in range(n):
            if mat[i][j] == 0:
                queue.append((i, j))

    while queue:
        i, j = queue.pop(0)
        for di, dj in [(0,1), (1,0), (0,-1), (-1,0)]:
            ni, nj = i + di, j + dj
            if 0 <= ni < m and 0 <= nj < n:
                mat[ni][nj] = mat[i][j] + 1  # Wrong! Overwrites unconditionally
                queue.append((ni, nj))

# Correct: Only update unvisited cells
def updateMatrix(mat):
    m, n = len(mat), len(mat[0])
    queue = []
    for i in range(m):
        for j in range(n):
            if mat[i][j] == 0:
                queue.append((i, j))
            else:
                mat[i][j] = float('inf')

    while queue:
        i, j = queue.pop(0)
        for di, dj in [(0,1), (1,0), (0,-1), (-1,0)]:
            ni, nj = i + di, j + dj
            if 0 <= ni < m and 0 <= nj < n and mat[ni][nj] > mat[i][j] + 1:
                mat[ni][nj] = mat[i][j] + 1
                queue.append((ni, nj))
    return mat
```

## Variations

| Variation | Difference | Complexity Impact |
|-----------|------------|-------------------|
| Distance to Specific Value K | Find distance to cells with value k | Same approach, different initialization |
| Manhattan Distance to Nearest | Use abs(x1-x2) + abs(y1-y2) directly | O(mn) with different formula |
| Diagonal Moves Allowed | Can move in 8 directions | Same complexity, more neighbors |
| Weighted Grid | Different costs for different cells | Use Dijkstra instead of BFS |

## Practice Checklist

Track your progress with spaced repetition:

- [ ] First attempt (understand multi-source BFS concept)
- [ ] Implement BFS solution
- [ ] Implement 2-pass DP solution
- [ ] Compare both approaches and understand trade-offs
- [ ] After 1 day: Solve without hints
- [ ] After 1 week: Solve in under 25 minutes
- [ ] Before interview: Explain why multi-source BFS works

**Strategy**: See [BFS Pattern](../strategies/patterns/bfs.md) and [2D DP Pattern](../strategies/patterns/dp-2d.md)
