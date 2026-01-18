---
id: M415
old_id: A262
slug: number-of-subarrays-with-bounded-maximum
title: Number of Subarrays with Bounded Maximum
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Number of Subarrays with Bounded Maximum

## Problem

Given an integer array `nums` and two integers `left` and `right`, count how many contiguous subarrays have their maximum element falling within the range [left, right] (inclusive).

A subarray is any continuous portion of the array. For example, in `[2, 1, 4, 3]`, some subarrays are `[2]`, `[2, 1]`, `[1, 4, 3]`, and `[2, 1, 4, 3]`. The maximum element of a subarray is simply the largest value it contains.

The constraint is that the maximum must be at least `left` and at most `right`. So if `left = 2` and `right = 3`, a subarray with maximum 1 doesn't count (too small), and a subarray with maximum 5 doesn't count (too large). Only subarrays where the max is 2 or 3 should be counted.

The key insight is that directly checking all possible subarrays would be O(n²), but you can use a clever mathematical transformation: count(max in [left, right]) = count(max ≤ right) - count(max < left). Elements greater than `right` act as "breaking points" that divide the array into independent segments.

All test cases are designed so the answer fits within a 32-bit integer.

## Why This Matters

This problem teaches a powerful technique called the "subtraction principle" or "complement counting" - transforming a complex constraint into simpler ones that can be combined mathematically. This pattern appears frequently in counting problems, probability calculations, and database query optimization. The skill of recognizing when to split a range constraint [left, right] into two easier boundary checks (≤ right and < left) is valuable across many domains. Additionally, this problem reinforces understanding of how single-pass algorithms with pointer tracking can replace nested loops, a critical optimization technique for processing large datasets.

## Examples

**Example 1:**
- Input: `nums = [2,1,4,3], left = 2, right = 3`
- Output: `3`
- Explanation: Three valid contiguous subsequences satisfy the condition: [2], [2, 1], and [3].

**Example 2:**
- Input: `nums = [2,9,2,5,6], left = 2, right = 8`
- Output: `7`

## Constraints

- 1 <= nums.length <= 10⁵
- 0 <= nums[i] <= 10⁹
- 0 <= left <= right <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use the principle: count(max in [left, right]) = count(max <= right) - count(max < left). Transform the problem into counting subarrays with maximum <= threshold, which is easier to solve. Elements greater than right act as "boundaries" that break valid subarrays.
</details>

<details>
<summary>🎯 Main Approach</summary>
Track positions where elements exceed right (these break subarrays). Between consecutive breaking points, count all subarrays where the maximum is at least left. Use a helper function to count subarrays with max <= bound. The answer is count(max <= right) - count(max <= left-1). Alternatively, use a single-pass approach tracking the last valid position and last breaking position.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Single-pass solution: maintain two pointers - last position where nums[i] > right, and last position where nums[i] >= left. For each position, count valid subarrays ending at that position. The count is based on the distance from the last position where we saw a valid element in range [left, right]. This avoids computing the helper function twice.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check all subarrays |
| Two Helper Functions | O(n) | O(1) | Count(max <= right) - count(max < left) |
| Single Pass | O(n) | O(1) | Track last valid and breaking positions |
| Optimal | O(n) | O(1) | One pass with pointer tracking |

## Common Mistakes

1. **Checking all subarrays explicitly**
   ```python
   # Wrong: Nested loops checking each subarray
   count = 0
   for i in range(n):
       max_val = 0
       for j in range(i, n):
           max_val = max(max_val, nums[j])
           if left <= max_val <= right:
               count += 1

   # Correct: Single pass with position tracking
   count = 0
   last_valid = -1
   last_invalid = -1
   for i in range(n):
       if nums[i] > right:
           last_invalid = i
       if nums[i] >= left:
           last_valid = i
       count += last_valid - last_invalid
   ```

2. **Not handling the subtraction principle correctly**
   ```python
   # Wrong: Trying to directly count in range
   # Very complex to track both bounds simultaneously

   # Correct: Use subtraction
   def count_max_le(nums, bound):
       # count subarrays with max <= bound
       count = 0
       length = 0
       for num in nums:
           if num <= bound:
               length += 1
               count += length
           else:
               length = 0
       return count

   return count_max_le(nums, right) - count_max_le(nums, left - 1)
   ```

3. **Off-by-one errors in pointer updates**
   ```python
   # Wrong: Not properly tracking last valid position
   if nums[i] >= left and nums[i] <= right:
       count += i - last_invalid  # Missing proper tracking

   # Correct: Track both positions carefully
   if nums[i] > right:
       last_invalid = i
   if nums[i] >= left:
       last_valid = i
   count += last_valid - last_invalid
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Subarray Sum Equals K | Medium | Sum constraint instead of max |
| Count Subarrays with Score Less Than K | Hard | Product/sum hybrid scoring |
| Continuous Subarray Sum | Medium | Sum divisible by k constraint |
| Number of Smooth Descent Periods | Medium | Consecutive decreasing by 1 constraint |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Sliding Window](../../strategies/patterns/sliding-window.md)
