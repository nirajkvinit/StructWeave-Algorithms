---
id: M368
old_id: A207
slug: delete-and-earn
title: Delete and Earn
difficulty: medium
category: medium
topics: ["array", "dynamic-programming"]
patterns: ["dp-1d", "house-robber"]
estimated_time_minutes: 30
frequency: medium
related_problems:
  - id: E148
    title: House Robber
    difficulty: easy
  - id: M011
    title: House Robber II
    difficulty: medium
  - id: M020
    title: Coin Change
    difficulty: medium
prerequisites:
  - Basic Dynamic Programming
  - Hash Table Operations
  - Array Manipulation
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Delete and Earn

## Problem

You have an array of numbers and can repeatedly pick any number to earn points equal to its value. However, there's a catch: whenever you pick a number, all instances of that number minus one and that number plus one get deleted from the array without earning you any points.

For example, if your array is `[3, 4, 2]`:
- If you pick the 4, you earn 4 points, but the 3 and any 5s get deleted
- Then you can pick the 2 (earning 2 points) for a total of 6 points

Or in `[2, 2, 3, 3, 3, 4]`:
- If you pick all three 3s, you earn 9 points (3+3+3) and all 2s and 4s get deleted
- The 2s and 4s give you 0 points because they're deleted as a consequence
- So the best strategy is to take all the 3s for 9 points total

The key insight is that when you decide to "take" a number, you should take **all** instances of it to maximize your score. The decision is binary for each unique value: either take all of them or take none of them.

This transforms the problem: instead of thinking about individual elements, think about unique values. If you take all instances of value `x`, you earn `x * count(x)` points but forfeit the ability to earn points from values `x-1` and `x+1`. This is remarkably similar to the House Robber problem where you can't rob adjacent houses.

Your goal is to find the maximum points you can earn by choosing the optimal subset of values to collect.

## Why This Matters

This problem teaches you to recognize when a seemingly complex problem reduces to a simpler, well-known pattern. The transformation from "array of elements with deletion rules" to "choosing non-adjacent values to maximize sum" is a key insight that demonstrates algorithmic problem-solving maturity.

The House Robber pattern (selecting non-adjacent items to maximize value) appears in many contexts: scheduling jobs with conflicts, selecting independent sets in graphs, and resource allocation with exclusivity constraints. Learning to recognize this pattern saves time in interviews and real development.

This problem also reinforces the dynamic programming technique of breaking decisions into smaller subproblems, computing optimal solutions for each, and combining them. The space optimization from O(n) to O(1) by tracking only the last two states is a common DP optimization worth mastering.

## Examples

**Example 1:**
- Input: `nums = [3,4,2]`
- Output: `6`
- Explanation: Optimal sequence:
  - Select 4 (earn 4 points, removing 3 as well). Remaining: [2]
  - Select 2 (earn 2 points). Remaining: []
  - Total: 6 points

**Example 2:**
- Input: `nums = [2,2,3,3,3,4]`
- Output: `9`
- Explanation: Optimal sequence:
  - Select a 3 (earn 3 points, all 2s and 4s are removed). Remaining: [3,3]
  - Select a 3 (earn 3 points). Remaining: [3]
  - Select a 3 (earn 3 points). Remaining: []
  - Total: 9 points

## Constraints

- 1 <= nums.length <= 2 * 10⁴
- 1 <= nums[i] <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Transform the Problem</summary>

This problem is similar to the House Robber pattern. Instead of thinking about individual elements, consider grouping all occurrences of the same value together. If you take all instances of value `x`, you earn `x * count(x)` points but cannot take values `x-1` or `x+1`.

Create a frequency map or points array where `points[i]` represents the total points you can earn by taking all occurrences of value `i`. Now the problem becomes: choose values to maximize total points where you cannot choose adjacent values.

</details>

<details>
<summary>Hint 2: Dynamic Programming Formulation</summary>

Once you've transformed the problem into a "House Robber" variant, define your DP state:
- `dp[i]` = maximum points achievable considering values from 0 to i

The recurrence relation is:
- `dp[i] = max(dp[i-1], dp[i-2] + points[i])`

This means you either skip value `i` (take `dp[i-1]`) or take value `i` plus the best solution that doesn't include `i-1` (which is `dp[i-2] + points[i]`).

</details>

<details>
<summary>Hint 3: Space Optimization</summary>

Notice that to compute `dp[i]`, you only need the previous two values (`dp[i-1]` and `dp[i-2]`). This means you can optimize space from O(max_value) to O(1) by using two variables instead of an array.

Also, consider preprocessing: you don't need to iterate through all values from 0 to 10^4. Find the actual maximum value in your input and only process values up to that point.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (try all combinations) | O(2^n) | O(n) | Exponential - not practical |
| DP with Full Range | O(m) where m = max(nums) | O(m) | Works but wastes space on unused values |
| DP with Hash Map | O(n + m) | O(m) | Count frequencies first, then DP |
| Optimized DP | O(n + m) | O(1) | Space-optimized using two variables |

## Common Mistakes

### Mistake 1: Not Counting All Occurrences
```python
# Wrong: Only taking each value once
def deleteAndEarn(nums):
    points = {}
    for num in nums:
        points[num] = num  # Only stores the value, not sum of all occurrences
    # This loses information about multiple occurrences
```

**Fix:** Accumulate the total points for each value:
```python
# Correct: Sum all occurrences
def deleteAndEarn(nums):
    points = {}
    for num in nums:
        points[num] = points.get(num, 0) + num  # Sum all occurrences
```

### Mistake 2: Incorrect DP Transition
```python
# Wrong: Forgetting to consider skipping current value
def deleteAndEarn(nums):
    # ... setup code ...
    for i in range(1, max_val + 1):
        dp[i] = dp[i-2] + points[i]  # Always takes current value
    # This doesn't give the option to skip unprofitable values
```

**Fix:** Always take the maximum of taking or skipping:
```python
# Correct: Consider both options
for i in range(1, max_val + 1):
    dp[i] = max(dp[i-1], dp[i-2] + points[i])  # Choose better option
```

### Mistake 3: Off-by-One in Initialization
```python
# Wrong: Not handling base cases properly
def deleteAndEarn(nums):
    points = [0] * (max_val + 1)
    dp = [0] * (max_val + 1)
    dp[0] = points[0]
    # dp[1] is not initialized - could cause issues
    for i in range(2, max_val + 1):
        dp[i] = max(dp[i-1], dp[i-2] + points[i])
```

**Fix:** Initialize both base cases:
```python
# Correct: Initialize dp[0] and dp[1]
dp[0] = points[0]
dp[1] = max(points[0], points[1])  # Take better of first two
for i in range(2, max_val + 1):
    dp[i] = max(dp[i-1], dp[i-2] + points[i])
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| House Robber | Cannot rob adjacent houses | Easy |
| House Robber II | Houses in a circle (first and last adjacent) | Medium |
| Delete and Earn with K Distance | Removing value `x` eliminates `x-k` to `x+k` | Hard |
| Maximum Points with Budget | Can only perform up to `k` operations | Hard |
| 2D Delete and Earn | Grid where removing element affects neighbors | Hard |

## Practice Checklist

- [ ] First attempt (within 30 minutes)
- [ ] Identify connection to House Robber pattern
- [ ] Implement solution with frequency counting
- [ ] Optimize space to O(1)
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Can explain time/space tradeoffs clearly
- [ ] Attempted at least one variation

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
