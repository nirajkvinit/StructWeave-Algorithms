---
id: H055
old_id: I129
slug: patching-array
title: Patching Array
difficulty: hard
category: hard
topics: ["array"]
patterns: ["backtrack-combination"]
estimated_time_minutes: 45
---
# Patching Array

## Problem

You have a sorted integer array `nums` and a target integer `n`. Your objective is to determine the minimum number of elements you need to insert into the array so that every integer from `1` to `n` (inclusive) can be created by summing some subset of elements from the modified array.

Return the smallest count of insertions needed.

## Why This Matters

Arrays serve as fundamental building blocks in algorithm design. This challenge hones your ability to work with ordered sequences and optimize data manipulation.

## Examples

**Example 1:**
- Input: `nums = [1,3], n = 6`
- Output: `1`
- Explanation: Using the original array, we can form sums: 1, 3, and 4 (from combining 1+3). By inserting the value 2, we can now create all sums from 1 to 6: we get 1, 2, 3, 4 (1+3), 5 (2+3), and 6 (1+2+3). Only one insertion is necessary.

**Example 2:**
- Input: `nums = [1,5,10], n = 20`
- Output: `2`
- Explanation: Adding two values such as [2, 4] enables coverage of the entire range.

**Example 3:**
- Input: `nums = [1,2,2], n = 5`
- Output: `0`

## Constraints

- 1 <= nums.length <= 1000
- 1 <= nums[i] <= 10⁴
- nums is sorted in **ascending order**.
- 1 <= n <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Maintain a variable representing the smallest number you cannot form yet (call it "miss"). If nums[i] <= miss, adding nums[i] extends your range to [1, miss + nums[i] - 1]. If nums[i] > miss, you need to patch with "miss" itself, which doubles your range to [1, 2*miss - 1].
</details>

<details>
<summary>🎯 Main Approach</summary>
Start with miss = 1 (can't form 1 yet). Iterate through nums: if current num <= miss, use it (miss += num), otherwise patch with miss (miss += miss, patches++). Continue until miss > n. The greedy choice of always patching with "miss" gives optimal coverage because it maximizes the range extension.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You don't need to track actual sums or subsets - just track the boundary (miss). When you patch with value x, you can form all values in [x, 2x-1] if you could already form [1, x-1]. Use long/int64 for miss to avoid overflow as it can grow exponentially.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(2^n × n) | O(n) | Check all subsets and their sums |
| Greedy with Range Tracking | O(m + log n) | O(1) | m = nums.length, log n patches worst case |

## Common Mistakes

1. **Not handling the case when nums[i] > miss**
   ```python
   # Wrong: Only using existing numbers
   for num in nums:
       if num <= miss:
           miss += num

   # Correct: Patch when there's a gap
   i = 0
   while miss <= n:
       if i < len(nums) and nums[i] <= miss:
           miss += nums[i]
           i += 1
       else:
           miss += miss  # Patch with miss
           patches += 1
   ```

2. **Integer overflow with miss variable**
   ```python
   # Wrong: Using 32-bit integer
   miss = 1  # In languages like Java/C++, int may overflow

   # Correct: Use long integer
   miss = 1  # In Python, auto-handled
   # In Java/C++: long miss = 1;
   ```

3. **Incorrect termination condition**
   ```python
   # Wrong: Processing all numbers even after reaching n
   for num in nums:
       if num <= miss:
           miss += num

   # Correct: Stop when miss > n
   while miss <= n:
       if i < len(nums) and nums[i] <= miss:
           miss += nums[i]
           i += 1
       else:
           miss += miss
           patches += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Patches to Make Target Sum | Medium | Similar greedy approach |
| Coin Change | Medium | Related subset sum problem |
| Partition Equal Subset Sum | Medium | Different subset sum constraint |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
