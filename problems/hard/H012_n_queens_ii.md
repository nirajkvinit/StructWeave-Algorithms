---
id: H012
old_id: F052
slug: n-queens-ii
title: N-Queens II
difficulty: hard
category: hard
topics: ["backtracking"]
patterns: []
estimated_time_minutes: 45
strategy_ref: ../strategies/patterns/backtracking.md
---
# N-Queens II

## Problem

Count the number of valid n-queens placements on an n×n board.

**Diagram:**

Two valid solutions for n=4:

```
Solution 1:        Solution 2:
. Q . .            . . Q .
. . . Q            Q . . .
Q . . .            . . . Q
. . Q .            . Q . .
```

Where Q represents a queen and . represents an empty cell.


## Why This Matters

Backtracking systematically explores decision trees. This problem develops your ability to generate and prune solution spaces.

## Examples

**Example 1:**
- Input: `n = 1`
- Output: `1`

## Constraints

- 1 <= n <= 9

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

**Strategy**: See [Backtracking Pattern](../strategies/patterns/backtracking.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

Since no two queens can be in the same row, you can place exactly one queen per row. The problem reduces to choosing which column to place the queen in each row. A queen attacks all cells in its row, column, and both diagonals. You can identify diagonals by their properties: cells on the same diagonal have constant (row - col) values, and cells on the same anti-diagonal have constant (row + col) values.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use backtracking with constraint tracking. For each row (0 to n-1), try placing a queen in each column (0 to n-1). Before placing, check if that column, diagonal (row - col), and anti-diagonal (row + col) are already occupied. If valid, mark them as occupied, recurse to the next row, then backtrack by unmarking. Count each time you successfully place n queens (reach row n).

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Use sets or bitmasks to track occupied columns, diagonals, and anti-diagonals for O(1) lookups. For bitmask approach, use three integers where each bit represents whether that column/diagonal/anti-diagonal is under attack. This is more memory-efficient and faster than using sets. The diagonal indices need offsetting: diagonal = row - col + (n-1) to make them 0-indexed.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n^n) | O(n) | Try all positions for each queen |
| Backtracking with Sets | O(n!) | O(n) | Pruned search tree, typical case much better |
| Backtracking with Bitmasks | O(n!) | O(n) | Same complexity, faster constants |

## Common Mistakes

1. **Only checking row and column conflicts**
   ```python
   # Wrong: Forgetting to check diagonal conflicts
   def is_valid(board, row, col):
       # Check column
       for r in range(row):
           if board[r] == col:
               return False
       return True  # Missing diagonal checks!

   # Correct: Check columns AND both diagonals
   def is_valid(cols, diags, anti_diags, row, col, n):
       diagonal = row - col + (n - 1)  # Offset to make positive
       anti_diagonal = row + col
       return (col not in cols and
               diagonal not in diags and
               anti_diagonal not in anti_diags)
   ```

2. **Incorrect diagonal identification**
   ```python
   # Wrong: Not offsetting diagonal index
   diagonal = row - col  # Can be negative!
   if diagonal in diagonals:
       return False

   # Correct: Offset to ensure non-negative indices
   diagonal = row - col + (n - 1)  # Now in range [0, 2n-2]
   anti_diagonal = row + col  # Already in range [0, 2n-2]
   ```

3. **Forgetting to backtrack properly**
   ```python
   # Wrong: Not removing queen when backtracking
   cols.add(col)
   diags.add(row - col)
   count = backtrack(row + 1)
   # Missing: removal of constraints

   # Correct: Always clean up when backtracking
   cols.add(col)
   diags.add(row - col + (n - 1))
   anti_diags.add(row + col)

   count = backtrack(row + 1)

   # Backtrack: remove constraints
   cols.remove(col)
   diags.remove(row - col + (n - 1))
   anti_diags.remove(row + col)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| N-Queens (return all solutions) | Hard | Return actual board configurations, not just count |
| N-Queens with Obstacles | Hard | Some cells are blocked and cannot have queens |
| Sudoku Solver (H007) | Hard | Similar backtracking with different constraints |
| Word Search II | Hard | Backtracking on 2D grid with different rules |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (n=1, large n)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Backtracking Pattern](../../strategies/patterns/backtracking.md)
