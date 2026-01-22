---
id: M189
old_id: I229
slug: flatten-a-multilevel-doubly-linked-list
title: Flatten a Multilevel Doubly Linked List
difficulty: medium
category: medium
topics: ["linked-list"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["E206", "M002", "M024"]
prerequisites: ["linked-list", "dfs", "pointer-manipulation"]
strategy_ref: ../prerequisites/linked-lists.md
---
# Flatten a Multilevel Doubly Linked List

## Problem

You're working with a specialized doubly linked list where each node has three pointers instead of the usual two: a `next` pointer to the next sibling node, a `prev` pointer to the previous sibling node, and a `child` pointer that can reference an entirely separate doubly linked list. This creates a multilevel hierarchical structure, like a nested outline or a tree laid sideways. The child lists themselves can have child pointers, creating arbitrary depth. Your task is to flatten this multilevel structure into a single-level doubly linked list while maintaining a specific order: whenever you encounter a node with a child list, that entire child sublist (including any nested children) must be spliced in immediately after the current node and before the original next node. Think of it like depth-first exploration where you dive deep into child lists before continuing with siblings. For example, if you have level 1 as `1 <-> 2 <-> 3` where node 2 has a child list `7 <-> 8`, and node 8 has a child list `11 <-> 12`, the flattened result should be `1 <-> 2 <-> 7 <-> 8 <-> 11 <-> 12 <-> 3`, exploring each child branch fully before returning to the main level. The challenge involves careful pointer manipulation: you need to save the original `next` pointer before inserting the child list, find the tail of the child sublist (which might be arbitrarily long), connect the tail back to the saved next node, update all bidirectional `prev` and `next` links, and crucially, set all child pointers to null in the final result. Edge cases include nodes with no children, nodes where child lists are at the end (no next sibling to reconnect to), and deeply nested multilevel structures testing your recursion or iteration depth.

## Why This Matters

Multilevel linked list flattening directly models data structure transformations in compilers, document processors, and hierarchical data serialization. When compilers flatten nested scopes (functions within classes within namespaces) into linear instruction sequences or symbol tables, they perform similar tree-to-list transformations. Document formats like HTML/XML with nested elements need flattening for text extraction or indexing—converting `<div><p><span>text</span></p></div>` hierarchies into linear token streams. File systems flatten nested directory trees for archiving (tar, zip files) or backup operations, preserving parent-child relationships in linear format. The depth-first insertion pattern mirrors how operating systems handle nested interrupt handlers or exception frames in call stacks. Database query optimizers flatten nested subqueries and correlated queries into linear execution plans. Memory allocators manage free lists with sublists for different size classes, occasionally needing to flatten hierarchies for defragmentation. Understanding how to maintain bidirectional links during complex pointer surgery is essential for implementing custom data structures, working with low-level memory management, and debugging pointer-intensive code. This problem strengthens your pointer manipulation skills and teaches you to handle state during traversals (tracking previous nodes, tail nodes, and saved next pointers), crucial for technical interviews and systems programming roles at companies building databases, compilers, or runtime systems.

**Diagram:**

Multilevel doubly linked list structure:
```
Level 1:  1 <-> 2 <-> 3 <-> 4 <-> 5 <-> 6
               |
Level 2:       7 <-> 8 <-> 9 <-> 10
                    |
Level 3:            11 <-> 12
```

After flattening (child lists inserted after parent):
```
1 <-> 2 <-> 7 <-> 8 <-> 11 <-> 12 <-> 9 <-> 10 <-> 3 <-> 4 <-> 5 <-> 6
```

Visual representation:
```
Before:
1---2---3---4---5---6
    |
    7---8---9---10
        |
        11--12

After:
1---2---7---8---11---12---9---10---3---4---5---6
```


## Why This Matters

Linked lists teach pointer manipulation and in-place modifications. Understanding node relationships is key to many advanced structures.

## Examples

**Example 1:**
- Input: `head = []`
- Output: `[]`
- Explanation: There could be empty list in the input.

## Constraints

- The number of Nodes will not exceed 1000.
- 1 <= Node.val <= 10⁵

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual Understanding</summary>
This problem is essentially a depth-first traversal of a tree-like structure represented as a linked list. When you encounter a child pointer, you need to insert the entire child sublist before continuing with the next pointer. Think about how DFS explores deep before going wide.
</details>

<details>
<summary>🎯 Hint 2: Pointer Management Strategy</summary>
The key is to maintain proper bidirectional links while inserting child lists. When you find a child, you need to: 1) Save the current next pointer, 2) Connect current to child, 3) Traverse to the end of the child sublist, 4) Connect child list end back to the saved next pointer. Use either recursion or an explicit stack.
</details>

