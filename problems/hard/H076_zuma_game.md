---
id: H076
old_id: I287
slug: zuma-game
title: Zuma Game
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# Zuma Game

## Problem

In this Zuma-inspired puzzle game, you have a linear sequence of colored balls on a board and additional balls in your hand. Each ball is one of five colors: red `'R'`, yellow `'Y'`, blue `'B'`, green `'G'`, or white `'W'`.

The objective is to eliminate all balls from the board by strategically inserting balls from your hand. The rules are:

	- On each move, select a ball from your hand and place it anywhere in the row (between existing balls or at either end)
	- Whenever three or more consecutive balls of the same color appear, they are removed automatically
	- Chain reactions occur: if a removal creates another group of 3+ matching balls, those are also removed, continuing until no such groups exist
	- Victory is achieved when the board becomes empty

Given strings `board` (representing the current board state) and `hand` (representing available balls), calculate *the **minimum** number of insertions needed to clear the board completely*. Return `-1` if clearing the board is impossible with the given hand.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `board = "WRRBBW", hand = "RB"`
- Output: `-1`
- Explanation: Complete board clearance is unattainable. Even with optimal insertions (R creates WRRRBBW which reduces to WBBW, then B creates WBBBW which reduces to WW), two balls remain and the hand is exhausted.

**Example 2:**
- Input: `board = "WWRRBBWW", hand = "WRBRW"`
- Output: `2`
- Explanation: Insert R to form WWRRRBBWW (reduces to WWBBWW), then insert B to form WWBBBWW (reduces to WWWW, which further reduces to empty). Total insertions: 2.

**Example 3:**
- Input: `board = "G", hand = "GGGGG"`
- Output: `2`
- Explanation: First insertion creates GG, second insertion creates GGG which auto-removes. Total insertions: 2.

## Constraints

- 1 <= board.length <= 16
- 1 <= hand.length <= 5
- board and hand consist of the characters 'R', 'Y', 'B', 'G', and 'W'.
- The initial row of balls on the board will **not** have any groups of three or more consecutive balls of the same color.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

This is a BFS/DFS search problem with state space exploration. Each state is (current_board, remaining_hand). The key optimizations:
1. Only insert balls next to existing groups of the same color (inserting randomly is wasteful)
2. If you need to insert next to a color, insert enough to trigger removal (e.g., next to "RR", insert 1 R to make "RRR")
3. Use memoization to avoid reprocessing the same state

The small constraints (board ≤ 16, hand ≤ 5) make exhaustive search feasible with pruning.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use DFS with memoization:
1. For each color in hand, find all consecutive groups of that color on board
2. Only insert next to these groups (don't insert randomly)
3. Insert the minimum needed to trigger removal (if group has k balls, insert 3-k balls)
4. After insertion, simulate removal (keep removing 3+ consecutive groups until none exist)
5. Recursively solve for the new state
6. Track minimum insertions across all possibilities
7. Use memo to cache (board_state, hand_state) → min_insertions

Base cases: board empty (return 0), hand empty but board not (return -1).

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Major pruning strategies:
1. Only insert where it matters - next to existing groups of same color
2. If a group has 1 ball, you need 2 more; if it has 2 balls, you need 1 more
3. Count hand balls: if you don't have enough balls to complete any group, prune that branch
4. When multiple consecutive groups of same color exist (e.g., "RRBBRR"), only try inserting at distinct positions
5. Optimize the removal simulation - use a loop with two pointers to efficiently eliminate 3+ groups

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(k^(b×h)) | O(b × h) | k positions, b board size, h hand size - intractable |
| DFS with pruning | O(5^h × b²) | O(5^h × b) | At most 5 colors, h insertions, b board size |
| Optimal | O(5^h × b²) | O(5^h × b) | With memoization, avoid recomputing states |

## Common Mistakes

1. **Not triggering cascading removals**
   ```python
   # Wrong: Only removing once after insertion
   def insert_and_remove(board, pos, ball):
       new_board = board[:pos] + ball + board[pos:]
       # Remove only the newly formed group
       return remove_consecutive(new_board, pos)

   # Correct: Keep removing until no more 3+ groups
   def insert_and_remove(board, pos, ball):
       new_board = board[:pos] + ball + board[pos:]
       while True:
           removed = False
           # Find and remove all 3+ consecutive groups
           i = 0
           while i < len(new_board):
               j = i
               while j < len(new_board) and new_board[j] == new_board[i]:
                   j += 1
               if j - i >= 3:
                   new_board = new_board[:i] + new_board[j:]
                   removed = True
                   break
               i = j
           if not removed:
               break
       return new_board
   ```

2. **Inserting at all positions inefficiently**
   ```python
   # Wrong: Trying every position on the board
   for pos in range(len(board) + 1):
       for ball in hand:
           # Exponential without pruning
           result = min(result, dfs(insert(board, pos, ball), remove(hand, ball)))

   # Correct: Only insert next to same-color groups
   for i, ball in enumerate(hand):
       # Find groups of this color on board
       for pos in range(len(board)):
           if board[pos] == ball:
               # Only insert before this group
               new_board = insert_and_remove(board, pos, ball)
               new_hand = hand[:i] + hand[i+1:]
               result = min(result, 1 + dfs(new_board, new_hand))
   ```

3. **Not calculating minimum balls needed**
   ```python
   # Wrong: Inserting one ball at a time
   if board[pos] == ball:
       # Might need 2 balls to trigger removal, not just 1
       result = min(result, 1 + dfs(new_board, new_hand))

   # Correct: Calculate how many balls needed
   # Count consecutive same-color balls
   count = 1
   while pos + count < len(board) and board[pos + count] == ball:
       count += 1
   needed = 3 - count  # Need this many to trigger removal
   if hand.count(ball) >= needed:
       # Insert all needed balls at once
       result = min(result, needed + dfs(...))
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Remove Colored Pieces | Medium | Two players alternate removing |
| Burst Balloons | Hard | Maximize score instead of minimize moves |
| Minimum Swaps to Group All 1's | Medium | Simpler - only swapping, no removal |
| Candy Crush | Medium | 2D version with gravity |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (cascading removals, impossible cases)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Backtracking](../../strategies/patterns/backtracking.md)
