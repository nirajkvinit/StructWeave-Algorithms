---
id: M084
old_id: I013
slug: house-robber-ii
title: House Robber II
difficulty: medium
category: medium
topics: ["array", "dynamic-programming"]
patterns: ["backtrack-permutation", "dp-1d"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E198", "M337", "M740"]
prerequisites: ["dynamic-programming", "house-robber-i", "array-manipulation"]
---
# House Robber II

## Problem

Houses are positioned in a circular layout where the first and last homes are neighbors. Adjacent homes share an alarm system that triggers when both are targeted on the same night. Your task is to calculate the maximum profit you can obtain from robbing homes in this circle, where `nums` contains the value stored at each location. The circular constraint adds complexity: since the first and last houses are adjacent, you cannot rob both of them without triggering an alarm. This means if you rob house 0, you must skip house n-1, and vice versa. For each house, you must decide whether robbing it yields more profit than skipping it, considering the constraint that you cannot rob two adjacent houses. The array `nums[i]` represents the amount of money at house i. Edge cases include arrays with only one house (just take it), two houses (take the maximum), and arrays where alternating houses happen to have the highest values, making the optimal strategy more complex.

## Why This Matters

This problem models resource optimization under mutual exclusion constraints, which appears in many practical scenarios. In task scheduling, you might need to select the maximum-value tasks where certain tasks conflict and cannot run simultaneously. Portfolio optimization involves selecting investments that maximize return while avoiding correlated risks that would violate diversification constraints. In manufacturing, production line scheduling must maximize throughput while respecting equipment that cannot process adjacent job types. Network security uses similar logic to maximize coverage from surveillance cameras positioned in a ring topology where adjacent cameras create blind spots. The circular constraint specifically models scenarios like round-robin tournament scheduling and cyclic dependency resolution. This problem extends linear dynamic programming to handle circular constraints, teaching you to break complex constraints into simpler subproblems, a technique that applies to many constrained optimization challenges in algorithm design and operations research.

## Examples

**Example 1:**
- Input: `nums = [2,3,2]`
- Output: `3`
- Explanation: You cannot rob house 1 (money = 2) and then rob house 3 (money = 2), because they are adjacent houses.

**Example 2:**
- Input: `nums = [1,2,3,1]`
- Output: `4`
- Explanation: Rob house 1 (money = 1) and then rob house 3 (money = 3).
Total amount you can rob = 1 + 3 = 4.

**Example 3:**
- Input: `nums = [1,2,3]`
- Output: `3`

## Constraints

- 1 <= nums.length <= 100
- 0 <= nums[i] <= 1000

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Breaking the Circle</summary>

The circular constraint means you cannot rob both the first and last house simultaneously. This suggests breaking the problem into two cases:
1. Rob houses from index 0 to n-2 (exclude last house)
2. Rob houses from index 1 to n-1 (exclude first house)

The answer is the maximum of these two scenarios. Each scenario becomes the standard House Robber I problem.

</details>

<details>
<summary>🎯 Hint 2: Reuse House Robber I Solution</summary>

Once you exclude either the first or last house, you have a linear array (not circular). You can apply the classic House Robber DP solution:
- `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`

Run this twice: once excluding the last house, once excluding the first house.

</details>

<details>
<summary>📝 Hint 3: Implementation Pattern</summary>

Pseudocode:
```
def rob_circle(nums):
    if len(nums) == 1:
        return nums[0]

    def rob_linear(houses):
        prev2, prev1 = 0, 0
        for house in houses:
            current = max(prev1, prev2 + house)
            prev2, prev1 = prev1, current
        return prev1

    # Case 1: Rob houses [0..n-2], skip last
    case1 = rob_linear(nums[:-1])

    # Case 2: Rob houses [1..n-1], skip first
    case2 = rob_linear(nums[1:])

    return max(case1, case2)
```

Time: O(n), Space: O(1)

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(2^n) | O(n) | Try all combinations of robbing/not robbing each house |
| DP with 2D Array | O(n) | O(n) | Track state for each position, but uses unnecessary space |
| **DP Optimized (2 passes)** | **O(n)** | **O(1)** | Run linear House Robber twice, optimal solution |
| Memoization with Recursion | O(n) | O(n) | Top-down DP, but uses call stack |

## Common Mistakes

**Mistake 1: Not handling single house edge case**

```python
# Wrong - Crashes or gives wrong answer for single house
def rob(nums):
    # Tries to create nums[:-1] and nums[1:] for single element
    return max(rob_linear(nums[:-1]), rob_linear(nums[1:]))
    # nums[:-1] = [], nums[1:] = [] -> both empty!
```

```python
# Correct - Handle edge case first
def rob(nums):
    if len(nums) == 1:
        return nums[0]
    if len(nums) == 2:
        return max(nums[0], nums[1])

    return max(rob_linear(nums[:-1]), rob_linear(nums[1:]))
```

**Mistake 2: Trying to handle circular constraint in single DP pass**

```python
# Wrong - Overly complex, trying to track first house in DP
def rob(nums):
    n = len(nums)
    dp = [[0] * 2 for _ in range(n)]  # [index][robbed_first_house]
    # This becomes very complicated and error-prone
```

```python
# Correct - Split into two simpler problems
def rob(nums):
    if len(nums) == 1:
        return nums[0]

    def rob_linear(houses):
        prev2, prev1 = 0, 0
        for house in houses:
            current = max(prev1, prev2 + house)
            prev2, prev1 = prev1, current
        return prev1

    return max(rob_linear(nums[:-1]), rob_linear(nums[1:]))
```

**Mistake 3: Incorrect implementation of linear rob helper**

```python
# Wrong - Doesn't properly carry forward max values
def rob_linear(houses):
    if not houses:
        return 0
    prev2, prev1 = 0, houses[0]
    for i in range(1, len(houses)):
        current = prev2 + houses[i]  # Missing max comparison!
        prev2, prev1 = prev1, current
    return prev1
```

```python
# Correct - Take max of rob or skip current house
def rob_linear(houses):
    if not houses:
        return 0
    prev2, prev1 = 0, 0
    for house in houses:
        current = max(prev1, prev2 + house)  # Rob or skip
        prev2, prev1 = prev1, current
    return prev1
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| House Robber I | Medium | Linear arrangement, simpler version |
| House Robber III | Medium | Binary tree structure instead of array |
| Delete and Earn | Medium | Similar DP pattern with value frequency |
| Maximum Sum of Non-Adjacent | Easy | Core pattern without theming |
| Paint House | Medium | Multiple choices per position, similar DP |

## Practice Checklist

- [ ] Day 1: Solve by splitting into two House Robber I problems
- [ ] Day 2: Optimize space to O(1) using only two variables
- [ ] Day 7: Re-solve from scratch, ensure edge cases handled
- [ ] Day 14: Solve House Robber III (binary tree version)
- [ ] Day 30: Explain why splitting the problem works and prove correctness

**Strategy**: See [Dynamic Programming Patterns](../strategies/patterns/dynamic-programming.md)
