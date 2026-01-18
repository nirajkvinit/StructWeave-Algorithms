---
id: M271
old_id: A068
slug: out-of-boundary-paths
title: Out of Boundary Paths
difficulty: medium
category: medium
topics: []
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M062", "M063", "H688"]
prerequisites: ["dynamic-programming", "memoization", "modular-arithmetic"]
---
# Out of Boundary Paths

## Problem

Given an m x n grid with a ball starting at position [startRow, startColumn], find how many distinct paths allow the ball to exit the grid within a budget of maxMove moves. The ball can move one cell at a time in any of the four cardinal directions (up, down, left, right). A move that takes the ball outside the grid boundaries counts as an exit.

The twist here is that we count movement sequences, not final destinations. For example, moving right-then-up-then-out counts as a different path than moving up-then-right-then-out, even if both exit from the same boundary location. Because the count can grow exponentially large, return the result modulo 10^9 + 7.

This is a path counting problem with constraints. The ball might reach the boundary in just one move (if it starts at an edge), or it might need all maxMove moves to exit. The challenge is counting all possible sequences efficiently without simulating each path individually, which would be impossibly slow for grids up to 50x50 with 50 moves.


**Diagram:**

```
Example 1:
Input: m = 2, n = 2, maxMove = 2, startRow = 0, startColumn = 0

Grid (2x2):        Ball starts at [0,0] (marked with *)
   0 1
0  * .
1  . .

With 2 moves, ball can exit via:
- Move up → out (1 path)
- Move left → out (1 path)
- Move right, then up → out (1 path)
- Move right, then right → out (1 path)
- Move down, then left → out (1 path)
- Move down, then down → out (1 path)

Output: 6
```

```
Example 2:
Input: m = 1, n = 3, maxMove = 3, startRow = 0, startColumn = 1

Grid (1x3):        Ball starts at [0,1] (marked with *)
   0 1 2
0  . * .

With 3 moves, the ball can exit in multiple ways.
Output: 12
```


## Why This Matters

This problem teaches a crucial dynamic programming pattern called state-space reduction with memoization. Instead of tracking billions of individual paths, you recognize that what matters is where you are and how many moves remain, not how you got there. This same insight applies to robot pathfinding, game state analysis, and resource-constrained optimization.

The modular arithmetic requirement reflects real-world scenarios where you need to count extremely large possibilities without overflow, common in probability calculations, cryptography, and combinatorial problems. Understanding when two different sequences lead to the same state is fundamental to avoiding exponential complexity in recursive problems.

## Constraints

- 1 <= m, n <= 50
- 0 <= maxMove <= 50
- 0 <= startRow < m
- 0 <= startColumn < n

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Recognizing Overlapping Subproblems</summary>

This is a classic dynamic programming problem. Why? Consider these two paths:
- Path A: Start → Right → Down → Left → Out
- Path B: Start → Down → Right → Left → Out

Both paths reach the same position `[row, col]` with the same number of remaining moves. The number of ways to exit from that state is identical regardless of how you got there.

State definition: `dp[row][col][moves_left]` = number of ways to exit starting from position `[row, col]` with `moves_left` remaining moves.
</details>

<details>
<summary>Hint 2: Base Cases and Recurrence</summary>

