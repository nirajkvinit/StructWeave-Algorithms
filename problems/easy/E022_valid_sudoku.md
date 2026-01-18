---
id: E022
old_id: F036
slug: valid-sudoku
title: Valid Sudoku
difficulty: easy
category: easy
topics: ["array", "hash-table", "matrix"]
patterns: ["hash-set-validation"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["M326", "H037", "M074"]
prerequisites: ["hash-sets", "2d-arrays"]
strategy_ref: ../../strategies/data-structures/hash-table.md
---
# Valid Sudoku

## Problem

Given a 9x9 Sudoku board, determine whether the current configuration of filled cells is valid according to Sudoku rules. You don't need to check if the puzzle is solvable or complete - only validate the cells that are already filled.

A valid Sudoku board must satisfy three rules simultaneously:
1. Each row must contain the digits 1-9 without repetition (empty cells marked with '.' are ignored)
2. Each column must contain the digits 1-9 without repetition
3. Each of the nine 3x3 sub-boxes (shown by the thick borders in the diagram above) must contain the digits 1-9 without repetition

For example, if you find two 8's in the same row, the board is invalid. If you find a 5 appearing twice in the top-left 3x3 sub-box, it's invalid. The challenge is efficiently checking all three constraints across the partially filled board, tracking which numbers you've seen in each row, column, and box.

**Diagram:**

```
Valid Sudoku Example (9x9 grid):

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

Rules to validate:
• Each row must contain digits 1-9 without repetition
• Each column must contain digits 1-9 without repetition
• Each 3×3 sub-box must contain digits 1-9 without repetition
• Empty cells are marked with '.'
```


## Why This Matters

This problem teaches essential hash table techniques for constraint validation and duplicate detection. It demonstrates:

- **Hash-based validation**: Using hash sets or maps to efficiently detect duplicates across multiple dimensions (rows, columns, boxes).
- **Index mapping**: Converting 2D coordinates into unique identifiers for the nine 3x3 sub-boxes - a critical skill for matrix problems.
- **Single-pass algorithms**: Checking multiple constraints simultaneously in one iteration through the data.

This pattern appears in many real-world scenarios: validating game states, detecting conflicts in scheduling systems, ensuring data integrity constraints, and checking configuration validity. The technique of encoding multiple dimensions into unique hash keys is particularly valuable across constraint satisfaction problems.

## Examples

**Example 1:**
- Input: `board =
[["8","3",".",".","7",".",".",".","."]
,["6",".",".","1","9","5",".",".","."]
,[".","9","8",".",".",".",".","6","."]
,["8",".",".",".","6",".",".",".","3"]
,["4",".",".","8",".","3",".",".","1"]
,["7",".",".",".","2",".",".",".","6"]
,[".","6",".",".",".",".","2","8","."]
,[".",".",".","4","1","9",".",".","5"]
,[".",".",".",".","8",".",".","7","9"]]`
- Output: `false`
- Explanation: Same as Example 1, except with the **5** in the top left corner being modified to **8**. Since there are two 8's in the top left 3x3 sub-box, it is invalid.

## Constraints

- board.length == 9
- board[i].length == 9
- board[i][j] is a digit 1-9 or '.'.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Tracking What You've Seen</summary>

You need to verify three separate rules: no duplicates in rows, columns, or 3x3 boxes. What data structure is perfect for detecting duplicates efficiently? How can you iterate through the board just once while checking all three conditions?

Key insight: Can you encode position information to uniquely identify which row, column, and box each number belongs to?

</details>

<details>
<summary>🎯 Hint 2: Single Pass with Hash Sets</summary>

Use separate hash sets (or a single set with encoded keys) to track seen numbers. For each cell (i, j), you need to check:
- Row i contains the number
- Column j contains the number
- Box (i//3, j//3) contains the number

Think: How can you create unique string keys like "4 in row 0" or "7 in box (1,2)" to store in a single set?

</details>

<details>
<summary>📝 Hint 3: Implementation Strategy</summary>

```
Single Pass Algorithm:
1. Create a hash set to store seen values
2. For each cell (i, j) in 9x9 board:
   - If cell is '.', skip it
   - Create three unique keys:
     * row_key = f"{num} in row {i}"
     * col_key = f"{num} in col {j}"
     * box_key = f"{num} in box {i//3},{j//3}"
   - If any key exists in set, return False
   - Add all three keys to set
3. Return True if no duplicates found

Box calculation:
- Box row index: i // 3
- Box col index: j // 3
- This divides the 9x9 grid into 9 boxes of 3x3
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (9 passes) | O(81 × 9) = O(729) | O(1) | Check each row, col, box separately |
| **Optimal (Hash Set)** | **O(81) = O(1)** | **O(81) = O(1)** | Single pass, fixed board size |
| Array-based Tracking | O(81) | O(243) | Use boolean arrays instead of sets |

## Common Mistakes

### 1. Incorrect Box Index Calculation
```python
# WRONG: Using modulo for box calculation
box_index = (i % 3) * 3 + (j % 3)

# CORRECT: Use integer division
box_index = (i // 3) * 3 + (j // 3)
# Or keep as tuple: (i // 3, j // 3)
```

### 2. Not Skipping Empty Cells
```python
# WRONG: Trying to validate '.' characters
for i in range(9):
    for j in range(9):
        if board[i][j] in seen:
            return False

# CORRECT: Skip empty cells
for i in range(9):
    for j in range(9):
        if board[i][j] != '.':
            # validation logic here
```

### 3. Reusing Hash Set Incorrectly
```python
# WRONG: Clearing set between checks loses information
seen = set()
# check rows
seen.clear()  # This loses row information!
# check columns

# CORRECT: Use unique keys or separate sets
seen = set()
# Use keys like "5 in row 3", "5 in col 2"
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Variable Size Sudoku | n×n board with √n×√n boxes | Generalize box calculation to (i//√n, j//√n) |
| Solve Sudoku | Fill in empty cells | Use backtracking with validation as constraint |
| Count Valid Boards | Count valid configurations | Use dynamic programming with state compression |

## Practice Checklist

**Correctness:**
- [ ] Handles empty board (all '.')
- [ ] Handles full valid board
- [ ] Detects row duplicates
- [ ] Detects column duplicates
- [ ] Detects box duplicates
- [ ] Returns correct boolean

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 15 minutes
- [ ] Can discuss complexity (O(1) since fixed size)
- [ ] Can explain box index calculation

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve Sudoku Solver variation
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Hash Table](../../strategies/data-structures/hash-table.md)
