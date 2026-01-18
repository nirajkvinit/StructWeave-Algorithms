---
id: M085
old_id: I015
slug: kth-largest-element-in-an-array
title: Kth Largest Element in an Array
difficulty: medium
category: medium
topics: ["array", "heap", "sorting"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/data-structures/heaps.md
frequency: high
related_problems: ["M215", "M347", "M692"]
prerequisites: ["heap-data-structure", "quickselect", "sorting-algorithms"]
---
# Kth Largest Element in an Array

## Problem

Locate the element that would appear at the `kth` position when arranged from largest to smallest. The result should be based on sorted position rather than uniqueness of values, meaning duplicates count as separate positions. For example, in `[3,2,3,1,2,4,5,5,6]` with k=4, the 4th largest element is 4, not 3, because the sorted order is `[6,5,5,4,3,3,2,2,1]` and position 4 (1-indexed) contains 4. The challenge asks if you can solve it without fully sorting the array, which would take O(n log n) time. Can you find just the kth largest element more efficiently? This is a selection problem, not a sorting problem, and exploiting that distinction is key. Edge cases include arrays where k equals the array length (finding the minimum), k equals 1 (finding the maximum), arrays with all identical elements, and arrays with negative numbers mixed with positive numbers.

## Why This Matters

Finding the kth largest element is fundamental in statistics and data analysis, where it helps compute percentiles, quartiles, and median values without sorting entire datasets. In large-scale data processing, computing the 95th percentile response time for millions of web requests becomes tractable when you can avoid full sorting. Database query optimizers use selection algorithms to find median values for splitting data in B-trees and determining join strategies. Real-time monitoring systems identify top-k metrics (like highest CPU usage processes) efficiently by maintaining heaps rather than sorting. Recommendation systems rank items and select top k results without sorting millions of candidates. In competitive programming and interviews, this problem tests your knowledge of multiple algorithmic techniques: heaps for O(n log k) solutions, and QuickSelect for O(n) average-case performance. Learning when to use each approach based on k's size relative to n is a valuable optimization skill applicable to many selection and ranking problems.

## Examples

**Example 1:**
- Input: `nums = [3,2,1,5,6,4], k = 2`
- Output: `5`

**Example 2:**
- Input: `nums = [3,2,3,1,2,4,5,5,6], k = 4`
- Output: `4`

## Constraints

- 1 <= k <= nums.length <= 10⁵
- -10⁴ <= nums[i] <= 10⁴

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Multiple Valid Approaches</summary>

Consider these approaches with different tradeoffs:
1. **Sorting**: Simple but O(n log n)
2. **Min-Heap of size k**: Maintain k largest elements, top is kth largest
3. **Max-Heap**: Build heap and extract k times
4. **QuickSelect**: Average O(n), partitioning algorithm similar to quicksort

Each has different time/space characteristics and use cases.

</details>

<details>
<summary>🎯 Hint 2: Min-Heap Strategy (Recommended for Interviews)</summary>

Maintain a min-heap of size k containing the k largest elements seen so far:
- If heap size < k, add element
- If heap size == k and element > heap.min, remove min and add element
- After processing all elements, heap.min is the kth largest

This works because we're keeping exactly k largest elements, and the smallest of those k is the kth largest overall.

</details>

<details>
<summary>📝 Hint 3: QuickSelect Algorithm (Optimal)</summary>

QuickSelect (Hoare's selection algorithm):
```
1. Choose pivot (random or median-of-three)
2. Partition array around pivot
3. If pivot is at position n-k (kth largest index):
   return pivot value
4. If pivot position > n-k:
   recursively search left partition
5. Else:
   recursively search right partition
```

Time: O(n) average, O(n²) worst case
Space: O(1) iterative, O(log n) recursive

Note: Convert "kth largest" to "n-k+1 smallest" for easier indexing.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Full Sort | O(n log n) | O(1) or O(n) | Simple, reliable, good for small arrays or when sorting is needed anyway |
| Min-Heap (size k) | O(n log k) | O(k) | Great when k is small, easy to implement correctly |
| Max-Heap (all elements) | O(n + k log n) | O(n) | Build heap O(n), extract k times. Good when k is large |
| **QuickSelect** | **O(n) avg, O(n²) worst** | **O(1) iterative** | Optimal average case, can randomize pivot for better worst case |
| QuickSelect with median-of-medians | O(n) guaranteed | O(log n) | Theoretical O(n) worst case, complex implementation |

## Common Mistakes

**Mistake 1: Using max-heap when min-heap is more efficient**

```python
# Wrong - Less efficient for finding kth largest
import heapq
def findKthLargest(nums, k):
    # Build max heap of all elements, extract k times
    heap = [-num for num in nums]  # Negate for max heap
    heapq.heapify(heap)
    for _ in range(k - 1):
        heapq.heappop(heap)
    return -heapq.heappop(heap)
```

```python
# Correct - More efficient with min-heap of size k
import heapq
def findKthLargest(nums, k):
    # Maintain min-heap of k largest elements
    heap = []
    for num in nums:
        heapq.heappush(heap, num)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]  # Smallest of k largest
```

**Mistake 2: Confusing kth largest with kth smallest in QuickSelect**

```python
# Wrong - Finding kth smallest instead of kth largest
def findKthLargest(nums, k):
    def quickselect(left, right, k):
        # Partitioning logic...
        if pivot_idx == k:  # Wrong! This finds kth smallest
            return nums[pivot_idx]
```

```python
# Correct - Convert to (n-k)th smallest = kth largest
def findKthLargest(nums, k):
    n = len(nums)
    target_idx = n - k  # kth largest is at index n-k when sorted

    def quickselect(left, right):
        pivot_idx = partition(left, right)
        if pivot_idx == target_idx:
            return nums[pivot_idx]
        elif pivot_idx < target_idx:
            return quickselect(pivot_idx + 1, right)
        else:
            return quickselect(left, pivot_idx - 1)

    return quickselect(0, n - 1)
```

**Mistake 3: Poor pivot choice in QuickSelect**

```python
# Wrong - Always choosing first element as pivot (bad for sorted arrays)
def partition(left, right):
    pivot = nums[left]  # Worst case O(n²) for sorted input
    # ... partitioning logic
```

```python
# Correct - Randomize pivot or use median-of-three
import random

def partition(left, right):
    # Random pivot
    pivot_idx = random.randint(left, right)
    nums[pivot_idx], nums[right] = nums[right], nums[pivot_idx]
    pivot = nums[right]

    # Or median-of-three
    # mid = (left + right) // 2
    # median_idx = sorted([(nums[left], left), (nums[mid], mid), (nums[right], right)])[1][1]
    # pivot = nums[median_idx]
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Kth Smallest Element | Easy | Same algorithm, just find kth smallest instead |
| Top K Frequent Elements | Medium | Find k most frequent elements using heap |
| Kth Largest in Stream | Easy | Maintain kth largest as elements arrive |
| Find Median from Data Stream | Hard | Maintain median using two heaps |
| Wiggle Sort II | Medium | Use kth largest to partition for wiggle sorting |

## Practice Checklist

- [ ] Day 1: Solve using min-heap approach (size k)
- [ ] Day 2: Solve using QuickSelect with random pivot
- [ ] Day 7: Re-solve from scratch, can you recall both approaches?
- [ ] Day 14: Implement median-of-three pivot selection for QuickSelect
- [ ] Day 30: Explain when to use heap vs QuickSelect vs sorting

**Strategy**: See [Array Pattern](../strategies/data-structures/heaps.md)
