---
id: E232
old_id: A261
slug: valid-tic-tac-toe-state
title: Valid Tic-Tac-Toe State
difficulty: easy
category: easy
topics: ["string", "game-theory"]
patterns: ["state-validation"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["matrix-navigation", "game-rules", "logical-reasoning"]
related_problems: ["E348", "M294", "M464"]
strategy_ref: ../strategies/patterns/simulation.md
---
# Valid Tic-Tac-Toe State

## Problem

Given a tic-tac-toe board represented as an array of three strings (each string is one row), determine whether this board state could have occurred during a valid game. The board is always 3x3, with cells containing 'X', 'O', or a space ' ' (empty).

A valid game follows these rules: Players alternate turns with X going first. Each player places one symbol per turn in an empty cell. Once a player wins (three in a row, column, or diagonal), the game immediately ends and no more moves are allowed. The game also ends when the board is full.

Your task is to check if the given board could result from following these rules. This means verifying several properties: the move count makes sense (X can have at most one more piece than O since X goes first), only one player can have won, and if someone won, the game must have stopped at the right time.

Here are some impossible scenarios to watch for: both players winning simultaneously (impossible since the game stops after the first win), O having more pieces than X (impossible since X goes first), X having two or more extra pieces than O (would mean X took multiple consecutive turns), or a player winning but the opponent continuing to play afterward.

The tricky part is combining multiple validation rules. You need to count pieces, detect winners along all eight lines (3 rows, 3 columns, 2 diagonals), and verify that the move counts align with the win state.


**Diagram:**

```
Example 1: Valid game state
   0   1   2
0  O | X | X
  -----------
1  O | X | O
  -----------
2  X | O | X

X has 5 marks, O has 4 marks
Game is still in progress - Valid!
```

```
Example 2: Invalid game state
   0   1   2
0  X | X | O
  -----------
1  O | O |
  -----------
2    |   | X

O has won (row 1: O-O-O) but X made another move
This is impossible - Invalid!
```

```
Example 3: Invalid game state
   0   1   2
0  X | X | X
  -----------
1  O | O | O
  -----------
2    |   |

Both X and O have won simultaneously
This is impossible - Invalid!
```


## Why This Matters

This problem teaches state validation and game logic verification, skills essential for game development, chess engines, state machine validation, and protocol verification in distributed systems. The ability to check whether a state is reachable following a set of rules appears in testing game save files, validating blockchain transactions, and verifying distributed consensus.

The multiple-constraint checking pattern (count validation, win detection, logical consistency) is common in form validation, data integrity checking, and business rule enforcement. Real-world examples include validating credit card transactions (amount checks, fraud detection, balance verification), verifying user permissions (role checks, hierarchy validation, context verification), and testing parser states.

This problem also demonstrates the importance of edge case enumeration. A correct solution must handle all combinations of valid and invalid states, making it excellent practice for systematic testing and boolean logic. The technique of breaking complex validation into separate checks (count check, win check, consistency check) is a valuable software engineering pattern.

## Constraints

- board.length == 3
- board[i].length == 3
- board[i][j] is either 'X', 'O', or ' '.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Count the Moves
Start by counting how many X's and O's are on the board. Since X always goes first, what relationship must exist between the count of X's and O's? Can there be more O's than X's? Can X have more than one extra move compared to O?

### Tier 2: Detect Winners
Create a helper function to check if a player has won (three in a row, column, or diagonal). What are all the possible winning configurations? There are 8 total: 3 rows, 3 columns, and 2 diagonals.

### Tier 3: Validate Win Conditions
Here's the tricky part: if X has won, what must be true about the move counts? If X won on their last move, they should have exactly one more piece than O. If O won, they should have the same number of pieces as X. Can both players have won simultaneously? What if one player won but the other kept playing?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Rule-based Validation | O(1) | O(1) | Fixed 3×3 board, check all 8 winning lines |
| State Space Search | O(1) | O(1) | Still constant for 3×3 board |
| Backtracking Verification | O(9!) | O(9) | Try to recreate game - unnecessarily complex |

Where board size is always 3×3 (constant)

## Common Mistakes

### Mistake 1: Not Validating Turn Order
```python
# Wrong: Doesn't check if move counts are valid
def validTicTacToe(board):
    x_count = sum(row.count('X') for row in board)
    o_count = sum(row.count('O') for row in board)
    # Missing: check if x_count == o_count or x_count == o_count + 1
    return checkWinner(board, 'X') and not checkWinner(board, 'O')

# Correct: Validate move counts
if x_count < o_count or x_count > o_count + 1:
    return False
```

### Mistake 2: Allowing Both Winners
```python
# Wrong: Doesn't handle case where both players appear to have won
def validTicTacToe(board):
    x_wins = checkWinner(board, 'X')
    o_wins = checkWinner(board, 'O')
    if x_wins and o_wins:  # This alone isn't enough
        return False
    return True

# Correct: Both can't win, and if one wins, game should have stopped
if x_wins and o_wins:
    return False
if x_wins:
    return x_count == o_count + 1  # X won on X's turn
if o_wins:
    return x_count == o_count  # O won on O's turn
```

### Mistake 3: Incorrect Winner Check
```python
# Wrong: Incomplete winner detection
def checkWinner(board, player):
    # Only checks rows, missing columns and diagonals
    for row in board:
        if all(c == player for c in row):
            return True
    return False

# Correct: Check all 8 winning configurations
def checkWinner(board, player):
    # Check rows
    for row in board:
        if all(c == player for c in row):
            return True
    # Check columns
    for col in range(3):
        if all(board[row][col] == player for row in range(3)):
            return True
    # Check diagonals
    if all(board[i][i] == player for i in range(3)):
        return True
    if all(board[i][2-i] == player for i in range(3)):
        return True
    return False
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Valid Connect Four State | Medium | Same concept but for a 6×7 Connect Four board with gravity. |
| Minimal Moves to State | Medium | Given a valid state, find minimum moves needed to reach it. |
| N×N Tic-Tac-Toe Validator | Hard | Generalize to N×N board with K-in-a-row win condition. |
| Multi-Player Tic-Tac-Toe | Hard | Validate state for 3+ players taking turns. |
| Tic-Tac-Toe Restoration | Hard | Given partial board, determine if a valid game state exists. |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Implemented complete winner detection (8 cases)
- [ ] Handled edge case: more O's than X's (invalid)
- [ ] Handled edge case: X has 2+ more moves than O (invalid)
- [ ] Handled edge case: both players won (invalid)
- [ ] Handled edge case: winner but game continued (invalid)
- [ ] Tested with empty board (valid)
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Can explain approach to someone else

**Strategy**: See [Simulation Patterns](../strategies/patterns/simulation.md)
