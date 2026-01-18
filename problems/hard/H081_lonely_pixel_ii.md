---
id: H081
old_id: A031
slug: lonely-pixel-ii
title: Lonely Pixel II
difficulty: hard
category: hard
topics: []
patterns: ["dp-2d"]
estimated_time_minutes: 45
---
# Lonely Pixel II

## Problem

You are provided with a two-dimensional grid of size `m x n` representing an image. Each cell contains either a black pixel `'B'` or a white pixel `'W'`. Given a target count value, your task is to count how many black pixels qualify as "lonely" based on specific criteria.

A black pixel at position `(r, c)` qualifies as lonely when these conditions are met:

	- The row `r` contains exactly `target` black pixels.
	- The column `c` contains exactly `target` black pixels.
	- Every row that has a black pixel in column `c` must be identical to row `r`.


**Diagram:**

```
Example 1: target = 3
Picture grid:
W W B W W
W B W W W
W B W W W
W W W B W

Checking pixel at row 1, column 1 (marked with *):
W W B W W
W B*W W W  (Row 1 has 1 black pixel - doesn't meet target=3)
W B W W W
W W W B W

Column 1 analysis:
  B (row 0, column 2)
  B (row 1, column 1)
  B (row 2, column 1)
  B (row 3, column 3)

Result: This pixel is NOT lonely because:
- Row 1 has only 1 black pixel (need 3)
- Column 1 has 2 black pixels (need 3)
```


## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Constraints

- m == picture.length
- n == picture[i].length
- 1 <= m, n <= 200
- picture[i][j] is 'W' or 'B'.
- 1 <= target <= min(m, n)

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
The problem requires three conditions to be satisfied simultaneously: row count, column count, and row identity. Instead of checking all three conditions for every pixel independently, precompute row and column statistics to avoid redundant work. Think about storing row patterns and their counts.
</details>

<details>
<summary>Main Approach</summary>
First, count black pixels in each row and column. Then, for each row that has exactly 'target' black pixels, store the row pattern as a string and group identical rows together. For each column with exactly 'target' black pixels, verify that all rows containing black pixels in that column are identical and have exactly 'target' black pixels.
</details>

<details>
<summary>Optimization Tip</summary>
Use a hash map to group identical rows and count their occurrences. When processing a column, you only need to verify that the count of identical rows equals the count of black pixels in that column. This reduces the complexity from checking every pixel individually to checking unique row patterns.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(m * n * (m + n)) | O(1) | Check all conditions for each pixel |
| Optimal | O(m * n) | O(m * n) | Precompute row/column counts and patterns |

## Common Mistakes

1. **Checking conditions pixel by pixel without preprocessing**
   ```python
   # Wrong: Recounting for every pixel
   for r in range(m):
       for c in range(n):
           if picture[r][c] == 'B':
               count = sum(1 for x in picture[r] if x == 'B')  # Recomputing every time

   # Correct: Precompute counts once
   row_counts = [sum(1 for x in row if x == 'B') for row in picture]
   col_counts = [sum(1 for r in range(m) if picture[r][c] == 'B') for c in range(n)]
   ```

2. **Not grouping identical rows efficiently**
   ```python
   # Wrong: Comparing rows repeatedly
   for each row:
       for other_row:
           if rows_equal(row, other_row):  # O(m^2 * n) comparisons

   # Correct: Use hash map with row pattern as key
   row_map = {}
   for r in range(m):
       pattern = ''.join(picture[r])
       row_map[pattern] = row_map.get(pattern, 0) + 1
   ```

3. **Forgetting to verify row identity condition**
   ```python
   # Wrong: Only checking counts
   if row_counts[r] == target and col_counts[c] == target:
       count += 1  # Missing: rows with black pixel in col c must be identical

   # Correct: Also verify all rows in column are identical
   if row_counts[r] == target and col_counts[c] == target:
       if all_rows_in_column_identical(c, r):
           count += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Lonely Pixel I | Medium | Only check row/column counts, no row identity requirement |
| Count Black Pixels | Easy | Just count total black pixels meeting simple conditions |
| Pattern Matching in Grid | Hard | Match complex patterns across rows/columns |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [2D Dynamic Programming](../../strategies/patterns/dp-2d.md)
