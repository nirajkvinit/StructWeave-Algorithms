---
id: M378
old_id: A219
slug: open-the-lock
title: Open the Lock
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Open the Lock

## Problem

You're trying to open a combination lock with four circular wheels, similar to a physical padlock or a bicycle lock. Each wheel displays one digit from `'0'` to `'9'`, and you can rotate each wheel independently. The wheels wrap around: turning `'9'` one step forward becomes `'0'`, and turning `'0'` one step backward becomes `'9'`.

The lock starts at combination `"0000"` (all wheels showing zero). Each move consists of rotating exactly one wheel by exactly one step in either direction (forward or backward). So from `"0000"`, you could move to `"1000"`, `"9000"`, `"0100"`, `"0900"`, etc. (8 possible next states).

However, certain combinations are forbidden, listed in the array `deadends`. If the lock ever enters a deadend state, the mechanism jams permanently and you can make no further moves. You must avoid these states entirely throughout your solution path.

Given a `target` combination you're trying to reach, find the minimum number of moves required to reach it from `"0000"` while avoiding all deadends. If it's impossible to reach the target without hitting a deadend, return `-1`.

Important edge case: if `"0000"` itself is a deadend, you're stuck immediately and should return `-1` before attempting any moves.

Think of this as finding the shortest path in a graph where each combination is a node, and edges connect combinations differing by exactly one wheel rotation. Deadends are nodes you must never visit. This is a classic breadth-first search (BFS) problem because BFS finds the shortest path in unweighted graphs.

## Why This Matters

This is a quintessential shortest-path problem that teaches you when to use BFS versus DFS. BFS guarantees finding the minimum number of moves because it explores states level-by-level (all 1-move states, then all 2-move states, etc.). The state space (10^4 = 10,000 possible combinations) is small enough for BFS but teaches you to think about implicit graphs (where edges aren't explicitly stored but generated on-the-fly). This pattern appears in puzzle solving (like sliding tile puzzles), game AI (finding optimal move sequences), and state space exploration in formal verification. The bidirectional BFS optimization (searching from both start and end simultaneously) is an advanced technique used in navigation systems and theorem provers. Understanding how to avoid revisiting states with a "visited" set is fundamental to preventing infinite loops in graph search.

## Examples

**Example 1:**
- Input: `deadends = ["0201","0101","0102","1212","2002"], target = "0202"`
- Output: `6`
- Explanation: A sequence of valid moves would be "0000" -> "1000" -> "1100" -> "1200" -> "1201" -> "1202" -> "0202".
Note that a sequence like "0000" -> "0001" -> "0002" -> "0102" -> "0202" would be invalid,
because the wheels of the lock become stuck after the display becomes the dead end "0102".

**Example 2:**
- Input: `deadends = ["8888"], target = "0009"`
- Output: `1`
- Explanation: We can turn the last wheel in reverse to move from "0000" -> "0009".

**Example 3:**
- Input: `deadends = ["8887","8889","8878","8898","8788","8988","7888","9888"], target = "8888"`
- Output: `-1`
- Explanation: We cannot reach the target without getting stuck.

## Constraints

- 1 <= deadends.length <= 500
- deadends[i].length == 4
- target.length == 4
- target **will not be** in the list deadends.
- target and deadends[i] consist of digits only.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a shortest-path problem in a graph where each lock state is a node, and edges connect states that differ by one wheel rotation. The key is recognizing that BFS guarantees the minimum number of moves when all edges have equal weight.
</details>

<details>
<summary>Main Approach</summary>
Use BFS starting from "0000". For each state, generate all 8 possible next states (4 wheels, 2 directions each). Skip states that are deadends or already visited. Track the number of moves (levels in BFS). Return the level when target is found, or -1 if queue empties.
</details>

<details>
<summary>Optimization Tip</summary>
Use bidirectional BFS - search simultaneously from "0000" and target, meeting in the middle. This reduces the search space from O(10^4) to O(2 * 10^2), significantly faster for distant targets. Also, convert deadends to a set for O(1) lookup.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force DFS | O(10^4 * 8^d) | O(d) | d = depth, explores redundantly |
| BFS | O(10^4) | O(10^4) | Visits each state at most once |
| Bidirectional BFS | O(10^2) | O(10^2) | Meets in middle, much faster |

## Common Mistakes

1. **Forgetting to check if "0000" is a deadend**
   ```python
   # Wrong: Start BFS without checking initial state
   queue = deque([("0000", 0)])

   # Correct: Check if starting state is valid
   if "0000" in deadends:
       return -1
   queue = deque([("0000", 0)])
   ```

2. **Using list for deadends lookup**
   ```python
   # Wrong: O(n) lookup for each state
   if state in deadends_list:  # slow

   # Correct: O(1) lookup with set
   deadends_set = set(deadends)
   if state in deadends_set:  # fast
   ```

3. **Not handling wrap-around correctly**
   ```python
   # Wrong: Doesn't wrap 9->0 or 0->9
   next_digit = (int(wheel) + 1) % 10

   # Correct: Handle both directions with wrap
   next_up = str((int(wheel) + 1) % 10)
   next_down = str((int(wheel) - 1) % 10)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Shortest Path in Binary Matrix | Medium | 2D grid instead of lock state space |
| Sliding Puzzle | Hard | 2D state space with more complex transitions |
| Word Ladder | Hard | String transformations instead of digit rotations |
| Minimum Genetic Mutation | Medium | Similar BFS with string mutations |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Breadth-First Search](../../strategies/patterns/bfs.md)
