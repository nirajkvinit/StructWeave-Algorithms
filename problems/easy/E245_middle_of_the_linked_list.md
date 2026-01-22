---
id: E245
old_id: A343
slug: middle-of-the-linked-list
title: Middle of the Linked List
difficulty: easy
category: easy
topics: ["linked-list", "two-pointers"]
patterns: ["two-pointers", "fast-slow-pointers"]
estimated_time_minutes: 15
frequency: high
prerequisites: ["linked-list-basics", "pointer-manipulation"]
related_problems: ["E021", "E141", "E160"]
strategy_ref: ../prerequisites/linked-lists.md
---
# Middle of the Linked List

## Problem

Given the `head` of a singly linked list, your task is to find and return the middle node of the list. A singly linked list is a data structure where each node contains a value and a pointer to the next node, forming a chain from head to tail (null).

Let's clarify what "middle" means. For a list with an odd number of nodes, the middle is unambiguous. For example, in the list `[1, 2, 3, 4, 5]`, node 3 is exactly in the middle (two nodes before, two nodes after). However, when the list has an even number of nodes, there are two potential middle nodes. For instance, in `[1, 2, 3, 4, 5, 6]`, both node 3 and node 4 could be considered middle. The problem specifies that in such cases, you should return the second of the two middle nodes (node 4 in this example).

The straightforward approach would be to traverse the list once to count the total number of nodes, then traverse again to reach the middle position. However, there's a more elegant solution using two pointers moving at different speeds, known as Floyd's tortoise and hare algorithm. This allows you to find the middle in a single pass through the list.

Key edge cases to consider: a single-node list (return that node), a two-node list (return the second node), and understanding when to stop the fast pointer to avoid null reference errors.

**Diagram:**

Example 1 (odd number of nodes):
```
Input: [1, 2, 3, 4, 5]

1 -> 2 -> 3 -> 4 -> 5 -> null
          ^
        middle

Output: Node with value 3
```

Example 2 (even number of nodes):
```
Input: [1, 2, 3, 4, 5, 6]

1 -> 2 -> 3 -> 4 -> 5 -> 6 -> null
               ^
            middle (2nd of two middle nodes)

Output: Node with value 4
```


## Why This Matters

Linked lists are fundamental data structures that teach pointer manipulation, a critical skill for systems programming and understanding how memory works. The fast-slow pointer technique (Floyd's algorithm) you'll learn here is not just useful for finding the middle - it's the foundation for many advanced linked list algorithms including cycle detection, finding the start of a cycle, checking for palindromes, and reordering lists. This pattern appears frequently in technical interviews because it demonstrates understanding of pointer relationships and the ability to optimize space complexity. In practice, linked list concepts apply to memory management systems, implementation of undo/redo functionality, browser history navigation, music playlist management, and blockchain data structures. The mathematical relationship between pointers moving at different speeds (when fast travels 2n steps, slow travels n steps) is an elegant example of using invariants to solve problems efficiently.

## Constraints

- The number of nodes in the list is in the range [1, 100].
- 1 <= Node.val <= 100

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1 - Conceptual Foundation
The straightforward approach is to count the total number of nodes, then traverse to the middle position (count/2). But can you find the middle in a single pass? Consider using two pointers moving at different speeds. What happens when one moves twice as fast as the other?

### Hint 2 - Two Pointer Strategy
Use a "slow" pointer that moves one step at a time and a "fast" pointer that moves two steps at a time. When the fast pointer reaches the end of the list, where is the slow pointer? Think about the relationship: if fast has traveled 2n steps, slow has traveled n steps.

### Hint 3 - Implementation Strategy
Initialize both slow and fast pointers to head. Move slow one step and fast two steps in each iteration. Stop when fast reaches null (odd length list) or fast.next is null (even length list). At this point, slow points to the middle node. Return slow.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Two-Pass (Count then Traverse) | O(n) | O(1) | Count nodes, then go to middle position |
| Fast-Slow Pointers | O(n) | O(1) | Single pass, two pointers at different speeds |
| Array Conversion | O(n) | O(n) | Convert to array, access middle index - inefficient |

## Common Mistakes

### Mistake 1: Wrong Fast Pointer Termination
```python
# INCORRECT: Doesn't handle both odd and even length lists
def middle_node(head):
    slow = fast = head
    while fast:  # Wrong: doesn't check fast.next
        slow = slow.next
        fast = fast.next.next  # ERROR: fast.next might be None
    return slow
```
**Why it's wrong:** When the list has even length, fast.next might be None, causing fast.next.next to throw an error. The loop condition must check both fast and fast.next.

**Correct approach:**
```python
# CORRECT: Properly checks both fast and fast.next
def middle_node(head):
    slow = fast = head
    while fast and fast.next:  # Check both conditions
        slow = slow.next
        fast = fast.next.next
    return slow
```

### Mistake 2: Returning Wrong Node for Even Length
```python
# INCORRECT: Returns first of two middle nodes
def middle_node(head):
    slow = fast = head
    prev = None
    while fast and fast.next:
        prev = slow
        slow = slow.next
        fast = fast.next.next
    # For even length, this returns the first middle node
    return prev if fast else slow  # Wrong logic
```
**Why it's wrong:** The problem specifies returning the second of two middle nodes for even-length lists. The standard fast-slow pointer naturally gives us the second middle node, no need for extra logic.

**Correct approach:**
```python
# CORRECT: Returns second middle node naturally
def middle_node(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow  # Always returns the correct middle
```

### Mistake 3: Off-by-One Error in Count Method
```python
# INCORRECT: Wrong middle calculation
def middle_node(head):
    count = 0
    curr = head
    while curr:
        count += 1
        curr = curr.next

    # Move to middle
    middle_pos = count // 2 + 1  # Wrong: adds 1 unnecessarily
    curr = head
    for _ in range(middle_pos):
        curr = curr.next
    return curr
```
**Why it's wrong:** For a list of length 5, count//2 = 2, which means move 2 steps from index 0 to reach index 2 (the third node). Adding 1 makes it 3 steps, reaching index 3 instead.

**Correct approach:**
```python
# CORRECT: Proper middle calculation
def middle_node(head):
    count = 0
    curr = head
    while curr:
        count += 1
        curr = curr.next

    middle_pos = count // 2  # Correct: no need to add 1
    curr = head
    for _ in range(middle_pos):
        curr = curr.next
    return curr
```

## Problem Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Linked List Cycle Detection | Easy | Detect if list has a cycle using fast-slow pointers |
| Cycle Start Detection | Medium | Find the node where cycle begins |
| Palindrome Linked List | Easy | Find middle, reverse second half, compare |
| Reorder List | Medium | Find middle, reverse second half, merge alternately |
| Delete Middle Node | Medium | Find and remove the middle node |
| Kth Node from End | Easy | Use two pointers with K gap |

## Practice Checklist

- [ ] First solve: Implement two-pass solution (count then traverse)
- [ ] Optimize: Implement fast-slow pointer solution
- [ ] Handle edge cases: Single node, two nodes, odd/even lengths
- [ ] Review after 1 day: Explain why fast-slow pointers work
- [ ] Review after 1 week: Implement from scratch without hints
- [ ] Interview ready: Extend to cycle detection and other variants

## Strategy

**Pattern**: Fast-Slow Pointers (Floyd's Algorithm)
- Master the two-pointer technique at different speeds
- Understand the mathematical relationship (fast = 2 * slow)
- Learn to handle null pointer edge cases

See [Linked List Pattern](../prerequisites/linked-lists.md) for the complete strategy guide.
