---
id: M452
old_id: A307
slug: magic-squares-in-grid
title: Magic Squares In Grid
difficulty: medium
category: medium
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Magic Squares In Grid

## Problem

A magic square is a special 3x3 grid that has fascinated mathematicians for centuries. In a valid magic square, you must use each number from 1 to 9 exactly once, and here's the magical part: every row, every column, and both diagonal lines all add up to the same sum (which turns out to always be 15).

Here's an example of a magic square:
```
2  7  6     Each row sums to 15
9  5  1     Each column sums to 15
4  3  8     Both diagonals sum to 15
```

You're given a larger grid (can be any size from 1x1 up to 10x10), and your task is to count how many 3x3 subgrids within it are valid magic squares. A subgrid is just any 3x3 section you can extract from the larger grid.

Think of it like sliding a 3x3 window across the grid, checking each position to see if that particular window captures a magic square.

## Why This Matters

Magic square detection appears in puzzle validation systems, image processing for pattern recognition, and quality control applications where you need to verify specific structural properties in data. The broader skill of validating subgrid patterns is essential in game development (like checking win conditions in Sudoku solvers), computer vision (detecting specific patterns in pixel grids), and data validation systems that need to ensure data integrity across multi-dimensional datasets. This problem also teaches you about mathematical invariants - properties that must hold true across different configurations - a concept that's valuable in cryptography and algorithm correctness proofs.

## Examples

**Example 1:**
- Input: `grid = [[8]]`
- Output: `0`

## Constraints

- row == grid.length
- col == grid[i].length
- 1 <= row, col <= 10
- 0 <= grid[i][j] <= 15

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
For a 3x3 magic square, all rows, columns, and diagonals must sum to 15 (since 1+2+...+9 = 45, and 45/3 = 15). Additionally, all numbers 1-9 must appear exactly once. The center of a 3x3 magic square is always 5.
</details>

<details>
<summary>🎯 Main Approach</summary>
Iterate through all possible top-left corners of 3x3 subgrids. For each subgrid, first check if it contains exactly the numbers 1-9 (use a set). Then verify all row sums, column sums, and both diagonal sums equal 15. Count valid magic squares.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
There are only 8 possible 3x3 magic squares (rotations and reflections of one pattern). You can precompute these and check if the subgrid matches any of them, which is faster than computing sums. Early exits: if center != 5 or any value not in [1,9], skip validation.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Validation | O(row * col) | O(1) | Check each 3x3 subgrid with constant validation |
| Optimal (Precomputed Patterns) | O(row * col) | O(1) | Compare against 8 known magic squares |

## Common Mistakes

1. **Not checking for unique digits 1-9**
   ```python
   # Wrong: Only checking sums, not digit uniqueness
   if sum(row1) == sum(row2) == sum(row3) == 15:
       count += 1  # Missing uniqueness check!

   # Correct: Verify all digits 1-9 present
   nums = set()
   for i in range(3):
       for j in range(3):
           nums.add(grid[r+i][c+j])
   if nums != set(range(1, 10)):
       return False
   ```

2. **Forgetting to check both diagonals**
   ```python
   # Wrong: Only checking one diagonal
   diag_sum = grid[r][c] + grid[r+1][c+1] + grid[r+2][c+2]
   # Missing anti-diagonal!

   # Correct: Check both diagonals
   diag1 = grid[r][c] + grid[r+1][c+1] + grid[r+2][c+2]
   diag2 = grid[r][c+2] + grid[r+1][c+1] + grid[r+2][c]
   if diag1 != 15 or diag2 != 15:
       return False
   ```

3. **Off-by-one errors in grid iteration**
   ```python
   # Wrong: Going out of bounds
   for r in range(row):
       for c in range(col):
           # grid[r+2][c+2] will be out of bounds!

   # Correct: Leave room for 3x3 subgrid
   for r in range(row - 2):
       for c in range(col - 2):
           if is_magic_square(grid, r, c):
               count += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| N x N Magic Square | Hard | Variable size magic squares |
| Count Semi-Magic Squares | Medium | Only rows and columns sum to target (not diagonals) |
| Maximum Magic Square | Hard | Find largest magic square in grid |
| Latin Square Validation | Medium | Each row/col contains 1-n exactly once |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Matrix Traversal](../../strategies/data-structures/matrix.md)
