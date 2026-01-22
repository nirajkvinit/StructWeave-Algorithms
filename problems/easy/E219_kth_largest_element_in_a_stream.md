---
id: E219
old_id: A170
slug: kth-largest-element-in-a-stream
title: Kth Largest Element in a Stream
difficulty: easy
category: easy
topics: ["array", "heap", "sorting", "design"]
patterns: ["heap-pattern", "min-heap"]
estimated_time_minutes: 15
frequency: high
related_problems:
  - M215_kth_largest_element_in_array
  - M347_top_k_frequent_elements
  - H295_find_median_from_data_stream
prerequisites:
  - Heap/Priority queue operations
  - Binary heap properties
  - Time complexity analysis
strategy_ref: ../prerequisites/heaps.md
---
# Kth Largest Element in a Stream

## Problem

Design a data structure that efficiently maintains the `kth` largest element in a continuously growing stream of numbers. The term "kth largest" means the kth position when elements are sorted in descending order, where duplicates are counted separately. For example, in the sorted sequence `[10, 9, 8, 8, 5]`, the 3rd largest element is 8 (not 5).

You'll implement a `KthLargest` class with two components. The constructor `KthLargest(int k, int[] nums)` initializes the structure with a target rank `k` and an initial array of numbers. The method `int add(int val)` adds a new value to the stream and returns what the kth largest element is after this addition. Each call to `add` permanently includes the new value in your dataset.

The key challenge here is efficiency. With potentially 10,000 additions, you cannot afford to sort the entire collection each time. Consider that after each addition, you only care about the top k elements, not the entire sorted list. Also, an important edge case: the initial array might have fewer than k elements, but you're guaranteed that by the time you call `add`, there will be at least k total elements.

Implement the `KthLargest` class with these methods:

- `KthLargest(int k, int[] nums)` Constructor that accepts rank `k` and initial array `nums`
- `int add(int val)` Adds `val` to the collection and returns the current `kth` largest element

## Why This Matters

This problem is foundational for real-time systems that need to track ranking or percentile statistics on streaming data. Applications include monitoring server response times (tracking 95th percentile latency), financial trading systems (maintaining top-N stock prices for portfolio management), gaming leaderboards (keeping track of rank thresholds), and quality control systems (detecting when measurements fall below the kth best value).

The core algorithmic insight is using a **min-heap of size k** rather than a max-heap of all elements. This counterintuitive choice is brilliant: by keeping only the k largest elements in a min-heap, the root is exactly the kth largest element. When a new value arrives, if it's larger than the current kth largest (the min of your heap), you evict the minimum and insert the new value. This achieves O(log k) per insertion instead of O(n log n) with full sorting.

This problem appears frequently in technical interviews because it tests heap properties, demonstrates space-time tradeoffs (storing k elements vs all n), and requires understanding why min-heap works for "kth largest" (which trips up many candidates). It's a stepping stone to harder streaming problems like finding the median or tracking multiple percentiles simultaneously. The pattern of "maintain invariant with selective updates" generalizes to many system design scenarios.

## Examples

**Example 1:**
```
Input:
["KthLargest", "add", "add", "add", "add", "add"]
[[3, [4, 5, 8, 2]], [3], [5], [10], [9], [4]]

Output:
[null, 4, 5, 5, 8, 8]

Explanation:
KthLargest kthLargest = new KthLargest(3, [4, 5, 8, 2]);
kthLargest.add(3);   // return 4 (3rd largest in [2, 3, 4, 5, 8])
kthLargest.add(5);   // return 5 (3rd largest in [2, 3, 4, 5, 5, 8])
kthLargest.add(10);  // return 5 (3rd largest in [2, 3, 4, 5, 5, 8, 10])
kthLargest.add(9);   // return 8 (3rd largest in [2, 3, 4, 5, 5, 8, 9, 10])
kthLargest.add(4);   // return 8 (3rd largest in [2, 3, 4, 4, 5, 5, 8, 9, 10])
```

## Constraints

