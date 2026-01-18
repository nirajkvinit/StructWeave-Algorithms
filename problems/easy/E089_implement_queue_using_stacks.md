---
id: E089
old_id: I032
slug: implement-queue-using-stacks
title: Implement Queue using Stacks
difficulty: easy
category: easy
topics: ["queue", "stack", "design"]
patterns: ["two-stacks", "amortized-analysis"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E086", "E092", "M005"]
prerequisites: ["stack-operations", "queue-operations", "data-structure-design"]
strategy_ref: ../strategies/data-structures/stacks-and-queues.md
---
# Implement Queue using Stacks

## Problem

Design a **queue** (first-in-first-out) data structure using only standard **stack** operations (last-in-first-out).

A **queue** works like a line at a checkout: people join at the back and leave from the front. The first person to arrive is the first to be served (FIFO).

A **stack** works like a stack of trays: you add new trays to the top and remove them from the top. The last tray you put on is the first one you take off (LIFO).

Your challenge is to simulate queue behavior using only stacks. Implement the `MyQueue` class with these methods:

- `void push(int x)` - Add element x to the back of the queue
- `int pop()` - Remove and return the element at the front of the queue
- `int peek()` - Return the element at the front without removing it
- `boolean empty()` - Return `true` if the queue is empty, `false` otherwise

**Allowed stack operations only:**
- Push to top
- Pop from top
- Peek at top
- Get size
- Check if empty

The key insight: use **two stacks** - one for input and one for output. Elements flow from the input stack to the output stack when needed, reversing their order twice (which restores the original FIFO order).

## Why This Matters

This problem teaches **amortized analysis**, a crucial concept in algorithm design:

- **Real-world system design** - Understanding when operations are "expensive" on average vs. worst-case
- **Data structure transformations** - Shows how to achieve one behavior using a different primitive
- **Interview classic** - Tests your understanding of stack/queue mechanics and time complexity analysis
- **Buffer management** - Similar to how undo/redo systems work with dual buffers

The two-stack queue appears in real systems for breadth-first search implementations and in scenarios where you need queue behavior but only have stack primitives available. The amortized O(1) analysis (where operations average constant time even though individual operations might be O(n)) is a pattern you'll see in many advanced data structures.

## Constraints

- 1 <= x <= 9
- At most 100 calls will be made to push, pop, peek, and empty.
- All the calls to pop and peek are valid.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Stack vs Queue Behavior</summary>

A stack is LIFO (last in, first out) while a queue is FIFO (first in, first out). They have opposite ordering. How could you use two stacks to reverse the order twice, effectively getting back to the original order?

</details>

<details>
<summary>🎯 Hint 2: Two-Stack Strategy</summary>

Consider using one stack for input (where new elements are pushed) and another for output (where elements are popped from). When you need to pop/peek and the output stack is empty, transfer all elements from input to output. This reverses the order, making the oldest element accessible at the top.

</details>

<details>
<summary>📝 Hint 3: Amortized Efficiency</summary>

Implementation approach:
- **push(x)**: Simply push to input stack - O(1)
- **pop()**: If output stack is empty, transfer all from input to output, then pop from output
- **peek()**: Similar to pop but don't remove
- **empty()**: Both stacks must be empty

Key insight: Each element is moved at most once from input to output, making operations amortized O(1).

Example flow:
- push(1), push(2), push(3): input = [1,2,3], output = []
- pop(): transfer to output = [3,2,1], pop 1, output = [3,2]
- push(4): input = [4], output = [3,2]
- pop(): pop 2 from output (no transfer needed)

</details>

## Complexity Analysis

| Approach | Time (Push) | Time (Pop/Peek) | Space | Notes |
|----------|-------------|-----------------|-------|-------|
| Single Stack + Temp | O(n) | O(n) | O(n) | Move all elements for each operation |
| **Two Stacks** | **O(1)** | **O(1) amortized** | **O(n)** | Optimal - each element moved once |
| Array with Two Pointers | O(1) | O(1) | O(n) | Not using stacks, violates constraint |

**Amortized analysis:** While a single pop might take O(n) to transfer elements, each element is transferred at most once, so n operations take O(n) total time, giving O(1) amortized.

## Common Mistakes

**Mistake 1: Transferring elements on every operation**

```python
# Wrong - transfers on every pop/peek, making it O(n)
class MyQueue:
    def __init__(self):
        self.input_stack = []
        self.output_stack = []

    def pop(self):
        # Always transferring is wasteful!
        while self.input_stack:
            self.output_stack.append(self.input_stack.pop())
        result = self.output_stack.pop()
        # Moving back is even worse!
        while self.output_stack:
            self.input_stack.append(self.output_stack.pop())
        return result
```

```python
# Correct - only transfer when output is empty
class MyQueue:
    def __init__(self):
        self.input_stack = []
        self.output_stack = []

    def pop(self):
        if not self.output_stack:
            while self.input_stack:
                self.output_stack.append(self.input_stack.pop())
        return self.output_stack.pop()
```

**Mistake 2: Not handling empty queue in peek/pop**

```python
# Wrong - crashes on empty queue
class MyQueue:
    def peek(self):
        return self.output_stack[-1]  # IndexError if empty!
```

```python
# Correct - ensures output_stack has elements
class MyQueue:
    def peek(self):
        if not self.output_stack:
            while self.input_stack:
                self.output_stack.append(self.input_stack.pop())
        return self.output_stack[-1]
```

**Mistake 3: Incorrect empty() implementation**

```python
# Wrong - only checks one stack
class MyQueue:
    def empty(self):
        return len(self.output_stack) == 0
```

```python
# Correct - checks both stacks
class MyQueue:
    def empty(self):
        return len(self.input_stack) == 0 and len(self.output_stack) == 0
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Implement Stack using Queues | Easy | Reverse problem - use queues to build stack |
| Min Stack | Easy | Support retrieving minimum element in O(1) |
| Max Stack | Easy | Support retrieving maximum element in O(1) |
| Design Circular Queue | Medium | Fixed-size queue with wraparound |

## Practice Checklist

- [ ] **Day 1:** Implement with two stacks approach
- [ ] **Day 3:** Calculate amortized time complexity with example
- [ ] **Day 7:** Solve "Implement Stack using Queues" variation
- [ ] **Day 14:** Implement without looking at previous solution
- [ ] **Day 30:** Explain amortized analysis to someone else

**Strategy**: See [Queue Pattern](../strategies/data-structures/stacks-and-queues.md)
