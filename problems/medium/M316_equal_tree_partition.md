---
id: M316
old_id: A130
slug: equal-tree-partition
title: Equal Tree Partition
difficulty: medium
category: medium
topics: ["tree", "depth-first-search", "hash-table"]
patterns: ["tree-sum", "post-order-traversal"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E543", "M437", "M508"]
prerequisites: ["tree-traversal", "subtree-sum", "hash-sets"]
strategy_ref: ../strategies/data-structures/trees.md
---
# Equal Tree Partition

## Problem

Given the root of a binary tree, determine whether you can partition it into two separate trees with equal sums by removing exactly one edge.

Removing an edge means disconnecting one subtree from the rest of the tree, creating two independent components. For a valid partition to exist, both components must have node values that sum to the same total. For example, if the entire tree sums to 30, you need to find an edge whose removal creates one subtree with sum 15 and leaves the remaining nodes also summing to 15.

The key insight is that if you remove the edge connecting a subtree with sum S to its parent, you create two trees: one with sum S and another with sum (Total - S). For these to be equal, you need S = Total - S, which means S = Total / 2. Therefore, you are looking for any subtree (excluding the entire tree) whose sum equals half the total sum.

An important constraint: you cannot remove the edge above the root node (the root has no parent edge to cut). Also, the total sum must be even for any partition to be possible. Edge cases include trees with negative values, where multiple subtrees might have the target sum.

Return `true` if such a partition exists, `false` otherwise.


**Example 1:**

Input: root = [5,10,10,null,null,2,3]
```
       5
      / \
    10   10
        /  \
       2    3

Remove edge between 5 and right child:
  Tree 1: [5,10]     sum = 15
  Tree 2: [10,2,3]   sum = 15
```
Output: true

**Example 2:**

Input: root = [1,2,10,null,null,2,20]
```
        1
       / \
      2   10
         /  \
        2   20

Total sum = 35 (odd number)
Cannot split into two equal parts
```
Output: false


## Why This Matters

This problem demonstrates tree partitioning with sum constraints, a pattern that appears in load balancing distributed systems where you must split workloads across servers to equalize resource usage. Database query optimizers use similar logic when partitioning data tables to balance storage and query load. The technique of computing subtree sums through post-order traversal is fundamental to many tree algorithms, including finding diameters, computing depths, and validating balanced trees. Understanding when to exclude the root from valid solutions teaches careful boundary condition handling. This problem also reinforces the relationship between global properties (total sum) and local properties (subtree sums), a key concept in divide-and-conquer algorithms and dynamic programming on trees.

## Constraints

- The number of nodes in the tree is in the range [1, 10⁴].
- -10⁵ <= Node.val <= 10⁵

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Total Sum and Target Sum</summary>

First, calculate the total sum of all nodes in the tree. For a valid partition to exist:
1. The total sum must be even (otherwise, can't split into two equal parts)
2. We need to find a subtree with sum equal to `total_sum / 2`
3. Removing the edge connecting this subtree creates two trees with equal sums

If total sum is odd, immediately return false. Otherwise, search for a subtree with the target sum.

</details>

<details>
<summary>Hint 2: Post-Order Traversal with Subtree Sum Tracking</summary>

Use post-order DFS to compute subtree sums (process children before parent):
```
def getSum(node):
    if not node: return 0
    left_sum = getSum(node.left)
    right_sum = getSum(node.right)
    subtree_sum = node.val + left_sum + right_sum

    # Check if this subtree (excluding root) has target sum
    if subtree_sum == target and node != root:
        found = True

    return subtree_sum
```

Important: Don't consider the entire tree as a valid partition (can't remove the root's edge).

</details>

<details>
<summary>Hint 3: Edge Cases and Implementation Details</summary>

Critical edge cases to handle:
1. **Don't count the root**: Removing the root's "edge" doesn't create two trees
2. **Duplicate subtree sums**: Multiple subtrees might have the target sum (any one works)
3. **Negative numbers**: Total sum and subtree sums can be negative

Implementation approach:
- First pass: calculate total sum
- Check if total sum is even
- Second pass: find subtree with sum = total/2 (excluding root itself)
- Use a hash set to store all subtree sums encountered, or a boolean flag

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Two-Pass DFS | O(n) | O(h) | One pass for total, one for subtree sums |
| Single-Pass with Set | O(n) | O(n) | Store all subtree sums in set |
| Post-Order Traversal | O(n) | O(h) | Recursion stack depth |

## Common Mistakes

**Mistake 1: Including Root in Valid Partitions**
```python
# WRONG: Allowing root's subtree as a valid partition
def checkEqualTree(root):
    total = getSum(root)
    if total % 2 != 0:
        return False

    target = total // 2
    seen = set()

    def dfs(node):
        if not node:
            return 0
        subtree_sum = node.val + dfs(node.left) + dfs(node.right)
        seen.add(subtree_sum)  # Wrong: adds root's sum too
        return subtree_sum

    dfs(root)
    return target in seen  # May incorrectly return True

# CORRECT: Exclude root from valid partitions
def checkEqualTree(root):
    total = getSum(root)
    if total % 2 != 0:
        return False

    target = total // 2
    seen = set()

    def dfs(node):
        if not node:
            return 0
        subtree_sum = node.val + dfs(node.left) + dfs(node.right)
        # Only add non-root subtrees
        if node != root:
            seen.add(subtree_sum)
        return subtree_sum

    dfs(root)
    return target in seen
```

**Mistake 2: Not Handling Odd Total Sum**
```python
# WRONG: Not checking if total sum is even
def checkEqualTree(root):
    total = getSum(root)
    target = total // 2  # May create invalid target for odd sums

    def dfs(node):
        if not node: return 0
        subtree = node.val + dfs(node.left) + dfs(node.right)
        if subtree == target and node != root:
            return True  # Wrong logic flow
        return subtree

    # Missing odd sum check

# CORRECT: Check for even total first
def checkEqualTree(root):
    total = getSum(root)
    if total % 2 != 0:  # Early return for odd sums
        return False

    target = total // 2
    # ... rest of logic
```

**Mistake 3: Incorrect Subtree Sum Calculation**
```python
# WRONG: Not including current node's value
def dfs(node):
    if not node:
        return 0
    left = dfs(node.left)
    right = dfs(node.right)
    # Missing node.val in sum
    return left + right

# CORRECT: Include current node in subtree sum
def dfs(node):
    if not node:
        return 0
    left = dfs(node.left)
    right = dfs(node.right)
    subtree_sum = node.val + left + right  # Include node.val
    return subtree_sum
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| K-Way Equal Partition | Split tree into k subtrees with equal sums | Hard |
| Maximum Equal Partition | Find partition maximizing equal sum value | Medium |
| Count Equal Partitions | Count all valid equal partition points | Medium |
| Weighted Equal Partition | Nodes have weights, partition by weight sum | Medium |
| Minimum Difference Partition | Minimize difference between partition sums | Medium |

## Practice Checklist

- [ ] First attempt (30 min)
- [ ] Calculate total sum correctly
- [ ] Check if total is even before searching
- [ ] Implement post-order traversal for subtree sums
- [ ] Exclude root from valid partition candidates
- [ ] Test edge cases: single node, two nodes, negative values
- [ ] Trace through Example 1: [5,10,10,null,null,2,3]
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Attempt variation: count equal partitions

**Strategy**: See [Tree Pattern](../strategies/data-structures/trees.md)
