---
id: H007
old_id: F037
slug: sudoku-solver
title: Sudoku Solver
difficulty: hard
category: hard
topics: ["backtracking"]
patterns: ["dp-2d"]
estimated_time_minutes: 45
strategy_ref: ../strategies/patterns/backtracking.md
---
# Sudoku Solver

## Problem

Solve a Sudoku puzzle by filling empty cells with digits 1-9 following Sudoku rules.

**Diagram:**

Input Puzzle:
```
  ╔═══╤═══╤═══╦═══╤═══╤═══╦═══╤═══╤═══╗
  ║ 5 │ 3 │ . ║ . │ 7 │ . ║ . │ . │ . ║
  ╟───┼───┼───╫───┼───┼───╫───┼───┼───╢
  ║ 6 │ . │ . ║ 1 │ 9 │ 5 ║ . │ . │ . ║
  ╟───┼───┼───╫───┼───┼───╫───┼───┼───╢
  ║ . │ 9 │ 8 ║ . │ . │ . ║ . │ 6 │ . ║
  ╠═══╪═══╪═══╬═══╪═══╪═══╬═══╪═══╪═══╣
  ║ 8 │ . │ . ║ . │ 6 │ . ║ . │ . │ 3 ║
  ╟───┼───┼───╫───┼───┼───╫───┼───┼───╢
  ║ 4 │ . │ . ║ 8 │ . │ 3 ║ . │ . │ 1 ║
  ╟───┼───┼───╫───┼───┼───╫───┼───┼───╢
  ║ 7 │ . │ . ║ . │ 2 │ . ║ . │ . │ 6 ║
  ╠═══╪═══╪═══╬═══╪═══╪═══╬═══╪═══╪═══╣
  ║ . │ 6 │ . ║ . │ . │ . ║ 2 │ 8 │ . ║
  ╟───┼───┼───╫───┼───┼───╫───┼───┼───╢
  ║ . │ . │ . ║ 4 │ 1 │ 9 ║ . │ . │ 5 ║
  ╟───┼───┼───╫───┼───┼───╫───┼───┼───╢
  ║ . │ . │ . ║ . │ 8 │ . ║ . │ 7 │ 9 ║
  ╚═══╧═══╧═══╩═══╧═══╧═══╩═══╧═══╧═══╝
```

Solution:
```
  ╔═══╤═══╤═══╦═══╤═══╤═══╦═══╤═══╤═══╗
  ║ 5 │ 3 │ 4 ║ 6 │ 7 │ 8 ║ 9 │ 1 │ 2 ║
  ╟───┼───┼───╫───┼───┼───╫───┼───┼───╢
  ║ 6 │ 7 │ 2 ║ 1 │ 9 │ 5 ║ 3 │ 4 │ 8 ║
  ╟───┼───┼───╫───┼───┼───╫───┼───┼───╢
  ║ 1 │ 9 │ 8 ║ 3 │ 4 │ 2 ║ 5 │ 6 │ 7 ║
  ╠═══╪═══╪═══╬═══╪═══╪═══╬═══╪═══╪═══╣
  ║ 8 │ 5 │ 9 ║ 7 │ 6 │ 1 ║ 4 │ 2 │ 3 ║
  ╟───┼───┼───╫───┼───┼───╫───┼───┼───╢
  ║ 4 │ 2 │ 6 ║ 8 │ 5 │ 3 ║ 7 │ 9 │ 1 ║
  ╟───┼───┼───╫───┼───┼───╫───┼───┼───╢
  ║ 7 │ 1 │ 3 ║ 9 │ 2 │ 4 ║ 8 │ 5 │ 6 ║
  ╠═══╪═══╪═══╬═══╪═══╪═══╬═══╪═══╪═══╣
  ║ 9 │ 6 │ 1 ║ 5 │ 3 │ 7 ║ 2 │ 8 │ 4 ║
  ╟───┼───┼───╫───┼───┼───╫───┼───┼───╢
  ║ 2 │ 8 │ 7 ║ 4 │ 1 │ 9 ║ 6 │ 3 │ 5 ║
  ╟───┼───┼───╫───┼───┼───╫───┼───┼───╢
  ║ 3 │ 4 │ 5 ║ 2 │ 8 │ 6 ║ 1 │ 7 │ 9 ║
  ╚═══╧═══╧═══╩═══╧═══╧═══╩═══╧═══╧═══╝
```


