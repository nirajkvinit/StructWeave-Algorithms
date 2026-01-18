---
id: M060
old_id: F147
slug: insertion-sort-list
title: Insertion Sort List
difficulty: medium
category: medium
topics: ["linked-list", "sorting"]
patterns: ["sorting"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M061", "M059", "E206"]
prerequisites: ["linked-list", "insertion-sort", "sorting"]
strategy_ref: ../strategies/data-structures/linked-lists.md
---
# Insertion Sort List

## Problem

You're given an unsorted linked list and need to sort it using the insertion sort algorithm. Insertion sort works by building a sorted list one element at a time. For each node in the original list, you find its correct position in the sorted portion and insert it there. Unlike sorting arrays where insertion sort can shift elements in-place, linked lists require careful pointer manipulation to remove nodes from the original list and insert them into their sorted positions. For example, given 4→2→1→3, you'd build a sorted list by inserting each node in order: start with 4, insert 2 before it (2→4), insert 1 at the beginning (1→2→4), and insert 3 between 2 and 4 (1→2→3→4). The challenge is maintaining pointers correctly while nodes are being rearranged. Using a dummy node simplifies edge cases where insertion happens at the beginning. Edge cases include already-sorted lists (best case, O(n) time), reverse-sorted lists (worst case, O(n²) time), and lists with duplicate values.

## Why This Matters

Insertion sort on linked lists demonstrates important pointer manipulation techniques used in merging sorted streams, maintaining sorted data structures with frequent insertions, and implementing priority queues using linked structures. While insertion sort has poor worst-case performance (O(n²)), it's efficient for small datasets and nearly-sorted data, making it useful in hybrid sorting algorithms like Timsort (used in Python and Java) which switch to insertion sort for small subarrays. Understanding how to adapt array-based algorithms to linked structures is crucial when working with memory allocators, file systems that use linked allocation, and scenarios where random access isn't available. This problem also teaches you when simpler algorithms are acceptable versus when you need more sophisticated approaches like merge sort.

## Constraints

- The number of nodes in the list is in the range [1, 5000].
- -5000 <= Node.val <= 5000

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Insertion Sort Fundamentals</summary>

In insertion sort for arrays, you maintain a sorted portion and repeatedly insert elements from the unsorted portion into their correct position. For linked lists, you can build a new sorted list by inserting nodes one at a time in sorted order.

</details>

<details>
<summary>🎯 Hint 2: Dummy Node Technique</summary>

Use a dummy node to simplify edge cases when inserting at the beginning of the sorted list. For each node in the original list, find its correct position in the sorted list by traversing from the dummy node.

</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>

**Setup:** Create dummy node pointing to null (this will be head of sorted list)

**For each node in original list:**
1. Save next pointer (current node will be moved)
2. Find insertion position in sorted list
   - Start from dummy
   - Advance while next value < current value
3. Insert current node after found position
4. Move to next node in original list

**Return:** dummy.next (head of sorted list)

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Convert to Array | O(n log n) | O(n) | Sort array, rebuild list |
| **Insertion Sort** | **O(n²)** | **O(1)** | Build sorted list by insertion |
| Merge Sort | O(n log n) | O(log n) | Better time, uses recursion stack |

## Common Mistakes

### 1. Losing Track of Next Pointer
```python
# WRONG: Current node's next is overwritten before saving
def insertionSortList(head):
    dummy = ListNode(0)
    current = head
    while current:
        prev = dummy
        # ... find position ...
        current.next = prev.next  # Lost original next!
        prev.next = current
        current = current.next  # Wrong node!
```

```python
# CORRECT: Save next pointer before modifying
def insertionSortList(head):
    dummy = ListNode(0)
    current = head
    while current:
        next_temp = current.next  # Save it!
        prev = dummy
        # ... find position ...
        current.next = prev.next
        prev.next = current
        current = next_temp  # Use saved pointer
```

### 2. Not Resetting Search Position
```python
# WRONG: Continuing from last position (only works for already sorted)
def insertionSortList(head):
    dummy = ListNode(0)
    prev = dummy  # Reused across iterations
    current = head
    while current:
        # prev should reset to dummy each time!
```

```python
# CORRECT: Start from beginning for each insertion
def insertionSortList(head):
    dummy = ListNode(0)
    current = head
    while current:
        prev = dummy  # Reset for each node!
        next_temp = current.next
        # ... find position and insert ...
        current = next_temp
```

### 3. Incorrect Insertion Position Logic
```python
# WRONG: Comparing with prev instead of prev.next
def insertionSortList(head):
    while prev and prev.val < current.val:
        prev = prev.next  # Wrong comparison!
```

```python
# CORRECT: Check next node's value
def insertionSortList(head):
    while prev.next and prev.next.val < current.val:
        prev = prev.next  # Correct!
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Descending order | Sort largest to smallest | Flip comparison in insertion logic |
| Stable sort required | Preserve relative order of equals | Insertion sort is already stable |
| K-sorted list | Each element at most K positions away | Optimize by limiting search distance |
| Remove duplicates while sorting | Keep only unique values | Skip insertion if value exists |

## Practice Checklist

- [ ] Handles single node list
- [ ] Handles already sorted list
- [ ] Handles reverse sorted list
- [ ] Handles duplicates
- [ ] Can explain why O(n²) time complexity
- [ ] Can draw pointer changes on paper
- [ ] Can code solution in 20 min
- [ ] Can discuss time/space complexity

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Linked List Pattern](../../strategies/data-structures/linked-lists.md)
