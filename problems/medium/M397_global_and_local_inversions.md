---
id: M397
old_id: A242
slug: global-and-local-inversions
title: Global and Local Inversions
difficulty: medium
category: medium
topics: ["array"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
---
# Global and Local Inversions

## Problem

Given an array that is a permutation of integers from `0` to `n-1`, determine whether the number of global inversions equals the number of local inversions.

First, understand the definitions. A global inversion is any pair of indices `(i, j)` where `i < j` and `nums[i] > nums[j]` - essentially, any out-of-order pair when reading left to right. A local inversion is the special case where `i` and `j` are adjacent: `nums[i] > nums[i+1]`.

Notice the key relationship: every local inversion is automatically a global inversion (since adjacent positions satisfy `i < j`). The question therefore simplifies to: "Are there any global inversions that are NOT local?" If you find even one pair where `nums[i] > nums[j]` with `j - i > 1`, then global inversions exceed local inversions, and the answer is false.

For example, in `[1,0,2]`, there's one global inversion (position 0 and 1, since 1 > 0) which is also local (they're adjacent), so the answer is true. But in `[1,2,0]`, there are two global inversions: (0,2) since 1>0 and (1,2) since 2>0. Only one is local (position 1 and 2), so the answer is false.

The elegant insight for a permutation of `0` to `n-1`: if every element is within distance 1 of its sorted position (meaning `|nums[i] - i| <= 1`), then no non-local global inversions can exist.

## Why This Matters

This problem teaches you to recognize subset relationships between conditions - identifying that one definition encompasses another leads to dramatic simplification. The technique of finding non-local inversions by tracking running maximums appears in merge sort's inversion counting (used in collaborative filtering algorithms to measure ranking similarity). Understanding inversion parity is crucial for problems involving permutation reachability, like determining if you can sort an array using only adjacent swaps or solving the 15-puzzle game. The mathematical insight that `|nums[i] - i| <= 1` characterizes valid permutations demonstrates how exploiting special input properties (here, that it's a permutation) can reduce complex O(n²) counting to O(n) checking. This pattern recognition skill is valuable across algorithm design.

## Examples

**Example 1:**
- Input: `nums = [1,0,2]`
- Output: `true`
- Explanation: There is 1 global inversion and 1 local inversion.

**Example 2:**
- Input: `nums = [1,2,0]`
- Output: `false`
- Explanation: There are 2 global inversions and 1 local inversion.

## Constraints

- n == nums.length
- 1 <= n <= 10⁵
- 0 <= nums[i] < n
- All the integers of nums are **unique**.
- nums is a permutation of all the numbers in the range [0, n - 1].

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Every local inversion is also a global inversion. The question becomes: are there any global inversions that are NOT local? If yes, return false. This happens when nums[i] > nums[j] where j - i > 1.
</details>

<details>
<summary>🎯 Main Approach</summary>
Track the maximum value seen so far, but check it against elements at least 2 positions ahead. If max(nums[0...i]) > nums[i+2], you've found a non-local global inversion.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Since the array is a permutation of 0 to n-1, an even simpler check: nums[i] should differ from i by at most 1. If |nums[i] - i| > 1, there must be a non-local global inversion.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Count both types of inversions separately |
| Max Tracking | O(n) | O(1) | Track max and check 2 positions ahead |
| Optimal | O(n) | O(1) | Check if |nums[i] - i| <= 1 for all i |

## Common Mistakes

1. **Actually Counting Inversions**
   ```python
   # Wrong: Counting is unnecessary and slow
   global_inv = sum(1 for i in range(n) for j in range(i+1, n) if nums[i] > nums[j])
   local_inv = sum(1 for i in range(n-1) if nums[i] > nums[i+1])
   return global_inv == local_inv

   # Correct: Just check if non-local global exists
   for i in range(len(nums) - 2):
       if nums[i] > nums[i + 2]:
           return False
   return True
   ```

2. **Not Understanding Set Relationship**
   ```python
   # Wrong: Checking if counts are different
   if global_count > local_count:
       return False

   # Correct: Check if there exists any non-local global
   for i in range(n):
       if abs(nums[i] - i) > 1:
           return False
   return True
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Count of Smaller Numbers After Self | Hard | Actually counting inversions efficiently |
| Reverse Pairs | Hard | Counting pairs where nums[i] > 2*nums[j] |
| Count Inversions in Array | Medium | Classic inversion counting with merge sort |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Array Mathematical Properties](../../strategies/patterns/array-manipulation.md)
