---
id: M520
old_id: A402
slug: knight-dialer
title: Knight Dialer
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Knight Dialer

## Problem

Imagine you're testing a quirky phone dialing system where instead of pressing buttons normally, a chess knight jumps across the keypad. Each "dial" is a knight move, and you want to count how many unique phone numbers can be generated.

A chess knight moves in an L-shaped pattern: two squares in one direction (horizontal or vertical), then one square perpendicular, or vice versa. Mathematically, from position `(x, y)`, a knight can move to `(x±2, y±1)` or `(x±1, y±2)`.

Now place this knight on a standard telephone keypad:

```
Phone keypad layout:
┌───┬───┬───┐
│ 1 │ 2 │ 3 │
├───┼───┼───┤
│ 4 │ 5 │ 6 │
├───┼───┼───┤
│ 7 │ 8 │ 9 │
├───┼───┼───┤
│   │ 0 │   │
└───┴───┴───┘

Valid knight moves from each digit:
0 → {4, 6}       (can jump to 4 or 6)
1 → {6, 8}       (can jump to 6 or 8)
2 → {7, 9}       (can jump to 7 or 9)
3 → {4, 8}       (can jump to 4 or 8)
4 → {0, 3, 9}    (can jump to 0, 3, or 9)
5 → {}           (no valid moves—dead end!)
6 → {0, 1, 7}    (can jump to 0, 1, or 7)
7 → {2, 6}       (can jump to 2 or 6)
8 → {1, 3}       (can jump to 1 or 3)
9 → {2, 4}       (can jump to 2 or 4)
```

The knight can only land on digit buttons (0-9), not the empty corners.

Your challenge: Given an integer `n`, calculate how many unique phone number sequences of length `n` can be dialed using knight moves.

Rules:
- Start on any digit (your choice)
- Make exactly `n - 1` knight moves
- Each move must land on a valid digit
- Count all possible sequences

Since the answer can grow exponentially large, return the result modulo `10⁹ + 7`.

## Why This Matters

This problem elegantly combines graph traversal with dynamic programming, teaching you to recognize when path counting problems have optimal substructure. The technique applies directly to network routing (counting paths through routers with constraints), game theory (evaluating move sequences), and probabilistic modeling (computing state transition probabilities in Markov chains). The keypad constraint creates a sparse graph, demonstrating how problem-specific structure can make seemingly exponential problems tractable. Many interview questions in tech companies involve counting paths with constraints—from grid navigation to string transformations. The space optimization technique (tracking only the previous state) is fundamental for streaming algorithms and systems with limited memory. Understanding how to convert recursive relationships into iterative DP prepares you for complex optimization problems in scheduling, resource allocation, and AI planning.

## Examples

**Example 1:**
- Input: `n = 1`
- Output: `10`
- Explanation: A single-digit sequence can start from any of the 10 digit keys.

**Example 2:**
- Input: `n = 2`
- Output: `20`
- Explanation: Valid two-digit sequences include [04, 06, 16, 18, 27, 29, 34, 38, 40, 43, 49, 60, 61, 67, 72, 76, 81, 83, 92, 94]

**Example 3:**
- Input: `n = 3131`
- Output: `136006598`
- Explanation: Remember to apply the modulo operation.

## Constraints

- 1 <= n <= 5000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
The number of n-length sequences ending at digit d depends only on the number of (n-1)-length sequences ending at digits that can reach d. This creates overlapping subproblems perfect for dynamic programming.
</details>

<details>
<summary>Main Approach</summary>
Bottom-up DP approach:
1. Create a moves map showing which digits each digit can reach
2. Initialize: dp[1][digit] = 1 for all digits (base case)
3. For each length from 2 to n, compute dp[length][digit] by summing counts from all digits that can reach it
4. Sum all dp[n][digit] values and return modulo 10^9 + 7
</details>

<details>
<summary>Optimization Tip</summary>
Space optimization: You only need the previous row of DP values to compute the current row, reducing space from O(n × 10) to O(10). Also note digit 5 has no valid moves, so its count is always 0 after the first step.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursive DFS | O(10 × 3ⁿ) | O(n) | Without memoization, exponential |
| DP (2D Array) | O(n × 10) | O(n × 10) | Store all intermediate results |
| Optimal (Space-optimized DP) | O(n × 10) = O(n) | O(10) = O(1) | Only track previous and current |

## Common Mistakes

1. **Forgetting to apply modulo operation**
   ```python
   # Wrong: Integer overflow for large n
   dp[length][digit] = sum(dp[length-1][prev] for prev in predecessors)

   # Correct: Apply modulo throughout
   dp[length][digit] = sum(dp[length-1][prev] for prev in predecessors) % MOD
   ```

2. **Building moves map incorrectly**
   ```python
   # Wrong: Map shows where digit can GO TO
   moves = {0: [4, 6], 1: [6, 8], ...}

   # This works, but requires reversing logic in DP
   # Better: Map shows where digit can COME FROM
   # Or be clear about direction and use consistently
   ```

3. **Not handling n=1 edge case**
   ```python
   # Wrong: Assumes n > 1
   for length in range(2, n+1):
       # compute DP

   # Correct: Handle base case explicitly
   if n == 1:
       return 10
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Unique Paths | Medium | Grid-based DP with movement constraints |
| Climbing Stairs | Easy | Simpler 1D DP with fixed moves |
| Out of Boundary Paths | Medium | Count paths going out of grid |
| Knight Probability in Chessboard | Medium | Similar problem with probability instead of count |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming Pattern](../../strategies/patterns/dynamic-programming.md)
