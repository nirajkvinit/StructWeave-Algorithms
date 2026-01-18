---
id: M498
old_id: A374
slug: sum-of-subarray-minimums
title: Sum of Subarray Minimums
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Sum of Subarray Minimums

## Problem

Given an array of integers, you need to calculate the sum of the minimum values across all possible contiguous subarrays.

Here's what this means with a concrete example. For the array `[3, 1, 2, 4]`:
- Subarray `[3]` has minimum 3
- Subarray `[1]` has minimum 1
- Subarray `[2]` has minimum 2
- Subarray `[4]` has minimum 4
- Subarray `[3,1]` has minimum 1
- Subarray `[1,2]` has minimum 1
- Subarray `[2,4]` has minimum 2
- Subarray `[3,1,2]` has minimum 1
- Subarray `[1,2,4]` has minimum 1
- Subarray `[3,1,2,4]` has minimum 1

Adding up all these minimums: 3 + 1 + 2 + 4 + 1 + 1 + 2 + 1 + 1 + 1 = 17

Since the result can be very large, return the answer modulo `10⁹ + 7`.

The challenge here is efficiency: with an array of length n, there are n(n+1)/2 subarrays, which means a naive approach would be too slow for large arrays. You need a clever way to calculate this sum without explicitly examining every subarray.

## Why This Matters

Cloud infrastructure monitoring systems use this pattern to calculate "minimum latency guarantees" across time windows. When analyzing server response times over a day, engineers need to know: "What's the sum of minimum response times across all possible time windows?" This aggregate metric helps establish SLA (Service Level Agreement) baselines and detect performance degradation patterns. Instead of examining every possible time window separately, they use efficient algorithms to compute this in real-time.

Financial trading systems apply similar logic to calculate "drawdown potential" across sliding windows. For a stock price array, the sum of minimums across all windows represents the total downside risk exposure. Quant traders need to compute this efficiently over high-frequency tick data (millions of price points per day) to adjust portfolio hedging strategies. The monotonic stack technique that solves this problem efficiently is a cornerstone of real-time quantitative analysis.

## Examples

**Example 1:**
- Input: `arr = [3,1,2,4]`
- Output: `17`
- Explanation: All contiguous subarrays: [3], [1], [2], [4], [3,1], [1,2], [2,4], [3,1,2], [1,2,4], [3,1,2,4].
Their respective minimums: 3, 1, 2, 4, 1, 1, 2, 1, 1, 1.
Total: 17.

**Example 2:**
- Input: `arr = [11,81,94,43,3]`
- Output: `444`

## Constraints

- 1 <= arr.length <= 3 * 10⁴
- 1 <= arr[i] <= 3 * 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Instead of calculating minimums for each subarray, think about the contribution of each element. For each element, count how many subarrays have it as the minimum value. This transforms an O(n²) problem into something more efficient.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a monotonic stack to find, for each element, the number of subarrays where it's the minimum. Calculate left and right boundaries where the element is still the minimum. The contribution of nums[i] is: nums[i] × (left_count) × (right_count), where left_count and right_count represent how many positions extend in each direction.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Handle duplicate values carefully - use strict inequality on one side and non-strict on the other to avoid double counting. For instance, use "strictly less than" for left expansion and "less than or equal" for right expansion.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Generate all subarrays, find minimum for each |
| Optimal (Monotonic Stack) | O(n) | O(n) | Single pass with stack to compute contributions |

## Common Mistakes

1. **Double counting subarrays with duplicate minimums**
   ```python
   # Wrong: Using same comparison on both sides
   while stack and arr[stack[-1]] >= arr[i]:  # left
       stack.pop()
   while j < n and arr[j] >= arr[i]:  # right - same comparison!
       j += 1

   # Correct: Use strict inequality on one side
   while stack and arr[stack[-1]] >= arr[i]:  # left: >=
       stack.pop()
   while j < n and arr[j] > arr[i]:  # right: > (strict)
       j += 1
   ```

2. **Forgetting modulo operation**
   ```python
   # Wrong: Only taking modulo at the end
   result = sum(contributions)
   return result % (10**9 + 7)

   # Correct: Apply modulo during accumulation
   MOD = 10**9 + 7
   result = 0
   for contribution in contributions:
       result = (result + contribution) % MOD
   return result
   ```

3. **Not handling stack boundaries correctly**
   ```python
   # Wrong: Assuming stack always has elements
   left_boundary = stack[-1]  # IndexError if stack is empty

   # Correct: Handle empty stack case
   left_boundary = stack[-1] if stack else -1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Sum of Subarray Maximums | Medium | Find contribution of each element as maximum instead of minimum |
| Sum of Subarray Ranges | Hard | Calculate sum of (max - min) for all subarrays |
| Number of Valid Subarrays | Medium | Count subarrays where first element is minimum |
| Largest Rectangle in Histogram | Hard | Similar monotonic stack technique for area calculation |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Monotonic Stack](../../strategies/patterns/monotonic-stack.md)
