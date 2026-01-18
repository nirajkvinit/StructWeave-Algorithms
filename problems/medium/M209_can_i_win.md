---
id: M209
old_id: I263
slug: can-i-win
title: Can I Win
difficulty: medium
category: medium
topics: ["game-theory", "memoization", "bitmask"]
patterns: ["minimax", "dp"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E292", "M464", "M877"]
prerequisites: ["recursion", "game-theory", "bitmask", "memoization"]
---
# Can I Win

## Problem

Two players alternate picking integers from 1 to `maxChoosableInteger`, adding each chosen number to a running total. Once a number is picked, it cannot be used again. The first player to make the total reach or exceed `desiredTotal` wins. Both players play optimally. Determine if the first player can guarantee a win.

This is a classic game theory problem requiring minimax reasoning. The current player wins if they can make any move that puts their opponent in a losing position. Conversely, a player is in a losing position if all possible moves lead to the opponent winning. This recursive definition forms the basis of the solution.

The challenge lies in efficiently exploring the game tree without redundant computation. With `maxChoosableInteger` up to 20, the naive approach of exploring all permutations is impossibly slow (20! = 2.4 quintillion possibilities). The key optimization is recognizing that game states can be represented by the set of used numbers, regardless of the order they were chosen. Using a bitmask to represent this state allows for efficient memoization.

For example, if `maxChoosableInteger = 10` and `desiredTotal = 11`, the first player cannot win: any choice leaves enough numbers for the second player to reach 11. But with `desiredTotal = 1`, the first player wins immediately by choosing 1.

## Why This Matters

Game theory and minimax algorithms power AI decision-making in chess engines, poker bots, and strategic game AI. The concept of optimal play under adversarial conditions extends beyond games to cybersecurity (attacker/defender models), auction theory, and competitive resource allocation. The bitmask state representation technique demonstrated here is fundamental for efficiently encoding and memoizing combinatorial states, appearing in dynamic programming solutions for the traveling salesman problem, subset sum variations, and scheduling problems. Understanding minimax reasoning develops your ability to think recursively about competitive scenarios, a valuable skill for both algorithms and strategic thinking.

## Examples

**Example 1:**
- Input: `maxChoosableInteger = 10, desiredTotal = 11`
- Output: `false`
- Explanation: Regardless of the first player's choice, they will lose.
The first player selects from integers 1 through 10.
If they pick 1, the second player has integers 2 through 10 available.
The second player wins by selecting 10, making the total 11, which meets or exceeds desiredTotal.
This pattern holds for any initial choice by the first player.

**Example 2:**
- Input: `maxChoosableInteger = 10, desiredTotal = 0`
- Output: `true`

**Example 3:**
- Input: `maxChoosableInteger = 10, desiredTotal = 1`
- Output: `true`

## Constraints

- 1 <= maxChoosableInteger <= 20
- 0 <= desiredTotal <= 300

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Game Theory Minimax</summary>

This is a classic minimax game theory problem. The current player wins if they can make ANY move that puts the opponent in a losing position. Conversely, a player loses if ALL their possible moves lead to the opponent winning. Use recursive thinking: can_win(state) = exists a move where !can_win(new_state).

</details>

<details>
<summary>🎯 Hint 2: State Representation with Bitmask</summary>

With maxChoosableInteger ≤ 20, you can represent which numbers are used with a bitmask (20 bits). Each bit represents whether that number is still available. This allows efficient state representation and memoization. The state is (currentSum, usedNumbers), but you can derive currentSum from usedNumbers, so just use the bitmask as the key.

</details>

<details>
<summary>📝 Hint 3: Memoization Algorithm</summary>

```
memo = {}  # bitmask -> can_current_player_win

def can_win(used_mask, current_total):
    if current_total >= desiredTotal:
        return False  # opponent already won

    if used_mask in memo:
        return memo[used_mask]

    # Try each available number
    for i in range(1, maxChoosableInteger + 1):
        if not (used_mask & (1 << i)):  # number i not used
            new_total = current_total + i
            if new_total >= desiredTotal:
                memo[used_mask] = True
                return True
            # Recurse: if opponent loses, we win
            if not can_win(used_mask | (1 << i), new_total):
                memo[used_mask] = True
                return True

    memo[used_mask] = False
    return False
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Naive Recursion | O(n!) | O(n × n!) | Explores all permutations, exponential blowup |
| Memoization + Bitmask | O(2^n × n) | O(2^n) | 2^n states, each tries n numbers |
| Optimized Early Termination | O(2^n × n) | O(2^n) | Same worst case, faster in practice |

n = maxChoosableInteger (≤ 20)

## Common Mistakes

**Mistake 1: Not Handling Base Cases**

```python
# Wrong: Missing early termination checks
def can_i_win(max_choosable, desired_total):
    memo = {}
    def can_win(used, total):
        # Missing: if total already >= desired, previous player won
        if used in memo:
            return memo[used]
        # ... rest of logic
```

```python
# Correct: Handle base cases first
def can_i_win(max_choosable, desired_total):
    # Edge case: sum of all numbers is less than target
    if (max_choosable * (max_choosable + 1)) // 2 < desired_total:
        return False
    # Edge case: first player can win immediately
    if desired_total <= 0:
        return True

    memo = {}
    def can_win(used, total):
        if total >= desired_total:
            return False  # opponent already won
        if used in memo:
            return memo[used]
        # ... try moves
```

**Mistake 2: Incorrect State Representation**

```python
# Wrong: Using tuple of used numbers (inefficient and complex)
def can_win(used_set, total):
    key = tuple(sorted(used_set))  # Slow conversion
    if key in memo:
        return memo[key]
```

```python
# Correct: Use bitmask for compact state
def can_win(used_mask, total):
    if used_mask in memo:
        return memo[used_mask]

    for i in range(1, max_choosable + 1):
        if not (used_mask & (1 << i)):
            new_mask = used_mask | (1 << i)
            # ...
```

**Mistake 3: Wrong Minimax Logic**

```python
# Wrong: Checking if we win instead of if opponent loses
def can_win(used, total):
    for i in range(1, max_choosable + 1):
        if i not in used:
            if can_win(used | {i}, total + i):  # Wrong!
                return True
    return False
```

```python
# Correct: We win if opponent loses after our move
def can_win(used, total):
    for i in range(1, max_choosable + 1):
        if i not in used:
            if total + i >= desired_total:
                return True  # We win immediately
            if not can_win(used | {i}, total + i):
                return True  # Opponent loses
    return False
```

## Variations

| Variation | Difference | Approach Change |
|-----------|-----------|-----------------|
| Multiple Players | More than 2 players | Track current player in state, rotate turns |
| Different Win Condition | Closest to target without exceeding | Modify base case and comparison logic |
| Numbers with Cooldown | Used numbers available again after k turns | Add turn counter to state |
| Weighted Numbers | Different point values | Use separate arrays for values |
| Limited Moves | Each player has max k moves | Add move counter to state |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Reviewed solution
- [ ] Implemented without hints (Day 1)
- [ ] Solved again (Day 3)
- [ ] Solved again (Day 7)
- [ ] Solved again (Day 14)
- [ ] Attempted all variations above

**Strategy**: See [Dynamic Programming](../strategies/patterns/dp.md) and [Game Theory](../strategies/fundamentals/game-theory.md)
