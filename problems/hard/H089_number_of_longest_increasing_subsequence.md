---
id: H089
old_id: A140
slug: number-of-longest-increasing-subsequence
title: Number of Longest Increasing Subsequence
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Number of Longest Increasing Subsequence

## Problem

Given an integer array `nums`, count how many strictly increasing subsequences have the maximum possible length.

Note that "strictly increasing" means each element must be greater than the previous one (not just greater than or equal).

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `nums = [1,3,5,4,7]`
- Output: `2`
- Explanation: There are two subsequences with the maximum length: [1, 3, 4, 7] and [1, 3, 5, 7].

**Example 2:**
- Input: `nums = [2,2,2,2,2]`
- Output: `5`
- Explanation: The maximum length of any strictly increasing subsequence is 1, and there are 5 such single-element subsequences.

## Constraints

- 1 <= nums.length <= 2000
- -10⁶ <= nums[i] <= 10⁶

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This extends the classic Longest Increasing Subsequence (LIS) problem. Instead of just tracking the length of LIS ending at each position, you also need to track how many LIS sequences of that length end at that position. When extending a sequence, the count accumulates from all positions that can extend to the current position with the same optimal length.
</details>

<details>
<summary>Main Approach</summary>
Use two arrays: lengths[i] = length of LIS ending at i, and counts[i] = number of LIS of that length ending at i. For each position i, check all previous positions j where nums[j] < nums[i]. If extending from j gives a longer sequence, update both length and count. If it equals the current max length, add the count from j to count[i].
</details>

<details>
<summary>Optimization Tip</summary>
The basic DP is O(n^2). For very large inputs, you can optimize to O(n log n) using a segment tree or binary indexed tree to maintain both lengths and counts, though this is significantly more complex. For the given constraints (n ≤ 2000), O(n^2) is acceptable.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(2^n) | O(n) | Generate all subsequences, check each |
| DP (two arrays) | O(n^2) | O(n) | Track length and count at each position |
| Optimized DP | O(n log n) | O(n) | Using segment tree/BIT, complex implementation |

## Common Mistakes

1. **Only tracking length without count**
   ```python
   # Wrong: Standard LIS only finds length
   lengths = [1] * n
   for i in range(n):
       for j in range(i):
           if nums[j] < nums[i]:
               lengths[i] = max(lengths[i], lengths[j] + 1)
   # Missing: count tracking

   # Correct: Track both length and count
   lengths = [1] * n
   counts = [1] * n
   for i in range(n):
       for j in range(i):
           if nums[j] < nums[i]:
               if lengths[j] + 1 > lengths[i]:
                   lengths[i] = lengths[j] + 1
                   counts[i] = counts[j]
               elif lengths[j] + 1 == lengths[i]:
                   counts[i] += counts[j]
   ```

2. **Not accumulating counts correctly**
   ```python
   # Wrong: Overwriting count instead of accumulating
   if lengths[j] + 1 == lengths[i]:
       counts[i] = counts[j]  # Should add, not replace

   # Correct: Accumulate counts from all paths
   if lengths[j] + 1 == lengths[i]:
       counts[i] += counts[j]
   ```

3. **Incorrect final count aggregation**
   ```python
   # Wrong: Only returning the last count
   max_len = max(lengths)
   return counts[lengths.index(max_len)]

   # Correct: Sum counts for all positions with max length
   max_len = max(lengths)
   return sum(counts[i] for i in range(n) if lengths[i] == max_len)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Longest Increasing Subsequence | Medium | Only find length, not count |
| Longest Increasing Path in Matrix | Hard | 2D version of LIS |
| Russian Doll Envelopes | Hard | LIS with 2D constraints |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming - Subsequences](../../strategies/patterns/dynamic-programming.md)
