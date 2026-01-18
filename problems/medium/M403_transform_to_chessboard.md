---
id: M403
old_id: A249
slug: transform-to-chessboard
title: Transform to Chessboard
difficulty: medium
category: medium
topics: []
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Transform to Chessboard

## Problem

You're given an `n x n` binary grid (containing only 0s and 1s) and can perform two types of operations: swapping any two entire rows or swapping any two entire columns. Your goal is to transform the grid into a valid chessboard pattern using the minimum number of swaps.

A chessboard pattern is one where no two adjacent cells (horizontally or vertically) contain the same value. In other words, every 0 must be surrounded by 1s, and every 1 must be surrounded by 0s, creating the familiar alternating pattern of a chessboard.

The critical constraint is that not all grids can be transformed into a chessboard, no matter how many swaps you perform. A grid is only transformable if it already has a specific underlying structure: exactly two unique row patterns that are complements of each other (all 0s become 1s and vice versa), and the same for columns. Additionally, the count of 0s and 1s in any row or column must differ by at most 1.

If transformation is impossible, return `-1`. If possible, return the minimum number of swaps needed.

```
Example 1: board = [[0,1,1,0],[0,1,1,0],[1,0,0,1],[1,0,0,1]]

Initial board:
┌─┬─┬─┬─┐
│0│1│1│0│
├─┼─┼─┼─┤
│0│1│1│0│
├─┼─┼─┼─┤
│1│0│0│1│
├─┼─┼─┼─┤
│1│0│0│1│
└─┴─┴─┴─┘

After swapping columns 1 and 2:
┌─┬─┬─┬─┐
│0│1│1│0│
├─┼─┼─┼─┤
│0│1│1│0│
├─┼─┼─┼─┤
│1│0│0│1│
├─┼─┼─┼─┤
│1│0│0│1│
└─┴─┴─┴─┘

After swapping rows 1 and 2:
┌─┬─┬─┬─┐
│0│1│1│0│  ← Valid chessboard pattern
├─┼─┼─┼─┤
│1│0│0│1│  ← No adjacent cells have same value
├─┼─┼─┼─┤
│0│1│1│0│
├─┼─┼─┼─┤
│1│0│0│1│
└─┴─┴─┴─┘

Total moves: 2

Example 2: board = [[0,1],[1,0]]
Already a valid chessboard, return 0.

Example 3: board = [[1,0],[1,0]]
Impossible to create chessboard pattern, return -1.
```


## Why This Matters

This problem combines pattern recognition, mathematical constraints, and efficient counting to solve what initially appears to be a complex state-space search. It teaches you to validate preconditions before attempting optimization - a crucial skill in algorithm design.

The underlying technique generalizes to problems involving permutations with constraints, such as sorting with limited operations, puzzle solving, and configuration verification. Understanding when a solution exists (and proving impossibility) is often as important as finding the solution itself.

This type of problem appears in technical interviews at top companies because it tests multiple skills: identifying invariants, recognizing that row and column operations are independent, and finding closed-form solutions rather than searching through all possible swap sequences.

## Constraints

- n == board.length
- n == board[i].length
- 2 <= n <= 30
- board[i][j] is either 0 or 1.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
A valid chessboard has only two unique row patterns (and two unique column patterns), and they must be complements of each other. For a board to be transformable, it must already satisfy: only 2 unique rows, only 2 unique columns, and the counts of 0s and 1s in any row/column differ by at most 1. If these conditions hold, count swaps needed for rows and columns independently.
</details>

<details>
<summary>🎯 Main Approach</summary>
First validate if transformation is possible: check if there are exactly 2 unique rows that are complements, same for columns, and the count of 0s and 1s is valid. Then calculate minimum swaps for rows and columns separately. For each, compare current arrangement with two valid target patterns (starting with 0 or 1) and choose the one requiring fewer swaps. If n is odd, only one pattern is valid.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You only need to check the first row and first column to validate the entire board structure due to the chessboard property. Count mismatches between current and target patterns - the number of swaps is half the mismatches (since each swap fixes two positions). For odd n, use the pattern that matches parity of 0s or 1s count.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Validation + Counting | O(n²) | O(n²) | Check all cells and unique rows/cols |
| Optimal | O(n²) | O(n) | Can optimize space by checking patterns |

## Common Mistakes

1. **Not validating before counting swaps**
   ```python
   # Wrong: Assuming all boards can be transformed
   def movesToChessboard(board):
       n = len(board)
       swaps = 0
       # Count swaps without checking if valid
       for i in range(n):
           if board[0][i] != i % 2:
               swaps += 1
       return swaps

   # Correct: Validate first, then count
   def movesToChessboard(board):
       n = len(board)
       # Check if there are exactly 2 unique rows (complements)
       rows = set(tuple(row) for row in board)
       if len(rows) != 2:
           return -1
       row1, row2 = list(rows)
       if any(r1 ^ r2 != 1 for r1, r2 in zip(row1, row2)):
           return -1
       # Similar validation for columns, counts, etc.
       # Then calculate swaps
   ```

2. **Forgetting odd/even board constraints**
   ```python
   # Wrong: Not handling odd n correctly
   def countSwaps(arr):
       swaps_to_01 = sum(arr[i] != i % 2 for i in range(len(arr)))
       swaps_to_10 = sum(arr[i] != 1 - i % 2 for i in range(len(arr)))
       return min(swaps_to_01, swaps_to_10) // 2

   # Correct: For odd n, only one pattern is valid
   def countSwaps(arr):
       n = len(arr)
       swaps_to_01 = sum(arr[i] != i % 2 for i in range(n))
       swaps_to_10 = sum(arr[i] != 1 - i % 2 for i in range(n))
       if n % 2 == 1:
           # Only the pattern with matching parity is valid
           return swaps_to_01 // 2 if swaps_to_01 % 2 == 0 else swaps_to_10 // 2
       return min(swaps_to_01, swaps_to_10) // 2
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Valid sudoku | Medium | Different validation pattern |
| Toeplitz matrix | Easy | Check diagonal pattern |
| Magic squares | Medium | Additional sum constraints |
| Minimum swaps to sort | Medium | Similar swap counting logic |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Matrix Patterns](../../strategies/patterns/matrix-manipulation.md)
