---
id: M507
old_id: A385
slug: maximum-sum-circular-subarray
title: Maximum Sum Circular Subarray
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Maximum Sum Circular Subarray

## Problem

You're given a circular array of integers `nums` where the end wraps around to connect with the beginning. Your goal is to find the contiguous subarray with the largest sum.

What makes an array circular? Imagine the elements arranged in a circle: after the last element comes the first element again. So if you have `[5, -3, 5]`, you could select a subarray that includes both 5s by "wrapping around" to get `[5, 5]` with sum 10.

Important constraints:
- The subarray must be contiguous (elements next to each other in the circular arrangement)
- Each element can be used at most once
- You must include at least one element

For example:
- `[1, -2, 3, -2]`: The maximum is just `[3]` = 3 (no wrapping needed)
- `[5, -3, 5]`: The maximum is `[5, 5]` = 10 (wrapping around, skipping the middle -3)
- `[-3, -2, -3]`: The maximum is `[-2]` = -2 (must pick the least negative value)

Think of this as finding the best contiguous segment when your array is displayed on a circular track rather than a straight line.

## Why This Matters

Circular array problems appear frequently in system design and real-time data processing. Network packet buffers use circular arrays to efficiently handle continuous data streams, where analyzing the "maximum throughput window" might wrap around the buffer boundary. Time-series analysis of cyclical data (like 24-hour metrics where midnight connects to the next midnight) requires circular subarray techniques to find peak performance windows that span day boundaries. Music streaming apps might use similar algorithms to find the "best listening sequence" in a playlist set to repeat. Understanding the dual nature of this problem - finding either the maximum normal subarray OR the array-minus-minimum-subarray - teaches an important problem transformation technique applicable to many circular data structure challenges.

## Examples

**Example 1:**
- Input: `nums = [1,-2,3,-2]`
- Output: `3`
- Explanation: Subarray [3] has maximum sum 3.

**Example 2:**
- Input: `nums = [5,-3,5]`
- Output: `10`
- Explanation: Subarray [5,5] has maximum sum 5 + 5 = 10.

**Example 3:**
- Input: `nums = [-3,-2,-3]`
- Output: `-2`
- Explanation: Subarray [-2] has maximum sum -2.

## Constraints

- n == nums.length
- 1 <= n <= 3 * 10⁴
- -3 * 10⁴ <= nums[i] <= 3 * 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
A circular maximum subarray either doesn't wrap around (normal Kadane's algorithm) or wraps around. For the wrapping case, the maximum circular sum equals total_sum - minimum_subarray_sum. The answer is the maximum of these two cases.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use Kadane's algorithm twice: once to find the maximum subarray sum (non-circular case), and once to find the minimum subarray sum. The circular case maximum is total_sum - min_sum. Return max(max_sum, total_sum - min_sum). Handle the edge case where all numbers are negative.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
If max_sum is negative (all elements negative), return max_sum instead of the circular calculation, because total_sum - min_sum would give 0 (using the entire array as min subarray), which is incorrect when we must include at least one element.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Try all circular subarrays |
| Optimal (Kadane's twice) | O(n) | O(1) | Single pass to find max and min subarrays |

## Common Mistakes

1. **Not handling all-negative array edge case**
   ```python
   # Wrong: Returns 0 when all numbers are negative
   max_sum = kadane_max(nums)
   min_sum = kadane_min(nums)
   total = sum(nums)
   return max(max_sum, total - min_sum)

   # Correct: Check if max_sum is negative
   max_sum = kadane_max(nums)
   min_sum = kadane_min(nums)
   total = sum(nums)
   if max_sum < 0:  # all negative
       return max_sum
   return max(max_sum, total - min_sum)
   ```

2. **Incorrect Kadane's algorithm for minimum**
   ```python
   # Wrong: Using max instead of min for minimum subarray
   current_min = 0
   min_sum = float('inf')
   for num in nums:
       current_min = max(current_min + num, num)  # should be min!
       min_sum = min(min_sum, current_min)

   # Correct: Use min for minimum subarray
   current_min = 0
   min_sum = float('inf')
   for num in nums:
       current_min = min(current_min + num, num)
       min_sum = min(min_sum, current_min)
   ```

3. **Forgetting that subarray must be non-empty**
   ```python
   # Wrong: Could select empty subarray (min_sum = 0)
   current_min = 0
   min_sum = 0  # should be inf

   # Correct: Initialize properly
   current_min = 0
   min_sum = float('inf')
   for num in nums:
       current_min = min(current_min + num, num)
       min_sum = min(min_sum, current_min)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Maximum Subarray (Kadane's) | Medium | Non-circular version only |
| Maximum Product Subarray | Medium | Product instead of sum, track both max and min |
| Longest Turbulent Subarray | Medium | Different constraint on valid subarray |
| K Concatenation Maximum Sum | Medium | Array repeated k times instead of circular |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Kadane's Algorithm](../../strategies/patterns/kadanes-algorithm.md)
