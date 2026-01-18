---
id: E263
old_id: A444
slug: squares-of-a-sorted-array
title: Squares of a Sorted Array
difficulty: easy
category: easy
topics: ["array", "two-pointers", "sorting"]
patterns: ["two-pointers"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E088", "E977", "M015"]
prerequisites: ["arrays", "two-pointers", "sorting"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Squares of a Sorted Array

## Problem

You have an array of integers `nums` sorted in non-decreasing order (meaning each element is greater than or equal to the previous one). Your task is to create a new array where each element is the square of the corresponding element from the original array, and this new array must also be sorted in non-decreasing order.

The challenge here is that squaring can disrupt the sorted order. For example, squaring `-4` gives 16, while squaring `-1` gives 1 - the negative number with larger absolute value produces a larger square. This means that in an array like `[-4, -1, 0, 3, 10]`, the squared values `[16, 1, 0, 9, 100]` are not in sorted order.

A naive approach would be to square all elements and then sort the result, which takes O(n log n) time. However, you can exploit the sorted nature of the input to achieve a linear O(n) solution using two pointers. The key insight is that the largest squared values must come from either end of the original array (the most negative number or the largest positive number), never from the middle.

## Why This Matters

This problem teaches the two-pointer technique, one of the most frequently used patterns in array manipulation and algorithm optimization. Two pointers appear in merge operations, partition algorithms (like quicksort), sliding windows, palindrome checking, and container-with-most-water type problems. The specific insight here - that extremes in a sorted array produce extremes in the transformed output - is a pattern you'll see in merge sort, finding pairs with target sums, and three-sum problems. Understanding how to build results from either end rather than from the beginning is crucial for optimizing many array algorithms. This technique is especially valuable in interview settings where interviewers often look for the optimal O(n) solution rather than accepting the easier O(n log n) sort-based approach.

## Examples

**Example 1:**
- Input: `nums = [-4,-1,0,3,10]`
- Output: `[0,1,9,16,100]`
- Explanation: Squaring each element yields [16,1,0,9,100]. Sorting these squared values produces [0,1,9,16,100].

**Example 2:**
- Input: `nums = [-7,-3,2,3,11]`
- Output: `[4,9,9,49,121]`

## Constraints

- 1 <= nums.length <= 10⁴
- -10⁴ <= nums[i] <= 10⁴
- nums is sorted in **non-decreasing** order.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Conceptual Foundation
- Squaring can change the order (negative numbers become positive)
- The largest absolute values are at the edges of the sorted array
- The smallest absolute values are near zero (middle of array)
- Two pointers from both ends can efficiently merge squares in reverse order

### Tier 2: Step-by-Step Strategy
- Use two pointers: left at start (0), right at end (n-1)
- Build result array from right to left (largest to smallest)
- At each step, compare absolute values of nums[left] and nums[right]
- Square the larger absolute value and place it at current result position
- Move the pointer that was used (left++ or right--)
- Continue until pointers meet

### Tier 3: Implementation Details
- Initialize `result = [0] * len(nums)`
- Initialize `left = 0`, `right = len(nums) - 1`, `pos = len(nums) - 1`
- While `left <= right`:
  - Compare `abs(nums[left])` vs `abs(nums[right])`
  - If `abs(nums[left]) > abs(nums[right])`:
    - `result[pos] = nums[left] * nums[left]`
    - `left += 1`
  - Else:
    - `result[pos] = nums[right] * nums[right]`
    - `right -= 1`
  - `pos -= 1`
- Return result

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Two Pointers (Optimal) | O(n) | O(n) | Single pass, result array required |
| Square Then Sort | O(n log n) | O(n) | Simple but slower due to sorting |
| Find Zero, Merge Outward | O(n) | O(n) | Find partition point, merge like merge sort |

**Optimal Solution**: Two pointers achieves O(n) time with O(n) space for result.

## Common Mistakes

### Mistake 1: Building result from left instead of right
```python
# Wrong: trying to place smallest first (complex)
# Need to find where negatives end, merge two sorted lists
left, right = 0, len(nums) - 1
pos = 0  # Starting from left makes logic complicated

# Correct: build from right (largest first)
left, right = 0, len(nums) - 1
pos = len(nums) - 1  # Start from end, place largest values
while left <= right:
    # Compare and place larger square at result[pos]
    pos -= 1
```

### Mistake 2: Not using absolute values for comparison
```python
# Wrong: comparing signed values
if nums[left] > nums[right]:  # -10 is NOT > 5!
    result[pos] = nums[left] ** 2

# Correct: compare absolute values
if abs(nums[left]) > abs(nums[right]):
    result[pos] = nums[left] ** 2
```

### Mistake 3: Off-by-one in loop condition
```python
# Wrong: missing last element
while left < right:  # Misses one element when left == right
    # ...

# Correct: process all elements
while left <= right:  # Includes element when pointers meet
    # ...
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Return indices of original array in sorted square order | Medium | Track original indices during sorting |
| K smallest/largest squared values | Medium | Use heap or quickselect |
| Cubes of sorted array | Easy | Same logic, different operation |
| In-place with O(1) extra space | Hard | Requires rotation or complex rearrangement |
| Count squares in given range | Medium | Two pointers with range checking |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solved independently on first attempt
- [ ] Completed within 15 minutes
- [ ] Used two-pointer O(n) approach (not sort)
- [ ] Built result array from right to left
- [ ] Used absolute value comparison correctly
- [ ] Wrote bug-free code on first submission
- [ ] Explained solution clearly to someone else
- [ ] Solved without hints after 1 day
- [ ] Solved without hints after 1 week
- [ ] Identified time and space complexity correctly

**Spaced Repetition Schedule**: Review on Day 1, Day 3, Day 7, Day 14, Day 30

**Strategy**: See [Two Pointers](../strategies/patterns/two-pointers.md)
