---
id: M476
old_id: A344
slug: stone-game
title: Stone Game
difficulty: medium
category: medium
topics: []
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
---
# Stone Game

## Problem

Two players engage in a strategic turn-based game with piles of stones arranged in a line. Think of it like a competitive treasure hunt where you and an opponent take turns choosing from the ends of a row.

The game setup includes an **even** number of stone piles arranged linearly, with each pile `i` containing a **positive** number of stones `piles[i]`. The total stone count across all piles is **odd**, guaranteeing no possibility of a tie.

**Game rules**:
- **Alice moves first**, then Bob, alternating turns
- On each turn, the active player must take all stones from either the **leftmost** or **rightmost** remaining pile
- Play continues until all piles are gone
- The player with more total stones wins

Both players play optimally (making the best possible strategic decisions).

Determine whether Alice wins when both players use perfect strategy. Return `true` if Alice wins, otherwise return `false`.

**Example walkthrough**: With piles [5, 3, 4, 5], Alice could take the left 5, Bob takes right 5, Alice takes right 4, Bob takes the remaining 3. Alice gets 9 stones, Bob gets 8. Alice wins.

## Why This Matters

This game theory problem appears in competitive bidding systems (sequential auctions where bidders alternate), negotiation algorithms (turn-based resource allocation), and AI game development. The dynamic programming approach models minimax decision trees used in chess engines, poker AI, and economic models of sequential decision-making under competition. Understanding optimal play in zero-sum games is fundamental to developing trading algorithms, designing fair game mechanics, and analyzing competitive markets where participants alternate decisions.

## Examples

**Example 1:**
- Input: `piles = [5,3,4,5]`
- Output: `true`
- Explanation: Alice begins and must choose either the leftmost 5 or rightmost 5.
Suppose she selects the leftmost 5, leaving [3, 4, 5].
If Bob chooses 3, the remaining piles are [4, 5], and Alice takes 5 for a total of 10 points.
If Bob chooses 5, the remaining piles are [3, 4], and Alice takes 4 for a total of 9 points.
Either strategy leads to Alice winning, demonstrating an optimal first move.

**Example 2:**
- Input: `piles = [3,7,2,3]`
- Output: `true`

## Constraints

- 2 <= piles.length <= 500
- piles.length is **even**.
- 1 <= piles[i] <= 500
- sum(piles[i]) is **odd**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
There's a mathematical trick: Alice always wins when the number of piles is even. She can force a win by controlling either all odd-indexed or all even-indexed piles. Since there's an even number of piles and the sum is odd, one of these groups must have a larger sum. However, the general solution uses game theory DP.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use dynamic programming with dp[i][j] representing the maximum advantage (difference in stones) the current player can get from piles[i:j+1]. For each subarray, the player chooses either the left or right pile, then the opponent plays optimally on the remaining subarray. The recurrence: dp[i][j] = max(piles[i] - dp[i+1][j], piles[j] - dp[i][j-1]). Alice wins if dp[0][n-1] > 0.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
For this specific problem with even length and odd sum, you can return True immediately without any computation. For the general case (works for any configuration), use bottom-up DP filling a 2D table diagonally from base cases (single elements) to the full range. Time: O(n^2), Space: O(n^2) or O(n) with space optimization.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursive DFS | O(2^n) | O(n) | Without memoization |
| DP (Memoization) | O(n^2) | O(n^2) | Top-down with cache |
| DP (Tabulation) | O(n^2) | O(n^2) | Bottom-up, can optimize to O(n) |
| Math Trick | O(1) | O(1) | Only works for this specific problem |

## Common Mistakes

1. **Wrong DP transition**
   ```python
   # Wrong: Adding instead of subtracting opponent's score
   dp[i][j] = max(piles[i] + dp[i+1][j], piles[j] + dp[i][j-1])

   # Correct: Subtract opponent's advantage
   dp[i][j] = max(piles[i] - dp[i+1][j], piles[j] - dp[i][j-1])
   ```

2. **Not considering both players play optimally**
   ```python
   # Wrong: Greedy approach (always pick larger)
   if piles[left] > piles[right]:
       take left
   else:
       take right

   # Correct: Consider future optimal play
   # Use DP to look ahead and choose move that maximizes advantage
   ```

3. **Incorrect base case**
   ```python
   # Wrong: Base case not initialized
   # Missing dp[i][i] = piles[i]

   # Correct: Single element base case
   for i in range(n):
       dp[i][i] = piles[i]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Stone Game II | Medium | Can take multiple piles, variable M |
| Stone Game III | Hard | Can take 1, 2, or 3 piles |
| Predict the Winner | Medium | General case (any sum, any length) |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Game Theory DP](../../strategies/patterns/dynamic-programming.md)
