---
id: M534
old_id: A423
slug: tallest-billboard
title: Tallest Billboard
difficulty: medium
category: medium
topics: []
patterns: ["backtrack-combination"]
estimated_time_minutes: 30
---
# Tallest Billboard

## Problem

Imagine you're building a giant billboard that needs two steel support beams of exactly equal height on each side - like the twin towers holding up a highway sign. You have various metal rods that can be welded together to create these supports, and you want to make them as tall as possible while maintaining equal heights.

You're constructing a billboard that requires two steel supports of equal height on each side. You want to maximize the height of these supports.

You have a collection of `rods` with various lengths that can be welded together. For instance, rods of lengths `1`, `2`, and `3` can be combined to create a support of length `6`.

The challenge: partition your rods into two groups where both groups have the same total length. What's the maximum possible height you can achieve?

For example:
- With rods `[1, 2, 3, 6]`, you can make supports of height 6 by using {1,2,3} on one side and {6} on the other
- With rods `[1, 2]`, no valid partition exists - return 0

Return *the maximum height you can achieve for both supports*. If it's impossible to create two equal-height supports, return `0`.

## Why This Matters

Balanced partitioning problems appear throughout engineering and operations research. Consider load balancing in distributed systems (splitting tasks across servers so both finish at the same time), warehouse inventory allocation (dividing products between two facilities equally), or even team formation in project management (creating balanced groups). This problem teaches dynamic programming with state compression - instead of tracking two separate heights, you track their difference, which dramatically reduces complexity. This "difference state" technique is powerful for any problem involving balanced splits or equal sums.

## Examples

**Example 1:**
- Input: `rods = [1,2,3,6]`
- Output: `6`
- Explanation: Partition into {1,2,3} and {6}, both totaling 6.

**Example 2:**
- Input: `rods = [1,2,3,4,5,6]`
- Output: `10`
- Explanation: Partition into {2,3,5} and {4,6}, both totaling 10.

**Example 3:**
- Input: `rods = [1,2]`
- Output: `0`
- Explanation: No valid partition exists to create equal-height supports.

## Constraints

- 1 <= rods.length <= 20
- 1 <= rods[i] <= 1000
- sum(rods[i]) <= 5000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a partition problem with a twist: instead of dividing into two equal-sum subsets, we need to maximize the sum while maintaining equality. Use dynamic programming where the state tracks the difference between two support heights.
</details>

<details>
<summary>Main Approach</summary>
Use DP with state dp[diff] = maximum height of taller support when the difference between supports is diff. For each rod, we have three choices: add to left support, add to right support, or skip. The answer is dp[0] (when difference is 0, both supports have equal height).
</details>

<details>
<summary>Optimization Tip</summary>
The difference between supports can range from -sum(rods) to +sum(rods), but we only need to track valid states. Use a dictionary instead of array to save space. Also, the maximum possible difference is bounded by 5000 (constraint), so state space is manageable.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Try All Partitions) | O(3^n) | O(n) | Three choices per rod: left, right, or neither |
| DP with Difference States | O(n × sum) | O(sum) | n rods, sum up to 5000 |
| Optimal (Meet in Middle) | O(3^(n/2) × sum) | O(3^(n/2)) | For very large n, split and combine |

## Common Mistakes

1. **Using 2D DP incorrectly**
   ```python
   # Wrong: Tracking both heights separately leads to huge state space
   dp[i][h1][h2]  # O(n × sum² ) - too large

   # Correct: Track difference only
   dp[diff] = max_height  # O(sum) states
   # If diff = h1 - h2 and we know max_height = max(h1, h2)
   # Then when diff = 0, both heights equal max_height
   ```

2. **Not handling negative differences**
   ```python
   # Wrong: Only tracking positive differences
   dp = [0] * (sum(rods) + 1)

   # Correct: Use dictionary to handle both positive and negative
   dp = {0: 0}  # diff: max_height
   # Can have differences from -sum to +sum
   ```

3. **Incorrect state transition**
   ```python
   # Wrong: Not considering all three choices properly
   for rod in rods:
       dp[rod] = rod  # Only considering adding to one side

   # Correct: Three transitions for each state
   new_dp = {}
   for diff, height in dp.items():
       # Add to taller support
       new_dp[diff + rod] = max(new_dp.get(diff + rod, 0), height + rod)
       # Add to shorter support
       new_diff = abs(diff - rod)
       new_height = max(height, height + rod - abs(diff - rod))
       new_dp[new_diff] = max(new_dp.get(new_diff, 0), new_height)
       # Skip rod
       new_dp[diff] = max(new_dp.get(diff, 0), height)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Partition Equal Subset Sum | Medium | Binary result, simpler DP state |
| Tallest Billboard with K Supports | Hard | Generalize to K supports instead of 2 |
| Minimize Difference of Sum of Two Subsets | Medium | Similar DP tracking difference |
| Last Stone Weight II | Medium | Minimize difference instead of maximize equal sum |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
