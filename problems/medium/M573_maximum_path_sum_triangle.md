---
id: M573
slug: maximum-path-sum-triangle
title: Maximum Path Sum (Triangle)
difficulty: medium
category: medium
topics: ["dynamic-programming", "array"]
patterns: ["dynamic-programming", "bottom-up"]
estimated_time_minutes: 25
frequency: high
related_problems: ["M062", "M120", "E053"]
prerequisites: ["dynamic-programming-basics", "arrays"]
---

# Maximum Path Sum (Triangle)

## Problem

Given a triangle of numbers represented as a list of lists, find the maximum sum path from the top to the bottom. For each step, you may move to an adjacent number on the row below. More specifically, if you're at position `i` in the current row, you can move to either position `i` or `i+1` in the next row.

For example, given the triangle:
```
     3
    7 4
   2 4 6
  8 5 9 3
```

The maximum path is 3 → 7 → 4 → 9, which gives a sum of 23.

**Important:** "Adjacent" means the next row's index is either the same as the current index or one more. This creates a tree-like structure where each element (except edges) can receive from two parents.

```
Visualization with indices:
       [0]           3         (row 0)
      /   \
   [0]     [1]      7   4      (row 1)
   / \     / \
[0] [1] [1] [2]   2  4   6     (row 2)

Path indices: [0] → [0] → [1] → [2]
Path values:   3  →  7  →  4  →  9  = 23
```

## Why This Matters

