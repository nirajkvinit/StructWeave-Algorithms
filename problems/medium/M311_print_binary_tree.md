---
id: M311
old_id: A122
slug: print-binary-tree
title: Print Binary Tree
difficulty: medium
category: medium
topics: ["tree", "depth-first-search", "recursion"]
patterns: ["tree-traversal", "matrix-positioning"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M102", "E111", "M987"]
prerequisites: ["tree-height", "tree-traversal", "recursion"]
strategy_ref: ../strategies/data-structures/trees.md
---
# Print Binary Tree

## Problem

Given a binary tree's root node, create a visual 2D string matrix representation that positions each node according to specific spacing rules.

Your task is to build a matrix with height equal to the tree's height plus one, and width equal to `2^(height+1) - 1`. The root goes in the center of the first row. For any node at row `r` and column `c`, its left child is positioned at row `r+1` and column `c - 2^(height-r-1)`, while its right child goes at row `r+1` and column `c + 2^(height-r-1)`. Empty positions should contain empty strings.

This formula ensures proper spacing at each level. At the top level, children are far apart. As you descend, the spacing between parent and child halves at each level, creating a balanced visual representation. For example, in a tree with height 2, the root's children might be 2 columns away, while their children are only 1 column away.

The challenge lies in correctly computing tree height, understanding the exponential spacing formula, and mapping tree nodes to their exact matrix positions using recursion or iteration. Edge cases include single-node trees, heavily skewed trees, and ensuring the formula works correctly at the deepest level.

Return the completed matrix as a list of lists of strings.

**Example 1:**

Input: root = [1,2]
```
Tree:     1
         /
        2

Output matrix:
[["","1",""],
 ["2","",""]]
```

**Example 2:**

Input: root = [1,2,3,null,4]
```
Tree:      1
          / \
         2   3
          \
           4

Output matrix:
[["","","","1","","",""],
 ["","2","","","","3",""],
 ["","","4","","","",""]]
```


## Why This Matters

This problem bridges the gap between hierarchical data structures and visual representations, a critical skill in debugging tools, UI components, and data visualization libraries. Tree visualization engines in IDEs and database query planners use similar positioning algorithms to render execution trees. The exponential spacing formula demonstrates how mathematical patterns emerge from recursive structures. This problem also reinforces understanding of tree height calculation and position indexing, foundational concepts that appear in balanced tree implementations like AVL and Red-Black trees. Mastering this builds intuition for working with implicit tree representations using array indices, a technique used in heap implementations and segment trees.

## Constraints

- The number of nodes in the tree is in the range [1, 2¹⁰].
- -99 <= Node.val <= 99
- The depth of the tree will be in the range [1, 10].

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Calculate Tree Height First</summary>

Before building the matrix, you need to know the tree's height to determine matrix dimensions. Write a recursive helper function to calculate height:
```
def getHeight(node):
    if not node: return -1
    return 1 + max(getHeight(node.left), getHeight(node.right))
```
With height h, create a matrix of size (h+1) × (2^(h+1) - 1), initialized with empty strings. The height determines the spacing between parent and child nodes.

</details>

<details>
<summary>Hint 2: Understanding Column Position Formula</summary>

The column positioning formula `c ± 2^(height-r-1)` ensures proper spacing at each level. At level r:
- Distance from parent to child = 2^(height-r-1)
- This distance halves at each level as you go deeper
- Root is at column (n-1)/2 where n = 2^(height+1) - 1

For example, if height=2 and root is at column 3:
- Level 0 (r=0): root at col 3, offset = 2^(2-0-1) = 2
- Level 1 (r=1): children at cols 1 and 5, offset = 2^(2-1-1) = 1
- Level 2 (r=2): grandchildren offset = 2^(2-2-1) = 0

</details>

<details>
<summary>Hint 3: DFS with Row and Column Tracking</summary>

Use a recursive DFS that tracks current position (row, col):
```
def fill(node, row, col):
    if not node: return
    res[row][col] = str(node.val)
    offset = 2 ** (height - row - 1)
    fill(node.left, row + 1, col - offset)
    fill(node.right, row + 1, col + offset)
```
Start with `fill(root, 0, (n-1)//2)` where n is the width of the matrix.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| DFS + Matrix Fill | O(h × 2^h) | O(h × 2^h) | Visit each node once, matrix size is h × (2^h - 1) |
| Height Calculation | O(n) | O(h) | Separate pass to find height before matrix creation |
| Combined Approach | O(h × 2^h) | O(h × 2^h) | Dominated by matrix size, not node count |

## Common Mistakes

**Mistake 1: Incorrect Height Calculation**
```python
# WRONG: Off-by-one error in height
def getHeight(node):
    if not node:
        return 0  # Should return -1 for null nodes
    return 1 + max(getHeight(node.left), getHeight(node.right))

# CORRECT: Height of null is -1, single node is 0
def getHeight(node):
    if not node:
        return -1
    return 1 + max(getHeight(node.left), getHeight(node.right))
```

**Mistake 2: Wrong Column Offset Calculation**
```python
# WRONG: Incorrect offset formula
def fill(node, row, col):
    if not node: return
    res[row][col] = str(node.val)
    offset = 2 ** (row)  # Wrong: should use (height - row - 1)
    fill(node.left, row + 1, col - offset)
    fill(node.right, row + 1, col + offset)

# CORRECT: Offset decreases as we go deeper
def fill(node, row, col):
    if not node: return
    res[row][col] = str(node.val)
    offset = 2 ** (height - row - 1)  # Correct formula
    fill(node.left, row + 1, col - offset)
    fill(node.right, row + 1, col + offset)
```

**Mistake 3: Not Converting Node Values to Strings**
```python
# WRONG: Storing integers in string matrix causes type issues
def fill(node, row, col):
    if not node: return
    res[row][col] = node.val  # Should be str(node.val)
    # ... rest of code

# CORRECT: Convert to string
def fill(node, row, col):
    if not node: return
    res[row][col] = str(node.val)
    offset = 2 ** (height - row - 1)
    fill(node.left, row + 1, col - offset)
    fill(node.right, row + 1, col + offset)
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Compact Tree Printing | Minimize matrix width without overlapping nodes | Medium |
| Vertical Order Print | Print tree in vertical order instead of matrix | Medium |
| ASCII Art Tree | Create visual tree with connecting lines | Medium |
| Level Order Matrix | Fill matrix level by level instead of DFS | Easy |
| Custom Spacing | Allow user-defined spacing between nodes | Medium |

## Practice Checklist

- [ ] First attempt (30 min)
- [ ] Calculate tree height correctly (base case: -1)
- [ ] Understand matrix dimension formulas
- [ ] Implement column offset calculation
- [ ] Trace through example with height=2
- [ ] Test edge cases: single node, left-skewed, right-skewed
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Attempt variation: vertical order print

**Strategy**: See [Tree Pattern](../strategies/data-structures/trees.md)
