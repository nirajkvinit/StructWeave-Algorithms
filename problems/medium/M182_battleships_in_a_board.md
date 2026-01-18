---
id: M182
old_id: I218
slug: battleships-in-a-board
title: Battleships in a Board
difficulty: medium
category: medium
topics: ["matrix", "counting", "traversal"]
patterns: ["dp-2d", "one-pass-counting"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M200", "E463", "M695"]
prerequisites: ["matrix-traversal", "counting-patterns"]
---
# Battleships in a Board

## Problem

You're analyzing a game board from a battleship-style game, represented as a 2D grid of size `m x n` where each cell contains either `'X'` (representing part of a battleship) or `'.'` (representing empty water). Your task is to count how many distinct battleships are present on the board. Each battleship occupies a contiguous line of cells, either horizontally (shape `1 x k` across a row) or vertically (shape `k x 1` down a column), where `k` can be any positive integer representing the ship's length. Here's the key constraint that makes this problem interesting: battleships are guaranteed to be non-adjacent, meaning there's always at least one empty water cell separating any two ships in all directions (including diagonals). For instance, if you see a board with an 'X' at position (0,0) and a vertical line of 'X' marks at (0,3), (1,3), (2,3), that represents 2 distinct battleships. The non-adjacency guarantee means you don't need complex connected-component algorithms. Instead, you can identify each battleship by finding its starting position. A cell is a battleship's "head" if it's marked 'X' and has no 'X' above it (ruling out being part of a vertical ship) and no 'X' to its left (ruling out being part of a horizontal ship). This lets you solve the problem in a single pass with constant space, which is far more elegant than running DFS/BFS.

## Why This Matters

This problem appears in image processing and computer vision applications where you need to count distinct connected regions or objects in a grid-based representation. Real-world examples include analyzing satellite imagery to count buildings or ships, processing medical scans to identify separate tumors or lesions, and game development for collision detection or board game state analysis. The key insight, that non-adjacency constraints allow for simplified counting algorithms, is valuable when designing systems with known invariants. Instead of using expensive graph traversal algorithms (DFS/BFS with O(n) space), recognizing structural guarantees lets you achieve the same result with a single pass and O(1) space. This pattern recognition skill translates to optimizing warehouse robotics (counting distinct item clusters), agricultural monitoring (counting separate crop patches from aerial images), and network topology analysis (identifying isolated network segments). The problem trains you to identify when problem constraints enable simpler solutions than the general case would require.

## Examples

**Example 1:**
- Input: `board = [["."]]`
- Output: `0`

## Constraints

- m == board.length
- n == board[i].length
- 1 <= m, n <= 200
- board[i][j] is either '.' or 'X'.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Count only the start of each battleship</summary>

Since battleships cannot be adjacent and are either horizontal or vertical, you only need to count the "head" of each battleship. A cell is the head of a battleship if it's 'X' and has no 'X' to its left (for horizontal) or above (for vertical). This allows a single-pass solution without DFS/BFS.
</details>

<details>
<summary>🎯 Hint 2: Check top and left neighbors only</summary>

For each 'X' cell, check if there's an 'X' above it or to its left. If neither exists, this cell is the start of a new battleship. This works because battleships are continuous and non-adjacent, so each battleship has exactly one "top-left" cell.
</details>

<details>
<summary>📝 Hint 3: One-pass counting algorithm</summary>

```
1. Initialize count = 0
2. For each cell (i, j) in the board:
   - If board[i][j] == 'X':
     - If i == 0 or board[i-1][j] == '.':  # No X above
       - If j == 0 or board[i][j-1] == '.':  # No X to left
         - count += 1  # This is a battleship start
3. Return count

Time: O(m × n), Space: O(1)
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| One-Pass Counting | O(m × n) | O(1) | Count battleship starts only |
| DFS/BFS | O(m × n) | O(m × n) | Mark visited cells, works but overkill |
| Modify Board | O(m × n) | O(1) | Mark battleships as visited in-place |

## Common Mistakes

### Mistake 1: Using DFS/BFS unnecessarily

```python
# Wrong: Overly complex solution with DFS
def count_battleships_wrong(board):
    def dfs(i, j):
        if i < 0 or i >= m or j < 0 or j >= n or board[i][j] != 'X':
            return
        board[i][j] = '.'  # Mark as visited
        dfs(i+1, j)
        dfs(i-1, j)
        dfs(i, j+1)
        dfs(i, j-1)

    m, n = len(board), len(board[0])
    count = 0
    for i in range(m):
        for j in range(n):
            if board[i][j] == 'X':
                dfs(i, j)
                count += 1
    return count
```

```python
# Correct: Simple one-pass counting
def count_battleships_correct(board):
    m, n = len(board), len(board[0])
    count = 0

    for i in range(m):
        for j in range(n):
            if board[i][j] == 'X':
                # Check if this is the start of a battleship
                if (i == 0 or board[i-1][j] == '.') and \
                   (j == 0 or board[i][j-1] == '.'):
                    count += 1

    return count
```

### Mistake 2: Counting all 'X' cells instead of battleships

```python
# Wrong: Counting individual cells, not battleships
def count_battleships_wrong(board):
    count = 0
    for row in board:
        for cell in row:
            if cell == 'X':
                count += 1  # This counts cells, not ships!
    return count
```

```python
# Correct: Count unique battleships by identifying starts
def count_battleships_correct(board):
    count = 0
    for i in range(len(board)):
        for j in range(len(board[0])):
            if board[i][j] == 'X':
                # Only count if this is the top-left of a battleship
                has_top = i > 0 and board[i-1][j] == 'X'
                has_left = j > 0 and board[i][j-1] == 'X'
                if not has_top and not has_left:
                    count += 1
    return count
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Number of Islands | Medium | Count connected components - M200 |
| Island Perimeter | Easy | Calculate perimeter of islands - E463 |
| Max Area of Island | Medium | Find largest connected component - M695 |
| Battleships with Diagonal | Medium | Allow diagonal adjacency |

## Practice Checklist

- [ ] Day 1: Solve using one-pass counting approach (15-20 min)
- [ ] Day 2: Implement using DFS to understand the difference (25 min)
- [ ] Day 7: Re-solve and explain why one-pass works (15 min)
- [ ] Day 14: Compare with Number of Islands problem (20 min)
- [ ] Day 30: Explain how non-adjacency constraint simplifies the problem (10 min)

**Strategy**: See [Matrix Traversal Pattern](../strategies/patterns/matrix-traversal.md)
