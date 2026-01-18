---
id: E205
old_id: A104
slug: average-of-levels-in-binary-tree
title: Average of Levels in Binary Tree
difficulty: easy
category: easy
topics: ["tree", "breadth-first-search", "depth-first-search"]
patterns: ["bfs", "level-order-traversal"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E102", "E107", "M199"]
prerequisites: ["binary-trees", "bfs", "queue-data-structure"]
strategy_ref: ../strategies/data-structures/trees.md
---
# Average of Levels in Binary Tree

## Problem

Given the root of a binary tree, calculate the average value of the nodes at each depth level. A "level" refers to all nodes at the same distance from the root - the root itself is at level 0, its children are at level 1, their children are at level 2, and so on.

Return an array containing these averages, where the first element is the average of level 0 (the root), the second element is the average of level 1, and so on. Your results are considered correct if they're within 10⁻⁵ of the exact answer, so you can return floating-point values.

The key challenge is grouping nodes by their depth level. When traversing a tree, you need a way to know when you've finished processing one level and started the next. The most straightforward approach uses breadth-first search (BFS) with a queue. Before processing each level, you capture the current queue size - this tells you exactly how many nodes belong to the current level. Process that many nodes, calculate their average, then move to the next level.

Alternatively, you can solve this with depth-first search (DFS) by tracking the depth parameter and maintaining arrays for sum and count at each level. Both approaches are O(n) time where n is the number of nodes, but they differ in space complexity based on tree shape.

## Why This Matters

Level-order traversal is one of the most frequently tested tree patterns in technical interviews. It appears in organizational hierarchy analysis (computing average salaries per level), network topology problems (analyzing latency by hop count), game development (processing entities by distance from player), and file system operations (directory depth statistics).

This problem is fundamental because it combines two essential skills: understanding tree traversal methods and knowing how to track level boundaries during BFS. Many harder tree problems build on this foundation - including zigzag level order, right side view of tree, and finding the deepest leaves.

The BFS technique learned here - using queue size to separate levels - is a universal pattern that applies to any graph traversal where you need to process vertices in waves or layers. It's also a stepping stone to understanding how modern frameworks process component trees and render hierarchies.

## Constraints

- The number of nodes in the tree is in the range [1, 10⁴].
- -2³¹ <= Node.val <= 2³¹ - 1

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Level-Order Traversal
To compute averages per level, you need to group nodes by depth:
- How do you visit all nodes at the same level together?
- What data structure helps process nodes level by level?

Think about Breadth-First Search (BFS) using a queue.

### Hint 2: BFS with Level Tracking
When using a queue for BFS:
- How do you know when one level ends and the next begins?
- Before processing a level, what information do you need to capture?

Count the number of nodes in the queue before processing each level.

### Hint 3: Calculating Averages Carefully
For each level:
- Sum all node values at that level
- Divide by the number of nodes at that level
- Be careful with integer division vs. float division

Can you also solve this with DFS by tracking depth and maintaining sum/count arrays?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| BFS (Queue) | O(n) | O(w) | w = max width of tree; optimal for balanced trees |
| DFS (Recursive) | O(n) | O(h) | h = height; maintains arrays for each level |
| BFS (Two Queues) | O(n) | O(w) | Alternate between two queues; same efficiency |

## Common Mistakes

### Mistake 1: Not Separating Levels in BFS
```python
# Wrong: Doesn't track level boundaries
def averageOfLevels(root):
    if not root:
        return []
    queue = [root]
    result = []
    while queue:
        node = queue.pop(0)
        # Can't determine when level changes!
        if node.left:
            queue.append(node.left)
        if node.right:
            queue.append(node.right)
```
**Why it's wrong:** Without tracking the number of nodes per level, you can't calculate level-specific averages.

**Correct approach:** Capture `level_size = len(queue)` before processing each level, then process exactly that many nodes.

### Mistake 2: Integer Division Instead of Float
```python
# Wrong: Uses integer division
def averageOfLevels(root):
    # ... BFS setup ...
    level_sum = 0
    level_count = 0
    # ... sum nodes at level ...
    result.append(level_sum // level_count)  # Wrong: integer division!
```
**Why it's wrong:** The problem expects floating-point averages. Integer division truncates decimals.

**Correct approach:** Use `level_sum / level_count` to get float result.

### Mistake 3: Not Handling Large Sums
```python
# Wrong: May overflow with large trees (in some languages)
def averageOfLevels(root):
    # ... BFS setup ...
    level_sum = 0  # Might overflow in languages like Java
    for _ in range(level_size):
        node = queue.pop(0)
        level_sum += node.val
    # ...
```
**Why it's wrong:** In languages like Java, using `int` for sum may overflow. Node values can be up to 2^31 - 1.

**Correct approach:** Use `long` type for sum in Java, or calculate average incrementally. In Python, this isn't an issue.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Maximum value per level | Return max value at each level instead of average | Easy |
| Sum of levels | Return sum of each level instead of average | Easy |
| Level with max average | Find which level has highest average | Easy |
| Weighted average by depth | Weight averages by level depth | Medium |
| Average of vertical levels | Calculate averages for vertical columns instead | Medium |

## Practice Checklist

Practice this problem until you can confidently complete these tasks:

- [ ] Day 1: Solve with BFS approach using queue (20 min)
- [ ] Day 3: Implement DFS solution with level tracking (25 min)
- [ ] Day 7: Solve BFS without looking at notes (15 min)
- [ ] Day 14: Explain difference between BFS and DFS for this problem
- [ ] Day 30: Solve a variation (level with max average)

**Strategy**: See [Tree Pattern](../strategies/data-structures/trees.md)
