---
id: E050
old_id: F119
slug: pascals-triangle-ii
title: Pascal's Triangle II
difficulty: easy
category: easy
topics: ["array", "dynamic-programming"]
patterns: ["iteration", "space-optimization"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E049", "E118"]
prerequisites: ["arrays", "in-place-updates", "pascals-triangle"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Pascal's Triangle II

## Problem

Return the `rowIndex`-th row (0-indexed) of Pascal's Triangle using **O(k) extra space**.

**Quick recap of Pascal's Triangle:**
```
Row 0:          1
Row 1:        1   1
Row 2:      1   2   1
Row 3:    1   3   3   1
Row 4:  1   4   6   4   1
```

**The twist:** Unlike Pascal's Triangle I where you build all rows, here you only need one specific row. The constraint is that you can only use O(k) space where k is the row number - meaning you can't store all previous rows.

**How is this possible?** You can build the row iteratively in-place. Start with row 0: [1]. Then transform it to row 1: [1,1]. Then to row 2: [1,2,1], and so on. The trick is updating the array from right to left so you don't overwrite values you still need.

**Watch out for:** If you update from left to right, you'll overwrite values before using them. The order matters critically here.

## Why This Matters

This problem teaches space optimization - a critical skill in production systems where memory is limited. Transforming a problem from O(n²) space to O(n) space by reusing storage appears frequently in dynamic programming.

The "update right-to-left" pattern is used in many in-place algorithms, including some dynamic programming problems, image processing filters, and sliding window calculations. Understanding why the update direction matters builds intuition for in-place transformations.

## Examples

**Example 1:**
- Input: `rowIndex = 3`
- Output: `[1,3,3,1]`

**Example 2:**
- Input: `rowIndex = 0`
- Output: `[1]`

**Example 3:**
- Input: `rowIndex = 1`
- Output: `[1,1]`

## Constraints

- 0 <= rowIndex <= 33

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Space Constraint Challenge</summary>

The key constraint is O(k) space, meaning you cannot store all previous rows. You need to build the k-th row using only one array. How can you update a row in-place without losing information needed for the next update?

</details>

<details>
<summary>🎯 Hint 2: Right-to-Left Update</summary>

If you update from left to right, you'll overwrite values you still need. Instead, update from RIGHT to LEFT. For row k, element at position j depends on previous row's elements at positions j-1 and j.

```
Current: [1, 2, 1, 0]  (row 2, preparing for row 3)
Update from right:
- row[3] = row[2] + row[3] = 1 + 0 = 1
- row[2] = row[1] + row[2] = 2 + 1 = 3
- row[1] = row[0] + row[1] = 1 + 2 = 3
- row[0] = 1 (unchanged)
Result: [1, 3, 3, 1]
```

Why does this work?

</details>

<details>
<summary>📝 Hint 3: Implementation Strategy</summary>

```
function getRow(rowIndex):
    1. Initialize row = [1] (or array of rowIndex+1 ones)

    2. For each level i from 1 to rowIndex:
         a. Update from right to left
         b. For j from i down to 1:
              row[j] = row[j] + row[j-1]
         c. row[0] stays 1 (or ensure it's set)

    3. Return row
```

Alternative approach: Use binomial coefficient formula C(n, k) = C(n, k-1) * (n-k+1) / k

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Generate all rows | O(k²) | O(k²) | Store all rows, then return k-th |
| **In-place update** | **O(k²)** | **O(k)** | Single array, update right-to-left |
| Binomial formula | O(k) | O(k) | Direct calculation using C(n,k) formula |

## Common Mistakes

### 1. Updating left-to-right
```python
# WRONG: Overwrites values needed for later calculations
def getRow(rowIndex):
    row = [1] * (rowIndex + 1)
    for i in range(2, rowIndex + 1):
        for j in range(1, i):
            row[j] = row[j] + row[j-1]  # row[j-1] was already updated!
    return row

# CORRECT: Update right-to-left
def getRow(rowIndex):
    row = [1] * (rowIndex + 1)
    for i in range(2, rowIndex + 1):
        for j in range(i-1, 0, -1):  # Reverse order
            row[j] = row[j] + row[j-1]
    return row
```

### 2. Incorrect array initialization
```python
# WRONG: Not enough space allocated
def getRow(rowIndex):
    row = [1]
    for i in range(1, rowIndex + 1):
        for j in range(i-1, 0, -1):
            row[j] = row[j] + row[j-1]  # Index error!
    return row

# CORRECT: Pre-allocate full size
def getRow(rowIndex):
    row = [1] * (rowIndex + 1)
    for i in range(1, rowIndex + 1):
        for j in range(i-1, 0, -1):
            row[j] = row[j] + row[j-1]
    return row
```

### 3. Off-by-one in loop bounds
```python
# WRONG: Doesn't update all necessary elements
def getRow(rowIndex):
    row = [1] * (rowIndex + 1)
    for i in range(1, rowIndex):  # Should go to rowIndex + 1
        for j in range(i-1, 0, -1):
            row[j] = row[j] + row[j-1]
    return row

# CORRECT: Proper range
def getRow(rowIndex):
    row = [1] * (rowIndex + 1)
    for i in range(1, rowIndex + 1):
        for j in range(i-1, 0, -1):
            row[j] = row[j] + row[j-1]
    return row
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Generate all rows | Remove space constraint | Store all rows (Pascal's Triangle I) |
| Specific element | Return row[k] element only | Use binomial coefficient C(rowIndex, k) |
| Modulo arithmetic | Values mod m | Apply mod after each addition |
| Using formula | O(k) time instead of O(k²) | Use C(n,k) = C(n,k-1) * (n-k+1) / k iteratively |
| 2D variant | Multiple row queries | Precompute and store triangle |

## Practice Checklist

**Correctness:**
- [ ] Handles rowIndex = 0 (returns [1])
- [ ] Handles rowIndex = 1 (returns [1,1])
- [ ] Correctly builds row 3: [1,3,3,1]
- [ ] Correctly builds row 4: [1,4,6,4,1]
- [ ] Uses O(k) space only

**Interview Readiness:**
- [ ] Can explain why right-to-left is necessary
- [ ] Can code solution in 8 minutes
- [ ] Can discuss binomial coefficient optimization
- [ ] Can compare to Pascal's Triangle I

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement using binomial formula
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Dynamic Programming Pattern](../../strategies/patterns/dynamic-programming.md)
