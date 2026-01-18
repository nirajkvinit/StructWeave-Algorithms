---
id: M054
old_id: F130
slug: surrounded-regions
title: Surrounded Regions
difficulty: medium
category: medium
topics: ["graph", "depth-first-search", "breadth-first-search", "union-find"]
patterns: ["boundary-dfs", "reverse-thinking"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E733", "M200", "M130"]
prerequisites: ["dfs", "bfs", "matrix-traversal"]
strategy_ref: ../strategies/data-structures/graphs.md
---
# Surrounded Regions

## Problem

You're given a 2D board (matrix) containing 'X' and 'O' characters. Your task is to "capture" all regions of 'O' cells that are completely surrounded by 'X' cells by flipping them to 'X'. A region is a group of connected 'O' cells (horizontally or vertically adjacent). The key insight is that a region is surrounded only if none of its cells touch the border of the board. For example, if an 'O' appears on the edge of the board, it and all 'O' cells connected to it cannot be captured. The diagram shows a 4x4 board where the interior 'O' cells are surrounded and get flipped to 'X', but the bottom-left 'O' touches the border and remains unchanged. The challenge is efficiently identifying which 'O' regions are truly surrounded versus those that have an escape route to the border. Edge cases include boards that are entirely 'X', entirely 'O', or where all 'O' cells touch the border.

**Diagram:**

```
Input:                    Output:
X X X X                   X X X X
X O O X      ===>         X X X X
X X O X                   X X X X
X O X X                   X O X X
```


## Why This Matters

This problem models territory capture in games like Go, flood fill in image processing (where you might fill a region unless it touches the edge), and boundary analysis in geographic information systems. The reverse-thinking approach (finding what's NOT surrounded instead of what IS) is a powerful problem-solving technique that appears in security analysis (finding exposed vulnerabilities), network segmentation (identifying isolated components), and computational geometry (determining inside vs outside regions). The multi-source traversal pattern (starting from all border cells simultaneously) is used in optimal pathfinding, parallel infection spread models, and circuit design where you need to propagate signals from multiple sources. This teaches you when inverting the problem statement leads to a simpler, more elegant solution.

## Examples

**Example 1:**
- Input: `board = [["X"]]`
- Output: `[["X"]]`

## Constraints

- m == board.length
- n == board[i].length
- 1 <= m, n <= 200
- board[i][j] is 'X' or 'O'.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Reverse Thinking</summary>

Instead of finding regions that ARE surrounded (hard to determine), find regions that are NOT surrounded. Any 'O' connected to the border cannot be captured. What remains after marking border-connected regions must be capturable.

</details>

<details>
<summary>🎯 Hint 2: Border Traversal Strategy</summary>

Start DFS/BFS from all 'O' cells on the borders. Mark all 'O' cells reachable from borders as "safe" (temporarily mark them differently, like 'T'). After this traversal, any remaining 'O' cells are surrounded and can be flipped to 'X'. Finally, restore the safe cells back to 'O'.

</details>

<details>
<summary>📝 Hint 3: Three-Pass Algorithm</summary>

**Pseudocode approach:**
1. First pass: For each border cell
   - If it's 'O', run DFS/BFS to mark all connected 'O' cells as 'T' (temporary)
2. Second pass: For each cell in board
   - If cell is 'O', flip to 'X' (these are surrounded)
   - If cell is 'T', flip back to 'O' (these are border-connected)
3. Done! All surrounded regions captured

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| **DFS from Borders** | **O(m × n)** | **O(m × n)** | Optimal - visit each cell at most twice |
| BFS from Borders | O(m × n) | O(m × n) | Same complexity, queue instead of stack |
| Union-Find | O(m × n × α(m×n)) | O(m × n) | More complex, rarely needed |
| Check Each Region | O((m×n)²) | O(m × n) | Inefficient - may revisit cells many times |

## Common Mistakes

### 1. Trying to Identify Surrounded Regions Directly
```python
# WRONG: Difficult to determine if region is surrounded
def solve(board):
    for i in range(len(board)):
        for j in range(len(board[0])):
            if board[i][j] == 'O':
                # How do we know if THIS region touches border?
                # Would need to explore entire region every time
                pass

# CORRECT: Mark border-connected regions first
def solve(board):
    # Start from borders and mark safe regions
    for i in range(len(board)):
        dfs(board, i, 0)  # Left border
        dfs(board, i, len(board[0]) - 1)  # Right border
    for j in range(len(board[0])):
        dfs(board, 0, j)  # Top border
        dfs(board, len(board) - 1, j)  # Bottom border
```

### 2. Modifying 'O' Directly Without Temporary Mark
```python
# WRONG: Loses information about which cells to keep
def solve(board):
    # If we flip O to X immediately, we can't tell which
    # O's were originally connected to borders
    for i in range(len(board)):
        for j in range(len(board[0])):
            if board[i][j] == 'O' and is_surrounded(i, j):
                board[i][j] = 'X'  # Lost track of border-connected!

# CORRECT: Use temporary marker
def solve(board):
    # Mark border-connected as 'T'
    # Then: O -> X (surrounded), T -> O (safe)
```

### 3. Not Checking Bounds in DFS
```python
# WRONG: Missing boundary checks
def dfs(board, i, j):
    if board[i][j] != 'O':  # Will crash if i,j out of bounds!
        return
    board[i][j] = 'T'
    dfs(board, i+1, j)

# CORRECT: Check bounds first
def dfs(board, i, j):
    if i < 0 or i >= len(board) or j < 0 or j >= len(board[0]):
        return
    if board[i][j] != 'O':
        return
    board[i][j] = 'T'
    dfs(board, i+1, j)
    dfs(board, i-1, j)
    dfs(board, i, j+1)
    dfs(board, i, j-1)
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Number of Enclaves | Count surrounded 'O' cells | Count instead of flip in second pass |
| Flood Fill (E733) | Fill connected region from point | DFS/BFS from single starting point |
| Number of Islands (M200) | Count disconnected regions | DFS/BFS to mark and count |
| Pacific Atlantic Water Flow | Two borders with different rules | Run DFS from two different border sets |
| Walls and Gates | Multi-source BFS distance | BFS from all borders simultaneously |

## Practice Checklist

- [ ] Handles all-X and all-O boards correctly
- [ ] Can explain reverse-thinking approach in 2 min
- [ ] Can code DFS solution in 15 min
- [ ] Can implement BFS alternative
- [ ] Understands why border-first is more efficient

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Graph DFS/BFS Patterns](../../strategies/data-structures/graphs.md)
