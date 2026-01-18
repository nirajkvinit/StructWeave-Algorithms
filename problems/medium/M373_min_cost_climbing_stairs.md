---
id: M373
old_id: A213
slug: min-cost-climbing-stairs
title: Min Cost Climbing Stairs
difficulty: medium
category: medium
topics: ["array", "dynamic-programming"]
patterns: ["dp-1d"]
estimated_time_minutes: 30
frequency: high
related_problems:
  - id: E063
    title: Climbing Stairs
    difficulty: easy
  - id: M011
    title: House Robber
    difficulty: medium
  - id: M368
    title: Delete and Earn
    difficulty: medium
prerequisites:
  - Basic Dynamic Programming
  - Array Traversal
  - Optimal Substructure
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Min Cost Climbing Stairs

## Problem

You're climbing a staircase where each step comes with a price. The array `cost` represents the cost of using each step, where `cost[i]` is the price you must pay to stand on step `i`. Once you pay a step's cost, you can climb either one step or two steps upward from that position.

Here's what makes this interesting: you can start your climb from either step `0` or step `1` for free (you only pay their cost once you're on them). Your goal is to reach the top of the staircase, which is defined as being beyond the last step in the array.

For example, with `cost = [10, 15, 20]`, you could start at step `1` (index 1), pay 15 to use it, then jump two steps to land beyond the array (the "top"). Alternatively, you might start at step `0`, pay 10, jump to step `2`, pay 20, then reach the top. The challenge is finding the sequence of steps that minimizes your total cost.

Important clarification: "reaching the top" means getting past index `n-1`, not necessarily landing on it. You can jump over the final step if it's expensive. This is why starting at step `1` and jumping two steps can sometimes skip the last step entirely.

## Why This Matters

This is a foundational dynamic programming problem that teaches optimal substructure and memoization. The stair-climbing pattern appears in resource optimization problems like minimizing energy consumption in sensor networks, optimizing database query execution paths, or planning cost-efficient task scheduling. It's simpler than classic DP problems like knapsack or longest common subsequence, making it an ideal introduction to DP thinking. The space optimization from O(n) to O(1) teaches you to recognize when you only need a fixed window of previous results, a technique critical for handling large-scale data. This problem is extremely common in coding interviews as a warmup to more complex DP challenges.

## Examples

**Example 1:**
- Input: `cost = [10,15,20]`
- Output: `15`
- Explanation: Beginning at index 1 provides the optimal path.
- Spend 15 to step from index 1 directly to the top (advancing two positions).
Total expenditure: 15.

**Example 2:**
- Input: `cost = [1,100,1,1,1,100,1,1,100,1]`
- Output: `6`
- Explanation: Optimal route starts at index 0.
- Spend 1 at index 0, jump to index 2.
- Spend 1 at index 2, jump to index 4.
- Spend 1 at index 4, jump to index 6.
- Spend 1 at index 6, move to index 7.
- Spend 1 at index 7, jump to index 9.
- Spend 1 at index 9, reach the top.
Total expenditure: 6.

## Constraints

- 2 <= cost.length <= 1000
- 0 <= cost[i] <= 999

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Define the Problem State</summary>

The key is to define what your DP state represents. Consider two interpretations:

**Option 1:** `dp[i]` = minimum cost to REACH step i
- Base cases: `dp[0] = cost[0]`, `dp[1] = cost[1]` (can start at either)
- Transition: `dp[i] = cost[i] + min(dp[i-1], dp[i-2])`
- Answer: `min(dp[n-1], dp[n-2])` (can exit from either of last two steps)

**Option 2:** `dp[i]` = minimum cost to reach the top FROM step i
- This is a backward DP approach

Choose the interpretation that feels more natural and build from there.

</details>

<details>
<summary>Hint 2: Recurrence Relation</summary>

Using the forward DP interpretation where `dp[i]` is the minimum cost to reach step i:

To reach step `i`, you either:
1. Came from step `i-1` (paid `dp[i-1]` to get there)
2. Came from step `i-2` (paid `dp[i-2]` to get there)

Once at step `i`, you must pay `cost[i]` to use that step.

Therefore: `dp[i] = cost[i] + min(dp[i-1], dp[i-2])`

The final answer is `min(dp[n-1], dp[n-2])` because you can reach the top from either of the last two steps with one final jump.

</details>

<details>
<summary>Hint 3: Space Optimization</summary>

Notice that to compute `dp[i]`, you only need `dp[i-1]` and `dp[i-2]`. This means you don't need to store the entire DP array.

Use two variables (or a rolling array of size 2) to track just the previous two states:
```
prev2, prev1 = cost[0], cost[1]
for i in range(2, n):
    current = cost[i] + min(prev1, prev2)
    prev2, prev1 = prev1, current
```

This reduces space complexity from O(n) to O(1).

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Recursive (no memo) | O(2^n) | O(n) | Exponential due to repeated subproblems |
| DP with Array | O(n) | O(n) | Standard DP approach |
| DP Space-Optimized | O(n) | O(1) | Only track last 2 values |
| Greedy | N/A | N/A | Doesn't work - needs global optimization |

## Common Mistakes

### Mistake 1: Forgetting to Add Current Step Cost
```python
# Wrong: Not adding cost[i] when computing dp[i]
def minCostClimbingStairs(cost):
    n = len(cost)
    dp = [0] * n
    dp[0], dp[1] = cost[0], cost[1]
    for i in range(2, n):
        dp[i] = min(dp[i-1], dp[i-2])  # Missing cost[i]!
    return min(dp[n-1], dp[n-2])
```

**Fix:** Include the cost of the current step:
```python
# Correct: Add cost[i] to the minimum of previous states
for i in range(2, n):
    dp[i] = cost[i] + min(dp[i-1], dp[i-2])
```

### Mistake 2: Incorrect Final Answer
```python
# Wrong: Only considering the last step
def minCostClimbingStairs(cost):
    n = len(cost)
    dp = [0] * n
    dp[0], dp[1] = cost[0], cost[1]
    for i in range(2, n):
        dp[i] = cost[i] + min(dp[i-1], dp[i-2])
    return dp[n-1]  # Missing that we can exit from n-2 too!
```

**Fix:** Consider both possible exit points:
```python
# Correct: Can reach top from either of last two steps
return min(dp[n-1], dp[n-2])
```

### Mistake 3: Off-by-One in Space Optimization
```python
# Wrong: Incorrect variable updates in space optimization
def minCostClimbingStairs(cost):
    n = len(cost)
    prev2, prev1 = cost[0], cost[1]
    for i in range(2, n):
        current = cost[i] + min(prev1, prev2)
        prev2 = prev1  # Wrong order!
        prev1 = current
        # Should be: prev2, prev1 = prev1, current
    return min(prev1, prev2)
```

**Fix:** Use simultaneous assignment:
```python
# Correct: Update both variables simultaneously
for i in range(2, n):
    current = cost[i] + min(prev1, prev2)
    prev2, prev1 = prev1, current  # Simultaneous assignment
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Climbing Stairs | Count ways to reach top (no cost) | Easy |
| Min Cost with K Steps | Can jump 1 to k steps at a time | Medium |
| 2D Min Cost Stairs | Grid where you can move right or down | Medium |
| Min Cost with Obstacles | Some steps are blocked | Medium |
| Max Cost Climbing Stairs | Maximize points instead of minimize cost | Easy |

## Practice Checklist

- [ ] First attempt (within 30 minutes)
- [ ] Implement DP solution with array
- [ ] Optimize to O(1) space
- [ ] Verify base cases are correct
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Can explain forward vs backward DP
- [ ] Attempted Climbing Stairs variation

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
