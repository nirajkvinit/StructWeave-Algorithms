---
id: E101
old_id: I059
slug: 3sum-smaller
title: 3Sum Smaller
difficulty: easy
category: easy
topics: ["array", "two-pointers", "sorting"]
patterns: ["two-pointers"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E001", "M015", "M016"]
prerequisites: ["two-pointers", "sorting"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# 3Sum Smaller

## Problem

Given an array of integers and a target value, count how many unique triplets of three different elements sum to less than the target. Specifically, find the count of index combinations where `i < j < k` and `nums[i] + nums[j] + nums[k] < target`.

The challenge here is efficiency: a brute force approach checking all possible triplets would take cubic time. However, by sorting the array first and using the two-pointer technique, you can reduce this to quadratic time. The key insight is that after fixing the first element, the remaining two elements form a Two Sum variant that can be solved with two pointers moving from opposite ends.

What makes this interesting is the counting strategy: when you find a valid triplet with the two-pointer approach, you're actually finding multiple valid triplets at once, not just one. This batch-counting technique is what makes the solution efficient.

## Why This Matters

This problem combines two fundamental techniques: sorting as preprocessing and the two-pointer pattern for array searching. The two-pointer approach is one of the most important interview patterns, appearing in countless problems involving pairs, triplets, and subarrays. What makes this problem especially valuable is learning how to count multiple solutions efficiently rather than enumerating them one by one. This counting optimization appears in many combinatorial problems and is a key skill for improving algorithmic efficiency. The pattern extends naturally to 3Sum (exact sum), 3Sum Closest, and 4Sum, making this an excellent foundation for a family of related problems.

## Examples

**Example 1:**
- Input: `nums = [-2,0,1,3], target = 2`
- Output: `2`
- Explanation: Because there are two triplets which sums are less than 2:
[-2,0,1]
[-2,0,3]

**Example 2:**
- Input: `nums = [], target = 0`
- Output: `0`

**Example 3:**
- Input: `nums = [0], target = 0`
- Output: `0`

## Constraints

- n == nums.length
- 0 <= n <= 3500
- -100 <= nums[i] <= 100
- -100 <= target <= 100

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Reduce to Two Sum</summary>

Fix the first element and reduce the problem to finding pairs in the remaining array whose sum is less than `target - nums[i]`. This transforms a 3-element problem into a 2-element subproblem. Think about how sorting might help count valid pairs efficiently.

</details>

<details>
<summary>🎯 Hint 2: Two Pointers After Sorting</summary>

Sort the array first. For each fixed element at index i, use two pointers (left = i+1, right = n-1) to count valid pairs. If nums[i] + nums[left] + nums[right] < target, then ALL pairs between left and right are valid (right - left pairs), so add (right - left) to count and move left pointer. If sum >= target, move right pointer left.

</details>

<details>
<summary>📝 Hint 3: Count Multiple Pairs at Once</summary>

Pseudocode approach:
1. Sort nums
2. count = 0
3. For i from 0 to n-3:
   - left = i + 1, right = n - 1
   - While left < right:
     - sum = nums[i] + nums[left] + nums[right]
     - If sum < target:
       - count += (right - left)  // All pairs valid
       - left++
     - Else: right--
4. Return count

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (3 Loops) | O(n³) | O(1) | Check all triplet combinations |
| **Optimal (Sort + Two Pointers)** | **O(n²)** | **O(1)** | O(n log n) sort + O(n²) scanning |
| With Hash Set | O(n²) | O(n) | Unnecessary space overhead |

## Common Mistakes

### Mistake 1: Counting Only One Pair at a Time

```python
# WRONG: Only incrementing count by 1 when multiple pairs are valid
def threeSumSmaller(nums, target):
    nums.sort()
    count = 0
    for i in range(len(nums) - 2):
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < target:
                count += 1  # Bug: should be (right - left)
                left += 1
            else:
                right -= 1
    return count  # Undercounts valid triplets
```

```python
# CORRECT: Count all valid pairs when sum < target
def threeSumSmaller(nums, target):
    nums.sort()
    count = 0
    for i in range(len(nums) - 2):
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < target:
                count += (right - left)  # All pairs between left and right
                left += 1
            else:
                right -= 1
    return count
```

### Mistake 2: Forgetting to Sort

```python
# WRONG: Two pointers only work on sorted array
def threeSumSmaller(nums, target):
    count = 0
    for i in range(len(nums) - 2):
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < target:
                count += (right - left)
                left += 1
            else:
                right -= 1
    return count  # Wrong results without sorting
```

```python
# CORRECT: Sort before applying two pointers
def threeSumSmaller(nums, target):
    nums.sort()  # Essential for two-pointer technique
    count = 0
    for i in range(len(nums) - 2):
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < target:
                count += (right - left)
                left += 1
            else:
                right -= 1
    return count
```

### Mistake 3: Off-by-One in Loop Bounds

```python
# WRONG: Loop goes too far (i can be n-1, leaving no room for j, k)
def threeSumSmaller(nums, target):
    nums.sort()
    count = 0
    for i in range(len(nums)):  # Bug: should be len(nums) - 2
        left, right = i + 1, len(nums) - 1
        while left < right:  # left >= right when i is too large
            total = nums[i] + nums[left] + nums[right]
            if total < target:
                count += (right - left)
                left += 1
            else:
                right -= 1
    return count
```

```python
# CORRECT: Ensure room for three elements
def threeSumSmaller(nums, target):
    nums.sort()
    count = 0
    for i in range(len(nums) - 2):  # Need at least 3 elements
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < target:
                count += (right - left)
                left += 1
            else:
                right -= 1
    return count
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| 3Sum | Medium | Find triplets that sum to exactly 0 |
| 3Sum Closest | Medium | Find triplet sum closest to target |
| 4Sum | Medium | Extend to four elements |
| Two Sum | Easy | Foundation problem with two elements |

## Practice Checklist

- [ ] Day 1: Solve with two pointers (20 min)
- [ ] Day 2: Understand why (right - left) counts all pairs (10 min)
- [ ] Day 7: Solve again, optimize without looking (15 min)
- [ ] Day 14: Explain approach to someone (5 min)
- [ ] Day 30: Code from memory (10 min)

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