<details>
<summary>📝 Hint 3: Iterative Algorithm</summary>
```
1. Initialize current pointer at head
2. While current is not null:
   - If current has a child:
     a. Save next_node = current.next
     b. Connect current.next to child
     c. Connect child.prev to current
     d. Find tail of child sublist (traverse until next is null)
     e. Connect tail.next to next_node
     f. If next_node exists, connect next_node.prev to tail
     g. Set current.child to null
   - Move current to current.next
3. Return head
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Iterative DFS | O(n) | O(1) | n = total nodes, optimal space |
| Recursive DFS | O(n) | O(d) | d = max depth of nesting, recursion stack |
| Stack-based | O(n) | O(d) | Explicit stack for tracking next pointers |

**Recommended approach**: Iterative DFS for optimal O(1) space complexity.

## Common Mistakes

**Mistake 1: Forgetting to update prev pointers**
```python
# Wrong: Only updates next pointers (breaks doubly-linked property)
def flatten(head):
    curr = head
    while curr:
        if curr.child:
            next_node = curr.next
            curr.next = curr.child  # Missing prev pointer update
            tail = curr.child
            while tail.next:
                tail = tail.next
            tail.next = next_node
            curr.child = None
        curr = curr.next
    return head
```

```python
# Correct: Updates both next and prev pointers
def flatten(head):
    curr = head
    while curr:
        if curr.child:
            next_node = curr.next
            curr.next = curr.child
            curr.child.prev = curr  # Update prev pointer
            tail = curr.child
            while tail.next:
                tail = tail.next
            tail.next = next_node
            if next_node:  # Update prev pointer of next_node
                next_node.prev = tail
            curr.child = None
        curr = curr.next
    return head
```

**Mistake 2: Not nullifying child pointers**
```python
# Wrong: Leaves child pointers intact
def flatten(head):
    curr = head
    while curr:
        if curr.child:
            next_node = curr.next
            curr.next = curr.child
            curr.child.prev = curr
            tail = curr.child
            while tail.next:
                tail = tail.next
            tail.next = next_node
            if next_node:
                next_node.prev = tail
            # Missing: curr.child = None
        curr = curr.next
    return head
```

```python
# Correct: Nullifies child pointers as required
def flatten(head):
    curr = head
    while curr:
        if curr.child:
            next_node = curr.next
            curr.next = curr.child
            curr.child.prev = curr
            tail = curr.child
            while tail.next:
                tail = tail.next
            tail.next = next_node
            if next_node:
                next_node.prev = tail
            curr.child = None  # Clear child pointer
        curr = curr.next
    return head
```

**Mistake 3: Incorrect tail finding logic**
```python
# Wrong: Stops at first null next, missing nested children
def flatten(head):
    curr = head
    while curr:
        if curr.child:
            next_node = curr.next
            curr.next = curr.child
            curr.child.prev = curr
            tail = curr.child
            while tail.next:  # Doesn't flatten nested children first
                tail = tail.next
            tail.next = next_node
            if next_node:
                next_node.prev = tail
            curr.child = None
        curr = curr.next
    return head
```

```python
# Correct: Recursively flatten or use stack for nested children
def flatten(head):
    if not head:
        return head

    stack = []
    curr = head

    while curr:
        if curr.child:
            if curr.next:
                stack.append(curr.next)  # Save next for later
            curr.next = curr.child
            curr.child.prev = curr
            curr.child = None

        if not curr.next and stack:
            next_node = stack.pop()
            curr.next = next_node
            next_node.prev = curr

        curr = curr.next

    return head
```

## Variations

| Variation | Difference | Key Insight |
|-----------|-----------|-------------|
| Single-linked multilevel | No prev pointers | Simpler - only update next pointers |
| Clone multilevel list | Deep copy required | Use hashmap to track original->copy mapping |
| Reverse flattening | Rebuild multilevel from flat | Identify level changes, reconstruct child pointers |
| K-level limit | Only flatten to depth k | Add depth parameter, stop at k levels |
| Breadth-first flattening | Level-order instead of DFS | Use queue, append children to level end |

## Practice Checklist

Use spaced repetition to master this problem:

- [ ] Day 1: Solve using iterative approach
- [ ] Day 2: Solve using recursive approach
- [ ] Day 4: Implement without looking at notes
- [ ] Day 7: Solve and trace through pointer updates on paper
- [ ] Day 14: Solve variations (single-linked, clone)
- [ ] Day 30: Speed test - solve in under 15 minutes

**Strategy**: See [Linked List Pattern](../prerequisites/linked-lists.md)