## Why This Matters

Backtracking systematically explores decision trees. This problem develops your ability to generate and prune solution spaces.

## Constraints

- board.length == 9
- board[i].length == 9
- board[i][j] is a digit or '.'.
- It is **guaranteed** that the input board has only one solution.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

**Strategy**: See [Backtracking Pattern](../strategies/patterns/backtracking.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

Sudoku is a constraint satisfaction problem - each cell has constraints from its row, column, and 3x3 box. The key insight is that backtracking can systematically try all valid possibilities for empty cells and backtrack when a dead-end is reached. You don't need to try all 9 digits for each cell - only try digits that don't violate current constraints.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use backtracking: find an empty cell, try placing digits 1-9, and check if each digit is valid (not in same row, column, or 3x3 box). If valid, place the digit and recursively solve the rest. If recursion succeeds, you're done. If it fails, backtrack by removing the digit and trying the next one. Use sets or bitmasks to efficiently track which digits are used in each row, column, and box.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Instead of checking validity after each placement, maintain three sets of sets: rows[i], cols[j], and boxes[k] tracking used digits. This makes validity checks O(1). Further optimize by choosing the cell with fewest valid options (most constrained first) - this prunes the search tree earlier. The box index can be calculated as: box_idx = (row // 3) * 3 + (col // 3).

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(9^81) | O(81) | Try all digits for all cells - exponential |
| Backtracking | O(9^m) | O(m) | m = empty cells, pruned by constraints |
| Optimized Backtracking | O(9^m) | O(81) | Use constraint propagation, m typically small |

## Common Mistakes

1. **Inefficient validity checking**
   ```python
   # Wrong: Checking entire row/column/box on each placement
   def is_valid(board, row, col, num):
       # Check row
       for c in range(9):
           if board[row][c] == num:
               return False
       # Similar for column and box... O(27) per check!

   # Correct: Use sets to track used numbers - O(1) checks
   rows = [set() for _ in range(9)]
   cols = [set() for _ in range(9)]
   boxes = [set() for _ in range(9)]

   def is_valid(row, col, num):
       box_idx = (row // 3) * 3 + (col // 3)
       return num not in rows[row] and num not in cols[col] and num not in boxes[box_idx]
   ```

2. **Not backtracking properly**
   ```python
   # Wrong: Forgetting to remove the placed digit when backtracking
   board[row][col] = str(num)
   if solve(board):
       return True
   # Missing: board[row][col] = '.'

   # Correct: Always undo changes when backtracking
   board[row][col] = str(num)
   rows[row].add(num)
   cols[col].add(num)
   boxes[box_idx].add(num)

   if solve(board):
       return True

   # Backtrack
   board[row][col] = '.'
   rows[row].remove(num)
   cols[col].remove(num)
   boxes[box_idx].remove(num)
   ```

3. **Incorrect box index calculation**
   ```python
   # Wrong: Incorrect box indexing
   box_idx = row * 3 + col  # This is wrong!

   # Correct: Proper box index calculation
   box_idx = (row // 3) * 3 + (col // 3)
   # Row 0-2, Col 0-2 → Box 0
   # Row 0-2, Col 3-5 → Box 1
   # Row 3-5, Col 0-2 → Box 3
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Valid Sudoku | Medium | Only validate, don't solve |
| N-Queens | Hard | Different constraint rules, variable board size |
| Word Search II | Hard | Similar backtracking, different constraints |
| Sudoku with Diagonal Constraint | Hard | Additional diagonal constraints |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (invalid puzzles, multiple solutions)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Backtracking Pattern](../../strategies/patterns/backtracking.md)
