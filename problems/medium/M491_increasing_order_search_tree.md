---
id: M491
old_id: A364
slug: increasing-order-search-tree
title: Increasing Order Search Tree
difficulty: medium
category: medium
topics: ["binary-search-tree", "binary-search"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
strategy_ref: ../prerequisites/trees.md
---
# Increasing Order Search Tree

## Problem

You're given a binary search tree, and your task is to transform it into a special structure: a right-skewed tree that forms a straight chain. Imagine straightening out your tree so that it looks like a linked list, where every node points only to the right, with no left children at all.

Here's the key requirement: the values must appear in ascending order as you traverse down the right side of the tree. The smallest value should be at the root, and each right child should have the next larger value, all the way to the largest value at the bottom.

Think of it like taking a sorted list `[1, 2, 3, 4, 5, 6, 7, 8, 9]` and building a tree where the root is 1, its right child is 2, that node's right child is 3, and so on. All left pointers should be null.


**Diagram:**

Example 1: Transform BST to right-skewed tree

```
Original BST:              Increasing Order Tree:
      5                           1
     / \                           \
    3   6                           2
   / \   \                           \
  2   4   8                           3
 /       / \                           \
1       7   9                           4
                                         \
                                          5
                                           \
                                            6
                                             \
                                              7
                                               \
                                                8
                                                 \
                                                  9

In-order traversal: 1, 2, 3, 4, 5, 6, 7, 8, 9
```

Example 2: Simpler BST

```
Original BST:              Increasing Order Tree:
    5                             1
   / \                             \
  1   7                             5
                                     \
                                      7

In-order traversal: 1, 5, 7
```


## Why This Matters

Database indexing systems often need to convert between different tree structures for optimal query performance. When you run a range query like "find all users with IDs between 1000 and 5000," the database might need to flatten its B-tree index into a sequential structure for efficient scanning. This transformation is also crucial in memory-constrained environments where you need to serialize a complex tree structure into a simple linked format for storage or transmission.

In compiler design, abstract syntax trees (ASTs) are sometimes "linearized" into a sequential representation for easier code generation. Understanding how to reshape trees while preserving their logical ordering is a fundamental skill for systems programming, data serialization, and tree-based data structure manipulation.

## Constraints

- The number of nodes in the given tree will be in the range [1, 100].
- 0 <= Node.val <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [Binary Search Tree Pattern](../prerequisites/trees.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
In-order traversal of a BST visits nodes in ascending order. You need to convert this traversal sequence into a right-skewed tree where each node's left child is null and right child points to the next node in the sequence.
</details>

<details>
<summary>🎯 Main Approach</summary>
Perform in-order traversal (left, node, right) while building the new tree. Keep track of the current tail of the right-skewed tree. For each visited node, set its left to null, attach it as the right child of the current tail, and update the tail. Use a dummy node to simplify edge cases with the first node.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can solve this in-place by modifying the tree during traversal without creating new nodes. Alternatively, if you want to preserve the original tree, collect nodes in a list first, then rebuild. The in-place solution uses O(1) extra space (excluding recursion stack).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Collect then rebuild | O(n) | O(n) | Store all nodes in list first |
| Optimal (In-place) | O(n) | O(h) | h = tree height for recursion stack |

Where n = number of nodes, h = tree height (O(log n) balanced, O(n) worst case)

## Common Mistakes

1. **Creating new nodes instead of reusing existing ones**
   ```python
   # Wrong: Creating unnecessary new nodes
   def increasingBST(root):
       nodes = []
       inorder(root, nodes)
       new_root = TreeNode(nodes[0])
       # Creating new nodes wastes memory

   # Correct: Reuse existing nodes
   def increasingBST(root):
       dummy = TreeNode(0)
       self.current = dummy
       inorder(root)
       return dummy.right
   ```

2. **Forgetting to set left child to None**
   ```python
   # Wrong: Left pointers remain intact
   def inorder(node):
       if not node:
           return
       inorder(node.left)
       self.current.right = node  # But node.left still points somewhere!

   # Correct: Clear left pointer
   def inorder(node):
       if not node:
           return
       inorder(node.left)
       node.left = None  # Important!
       self.current.right = node
       self.current = node
       inorder(node.right)
   ```

3. **Incorrect traversal order**
   ```python
   # Wrong: Pre-order or post-order won't give sorted sequence
   def traverse(node):
       visit(node)  # Pre-order
       traverse(node.left)
       traverse(node.right)

   # Correct: In-order traversal for BST
   def inorder(node):
       if not node:
           return
       inorder(node.left)   # Visit left first
       visit(node)          # Then current
       inorder(node.right)  # Then right
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Flatten Binary Tree to Linked List | Medium | Pre-order traversal instead of in-order |
| Serialize and Deserialize BST | Medium | Convert to/from string representation |
| Convert Sorted List to BST | Medium | Reverse problem - build balanced BST |
| Balance a BST | Medium | Collect nodes then rebuild balanced tree |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Binary Search Tree Patterns](../../prerequisites/trees.md)
