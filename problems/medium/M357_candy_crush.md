---
id: M357
old_id: A190
slug: candy-crush
title: Candy Crush
difficulty: medium
category: medium
topics: ["array", "matrix", "simulation"]
patterns: ["matrix-manipulation", "simulation"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E054", "M289", "M498"]
prerequisites: ["2d-array", "matrix-traversal"]
---
# Candy Crush

## Problem

Simulate the cascade mechanics of the popular game Candy Crush. You're given an `m x n` integer matrix `board` representing a grid of candies, where each positive integer represents a candy type and `0` represents an empty cell. Your task is to repeatedly apply the game's elimination and gravity rules until the board reaches a stable state where no more eliminations are possible.

The simulation follows a three-phase cycle that repeats until stability:

**Phase 1 - Mark**: Scan the entire board to find all candies that should be eliminated. Three or more identical candies (same positive integer) forming a continuous horizontal or vertical line must all be marked for elimination. Crucially, you must find **all** candies to eliminate in the current state before actually removing any of them—simultaneous elimination is key.

**Phase 2 - Crush**: Replace all marked candies with `0` (empty cells) simultaneously. This creates gaps in the grid.

**Phase 3 - Gravity**: Apply gravity by making candies fall downward to fill empty spaces. Within each column, all non-zero values should move down until they hit the bottom or another candy, leaving any empty cells (`0`) at the top of that column.

After gravity, you may have created new patterns of three or more matching candies. If so, repeat the cycle. Continue iterating until a complete mark phase finds nothing to eliminate, indicating the board is stable.

**Diagram:**

Candy Crush simulation example:
```
Initial Board:
1 3 5 5 2
3 4 3 3 1
3 2 4 5 2
2 4 4 5 5
1 4 4 1 1

After Step 1 (eliminate horizontal 3s in row 1, vertical 3s in col 0):
1 3 0 0 2
0 4 0 0 1
0 2 4 5 2
2 4 4 5 5
1 4 4 1 1

After gravity:
1 0 0 0 2
0 3 0 0 1
0 4 0 0 2
2 2 4 5 5
1 4 4 1 1

Continue until stable...

Final Board:
1 3 0 0 0
3 4 0 5 2
3 2 0 3 1
2 4 0 5 2
1 4 3 1 1
```

Important implementation detail: you cannot eliminate candies as you find them. You must first mark all candies that qualify for elimination in the current state, then eliminate them all at once. Otherwise, early eliminations would change the board and affect which other candies should be eliminated in the same round.

## Why This Matters

This problem is a classic example of simulation and iterative state transformation, skills essential for game development, cellular automata (like Conway's Game of Life), and physical simulations. The pattern of "mark, modify, stabilize" appears in garbage collection algorithms, circuit simulation, and constraint propagation systems. Learning to separate the detection phase from the modification phase (to avoid partial updates corrupting your analysis) is a critical debugging skill. This also reinforces 2D array manipulation, which is foundational for image processing, grid-based pathfinding, and matrix operations in graphics programming.

## Examples

**Example 1:**
- Input: `board = [[1,3,5,5,2],[3,4,3,3,1],[3,2,4,5,2],[2,4,4,5,5],[1,4,4,1,1]]`
- Output: `[[1,3,0,0,0],[3,4,0,5,2],[3,2,0,3,1],[2,4,0,5,2],[1,4,3,1,1]]`

## Constraints

- m == board.length
- n == board[i].length
- 3 <= m, n <= 50
- 1 <= board[i][j] <= 2000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Breaking Down the Simulation</summary>

The problem requires iterating through three distinct phases until no more eliminations occur:

1. **Mark phase**: Find all candies that should be crushed (3+ in a row horizontally or vertically)
2. **Crush phase**: Set marked cells to 0
3. **Gravity phase**: Make candies fall down to fill empty spaces

The key insight: You must mark ALL candies to be eliminated FIRST, then eliminate them simultaneously. You can't eliminate as you find them because it changes the board state.

Keep repeating these three phases until a complete mark phase finds nothing to eliminate.
</details>

<details>
<summary>Hint 2: Marking Candies to Crush</summary>

To find candies that should be eliminated:

**Horizontal check:**
- For each row, scan left to right
- Track consecutive candies of the same type
- If count >= 3, mark all of them for elimination

**Vertical check:**
- For each column, scan top to bottom
- Track consecutive candies of the same type
- If count >= 3, mark all of them for elimination

Implementation tip: Instead of modifying the board directly, use a separate boolean matrix `to_crush[i][j]` to mark cells. This ensures you find ALL candies in one pass before eliminating any.

After marking, count how many cells are marked. If 0, the board is stable. Otherwise, proceed to crush phase.
</details>

<details>
<summary>Hint 3: Implementing Gravity</summary>

After crushing (setting marked cells to 0), apply gravity:

For each column (left to right):
1. Collect all non-zero values from bottom to top
2. Place them at the bottom of the column
3. Fill remaining top cells with 0

Alternative approach (in-place):
- Use two pointers: `write` (where to write next non-zero) and `read` (current position)
- Start from bottom: write = m - 1
- Scan from bottom to top (read from m-1 to 0):
  - If cell is non-zero, write it at position `write` and decrement `write`
- Fill remaining top cells (0 to write) with 0

Time per iteration: O(m * n) for marking + O(m * n) for gravity = O(m * n)
Number of iterations: O(m * n) in worst case, but typically much fewer
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Simulation with marking | O((m*n)²) worst case | O(m*n) | Each iteration O(m*n), up to O(m*n) iterations |
| Optimized simulation | O((m*n)²) worst case | O(m*n) | Same but with early termination |
| Typical case | O(k * m * n) | O(m*n) | k is number of rounds (usually small, < 10) |

## Common Mistakes

**Mistake 1: Eliminating candies as you find them**
```python
# Wrong - modifies board during marking phase
def candyCrush(board):
    m, n = len(board), len(board[0])
    changed = True

    while changed:
        changed = False
        # Check horizontal - wrong approach
        for i in range(m):
            for j in range(n - 2):
                if board[i][j] != 0 and board[i][j] == board[i][j+1] == board[i][j+2]:
                    # Wrong: immediately sets to 0
                    board[i][j] = board[i][j+1] = board[i][j+2] = 0
                    changed = True
        # This breaks the simultaneous elimination rule
```

**Mistake 2: Incorrect gravity implementation**
```python
# Wrong - doesn't properly compact columns
def apply_gravity(board):
    m, n = len(board), len(board[0])
    for j in range(n):
        # Wrong: just swaps zeros upward, doesn't compact properly
        for i in range(m - 1, 0, -1):
            if board[i][j] == 0:
                for k in range(i - 1, -1, -1):
                    if board[k][j] != 0:
                        board[i][j], board[k][j] = board[k][j], board[i][j]
                        break
        # This doesn't handle multiple zeros correctly
```

**Mistake 3: Not checking both horizontal and vertical**
```python
# Wrong - only checks horizontal OR vertical, not both
def candyCrush(board):
    m, n = len(board), len(board[0])
    changed = True

    while changed:
        to_crush = [[False] * n for _ in range(m)]

        # Only checks horizontal - missing vertical check!
        for i in range(m):
            for j in range(n - 2):
                val = board[i][j]
                if val != 0 and board[i][j] == board[i][j+1] == board[i][j+2]:
                    to_crush[i][j] = to_crush[i][j+1] = to_crush[i][j+2] = True

        # Missing: vertical check similar to horizontal
        # ...
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Game of Life | Medium | Different rules, cells have only 2 states |
| Matrix Diagonal Traverse | Medium | Different traversal pattern |
| Rotate Image | Medium | In-place matrix rotation |
| Set Matrix Zeroes | Medium | Mark and update based on presence of zeros |
| Candy Crush with obstacles | Hard | Some cells cannot be crushed |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Practiced again (1 day later)
- [ ] Practiced again (3 days later)
- [ ] Practiced again (1 week later)
- [ ] Can solve in under 35 minutes
- [ ] Can explain solution clearly
- [ ] Implemented proper simultaneous elimination
- [ ] Handled gravity correctly for all columns
- [ ] Tested until board reaches stable state

**Strategy**: See [Matrix Manipulation](../strategies/data-structures/arrays-and-matrices.md)
