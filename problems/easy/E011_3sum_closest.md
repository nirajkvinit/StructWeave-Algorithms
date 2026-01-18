---
id: E011
old_id: F016
slug: 3sum-closest
title: 3Sum Closest
difficulty: easy
category: easy
topics: ["array", "two-pointers", "sorting"]
patterns: ["two-pointers", "sorting"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E001", "E013", "M015"]
prerequisites: ["two-pointers", "sorting-algorithms", "absolute-difference"]
strategy_ref: ../../strategies/patterns/two-pointers.md
---
# 3Sum Closest

## Problem

Given an array of integers and a target value, find three numbers in the array whose sum is closest to the target. Return the sum of these three numbers, not the numbers themselves.

For example, if the array is `[-1, 2, 1, -4]` and the target is `1`, the sum closest to the target is `2` (from `-1 + 2 + 1 = 2`). The difference between this sum and the target is only `1`, which is smaller than any other possible triplet sum.

Unlike the exact match problem, here you are looking for the best approximation. There is guaranteed to be exactly one closest sum, meaning you will not have ties to worry about. The challenge is efficiently searching through all possible triplet combinations while tracking which one gets closest to your target.

## Why This Matters

This problem extends the classic 3Sum pattern by introducing optimization thinking. Instead of finding exact matches, you are finding the best approximation, which is common in real-world scenarios where perfect solutions do not exist.

The two-pointer technique combined with sorting demonstrates a fundamental algorithmic principle: preprocessing data can dramatically simplify search operations. Applications include recommendation systems finding closest matching preferences, financial algorithms finding portfolios nearest to target allocations, and machine learning optimization finding parameter combinations that minimize loss functions.

## Examples

**Example 1:**
- Input: `nums = [-1,2,1,-4], target = 1`
- Output: `2`
- Explanation: The sum that is closest to the target is 2. (-1 + 2 + 1 = 2).

**Example 2:**
- Input: `nums = [0,0,0], target = 1`
- Output: `0`
- Explanation: The sum that is closest to the target is 0. (0 + 0 + 0 = 0).

## Constraints

- 3 <= nums.length <= 500
- -1000 <= nums[i] <= 1000
- -10⁴ <= target <= 10⁴

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Build on 3Sum Pattern</summary>

This problem is similar to the classic 3Sum problem, but instead of finding an exact sum, you want the closest sum. How does sorting help? Once sorted, can you use two pointers to efficiently explore all possible triplets?

Think about: How do you measure "closest"? What do you need to track?

</details>

<details>
<summary>🎯 Hint 2: Sorted Array + Two Pointers</summary>

1. Sort the array first: O(n log n)
2. Fix one element at index i
3. Use two pointers (left = i+1, right = end) to find the best pair
4. Track the closest sum seen so far by comparing absolute difference from target

Key insight: After sorting, if current_sum < target, move left pointer right to increase sum. If current_sum > target, move right pointer left to decrease sum.

</details>

<details>
<summary>📝 Hint 3: Complete Algorithm</summary>

**Pseudocode:**
```
1. Sort the array
2. Initialize closest_sum = sum of first 3 elements
3. For i from 0 to n-3:
   a. left = i + 1, right = n - 1
   b. While left < right:
      - current_sum = nums[i] + nums[left] + nums[right]
      - If |current_sum - target| < |closest_sum - target|:
        * Update closest_sum = current_sum
      - If current_sum == target:
        * Return current_sum (exact match, can't get closer!)
      - Else if current_sum < target:
        * left++  (need larger sum)
      - Else:
        * right-- (need smaller sum)
4. Return closest_sum
```

**Optimization:** Can skip duplicate values of nums[i] to avoid redundant work.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n³) | O(1) | Check all triplets |
| **Sort + Two Pointers** | **O(n² + n log n) = O(n²)** | **O(1) or O(n)** | O(n) if sort not in-place |
| Hash Set | O(n²) | O(n) | Store pairs, less efficient for "closest" |

## Common Mistakes

### 1. Forgetting to sort first
```python
# WRONG: Two pointers don't work on unsorted array
for i in range(len(nums) - 2):
    left, right = i + 1, len(nums) - 1
    # Logic breaks because array not sorted

# CORRECT: Sort first
nums.sort()
for i in range(len(nums) - 2):
    left, right = i + 1, len(nums) - 1
```

### 2. Wrong distance calculation
```python
# WRONG: Using squared difference or not comparing absolute values
if (current_sum - target) < (closest_sum - target):
    closest_sum = current_sum
# Fails for negative differences!

# CORRECT: Compare absolute differences
if abs(current_sum - target) < abs(closest_sum - target):
    closest_sum = current_sum
```

### 3. Not handling exact match early return
```python
# WRONG: Continues searching after finding exact match
while left < right:
    current_sum = nums[i] + nums[left] + nums[right]
    if abs(current_sum - target) < abs(closest_sum - target):
        closest_sum = current_sum
    # ... continue searching

# CORRECT: Return immediately if exact match
if current_sum == target:
    return current_sum
```

### 4. Off-by-one in loop bounds
```python
# WRONG: i can go too far, leaving no room for left and right
for i in range(len(nums)):
    left, right = i + 1, len(nums) - 1
    # When i = n-1, left = n which is out of bounds

# CORRECT: Stop at n-2 to leave room for 2 more elements
for i in range(len(nums) - 2):
    left, right = i + 1, len(nums) - 1
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| 2Sum Closest | Two numbers instead of three | Single two-pointer pass after sorting |
| 4Sum Closest | Four numbers | Add another outer loop, O(n³) |
| kSum Closest | k numbers | Recursive or k-2 nested loops |
| Return all closest triplets | Multiple answers with same distance | Store all triplets with min distance |
| Distinct elements only | No duplicates in result | Skip duplicate values explicitly |

## Practice Checklist

**Correctness:**
- [ ] Handles exactly 3 elements
- [ ] Handles all positive numbers
- [ ] Handles all negative numbers
- [ ] Handles mix of positive/negative
- [ ] Handles exact match (returns early)
- [ ] Handles duplicate values

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 12-15 minutes
- [ ] Can discuss complexity
- [ ] Can explain why sorting helps
- [ ] Can explain two-pointer movement logic

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations (2Sum, 4Sum closest)
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Two Pointers Pattern](../../strategies/patterns/two-pointers.md)
