---
id: M516
old_id: A398
slug: minimum-falling-path-sum
title: Minimum Falling Path Sum
difficulty: medium
category: medium
topics: ["array", "matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Minimum Falling Path Sum

## Problem

Imagine you're a video game designer creating a platformer where a character falls downward through a grid of platforms. Each platform has a durability cost (some platforms are weaker and cost more energy to land on). The character can move slightly left or right as they fall to optimize their path and minimize total damage taken.

Given a square integer matrix of size `n x n`, find the minimum sum achievable by following any valid falling path from the top row to the bottom row.

A falling path represents your descent through the grid:
- You start by choosing any cell in the top row (row 0)
- From each cell `(row, col)`, you can move to one of three cells in the next row:
  - `(row + 1, col - 1)` - diagonal left
  - `(row + 1, col)` - straight down
  - `(row + 1, col + 1)` - diagonal right
- You continue until reaching any cell in the bottom row
- Your goal: find the path with minimum total sum

Visualization:
```
Matrix:           Example path (sum = 13):
[2, 1, 3]
[6, 5, 4]         1 → 5 → 7 = 13
[7, 8, 9]
```

## Why This Matters

This classic dynamic programming problem models decision-making in multi-stage processes where each choice affects future options. The pattern appears everywhere: route optimization in logistics (minimizing fuel costs while navigating through waypoints), financial planning (minimizing risk across investment periods), and manufacturing (minimizing defects as products move through production stages). Game AI uses these techniques for pathfinding with movement costs. Image processing algorithms apply similar logic for seam carving (intelligent image resizing). The bottom-up approach you'll develop teaches you how to build optimal solutions from smaller subproblems—a foundational concept in algorithm design that extends far beyond grid problems to resource allocation, scheduling, and optimization challenges across computer science.

## Constraints

- n == matrix.length == matrix[i].length
- 1 <= n <= 100
- -100 <= matrix[i][j] <= 100

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The minimum path to reach any cell (i, j) depends only on the minimum paths to the three cells above it: (i-1, j-1), (i-1, j), and (i-1, j+1). This is a classic dynamic programming problem with overlapping subproblems.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use bottom-up DP. For each row starting from the second, calculate dp[i][j] = matrix[i][j] + min(dp[i-1][j-1], dp[i-1][j], dp[i-1][j+1]), handling boundary conditions. The answer is the minimum value in the last row.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can optimize space to O(n) by keeping only the previous row. Or modify the matrix in-place if allowed. Each cell only needs values from the row directly above it, so you don't need to store all rows.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursion + Memoization | O(n²) | O(n²) | Top-down approach |
| 2D DP | O(n²) | O(n²) | Standard tabulation |
| Space Optimized | O(n²) | O(n) | Rolling array with previous row only |
| Optimal | O(n²) | O(1) | In-place modification if allowed |

## Common Mistakes

1. **Not handling boundary conditions for first/last columns**
   ```python
   # Wrong: Index out of bounds error
   def minFallingPathSum(self, matrix):
       n = len(matrix)
       dp = [row[:] for row in matrix]
       for i in range(1, n):
           for j in range(n):
               dp[i][j] += min(dp[i-1][j-1], dp[i-1][j], dp[i-1][j+1])
               # Bug: j-1 can be -1, j+1 can be n
       return min(dp[-1])

   # Correct: Check boundaries
   def minFallingPathSum(self, matrix):
       n = len(matrix)
       dp = [row[:] for row in matrix]
       for i in range(1, n):
           for j in range(n):
               candidates = [dp[i-1][j]]
               if j > 0:
                   candidates.append(dp[i-1][j-1])
               if j < n - 1:
                   candidates.append(dp[i-1][j+1])
               dp[i][j] += min(candidates)
       return min(dp[-1])
   ```

2. **Forgetting to take minimum of last row**
   ```python
   # Wrong: Returns bottom-right cell instead of minimum
   def minFallingPathSum(self, matrix):
       n = len(matrix)
       for i in range(1, n):
           for j in range(n):
               candidates = [matrix[i-1][j]]
               if j > 0:
                   candidates.append(matrix[i-1][j-1])
               if j < n - 1:
                   candidates.append(matrix[i-1][j+1])
               matrix[i][j] += min(candidates)
       return matrix[n-1][n-1]  # Bug: should be min(matrix[n-1])

   # Correct: Return minimum of entire last row
   def minFallingPathSum(self, matrix):
       n = len(matrix)
       for i in range(1, n):
           for j in range(n):
               candidates = [matrix[i-1][j]]
               if j > 0:
                   candidates.append(matrix[i-1][j-1])
               if j < n - 1:
                   candidates.append(matrix[i-1][j+1])
               matrix[i][j] += min(candidates)
       return min(matrix[n-1])
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Path Sum | Medium | Can only go right or down |
| Unique Paths | Medium | Count paths instead of minimum sum |
| Minimum Falling Path Sum II | Hard | Can't use same column in adjacent rows |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [2D Dynamic Programming](../../strategies/patterns/dp-2d.md)
