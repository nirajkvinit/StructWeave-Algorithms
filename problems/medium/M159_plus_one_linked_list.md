---
id: M159
old_id: I168
slug: plus-one-linked-list
title: Plus One Linked List
difficulty: medium
category: medium
topics: ["linked-list"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../prerequisites/linked-lists.md
frequency: medium
related_problems: ["E066", "E002", "M445"]
prerequisites: ["linked-list-traversal", "carry-propagation", "list-reversal"]
---
# Plus One Linked List

## Problem

Picture a linked list as a chain of digit-carrying nodes that together represent a large integer. Each node holds a single digit (0-9), and the list is arranged with the most significant digit at the head, just like how you'd write a number on paper: the leftmost digit has the highest place value. For example, the linked list 1 → 2 → 3 represents the number 123. Your task is to increment this number by one and return the modified linked list. So 123 would become 124, which means the linked list becomes 1 → 2 → 4. The main challenge is handling the carry propagation that happens in addition: if the number is 199, adding one gives 200, and the carry ripples all the way from the rightmost digit to the left. Even trickier, if the number is 999, adding one gives 1000, which means you need to create a new head node. The problem is that linked lists are naturally traversed from left to right (head to tail), but addition with carries works from right to left (least significant digit to most significant digit). You need to either find a way to access the list backwards, or cleverly transform the problem so you can work left-to-right. Edge cases include single-node lists (like just [9] becoming [1, 0]), lists representing zero ([0] becoming [1]), and the all-9s case ([9, 9, 9] becoming [1, 0, 0, 0]) which is the most interesting because it requires creating a new head node.

## Why This Matters

This problem directly models arbitrary-precision arithmetic libraries (like Python's built-in support for huge integers or Java's BigInteger class) that represent numbers too large for standard integer types by storing digits in linked data structures. When you add massive numbers in cryptography - like the 2048-bit keys used in RSA encryption - the implementation uses exactly this kind of digit-by-digit addition with carry propagation. The techniques you learn here (reversing lists, stack-based processing, or recursive carry handling) are fundamental in implementing calculators and spreadsheet applications that need to perform arithmetic on numbers with thousands of digits. This pattern also appears in version numbering systems (incrementing 1.9.9 to 2.0.0 requires similar carry logic), in odometer implementations (mechanical or digital counters that roll over), and in financial systems that process transactions in decimal representations to avoid floating-point rounding errors. Understanding pointer manipulation and in-place modification is also crucial for memory-efficient algorithms in embedded systems and high-performance computing.

## Examples

**Example 1:**
- Input: `head = [1,2,3]`
- Output: `[1,2,4]`

**Example 2:**
- Input: `head = [0]`
- Output: `[1]`

## Constraints

- The number of nodes in the linked list is in the range [1, 100].
- 0 <= Node.val <= 9
- The number represented by the linked list does not contain leading zeros except for the zero itself.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: The Carry Problem</summary>

Adding one to a number means you need to handle carries from right to left (from the end of the list to the beginning). The challenge is that linked lists are naturally traversed from left to right. How can you access the rightmost digit first? Think about stack-based approaches or list manipulation techniques.
</details>

<details>
<summary>🎯 Hint 2: Three Viable Strategies</summary>

You have three main options:
1. **Reverse twice**: Reverse the list, add one with carry handling, reverse again
2. **Stack**: Push all nodes onto a stack, pop to process from right to left
3. **Recursive**: Use recursion's natural stack to process from the end backwards

Each has trade-offs in clarity and space usage. The recursive approach is elegant but uses O(n) call stack space.
</details>

<details>
<summary>📝 Hint 3: Recursive Implementation</summary>

Pseudocode for the recursive approach:
```
function addOne(node):
    if node is null:
        return 1  // Initial carry

    carry = addOne(node.next)

    if carry == 0:
        return 0  // No more propagation needed

    sum = node.val + carry
    node.val = sum % 10
    return sum // 10  // New carry

function plusOne(head):
    carry = addOne(head)
    if carry > 0:
        newHead = new Node(carry)
        newHead.next = head
        return newHead
    return head
```
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Convert to Integer | O(n) | O(n) | Fails for very large numbers (100+ digits) |
| **Reverse Twice** | **O(n)** | **O(1)** | Most space-efficient, three passes |
| Stack-Based | O(n) | O(n) | Clean logic, extra space for stack |
| Recursive | O(n) | O(n) | Elegant but uses call stack space |

## Common Mistakes

**Mistake 1: Not handling the all-9s case**
```python
# Wrong: Doesn't create new head when needed
def plusOne(head):
    # ... add logic ...
    # Forgot: [9,9,9] -> [1,0,0,0] needs new node!
```

```python
# Correct: Check if new head is needed
def plusOne(head):
    carry = addOneRecursive(head)
    if carry:
        new_head = ListNode(1)
        new_head.next = head
        return new_head
    return head
```

**Mistake 2: Modifying while traversing forward**
```python
# Wrong: Can't properly handle carry in forward direction
def plusOne(head):
    current = head
    while current:
        current.val += 1
        if current.val < 10:
            return head
        current.val = 0
        current = current.next  # Wrong: carry logic broken
```

**Mistake 3: Forgetting to handle single node edge cases**
```python
# Wrong: Doesn't handle [9] -> [1,0]
def plusOne(head):
    if head.next is None:
        head.val += 1
        return head  # Wrong if head.val was 9
```

```python
# Correct: Always check carry
def plusOne(head):
    if head.next is None:
        if head.val == 9:
            head.val = 0
            new_head = ListNode(1)
            new_head.next = head
            return new_head
        head.val += 1
        return head
```

## Variations

| Variation | Difference | Hint |
|-----------|-----------|------|
| Plus K instead of 1 | Add arbitrary integer k | Initialize carry as k instead of 1 |
| Add two linked lists | Two numbers as linked lists | Process both lists with carries |
| Minus one | Decrement the number | Handle borrows instead of carries |
| Multiply by 2 | Double the number | Carry can be > 1, process all digits |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Attempted again after 1 day
- [ ] Attempted again after 3 days
- [ ] Attempted again after 1 week
- [ ] Attempted again after 2 weeks

**Strategy**: See [Linked List Pattern](../prerequisites/linked-lists.md)
