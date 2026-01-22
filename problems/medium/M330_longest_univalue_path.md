---
id: M330
old_id: A154
slug: longest-univalue-path
title: Longest Univalue Path
difficulty: medium
category: medium
topics: ["tree", "graph"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems:
  - id: M329
    title: Redundant Connection
    difficulty: medium
  - id: E200
    title: Binary Tree Maximum Path Sum
    difficulty: easy
prerequisites:
  - Binary tree traversal
  - Recursive problem solving
  - Post-order traversal
strategy_ref: ../prerequisites/trees.md
---
# Longest Univalue Path

## Problem

Given a binary tree, find the length of the longest path where all nodes along that path have the same value. The path can start and end anywhere in the tree (it doesn't need to pass through the root), and its length is measured by counting the edges between nodes, not the number of nodes.

For example, in a tree where the root has value 5 with two children (both 5s), and one of those children has a child also valued 5, the longest univalue path would connect all three 5-nodes, giving a path length of 2 edges.

The challenge lies in understanding how paths work in trees. A path through a node can combine at most two edges: one from the left subtree and one from the right subtree. However, when returning information to a node's parent, you can only extend in one direction (you can't "bend" the path through both children and then continue upward).

This creates a crucial distinction in your recursive solution: at each node, you need to track two things:
1. The longest single-direction path extending downward (for the parent to potentially extend)
2. The longest total path passing through this node (combining left and right, for the global maximum)

Consider this example:
```
      5
     / \
    4   5
   / \   \
  1   1   5
```
The longest univalue path is the right side: 5→5→5 (length 2 edges). Even though 4 has two children with value 1, that doesn't help because the path can't include the 4.

## Why This Matters

Tree path problems appear throughout computer science: file system operations (finding longest directory chains), organizational hierarchies (reporting chains), compiler design (expression tree analysis), and network topology (routing paths).

This problem teaches a critical recursive pattern: maintaining both local information (what to return upward) and global information (what to track for the final answer). This same pattern appears in finding maximum path sums, diameter of trees, and many dynamic programming problems on trees.

Understanding the difference between "path through a node" versus "path extending from a node" is essential for solving advanced tree problems. This concept transfers to working with any hierarchical data structure.

## Constraints

- The number of nodes in the tree is in the range [0, 10⁴].
- -1000 <= Node.val <= 1000
- The depth of the tree will not exceed 1000.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Recursive Path Construction</summary>

Think about how to build paths recursively. For any node, a univalue path can either:
1. Go through the node (combining left and right subtree paths)
2. Exist entirely in the left subtree
3. Exist entirely in the right subtree

The key insight: when processing a node, you need to return the longest univalue path that extends downward from that node (for the parent to use), but also check if combining left and right paths through this node gives a longer path overall.

</details>

<details>
<summary>Hint 2: Maintaining Global Maximum</summary>

Use a global variable (or class attribute) to track the longest path found so far. At each node:

1. Recursively get the longest univalue path from left child (that continues with current node's value)
2. Recursively get the longest univalue path from right child (that continues with current node's value)
3. Update global maximum with `left_path + right_path` (the path through current node)
4. Return to parent: `max(left_path, right_path) + 1` if child value matches, else `0`

The critical distinction: what you return upward vs. what you update globally.

</details>

<details>
<summary>Hint 3: Implementation Pattern</summary>

Use a helper function that returns the longest univalue path extending from a node downward:

```
def helper(node):
    if not node:
        return 0

    left = helper(node.left)
    right = helper(node.right)

    left_path = left + 1 if node.left and node.left.val == node.val else 0
    right_path = right + 1 if node.right and node.right.val == node.val else 0

    # Update global max with path through current node
    global_max = max(global_max, left_path + right_path)

    # Return longest single-direction path for parent
    return max(left_path, right_path)
```

The path through a node is `left_path + right_path` edges, but you can only extend one direction upward.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (All Paths) | O(n²) | O(h) | Check every possible path from every node |
| DFS with Path Checking | O(n²) | O(h) | DFS from each node checking path validity |
| Optimized Recursive | O(n) | O(h) | Single traversal with bottom-up path building |

Note: h is the height of the tree, representing the recursion stack space.

## Common Mistakes

### Mistake 1: Counting Nodes Instead of Edges
```python
# WRONG: Counting nodes instead of edges
def longestUnivaluePath(root):
    result = [0]

    def helper(node):
        if not node:
            return 0

        left = helper(node.left)
        right = helper(node.right)

        left_path = left + 1 if node.left and node.left.val == node.val else 0
        right_path = right + 1 if node.right and node.right.val == node.val else 0

        result[0] = max(result[0], left_path + right_path + 1)  # Bug: +1 counts current node
        return max(left_path, right_path)

    helper(root)
    return result[0]
```

**Why it's wrong**: The problem asks for the number of edges, not nodes. A path with 3 nodes has 2 edges. Don't add 1 when updating the result.

### Mistake 2: Not Handling Value Mismatch
```python
# WRONG: Assuming child values always match
def longestUnivaluePath(root):
    result = [0]

    def helper(node):
        if not node:
            return 0

        left = helper(node.left)
        right = helper(node.right)

        # Missing: check if child values match current node value
        left_path = left + 1
        right_path = right + 1

        result[0] = max(result[0], left_path + right_path)
        return max(left_path, right_path)

    helper(root)
    return result[0]
```

**Why it's wrong**: You must verify that the child's value matches the parent's value before extending the path. If values differ, the path breaks and should reset to 0.

### Mistake 3: Returning Wrong Value to Parent
```python
# WRONG: Returning the total path length instead of single direction
def longestUnivaluePath(root):
    result = [0]

    def helper(node):
        if not node:
            return 0

        left = helper(node.left)
        right = helper(node.right)

        left_path = left + 1 if node.left and node.left.val == node.val else 0
        right_path = right + 1 if node.right and node.right.val == node.val else 0

        result[0] = max(result[0], left_path + right_path)
        return left_path + right_path  # Bug: should return max, not sum

    helper(root)
    return result[0]
```

**Why it's wrong**: When returning to the parent, you can only extend the path in one direction (either left or right), not both. Return `max(left_path, right_path)`, not the sum.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Longest Zigzag Path | Medium | Find longest path alternating left-right directions |
| Path with Maximum Sum | Medium | Find path where node values sum to maximum |
| Longest Path with Difference <= K | Hard | Allow values to differ by at most K |
| Count All Univalue Paths | Hard | Count all paths with identical values |

## Practice Checklist

- [ ] **First attempt**: Solve independently (45 min time limit)
- [ ] **Draw examples**: Trace recursion on paper for small trees
- [ ] **Handle edge cases**: Empty tree, single node, no valid paths
- [ ] **Optimize**: Achieve O(n) time with single traversal
- [ ] **Spaced repetition**: Revisit after 3 days
- [ ] **Interview practice**: Explain recursive logic in under 5 minutes
- [ ] **Variations**: Solve Binary Tree Maximum Path Sum
- [ ] **Final review**: Solve again after 1 week without hints

**Strategy**: See [Tree Pattern](../prerequisites/trees.md)
