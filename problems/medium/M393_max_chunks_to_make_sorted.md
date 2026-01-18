---
id: M393
old_id: A236
slug: max-chunks-to-make-sorted
title: Max Chunks To Make Sorted
difficulty: medium
category: medium
topics: ["array", "binary-search", "sorting"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
strategy_ref: ../strategies/patterns/binary-search.md
---
# Max Chunks To Make Sorted

## Problem

Given an array that is a permutation of integers from `0` to `n-1`, find the maximum number of non-overlapping chunks (contiguous segments) you can divide it into such that sorting each chunk individually and then concatenating them in order produces the fully sorted array `[0,1,2,...,n-1]`.

The key constraint here is that the array contains exactly the numbers `0` through `n-1`, each appearing once. This special property enables an elegant solution. For instance, with `[1,0,2,3,4]`, you could create one chunk `[1,0]` (which sorts to `[0,1]`) followed by three single-element chunks `[2]`, `[3]`, `[4]`, giving you 4 chunks total.

The critical insight is mathematical: in a permutation of `0` to `n-1`, if the maximum value in the subarray `arr[0...i]` equals `i`, then that subarray must contain exactly the values `{0,1,2,...,i}`. This is because you have `i+1` positions and `i+1` unique values all at most `i`. Therefore, you can safely end a chunk at position `i` whenever the running maximum equals `i`.

This differs significantly from the more general variant where the array can contain duplicates or arbitrary values. Here, the permutation property allows for a simple O(n) time, O(1) space solution using just a running maximum.

## Why This Matters

This problem teaches you to recognize and exploit mathematical properties of permutations, a skill essential for array manipulation problems. The technique appears in cycle detection algorithms, in-place array reorganization, and finding missing elements in sequences. Understanding permutation properties is crucial for solving problems involving array indexing tricks, where you use values as indices (common in problems like "First Missing Positive" or "Find All Duplicates"). The pattern of tracking running maximums against indices is also used in stock trading algorithms and in identifying optimal split points for divide-and-conquer approaches. This problem serves as an excellent introduction to recognizing when special input constraints enable dramatically simpler solutions than the general case.

## Examples

**Example 1:**
- Input: `arr = [4,3,2,1,0]`
- Output: `1`
- Explanation: Multiple segments don't produce a sorted result here.
For instance, partitioning as [4, 3], [2, 1, 0] yields [3, 4, 0, 1, 2] after sorting, which is wrong.

**Example 2:**
- Input: `arr = [1,0,2,3,4]`
- Output: `4`
- Explanation: Dividing as [1, 0], [2, 3, 4] gives 2 chunks,
but the optimal division [1, 0], [2], [3], [4] produces 4 chunks.

## Constraints

- n == arr.length
- 1 <= n <= 10
- 0 <= arr[i] < n
- All the elements of arr are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [Array Pattern](../strategies/patterns/binary-search.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Since the array is a permutation of 0 to n-1, you can end a chunk at position i if the maximum value seen so far equals i. This guarantees all values 0 through i are in the left chunk.
</details>

<details>
<summary>🎯 Main Approach</summary>
Iterate through the array while tracking the running maximum. Whenever the running maximum equals the current index, you've found a valid chunk boundary. Count these boundaries.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
This is already optimal at O(n) time and O(1) space. The key is recognizing the mathematical property: in a permutation, if max(arr[0...i]) == i, then arr[0...i] must contain exactly {0, 1, ..., i}.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check all chunking possibilities |
| Optimal | O(n) | O(1) | Single pass tracking running maximum |

## Common Mistakes

1. **Not Understanding the Permutation Property**
   ```python
   # Wrong: Trying to sort and compare
   sorted_arr = sorted(arr)
   for i in range(n):
       if arr[i] == sorted_arr[i]:
           chunks += 1

   # Correct: Use max value equals index property
   max_so_far = 0
   for i in range(n):
       max_so_far = max(max_so_far, arr[i])
       if max_so_far == i:
           chunks += 1
   ```

2. **Counting Chunks Incorrectly**
   ```python
   # Wrong: Incrementing chunks for every element
   if arr[i] <= i:
       chunks += 1

   # Correct: Only increment when max equals index
   max_so_far = max(max_so_far, arr[i])
   if max_so_far == i:
       chunks += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Max Chunks To Make Sorted II | Medium | Array contains duplicates, not a permutation |
| First Missing Positive | Hard | Finding missing element in permutation-like array |
| Find All Numbers Disappeared | Easy | Similar permutation property exploitation |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Array Mathematical Properties](../../strategies/patterns/array-manipulation.md)
