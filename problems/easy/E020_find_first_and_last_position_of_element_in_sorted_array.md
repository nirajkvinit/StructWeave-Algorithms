---
id: E020
old_id: F034
slug: find-first-and-last-position-of-element-in-sorted-array
title: Find First and Last Position of Element in Sorted Array
difficulty: easy
category: easy
topics: ["array", "binary-search"]
patterns: ["binary-search-variant"]
estimated_time_minutes: 20
frequency: medium
related_problems: ["E021", "M033", "M081"]
prerequisites: ["binary-search-basics", "array-basics"]
strategy_ref: ../strategies/patterns/binary-search.md
---
# Find First and Last Position of Element in Sorted Array

## Problem

Given a sorted array of integers (in non-decreasing order) and a target value, find the starting and ending position (indices) of that target value in the array. The array may contain duplicate values, so the target could appear multiple times consecutively. Your goal is to return the range [start, end] where the target appears.

For example, in the array [5,7,7,8,8,10], if the target is 8, you should return [3,4] because 8 appears at indices 3 and 4. If the target doesn't exist in the array (like searching for 6 in the same array), return [-1,-1].

The key constraint is that your solution must run in O(log n) time complexity. This rules out a simple linear scan - you'll need to leverage the fact that the array is sorted and use a variant of binary search. Standard binary search finds any occurrence of the target, but here you need to find specifically the first and last occurrences, even when there are many duplicates.

## Why This Matters

This problem teaches advanced binary search techniques beyond basic element finding. It demonstrates:
- **Binary search variants**: Finding boundaries, not just existence
- **Logarithmic efficiency**: O(log n) even for range queries
- **Edge case handling**: Dealing with duplicates and missing elements

**Real-world applications:**
- Database range queries on indexed columns
- Time-series data finding event start/end times
- Log analysis locating error message ranges

## Examples

**Example 1:**
- Input: `nums = [5,7,7,8,8,10], target = 8`
- Output: `[3,4]`

**Example 2:**
- Input: `nums = [5,7,7,8,8,10], target = 6`
- Output: `[-1,-1]`

**Example 3:**
- Input: `nums = [], target = 0`
- Output: `[-1,-1]`

## Constraints

- 0 <= nums.length <= 10⁵
- -10⁹ <= nums[i] <= 10⁹
- nums is a non-decreasing array.
- -10⁹ <= target <= 10⁹

## Think About

1. Can standard binary search find both positions in one pass?
2. How would you modify binary search to find the leftmost occurrence?
3. How would you modify binary search to find the rightmost occurrence?
4. What's the relationship between finding first and finding last?

---

## Approach Hints

<details>
<summary>💡 Hint 1: What's wrong with standard binary search?</summary>

Standard binary search stops as soon as it finds **any** occurrence of the target.

But you need the **first** and **last** occurrences, which might be far apart.

**Brute force:** Linear scan from left to right is O(n). Can you do better using the sorted property?

**Think about:** Can you run two modified binary searches - one to find the leftmost, one to find the rightmost?

</details>

<details>
<summary>🎯 Hint 2: Binary search for boundaries</summary>

Modify binary search to continue searching even after finding the target.

**For leftmost occurrence:**
- When you find `nums[mid] == target`, don't stop
- Continue searching in the **left half** to find earlier occurrences
- Track the leftmost index found so far

**For rightmost occurrence:**
- When you find `nums[mid] == target`, don't stop
- Continue searching in the **right half** to find later occurrences
- Track the rightmost index found so far

**Key insight:** You need two separate binary searches, each with a different continuation strategy.

</details>

<details>
<summary>📝 Hint 3: Two binary search variants</summary>

