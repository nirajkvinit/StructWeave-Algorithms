---
id: M292
old_id: A099
slug: smallest-range-covering-elements-from-k-lists
title: Smallest Range Covering Elements from K Lists
difficulty: medium
category: medium
topics: ["array", "heap", "sliding-window"]
patterns: ["k-way-merge"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["H004", "M274", "E094"]
prerequisites: ["heap", "two-pointers", "merge-k-sorted-lists"]
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Smallest Range Covering Elements from K Lists

## Problem

You have `k` sorted lists of integers, and you need to find the smallest range that includes at least one number from each list.

Think of it like scheduling: you have `k` people's available time slots (each person's slots are sorted by time), and you want to find the shortest time window where everyone has at least one available slot.

More formally, find the range `[a, b]` where:
- The range contains at least one element from each of the `k` lists
- The range length `b - a` is minimized
- If multiple ranges have the same length, choose the one with the smallest starting value `a`

For example, given three lists `[[4,10,15,24,26], [0,9,12,20], [5,18,22,30]]`, the range `[20,24]` works because it includes 24 from list 1, 20 from list 2, and 22 from list 3. No shorter range can cover all three lists.

The key insight is that each list is already sorted, which you can leverage for efficiency. A naive approach of checking all possible ranges would be extremely slow, but the sorted property lets you use smarter techniques.

## Why This Matters

This problem is a masterclass in combining algorithmic patterns. It brings together k-way merging (think "merge k sorted lists"), min-heap operations for efficient minimum tracking, and sliding window logic to maintain coverage. In real applications, this pattern appears when finding common availability across multiple calendars, merging log streams from distributed systems while maintaining time windows, or finding consensus ranges in time-series data from multiple sensors. The problem also teaches you to exploit pre-sorted data structures for optimization - a critical skill for systems dealing with streaming data or large datasets that can't fit in memory at once.

## Examples

**Example 1:**
- Input: `nums = [[4,10,15,24,26],[0,9,12,20],[5,18,22,30]]`
- Output: `[20,24]`
- Explanation: List 1 contributes 24 to the range [20,24]. List 2 contributes 20 to the range [20,24]. List 3 contributes 22 to the range [20,24].

**Example 2:**
- Input: `nums = [[1,2,3],[1,2,3],[1,2,3]]`
- Output: `[1,1]`

## Constraints

- nums.length == k
- 1 <= k <= 3500
- 1 <= nums[i].length <= 50
- -10⁵ <= nums[i][j] <= 10⁵
- nums[i] is sorted in **non-decreasing** order.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Sliding Window with Pointers</summary>

The key insight is to maintain a "window" that always contains one element from each list. Start by taking the first element from each list. The range is defined by the minimum and maximum elements currently selected. To minimize the range, try advancing the pointer of the list containing the current minimum value, then recalculate the range with the new minimum and maximum.

</details>

<details>
<summary>Hint 2: Min Heap for Efficient Minimum Tracking</summary>

Use a min heap to efficiently track the current minimum element across all k lists. Store tuples of (value, list_index, element_index) in the heap. Also maintain a variable tracking the current maximum value. The range is [min_value, max_value]. Pop the minimum, advance that list's pointer, update the maximum if needed, and push the new element to the heap. Continue until any list is exhausted.

</details>

<details>
<summary>Hint 3: Termination Condition</summary>

The algorithm terminates when you can no longer advance: specifically, when the list containing the current minimum element has no more elements to offer. At that point, it's impossible to maintain coverage of all k lists. Track the best range seen so far (smallest length, with ties broken by smaller start point) throughout the process.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Min Heap + Max Tracking | O(n log k) | O(k) | n is total elements, k lists; heap size is k |
| Brute Force (Try All) | O(n^k) | O(1) | Try all combinations of one element per list |
| Two Pointer (Merged) | O(n log n + n) | O(n) | Merge all, then sliding window; loses structure |

## Common Mistakes

1. **Not tracking maximum correctly when advancing**
```python
# Wrong: forgets to update max when pushing new element
min_val, list_idx, elem_idx = heapq.heappop(heap)
if elem_idx + 1 < len(nums[list_idx]):
    heapq.heappush(heap, (nums[list_idx][elem_idx + 1], list_idx, elem_idx + 1))
    # Missing: max_val = max(max_val, nums[list_idx][elem_idx + 1])

# Correct: update max when adding new element
min_val, list_idx, elem_idx = heapq.heappop(heap)
if elem_idx + 1 < len(nums[list_idx]):
    next_val = nums[list_idx][elem_idx + 1]
    heapq.heappush(heap, (next_val, list_idx, elem_idx + 1))
    max_val = max(max_val, next_val)
```

2. **Incorrect range comparison**
```python
# Wrong: doesn't handle tie-breaking correctly
if current_range < best_range:  # Compares tuples incorrectly
    best_range = current_range

# Correct: compare length first, then start point
current_len = max_val - min_val
best_len = best_range[1] - best_range[0]
if current_len < best_len or (current_len == best_len and min_val < best_range[0]):
    best_range = [min_val, max_val]
```

3. **Early termination without checking final range**
```python
# Wrong: terminates without checking current range
while heap:
    if elem_idx + 1 >= len(nums[list_idx]):
        break  # Exits without considering current range

# Correct: update best range before breaking
while heap:
    # Update best range
    current_len = max_val - heap[0][0]
    if current_len < best_len:
        best_range = [heap[0][0], max_val]

    min_val, list_idx, elem_idx = heapq.heappop(heap)
    if elem_idx + 1 >= len(nums[list_idx]):
        break
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Smallest Range II | Allow excluding up to m lists from coverage | Hard |
| Weighted Range | Each list has a weight; minimize weighted range | Hard |
| Longest Range | Find longest range covering all lists (at least one element each) | Medium |
| k-Coverage with Duplicates | Find range covering at least k occurrences total | Hard |

## Practice Checklist

- [ ] Implement min heap solution with max tracking
- [ ] Initialize heap with first element from each list
- [ ] Track current maximum correctly
- [ ] Update best range at each step
- [ ] Handle termination when any list exhausted
- [ ] Test with example: [[4,10,15,24,26],[0,9,12,20],[5,18,22,30]]
- [ ] Test with all same values: [[1,2,3],[1,2,3],[1,2,3]]
- [ ] Test with k=2 lists
- [ ] **Review in 24 hours**: Re-implement from memory
- [ ] **Review in 1 week**: Solve without hints
- [ ] **Review in 2 weeks**: Optimize space complexity

**Strategy**: See [Sliding Window Pattern](../strategies/patterns/sliding-window.md)
