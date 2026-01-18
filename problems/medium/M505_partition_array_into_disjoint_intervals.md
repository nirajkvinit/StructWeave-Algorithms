---
id: M505
old_id: A382
slug: partition-array-into-disjoint-intervals
title: Partition Array into Disjoint Intervals
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Partition Array into Disjoint Intervals

## Problem

You need to split an integer array `nums` into two consecutive sections with a special property: every value in the left section must be less than or equal to every value in the right section.

Think of it as dividing a dataset into two groups where one group contains only "small" values and the other contains only "large" values, with no overlap in their ranges.

More specifically, you're looking for an index where you can split the array such that:
- The left section is `nums[0]` through `nums[i]`
- The right section is `nums[i+1]` through `nums[n-1]`
- `max(left section) <= min(right section)`
- Both sections must have at least one element
- The left section should be as small as possible

Return the length of the left section for the optimal split.

For example, with `[5, 0, 3, 8, 6]`:
- If we split at index 2: left = `[5, 0, 3]` (max=5), right = `[8, 6]` (min=6)
- This works because 5 <= 6
- Splitting earlier wouldn't work: left = `[5, 0]` (max=5), right = `[3, 8, 6]` (min=3), and 5 > 3

You're guaranteed that at least one valid partition exists.

## Why This Matters

This problem models data partitioning challenges in distributed systems and database design. When sharding a database, you often want to split records into ranges where one shard handles all values below a threshold and another handles values above it. Search engines use similar concepts when partitioning inverted indexes across multiple servers - ensuring that terms are distributed such that each server's data has non-overlapping ranges allows for efficient query routing. Understanding how to find optimal partition points also helps in parallel processing scenarios where you want to divide work such that one processor handles a "low range" and another handles a "high range" with minimal overlap or communication needed.

## Examples

**Example 1:**
- Input: `nums = [5,0,3,8,6]`
- Output: `3`
- Explanation: left = [5,0,3], right = [8,6]

**Example 2:**
- Input: `nums = [1,1,1,0,6,12]`
- Output: `4`
- Explanation: left = [1,1,1,0], right = [6,12]

## Constraints

- 2 <= nums.length <= 10⁵
- 0 <= nums[i] <= 10⁶
- There is at least one valid answer for the given input.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
For a valid partition at index i, the maximum of the left part must be less than or equal to the minimum of the right part. Pre-compute these values to avoid recalculating for each potential split point.
</details>

<details>
<summary>🎯 Main Approach</summary>
Create two arrays: max_left[i] stores the maximum value from index 0 to i, and min_right[i] stores the minimum value from index i to end. Iterate through potential partition points and find the first index where max_left[i] <= min_right[i+1].
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can solve this with a single pass and O(1) extra space by tracking the maximum of the left partition while iterating. Keep track of the overall maximum seen so far and the maximum of the committed left partition, updating when the current position could be a valid split.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check each partition by scanning left and right |
| Two arrays preprocessing | O(n) | O(n) | Pre-compute max_left and min_right arrays |
| Optimal single pass | O(n) | O(1) | Track maximums while iterating |

## Common Mistakes

1. **Not building the min_right array correctly**
   ```python
   # Wrong: Building from left to right
   min_right = [0] * n
   for i in range(n):
       min_right[i] = min(nums[i], min_right[i-1] if i > 0 else float('inf'))

   # Correct: Build from right to left
   min_right = [0] * n
   min_right[-1] = nums[-1]
   for i in range(n - 2, -1, -1):
       min_right[i] = min(nums[i], min_right[i + 1])
   ```

2. **Off-by-one error in partition checking**
   ```python
   # Wrong: Comparing same partition elements
   for i in range(n):
       if max_left[i] <= min_right[i]:
           return i + 1

   # Correct: Compare left part with right part
   for i in range(n - 1):
       if max_left[i] <= min_right[i + 1]:
           return i + 1
   ```

3. **Not ensuring minimum partition size**
   ```python
   # Wrong: Could return 0 (empty left partition)
   for i in range(n):
       if max_left[i] <= min_right[i + 1]:
           return i

   # Correct: Start from index 0 (size 1 minimum)
   for i in range(n - 1):
       if max_left[i] <= min_right[i + 1]:
           return i + 1  # return size, not index
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Partition Array for Maximum Sum | Medium | Maximize sum instead of finding disjoint intervals |
| Maximum Gap | Hard | Find maximum difference in sorted array |
| Split Array Largest Sum | Hard | Partition into k subarrays minimizing largest sum |
| Best Time to Buy and Sell Stock III | Hard | Similar prefix/suffix max/min concept |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Prefix/Suffix Arrays](../../strategies/patterns/prefix-sum.md)
