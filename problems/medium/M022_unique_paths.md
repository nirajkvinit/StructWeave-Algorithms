---
id: M022
old_id: F062
slug: unique-paths
title: Unique Paths
difficulty: medium
category: medium
topics: ["matrix", "dynamic-programming", "combinatorics"]
patterns: ["dp-2d", "grid-traversal"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M024", "M023", "H001"]
prerequisites: ["dp-basics", "2d-array-traversal"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---

# Unique Paths

## Problem

A robot is positioned at the top-left corner of an m x n grid and wants to reach the bottom-right corner. The robot can only move in two directions: right or down. At each step, it must choose one of these moves. Your task is to calculate the total number of unique paths the robot can take to reach its destination.

A path is considered unique based on the sequence of moves. For example, in a 2x2 grid, the path "right then down" is different from "down then right" even though both lead to the same destination. The problem is asking: given grid dimensions m (rows) and n (columns), how many distinct ways exist to navigate from (0,0) to (m-1, n-1)?

This is a classic counting problem that can be approached multiple ways. You could think of it combinatorially: reaching the bottom-right requires exactly (m-1) down moves and (n-1) right moves, so the question becomes "how many ways can you arrange these moves?" Alternatively, you can use dynamic programming: the number of ways to reach any cell equals the sum of ways to reach the cell above it plus the cell to its left, since those are the only two cells from which you could have arrived.

**Diagram:**

Example: 3×7 grid (m=3, n=7)

```
Start → → → → → → Finish
  ↓     ↓   ↓   ↓   ↓   ↓   ↓
  ↓     ↓   ↓   ↓   ↓   ↓   ↓
  → → → → → → → → → → → ↓

Robot at Start (top-left)
Goal: Reach Finish (bottom-right)
Moves: Only RIGHT or DOWN
```

For a 3×2 grid, there are 3 unique paths from top-left to bottom-right.

## Why This Matters

This problem teaches fundamental dynamic programming concepts:
- **Optimal substructure**: The solution to a problem depends on solutions to smaller subproblems
- **Grid DP pattern**: A classic framework for solving path-counting and optimization problems
- **State transition**: Understanding how to build up solutions incrementally

**Real-world applications:**
- Robot path planning and navigation systems
- Network routing algorithms (counting possible routes)
- Game development (movement on tile-based maps)
- Computational biology (sequence alignment paths)

## Examples

**Example 1:**
- Input: `m = 3, n = 2`
- Output: `3`
- Explanation: From the top-left corner, there are a total of 3 ways to reach the bottom-right corner:
  1. Right → Down → Down
  2. Down → Down → Right
  3. Down → Right → Down

**Example 2:**
- Input: `m = 3, n = 7`
- Output: `28`
- Explanation: There are 28 unique paths in a 3×7 grid

**Example 3:**
- Input: `m = 1, n = 1`
- Output: `1`
- Explanation: Single cell - only one way (stay in place)

## Constraints

- 1 <= m, n <= 100

## Think About

1. Why can you only reach a cell from the cell above or to the left?
2. What's the base case for the first row and first column?
3. How many total moves do you need to make? How many of those must be "right" vs "down"?
4. Is there a mathematical formula (combinatorics) to solve this without DP?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Build from smaller grids</summary>

Think about how you'd reach any cell `(i, j)` in the grid.

**Socratic questions:**
- From which cells can you arrive at position `(i, j)`?
- If you know how many ways to reach `(i-1, j)` and `(i, j-1)`, what does that tell you about `(i, j)`?
- What are the simplest cases? (Hint: first row, first column)
- Can you draw a small 2×3 grid and manually count paths to each cell?

**Key insight:** You can only arrive at a cell from the cell above or to the left!

</details>

<details>
<summary>🎯 Hint 2: The recurrence relation</summary>

The number of paths to any cell equals the **sum** of paths from the two cells you could have come from:

```
dp[i][j] = dp[i-1][j] + dp[i][j-1]
```

**Why?**
- All paths arriving from above: `dp[i-1][j]` ways
- All paths arriving from left: `dp[i][j-1]` ways
- These sets don't overlap (mutually exclusive last moves)

**Base cases:**
- First row: `dp[0][j] = 1` (only one way: keep moving right)
- First column: `dp[i][0] = 1` (only one way: keep moving down)

**Alternative insight (combinatorics):**
You need exactly `(m-1)` down moves and `(n-1)` right moves. This is a combination problem: Choose `(m-1)` positions out of `(m+n-2)` total moves for the down moves.

Answer = C(m+n-2, m-1) = (m+n-2)! / ((m-1)! × (n-1)!)

</details>

<details>
<summary>📝 Hint 3: Dynamic programming algorithm</summary>

**Approach 1: 2D DP table**
```
# Create m×n table
dp = [[0] * n for _ in range(m)]

# Base case: first row and column
for i in range(m):
    dp[i][0] = 1  # Only one way down the left edge
for j in range(n):
    dp[0][j] = 1  # Only one way across the top edge

# Fill table using recurrence relation
for i in range(1, m):
    for j in range(1, n):
        dp[i][j] = dp[i-1][j] + dp[i][j-1]

return dp[m-1][n-1]
```

**Approach 2: Space-optimized (1D array)**
```
# Only need current and previous row
dp = [1] * n  # First row is all 1s

for i in range(1, m):
    for j in range(1, n):
        # dp[j] still has value from previous row (above)
        # dp[j-1] has updated value from current row (left)
        dp[j] = dp[j] + dp[j-1]

return dp[n-1]
```

**Approach 3: Mathematical**
```
from math import comb
return comb(m + n - 2, m - 1)
```

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **2D DP table** | **O(m×n)** | **O(m×n)** | Clear, easy to understand |
| 1D DP array | O(m×n) | O(n) | Space-optimized, slightly complex |
| Combinatorics formula | O(m+n) | O(1) | Fastest, risk of integer overflow |
| DFS/Backtracking | O(2^(m+n)) | O(m+n) | Too slow, explores all paths |

**Why 2D DP is standard:**
- Clean and intuitive state representation
- Easy to extend to variations (obstacles, costs)
- No overflow concerns unlike combinatorics
- Much faster than brute force

**Space breakdown (2D DP):**
- DP table: O(m×n)
- Variables: O(1)

**Time breakdown:**
- Fill m×n cells: O(m×n)
- Each cell computed in O(1)

---

## Common Mistakes

### 1. Off-by-one errors in base cases
```python
# WRONG: Forgets to initialize edges
dp = [[0] * n for _ in range(m)]
for i in range(1, m):  # Misses first row!
    for j in range(1, n):
        dp[i][j] = dp[i-1][j] + dp[i][j-1]

# CORRECT: Initialize first row and column
for i in range(m):
    dp[i][0] = 1
for j in range(n):
    dp[0][j] = 1
```

### 2. Index out of bounds
```python
# WRONG: Tries to access dp[-1][j] or dp[i][-1]
for i in range(m):
    for j in range(n):
        dp[i][j] = dp[i-1][j] + dp[i][j-1]  # Crashes when i=0 or j=0

# CORRECT: Handle edges separately or check bounds
for i in range(m):
    for j in range(n):
        if i == 0 and j == 0:
            dp[i][j] = 1
        elif i == 0:
            dp[i][j] = dp[i][j-1]
        elif j == 0:
            dp[i][j] = dp[i-1][j]
        else:
            dp[i][j] = dp[i-1][j] + dp[i][j-1]
```

### 3. Integer overflow in combinatorics
```python
# RISKY: For large m, n, factorial overflows
from math import factorial
result = factorial(m+n-2) // (factorial(m-1) * factorial(n-1))

# BETTER: Use built-in comb (handles overflow)
from math import comb
result = comb(m+n-2, m-1)

# OR: Calculate incrementally to avoid large intermediates
result = 1
for i in range(1, m):
    result = result * (n + i - 1) // i
```

### 4. Not understanding the recurrence
```python
# WRONG: Multiplies instead of adds
dp[i][j] = dp[i-1][j] * dp[i][j-1]  # This counts something else!

# CORRECT: Add the two ways to arrive
dp[i][j] = dp[i-1][j] + dp[i][j-1]
```

---

## Visual Walkthrough

```
Example: m=3, n=4 grid

Step 1: Initialize base cases
┌───┬───┬───┬───┐
│ 1 │ 1 │ 1 │ 1 │  ← First row: only one way (move right)
├───┼───┼───┼───┤
│ 1 │   │   │   │  ← First column: only one way (move down)
├───┼───┼───┼───┤
│ 1 │   │   │   │
└───┴───┴───┴───┘

Step 2: Fill cell (1,1)
dp[1][1] = dp[0][1] + dp[1][0] = 1 + 1 = 2
┌───┬───┬───┬───┐
│ 1 │ 1 │ 1 │ 1 │
├───┼───┼───┼───┤
│ 1 │ 2 │   │   │  ← Can arrive from above or left
├───┼───┼───┼───┤
│ 1 │   │   │   │
└───┴───┴───┴───┘

Step 3: Fill first row interior
dp[1][2] = dp[0][2] + dp[1][1] = 1 + 2 = 3
dp[1][3] = dp[0][3] + dp[1][2] = 1 + 3 = 4
┌───┬───┬───┬───┐
│ 1 │ 1 │ 1 │ 1 │
├───┼───┼───┼───┤
│ 1 │ 2 │ 3 │ 4 │
├───┼───┼───┼───┤
│ 1 │   │   │   │
└───┴───┴───┴───┘

Step 4: Fill remaining cells row by row
dp[2][1] = dp[1][1] + dp[2][0] = 2 + 1 = 3
dp[2][2] = dp[1][2] + dp[2][1] = 3 + 3 = 6
dp[2][3] = dp[1][3] + dp[2][2] = 4 + 6 = 10

Final table:
┌───┬───┬───┬───┐
│ 1 │ 1 │ 1 │ 1 │
├───┼───┼───┼───┤
│ 1 │ 2 │ 3 │ 4 │
├───┼───┼───┼───┤
│ 1 │ 3 │ 6 │10 │  ← Answer: 10 unique paths
└───┴───┴───┴───┘

Pattern observation:
- Each interior cell is sum of cell above and cell to left
- Values grow as you move toward bottom-right
- Edge cells always equal 1 (Pascal's triangle pattern)
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Unique Paths II** | Grid has obstacles | Check if `grid[i][j]` blocked, set `dp[i][j] = 0` |
| **Minimum Path Sum** | Each cell has cost | Change recurrence to `min(dp[i-1][j], dp[i][j-1]) + cost[i][j]` |
| **Maximum Path Sum** | Maximize sum | Change recurrence to `max(dp[i-1][j], dp[i][j-1]) + value[i][j]` |
| **Four directions** | Can move up/left too | Use DFS with visited tracking or BFS |
| **Count paths with condition** | Only paths through certain cells | Add conditional logic in recurrence |
| **K moves constraint** | Limited number of moves | Add 3rd dimension to DP: `dp[i][j][k]` |

**Variation example: Grid with obstacles**
```python
def uniquePathsWithObstacles(grid):
    m, n = len(grid), len(grid[0])
    if grid[0][0] == 1 or grid[m-1][n-1] == 1:
        return 0  # Start or end blocked

    dp = [[0] * n for _ in range(m)]
    dp[0][0] = 1

    # First column: stop at first obstacle
    for i in range(1, m):
        dp[i][0] = 0 if grid[i][0] == 1 else dp[i-1][0]

    # First row: stop at first obstacle
    for j in range(1, n):
        dp[0][j] = 0 if grid[0][j] == 1 else dp[0][j-1]

    # Fill table, skip obstacles
    for i in range(1, m):
        for j in range(1, n):
            if grid[i][j] == 1:
                dp[i][j] = 0  # Can't pass through obstacle
            else:
                dp[i][j] = dp[i-1][j] + dp[i][j-1]

    return dp[m-1][n-1]
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles 1×1 grid (base case)
- [ ] Handles 1×n and m×1 grids (single row/column)
- [ ] Correctly initializes first row and column
- [ ] Applies recurrence relation correctly
- [ ] Returns correct value for bottom-right cell

**Code Quality:**
- [ ] Clear variable names (dp, not just d or arr)
- [ ] Proper initialization of base cases
- [ ] No index out of bounds errors
- [ ] Comments explaining recurrence relation

**Optimization:**
- [ ] Can implement O(n) space solution
- [ ] Understands when combinatorics approach applies
- [ ] Can discuss trade-offs between approaches

**Interview Readiness:**
- [ ] Can explain the DP recurrence in 1 minute
- [ ] Can code 2D solution in 8 minutes
- [ ] Can derive space-optimized solution
- [ ] Can extend to obstacle variation
- [ ] Can explain connection to Pascal's triangle

**Spaced Repetition Tracker:**
- [ ] Day 1: Solve with 2D DP
- [ ] Day 3: Solve with 1D DP optimization
- [ ] Day 7: Solve obstacle variation (Unique Paths II)
- [ ] Day 14: Derive and implement combinatorics solution
- [ ] Day 30: Compare all approaches and explain trade-offs

---

**Strategy**: See [Dynamic Programming Patterns](../../strategies/patterns/dynamic-programming.md)
