---
id: E220
old_id: A171
slug: binary-search
title: Binary Search
difficulty: easy
category: easy
topics: ["array", "binary-search"]
patterns: ["binary-search-pattern"]
estimated_time_minutes: 15
frequency: very-high
related_problems:
  - E278_first_bad_version
  - M034_find_first_and_last_position
  - M153_find_minimum_in_rotated_sorted_array
prerequisites:
  - Array indexing
  - Integer division
  - Loop invariants
strategy_ref: ../strategies/patterns/binary-search.md
---
# Binary Search

## Problem

Given a sorted array `nums` of integers in ascending order and a target value, implement a search algorithm that finds the target's position in the array. Return the index of the target if it exists, or `-1` if the target is not present.

Here's the critical constraint: your algorithm must run in **O(log n)** time complexity, where n is the array length. This means you cannot simply scan through every element. Instead, you need to leverage the sorted property to eliminate large portions of the search space with each comparison. Think of how you'd find a word in a dictionary: you don't start at page 1 and flip through every page; you open to the middle, see if your word comes before or after, and eliminate half the dictionary with that single check.

An important detail: all integers in the array are unique, so you don't need to worry about duplicate values. The array is guaranteed to be sorted in ascending order (smallest to largest). Edge cases to keep in mind include single-element arrays, targets at the boundaries (first or last position), and targets that fall between existing values (requiring a `-1` return).

The solution must achieve logarithmic time complexity `O(log n)`.

## Why This Matters

Binary search is one of the most fundamental algorithms in computer science, appearing everywhere from database index lookups to version control systems (git bisect for finding bugs) to machine learning (hyperparameter tuning). Modern systems rely on binary search variants for B-tree navigation in databases, IP routing tables in networks, and scheduling algorithms in operating systems.

The power of binary search lies in its dramatic efficiency gain: for a million-element array, a linear search needs up to 1,000,000 comparisons while binary search needs only about 20. This O(log n) vs O(n) difference becomes life-or-death at scale. Beyond the basic algorithm, the "binary search" technique generalizes to "search on answer space" problems where you binary search on potential solutions rather than array indices.

From an interview perspective, binary search is extremely high-frequency and tests your ability to handle loop invariants, off-by-one errors, and integer overflow issues. Many candidates fail not because they don't understand the concept, but because they get the boundary conditions wrong (`left <= right` vs `left < right`, `mid + 1` vs `mid`). Mastering this problem builds the foundation for dozens of harder variants like finding first/last occurrence, searching in rotated arrays, and finding square roots. It's the algorithm that keeps giving.

## Examples

**Example 1:**
- Input: `nums = [-1,0,3,5,9,12], target = 9`
- Output: `4`
- Explanation: 9 exists in nums and its index is 4

**Example 2:**
- Input: `nums = [-1,0,3,5,9,12], target = 2`
- Output: `-1`
- Explanation: 2 does not exist in nums so return -1

## Constraints

- 1 <= nums.length <= 10⁴
- -10⁴ < nums[i], target < 10⁴
- All the integers in nums are **unique**.
- nums is sorted in ascending order.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Initial Direction
Since the array is sorted, you don't need to check every element. How can you eliminate half of the remaining search space with each comparison? Think about how you search for a word in a dictionary.

### Tier 2 Hint - Key Insight
Use two pointers (left and right) to track the search boundaries. Calculate the middle index. If the middle element equals the target, return it. If the middle element is less than the target, the target must be in the right half. If greater, it must be in the left half. Repeat until found or search space is exhausted.

### Tier 3 Hint - Implementation Details
Initialize `left = 0, right = len(nums) - 1`. While `left <= right`, compute `mid = (left + right) // 2`. Compare `nums[mid]` with target. If equal, return mid. If `nums[mid] < target`, set `left = mid + 1`. If `nums[mid] > target`, set `right = mid - 1`. Return -1 if loop exits.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Binary search (iterative) | O(log n) | O(1) | Optimal solution |
| Binary search (recursive) | O(log n) | O(log n) | Call stack space |
| Linear search | O(n) | O(1) | Doesn't use sorted property |

**Optimization notes:**
- Use `mid = left + (right - left) // 2` to avoid integer overflow in some languages
- Iterative version preferred over recursive to save stack space
- Cannot improve beyond O(log n) time for search in sorted array

## Common Mistakes

### Mistake 1: Incorrect loop termination condition
```python
# Wrong - misses single-element case
while left < right:  # Should be <=
    mid = (left + right) // 2
    # ...

# Correct - inclusive condition
while left <= right:
    mid = (left + right) // 2
    # ...
```

### Mistake 2: Incorrect pointer updates
```python
# Wrong - infinite loop possible
if nums[mid] < target:
    left = mid  # Should be mid + 1
else:
    right = mid  # Should be mid - 1

# Correct - move past mid
if nums[mid] < target:
    left = mid + 1
else:
    right = mid - 1
```

### Mistake 3: Integer overflow in mid calculation
```python
# Wrong - can overflow in languages like Java/C++
mid = (left + right) // 2

# Correct - prevents overflow
mid = left + (right - left) // 2
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Find first occurrence | Easy | Find leftmost index if duplicates exist |
| Find last occurrence | Easy | Find rightmost index if duplicates exist |
| Search in rotated array | Medium | Array is sorted but rotated at unknown pivot |
| Find insertion position | Easy | Return index where target should be inserted |
| Find peak element | Medium | Find local maximum in array |
| Square root using BS | Medium | Find floor of sqrt(x) using binary search |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve independently without hints (30 min time limit)
- [ ] Implement iterative version
- [ ] Handle empty array and single element
- [ ] Test with target at boundaries and middle

**Spaced Repetition**
- [ ] Day 1: Solve again from scratch
- [ ] Day 3: Implement recursive version
- [ ] Week 1: Solve first/last occurrence variations
- [ ] Week 2: Explain loop invariant to someone

**Mastery Validation**
- [ ] Can explain why O(log n) is optimal
- [ ] Can prove correctness using loop invariants
- [ ] Solve in under 5 minutes
- [ ] Implement without referring to notes

**Strategy**: See [Binary Search Pattern](../strategies/patterns/binary-search.md)
