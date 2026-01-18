---
id: E269
euler_id: 11
slug: largest-product-in-a-grid
title: Largest Product in a Grid
difficulty: easy
category: easy
topics: ["array", "matrix"]
patterns: []
estimated_time_minutes: 20
frequency: low
related_problems: ["E265", "M048", "M054"]
prerequisites: ["arrays-basics", "matrix-basics"]
---

# Largest Product in a Grid

## Problem

Given an N×N grid of positive integers, find the greatest product of K adjacent numbers in the same direction. Adjacent numbers can be in any of four directions: horizontal (left-to-right), vertical (top-to-bottom), diagonal down-right, or diagonal down-left.

For example, in a 4×4 grid with K=3:
```
 8  2  22  97
49  49 99  40
81  49 31  73
52  70 95  23
```

Some products to consider:
- Horizontal: 49 × 49 × 99 = 237,951 (row 2, starting column 1)
- Vertical: 49 × 81 × 52 = 206,388 (column 1, starting row 2)
- Diagonal down-right: 99 × 31 × 23 = 70,533 (starting position [1,2])
- Diagonal down-left: 97 × 99 × 31 = 297,693 (starting position [0,3])

Return the maximum product among all valid K-element sequences in any of the four directions.

## Why This Matters

This is a classic 2D array traversal problem that teaches you to think about directional movement in grids. The pattern of checking multiple directions from each cell appears in game development (board games, path finding), image processing (edge detection, pattern recognition), and cellular automata simulations.

The key insight is representing directions as offset vectors: `(dx, dy)` pairs that describe how to move from one cell to the next. This abstraction reduces code duplication and makes the solution scalable to more directions. In production code, you'll often see this pattern for handling N-dimensional data or graph traversal where edges can point in multiple directions.

Understanding grid traversal with boundary checking is fundamental to matrix operations in scientific computing, game AI (minimax algorithms on game boards), and spatial data structures used in geographic information systems (GIS).

## Examples

**Example 1:**

- Input: `grid = [[1,2,3],[4,5,6],[7,8,9]], K = 2`
- Output: `72`
- Explanation: Maximum is 8 × 9 = 72 (horizontal in row 3, or vertical in column 3)

**Example 2:**

- Input: `grid = [[8,2],[49,49]], K = 2`
- Output: `2401`
- Explanation: 49 × 49 = 2401 (horizontal in row 2, or vertical in column 2, or diagonal)

**Example 3:**

- Input: `grid = [[2,3,1],[4,5,6],[7,8,9]], K = 3`
- Output: `504`
- Explanation: 7 × 8 × 9 = 504 (horizontal in bottom row)

## Constraints

- 1 <= N <= 100 (grid is N×N)
- 1 <= K <= N
- 1 <= grid[i][j] <= 100
- All numbers are positive integers

## Think About

1. How many directions do you need to check?
2. How do you represent moving in a specific direction?
3. What are the boundary conditions for each direction?
4. Can you avoid code duplication across directions?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Identify the four directions</summary>

The four directions to check from any starting cell:

1. **Horizontal (right):** Same row, increasing column → (0, +1)
2. **Vertical (down):** Increasing row, same column → (+1, 0)
3. **Diagonal down-right:** Increasing row, increasing column → (+1, +1)
4. **Diagonal down-left:** Increasing row, decreasing column → (+1, -1)

**Why only these four?** Moving backward (left, up, diagonal up) would recheck the same sequences. We only move forward/down to avoid duplicates.

**Direction vectors:**
```python
directions = [
    (0, 1),   # horizontal right
    (1, 0),   # vertical down
    (1, 1),   # diagonal down-right
    (1, -1)   # diagonal down-left
]
```

</details>

<details>
<summary>🎯 Hint 2: Boundary checking</summary>

For each starting position (row, col) and direction (dr, dc), can you collect K elements?

**Check before starting:**
```python
# For horizontal right (dr=0, dc=1):
if col + K > N:  # Would go out of bounds
    skip this direction

# For vertical down (dr=1, dc=0):
if row + K > N:
    skip

# For diagonal down-right (dr=1, dc=1):
if row + K > N or col + K > N:
    skip

# For diagonal down-left (dr=1, dc=-1):
if row + K > N or col - K + 1 < 0:
    skip
```

**General formula:**
- Last row accessed: `row + (K-1) * dr`
- Last column accessed: `col + (K-1) * dc`
- Both must be within bounds: 0 <= row/col < N

