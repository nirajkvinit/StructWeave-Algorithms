---
id: M499
old_id: A375
slug: smallest-range-i
title: Smallest Range I
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Smallest Range I

## Problem

You're given an array of integers and a number `k`. You can adjust each element in the array by adding any value between `-k` and `+k` (inclusive) to it. You can only modify each element once.

The "score" is defined as the difference between the largest and smallest values in the modified array (the range or spread of the data).

Your goal: find the smallest possible score you can achieve by optimally adjusting the elements.

For example, with array `[0, 10]` and `k = 2`:
- Original score: 10 - 0 = 10
- If we add +2 to the 0 (making it 2) and add -2 to the 10 (making it 8), we get a new array `[2, 8]`
- New score: 8 - 2 = 6 (this is optimal)

With array `[1, 3, 6]` and `k = 3`:
- We could adjust to `[4, 6, 3]` but that's not optimal
- Better: adjust to `[4, 4, 4]` by adding +3, +1, and -2 respectively
- New score: 4 - 4 = 0 (perfect!)

The key insight is figuring out which adjustments minimize the spread without actually trying every possible combination.

## Why This Matters

Load balancing in distributed systems uses this exact optimization. When you have servers with different load levels (CPU usage, memory, etc.) and you can migrate tasks between them (shifting load by up to k units), you want to minimize the difference between the most and least loaded servers to achieve balanced resource utilization. The goal is finding the theoretical minimum imbalance achievable given your migration constraints.

Manufacturing quality control also applies this pattern. When measuring product dimensions (like bolt lengths or microchip tolerances), you have some ability to adjust each item within a tolerance range of ±k units during calibration. The question becomes: "What's the tightest specification range we can guarantee across our production batch?" This helps set quality standards and pricing tiers for precision parts where tighter tolerances command premium prices.

## Examples

**Example 1:**
- Input: `nums = [1], k = 0`
- Output: `0`
- Explanation: The score is max(nums) - min(nums) = 1 - 1 = 0.

**Example 2:**
- Input: `nums = [0,10], k = 2`
- Output: `6`
- Explanation: Transform to [2, 8]. Score becomes max(nums) - min(nums) = 8 - 2 = 6.

**Example 3:**
- Input: `nums = [1,3,6], k = 3`
- Output: `0`
- Explanation: Adjust to [4, 4, 4]. Score becomes max(nums) - min(nums) = 4 - 4 = 0.

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
To minimize the score (range), increase the minimum value and decrease the maximum value. Since we can add any value in [-k, k], we should add +k to the minimum and -k to the maximum to bring them closer together.
</details>

<details>
<summary>🎯 Main Approach</summary>
Find the minimum and maximum values in the array. Calculate the new potential minimum as (original_min + k) and new potential maximum as (original_max - k). The answer is max(0, new_max - new_min), since the range cannot be negative.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
This is purely a mathematical problem - you don't need to actually modify the array. Just find min and max in O(n), then compute the result with simple arithmetic in O(1).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Optimal | O(n) | O(1) | Single pass to find min/max, then simple calculation |

## Common Mistakes

1. **Forgetting the range can become zero or negative**
   ```python
   # Wrong: Not handling negative result
   new_min = min(nums) + k
   new_max = max(nums) - k
   return new_max - new_min

   # Correct: Ensure non-negative result
   new_min = min(nums) + k
   new_max = max(nums) - k
   return max(0, new_max - new_min)
   ```

2. **Trying to track individual element modifications**
   ```python
   # Wrong: Unnecessary complexity
   result = []
   for num in nums:
       # trying to decide +k or -k for each element
       result.append(num + k if num < threshold else num - k)

   # Correct: Just use min and max
   return max(0, max(nums) - k - (min(nums) + k))
   ```

3. **Not simplifying the formula**
   ```python
   # Wrong: Redundant calculation
   new_min = min(nums) + k
   new_max = max(nums) - k
   return max(0, new_max - new_min)

   # Correct: Simplified formula
   return max(0, max(nums) - min(nums) - 2 * k)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Smallest Range II | Medium | Must add OR subtract k (not any value in range) |
| Minimize Deviation in Array | Hard | Can perform operations multiple times with different constraints |
| Maximum Gap | Hard | Find maximum difference in sorted array |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithm](../../strategies/patterns/greedy.md)
