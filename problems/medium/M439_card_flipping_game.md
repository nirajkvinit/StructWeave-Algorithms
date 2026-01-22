---
id: M439
old_id: A289
slug: card-flipping-game
title: Card Flipping Game
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Card Flipping Game

## Problem

You have `n` double-sided cards laid on a table, each showing a number on the front and a possibly different number on the back. The fronts are stored in array `fronts` and backs in array `backs`, where card `i` has `fronts[i]` on one side and `backs[i]` on the reverse.

You can flip any subset of cards (including none or all of them). After flipping, some numbers will be face-up and others face-down. A number is called "good" if it appears face-down on at least one card but doesn't appear face-up on any card. Your goal is to find the smallest good number possible through optimal flipping, or return 0 if no such number exists.

Here's the crucial insight: if a card has the same number on both sides (like `fronts[i] = backs[i] = 5`), that number can never be good. No matter whether you flip that card or not, the number 5 will always be visible. This creates an exclusion set of numbers that are automatically disqualified.

For all other numbers (those that don't appear on both sides of the same card), you can potentially make them good by flipping cards appropriately. For example, if the number 2 appears on the back of one card and the front of a different card, you can flip the first card to hide it and flip the second card to reveal its back, making 2 face-down everywhere.

The problem reduces to: identify all numbers that appear on both sides of any single card (these are banned), then find the minimum number from all remaining numbers that appear anywhere in either array.

## Why This Matters

Constraint satisfaction problems with exclusion rules appear in resource scheduling (avoiding conflicts), game theory (identifying winning strategies), and optimization under constraints. This problem teaches you to recognize when seemingly complex decision spaces (all possible card flip combinations) can be simplified by identifying fundamental impossibilities. The pattern of building an exclusion set and then finding optimal candidates from the remaining elements applies to many scenarios: task assignment with incompatible pairings, network routing avoiding failed links, or investment selection with conflict-of-interest rules. Learning to simplify exponential search spaces through constraint analysis is a key algorithmic thinking skill.

## Examples

**Example 1:**
- Input: `fronts = [1,2,4,4,7], backs = [1,3,4,1,3]`
- Output: `2`
- Explanation: Flipping the second card results in visible values [1,3,4,4,7] and hidden values [1,2,4,1,3].
The number 2 qualifies as good because it's hidden on one card while never appearing on any visible face.
This represents the optimal solution as no smaller good integer can be achieved.

**Example 2:**
- Input: `fronts = [1], backs = [1]`
- Output: `0`
- Explanation: There are no good integers no matter how we flip the cards, so we return 0.

## Constraints

- n == fronts.length == backs.length
- 1 <= n <= 1000
- 1 <= fronts[i], backs[i] <= 2000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
A number can never be "good" if it appears on both sides of the same card (fronts[i] == backs[i]), because no matter how you flip that card, the number will always be visible. This creates an exclusion set.
</details>

<details>
<summary>🎯 Main Approach</summary>
First, identify all numbers that appear on both sides of any single card - these cannot be good. Then, examine all remaining numbers (from both fronts and backs arrays) and find the smallest one that isn't in the exclusion set. This is your answer.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a set to store "banned" numbers (those appearing on both sides of the same card) for O(1) lookup. Then iterate through all unique numbers from both arrays to find the minimum that isn't banned. Edge case: if all numbers are banned, return 0.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(n) | Check all possible flipping combinations |
| Optimal (Set-based) | O(n) | O(n) | Single pass to build banned set, single pass to find minimum |

## Common Mistakes

1. **Checking all possible flips instead of understanding constraints**
   ```python
   # Wrong: Trying to enumerate all flip combinations
   from itertools import product
   min_good = float('inf')
   for flips in product([0, 1], repeat=n):
       visible = [fronts[i] if flips[i] == 0 else backs[i] for i in range(n)]
       # ... complex logic

   # Correct: Identify impossible numbers first
   banned = {fronts[i] for i in range(n) if fronts[i] == backs[i]}
   candidates = set(fronts + backs) - banned
   return min(candidates) if candidates else 0
   ```

2. **Forgetting cards with same value on both sides**
   ```python
   # Wrong: Only checking if numbers appear in both arrays
   all_nums = set(fronts + backs)
   return min(all_nums)

   # Correct: Exclude numbers on same card
   banned = {fronts[i] for i in range(n) if fronts[i] == backs[i]}
   candidates = set(fronts + backs) - banned
   return min(candidates) if candidates else 0
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Maximum good number | Easy | Find max instead of min from valid set |
| K flips constraint | Hard | Limited number of flips allowed |
| Multi-sided cards | Hard | Cards with more than 2 faces |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Set Operations](../../prerequisites/hash-table.md)