```
# Find leftmost position
def find_left(nums, target):
    left, right = 0, len(nums) - 1
    result = -1

    while left <= right:
        mid = (left + right) // 2

        if nums[mid] == target:
            result = mid          # Found it, but keep searching left
            right = mid - 1       # Look for earlier occurrence
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return result

# Find rightmost position
def find_right(nums, target):
    left, right = 0, len(nums) - 1
    result = -1

    while left <= right:
        mid = (left + right) // 2

        if nums[mid] == target:
            result = mid          # Found it, but keep searching right
            left = mid + 1        # Look for later occurrence
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return result

# Main function
return [find_left(nums, target), find_right(nums, target)]
```

**Total complexity:** O(log n) + O(log n) = O(log n)

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Linear Scan | O(n) | O(1) | Simple but ignores sorted property |
| Binary Search Once + Expand | O(n) worst case | O(1) | Degenerates when all elements are target |
| **Two Binary Searches (Optimal)** | **O(log n)** | **O(1)** | Logarithmic even with duplicates |

**Why Two Binary Searches Win:**
- Each binary search is O(log n)
- Independent searches for left and right bounds
- Handles worst case (all elements are target) efficiently
- No expansion phase needed

---

## Common Mistakes

### 1. Using standard binary search and expanding
```python
# WRONG: O(n) worst case when all elements are target
mid = binary_search(nums, target)
if mid == -1:
    return [-1, -1]

# Expand left and right from mid
left = right = mid
while left > 0 and nums[left-1] == target:
    left -= 1
while right < len(nums)-1 and nums[right+1] == target:
    right += 1

# CORRECT: Use two separate binary searches
```

### 2. Not continuing search after finding target
```python
# WRONG: Stops at first occurrence found
if nums[mid] == target:
    return mid  # This might not be leftmost!

# CORRECT: Keep searching
if nums[mid] == target:
    result = mid
    right = mid - 1  # Continue searching left
```

### 3. Off-by-one errors in boundary updates
```python
# WRONG: Infinite loop when target found
if nums[mid] == target:
    right = mid  # Should be mid - 1

# CORRECT
if nums[mid] == target:
    result = mid
    right = mid - 1
```

### 4. Returning result immediately instead of tracking
```python
# WRONG: Returns first occurrence found (not necessarily leftmost)
if nums[mid] == target:
    return mid

# CORRECT: Track and continue
if nums[mid] == target:
    result = mid
    right = mid - 1  # Keep looking left
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Count occurrences** | Return count, not positions | `right - left + 1` if both found |
| **Find any occurrence** | Standard binary search | Stop on first match |
| **Rotated sorted array** | Array rotated at pivot | Find pivot first, then search |
| **2D matrix** | Sorted rows/columns | Binary search on rows, then columns |
| **Infinite array** | Unknown length | Exponential search, then binary |

**Alternative: Single pass with lower_bound/upper_bound style:**
```python
def searchRange(nums, target):
    def lower_bound(nums, target):
        # Find first position >= target
        left, right = 0, len(nums)
        while left < right:
            mid = (left + right) // 2
            if nums[mid] < target:
                left = mid + 1
            else:
                right = mid
        return left

    left = lower_bound(nums, target)
    right = lower_bound(nums, target + 1) - 1

    if left <= right and left < len(nums) and nums[left] == target:
        return [left, right]
    return [-1, -1]
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles target not present (Example 2)
- [ ] Handles empty array (Example 3)
- [ ] Handles single element arrays
- [ ] Handles all elements being target
- [ ] Returns [-1, -1] correctly

**Optimization:**
- [ ] Achieved O(log n) time complexity
- [ ] Used two independent binary searches
- [ ] No linear expansion phase

**Interview Readiness:**
- [ ] Can explain leftmost/rightmost binary search
- [ ] Can code both variants in 10 minutes
- [ ] Can handle edge cases without prompting
- [ ] Can discuss alternative approaches

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement lower_bound variant
- [ ] Day 14: Solve related problem M033
- [ ] Day 30: Quick review

---

**Strategy**: See [Binary Search Pattern](../strategies/patterns/binary-search.md)
