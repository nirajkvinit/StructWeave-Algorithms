---
id: E259
old_id: A411
slug: delete-columns-to-make-sorted
title: Delete Columns to Make Sorted
difficulty: easy
category: easy
topics: ["array", "string"]
patterns: ["matrix-traversal"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E014", "E066", "M073"]
prerequisites: ["arrays", "strings", "nested-loops"]
strategy_ref: ../prerequisites/arrays.md
---
# Delete Columns to Make Sorted

## Problem

You have an array of strings where all strings have the same length. Think of these strings as rows in a grid - if you write each string on its own line, you can read down the columns vertically. For example, `["abc", "bce", "cae"]` forms a 3x3 grid where the first column reads "abc", the second reads "bce", and the third reads "cae".

Your goal is to identify columns that are not sorted alphabetically from top to bottom. A column is considered sorted if, when reading from the first row to the last row, the characters appear in non-decreasing alphabetical order (where 'a' < 'b' < 'c', etc.). Using 0-based indexing in our example above, column 0 has characters 'a', 'b', 'c' (sorted), column 2 has 'c', 'e', 'e' (sorted), but column 1 has 'b', 'c', 'a' (not sorted because 'c' > 'a').

You need to count how many columns must be deleted to ensure all remaining columns are sorted. Return this count as an integer.

## Why This Matters

This problem builds your understanding of two-dimensional array traversal, which appears constantly in image processing, spreadsheet operations, game boards, and database table operations. The key skill here is recognizing when to iterate by columns versus rows - many beginners default to row-major iteration when column-major is needed. This pattern is fundamental in matrix rotation algorithms, data validation systems, and columnar database operations. Additionally, the problem teaches you to think about data in multiple dimensions simultaneously, a skill essential for working with CSV files, database schemas, and grid-based user interfaces.

## Examples

**Example 1:**
- Input: `strs = ["cba","daf","ghi"]`
- Output: `1`
- Explanation: Grid representation:
  cba
  daf
  ghi
Columns at positions 0 and 2 are sorted alphabetically, but column 1 is unsorted, requiring deletion of 1 column.

**Example 2:**
- Input: `strs = ["a","b"]`
- Output: `0`
- Explanation: Grid representation:
  a
  b
The single column is sorted, so no deletions needed.

**Example 3:**
- Input: `strs = ["zyx","wvu","tsr"]`
- Output: `3`
- Explanation: Grid representation:
  zyx
  wvu
  tsr
None of the 3 columns are sorted, so all must be deleted.

## Constraints

- n == strs.length
- 1 <= n <= 100
- 1 <= strs[i].length <= 1000
- strs[i] consists of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Conceptual Foundation
- Think of the strings as a 2D grid where columns need validation
- A column is sorted if each character is <= the next character
- You need to check each column independently
- Count how many columns fail the sorted property

### Tier 2: Step-by-Step Strategy
- Initialize a counter for unsorted columns
- For each column index from 0 to string_length - 1:
  - Check if that column is sorted by comparing adjacent rows
  - Iterate through rows, comparing current row's character with next row's character
  - If any adjacent pair is out of order (current > next), mark column as unsorted
  - Increment counter if column is unsorted
- Return the total count

### Tier 3: Implementation Details
- Let `n = len(strs)` (number of rows) and `m = len(strs[0])` (number of columns)
- Initialize `delete_count = 0`
- Outer loop: for `col in range(m)`:
  - Inner loop: for `row in range(n - 1)`:
    - Compare `strs[row][col]` with `strs[row + 1][col]`
    - If `strs[row][col] > strs[row + 1][col]`, increment delete_count and break
- Return delete_count

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Column-by-Column Check | O(n * m) | O(1) | Optimal solution, n = rows, m = columns |
| Transpose then Sort Check | O(n * m + m * n log n) | O(n * m) | Creates transposed matrix, inefficient |
| Recursive Column Check | O(n * m) | O(m) | Call stack overhead, no benefit |

**Optimal Solution**: Column-by-column iteration achieves O(n * m) with O(1) space.

## Common Mistakes

### Mistake 1: Confusing row and column iteration
```python
# Wrong: checking rows instead of columns
for row in range(len(strs)):
    for i in range(len(strs[row]) - 1):
        if strs[row][i] > strs[row][i + 1]:  # Checking within a row!
            count += 1

# Correct: iterate columns, then check rows within each column
for col in range(len(strs[0])):
    for row in range(len(strs) - 1):
        if strs[row][col] > strs[row + 1][col]:  # Check down the column
            count += 1
            break
```

### Mistake 2: Not breaking after finding unsorted pair
```python
# Wrong: counting multiple violations per column
for col in range(len(strs[0])):
    for row in range(len(strs) - 1):
        if strs[row][col] > strs[row + 1][col]:
            count += 1  # Counts every violation, not columns!

# Correct: one count per unsorted column
for col in range(len(strs[0])):
    is_sorted = True
    for row in range(len(strs) - 1):
        if strs[row][col] > strs[row + 1][col]:
            is_sorted = False
            break  # Found one violation, move to next column
    if not is_sorted:
        count += 1
```

### Mistake 3: Off-by-one in loop bounds
```python
# Wrong: accessing beyond bounds
for row in range(len(strs)):  # Goes one too far
    if strs[row][col] > strs[row + 1][col]:  # IndexError when row = len(strs)-1

# Correct: stop one before the end
for row in range(len(strs) - 1):
    if strs[row][col] > strs[row + 1][col]:
        # Safe comparison
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Delete rows to make sorted | Easy | Check row-wise instead of column-wise |
| Minimum deletions with DP | Medium | Delete minimum columns to make all rows sorted |
| Return indices of deleted columns | Easy | Track column indices instead of count |
| Allow equal consecutive values | Easy | Use >= instead of > for strict sorting |
| Delete columns to make strictly increasing | Medium | Require strict inequality across all columns |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solved independently on first attempt
- [ ] Completed within 15 minutes
- [ ] Correctly identified column-wise iteration pattern
- [ ] Used proper loop bounds to avoid index errors
- [ ] Implemented early break optimization
- [ ] Wrote bug-free code on first submission
- [ ] Explained solution clearly to someone else
- [ ] Solved without hints after 1 day
- [ ] Solved without hints after 1 week
- [ ] Identified time and space complexity correctly

**Spaced Repetition Schedule**: Review on Day 1, Day 3, Day 7, Day 14, Day 30

**Strategy**: See [Arrays](../prerequisites/arrays.md)
