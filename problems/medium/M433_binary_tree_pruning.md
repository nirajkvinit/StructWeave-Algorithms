---
id: M433
old_id: A281
slug: binary-tree-pruning
title: Binary Tree Pruning
difficulty: medium
category: medium
topics: ["tree"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/data-structures/trees.md
---
# Binary Tree Pruning

## Problem

Given the root of a binary tree where each node contains either 0 or 1, remove all subtrees that don't contain at least one node with value 1.

A subtree consists of a node and all its descendants. For example, if a node with value 0 has two children that are also 0, and those children have no further descendants, this entire subtree should be removed. However, if any node in a subtree contains a 1, the entire subtree must be preserved.

The challenge lies in determining which subtrees to remove. You cannot simply check a node in isolation because a node with value 0 might have a descendant with value 1 deeper in the tree, meaning it must be kept. This requires a bottom-up approach where you first process children before making decisions about their parent.

Think of it like pruning a real tree: you start at the leaves and work your way up toward the root, cutting branches only when you're certain they have no valuable fruit (nodes with value 1) anywhere along them. After pruning, you might end up with an entirely empty tree (return null), a smaller tree, or the original tree unchanged if every subtree contains at least one 1.


**Diagram:**

```
Example 1: Prune subtrees without 1s

Before:              After:
     1                  1
    / \                  \
   0   1                  1
  / \                      \
 0   0                      1

Left subtree (0 with children 0,0) removed - no 1s
```

```
Example 2: Prune subtrees without 1s

Before:              After:
     1                  1
    / \                / \
   0   1              0   1
  / \   \                  \
 0   0   1                  1

Left child's children (0,0) removed - no 1s
Left child (0) kept - it's part of path to root
```

```
Example 3: Entire tree removed

Before:              After:
     0                 null
    / \
   0   0

All nodes are 0, entire tree pruned
```


## Why This Matters

Tree pruning operations are fundamental in decision trees for machine learning, where you remove branches that don't contribute to classification accuracy. They also appear in game state trees (pruning losing paths), file system cleanup (removing empty directories), and XML/JSON data processing (removing null or empty nodes). This specific problem teaches post-order tree traversal, where you must process children before parents, a pattern crucial for many tree algorithms. It's also an excellent introduction to problems that require returning modified tree structures rather than just computing values from trees.

## Constraints

- The number of nodes in the tree is in the range [1, 200].
- Node.val is either 0 or 1.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use post-order traversal (process children before parent). A subtree should be pruned if it contains no 1s. A node contains a 1 if: (1) the node itself is 1, OR (2) its left subtree contains a 1, OR (3) its right subtree contains a 1.
</details>

<details>
<summary>🎯 Main Approach</summary>
Recursively prune left and right subtrees first. After processing children, check if the current node should be kept: keep it if its value is 1 OR if either child exists (wasn't pruned). Return the node if it should be kept, otherwise return None.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The recursive solution is already optimal at O(n) time and O(h) space for the call stack. You can write a helper function that returns whether a subtree contains any 1, making the logic clearer.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Post-order Recursion | O(n) | O(h) | h = tree height for call stack |
| Optimal | O(n) | O(h) | Visit each node once |

## Common Mistakes

1. **Using pre-order instead of post-order**
   ```python
   # Wrong: Checking node before processing children
   def prune(node):
       if not node:
           return None
       if node.val == 0:
           return None  # Premature pruning
       node.left = prune(node.left)
       node.right = prune(node.right)

   # Correct: Process children first, then decide
   def prune(node):
       if not node:
           return None
       node.left = prune(node.left)
       node.right = prune(node.right)
       if node.val == 0 and not node.left and not node.right:
           return None
       return node
   ```

2. **Not returning the modified tree**
   ```python
   # Wrong: Modifying in place without proper returns
   def prune(node):
       if node:
           prune(node.left)
           prune(node.right)

   # Correct: Return node or None to update parent references
   def prune(node):
       if not node:
           return None
       node.left = prune(node.left)
       node.right = prune(node.right)
       if node.val == 0 and not node.left and not node.right:
           return None
       return node
   ```

3. **Forgetting to check if children exist after pruning**
   ```python
   # Wrong: Only checking node value
   if node.val == 0:
       return None

   # Correct: Check both node value AND whether children remain
   if node.val == 0 and not node.left and not node.right:
       return None
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Delete Nodes and Return Forest | Medium | Multiple deletion points creating forest |
| Trim a Binary Search Tree | Medium | BST properties with value range |
| Delete Leaves With Given Value | Medium | Different pruning condition |
| Lowest Common Ancestor | Medium | Tree traversal with different goal |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

**Strategy**: See [Tree Pattern](../strategies/data-structures/trees.md)
