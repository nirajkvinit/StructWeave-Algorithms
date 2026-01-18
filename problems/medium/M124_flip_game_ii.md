---
id: M124
old_id: I093
slug: flip-game-ii
title: Flip Game II
difficulty: medium
category: medium
topics: ["string", "backtracking", "game-theory", "memoization"]
patterns: ["game-theory", "minimax"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M123", "M125", "E001"]
prerequisites: ["game-theory", "minimax", "backtracking", "memoization"]
---
# Flip Game II

## Problem

You're analyzing a two-player competitive game involving strategic symbol flipping. You start with a string `currentState` containing only `'+'` and `'-'` characters, like "++++" or "+--+". Two players take turns making moves, and on each turn, a player must find any pair of consecutive `"++"` symbols and flip both to `"--"`. The game continues until no more moves are possible (no "++" remains anywhere in the string), and the player who makes the final move wins.

Your task is to determine whether the first player can guarantee a win assuming both players play optimally. This means both players always make the best possible move available to them at each turn. Return `true` if the starting player can force a win no matter how the opponent plays, and `false` if the opponent can prevent them from winning. This is a game theory problem where you need to think recursively: a position is winning if you can make a move that leaves your opponent in a losing position. For example, from "++++" the first player can flip the middle "++" to create "+--+", and analyzing the resulting game tree shows whether this leads to a win. Edge cases include strings with no "++" at all (immediate loss for the first player), strings with exactly one "++" (immediate win for the first player), and longer strings where the outcome depends on complex strategic choices.

## Why This Matters

This problem introduces game theory and minimax reasoning, which appear throughout competitive AI and decision-making systems. Chess engines, checkers programs, and other game-playing AI use the same minimax algorithm to evaluate whether positions are winning or losing by recursively analyzing all possible move sequences. Automated theorem provers explore game trees to determine if mathematical statements are provable. Economic models analyze competitive markets where firms make optimal strategic decisions knowing their opponents will do the same. Security systems evaluate attack-defense scenarios to determine if a defender can prevent all possible attacks. Puzzle solvers for games like Tic-Tac-Toe or Connect Four use identical win-condition analysis. The key algorithmic insight is that a position is winning if and only if at least one available move leads to a losing position for the opponent, combined with memoization to avoid recomputing the same game states multiple times as they appear in different branches of the game tree.

## Examples

**Example 1:**
- Input: `currentState = "++++"`
- Output: `true`
- Explanation: The first player wins by converting the center "++" to create "+--+".

**Example 2:**
- Input: `currentState = "+"`
- Output: `false`

## Constraints

- 1 <= currentState.length <= 60
- currentState[i] is either '+' or '-'.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

This is a two-player game where you need to determine if the current player has a winning strategy. Think recursively: the current player wins if there exists at least one move that puts the opponent in a losing position. This is a classic game theory problem that can be solved using the minimax algorithm.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use recursive backtracking with memoization. For each state, try all possible moves (flip each "++" to "--"). The current player wins if ANY of these moves leads to a state where the opponent loses. Use memoization to cache results for each game state to avoid recomputing the same positions multiple times.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**Game Theory Backtracking:**
```
1. Define canWin(state):
   - Base case: if no "++" exists, return false (no moves = lose)

   - Try each possible move:
     - For i in range(len(state) - 1):
       - If state[i:i+2] == "++":
         - Create new state: flip "++" to "--"
         - If opponent cannot win from new state:
           - Return true (found winning move)

   - Return false (no winning move exists)

2. Optimization with memoization:
   - Store computed results in hash map
   - Key: current state string
   - Value: true/false (can win from this state)

3. Call canWin(currentState)
```

Key insight: You win if you can make a move that puts opponent in losing state.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Recursion | O(n!!) | O(n) | Double factorial, exponential |
| **Recursion + Memoization** | **O(2^n × n)** | **O(2^n)** | Each state computed once |
| Game Theory (Sprague-Grundy) | O(n³) | O(n) | Advanced, uses Nim-values |

## Common Mistakes

### Mistake 1: Not considering all possible moves

**Wrong:**
```python
def canWin(s):
    # Wrong: only checks first "++" found
    for i in range(len(s) - 1):
        if s[i:i+2] == "++":
            new_state = s[:i] + "--" + s[i+2:]
            if not canWin(new_state):
                return True
            return False  # Wrong: should try other moves!
    return False
```

**Correct:**
```python
def canWin(s):
    # Try ALL possible moves
    for i in range(len(s) - 1):
        if s[i:i+2] == "++":
            new_state = s[:i] + "--" + s[i+2:]
            # If opponent loses from this state, we win
            if not canWin(new_state):
                return True
    # No winning move found
    return False
```

### Mistake 2: Not using memoization (TLE)

**Wrong:**
```python
def canWin(s):
    # No memoization - recalculates same states many times
    for i in range(len(s) - 1):
        if s[i:i+2] == "++":
            new_state = s[:i] + "--" + s[i+2:]
            if not canWin(new_state):
                return True
    return False
# Time limit exceeded on larger inputs!
```

**Correct:**
```python
def canWin(s):
    memo = {}

    def helper(state):
        if state in memo:
            return memo[state]

        # Try all possible moves
        for i in range(len(state) - 1):
            if state[i:i+2] == "++":
                new_state = state[:i] + "--" + state[i+2:]
                # If opponent loses, we win
                if not helper(new_state):
                    memo[state] = True
                    return True

        memo[state] = False
        return False

    return helper(s)
```

### Mistake 3: Incorrect base case

**Wrong:**
```python
def canWin(s):
    memo = {}

    def helper(state):
        # Wrong base case: checks if state is all "-"
        if "-" * len(state) == state:
            return False

        if state in memo:
            return memo[state]

        # ... rest of code ...
    # Misses cases like "+-+" which also cannot make moves
```

**Correct:**
```python
def canWin(s):
    memo = {}

    def helper(state):
        if state in memo:
            return memo[state]

        # Base case: check if any move is possible
        has_move = False
        for i in range(len(state) - 1):
            if state[i:i+2] == "++":
                has_move = True
                new_state = state[:i] + "--" + state[i+2:]
                if not helper(new_state):
                    memo[state] = True
                    return True

        # No moves or no winning move
        memo[state] = False
        return False

    return helper(s)
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Flip Game I | Just list all possible next states | Easy |
| Can I Win | Number picking game with similar logic | Medium |
| Nim Game | Classic game theory problem | Easy |
| Stone Game | Choose stones from ends with optimal play | Medium |
| Predict the Winner | Similar two-player optimal strategy | Medium |

## Practice Checklist

- [ ] Solve using basic recursion
- [ ] Add memoization optimization
- [ ] Understand game theory minimax concept
- [ ] Trace through small examples manually
- [ ] **Day 3**: Re-solve without looking at solution
- [ ] **Week 1**: Solve Flip Game I variation
- [ ] **Week 2**: Explain minimax concept to someone
- [ ] **Month 1**: Solve Stone Game problem

**Strategy**: See [Game Theory Patterns](../strategies/patterns/game-theory.md)
