---
id: M404
old_id: A250
slug: minimum-distance-between-bst-nodes
title: Minimum Distance Between BST Nodes
difficulty: medium
category: medium
topics: ["binary-search-tree", "binary-search"]
patterns: ["inorder-traversal"]
estimated_time_minutes: 30
strategy_ref: ../prerequisites/trees.md
---
# Minimum Distance Between BST Nodes

## Problem

Given the root of a Binary Search Tree (BST), find the minimum absolute difference between the values of any two distinct nodes in the tree.

A Binary Search Tree has a special property: for every node, all values in its left subtree are smaller than the node's value, and all values in its right subtree are larger. This ordering property is the key to solving this problem efficiently.

At first glance, you might think you need to compare every pair of nodes, which would require O(n²) comparisons for n nodes. However, the BST property gives us a much better approach. If you perform an in-order traversal (visit left subtree, then node, then right subtree), you visit nodes in sorted ascending order.

Here's the crucial insight: in a sorted sequence, the minimum difference must occur between consecutive elements. You don't need to compare elements that are far apart - if values are sorted, the closest pairs are always adjacent in that sorted order.

For example, in a BST with in-order traversal producing `[1, 3, 6, 10, 15]`, you only need to check `|3-1|=2`, `|6-3|=3`, `|10-6|=4`, and `|15-10|=5`. The minimum is 2.

Return the minimum absolute difference between any two node values.


**Diagram:**

```
Example 1:
      4
     / \
    2   6
   / \
  1   3

In-order traversal: [1, 2, 3, 4, 6]
Differences between consecutive values:
  |2-1| = 1  ← minimum
  |3-2| = 1  ← minimum
  |4-3| = 1  ← minimum
  |6-4| = 2

Minimum distance = 1

Example 2:
      1
     / \
    0   48
       / \
      12  49

In-order traversal: [0, 1, 12, 48, 49]
Differences between consecutive values:
  |1-0| = 1   ← minimum
  |12-1| = 11
  |48-12| = 36
  |49-48| = 1  ← minimum

Minimum distance = 1
```


## Why This Matters

This problem reinforces one of the most important properties of BSTs: in-order traversal produces sorted output. This property is fundamental to many BST algorithms, including validation, range queries, and finding kth elements.

The problem also teaches you to recognize when sorted order enables optimization. Many problems that seem to require comparing all pairs can be reduced to comparing consecutive elements once you establish an ordering.

In technical interviews, this problem tests whether you understand tree traversal patterns and can exploit structural properties rather than using brute force. It's a classic example of how data structure invariants lead to efficient algorithms.

## Constraints

- The number of nodes in the tree is in the range [2, 100].
- 0 <= Node.val <= 10⁵

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [Binary Search Tree Pattern](../prerequisites/trees.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
In a BST, an in-order traversal produces values in sorted order. The minimum difference must occur between two consecutive values in this sorted sequence. You don't need to compare all pairs - just adjacent values in the in-order traversal.
</details>

<details>
<summary>🎯 Main Approach</summary>
Perform an in-order traversal (left, root, right) while tracking the previous node's value. At each node, calculate the difference between current and previous values, updating the minimum. Initialize the minimum to infinity and the previous value to null or negative infinity. This finds the answer in a single tree traversal.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can do this iteratively using a stack to avoid recursion overhead, or use Morris traversal for O(1) space complexity. However, the recursive solution is cleaner and the O(h) stack space is usually acceptable. Early termination isn't possible since the minimum could be anywhere in the tree.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| In-order to Array | O(n) | O(n) | Store all values, then find min diff |
| Optimal In-order | O(n) | O(h) | Track previous value during traversal |
| Morris Traversal | O(n) | O(1) | Constant space but complex |

## Common Mistakes

1. **Comparing all pairs instead of consecutive values**
   ```python
   # Wrong: O(n²) comparison of all pairs
   def minDiffInBST(root):
       values = []
       def inorder(node):
           if not node: return
           inorder(node.left)
           values.append(node.val)
           inorder(node.right)
       inorder(root)
       min_diff = float('inf')
       for i in range(len(values)):
           for j in range(i+1, len(values)):
               min_diff = min(min_diff, values[j] - values[i])
       return min_diff

   # Correct: Compare only consecutive values
   def minDiffInBST(root):
       self.min_diff = float('inf')
       self.prev = None

       def inorder(node):
           if not node: return
           inorder(node.left)
           if self.prev is not None:
               self.min_diff = min(self.min_diff, node.val - self.prev)
           self.prev = node.val
           inorder(node.right)

       inorder(root)
       return self.min_diff
   ```

2. **Not handling first node correctly**
   ```python
   # Wrong: Comparing first node with uninitialized previous
   def minDiffInBST(root):
       self.min_diff = float('inf')
       self.prev = 0  # Wrong: assumes first value is always > 0

       def inorder(node):
           if not node: return
           inorder(node.left)
           self.min_diff = min(self.min_diff, node.val - self.prev)
           self.prev = node.val
           inorder(node.right)

   # Correct: Check if prev is None before comparing
   def minDiffInBST(root):
       self.min_diff = float('inf')
       self.prev = None

       def inorder(node):
           if not node: return
           inorder(node.left)
           if self.prev is not None:
               self.min_diff = min(self.min_diff, node.val - self.prev)
           self.prev = node.val
           inorder(node.right)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum absolute difference in sorted array | Easy | Same concept, simpler structure |
| Closest BST value | Easy | Find closest to a target value |
| Two sum in BST | Easy | Use in-order with two pointers |
| Kth smallest element in BST | Medium | In-order traversal with counting |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Binary Search Trees](../../prerequisites/trees.md)
