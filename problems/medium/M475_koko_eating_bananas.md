---
id: M475
old_id: A342
slug: koko-eating-bananas
title: Koko Eating Bananas
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Koko Eating Bananas

## Problem

Imagine you love bananas and have several piles in front of you. Each pile contains a different number of bananas. You have a limited amount of time to eat all of them, and you need to find the perfect eating pace.

You're given `n` banana piles where pile `i` contains `piles[i]` bananas. You have exactly `h` hours to consume all bananas before time runs out.

Here's how the eating works: You must select an eating rate `k` (bananas per hour). Each hour, you choose one pile and eat up to `k` bananas from it. If a pile has fewer than `k` bananas, you finish that pile but cannot switch to another pile during that hour (the remaining time in that hour is wasted).

Your task is to find the minimum possible eating rate `k` that allows you to eat all bananas within the `h` hour limit.

**Example thinking**: If you have piles [3, 6, 7, 11] and 8 hours, eating at rate k=4 means: pile 1 takes 1 hour, pile 2 takes 2 hours, pile 3 takes 2 hours, pile 4 takes 3 hours = 8 hours total.

## Why This Matters

This problem models real-world rate optimization scenarios in manufacturing (determining minimum production speed to meet deadlines), data processing (calculating required bandwidth to transfer files within time limits), and project management (estimating minimum team velocity to complete tasks by deadline). The binary search on answer space technique you'll learn applies to resource allocation problems, capacity planning in cloud computing (determining minimum server capacity), and service level agreement calculations where you need to meet performance targets with minimal resource consumption.

## Examples

**Example 1:**
- Input: `piles = [3,6,7,11], h = 8`
- Output: `4`

**Example 2:**
- Input: `piles = [30,11,23,4,20], h = 5`
- Output: `30`

**Example 3:**
- Input: `piles = [30,11,23,4,20], h = 6`
- Output: `23`

## Constraints

- 1 <= piles.length <= 10⁴
- piles.length <= h <= 10⁹
- 1 <= piles[i] <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a binary search on the answer space problem. The eating rate k ranges from 1 to max(piles). For any given k, you can calculate the time needed to eat all bananas. The key insight is that if rate k works, any rate > k also works (monotonic property), making binary search applicable.
</details>

<details>
<summary>🎯 Main Approach</summary>
Binary search on the eating rate k from 1 to max(piles). For each candidate k, calculate total hours needed: for each pile, it takes ceil(pile/k) hours. If total hours ≤ h, try a smaller k (search left). If total hours > h, increase k (search right). The minimum k that satisfies the condition is your answer.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
When calculating hours for a given rate k, use math.ceil(pile/k) or (pile + k - 1) // k to avoid floating point issues. The binary search runs in O(log(max_pile)) iterations, and each iteration checks all piles in O(n), giving O(n * log(max_pile)) total time complexity.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Linear Search | O(n * max_pile) | O(1) | Try each rate from 1 to max |
| Binary Search | O(n * log(max_pile)) | O(1) | Optimal approach |

## Common Mistakes

1. **Wrong binary search bounds**
   ```python
   # Wrong: Starting from 0 or not using max pile
   left, right = 0, sum(piles)

   # Correct: Rate must be at least 1, at most max pile
   left, right = 1, max(piles)
   ```

2. **Incorrect hours calculation**
   ```python
   # Wrong: Using regular division (gives float)
   hours = pile / k

   # Correct: Use ceiling division
   hours = (pile + k - 1) // k
   # Or
   import math
   hours = math.ceil(pile / k)
   ```

3. **Not handling binary search termination correctly**
   ```python
   # Wrong: Returning wrong value after loop
   return right

   # Correct: Return left (smallest valid k)
   while left < right:
       mid = (left + right) // 2
       if can_finish(mid):
           right = mid
       else:
           left = mid + 1
   return left
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Speed to Arrive on Time | Medium | Similar binary search on rate |
| Capacity To Ship Packages Within D Days | Medium | Binary search on capacity |
| Split Array Largest Sum | Hard | Binary search on maximum sum |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Binary Search](../../strategies/patterns/binary-search.md)
