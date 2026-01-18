---
id: M285
old_id: A089
slug: merge-two-binary-trees
title: Merge Two Binary Trees
difficulty: medium
category: medium
topics: ["tree", "depth-first-search", "recursion"]
patterns: ["tree-traversal", "simultaneous-recursion"]
estimated_time_minutes: 30
strategy_ref: ../strategies/data-structures/trees.md
frequency: medium
related_problems:
  - id: E100
    name: Merge Sorted Array
    difficulty: easy
  - id: M021
    name: Merge Two Sorted Lists
    difficulty: medium
  - id: M150
    name: Add Two Numbers II
    difficulty: medium
prerequisites:
  - concept: Binary tree structure
    level: basic
  - concept: Recursion
    level: basic
  - concept: Tree traversal
    level: basic
---
# Merge Two Binary Trees

## Problem

Imagine overlaying two binary trees on top of each other, like two transparent sheets with tree structures drawn on them. Where both trees have a node at the same position, you merge them by adding their values. Where only one tree has a node, that node appears in the result. Your task is to construct this merged binary tree.

More precisely, given two binary trees with roots `root1` and `root2`, create a new tree where:
- If both `root1` and `root2` have a node at position (i, j), the merged tree has a node at (i, j) with value = `root1.val + root2.val`
- If only `root1` has a node at position (i, j), use that node's value
- If only `root2` has a node at position (i, j), use that node's value
- If neither tree has a node at a position, the merged tree doesn't either

Think of it as a simultaneous traversal of both trees. At each step, you compare corresponding positions (left child of node A in tree 1 corresponds to left child of node A in tree 2). The elegant aspect is that this can be solved recursively: the merged tree's left subtree is the merge of both input trees' left subtrees, and similarly for the right subtree.

**Diagram:**

```
Tree 1:           Tree 2:          Merged Tree:
    1                 2                  3
   / \               / \                / \
  3   2             1   3              4   5
 /                   \   \            / \   \
5                     4   7          5   4   7

Explanation:
- Overlapping nodes: 1+2=3 (root), 3+1=4 (left child of root)
- Non-overlapping from tree1: 2 (right child of root), 5 (left-left child)
- Non-overlapping from tree2: 3 (right child of root), 4 (left-right child), 7 (right-right child)
```

## Why This Matters

Tree merging operations appear in version control systems (merging file directory structures), database index merging, and combining decision trees in machine learning ensembles. This problem reinforces the principle of simultaneous recursion - processing two recursive structures in parallel, a technique that extends to merging sorted lists, comparing directory structures, and synchronizing hierarchical data. The pattern of "process current nodes, then recurse on children" is fundamental to all tree algorithms. Understanding how to handle cases where one tree is exhausted before the other prepares you for advanced problems like building balanced trees from multiple sources or reconciling conflicting hierarchical data.

## Examples

**Example 1:**
- Input: `root1 = [1], root2 = [1,2]`
- Output: `[2,2]`

## Constraints

- The number of nodes in both trees is in the range [0, 2000].
- -10⁴ <= Node.val <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding the Merge Rules</summary>

Three cases exist for each position in the merged tree:

1. **Both nodes exist**: Create new node with `val = node1.val + node2.val`
2. **Only node1 exists**: Use node1 (or create copy)
3. **Only node2 exists**: Use node2 (or create copy)

```python
# Merge logic for a single node
if node1 and node2:
    merged_val = node1.val + node2.val
elif node1:
    merged_val = node1.val
else:  # node2 only
    merged_val = node2.val
```

**Key Insight**: Process both trees simultaneously in parallel, recursing on left and right children.
</details>

<details>
<summary>Hint 2: Recursive Approach</summary>

Apply merge recursively to entire tree:

```python
def mergeTrees(root1, root2):
    # Base cases
    if not root1:
        return root2
    if not root2:
        return root1

    # Both nodes exist - merge them
    merged = TreeNode(root1.val + root2.val)

    # Recursively merge left and right subtrees
    merged.left = mergeTrees(root1.left, root2.left)
    merged.right = mergeTrees(root1.right, root2.right)

    return merged
```

