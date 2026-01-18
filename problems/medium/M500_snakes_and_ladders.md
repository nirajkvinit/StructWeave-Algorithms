---
id: M500
old_id: A376
slug: snakes-and-ladders
title: Snakes and Ladders
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Snakes and Ladders

## Problem

You're implementing the classic board game "Snakes and Ladders" on an `n x n` grid. The board is numbered from 1 to n² using a Boustrophedon pattern (zigzag numbering: left-to-right on odd rows, right-to-left on even rows, starting from the bottom).

Here's how the game works:

You start at square 1 (bottom-left corner). On each turn, you roll a six-sided die and can move forward 1 to 6 squares. If you land on a square that has a snake or ladder, you immediately travel to the destination square shown on the board. The goal is to reach square n² in the minimum number of moves.

The board is represented as a 2D array where:
- `board[r][c] = -1` means that square is normal (no snake or ladder)
- `board[r][c] = x` means landing on that square immediately transports you to square `x`

Important rules:
- You can only take a snake or ladder once per turn (if the destination also has a snake/ladder, you don't take it)
- Squares 1 and n² never have snakes or ladders
- You must land exactly on n² to win

For example, with a 2x2 board `[[-1,4],[-1,3]]`:
- The numbering is: bottom-left=1, bottom-right=2, top-right=3, top-left=4
- Square 2 has a ladder to square 4
- Square 3 has a ladder to square 3 (stays in place)
- Starting at 1, you can roll to reach 2, then immediately jump to 4 (winning in 1 move)


**Diagram:**

Example 6x6 board with Boustrophedon numbering:

```
Board representation:          Cell numbering (Boustrophedon):
[-1,-1,-1,-1,-1,-1]            36  35  34  33  32  31
[-1,-1,-1,-1,-1,-1]            25  26  27  28  29  30
[-1,-1,-1,-1,-1,-1]            24  23  22  21  20  19
[-1,-1,-1,-1,-1,-1]            13  14  15  16  17  18
[-1,-1,-1,-1,-1,-1]            12  11  10   9   8   7
[-1,-1,19, 4,-1,-1]             1   2   3   4   5   6

Snakes/Ladders in this example:
- Cell 3 → Cell 19 (ladder)
- Cell 4 → Cell 4 (no ladder/snake)

Path example:
Start at 1 → Roll 1 → Cell 2
          → Roll 1 → Cell 3 → Jump to 19 (ladder)
          → Roll to reach 36

Note: Numbers go left-to-right on odd rows (from bottom),
      right-to-left on even rows
```


## Why This Matters

Game state exploration is fundamental to AI pathfinding in video games. The Snakes and Ladders problem is a simplified version of navigating a game world where some tiles have special properties (teleporters, portals, jump pads). Game AI needs to find the shortest path to objectives while accounting for these special movement rules. The BFS technique you use here scales to complex 3D game environments with power-ups, portals, and movement modifiers.

Network routing protocols face similar challenges when some connections are "express lanes" that jump across multiple hops. In software-defined networking, certain switches might have direct fiber connections to distant nodes (like ladders), while others might redirect traffic through slower paths (like snakes). The router needs to find the minimum-hop path through this graph of irregular connections, exactly like finding the minimum moves in Snakes and Ladders.

## Examples

**Example 1:**
- Input: `board = [[-1,-1],[-1,3]]`
- Output: `1`

## Constraints

- n == board.length == board[i].length
- 2 <= n <= 20
- board[i][j] is either -1 or in the range [1, n²].
- The squares labeled 1 and n² do not have any ladders or snakes.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a shortest path problem in disguise. Each cell is a node, and you can move from cell i to cells [i+1, i+6]. Snakes and ladders are just edges that redirect you. Use BFS to find the minimum number of moves.
</details>

<details>
<summary>🎯 Main Approach</summary>
First, create a helper function to convert cell numbers to board coordinates considering the Boustrophedon pattern (zigzag). Then use BFS starting from cell 1, exploring all reachable cells (1-6 steps ahead), following snakes/ladders when encountered. Track visited cells to avoid cycles.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The coordinate conversion is tricky: for a cell number, calculate row = n - 1 - (cell - 1) // n, and column depends on whether the row (from bottom) is even or odd. Pre-compute coordinates or use a clear conversion function to avoid bugs.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS | O(n²) | O(n²) | Visit each cell at most once, queue can hold O(n²) cells |

## Common Mistakes

1. **Incorrect Boustrophedon coordinate conversion**
   ```python
   # Wrong: Not handling zigzag pattern
   row = (cell - 1) // n
   col = (cell - 1) % n

   # Correct: Handle alternating row directions
   row = n - 1 - (cell - 1) // n
   if (n - 1 - row) % 2 == 1:  # odd row from bottom
       col = n - 1 - ((cell - 1) % n)
   else:
       col = (cell - 1) % n
   ```

2. **Taking multiple snakes/ladders in one turn**
   ```python
   # Wrong: Following chain of ladders
   while board[r][c] != -1:
       next_cell = board[r][c]
       r, c = get_coords(next_cell)

   # Correct: Take ladder/snake only once per move
   if board[r][c] != -1:
       next_cell = board[r][c]
   ```

3. **Not checking if already visited after taking ladder/snake**
   ```python
   # Wrong: Marking visited before snake/ladder
   visited.add(next_cell)
   if board[r][c] != -1:
       next_cell = board[r][c]

   # Correct: Mark visited after determining final position
   if board[r][c] != -1:
       next_cell = board[r][c]
   if next_cell not in visited:
       visited.add(next_cell)
       queue.append((next_cell, moves + 1))
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Knight Moves | Medium | Different movement pattern, similar BFS approach |
| Word Ladder | Hard | BFS on string transformations instead of board |
| Sliding Puzzle | Hard | BFS on board states with different movement rules |
| Jump Game IV | Hard | Graph traversal with dynamic edges |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Breadth-First Search](../../strategies/patterns/bfs.md)
