---
id: M272
old_id: A069
slug: shortest-unsorted-continuous-subarray
title: Shortest Unsorted Continuous Subarray
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
frequency: high
related_problems: ["E088", "M075", "M280"]
prerequisites: ["array-manipulation", "two-pointers", "sorting"]
---
# Shortest Unsorted Continuous Subarray

## Problem

Given an integer array, find the shortest contiguous subarray that, if sorted in ascending order, would make the entire array sorted. Return the length of this minimal segment.

Think of it as finding the smallest "window of disorder" in an otherwise organized array. For example, in [2, 6, 4, 8, 10, 9, 15], the elements on both ends (2 on the left, 15 on the right) are already in their correct final positions. The middle section [6, 4, 8, 10, 9] needs sorting to fix the entire array. This middle section has length 5, so that's your answer.

The key insight is that some prefix of the array is already perfectly sorted and positioned correctly, and some suffix is also already perfect. The challenge is identifying exactly where these well-ordered regions end and begin. If the entire array is already sorted, return 0 since no subarray needs sorting.

What makes this tricky is that an element might seem in order relative to its immediate neighbors but still be out of place globally. For instance, in [1, 3, 2, 2, 2], the value 3 is greater than its left neighbor but is still part of the unsorted region because it's greater than values to its right.


## Why This Matters

This problem builds pattern recognition for partial ordering in data, a common challenge when validating or correcting sequences. In real systems, you often receive mostly-sorted data that needs minimal correction (like timestamped logs that are mostly ordered but have some out-of-sequence entries, or database records that are nearly sorted but have a few misplaced entries).

The optimal O(n) solution teaches you to extract global properties from local scans, a technique applicable to finding anomalies in data streams, validating array properties, and understanding the minimum correction needed to restore order. This appears frequently in data validation tasks and is a popular interview question for roles involving data processing.

## Examples

**Example 1:**
- Input: `nums = [2,6,4,8,10,9,15]`
- Output: `5`
- Explanation: You need to sort [6, 4, 8, 10, 9] in ascending order to make the whole array sorted in ascending order.

**Example 2:**
- Input: `nums = [1,2,3,4]`
- Output: `0`

**Example 3:**
- Input: `nums = [1]`
- Output: `0`

## Constraints

- 1 <= nums.length <= 10⁴
- -10⁵ <= nums[i] <= 10⁵

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding the Sorted Segments</summary>

Think of the array in three parts:
1. Left segment: Already sorted and contains elements that belong there
2. Middle segment: Needs to be sorted (this is what we're looking for)
3. Right segment: Already sorted and contains elements that belong there

Key insight: If we sort the middle segment, the entire array becomes sorted. The challenge is finding the boundaries of this middle segment.

Example: `[2, 6, 4, 8, 10, 9, 15]`
- Left sorted: `[2]` (stops at 6 because 6 > 4)
- Middle unsorted: `[6, 4, 8, 10, 9]`
- Right sorted: `[15]`
</details>

<details>
<summary>Hint 2: Finding Boundaries</summary>

**Approach: Compare with sorted version**
1. Create a sorted copy of the array
2. Find the leftmost position where `nums[i] != sorted[i]` (start of unsorted region)
3. Find the rightmost position where `nums[i] != sorted[i]` (end of unsorted region)
4. Return `(right - left + 1)` or `0` if array is already sorted

This is O(n log n) due to sorting, but it's simple and correct.

**Can we do better?** Yes! Think about what conditions must hold for elements to be in their correct final positions without sorting.
</details>

<details>
<summary>Hint 3: Optimal O(n) Solution</summary>

**Key observations:**
1. Elements on the left that are already in correct position must be less than all elements to their right
2. Elements on the right that are already in correct position must be greater than all elements to their left

**Algorithm:**
```python
# Find the right boundary: scan from left
# Track running maximum; if nums[i] < max_so_far, it needs to be sorted
max_so_far = nums[0]
right = -1
for i in range(1, len(nums)):
    if nums[i] < max_so_far:
        right = i  # This position needs sorting
    else:
        max_so_far = nums[i]

# Find the left boundary: scan from right
# Track running minimum; if nums[i] > min_so_far, it needs to be sorted
min_so_far = nums[-1]
left = 0
for i in range(len(nums)-2, -1, -1):
    if nums[i] > min_so_far:
        left = i  # This position needs sorting
    else:
        min_so_far = nums[i]

return 0 if right == -1 else right - left + 1
```

This scans the array twice (forward and backward) in O(n) time with O(1) space.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Sort and Compare | O(n log n) | O(n) | Simple but not optimal; creates sorted copy |
| Two-pass Min/Max | O(n) | O(1) | Optimal solution; scans left-to-right then right-to-left |
| Stack-based | O(n) | O(n) | Uses monotonic stack; same time but more space |

## Common Mistakes

### Mistake 1: Only checking adjacent elements
```python
# WRONG: Only comparing adjacent pairs
def findUnsortedSubarray(nums):
    left = 0
    right = len(nums) - 1

    # Finding first out-of-order adjacent pair
    while left < len(nums) - 1 and nums[left] <= nums[left + 1]:
        left += 1

    # This doesn't handle: [1, 3, 2, 2, 2]
    # The issue isn't just at position 1-2, but extends further
```
**Why it's wrong:** An element might be out of position even if it's correctly ordered relative to its immediate neighbor. You need to consider the global minimum/maximum, not just local comparisons.

### Mistake 2: Forgetting edge cases
```python
# WRONG: Not handling already-sorted arrays
def findUnsortedSubarray(nums):
    sorted_nums = sorted(nums)
    left = 0
    right = len(nums) - 1

    while left < len(nums) and nums[left] == sorted_nums[left]:
        left += 1

    while right >= 0 and nums[right] == sorted_nums[right]:
        right -= 1

    # What if left > right? Array is already sorted!
    return right - left + 1  # Returns negative number!

# CORRECT:
return 0 if left >= right else right - left + 1
```
**Why it's wrong:** When the array is already sorted, `left` will reach the end and `right` will reach the beginning, making `right < left`. Must check for this case.

### Mistake 3: Incorrect boundary calculation
```python
# WRONG: Off-by-one error
def findUnsortedSubarray(nums):
    # ... find left and right boundaries ...

    if left == right:  # Wrong condition
        return 0
    return right - left  # Missing the +1!

# CORRECT:
if left >= len(nums) or right < 0 or left >= right:
    return 0
return right - left + 1  # Include both endpoints
```
**Why it's wrong:** The subarray from index `left` to `right` inclusive has length `right - left + 1`, not `right - left`.

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Merge Sorted Array | Easy | Merge two sorted arrays in-place |
| Sort Colors | Medium | Sort array with 3 distinct values |
| Wiggle Sort | Medium | Rearrange array in alternating pattern |
| Find K Closest Elements | Medium | Find k closest elements to target |

## Practice Checklist

- [ ] Solve with sorting approach (Day 1)
- [ ] Implement optimal O(n) two-pass solution (Day 2)
- [ ] Handle edge cases: already sorted, reverse sorted (Day 3)
- [ ] Draw diagrams for left/right boundary logic (Day 3)
- [ ] Review after 1 week (Day 8)
- [ ] Review after 2 weeks (Day 15)
- [ ] Solve without looking at hints (Day 30)
