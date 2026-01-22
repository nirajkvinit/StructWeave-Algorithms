---
id: M268
old_id: A065
slug: subtree-of-another-tree
title: Subtree of Another Tree
difficulty: medium
category: medium
topics: ["tree"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["E242", "M100", "M652"]
prerequisites: ["tree-traversal", "recursion"]
strategy_ref: ../prerequisites/trees.md
---
# Subtree of Another Tree

## Problem

Given two binary trees `root` and `subRoot`, determine whether `subRoot` appears as a complete, identical subtree somewhere within `root`. A subtree match requires finding a node in `root` where the structure rooted at that node exactly matches `subRoot` in both tree structure and all node values.

To clarify "subtree": it must be a complete match starting from some node in `root`, including all descendants of that node. You cannot match just part of a subtree. For example, if `subRoot` is a tree with three nodes in a specific structure, you need to find those exact three nodes with the same structure in `root` - not just the same values scattered differently.

Important edge case: any tree is considered a subtree of itself. This means if `root` and `subRoot` are identical trees, the answer is `true`. Also, if `subRoot` is null (empty tree), it's considered a subtree of any tree. The challenge is efficiently checking tree equality at multiple potential starting points without redundant work.

The problem combines two operations: traversing `root` to find potential match points, and comparing subtrees for exact equality. A naive approach checking every node in `root` against `subRoot` works but can be optimized using advanced techniques like tree serialization or hashing.

## Why This Matters

Tree comparison problems test your ability to decompose complex problems into simpler recursive subproblems - a core skill for software engineering. This pattern appears in version control systems (comparing directory structures), file deduplication (finding identical folder hierarchies), compiler design (matching syntax tree patterns), and XML/JSON schema validation. The technique of breaking the problem into "find candidate nodes" + "verify exact match" is a common algorithmic strategy applicable beyond trees. Understanding this problem prepares you for more complex tree challenges like finding all duplicate subtrees or computing tree edit distance.

## Constraints

- The number of nodes in the root tree is in the range [1, 2000].
- The number of nodes in the subRoot tree is in the range [1, 1000].
- -10⁴ <= root.val <= 10⁴
- -10⁴ <= subRoot.val <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Breaking Down the Problem</summary>

This problem requires two separate operations:
1. Finding potential starting points in the main tree where subRoot might match
2. Checking if two trees are identical starting from a given node

Think about how you can traverse the main tree and at each node, check if a subtree starting at that node matches subRoot completely. What traversal method would let you visit every node in the main tree?
</details>

<details>
<summary>Hint 2: The Identity Check</summary>

Create a helper function `isSameTree(p, q)` that checks if two trees are structurally and value-wise identical. This function should:
- Return true if both nodes are null
- Return false if one is null and the other isn't
- Return false if values don't match
- Recursively check left and right subtrees

This helper will be called for each node in the main tree where values match the subRoot's root value.
</details>

<details>
<summary>Hint 3: Complete Solution Strategy</summary>

Use a two-function approach:

1. Main function `isSubtree(root, subRoot)`:
   - Base case: if root is null, return false (unless subRoot is also null)
   - If current node matches: check if trees are identical using helper
   - Recursively check left and right subtrees of root
   - Return true if ANY of these checks succeed

2. Helper function `isSameTree(p, q)`:
   - Compare nodes recursively for exact structural and value match

The key insight: you need to check identity at EVERY node in the main tree, not just nodes with matching values, because the structure must also match perfectly.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Recursive DFS | O(m × n) | O(h) | m = nodes in root, n = nodes in subRoot, h = height of root for call stack |
| String Serialization | O(m + n) | O(m + n) | Serialize both trees and use string matching (KMP algorithm) |
| Tree Hashing | O(m + n) | O(m + n) | Hash each subtree and compare hashes; faster in practice |

## Common Mistakes

### Mistake 1: Only checking root value match
```python
# WRONG: Only comparing if root values match
def isSubtree(root, subRoot):
    if not root:
        return False
    # Missing the identity check!
    if root.val == subRoot.val:
        return True  # Wrong! Need to check entire structure
    return self.isSubtree(root.left, subRoot) or self.isSubtree(root.right, subRoot)
```
**Why it's wrong:** Matching root values doesn't guarantee the entire subtree matches. You must verify the complete structure and all descendant values.

### Mistake 2: Incomplete null handling
```python
# WRONG: Missing edge case when subRoot is None
def isSubtree(root, subRoot):
    if not root:
        return False
    # What if subRoot is None? An empty tree is a subtree of any tree
    if self.isSameTree(root, subRoot):
        return True
    return self.isSubtree(root.left, subRoot) or self.isSubtree(root.right, subRoot)
```
**Why it's wrong:** When subRoot is None (empty tree), it should be considered a subtree of any tree. Always handle null cases explicitly.

### Mistake 3: Not checking ALL nodes
```python
# WRONG: Stopping after first value match
def isSubtree(root, subRoot):
    if not root:
        return False
    if root.val == subRoot.val:
        return self.isSameTree(root, subRoot)  # Missing OR continuation!
    return self.isSubtree(root.left, subRoot) or self.isSubtree(root.right, subRoot)
```
**Why it's wrong:** Even if the current node's value matches but the structure doesn't, you must continue searching in the left and right subtrees. Use OR to combine all possibilities.

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Same Tree | Easy | Check if two trees are identical (just the helper function) |
| Symmetric Tree | Easy | Check if tree is mirror of itself |
| Merge Two Binary Trees | Medium | Combine overlapping nodes from two trees |
| Find Duplicate Subtrees | Medium | Find all duplicate subtrees in a single tree |

## Practice Checklist

- [ ] Solve using recursive approach (Day 1)
- [ ] Implement string serialization method (Day 2)
- [ ] Handle edge cases: empty trees, single nodes (Day 3)
- [ ] Optimize with tree hashing (Day 5)
- [ ] Review after 1 week (Day 8)
- [ ] Review after 2 weeks (Day 15)
- [ ] Solve without looking at hints (Day 30)

**Strategy**: See [Tree Pattern](../prerequisites/trees.md)
