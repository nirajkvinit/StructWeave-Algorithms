---
id: M321
old_id: A136
slug: trim-a-binary-search-tree
title: Trim a Binary Search Tree
difficulty: medium
category: medium
topics: ["binary-search-tree", "binary-search"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["E108", "M098", "M109"]
prerequisites: ["binary-search-tree", "recursion", "tree-traversal"]
strategy_ref: ../strategies/data-structures/trees.md
---
# Trim a Binary Search Tree

## Problem

Given a binary search tree and two boundary values `low` and `high`, your task is to trim the tree so that only nodes with values in the range `[low, high]` remain. Think of this as pruning away branches that fall outside your target range while preserving the essential BST property: for every node, all values in its left subtree are smaller, and all values in its right subtree are larger.

The challenge lies in maintaining proper tree structure after removal. When you remove a node, you can't just delete it and leave a gap. Instead, you need to reconnect the tree by promoting valid descendants. For example, if a node with value 2 is too small (below `low`), its right subtree might contain valid nodes that should take its place in the final tree.

Here's a concrete example: Given the tree `[3,0,4,null,2,null,null,1]` and range `[1,3]`, node 0 is too small and node 4 is too large. After trimming, you're left with nodes 3, 2, and 1. Node 2 (which was originally 0's right child) becomes the left child of 3, preserving the BST structure.

The trimming process respects the BST invariant, meaning you can leverage the ordering property to make intelligent decisions. If a node's value is below `low`, you know its entire left subtree is also too small and can be discarded immediately. Similarly, if a node's value exceeds `high`, its entire right subtree can be pruned. This makes the problem elegant when solved recursively.

Note that the root of the final tree may differ from the original root. If the original root falls outside the range, a descendant node becomes the new root. The problem guarantees exactly one correct answer exists for any valid input.

## Why This Matters

Binary search trees appear throughout software systems: database indexes, file systems, autocomplete features, and range query engines all rely on BST-like structures. The ability to efficiently filter or prune tree data while maintaining structural properties is a fundamental skill.

This problem builds your understanding of recursive tree manipulation and teaches you to leverage structural invariants for optimization. The BST property allows you to prune entire subtrees without examining every node, turning a potentially expensive operation into an efficient one. This pattern of using data structure properties to skip work appears in many advanced algorithms.

Beyond the technical skills, this problem develops your ability to think about pointer manipulation and tree restructuring, skills that transfer to working with any hierarchical data structure, from DOM trees in web development to organization charts in business software.

## Constraints

- The number of nodes in the tree is in the range [1, 10⁴].
- 0 <= Node.val <= 10⁴
- The value of each node in the tree is **unique**.
- root is guaranteed to be a valid binary search tree.
- 0 <= low <= high <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Leverage BST Properties</summary>

The BST property gives you powerful pruning information:
- If `node.val < low`, the entire left subtree is also too small (can be discarded)
- If `node.val > high`, the entire right subtree is also too large (can be discarded)
- If `low <= node.val <= high`, the node stays, but you still need to recursively trim both subtrees

This suggests a recursive approach where each call returns the new root of the trimmed subtree.

</details>

<details>
<summary>Hint 2: Handle Three Cases Recursively</summary>

For each node, determine which case applies:

1. **Node too small** (`node.val < low`): Discard node and left subtree, return trimmed right subtree
2. **Node too large** (`node.val > high`): Discard node and right subtree, return trimmed left subtree
3. **Node in range**: Keep node, recursively trim both subtrees and attach results

```python
def trimBST(root, low, high):
    if not root:
        return None

    if root.val < low:
        return trimBST(root.right, low, high)
    if root.val > high:
        return trimBST(root.left, low, high)

    # Current node is in range
    root.left = trimBST(root.left, low, high)
    root.right = trimBST(root.right, low, high)
    return root
```

</details>

<details>
<summary>Hint 3: Consider Iterative Approach</summary>

While recursion is elegant, you can also solve iteratively:

1. First, find a valid root (within range)
2. Then trim the left subtree: remove nodes < low
3. Finally trim the right subtree: remove nodes > high

The iterative approach requires more careful pointer management but uses O(1) space (excluding recursion stack).

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Recursive DFS | O(n) | O(h) | h = tree height; recursion stack |
| Iterative with Queue | O(n) | O(n) | Queue can hold all nodes in worst case |
| Iterative In-place | O(n) | O(1) | No extra space; careful pointer updates |

## Common Mistakes

**Mistake 1: Not Returning Trimmed Subtrees**
```python
# Wrong: Not using return value of recursive calls
def trimBST(root, low, high):
    if not root:
        return None
    if root.val < low:
        trimBST(root.right, low, high)  # Missing return!
    # ...

# Correct: Return the trimmed subtree
def trimBST(root, low, high):
    if not root:
        return None
    if root.val < low:
        return trimBST(root.right, low, high)
```

**Mistake 2: Forgetting to Update Child Pointers**
```python
# Wrong: Not reconnecting trimmed children
def trimBST(root, low, high):
    if not root:
        return None
    if low <= root.val <= high:
        trimBST(root.left, low, high)   # Not updating root.left!
        trimBST(root.right, low, high)  # Not updating root.right!
        return root

# Correct: Update pointers with trimmed results
root.left = trimBST(root.left, low, high)
root.right = trimBST(root.right, low, high)
```

**Mistake 3: Attempting to Trim In-Order**
```python
# Wrong: In-order traversal modifies structure incorrectly
def trimBST(root, low, high):
    if not root:
        return None
    trimBST(root.left, low, high)
    if root.val < low or root.val > high:
        # How do you remove this node now?
        pass
    trimBST(root.right, low, high)

# Correct: Post-order ensures children trimmed first
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Delete nodes not in range (return count) | Easy | Count instead of rebuilding |
| Trim and collect removed values | Medium | Track deleted nodes |
| Trim with inclusive/exclusive bounds | Medium | Adjust boundary conditions |
| Trim to maximize subtree sum | Hard | Dynamic programming component |
| Trim k levels from bottom | Medium | Different trimming criteria |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Analyzed time/space complexity
- [ ] Solved without hints
- [ ] Tested edge cases (root trimmed, all nodes trimmed, no nodes trimmed)
- [ ] Reviewed alternative approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 1 week
- [ ] Could explain solution to others

**Strategy**: See [Binary Search Tree Pattern](../strategies/data-structures/trees.md)
