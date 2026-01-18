---
id: M503
old_id: A379
slug: sort-an-array
title: Sort an Array
difficulty: medium
category: medium
topics: ["array", "sorting"]
patterns: []
estimated_time_minutes: 30
---
# Sort an Array

## Problem

You're given an integer array `nums` that needs to be sorted in ascending order. While this sounds straightforward, there's an important constraint: you must implement the sorting algorithm yourself without using built-in library functions.

Your solution needs to meet these requirements:
- Arrange the array in ascending order
- Achieve `O(n log n)` time complexity
- Use minimal additional space
- Handle duplicate values correctly
- Work efficiently even with large arrays (up to 50,000 elements)

This is your opportunity to implement a fundamental algorithm from scratch, demonstrating your understanding of how sorting actually works under the hood.

For example:
- `[5, 2, 3, 1]` should become `[1, 2, 3, 5]`
- `[5, 1, 1, 2, 0, 0]` should become `[0, 0, 1, 1, 2, 5]`

## Why This Matters

Understanding sorting algorithms is fundamental to computer science and appears everywhere in real-world systems. Database query optimizers choose between different sorting strategies based on data size and memory constraints. File systems sort directory listings for fast binary search lookups. Graphics engines sort objects by depth for efficient rendering. When you understand the tradeoffs between merge sort (predictable O(n log n) but uses extra space), heap sort (in-place but with worse cache performance), and quick sort (fast average case but unpredictable worst case), you can make informed decisions when performance matters. This knowledge also helps you recognize when a library's built-in sort is the right choice versus when you need a custom solution.

## Examples

**Example 1:**
- Input: `nums = [5,2,3,1]`
- Output: `[1,2,3,5]`
- Explanation: After ordering, some elements (like 2 and 3) retain relative positions, while others (like 1 and 5) move.

**Example 2:**
- Input: `nums = [5,1,1,2,0,0]`
- Output: `[0,0,1,1,2,5]`
- Explanation: The array contains duplicate values.

## Constraints

- 1 <= nums.length <= 5 * 10⁴
- -5 * 10⁴ <= nums[i] <= 5 * 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Classic sorting algorithms that achieve O(n log n) include merge sort, heap sort, and quick sort (average case). Given the constraint to minimize space, merge sort or heap sort are more reliable than quick sort which has O(n²) worst case.
</details>

<details>
<summary>🎯 Main Approach</summary>
Implement merge sort: recursively divide the array into halves until single elements, then merge sorted halves back together. The merge step compares elements from two sorted arrays and combines them in sorted order. This guarantees O(n log n) time complexity.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
For space optimization, consider in-place heap sort which achieves O(1) extra space. Build a max heap, then repeatedly extract the maximum and place it at the end of the array. However, merge sort is often easier to implement correctly.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Bubble Sort | O(n²) | O(1) | Too slow for this problem |
| Merge Sort | O(n log n) | O(n) | Reliable, predictable performance |
| Heap Sort | O(n log n) | O(1) | In-place, good space complexity |
| Quick Sort | O(n log n) avg, O(n²) worst | O(log n) | Can be optimized but unpredictable |

## Common Mistakes

1. **Incorrect merge logic in merge sort**
   ```python
   # Wrong: Not handling when one array is exhausted
   while i < len(left) and j < len(right):
       if left[i] <= right[j]:
           result.append(left[i])
           i += 1
   # Missing: append remaining elements!

   # Correct: Append remaining elements
   while i < len(left) and j < len(right):
       if left[i] <= right[j]:
           result.append(left[i])
           i += 1
       else:
           result.append(right[j])
           j += 1
   result.extend(left[i:])
   result.extend(right[j:])
   ```

2. **Using built-in sort functions**
   ```python
   # Wrong: Problem explicitly forbids this
   return sorted(nums)
   # or
   nums.sort()
   return nums

   # Correct: Implement your own sorting algorithm
   def mergeSort(nums):
       # implementation
   ```

3. **Poor pivot selection in quick sort**
   ```python
   # Wrong: Always choosing first element (worst case on sorted data)
   pivot = nums[0]

   # Correct: Use random pivot or median-of-three
   import random
   pivot_idx = random.randint(0, len(nums) - 1)
   pivot = nums[pivot_idx]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Kth Largest Element | Medium | Only need partial sorting (quick select) |
| Sort Colors | Medium | Counting sort / three-way partitioning |
| Merge Sorted Array | Easy | Merge step of merge sort |
| Sort List | Medium | Merge sort on linked list |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Sorting Algorithms](../../strategies/fundamentals/sorting.md)
