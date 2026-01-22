---
id: M260
old_id: A054
slug: logical-or-of-two-binary-grids-represented-as-quad-trees
title: Logical OR of Two Binary Grids Represented as Quad-Trees
difficulty: medium
category: medium
topics: ["tree", "bfs", "bit-manipulation", "divide-and-conquer"]
patterns: ["level-order", "dp-2d", "recursion"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M261_maximum_depth_of_n_ary_tree", "M427_construct_quad_tree", "E100_same_tree"]
prerequisites: ["tree-traversal", "recursion", "bitwise-operations"]
strategy_ref: ../prerequisites/trees.md
---
# Logical OR of Two Binary Grids Represented as Quad-Trees

## Problem

Perform a bitwise OR operation on two binary matrices (containing only 0s and 1s) that are represented as quad-trees, then return the result as a quad-tree. A quad-tree is a hierarchical data structure that efficiently represents sparse 2D grids by recursively dividing regions into quadrants.

Each quad-tree node has two key properties: `val` (True if the region is all 1s, False if all 0s) and `isLeaf` (True for leaf nodes representing uniform regions, False for internal nodes with four children). Internal nodes have exactly four children: topLeft, topRight, bottomLeft, and bottomRight, representing the four quadrants of that region.

The quad-tree construction rule is: if all cells in a region have the same value, create a leaf node with that value. Otherwise, create an internal node and recursively divide the region into four equal quadrants. For example, a 4×4 grid with all 1s in the top-left quadrant and all 0s elsewhere would have a root with four children, each being a leaf.

The challenge is performing OR without converting back to grids. The key insight: if either tree has a leaf node with value 1 for a region, the OR result is 1 for that entire region (since 1 OR anything = 1). If both have leaf nodes with value 0, the result is 0. If one is a leaf with 0, the result is whatever the other tree has for that region. Only when both are internal nodes do you need to recursively OR the four quadrants.

After recursively computing the OR for all four children, optimize by checking if all children are identical leaf nodes. If so, merge them into a single leaf node to keep the quad-tree compressed.

## Why This Matters

Quad-trees are fundamental to image compression, geographic information systems, collision detection in games, and sparse matrix operations. Understanding how to perform operations directly on compressed tree representations (rather than decompressing to arrays) is crucial for efficiency in computer graphics and spatial databases. The recursive OR operation pattern generalizes to other tree-based operations like AND, XOR, and set operations on hierarchical data. This problem teaches you to think recursively about spatial decomposition and to optimize tree structures by merging uniform regions, skills that transfer to oct-trees (3D quad-trees) and other hierarchical spatial indexes.

## Examples

**Example 1:**
- Input: `quadTree1 = [[1,0]], quadTree2 = [[1,0]]`
- Output: `[[1,0]]`
- Explanation: Both quad-trees encode a 1x1 matrix containing a single zero. The OR operation on two zero matrices yields a 1x1 matrix with zero.

## Constraints

- quadTree1 and quadTree2 are both **valid** Quad-Trees each representing a n * n grid.
- n == 2x where 0 <= x <= 9.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding OR Operation on Quad-Trees</summary>

The key insight is that OR operations can be done recursively on quad-tree nodes without converting back to grids. Consider these cases:

1. If either node is a leaf with value 1, the result is a leaf with value 1 (since 1 OR anything = 1)
2. If both nodes are leaves with value 0, the result is a leaf with value 0
3. If one is a leaf with value 0, the result is the other tree (since 0 OR x = x)
4. If both are internal nodes, recursively OR their corresponding quadrants

This recursive structure is more efficient than grid conversion.
</details>

<details>
<summary>Hint 2: Recursion Base Cases</summary>

Handle these base cases in order:
```
1. If node1 is leaf with val=1: return node1 (or create new leaf with val=1)
2. If node2 is leaf with val=1: return node2 (or create new leaf with val=1)
3. If node1 is leaf with val=0: return node2
4. If node2 is leaf with val=0: return node1
5. Otherwise: recursively OR all four quadrants
```

After recursive OR on quadrants, check if all four children are leaves with the same value. If so, merge them into a single leaf.
</details>

<details>
<summary>Hint 3: Implementation Pattern</summary>

```python
# Pseudocode:
def or_quad_trees(q1, q2):
    # Base cases: if either is leaf
    if q1.isLeaf:
        return q1 if q1.val else q2
    if q2.isLeaf:
        return q2 if q2.val else q1

    # Recursive case: OR all four quadrants
    tl = or_quad_trees(q1.topLeft, q2.topLeft)
    tr = or_quad_trees(q1.topRight, q2.topRight)
    bl = or_quad_trees(q1.bottomLeft, q2.bottomLeft)
    br = or_quad_trees(q1.bottomRight, q2.bottomRight)

    # Optimization: merge if all children are identical leaves
    if all are leaves with same value:
        return new leaf with that value
    else:
        return new internal node with four children
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Recursive OR | O(n) | O(log n) | n = total nodes, log n = tree height for recursion stack |
| Grid Conversion | O(n²) | O(n²) | Convert to grid, OR, rebuild tree (very inefficient) |

## Common Mistakes

1. **Not handling the merge optimization**
```python
# Wrong: Always creating internal nodes
result = Node(False, False, tl, tr, bl, br)

# Correct: Merge identical leaf children
if tl.isLeaf and tr.isLeaf and bl.isLeaf and br.isLeaf:
    if tl.val == tr.val == bl.val == br.val:
        return Node(tl.val, True, None, None, None, None)
return Node(False, False, tl, tr, bl, br)
```

2. **Incorrect OR logic**
```python
# Wrong: Not handling leaf nodes properly
if q1.isLeaf and q2.isLeaf:
    return Node(q1.val or q2.val, True)  # Missing other cases

# Correct: Handle all cases including when only one is leaf
if q1.isLeaf:
    return Node(True, True) if q1.val else q2
```

3. **Modifying input trees**
```python
# Wrong: Modifying input nodes
q1.val = True
return q1

# Correct: Always create new nodes
return Node(True, True, None, None, None, None)
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Quad-Tree AND | Medium | Perform AND operation instead of OR |
| Quad-Tree XOR | Medium | Perform XOR operation on two quad-trees |
| Quad-Tree Intersection | Hard | Find common regions in multiple quad-trees |
| 3D Octree OR | Hard | Extend to 3D space with octrees |

## Practice Checklist

- [ ] Solve using recursive approach
- [ ] Implement merge optimization for identical children
- [ ] Handle edge case: both trees are single leaf nodes
- [ ] Handle edge case: one tree is all 1's
- [ ] **Day 3**: Solve again without hints
- [ ] **Week 1**: Implement AND operation variation
- [ ] **Week 2**: Solve from memory in under 25 minutes

**Strategy**: See [Tree Pattern](../prerequisites/trees.md)
