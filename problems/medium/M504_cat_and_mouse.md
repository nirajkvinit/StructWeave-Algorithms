---
id: M504
old_id: A380
slug: cat-and-mouse
title: Cat and Mouse
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Cat and Mouse

## Problem

Two players, Mouse and Cat, are playing a strategic game on an undirected graph. They take turns moving, with Mouse going first, and both players play optimally to win.

Here's how the game works:

**The Arena:** The game board is represented by a graph where `graph[a]` contains all nodes directly connected to node `a`. Think of it as a network of rooms where each room connects to several neighboring rooms.

**Starting Positions:**
- Mouse starts at node 1
- Cat starts at node 2
- There's a safe hole at node 0

**Movement Rules:**
- On each turn, a player must move to an adjacent node (no staying still)
- If Mouse is at node 1, it must move to one of the nodes listed in `graph[1]`
- The Cat cannot enter node 0 (the hole)
- Each player makes exactly one move per turn

**How to Win:**
- Mouse wins if it reaches node 0 (the hole) before getting caught
- Cat wins if it lands on the same node as the Mouse
- The game is a draw if the same game state (positions + whose turn) repeats, creating an infinite loop

Both players know the complete graph and play perfectly. Your task is to predict the outcome:
- Return `1` if Mouse wins
- Return `2` if Cat wins
- Return `0` if the game ends in a draw

**Diagram:**

Example 1: Simple graph where mouse wins

```
Graph: [[2,5],[3],[0,4,5],[1,4,5],[2,3],[0,2,3]]

    (0)---(2)---(4)
     |     |     |
     |     |     |
    (5)---(3)---(1)

Initial state:
- Mouse at node 1
- Cat at node 2
- Hole at node 0

Mouse can reach node 0 (hole) before cat catches it.
Output: 1 (mouse wins)
```

Example 2: Graph where cat wins

```
Graph: [[1,3],[0],[3],[0,2]]

    (0)---(1)
     |
     |
    (3)---(2)

Initial state:
- Mouse at node 1
- Cat at node 2
- Hole at node 0

Cat can catch mouse before mouse reaches hole.
Output: 2 (cat wins)
```


## Why This Matters

This problem introduces game theory and minimax algorithms, which power everything from chess engines to autonomous game-playing AI. In real applications, similar techniques help optimize multi-agent systems where different entities have competing objectives: auction bidding strategies in ad platforms, autonomous vehicle navigation in mixed traffic, and resource allocation in cloud computing where services compete for limited resources. Understanding how to reason backward from terminal states teaches you to build systems that can predict outcomes in competitive scenarios, handle adversarial environments, and detect when situations lead to stalemate conditions that need special handling.

## Constraints

- 3 <= graph.length <= 50
- 1 <= graph[i].length < graph.length
- 0 <= graph[i][j] < graph.length
- graph[i][j] != i
- graph[i] is unique.
- The mouse and the cat can always move.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a game theory problem solvable with minimax or dynamic programming. The game state is defined by (mouse_pos, cat_pos, turn). Work backwards from terminal states (mouse wins, cat wins, or draw) to determine the outcome from the initial state.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use BFS starting from all known terminal states. For mouse wins: mouse at hole (node 0). For cat wins: cat and mouse at same position (but not 0). Mark these states and propagate backwards. A player wins a state if they can move to a winning state for them. A player loses if all their moves lead to losing states. If neither, it's a draw.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a 3D DP table or dictionary: dp[mouse][cat][turn] where turn is 0 (mouse) or 1 (cat). Track the number of losing children for each state to determine when a state becomes a losing state. This avoids infinite loops in cycle detection.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Minimax with memoization | O(n² × n) | O(n²) | n² states × n neighbors to explore |
| BFS from terminal states | O(n² × n) | O(n²) | More efficient, processes each state once |

## Common Mistakes

1. **Not handling the cat's restriction from entering node 0**
   ```python
   # Wrong: Allowing cat to move to node 0
   for next_pos in graph[cat_pos]:
       # explore next state

   # Correct: Filter out node 0 for cat
   for next_pos in graph[cat_pos]:
       if next_pos == 0:
           continue
       # explore next state
   ```

2. **Infinite loop without proper cycle detection**
   ```python
   # Wrong: No base case for cycles
   def solve(mouse, cat, turn):
       if mouse == 0:
           return 1
       if mouse == cat:
           return 2
       # recursive calls without cycle detection

   # Correct: Track visiting states
   def solve(mouse, cat, turn):
       if (mouse, cat, turn) in memo:
           return memo[(mouse, cat, turn)]
       if mouse == 0:
           return 1
       if mouse == cat:
           return 2
       # mark as visiting
       memo[(mouse, cat, turn)] = 0  # tentative draw
       # compute result
   ```

3. **Wrong turn alternation logic**
   ```python
   # Wrong: Not properly alternating turns
   if turn == 0:  # mouse turn
       for next_mouse in graph[mouse]:
           result = solve(next_mouse, cat, 0)  # still mouse turn!

   # Correct: Alternate turns
   if turn == 0:  # mouse turn
       for next_mouse in graph[mouse]:
           result = solve(next_mouse, cat, 1)  # now cat's turn
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Cat and Mouse II | Hard | Grid-based movement with limited moves |
| Stone Game variants | Medium | Two-player optimal play on different structures |
| Nim Game | Easy | Simpler two-player game theory |
| Predict the Winner | Medium | Game theory on array with optimal play |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Game Theory](../../strategies/patterns/game-theory.md)
