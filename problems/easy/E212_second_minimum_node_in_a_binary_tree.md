---
id: E212
old_id: A138
slug: second-minimum-node-in-a-binary-tree
title: Second Minimum Node In a Binary Tree
difficulty: easy
category: easy
topics: ["tree", "depth-first-search"]
patterns: ["tree-traversal", "dfs"]
estimated_time_minutes: 15
frequency: low
prerequisites: ["tree-traversal", "recursion"]
related_problems: ["E671", "M230", "M378"]
strategy_ref: ../strategies/data-structures/trees.md
---
# Second Minimum Node In a Binary Tree

## Problem

You're given a special binary tree with unique structural constraints. Every node in this tree either has exactly two children or is a leaf node (no children). More importantly, there's a value constraint: each internal node's value equals the minimum of its two children's values. This means parent.val = min(left_child.val, right_child.val) for every internal node.

Because of this structure, the root always contains the minimum value in the entire tree (since each parent takes the minimum from below). Your task is to find the second smallest distinct value among all nodes. Note the word "distinct" - if the tree is [2, 2, 2], all values are the same, so there's no second smallest distinct value.

For example, in a tree [2, 2, 5, null, null, 5, 7], the distinct values are {2, 5, 7}. The minimum is 2 (at root), and the second smallest is 5. However, you can't just collect all values and sort them - that ignores the special tree property that lets you prune your search.

The key insight: since root.val is guaranteed to be the minimum, you're looking for the smallest value that's strictly greater than root.val. This means when traversing, if you encounter a node with value > root.val, you don't need to explore its children (why? because its children must be >= its value).

If no second smallest distinct value exists, return -1.

## Why This Matters

This problem teaches you to recognize and exploit structural properties rather than applying generic algorithms. In real systems, data structures often have invariants that enable optimizations - database indexes maintain sorted order, heap trees maintain parent-child relationships, and file system trees enforce hierarchical constraints. Learning to identify such properties separates efficient solutions from brute force approaches. The problem also demonstrates pruning in tree traversal, a technique used in game AI (alpha-beta pruning), search optimization, and decision trees in machine learning. Many interview questions test whether you notice special properties that simplify the problem - here, recognizing that the root is always minimum saves you from searching the entire tree. Similar patterns appear in finding kth smallest elements, validating tree properties, and optimizing tree-based algorithms.

## Constraints

- The number of nodes in the tree is in the range [1, 25].
- 1 <= Node.val <= 2³¹ - 1
- root.val == min(root.left.val, root.right.val) for each internal node of the tree.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Understand the Tree Property
The key insight is that the root always contains the minimum value in the entire tree (because each parent equals the minimum of its children). Therefore, you're looking for the smallest value that's strictly greater than root.val. How can you use this property to prune your search?

### Hint 2: DFS with Early Termination
Traverse the tree using DFS. If a node's value equals root.val, you need to explore both its children because a larger value might be deeper. But if a node's value is greater than root.val, you don't need to explore its children (why?). Track the smallest value greater than root.val encountered during traversal.

### Hint 3: Optimized Recursive Approach
Write a recursive function that returns the second minimum in a subtree. For each node, if it equals root.val, recursively find the second minimum in both children and return the smaller of the two (or the one that exists). If the node value is greater than root.val, it's a candidate for second minimum. Use Integer.MAX_VALUE or -1 as sentinel values.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| DFS Traversal | O(n) | O(h) | h is tree height, stack space |
| BFS Level Order | O(n) | O(w) | w is max width, queue space |
| Collect All + Sort | O(n log n) | O(n) | Overkill, not optimal |
| Recursive with Pruning | O(n) | O(h) | Best case with early termination |

## Common Mistakes

### Mistake 1: Not handling the tree property correctly
```
// Wrong: Traversing entire tree without using the min property
Set<Integer> values = new HashSet<>();
traverse(root, values);  // Collect all values
List<Integer> sorted = new ArrayList<>(values);
Collections.sort(sorted);
return sorted.size() >= 2 ? sorted.get(1) : -1;  // Inefficient!
```
**Why it's wrong**: This approach ignores the special tree structure where root is always minimum. It's unnecessarily complex and slower.

**Correct approach**: Use the fact that root.val is the minimum to search only for values strictly greater than it.

### Mistake 2: Exploring children when node value > root.val
```
// Wrong: Continuing to explore when we already found a candidate
void dfs(Node node, int min, int[] secondMin) {
    if (node == null) return;
    if (node.val > min && node.val < secondMin[0]) {
        secondMin[0] = node.val;
        dfs(node.left, min, secondMin);   // Unnecessary!
        dfs(node.right, min, secondMin);  // Children can't be smaller
    }
}
```
**Why it's wrong**: If node.val > root.val, its children must also be >= node.val (by tree property), so they can't be the second minimum if we already found node.val.

**Correct approach**: Only explore children if current node.val equals root.val.

### Mistake 3: Incorrect handling of -1 return value
```
// Wrong: Not properly merging results from left and right
int left = findSecond(node.left, min);
int right = findSecond(node.right, min);
if (left == -1) return right;  // What if both are -1?
if (right == -1) return left;
return Math.min(left, right);
```
**Why it's wrong**: If both left and right return -1 (no second minimum found), this returns -1 incorrectly when there might be candidates at current level.

**Correct approach**: Carefully handle all cases: both -1, one -1, both valid. Consider the current node value too.

## Variations

| Variation | Difference | Difficulty Increase |
|-----------|------------|---------------------|
| K-th smallest in BST | Find k-th smallest, tree is BST | Medium (inorder traversal) |
| Second largest in binary tree | Find second largest instead | None (similar logic) |
| Arbitrary binary tree second min | Tree doesn't have min property | None (simpler, just traverse) |
| Find all distinct values | Return all unique values | None (set traversal) |
| Second minimum without duplicates | Each value appears once | None (easier) |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Understand why root is always minimum
- [ ] Implement DFS with pruning
- [ ] Handle case where all values are same
- [ ] Handle edge cases (single node, two nodes)
- [ ] Implement without bugs on first try
- [ ] Explain the pruning optimization
- [ ] Test with [2,2,2], [2,2,5,null,null,5,7]
- [ ] Solve in under 15 minutes
- [ ] Trace through recursion by hand
- [ ] Revisit after 3 days (spaced repetition)
- [ ] Revisit after 1 week (spaced repetition)
- [ ] Solve k-th smallest in BST variation

**Strategy**: See [Tree Pattern](../strategies/data-structures/trees.md)
