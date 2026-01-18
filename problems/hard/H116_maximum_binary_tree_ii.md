---
id: H116
old_id: A465
slug: maximum-binary-tree-ii
title: Maximum Binary Tree II
difficulty: hard
category: hard
topics: ["tree", "recursion"]
patterns: []
estimated_time_minutes: 45
strategy_ref: ../strategies/data-structures/trees.md
---
# Maximum Binary Tree II

## Problem

A **maximum tree** has the property that each node's value exceeds all values in its subtree.

You receive the `root` of a maximum binary tree and an integer `val`.

The tree was originally built from an array `a` using `root = Construct(a)` through this recursive `Construct(a)` algorithm:

	- When `a` is empty, return `null`.
	- Otherwise, identify the maximum element `a[i]` in `a` and create a `root` node with value `a[i]`.
	- Build the left child as `Construct([a[0], a[1], ..., a[i - 1]])`.
	- Build the right child as `Construct([a[i + 1], a[i + 2], ..., a[a.length - 1]])`.
	- Return `root`.

While you don't have access to the original array `a`, you know `root = Construct(a)`.

Now imagine array `b` is formed by appending `val` to the end of `a`. All values in `b` are unique.

Return the result of `Construct(b)`.


**Diagram:**

Example 1: Insert val=5 into tree from [4,1,3,2]
```
Original tree:          After inserting 5:
      4                      5
     / \                    /
    1   3         →        4
   /   /                  / \
  2   null               1   3
                        /
                       2

Original array: [4,1,3,2]
New array:      [4,1,3,2,5]
```

Example 2: Insert val=5 into tree from [5,2,4,1,3]
```
Original tree:          After inserting 5 (no change):
      5                      5
     / \                    / \
    2   4         →        2   4
   / \                    / \
  1   3                  1   3

Original array: [5,2,4,1,3]
New array:      [5,2,4,1,3,5] (but 5 is max, so structure unchanged)
```

Example 3: Insert val=5 into tree from [5,2,3,1]
```
Original tree:          After inserting 5:
      5                      5
     / \                    / \
    2   3         →        2   5
   /                      /   /
  1                      1   3
```


## Why This Matters

Tree problems develop recursive thinking and hierarchical data navigation. Mastering tree traversals unlocks graph algorithms.

## Constraints

- The number of nodes in the tree is in the range [1, 100].
- 1 <= Node.val <= 100
- All the values of the tree are **unique**.
- 1 <= val <= 100

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Since val is appended to the end of the array, it can only affect the right spine of the tree (the rightmost path from root to leaf). If val is larger than root, it becomes the new root with the old tree as its left child. Otherwise, recursively insert it into the right subtree.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use recursion to traverse the right spine: If val > current node's value, create a new node with val as root, make the current node its left child, and return the new root. Otherwise, recursively insert val into the right child. The key property: maximum tree construction means val can only be inserted along the right edge.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can solve this iteratively by traversing down the right spine until you find the insertion point. Keep track of the parent. This avoids recursion overhead while maintaining O(h) time complexity where h is the height of the tree.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Reconstruct from Array | O(n²) | O(n) | Reconstruct entire tree unnecessarily |
| Recursive Insertion | O(h) | O(h) | h = tree height; recursion stack |
| Iterative Insertion | O(h) | O(1) | Optimal; traverse right spine only |

## Common Mistakes

1. **Reconstructing the Entire Tree**
   ```python
   # Wrong: Unnecessary full reconstruction
   def insertIntoMaxTree(root, val):
       array = tree_to_array(root)  # O(n)
       array.append(val)
       return construct(array)  # O(n²)

   # Correct: Insert directly into tree structure
   def insertIntoMaxTree(root, val):
       if not root or val > root.val:
           new_root = TreeNode(val)
           new_root.left = root
           return new_root
       root.right = insertIntoMaxTree(root.right, val)
       return root
   ```

2. **Inserting in Wrong Subtree**
   ```python
   # Wrong: Trying to insert into left subtree
   if val < root.val:
       root.left = insertIntoMaxTree(root.left, val)

   # Correct: Only insert into right subtree (val is appended)
   if val < root.val:
       root.right = insertIntoMaxTree(root.right, val)
   ```

3. **Not Handling New Root Case**
   ```python
   # Wrong: Assuming val is never largest
   root.right = insertIntoMaxTree(root.right, val)
   return root

   # Correct: Check if val becomes new root
   if val > root.val:
       new_root = TreeNode(val)
       new_root.left = root
       return new_root
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Maximum Binary Tree I | Medium | Construct tree from scratch |
| Insert into BST | Medium | Different tree property (BST vs max tree) |
| Construct Tree from Traversals | Medium | Different construction constraints |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Tree Patterns](../../strategies/data-structures/trees.md)
