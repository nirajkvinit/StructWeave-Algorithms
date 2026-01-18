---
id: M527
old_id: A415
slug: bag-of-tokens
title: Bag of Tokens
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Bag of Tokens

## Problem

Imagine you're playing a strategic resource management game where you have two currencies: power and score. You start with some initial power value and a score of 0. You have a collection of tokens, each with a specific value, and you need to maximize your score by strategically choosing which tokens to "play."

Here's how the token mechanics work:

- **Playing a token face-up**: If you have enough power (at least equal to the token's value), you can spend that power to gain 1 score point. This is your primary way to build score.
- **Playing a token face-down**: If you already have at least 1 score point, you can sacrifice 1 point of score to gain power equal to the token's value. This lets you "cash in" score for more power.

Each token can only be used once, and you can play tokens in any order you want. You're not required to use all tokens.

For example, with tokens `[100, 200, 300, 400]` and starting power 200:
1. Play token 100 face-up: power 200→100, score 0→1
2. Play token 400 face-down: power 100→500, score 1→0 (convert score back to power)
3. Play token 200 face-up: power 500→300, score 0→1
4. Play token 300 face-up: power 300→0, score 1→2

The goal is to find the maximum score you can achieve with optimal token plays.

## Why This Matters

This problem models dynamic resource trading systems found in financial markets where traders convert between assets to maximize returns. In game theory, it represents optimal decision-making under resource constraints, similar to poker where you decide when to bet (spend resources) versus fold (conserve resources). Cloud computing platforms use analogous strategies when trading compute credits for performance boosts, deciding when to spend resources to gain speed versus accumulating resources for later. The greedy two-pointer solution teaches you how to optimize bidirectional resource conversion, a pattern that appears in currency arbitrage algorithms, battery management systems (converting energy to performance and back), and API rate limit optimization where you trade burst capacity for sustained throughput.

## Examples

**Example 1:**
- Input: `tokens = [100], power = 50`
- Output: `0`
- Explanation: You cannot use the token because you lack sufficient power to play it face up, and you have no score to play it face down.

**Example 2:**
- Input: `tokens = [100,200], power = 150`
- Output: `1`
- Explanation: Use token with value 100 face up (power: 150 → 50, score: 0 → 1). The second token cannot be played face up due to insufficient power.

**Example 3:**
- Input: `tokens = [100,200,300,400], power = 200`
- Output: `2`
- Explanation: One optimal sequence:
1. Use token 100 face up (power: 200 → 100, score: 0 → 1)
2. Use token 400 face down (power: 100 → 500, score: 1 → 0)
3. Use token 200 face up (power: 500 → 300, score: 0 → 1)
4. Use token 300 face up (power: 300 → 0, score: 1 → 2)

## Constraints

- 0 <= tokens.length <= 1000
- 0 <= tokens[i], power < 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
To maximize score, use minimum tokens face-up (gain score efficiently) and maximum tokens face-down (gain power maximally). This suggests a two-pointer greedy approach after sorting.
</details>

<details>
<summary>Main Approach</summary>
Greedy two-pointer strategy:
1. Sort tokens in ascending order
2. Use two pointers: left (smallest unused) and right (largest unused)
3. While left <= right:
   - If you have power >= tokens[left], play it face-up (gain score, lose power)
   - Else if score > 0, play tokens[right] face-down (gain power, lose score)
   - Else break (can't make any move)
4. Track maximum score achieved throughout the process
</details>

<details>
<summary>Optimization Tip</summary>
Only play tokens face-down when necessary (when you can't afford any face-up play). Always track max_score separately since score may decrease temporarily. The greedy choice of smallest face-up and largest face-down is provably optimal.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Try all orders) | O(n!) | O(n) | Exponential, infeasible |
| Optimal (Greedy + Two Pointers) | O(n log n) | O(1) | Sorting dominates |

## Common Mistakes

1. **Not tracking maximum score separately**
   ```python
   # Wrong: Return final score (may have traded score for power)
   return score

   # Correct: Track maximum ever achieved
   max_score = 0
   while left <= right:
       # ... make moves
       max_score = max(max_score, score)
   return max_score
   ```

2. **Playing face-down without checking score > 0**
   ```python
   # Wrong: Can't play face-down with 0 score
   power += tokens[right]
   score -= 1
   right -= 1

   # Correct: Check before playing face-down
   if score > 0:
       power += tokens[right]
       score -= 1
       right -= 1
   ```

3. **Greedy choice on wrong tokens**
   ```python
   # Wrong: Use largest for face-up
   if power >= tokens[right]:
       power -= tokens[right]
       score += 1

   # Correct: Use smallest for face-up (conserve power)
   if power >= tokens[left]:
       power -= tokens[left]
       score += 1
       left += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Jump Game | Medium | Greedy with maximum reach |
| Gas Station | Medium | Greedy with circular array |
| Two City Scheduling | Medium | Greedy cost optimization |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Two Pointers Pattern](../../strategies/patterns/two-pointers.md)