Base cases:
- If the ball is out of bounds (row < 0 or row >= m or col < 0 or col >= n), return 1 (found an exit path)
- If moves_left == 0 and still in bounds, return 0 (no more moves, can't exit)

Recurrence relation:
```
dp[row][col][moves_left] =
    sum of:
      - dp[row-1][col][moves_left-1]  (move up)
      - dp[row+1][col][moves_left-1]  (move down)
      - dp[row][col-1][moves_left-1]  (move left)
      - dp[row][col+1][moves_left-1]  (move right)
```

Each move explores all 4 directions and sums the paths.
</details>

<details>
<summary>Hint 3: Complete Solution Strategy</summary>

**Approach 1: Top-Down DP with Memoization**
```python
def findPaths(m, n, maxMove, startRow, startColumn):
    MOD = 10**9 + 7
    memo = {}

    def dp(row, col, moves_left):
        # Base case: out of bounds
        if row < 0 or row >= m or col < 0 or col >= n:
            return 1

        # Base case: no moves left
        if moves_left == 0:
            return 0

        # Check memo
        if (row, col, moves_left) in memo:
            return memo[(row, col, moves_left)]

        # Explore 4 directions
        paths = 0
        paths += dp(row - 1, col, moves_left - 1)
        paths += dp(row + 1, col, moves_left - 1)
        paths += dp(row, col - 1, moves_left - 1)
        paths += dp(row, col + 1, moves_left - 1)

        memo[(row, col, moves_left)] = paths % MOD
        return memo[(row, col, moves_left)]

    return dp(startRow, startColumn, maxMove)
```

**Approach 2: Bottom-Up DP**
Build a 3D table `dp[maxMove+1][m][n]` where `dp[k][i][j]` represents paths from `[i,j]` with `k` moves left.

Remember to apply modulo at each step to prevent overflow!
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Top-Down DP + Memo | O(m × n × maxMove) | O(m × n × maxMove) | Memoization cache stores all states |
| Bottom-Up DP | O(m × n × maxMove) | O(m × n × maxMove) | 3D DP table |
| Space-Optimized DP | O(m × n × maxMove) | O(m × n) | Only keep current and previous move layers |

## Common Mistakes

### Mistake 1: Forgetting modulo operation
```python
# WRONG: Not applying modulo consistently
def findPaths(m, n, maxMove, startRow, startColumn):
    def dp(row, col, moves_left):
        if row < 0 or row >= m or col < 0 or col >= n:
            return 1
        if moves_left == 0:
            return 0

        paths = dp(row-1, col, moves_left-1) + \
                dp(row+1, col, moves_left-1) + \
                dp(row, col-1, moves_left-1) + \
                dp(row, col+1, moves_left-1)
        return paths  # Missing % MOD!
```
**Why it's wrong:** Numbers can grow exponentially large. Apply `% (10**9 + 7)` at every step, not just at the end, to prevent integer overflow.

### Mistake 2: Incorrect base case handling
```python
# WRONG: Returning 0 when out of bounds
def dp(row, col, moves_left):
    if moves_left == 0:
        return 0
    # Wrong order! Should check bounds BEFORE checking moves_left
    if row < 0 or row >= m or col < 0 or col >= n:
        return 0  # Wrong! Should return 1 (found exit)
```
**Why it's wrong:** When the ball goes out of bounds, that's a valid exit path (return 1), not a failure (return 0). Check boundary conditions before checking moves_left.

### Mistake 3: Not using memoization
```python
# WRONG: Plain recursion without caching
def findPaths(m, n, maxMove, startRow, startColumn):
    def dp(row, col, moves_left):
        # ... recursive logic without memoization
        # This recalculates same states millions of times!
```
**Why it's wrong:** Without memoization, the same state `(row, col, moves_left)` is computed repeatedly, leading to exponential time complexity. Always cache results in DP problems.

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Unique Paths | Medium | Count paths in grid without boundary exits |
| Unique Paths II | Medium | Grid with obstacles |
| Knight Probability in Chessboard | Medium | Knight moves instead of 4-directional |
| Number of Ways to Stay in Same Place | Hard | 1D version with steps budget |

## Practice Checklist

- [ ] Solve with top-down DP and memoization (Day 1)
- [ ] Implement bottom-up DP approach (Day 2)
- [ ] Handle modulo arithmetic correctly (Day 2)
- [ ] Optimize space complexity (Day 3)
- [ ] Review after 1 week (Day 8)
- [ ] Review after 2 weeks (Day 15)
- [ ] Solve without looking at hints (Day 30)
