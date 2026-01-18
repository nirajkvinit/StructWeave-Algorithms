---
id: H090
old_id: A142
slug: cut-off-trees-for-golf-event
title: Cut Off Trees for Golf Event
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# Cut Off Trees for Golf Event

## Problem

Your objective is to remove every tree in a forested area to prepare it for a golf tournament. The forest is modeled as an `m x n` grid where each cell has a specific meaning:

	- `0` indicates an impassable obstacle.
	- `1` represents an accessible empty space.
	- Any value greater than `1` signifies a tree at that location, with the number denoting the tree's height. These cells are also walkable.

You can move one step at a time in four cardinal directions: up, down, left, or right. When positioned at a tree's location, you have the option to remove it.

Trees must be removed in ascending order of height, from shortest to tallest. After removal, the tree's cell value changes to `1`, making it an empty walkable space.

Beginning at coordinates `(0, 0)`, determine the minimum number of steps required to remove all trees. If it's impossible to reach and remove all trees, return `-1`.

**Note:** All trees have unique heights, and at least one tree exists in the forest.


**Visualization:**

Input: forest = [[1,2,3],[0,0,4],[7,6,5]]
```
Grid representation:
1  2  3
0  0  4
7  6  5

Where:
  0 = obstacle (blocked)
  1 = empty space
  2,3,4,5,6,7 = trees with heights

Tree removal order (ascending height):
  2 -> 3 -> 4 -> 5 -> 6 -> 7

Path sequence:
  Start(0,0) -> (0,1)[2] -> (0,2)[3] -> (1,2)[4] -> (2,2)[5] -> (2,1)[6] -> (2,0)[7]
```

Input: forest = [[1,2,3],[0,0,0],[7,6,5]]
```
Grid representation:
1  2  3
0  0  0   <- Middle row is all obstacles
7  6  5

Cannot reach bottom row from top row
```
Output: -1


## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Examples

**Example 1:**
- Input: `forest = [[2,3,4],[0,0,5],[8,7,6]]`
- Output: `6`
- Explanation: Starting at position (0, 0) which contains a tree of height 2, you can remove it immediately without any movement. Then navigate to remove trees in height order: 2, 3, 4, 5, 6, 7, 8. The total movement required is 6 steps.

## Constraints

- m == forest.length
- n == forest[i].length
- 1 <= m, n <= 50
- 0 <= forest[i][j] <= 10⁹
- Heights of all trees are **distinct**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a two-phase problem: (1) determine the order to cut trees (sorted by height), and (2) find the shortest path between consecutive tree positions. The challenge is efficiently computing shortest paths in a grid with obstacles. Each path is independent, so BFS for each segment works.
</details>

<details>
<summary>Main Approach</summary>
First, collect all tree positions and sort them by height. Start at (0,0) and for each tree in order, use BFS to find the shortest path from current position to the tree. If any BFS fails to reach a tree, return -1. Sum all the path lengths. BFS handles obstacles (0 cells) naturally.
</details>

<details>
<summary>Optimization Tip</summary>
Use bidirectional BFS for finding paths to reduce the search space. For very large grids, A* search with Manhattan distance heuristic can be faster. However, for the given constraints (m, n ≤ 50), standard BFS is sufficient and simpler to implement correctly.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS for each tree | O(t * m * n) | O(m * n) | t = number of trees, BFS for each |
| A* Search | O(t * m * n) | O(m * n) | Better average case but same worst case |
| Bidirectional BFS | O(t * m * n) | O(m * n) | Faster in practice, more complex |

## Common Mistakes

1. **Not checking if trees are reachable before sorting**
   ```python
   # Wrong: Sorting all trees without checking reachability
   trees = sorted(all_trees, key=lambda x: forest[x[0]][x[1]])
   total = 0
   for tree in trees:
       steps = bfs(current, tree)
       total += steps  # What if steps == -1?

   # Correct: Check each path and return -1 early if unreachable
   for tree in trees:
       steps = bfs(current, tree)
       if steps == -1:
           return -1
       total += steps
       current = tree
   ```

2. **Forgetting to update current position after cutting each tree**
   ```python
   # Wrong: Always starting from (0, 0)
   for tree in trees:
       steps = bfs((0, 0), tree)  # Should start from current position

   # Correct: Track current position
   current = (0, 0)
   for tree in trees:
       steps = bfs(current, tree)
       if steps == -1:
           return -1
       total += steps
       current = tree
   ```

3. **Treating tree cells as obstacles in BFS**
   ```python
   # Wrong: Can't walk through trees
   def bfs(start, end):
       for nx, ny in neighbors:
           if forest[nx][ny] == 0:  # Only checking obstacles
               continue
           # Missing: tree cells (value > 1) are walkable

   # Correct: Only obstacles block movement
   def bfs(start, end):
       for nx, ny in neighbors:
           if forest[nx][ny] == 0:  # Obstacle
               continue
           # All other cells (1 or tree heights) are walkable
           queue.append((nx, ny))
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Shortest Path in Grid | Medium | Single source to single target BFS |
| Minimum Path Sum | Medium | Different cost function, use DP |
| Shortest Path to Get All Keys | Hard | Multiple targets with dependencies |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Graph Search - BFS](../../strategies/patterns/graph-traversal.md)
