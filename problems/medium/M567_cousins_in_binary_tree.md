---
id: M567
old_id: A460
slug: cousins-in-binary-tree
title: Cousins in Binary Tree
difficulty: medium
category: medium
topics: ["tree"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../prerequisites/trees.md
---
# Cousins in Binary Tree

## Problem

Think about a family tree. Two people are cousins if they're in the same generation but have different parents. This problem asks you to check the same relationship in a binary tree structure.

You're given the root of a binary tree where all node values are unique, along with two distinct values `x` and `y`. Determine whether the nodes containing these values are cousins.

Two nodes are **cousins** if they satisfy both conditions:
1. They are at the same depth (same distance from root)
2. They have different parent nodes

In this tree, the root is at depth 0. For any node at depth k, its children are at depth k + 1.

Return `true` if the nodes with values `x` and `y` are cousins, `false` otherwise.


**Diagram:**

Example 1 (x=4, y=3 are cousins):
```
       1
      / \
     2   3
    /
   4

x=4 and y=3 are at depth 2
x=4 parent is 2, y=3 parent is 1
Different parents, same depth → Cousins: true
```

Example 2 (x=5, y=4 are NOT cousins):
```
       1
      / \
     2   3
    / \
   4   5

x=5 and y=4 are at depth 2
x=5 parent is 2, y=4 parent is 2
Same parent → NOT cousins: false
```

Example 3 (x=2, y=3 are NOT cousins):
```
       1
      / \
     2   3
    /
   4

x=2 is at depth 1, y=3 is at depth 1
Different depths in this context → NOT cousins: false
(Note: They ARE at same depth but have same parent)
```


## Why This Matters

Checking relationships in tree structures appears throughout software engineering. This problem teaches techniques used in organizational hierarchy analysis (finding employees at the same level in different departments), file system traversal (locating files at the same directory depth), HTML DOM manipulation (finding sibling elements in web development), and decision tree evaluation (comparing nodes at the same level of classification). The pattern of tracking both depth and parent relationships is fundamental to many tree algorithms, from version control systems (finding related commits in git graphs) to game AI (evaluating positions at the same search depth in game trees).

## Constraints

- The number of nodes in the tree is in the range [2, 100].
- 1 <= Node.val <= 100
- Each node has a **unique** value.
- x != y
- x and y are exist in the tree.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [Tree Pattern](../prerequisites/trees.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
You need to find three pieces of information for both nodes: (1) their depth in the tree, (2) their parent nodes, and (3) whether they exist. Two nodes are cousins if they have the same depth but different parents.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use BFS (level-order traversal) or DFS with depth tracking. For each node, record its depth and parent. Once both target nodes are found, compare their depths and parents. They are cousins if depths match but parents differ.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can use a single DFS/BFS pass to find both nodes simultaneously. Store (depth, parent) tuples in a dictionary or track them with instance variables. Early termination: return false immediately if you find both nodes have the same parent.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| DFS with Tracking | O(N) | O(H) | N = nodes, H = height (recursion stack) |
| BFS Level-Order | O(N) | O(W) | W = maximum width of tree (queue size) |
| Optimal | O(N) | O(H) or O(W) | Both approaches are optimal |

## Common Mistakes

1. **Not Checking Parent Condition**
   ```python
   # Wrong: Only checking depth
   def isCousins(root, x, y):
       depth_x = find_depth(root, x)
       depth_y = find_depth(root, y)
       return depth_x == depth_y  # Missing parent check!

   # Correct: Check both depth and parent
   def isCousins(root, x, y):
       info_x = find_info(root, x)  # Returns (depth, parent)
       info_y = find_info(root, y)
       return (info_x[0] == info_y[0] and  # Same depth
               info_x[1] != info_y[1])      # Different parents
   ```

2. **Incorrect Depth Tracking**
   ```python
   # Wrong: Not passing depth correctly in recursion
   def dfs(node, target):
       if not node:
           return -1
       if node.val == target:
           return 0
       return dfs(node.left, target) or dfs(node.right, target)

   # Correct: Properly track and increment depth
   def dfs(node, target, depth=0):
       if not node:
           return None
       if node.val == target:
           return depth
       left = dfs(node.left, target, depth + 1)
       if left is not None:
           return left
       return dfs(node.right, target, depth + 1)
   ```

3. **Not Handling Parent at Root Level**
   ```python
   # Wrong: What if we're checking root's children?
   def dfs(node, target, parent):
       if node.val == target:
           return (depth, parent.val)  # Error if parent is None!

   # Correct: Handle None parent
   def dfs(node, target, parent=None, depth=0):
       if not node:
           return None
       if node.val == target:
           return (depth, parent.val if parent else None)
       # Continue recursion...
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Lowest Common Ancestor | Medium | Find common ancestor instead of checking cousin relationship |
| All Nodes Distance K | Medium | Find all nodes at distance K from target |
| Binary Tree Level Order Traversal | Medium | Group nodes by level |
| Maximum Depth of Binary Tree | Easy | Only track depth, not parent |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Tree Traversal](../../prerequisites/trees.md)
