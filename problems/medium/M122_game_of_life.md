---
id: M122
old_id: I088
slug: game-of-life
title: Game of Life
difficulty: medium
category: medium
topics: ["array", "matrix", "simulation"]
patterns: ["dp-2d", "in-place"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M121", "M127", "E001"]
prerequisites: ["matrix-traversal", "bit-manipulation", "in-place-algorithms"]
---
# Game of Life

## Problem

You're implementing Conway's Game of Life, a fascinating cellular automaton (a grid-based simulation) created by mathematician John Horton Conway in 1970. Despite being called a "game," there are no players - it's a zero-player simulation where you set up an initial state and watch patterns evolve based on simple rules. You have an `m x n` grid where each cell is either alive (represented by `1`) or dead (represented by `0`). Every cell looks at its eight surrounding neighbors - these are the cells in all directions: horizontally, vertically, and diagonally adjacent.

The simulation evolves according to four rules that determine whether each cell lives, dies, or is born in the next generation. First, any living cell with fewer than two living neighbors dies from isolation (too lonely to survive). Second, any living cell with exactly two or three living neighbors stays alive (the perfect balance). Third, any living cell with more than three living neighbors dies from overcrowding (too crowded to survive). Fourth, any dead cell with exactly three living neighbors comes to life (reproduction). Here's the crucial part: all these rules apply simultaneously to compute the next generation. Every birth and death happens at the same instant, so when checking neighbors, you must use the current state, not partially-updated values. Given the current configuration of the board, your task is to compute and return what the board looks like after one generation. Edge cases include grids with no living cells (which remain dead), oscillating patterns (which cycle between states), and still lifes (patterns that never change).




**Diagram:**

Example: One generation of Conway's Game of Life
```
Current State:                Next State:
┌───┬───┬───┐                ┌───┬───┬───┐
│ 0 │ 1 │ 0 │                │ 0 │ 0 │ 0 │
├───┼───┼───┤                ├───┼───┼───┤
│ 0 │ 0 │ 1 │                │ 0 │ 1 │ 1 │
├───┼───┼───┤                ├───┼───┼───┤
│ 1 │ 1 │ 1 │                │ 0 │ 1 │ 1 │
├───┼───┼───┤                ├───┼───┼───┤
│ 0 │ 0 │ 0 │                │ 0 │ 1 │ 0 │
└───┴───┴───┘                └───┴───┴───┘

Legend: 0 = Dead cell, 1 = Live cell

Rules applied simultaneously:
1. Live cell with <2 neighbors dies (underpopulation)
2. Live cell with 2-3 neighbors survives
3. Live cell with >3 neighbors dies (overpopulation)
4. Dead cell with exactly 3 neighbors becomes alive (reproduction)
```


## Why This Matters

This problem teaches crucial techniques for in-place state updates and handling simultaneous transformations that appear throughout software engineering. In graphics programming and game development, rendering engines must update entire frames of pixels simultaneously while preserving the previous state for calculations - exactly like the Game of Life. Image processing algorithms apply filters and transformations where each pixel's new value depends on its neighbors' old values, requiring careful state management. Distributed systems face similar challenges when synchronizing state across multiple nodes that must update based on a consistent snapshot. Scientific simulations modeling population dynamics, epidemiology, or chemical reactions use cellular automaton logic to evolve systems over time. The key engineering challenge here is efficiently updating a grid in-place using constant extra space, typically solved by encoding both current and next state within each cell using bit manipulation or multi-value states. This pattern of "read old state, write new state, convert all at once" appears everywhere from database transaction processing to parallel computing.

## Constraints

- m == board.length
- n == board[i].length
- 1 <= m, n <= 25
- board[i][j] is 0 or 1.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

The key challenge is that all cells must update simultaneously based on the current state, but you need to avoid overwriting values before you've calculated all next states. Think about how you can track both the current state and the next state for each cell without using extra space.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Consider two approaches: (1) Create a copy of the board to reference original states while updating, or (2) Use state encoding to track both current and next state in the same cell. For in-place solution, use bit manipulation or multiple state values (e.g., -1 for "was alive, now dead" and 2 for "was dead, now alive").

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**In-Place with State Encoding:**
```
1. For each cell (i, j):
   - Count live neighbors using current state
   - Determine next state based on rules:
     - If currently alive (1):
       - If neighbors < 2 or > 3: mark as -1 (dying)
       - Else: keep as 1 (surviving)
     - If currently dead (0):
       - If neighbors == 3: mark as 2 (becoming alive)

2. Second pass to decode states:
   - -1 → 0 (died)
   - 2 → 1 (born)
   - 0, 1 stay same

State encoding:
- 0: dead → dead
- 1: alive → alive
- 2: dead → alive
- -1: alive → dead
```

When counting neighbors, only consider original alive cells (values 1 and -1).

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Copy Board | O(mn) | O(mn) | Simple, uses extra space |
| **In-Place Encoding** | **O(mn)** | **O(1)** | Optimal, clever state tracking |
| Bit Manipulation | O(mn) | O(1) | Use bits to store current and next state |
| Sparse Representation | O(k) | O(k) | k = live cells, good for sparse boards |

## Common Mistakes

### Mistake 1: Updating cells without preserving original state

**Wrong:**
```python
def gameOfLife(board):
    m, n = len(board), len(board[0])

    for i in range(m):
        for j in range(n):
            live_neighbors = count_neighbors(board, i, j)

            # Wrong: directly updating board changes neighbor counts!
            if board[i][j] == 1:
                if live_neighbors < 2 or live_neighbors > 3:
                    board[i][j] = 0
            else:
                if live_neighbors == 3:
                    board[i][j] = 1
    # This affects subsequent cells' neighbor counts
```

**Correct:**
```python
def gameOfLife(board):
    m, n = len(board), len(board[0])

    for i in range(m):
        for j in range(n):
            live_neighbors = count_neighbors(board, i, j)

            # Use state encoding: 2 = dead->alive, -1 = alive->dead
            if board[i][j] == 1:
                if live_neighbors < 2 or live_neighbors > 3:
                    board[i][j] = -1  # Mark as dying
            else:
                if live_neighbors == 3:
                    board[i][j] = 2  # Mark as becoming alive

    # Second pass: decode states
    for i in range(m):
        for j in range(n):
            if board[i][j] == 2:
                board[i][j] = 1
            elif board[i][j] == -1:
                board[i][j] = 0
```

### Mistake 2: Incorrect neighbor counting

**Wrong:**
```python
def count_neighbors(board, i, j):
    m, n = len(board), len(board[0])
    count = 0

    # Wrong: counts self and doesn't handle all 8 directions
    for di in [-1, 0, 1]:
        for dj in [-1, 0, 1]:
            ni, nj = i + di, j + dj
            if 0 <= ni < m and 0 <= nj < n:
                count += board[ni][nj]  # Counts self!
    return count
```

**Correct:**
```python
def count_neighbors(board, i, j):
    m, n = len(board), len(board[0])
    count = 0
    directions = [(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)]

    for di, dj in directions:
        ni, nj = i + di, j + dj
        if 0 <= ni < m and 0 <= nj < n:
            # Count original live cells (1 or -1 for dying cells)
            if abs(board[ni][nj]) == 1:
                count += 1
    return count
```

### Mistake 3: Not handling state encoding properly during counting

**Wrong:**
```python
def count_neighbors(board, i, j):
    # After state encoding, this won't work correctly
    directions = [(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)]
    count = 0
    for di, dj in directions:
        ni, nj = i + di, j + dj
        if 0 <= ni < m and 0 <= nj < n:
            # Wrong: value 2 (dead->alive) would be counted
            if board[ni][nj] == 1:
                count += 1
    return count  # Misses cells marked as -1 (dying)
```

**Correct:**
```python
def count_neighbors(board, i, j):
    m, n = len(board), len(board[0])
    directions = [(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)]
    count = 0

    for di, dj in directions:
        ni, nj = i + di, j + dj
        if 0 <= ni < m and 0 <= nj < n:
            # Count original live cells: 1 (alive) or -1 (was alive)
            if board[ni][nj] == 1 or board[ni][nj] == -1:
                count += 1
    return count
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Infinite Board | Handle infinite grid with sparse representation | Medium |
| k Generations | Compute state after k generations efficiently | Medium |
| Custom Rules | Different survival/birth rules | Easy |
| Detect Cycles | Find if board enters a repeating pattern | Medium |
| 3D Game of Life | Extend to 3D grid with 26 neighbors | Hard |

## Practice Checklist

- [ ] Solve using extra space (copy board)
- [ ] Solve in-place with state encoding
- [ ] Verify neighbor counting works correctly
- [ ] Handle edge cells and corners properly
- [ ] **Day 3**: Re-solve without looking at solution
- [ ] **Week 1**: Implement infinite board variation
- [ ] **Week 2**: Explain state encoding technique to someone
- [ ] **Month 1**: Solve cycle detection variation

**Strategy**: See [In-Place Algorithms](../strategies/patterns/in-place-algorithms.md)
