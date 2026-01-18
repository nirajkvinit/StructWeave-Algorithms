---
id: E049
old_id: F118
slug: pascals-triangle
title: Pascal's Triangle
difficulty: easy
category: easy
topics: ["array", "dynamic-programming"]
patterns: ["iteration", "combinatorics"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E050", "E118"]
prerequisites: ["arrays", "nested-loops", "combinatorics"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Pascal's Triangle

## Problem

Generate the first `numRows` of **Pascal's Triangle**, a triangular array where each number is the sum of the two numbers directly above it.

Here's what the first 5 rows look like:
```
Row 0:          1
Row 1:        1   1
Row 2:      1   2   1
Row 3:    1   3   3   1
Row 4:  1   4   6   4   1
```

**The pattern:**
- Every row starts and ends with 1
- Each interior number equals the sum of the two numbers above it
- Row `i` has `i + 1` elements (row 0 has 1 element, row 1 has 2, etc.)

For example, in row 4, the number 6 comes from adding 3 + 3 from row 3.

**Your task:** Given `numRows`, return the triangle as a list of lists. For example, if `numRows = 5`, return `[[1], [1,1], [1,2,1], [1,3,3,1], [1,4,6,4,1]]`.

## Why This Matters

Pascal's Triangle appears throughout mathematics and computer science. Each row represents binomial coefficients used in probability and combinatorics - for instance, row 4 gives you the coefficients for expanding (a+b)⁴ = 1a⁴ + 4a³b + 6a²b² + 4ab³ + 1b⁴.

In programming interviews, this problem teaches you to recognize when each result depends on previous results - the foundation of dynamic programming. The pattern of "build new row from previous row" appears in problems involving sequences, paths, and state transitions.

## Examples

**Example 1:**
- Input: `numRows = 5`
- Output: `[[1],[1,1],[1,2,1],[1,3,3,1],[1,4,6,4,1]]`

**Example 2:**
- Input: `numRows = 1`
- Output: `[[1]]`

## Constraints

- 1 <= numRows <= 30

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Pattern Recognition</summary>

Look at Pascal's triangle carefully:
```
Row 0:          1
Row 1:        1   1
Row 2:      1   2   1
Row 3:    1   3   3   1
Row 4:  1   4   6   4   1
```

What pattern do you notice? Each number is the sum of the two numbers directly above it. The edges are always 1. How can you use the previous row to build the current row?

</details>

<details>
<summary>🎯 Hint 2: Building Row by Row</summary>

You can build the triangle iteratively:
- Start with row 0: `[1]`
- For each new row i, create an array of length i+1
- First and last elements are always 1
- Middle elements are sum of adjacent elements from previous row

For row i, element j = prevRow[j-1] + prevRow[j]. What are the bounds for j?

</details>

<details>
<summary>📝 Hint 3: Implementation Blueprint</summary>

```
function generate(numRows):
    1. Initialize result = []

    2. For i from 0 to numRows-1:
         a. Create new row of size i+1
         b. Set first element = 1
         c. Set last element = 1

         d. For j from 1 to i-1:
              row[j] = result[i-1][j-1] + result[i-1][j]

         e. Append row to result

    3. Return result
```

Alternative: Start each row as [1], then build middle elements, then append 1 at end.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| **Iterative** | **O(n²)** | **O(n²)** | Generate n rows, row i has i+1 elements |
| Using binomial coefficients | O(n²) | O(n²) | Same complexity, but uses combination formula |

Note: O(n²) space is required for output itself (sum of 1+2+...+n = n(n+1)/2).

## Common Mistakes

### 1. Incorrect index bounds
```python
# WRONG: Index out of bounds when accessing previous row
def generate(numRows):
    result = [[1]]
    for i in range(1, numRows):
        row = [1]
        for j in range(1, i):
            row.append(result[i-1][j-1] + result[i-1][j])  # What if j == i?
        row.append(1)
        result.append(row)

# CORRECT: Proper bounds check
def generate(numRows):
    result = [[1]]
    for i in range(1, numRows):
        row = [1]
        for j in range(1, i):  # j goes from 1 to i-1, so j < i always
            row.append(result[i-1][j-1] + result[i-1][j])
        row.append(1)
        result.append(row)
    return result
```

### 2. Not handling edge cases
```python
# WRONG: Doesn't handle numRows = 1
def generate(numRows):
    if numRows == 0:
        return []
    result = [[1]]
    for i in range(1, numRows):
        # builds rows...
    return result  # Works, but check if numRows >= 1 is guaranteed

# CORRECT: Clear base case
def generate(numRows):
    result = []
    for i in range(numRows):
        row = [1] * (i + 1)  # Initialize with all 1s
        for j in range(1, i):
            row[j] = result[i-1][j-1] + result[i-1][j]
        result.append(row)
    return result
```

### 3. Modifying previous row in-place
```python
# WRONG: If you try to reuse previous row
def generate(numRows):
    result = []
    prev = []
    for i in range(numRows):
        row = [1]
        for j in range(1, i):
            row.append(prev[j-1] + prev[j])
        if i > 0:
            row.append(1)
        prev = row  # This is fine
        result.append(row)
    return result
# Actually this is correct, but be careful not to modify prev directly!
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Pascal's Triangle II | Return only k-th row | Use O(k) space, build row in-place from right to left |
| Print triangle format | Display in triangle shape | Add spacing/formatting logic |
| Binomial coefficients | Compute C(n, k) | Use formula: C(n, k) = n! / (k! * (n-k)!) |
| Modulo arithmetic | All values mod m | Apply modulo after each addition |
| Negative values variant | Allow negative numbers | Same algorithm, pattern still holds |

## Practice Checklist

**Correctness:**
- [ ] Handles numRows = 1 (returns [[1]])
- [ ] Handles numRows = 2 (returns [[1], [1,1]])
- [ ] Correctly builds all middle values
- [ ] All rows have correct length (row i has i+1 elements)
- [ ] Edge values are always 1

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 8 minutes
- [ ] Can discuss space optimization (Pascal's Triangle II)
- [ ] Can explain binomial coefficient connection

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve Pascal's Triangle II (space optimized)
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Dynamic Programming Pattern](../../strategies/patterns/dynamic-programming.md)
