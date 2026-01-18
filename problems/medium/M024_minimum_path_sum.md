---
id: M024
old_id: F064
slug: minimum-path-sum
title: Minimum Path Sum
difficulty: medium
category: medium
topics: ["matrix", "dynamic-programming", "greedy"]
patterns: ["dp-2d", "grid-traversal", "path-optimization"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M022", "M023", "E070", "H174"]
prerequisites: ["dp-basics", "2d-array-traversal"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---

# Minimum Path Sum

## Problem

Given an m x n grid filled with non-negative integers, find a path from the top-left corner to the bottom-right corner that minimizes the sum of all numbers along the path. You can only move either down or right at any step. The path must start at grid[0][0] and end at grid[m-1][n-1], and the cost of a path is the sum of all cell values visited, including the starting and ending cells.

Unlike the basic "count paths" problem, here you're optimizing for the minimum cost rather than counting possibilities. This transforms the problem from pure counting to path optimization. A greedy approach (always moving to the smaller neighbor) doesn't work because it can make locally optimal choices that lead to globally suboptimal paths. For example, choosing a small immediate value might force you down a path with larger values later.

The solution requires dynamic programming. For each cell, you need to know the minimum cost to reach it from the start. Since you can only arrive from the cell above or the cell to the left, the minimum cost to reach cell (i,j) is the cell's own value plus the minimum of the costs to reach the two possible predecessor cells. Base cases are simple: cells in the first row can only be reached from the left, and cells in the first column can only be reached from above.

**Diagram:**

Example: Find the minimum sum path from top-left to bottom-right

```
Grid with values:
1 → 3 → 1
↓   ↓   ↓
1 → 5 → 1
↓   ↓   ↓
4 → 2 → 1

Minimum path (shown with bold):
1 → 3 → 1
        ↓
        1
        ↓
        1

Minimum sum: 1+3+1+1+1 = 7
```

## Why This Matters

This problem teaches core optimization techniques:
- **Dynamic programming for path problems**: A fundamental pattern for finding optimal solutions
- **Greedy vs DP distinction**: Understanding why greedy fails and DP succeeds
- **State optimization**: The minimum cost to reach each cell

**Real-world applications:**
- GPS route optimization (minimize cost: time, distance, tolls)
- Resource allocation across grid networks
- Image processing path algorithms
- Game pathfinding with terrain costs
- Network packet routing with link costs

## Examples

**Example 1:**
- Input: `grid = [[1,3,1],[1,5,1],[4,2,1]]`
- Output: `7`
- Explanation: Path 1→3→1→1→1 has minimum sum of 7

**Example 2:**
- Input: `grid = [[1,2,3],[4,5,6]]`
- Output: `12`
- Explanation: Path 1→2→3→6 = 12 (or 1→4→5→6 = 16, so first is better)

**Example 3:**
- Input: `grid = [[1,2],[1,1]]`
- Output: `3`
- Explanation: Path 1→2→1 = 4 or 1→1→1 = 3, so minimum is 3

## Constraints

- m == grid.length
- n == grid[i].length
- 1 <= m, n <= 200
- 0 <= grid[i][j] <= 200

## Think About

1. Why doesn't a greedy approach (always choosing the smaller neighbor) work?
2. What information do you need to know to compute the minimum path to cell (i,j)?
3. How does this problem differ from "Unique Paths"?
4. Can you modify the input grid in-place to save space?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Why greedy fails</summary>

**Greedy attempt:** At each cell, always move to the neighbor (right or down) with the smaller value.

**Why it fails:**
```
Grid:
1   100   1
1     1   1
1     1   1

Greedy path: 1→100→1→1→1 = 104
Optimal path: 1→1→1→1→1→1 = 5

The greedy choice at (0,0) (going right to 100)
locks you out of the optimal solution!
```

**Socratic questions:**
- What does each cell in your DP table represent?
- To reach cell (i,j), which cells could you have come from?
- If you know the minimum path sum to reach (i-1,j) and (i,j-1), how do you find it for (i,j)?

</details>

<details>
<summary>🎯 Hint 2: The recurrence relation</summary>

**DP State Definition:**
`dp[i][j]` = minimum path sum to reach cell (i,j) from (0,0)

**Recurrence Relation:**
```
dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])
```

**Intuition:**
- You can only arrive from above `(i-1, j)` or from left `(i, j-1)`
- Choose the path that has the minimum sum so far
- Add the current cell's value

**Base Cases:**
- `dp[0][0] = grid[0][0]` (starting point)
- First row: `dp[0][j] = dp[0][j-1] + grid[0][j]` (only one way: move right)
- First column: `dp[i][0] = dp[i-1][0] + grid[i][0]` (only one way: move down)

**Key difference from Unique Paths:**
- Unique Paths: **SUM** the two ways to arrive
- Minimum Path Sum: **MIN** of the two costs + current cost

</details>

<details>
<summary>📝 Hint 3: Dynamic programming algorithm</summary>

**Approach 1: Separate DP table (O(m×n) space)**
```
m, n = len(grid), len(grid[0])
dp = [[0] * n for _ in range(m)]

# Base case
dp[0][0] = grid[0][0]

# Initialize first column
for i in range(1, m):
    dp[i][0] = dp[i-1][0] + grid[i][0]

# Initialize first row
for j in range(1, n):
    dp[0][j] = dp[0][j-1] + grid[0][j]

# Fill the rest
for i in range(1, m):
    for j in range(1, n):
        dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])

return dp[m-1][n-1]
```

**Approach 2: In-place modification (O(1) space)**
```
m, n = len(grid), len(grid[0])

# Initialize first column
for i in range(1, m):
    grid[i][0] += grid[i-1][0]

# Initialize first row
for j in range(1, n):
    grid[0][j] += grid[0][j-1]

# Fill the rest
for i in range(1, m):
    for j in range(1, n):
        grid[i][j] += min(grid[i-1][j], grid[i][j-1])

return grid[m-1][n-1]
```

**Approach 3: Space-optimized with 1D array**
```
n = len(grid[0])
dp = grid[0][:]  # Copy first row

# Update first row cumulative sums
for j in range(1, n):
    dp[j] += dp[j-1]

# Process remaining rows
for i in range(1, len(grid)):
    dp[0] += grid[i][0]  # Update first column
    for j in range(1, n):
        dp[j] = grid[i][j] + min(dp[j], dp[j-1])

return dp[n-1]
```

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **Separate DP table** | **O(m×n)** | **O(m×n)** | Clear, preserves input |
| In-place modification | O(m×n) | O(1) | Space-efficient, destroys input |
| 1D DP array | O(m×n) | O(n) | Balanced, preserves input |
| DFS/Backtracking | O(2^(m+n)) | O(m+n) | Too slow, explores all paths |
| Greedy (wrong!) | O(m+n) | O(1) | Fast but gives wrong answer |

**Why greedy fails:**
- Local optimal choices don't guarantee global optimum
- Need to consider all possible paths, not just locally best moves

**Why DP works:**
- Optimal substructure: optimal path to (i,j) uses optimal paths to predecessors
- Overlapping subproblems: same cells visited in many paths
- Memoization eliminates redundant computation

**Space breakdown (separate table):**
- DP table: O(m×n)
- Input grid: O(m×n) (not counted as auxiliary space)
- Variables: O(1)

---

## Common Mistakes

### 1. Using greedy approach
```python
# WRONG: Greedy gives incorrect results
def minPathSumGreedy(grid):
    m, n = len(grid), len(grid[0])
    i = j = 0
    total = grid[0][0]

    while i < m-1 or j < n-1:
        if i == m-1:
            j += 1
        elif j == n-1:
            i += 1
        elif grid[i+1][j] < grid[i][j+1]:
            i += 1
        else:
            j += 1
        total += grid[i][j]

    return total  # INCORRECT!

# CORRECT: Use dynamic programming
def minPathSum(grid):
    m, n = len(grid), len(grid[0])
    dp = [[0] * n for _ in range(m)]
    # ... (proper DP solution)
```

### 2. Forgetting to initialize edges
```python
# WRONG: Doesn't handle first row/column
dp[0][0] = grid[0][0]
for i in range(1, m):
    for j in range(1, n):
        dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])
# dp[0][j] and dp[i][0] are wrong!

# CORRECT: Initialize edges separately
dp[0][0] = grid[0][0]
for i in range(1, m):
    dp[i][0] = dp[i-1][0] + grid[i][0]
for j in range(1, n):
    dp[0][j] = dp[0][j-1] + grid[0][j]
```

### 3. Using max instead of min
```python
# WRONG: Finds maximum path sum (different problem!)
dp[i][j] = grid[i][j] + max(dp[i-1][j], dp[i][j-1])

# CORRECT: Find minimum
dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])
```

### 4. In-place modification without understanding implications
```python
# PROBLEM: Modifies input, may not be acceptable
def minPathSum(grid):
    # ... modifies grid in-place ...
    return grid[-1][-1]

# In interviews, ask: "Can I modify the input?"
# If no, use separate DP table
```

---

## Visual Walkthrough

```
Example: grid = [[1,3,1],[1,5,1],[4,2,1]]

Step 1: Initialize starting cell
┌───┬───┬───┐
│ 1 │   │   │  dp[0][0] = 1 (starting point)
├───┼───┼───┤
│   │   │   │
├───┼───┼───┤
│   │   │   │
└───┴───┴───┘

Step 2: Fill first row (can only come from left)
┌───┬───┬───┐
│ 1 │ 4 │ 5 │  dp[0][1] = 1+3 = 4, dp[0][2] = 4+1 = 5
├───┼───┼───┤
│   │   │   │
├───┼───┼───┤
│   │   │   │
└───┴───┴───┘

Step 3: Fill first column (can only come from above)
┌───┬───┬───┐
│ 1 │ 4 │ 5 │
├───┼───┼───┤
│ 2 │   │   │  dp[1][0] = 1+1 = 2
├───┼───┼───┤
│ 6 │   │   │  dp[2][0] = 2+4 = 6
└───┴───┴───┘

Step 4: Fill cell (1,1)
dp[1][1] = grid[1][1] + min(dp[0][1], dp[1][0])
         = 5 + min(4, 2) = 5 + 2 = 7
┌───┬───┬───┐
│ 1 │ 4 │ 5 │
├───┼───┼───┤
│ 2 │ 7 │   │
├───┼───┼───┤
│ 6 │   │   │
└───┴───┴───┘

Step 5: Fill cell (1,2)
dp[1][2] = grid[1][2] + min(dp[0][2], dp[1][1])
         = 1 + min(5, 7) = 1 + 5 = 6
┌───┬───┬───┐
│ 1 │ 4 │ 5 │
├───┼───┼───┤
│ 2 │ 7 │ 6 │
├───┼───┼───┤
│ 6 │   │   │
└───┴───┴───┘

Step 6: Fill cell (2,1)
dp[2][1] = grid[2][1] + min(dp[1][1], dp[2][0])
         = 2 + min(7, 6) = 2 + 6 = 8
┌───┬───┬───┐
│ 1 │ 4 │ 5 │
├───┼───┼───┤
│ 2 │ 7 │ 6 │
├───┼───┼───┤
│ 6 │ 8 │   │
└───┴───┴───┘

Step 7: Fill cell (2,2) - ANSWER
dp[2][2] = grid[2][2] + min(dp[1][2], dp[2][1])
         = 1 + min(6, 8) = 1 + 6 = 7
┌───┬───┬───┐
│ 1 │ 4 │ 5 │
├───┼───┼───┤
│ 2 │ 7 │ 6 │
├───┼───┼───┤
│ 6 │ 8 │ 7 │ ← Answer: 7
└───┴───┴───┘

Reconstructed path (backtrack from bottom-right):
Path values: 1→3→1→1→1 = 7
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Maximum path sum** | Find maximum instead | Use `max` instead of `min` in recurrence |
| **Path with obstacles** | Some cells blocked | Set `dp[i][j] = infinity` if blocked |
| **Triangle path** | Grid is triangular | Adjust transitions: can move to (i+1,j) or (i+1,j+1) |
| **Four directions** | Can move any direction | Use Dijkstra's algorithm (DP doesn't work) |
| **K paths** | Find K minimum paths | Use priority queue with path tracking |
| **Negative values** | Grid has negative numbers | DP still works, but max path becomes interesting |

**Variation example: Maximum path sum in triangle**
```python
def minimumTotal(triangle):
    """
    Example triangle:
         2
        3 4
       6 5 7
      4 1 8 3

    Path: 2→3→5→1 = 11 (minimum)
    """
    n = len(triangle)
    # Work bottom-up
    dp = triangle[-1][:]  # Start with last row

    for i in range(n-2, -1, -1):  # Go up
        for j in range(len(triangle[i])):
            dp[j] = triangle[i][j] + min(dp[j], dp[j+1])

    return dp[0]
```

**Four directions variation:**
When you can move in all four directions, DP doesn't work (no clear dependency order). Use Dijkstra's algorithm:
```python
import heapq

def minPathSumFourDirections(grid):
    m, n = len(grid), len(grid[0])
    dist = [[float('inf')] * n for _ in range(m)]
    dist[0][0] = grid[0][0]

    pq = [(grid[0][0], 0, 0)]  # (cost, row, col)

    while pq:
        cost, i, j = heapq.heappop(pq)

        if i == m-1 and j == n-1:
            return cost

        for di, dj in [(0,1), (1,0), (0,-1), (-1,0)]:
            ni, nj = i+di, j+dj
            if 0 <= ni < m and 0 <= nj < n:
                new_cost = cost + grid[ni][nj]
                if new_cost < dist[ni][nj]:
                    dist[ni][nj] = new_cost
                    heapq.heappush(pq, (new_cost, ni, nj))

    return dist[m-1][n-1]
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles 1×1 grid
- [ ] Handles single row or single column grids
- [ ] Correctly initializes first row and column
- [ ] Applies min recurrence correctly
- [ ] Returns value at bottom-right cell

**Code Quality:**
- [ ] Clear variable names
- [ ] Proper base case handling
- [ ] No index out of bounds
- [ ] Documented space complexity trade-off

**Optimization:**
- [ ] Can implement O(n) space solution
- [ ] Can implement O(1) space in-place solution
- [ ] Understands when in-place is acceptable

**Interview Readiness:**
- [ ] Can explain why greedy fails (with example)
- [ ] Can code solution in 10 minutes
- [ ] Can derive recurrence relation from scratch
- [ ] Can extend to maximum path sum
- [ ] Can discuss Dijkstra for 4-direction variant

**Spaced Repetition Tracker:**
- [ ] Day 1: Solve with separate DP table
- [ ] Day 3: Solve with O(n) space optimization
- [ ] Day 7: Solve triangle variation
- [ ] Day 14: Implement maximum path sum
- [ ] Day 30: Explain greedy vs DP trade-offs

---

**Strategy**: See [Dynamic Programming Patterns](../../strategies/patterns/dynamic-programming.md)
