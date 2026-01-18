---
id: M457
old_id: A313
slug: hand-of-straights
title: Hand of Straights
difficulty: medium
category: medium
topics: ["array"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
---
# Hand of Straights

## Problem

Imagine you're organizing a deck of numbered cards into groups for a game. Each group must contain exactly `groupSize` consecutive cards - like [3, 4, 5] or [7, 8, 9, 10]. The cards in each group must be in sequential order with no gaps.

You're given an array called `hand` where each number represents a card you're holding, and an integer `groupSize` that tells you how many cards must be in each group. Your task is to determine whether you can organize all your cards into valid groups that meet these requirements.

For example, if you have cards [1, 2, 3, 6, 2, 3, 4, 7, 8] and need groups of 3, you could organize them as [1, 2, 3], [2, 3, 4], and [6, 7, 8]. Each group has exactly 3 consecutive values, and every card is used exactly once.

But if you have [1, 2, 3, 4, 5] and need groups of 4, it's impossible - you can only make one complete group [1, 2, 3, 4], leaving the 5 unused.

## Why This Matters

This problem models resource allocation with sequential constraints. In manufacturing, you might need to batch consecutive serial numbers together for quality tracking. In scheduling, you could be grouping consecutive time slots for appointments. In inventory management, you might organize products by consecutive batch codes. The greedy algorithm approach you'll use is fundamental to CPU scheduling, disk optimization algorithms, and packet routing in networks. Understanding how to validate sequential groupings is also critical in genome sequence assembly (where DNA fragments must form consecutive sequences), data compression (finding repeating patterns), and error detection codes (validating consecutive checksums).

## Examples

**Example 1:**
- Input: `hand = [1,2,3,6,2,3,4,7,8], groupSize = 3`
- Output: `true`
- Explanation: The cards can be organized into three valid groups: [1,2,3], [2,3,4], and [6,7,8]

**Example 2:**
- Input: `hand = [1,2,3,4,5], groupSize = 4`
- Output: `false`
- Explanation: These cards cannot be divided into groups of 4 consecutive values.

## Constraints

- 1 <= hand.length <= 10⁴
- 0 <= hand[i] <= 10⁹
- 1 <= groupSize <= hand.length

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
If we can form groups, we must be able to form them starting from the smallest card. Use a greedy approach: always try to form a group starting with the current smallest available card. If you can't form a complete group of consecutive cards, it's impossible.
</details>

<details>
<summary>🎯 Main Approach</summary>
Count card frequencies using a hash map or Counter. Sort the unique card values. For each smallest card still available, try to form a group by taking one card each from groupSize consecutive values. Decrease their counts. If any required card is unavailable (count = 0), return false. If all cards are used up, return true.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a sorted map (like TreeMap in Java or SortedDict in Python) to automatically maintain sorted order while updating counts. This eliminates the need to repeatedly find the minimum. Alternatively, use a min-heap to always get the smallest available card efficiently.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Try all permutations) | O(n!) | O(n) | Way too slow, exponential |
| Greedy with Sorting | O(n log n) | O(n) | Sort once, then greedy selection |
| Optimal (SortedDict/TreeMap) | O(n log k) where k = unique cards | O(n) | Efficient sorted structure |

## Common Mistakes

1. **Not starting from the smallest card**
   ```python
   # Wrong: Processing cards in arbitrary order
   for card in hand:
       # Try to form group starting here
       # May fail when groups should start from smaller cards

   # Correct: Always start from minimum
   from collections import Counter
   count = Counter(hand)
   sorted_cards = sorted(count.keys())
   for card in sorted_cards:
       while count[card] > 0:
           for i in range(groupSize):
               if count[card + i] == 0:
                   return False
               count[card + i] -= 1
   ```

2. **Forgetting to check total card count**
   ```python
   # Wrong: Not validating divisibility first
   if len(hand) < groupSize:
       # Should also check if divisible

   # Correct: Quick validity check
   if len(hand) % groupSize != 0:
       return False
   ```

3. **Inefficiently finding next minimum card**
   ```python
   # Wrong: Searching for minimum each time
   while count:
       min_card = min(count.keys())  # O(k) each time
       # Process min_card

   # Correct: Use sorted structure or sort once
   sorted_cards = sorted(count.keys())
   for card in sorted_cards:
       if count[card] > 0:
           # Process card
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Divide Array in Sets of K Consecutive | Medium | Same problem, different wording |
| Maximum Groups | Hard | Find maximum number of valid groups (not all cards used) |
| Groups with Gaps | Hard | Allow gaps of at most d in consecutive sequences |
| Card Game with Jokers | Hard | Wild cards can represent any value |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
