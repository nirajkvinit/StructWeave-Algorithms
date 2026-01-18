---
id: M501
old_id: A377
slug: smallest-range-ii
title: Smallest Range II
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Smallest Range II

## Problem

Imagine you're a data analyst trying to normalize a dataset. You have an array of integers called `nums`, and you need to adjust each value to make the range (the difference between the largest and smallest values) as small as possible.

Here's the catch: for each number in the array, you must either add `k` to it or subtract `k` from it. You can't leave any number unchanged, and you can't use any other adjustment value.

The **score** of your adjusted array is the difference between its maximum and minimum values: `max(adjusted) - min(adjusted)`.

Your goal is to determine the minimum possible score you can achieve after transforming every element in the array.

For example, if you have `nums = [0, 10]` and `k = 2`, you could:
- Add 2 to both: `[2, 12]` giving a score of 10
- Subtract 2 from both: `[-2, 8]` giving a score of 10
- Add 2 to the first and subtract 2 from the second: `[2, 8]` giving a score of 6 (optimal)

## Why This Matters

This problem models real-world data normalization challenges found in machine learning and statistical analysis. When preprocessing data from different sources with varying scales, you might need to apply uniform transformations to minimize variance. For instance, sensor calibration systems often need to adjust readings by fixed offsets to minimize the spread of measurements, helping identify whether discrepancies come from genuine signal differences or just calibration drift. Understanding optimal partitioning strategies helps you make better decisions about how to standardize data while preserving its meaningful structure.

## Examples

**Example 1:**
- Input: `nums = [1], k = 0`
- Output: `0`
- Explanation: The score is max(nums) - min(nums) = 1 - 1 = 0.

**Example 2:**
- Input: `nums = [0,10], k = 2`
- Output: `6`
- Explanation: Modified array becomes [2, 8]. Resulting score: max(nums) - min(nums) = 8 - 2 = 6.

**Example 3:**
- Input: `nums = [1,3,6], k = 3`
- Output: `3`
- Explanation: Optimal transformation yields [4, 6, 3]. Score: max(nums) - min(nums) = 6 - 3 = 3.

## Constraints

- 1 <= nums.length <= 10⁴
- 0 <= nums[i] <= 10⁴
- 0 <= k <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
After sorting, there's a partition point where all elements to the left are increased by k and all to the right are decreased by k. The optimal solution involves trying all possible partition points and finding the minimum range.
</details>

<details>
<summary>🎯 Main Approach</summary>
Sort the array first. For each position i, assume elements [0...i] get +k and elements [i+1...n-1] get -k. The new maximum is max(nums[i] + k, nums[n-1] - k) and new minimum is min(nums[0] + k, nums[i+1] - k). Try all partitions and return the minimum score.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Edge case: if all elements get the same operation (+k or -k), the range remains unchanged. This happens when the partition is at the start (all -k) or end (all +k). The answer is min of this unchanged range and all partition attempts.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(2^n) | O(1) | Try all 2^n combinations of +k/-k |
| Optimal (Sorted + Partition) | O(n log n) | O(1) | Sort once, try n partitions |

## Common Mistakes

1. **Not sorting the array first**
   ```python
   # Wrong: Trying partitions on unsorted array
   for i in range(len(nums) - 1):
       new_max = max(nums[i] + k, nums[-1] - k)
       new_min = min(nums[0] + k, nums[i+1] - k)

   # Correct: Sort first
   nums.sort()
   for i in range(len(nums) - 1):
       new_max = max(nums[i] + k, nums[-1] - k)
       new_min = min(nums[0] + k, nums[i+1] - k)
   ```

2. **Wrong calculation of new min/max after partition**
   ```python
   # Wrong: Not considering all possibilities
   new_max = nums[i] + k
   new_min = nums[i+1] - k

   # Correct: Max could be from right side, min from left
   new_max = max(nums[i] + k, nums[-1] - k)
   new_min = min(nums[0] + k, nums[i+1] - k)
   ```

3. **Forgetting the base case (no partition)**
   ```python
   # Wrong: Only checking partitions
   result = float('inf')
   for i in range(len(nums) - 1):
       # calculate score

   # Correct: Consider the original range too
   nums.sort()
   result = nums[-1] - nums[0]  # base case
   for i in range(len(nums) - 1):
       # calculate and update result
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Smallest Range I | Easy | Can add any value in [-k, k] instead of exactly +k or -k |
| Minimize Deviation in Array | Hard | Different operations (divide even by 2, multiply odd by 2) |
| Minimum Difference in K Pairs | Medium | Select k pairs instead of modifying all elements |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithm](../../strategies/patterns/greedy.md)
