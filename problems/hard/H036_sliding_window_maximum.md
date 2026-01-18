---
id: H036
old_id: I039
slug: sliding-window-maximum
title: Sliding Window Maximum
difficulty: hard
category: hard
topics: ["array", "sliding-window"]
patterns: []
estimated_time_minutes: 45
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Sliding Window Maximum

## Problem

Consider an integer array `nums` with a fixed-size window of length `k` that traverses from the leftmost position to the rightmost. At any moment, you can observe only the `k` elements currently visible through the window. The window advances one position rightward with each step.

Your task is to produce *the maximum values for each window position*.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `nums = [1,3,-1,-3,5,3,6,7], k = 3`
- Output: `[3,3,5,5,6,7]`
- Explanation: Window position                Max
---------------               -----
[1  3  -1] -3  5  3  6  7       **3**
 1 [3  -1  -3] 5  3  6  7       **3**
 1  3 [-1  -3  5] 3  6  7      ** 5**
 1  3  -1 [-3  5  3] 6  7       **5**
 1  3  -1  -3 [5  3  6] 7       **6**
 1  3  -1  -3  5 [3  6  7]      **7**

**Example 2:**
- Input: `nums = [1], k = 1`
- Output: `[1]`

## Constraints

- 1 <= nums.length <= 10⁵
- -10⁴ <= nums[i] <= 10⁴
- 1 <= k <= nums.length

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

**Strategy**: See [Array Pattern](../strategies/patterns/sliding-window.md)

## Approach Hints

<details>
<summary>Key Insight</summary>
Use a deque (double-ended queue) to maintain indices of potentially useful elements in decreasing order of their values. The front of deque always contains the index of the maximum element in current window. Remove indices that are out of window range and smaller elements that can never be maximum.
</details>

<details>
<summary>Main Approach</summary>
1. Use a deque to store indices (not values). 2. For each element, remove indices from back of deque while their values are smaller than current element (they can never be max). 3. Remove indices from front if they're outside current window. 4. Add current index to back. 5. The front of deque is the max for current window. Start recording after first k elements.
</details>

<details>
<summary>Optimization Tip</summary>
The deque maintains indices in decreasing order of their corresponding values. When adding new element, pop from back while values are smaller - these elements are "shadowed" by the new larger element and will never be useful. Only store indices, not values, to easily check if they're still in window.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n * k) | O(1) | Scan window for max at each position |
| Heap | O(n log k) | O(k) | Max heap with lazy deletion |
| Optimal (Deque) | O(n) | O(k) | Each element added and removed once |
| BST/TreeMap | O(n log k) | O(k) | Ordered structure for window elements |

## Common Mistakes

1. **Storing values instead of indices in deque**
   ```python
   # Wrong: Can't check if element is still in window
   deque.append(nums[i])

   # Correct: Store indices to track window bounds
   deque.append(i)
   if deque[0] <= i - k:  # Check if out of window
       deque.popleft()
   ```

2. **Not removing smaller elements from back**
   ```python
   # Wrong: Keeping all elements in deque
   deque.append(i)

   # Correct: Remove smaller elements that can't be max
   while deque and nums[deque[-1]] < nums[i]:
       deque.pop()
   deque.append(i)
   ```

3. **Starting output at wrong position**
   ```python
   # Wrong: Adding to result for every element
   for i in range(len(nums)):
       # process
       result.append(nums[deque[0]])

   # Correct: Start after first window is complete
   for i in range(len(nums)):
       # process
       if i >= k - 1:
           result.append(nums[deque[0]])
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Sliding Window Minimum | Medium | Same approach, maintain min instead of max |
| Sliding Window Median | Hard | Need two heaps or order statistic tree |
| Longest Continuous Subarray | Medium | Condition-based instead of fixed size |
| Max Sum of Rectangle No Larger Than K | Hard | 2D sliding window with max sum constraint |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Sliding Window Pattern](../../strategies/patterns/sliding-window.md)
