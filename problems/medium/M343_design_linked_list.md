---
id: M343
old_id: A174
slug: design-linked-list
title: Design Linked List
difficulty: medium
category: medium
topics: ["linked-list"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems:
  - M344_insert_into_a_sorted_circular_linked_list.md
  - E002_reverse_linked_list.md
  - M015_add_two_numbers.md
prerequisites:
  - linked-lists
  - pointer-manipulation
  - object-oriented-design
strategy_ref: ../strategies/data-structures/linked-lists.md
---
# Design Linked List

## Problem

Design and implement your own linked list data structure from scratch. You can choose between two variants: singly-linked or doubly-linked.

A linked list is a sequential data structure where elements (called nodes) are connected via pointers rather than stored contiguously in memory like arrays. This structure allows for efficient insertion and deletion at any position without shifting elements.

In a singly-linked list, each node contains two properties: `val` (storing the node's data) and `next` (a pointer/reference to the following node in the sequence). The last node's `next` points to null.

In a doubly-linked list, each node has an additional `prev` pointer referencing the preceding node, allowing bidirectional traversal. This adds flexibility but uses more memory.

All node positions use 0-based indexing. Your `MyLinkedList` class must implement these operations:

- `MyLinkedList()` - Initializes an empty linked list
- `int get(int index)` - Returns the value at the specified position, or `-1` if the index is invalid
- `void addAtHead(int val)` - Inserts a new node with value `val` at the beginning, making it the new head
- `void addAtTail(int val)` - Appends a new node with value `val` at the end of the list
- `void addAtIndex(int index, int val)` - Inserts a node at the specified position. If index equals the list length, append to the end. If index exceeds the length, do nothing
- `void deleteAtIndex(int index)` - Removes the node at the given position if valid

Note that managing pointers correctly is critical. Losing a reference to a node means losing access to the rest of the list.

## Why This Matters

Linked lists are the foundation for implementing stacks, queues, and more complex structures like LRU caches used in web browsers and databases. Understanding pointer manipulation from this problem is essential for working with graphs, trees, and memory management in systems programming. Many real-world applications like music playlists, browser history (back/forward navigation), and undo/redo functionality are built on linked list principles. This problem also appears frequently in technical interviews as it tests your ability to handle edge cases, manage state, and work with references rather than indices.

## Constraints

- 0 <= index, val <= 1000
- Please do not use the built-in LinkedList library.
- At most 2000 calls will be made to get, addAtHead, addAtTail, addAtIndex and deleteAtIndex.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Singly vs Doubly Linked List Trade-offs</summary>

**Singly-linked list:**
- Simpler implementation with less memory (one pointer per node)
- Traversal only forward
- Deletion requires tracking previous node
- O(n) for operations at tail without tail pointer

**Doubly-linked list:**
- More memory (two pointers per node)
- Bidirectional traversal
- Easier deletion (access to prev node)
- Simpler implementation for some operations

Choose based on operation frequency: if you need frequent tail operations or backward traversal, use doubly-linked.
</details>

<details>
<summary>Hint 2: Maintain Size and Sentinel Nodes</summary>

Two key optimizations:
1. **Track size:** Maintain a `size` variable to validate indices in O(1) instead of traversing
2. **Sentinel nodes (optional):** Use dummy head and tail nodes to eliminate edge cases

With sentinel nodes:
```
dummy_head <-> node1 <-> node2 <-> dummy_tail
```

This eliminates special handling for empty lists and operations at head/tail.

Size tracking: increment on insert, decrement on delete.
</details>

<details>
<summary>Hint 3: Handle Edge Cases in Each Operation</summary>

Common edge cases per operation:
- **get(index)**: Check `index < 0 or index >= size`
- **addAtHead**: Update head pointer, handle empty list
- **addAtTail**: Update tail pointer, handle empty list
- **addAtIndex**: Check bounds, handle insert at 0 (head) and size (tail)
- **deleteAtIndex**: Check bounds, handle single-node list, update head/tail

With sentinel nodes, most edge cases disappear. Without them, carefully update head/tail pointers.
</details>

## Complexity Analysis

| Approach | Operation | Time Complexity | Space Complexity | Notes |
|----------|-----------|----------------|------------------|-------|
| Singly-Linked (no tail) | addAtHead | O(1) | O(1) | Direct head update |
| Singly-Linked (no tail) | addAtTail | O(n) | O(1) | Traverse to end |
| Singly-Linked (with tail) | addAtTail | O(1) | O(1) | Direct tail update |
| Singly-Linked | get/addAtIndex | O(n) | O(1) | Traverse to index |
| Doubly-Linked | All operations | O(n) worst | O(1) | Can traverse from nearest end |

## Common Mistakes

### Mistake 1: Not Maintaining Size Variable
```python
# DON'T: Traverse to check size each time
class MyLinkedList:
    def __init__(self):
        self.head = None

    def addAtIndex(self, index: int, val: int) -> None:
        # Problem: counting size on every call
        size = 0
        current = self.head
        while current:
            size += 1
            current = current.next

        if index > size:
            return
        # ... rest of insertion logic
# Problem: O(n) just to validate index
```

**Why it's wrong:** Computing size on every operation adds unnecessary O(n) overhead.

**Fix:** Maintain `self.size` and update it on insert/delete.

### Mistake 2: Incorrect Pointer Updates in Deletion
```python
# DON'T: Lose reference to next node
class MyLinkedList:
    def deleteAtIndex(self, index: int) -> None:
        if index == 0:
            self.head = self.head.next
            return

        current = self.head
        for _ in range(index - 1):
            current = current.next

        # Problem: doesn't check if current.next exists
        current.next = current.next.next  # Crashes if current.next is None!
# Problem: Missing validation
```

**Why it's wrong:** If index is at or beyond the end, `current.next` is None, causing AttributeError.

**Fix:** Validate `current and current.next` before deletion.

### Mistake 3: Not Updating Tail on Insert/Delete
```python
# DON'T: Forget to maintain tail pointer
class MyLinkedList:
    def __init__(self):
        self.head = None
        self.tail = None

    def addAtTail(self, val: int) -> None:
        new_node = Node(val)
        if not self.head:
            self.head = new_node
            self.tail = new_node
        else:
            self.tail.next = new_node
            # Missing: self.tail = new_node

    def deleteAtIndex(self, index: int) -> None:
        # ... deletion logic
        # Problem: doesn't update tail if last node deleted
        pass
# Problem: Tail pointer becomes stale
```

**Why it's wrong:** After operations, `tail` may not point to the actual last node, breaking subsequent operations.

**Fix:** Always update `self.tail` when modifying the last node.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Circular Linked List | Last node points back to head | Medium |
| Skip List | Multi-level linked list for O(log n) search | Hard |
| LRU Cache | Combine doubly-linked list with hash map | Medium |
| Memory-Efficient Doubly-Linked | Use XOR of prev and next (space optimization) | Hard |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Implemented singly-linked list version
- [ ] Implemented doubly-linked list version
- [ ] Added sentinel nodes optimization
- [ ] Tested all methods with edge cases: empty list, single node, operations at head/tail
- [ ] Analyzed time/space complexity for each operation
- [ ] **Day 1-3:** Revisit and implement without reference
- [ ] **Week 1:** Implement LRU Cache using your linked list
- [ ] **Week 2:** Study skip lists and advanced linked structures

**Strategy**: See [Linked List Pattern](../strategies/data-structures/linked-lists.md)
