---
id: M140
old_id: I130
slug: verify-preorder-serialization-of-a-binary-tree
title: Verify Preorder Serialization of a Binary Tree
difficulty: medium
category: medium
topics: ["string", "tree", "stack"]
patterns: ["preorder-traversal", "degree-counting"]
estimated_time_minutes: 30
strategy_ref: ../prerequisites/trees.md
frequency: medium
related_problems: ["E297", "M105", "M106"]
prerequisites: ["tree-traversal", "stack-operations", "string-parsing"]
---
# Verify Preorder Serialization of a Binary Tree

## Problem

Binary trees can be serialized into strings using preorder traversal, where you visit the root first, then recursively traverse the left subtree, then the right subtree. When you encounter an actual node, you record its value. When you encounter a null child (a missing left or right child), you record a sentinel marker like `'#'` to indicate "no node here."

For example, a tree with root 9, left child 3, and right child 2 would serialize as `"9,3,#,#,2,#,#"` if both 3 and 2 are leaf nodes (each has two null children). The preorder walk goes: visit 9, go left to 3, try to go left (null, record '#'), try to go right (null, record '#'), back to 9, go right to 2, try to go left (null, record '#'), try to go right (null, record '#'). Your task is to determine whether a given comma-separated string represents a valid preorder serialization of some binary tree. Return `true` if the string could have come from serializing a valid tree, or `false` if the pattern is impossible. Here's the catch: you're explicitly prohibited from actually reconstructing the tree in memory. You must validate the structure using only constant or linear space, analyzing the string pattern itself. The input format is guaranteed to be well-formed (values separated by commas, only integers or '#' characters), so you don't need to worry about malformed strings like `"1,,3"`. The core challenge is recognizing what structural properties a valid serialization must satisfy, such as the relationship between node count, null markers, and tree structure constraints.

## Why This Matters

This problem teaches you to validate data structures through their invariants without full reconstruction, a critical skill in many domains. Compilers validate syntax trees from token streams without building the full AST first. Network protocols validate packet structure by checking header constraints without buffering entire messages. Database systems validate index structures by checking node relationships without loading entire B-trees. The specific technique here, tracking "slots" or "degrees" to validate tree structure, generalizes to many validation scenarios where you need to ensure supply matches demand: memory allocators track outstanding allocations, reference counting systems track object ownership, and transaction systems track open/closed operations. The stack-based approach to validation (matching patterns and reducing) mirrors how parsers recognize valid syntax in programming languages. Understanding how to encode structural constraints as simple counters or patterns lets you write efficient validators that reject invalid data early, before expensive processing begins. This problem also demonstrates the power of graph theory concepts like node degree applied to practical problems, bridging theoretical computer science and applied algorithm design.

## Examples

**Example 1:**
- Input: `preorder = "9,3,4,#,#,1,#,#,2,#,6,#,#"`
- Output: `true`

**Example 2:**
- Input: `preorder = "1,#"`
- Output: `false`

**Example 3:**
- Input: `preorder = "9,#,#,1"`
- Output: `false`

## Constraints

- 1 <= preorder.length <= 10⁴
- preorder consist of integers in the range [0, 100] and '#' separated by commas ','.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding In-degree and Out-degree</summary>

In a binary tree, think about each node's "demand" (in-degree) and "supply" (out-degree). Each non-null node needs 1 incoming edge from its parent and provides 2 outgoing edges to its children. Each null node needs 1 incoming edge but provides 0 outgoing. Can you track the balance between available slots and used slots as you process the serialization?

</details>

<details>
<summary>🎯 Hint 2: Slot Counting Approach</summary>

Start with 1 available slot (for the root). As you process each node:
- Every node (null or non-null) consumes 1 slot
- Every non-null node creates 2 new slots (for its children)
- Every null node creates 0 new slots

Track available slots throughout. The serialization is valid if you end with exactly 0 slots and never go negative.

</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>

```
1. Split string by commas to get nodes
2. Initialize slots = 1 (one slot for root)
3. For each node in nodes:
   a. Decrement slots (consume one slot)
   b. If slots < 0: return false (too many nodes)
   c. If node != '#': slots += 2 (non-null adds two children slots)
4. Return slots == 0 (all slots filled, no extras)
```

