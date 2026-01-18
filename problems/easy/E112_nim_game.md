---
id: E112
old_id: I091
slug: nim-game
title: Nim Game
difficulty: easy
category: easy
topics: ["math", "game-theory"]
patterns: ["game-theory", "pattern-recognition"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E258", "M877", "M1025"]
prerequisites: ["game-theory", "modular-arithmetic", "pattern-recognition"]
strategy_ref: ../strategies/fundamentals/mathematical-thinking.md
---
# Nim Game

## Problem

You and your opponent face a pile of stones in a turn-based game. Players alternate turns, with you going first. On each turn, the active player must remove between 1 and 3 stones from the pile. The player who removes the last stone wins the entire game.

Given `n` stones in the initial pile, determine whether you can guarantee victory assuming both players play optimally. Return `true` if you can force a win regardless of your opponent's strategy, or `false` if your opponent has a winning strategy.

The key word here is "optimal play." Both you and your opponent will make the absolute best move available at each turn. This isn't about randomness or mistakes; it's about mathematical certainty. Some starting positions are inherently winning positions (you can force victory), while others are losing positions (your opponent can force your defeat).

Let's explore small examples: with 1, 2, or 3 stones, you can take them all and win immediately. But with 4 stones, every possible first move (taking 1, 2, or 3) leaves your opponent with 1, 2, or 3 stones, letting them win. Notice that 4 is a losing position. Continue this pattern: 5, 6, and 7 are winning positions (you can reduce to 4), but 8 is losing again (you'll leave your opponent with 5, 6, or 7). The pattern emerges: multiples of 4 are losing positions.

## Why This Matters

Nim is one of the oldest and most studied combinatorial games in mathematics, dating back thousands of years. It introduces fundamental concepts in game theory including winning/losing positions, optimal strategy, and mathematical invariants. These concepts extend far beyond games into algorithm design, decision theory, and competitive strategy.

The pattern recognition skill you develop here appears in problems involving state machines, dynamic programming optimization, and detecting mathematical properties. Learning to identify positions from which victory is inevitable or impossible is crucial in minimax algorithms, chess engines, and AI game playing.

Understanding Nim and the Sprague-Grundy theorem (which generalizes Nim to all impartial games) is foundational for competitive programming. The technique of working backward from small cases to discover patterns is a powerful problem-solving approach applicable to recursion, dynamic programming, and mathematical proofs.

This problem also demonstrates that sometimes the "clever" solution is dramatically simpler than the obvious one. A single modulo operation replaces what could be complex recursive analysis, teaching you to look for elegant mathematical insights before implementing complex algorithms.

## Examples

**Example 1:**
- Input: `n = 4`
- Output: `false`
- Explanation: All possible game paths lead to your defeat:
1. Take 1 stone: opponent takes 3 stones (including the last). Opponent wins.
2. Take 2 stones: opponent takes 2 stones (including the last). Opponent wins.
3. Take 3 stones: opponent takes 1 stone (the last). Opponent wins.
No matter your first move, you lose.

**Example 2:**
- Input: `n = 1`
- Output: `true`

**Example 3:**
- Input: `n = 2`
- Output: `true`

## Constraints

- 1 <= n <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Work Backwards from Small Cases</summary>

Try working out small values manually: n=1 (win), n=2 (win), n=3 (win), n=4 (lose), n=5 (win), n=6 (win), n=7 (win), n=8 (lose). Do you notice a pattern? What's special about the positions where you lose?

</details>

<details>
<summary>🎯 Hint 2: Identify Losing Positions</summary>

The positions where you lose are 4, 8, 12, 16... These are all multiples of 4. Why? If your opponent can always leave you with a multiple of 4 stones, they win. When you start with a multiple of 4, no matter what you take (1-3), your opponent can take enough stones to bring it back to a multiple of 4.

</details>

<details>
<summary>📝 Hint 3: Mathematical Pattern</summary>

The solution is remarkably simple:
```
return n % 4 != 0
```

You win if and only if n is NOT a multiple of 4. This is because:
- If n % 4 == 0, you're in a losing position (no matter what you do, opponent can mirror to keep total divisible by 4)
- If n % 4 != 0, you can take enough stones to leave opponent with multiple of 4, forcing them into losing position

This is a classic example of game theory where certain positions are "winning" or "losing" based on optimal play.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursive/DP | O(n) | O(n) | Compute winning state for each position bottom-up |
| Memoized Recursion | O(n) | O(n) | Cache results of subproblems |
| **Pattern Recognition** | **O(1)** | **O(1)** | Optimal: Direct mathematical formula based on modulo 4 |

## Common Mistakes

### Mistake 1: Trying Dynamic Programming

**Wrong:**
```python
def canWinNim(n):
    if n <= 3:
        return True
    dp = [False] * (n + 1)
    dp[1] = dp[2] = dp[3] = True

    for i in range(4, n + 1):
        # Can win if any move leaves opponent in losing position
        dp[i] = not dp[i-1] or not dp[i-2] or not dp[i-3]

    return dp[n]
    # O(n) time and space - times out for large n
```

**Correct:**
```python
def canWinNim(n):
    return n % 4 != 0
    # O(1) time and space
```

While DP works for small n, it's inefficient. The pattern recognition solution is instant.

### Mistake 2: Simulating the Game

**Wrong:**
```python
def canWinNim(n):
    # Try to simulate optimal play
    while n > 0:
        if n <= 3:
            return True
        # Take stones trying to win
        n -= (n % 4 if n % 4 != 0 else 1)
        if n <= 3:
            return False
        # Opponent's optimal move
        n -= (n % 4 if n % 4 != 0 else 1)
    # Complex and incorrect logic
```

**Correct:**
```python
def canWinNim(n):
    return n % 4 != 0
```

Simulating the game is unnecessary and error-prone.

### Mistake 3: Off-by-One in Pattern

**Wrong:**
```python
def canWinNim(n):
    return n % 3 != 0  # Wrong modulo
    # Or
    return n % 4 == 0  # Inverted logic
```

**Correct:**
```python
def canWinNim(n):
    return n % 4 != 0  # Lose when n is multiple of 4
```

The critical insight is that multiples of 4 are losing positions.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Nim with K Stones | Can take 1 to k stones per turn | Easy |
| Misère Nim | Player taking last stone loses (reverse) | Medium |
| Multi-Pile Nim | Multiple piles, take from any one pile | Hard |
| Fibonacci Nim | Can take Fibonacci number of stones | Medium |
| Staircase Nim | Stones arranged in staircase pattern | Medium |

## Practice Checklist

- [ ] Work out pattern for n=1 to n=12 by hand (10 min)
- [ ] Understand why multiples of 4 are losing positions (10 min)
- [ ] Implement O(1) solution (5 min)
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Research Sprague-Grundy theorem for deeper understanding

**Strategy**: See [Mathematical Thinking](../strategies/fundamentals/mathematical-thinking.md)
