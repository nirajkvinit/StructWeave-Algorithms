---
id: H042
old_id: I094
slug: find-median-from-data-stream
title: Find Median from Data Stream
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Find Median from Data Stream

## Problem

The **median** represents the central value when integers are arranged in order. When the collection has an even count, no single middle exists, so the median becomes the average of the two center values.

	- For instance, given `arr = [2,3,4]`, the median equals `3`.
	- For instance, given `arr = [2,3]`, the median equals `(2 + 3) / 2 = 2.5`.

Create the MedianFinder class with these methods:

	- `MedianFinder()` constructs a new `MedianFinder` instance.
	- `void addNum(int num)` inserts the integer `num` into the collection from an incoming data stream.
	- `double findMedian()` computes and returns the median of all currently stored elements. Responses within `10⁻⁵` of the correct value are acceptable.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Constraints

- -10⁵ <= num <= 10⁵
- There will be at least one element in the data structure before calling findMedian.
- At most 5 * 10⁴ calls will be made to addNum and findMedian.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>Key Insight</summary>
The median is always one or two middle elements in a sorted sequence. Instead of fully sorting after each insertion, maintain two halves of the data: smaller elements and larger elements. If you keep these halves balanced and organized, you can access the median in constant time.
</details>

<details>
<summary>Main Approach</summary>
Use two heaps: a max heap for the smaller half of numbers and a min heap for the larger half. Keep the heaps balanced (sizes differ by at most 1). When adding a number, insert it into the appropriate heap and rebalance if necessary. The median is either the top of one heap (if total count is odd) or the average of both tops (if even).
</details>

<details>
<summary>Optimization Tip</summary>
Always maintain the invariant that max_heap.size() equals min_heap.size() or max_heap.size() equals min_heap.size() + 1. When inserting, always add to max_heap first, then move the largest element to min_heap if needed. This ensures consistent balancing logic and handles edge cases cleanly.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Sort Every Time) | O(n log n) per add, O(1) per median | O(n) | Sort entire array on each insertion |
| Insertion Sort | O(n) per add, O(1) per median | O(n) | Maintain sorted array, insert in correct position |
| Optimal (Two Heaps) | O(log n) per add, O(1) per median | O(n) | Best approach for streaming data |

## Common Mistakes

1. **Incorrect Heap Balancing**
   ```python
   # Wrong: Can create size difference > 1
   def addNum(self, num):
       if num < self.max_heap[0]:
           heappush(self.max_heap, -num)
       else:
           heappush(self.min_heap, num)

   # Correct: Always balance after insertion
   def addNum(self, num):
       heappush(self.max_heap, -num)
       heappush(self.min_heap, -heappop(self.max_heap))
       if len(self.min_heap) > len(self.max_heap):
           heappush(self.max_heap, -heappop(self.min_heap))
   ```

2. **Forgetting to Negate for Max Heap**
   ```python
   # Wrong: Python only has min heap
   heappush(self.max_heap, num)

   # Correct: Negate values to simulate max heap
   heappush(self.max_heap, -num)
   ```

3. **Incorrect Median Calculation**
   ```python
   # Wrong: Doesn't handle negative values in max_heap
   def findMedian(self):
       if len(self.max_heap) > len(self.min_heap):
           return self.max_heap[0]

   # Correct: Remember to negate when retrieving from max_heap
   def findMedian(self):
       if len(self.max_heap) > len(self.min_heap):
           return -self.max_heap[0]
       return (-self.max_heap[0] + self.min_heap[0]) / 2.0
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Find Median in Sliding Window | Hard | Need to support removal of old elements |
| Find Kth Largest Element Stream | Medium | Single heap sufficient, simpler than median |
| Running Average from Stream | Easy | Only need sum and count, no heaps required |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Heap Pattern](../../prerequisites/heaps.md)
