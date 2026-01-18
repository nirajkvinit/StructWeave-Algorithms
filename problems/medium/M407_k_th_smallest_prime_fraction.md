---
id: M407
old_id: A253
slug: k-th-smallest-prime-fraction
title: K-th Smallest Prime Fraction
difficulty: medium
category: medium
topics: ["array", "sorting"]
patterns: []
estimated_time_minutes: 30
---
# K-th Smallest Prime Fraction

## Problem

You're given a sorted array `arr` that starts with 1 followed by prime numbers, all in strictly increasing order. Your task is to find the kth smallest fraction among all possible fractions formed by dividing elements in the array.

More specifically, consider all fractions `arr[i] / arr[j]` where `i < j` (the numerator comes from an earlier position than the denominator). For example, with `arr = [1,2,3,5]`, you can form fractions like `1/2`, `1/3`, `1/5`, `2/3`, `2/5`, and `3/5`.

The total number of such fractions is `n*(n-1)/2` where n is the array length. These fractions form an interesting structure: for each denominator `arr[j]`, the fractions with that denominator (`arr[0]/arr[j]`, `arr[1]/arr[j]`, ..., `arr[j-1]/arr[j]`) are automatically in increasing order because the array is sorted.

This sorted structure is key to solving the problem efficiently. Rather than generating all O(n²) fractions and sorting them, you can treat this like merging k sorted lists, where each denominator defines one sorted list of fractions.

Given an integer `k`, return the kth smallest fraction as a two-element array `[numerator, denominator]`.

## Why This Matters

This problem combines multiple algorithmic concepts: heap operations for merging sorted sequences, binary search on values (rather than indices), and the observation that seemingly unordered data often has hidden structure.

The "merge k sorted lists" pattern appears frequently in real systems - merging sorted log files, combining sorted database query results, or processing time-series data from multiple sources. Understanding how to efficiently find the kth element without materializing all elements is crucial for systems with memory constraints.

The binary search variation (searching on fraction values) demonstrates an important technique: when you need the kth element and can efficiently count how many elements are less than a threshold, binary search on the value space often outperforms heap-based approaches.

## Examples

**Example 1:**
- Input: `arr = [1,2,3,5], k = 3`
- Output: `[2,5]`
- Explanation: The fractions to be considered in sorted order are:
1/5, 1/3, 2/5, 1/2, 3/5, and 2/3.
The third fraction is 2/5.

**Example 2:**
- Input: `arr = [1,7], k = 1`
- Output: `[1,7]`

## Constraints

- 2 <= arr.length <= 1000
- 1 <= arr[i] <= 3 * 10⁴
- arr[0] == 1
- arr[i] is a **prime** number for i > 0.
- All the numbers of arr are **unique** and sorted in **strictly increasing** order.
- 1 <= k <= arr.length * (arr.length - 1) / 2

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The fractions form a sorted matrix pattern. For each denominator arr[j], the fractions arr[0]/arr[j], arr[1]/arr[j], ..., arr[j-1]/arr[j] are in increasing order. This is similar to merging k sorted lists. You can use a min heap to efficiently find the kth smallest.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a min heap initialized with the smallest fraction for each denominator (arr[0]/arr[j] for all j). Pop from heap k times. When you pop arr[i]/arr[j], push arr[i+1]/arr[j] if i+1 < j. This ensures you explore fractions in sorted order. Alternatively, use binary search on the fraction value: count how many fractions are less than a midpoint value.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Binary search approach is faster for large k: binary search on fraction value (0.0 to 1.0), and for each mid value, count fractions less than mid using two pointers. Adjust search range based on count. This gives O(n log(max_value)) time versus O(k log n) for heap. For small k, heap is simpler and sufficient.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Generate All + Sort | O(n² log n) | O(n²) | Generate all fractions, sort them |
| Min Heap | O(k log n) | O(n) | Pop k times from heap of size n |
| Optimal Binary Search | O(n log W) | O(1) | W is value range; count fractions < mid |

## Common Mistakes

1. **Generating all fractions (TLE for large n)**
   ```python
   # Wrong: O(n²) space and O(n² log n) time
   def kthSmallestPrimeFraction(arr, k):
       fractions = []
       for j in range(1, len(arr)):
           for i in range(j):
               fractions.append((arr[i] / arr[j], arr[i], arr[j]))
       fractions.sort()
       return [fractions[k-1][1], fractions[k-1][2]]

   # Correct: Use min heap for efficiency
   def kthSmallestPrimeFraction(arr, k):
       import heapq
       heap = [(arr[0] / arr[j], 0, j) for j in range(1, len(arr))]
       heapq.heapify(heap)

       for _ in range(k - 1):
           _, i, j = heapq.heappop(heap)
           if i + 1 < j:
               heapq.heappush(heap, (arr[i+1] / arr[j], i+1, j))

       _, i, j = heapq.heappop(heap)
       return [arr[i], arr[j]]
   ```

2. **Not maintaining indices in heap**
   ```python
   # Wrong: Only storing values, losing numerator/denominator
   heap = [arr[0] / arr[j] for j in range(1, len(arr))]
   # Can't retrieve arr[i] and arr[j] later

   # Correct: Store indices or values with fractions
   heap = [(arr[0] / arr[j], 0, j) for j in range(1, len(arr))]
   # Can retrieve arr[i] and arr[j] from indices
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Kth smallest element in sorted matrix | Medium | Same merge k sorted lists pattern |
| Find k pairs with smallest sums | Medium | Similar heap approach |
| Ugly number II | Medium | Generate sequence in sorted order |
| Kth smallest in multiplication table | Hard | Binary search on value |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Binary Search](../../strategies/patterns/binary-search.md)
