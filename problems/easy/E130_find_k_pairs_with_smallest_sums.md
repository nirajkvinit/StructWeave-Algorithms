---
id: E130
old_id: I172
slug: find-k-pairs-with-smallest-sums
title: Find K Pairs with Smallest Sums
difficulty: easy
category: easy
topics: ["array", "heap", "priority-queue"]
patterns: ["heap"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["M023", "E001", "M378"]
prerequisites: ["heap", "priority-queue", "sorted-arrays"]
strategy_ref: ../prerequisites/heap.md
---
# Find K Pairs with Smallest Sums

## Problem

You're given two integer arrays `nums1` and `nums2`, both sorted in ascending order, along with an integer `k`. Your task is to find the `k` pairs with the smallest sums, where each pair consists of one element from `nums1` and one element from `nums2`.

A pair `(u, v)` combines element `u` from `nums1` with element `v` from `nums2`, and the pair's sum is simply `u + v`. For example, if `nums1 = [1, 7, 11]` and `nums2 = [2, 4, 6]`, the pair `(1, 2)` has sum 3, the pair `(1, 4)` has sum 5, and the pair `(7, 4)` has sum 11.

The naive approach of generating all possible pairs (nums1.length × nums2.length pairs), sorting them by sum, and taking the first k would work but wastes effort on pairs you'll never need. Since both arrays are sorted, you can exploit this property: the smallest sum must start with `nums1[0] + nums2[0]`. From there, the next smallest sums can only come from pairs that increment one of those indices slightly. This observation makes a min-heap the perfect data structure to efficiently explore pairs in increasing order of sum without generating all possibilities upfront.

Note that if fewer than k pairs exist in total, simply return all available pairs.

## Why This Matters

This problem teaches you to combine multiple algorithmic concepts: leveraging sorted input properties, using heaps for efficient priority-based processing, and avoiding wasteful computation through lazy evaluation. The k-way merge pattern you practice here is fundamental to external sorting (merging large datasets that don't fit in memory), database query optimization (merge joins), and distributed systems (combining sorted streams from multiple servers). Understanding when to use a heap versus other data structures is crucial for real-time systems like recommendation engines (finding top-k items), network routing (shortest path algorithms), and event-driven architectures (processing events by priority).

## Examples

**Example 1:**
- Input: `nums1 = [1,7,11], nums2 = [2,4,6], k = 3`
- Output: `[[1,2],[1,4],[1,6]]`
- Note: When sorted by sum, the pairs are: [1,2] (sum=3), [1,4] (sum=5), [1,6] (sum=7), [7,2] (sum=9), etc.

**Example 2:**
- Input: `nums1 = [1,1,2], nums2 = [1,2,3], k = 2`
- Output: `[[1,1],[1,1]]`
- Note: The two smallest sums are both 2, formed by pairing each 1 from nums1 with the 1 in nums2

**Example 3:**
- Input: `nums1 = [1,2], nums2 = [3], k = 3`
- Output: `[[1,3],[2,3]]`
- Note: Only 2 pairs exist total, which is fewer than k=3

## Constraints

- 1 <= nums1.length, nums2.length <= 10⁵
- -10⁹ <= nums1[i], nums2[i] <= 10⁹
- nums1 and nums2 both are sorted in **non-decreasing order**.
- 1 <= k <= 10⁴
- k <= nums1.length * nums2.length

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Generate All Pairs and Sort
Create all possible pairs, calculate their sums, sort by sum, then take the first k.

**Key Steps:**
1. Generate all n × m pairs
2. Sort pairs by their sum
3. Return first k pairs

**When to use:** For small arrays or initial understanding. Not optimal for large inputs (O(nm log nm)).

### Intermediate Approach - Min Heap with Smart Initialization
Use a min heap to efficiently track the k smallest sums without generating all pairs.

**Key Steps:**
1. Initialize heap with pairs (nums1[i], nums2[0]) for all i
2. Pop minimum sum pair from heap
3. When popping (nums1[i], nums2[j]), add (nums1[i], nums2[j+1]) to heap
4. Repeat k times

**When to use:** This is the standard optimal approach - O(k log k) or O(k log min(k, n)) time.

### Advanced Approach - Optimized Heap with Row Limitation
Can you optimize by only adding the first element from nums1 initially, then expanding?

**Key Steps:**
1. Start with only (nums1[0], nums2[0]) in heap
2. Track visited pairs to avoid duplicates
3. When popping (nums1[i], nums2[j]), add both (nums1[i+1], nums2[j]) and (nums1[i], nums2[j+1])
4. Use a set to prevent duplicate pairs in heap

**When to use:** When you want to minimize initial heap size for very large arrays.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force | O(nm log(nm)) | O(nm) | Generate all pairs and sort |
| Min Heap (all rows) | O(k log n) | O(n) | Initialize with n pairs, pop k times |
| Min Heap (optimized) | O(k log k) | O(k) | Start with 1, expand as needed |
| Sort + Two Pointers | O(nm) | O(1) | Not better; still need to track pairs |

## Common Mistakes

### Mistake 1: Adding all pairs to heap at once
```python
# Wrong - defeats the purpose of using a heap
def kSmallestPairs(nums1, nums2, k):
    heap = []
    for i in range(len(nums1)):
        for j in range(len(nums2)):
            heapq.heappush(heap, (nums1[i] + nums2[j], [nums1[i], nums2[j]]))

    result = []
    for _ in range(k):
        result.append(heapq.heappop(heap)[1])
    return result
```

**Why it's wrong:** You're generating all n × m pairs, which defeats the efficiency of the heap approach. This is essentially brute force with extra steps.

**Fix:** Only initialize heap with the first k (or first min(k, len(nums1))) pairs from nums1 paired with nums2[0]. Expand incrementally as you pop.

### Mistake 2: Not preventing duplicate pairs
```python
# Wrong - can add same pair multiple times
def kSmallestPairs(nums1, nums2, k):
    heap = [(nums1[0] + nums2[0], 0, 0)]
    result = []
    while len(result) < k and heap:
        val, i, j = heapq.heappop(heap)
        result.append([nums1[i], nums2[j]])
        # Missing: check if already visited
        heapq.heappush(heap, (nums1[i+1] + nums2[j], i+1, j))
        heapq.heappush(heap, (nums1[i] + nums2[j+1], i, j+1))
```

**Why it's wrong:** Without tracking visited pairs, you can add (i+1, j) multiple times from different paths, leading to duplicates and incorrect results.

**Fix:** Use a set to track visited (i, j) pairs before adding to heap.

### Mistake 3: Index out of bounds
```python
# Wrong - not checking array boundaries
def kSmallestPairs(nums1, nums2, k):
    heap = [(nums1[i] + nums2[0], i, 0) for i in range(len(nums1))]
    heapq.heapify(heap)
    result = []
    while len(result) < k:
        val, i, j = heapq.heappop(heap)
        result.append([nums1[i], nums2[j]])
        # Missing: boundary checks
        heapq.heappush(heap, (nums1[i] + nums2[j+1], i, j+1))
```

**Why it's wrong:** When j+1 >= len(nums2), you'll get an index out of bounds error.

**Fix:** Always check if i+1 < len(nums1) and j+1 < len(nums2) before accessing.

## Variations

| Variation | Difficulty | Description | Key Difference |
|-----------|-----------|-------------|----------------|
| K Smallest Products | Medium | Find k pairs with smallest products | Different comparison metric |
| K Pairs from K Arrays | Hard | Generalize to k sorted arrays | Multi-way merge problem |
| K Largest Pairs | Easy | Find k largest sum pairs | Use max heap instead |
| Pairs with Target Sum | Medium | Find pairs that sum to target | Different objective; use two pointers |

## Practice Checklist

Track your progress and spaced repetition:

- [ ] Initial attempt (after reading problem)
- [ ] Reviewed approach hints
- [ ] Implemented heap solution
- [ ] Handled duplicate prevention correctly
- [ ] Handled boundary cases (k > total pairs)
- [ ] All test cases passing
- [ ] Reviewed common mistakes
- [ ] Revisit after 1 day
- [ ] Revisit after 3 days
- [ ] Revisit after 1 week
- [ ] Can explain heap invariants clearly

**Strategy Guide:** For pattern recognition and detailed techniques, see [Heap Pattern](../prerequisites/heap.md)
