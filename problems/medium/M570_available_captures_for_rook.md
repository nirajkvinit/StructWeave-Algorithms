---
id: M570
old_id: A466
slug: available-captures-for-rook
title: Available Captures for Rook
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Available Captures for Rook

## Problem

Picture a chess position where you have one white rook on the board, along with some white bishops (your pieces) and black pawns (enemy pieces). You need to count how many black pawns your rook can capture in a single move.

You're given an `8 x 8` chessboard represented as a 2D array containing:
- `'R'` - exactly one white rook (your piece)
- `'B'` - white bishops (your pieces that block the rook)
- `'p'` - black pawns (enemy pieces you can capture)
- `'.'` - empty squares

In chess, a rook moves in straight lines along rows and columns (north, south, east, or west) for any distance. It can capture the first enemy piece it encounters in any direction, but it cannot jump over or move past any piece (whether friendly or enemy).

Count how many black pawns the rook is currently attacking - meaning pawns it could capture on its next move.

A rook can capture a pawn if:
1. The pawn is in the same row or column as the rook
2. There are only empty squares between the rook and the pawn
3. No white bishop blocks the path


**Diagram:**

Example 1: Rook can capture 3 pawns
```
[., ., ., ., ., ., ., .]
[., ., p, p, p, p, p, .]
[., p, p, B, p, p, p, .]
[., p, B, R, B, p, B, .]  ← Rook at (3,3)
[., p, p, B, p, p, p, .]
[., ., p, p, p, p, p, .]
[., ., ., ., ., ., ., .]
[., ., ., ., ., ., ., .]

Rook can capture: East (3,4), North (2,3), South (4,3)
Output: 3
```

Example 2: Rook can capture 0 pawns
```
[., ., ., ., ., ., ., .]
[., p, p, p, p, p, ., .]
[., p, p, B, p, p, ., .]
[., p, B, R, B, p, ., .]  ← Rook blocked by bishops
[., ., ., B, ., ., ., .]
[., ., ., p, ., ., ., .]
[., ., ., ., ., ., ., .]
[., ., ., ., ., ., ., .]

Output: 0 (bishops block all directions)
```

Example 3: Rook can capture 3 pawns
```
[., ., ., ., ., ., ., .]
[., ., ., p, ., ., ., .]
[., ., ., p, ., ., ., .]
[p, p, ., R, ., p, B, .]  ← Rook at (3,3)
[., ., ., p, ., ., ., .]
[., ., ., p, ., ., ., .]
[., ., ., ., ., ., ., .]
[., ., ., ., ., ., ., .]

Rook can capture: West (3,0), North (1,3), South (4,3)
Output: 3
```


## Why This Matters

Grid traversal with directional movement appears in countless applications beyond chess. This exact pattern powers game engines (calculating attack ranges and line-of-sight in strategy games), robotics pathfinding (determining sensor visibility with obstacles), image processing (detecting objects along scan lines), and ray tracing in computer graphics (finding first intersection with geometry). The technique of scanning in cardinal directions until hitting a boundary or obstacle is fundamental to implementing AI for board games, collision detection in physics engines, analyzing spatial relationships in geographic information systems, and optimizing warehouse robot navigation where movement is constrained to aisles.

## Constraints

- board.length == 8
- board[i].length == 8
- board[i][j] is either 'R', '.', 'B', or 'p'
- There is exactly one cell with board[i][j] == 'R'

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The rook moves in straight lines (4 directions). For each direction, move step by step until you hit a pawn (count it), a bishop (stop), or the board edge (stop). This is essentially 4 linear searches.
</details>

<details>
<summary>🎯 Main Approach</summary>
First, find the rook's position by scanning the board. Then, for each of the 4 directions (north, south, east, west), iterate in that direction until you encounter: (1) a pawn 'p' (increment count and stop), (2) a bishop 'B' (stop), or (3) board boundary (stop).
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use direction vectors: [(-1,0), (1,0), (0,-1), (0,1)] for north, south, west, east. This allows you to use a single loop for all 4 directions instead of writing 4 separate loops. The board is only 8x8, so optimization doesn't matter much here.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Four Directional Scans | O(64) = O(1) | O(1) | Fixed 8x8 board |
| Optimal | O(1) | O(1) | Constant size board (8x8) |

## Common Mistakes

1. **Not Stopping at Bishops**
   ```python
   # Wrong: Only checking for pawns and edges
   def search_direction(board, row, col, dr, dc):
       count = 0
       r, c = row + dr, col + dc
       while 0 <= r < 8 and 0 <= c < 8:
           if board[r][c] == 'p':
               count += 1
               break
           # Missing: stop at bishop!
           r += dr
           c += dc

   # Correct: Stop at bishops too
   while 0 <= r < 8 and 0 <= c < 8:
       if board[r][c] == 'p':
           count += 1
           break
       if board[r][c] == 'B':  # Bishop blocks
           break
       r += dr
       c += dc
   ```

2. **Counting Multiple Pawns in One Direction**
   ```python
   # Wrong: Continuing after finding first pawn
   while in_bounds:
       if board[r][c] == 'p':
           count += 1  # Don't break - might count multiple!
       r += dr
       c += dc

   # Correct: Stop after first capture
   while in_bounds:
       if board[r][c] == 'p':
           count += 1
           break  # Rook can only capture one pawn per direction
       if board[r][c] == 'B':
           break
   ```

3. **Incorrect Direction Vectors**
   ```python
   # Wrong: Incorrect direction mappings
   directions = [(0, 1), (0, -1), (1, 1), (-1, -1)]  # Includes diagonals!

   # Correct: Only 4 cardinal directions
   directions = [
       (-1, 0),  # North (up)
       (1, 0),   # South (down)
       (0, -1),  # West (left)
       (0, 1)    # East (right)
   ]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Available Captures for Bishop | Easy | Search diagonally instead of horizontally/vertically |
| Queens That Can Attack the King | Medium | Check 8 directions (including diagonals) |
| Check if Move is Legal | Medium | Validate chess moves with more complex rules |
| Minimum Knight Moves | Medium | BFS for shortest path with knight movement |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Matrix Traversal](../../strategies/fundamentals/matrix-traversal.md)
