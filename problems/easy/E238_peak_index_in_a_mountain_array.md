---
id: E238
old_id: A319
slug: peak-index-in-a-mountain-array
title: Peak Index in a Mountain Array
difficulty: easy
category: easy
topics: ["array", "binary-search"]
patterns: ["binary-search", "modified-binary-search"]
estimated_time_minutes: 15
frequency: high
prerequisites: ["binary-search-basics", "array-traversal"]
related_problems: ["M045", "M082", "H004"]
strategy_ref: ../strategies/patterns/binary-search.md
---
# Peak Index in a Mountain Array

## Problem

A mountain array has a very specific structure that resembles the shape of a mountain when you plot its values. Starting from the left, the values increase strictly (each element is larger than the previous one) until they reach a single peak, and then they decrease strictly (each element is smaller than the previous one) all the way to the right end.

More formally, a mountain array must satisfy these conditions: it contains at least 3 elements, there exists a peak index `i` (where `0 < i < arr.length - 1`), and the elements are strictly ascending before the peak (`arr[0] < arr[1] < ... < arr[i - 1] < arr[i]`) and strictly descending after the peak (`arr[i] > arr[i + 1] > ... > arr[arr.length - 1]`). Notice the inequalities are strict, meaning there are no plateaus or repeated values allowed.

You're guaranteed that the input array is a valid mountain, so you don't need to validate it. Your task is to find and return the index of the peak element. While you could simply scan through the array from left to right and return the first position where a value is greater than its next neighbor, your solution must run in O(log n) time, which requires a more sophisticated approach.

The O(log n) time requirement is a strong hint that you should use binary search. However, this isn't the traditional binary search where you're looking for a target value. Instead, you need to adapt binary search to find the peak by comparing each middle element with its neighbors to determine which direction the peak lies in.

Think about what information you gain when you compare `arr[mid]` with `arr[mid + 1]`. If `arr[mid] < arr[mid + 1]`, you know you're still on the ascending slope, so the peak must be to the right. Conversely, if `arr[mid] > arr[mid + 1]`, you're either at the peak or on the descending slope, meaning the peak is at `mid` or to the left. This neighbor comparison gives you the decision rule you need to eliminate half the search space in each iteration.

## Why This Matters

Peak-finding is a fundamental algorithmic pattern that extends far beyond simple arrays. This problem teaches you how to apply binary search in non-traditional contexts where you're not searching for a specific target value but rather for an element with certain properties relative to its neighbors.

In signal processing and data analysis, peak detection identifies local maxima in time-series data, which is crucial for tasks like heartbeat detection in ECG signals, identifying prominent features in spectroscopy, and finding turning points in financial data. The O(log n) algorithm you develop here scales to analyzing massive datasets where linear scans would be too slow.

The modified binary search technique applies to a whole class of optimization problems. Finding a local maximum in a unimodal function, determining the rotation point in a rotated sorted array, and locating inflection points in mathematical functions all use similar reasoning. The key insight is that you can use binary search whenever you can make a binary decision at each step that eliminates part of the search space.

From a software engineering perspective, this problem illustrates an important principle: when you have structure or invariants in your data (like the mountain property), you can leverage them for better algorithms. A general "find maximum" problem requires O(n) time, but the mountain structure enables O(log n). Recognizing and exploiting data structure properties is a valuable skill for performance optimization.

This problem is particularly popular in technical interviews because it tests your understanding of binary search fundamentals while requiring you to adapt the pattern creatively. It also assesses your ability to handle edge cases (what about the boundaries?) and maintain loop invariants (how do you ensure the peak stays in the search range?).

## Examples

**Example 1:**
- Input: `arr = [0,1,0]`
- Output: `1`

**Example 2:**
- Input: `arr = [0,2,1,0]`
- Output: `1`

**Example 3:**
- Input: `arr = [0,10,5,2]`
- Output: `1`

## Constraints

- 3 <= arr.length <= 10⁵
- 0 <= arr[i] <= 10⁶
- arr is **guaranteed** to be a mountain array.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1 - Conceptual Foundation
In a traditional binary search, we compare the middle element with a target. Here, there's no target value. Instead, think about what property the peak element satisfies relative to its neighbors. How can you use the comparison between arr[mid] and arr[mid+1] to decide which half contains the peak?

