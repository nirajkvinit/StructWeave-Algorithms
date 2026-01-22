---
id: M522
old_id: A405
slug: range-sum-of-bst
title: Range Sum of BST
difficulty: medium
category: medium
topics: ["binary-search-tree", "binary-search"]
patterns: ["inorder-traversal"]
estimated_time_minutes: 30
strategy_ref: ../prerequisites/trees.md
---
# Range Sum of BST

## Problem

You're given the root node of a binary search tree (BST) and two boundary values: `low` and `high`. Your task is to find the sum of all node values that fall within the inclusive range `[low, high]`.

Think of this like filtering financial transactions: imagine each node represents a transaction amount, and you need to calculate the total of all transactions between a minimum and maximum threshold. For instance, if you want the sum of all transactions between $7 and $15, you'd skip any amounts below $7 or above $15.

The key insight is that BSTs maintain a special property: for every node, all values in its left subtree are smaller, and all values in its right subtree are larger. This means if a node's value is less than `low`, you know immediately that its entire left subtree is also too small and can be skipped. Similarly, if a node's value exceeds `high`, the entire right subtree can be ignored.

For example, with a BST containing values [3, 5, 7, 10, 15, 18] and range [7, 15], you'd sum up 7 + 10 + 15 = 32, efficiently skipping nodes 3, 5, and 18 without examining their subtrees.


**Diagram:**

Example 1: BST with range [7, 15]

```
        10
       /  \
      5    15
     / \     \
    3   7    18

Range [7, 15]:
- Nodes in range: 7, 10, 15
- Sum = 7 + 10 + 15 = 32
- Nodes excluded: 3 (< 7), 18 (> 15), 5 (< 7)
```

Example 2: BST with range [6, 10]

```
        10
       /  \
      5    15
     / \   / \
    3   7 13  18
   /   /
  1   6

Range [6, 10]:
- Nodes in range: 6, 7, 10
- Sum = 6 + 7 + 10 = 23
- Nodes excluded: 1, 3, 5 (< 6), 13, 15, 18 (> 10)

BST property helps prune search:
- If node.val < low, skip left subtree
- If node.val > high, skip right subtree
```


## Why This Matters

This problem appears in database query optimization, where BST-based indices (like B-trees) power range queries on millions of records. When you execute SQL queries like `SELECT SUM(price) FROM products WHERE price BETWEEN 100 AND 500`, the database engine uses similar tree-pruning strategies to avoid scanning irrelevant data. Financial systems use this for aggregating transactions within date ranges, analytics platforms employ it for filtering metrics by value thresholds, and time-series databases leverage it for computing statistics over specific windows. Understanding how to efficiently navigate BSTs with pruning teaches you the foundation of index-based query optimization, a critical skill for building performant data systems.

## Constraints

- The number of nodes in the tree is in the range [1, 2 * 10⁴].
- 1 <= Node.val <= 10⁵
- 1 <= low <= high <= 10⁵
- All Node.val are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
The BST property (left < root < right) allows pruning: if current node is less than low, ignore left subtree entirely. If greater than high, ignore right subtree. This makes the search much more efficient than checking all nodes.
</details>

<details>
<summary>Main Approach</summary>
Recursive DFS with pruning:
1. Base case: if node is None, return 0
2. If node.val < low, search only right subtree (left is too small)
3. If node.val > high, search only left subtree (right is too large)
4. If low <= node.val <= high, add node.val and search both subtrees
5. Return accumulated sum
</details>

<details>
<summary>Optimization Tip</summary>
The pruning optimization reduces average case significantly. In a balanced BST with range covering half the values, you skip approximately half the tree. Can also use iterative approach with a stack to avoid recursion overhead.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Naive Traversal | O(n) | O(h) | Check all nodes without pruning |
| Optimal (Pruned DFS) | O(h + k) | O(h) | h = height, k = nodes in range |

## Common Mistakes

1. **Not pruning the tree effectively**
   ```python
   # Wrong: Always traverse both subtrees
   def rangeSumBST(root, low, high):
       if not root:
           return 0
       total = root.val if low <= root.val <= high else 0
       return total + rangeSumBST(root.left, low, high) + rangeSumBST(root.right, low, high)

   # Correct: Prune based on BST property
   def rangeSumBST(root, low, high):
       if not root:
           return 0
       if root.val < low:
           return rangeSumBST(root.right, low, high)
       if root.val > high:
           return rangeSumBST(root.left, low, high)
       return root.val + rangeSumBST(root.left, low, high) + rangeSumBST(root.right, low, high)
   ```

2. **Using wrong comparison operators**
   ```python
   # Wrong: Exclusive boundaries
   if root.val <= low or root.val >= high:
       return 0

   # Correct: Inclusive boundaries [low, high]
   if low <= root.val <= high:
       total += root.val
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Count Nodes in Range | Easy | Count instead of sum |
| Kth Smallest Element in BST | Medium | Find specific element in order |
| Trim a Binary Search Tree | Medium | Remove nodes outside range |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Binary Search Tree Pattern](../prerequisites/trees.md)
