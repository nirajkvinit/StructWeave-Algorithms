---
id: M249
old_id: A037
slug: single-element-in-a-sorted-array
title: Single Element in a Sorted Array
difficulty: medium
category: medium
topics: ["array", "binary-search"]
patterns: ["binary-search", "bit-manipulation"]
estimated_time_minutes: 30
frequency: high
related_problems:
  - E136_single_number.md
  - M287_find_the_duplicate_number.md
  - M540_single_element_in_sorted_array.md
prerequisites:
  - binary search basics
  - array indexing
  - parity (odd/even) concepts
strategy_ref: ../strategies/patterns/binary-search.md
---
# Single Element in a Sorted Array

## Problem

You have a sorted array where every element appears exactly twice, except for one element that appears only once. Find and return that unique element. The constraint is that your solution must run in O(log n) time complexity and use O(1) extra space, which rules out linear scans and hash tables.

The array is sorted, for example [1,1,2,3,3,4,4,8,8], and all the pairs are grouped together. The key insight is that the single element disrupts the pairing pattern. Before the single element, each pair starts at an even index (indices 0-1, 2-3, 4-5...). After the single element appears, this pattern shifts: pairs start at odd indices instead. For instance, in [1,1,2,3,3], the pair (1,1) is at indices 0-1 (even start), the single 2 is at index 2, and the pair (3,3) is at indices 3-4 (odd start).

This disruption creates a searchable property perfect for binary search. At any middle position, you can check whether you're before or after the single element by examining the even/odd pairing pattern. If you're at an even index and your value matches the next element, the single element is to the right. If you're at an even index and your value doesn't match the next element, the single element is at your position or to the left. This lets you eliminate half the array each step, achieving the required O(log n) complexity.

## Why This Matters

This problem teaches a subtle but powerful variation of binary search: searching not for a value, but for a structural property change. Unlike typical binary search where you compare values to find a target, here you're detecting where a pairing pattern breaks. This technique applies to finding transition points in data: locating where sorted array properties change, identifying version boundaries in versioned systems, detecting anomalies in time-series data, or finding breakpoints in piecewise functions. Understanding that binary search works on any monotonic property, not just sorted values, unlocks solutions to an entire class of "find the special element" problems commonly asked in technical interviews.

## Examples

**Example 1:**
- Input: `nums = [1,1,2,3,3,4,4,8,8]`
- Output: `2`

**Example 2:**
- Input: `nums = [3,3,7,7,10,11,11]`
- Output: `10`

## Constraints

- 1 <= nums.length <= 10⁵
- 0 <= nums[i] <= 10⁵

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Observe the Pattern Before and After the Single Element</summary>

In a sorted array with pairs, notice the index pattern:
- Before the single element: First occurrence at even index (0, 2, 4...)
- After the single element: First occurrence at odd index (1, 3, 5...)

Example: [1,1,2,3,3,4,4]
- Index 0,1: (1,1) - pair starts at even index ✓
- Index 2: (2) - single element
- Index 3,4: (3,3) - pair starts at odd index ✗
- Index 5,6: (4,4) - pair starts at odd index ✗

This pattern helps us use binary search!
</details>

<details>
<summary>Hint 2: Use Binary Search with Index Parity</summary>

Binary search can work here because the single element creates a "break point" in the even/odd pairing pattern. At any mid position:

1. If mid is even and nums[mid] == nums[mid+1], the single is on the right
2. If mid is even and nums[mid] != nums[mid+1], the single is on the left
3. If mid is odd, adjust by checking nums[mid-1]

Always ensure you're comparing with the correct neighbor based on parity.
</details>

<details>
<summary>Hint 3: Simplify with XOR for Index Adjustment</summary>

A clever trick: Use `mid ^ 1` to get the pair index:
- If mid is even, `mid ^ 1 = mid + 1`
- If mid is odd, `mid ^ 1 = mid - 1`

This allows uniform comparison: if nums[mid] == nums[mid ^ 1], then:
- If mid is even, single element is to the right
- If mid is odd, single element is to the left

This simplifies the binary search logic considerably.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Linear Scan | O(n) | O(1) | Check each pair sequentially |
| XOR All Elements | O(n) | O(1) | Works but doesn't meet O(log n) requirement |
| Binary Search (Pattern) | O(log n) | O(1) | Optimal solution using index parity |
| Binary Search (XOR trick) | O(log n) | O(1) | Cleaner implementation |

## Common Mistakes

### Mistake 1: Not Handling Edge Cases Properly
```python
# Wrong: Doesn't handle single element at boundaries
def singleNonDuplicate(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = (left + right) // 2
        if nums[mid] == nums[mid + 1]:  # IndexError if mid is last element!
            left = mid + 2
    return nums[left]

# Correct: Proper boundary handling
def singleNonDuplicate(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = (left + right) // 2
        # Ensure mid is even for consistent comparison
        if mid % 2 == 1:
            mid -= 1
        if nums[mid] == nums[mid + 1]:
            left = mid + 2
        else:
            right = mid
    return nums[left]
```

### Mistake 2: Incorrect Binary Search Logic
```python
# Wrong: Doesn't account for index parity
def singleNonDuplicate(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = (left + right) // 2
        if nums[mid] == nums[mid + 1]:
            left = mid + 1  # Wrong! Doesn't skip the pair
        else:
            right = mid - 1  # Wrong! Might skip the answer
    return nums[left]

# Correct: Move by pairs based on parity
def singleNonDuplicate(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = (left + right) // 2
        if mid % 2 == 1:
            mid -= 1
        if nums[mid] == nums[mid + 1]:
            left = mid + 2  # Skip the complete pair
        else:
            right = mid  # Single could be at mid
    return nums[left]
```

### Mistake 3: Using Linear Solutions for O(log n) Problem
```python
# Wrong: O(n) solution when O(log n) is required
def singleNonDuplicate(nums):
    result = 0
    for num in nums:
        result ^= num
    return result  # Works but doesn't meet complexity requirement

# Correct: O(log n) binary search
def singleNonDuplicate(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = (left + right) // 2
        if nums[mid] == nums[mid ^ 1]:
            left = mid + 1
        else:
            right = mid
    return nums[left]
```

## Variations

| Variation | Difference | Complexity Impact |
|-----------|------------|-------------------|
| Unsorted Array | No order constraint | O(n) using XOR is optimal |
| K Duplicates | Each element appears k times except one | Modify XOR or use hash map |
| Two Single Elements | Two elements appear once | XOR gives XOR of both singles |
| Find All Singles | Multiple single elements | Must use hash map O(n) |

## Practice Checklist

Track your progress with spaced repetition:

- [ ] First attempt (understand even/odd pattern)
- [ ] Implement basic binary search solution
- [ ] Optimize with XOR trick for cleaner code
- [ ] Handle edge cases (array of size 1, single at start/end)
- [ ] After 1 day: Solve without hints
- [ ] After 1 week: Solve in under 15 minutes
- [ ] Before interview: Explain why O(log n) is achievable

**Strategy**: See [Binary Search Pattern](../strategies/patterns/binary-search.md)
