---
id: M344
old_id: A175
slug: insert-into-a-sorted-circular-linked-list
title: Insert into a Sorted Circular Linked List
difficulty: medium
category: medium
topics: ["linked-list"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems:
  - M343_design_linked_list.md
  - E002_reverse_linked_list.md
  - M015_add_two_numbers.md
prerequisites:
  - linked-lists
  - circular-structures
  - edge-case-handling
strategy_ref: ../strategies/data-structures/linked-lists.md
---
# Insert into a Sorted Circular Linked List

## Problem

You're given a reference to a node in a sorted circular linked list and need to insert a new value while maintaining both the sorted order and circular structure.

A circular linked list is one where the last node points back to the first node instead of pointing to null, forming a continuous loop. In this problem, the list is sorted in non-descending order, meaning each node's value is less than or equal to the next node's value as you traverse the circle.

The tricky part is that the reference you receive could point to any node in the list, not necessarily the smallest value or the head. You need to find the correct insertion position by traversing the circular structure.

There are three main scenarios to consider:
1. The new value fits between two existing nodes in the sorted sequence
2. The new value should be inserted at the boundary where the list wraps around (between the maximum and minimum values)
3. All existing values are identical, so you can insert anywhere

For an empty list (when the node reference is `null`), create a new single-node circular list where the node points to itself, and return that reference. For non-empty lists, return the originally provided node reference after performing the insertion.

Be careful with the circular nature. If you're not careful with your traversal condition, you might loop forever or miss the correct insertion point.


**Diagram:**

Before insertion:
```
   ┌───┐    ┌───┐    ┌───┐
   │ 3 │───>│ 4 │───>│ 1 │
   └───┘    └───┘    └───┘
     ^                  │
     └──────────────────┘
     (circular connection)
```

After inserting value 2:
```
   ┌───┐    ┌───┐    ┌───┐    ┌───┐
   │ 3 │───>│ 4 │───>│ 1 │───>│ 2 │
   └───┘    └───┘    └───┘    └───┘
     ^                            │
     └────────────────────────────┘
     (circular connection)
```


## Why This Matters

Circular linked lists are used in round-robin scheduling algorithms for CPU task management, circular buffers in audio/video streaming, and multiplayer game turn systems. This problem specifically teaches you to handle complex edge cases and boundary conditions, skills that distinguish robust production code from fragile prototypes. The pattern of detecting wrap-around points appears in many circular data structure problems, from circular arrays to ring buffers used in high-performance networking.

## Examples

**Example 1:**
- Input: `head = [], insertVal = 1`
- Output: `[1]`
- Explanation: Starting with an empty list (head is `null`), we construct a new circular list containing a single node.

**Example 2:**
- Input: `head = [1], insertVal = 0`
- Output: `[1,0]`

## Constraints

- The number of nodes in the list is in the range [0, 5 * 10⁴].
- -10⁶ <= Node.val, insertVal <= 10⁶

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Identify Insertion Cases</summary>

There are three main insertion scenarios in a sorted circular list:

1. **Middle insertion**: `current.val <= insertVal <= current.next.val`
   - Standard sorted insertion between two nodes

2. **Boundary insertion**: Insert at the wrap-around point (between max and min)
   - When `current.val > current.next.val` (found the max→min transition)
   - And `insertVal >= current.val` (new max) OR `insertVal <= current.next.val` (new min)

3. **All values equal** or **single valid position**:
   - After full circle, insert anywhere (all nodes have same value)

The challenge is handling the circular wrap-around correctly.
</details>

<details>
<summary>Hint 2: Traverse with Termination Condition</summary>

Algorithm structure:
```
current = head
while True:
    # Check if we should insert between current and current.next
    if (case 1: middle) or (case 2: boundary) or (case 3: full circle):
        insert between current and current.next
        break

    current = current.next

    # Termination: made full circle
    if current == head:
        # All values same, insert anywhere
        break
```

Key insight: Use `current == head` to detect when you've made a complete circle without finding a standard insertion point.
</details>

<details>
<summary>Hint 3: Handle Special Cases First</summary>

Handle these cases before the main loop:

1. **Empty list** (`head is None`):
   - Create new node, point it to itself
   - Return new node

2. **Single node**:
   - Insert after the node, update both next pointers
   - Return original head

These simplifications make the main algorithm cleaner.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Linear Scan | O(n) | O(1) | Traverse circular list once, worst case full circle |
| Optimized with Early Termination | O(n) | O(1) | Can terminate early on sorted boundaries |

## Common Mistakes

### Mistake 1: Infinite Loop Without Proper Termination
```python
# DON'T: No termination condition for full circle
def insert(head: 'Node', insertVal: int) -> 'Node':
    if not head:
        # ... handle empty list
        pass

    current = head
    # Problem: while True without checking if we've circled back
    while True:
        if current.val <= insertVal <= current.next.val:
            # Insert here
            break
        current = current.next
    # Problem: May loop forever if insertVal doesn't fit standard cases
```

**Why it's wrong:** If all values are the same or insertVal is an outlier, the loop never terminates.

**Fix:** Add `if current.next == head: break` to detect full circle.

### Mistake 2: Not Handling Boundary (Max→Min) Transition
```python
# DON'T: Only check standard sorted insertion
def insert(head: 'Node', insertVal: int) -> 'Node':
    current = head
    while current.next != head:
        # Problem: only handles middle insertion
        if current.val <= insertVal <= current.next.val:
            new_node = Node(insertVal, current.next)
            current.next = new_node
            return head
        current = current.next
    return head
# Problem: Fails for values at boundaries (new min/max)
```

**Why it's wrong:** In circular list [3,4,1,2], inserting 0 or 5 requires detecting the 4→1 transition (max→min boundary).

**Fix:** Check `if current.val > current.next.val` to find boundary, then handle insertVal as potential new min/max.

### Mistake 3: Incorrect Pointer Updates
```python
# DON'T: Wrong order of pointer assignments
def insert(head: 'Node', insertVal: int) -> 'Node':
    # ... find insertion point
    current = insertion_point

    # Problem: loses reference to current.next
    current.next = Node(insertVal)
    current.next.next = current.next  # Wrong: assigns to itself!
# Problem: Breaks the circular link
```

**Why it's wrong:** Assigning `current.next = Node(insertVal)` before saving the old `current.next` loses the reference to the rest of the list.

**Fix:** Save old next first: `new_node = Node(insertVal, current.next); current.next = new_node`.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Circular List Detection | Detect if a linked list is circular (Floyd's algorithm) | Easy |
| Find Minimum in Circular Sorted List | Locate the minimum value node | Medium |
| Merge Two Circular Sorted Lists | Combine two circular lists maintaining sort order | Hard |
| Delete from Circular List | Remove a value while maintaining circular structure | Medium |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Identified all three insertion cases (middle, boundary, equal)
- [ ] Implemented full circle detection
- [ ] Tested edge cases: empty list, single node, all same values, new min/max
- [ ] Verified circular structure maintained after insertion
- [ ] Analyzed time/space complexity
- [ ] **Day 1-3:** Revisit and implement without reference
- [ ] **Week 1:** Solve circular list detection problem
- [ ] **Week 2:** Implement merge for circular sorted lists

**Strategy**: See [Linked List Pattern](../strategies/data-structures/linked-lists.md)
