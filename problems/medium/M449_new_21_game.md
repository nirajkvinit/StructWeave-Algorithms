---
id: M449
old_id: A304
slug: new-21-game
title: New 21 Game
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# New 21 Game

## Problem

You're analyzing a probability-based card game inspired by "21" (also known as Blackjack). A player starts at 0 points and draws cards to accumulate points, with specific rules governing when they stop.

**Game Rules:**

1. The player starts with **0 points**
2. While their score is **strictly less than `k`**, they must continue drawing cards
3. Each draw adds a **random integer** between `1` and `maxPts` (inclusive) to their score
4. All values in the range `[1, maxPts]` are **equally likely** (uniform distribution)
5. Each draw is **independent** of previous draws
6. Drawing stops **immediately** when the score reaches or exceeds `k`

**Your Task:**

Given three integers `n`, `k`, and `maxPts`, calculate the **probability** that the player's final score is **at most `n`** (i.e., they don't exceed `n` points when the game ends).

Return the probability as a decimal number. Answers within `10⁻⁵` of the actual answer are considered correct.

**Example Walkthrough:**

If `k = 10` and `maxPts = 5`:
- When the player has 8 points, they draw once more (since 8 < 10)
- They could get 1, 2, 3, 4, or 5 (each with probability 1/5)
- Final scores would be 9, 10, 11, 12, or 13
- When the player has 10 points, they stop immediately (10 >= 10)

## Why This Matters

This problem introduces **dynamic programming with probabilities** and the **sliding window optimization** technique. Instead of simulating the game millions of times (Monte Carlo), you'll compute exact probabilities using DP. The key challenge is optimizing from O(n × maxPts) to O(n) by maintaining a running sum window—a technique applicable to many DP problems with range dependencies. This pattern appears in financial modeling (option pricing), game theory (expected value calculations), and queueing theory. Understanding how to efficiently manage probability distributions will help you tackle a wide range of stochastic optimization problems.

## Examples

**Example 1:**
- Input: `n = 10, k = 1, maxPts = 10`
- Output: `1.00000`
- Explanation: Alice gets a single card, then stops.

**Example 2:**
- Input: `n = 6, k = 1, maxPts = 10`
- Output: `0.60000`
- Explanation: Alice gets a single card, then stops.
In 6 out of 10 possibilities, she is at or below 6 points.

**Example 3:**
- Input: `n = 21, k = 17, maxPts = 10`
- Output: `0.73278`

## Constraints

- 0 <= k <= n <= 10⁴
- 1 <= maxPts <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a dynamic programming probability problem. Define dp[i] as the probability of reaching exactly score i. The key observation is that drawing stops at k, but the final score can be anywhere from k to k+maxPts-1. We need to sum probabilities for scores in range [k, n].
</details>

<details>
<summary>🎯 Main Approach</summary>
Use DP where dp[i] represents the probability of reaching score i. For scores less than k, we can draw again, so dp[i] contributes to dp[i+1] through dp[i+maxPts] equally (1/maxPts probability each). Use a sliding window sum to efficiently calculate the sum of previous probabilities. Base case: dp[0] = 1.0 (we start at 0 with certainty).
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Instead of recalculating the sum of dp[i-maxPts] to dp[i-1] for each i, maintain a running window sum. Add the new element and remove the old element as you slide the window. This reduces time complexity from O(n * maxPts) to O(n + maxPts).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Recursion) | O(maxPts^k) | O(k) | Exponential, will timeout |
| DP with Window Sum | O(n + maxPts) | O(n) | Optimal solution |

## Common Mistakes

1. **Forgetting that drawing stops at k, not n**
   ```python
   # Wrong: Continuing draws after reaching k
   for i in range(n + 1):
       for draw in range(1, maxPts + 1):
           # Should stop at k, not n!

   # Correct: Only draw when score < k
   for i in range(k):
       for draw in range(1, maxPts + 1):
           if i + draw <= n:
               dp[i + draw] += dp[i] / maxPts
   ```

2. **Not using sliding window optimization**
   ```python
   # Wrong: Recalculating sum every time (O(n * maxPts))
   for i in range(1, n + 1):
       probability = 0
       for j in range(max(0, i - maxPts), min(i, k)):
           probability += dp[j]
       dp[i] = probability / maxPts

   # Correct: Maintain running window sum
   window_sum = 1.0  # dp[0]
   for i in range(1, n + 1):
       dp[i] = window_sum / maxPts
       if i < k:
           window_sum += dp[i]
       if i - maxPts >= 0:
           window_sum -= dp[i - maxPts]
   ```

3. **Off-by-one errors in probability calculation**
   ```python
   # Wrong: Including scores >= k in window sum
   if i < k:  # Should be i < k, not i <= k
       window_sum += dp[i]

   # Correct: Only scores < k contribute to future draws
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Blackjack Probability | Hard | Variable card values and bust condition |
| Dice Game Probability | Medium | Different drawing rules or multiple dice |
| Optimal Stopping Problem | Hard | Decide when to stop drawing optimally |
| Coin Flip Probability | Easy | Binary outcomes instead of range |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
