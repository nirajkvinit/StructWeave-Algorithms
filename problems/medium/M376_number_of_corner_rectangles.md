---
id: M376
old_id: A217
slug: number-of-corner-rectangles
title: Number Of Corner Rectangles
difficulty: medium
category: medium
topics: ["matrix", "combinatorics"]
patterns: ["dp-2d", "row-pair-matching"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - id: M012
    title: Unique Paths II
    difficulty: medium
  - id: M085
    title: Maximal Rectangle
    difficulty: medium
  - id: M336
    title: Max Sum of Rectangle No Larger Than K
    difficulty: medium
prerequisites:
  - 2D Array Traversal
  - Combinatorics (Choose 2 from N)
  - Hash Map for Pair Counting
strategy_ref: ../prerequisites/arrays.md
---
# Number Of Corner Rectangles

## Problem

You're given a 2D binary grid (containing only 0s and 1s) of size `m x n`. Your task is to count how many axis-aligned rectangles can be formed where all four corner cells contain the value `1`.

A rectangle is defined by choosing four positions in the grid: top-left, top-right, bottom-left, and bottom-right corners. For the rectangle to be valid:
- All four corners must contain `1` (not `0`)
- The rectangle must be axis-aligned (edges parallel to grid edges)
- The corners must form an actual rectangle (not a degenerate case like all in one row)
- The interior and edges between corners can contain any mix of 0s and 1s (we only care about corners)

For instance, in a 3x3 grid filled entirely with 1s, you can form 9 rectangles. Why? Fix any two rows (3 choices: rows 0-1, 0-2, or 1-2) and for each pair, pick any two columns from the three available (C(3,2) = 3 ways). So 3 row pairs × 3 column pairs = 9 rectangles.

The key insight: a rectangle is uniquely determined by choosing two rows and two columns where all four intersection points have 1s. You don't need to check four corners separately; instead, iterate through all row pairs and count column positions where both rows have 1s.

Important edge cases: if there's only one row, no rectangles exist (need at least 2 rows). Similarly, if any row pair has fewer than 2 columns with 1s in both rows, no rectangles can be formed from that pair.

**Diagram:**

Example 1: Count rectangles with 1s at corners
```
Grid:
1 0 0 1 0
0 0 1 0 1
0 0 0 1 0
1 0 1 0 1

One valid rectangle:
1 · · 1 ·     (corners at (0,0), (0,3), (3,0), (3,3))
· · · · ·
· · · · ·
1 · · · ·

Result: 1 rectangle
```

Example 2:
```
Grid:
1 1 1
1 1 1
1 1 1

Count all possible rectangles using 1s as corners:
- Using rows 0,1: 3 rectangles (C(3,2) = 3)
- Using rows 0,2: 3 rectangles
- Using rows 1,2: 3 rectangles

Result: 9 rectangles
```

Example 3:
```
Grid:
1 1 1 1

No rectangles (need at least 2 rows)
Result: 0
```


## Why This Matters

This problem teaches combinatorial thinking in 2D spaces, a skill essential for image processing (detecting rectangular features), computational geometry (rectangle intersection problems), and VLSI design (chip layout verification). The row-pair iteration technique is a classic optimization pattern that reduces brute-force O(n^4) checking to O(n^2 * m). Understanding how to apply combinatorial formulas (like "choose 2 from k") to count configurations without enumerating them explicitly is valuable for analyzing grid-based games, spatial databases, and pattern recognition algorithms. This appears in interviews for companies working with maps, graphics, or matrix-heavy computations.

## Constraints

- m == grid.length
- n == grid[i].length
- 1 <= m, n <= 200
- grid[i][j] is either 0 or 1.
- The number of 1's in the grid is in the range [1, 6000].

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Fix Two Rows and Count Column Pairs</summary>

The key insight is to consider rectangles row-by-row. A rectangle is defined by two rows and two columns where all four corners have value `1`.

Fix two rows `i` and `j` (where `i < j`). For these rows to form rectangles, we need to find column positions where BOTH rows have a `1`.

If rows `i` and `j` have `1`s at columns `[c1, c2, c3, c4]`, then the number of rectangles formed is C(4, 2) = 6 (choose any 2 columns from 4).

General formula: If there are `k` columns where both rows have `1`s, the number of rectangles is `k * (k - 1) / 2`.

</details>

<details>
<summary>Hint 2: Iterate Through All Row Pairs</summary>

Algorithm outline:
```
count = 0
for i in range(m):
    for j in range(i + 1, m):
        # Find columns where both row[i] and row[j] have 1
        common_cols = 0
        for col in range(n):
            if grid[i][col] == 1 and grid[j][col] == 1:
                common_cols += 1
        # Add number of rectangles for this row pair
        count += common_cols * (common_cols - 1) // 2
return count
```

Time complexity: O(m² * n) where m is rows, n is columns.

</details>

<details>
<summary>Hint 3: Optimization with Column Pair Counting</summary>

Alternative approach: Instead of iterating through all row pairs, track column pairs.

For each pair of rows, identify which column pairs both have `1`s. Use a hash map to count how many times each column pair appears across all row pairs.

If columns `(c1, c2)` both have `1`s in `k` different row pairs, they form `k * (k - 1) / 2` rectangles.

This optimization helps when the grid is sparse (many 0s):
```python
from collections import defaultdict
count_map = defaultdict(int)
for row in grid:
    cols_with_ones = [c for c in range(n) if row[c] == 1]
    for i in range(len(cols_with_ones)):
        for j in range(i + 1, len(cols_with_ones)):
            count_map[(cols_with_ones[i], cols_with_ones[j])] += 1

result = sum(k * (k - 1) // 2 for k in count_map.values())
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (check all 4-tuples) | O(m² * n²) | O(1) | Check every possible rectangle |
| Row Pair Iteration | O(m² * n) | O(1) | For each row pair, scan columns |
| Column Pair Hash Map | O(m * c²) where c = avg 1s per row | O(n²) | Better for sparse grids |
| Optimized Row Pair | O(m² * n) | O(1) | Most straightforward optimal solution |

## Common Mistakes

### Mistake 1: Forgetting Combinatorial Formula
```python
# Wrong: Counting column pairs incorrectly
def countCornerRectangles(grid):
    count = 0
    for i in range(len(grid)):
        for j in range(i + 1, len(grid)):
            common_cols = sum(1 for c in range(len(grid[0]))
                             if grid[i][c] == 1 and grid[j][c] == 1)
            count += common_cols  # Wrong! Should be C(common_cols, 2)
    return count
```

**Fix:** Use the combination formula:
```python
# Correct: C(k, 2) = k * (k - 1) / 2
count += common_cols * (common_cols - 1) // 2
```

### Mistake 2: Not Handling Single Column Case
```python
# Wrong: Dividing when common_cols < 2
def countCornerRectangles(grid):
    count = 0
    for i in range(len(grid)):
        for j in range(i + 1, len(grid)):
            common_cols = sum(1 for c in range(len(grid[0]))
                             if grid[i][c] == 1 and grid[j][c] == 1)
            # If common_cols == 1, this adds 0 which is correct
            # If common_cols == 0, this also adds 0 which is correct
            count += common_cols * (common_cols - 1) // 2
    return count
```

**Note:** This is actually correct! When `common_cols` is 0 or 1, the formula gives 0, which is the correct answer. No special case needed.

### Mistake 3: Incorrect Row Pair Selection
```python
# Wrong: Not iterating all unique pairs
def countCornerRectangles(grid):
    m = len(grid)
    count = 0
    for i in range(m):
        for j in range(m):  # Should be range(i+1, m)
            if i == j:
                continue
            # This counts each pair twice!
```

**Fix:** Use proper range for unique pairs:
```python
# Correct: Only iterate upper triangle (i < j)
for i in range(m):
    for j in range(i + 1, m):  # j starts at i+1
        # Process row pair (i, j)
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Number of Squares | Count only squares (not all rectangles) | Medium |
| Largest Rectangle Area | Find area of largest rectangle with 1s | Hard |
| Corner Rectangles with Constraint | All interior cells must also be 1 | Medium |
| 3D Corner Cubes | Extend to 3D grid counting cubes | Hard |
| Weighted Corner Rectangles | Each 1 has a weight, maximize sum | Hard |

## Practice Checklist

- [ ] First attempt (within 30 minutes)
- [ ] Implement row-pair iteration solution
- [ ] Understand combinatorial formula C(n,2)
- [ ] Handle edge cases (single row, no 1s)
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Can explain time complexity tradeoffs
- [ ] Attempted Maximal Rectangle variation

**Strategy**: See [Array Fundamentals](../prerequisites/arrays.md)
