---
id: M216
old_id: I279
slug: sliding-window-median
title: Sliding Window Median
difficulty: medium
category: medium
topics: ["array", "sliding-window", "heap", "sorting"]
patterns: ["two-heaps"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E295", "M239", "M480"]
prerequisites: ["sliding-window", "heap", "two-heaps", "median"]
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Sliding Window Median

## Problem

The median is the middle value of a sorted dataset. For odd-length collections, it's the single middle element; for even-length collections, it's the average of the two middle elements. For example, `[2,3,4]` has median `3`, while `[1,2,3,4]` has median `2.5`.

Given an integer array `nums` and a window size `k`, imagine sliding a window of size `k` across the array from left to right, one position at a time. At each position, compute the median of the `k` elements currently visible in the window. Return all these medians as an array, with results accurate to within 10^-5.

The challenge lies in efficiency. The naive approach - sorting each window of k elements - requires O(k log k) per window, giving O(nk log k) overall. For n=100,000 and k=100,000, this means billions of operations and will timeout. You need a data structure that supports efficient median queries while elements enter and leave the window.

This is where the two-heaps pattern shines: maintain a max-heap for the smaller half of elements and a min-heap for the larger half. The median is always at the top of one or both heaps. However, removing arbitrary elements from heaps is expensive, so you'll need a technique called lazy deletion - mark elements for removal but only actually delete them when they bubble to the top.

The array can contain negative numbers and duplicates, and window size k can equal the array length, requiring careful handling of balanced heap sizes.

## Why This Matters

Sliding window median appears in signal processing (removing noise while preserving edges), financial analytics (tracking moving median stock prices to detect anomalies), and time-series analysis (smoothing sensor data). The two-heaps pattern you'll master here is fundamental to streaming algorithms where you maintain statistics over dynamic datasets - it's the optimal solution for finding medians in data streams. Understanding lazy deletion teaches you how to adapt data structures when standard operations are expensive, a technique applicable to priority queues, caches, and databases. This problem combines multiple advanced concepts: sliding windows, heaps, balanced data structures, and amortized analysis.

## Examples

**Example 1:**
- Input: `nums = [1,3,-1,-3,5,3,6,7], k = 3`
- Output: `[1.00000,-1.00000,-1.00000,3.00000,5.00000,6.00000]`
- Explanation:
Window position                Median
---------------                -----
[**1  3  -1**] -3  5  3  6  7        1
 1 [**3  -1  -3**] 5  3  6  7       -1
 1  3 [**-1  -3  5**] 3  6  7       -1
 1  3  -1 [**-3  5  3**] 6  7        3
 1  3  -1  -3 [**5  3  6**] 7        5
 1  3  -1  -3  5 [**3  6  7**]       6

**Example 2:**
- Input: `nums = [1,2,3,4,2,3,1,4,2], k = 3`
- Output: `[2.00000,3.00000,3.00000,3.00000,2.00000,3.00000,2.00000]`

## Constraints

- 1 <= k <= nums.length <= 10⁵
- -2³¹ <= nums[i] <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Two Heaps Pattern</summary>

Use two heaps to track the median efficiently: a max heap for the smaller half and a min heap for the larger half. This is the same pattern as "Find Median from Data Stream" but with the added challenge of removing elements that leave the window. The median is either the top of the max heap (odd k) or average of both tops (even k).

</details>

<details>
<summary>🎯 Hint 2: Lazy Deletion</summary>

Removing elements from heaps is expensive. Instead, use lazy deletion: mark elements for deletion in a hash map but don't actually remove them until they reach the top of a heap. When getting the median, first clean the tops of both heaps by removing any marked elements, then balance the heaps if needed.

</details>

<details>
<summary>📝 Hint 3: Implementation with Two Heaps</summary>

```
from heapq import heappush, heappop
from collections import defaultdict

def median_sliding_window(nums, k):
    max_heap = []  # Left half (negated for max heap)
    min_heap = []  # Right half
    to_remove = defaultdict(int)  # Count of elements to remove
    result = []

    def balance():
        # Max heap should have same size or 1 more element
        while len(max_heap) > len(min_heap) + 1:
            heappush(min_heap, -heappop(max_heap))
        while len(min_heap) > len(max_heap):
            heappush(max_heap, -heappop(min_heap))

    def clean_top(heap):
        # Remove elements marked for deletion from top
        while heap and to_remove[abs(heap[0])] > 0:
            to_remove[abs(heap[0])] -= 1
            heappop(heap)

    def get_median():
        clean_top(max_heap)
        clean_top(min_heap)
        if k % 2 == 1:
            return float(-max_heap[0])
        return (-max_heap[0] + min_heap[0]) / 2.0

    # Initialize first window
    for i in range(k):
        heappush(max_heap, -nums[i])
    for _ in range(k // 2):
        heappush(min_heap, -heappop(max_heap))

    result.append(get_median())

    # Slide window
    for i in range(k, len(nums)):
        out_num = nums[i - k]
        in_num = nums[i]

        # Mark outgoing element for removal
        to_remove[out_num] += 1

        # Add incoming element to appropriate heap
        if max_heap and in_num <= -max_heap[0]:
            heappush(max_heap, -in_num)
        else:
            heappush(min_heap, in_num)

        # Adjust balance based on which heap out_num was in
        if out_num <= -max_heap[0]:
            if in_num > -max_heap[0]:
                balance()
        else:
            if in_num <= -max_heap[0]:
                balance()

        result.append(get_median())

    return result
```

Time: O(n log k), Space: O(k)

Alternative: Use multiset/sorted container if available (C++ multiset, Python sortedcontainers).

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Naive (Sort Each Window) | O(n × k log k) | O(k) | Sort window at each position |
| Two Heaps with Lazy Deletion | O(n log k) | O(k) | Optimal for most cases |
| Sorted Container (Multiset) | O(n log k) | O(k) | Simpler implementation if available |
| Insertion Sort (Maintaining Order) | O(n × k) | O(k) | Good for small k |

n = nums.length

## Common Mistakes

**Mistake 1: Sorting Entire Window Each Time**

```python
# Wrong: Too slow, O(nk log k)
def median_sliding_window(nums, k):
    result = []
    for i in range(len(nums) - k + 1):
        window = sorted(nums[i:i+k])  # O(k log k) each time!
        if k % 2 == 1:
            result.append(float(window[k // 2]))
        else:
            result.append((window[k // 2 - 1] + window[k // 2]) / 2.0)
    return result
```

```python
# Correct: Use two heaps for O(n log k)
# (See detailed implementation in Hint 3)
```

**Mistake 2: Not Handling Even k Correctly**

```python
# Wrong: Always returns single element
def get_median():
    return float(-max_heap[0])  # Wrong for even k!
```

```python
# Correct: Check if k is odd or even
def get_median():
    if k % 2 == 1:
        return float(-max_heap[0])
    return (-max_heap[0] + min_heap[0]) / 2.0
```

**Mistake 3: Incorrect Heap Balancing**

```python
# Wrong: Doesn't maintain heap size invariant
def balance():
    while len(max_heap) > len(min_heap):  # Wrong condition!
        heappush(min_heap, -heappop(max_heap))
```

```python
# Correct: Max heap should have same size or 1 more
def balance():
    while len(max_heap) > len(min_heap) + 1:
        heappush(min_heap, -heappop(max_heap))
    while len(min_heap) > len(max_heap):
        heappush(max_heap, -heappop(min_heap))
```

## Variations

| Variation | Difference | Approach Change |
|-----------|-----------|-----------------|
| Sliding Window Maximum/Minimum | Find max/min instead of median | Use monotonic deque |
| Kth Largest in Window | Find kth largest element | Single heap or quickselect |
| Sliding Window Mode | Most frequent element | Hash map with frequency tracking |
| Weighted Median | Elements have weights | Modify two heaps to track cumulative weights |
| Multiple Windows | Process multiple window sizes | Precompute or use data structure per size |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Reviewed solution
- [ ] Implemented without hints (Day 1)
- [ ] Solved again (Day 3)
- [ ] Solved again (Day 7)
- [ ] Solved again (Day 14)
- [ ] Attempted all variations above

**Strategy**: See [Sliding Window](../strategies/patterns/sliding-window.md) and [Two Heaps](../strategies/patterns/two-heaps.md)
