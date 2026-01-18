---
id: H107
old_id: A329
slug: shortest-subarray-with-sum-at-least-k
title: Shortest Subarray with Sum at Least K
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Shortest Subarray with Sum at Least K

## Problem

You are provided with an integer array `nums` and a target value `k`. Find the minimum length of any contiguous segment of the array whose elements sum to at least `k`. If no such segment exists, return `-1`.

Note that a subarray must consist of consecutive elements from the original array.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `nums = [1], k = 1`
- Output: `1`

**Example 2:**
- Input: `nums = [1,2], k = 4`
- Output: `-1`

**Example 3:**
- Input: `nums = [2,-1,2], k = 3`
- Output: `3`

## Constraints

- 1 <= nums.length <= 10⁵
- -10⁵ <= nums[i] <= 10⁵
- 1 <= k <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

This problem is hard because negative numbers break the sliding window approach. The key insight is to use prefix sums with a monotonic deque. For each position i, you want to find the largest j < i where prefix[i] - prefix[j] >= k. The deque maintains potential starting points in increasing order of prefix sum.

</details>

<details>
<summary>🎯 Main Approach</summary>

Compute prefix sums. Use a deque to store indices. For each index i: (1) While the deque is not empty and current_prefix_sum - prefix_sum[deque.front()] >= k, we found a valid subarray - pop front and update minimum length. (2) While deque is not empty and current_prefix_sum <= prefix_sum[deque.back()], pop back (they can't be optimal starting points). (3) Add current index to deque.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

The deque maintains two invariants: (1) indices are in increasing order, (2) their corresponding prefix sums are in increasing order. This ensures each index is added and removed at most once, giving O(n) time complexity. The key is understanding why we pop from the back: if prefix[j] >= prefix[i] and j < i, then j can never be a better starting point than i for any future endpoint.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n^2) | O(1) | Check all subarrays |
| Sliding Window | O(n) | O(1) | Only works for non-negative numbers |
| Optimal Deque | O(n) | O(n) | Each element added/removed once |

## Common Mistakes

1. **Trying to use sliding window with negative numbers**
   ```python
   # Wrong: Sliding window doesn't work with negatives
   left = 0
   current_sum = 0
   for right in range(len(nums)):
       current_sum += nums[right]
       while current_sum >= k:
           min_len = min(min_len, right - left + 1)
           current_sum -= nums[left]
           left += 1  # May skip optimal solution with negatives

   # Correct: Use deque with prefix sums
   prefix = [0]
   for num in nums:
       prefix.append(prefix[-1] + num)
   deque = collections.deque()
   min_len = float('inf')
   for i in range(len(prefix)):
       while deque and prefix[i] - prefix[deque[0]] >= k:
           min_len = min(min_len, i - deque.popleft())
       while deque and prefix[i] <= prefix[deque[-1]]:
           deque.pop()
       deque.append(i)
   ```

2. **Not maintaining deque monotonicity**
   ```python
   # Wrong: Adding to deque without popping suboptimal indices
   deque.append(i)  # Blindly adding without cleanup

   # Correct: Remove indices that can't be optimal
   while deque and prefix[i] <= prefix[deque[-1]]:
       deque.pop()  # Remove worse starting points
   deque.append(i)
   ```

3. **Using prefix sum array incorrectly**
   ```python
   # Wrong: Confusing indices
   prefix[i] = nums[i] + prefix[i-1]  # Index alignment issues
   min_len = i - j  # Wrong length calculation

   # Correct: Clear prefix sum construction
   prefix = [0]  # Start with 0 for empty prefix
   for num in nums:
       prefix.append(prefix[-1] + num)
   # Now prefix[i] = sum of nums[0:i]
   min_len = i - j  # Length of nums[j:i]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Longest Subarray Sum At Most K | Medium | Maximizing length instead of minimizing |
| Subarray Sum Equals K | Medium | Exact sum instead of at least |
| Shortest Subarray with Product | Hard | Product instead of sum |
| K-Sum Subarrays | Medium | Count subarrays instead of finding shortest |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (all negatives, single element, no solution)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Monotonic Deque Pattern](../../strategies/patterns/monotonic-queue.md)
