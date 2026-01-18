---
id: M453
old_id: A308
slug: keys-and-rooms
title: Keys and Rooms
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Keys and Rooms

## Problem

Picture yourself in a building with numbered rooms from 0 to n-1. You start in room 0, which is unlocked, but all other rooms are locked and require keys to enter.

Each room contains a set of keys scattered around. When you enter a room, you can pick up all the keys you find there, and each key is labeled with the number of the room it unlocks. For example, if you find a key labeled "3" in room 0, you can use it to unlock and enter room 3.

The question is: starting from room 0 and collecting keys as you go, can you eventually visit every single room in the building? Or will some rooms remain forever inaccessible because you can never find their keys?

You're given an array where `rooms[i]` is a list of all the keys found in room `i`. Return `true` if you can visit all rooms, or `false` if at least one room will remain locked.

## Why This Matters

This problem models access control systems where permissions grant further permissions - think of file system permissions, role-based access in software systems, or security clearance levels. In web crawling, each webpage (room) contains links (keys) to other pages, and you need to determine if the entire site is reachable from the homepage. The same pattern appears in dependency resolution (can you install all packages given their dependencies?), network connectivity testing, and state machine reachability analysis. Understanding graph traversal from a single source is foundational for pathfinding algorithms used in GPS navigation, game AI, and network routing protocols.

## Examples

**Example 1:**
- Input: `rooms = [[1],[2],[3],[]]`
- Output: `true`
- Explanation: We visit room 0 and pick up key 1.
We then visit room 1 and pick up key 2.
We then visit room 2 and pick up key 3.
We then visit room 3.
Since we were able to visit every room, we return true.

**Example 2:**
- Input: `rooms = [[1,3],[3,0,1],[2],[0]]`
- Output: `false`
- Explanation: We can not enter room number 2 since the only key that unlocks it is in that room.

## Constraints

- n == rooms.length
- 2 <= n <= 1000
- 0 <= rooms[i].length <= 1000
- 1 <= sum(rooms[i].length) <= 3000
- 0 <= rooms[i][j] < n
- All the values of rooms[i] are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a graph reachability problem. Each room is a node, and each key represents a directed edge to another room. The question asks whether all nodes are reachable from node 0. This is classic BFS/DFS traversal.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use BFS or DFS starting from room 0. Maintain a visited set to track which rooms you've entered. When you visit a room, add all keys found to your queue/stack (if you haven't visited those rooms yet). After traversal completes, check if the visited set size equals the total number of rooms.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
No need to store keys separately - just process them immediately during traversal. When you find a key to room X and haven't visited X yet, mark it as visited and add it to your queue/stack. This avoids duplicate visits and extra data structures.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS | O(n + k) where k = total keys | O(n) | Visit each room once, process each key once |
| DFS | O(n + k) | O(n) | Same complexity, different traversal order |

## Common Mistakes

1. **Not tracking visited rooms properly**
   ```python
   # Wrong: Revisiting rooms multiple times
   queue = [0]
   while queue:
       room = queue.pop(0)
       for key in rooms[room]:
           queue.append(key)  # May add duplicates!

   # Correct: Use visited set
   visited = {0}
   queue = [0]
   while queue:
       room = queue.pop(0)
       for key in rooms[room]:
           if key not in visited:
               visited.add(key)
               queue.append(key)
   ```

2. **Forgetting to start from room 0**
   ```python
   # Wrong: Starting from wrong room or all rooms
   for i in range(len(rooms)):
       dfs(i, rooms, visited)  # Wrong approach!

   # Correct: Start only from room 0
   visited = set()
   dfs(0, rooms, visited)
   return len(visited) == len(rooms)
   ```

3. **Inefficient key collection**
   ```python
   # Wrong: Collecting all keys first, then visiting
   all_keys = set()
   for room_keys in rooms:
       all_keys.update(room_keys)  # Don't have access yet!

   # Correct: Only use keys from visited rooms
   def dfs(room, rooms, visited):
       visited.add(room)
       for key in rooms[room]:
           if key not in visited:
               dfs(key, rooms, visited)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Keys and Rooms with Locks | Hard | Some keys open multiple rooms, locks require multiple keys |
| Minimum Keys to Unlock All | Hard | Find minimum set of initial keys needed |
| Time-Limited Room Access | Hard | Keys expire after certain time/uses |
| Graph Reachability | Easy | Basic graph traversal without room/key context |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Depth-First Search](../../strategies/patterns/depth-first-search.md)
