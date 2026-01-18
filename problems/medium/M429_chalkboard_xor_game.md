---
id: M429
old_id: A277
slug: chalkboard-xor-game
title: Chalkboard XOR Game
difficulty: medium
category: medium
topics: ["array", "bit-manipulation"]
patterns: []
estimated_time_minutes: 30
---
# Chalkboard XOR Game

## Problem

Alice and Bob play a turn-based game with an array of integers `nums` written on a chalkboard. Alice always goes first, and they alternate turns. On each turn, a player must erase exactly one number from the board. The game has interesting winning conditions based on the XOR (exclusive OR) of all remaining numbers.

Here are the rules. If a player begins their turn and the XOR of all current numbers on the board equals 0, that player **wins immediately** without making a move. Otherwise, the player must erase one number. If after erasing a number, the XOR of all remaining numbers becomes 0, the player who just erased that number **loses immediately**.

To clarify the XOR calculation: the XOR of a single element is just that element itself, and the XOR of zero elements (empty board) is defined as 0. For example, if the board shows [1, 2, 3], the XOR is 1 ⊕ 2 ⊕ 3 = 0, so the current player wins. If the board shows [1, 1, 2] with XOR = 1 ⊕ 1 ⊕ 2 = 2, the current player must remove a number and try not to make the remaining XOR equal to 0.

Both players play optimally, meaning they always make the best possible move. Determine whether Alice wins the game. Return `true` if Alice wins, `false` otherwise.

The trick is recognizing a mathematical pattern rather than simulating the entire game tree. The answer depends on the initial XOR value and the parity (odd/even) of the array length.

## Why This Matters

This problem demonstrates how game theory problems can often be solved through mathematical insight rather than brute-force simulation. The pattern recognition skill here is crucial for competitive programming and technical interviews. XOR operations are fundamental to cryptography, error detection (parity bits, checksums), and low-level systems programming. Understanding game theory with optimal play also connects to algorithm design in artificial intelligence (minimax algorithm), economics (Nash equilibrium), and strategic decision-making. The ability to recognize when a complex-looking problem has an elegant mathematical solution is a hallmark of strong algorithmic thinking.

## Examples

**Example 1:**
- Input: `nums = [1,1,2]`
- Output: `false`
- Explanation: Alice's options lead to:
Option 1: Remove a 1, leaving [1, 2]. XOR = 1 ⊕ 2 = 3. Bob can force Alice to make the losing final move.
Option 2: Remove 2, leaving [1, 1]. XOR = 1 ⊕ 1 = 0. Alice loses immediately.
Either way, Alice cannot win with optimal play.

**Example 2:**
- Input: `nums = [0,1]`
- Output: `true`

**Example 3:**
- Input: `nums = [1,2,3]`
- Output: `true`

## Constraints

- 1 <= nums.length <= 1000
- 0 <= nums[i] < 2¹⁶

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a game theory problem with a mathematical shortcut. Alice wins if: (1) the initial XOR is already 0, or (2) the array has an even number of elements. The key insight is that if the array has even length and non-zero XOR, there must exist at least one element Alice can remove without making XOR = 0.
</details>

<details>
<summary>Main Approach</summary>
Calculate the XOR of all elements. If it's 0, Alice wins immediately. Otherwise, check if the array length is even. If even, Alice wins because she can always make a safe move. If odd and XOR is non-zero, Bob wins because Alice will eventually be forced into a losing position.
</details>

<details>
<summary>Optimization Tip</summary>
No need for game tree exploration or dynamic programming. The solution is O(n) - just compute XOR and check array length parity. This is a pattern recognition problem rather than a simulation problem.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Game Tree (Brute Force) | O(n!) | O(n) | Exponential, impractical |
| Optimal (Math) | O(n) | O(1) | Single pass to compute XOR |

## Common Mistakes

1. **Trying to simulate the game**
   ```python
   # Wrong: Attempting to explore all possible game states
   def can_win(nums, is_alice_turn):
       if xor_all(nums) == 0:
           return is_alice_turn
       for i in range(len(nums)):
           # recursively check...

   # Correct: Use mathematical property
   xor_result = 0
   for num in nums:
       xor_result ^= num
   return xor_result == 0 or len(nums) % 2 == 0
   ```

2. **Misunderstanding the winning condition**
   ```python
   # Wrong: Thinking Alice loses if XOR is 0 at start
   if xor_all(nums) == 0:
       return False

   # Correct: Alice wins immediately if XOR is 0 at her turn start
   if xor_all(nums) == 0:
       return True
   ```

3. **Not recognizing the parity pattern**
   ```python
   # Wrong: Complex game state tracking
   memo = {}
   def solve(remaining, turn):
       # complex recursive logic

   # Correct: Simple mathematical check
   return xor_result == 0 or len(nums) % 2 == 0
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Nim Game | Easy | Similar game theory with mathematical solution |
| Stone Game | Medium | Two-player optimal strategy with DP |
| Divisor Game | Easy | Game theory with parity-based solution |
| Predict the Winner | Medium | Minimax game with array partitioning |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Bit Manipulation](../../strategies/patterns/bit-manipulation.md)
