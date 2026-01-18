---
id: M063
old_id: F153
slug: find-minimum-in-rotated-sorted-array
title: Find Minimum in Rotated Sorted Array
difficulty: medium
category: medium
topics: ["array", "binary-search"]
patterns: ["modified-binary-search"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M064", "M033", "M081"]
prerequisites: ["binary-search", "rotated-array"]
strategy_ref: ../strategies/patterns/binary-search.md
---
# Find Minimum in Rotated Sorted Array

## Problem

Suppose you have a sorted array that has been rotated at some unknown pivot point, and you need to find the minimum element. A rotated array means the array was originally sorted in ascending order, then some number of elements from the front were moved to the back. For example, [0, 1, 2, 4, 5, 6, 7] might become [4, 5, 6, 7, 0, 1, 2] if rotated 4 times. The array consists of all unique values with no duplicates. The challenge is to find the minimum value efficiently, ideally in O(log n) time rather than O(n) linear scan. While you could simply iterate through every element to find the minimum, that ignores the partially sorted structure of the array. The key insight is recognizing that the array consists of two sorted subarrays, and the minimum is located at the rotation pivot point where the array "breaks" from high values back to low values. You need a strategy that eliminates half the search space at each step, similar to binary search but adapted to handle the rotation.

## Why This Matters

Rotated sorted arrays appear in circular buffer implementations used by operating systems for logging, where the oldest entries wrap around to the beginning and you need to quickly find where the log starts. Load balancers use rotated arrays to distribute requests across servers in round-robin fashion, needing to efficiently find the starting point. Time-series databases storing cyclical data (like hourly temperature readings) benefit from finding rotation points to align queries. Scheduling systems with recurring tasks use circular arrays where finding the minimum determines the next task to execute. Distributed systems use consistent hashing with circular key spaces, requiring efficient minimum-finding in rotated ranges when rebalancing. The modified binary search technique you learn here extends to many search problems with modified invariants: finding peaks in bitonic arrays, searching in rotated arrays, and optimizing in unimodal functions, all critical for systems programming and algorithm optimization.

## Examples

**Example 1:**
- Input: `nums = [3,4,5,1,2]`
- Output: `1`
- Explanation: The original array was [1,2,3,4,5] rotated 3 times.

**Example 2:**
- Input: `nums = [4,5,6,7,0,1,2]`
- Output: `0`
- Explanation: The original array was [0,1,2,4,5,6,7] and it was rotated 4 times.

**Example 3:**
- Input: `nums = [11,13,15,17]`
- Output: `11`
- Explanation: The original array was [11,13,15,17] and it was rotated 4 times.

## Constraints

- n == nums.length
- 1 <= n <= 5000
- -5000 <= nums[i] <= 5000
- All the integers of nums are **unique**.
- nums is sorted and rotated between 1 and n times.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Modified Binary Search</summary>

A rotated sorted array has a unique property: it consists of two sorted subarrays. The minimum element is the pivot point where the rotation occurred. You can use binary search by determining which half is sorted and which contains the minimum.

</details>

<details>
<summary>🎯 Hint 2: Key Observation</summary>

Compare the middle element with the rightmost element:
- If `nums[mid] > nums[right]`: minimum is in right half (mid+1 to right)
- If `nums[mid] < nums[right]`: minimum is in left half including mid (left to mid)

The minimum is always in the unsorted half or at the boundary.

</details>

<details>
<summary>📝 Hint 3: Binary Search Template</summary>

```
left = 0, right = len(nums) - 1

while left < right:
    mid = left + (right - left) // 2

    if nums[mid] > nums[right]:
        # Minimum is in right half
        left = mid + 1
    else:
        # Minimum is in left half including mid
        right = mid

return nums[left]
```

Why `left < right` and not `left <= right`? Because we want to converge to a single element.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Linear Scan | O(n) | O(1) | Simple iteration to find minimum |
| **Binary Search** | **O(log n)** | **O(1)** | Optimal solution leveraging sorted property |

## Common Mistakes

### 1. Comparing with Left Instead of Right
```python
# WRONG: Comparing mid with left element
def findMin(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] > nums[left]:  # Wrong comparison!
            left = mid + 1
        else:
            right = mid
    return nums[left]
# Fails on [3,4,5,1,2] and many other cases
```

```python
# CORRECT: Compare mid with right element
def findMin(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] > nums[right]:
            left = mid + 1
        else:
            right = mid
    return nums[left]
```

### 2. Incorrect Boundary Update
```python
# WRONG: Setting right = mid - 1
def findMin(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] > nums[right]:
            left = mid + 1
        else:
            right = mid - 1  # Might skip minimum!
    return nums[left]
```

```python
# CORRECT: Keep mid as potential answer
def findMin(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] > nums[right]:
            left = mid + 1
        else:
            right = mid  # mid could be the minimum
    return nums[left]
```

### 3. Using Wrong Loop Condition
```python
# WRONG: Using left <= right
def findMin(nums):
    left, right = 0, len(nums) - 1
    while left <= right:  # Wrong condition
        mid = left + (right - left) // 2
        if nums[mid] > nums[right]:
            left = mid + 1
        else:
            right = mid
    return nums[left]
# Infinite loop when left == right
```

```python
# CORRECT: Use left < right
def findMin(nums):
    left, right = 0, len(nums) - 1
    while left < right:  # Converge to single element
        mid = left + (right - left) // 2
        if nums[mid] > nums[right]:
            left = mid + 1
        else:
            right = mid
    return nums[left]
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| With duplicates (M064) | Array may have duplicates | When nums[mid] == nums[right], decrement right |
| Find rotation count | Count number of rotations | Return left index (minimum position) |
| Search target in rotated array | Find specific value | First find pivot, then binary search in correct half |
| Maximum instead of minimum | Find maximum element | Maximum is just before minimum (at index - 1) |

## Practice Checklist

- [ ] Handles non-rotated array (already sorted)
- [ ] Handles single element array
- [ ] Handles array rotated n times (back to original)
- [ ] Handles rotation at different positions
- [ ] Can explain why compare with right, not left
- [ ] Can draw the binary search narrowing process
- [ ] Can code solution in 10 min
- [ ] Can discuss time/space complexity

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Binary Search Pattern](../../strategies/patterns/binary-search.md)
