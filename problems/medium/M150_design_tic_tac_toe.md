---
id: M150
old_id: I147
slug: design-tic-tac-toe
title: Design Tic-Tac-Toe
difficulty: medium
category: medium
topics: ["design", "array"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["E001", "M148", "M153"]
prerequisites: ["arrays", "state-tracking", "object-oriented-design"]
---
# Design Tic-Tac-Toe

## Problem

Create a class that manages a tic-tac-toe game played on a square board of size `n x n` between two players. Unlike the traditional 3x3 version, this generalized version works for any board size, making the win-checking logic more interesting. The game operates under these conditions: every move is valid and targets an unoccupied cell (no need to check for illegal moves), the game ends when a player achieves a winning configuration, and victory is achieved by forming a complete line of `n` marks along any row, column, or the two diagonals (main diagonal from top-left to bottom-right, or anti-diagonal from top-right to bottom-left).

Your implementation should include the `TicTacToe` class with these methods: `TicTacToe(int n)` creates a new game board with dimensions `n x n`, and `int move(int row, int col, int player)` records a move by the specified player (either 1 or 2) at position `(row, col)`. The method should return `0` if the game continues without a winner, `1` if player 1 has won with this move, or `2` if player 2 has won with this move.

The naive approach of checking all rows, columns, and diagonals after every move would take O(n) time, which becomes expensive for large boards or rapid gameplay. Can you design a solution that determines the winner in O(1) constant time by cleverly tracking state as moves are made? Consider maintaining counters that track how close each player is to winning in each row, column, and diagonal, updating these counters incrementally rather than scanning the entire board. Edge cases include the very first move (no winner yet), boards of size 2 (minimum valid size), and very large boards where space efficiency matters.

## Why This Matters

Game state management with efficient win detection is essential in online gaming platforms, multiplayer game servers, and competitive gaming systems where thousands of games run simultaneously. Chess servers, poker platforms, and mobile game backends all need to quickly determine game outcomes without expensive board scanning. The technique of incremental state tracking (updating counts rather than rescanning) applies broadly to real-time systems: fraud detection systems track suspicious patterns by incrementally updating risk scores rather than recalculating from scratch, rate limiters track API usage with counters, and leaderboard systems maintain rankings through incremental updates. This problem teaches you to optimize by trading space for time (storing counts to avoid recalculation) and to design stateful objects that maintain invariants efficiently. These skills are crucial for system design interviews and building scalable, low-latency services where performance matters.

## Constraints

- 2 <= n <= 100
- player is 1 or 2.
- 0 <= row, col < n
- (row, col) are **unique** for each different call to move.
- At most n² calls will be made to move.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Avoid Checking Entire Board</summary>
The naive approach checks all rows, columns, and diagonals after every move, taking O(n) time. Since moves are guaranteed valid, only the row, column, and potentially diagonals where the move was made could contribute to a win. Can you track state incrementally?
</details>

<details>
<summary>🎯 Hint 2: Count Markers Per Line</summary>
For each row, column, and diagonal, track how many marks each player has placed. When a player places a mark:
- Increment their count for that row
- Increment their count for that column
- If on main diagonal, increment diagonal count
- If on anti-diagonal, increment anti-diagonal count
If any count reaches n, that player wins.
</details>

<details>
<summary>📝 Hint 3: Space-Efficient Tracking</summary>
Use arrays to track counts:
- `rows[i]` = count in row i
- `cols[j]` = count in column j
- `diag` = count on main diagonal
- `anti_diag` = count on anti-diagonal

Use positive values for player 1, negative for player 2. Win occurs when absolute value equals n. Algorithm:
1. Update row[row] += (player == 1 ? 1 : -1)
2. Update col[col] similarly
3. If row == col, update diag
4. If row + col == n - 1, update anti_diag
5. Check if any absolute value equals n
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Check All Lines | O(n) per move | O(n²) | Check all rows, cols, diagonals after each move |
| Store Full Board | O(n) per move | O(n²) | Store board, check affected lines only |
| **Optimal (Count Arrays)** | **O(1) per move** | **O(n)** | Track counts per row/col/diagonal |

## Common Mistakes

**Mistake 1: Storing Entire Board**
```python
# Wrong: Wastes space when only counts matter
class TicTacToe:
    def __init__(self, n):
        self.n = n
        self.board = [[0] * n for _ in range(n)]  # Unnecessary

    def move(self, row, col, player):
        self.board[row][col] = player
        # Still need to check for win O(n)
        return self._check_win(row, col, player)
```

**Correct Approach:**
```python
# Correct: Only track counts
class TicTacToe:
    def __init__(self, n):
        self.n = n
        self.rows = [0] * n
        self.cols = [0] * n
        self.diag = 0
        self.anti_diag = 0

    def move(self, row, col, player):
        delta = 1 if player == 1 else -1

        self.rows[row] += delta
        self.cols[col] += delta
        if row == col:
            self.diag += delta
        if row + col == self.n - 1:
            self.anti_diag += delta

        # Check win in O(1)
        if (abs(self.rows[row]) == self.n or
            abs(self.cols[col]) == self.n or
            abs(self.diag) == self.n or
            abs(self.anti_diag) == self.n):
            return player

        return 0
```

**Mistake 2: Checking All Lines Every Move**
```python
# Wrong: O(n) time to check all possibilities
class TicTacToe:
    def __init__(self, n):
        self.n = n
        self.rows = [0] * n
        self.cols = [0] * n

    def move(self, row, col, player):
        # Update counts...

        # Wrong: Checks all rows and columns
        for i in range(self.n):
            if abs(self.rows[i]) == self.n or abs(self.cols[i]) == self.n:
                return player
        return 0
```

**Correct Approach:**
```python
# Correct: Only check affected lines
def move(self, row, col, player):
    delta = 1 if player == 1 else -1
    self.rows[row] += delta
    self.cols[col] += delta

    # Only check the lines this move affected
    if abs(self.rows[row]) == self.n or abs(self.cols[col]) == self.n:
        return player
    # Check diagonals only if applicable...
    return 0
```

**Mistake 3: Incorrect Diagonal Conditions**
```python
# Wrong: Anti-diagonal condition is incorrect
def move(self, row, col, player):
    # ...
    if row == col:
        self.diag += delta
    if row == self.n - col:  # Wrong!
        self.anti_diag += delta
    # ...

# Correct: Anti-diagonal is when row + col == n - 1
def move(self, row, col, player):
    # ...
    if row == col:
        self.diag += delta
    if row + col == self.n - 1:  # Correct
        self.anti_diag += delta
    # ...
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| Connect Four | Win with 4 in a row on 6x7 board | Check 4 consecutive, gravity applies |
| Multi-player Tic-Tac-Toe | More than 2 players | Use dict/map for player counts |
| Ultimate Tic-Tac-Toe | 3x3 grid of 3x3 boards | Nested game state tracking |
| Undo Move | Allow taking back moves | Store move history, reverse operations |
| Variable Win Length | Win requires k in a row, not n | Check if count reaches k instead of n |

## Practice Checklist

- [ ] Day 1: Implement with count arrays (O(1) per move)
- [ ] Day 2: Implement Connect Four variation
- [ ] Day 7: Add undo functionality
- [ ] Day 14: Solve without looking at hints
- [ ] Day 30: Implement ultimate tic-tac-toe

**Strategy**: See [Object-Oriented Design](../strategies/fundamentals/design-patterns.md)
