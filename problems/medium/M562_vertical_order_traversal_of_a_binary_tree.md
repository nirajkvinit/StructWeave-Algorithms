---
id: M562
old_id: A454
slug: vertical-order-traversal-of-a-binary-tree
title: Vertical Order Traversal of a Binary Tree
difficulty: medium
category: medium
topics: ["tree", "two-pointers"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/data-structures/trees.md
---
# Vertical Order Traversal of a Binary Tree

## Problem

Imagine looking at a binary tree from directly above and organizing all the nodes you see into vertical columns, like arranging books on shelves from left to right. Nodes that align vertically belong to the same column, but when multiple nodes occupy the exact same position, you need to sort them by their values.

Given the root of a binary tree, generate its vertical order traversal by organizing nodes into columns based on their horizontal position.

Think of each node as having coordinates in a grid:
- The root starts at position `(row=0, col=0)`
- When you go to a left child, you move one row down and one column left: `(row+1, col-1)`
- When you go to a right child, you move one row down and one column right: `(row+1, col+1)`

Your task is to group nodes by their column positions (from leftmost to rightmost), then within each column, list them from top to bottom. The tricky part: when multiple nodes share the exact same position (same row and column), sort them by their values in ascending order.

Return a list of lists, where each inner list represents one vertical column from left to right.


**Diagram:**

Example 1:
```
       3(0,0)
      /     \
   9(-1,1)  20(1,1)
            /  \
         15(0,2) 7(2,2)

Columns: -1  0   1   2
Output: [[9],[3,15],[20],[7]]
```

Example 2:
```
       1(0,0)
      /     \
   2(-1,1)  3(1,1)
   /  \      /  \
4(-2,2)5(0,2)6(0,2)7(2,2)

Columns: -2  -1  0    1   2
Output: [[4],[2],[1,5,6],[3],[7]]
Note: 5 and 6 are at same position, sorted by value
```

Example 3:
```
       1(0,0)
      /     \
   2(-1,1)  3(1,1)
   /  \      /
4(-2,2)6(0,2)5(0,2)

Columns: -2  -1  0    1
Output: [[4],[2],[1,5,6],[3]]
```


## Why This Matters

Vertical tree traversals have practical applications in rendering hierarchical visualizations, like organizational charts or file system explorers. When you display a tree structure on screen, you often need to align nodes vertically to show relationships clearly. This problem appears in UI frameworks that render tree components, database query optimizers that visualize execution plans, and graph layout algorithms. It combines spatial reasoning with sorting - skills that translate directly to problems involving coordinate systems, 2D game development, and computer graphics where objects need to be rendered in specific visual orders.

## Constraints

- The number of nodes in the tree is in the range [1, 1000].
- 0 <= Node.val <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Assign coordinates (row, col) to each node during traversal. Left child gets col-1, right child gets col+1, and both get row+1. Collect all nodes with their coordinates, then group by column and sort within each column by row first, then by value.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use BFS or DFS to traverse the tree, tracking (row, col, node_value) for each node. Store these in a list. After traversal, sort the list by: (1) column (ascending), (2) row (ascending), (3) value (ascending). Then group consecutive nodes with the same column into result sublists.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a dictionary mapping column → list of (row, value) pairs. During traversal, populate this dict. Then sort the column keys, and for each column, sort the (row, value) list. This approach naturally groups nodes by column and handles the multi-level sorting requirement.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS/DFS + Sort | O(n log n) | O(n) | Visit n nodes, sort by (col, row, val) |
| Optimal | O(n log n) | O(n) | Same; sorting dominates traversal O(n) |

## Common Mistakes

1. **Incorrect sorting criteria**
   ```python
   # Wrong: Sorting only by column
   nodes.sort(key=lambda x: x[1])  # x[1] is column only

   # Correct: Sort by column, then row, then value
   nodes.sort(key=lambda x: (x[1], x[0], x[2]))
   # Where x = (row, col, val)
   ```

2. **Not handling ties correctly**
   ```python
   # Wrong: When nodes at same (row, col), not sorting by value
   # Example: nodes at (2, 0): values [6, 5] should output [5, 6]

   # Correct: Include value in sort key
   col_dict[col].append((row, val))
   # Later: col_dict[col].sort()  # Sorts by row, then val
   ```

3. **Forgetting to update row for children**
   ```python
   # Wrong: Not incrementing row for children
   dfs(node.left, row, col - 1)
   dfs(node.right, row, col + 1)

   # Correct: Increment row for next level
   dfs(node.left, row + 1, col - 1)
   dfs(node.right, row + 1, col + 1)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Binary Tree Level Order Traversal | Medium | Group by row only, no column tracking |
| Binary Tree Zigzag Traversal | Medium | Alternate left-to-right direction per level |
| Binary Tree Top View | Medium | Only first node per column (min row) |
| Binary Tree Bottom View | Medium | Only last node per column (max row) |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

**Strategy**: See [Tree Pattern](../strategies/data-structures/trees.md)
