---
id: M420
old_id: A268
slug: minimum-swaps-to-make-sequences-increasing
title: Minimum Swaps To Make Sequences Increasing
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Minimum Swaps To Make Sequences Increasing

## Problem

You are given two integer arrays `nums1` and `nums2` of equal length. In a single operation, you can swap the values at the same index `i` between the two arrays. For example, if `nums1 = [1,2,3,8]` and `nums2 = [5,6,7,4]`, swapping at index 3 transforms them into `nums1 = [1,2,3,4]` and `nums2 = [5,6,7,8]`.

Your goal is to find the minimum number of swaps needed to make both arrays strictly increasing. An array is strictly increasing when each element is greater than the previous one: `arr[0] < arr[1] < arr[2] < ... < arr[n-1]`.

The problem guarantees that a solution always exists - there is always some sequence of swaps that will make both arrays strictly increasing.

The challenge is that swapping at one position affects the values available at that position for both arrays, which in turn affects what swaps are valid at subsequent positions. For instance, if you swap at index 2, you change which values appear at position 2, which constrains what must happen at position 3 to maintain the increasing property.

At each position, you have two choices: swap or don't swap. The optimal decision depends on what you did at the previous position, making this a dynamic programming problem where you track two states at each step.

## Why This Matters

This problem exemplifies constrained optimization with interdependent decisions. The pattern appears in sequence alignment problems in bioinformatics, resource allocation across parallel systems, scheduling tasks on multiple machines, and state-based planning where each action affects future options. The key insight - tracking separate states for different choices at each step - is fundamental to dynamic programming. Many optimization problems become tractable once you identify that you don't need to remember the entire history, just the relevant state (here, whether you swapped at the previous position). This dimensionality reduction technique is crucial for making exponential search spaces solvable in polynomial time.

## Examples

**Example 1:**
- Input: `nums1 = [1,3,5,4], nums2 = [1,2,3,7]`
- Output: `1`
- Explanation: Exchanging elements at index 3 yields:
nums1 = [1, 3, 5, 7] and nums2 = [1, 2, 3, 4]
Both arrays now satisfy the strictly increasing condition.

**Example 2:**
- Input: `nums1 = [0,3,5,8,9], nums2 = [2,1,4,6,9]`
- Output: `1`

## Constraints

- 2 <= nums1.length <= 10⁵
- nums2.length == nums1.length
- 0 <= nums1[i], nums2[i] <= 2 * 10⁵

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
At each position i, you have two choices: swap or don't swap. The decision depends on what you did at position i-1. This is a dynamic programming problem where you track two states: the minimum swaps needed if you swap at position i, and the minimum swaps needed if you don't swap at position i. The key is recognizing that both arrays must be strictly increasing after all swaps.
</details>

<details>
<summary>Main Approach</summary>
Use DP with two variables: keep[i] = minimum swaps to make arrays strictly increasing up to index i without swapping at i, and swap[i] = minimum swaps if we swap at position i. At each position, check if the natural order is valid (nums1[i] > nums1[i-1] and nums2[i] > nums2[i-1]), and if the swapped order is valid (nums1[i] > nums2[i-1] and nums2[i] > nums1[i-1]). Update keep and swap accordingly.
</details>

<details>
<summary>Optimization Tip</summary>
You only need to track the previous state, so you can use O(1) space instead of O(n) arrays. Use two variables for the previous position's keep and swap values, and update them as you iterate through the arrays. This space optimization doesn't change the time complexity but reduces memory usage.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| DP with arrays | O(n) | O(n) | Track keep/swap states for each position |
| Optimal (Space Optimized) | O(n) | O(1) | Only track previous state values |

## Common Mistakes

1. **Not considering both swap conditions**
   ```python
   # Wrong: Only checking natural order
   if nums1[i] > nums1[i-1] and nums2[i] > nums2[i-1]:
       keep[i] = keep[i-1]

   # Correct: Check both natural and swapped order
   if nums1[i] > nums1[i-1] and nums2[i] > nums2[i-1]:
       keep[i] = keep[i-1]
       swap[i] = swap[i-1] + 1
   if nums1[i] > nums2[i-1] and nums2[i] > nums1[i-1]:
       keep[i] = min(keep[i], swap[i-1])
       swap[i] = min(swap[i], keep[i-1] + 1)
   ```

2. **Wrong initialization**
   ```python
   # Wrong: Starting with zeros
   keep = [0] * n
   swap = [0] * n

   # Correct: Initialize swap[0] to 1 (cost of first swap)
   keep = [0] * n
   swap = [1] * n
   ```

3. **Forgetting that solution always exists**
   ```python
   # Wrong: Checking if solution is possible
   if keep[-1] == float('inf'):
       return -1

   # Correct: Problem guarantees solution exists
   return min(keep[-1], swap[-1])
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Make Array Strictly Increasing | Hard | Can replace elements from another array |
| Longest Increasing Subsequence | Medium | Find longest increasing subseq, not all elements |
| Minimum Deletions to Make Array Sorted | Medium | Remove elements instead of swapping |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
