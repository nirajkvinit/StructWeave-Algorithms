---
id: M315
old_id: A129
slug: maximum-width-of-binary-tree
title: Maximum Width of Binary Tree
difficulty: medium
category: medium
topics: ["tree", "breadth-first-search"]
patterns: ["level-order-traversal", "position-indexing"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M102", "E104", "M662"]
prerequisites: ["tree-traversal", "bfs", "binary-tree-properties"]
strategy_ref: ../strategies/data-structures/trees.md
---
# Maximum Width of Binary Tree

## Problem

Given a binary tree's root node, calculate the maximum width across all levels, where width is defined as the distance between the leftmost and rightmost non-null nodes at each level, including any null nodes in between.

Think of the tree as if it were a complete binary tree where every position exists. At each level, identify the leftmost and rightmost actual nodes, then count all positions between them, including the gaps where null nodes would be in a complete tree. For example, if level 2 has a node at position 1 and another at position 4, the width is 4 (counting positions 1, 2, 3, and 4), even though positions 2 and 3 might be null.

To compute this efficiently, assign each node a position index as if the tree were complete. In a complete binary tree, if a node has position `pos`, its left child is at `2 * pos` and its right child is at `2 * pos + 1` (using 0-based indexing). Using these position values, the width at any level is simply `rightmost_position - leftmost_position + 1`.

A key challenge is preventing integer overflow: in deep trees, position indices grow exponentially. You must normalize positions at each level to keep numbers manageable while preserving relative distances.

Return the maximum width found across all levels.


**Example 1:**

Input: root = [1,3,2,5,3,null,9]
```
       1          width = 1
      / \
     3   2        width = 2
    / \   \
   5   3   9      width = 4 (includes null positions)
```
Output: 4

**Example 2:**

Input: root = [1,3,2,5,null,null,9,6,null,7]
```
       1                width = 1
      / \
     3   2              width = 2
    /     \
   5       9            width = 4 (3 to 9, includes nulls)
  /         \
 6           7          width = 8 (6 to 7, includes all nulls)
```
Output: 7 (level with node 7 has positions from leftmost to rightmost)


## Why This Matters

This problem teaches position-based indexing in implicit tree representations, a fundamental technique used in heap implementations and segment trees. Understanding how to map tree nodes to array positions enables space-efficient tree storage and fast navigation. The overflow prevention strategy demonstrates defensive programming for numerical algorithms. This width calculation pattern appears in UI layout systems that render hierarchical data with proper spacing, in compiler parse tree visualization tools, and in network topology diagrams. The level-order traversal with position tracking is a common interview pattern that assesses your ability to augment standard algorithms with additional metadata, a skill crucial for adapting textbook solutions to real-world constraints.

## Constraints

- The number of nodes in the tree is in the range [1, 3000].
- -100 <= Node.val <= 100

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Position Indexing in Complete Binary Tree</summary>

The key insight is to assign a position index to each node as if the tree were complete (all levels fully filled). For a node at position `pos`:
- Left child is at position `2 * pos`
- Right child is at position `2 * pos + 1`

Using this indexing, the width at any level equals `rightmost_pos - leftmost_pos + 1`. You don't need to count nulls explicitly; the position arithmetic handles it automatically.

</details>

<details>
<summary>Hint 2: BFS with Position Tracking</summary>

Use level-order traversal (BFS) with a queue that stores (node, position) pairs:
```
queue = [(root, 0)]  # or position 1, doesn't matter
max_width = 0

for each level:
    level_size = len(queue)
    leftmost_pos = queue[0][1]  # First node's position
    rightmost_pos = queue[-1][1]  # Last node's position
    max_width = max(max_width, rightmost_pos - leftmost_pos + 1)

    for each node in level:
        if node.left: queue.append((node.left, pos * 2))
        if node.right: queue.append((node.right, pos * 2 + 1))
```

</details>

<details>
<summary>Hint 3: Handling Integer Overflow</summary>

For deep trees, position indices can grow exponentially (2^depth), potentially causing overflow. To prevent this, normalize positions at each level by subtracting the leftmost position:
```
normalized_pos = current_pos - leftmost_pos_of_level
```

This keeps numbers small while preserving relative distances. When adding children, use the normalized position for calculations.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| BFS with Positions | O(n) | O(w) | Visit each node once, queue holds max width w |
| DFS with Level Tracking | O(n) | O(h) | Track first position at each depth |
| Naive Position Tracking | O(n) | O(w) | May overflow for deep trees without normalization |

## Common Mistakes

**Mistake 1: Not Accounting for Null Positions**
```python
# WRONG: Counting only existing nodes at each level
def widthOfBinaryTree(root):
    if not root:
        return 0

    queue = [root]
    max_width = 0

    while queue:
        level_size = len(queue)
        max_width = max(max_width, level_size)  # Wrong: ignores nulls

        for _ in range(level_size):
            node = queue.pop(0)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)

    return max_width

# CORRECT: Use position indices to account for nulls
def widthOfBinaryTree(root):
    if not root:
        return 0

    queue = [(root, 0)]
    max_width = 0

    while queue:
        level_size = len(queue)
        _, left_pos = queue[0]
        _, right_pos = queue[-1]
        max_width = max(max_width, right_pos - left_pos + 1)

        for _ in range(level_size):
            node, pos = queue.pop(0)
            if node.left:
                queue.append((node.left, 2 * pos))
            if node.right:
                queue.append((node.right, 2 * pos + 1))

    return max_width
```

**Mistake 2: Integer Overflow from Large Positions**
```python
# WRONG: Not normalizing positions (causes overflow)
def widthOfBinaryTree(root):
    queue = [(root, 0)]
    max_width = 0

    while queue:
        level_size = len(queue)
        left_pos = queue[0][1]
        right_pos = queue[-1][1]
        max_width = max(max_width, right_pos - left_pos + 1)

        for _ in range(level_size):
            node, pos = queue.pop(0)
            # Position grows exponentially, may overflow
            if node.left:
                queue.append((node.left, 2 * pos))
            if node.right:
                queue.append((node.right, 2 * pos + 1))

# CORRECT: Normalize positions at each level
def widthOfBinaryTree(root):
    queue = [(root, 0)]
    max_width = 0

    while queue:
        level_size = len(queue)
        left_pos = queue[0][1]
        right_pos = queue[-1][1]
        max_width = max(max_width, right_pos - left_pos + 1)

        for _ in range(level_size):
            node, pos = queue.pop(0)
            # Normalize position relative to level start
            normalized = pos - left_pos
            if node.left:
                queue.append((node.left, 2 * normalized))
            if node.right:
                queue.append((node.right, 2 * normalized + 1))

    return max_width
```

**Mistake 3: Using Wrong Position Formula**
```python
# WRONG: 1-indexed position formulas when using 0-indexed
queue = [(root, 0)]  # 0-indexed
# ...
if node.left:
    queue.append((node.left, 2 * pos + 1))  # Wrong for 0-indexed
if node.right:
    queue.append((node.right, 2 * pos + 2))  # Wrong for 0-indexed

# CORRECT: Consistent indexing (0-indexed)
if node.left:
    queue.append((node.left, 2 * pos))      # Left: 2*pos
if node.right:
    queue.append((node.right, 2 * pos + 1))  # Right: 2*pos+1

# OR use 1-indexed consistently
queue = [(root, 1)]  # 1-indexed
if node.left:
    queue.append((node.left, 2 * pos))      # Left: 2*pos
if node.right:
    queue.append((node.right, 2 * pos + 1))  # Right: 2*pos+1
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Maximum Depth | Find maximum depth instead of width | Easy |
| Minimum Width | Find level with minimum width | Easy |
| Average Width | Calculate average width across all levels | Easy |
| Widest Level Number | Return the level number with maximum width | Easy |
| Compact Tree Width | Width counting only non-null nodes | Medium |

## Practice Checklist

- [ ] First attempt (30 min)
- [ ] Understand position indexing (2*pos, 2*pos+1)
- [ ] Implement BFS with position tracking
- [ ] Handle position normalization to avoid overflow
- [ ] Test edge cases: single node, skewed tree, complete tree
- [ ] Trace through Example 1: verify width at each level
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Attempt DFS solution with level tracking

**Strategy**: See [Tree Pattern](../strategies/data-structures/trees.md)