- 1 <= k <= 10⁴
- 0 <= nums.length <= 10⁴
- -10⁴ <= nums[i] <= 10⁴
- -10⁴ <= val <= 10⁴
- At most 10⁴ calls will be made to add.
- It is guaranteed that there will be at least k elements in the array when you search for the kth element.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Initial Direction
Instead of maintaining all elements and sorting repeatedly, what if you only kept track of the k largest elements? What data structure efficiently maintains the minimum of a collection and allows insertion?

### Tier 2 Hint - Key Insight
Use a min-heap of size k. The root of this min-heap will always be the kth largest element. When adding a new element, if it's larger than the heap's minimum (and heap size is k), remove the minimum and add the new element. This keeps exactly the k largest elements in the heap.

### Tier 3 Hint - Implementation Details
Use a priority queue (min-heap). In the constructor, add all initial elements to the heap, but keep only the k largest by removing the minimum whenever size exceeds k. For `add(val)`, if heap size < k, add directly. Otherwise, if val > heap.min(), remove min and add val. Return heap.min().

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Min-heap (optimal) | O(n log k) init, O(log k) add | O(k) | n is initial array size |
| Sorting on each add | O((n+m) log(n+m)) | O(n+m) | m is number of adds, very inefficient |
| Maintain sorted array | O(n log n) init, O(n) add | O(n+m) | Binary search + insert |
| Max-heap (all elements) | O(k log n) per add | O(n+m) | Extract k elements each time |

**Optimization notes:**
- Min-heap of size k is optimal for streaming scenario
- Only need to store k elements, not all n+m elements
- Each add operation is O(log k), independent of total elements

## Common Mistakes

### Mistake 1: Using max-heap instead of min-heap
```python
# Wrong - max-heap requires extracting k times
def add(self, val):
    heapq.heappush(self.max_heap, -val)  # Max-heap
    # Now need to extract k times to find kth largest - O(k log n)!

# Correct - min-heap of size k
def add(self, val):
    if len(self.min_heap) < self.k:
        heapq.heappush(self.min_heap, val)
    elif val > self.min_heap[0]:
        heapq.heapreplace(self.min_heap, val)
    return self.min_heap[0]
```

### Mistake 2: Not maintaining exactly k elements
```python
# Wrong - heap grows unbounded
def add(self, val):
    heapq.heappush(self.heap, val)
    # Heap size keeps growing!
    return heapq.nsmallest(self.k, self.heap)[-1]

# Correct - maintain size k
def add(self, val):
    heapq.heappush(self.heap, val)
    if len(self.heap) > self.k:
        heapq.heappop(self.heap)
    return self.heap[0]
```

### Mistake 3: Not handling initial array properly
```python
# Wrong - doesn't process initial array
def __init__(self, k, nums):
    self.k = k
    self.heap = []  # Ignoring nums!

# Correct - process initial array
def __init__(self, k, nums):
    self.k = k
    self.heap = nums[:k]
    heapq.heapify(self.heap)
    for num in nums[k:]:
        if num > self.heap[0]:
            heapq.heapreplace(self.heap, num)
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Kth smallest in stream | Easy | Track kth smallest instead (use max-heap) |
| Median in stream | Hard | Track median of stream (two heaps) |
| Top k frequent elements | Medium | Track k most frequent in stream |
| Sliding window kth largest | Hard | Kth largest in last k elements only |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve independently without hints (30 min time limit)
- [ ] Implement min-heap solution
- [ ] Handle initial array correctly
- [ ] Test with k=1 and k=n edge cases

**Spaced Repetition**
- [ ] Day 1: Solve again from scratch
- [ ] Day 3: Implement kth smallest variation
- [ ] Week 1: Explain why min-heap works for kth largest
- [ ] Week 2: Solve median in stream (hard variation)

**Mastery Validation**
- [ ] Can explain min-heap vs max-heap choice
- [ ] Can prove O(k) space complexity
- [ ] Solve in under 10 minutes
- [ ] Implement without referring to notes

**Strategy**: See [Heap Pattern](../prerequisites/heaps.md)