### Hint 2 - Decision Making
When you're at index `mid`, compare arr[mid] with arr[mid+1]. If arr[mid] < arr[mid+1], you're on the ascending slope - where should you search? If arr[mid] > arr[mid+1], you're on the descending slope or at the peak - where should you search?

### Hint 3 - Implementation Strategy
Initialize left = 0 and right = arr.length - 1. While left < right, calculate mid and compare arr[mid] with arr[mid+1]. If ascending (arr[mid] < arr[mid+1]), set left = mid + 1. If descending (arr[mid] > arr[mid+1]), set right = mid. The loop terminates when left == right, which is your peak index.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Linear Scan | O(n) | O(1) | Iterate until arr[i] > arr[i+1] |
| Binary Search | O(log n) | O(1) | Divide search space in half each iteration |
| Ternary Search | O(log n) | O(1) | Alternative approach, slightly slower constant factor |

## Common Mistakes

### Mistake 1: Comparing with Target Instead of Neighbors
```python
# INCORRECT: Looking for a specific value
def find_peak(arr):
    left, right = 0, len(arr) - 1
    target = max(arr)  # This defeats the purpose - O(n) operation!
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
```
**Why it's wrong:** Finding max(arr) requires O(n) time, defeating the O(log n) requirement. Binary search should work without knowing the peak value.

**Correct approach:**
```python
# CORRECT: Compare neighbors to determine direction
def find_peak(arr):
    left, right = 0, len(arr) - 1
    while left < right:
        mid = (left + right) // 2
        if arr[mid] < arr[mid + 1]:  # Ascending slope
            left = mid + 1
        else:  # Descending slope or peak
            right = mid
    return left
```

### Mistake 2: Wrong Loop Condition and Updates
```python
# INCORRECT: Off-by-one errors and infinite loop potential
def find_peak(arr):
    left, right = 0, len(arr) - 1
    while left <= right:  # Wrong: should be left < right
        mid = (left + right) // 2
        if arr[mid] < arr[mid + 1]:
            left = mid  # Wrong: should be mid + 1, causes infinite loop
        else:
            right = mid - 1  # Wrong: might skip the peak
    return left
```
**Why it's wrong:** Using `left <= right` with `right = mid - 1` can skip the peak. Setting `left = mid` when ascending can cause infinite loops.

**Correct approach:**
```python
# CORRECT: Proper boundary management
def find_peak(arr):
    left, right = 0, len(arr) - 1
    while left < right:  # Correct: stops when converged
        mid = (left + right) // 2
        if arr[mid] < arr[mid + 1]:
            left = mid + 1  # Correct: mid can't be peak, move past it
        else:
            right = mid  # Correct: mid might be peak, keep it in range
    return left  # left == right at this point
```

### Mistake 3: Array Index Out of Bounds
```python
# INCORRECT: Accessing invalid index
def find_peak(arr):
    left, right = 0, len(arr) - 1
    while left < right:
        mid = (left + right) // 2
        if arr[mid] < arr[mid + 1]:  # Potential issue when mid = right - 1
            left = mid + 1
        elif arr[mid] > arr[mid - 1]:  # ERROR: mid might be 0
            right = mid - 1
```
**Why it's wrong:** When mid is at the boundaries, accessing mid-1 or mid+1 might go out of bounds.

## Problem Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Peak Element (Any Peak) | Medium | Find any peak in array (multiple peaks possible) |
| Peak Element 2D | Hard | Find peak in 2D matrix where peak > all 4 neighbors |
| Find in Mountain Array | Medium | Search for target value in mountain array |
| Longest Mountain Subarray | Medium | Find longest mountain subarray in given array |
| Minimum in Rotated Sorted Array | Medium | Similar binary search variant with different property |

## Practice Checklist

- [ ] First solve: Implement binary search solution correctly
- [ ] Handle edge cases: Smallest array (length 3), peak at various positions
- [ ] Optimize: Ensure O(log n) time without extra operations
- [ ] Review after 1 day: Can explain why the binary search works
- [ ] Review after 1 week: Implement from scratch without hints
- [ ] Interview ready: Extend to variations like 2D peak finding

## Strategy

**Pattern**: Modified Binary Search
- Learn to apply binary search beyond sorted arrays
- Master neighbor comparison for decision making
- Understand invariant maintenance in search space reduction

See [Binary Search Pattern](../strategies/patterns/binary-search.md) for the complete strategy guide.
