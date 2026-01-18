---
id: M318
old_id: A133
slug: path-sum-iv
title: Path Sum IV
difficulty: medium
category: medium
topics: ["array", "tree"]
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems: ["E111", "M114", "M118"]
prerequisites: ["binary-tree-traversal", "depth-first-search", "encoding-schemes"]
strategy_ref: ../strategies/data-structures/trees.md
---
# Path Sum IV

## Problem

Given a compact encoding of a binary tree with depth less than 5, calculate the sum of all root-to-leaf path sums.

The encoding uses an array of three-digit integers where each integer represents a single node:
- The hundreds digit indicates the node's depth `d` (1 to 4, where 1 is the root level)
- The tens digit indicates the position `p` within that level (1 to 8, using the same indexing as a complete binary tree)
- The units digit stores the node's value `v` (0 to 9)

For example, the number 215 means: depth 2, position 1 (leftmost node at level 2), value 5. The number 334 means: depth 3, position 3, value 4.

Given a sorted array `nums` containing these encoded values (guaranteed to represent a valid connected binary tree), sum all root-to-leaf paths. A leaf is a node with no children in the encoded representation. Each path sum is the total of all node values from root to that leaf.

The parent-child relationship follows complete binary tree indexing: a node at depth `d` and position `p` has its left child at depth `d+1`, position `2p-1`, and its right child at depth `d+1`, position `2p`. You can determine if a node is a leaf by checking whether either child position exists in the encoded array.


**Example 1:**

Input: nums = [113, 215, 221]
```
Decoding:
  113: depth=1, pos=1, value=3  (root)
  215: depth=2, pos=1, value=5  (left child)
  221: depth=2, pos=2, value=1  (right child)

Tree structure:
      3
     / \
    5   1

Paths:
  3->5 = 8
  3->1 = 4
Total: 12
```
Output: 12

**Example 2:**

Input: nums = [113, 221]
```
Decoding:
  113: depth=1, pos=1, value=3  (root)
  221: depth=2, pos=2, value=1  (right child)

Tree structure:
      3
       \
        1

Paths:
  3->1 = 4
Total: 4
```
Output: 4


## Why This Matters

This problem demonstrates compact tree encoding schemes used when transmitting hierarchical data over networks with limited bandwidth. Many serialization protocols encode trees as arrays to minimize space and enable efficient streaming. Understanding position-based indexing in complete binary trees is fundamental to heap implementations and segment trees. The technique of validating parent-child relationships through position arithmetic appears in memory allocators that organize free blocks as trees. This problem also teaches you to work with implicit data structures where relationships are computed rather than stored explicitly, a space-saving technique crucial for embedded systems and cache-efficient algorithms. The pattern of decoding structural information from numerical values appears in file system inodes, where metadata is packed into fixed-width integers.

## Constraints

- 1 <= nums.length <= 15
- 110 <= nums[i] <= 489
- nums represents a valid binary tree with depth less than 5.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Decode the Tree Structure</summary>

The key insight is understanding how the encoding maps to parent-child relationships. For a node at depth `d` and position `p`:
- Its left child would be at depth `d+1` and position `2*p - 1`
- Its right child would be at depth `d+1` and position `2*p`

Store the decoded nodes in a hash map with key `(depth, position)` for fast lookup. A node is a leaf if neither of its potential children exist in the map.

</details>

<details>
<summary>Hint 2: Track Path Sums During Traversal</summary>

Use DFS to traverse from the root, maintaining a running sum of node values along the current path. When you reach a leaf node (no children exist), add the current path sum to the total result.

The encoding allows you to determine if a node exists by checking the hash map, avoiding the need to build an actual tree structure.

</details>

<details>
<summary>Hint 3: Implement Efficient Child Detection</summary>

```python
def is_leaf(node, tree_map):
    depth, pos = node // 100, (node % 100) // 10
    left_key = (depth + 1, 2 * pos - 1)
    right_key = (depth + 1, 2 * pos)
    return left_key not in tree_map and right_key not in tree_map
```

This approach allows you to traverse the encoded tree without reconstruction, keeping space complexity minimal.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| DFS with Hash Map | O(n) | O(n) | n = number of nodes; hash map stores all nodes |
| BFS with Queue | O(n) | O(n) | Queue stores (node, path_sum) pairs |
| Recursive DFS | O(n) | O(h) | h = tree height (max 4); recursion stack depth |

## Common Mistakes

**Mistake 1: Incorrect Child Position Calculation**
```python
# Wrong: Using 0-based indexing
def get_children(depth, pos):
    return (depth+1, pos*2), (depth+1, pos*2+1)

# Correct: Using 1-based indexing as per problem
def get_children(depth, pos):
    return (depth+1, pos*2-1), (depth+1, pos*2)
```

**Mistake 2: Not Checking for Leaf Nodes**
```python
# Wrong: Adding sum at every node
def dfs(node, path_sum):
    result += path_sum
    # Continue traversal...

# Correct: Only add sum at leaf nodes
def dfs(node, path_sum):
    if is_leaf(node):
        result += path_sum
        return
    # Continue to children...
```

**Mistake 3: Building Actual Tree Structure**
```python
# Wrong: Unnecessarily complex
class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = self.right = None
# Build entire tree then traverse...

# Correct: Use hash map for direct access
tree_map = {(d, p): v for num in nums
            for d, p, v in [(num//100, (num%100)//10, num%10)]}
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Count all root-to-leaf paths | Easy | Return count instead of sum |
| Find maximum path sum | Medium | Track max instead of total sum |
| Decode to actual tree structure | Medium | Build TreeNode objects |
| Find path with target sum | Medium | Early termination when target found |
| Support deeper trees (depth > 4) | Hard | Need different encoding scheme |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Analyzed time/space complexity
- [ ] Solved without hints
- [ ] Tested edge cases (single node, all left/right children)
- [ ] Reviewed alternative approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 1 week
- [ ] Could explain solution to others

**Strategy**: See [Array Pattern](../strategies/data-structures/trees.md)
