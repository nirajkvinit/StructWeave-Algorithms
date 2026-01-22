---
id: M261
old_id: A055
slug: maximum-depth-of-n-ary-tree
title: Maximum Depth of N-ary Tree
difficulty: medium
category: medium
topics: ["tree", "bfs", "dfs"]
patterns: ["level-order", "recursion"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E104_maximum_depth_of_binary_tree", "E559_minimum_depth_of_n_ary_tree", "M102_binary_tree_level_order_traversal"]
prerequisites: ["tree-traversal", "recursion", "bfs"]
strategy_ref: ../prerequisites/trees.md
---
# Maximum Depth of N-ary Tree

## Problem

Given an n-ary tree, find its maximum depth. An n-ary tree is a hierarchical data structure where each node can have any number of children (not just two like binary trees). The maximum depth represents the number of nodes along the longest path from the root node down to the farthest leaf node.

Think of depth as counting levels in the tree. A single root node has depth 1, the root plus one level of children has depth 2, and so on. For example, if your tree has a root, the root's children at level 2, and some of those children have their own children at level 3, the maximum depth is 3.

The tree input is provided using level-order traversal encoding, where each group of children is followed by a `null` delimiter. However, you'll typically work with a node structure where each node contains a value and a list of child nodes. Important edge cases to consider: the tree might be empty (null root), have just a single node, or have varying depths across different branches.

**Diagram:**

```
Example 1: N-ary Tree
         1
       / | \
      3  2  4
     / \
    5   6

Maximum depth = 3 (path: 1 -> 3 -> 5 or 1 -> 3 -> 6)
```

```
Example 2: N-ary Tree
           1
      _____|_____
     /  /  |  \  \
    2  3   4   5  6
      / \  |
     7  8  9
       / \  \
      10 11 12
       |
      13

Maximum depth = 5 (path: 1 -> 3 -> 8 -> 11 -> 13)
```


## Why This Matters

N-ary trees appear frequently in real-world applications like file system hierarchies (directories with multiple subdirectories), organizational charts (managers with multiple direct reports), and HTML DOM structures (elements with multiple child elements). This problem builds fundamental recursive decomposition skills where you solve a problem by breaking it into identical smaller subproblems. The depth calculation pattern you learn here extends to graph traversal algorithms like BFS and DFS, which are essential for networking, social graph analysis, and pathfinding problems.

## Constraints

- The total number of nodes is in the range [0, 10⁴].
- The depth of the n-ary tree is less than or equal to 1000.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Recursive DFS Approach</summary>

The depth of a tree is 1 (for the root) plus the maximum depth among all its children. This naturally suggests a recursive solution.

Base case: If the node is null or has no children, return appropriate depth. Recursive case: Return 1 + max(depth of each child).

For an n-ary tree, you'll need to iterate through all children and find the maximum depth among them.
</details>

<details>
<summary>Hint 2: Iterative BFS Approach</summary>

Use level-order traversal (BFS) with a queue. Track the depth as you process each level completely before moving to the next.

Algorithm:
1. Start with root in queue, depth = 0
2. For each level, process all nodes currently in queue
3. Add their children to queue for next level
4. Increment depth after processing each level
5. Return depth when queue is empty

This approach is intuitive and matches how we visually count tree levels.
</details>

<details>
<summary>Hint 3: Implementation Comparison</summary>

**Recursive (cleaner code):**
```python
def maxDepth(root):
    if not root:
        return 0
    if not root.children:
        return 1
    return 1 + max(maxDepth(child) for child in root.children)
```

**Iterative BFS (better for very deep trees):**
```python
def maxDepth(root):
    if not root:
        return 0
    queue = [root]
    depth = 0
    while queue:
        depth += 1
        for _ in range(len(queue)):
            node = queue.pop(0)
            queue.extend(node.children)
    return depth
```

Choose based on tree characteristics and constraints.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Recursive DFS | O(n) | O(h) | h = tree height for recursion stack |
| Iterative BFS | O(n) | O(w) | w = maximum width of tree (queue size) |
| Iterative DFS | O(n) | O(h) | Using explicit stack instead of recursion |

## Common Mistakes

1. **Forgetting to handle null root**
```python
# Wrong: Crashes on null input
def maxDepth(root):
    return 1 + max(maxDepth(child) for child in root.children)

# Correct: Check for null first
def maxDepth(root):
    if not root:
        return 0
    # ... rest of logic
```

2. **Incorrect BFS level counting**
```python
# Wrong: Incrementing depth for every node
while queue:
    node = queue.pop(0)
    depth += 1  # Wrong position
    queue.extend(node.children)

# Correct: Increment depth per level, not per node
while queue:
    depth += 1
    for _ in range(len(queue)):  # Process entire level
        node = queue.pop(0)
        queue.extend(node.children)
```

3. **Not handling empty children list**
```python
# Wrong: max() crashes on empty sequence
return 1 + max(maxDepth(child) for child in root.children)

# Correct: Provide default for empty children
if not root.children:
    return 1
return 1 + max(maxDepth(child) for child in root.children)
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Minimum Depth | Easy | Find shortest path from root to any leaf |
| Average Depth | Medium | Calculate average depth across all leaves |
| Depth of Specific Node | Medium | Find depth of node with given value |
| All Paths of Max Depth | Hard | Return all paths that achieve maximum depth |

## Practice Checklist

- [ ] Solve using recursive DFS
- [ ] Solve using iterative BFS
- [ ] Handle edge case: empty tree (null root)
- [ ] Handle edge case: single node tree
- [ ] **Day 3**: Solve again without hints
- [ ] **Week 1**: Implement minimum depth variation
- [ ] **Week 2**: Solve both approaches from memory in under 15 minutes

**Strategy**: See [Tree Pattern](../prerequisites/trees.md)
