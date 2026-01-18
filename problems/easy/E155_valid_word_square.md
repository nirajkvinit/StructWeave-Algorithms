---
id: E155
old_id: I221
slug: valid-word-square
title: Valid Word Square
difficulty: easy
category: easy
topics: ["array", "matrix", "string"]
patterns: ["matrix-traversal", "transpose-check"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E036", "E048", "M054"]
prerequisites: ["array-indexing", "boundary-checking", "matrix-operations"]
strategy_ref: ../strategies/data-structures/arrays.md
---
# Valid Word Square

## Problem

A word square is a special arrangement of strings where the rows and columns form a symmetric pattern. Think of it like a crossword puzzle where reading across gives you the same letters as reading down.

You're given an array of strings called `words`, and your task is to determine whether these strings create a valid **word square**.

Formally, a collection of strings forms a valid word square when the k-th row equals the k-th column for all valid indices. In other words, the character at position `[i][j]` must match the character at position `[j][i]` (similar to checking if a matrix equals its own transpose).

Here's what makes this tricky: the strings don't all need to be the same length. However, the symmetry property must still hold for all positions that exist. If row 2 has 5 characters, then there must be at least 3 rows total (to access column 2), and row 0, row 1, and row 2 must each have at least 3 characters (to provide column 2's values).


**Diagram:**

Example 1 (Valid):
```
words = ["abcd", "bnrt", "crmy", "dtye"]

a b c d
b n r t
c r m y
d t y e

Row 0: abcd = Column 0: abcd ✓
Row 1: bnrt = Column 1: bnrt ✓
Row 2: crmy = Column 2: crmy ✓
Row 3: dtye = Column 3: dtye ✓
```

Example 2 (Valid):
```
words = ["abcd", "bnrt", "crm", "dt"]

a b c d
b n r t
c r m
d t

Row matches corresponding column ✓
```

Example 3 (Invalid):
```
words = ["ball", "area", "read", "lady"]

b a l l
a r e a
r e a d
l a d y

Row 1: area ≠ Column 1: arld ✗
```


## Why This Matters

Matrix symmetry checking appears in many computational contexts beyond word puzzles. This problem teaches you boundary validation in multidimensional data structures, which is essential when processing images, spreadsheets, game boards, or any grid-based data where not all rows have the same length. The pattern of checking `matrix[i][j] == matrix[j][i]` is fundamental to verifying symmetric matrices in linear algebra libraries, detecting palindromic structures in DNA sequences, and validating configuration files with cross-references. Learning to handle jagged arrays (arrays where subarrays have different lengths) prepares you for real-world data processing where uniformity cannot be assumed. This is also a great introduction to the transpose operation, which is heavily used in machine learning and data transformation pipelines.

## Constraints

- 1 <= words.length <= 500
- 1 <= words[i].length <= 500
- words[i] consists of only lowercase English letters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Row vs Column Comparison
A word square is valid if the kth row equals the kth column for all k. Iterate through each row index i. For row i, compare it character by character with column i. To access column i, you need character j from row i should equal character i from row j. Handle boundary cases: if row j doesn't exist or is too short (doesn't have index i), the square is invalid.

**Key insight**: The condition `words[i][j] == words[j][i]` must hold for all valid indices, similar to checking if a matrix equals its transpose.

### Intermediate Approach - Boundary Checking with Early Exit
Check that for each row i with length len(words[i]), there must be at least i+1 rows total, and each row j (where j < len(words[i])) must have length > i to access words[j][i]. Iterate through all valid positions and compare. Return false immediately on any mismatch or boundary violation.

**Key insight**: Careful boundary checking prevents index errors. Not all rows need the same length, but symmetry must hold for positions that exist.

### Advanced Approach - Optimized Half-Matrix Check
Since the word square property is symmetric (if row i matches column i, then row j character at position i matches row i character at position j), you only need to check half the pairs. For each (i, j) pair where i < j, verify that words[i][j] (if exists) matches words[j][i] (if exists), and handle cases where one exists but the other doesn't.

**Key insight**: Exploit symmetry to reduce comparisons by ~50%, checking only upper or lower triangle.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Full Matrix Check | O(n²) | O(1) | n = average row length, check all positions |
| Early Exit | O(n²) | O(1) | Same worst case, better average with early exit |
| Half Matrix | O(n²) | O(1) | Same complexity, fewer comparisons in practice |

Quadratic time is necessary as we must verify the symmetry property for all positions.

## Common Mistakes

### Mistake 1: Not Checking Row Existence
```python
# Wrong: Assuming all rows exist
def validWordSquare(words):
    for i in range(len(words)):
        for j in range(len(words[i])):
            if words[i][j] != words[j][i]:  # Index error if j >= len(words)
                return False
    return True
```

**Why it fails**: For `["abc", "b"]`, accessing words[2] causes index out of range error when j=2.

**Fix**: Check `j < len(words)` before accessing: `if j >= len(words) or i >= len(words[j]) or words[i][j] != words[j][i]: return False`.

### Mistake 2: Not Checking Column Existence
```python
# Wrong: Not validating row j has position i
def validWordSquare(words):
    for i in range(len(words)):
        for j in range(len(words[i])):
            if j >= len(words):
                return False
            if words[i][j] != words[j][i]:  # Still crashes if len(words[j]) <= i
                return False
    return True
```

**Why it fails**: Even if row j exists, it might not be long enough to have character at position i.

**Fix**: Add check: `if i >= len(words[j]): return False` before comparison.

### Mistake 3: Wrong Symmetry Check
```python
# Wrong: Comparing incorrect indices
def validWordSquare(words):
    for i in range(len(words)):
        for j in range(len(words)):
            if len(words[i]) > j and len(words[j]) > i:
                if words[i][j] != words[i][j]:  # Typo: should be words[j][i]
                    return False
    return True
```

**Why it fails**: Comparing character to itself `words[i][j] != words[i][j]` always returns False (or True, depending on logic), doesn't check row-column symmetry.

**Fix**: Use correct indices: `words[i][j] != words[j][i]`.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Construct Word Square | Hard | Given a word list, build a valid word square |
| Largest Word Square | Medium | Find the largest valid word square in a matrix |
| Word Rectangle | Medium | Valid word rectangle where rows and columns form valid words |
| Magic Word Square | Hard | Word square where rows/columns form words from a dictionary |
| Diagonal Word Square | Medium | Add constraint that diagonals also form valid words |

## Practice Checklist

Track your progress on this problem:

- [ ] **Day 0**: Solve with basic row-column comparison (25 min)
- [ ] **Day 1**: Review edge cases (empty rows, unequal lengths, single word)
- [ ] **Day 3**: Implement with comprehensive boundary checks (20 min)
- [ ] **Day 7**: Solve without looking at previous solution (15 min)
- [ ] **Day 14**: Optimize with half-matrix check (20 min)
- [ ] **Day 30**: Speed solve in under 12 minutes

**Strategy**: See [Array Manipulation](../strategies/data-structures/arrays.md)
