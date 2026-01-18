---
id: M411
old_id: A257
slug: domino-and-tromino-tiling
title: Domino and Tromino Tiling
difficulty: medium
category: medium
topics: ["dynamic-programming"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Domino and Tromino Tiling

## Problem

Imagine you have an unlimited supply of two types of tiles: rectangular dominoes (2x1 blocks) and L-shaped trominos (three squares arranged in an L). Both shapes can be rotated in any orientation to fit your needs.

```
Tile Types:

Domino (2x1):        Tromino (L-shaped):
┌─┬─┐                ┌─┬─┐      ┌─┐      ┌─┐        ┌─┬─┐
│ │ │  or  ┌─┐       │ │ │      │ │      │ │        │ │ │
└─┴─┘      ├─┤       └─┴─┘      ├─┤      ├─┼─┐      └─┴─┘
           └─┘         │        │ │      └─┘ │        │
                       └─┘      └─┘          └─┘      └─┘
```

Your goal is to tile a board that is 2 rows tall and n columns wide using these pieces. Every cell on the board must be covered exactly once, with no overlaps or gaps. Given an integer n, calculate how many distinct ways you can completely tile this 2 x n board.

Two tilings are considered different if there exists at least one cell that is covered by different tile types or orientations between them. Because the number of valid tilings can grow exponentially large, return your answer modulo 10⁹ + 7.

Note that this is fundamentally different from simpler tiling problems because the L-shaped tromino can create "partial states" where one row extends beyond the other, requiring careful state tracking in your solution.

## Why This Matters

This problem exemplifies the power of dynamic programming with state machines. Unlike basic DP problems that track a single dimension, you must model multiple board states (fully filled vs. partially filled with protrusions). This pattern appears frequently in computational problems involving grid arrangements, circuit design, and resource allocation where partial progress must be tracked. The mathematical relationship between states (captured in the recurrence dp[i] = 2*dp[i-1] + dp[i-3]) also demonstrates how complex combinatorial problems often reduce to elegant formulas once you identify the right state representation.

## Examples

**Example 1:**
- Input: `n = 1`
- Output: `1`

## Constraints

- 1 <= n <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The board can be in different "states" after each column: fully filled, or partially filled (top/bottom cell protruding). Define dp states not just by the column number, but by the board's current state. The recurrence relation depends on how dominoes and trominos can transition between these states.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use dynamic programming with state tracking. Define: dp[i] = ways to completely fill a 2×i board, and partial[i] = ways to fill with one cell protruding. A complete column can come from: (1) previous complete column + vertical domino, (2) previous complete column + two horizontal dominoes, (3) two partial states forming a complete column, or (4) previous complete + tromino creating partial state. Work out the transitions carefully.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The recurrence relation simplifies to: dp[i] = 2*dp[i-1] + dp[i-3] (with proper base cases). This comes from analyzing all possible tile placements. You can optimize space to O(1) by only keeping track of the last few values instead of the entire array. Remember to use modulo 10^9+7 at each step to prevent overflow.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| DP with States | O(n) | O(n) | Track complete and partial states |
| Optimized DP | O(n) | O(1) | Only store last 3-4 values |
| Matrix Exponentiation | O(log n) | O(1) | For very large n, using state transition matrix |

## Common Mistakes

1. **Not tracking partial states**
   ```python
   # Wrong: Only tracking fully filled boards
   dp = [0] * (n + 1)
   dp[0] = 1
   dp[1] = 1  # One vertical domino
   # Missing the partial states from trominos

   # Correct: Track both complete and partial states
   dp = [0] * (n + 1)
   partial = [0] * (n + 1)
   dp[0] = 1
   dp[1] = 1
   partial[1] = 1
   for i in range(2, n + 1):
       dp[i] = (dp[i-1] + dp[i-2] + 2*partial[i-1]) % MOD
       partial[i] = (dp[i-2] + partial[i-1]) % MOD
   ```

2. **Forgetting modulo operation**
   ```python
   # Wrong: Computing large values without modulo
   dp[i] = 2 * dp[i-1] + dp[i-3]
   # Will overflow for large n

   # Correct: Apply modulo at each step
   dp[i] = (2 * dp[i-1] + dp[i-3]) % (10**9 + 7)
   ```

3. **Incorrect base cases**
   ```python
   # Wrong: Not considering all initial configurations
   dp[0] = 1
   dp[1] = 1
   dp[2] = 2  # Missing tromino cases

   # Correct: Properly count all tiling options
   dp[0] = 1  # Empty board
   dp[1] = 1  # One vertical domino
   dp[2] = 2  # Two vertical OR two horizontal dominoes
   # Then apply recurrence for i >= 3
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Climbing Stairs | Easy | 1×n board with 1×1 and 1×2 tiles only |
| Fibonacci Number | Easy | Same recurrence as climbing stairs |
| Tiling Rectangle with L-Trominos | Hard | Different board dimensions and tile shapes |
| Number of Ways to Paint N × 3 Grid | Hard | 3-row grid with color constraints |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming Pattern](../../strategies/patterns/dynamic-programming.md)
