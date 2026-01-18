---
id: E210
old_id: A125
slug: find-k-closest-elements
title: Find K Closest Elements
difficulty: easy
category: easy
topics: ["array", "binary-search", "two-pointers", "sorting"]
patterns: ["binary-search", "sliding-window", "two-pointers"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["binary-search", "two-pointers", "sorting"]
related_problems: ["E658", "M274", "M911"]
strategy_ref: ../strategies/patterns/binary-search.md
---
# Find K Closest Elements

## Problem

You're given a sorted array of integers and need to find the k elements that are closest to a target value x. "Closest" means having the smallest absolute difference from x. For example, if x = 5 and you have elements [3, 4, 6, 7], then 4 and 6 are both distance 1 away (closest), while 3 and 7 are both distance 2 away.

There's an important tie-breaking rule: when two elements are equally close to x, the smaller element is considered closer. For instance, if x = 5 and you have [4, 6], both are distance 1 from x, but 4 wins the tie because it's smaller. This ensures a deterministic answer.

Your result must be returned in ascending order. Since the input array is already sorted, if you choose the right window of k consecutive (or nearly consecutive) elements, they'll naturally be in order. The challenge lies in efficiently finding which window of k elements minimizes the total distance to x.

Be aware that x might not even be in the array, and it could be smaller than all elements or larger than all elements - edge cases that require careful handling.

## Why This Matters

This problem is fundamental to recommendation systems, search engines, and machine learning applications. When Netflix recommends movies, it finds k items closest to your preferences. When autocomplete suggests search terms, it finds k strings closest to what you've typed. In time-series databases, you often query for k data points nearest to a timestamp. The problem teaches you to exploit sorted data structures for efficiency - a sorted array enables binary search to find the optimal starting position in O(log n) time rather than scanning linearly. It also demonstrates the sliding window pattern, where you shrink a window by comparing boundaries. Many engineers encounter this when implementing k-nearest neighbors (KNN) algorithms, finding similar documents, or selecting data points for visualization. Understanding multiple solution approaches (brute force sorting, two-pointer window shrinking, binary search optimization) builds your algorithmic toolkit.

## Examples

**Example 1:**
- Input: `arr = [1,2,3,4,5], k = 4, x = 3`
- Output: `[1,2,3,4]`

**Example 2:**
- Input: `arr = [1,2,3,4,5], k = 4, x = -1`
- Output: `[1,2,3,4]`

## Constraints

- 1 <= k <= arr.length
- 1 <= arr.length <= 10⁴
- arr is sorted in **ascending** order.
- -10⁴ <= arr[i], x <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Sort by Distance (Brute Force)
Create pairs of (element, distance from x) for each element in the array. Sort these pairs by distance, with ties broken by element value. Take the first k elements from the sorted list, then sort them again to return in ascending order. What's the time complexity of this approach? Is it optimal?

### Hint 2: Two-Pointer Window Shrinking
Since the array is already sorted and you need k consecutive or near-consecutive elements, use two pointers starting at the boundaries of a window of size k. You can find k closest elements by removing elements from either end based on which is farther from x. Start with a window larger than k (or the entire array) and shrink it by comparing distances at both ends.

### Hint 3: Binary Search for Starting Position (Optimal)
The k closest elements form a contiguous subarray of length k in the sorted array. Use binary search to find the optimal starting position of this k-length window. Compare arr[mid] and arr[mid+k] to decide which direction to search. This finds the window start in O(log n) time, then extract k elements in O(k).

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Sort by Distance | O(n log n) | O(n) | Create pairs, sort, extract |
| Two-Pointer Shrinking | O(n) | O(1) | Shrink window from both ends |
| Binary Search + Extract | O(log(n-k) + k) | O(1) | Optimal, find start position |
| Heap (Min/Max) | O(n log k) | O(k) | Works but not optimal for sorted input |

## Common Mistakes

### Mistake 1: Incorrect distance comparison with ties
```
// Wrong: Not handling ties correctly
if (abs(arr[left] - x) < abs(arr[right] - x)) {
    right--;  // Closer from left
} else {
    left++;   // This is wrong when distances are equal!
}
```
**Why it's wrong**: When distances are equal (|arr[left] - x| == |arr[right] - x|), you should keep the smaller element (left), not the larger one.

**Correct approach**: Use `<=` comparison: `if (abs(arr[left] - x) <= abs(arr[right] - x)) right--;`

### Mistake 2: Binary search boundary errors
```
// Wrong: Incorrect binary search range
int left = 0, right = arr.length - 1;  // Should be arr.length - k
while (left < right) {
    int mid = (left + right) / 2;
    // Compare arr[mid] with x and arr[mid+k] might go out of bounds!
}
```
**Why it's wrong**: Need to compare arr[mid] with arr[mid+k], so right should be initialized to arr.length - k to prevent index out of bounds.

**Correct approach**: Initialize right = arr.length - k for the binary search range.

### Mistake 3: Forgetting to sort final result
```
// Wrong: Returning elements in wrong order
List<Integer> result = new ArrayList<>();
for (int i = start; i < start + k; i++) {
    result.add(arr[i]);
}
return result;  // Already sorted if done correctly!
```
**Why it's wrong**: This is actually correct - if you find the right window in a sorted array, elements are already in ascending order. The mistake is adding an unnecessary sort step.

**Correct approach**: Extract k elements starting from found position; they're already sorted.

## Variations

| Variation | Difference | Difficulty Increase |
|-----------|------------|---------------------|
| K closest in unsorted array | Array not sorted | Medium (requires sorting first) |
| K closest with duplicates | Handle duplicate values specially | None (same algorithm) |
| K farthest elements | Find k farthest instead of closest | None (reverse comparison logic) |
| K closest in 2D space | Points in 2D, Euclidean distance | Medium (different distance metric) |
| K closest with streaming data | Elements arrive one at a time | Hard (requires heap/sliding window) |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solve using sorting approach
- [ ] Implement two-pointer window shrinking
- [ ] Master binary search for start position
- [ ] Handle edge cases (x before/after array, k=1, k=n)
- [ ] Implement without bugs on first try
- [ ] Explain why result is already sorted
- [ ] Test with x not in array, x at boundaries
- [ ] Solve in under 15 minutes
- [ ] Compare all three approaches
- [ ] Revisit after 3 days (spaced repetition)
- [ ] Revisit after 1 week (spaced repetition)
- [ ] Solve K closest in 2D space variation

**Strategy**: See [Binary Search Pattern](../strategies/patterns/binary-search.md)
