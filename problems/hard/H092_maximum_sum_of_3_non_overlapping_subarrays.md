---
id: H092
old_id: A156
slug: maximum-sum-of-3-non-overlapping-subarrays
title: Maximum Sum of 3 Non-Overlapping Subarrays
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Maximum Sum of 3 Non-Overlapping Subarrays

## Problem

You are given an integer array `nums` and a positive integer `k`. Your task is to locate three subarrays, each of length `k`, that don't share any elements and together produce the maximum possible sum.

Return the starting indices (using 0-based indexing) of these three subarrays as an array. When multiple solutions achieve the same maximum sum, choose the one that is lexicographically smallest.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `nums = [1,2,1,2,6,7,5,1], k = 2`
- Output: `[0,3,5]`
- Explanation: The three subarrays starting at indices 0, 3, and 5 are [1,2], [2,6], and [7,5] respectively. While other combinations exist, [0,3,5] is lexicographically smallest among those with maximum sum.

**Example 2:**
- Input: `nums = [1,2,1,2,1,2,1,2,1], k = 2`
- Output: `[0,2,4]`

## Constraints

- 1 <= nums.length <= 2 * 10⁴
- 1 <= nums[i] < 2¹⁶
- 1 <= k <= floor(nums.length / 3)

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a dynamic programming problem where you need to track the best positions for subarrays to the left and right of any middle subarray. Precompute prefix sums to quickly calculate subarray sums, then use DP arrays to store optimal left and right positions.
</details>

<details>
<summary>🎯 Main Approach</summary>
First, calculate prefix sums for O(1) subarray sum queries. Create two DP arrays: left[i] stores the best starting index for a subarray ending at or before position i, and right[i] stores the best starting index for a subarray starting at or after position i. Then iterate through all possible middle subarray positions and find the combination with maximum total sum.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
When building left and right DP arrays, handle lexicographically smallest requirement by using ">=" for right array (favor earlier indices) and ">" for left array. Precompute all subarray sums in a single pass to avoid redundant calculations.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n³) | O(1) | Try all triplet combinations |
| Prefix Sum + Triple Loop | O(n³) | O(n) | Faster sum calculation |
| Dynamic Programming | O(n) | O(n) | Precompute best left/right positions |
| Optimal | O(n) | O(n) | Single pass with DP arrays |

## Common Mistakes

1. **Not handling lexicographically smallest requirement**
   ```python
   # Wrong: Using > for both comparisons
   if sum_right[i] > max_sum:
       right[i] = i

   # Correct: Use >= for right to prefer earlier indices
   if sum_right[i] >= max_sum:
       right[i] = i
   ```

2. **Incorrect window sum calculation**
   ```python
   # Wrong: Recalculating sum each time
   for i in range(len(nums) - k + 1):
       curr_sum = sum(nums[i:i+k])  # O(k) per iteration

   # Correct: Use sliding window or prefix sums
   prefix = [0]
   for num in nums:
       prefix.append(prefix[-1] + num)
   # Sum of nums[i:i+k] = prefix[i+k] - prefix[i]
   ```

3. **Overlapping subarrays in final selection**
   ```python
   # Wrong: Not ensuring non-overlapping windows
   for mid in range(n):
       left_idx = left[mid]
       right_idx = right[mid]  # May overlap with mid

   # Correct: Ensure proper spacing
   for mid in range(k, n - 2*k + 1):
       left_idx = left[mid - 1]  # Ends before mid
       right_idx = right[mid + k]  # Starts after mid
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Maximum Sum of 2 Non-Overlapping Subarrays | Medium | Two windows instead of three |
| Best Time to Buy and Sell Stock III | Hard | Similar multi-segment optimization |
| Maximum Sum of K Non-Overlapping Subarrays | Hard | Generalize to K segments |
| Minimum Window Substring | Hard | Variable window size constraint |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (lexicographic order, boundary checks)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md) | [Sliding Window](../../strategies/patterns/sliding-window.md)
