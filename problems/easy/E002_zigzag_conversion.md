---
id: E002
old_id: F006
slug: zigzag-conversion
title: Zigzag Conversion
difficulty: easy
category: easy
topics: ["string"]
patterns: ["simulation", "string-building"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E001", "E018", "M001"]
prerequisites: ["string-indexing", "array-manipulation"]
strategy_ref: ../../strategies/patterns/simulation.md
---
# Zigzag Conversion

## Problem

Given a string and a number of rows, arrange the string characters in a zigzag pattern across the specified rows, then read the result row by row from top to bottom.

The zigzag pattern writes characters vertically downward until reaching the bottom row, then diagonally upward until reaching the top row, and repeats this process. For example, with the string "PAYPALISHIRING" and 3 rows, the zigzag looks like this:

```
P   A   H   N
A P L S I I G
Y   I   R
```

Reading row by row gives "PAHNAPLSIIGYIR". With 4 rows, the pattern becomes:

```
P     I    N
A   L S  I G
Y A   H R
P     I
```

Reading row by row gives "PINALSIGYAHRPI". Your task is to return the string obtained by reading the zigzag pattern row by row. Edge case: if there's only 1 row, the string stays unchanged.

## Why This Matters

This problem teaches simulation and pattern recognition, where you model a physical process step by step in code. Rather than trying to find a mathematical formula for where each character goes, you simulate the writing process by tracking position and direction. This approach appears frequently in problems involving grids, matrices, and spatial transformations.

The problem also develops your ability to work with character-level string operations and manage state transitions. Understanding when to change direction, how to organize data into rows, and how to efficiently concatenate results are skills that transfer directly to text processing, data formatting, and output generation tasks in real systems.

## Examples

**Example 1:**
- Input: `s = "PAYPALISHIRING", numRows = 3`
- Output: `"PAHNAPLSIIGYIR"`

**Example 2:**
- Input: `s = "PAYPALISHIRING", numRows = 4`
- Output: `"PINALSIGYAHRPI"`
- Explanation: P     I    N
A   L S  I G
Y A   H R
P     I

**Example 3:**
- Input: `s = "A", numRows = 1`
- Output: `"A"`

## Constraints

- 1 <= s.length <= 1000
- s consists of English letters (lower-case and upper-case), ',' and '.'.
- 1 <= numRows <= 1000

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Visualize the Pattern</summary>

Instead of thinking about the zigzag visually, consider how you would group characters into different rows. As you iterate through the string, which row does each character belong to? Can you determine a pattern for when to move down vs. when to move up?

</details>

<details>
<summary>🎯 Hint 2: Track Direction and Position</summary>

Use an array of strings (or string builders) to represent each row. As you traverse the input string, add each character to the appropriate row. Keep track of:
- The current row index
- The direction of movement (going down or going up)

When do you need to change direction? Think about the boundaries.

</details>

<details>
<summary>📝 Hint 3: Simulation Algorithm</summary>

**Pseudocode:**
```
1. Create an array of numRows empty strings
2. Initialize currentRow = 0, goingDown = false
3. For each character in the input string:
   a. Append character to rows[currentRow]
   b. If at top row (0) or bottom row (numRows-1), reverse direction
   c. Move to next row based on direction
4. Concatenate all rows and return
```

**Edge case:** When numRows = 1, return the original string.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (2D array) | O(n) | O(n) | Create full zigzag grid |
| **Row-by-Row Simulation** | **O(n)** | **O(n)** | Only store characters by row |

## Common Mistakes

### 1. Off-by-one errors in direction change
```python
# WRONG: Checking direction after updating row
for char in s:
    rows[currentRow] += char
    currentRow += 1 if goingDown else -1
    if currentRow == 0 or currentRow == numRows - 1:
        goingDown = not goingDown

# CORRECT: Check and change direction before next iteration
for char in s:
    rows[currentRow] += char
    if currentRow == 0 or currentRow == numRows - 1:
        goingDown = not goingDown
    if numRows > 1:
        currentRow += 1 if goingDown else -1
```

### 2. Not handling edge case of single row
```python
# WRONG: Will cause index errors
rows = [''] * numRows
for char in s:
    # When numRows = 1, direction logic breaks

# CORRECT: Handle edge case upfront
if numRows == 1:
    return s
```

### 3. Using inefficient string concatenation
```python
# WRONG: String concatenation in Python creates new string each time
result = ""
for row in rows:
    result = result + row  # O(n²) total time

# CORRECT: Use join or list
result = "".join(rows)  # O(n) time
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Return row indices | Return list of rows instead of concatenated string | Stop before final join step |
| Diagonal reading | Read diagonally instead of row-by-row | Change reading order in final step |
| Variable spacing | Rows have different widths | Track maximum width, pad shorter rows |
| Column-first reading | Read column by column | Build 2D grid and transpose |

## Practice Checklist

**Correctness:**
- [ ] Handles empty input
- [ ] Handles single row (numRows = 1)
- [ ] Handles single character
- [ ] Correctly reverses direction at boundaries
- [ ] Returns correct format (concatenated string)

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 10-12 minutes
- [ ] Can discuss complexity
- [ ] Can identify edge cases
- [ ] Can explain why simulation is better than 2D array

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Simulation Patterns](../../strategies/patterns/simulation.md)
