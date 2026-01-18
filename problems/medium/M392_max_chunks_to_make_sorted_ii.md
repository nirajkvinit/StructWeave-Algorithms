---
id: M392
old_id: A235
slug: max-chunks-to-make-sorted-ii
title: Max Chunks To Make Sorted II
difficulty: medium
category: medium
topics: ["array", "binary-search", "sorting"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/patterns/binary-search.md
---
# Max Chunks To Make Sorted II

## Problem

Given an array of integers, find the maximum number of non-overlapping chunks (contiguous segments) you can divide it into, such that sorting each chunk individually and then concatenating them produces the fully sorted array.

Think of this as partitioning a shuffled deck of cards into piles where, if you sort each pile separately and then stack them in order, you get a perfectly sorted deck. For example, with `[5,4,3,2,1]`, you must keep all elements in one chunk because any split would fail. If you tried `[5,4]` and `[3,2,1]`, sorting each gives `[4,5]` and `[1,2,3]`, which concatenates to `[4,5,1,2,3]` - not sorted.

The key insight is recognizing valid chunk boundaries: you can end a chunk at position `i` if and only if the maximum element in `arr[0...i]` is less than or equal to the minimum element in `arr[i+1...n-1]`. This ensures that after sorting, no element from the left chunk will need to move past elements in the right chunk. Unlike the simpler variant where the array is a permutation of `0` to `n-1`, this version handles duplicates and arbitrary integer values, requiring a more sophisticated boundary detection approach.

Note the critical difference from the variant problem: here the array can contain duplicates and any integer values, not just a permutation. This means you cannot simply track running maximums against indices.

## Why This Matters

This problem builds essential skills in recognizing array partitioning patterns, which appear in distributed computing systems where you need to split data across machines while preserving sortability. It also relates to merge sort optimization, where identifying pre-sorted segments allows you to skip unnecessary merge operations. The technique of precomputing prefix maximums and suffix minimums is a foundational pattern used in stock trading algorithms (finding maximum profit windows) and in database query optimization for range partitioning. Understanding when to use auxiliary arrays versus single-pass algorithms with stacks helps you balance time and space complexity tradeoffs in real systems.

## Examples

**Example 1:**
- Input: `arr = [5,4,3,2,1]`
- Output: `1`
- Explanation: Dividing into multiple segments doesn't work here.
If we partition as [5, 4], [3, 2, 1], sorting each gives [4, 5, 1, 2, 3], which is incorrect.

**Example 2:**
- Input: `arr = [2,1,3,4,4]`
- Output: `4`
- Explanation: While [2, 1], [3, 4, 4] works as a 2-chunk division,
the maximum segmentation is [2, 1], [3], [4], [4] with 4 chunks total.

## Constraints

- 1 <= arr.length <= 2000
- 0 <= arr[i] <= 10⁸

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [Array Pattern](../strategies/patterns/binary-search.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
A chunk can end at position i if the maximum element in arr[0...i] is less than or equal to the minimum element in arr[i+1...n-1]. This ensures sorting the chunk won't affect elements after it.
</details>

<details>
<summary>🎯 Main Approach</summary>
Precompute two arrays: maxLeft[i] storing the maximum from arr[0...i], and minRight[i] storing the minimum from arr[i...n-1]. A chunk boundary exists at i if maxLeft[i] <= minRight[i+1].
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a monotonic stack to track potential chunk boundaries, or compute running max and compare against sorted suffix minimums for a cleaner single-pass solution.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check all possible chunking combinations |
| Prefix/Suffix Arrays | O(n) | O(n) | Precompute max left and min right |
| Optimal | O(n) | O(n) | Single pass with auxiliary arrays |

## Common Mistakes

1. **Comparing with Sorted Array Incorrectly**
   ```python
   # Wrong: Checking if current position equals sorted position
   if arr[i] == sorted_arr[i]:
       chunks += 1

   # Correct: Check if max left <= min right
   if max_left[i] <= min_right[i + 1]:
       chunks += 1
   ```

2. **Not Handling Duplicate Elements**
   ```python
   # Wrong: Using strict less-than comparison
   if max_left[i] < min_right[i + 1]:
       chunks += 1

   # Correct: Use <= to handle duplicates properly
   if max_left[i] <= min_right[i + 1]:
       chunks += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Max Chunks To Make Sorted (I) | Medium | Array is permutation of 0 to n-1 |
| Partition Labels | Medium | String partitioning with character containment |
| Split Array Into Consecutive Subsequences | Medium | Creating sorted subsequences with length constraint |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Array Prefix/Suffix Patterns](../../strategies/patterns/prefix-sum.md)
