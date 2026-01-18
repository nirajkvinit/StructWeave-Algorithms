---
id: M468
old_id: A331
slug: shortest-path-to-get-all-keys
title: Shortest Path to Get All Keys
difficulty: medium
category: medium
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Shortest Path to Get All Keys

## Problem

Imagine you're navigating a dungeon represented as an `m x n` grid. Your goal is to collect all the keys scattered throughout the dungeon, moving in the shortest path possible.

The grid contains these elements:
- `'.'` - Empty walkable space
- `'#'` - Solid wall that blocks movement
- `'@'` - Your starting position (also walkable)
- Lowercase letters (`'a'` to `'f'`) - Keys you can pick up
- Uppercase letters (`'A'` to `'F'`) - Locked doors that require matching keys

Movement rules:
- You can move one cell at a time in the four cardinal directions (up, down, left, right)
- You cannot move outside the grid boundaries or through walls
- When you step on a key, you automatically collect it and keep it
- You can only pass through a locked door if you have the matching key (lowercase unlocks uppercase: 'a' unlocks 'A')

The grid contains between 1 and 6 different keys, and each key has exactly one corresponding lock. Keys are represented by consecutive letters starting from 'a' (so if there are 3 keys, they'll be 'a', 'b', and 'c').

Return the minimum number of moves needed to collect all keys. If it's impossible to collect all keys, return `-1`.


**Diagram:**

Example 1:
```
Grid: ["@.a..", "###.#", "b.A.B"]

@  .  a  .  .
#  #  #  .  #
b  .  A  .  B

Legend:
@ = Start position
. = Empty space
# = Wall
a, b = Keys
A, B = Locks

Shortest path: 8 steps
Path: @ -> a -> b -> A -> B
```

Example 2:
```
Grid: ["@..aA", "..B#.", "....b"]

@  .  .  a  A
.  .  B  #  .
.  .  .  .  b

Shortest path: 6 steps
Path: @ -> a -> A -> B -> b
```

Example 3:
```
Grid: ["@Aa"]

@  A  a

Impossible! Cannot reach key 'a' without first unlocking door 'A'
Output: -1
```


## Why This Matters

This problem models state-space search with dependencies, a pattern that appears throughout software systems. Think about package dependency resolution where you need to install packages in the right order to satisfy dependencies, or video game progression where you need certain items to unlock areas that contain other required items. It appears in robot path planning where robots must visit multiple locations while respecting constraints, workflow automation where tasks have prerequisites, and even in network security where you need credentials to access systems that contain other credentials. The technique of using bitmasks to efficiently track collected items is fundamental to many optimization problems.

## Constraints

- m == grid.length
- n == grid[i].length
- 1 <= m, n <= 30
- grid[i][j] is either an English letter, '.', '#', or '@'.
- There is exactly one '@' in the grid.
- The number of keys in the grid is in the range [1, 6].
- Each key in the grid is **unique**.
- Each key in the grid has a matching lock.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a state-space search problem where the state is (position, keys_collected). A simple BFS on position alone won't work because you might revisit the same position with different keys. The key insight is to use BFS with state being (row, col, bitmask) where the bitmask represents which keys you've collected so far. Since there are at most 6 keys, a bitmask fits in a small integer.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use BFS with 3D state space: (row, col, key_state). Track visited states using a set or 3D array. For each state, try all 4 directions. When moving to a new cell: if it's a key, update the bitmask; if it's a lock, check if you have the corresponding key; if you collect all keys, return the step count. Use bit manipulation to track keys: if you have 3 keys total and collected keys 'a' and 'c', your mask is 0b101.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Instead of using a set of tuples for visited states, use a 3D boolean array visited[row][col][key_mask] for O(1) lookups. Since there are at most 6 keys, the key_mask ranges from 0 to 63 (2^6 - 1). Also, count total keys at the start to know when you've collected all of them (when mask == (1 << num_keys) - 1).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force DFS | O(4^(m*n)) | O(m*n) | Exponential, tries all paths |
| BFS with State | O(m * n * 2^k) | O(m * n * 2^k) | k = number of keys (max 6) |

## Common Mistakes

1. **Forgetting to track key state in visited check**
   ```python
   # Wrong: Only tracking position
   visited = set()
   visited.add((row, col))

   # Correct: Track position + keys collected
   visited = set()
   visited.add((row, col, keys_mask))
   ```

2. **Not using bitmask for keys**
   ```python
   # Wrong: Using a set or list (harder to hash and compare)
   keys = set()
   keys.add('a')

   # Correct: Use bitmask for efficient state representation
   keys_mask = 0
   keys_mask |= (1 << (ord('a') - ord('a')))  # Set bit for key 'a'
   ```

3. **Incorrect lock checking**
   ```python
   # Wrong: Checking if lock exists in keys
   if cell.lower() in keys:
       can_pass = True

   # Correct: Check the corresponding bit in the mask
   if keys_mask & (1 << (ord(cell.lower()) - ord('a'))):
       can_pass = True
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Shortest Path in Binary Matrix | Medium | Simple BFS without key/lock state |
| Open the Lock | Medium | Different state space (lock combination) |
| Sliding Puzzle | Hard | State space with board permutations |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [BFS with State](../../strategies/patterns/bfs.md)
