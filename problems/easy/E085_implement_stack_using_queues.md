---
id: E085
old_id: I025
slug: implement-stack-using-queues
title: Implement Stack using Queues
difficulty: easy
category: easy
topics: ["stack", "queue"]
patterns: ["data-structure-design"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E232", "E155", "E716"]
prerequisites: ["queue-operations", "stack-operations"]
strategy_ref: ../strategies/data-structures/stacks-and-queues.md
---
# Implement Stack using Queues

## Problem

Design a **stack** (last-in-first-out) data structure using only standard **queue** operations (first-in-first-out).

A **stack** operates like a stack of plates: you add new plates to the top and remove them from the top. The last plate you put on is the first one you take off.

A **queue** operates like a line at a store: people join at the back and leave from the front. The first person to join is the first to leave.

Your challenge is to simulate stack behavior using queue operations. Implement the `MyStack` class with these methods:

- `void push(int x)` - Add element x to the top of the stack
- `int pop()` - Remove and return the top element
- `int top()` - Return the top element without removing it
- `boolean empty()` - Return `true` if the stack is empty, `false` otherwise

**Allowed queue operations only:**
- Add to back (enqueue)
- Remove from front (dequeue)
- Peek at front
- Get size
- Check if empty

The key insight: queues and stacks process elements in opposite order. You'll need to be creative about when and how to reorder elements to achieve stack behavior using queues.

## Why This Matters

This problem teaches **adapter pattern design** - implementing one interface using another:

- **Understanding tradeoffs** - You can make push expensive or pop expensive, but not both O(1)
- **Systems design** - Real systems often need to adapt existing components to new requirements
- **Interview fundamentals** - Tests your grasp of fundamental data structure properties
- **Amortized analysis** - The optimal solution introduces you to amortized time complexity

This appears frequently in interviews because it reveals whether you truly understand how stacks and queues work at a mechanical level, not just conceptually. It also demonstrates problem-solving creativity within constraints.

## Constraints

- 1 <= x <= 9
- At most 100 calls will be made to push, pop, top, and empty.
- All the calls to pop and top are valid.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

A queue is FIFO (first-in-first-out) while a stack is LIFO (last-in-first-out). To simulate LIFO behavior using FIFO structures, think about how you can reorder elements. The key is deciding whether to make push or pop expensive.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

There are two main approaches: (1) Make push expensive by rotating the queue after each insertion, keeping the most recent element at the front, or (2) Make pop expensive by moving all elements except the last one to another queue. Approach 1 is generally preferred as it makes pop/top O(1).

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**Approach 1: Expensive Push, O(1) Pop/Top**
- Push(x): Add x to queue, then rotate all previous elements to the back
  1. size = queue.size()
  2. queue.enqueue(x)
  3. For i in range(size): queue.enqueue(queue.dequeue())
- Pop(): Return queue.dequeue()
- Top(): Return queue.peek()

**Approach 2: O(1) Push, Expensive Pop**
- Use two queues, transfer n-1 elements during pop

Note: Actually only ONE queue is needed for Approach 1.

</details>

## Complexity Analysis

| Approach | Push | Pop | Top | Space | Notes |
|----------|------|-----|-----|-------|-------|
| **Rotate on Push** | **O(n)** | **O(1)** | **O(1)** | **O(n)** | Most recent at front |
| Transfer on Pop | O(1) | O(n) | O(n) | O(n) | Uses two queues |
| Single Queue (optimal) | O(n) | O(1) | O(1) | O(n) | Just one queue needed |

## Common Mistakes

**Mistake 1: Not Rotating After Push**

```python
# Wrong: Doesn't maintain stack order
class MyStack:
    def __init__(self):
        self.queue = deque()

    def push(self, x):
        self.queue.append(x)  # Just adds to back, wrong order

    def pop(self):
        return self.queue.popleft()  # Returns first, not last
```

```python
# Correct: Rotate to maintain LIFO order
class MyStack:
    def __init__(self):
        self.queue = deque()

    def push(self, x):
        self.queue.append(x)
        # Rotate: move all previous elements behind new element
        for _ in range(len(self.queue) - 1):
            self.queue.append(self.queue.popleft())

    def pop(self):
        return self.queue.popleft()
```

**Mistake 2: Using Two Queues Unnecessarily**

```python
# Wrong: Overcomplicated with two queues
class MyStack:
    def __init__(self):
        self.q1 = deque()
        self.q2 = deque()

    def push(self, x):
        self.q1.append(x)

    def pop(self):
        while len(self.q1) > 1:
            self.q2.append(self.q1.popleft())
        result = self.q1.popleft()
        self.q1, self.q2 = self.q2, self.q1
        return result
```

```python
# Correct: One queue is sufficient
class MyStack:
    def __init__(self):
        self.queue = deque()

    def push(self, x):
        size = len(self.queue)
        self.queue.append(x)
        for _ in range(size):
            self.queue.append(self.queue.popleft())
```

**Mistake 3: Incorrect Top Implementation**

```python
# Wrong: Pop removes the element
class MyStack:
    def __init__(self):
        self.queue = deque()

    # ... push implementation ...

    def top(self):
        return self.pop()  # Wrong: modifies stack
```

```python
# Correct: Peek without removing
class MyStack:
    def __init__(self):
        self.queue = deque()

    # ... push implementation ...

    def top(self):
        return self.queue[0]  # Just peek at front
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Implement Queue using Stacks | Reverse problem: queue with stacks | Easy |
| Min Stack | Stack with O(1) min operation | Easy |
| Max Stack | Stack with O(1) max and popMax | Hard |
| Design Circular Queue | Fixed-size circular buffer | Medium |
| LRU Cache | Combine hash map and doubly linked list | Medium |

## Practice Checklist

- [ ] Day 1: Implement with two queues, expensive pop
- [ ] Day 2: Optimize to single queue with rotation
- [ ] Day 3: Implement reverse problem (queue using stacks)
- [ ] Week 1: Analyze time complexity of each operation
- [ ] Week 2: Explain tradeoffs between push-heavy vs pop-heavy
- [ ] Month 1: Solve Min Stack and other design problems

**Strategy**: See [Stack and Queue Pattern](../strategies/data-structures/stacks-and-queues.md)
