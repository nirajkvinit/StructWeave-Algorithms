---
id: M398
old_id: A243
slug: split-bst
title: Split BST
difficulty: medium
category: medium
topics: ["array", "binary-search-tree", "binary-search"]
patterns: ["inorder-traversal"]
estimated_time_minutes: 30
strategy_ref: ../prerequisites/trees.md
---
# Split BST

## Problem

Given the root of a binary search tree (BST) and a target value, partition the tree into two separate BSTs. One should contain all nodes with values less than or equal to the target, and the other should contain all nodes with values greater than the target. The target value might not exist in the original tree.

The critical constraint is preserving the BST property in both resulting trees while maintaining parent-child relationships from the original tree wherever possible. For example, if two nodes had a parent-child relationship in the original tree and both end up in the same result tree, they should keep that relationship rather than being reorganized.

Return an array with two elements: the root of the "less than or equal" tree and the root of the "greater than" tree. Either or both can be null if no nodes satisfy their respective conditions.

The key insight is that the BST property guides the recursion: when you visit a node, you immediately know which result tree it belongs to by comparing its value with the target. The challenge is properly reconnecting subtrees after recursive splits. For instance, if a node belongs to the left result but its right subtree might contain values that belong to the right result, you need to recursively split that right subtree and carefully reattach the pieces.

Think of this as recursively making binary decisions at each node while threading the tree back together in a way that preserves the BST ordering property.

## Why This Matters

This problem teaches advanced tree manipulation techniques essential for building database index structures and implementing range queries in balanced search trees. The recursive splitting pattern appears in operations like extracting a range of values from a tree-based data structure or partitioning datasets in distributed systems based on key ranges. The skill of preserving structural properties while restructuring trees is fundamental to implementing self-balancing tree rotations (like in AVL or Red-Black trees) and to understanding how B-trees split nodes during insertion. This problem also demonstrates the elegance of recursive tree algorithms where the solution to a large problem naturally decomposes into combining solutions to smaller subproblems. It's a favorite interview question because it tests your understanding of BST properties, recursion, and pointer manipulation simultaneously.

## Examples

**Example 1:**
- Input: `root = [1], target = 1`
- Output: `[[1],[]]`

## Constraints

- The number of nodes in the tree is in the range [1, 50].
- 0 <= Node.val, target <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [Array Pattern](../prerequisites/trees.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The BST property means that for any node, all values in the left subtree are smaller and all values in the right subtree are larger. When splitting at a target, you can recursively decide whether each node belongs in the "less than or equal" tree or the "greater than" tree based on its value.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use recursion to traverse the BST. At each node, compare its value with the target. If the node's value is less than or equal to the target, it belongs in the left result tree, and you need to recursively split its right subtree. If the node's value is greater than the target, it belongs in the right result tree, and you need to recursively split its left subtree. The key is properly reconnecting the split subtrees to maintain the BST property.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The recursive solution is already optimal with O(n) time complexity since you visit each node at most once. The critical part is handling edge cases like when the target doesn't exist in the tree, or when splitting results in empty subtrees. Make sure to properly handle null nodes and reconnect the subtree roots correctly.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursive Split | O(n) | O(h) | Where h is tree height; space used by recursion stack |
| Optimal | O(n) | O(h) | Visit each node once; cannot do better than O(n) |

## Common Mistakes

1. **Not preserving BST property after split**
   ```python
   # Wrong: Simply assigning nodes without considering BST property
   def splitBST(root, target):
       if not root:
           return [None, None]
       left_tree = TreeNode(root.val) if root.val <= target else None
       right_tree = TreeNode(root.val) if root.val > target else None
       # Missing: Need to handle subtrees recursively

   # Correct: Recursively split and reconnect subtrees
   def splitBST(root, target):
       if not root:
           return [None, None]
       if root.val <= target:
           split = splitBST(root.right, target)
           root.right = split[0]  # Reconnect smaller part
           return [root, split[1]]
       else:
           split = splitBST(root.left, target)
           root.left = split[1]  # Reconnect larger part
           return [split[0], root]
   ```

2. **Forgetting to handle edge cases**
   ```python
   # Wrong: Not checking for null root
   def splitBST(root, target):
       if root.val <= target:  # Crashes if root is None
           # ...

   # Correct: Always check null first
   def splitBST(root, target):
       if not root:
           return [None, None]
       # Now safe to access root.val
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Split BST with K partitions | Hard | Split into multiple ranges instead of just two |
| Merge two BSTs | Medium | Reverse operation - combine two BSTs into one |
| Split array into BST partitions | Medium | Apply same concept to sorted array |
| Trim BST to range [L, R] | Medium | Keep only nodes within a range, similar splitting logic |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Binary Search Trees](../../prerequisites/trees.md)
