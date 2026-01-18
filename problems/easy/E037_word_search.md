---
id: E037
old_id: F079
slug: word-search
title: Word Search
difficulty: easy
category: easy
topics: ["string"]
patterns: ["dp-2d"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E036", "M035", "H012"]
prerequisites: ["backtracking", "dfs", "2d-arrays"]
strategy_ref: ../../strategies/patterns/backtracking.md
---
# Word Search

## Problem

Given a 2D grid of letters and a target word, determine whether the word can be formed by connecting adjacent cells in the grid. You can start from any cell and move horizontally or vertically to neighboring cells, but you cannot reuse the same cell within a single search path.

Think of this like a word puzzle where you trace a path through the grid. For example, if you're searching for "HELLO" in a grid, you need to find an 'H', then move to an adjacent 'E', then to an adjacent 'L', and so on. The key constraint is that once you use a cell in your current path, you cannot visit it again for that particular search attempt.

**Important details:**
- Adjacent means horizontally or vertically neighboring cells only, not diagonal
- Each cell can contain any uppercase or lowercase letter
- The same cell cannot be used more than once in a single path
- You can start your search from any cell in the grid
- If no valid path exists, return false

**Diagram:**

Example 1: Search for word "ABCCED"

```
Board:
A → B → C → C
    ↓       ↓
S   F   C   E
        ↓   ↓
A   D   E → D

Path found: A-B-C-C-E-D (following adjacent cells)
```

Example 2: Search for word "SEE"

```
Board:
A   B   C   E
S → E → E   F
A   D   E   E

Path found: S-E-E (following adjacent cells)
```

Example 3: Search for word "ABCB"

```
Board:
A → B   C   E
    ↓
S   F   C   S
A   D   E   E

Cannot form "ABCB" - cannot reuse cells in the path
```


## Why This Matters

This problem is a classic application of backtracking and depth-first search, two fundamental techniques used throughout computer science. Word search appears in real-world applications like crossword puzzle validators, word game engines (think Boggle or Scrabble board analysis), and text recognition systems. Beyond the immediate use case, mastering this problem teaches you how to explore state spaces systematically, manage visited states, and implement recursive backtracking—skills that transfer directly to solving maze problems, constraint satisfaction puzzles, and pathfinding challenges in AI and robotics.

## Constraints

- m == board.length
- n = board[i].length
- 1 <= m, n <= 6
- 1 <= word.length <= 15
- board and word consists of only lowercase and uppercase English letters.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Search Starting Points</summary>

You need to find where the word could possibly start. What should you do when you find the first character of the word in the grid?

Think about how you would systematically explore all possible starting positions without missing any.

</details>

<details>
<summary>🎯 Hint 2: Path Exploration with Constraints</summary>

Once you find a matching starting character, you need to explore in all four directions (up, down, left, right) to match the next character. However, you cannot reuse cells.

How can you mark a cell as "visited" during exploration and then "unmark" it when backtracking? Think about modifying the board temporarily or using an auxiliary data structure.

</details>

<details>
<summary>📝 Hint 3: DFS Backtracking Algorithm</summary>

Use depth-first search with backtracking:

```
function dfs(row, col, word_index):
    if word_index == word.length:
        return true  # Found complete word

    if out of bounds or cell != word[word_index]:
        return false

    # Mark current cell as visited
    temp = board[row][col]
    board[row][col] = '#'  # or use visited set

    # Explore all 4 directions
    found = dfs(row+1, col, word_index+1) or
            dfs(row-1, col, word_index+1) or
            dfs(row, col+1, word_index+1) or
            dfs(row, col-1, word_index+1)

    # Restore cell (backtrack)
    board[row][col] = temp

    return found
```

For each cell in the grid, try starting the search there.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force DFS | O(m × n × 4^L) | O(L) | Check every cell, 4 directions at each step |
| **DFS + Backtracking** | **O(m × n × 3^L)** | **O(L)** | **After first step, only 3 directions (no going back)** |
| DFS + Visited Set | O(m × n × 3^L) | O(m × n) | Explicit visited tracking |

Note: L = length of word, m × n = grid size

## Common Mistakes

### 1. Not Restoring Cell After Backtracking
```python
# WRONG: Doesn't restore the cell
def dfs(row, col, index):
    board[row][col] = '#'  # Mark visited
    # ... explore directions ...
    # Missing: restore board[row][col]
    return found

# CORRECT: Always restore state
def dfs(row, col, index):
    temp = board[row][col]
    board[row][col] = '#'
    # ... explore directions ...
    board[row][col] = temp  # Restore
    return found
```

### 2. Checking Bounds After Recursion
```python
# WRONG: May cause index out of bounds
def dfs(row, col, index):
    if board[row][col] != word[index]:  # Crash if out of bounds!
        return False

# CORRECT: Check bounds first
def dfs(row, col, index):
    if row < 0 or row >= m or col < 0 or col >= n:
        return False
    if board[row][col] != word[index]:
        return False
```

### 3. Not Handling Early Termination
```python
# WRONG: Continues searching after finding word
def dfs(row, col, index):
    if index == len(word):
        return True
    # ... explore all 4 directions regardless ...
    return result1 or result2 or result3 or result4

# CORRECT: Return immediately when found
def dfs(row, col, index):
    if index == len(word):
        return True
    # Use 'or' to short-circuit when first path succeeds
    if dfs(row+1, col, index+1):
        return True
    # ... other directions ...
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Word Search II | Multiple words to find | Use Trie data structure to search multiple words simultaneously |
| Allow reusing cells | Can visit cells multiple times | Remove visited marking logic |
| Count all paths | Find number of ways to form word | Don't return early; accumulate count |
| Diagonal movement | Allow 8 directions instead of 4 | Add 4 more direction checks |
| Minimum path length | Find shortest path to form word | Use BFS instead of DFS |

## Practice Checklist

**Correctness:**
- [ ] Handles empty board or word
- [ ] Correctly marks and unmarks visited cells
- [ ] Checks all four directions
- [ ] Returns false when word not found
- [ ] Handles word longer than grid size

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 15 minutes
- [ ] Can discuss time/space complexity
- [ ] Can explain why backtracking is needed
- [ ] Can handle follow-up about optimizations

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Backtracking](../../strategies/patterns/backtracking.md)