The triangle path problem is a gateway to understanding dynamic programming from the bottom up - literally! Unlike many DP problems that build from the base case upward, this problem is most elegantly solved by starting at the bottom and working toward the top. This "reverse thinking" is a crucial skill that applies to many optimization problems. The problem appears in interview settings because it tests your ability to identify optimal substructure (each position's best path depends only on the best paths from below) and to choose efficient iteration order. Real-world applications include data pyramid analysis, hierarchical decision trees, and tournament bracket optimization. The space optimization technique here (reusing a single array) demonstrates a pattern applicable to many DP problems. Understanding why bottom-up is superior to top-down for this specific problem sharpens your intuition for choosing the right DP direction.

## Examples

**Example 1:**
- Input: `triangle = [[2], [3,4], [6,5,7], [4,1,8,3]]`
- Output: `11`
- Explanation:
  ```
       2
      3 4
     6 5 7
    4 1 8 3
  ```
  Maximum path: 2 → 3 → 5 → 1 = 11 (Not the most intuitive, but correct!)

**Example 2:**
- Input: `triangle = [[-10]]`
- Output: `-10`
- Explanation: Only one element.

**Example 3:**
- Input: `triangle = [[1], [2,3], [4,5,6]]`
- Output: `10`
- Explanation:
  ```
      1
     2 3
    4 5 6
  ```
  Maximum path: 1 → 3 → 6 = 10

**Example 4:**
- Input: `triangle = [[5], [-2,3]]`
- Output: `8`
- Explanation: 5 → 3 = 8 (avoid negative number)

## Constraints

- 1 <= triangle.length <= 200
- triangle[0].length == 1
- triangle[r].length == r + 1
- -10^4 <= triangle[r][c] <= 10^4
- Numbers can be negative (careful with initialization!)

## Think About

1. If you know the maximum path sum from each position in row `i`, how does that help compute row `i-1`?
2. Why is bottom-up easier than top-down for this problem?
3. Do you need to store the entire DP table, or can you optimize space?
4. What happens at the edges of each row (can't access both children)?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Think bottom-up</summary>

**Top-down intuition (harder):**
- From position (row, col), you can go to (row+1, col) or (row+1, col+1)
- Need to track which path is better
- Many overlapping subproblems
- Need to handle "which child to choose" logic

**Bottom-up insight (easier):**
- Start from the bottom row (where answer is trivial - just the values themselves)
- Work upward: for each position, ask "what's the best I can do if I start from here?"
- Answer: current value + max of the two children below

**Key realization:** The bottom row is your base case - no decisions needed there!

```
Bottom row:      [8, 5, 9, 3]  ← Base case
One row up:      [2+max(8,5), 4+max(5,9), 6+max(9,3)]
                 = [10, 13, 15]
Continue upward...
```

</details>

<details>
<summary>🎯 Hint 2: The DP recurrence</summary>

Define `dp[i][j]` = maximum path sum starting from position (i, j) down to the bottom.

**Recurrence relation:**
```
dp[i][j] = triangle[i][j] + max(dp[i+1][j], dp[i+1][j+1])
```

Where:
- `triangle[i][j]` is the current cell's value
- `dp[i+1][j]` is best path from left child
- `dp[i+1][j+1]` is best path from right child

**Base case:**
```
dp[n-1][j] = triangle[n-1][j]  for all j
(Last row - no children, just the value itself)
```

**Example execution:**
```
Triangle:       DP table (building bottom-up):
     3               23
    7 4             20 19
   2 4 6           10 13 15
  8 5 9 3          8  5  9  3  ← Start here

Row 2: dp[2][0] = 2 + max(8,5) = 10
       dp[2][1] = 4 + max(5,9) = 13
       dp[2][2] = 6 + max(9,3) = 15

Row 1: dp[1][0] = 7 + max(10,13) = 20
       dp[1][1] = 4 + max(13,15) = 19

Row 0: dp[0][0] = 3 + max(20,19) = 23 ✓
```

</details>

<details>
<summary>🚀 Hint 3: Space optimization</summary>

**Observation:** When computing row `i`, you only need row `i+1`. You never need rows `i+2`, `i+3`, etc.

**Space optimization:**
Instead of a 2D array, use a 1D array representing the current "best path from each position down."

```python
def maximum_path_sum(triangle):
    n = len(triangle)

    # Start with the bottom row
    dp = triangle[-1].copy()  # Copy to avoid modifying input

    # Work upward from second-to-last row to top
    for row in range(n - 2, -1, -1):
        for col in range(len(triangle[row])):
            # Update in place
            dp[col] = triangle[row][col] + max(dp[col], dp[col + 1])

    # After all updates, dp[0] is the answer
    return dp[0]
```

**Why this works:**
- `dp[col]` represents the best path from that column downward
- When we move to row above, we update each position with its value + max of two children
- By the time we reach the top, `dp[0]` has accumulated the best path

**Even more extreme optimization:**
You can modify the input triangle in place if allowed (not recommended in practice):
```python
def maximum_path_sum_inplace(triangle):
    for row in range(len(triangle) - 2, -1, -1):
        for col in range(len(triangle[row])):
            triangle[row][col] += max(triangle[row+1][col], triangle[row+1][col+1])
    return triangle[0][0]
```
Space: O(1) if input modification is allowed.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Brute force (try all paths) | O(2^n) | O(n) | Exponential - too slow |
| Top-down DP with memo | O(n²) | O(n²) | Intuitive but uses more space |
| **Bottom-up DP (2D)** | **O(n²)** | **O(n²)** | Clear and correct |
| **Bottom-up DP (1D)** | **O(n²)** | **O(n)** | Optimal space usage |
| In-place modification | O(n²) | O(1) | Destroys input |

Where `n` is the number of rows, and the total number of elements is approximately n²/2.

**Why bottom-up is optimal:**
- Single pass through the triangle (each element visited once)
- No recursion overhead (no call stack)
- Space can be optimized to O(n)
- Simple iteration, easy to reason about

**Time complexity breakdown:**
```
Row 0: 1 element
Row 1: 2 elements
Row 2: 3 elements
...
Row n-1: n elements

Total: 1 + 2 + 3 + ... + n = n(n+1)/2 = O(n²)
```

**Space complexity breakdown:**
- 2D DP: Store entire triangle = O(n²)
- 1D DP: Store only one row = O(n)
- In-place: Reuse input = O(1) extra

---

## Common Mistakes

### 1. Wrong indexing for adjacent elements
```python
# WRONG: Trying to access both i-1 and i+1 from row below
dp[i][j] = triangle[i][j] + max(dp[i+1][j-1], dp[i+1][j+1])
# This doesn't match the problem definition!

# CORRECT: Adjacent means same index or next index
dp[i][j] = triangle[i][j] + max(dp[i+1][j], dp[i+1][j+1])
```

### 2. Initializing with zeros for negative numbers
```python
# WRONG: Using 0 as initial value when numbers can be negative
dp = [[0] * len(row) for row in triangle]
# If all numbers are negative, max path would incorrectly be 0!

# CORRECT: Initialize base case with actual bottom row values
dp = triangle[-1].copy()
```

### 3. Iterating in the wrong direction
```python
# WRONG: Top-down without proper memoization structure
for row in range(len(triangle)):
    for col in range(len(triangle[row])):
        # Can't compute row i without row i+1 being ready!
        dp[row][col] = triangle[row][col] + max(dp[row+1][col], ...)

# CORRECT: Bottom-up - process later rows before earlier ones
for row in range(len(triangle) - 2, -1, -1):
    ...
```

### 4. Off-by-one errors in space optimization
```python
# WRONG: Not accounting for row length differences
dp = [0] * len(triangle)  # This is the number of rows, not max row length!

# CORRECT: Initialize with bottom row
dp = triangle[-1].copy()  # Has length n (last row has n elements)
```

### 5. Forgetting to copy in space optimization
```python
# WRONG: Modifying input unintentionally
dp = triangle[-1]  # This is a reference, not a copy!
dp[0] = ...  # Oops, modified the original triangle!

# CORRECT: Make a copy
dp = triangle[-1].copy()
# Or: dp = list(triangle[-1])
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Minimum path sum** | Find minimum instead of maximum | Change `max` to `min` |
| **Count all maximum paths** | How many paths achieve max? | Track count alongside max value |
| **Path reconstruction** | Return the actual path, not just sum | Track choices made at each step |
| **Top-down requirement** | Must start from top | Same DP, just different interpretation |
| **K best paths** | Find K distinct best paths | Use priority queue, track K-best at each position |
| **Non-adjacent movement** | Can skip rows | Modify recurrence to include row+2, row+3, etc. |

**Path reconstruction variation:**
```python
def maximum_path_with_path(triangle):
    n = len(triangle)
    dp = triangle[-1].copy()
    choices = [[0] * len(triangle[row]) for row in range(n - 1)]

    for row in range(n - 2, -1, -1):
        for col in range(len(triangle[row])):
            if dp[col] > dp[col + 1]:
                choices[row][col] = col  # Go left (same index)
                dp[col] = triangle[row][col] + dp[col]
            else:
                choices[row][col] = col + 1  # Go right (next index)
                dp[col] = triangle[row][col] + dp[col + 1]

    # Reconstruct path
    path = [triangle[0][0]]
    col = 0
    for row in range(n - 1):
        col = choices[row][col]
        path.append(triangle[row + 1][col])

    return dp[0], path
```

---

## Visual Walkthrough

```
Triangle:
     3       (row 0)
    7 4      (row 1)
   2 4 6     (row 2)
  8 5 9 3    (row 3)

DP array initialization (bottom row):
dp = [8, 5, 9, 3]

Process row 2 (indices 0-2):
  col 0: dp[0] = 2 + max(8, 5) = 2 + 8 = 10
  col 1: dp[1] = 4 + max(5, 9) = 4 + 9 = 13
  col 2: dp[2] = 6 + max(9, 3) = 6 + 9 = 15

After row 2: dp = [10, 13, 15, 3]
                         ^^^^ (only first 3 are valid now)

Process row 1 (indices 0-1):
  col 0: dp[0] = 7 + max(10, 13) = 7 + 13 = 20
  col 1: dp[1] = 4 + max(13, 15) = 4 + 15 = 19

After row 1: dp = [20, 19, 15, 3]
                   ^^^^^^ (only first 2 are valid now)

Process row 0 (index 0):
  col 0: dp[0] = 3 + max(20, 19) = 3 + 20 = 23

After row 0: dp = [23, 19, 15, 3]
                   ^^^ This is the answer!

Maximum path sum: 23

Reconstructing the path (by looking at which child was chosen):
Row 0: 3, chose left child (7) because max(20, 19) = 20 (from left)
Row 1: 7, chose right child (4) because max(10, 13) = 13 (from right)
Row 2: 4, chose right child (9) because max(5, 9) = 9 (from right)
Row 3: 9

Path: 3 → 7 → 4 → 9 = 23 ✓
```

---

## Practice Checklist

**Understanding:**
- [ ] Can explain why bottom-up is easier than top-down
- [ ] Understand the "adjacent" movement constraint
- [ ] Can trace through DP array updates by hand
- [ ] Know when to use min vs max

**Implementation:**
- [ ] Handles single-element triangle
- [ ] Correctly handles negative numbers
- [ ] Proper base case (bottom row)
- [ ] Correct iteration order (bottom to top)
- [ ] No index out-of-bounds errors

**Optimization:**
- [ ] Can implement 2D DP version
- [ ] Can implement space-optimized 1D version
- [ ] Understands why O(n) space is possible
- [ ] Can explain in-place modification trade-offs

**Interview Readiness:**
- [ ] Can code solution in 10 minutes
- [ ] Can explain DP recurrence clearly
- [ ] Can discuss complexity with precision
- [ ] Can extend to minimum path variation
- [ ] Can reconstruct the actual path if asked

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve (2D DP)
- [ ] Day 3: Solve with 1D space optimization
- [ ] Day 7: Solve minimum path variant
- [ ] Day 14: Add path reconstruction
- [ ] Day 30: Explain to someone else

---

**Strategy Reference:** See [Dynamic Programming](../../strategies/patterns/dynamic-programming.md#bottom-up-dp) and [Grid DP Patterns](../../strategies/patterns/dynamic-programming.md#grid-paths)
