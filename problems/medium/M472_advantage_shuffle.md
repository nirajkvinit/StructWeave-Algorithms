---
id: M472
old_id: A337
slug: advantage-shuffle
title: Advantage Shuffle
difficulty: medium
category: medium
topics: ["array"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
---
# Advantage Shuffle

## Problem

Imagine a strategic card game where you have a deck of cards with various values, and your opponent has laid out their cards. Your goal is to arrange your cards to beat as many of their cards as possible.

You receive two equal-length integer arrays: `nums1` (your cards) and `nums2` (opponent's cards). The **advantage score** counts how many positions satisfy `nums1[i] > nums2[i]` after arrangement.

Your challenge is to rearrange `nums1` to maximize your advantage score against the fixed `nums2`. Return any permutation of `nums1` that achieves the maximum score.

**Example scenario**: If you have [2, 7, 11, 15] and your opponent has [1, 10, 4, 11], you want to use your 2 to beat their 1, your 11 to beat their 10, and so on.

## Why This Matters

This problem is inspired by the ancient Chinese "Tian Ji horse racing" strategy, where resource allocation and competitive matching are key. It appears in real-world scenarios like auction bidding systems (matching bids strategically), sports tournament seeding (pairing competitors optimally), and task assignment algorithms (matching worker skills to job requirements). The greedy matching strategy you'll develop here is fundamental to optimization problems in operations research and game theory.

## Examples

**Example 1:**
- Input: `nums1 = [2,7,11,15], nums2 = [1,10,4,11]`
- Output: `[2,11,7,15]`

**Example 2:**
- Input: `nums1 = [12,24,8,32], nums2 = [13,25,32,11]`
- Output: `[24,32,8,12]`

## Constraints

- 1 <= nums1.length <= 10⁵
- nums2.length == nums1.length
- 0 <= nums1[i], nums2[i] <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is similar to the "Tian Ji horse racing" strategy: use your weakest resources to counter the opponent's strongest when you can't win, and use your slightly better resources to counter their weaker ones. The greedy approach is to sort both arrays and assign the smallest nums1 value that beats each nums2 value.
</details>

<details>
<summary>🎯 Main Approach</summary>
Sort nums1. Create a sorted list of (value, index) pairs for nums2 to track original positions. Use two pointers: one for unused nums1 elements, and iterate through sorted nums2. For each nums2 element, try to beat it with the smallest nums1 value that's larger. If no such value exists, use the smallest remaining nums1 value (you're "sacrificing" it). Build the result array respecting original nums2 indices.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a deque or two pointers on sorted nums1 to efficiently assign values. When you can't beat nums2[i], take from the front of nums1 (smallest). When you can beat it, take the smallest value that wins. Track original indices of nums2 to place results correctly. This achieves O(n log n) time.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n! * n) | O(n) | Try all permutations |
| Greedy Sort | O(n log n) | O(n) | Optimal solution |

## Common Mistakes

1. **Losing track of original indices**
   ```python
   # Wrong: Sorting nums2 directly loses index information
   nums2.sort()

   # Correct: Pair values with indices before sorting
   sorted_nums2 = sorted(enumerate(nums2), key=lambda x: x[1])
   result = [0] * len(nums2)
   for orig_idx, val in sorted_nums2:
       result[orig_idx] = assigned_value
   ```

2. **Greedy assignment without sorting**
   ```python
   # Wrong: Trying to match without sorting
   for i in range(len(nums2)):
       for j in range(len(nums1)):
           if nums1[j] > nums2[i]:
               result[i] = nums1[j]
               break

   # Correct: Sort both arrays first
   nums1.sort()
   sorted_nums2 = sorted(enumerate(nums2), key=lambda x: x[1])
   # Then apply greedy strategy
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Assign Cookies | Easy | Simple greedy matching |
| Boats to Save People | Medium | Two-pointer greedy strategy |
| Maximize Sum of Array After K Negations | Easy | Greedy with modifications |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