**Why this works**:
- Base cases handle when one tree is exhausted
- Recursive calls ensure entire tree structure is merged
- New tree is built bottom-up
</details>

<details>
<summary>Hint 3: Iterative Approach with Stack</summary>

Alternative iterative solution using stack for simultaneous traversal:

```python
def mergeTrees(root1, root2):
    if not root1:
        return root2
    if not root2:
        return root1

    # Use stack for parallel traversal
    stack = [(root1, root2)]

    while stack:
        node1, node2 = stack.pop()

        # Merge current nodes
        node1.val += node2.val

        # Process left children
        if not node1.left:
            node1.left = node2.left
        elif node2.left:
            stack.append((node1.left, node2.left))

        # Process right children
        if not node1.right:
            node1.right = node2.right
        elif node2.right:
            stack.append((node1.right, node2.right))

    return root1
```

**Note**: This modifies root1 in-place instead of creating new tree.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Recursive (New Tree) | O(min(n, m)) | O(min(n, m)) | n, m = sizes of trees, recursion depth |
| Recursive (In-place) | O(min(n, m)) | O(min(n, m)) | Modifies tree1 |
| Iterative with Stack | O(min(n, m)) | O(min(n, m)) | Stack space for traversal |

**Detailed Analysis:**
- **Time**: O(min(n, m)) - Visit nodes present in both trees
  - If one tree is smaller, we only process its nodes
- **Space**: O(min(h1, h2)) for recursion stack where h is tree height
  - Best case (balanced): O(log n)
  - Worst case (skewed): O(n)
- **Key Insight**: We only need to merge where both trees have nodes

## Common Mistakes

### Mistake 1: Not handling null nodes correctly
```python
# Wrong: NullPointerException when accessing null node
merged = TreeNode(root1.val + root2.val)

# Correct: Check for null first
if not root1:
    return root2
if not root2:
    return root1
merged = TreeNode(root1.val + root2.val)
```

### Mistake 2: Forgetting to return the merged tree
```python
# Wrong: Not returning result
def mergeTrees(root1, root2):
    if root1 and root2:
        root1.val += root2.val
        mergeTrees(root1.left, root2.left)
        mergeTrees(root1.right, root2.right)

# Correct: Return merged result
def mergeTrees(root1, root2):
    if not root1:
        return root2
    if not root2:
        return root1
    merged = TreeNode(root1.val + root2.val)
    merged.left = mergeTrees(root1.left, root2.left)
    merged.right = mergeTrees(root1.right, root2.right)
    return merged
```

### Mistake 3: Creating unnecessary deep copies
```python
# Wrong: Deep copying when node exists in only one tree
if not root1:
    return deep_copy(root2)  # Unnecessary

# Correct: Return existing subtree directly
if not root1:
    return root2
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Merge K Binary Trees | Merge multiple binary trees simultaneously | Hard |
| Merge with Different Operations | Use max, min, or product instead of sum | Easy |
| Merge N-ary Trees | Extend to trees with arbitrary children | Medium |
| Symmetric Tree Merge | Merge tree with its mirror | Medium |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] **Initial Attempt** - Solve independently (30 min limit)
- [ ] **Solution Study** - If stuck, study one approach deeply
- [ ] **Implementation** - Code solution from scratch without reference
- [ ] **Optimization** - Achieve O(min(n,m)) time and space
- [ ] **Edge Cases** - Test: both null, one null, identical trees, no overlap
- [ ] **Variations** - Solve at least 2 related problems
- [ ] **Spaced Repetition** - Re-solve after: 1 day, 1 week, 1 month

**Mastery Goal**: Solve in < 15 minutes with clean recursive solution.

**Strategy**: See [Tree Pattern](../strategies/data-structures/trees.md)
