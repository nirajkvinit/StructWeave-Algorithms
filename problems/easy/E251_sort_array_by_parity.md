---
id: E251
old_id: A372
slug: sort-array-by-parity
title: Sort Array By Parity
difficulty: easy
category: easy
topics: ["array", "two-pointers"]
patterns: ["two-pointers", "partition"]
estimated_time_minutes: 15
frequency: medium
related_problems:
  - E026_remove_duplicates_from_sorted_array.md
  - E027_remove_element.md
  - E254_sort_array_by_parity_ii.md
prerequisites:
  - "Two pointer technique"
  - "Array partitioning"
  - "In-place algorithms"
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Sort Array By Parity

## Problem

You're given an integer array `nums` that contains a mix of even and odd numbers. Your task is to reorganize the array so that all even numbers appear before all odd numbers, while the relative order within each group doesn't matter. For example, if you have [3, 1, 2, 4], valid outputs include [2, 4, 3, 1], [4, 2, 1, 3], or any other arrangement where the even numbers (2 and 4) come before the odd numbers (3 and 1). A number is considered even when it's divisible by 2 (meaning `num % 2 == 0`), and odd otherwise. Return any valid arrangement that meets this requirement. The key insight here is that the problem doesn't require sorting within the even or odd groups, just separating them, which opens up opportunities for efficient in-place solutions.

## Why This Matters

Array partitioning is a foundational skill that appears throughout computer science, from QuickSort's partition step to database query optimization. This problem teaches the two-pointer technique in its purest form, where you maintain invariants while rearranging data. The pattern you learn here directly translates to problems involving separating elements by any binary condition: negative vs. positive numbers, values below vs. above a threshold, or characters matching vs. not matching a pattern. In interviews, this question frequently serves as a warm-up to assess your understanding of in-place algorithms and space complexity trade-offs. Beyond interviews, partitioning algorithms are critical in systems programming for memory management, in data processing pipelines for filtering, and in algorithm design for divide-and-conquer strategies. Mastering this simple problem provides the foundation for understanding more complex partitioning schemes like three-way partitioning and Dutch National Flag algorithms.

## Examples

**Example 1:**
- Input: `nums = [3,1,2,4]`
- Output: `[2,4,3,1]`
- Explanation: Alternative valid outputs include [4,2,3,1], [2,4,1,3], and [4,2,1,3].

**Example 2:**
- Input: `nums = [0]`
- Output: `[0]`

## Constraints

- 1 <= nums.length <= 5000
- 0 <= nums[i] <= 5000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Problem Understanding
This is a partitioning problem similar to QuickSort's partition step. You need to rearrange elements so that all elements satisfying one condition (even) come before elements satisfying another condition (odd).

Can you solve this without using extra space? What about in a single pass?

### Tier 2 Hint - Solution Strategy
Use the two-pointer technique:
- One pointer starts at the beginning (left)
- Another pointer starts at the end (right)
- Swap elements when left pointer finds odd and right pointer finds even
- Move pointers towards each other

Alternatively, maintain a write pointer for the next even number position and swap as you scan.

### Tier 3 Hint - Implementation Details
Two-pointer approach:
1. Initialize `left = 0`, `right = len(nums) - 1`
2. While `left < right`:
   - If `nums[left]` is even, increment `left`
   - Else if `nums[right]` is odd, decrement `right`
   - Else swap `nums[left]` and `nums[right]`, then increment `left` and decrement `right`

Alternative single-pass approach: maintain a pointer for the next even position, swap when you find an even number.

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Two pointers | O(n) | O(1) | Optimal in-place solution |
| Extra array | O(n) | O(n) | Simpler but uses extra space |
| Built-in sort with key | O(n log n) | O(1) or O(n) | Slower but concise |
| Single write pointer | O(n) | O(1) | Clean alternative to two pointers |

## Common Mistakes

### Mistake 1: Creating new array when in-place is possible
```python
# Suboptimal: Uses extra space
evens = [x for x in nums if x % 2 == 0]
odds = [x for x in nums if x % 2 == 1]
return evens + odds
```
**Why it's suboptimal**: While correct, this uses O(n) extra space. The two-pointer approach solves it in-place with O(1) space.

### Mistake 2: Incorrect pointer movement
```python
# Wrong: Always moving both pointers
left, right = 0, len(nums) - 1
while left < right:
    if nums[left] % 2 == 1 and nums[right] % 2 == 0:
        nums[left], nums[right] = nums[right], nums[left]
    left += 1  # Wrong: should only move after conditions checked
    right -= 1
```
**Why it's wrong**: Pointers should only move when appropriate. Move left when it points to even, move right when it points to odd.

### Mistake 3: Off-by-one in loop condition
```python
# Wrong: Missing last element comparison
left, right = 0, len(nums) - 1
while left <= right:  # Should be left < right
    # ... swap logic
```
**Why it's wrong**: When `left == right`, both point to same element - no need to swap with itself. Use `left < right`.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Sort by parity II | Easy | Even numbers at even indices, odd at odd indices (see E254) |
| Three-way partition | Medium | Partition into divisible by 3, remainder 1, remainder 2 |
| Stable partitioning | Medium | Maintain relative order within even and odd groups |
| K-way partition | Medium | Partition by modulo k |
| Minimize swaps | Medium | Find minimum swaps needed to achieve parity partition |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Reviewed solution and understood all approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 3 days
- [ ] Practiced again after 1 week
- [ ] Can explain the solution clearly to others
- [ ] Solved all variations above

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
