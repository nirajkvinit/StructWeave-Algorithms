---
id: M341
old_id: A168
slug: insert-into-a-binary-search-tree
title: Insert into a Binary Search Tree
difficulty: medium
category: medium
topics: ["tree", "binary-search-tree", "binary-search"]
patterns: ["inorder-traversal"]
estimated_time_minutes: 30
frequency: high
related_problems:
  - M340_search_in_a_binary_search_tree.md
  - M203_validate_binary_search_tree.md
  - M180_delete_node_in_a_bst.md
prerequisites:
  - binary-search-trees
  - tree-traversal
  - recursion
strategy_ref: ../strategies/data-structures/trees.md
---
# Insert into a Binary Search Tree

## Problem

Given the root of a binary search tree and an integer value to insert, your task is to add this value to the tree while preserving the binary search tree property: for every node, all values in its left subtree must be smaller, and all values in its right subtree must be larger.

A binary search tree is a hierarchical data structure where each node has at most two children. The BST property means you can efficiently locate where to insert the new value by comparing it with each node as you traverse. If the new value is smaller than the current node, go left; if larger, go right. Continue until you find an empty spot where the new node should be placed.

The value you're inserting is guaranteed to be unique and not already present in the tree. Multiple valid insertion positions may exist for the same value, and any correct BST structure is acceptable. For example, inserting 5 into a tree with nodes [4, 7] could result in either structure, as long as the BST property holds.


**Diagram:**

Example 1: Insert value 5 into BST
```
Original tree:              After inserting 5:
      4                           4
     / \                         / \
    2   7                       2   7
   / \                         / \   \
  1   3                       1   3   5

Value 5 is inserted as right child of node 7 (or could be left child).
```

Example 2: Insert value 25 into larger BST
```
Original tree:                     After inserting 25:
        40                                40
       /  \                              /  \
     20    60                          20    60
    / \    / \                        / \    / \
  10  30  50  70                    10  30  50  70
                                           /
                                         25

Value 25 is inserted as left child of node 30.
```


## Why This Matters

Binary search trees are fundamental to database indexing, file systems, and auto-complete systems where fast search and insertion are critical. Understanding BST insertion teaches you how databases maintain sorted indexes efficiently, enabling quick lookups even with millions of records. This problem also builds essential recursive thinking skills, as tree operations naturally break down into smaller subtree problems. The pattern you learn here extends to more advanced structures like AVL trees and red-black trees used in production systems like Java's TreeMap and C++'s std::map.

## Examples

**Example 1:**
- Input: `root = [40,20,60,10,30,50,70], val = 25`
- Output: `[40,20,60,10,30,50,70,null,null,25]`

**Example 2:**
- Input: `root = [4,2,7,1,3,null,null,null,null,null,null], val = 5`
- Output: `[4,2,7,1,3,5]`

## Constraints

- The number of nodes in the tree will be in the range [0, 10⁴].
- -10⁸ <= Node.val <= 10⁸
- All the values Node.val are **unique**.
- -10⁸ <= val <= 10⁸
- It's **guaranteed** that val does not exist in the original BST.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Find the Correct Leaf Position</summary>

The BST property dictates where to insert:
- Start at root, compare val with current node's value
- If val < node.val, go left; if val > node.val, go right
- When you reach a null position, insert the new node there

This ensures the BST property is maintained: left subtree < node < right subtree.

The new node will always be inserted as a leaf (or as the root if tree is empty).
</details>

<details>
<summary>Hint 2: Recursive Implementation</summary>

The recursive structure mirrors tree structure:

```
insertIntoBST(node, val):
    if node is null:
        return new TreeNode(val)  # Base case: found insertion point

    if val < node.val:
        node.left = insertIntoBST(node.left, val)
    else:
        node.right = insertIntoBST(node.right, val)

    return node  # Return current node (unchanged)
```

This elegantly handles both the insertion and the return path up the tree.
</details>

<details>
<summary>Hint 3: Iterative Alternative</summary>

For O(1) space, use iteration:

```
current = root
parent = None

# Find insertion position
while current is not null:
    parent = current
    current = current.left if val < current.val else current.right

# Create new node
new_node = TreeNode(val)

# Attach to parent
if parent is None:
    return new_node  # Empty tree
elif val < parent.val:
    parent.left = new_node
else:
    parent.right = new_node

return root
```

This avoids recursion stack overhead.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Recursive Insertion | O(h) | O(h) | h = tree height; worst case O(n) for skewed tree |
| Iterative Insertion | O(h) | O(1) | Same time, better space; h = O(log n) for balanced |
| Naive Rebuild | O(n) | O(n) | Convert to array, insert, rebuild (unnecessary) |

## Common Mistakes

### Mistake 1: Not Handling Empty Tree
```python
# DON'T: Assume root is not None
class Solution:
    def insertIntoBST(self, root: TreeNode, val: int) -> TreeNode:
        # Missing: if not root: return TreeNode(val)

        current = root
        while True:
            if val < current.val:
                if current.left is None:
                    current.left = TreeNode(val)
                    break
                current = current.left
            else:
                if current.right is None:
                    current.right = TreeNode(val)
                    break
                current = current.right
        return root
# Problem: Crashes when root is None (empty tree)
```

**Why it's wrong:** If the tree is empty (root is None), accessing `current.val` throws an AttributeError.

**Fix:** Handle empty tree: `if not root: return TreeNode(val)`.

### Mistake 2: Incorrect Recursive Return
```python
# DON'T: Forget to return the node or assign recursion result
class Solution:
    def insertIntoBST(self, root: TreeNode, val: int) -> TreeNode:
        if not root:
            return TreeNode(val)

        if val < root.val:
            # Problem: not assigning result back to root.left
            self.insertIntoBST(root.left, val)
        else:
            self.insertIntoBST(root.right, val)

        return root
# Problem: Recursion doesn't update tree structure
```

**Why it's wrong:** The recursive call creates the new node, but it's never linked to the tree because the result isn't assigned.

**Fix:** Assign the result: `root.left = self.insertIntoBST(root.left, val)`.

### Mistake 3: Breaking BST Property
```python
# DON'T: Insert at wrong position or use wrong comparison
class Solution:
    def insertIntoBST(self, root: TreeNode, val: int) -> TreeNode:
        if not root:
            return TreeNode(val)

        # Problem: using <= instead of <
        if val <= root.val:
            root.left = self.insertIntoBST(root.left, val)
        else:
            root.right = self.insertIntoBST(root.right, val)

        return root
# Problem: If val == root.val, goes left (but val is guaranteed unique)
# More critically: this could break if adapted to allow duplicates
```

**Why it's wrong:** Using <= can place equal values on the left, which may violate BST property conventions (though problem guarantees uniqueness).

**Fix:** Use strict comparison: `val < root.val` for left, `val > root.val` for right.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Delete Node in BST | Remove a node while maintaining BST property (3 cases) | Medium |
| Insert with Balance | Insert and rebalance tree (AVL/Red-Black tree) | Hard |
| Batch Insert | Insert multiple values efficiently | Medium |
| Insert with Parent Pointers | Maintain parent references during insertion | Medium |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Implemented both recursive and iterative solutions
- [ ] Verified BST property maintained after insertion
- [ ] Tested edge cases: empty tree, single node, inserting min/max values
- [ ] Analyzed time/space complexity for both approaches
- [ ] **Day 1-3:** Revisit and implement without reference
- [ ] **Week 1:** Solve delete node problem
- [ ] **Week 2:** Study self-balancing trees (AVL, Red-Black)

**Strategy**: See [Tree Pattern](../strategies/data-structures/trees.md)
