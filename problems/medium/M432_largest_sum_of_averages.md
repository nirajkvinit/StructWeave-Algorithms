---
id: M432
old_id: A280
slug: largest-sum-of-averages
title: Largest Sum of Averages
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Largest Sum of Averages

## Problem

Given an integer array `nums` and an integer `k`, you need to partition the array into at most `k` consecutive groups (subarrays) to maximize a specific score.

The score is calculated by taking each partition, computing its average value, and then summing all these averages together. For example, if you partition `[9,1,2,3,9]` into three groups as `[9], [1,2,3], [9]`, the score would be `9 + (1+2+3)/3 + 9 = 9 + 2 + 9 = 20`. Note that partitions must be contiguous, meaning you cannot skip elements or rearrange the array.

The key insight is that smaller groups tend to have higher averages when they contain large numbers, while larger groups average out their values. For instance, keeping a single large number like 9 by itself contributes 9 to the score, whereas grouping it with smaller numbers dilutes its contribution. This creates an optimization problem where you must decide how to split the array to maximize the total score.

Each element must appear in exactly one partition, partitions must maintain the original array order, and you can use fewer than `k` partitions if that produces a better score. The problem allows non-integer averages, so your answer can be a decimal value (accepted within `10⁻⁶` tolerance).

## Why This Matters

This problem exemplifies interval partitioning optimization, a pattern that appears in resource allocation, batch processing, and scheduling systems. When dividing workloads across servers, grouping tasks for parallel execution, or optimizing database query batches, you often face similar trade-offs between partition size and quality metrics. The dynamic programming approach you'll develop here teaches you to break down complex optimization problems by recognizing overlapping subproblems. Specifically, this builds your skills in defining DP states that depend on both position and constraint counts, which is crucial for many real-world optimization scenarios.

## Examples

**Example 1:**
- Input: `nums = [9,1,2,3,9], k = 3`
- Output: `20.00000`
- Explanation: The optimal partition is [9], [1, 2, 3], [9]:
Score = 9 + (1 + 2 + 3) / 3 + 9 = 9 + 2 + 9 = 20
An alternative partition like [9, 1], [2], [3, 9] yields:
Score = (9 + 1) / 2 + 2 + (3 + 9) / 2 = 5 + 2 + 6 = 13, which is suboptimal.

**Example 2:**
- Input: `nums = [1,2,3,4,5,6,7], k = 4`
- Output: `20.50000`

## Constraints

- 1 <= nums.length <= 100
- 1 <= nums[i] <= 10⁴
- 1 <= k <= nums.length

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a dynamic programming problem. Define dp[i][k] as the maximum score for partitioning the first i elements into at most k groups. The answer depends on where you place the last partition boundary.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use DP with state dp[i][j] representing max score for first i elements with j partitions. For each position i and partition count j, try all possible positions for the last partition. The last group from position m to i contributes its average. Use prefix sums to calculate subarray averages efficiently.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Precompute prefix sums to calculate any subarray sum in O(1). This reduces time complexity from O(n³k) to O(n²k). Consider whether space can be optimized by using only the previous row of the DP table.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Recursion | O(k^n) | O(n) | Exponential, impractical |
| DP with Prefix Sum | O(n²k) | O(nk) | Standard approach |
| Optimal | O(n²k) | O(nk) | Can optimize space to O(n) |

## Common Mistakes

1. **Not using prefix sums**
   ```python
   # Wrong: Recalculating sums repeatedly
   for i in range(n):
       for j in range(k):
           for m in range(i):
               subarray_sum = sum(nums[m:i+1])  # O(n) each time

   # Correct: Precompute prefix sums
   prefix = [0] * (n + 1)
   for i in range(n):
       prefix[i+1] = prefix[i] + nums[i]
   # Now sum(nums[m:i+1]) = prefix[i+1] - prefix[m]
   ```

2. **Incorrect DP state definition**
   ```python
   # Wrong: Using exactly k groups instead of "at most k"
   dp[i][k]  # exactly k groups

   # Correct: At most k groups (or track both)
   dp[i][k]  # maximum score with at most k groups
   # Transfer: dp[i][k] = max(dp[i][k-1], best_with_k_groups)
   ```

3. **Off-by-one errors in partition boundaries**
   ```python
   # Wrong: Incorrect range for last partition
   for m in range(i):
       last_avg = sum(nums[m:i]) / (i - m)

   # Correct: Proper inclusive boundaries
   for m in range(i):
       last_avg = (prefix[i+1] - prefix[m]) / (i - m + 1)
       dp[i+1][k] = max(dp[i+1][k], dp[m][k-1] + last_avg)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Partition Equal Subset Sum | Medium | Boolean DP instead of maximization |
| Split Array Largest Sum | Hard | Minimize maximum instead of maximize sum |
| Minimum Cost to Merge Stones | Hard | Different cost function with constraints |
| Palindrome Partitioning II | Hard | Different validity constraint |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
