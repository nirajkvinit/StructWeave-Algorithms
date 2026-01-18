---
id: M466
old_id: A328
slug: score-after-flipping-matrix
title: Score After Flipping Matrix
difficulty: medium
category: medium
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Score After Flipping Matrix

## Problem

You have an `m x n` binary matrix (containing only 0s and 1s), and you want to maximize its "score" through strategic bit flipping.

You can perform flip operations on complete rows or columns:
- **Row flip**: Select any row and flip every bit in it (0 becomes 1, 1 becomes 0)
- **Column flip**: Select any column and flip every bit in it

Each row represents a binary number when read left to right. For example, the row `[1, 0, 1, 1]` represents the binary number `1011`, which equals 11 in decimal.

The matrix's **score** is the sum of all row values when interpreted as binary numbers.

Your goal: Perform any number of row and column flips (including zero) to maximize the total score.

For example, if you have:
```
[0, 0, 1, 1]  → binary 0011 = 3
[1, 0, 1, 0]  → binary 1010 = 10
[1, 1, 0, 0]  → binary 1100 = 12
```
Initial score = 3 + 10 + 12 = 25

But with smart flipping, you could achieve a much higher score by ensuring the leftmost bits (most significant) are 1s and optimizing the remaining columns.


**Diagram:**

Example of matrix flipping to maximize score:
```
Initial matrix:
[ 0  0  1  1 ]    Binary: 0011 = 3
[ 1  0  1  0 ]    Binary: 1010 = 10
[ 1  1  0  0 ]    Binary: 1100 = 12
                  Initial score = 3 + 10 + 12 = 25

Step 1: Flip rows to ensure first column is all 1s
(flip row 0)
[ 1  1  0  0 ]    Binary: 1100 = 12
[ 1  0  1  0 ]    Binary: 1010 = 10
[ 1  1  0  0 ]    Binary: 1100 = 12

Step 2: Flip columns to maximize 1s in each column
(flip column 1, flip column 2)
[ 1  0  1  0 ]    Binary: 1010 = 10
[ 1  1  0  0 ]    Binary: 1100 = 12
[ 1  0  1  0 ]    Binary: 1010 = 10

Better strategy - flip rows first, then optimize columns:
After row flips:        After optimal column flips:
[ 1  1  0  0 ]         [ 1  1  1  1 ]    Binary: 1111 = 15
[ 1  0  1  0 ]    →    [ 1  0  1  0 ]    Binary: 1010 = 10
[ 1  1  0  0 ]         [ 1  1  1  1 ]    Binary: 1111 = 15
                       Maximum score = 15 + 10 + 15 = 40

Key insight:
  - Always flip rows to make leftmost bit = 1 (most significant)
  - Then flip columns to maximize 1s in remaining columns
```


## Why This Matters

This problem models optimization in digital systems and data encoding. Think about error correction in data transmission where you can flip bits to maximize signal strength, or image processing where you manipulate pixel values (represented as binary) to optimize contrast. It appears in cryptography when trying to maximize randomness in bit patterns, RAID storage systems that use XOR operations for data recovery, and even in machine learning where you might flip features to improve model predictions. The greedy approach teaches you to prioritize high-impact changes first, a principle that applies to any optimization problem with varying weights.

## Examples

**Example 1:**
- Input: `grid = [[0]]`
- Output: `1`

## Constraints

- m == grid.length
- n == grid[i].length
- 1 <= m, n <= 20
- grid[i][j] is either 0 or 1.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The leftmost bit has the highest value (2^(n-1)), so maximize it first. Always flip rows to ensure the first column is all 1s. After that, for each remaining column, flip it if doing so gives more 1s than 0s (count 1s vs 0s in that column). Greedy column-by-column optimization works.
</details>

<details>
<summary>🎯 Main Approach</summary>
Two-phase greedy: (1) Flip each row if its first element is 0, making the first column all 1s. (2) For each subsequent column j, count how many 1s and 0s are in that column. If more 0s than 1s, flip the column. Calculate the final score by treating each row as a binary number.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You don't need to actually flip the matrix. For row i, track whether it's flipped with a boolean. For each cell (i, j), its effective value is grid[i][j] XOR row_flipped[i]. Then count 1s in each column considering row flips, decide on column flips, and calculate score directly.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(2^(m+n) × m × n) | O(m × n) | Try all flip combinations - impossible |
| Greedy | O(m × n) | O(m × n) | Flip rows, then optimize each column |
| Greedy (optimized) | O(m × n) | O(m) | Track flips with booleans, no copying |

## Common Mistakes

1. **Not prioritizing the first column**
   ```python
   # Wrong: Randomly flipping rows or columns
   for col in range(n):
       if count_zeros(col) > count_ones(col):
           flip_column(col)

   # Correct: First ensure first column is all 1s
   for row in range(m):
       if grid[row][0] == 0:
           flip_row(row)
   # Then optimize other columns
   ```

2. **Incorrect column flip decision**
   ```python
   # Wrong: Flipping based on original grid
   for col in range(1, n):
       if sum(grid[row][col] for row in range(m)) < m / 2:
           flip_column(col)

   # Correct: Count after row flips are considered
   for col in range(1, n):
       ones = sum(grid[row][col] ^ row_flipped[row] for row in range(m))
       if ones < m - ones:  # More 0s than 1s
           col_flipped[col] = True
   ```

3. **Not calculating score correctly**
   ```python
   # Wrong: Converting each row independently without considering flips
   score = sum(int(''.join(map(str, row)), 2) for row in grid)

   # Correct: Consider all flips when calculating
   score = 0
   for row in range(m):
       value = 0
       for col in range(n):
           bit = grid[row][col] ^ row_flipped[row] ^ col_flipped[col]
           value = value * 2 + bit
       score += value
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Flip Columns for Maximum Equal Rows | Medium | Maximize equal rows instead of sum |
| Game of Life | Medium | Cell transformations based on neighbors |
| Minimum Flips to Make a OR b Equal to c | Medium | Bit manipulation with different objective |
| Matrix Score (1 flip per row) | Easy | Simpler constraint on number of flips |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithm](../../strategies/patterns/greedy.md)
