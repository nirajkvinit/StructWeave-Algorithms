---
id: M253
old_id: A042
slug: boundary-of-binary-tree
title: Boundary of Binary Tree
difficulty: medium
category: medium
topics: ["tree", "depth-first-search"]
patterns: ["tree-traversal", "dfs"]
estimated_time_minutes: 30
frequency: medium
related_problems:
  - M102_binary_tree_level_order_traversal.md
  - M199_binary_tree_right_side_view.md
  - E543_diameter_of_binary_tree.md
prerequisites:
  - tree traversal (preorder, inorder, postorder)
  - DFS recursion
  - identifying leaf nodes
strategy_ref: ../strategies/data-structures/trees.md
---
# Boundary of Binary Tree

## Problem

Find the boundary traversal of a binary tree, which traces the outline of the tree as if you were walking around its perimeter. The boundary consists of three distinct parts collected in a specific order: the left boundary (excluding leaf nodes), all leaf nodes from left to right, and the right boundary in reverse order (also excluding leaf nodes). The root node always comes first.

The left boundary is defined as the path from the root going left whenever possible, or right if there's no left child. Continue this path until you reach a leaf node, which gets excluded from the left boundary. Similarly, the right boundary follows the rightmost path, but you'll reverse it when adding to the final result. Crucially, a node is only a leaf if it has no children at all.

For example, in a tree where the root has value 1 with left child 2 and right child 3, where 2 has children 4 and 5, and 3 has only right child 6, the boundary would be: [1] (root), [2] (left boundary), [4,7,8,9,10] (all leaves left to right), [6,3] (right boundary reversed). The right boundary goes 3 to 6, but we reverse it to 6 then 3.

The trick is managing three separate traversals without double-counting nodes. The root appears exactly once at the start. Leaf nodes only appear in the leaves section, never in the boundary sections. Non-leaf nodes on the boundaries appear exactly once in their respective boundary section.

Watch out for edge cases: a tree with only the root node should return just that root. If the tree is entirely left-leaning with no right subtree, you'll have no right boundary. The definition of what counts as the "left boundary" versus a "leaf" requires careful handling.

## Why This Matters

This problem teaches you to decompose complex tree traversals into simpler parts, a technique that appears in compiler design (parsing syntax trees), graphics rendering (scene graphs), and file system navigation. The boundary traversal pattern is also used in computational geometry for tracing polygon perimeters. Mastering this problem builds your ability to coordinate multiple DFS passes and handle edge cases in tree problems, skills that transfer to more advanced graph algorithms. It's frequently asked in interviews because it tests your ability to break down a complex requirement into manageable pieces.

## Constraints

- The number of nodes in the tree is in the range [1, 10⁴].
- -1000 <= Node.val <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Break Into Three Separate Traversals</summary>

The boundary traversal is a combination of three distinct parts:

1. **Left boundary**: Traverse down the left edge (prioritizing left child, then right child), excluding leaves
2. **Leaves**: Perform any traversal (preorder, inorder, postorder) and collect only leaf nodes
3. **Right boundary**: Traverse down the right edge (prioritizing right child, then left child), excluding leaves, then reverse

Combine these three results with the root at the beginning.
</details>

<details>
<summary>Hint 2: Identify Leaf Nodes Correctly</summary>

A leaf node is one with no left and no right children:
```python
def isLeaf(node):
    return node and not node.left and not node.right
```

Important considerations:
- The root is never considered a leaf (even if it has no children)
- When traversing boundaries, skip leaf nodes
- When collecting leaves, use DFS to find all leaf nodes left-to-right
</details>

<details>
<summary>Hint 3: Handle Edge Cases Carefully</summary>

Special cases to consider:
1. **Single node tree**: Return [root.val]
2. **Only left subtree exists**: No right boundary
3. **Only right subtree exists**: No left boundary
4. **Node is both on boundary and a leaf**: Include only in leaves section

Structure your solution to handle these cases elegantly:
```python
result = [root.val]
if root.left or root.right:  # Root is not a leaf
    result += getLeftBoundary(root.left)
    result += getLeaves(root)
    result += getReversedRightBoundary(root.right)
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Three Separate DFS | O(n) | O(h) | Visit each node once; h is tree height (recursion stack) |
| Single DFS with Flags | O(n) | O(h) | More complex but single traversal |
| Iterative with Stack | O(n) | O(h) | Avoids recursion overhead |

## Common Mistakes

### Mistake 1: Including Leaf Nodes in Boundary Edges
```python
# Wrong: Includes leaf nodes in left/right boundaries
def getLeftBoundary(node):
    result = []
    while node:
        result.append(node.val)  # Adds even if it's a leaf!
        node = node.left if node.left else node.right
    return result

# Correct: Exclude leaf nodes from boundaries
def getLeftBoundary(node):
    result = []
    while node:
        if not isLeaf(node):  # Only add non-leaf nodes
            result.append(node.val)
        node = node.left if node.left else node.right
    return result

def isLeaf(node):
    return node and not node.left and not node.right
```

### Mistake 2: Incorrect Leaf Collection Order
```python
# Wrong: Collects leaves in arbitrary order
def getLeaves(root):
    if not root:
        return []
    if isLeaf(root):
        return [root.val]
    # Wrong: right before left gives incorrect order
    return getLeaves(root.right) + getLeaves(root.left)

# Correct: Left-to-right DFS for leaves
def getLeaves(root):
    if not root:
        return []
    if isLeaf(root):
        return [root.val]
    # Left subtree leaves before right subtree leaves
    return getLeaves(root.left) + getLeaves(root.right)
```

### Mistake 3: Not Reversing Right Boundary
```python
# Wrong: Right boundary in top-down order
def boundaryOfBinaryTree(root):
    if not root:
        return []
    result = [root.val]
    result += getLeftBoundary(root.left)
    result += getLeaves(root)
    result += getRightBoundary(root.right)  # Should be reversed!
    return result

# Correct: Reverse right boundary (bottom-up)
def boundaryOfBinaryTree(root):
    if not root:
        return []

    result = [root.val]
    if root.left or root.right:  # Root is not a leaf
        result += getLeftBoundary(root.left)
        result += getLeaves(root)
        result += getRightBoundary(root.right)[::-1]  # Reverse!

    return result
```

## Variations

| Variation | Difference | Complexity Impact |
|-----------|------------|-------------------|
| Include Root as Leaf | If root has no children, include it | Simpler base case handling |
| Clockwise from Root | Start right boundary, go to leaves, then left boundary | Reverse the order of operations |
| Exclude Leaves | Only boundaries without leaves | Skip leaf collection step |
| N-ary Tree Boundary | Tree with arbitrary number of children | Define leftmost/rightmost paths |

## Practice Checklist

Track your progress with spaced repetition:

- [ ] First attempt (understand three-part decomposition)
- [ ] Implement left boundary traversal
- [ ] Implement leaf collection (left to right)
- [ ] Implement right boundary traversal with reversal
- [ ] Handle edge cases (single node, only left/right subtree)
- [ ] After 1 day: Solve without hints
- [ ] After 1 week: Solve in under 25 minutes
- [ ] Before interview: Explain why we exclude leaves from boundaries

**Strategy**: See [Tree Pattern](../strategies/data-structures/trees.md)