</details>

<details>
<summary>📝 Hint 3: Complete algorithm</summary>

```python
def largest_product(grid, K):
    N = len(grid)
    max_product = 0

    # Define four directions: (row_delta, col_delta)
    directions = [(0,1), (1,0), (1,1), (1,-1)]

    # Try each starting position
    for row in range(N):
        for col in range(N):

            # Try each direction from this position
            for dr, dc in directions:

                # Check if we can collect K elements in this direction
                end_row = row + (K - 1) * dr
                end_col = col + (K - 1) * dc

                # Boundary check
                if 0 <= end_row < N and 0 <= end_col < N:

                    # Calculate product for this sequence
                    product = 1
                    for i in range(K):
                        product *= grid[row + i*dr][col + i*dc]

                    # Update maximum
                    max_product = max(max_product, product)

    return max_product
```

**Time Complexity:** O(N² × 4 × K) = O(N² × K)
**Space Complexity:** O(1)

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **Brute Force (all directions)** | **O(N² × K)** | **O(1)** | Standard solution; checks all positions |
| Precompute products | O(N² × K) | O(N²) | No real benefit for one-time query |
| Optimized with early exit | O(N² × K) | O(1) | Minor constant improvement |

Where:
- N×N is the grid size
- K is the sequence length
- 4 directions are constant

**Why Brute Force is Fine:**

- For N=100, K=4: ~160,000 operations (very fast)
- No preprocessing can improve asymptotic complexity
- Simple and correct is better than premature optimization

---

## Common Mistakes

### 1. Checking all 8 directions (duplicates)

```python
# WRONG: Includes upward directions
directions = [(0,1), (0,-1), (1,0), (-1,0), (1,1), (1,-1), (-1,1), (-1,-1)]
# This counts each sequence twice!

# CORRECT: Only forward/downward directions
directions = [(0,1), (1,0), (1,1), (1,-1)]
```

### 2. Incorrect boundary checking

```python
# WRONG: Off-by-one error
if row + K < N:  # Should be row + K <= N, or row + K - 1 < N

# CORRECT:
if row + (K - 1) < N:  # Last element at row + K - 1
```

### 3. Index out of bounds on diagonal down-left

```python
# WRONG: Not checking left boundary
if row + K <= N:  # Diagonal left can go out of bounds on left side!

# CORRECT:
if row + K <= N and col - K + 1 >= 0:
```

### 4. Multiplying by zero (not an issue in this problem)

```python
# If grid could contain zeros:
product *= grid[row][col]  # Product becomes 0

# Handle by checking for zero and skipping/resetting
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Variable sequence length** | Find max for any K | Try all K from 1 to N |
| **Negative numbers** | Grid has negatives | Track min product too (negatives flip) |
| **Rectangular grid** | N×M instead of N×N | Adjust boundary checks |
| **More directions** | Include diagonals up | Add (-1,1) and (-1,-1) or divide by 2 |
| **Sum instead of product** | Maximum sum | Change product to sum |

**Maximum sum variant (simpler):**

```python
# Same structure, but:
current_sum = sum(grid[row + i*dr][col + i*dc] for i in range(K))
max_sum = max(max_sum, current_sum)
```

**Handling negative numbers:**

```python
# Track both max and min (negatives can become large positives)
max_product = float('-inf')
min_product = float('inf')

for each sequence:
    product = calculate_product(...)
    max_product = max(max_product, product)
    min_product = min(min_product, product)
```

---

## Practice Checklist

**Correctness:**

- [ ] Checks all four directions correctly
- [ ] Boundary checking prevents index errors
- [ ] Handles K=1 (single element)
- [ ] Handles K=N (entire row/column/diagonal)

**Optimization:**

- [ ] Uses direction vectors to avoid code duplication
- [ ] Only checks necessary directions (no duplicates)
- [ ] O(N² × K) time complexity

**Interview Readiness:**

- [ ] Can explain direction vector approach in 2 minutes
- [ ] Can code solution in 10 minutes
- [ ] Can discuss boundary conditions clearly
- [ ] Identified edge cases (K=1, small grids, boundary positions)

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement sum variant or 8 directions
- [ ] Day 14: Explain direction vectors to someone else
- [ ] Day 30: Quick review

---

**Strategy Reference:** See [Matrix Traversal](../../strategies/data-structures/matrices.md) | [Array Fundamentals](../../strategies/data-structures/arrays.md)
