---
id: M226
old_id: A008
slug: most-frequent-subtree-sum
title: Most Frequent Subtree Sum
difficulty: medium
category: medium
topics: ["tree"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["M508", "E543", "M437"]
prerequisites: ["tree-traversal", "postorder-traversal", "hash-map"]
strategy_ref: ../prerequisites/trees.md
---
# Most Frequent Subtree Sum

## Problem

Given the root of a binary tree, find which subtree sum value appears most frequently. If multiple sums tie for the highest frequency, return all of them in any order.

A subtree sum for a given node is calculated by adding the node's value plus all values in its left and right subtrees. For example, in a tree where node 5 has left child 2 and right child -3, the subtree sum at node 5 is 2 + 5 + (-3) = 4.

This problem requires computing sums from the bottom up. You can't calculate a parent's subtree sum until you know the sums of its children's subtrees. This naturally suggests a postorder traversal pattern (process children before parent).

Here's the key insight: As you compute each subtree sum during the traversal, track how many times each sum value occurs using a hash map. After processing the entire tree, find the maximum frequency and return all sums that appear that many times.

For instance, if a tree produces subtree sums [2, -3, 4, 2], the sum 2 appears twice (the highest frequency), so you'd return [2]. If sums were [2, -3, 4, 2, -3], you'd return [2, -3] since both appear twice.


**Diagram:**

```mermaid
flowchart TD
    A((5)) --> B((2))
    A --> C((-3))

    D((5)) --> E((2))
    D --> F((-5))
```

Example 1: Tree [5,2,-3]
- Subtree sum at node 2: 2
- Subtree sum at node -3: -3
- Subtree sum at node 5: 2+5+(-3) = 4

Example 2: Tree [5,2,-5]
- Subtree sum at node 2: 2 (appears twice if counting this subtree)
- Most frequent sum depends on tree structure


## Why This Matters

This problem teaches the postorder traversal pattern, which is essential for bottom-up tree computations. Many real-world applications require processing children before parents: calculating directory sizes in file systems, evaluating expression trees in compilers, computing aggregate statistics in organizational hierarchies, and determining subtree properties in database query optimization. The combination of tree traversal with frequency counting also appears in DNA sequence analysis (finding common subtree patterns in phylogenetic trees), social network analysis (identifying common subgraph structures), and compiler optimization (detecting repeated code patterns). Understanding how to aggregate information from subtrees and propagate it upward is fundamental to many divide-and-conquer tree algorithms.

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
<summary>💡 Hint 1: Conceptual Understanding</summary>

To find subtree sums, you need to process nodes from bottom to top (postorder traversal). Each node's subtree sum equals its value plus the sum of its left subtree plus the sum of its right subtree. Track all subtree sums in a frequency map, then find which sum(s) have the maximum frequency.

</details>

<details>
<summary>🎯 Hint 2: Optimal Approach</summary>

Use postorder traversal (left, right, root) with a hash map to count frequencies. For each node, recursively compute left and right subtree sums, calculate current subtree sum, store it in the map, and return it. After traversal, find all sums with maximum frequency from the map.

</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>

1. Initialize frequency map (sum -> count)
2. Define recursive function postorder(node):
   - If node is null, return 0
   - left_sum = postorder(node.left)
   - right_sum = postorder(node.right)
   - current_sum = node.val + left_sum + right_sum
   - Increment frequency_map[current_sum]
   - Return current_sum
3. Call postorder(root)
4. Find max frequency in map
5. Return all sums with max frequency

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Postorder + HashMap | O(n) | O(n) | Visit each node once, store up to n unique sums |
| Two-Pass DFS | O(n) | O(n) | First pass computes sums, second finds max frequency |
| Preorder (Wrong) | O(n) | O(n) | Can't compute subtree sums top-down |

## Common Mistakes

### Mistake 1: Using wrong traversal order
```python
# Wrong: Preorder can't compute subtree sums
def findFrequentTreeSum(root):
    freq_map = {}

    def preorder(node):
        if not node:
            return 0

        # Can't compute subtree sum before processing children
        subtree_sum = node.val
        subtree_sum += preorder(node.left)
        subtree_sum += preorder(node.right)
        # This works but is conceptually preorder doing postorder work
```

```python
# Correct: Postorder naturally computes subtree sums
def findFrequentTreeSum(root):
    freq_map = {}

    def postorder(node):
        if not node:
            return 0

        # Process children first (postorder)
        left_sum = postorder(node.left)
        right_sum = postorder(node.right)

        # Then process current node
        subtree_sum = node.val + left_sum + right_sum
        freq_map[subtree_sum] = freq_map.get(subtree_sum, 0) + 1

        return subtree_sum

    postorder(root)
    max_freq = max(freq_map.values())
    return [s for s, f in freq_map.items() if f == max_freq]
```

### Mistake 2: Not returning subtree sum
```python
# Wrong: Doesn't return sum for parent to use
def findFrequentTreeSum(root):
    freq_map = {}

    def postorder(node):
        if not node:
            return

        left_sum = postorder(node.left)  # Returns None!
        right_sum = postorder(node.right)  # Returns None!

        subtree_sum = node.val + (left_sum or 0) + (right_sum or 0)
        freq_map[subtree_sum] = freq_map.get(subtree_sum, 0) + 1
        # Missing: return subtree_sum
```

```python
# Correct: Return sum for parent nodes
def findFrequentTreeSum(root):
    freq_map = {}

    def postorder(node):
        if not node:
            return 0  # Return 0 for null nodes

        left_sum = postorder(node.left)
        right_sum = postorder(node.right)

        subtree_sum = node.val + left_sum + right_sum
        freq_map[subtree_sum] = freq_map.get(subtree_sum, 0) + 1

        return subtree_sum  # Return for parent to use

    postorder(root)
    max_freq = max(freq_map.values())
    return [s for s, f in freq_map.items() if f == max_freq]
```

### Mistake 3: Only returning one sum with max frequency
```python
# Wrong: Returns only first sum found with max frequency
def findFrequentTreeSum(root):
    freq_map = {}

    def postorder(node):
        if not node:
            return 0

        left_sum = postorder(node.left)
        right_sum = postorder(node.right)

        subtree_sum = node.val + left_sum + right_sum
        freq_map[subtree_sum] = freq_map.get(subtree_sum, 0) + 1
        return subtree_sum

    postorder(root)
    max_freq = max(freq_map.values())

    # Wrong: returns only first match
    for s, f in freq_map.items():
        if f == max_freq:
            return [s]
```

```python
# Correct: Return all sums with max frequency
def findFrequentTreeSum(root):
    freq_map = {}

    def postorder(node):
        if not node:
            return 0

        left_sum = postorder(node.left)
        right_sum = postorder(node.right)

        subtree_sum = node.val + left_sum + right_sum
        freq_map[subtree_sum] = freq_map.get(subtree_sum, 0) + 1
        return subtree_sum

    postorder(root)
    max_freq = max(freq_map.values())

    # Correct: return all matching sums
    return [s for s, f in freq_map.items() if f == max_freq]
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Path Sum III | Medium | Count paths with given sum in binary tree |
| Diameter of Binary Tree | Easy | Find longest path between any two nodes |
| Binary Tree Maximum Path Sum | Hard | Find path with maximum sum |
| Count Univalue Subtrees | Medium | Count subtrees where all nodes have same value |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] After 1 day (spaced repetition)
- [ ] After 3 days (spaced repetition)
- [ ] After 1 week (spaced repetition)
- [ ] Before interview (final review)

**Completion Status**: ⬜ Not Started | 🟨 In Progress | ✅ Mastered

**Strategy**: See [Tree Pattern](../prerequisites/trees.md)
