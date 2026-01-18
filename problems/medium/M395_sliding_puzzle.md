---
id: M395
old_id: A240
slug: sliding-puzzle
title: Sliding Puzzle
difficulty: medium
category: medium
topics: []
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Sliding Puzzle

## Problem

You have a 2x3 sliding tile puzzle board with tiles numbered 1 through 5 and one empty space represented by 0. A move consists of swapping the empty space with an adjacent tile (up, down, left, or right - no diagonal moves). The goal is to reach the solved state `[[1,2,3],[4,5,0]]` where the empty space is in the bottom-right corner.

Given an initial board configuration, find the minimum number of moves required to solve the puzzle. If the puzzle is unsolvable from the given starting position, return -1.

The challenge here is recognizing this as a graph search problem where each board state is a node, and each valid move creates an edge to a new state. Unlike traditional pathfinding where you navigate through physical space, here you're navigating through a state space. The key insight is that not all configurations are solvable - due to a mathematical property called inversion parity, roughly half of all possible board states cannot reach the goal state regardless of how many moves you make.

For efficient state representation, flatten the 2D board into a string like "123450" for easy comparison and hashing. Precompute the valid moves for each position: position 0 (top-left) can swap with positions 1 and 3, position 1 can swap with 0, 2, and 4, and so on. This avoids recalculating neighbors repeatedly during the search.

Think of this problem as finding the shortest path in a graph with at most 720 nodes (since there are 6! = 720 possible permutations of 6 items, though only half are reachable from any given starting state).

## Why This Matters

Sliding puzzles are the classic introduction to state-space search problems, a foundational concept in artificial intelligence and game theory. The techniques you learn here - representing states efficiently, detecting unsolvable configurations, and using breadth-first search to find optimal solutions - directly apply to solving Rubik's cubes, planning robot movements, and optimizing delivery routes. This problem teaches you about the A* algorithm's precursor (BFS for unweighted graphs) and demonstrates how mathematical properties (like inversion parity) can prune impossible search branches before wasting computation. It's popular in interviews because it tests your ability to model abstract state transitions and recognize when brute-force enumeration is tractable (with only 720 states, exhaustive search works perfectly).

## Constraints

- board.length == 2
- board[i].length == 3
- 0 <= board[i][j] <= 5
- Each value board[i][j] is **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Model this as a graph search problem where each board state is a node. Use BFS to find the shortest path from the initial state to the goal state "123450". Some states may be unreachable due to inversion parity.
</details>

<details>
<summary>🎯 Main Approach</summary>
Convert the 2D board to a string representation for easy state comparison. Use BFS with a queue and visited set. For each state, find the position of '0' and generate all valid neighbor states by swapping with adjacent tiles.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Precompute the valid moves for each position (0-5) in the flattened array. Position 0 can swap with [1,3], position 1 with [0,2,4], etc. This avoids recalculating neighbors repeatedly.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS | O(6!) | O(6!) | Maximum number of board states is 6! = 720 |
| Optimal | O(6!) | O(6!) | BFS with state pruning via visited set |

## Common Mistakes

1. **Not Checking for Unsolvable States**
   ```python
   # Wrong: Assuming all states are solvable
   while queue:
       state, moves = queue.popleft()
       if state == target:
           return moves
   return -1  # May never reach here if not checking parity

   # Correct: Check inversion count parity before BFS
   def is_solvable(board):
       inversions = count_inversions(board)
       return inversions % 2 == 0
   ```

2. **Inefficient State Representation**
   ```python
   # Wrong: Using list of lists for state, hard to hash
   visited.add(tuple(tuple(row) for row in board))

   # Correct: Flatten to string for easy hashing
   state = ''.join(str(board[i][j]) for i in range(2) for j in range(3))
   visited.add(state)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| 8-Puzzle (3x3) | Hard | Larger state space with 9!/2 configurations |
| Word Ladder | Hard | Similar BFS with string transformations |
| Open the Lock | Medium | BFS with constraint-based state transitions |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Breadth-First Search](../../strategies/patterns/bfs.md)
