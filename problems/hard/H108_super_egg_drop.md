---
id: H108
old_id: A354
slug: super-egg-drop
title: Super Egg Drop
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# Super Egg Drop

## Problem

You have `k` identical eggs and access to a building containing `n` floors numbered from `1` through `n`.

There exists a critical floor threshold `f` (where `0 <= f <= n`) with the following property: dropping an egg from any floor above `f` will cause it to break, while dropping an egg from floor `f` or below will leave it intact.

Your objective is to identify this threshold floor `f` with certainty. During each attempt, you can drop an unbroken egg from any floor `x` between `1` and `n`. When an egg breaks, it becomes unusable. However, intact eggs can be reused in subsequent attempts.

Calculate and return the minimum number of drop attempts required to guarantee finding the exact value of `f`, regardless of where it might be.

## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Examples

**Example 1:**
- Input: `k = 1, n = 2`
- Output: `2`
- Explanation: With only one egg, test floor 1 first. If it breaks, then f = 0. If it survives, test floor 2. If it breaks now, f = 1; otherwise f = 2. This requires 2 attempts in the worst case.

**Example 2:**
- Input: `k = 2, n = 6`
- Output: `3`

**Example 3:**
- Input: `k = 3, n = 14`
- Output: `4`

## Constraints

- 1 <= k <= 100
- 1 <= n <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

Instead of asking "with k eggs and n floors, what's the minimum moves?", reverse the question: "with k eggs and m moves, what's the maximum floors we can check?". If we have m moves and drop an egg at some floor: if it breaks, we have k-1 eggs and m-1 moves for floors below; if it doesn't break, we have k eggs and m-1 moves for floors above. We can check 1 + floors_below + floors_above.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use DP with reversed thinking. Define dp[m][k] = maximum floors checkable with m moves and k eggs. Base cases: dp[m][1] = m (with 1 egg, try floors 1,2,3... sequentially), dp[1][k] = 1 (with 1 move, can only check 1 floor). Recurrence: dp[m][k] = 1 + dp[m-1][k-1] + dp[m-1][k] (current floor + floors below if breaks + floors above if doesn't break). Find minimum m where dp[m][k] >= n.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Observe that dp[m][k] grows very fast (exponentially). You only need to compute up to m ≈ log2(n) moves even for large n. Also, you can optimize space from O(m*k) to O(k) by using rolling array technique since each row only depends on the previous row. For further optimization, use binary search on m instead of linear search.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Classic DP | O(k * n^2) | O(k * n) | dp[eggs][floors] with binary search |
| Reversed DP | O(k * log n) | O(k) | dp[moves][eggs], moves ≈ log n |
| Mathematical Optimal | O(k * log n) | O(k) | With binary search on moves |

## Common Mistakes

1. **Using standard DP formulation that's too slow**
   ```python
   # Wrong: O(k * n^2) approach tries every floor
   def dp(k, n):
       if n <= 1 or k == 1:
           return n
       min_moves = float('inf')
       for floor in range(1, n + 1):
           # Try dropping at each floor
           worst = 1 + max(dp(k-1, floor-1), dp(k, n-floor))
           min_moves = min(min_moves, worst)
       return min_moves

   # Correct: Reverse the problem
   def dp(moves, eggs):
       if moves == 1 or eggs == 1:
           return moves if eggs > 1 else 1
       # Max floors checkable with m moves and k eggs
       return 1 + dp(moves-1, eggs-1) + dp(moves-1, eggs)

   # Find minimum m where dp(m, k) >= n
   ```

2. **Not understanding the recurrence relation**
   ```python
   # Wrong: Incorrect combination of subproblems
   dp[m][k] = dp[m-1][k-1] + dp[m-1][k]  # Missing the +1 for current floor

   # Correct: Account for current floor being tested
   dp[m][k] = 1 + dp[m-1][k-1] + dp[m-1][k]
   # 1 current floor + floors_if_breaks + floors_if_survives
   ```

3. **Incorrect base case handling**
   ```python
   # Wrong: Missing important base cases
   if k == 0:
       return 0
   if n == 0:
       return 0

   # Correct: Complete base cases
   if n == 0:
       return 0
   if k == 1:
       return n  # With 1 egg, must try all floors sequentially
   if n == 1:
       return 1  # With 1 floor, need 1 move
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Egg Drop with Costs | Hard | Different floors have different test costs |
| Multiple Egg Types | Hard | Eggs with different breaking thresholds |
| Egg Drop in 2D Grid | Hard | Building has multiple towers |
| Probabilistic Egg Drop | Hard | Need to find with certain probability |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (k=1, n=1, k>=log(n))
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming Pattern](../../strategies/patterns/dynamic-programming.md)
