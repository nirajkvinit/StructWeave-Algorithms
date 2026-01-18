---
id: M242
old_id: A029
slug: lonely-pixel-i
title: Lonely Pixel I
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems:
  - id: E001
    title: Two Sum
    difficulty: easy
  - id: M001
    title: Add Two Numbers
    difficulty: medium
prerequisites:
  - 2D array traversal
  - Counting and aggregation
  - Hash maps
---
# Lonely Pixel I

## Problem

Given a 2D grid called picture containing black pixels ('B') and white pixels ('W'), count how many black pixels are "lonely." A black pixel is lonely if it's the only black pixel in both its row and its column. In other words, for a black pixel at position (row, col) to be lonely, there must be exactly one 'B' in that entire row, and exactly one 'B' in that entire column, and it must be the same pixel.

Think of it like placing pieces on a chess board where you want to find pieces that have no other pieces in their row or column. For example, if you have a 3x3 grid with black pixels at positions (0,2), (1,1), and (2,2), only the pixel at (1,1) is lonely because column 2 has two black pixels (rows 0 and 2 share it), but column 1 has just one black pixel.

The challenge here is efficiency: you could check each black pixel by scanning its entire row and column, but that would be slow for large grids. Instead, precomputing row and column counts lets you answer the "lonely" question for each pixel in constant time. This preprocessing pattern, where you invest O(m*n) time upfront to enable O(1) lookups later, is a common optimization technique for grid and matrix problems.


**Diagram:**

```
Example 1:
┌─────┐
│ W W B│  Row 0: 1 black pixel (column 2)
│ W B W│  Row 1: 1 black pixel (column 1)
│ W W B│  Row 2: 1 black pixel (column 2)
└─────┘
Col:0 1 2

Column analysis:
- Column 0: 0 black pixels
- Column 1: 1 black pixel (row 1) ✓ Lonely
- Column 2: 2 black pixels (rows 0,2) ✗ Not lonely

Lonely pixels: 1 (at position [1,1])

Example 2:
┌─────┐
│ W B W│  Row 0: 1 black pixel (column 1)
│ B W W│  Row 1: 1 black pixel (column 0)
│ W B W│  Row 2: 1 black pixel (column 1)
└─────┘

Column 1: 2 black pixels → Not lonely
Column 0: 1 black pixel → Lonely ✓
Lonely pixels: 1 (at position [1,0])
```


## Why This Matters

This problem teaches a critical optimization pattern: preprocessing with auxiliary data structures to avoid redundant computation. In image processing, data validation, and constraint checking systems, you often need to evaluate multi-dimensional conditions repeatedly. By investing O(m+n) space to store row and column statistics, you transform a potentially O(m*n*(m+n)) brute force approach into an optimal O(m*n) solution. This tradeoff between space and time is fundamental to algorithm design and appears in problems involving matrix operations, database queries, and statistical analysis where caching aggregated metrics dramatically improves performance.

## Constraints

- m == picture.length
- n == picture[i].length
- 1 <= m, n <= 500
- picture[i][j] is 'W' or 'B'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Precompute row and column counts</summary>

A black pixel can only be lonely if:
1. Its row has exactly 1 black pixel, AND
2. Its column has exactly 1 black pixel

Instead of checking this condition repeatedly, make two preprocessing passes:
- First pass: Count black pixels in each row
- Second pass: Count black pixels in each column

Store these counts in arrays `row_count[m]` and `col_count[n]`.

</details>

<details>
<summary>Hint 2: Single pass validation</summary>

After preprocessing, iterate through all black pixels. For each black pixel at position (r, c):
```
if row_count[r] == 1 and col_count[c] == 1:
    lonely_count += 1
```

This avoids redundant checking and runs in O(m*n) time.

</details>

<details>
<summary>Hint 3: Space optimization consideration</summary>

The preprocessing approach uses O(m + n) extra space for the count arrays. This is optimal for this problem.

Alternative: You could check each black pixel by scanning its entire row and column (O(m + n) per pixel), but this would be O(m*n*(m+n)) overall - much worse for large grids.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute force | O(m*n*(m+n)) | O(1) | Check each pixel's row and column individually |
| Preprocessing counts | O(m*n) | O(m+n) | Optimal solution; one pass to count, one to validate |
| Hash map of positions | O(m*n) | O(m*n) | Store all black pixel positions; unnecessary overhead |

## Common Mistakes

1. Counting the same pixel multiple times

```python
# Wrong: May count lonely pixels multiple times
lonely = 0
for r in range(m):
    for c in range(n):
        if picture[r][c] == 'B':
            if is_only_in_row(r) and is_only_in_column(c):
                lonely += 1  # Each lonely pixel counted once per check

# Correct: Single validation per pixel
for r in range(m):
    for c in range(n):
        if picture[r][c] == 'B' and row_count[r] == 1 and col_count[c] == 1:
            lonely += 1
```

2. Not preprocessing counts

```python
# Wrong: Rescanning for every black pixel
def count_lonely(picture):
    lonely = 0
    for r in range(m):
        for c in range(n):
            if picture[r][c] == 'B':
                # O(n) to count row
                if sum(1 for x in picture[r] if x == 'B') == 1:
                    # O(m) to count column
                    if sum(1 for row in picture if row[c] == 'B') == 1:
                        lonely += 1
    return lonely  # O(m*n*(m+n))

# Correct: Precompute counts once
def count_lonely(picture):
    row_count = [sum(1 for x in row if x == 'B') for row in picture]
    col_count = [sum(1 for row in picture if row[c] == 'B') for c in range(n)]
    lonely = sum(1 for r in range(m) for c in range(n)
                 if picture[r][c] == 'B' and row_count[r] == 1 and col_count[c] == 1)
    return lonely  # O(m*n)
```

3. Incorrect boundary handling

```python
# Wrong: Off-by-one in column counting
col_count = [0] * (n - 1)  # Should be n, not n-1

# Correct: Match grid dimensions
row_count = [0] * m
col_count = [0] * n
```

## Variations

| Variation | Difference | Strategy |
|-----------|-----------|----------|
| Lonely Pixel II | Count black pixels where row and column both have exactly k black pixels | Precompute counts, check if both equal k |
| Multiple colors | More than 2 pixel types | Track counts per color type |
| 3D grid | Find lonely pixels in 3D space | Extend to track plane counts |
| Diagonal constraint | Must also be only black pixel in diagonal | Add diagonal count arrays |

## Practice Checklist

- [ ] Implement preprocessing solution (20 min)
- [ ] Test edge cases (all white, all black, single pixel)
- [ ] Optimize to single pass if possible
- [ ] Review after 1 day - implement without notes
- [ ] Review after 1 week - solve Lonely Pixel II variant
- [ ] Review after 1 month - solve 3D version

**Strategy**: Preprocessing with count arrays for efficient multi-constraint validation
