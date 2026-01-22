---
id: M149
old_id: I146
slug: top-k-frequent-elements
title: Top K Frequent Elements
difficulty: medium
category: medium
topics: ["array", "heap"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../prerequisites/heaps.md
frequency: high
related_problems: ["M148", "E001", "M020"]
prerequisites: ["hash-map", "heap", "quickselect", "bucket-sort"]
---
# Top K Frequent Elements

## Problem

You are provided with an array of integers `nums` and a positive integer `k`. Your task is to identify and return the `k` elements that appear with the highest frequency in the array. Frequency refers to how many times an element appears; for example, in `[1,1,1,2,2,3]`, the number 1 has frequency 3, while 2 has frequency 2 and 3 has frequency 1. You need to find the `k` elements with the largest frequencies.

The output can be provided in any sequence, meaning you don't need to sort the results. The challenge lies in doing this efficiently: while you could count all frequencies and then sort everything, that approach might be slower than necessary. Can you find the top `k` frequent elements without sorting all elements? Consider techniques like heaps (which maintain partial ordering), bucket sort (which groups by frequency), or QuickSelect (which finds the kth element without full sorting).

Edge cases include situations where `k` equals the number of unique elements (return all unique elements), or where multiple elements have the same frequency (you can return any valid set of `k` elements meeting the frequency threshold). The problem guarantees a unique answer exists, meaning there won't be ambiguity about which elements to include. You might also encounter arrays with all unique elements (each has frequency 1) or arrays with one dominant element appearing many times.

## Why This Matters

Finding top-k frequent items is central to data analytics and recommendation systems. E-commerce platforms identify trending products by analyzing which items are most frequently viewed or purchased in recent user activity. Search engines like Google determine autocomplete suggestions by tracking the most frequently searched queries. Social media platforms use top-k algorithms to identify trending hashtags or viral content based on mention frequency. Log analysis systems in DevOps find the most common error messages or slowest API endpoints to prioritize debugging efforts. Network intrusion detection identifies suspicious IP addresses by frequency of access attempts. The algorithmic techniques here (heaps, bucket sort, QuickSelect) are foundational for building efficient analytics pipelines that process millions of events in real-time, making this problem directly applicable to backend engineering, data engineering, and system design interviews.

## Examples

**Example 1:**
- Input: `nums = [1,1,1,2,2,3], k = 2`
- Output: `[1,2]`
- Explanation: The number 1 appears 3 times and 2 appears twice, making them the two most frequent elements.

**Example 2:**
- Input: `nums = [1], k = 1`
- Output: `[1]`
- Explanation: Only one element exists, so it is the most frequent by default.

## Constraints

- 1 <= nums.length <= 10⁵
- -10⁴ <= nums[i] <= 10⁴
- k is in the range [1, the number of unique elements in the array].
- It is **guaranteed** that the answer is **unique**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Count Frequencies First</summary>
Before finding the top k elements, you need to know how often each element appears. What data structure efficiently counts occurrences of elements in an array? Think about mapping each unique element to its frequency.
</details>

<details>
<summary>🎯 Hint 2: Finding Top K</summary>
Once you have frequencies, you need the k highest ones. Consider these approaches:
- Sorting all frequencies (what's the time complexity?)
- Using a min-heap of size k (keeps only top k elements)
- Bucket sort (group elements by frequency)
- QuickSelect algorithm (like QuickSort's partition)
</details>

<details>
<summary>📝 Hint 3: Min-Heap Approach</summary>
Algorithm using min-heap:
1. Build frequency map: element → count
2. Create min-heap of size k
3. For each (element, frequency) pair:
   - If heap size < k, add to heap
   - Else if frequency > heap minimum, remove min and add current
4. Return all elements in heap

The heap maintains the k most frequent elements seen so far.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Sort by Frequency | O(n log n) | O(n) | Build map O(n), sort unique elements O(u log u) |
| Min-Heap (size k) | O(n log k) | O(n) | Build map O(n), heap operations O(u log k) |
| Bucket Sort | O(n) | O(n) | Use frequency as bucket index |
| **QuickSelect** | **O(n) average** | **O(n)** | Can degrade to O(n²) worst case |

## Common Mistakes

**Mistake 1: Sorting Everything**
```python
# Wrong: Sorts entire array first (unnecessary)
def topKFrequent(nums, k):
    from collections import Counter
    nums.sort()  # Unnecessary O(n log n) operation
    count = Counter(nums)
    return [x[0] for x in count.most_common(k)]
```

**Correct Approach:**
```python
# Correct: Only count, then find top k
def topKFrequent(nums, k):
    from collections import Counter
    count = Counter(nums)
    return [x[0] for x in count.most_common(k)]  # Heap-based
```

**Mistake 2: Using Max-Heap Instead of Min-Heap**
```python
# Wrong: Max-heap requires storing all elements
import heapq
from collections import Counter

def topKFrequent(nums, k):
    count = Counter(nums)
    # Max-heap (negative frequencies) stores all elements
    heap = [(-freq, num) for num, freq in count.items()]
    heapq.heapify(heap)  # O(n)
    return [heapq.heappop(heap)[1] for _ in range(k)]  # O(k log n)
```

**Correct Approach:**
```python
# Correct: Min-heap of size k
import heapq
from collections import Counter

def topKFrequent(nums, k):
    count = Counter(nums)
    # Min-heap maintains only k elements
    heap = []
    for num, freq in count.items():
        heapq.heappush(heap, (freq, num))
        if len(heap) > k:
            heapq.heappop(heap)  # Remove least frequent

    return [num for freq, num in heap]
```

**Mistake 3: Not Handling Edge Cases**
```python
# Wrong: Doesn't handle k = n or single element
def topKFrequent(nums, k):
    from collections import Counter
    count = Counter(nums)
    if len(count) < k:  # Need to handle this
        return []  # Wrong! Should return all elements
    # ...

# Correct: Works for all valid k
def topKFrequent(nums, k):
    from collections import Counter
    count = Counter(nums)
    return [x[0] for x in count.most_common(k)]
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| Top K Frequent Words | Return k most frequent strings | Use custom comparator (frequency, then lexicographic) |
| Kth Largest Element | Find kth largest element | Similar heap approach, but on values not frequencies |
| Top K with Streaming | Elements arrive one at a time | Maintain heap and frequency map dynamically |
| Least K Frequent | Find k least frequent elements | Use max-heap of size k instead |
| Top K in Sliding Window | Top k in each window of size w | Combine with sliding window technique |

## Practice Checklist

- [ ] Day 1: Implement using min-heap approach
- [ ] Day 2: Implement using bucket sort for O(n) time
- [ ] Day 7: Implement using QuickSelect algorithm
- [ ] Day 14: Solve Top K Frequent Words variation
- [ ] Day 30: Solve without looking at hints

**Strategy**: See [Array Pattern](../prerequisites/heaps.md)
