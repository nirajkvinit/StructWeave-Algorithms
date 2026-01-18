---
id: E077
old_id: F183
slug: house-robber
title: House Robber
difficulty: easy
category: easy
topics: ["array"]
patterns: ["dp-1d"]
estimated_time_minutes: 15
frequency: high
related_problems: ["M213", "M337", "E198"]
prerequisites: ["dynamic-programming", "array-traversal"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# House Robber

## Problem

You're planning to rob houses along a street, where each house contains a certain amount of money. There's one constraint: you cannot rob two adjacent houses because they have connected security systems that will alert the police.

Given an integer array `nums` where `nums[i]` represents the amount of money in house `i`, return the maximum amount of money you can rob without triggering the security system.

**Example scenario:**
- Houses: `[2, 7, 9, 3, 1]`
- You could rob houses 0, 2, and 4 for a total of 2 + 9 + 1 = 12
- Or rob houses 1 and 3 for a total of 7 + 3 = 10
- The maximum is 12

**The challenge:** At each house, you must decide whether to rob it (and skip the previous house) or skip it (and potentially keep the earnings from the previous house). How do you make optimal decisions?

**Watch out for:**
- You're not required to alternate houses (you can skip consecutive houses)
- The optimal solution might not include the first or last house
- Single house or empty inputs need special handling

## Why This Matters

This is a classic introduction to **dynamic programming with sequential constraints**. The same pattern appears in:
- **Stock trading**: Buying and selling with cooldown periods (can't buy immediately after selling)
- **Resource allocation**: Scheduling tasks with dependencies where certain tasks can't run consecutively
- **Game theory**: Optimal play in games where certain moves lock out adjacent options
- **Network routing**: Path optimization where consecutive nodes create interference

The "can't use adjacent elements" constraint transforms a simple maximization problem into a teaching moment for recurrence relations and space optimization. Mastering this builds the foundation for more complex DP problems involving state transitions and constraints.

## Examples

**Example 1:**
- Input: `nums = [1,2,3,1]`
- Output: `4`
- Explanation: Rob house 1 (money = 1) and then rob house 3 (money = 3).
Total amount you can rob = 1 + 3 = 4.

**Example 2:**
- Input: `nums = [2,7,9,3,1]`
- Output: `12`
- Explanation: Rob house 1 (money = 2), rob house 3 (money = 9) and rob house 5 (money = 1).
Total amount you can rob = 2 + 9 + 1 = 12.

## Constraints

- 1 <= nums.length <= 100
- 0 <= nums[i] <= 400

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

At each house, you face a decision: rob it or skip it. If you rob the current house, you cannot rob the previous one. Think about how the maximum money at each position depends on previous decisions.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

This is a classic dynamic programming problem. For each house i, the maximum amount you can rob is the maximum of: (1) rob house i + maximum from houses 0 to i-2, or (2) skip house i and take maximum from houses 0 to i-1. You can optimize space by only keeping track of the last two values instead of an entire array.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**Space-Optimized DP:**
1. Initialize prev2 = 0, prev1 = 0
2. For each house value in nums:
   - Calculate current = max(prev1, prev2 + house_value)
   - Update prev2 = prev1, prev1 = current
3. Return prev1

This uses O(1) space instead of O(n).

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursion | O(2^n) | O(n) | Exponential due to overlapping subproblems |
| DP with Array | O(n) | O(n) | Store max for each house |
| **DP Optimized** | **O(n)** | **O(1)** | Only track last two values |

## Common Mistakes

**Mistake 1: Incorrect Recurrence Relation**

```python
# Wrong: Assumes you must alternate houses
def rob(nums):
    total = 0
    for i in range(0, len(nums), 2):  # Only even indices
        total += nums[i]
    return total
```

```python
# Correct: Choose optimally at each step
def rob(nums):
    if not nums:
        return 0
    prev2, prev1 = 0, 0
    for num in nums:
        current = max(prev1, prev2 + num)
        prev2, prev1 = prev1, current
    return prev1
```

**Mistake 2: Not Handling Edge Cases**

```python
# Wrong: Index out of bounds for small arrays
def rob(nums):
    n = len(nums)
    dp = [0] * n
    dp[0] = nums[0]
    dp[1] = max(nums[0], nums[1])  # Crashes when n = 1
    # ...
```

```python
# Correct: Handle all edge cases
def rob(nums):
    if not nums:
        return 0
    if len(nums) == 1:
        return nums[0]
    prev2, prev1 = 0, 0
    for num in nums:
        current = max(prev1, prev2 + num)
        prev2, prev1 = prev1, current
    return prev1
```

**Mistake 3: Overcomplicating with Recursion**

```python
# Wrong: Inefficient recursive solution without memoization
def rob(nums):
    def helper(i):
        if i < 0:
            return 0
        return max(helper(i-1), helper(i-2) + nums[i])
    return helper(len(nums) - 1)  # O(2^n) time
```

```python
# Correct: Iterative DP is simpler and more efficient
def rob(nums):
    prev2, prev1 = 0, 0
    for num in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + num)
    return prev1
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| House Robber II | Houses arranged in a circle (circular array) | Medium |
| House Robber III | Houses arranged in a binary tree | Medium |
| Delete and Earn | Similar DP with element frequency | Medium |
| Maximum Sum Non-Adjacent | Generalized version with different constraints | Medium |
| Paint House | Choose from multiple options with constraints | Easy |

## Practice Checklist

- [ ] Day 1: Solve with DP array approach
- [ ] Day 2: Optimize to O(1) space
- [ ] Day 3: Try recursive approach with memoization
- [ ] Week 1: Solve House Robber II (circular variant)
- [ ] Week 2: Explain the recurrence relation clearly
- [ ] Month 1: Solve similar DP problems (Paint House, Delete and Earn)

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
