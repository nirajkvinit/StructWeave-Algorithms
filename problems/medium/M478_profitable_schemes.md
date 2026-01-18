---
id: M478
old_id: A346
slug: profitable-schemes
title: Profitable Schemes
difficulty: medium
category: medium
topics: []
patterns: ["backtrack-combination"]
estimated_time_minutes: 30
---
# Profitable Schemes

## Problem

Imagine you're managing a team and deciding which projects to take on. Each project requires a certain number of team members and generates a specific profit. You need to figure out how many different ways you can select projects to meet your profit goal without exceeding your team size.

You have a team of `n` members and a collection of potential tasks. Each task `i` yields `profit[i]` value and requires exactly `group[i]` team members. Each member can participate in at most one task.

A **profitable scheme** is any combination of tasks where:
- The combined profit reaches **at least** `minProfit` (meeting or exceeding your goal)
- The total members used does **not exceed** `n` (staying within team capacity)

Calculate how many distinct profitable schemes exist. Since the result may be astronomically large, **return it modulo** `10⁹ + 7`.

**Example thinking**: With 5 members, minProfit=3, tasks that need [2,2] members with profits [2,3]: you could do both tasks (2+3=5 profit ≥ 3), or just the second task (3 profit ≥ 3). That's 2 valid schemes.

## Why This Matters

This problem models portfolio optimization in finance (selecting investments to meet return targets with limited capital), project selection in agile development (choosing user stories to maximize value within sprint capacity), and resource allocation in cloud computing (selecting workloads to run on limited servers while meeting SLA targets). The constrained counting technique applies to budgeting systems, capacity planning where you track combinations of choices meeting multiple constraints, and operational research problems like the multi-dimensional knapsack with profit thresholds.

## Examples

**Example 1:**
- Input: `n = 5, minProfit = 3, group = [2,2], profit = [2,3]`
- Output: `2`
- Explanation: To achieve profit of at least 3, valid combinations are: tasks 0 and 1 together, or task 1 alone.
This yields 2 distinct schemes.

**Example 2:**
- Input: `n = 10, minProfit = 5, group = [2,3,5], profit = [6,7,8]`
- Output: `7`
- Explanation: Since each task individually exceeds the minimum profit of 5, any non-empty subset qualifies.
The 7 valid schemes are: (0), (1), (2), (0,1), (0,2), (1,2), and (0,1,2).

## Constraints

- 1 <= n <= 100
- 0 <= minProfit <= 100
- 1 <= group.length <= 100
- 1 <= group[i] <= 100
- profit.length == group.length
- 0 <= profit[i] <= 100

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a counting problem with constraints on both resources (members) and profit. The key insight is that we need to track three dimensions: which task we're considering, how many members we've used, and how much profit we've accumulated. Once profit exceeds minProfit, we can cap it - schemes with profit 100 and 101 are equivalent when minProfit is 50.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use 3D dynamic programming with memoization. Define dp[i][j][k] as the number of schemes using the first i tasks, exactly j members, and achieving at least k profit (capped at minProfit). For each task, we have two choices: include it (if we have enough members) or skip it. The transition is: dp[i][j][k] = dp[i-1][j][k] + dp[i-1][j-group[i]][max(0, k-profit[i])]. Sum all dp[n][j][minProfit] for j from 0 to n.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can reduce the space complexity from O(n * members * profit) to O(members * profit) by using only two rows for the DP table (current and previous task). Also, iterate profit in reverse when using 1D optimization to avoid overwriting values you still need. Remember to take modulo at each step to prevent overflow.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(2^T) | O(T) | T is number of tasks; enumerate all subsets |
| 3D DP | O(T * n * minProfit) | O(T * n * minProfit) | Full memoization table |
| Optimal (Space-optimized DP) | O(T * n * minProfit) | O(n * minProfit) | Use rolling array technique |

## Common Mistakes

1. **Not capping profit at minProfit**
   ```python
   # Wrong: Tracking exact profit leads to huge state space
   dp = [[[0] * 10001 for _ in range(n+1)] for _ in range(len(group)+1)]

   # Correct: Cap profit at minProfit since higher values are equivalent
   dp = [[[0] * (minProfit+1) for _ in range(n+1)] for _ in range(len(group)+1)]
   ```

2. **Forgetting modulo operation**
   ```python
   # Wrong: May overflow for large inputs
   dp[i][j][k] = dp[i-1][j][k] + dp[i-1][j-g][max(0,k-p)]

   # Correct: Apply modulo at each step
   MOD = 10**9 + 7
   dp[i][j][k] = (dp[i-1][j][k] + dp[i-1][j-g][max(0,k-p)]) % MOD
   ```

3. **Incorrect base case**
   ```python
   # Wrong: Only counting schemes with exactly minProfit
   return dp[len(group)][n][minProfit]

   # Correct: Sum all member counts that achieve minProfit
   return sum(dp[len(group)][j][minProfit] for j in range(n+1)) % MOD
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| 0/1 Knapsack | Medium | Single constraint (weight), maximize value instead of counting |
| Coin Change II | Medium | Unlimited items, single constraint, count combinations |
| Partition Equal Subset Sum | Medium | Boolean DP instead of counting, single constraint |
| Target Sum | Medium | Assign +/- signs, count ways to reach target |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
