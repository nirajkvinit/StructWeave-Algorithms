---
id: M302
old_id: A111
slug: maximum-average-subarray-ii
title: Maximum Average Subarray II
difficulty: medium
category: medium
topics: ["array", "sliding-window", "binary-search", "prefix-sum"]
patterns: ["binary-search", "sliding-window"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E643", "M325", "M718"]
prerequisites: ["E643", "M209"]
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Maximum Average Subarray II

## Problem

Given an integer array `nums` containing `n` elements and an integer `k`, find a contiguous subarray with length at least `k` that has the maximum average value. Return this maximum average. Your answer will be considered correct if it's within `10⁻⁵` of the actual answer.

The challenge here is that the subarray length is variable - it must be at least `k` elements long, but could be longer if that produces a higher average. For instance, with `nums = [1,12,-5,-6,50,3]` and `k = 4`, you might consider the 4-element subarray `[12,-5,-6,50]` with average `12.75`, or the 5-element subarray `[12,-5,-6,50,3]` with average `10.8`, or even the entire 6-element array with average `9.17`. Among all valid options (length 4, 5, or 6), the maximum average is `12.75`.

Note that this differs from finding the maximum sum subarray - here we care about average (sum divided by length), which means shorter high-sum subarrays might beat longer ones. Also, unlike a fixed-length sliding window problem, you can't simply track one window; you need to consider all possible lengths from `k` to `n`.

## Why This Matters

This problem teaches an elegant technique called "binary search on the answer" where you search for the optimal value rather than finding it directly. When direct optimization is hard (like maximizing an average over variable-length subarrays), you can instead ask "is average X achievable?" and binary search for the highest achievable X. This pattern appears in resource allocation problems (finding maximum capacity, optimal speed, etc.) and teaches you to recognize when a search-based solution outperforms greedy or dynamic programming. The prefix sum technique for validation also reinforces efficient range query handling, a skill essential for working with time-series data, financial analytics, and streaming computations.

## Examples

**Example 1:**
- Input: `nums = [1,12,-5,-6,50,3], k = 4`
- Output: `12.75000`
- Explanation: Considering all valid subarrays of length at least 4, the sequence [12, -5, -6, 50] yields the highest average of 12.75. Other possibilities include length 5 subarrays with averages 10.4 and 10.8, or the entire array with average 9.16667.

**Example 2:**
- Input: `nums = [5], k = 1`
- Output: `5.00000`

## Constraints

- n == nums.length
- 1 <= k <= n <= 10⁴
- -10⁴ <= nums[i] <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Binary Search on the Answer</summary>

The key insight is to use binary search on the possible average value. The search space is `[min(nums), max(nums)]`.

For a candidate average `mid`, we can check: "Does there exist a subarray of length >= k with average >= mid?"

Transform this question into: "Does there exist a subarray of length >= k with sum >= mid × length?"

Rearranging: sum - mid × length >= 0, or sum of (nums[i] - mid) >= 0

So we're looking for a subarray where the sum of adjusted values (nums[i] - mid) is non-negative.

</details>

<details>
<summary>Hint 2: Check Feasibility with Prefix Sums</summary>

To check if average `mid` is achievable:

1. Create adjusted array: `adjusted[i] = nums[i] - mid`
2. We need: sum of adjusted[i..j] >= 0 for some subarray of length >= k
3. Using prefix sums: `prefix[j] - prefix[i] >= 0` where `j - i >= k`
4. Rearrange: `prefix[j] >= prefix[i]` where `j >= i + k`

To find this efficiently, for each position `j >= k`, we want the minimum prefix sum among positions `[0, j-k]`.

If we find any position where `prefix[j] >= min_prefix_before`, then average `mid` is achievable.

</details>

<details>
<summary>Hint 3: Implement Binary Search with Precision</summary>

Binary search template for floating-point:

```
left = min(nums)
right = max(nums)
epsilon = 1e-5

while right - left > epsilon:
    mid = (left + right) / 2
    if is_achievable(mid):
        left = mid  # Try higher average
    else:
        right = mid  # Try lower average

return left
```

The `is_achievable(mid)` function uses the prefix sum technique from Hint 2:
- Create adjusted array with nums[i] - mid
- Compute prefix sums
- Track minimum prefix sum seen so far
- If any prefix[j] >= min_prefix (where j >= k), return True

Time complexity: O(n log(range)) where range is max(nums) - min(nums).

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force | O(n²) | O(1) | Check all subarrays, TLE for large n |
| Binary Search + Prefix Sum | O(n log R) | O(n) | R = range of values, optimal |
| Sliding Window (wrong) | O(n) | O(1) | Only works for fixed length k |

**Recommended**: Binary search on answer with prefix sum validation.

## Common Mistakes

1. **Using sliding window for variable length**
```python
# Wrong: Sliding window doesn't work for "length >= k" with max average
max_sum = sum(nums[:k])
current_sum = max_sum
for i in range(k, n):
    current_sum += nums[i]
    max_sum = max(max_sum, current_sum)
    # This doesn't handle variable length correctly!

# Correct: Use binary search on answer
def is_achievable(avg):
    adjusted = [num - avg for num in nums]
    prefix = [0]
    for num in adjusted:
        prefix.append(prefix[-1] + num)

    min_prefix = 0
    for j in range(k, n + 1):
        if prefix[j] >= min_prefix:
            return True
        min_prefix = min(min_prefix, prefix[j - k + 1])
    return False
```

2. **Incorrect precision handling**
```python
# Wrong: Using integer division or insufficient iterations
left, right = min(nums), max(nums)
for _ in range(10):  # Fixed iterations, may not converge
    mid = (left + right) // 2  # Integer division!

# Correct: Use epsilon-based convergence
left, right = min(nums), max(nums)
epsilon = 1e-5
while right - left > epsilon:
    mid = (left + right) / 2.0
    if is_achievable(mid):
        left = mid
    else:
        right = mid
```

3. **Off-by-one in prefix sum indexing**
```python
# Wrong: Incorrect range for minimum prefix
min_prefix = prefix[0]
for j in range(k, n):
    if prefix[j] >= min_prefix:
        return True
    min_prefix = min(min_prefix, prefix[j])  # Wrong index!

# Correct: Track minimum among valid positions
min_prefix = 0
for j in range(k, n + 1):
    if prefix[j] >= min_prefix:
        return True
    min_prefix = min(min_prefix, prefix[j - k + 1])
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Fixed Length Maximum Average | Easy | Only consider subarrays of exactly length k |
| Minimum Average Subarray | Medium | Find minimum average instead of maximum |
| Maximum Average with Constraint | Hard | Additional constraints on subarray elements |
| K Subarrays Max Average | Hard | Split array into k subarrays, maximize total average |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solve the fixed-length version (E643) first
- [ ] Understand why binary search on answer works
- [ ] Implement the adjusted array transformation
- [ ] Trace through prefix sum validation for small example
- [ ] Handle floating-point precision correctly
- [ ] Test edge cases (k=1, k=n, all negative, all same)
- [ ] Review after 1 day: Can you recall the binary search bounds?
- [ ] Review after 1 week: Implement without looking at notes
- [ ] Review after 1 month: Solve the minimum average variation

**Strategy**: See [Array Pattern](../strategies/patterns/sliding-window.md)
