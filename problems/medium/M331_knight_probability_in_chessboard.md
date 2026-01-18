---
id: M331
old_id: A155
slug: knight-probability-in-chessboard
title: Knight Probability in Chessboard
difficulty: medium
category: medium
topics: ["dynamic-programming"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: medium
related_problems:
  - id: M200
    title: Unique Paths
    difficulty: medium
  - id: M336
    title: Number of Distinct Islands
    difficulty: medium
prerequisites:
  - Dynamic programming
  - Probability theory
  - 2D array manipulation
---
# Knight Probability in Chessboard

## Problem

Imagine a chess knight starting on an `n x n` chessboard at position `(row, column)`, where coordinates are 0-indexed. Position `(0, 0)` represents the top-left corner, and `(n - 1, n - 1)` marks the bottom-right corner.

The knight must make exactly `k` moves, where each move follows the classic L-shaped pattern: two squares in one direction (horizontal or vertical), then one square perpendicular to that direction. At each step, the knight randomly chooses one of its eight possible moves with equal probability (1/8 chance for each direction).

Here's the twist: the knight always attempts to move in the chosen direction, even if that move would take it off the board. If a move lands outside the board boundaries, the knight is lost and cannot continue. Otherwise, it lands on the new position and prepares for the next move.

Your task is to calculate the probability that the knight remains on the board after completing all `k` moves. The probability should account for all possible sequences of random moves.

**Knight's 8 possible moves:**
```
        2  1
        ↓  ↓
    3 → · · · ← 0
        · K ·
    4 → · · · ← 7
        ↑  ↑
        5  6

From position K, the knight can move to any of the 8 positions marked 0-7.
Each move goes 2 squares in one direction and 1 square perpendicular.
```

For instance, from position `(2, 2)` on a 5x5 board, the knight could move to `(0, 1)`, `(0, 3)`, `(1, 0)`, `(1, 4)`, `(3, 0)`, `(3, 4)`, `(4, 1)`, or `(4, 3)` - assuming all those positions exist on the board.

## Why This Matters

This problem combines probability theory with dynamic programming, a pairing frequently seen in robotics path planning, game AI development, and Monte Carlo simulations. Understanding how to break down probabilistic problems into overlapping subproblems is essential for modeling uncertain systems, from autonomous vehicle navigation to financial risk assessment. The techniques you develop here - memoization of probability states and recursive probability calculations - apply directly to Markov chains and reinforcement learning algorithms.

## Examples

**Example 1:**
- Input: `n = 3, k = 2, row = 0, column = 0`
- Output: `0.06250`
- Explanation: Starting from (0,0), two of the eight first moves land on valid board positions: (1,2) and (2,1). From each of these positions, two additional moves keep the knight on the board. The resulting probability is 0.0625.

**Example 2:**
- Input: `n = 1, k = 0, row = 0, column = 0`
- Output: `1.00000`

## Constraints

- 1 <= n <= 25
- 0 <= k <= 100
- 0 <= row, column <= n - 1

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding Probability Recursion</summary>

The probability of staying on the board after k moves from position (r, c) can be broken down recursively:
- If k = 0, probability is 1.0 (no moves needed, already on board)
- Otherwise, try all 8 possible moves:
  - If a move lands off-board, it contributes 0 to the probability
  - If a move lands on-board at (r', c'), it contributes (1/8) × P(r', c', k-1)

The total probability is the sum of contributions from all 8 moves. This is a classic case where the same subproblems (position, remaining moves) appear multiple times.

</details>

<details>
<summary>Hint 2: Dynamic Programming with Memoization</summary>

Use dynamic programming to avoid recalculating the same (row, col, k) states. Create a 3D memoization table `dp[r][c][moves]` representing:
- The probability of staying on board from position (r, c) with `moves` remaining

Fill the table:
- Base case: `dp[r][c][0] = 1.0` for all valid positions (r, c)
- Recurrence: `dp[r][c][k] = sum(dp[r'][c'][k-1]) / 8` for all valid neighbors (r', c')

The answer is `dp[row][column][k]`.

</details>

<details>
<summary>Hint 3: Space Optimization</summary>

Instead of storing all k layers, you can optimize space by using only two 2D arrays:
- `current[r][c]`: probability with current number of moves remaining
- `next[r][c]`: probability with one fewer move

For each move count from k down to 1:
1. Initialize `next` to zeros
2. For each position (r, c), calculate probability by averaging valid next positions from `current`
3. Swap `current` and `next`

The eight knight moves are: `[(2,1), (2,-1), (-2,1), (-2,-1), (1,2), (1,-2), (-1,2), (-1,-2)]`

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force Recursion | O(8^k) | O(k) | Exponential branches, impractical for k > 20 |
| Memoization (Top-Down DP) | O(n² × k) | O(n² × k) | Cache all states |
| Tabulation (Bottom-Up DP) | O(n² × k) | O(n² × k) | Iterative table filling |
| Space-Optimized DP | O(n² × k) | O(n²) | Only store current and previous layers |

## Common Mistakes

### Mistake 1: Not Dividing by 8 for Each Move
```python
# WRONG: Forgetting to account for equal probability of each move
def knightProbability(n, k, row, column):
    def dfs(r, c, moves):
        if r < 0 or r >= n or c < 0 or c >= n:
            return 0.0
        if moves == 0:
            return 1.0

        total = 0
        for dr, dc in [(2,1), (2,-1), (-2,1), (-2,-1), (1,2), (1,-2), (-1,2), (-1,-2)]:
            total += dfs(r + dr, c + dc, moves - 1)

        return total  # Bug: should return total / 8
```

**Why it's wrong**: Each of the 8 moves has equal probability (1/8), so you must divide the total by 8 to get the correct probability.

### Mistake 2: Wrong Base Case
```python
# WRONG: Returning 1.0 for off-board positions
def knightProbability(n, k, row, column):
    def dfs(r, c, moves):
        if moves == 0:
            return 1.0  # Bug: should check if position is valid first
        if r < 0 or r >= n or c < 0 or c >= n:
            return 0.0

        # ... rest of logic
```

**Why it's wrong**: The base case check order matters. If the knight is off the board, return 0.0 immediately, regardless of remaining moves. Check boundaries before checking move count.

### Mistake 3: Incorrect Memoization Key
```python
# WRONG: Using only position as memoization key
def knightProbability(n, k, row, column):
    memo = {}

    def dfs(r, c, moves):
        if (r, c) in memo:  # Bug: should include 'moves' in key
            return memo[(r, c)]

        if r < 0 or r >= n or c < 0 or c >= n:
            return 0.0
        if moves == 0:
            return 1.0

        total = 0
        for dr, dc in [(2,1), (2,-1), (-2,1), (-2,-1), (1,2), (1,-2), (-1,2), (-1,-2)]:
            total += dfs(r + dr, c + dc, moves - 1)

        memo[(r, c)] = total / 8
        return total / 8
```

**Why it's wrong**: The memoization key must include all parameters that define the state: (row, col, moves). Using only (row, col) will give incorrect results because the probability depends on how many moves remain.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Minimum Moves to Reach Target | Medium | Find minimum knight moves to reach destination |
| Knight Tour | Hard | Visit every square exactly once |
| Modified Knight Moves | Medium | Different move patterns (e.g., 3-1 instead of 2-1) |
| Weighted Board | Hard | Different cells have different probabilities of staying |

## Practice Checklist

- [ ] **First attempt**: Solve independently (60 min time limit)
- [ ] **Understand probability**: Calculate small examples by hand
- [ ] **Implement recursion**: Start with memoized DFS approach
- [ ] **Optimize space**: Convert to bottom-up DP with 2 arrays
- [ ] **Spaced repetition**: Revisit after 3 days
- [ ] **Interview practice**: Explain probability recurrence clearly
- [ ] **Variations**: Solve Unique Paths problem for comparison
- [ ] **Final review**: Solve again after 1 week without hints

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
