---
id: H038
old_id: I064
slug: paint-house-ii
title: Paint House II
difficulty: hard
category: hard
topics: ["dynamic-programming"]
patterns: []
estimated_time_minutes: 45
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Paint House II

## Problem

Imagine `n` houses arranged in a line, where each house can be colored using any one of `k` available colors. Each house-color combination has a unique associated cost. Your objective is to color every house while ensuring that neighboring houses never share the same color.

A cost matrix of dimensions `n x k` provides the pricing information for each house-color pairing.

	- To illustrate: `costs[0][0]` represents what it costs to color house `0` using color `0`; similarly, `costs[1][2]` shows the cost for coloring house `1` with color `2`, and this pattern continues...

Calculate and return *the lowest total cost needed to color all houses*.

## Why This Matters

Dynamic programming optimizes overlapping subproblems. This problem teaches you to identify and exploit repeated computation.

## Examples

**Example 1:**
- Input: `costs = [[1,5,3],[2,9,4]]`
- Output: `5`
- Explanation: Paint house 0 into color 0, paint house 1 into color 2. Minimum cost: 1 + 4 = 5;
Or paint house 0 into color 2, paint house 1 into color 0. Minimum cost: 3 + 2 = 5.

**Example 2:**
- Input: `costs = [[1,3],[2,4]]`
- Output: `5`

## Constraints

- costs.length == n
- costs[i].length == k
- 1 <= n <= 100
- 2 <= k <= 20
- 1 <= costs[i][j] <= 20

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)

## Approach Hints

<details>
<summary>Key Insight</summary>
For each house, you need the minimum cost from the previous house using any color except the current one. Instead of checking all k-1 previous colors, track the two smallest costs from previous house. If current color matches the minimum, use second minimum; otherwise use minimum.
</details>

<details>
<summary>Main Approach</summary>
Use dynamic programming with O(1) optimization. For each house, maintain min1 (smallest cost) and min2 (second smallest cost) from previous house, along with min1's color index. For each color c in current house: if c equals min1_color, add min2; otherwise add min1. Update min1, min2, and min1_color for next iteration.
</details>

<details>
<summary>Optimization Tip</summary>
Avoid the O(n*k^2) solution that checks all k colors for each of k colors. By tracking just two minimum values from previous row, reduce to O(n*k). Can further optimize space to O(k) or even O(1) by not storing full DP table, just previous row's min1, min2, min1_color.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force DP | O(n * k^2) | O(n * k) | Check all previous colors for each color |
| Optimized DP | O(n * k) | O(n * k) | Track two minimums from previous row |
| Optimal (Space optimized) | O(n * k) | O(1) | Only store min1, min2, min1_color |

## Common Mistakes

1. **Not tracking which color gave minimum**
   ```python
   # Wrong: Using minimum without knowing its color
   for c in range(k):
       dp[i][c] = costs[i][c] + min(dp[i-1])  # Might use same color

   # Correct: Track minimum's color to avoid reuse
   for c in range(k):
       if c == min1_color:
           dp[i][c] = costs[i][c] + min2
       else:
           dp[i][c] = costs[i][c] + min1
   ```

2. **Recalculating minimums for each color**
   ```python
   # Wrong: O(k^2) - finding min k times per house
   for c in range(k):
       prev_min = min(dp[i-1][j] for j in range(k) if j != c)
       dp[i][c] = costs[i][c] + prev_min

   # Correct: O(k) - calculate min1, min2 once per house
   min1, min2, min1_color = find_two_mins(dp[i-1])
   for c in range(k):
       dp[i][c] = costs[i][c] + (min2 if c == min1_color else min1)
   ```

3. **Not handling case when k=1**
   ```python
   # Wrong: Assumes at least 2 colors
   min1 = min(dp[i-1])
   min2 = second_min(dp[i-1])  # Fails when k=1

   # Correct: Handle edge case
   if k == 1:
       return costs[0][0] if n == 1 else float('inf')
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Paint House | Medium | Only 3 colors (simpler DP) |
| House Robber | Medium | Can't rob adjacent houses (1D DP) |
| House Robber II | Medium | Houses in circle (split into two cases) |
| Paint Fence | Medium | Adjacent can be same color with limit |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming Optimization](../../strategies/patterns/dynamic-programming.md)
