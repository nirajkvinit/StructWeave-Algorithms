---
id: M340
old_id: A167
slug: search-in-a-binary-search-tree
title: Search in a Binary Search Tree
difficulty: medium
category: medium
topics: ["binary-search-tree", "binary-search"]
patterns: ["inorder-traversal"]
estimated_time_minutes: 30
frequency: high
related_problems:
  - M341_insert_into_a_binary_search_tree.md
  - M203_validate_binary_search_tree.md
  - M166_kth_smallest_element_in_a_bst.md
prerequisites:
  - binary-search-trees
  - tree-traversal
  - recursion
strategy_ref: ../prerequisites/trees.md
---
# Search in a Binary Search Tree

## Problem

You're given the root of a binary search tree (BST) and a target value `val`. Your task is to find the node in the BST whose value equals `val` and return the entire subtree rooted at that node. If no such node exists, return `null`.

**What's a Binary Search Tree (BST)?** It's a binary tree where every node follows this property: all values in the left subtree are smaller than the node's value, and all values in the right subtree are larger. This ordering property makes searching very efficient.

For example, in a BST with root value 4:
- The left subtree contains values like 2, 1, 3 (all less than 4)
- The right subtree contains values like 7, 6, 8 (all greater than 4)

When you find the target node, return the node itself (which includes all its descendants). Don't just return the value - return the actual subtree structure. If you're searching for 2 in the tree and node 2 has children 1 and 3, return the entire subtree with 2 as root and 1, 3 as its children.

The BST property is your superpower here: at each node, you can eliminate half the tree from your search by comparing the target value with the current node's value.

**Diagram:**

Example 1: Search for value 2 in BST
```
Tree:              Result (subtree rooted at 2):
    4                     2
   / \                   / \
  2   7                 1   3
 / \
1   3

Searching for val=2 returns the subtree rooted at node 2.
```

Example 2: Search for value 5 (not found)
```
Tree:
    4
   / \
  2   7
 / \
1   3

Searching for val=5 returns null (value not in tree).
```


## Why This Matters

Binary search trees are fundamental to databases (B-trees and B+ trees), file systems, and in-memory indexes. Understanding BST search is prerequisite to learning about balanced trees (AVL, Red-Black), which power most production database implementations. The O(log n) search time (in balanced trees) versus O(n) in unsorted structures is the difference between instant response and timeouts in large-scale systems. This problem teaches you to exploit structural properties for efficiency - a principle that extends to skip lists, segment trees, and other hierarchical data structures.

## Constraints

- The number of nodes in the tree is in the range [1, 5000].
- 1 <= Node.val <= 10⁷
- root is a binary search tree.
- 1 <= val <= 10⁷

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Leverage BST Property</summary>

The BST property states: for any node, all values in its left subtree are smaller, and all values in its right subtree are larger.

This means you don't need to search the entire tree. At each node:
- If val < current_node.val, search left subtree only
- If val > current_node.val, search right subtree only
- If val == current_node.val, you've found it!

This eliminates half the tree at each step, achieving O(log n) time in balanced trees.
</details>

<details>
<summary>Hint 2: Recursive vs Iterative Approaches</summary>

**Recursive approach:**
```
searchBST(node, val):
    if node is null or node.val == val:
        return node
    if val < node.val:
        return searchBST(node.left, val)
    else:
        return searchBST(node.right, val)
```

**Iterative approach:**
```
current = root
while current is not null and current.val != val:
    current = current.left if val < current.val else current.right
return current
```

Both have the same time complexity, but iterative uses O(1) space vs O(h) for recursion.
</details>

<details>
<summary>Hint 3: Handle Edge Cases</summary>

Consider these scenarios:
- Empty tree (root is null): return null immediately
- Target is the root: return root
- Target doesn't exist: traversal reaches null, return null

The BST property guarantees there's only one path to check. You never need to backtrack or explore multiple branches.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Recursive Search | O(h) | O(h) | h = tree height; worst case O(n) for skewed tree |
| Iterative Search | O(h) | O(1) | Same time, better space; h = O(log n) for balanced |
| Inorder Traversal (not recommended) | O(n) | O(h) | Unnecessary; doesn't exploit BST property |

## Common Mistakes

### Mistake 1: Searching Both Subtrees
```python
# DON'T: Search both left and right subtrees
class Solution:
    def searchBST(self, root: TreeNode, val: int) -> TreeNode:
        if not root:
            return None
        if root.val == val:
            return root

        # Problem: searches both subtrees unnecessarily
        left_result = self.searchBST(root.left, val)
        if left_result:
            return left_result
        return self.searchBST(root.right, val)
# Problem: O(n) time, doesn't use BST property
```

**Why it's wrong:** This treats the BST like a regular binary tree, searching both children. It's O(n) time instead of O(log n).

**Fix:** Use BST property to choose only one subtree based on val comparison.

### Mistake 2: Not Returning the Entire Subtree
```python
# DON'T: Return just the value or modify the tree
class Solution:
    def searchBST(self, root: TreeNode, val: int) -> TreeNode:
        current = root
        while current:
            if current.val == val:
                return current.val  # Wrong: should return current (node)
            elif val < current.val:
                current = current.left
            else:
                current = current.right
        return None
# Problem: Returns integer instead of TreeNode
```

**Why it's wrong:** The problem asks for the subtree (TreeNode), not just the value. Returning `current.val` loses the subtree structure.

**Fix:** Return `current` (the TreeNode), not `current.val`.

### Mistake 3: Incorrect Null Handling in Recursion
```python
# DON'T: Forget base case or mishandle null
class Solution:
    def searchBST(self, root: TreeNode, val: int) -> TreeNode:
        # Missing: if not root: return None

        if root.val == val:
            return root
        elif val < root.val:
            return self.searchBST(root.left, val)
        else:
            return self.searchBST(root.right, val)
# Problem: Will crash with AttributeError when root is None
```

**Why it's wrong:** When recursion reaches a null node (value not found), accessing `root.val` throws an error.

**Fix:** Add base case: `if not root: return None` at the start.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Search Range | Find all nodes with values in range [low, high] | Medium |
| Closest Value | Find node with value closest to target | Easy |
| Delete Node | Remove a node while maintaining BST property | Medium |
| Two Sum in BST | Find two nodes that sum to target | Medium |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Implemented both recursive and iterative solutions
- [ ] Verified BST property is used (not searching both subtrees)
- [ ] Tested edge cases: empty tree, root match, not found
- [ ] Analyzed time/space complexity for both approaches
- [ ] **Day 1-3:** Revisit and implement without reference
- [ ] **Week 1:** Solve insert and delete node problems
- [ ] **Week 2:** Apply BST traversal to range search problems

**Strategy**: See [Binary Search Tree Pattern](../prerequisites/trees.md)
