---
id: M065
old_id: F156
slug: binary-tree-upside-down
title: Binary Tree Upside Down
difficulty: medium
category: medium
topics: ["tree", "recursion"]
patterns: ["tree-traversal", "tree-transformation"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E226", "M114", "M116"]
prerequisites: ["binary-tree", "recursion", "tree-traversal"]
strategy_ref: ../strategies/data-structures/trees.md
---
# Binary Tree Upside Down

## Problem

Given a binary tree where every node has at most one right child, and every right node is a leaf (has no children), flip the tree upside down and return the new root. The transformation follows a specific pattern: for each node, its left child becomes the new parent, the original parent becomes the right child of its former left child, and the original right sibling becomes the left child of its former left child sibling. This is a structural reorganization problem where the leftmost node in the original tree becomes the new root. For example, if you have a tree where node 1 has left child 2 and right child 3, and node 2 has left child 4 and right child 5, after flipping upside down, node 4 becomes the root with node 5 as its left child and node 2 as its right child, and node 2 has node 3 as its left child and node 1 as its right child. The constraint that right nodes are always leaves simplifies the transformation because you don't have to worry about recursively processing right subtrees. You can solve this recursively by processing from root to leftmost leaf, or iteratively by traversing down while tracking parent and sibling relationships, then rewiring connections on the way up.

## Why This Matters

This specific tree transformation appears in expression tree manipulation for compiler optimization, where you reorganize parse trees to different evaluation orders while preserving semantics. Document Object Model (DOM) manipulation in web frameworks requires restructuring HTML trees when converting between different layout modes or responsive designs. Computer graphics scene graphs use tree flipping when mirroring or rotating hierarchical object structures for symmetry operations. Genealogy software performs tree transformations when switching between ancestor views and descendant views, flipping the parent-child relationships. File system directory trees get restructured when moving folders or creating symlinks that reverse hierarchies. The general skill of tree rewiring with pointer manipulation is fundamental to implementing any tree rotation (like AVL or Red-Black tree balancing), tree serialization and deserialization, and converting between different tree representations (like converting a binary tree to a threaded tree or a forest).

## Examples

**Example 1:**
- Input: `root = []`
- Output: `[]`

**Example 2:**
- Input: `root = [1]`
- Output: `[1]`

## Constraints

- The number of nodes in the tree will be in the range [0, 10].
- 1 <= Node.val <= 10
- Every right node in the tree has a sibling (a left node that shares the same parent).
- Every right node in the tree has no children.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding the Transformation</summary>

Given a tree with structure: parent → left child, parent → right child, the upside-down version becomes: left child → parent (as right child), left child → original right sibling (as left child). The leftmost leaf becomes the new root.

**Visual example:**
```
Original:    1          Upside Down:    4
           /   \                       /  \
          2     3                     5    2
         / \                              / \
        4   5                            3   1
```

</details>

<details>
<summary>🎯 Hint 2: Recursive Pattern</summary>

The key insight is to process recursively from bottom-up:
1. Recurse to the leftmost node (new root)
2. On the way back up, rewire the connections
3. The parent becomes the right child of its former left child
4. The former right child becomes the left child of the former left child

Think about what each node needs to remember: its parent and its right sibling.

</details>

<details>
<summary>📝 Hint 3: Implementation Approaches</summary>

**Recursive approach:**
```
1. Base case: if no left child, this is new root
2. Recurse left to find new root
3. Rewire: left.left = right (sibling)
4. Rewire: left.right = root (parent)
5. Clear current node's children
6. Return new root
```

**Iterative approach:**
```
1. Use parent and parentRight pointers
2. Traverse to leftmost node
3. On the way down, track parent and parent's right
4. Build new tree bottom-up
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| **Recursive** | **O(n)** | **O(h)** | h = height for call stack |
| Iterative | O(n) | O(1) | Constant space, but more complex logic |

## Common Mistakes

### 1. Losing References Before Rewiring
```python
# WRONG: Overwrites children before saving references
def upsideDownBinaryTree(root):
    if not root or not root.left:
        return root

    newRoot = upsideDownBinaryTree(root.left)
    root.left.left = root.right  # OK
    root.left.right = root  # OK
    root.left = None  # Loses reference too early!
    root.right = None
    return newRoot
```

```python
# CORRECT: Process in right order
def upsideDownBinaryTree(root):
    if not root or not root.left:
        return root

    newRoot = upsideDownBinaryTree(root.left)
    root.left.right = root
    root.left.left = root.right
    root.left = None  # Safe to clear now
    root.right = None
    return newRoot
```

### 2. Not Handling Base Case Correctly
```python
# WRONG: Returns None for single node
def upsideDownBinaryTree(root):
    if not root.left:  # Crashes if root is None!
        return None
```

```python
# CORRECT: Handle both None and leaf node
def upsideDownBinaryTree(root):
    if not root or not root.left:
        return root
```

### 3. Incorrect Rewiring Order
```python
# WRONG: Rewiring order creates incorrect tree
def upsideDownBinaryTree(root):
    if not root or not root.left:
        return root

    newRoot = upsideDownBinaryTree(root.left)
    root.left.left = root  # Wrong! Should be root.right
    root.left.right = root.right  # Wrong! Should be root
    root.left = None
    root.right = None
    return newRoot
```

```python
# CORRECT: Left gets sibling, right gets parent
def upsideDownBinaryTree(root):
    if not root or not root.left:
        return root

    newRoot = upsideDownBinaryTree(root.left)
    root.left.right = root  # Parent becomes right
    root.left.left = root.right  # Sibling becomes left
    root.left = None
    root.right = None
    return newRoot
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Mirror tree | Swap all left/right children | Simple recursive swap at each node |
| Flatten to list | Convert to linked list | Similar recursion, different rewiring |
| Right-heavy tree | Right children instead of left | Mirror the transformation logic |
| Preserve original | Return new tree without modifying | Clone nodes during transformation |

## Practice Checklist

- [ ] Handles empty tree
- [ ] Handles single node
- [ ] Handles complete left-skewed tree
- [ ] Can draw the transformation on paper
- [ ] Can implement both recursive and iterative
- [ ] Can explain the rewiring step by step
- [ ] Can code solution in 15 min
- [ ] Can discuss time/space complexity

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Tree Pattern](../../strategies/data-structures/trees.md)
