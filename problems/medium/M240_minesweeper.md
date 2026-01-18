---
id: M240
old_id: A027
slug: minesweeper
title: Minesweeper
difficulty: medium
category: medium
topics: ["array", "recursion"]
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
  - DFS/BFS traversal
  - Grid navigation
  - Recursion
---
# Minesweeper

## Problem

Simulate the reveal mechanics of the classic Minesweeper game. Given a board and a click position, update the board according to the game rules and return the final state after all cascading reveals complete.

The board is an `m x n` grid where each cell contains:
- `'M'` - An unrevealed mine
- `'E'` - An unrevealed empty square
- `'B'` - A revealed blank (no adjacent mines)
- `'1'` to `'8'` - A revealed square showing the count of adjacent mines
- `'X'` - A revealed mine (game over)

When a player clicks on position `[row, col]`, apply these rules:

1. **Click on mine** (`'M'`): Change it to `'X'` and stop. Game over.

2. **Click on empty with adjacent mines** (`'E'` with 1-8 neighboring mines): Change it to a digit `'1'`-`'8'` showing the count. Stop there - no cascading.

3. **Click on empty with no adjacent mines** (`'E'` with 0 neighboring mines): This triggers the flood-fill reveal:
   - Change the cell to `'B'`
   - Recursively reveal all 8 neighboring unrevealed cells
   - Each revealed neighbor follows these same rules
   - The recursion naturally stops when hitting numbered cells (adjacent to mines) or board edges

The "cascade" behavior is what makes Minesweeper satisfying: clicking one safe square can reveal large connected regions automatically. Your implementation must correctly propagate this reveal wave while counting adjacent mines for each cell.

Important details: "Adjacent" means all 8 directions (horizontal, vertical, and diagonal). Count only unrevealed mines (`'M'`), not revealed ones (`'X'`). Avoid infinite recursion by marking cells as visited before recursing.

## Why This Matters

This problem teaches flood-fill, one of the most important graph traversal patterns. The exact same technique appears in paint bucket tools (image editing), region growing (computer vision), connected components (graph theory), and game mechanics (tile-matching games, territory control). The recursive expansion from a starting point with propagation rules is fundamental to BFS/DFS applications. You'll see this pattern in "Number of Islands," "Surrounded Regions," "Pacific Atlantic Water Flow," and maze-solving algorithms. Understanding how to prevent infinite loops through state marking, handle boundary conditions gracefully, and implement eight-directional grid traversal are essential skills. The problem also demonstrates when recursion depth isn't a concern (sparse grids limit depth naturally) versus when iterative BFS might be safer (very large connected regions).

## Constraints

- m == board.length
- n == board[i].length
- 1 <= m, n <= 50
- board[i][j] is either 'M', 'E', 'B', or a digit from '1' to '8'.
- click.length == 2
- 0 <= clickr < m
- 0 <= clickc < n
- board[clickr][clickc] is either 'M' or 'E'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Handle the base cases first</summary>

Start with the simplest cases:
1. If clicked cell is 'M', change it to 'X' and return immediately (game over)
2. If clicked cell is 'E', count adjacent mines in all 8 directions

The real complexity comes when the count is zero - that triggers the flood fill.

</details>

<details>
<summary>Hint 2: Recursive flood fill strategy</summary>

When a cell has zero adjacent mines:
1. Mark it as 'B'
2. Recursively reveal all 8 neighboring cells that are still 'E'
3. Each recursive call will count its own adjacent mines
4. The recursion naturally stops when hitting cells with adjacent mines or board boundaries

Think of it like water spreading - it fills all connected empty spaces until hitting a barrier (numbered cells or edges).

</details>

<details>
<summary>Hint 3: Implementing neighbor traversal</summary>

Use direction arrays to explore all 8 neighbors efficiently:
```
directions = [(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)]
```

For counting mines, iterate through neighbors and count 'M' cells.
For flood fill, recursively call reveal on 'E' neighbors.

Remember to check bounds: `0 <= r < m and 0 <= c < n`

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| DFS (recursive) | O(m * n) | O(m * n) | May visit all cells in worst case; stack depth up to m*n |
| BFS (iterative) | O(m * n) | O(m * n) | Queue can hold up to m*n cells; avoids stack overflow |
| In-place modification | O(m * n) | O(1) auxiliary | Recursive stack not counted as auxiliary space |

## Common Mistakes

1. Not checking bounds before accessing neighbors

```python
# Wrong: Array index out of bounds
for dr, dc in directions:
    nr, nc = r + dr, c + dc
    if board[nr][nc] == 'M':  # May crash!
        count += 1

# Correct: Validate bounds first
for dr, dc in directions:
    nr, nc = r + dr, c + dc
    if 0 <= nr < m and 0 <= nc < n and board[nr][nc] == 'M':
        count += 1
```

2. Infinite recursion from not marking cells as visited

```python
# Wrong: May revisit cells infinitely
def reveal(r, c):
    if board[r][c] != 'E':
        return
    count = count_adjacent_mines(r, c)
    if count == 0:
        for neighbor in neighbors:
            reveal(neighbor)  # 'E' unchanged - infinite loop!

# Correct: Mark as visited before recursing
def reveal(r, c):
    if board[r][c] != 'E':
        return
    count = count_adjacent_mines(r, c)
    if count == 0:
        board[r][c] = 'B'  # Mark visited
        for neighbor in neighbors:
            reveal(neighbor)
    else:
        board[r][c] = str(count)
```

3. Counting already revealed cells as mines

```python
# Wrong: Counting 'X' as mines
count = sum(1 for cell in neighbors if cell in 'MX')

# Correct: Only count unrevealed mines
count = sum(1 for cell in neighbors if cell == 'M')
```

## Variations

| Variation | Difference | Strategy |
|-----------|-----------|----------|
| Flag cells | Add ability to flag suspected mines | Track flagged cells separately; don't reveal flagged cells |
| Chord clicking | Click revealed number to reveal neighbors if flags match count | Verify flag count, then reveal non-flagged neighbors |
| Generate board | Create valid minesweeper board with k mines | Randomly place mines, then calculate all neighbor counts |
| Custom neighbors | Hexagonal grid or different neighbor patterns | Adjust direction vectors for different connectivity |

## Practice Checklist

- [ ] Implement DFS solution (30 min)
- [ ] Handle all edge cases (mine click, boundary cells)
- [ ] Test with large grids (50x50)
- [ ] Review after 1 day - implement BFS version
- [ ] Review after 1 week - optimize space complexity
- [ ] Review after 1 month - implement board generator

**Strategy**: DFS/BFS flood fill with eight-directional grid traversal