Alternative stack approach:
```
1. Use stack to simulate tree building
2. Push nodes onto stack
3. When you see pattern [number, #, #], it's a complete leaf
4. Replace this pattern with single # (leaf becomes null after processing)
5. Repeat until one element remains
6. Valid if final element is single #
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Build Tree | O(n) | O(n) | Actually construct tree, violates constraint |
| Recursion | O(n) | O(n) | Recursive parsing with call stack |
| **Slot Counting** | **O(n)** | **O(1)** | **Track available slots, optimal space** |
| Stack Simulation | O(n) | O(n) | Simulate tree building with pattern matching |

The slot counting approach is optimal with O(1) space, avoiding the stack overhead of other methods.

## Common Mistakes

### Mistake 1: Not Checking for Negative Slots

**Wrong Approach:**
```python
# Only checking final count, missing intermediate violations
def is_valid_serialization(preorder):
    nodes = preorder.split(',')
    slots = 1

    for node in nodes:
        slots -= 1
        if node != '#':
            slots += 2

    return slots == 0  # Wrong: misses cases where slots go negative
```

**Correct Approach:**
```python
# Check slots after each decrement
def is_valid_serialization(preorder):
    nodes = preorder.split(',')
    slots = 1

    for node in nodes:
        slots -= 1
        if slots < 0:  # Correct: catch too many nodes early
            return False
        if node != '#':
            slots += 2

    return slots == 0
```

### Mistake 2: Processing Order Error

**Wrong Approach:**
```python
# Adding slots before consuming
def is_valid_serialization(preorder):
    nodes = preorder.split(',')
    slots = 1

    for node in nodes:
        if node != '#':
            slots += 2  # Wrong: add before consume
        slots -= 1
        if slots < 0:
            return False

    return slots == 0
```

**Correct Approach:**
```python
# Consume slot first, then add new slots
def is_valid_serialization(preorder):
    nodes = preorder.split(',')
    slots = 1

    for node in nodes:
        slots -= 1  # Correct: consume first
        if slots < 0:
            return False
        if node != '#':
            slots += 2  # Then add children slots

    return slots == 0
```

### Mistake 3: Incorrect Initial Slots

**Wrong Approach:**
```python
# Starting with 0 or 2 slots
def is_valid_serialization(preorder):
    nodes = preorder.split(',')
    slots = 0  # Wrong: root needs a slot!

    for node in nodes:
        if node != '#':
            slots += 2
        slots -= 1
        if slots < 0:
            return False

    return slots == 0
```

**Correct Approach:**
```python
# Start with 1 slot for the root
def is_valid_serialization(preorder):
    nodes = preorder.split(',')
    slots = 1  # Correct: one slot for root

    for node in nodes:
        slots -= 1
        if slots < 0:
            return False
        if node != '#':
            slots += 2

    return slots == 0
```

## Variations

| Variation | Difference | Key Insight |
|-----------|------------|-------------|
| Verify Postorder Serialization | Process in postorder | Process from end to start, track parent slots |
| Verify Level Order | Level-by-level format | Use queue to track expected nodes per level |
| Reconstruct Tree from Preorder | Build actual tree | Use recursion with index tracking |
| Serialize and Deserialize BST | Include BST property | Can optimize by removing null markers |
| Verify with Different Null Marker | Use 'null' or 'None' | Same algorithm, different string comparison |

## Practice Checklist

- [ ] Implement slot counting solution
- [ ] Implement stack simulation solution
- [ ] Handle edge case: single "#"
- [ ] Handle edge case: single number without children
- [ ] Test with complete binary tree
- [ ] Test with skewed tree (all left or all right)
- [ ] Test with invalid early termination
- [ ] Test with too many nodes
- [ ] Verify O(n) time complexity
- [ ] Code without looking at solution

**Spaced Repetition Schedule:**
- First review: 24 hours
- Second review: 3 days
- Third review: 1 week
- Fourth review: 2 weeks
- Fifth review: 1 month

**Strategy**: See [String Pattern](../prerequisites/trees.md)
