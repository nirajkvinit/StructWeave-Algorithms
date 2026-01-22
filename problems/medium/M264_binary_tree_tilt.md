---
id: M264
old_id: A059
slug: binary-tree-tilt
title: Binary Tree Tilt
difficulty: medium
category: medium
topics: ["tree", "dfs", "recursion"]
patterns: ["post-order-traversal"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E543_diameter_of_binary_tree", "E110_balanced_binary_tree", "M124_binary_tree_maximum_path_sum"]
prerequisites: ["tree-traversal", "recursion", "post-order"]
strategy_ref: ../prerequisites/trees.md
---
# Binary Tree Tilt

## Problem

Given the root of a binary tree, calculate the sum of all node tilt values across the entire tree. The tilt of an individual node measures the imbalance between its left and right subtrees.

Specifically, a node's tilt is defined as the absolute difference between the sum of all values in its left subtree and the sum of all values in its right subtree. For nodes missing a left child, treat the left subtree sum as 0. Similarly, missing right children contribute a subtree sum of 0.

For example, if a node has a left subtree with total sum 10 and a right subtree with total sum 6, that node's tilt is |10 - 6| = 4. Your task is to compute each node's tilt and return the sum of all these tilt values. Note that the tilt uses the sum of entire subtrees, not just immediate children.

The key challenge here is efficiently computing subtree sums while calculating tilts in a single tree traversal. You'll need to use post-order traversal because you must process children before their parent to know the subtree sums.

**Diagram:**

```
Example 1:
     1
    / \
   2   3

Node 2: tilt = |0 - 0| = 0 (no children)
Node 3: tilt = |0 - 0| = 0 (no children)
Node 1: tilt = |2 - 3| = 1
Total tilt sum = 0 + 0 + 1 = 1
```

```
Example 2:
       4
      / \
     2   9
    / \   \
   3   5   7

Node 3: tilt = |0 - 0| = 0
Node 5: tilt = |0 - 0| = 0
Node 2: tilt = |3 - 5| = 2
Node 7: tilt = |0 - 0| = 0
Node 9: tilt = |0 - 7| = 7
Node 4: tilt = |(2+3+5) - (9+7)| = |10 - 16| = 6
Total tilt sum = 0 + 0 + 2 + 0 + 7 + 6 = 15
```

```
Example 3:
      21
      / \
     7   14
    / \   / \
   1   1 2   2
  / \
 3   3

Total tilt sum = 9
```


## Why This Matters

Tree tilt problems train you in post-order traversal patterns where you must process children before parents - a fundamental technique in tree algorithms. This pattern appears in calculating tree properties like diameter, height-balanced verification, and path sums. Beyond trees, the concept of measuring imbalance is valuable in database index balancing (B-trees), load balancing in distributed systems, and detecting anomalies in hierarchical data. The technique of returning one value while accumulating another (subtree sum vs. tilt accumulation) is a common pattern in recursive algorithms.

## Constraints

- The number of nodes in the tree is in the range [0, 10⁴].
- -1000 <= Node.val <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Post-Order Traversal Pattern</summary>

The key insight is that we need to calculate subtree sums before we can compute a node's tilt. This is a classic post-order traversal problem.

For each node, we need to:
1. Get the sum of left subtree
2. Get the sum of right subtree
3. Calculate tilt: |left_sum - right_sum|
4. Add tilt to global total
5. Return sum of current subtree (left_sum + right_sum + node.val)

The function should return the subtree sum while updating a global tilt counter.
</details>

<details>
<summary>Hint 2: Helper Function Pattern</summary>

Use a helper function that returns the sum of the subtree while accumulating the total tilt in an external variable or using a class attribute.

```
Structure:
- Main function: Initializes total tilt, calls helper
- Helper function:
  - Base case: null node returns 0
  - Recursively get left_sum and right_sum
  - Update total_tilt with |left_sum - right_sum|
  - Return left_sum + right_sum + node.val
```

This pattern separates concerns: subtree sum calculation vs. tilt accumulation.
</details>

<details>
<summary>Hint 3: Implementation Pattern</summary>

```python
# Pseudocode:
class Solution:
    def findTilt(root):
        total_tilt = 0

        def get_sum(node):
            nonlocal total_tilt

            if not node:
                return 0

            left_sum = get_sum(node.left)
            right_sum = get_sum(node.right)

            # Calculate and add tilt for current node
            tilt = abs(left_sum - right_sum)
            total_tilt += tilt

            # Return sum of entire subtree including current node
            return left_sum + right_sum + node.val

        get_sum(root)
        return total_tilt
```

The `nonlocal` keyword allows the helper to modify the outer variable.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Post-Order DFS | O(n) | O(h) | h = tree height for recursion stack |
| Pre-compute Sums | O(n) | O(n) | Store all subtree sums first, then calculate tilts |

## Common Mistakes

1. **Confusing tilt calculation with subtree sum**
```python
# Wrong: Returning tilt instead of sum
def get_sum(node):
    if not node:
        return 0
    left_sum = get_sum(node.left)
    right_sum = get_sum(node.right)
    return abs(left_sum - right_sum)  # Wrong! Should return sum

# Correct: Return sum, accumulate tilt separately
def get_sum(node):
    if not node:
        return 0
    left_sum = get_sum(node.left)
    right_sum = get_sum(node.right)
    total_tilt += abs(left_sum - right_sum)
    return left_sum + right_sum + node.val
```

2. **Not handling null nodes**
```python
# Wrong: Crashes on null children
def get_sum(node):
    left_sum = get_sum(node.left)  # Crashes if node is None
    right_sum = get_sum(node.right)

# Correct: Check for null first
def get_sum(node):
    if not node:
        return 0
    left_sum = get_sum(node.left)
    right_sum = get_sum(node.right)
```

3. **Forgetting to include node value in sum**
```python
# Wrong: Not including current node's value
return left_sum + right_sum  # Missing node.val

# Correct: Include current node in subtree sum
return left_sum + right_sum + node.val
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Maximum Tilt | Easy | Find maximum tilt among all nodes |
| Tilt of Specific Node | Medium | Find tilt of node with given value |
| Balanced by Tilt | Hard | Determine if tree can be balanced by adjusting values |
| N-ary Tree Tilt | Medium | Extend to n-ary trees (sum of max child - sum of min child) |

## Practice Checklist

- [ ] Solve using post-order traversal
- [ ] Handle edge case: empty tree
- [ ] Handle edge case: single node
- [ ] Handle edge case: tree with negative values
- [ ] **Day 3**: Solve again without hints
- [ ] **Week 1**: Implement maximum tilt variation
- [ ] **Week 2**: Solve from memory in under 15 minutes

**Strategy**: See [Tree Pattern](../prerequisites/trees.md)
