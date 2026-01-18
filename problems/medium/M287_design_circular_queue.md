---
id: M287
old_id: A091
slug: design-circular-queue
title: Design Circular Queue
difficulty: medium
category: medium
topics: ["queue", "design", "array"]
patterns: ["circular-buffer", "modular-arithmetic"]
estimated_time_minutes: 30
strategy_ref: ../strategies/data-structures/stacks-and-queues.md
frequency: medium
related_problems:
  - id: E232
    name: Implement Queue using Stacks
    difficulty: easy
  - id: M200
    name: Design Circular Deque
    difficulty: medium
  - id: M150
    name: LRU Cache
    difficulty: medium
prerequisites:
  - concept: Queue data structure
    level: basic
  - concept: Modular arithmetic
    level: basic
  - concept: Array indexing
    level: basic
---
# Design Circular Queue

## Problem

Design and implement a circular queue (also called a ring buffer) from scratch, using only arrays and basic operations - no built-in queue libraries allowed. A circular queue is a FIFO (First-In-First-Out) data structure that "wraps around": when you reach the end of the underlying array, the next position is back at the beginning.

Why circular instead of linear? In a standard queue implemented with an array, after many enqueue and dequeue operations, you end up wasting space at the front. For example, if you enqueue 5 items, then dequeue 3, you have used indices 0-4, but indices 0-2 are now "dead space" while the queue still holds data at indices 3-4. A circular queue solves this by reusing those freed positions.

The implementation requires careful index management using the modulo operator. You'll maintain:
- A fixed-size array of capacity `k`
- A `front` pointer (index of the first element)
- A `rear` pointer (index of the last element)
- A way to distinguish between empty and full states (tricky because both can have `front == rear`)

Your `MyCircularQueue` class must support:

- `MyCircularQueue(k)` - Initialize with capacity `k`
- `enQueue(value)` - Add element to rear; return `true` if successful, `false` if full
- `deQueue()` - Remove element from front; return `true` if successful, `false` if empty
- `Front()` - Get front element; return `-1` if empty
- `Rear()` - Get rear element; return `-1` if empty
- `isEmpty()` - Check if queue is empty
- `isFull()` - Check if queue is full

The key challenge is handling the circular wraparound correctly and tracking whether the queue is empty or full.

## Why This Matters

Circular buffers are fundamental in operating systems and embedded programming. They're used in keyboard input buffers, audio/video streaming (buffering data between producer and consumer at different rates), network packet handling, and inter-process communication. When you type characters faster than a program processes them, a circular buffer stores the keystrokes. Audio players use ring buffers to smooth out playback despite variable data arrival rates. This problem teaches modular arithmetic for array indexing, a technique applicable to many circular/cyclic problems like scheduling, game development (circular game boards), and hash tables with linear probing. Implementing data structures from scratch also deepens your understanding of their trade-offs and prepares you for systems programming interviews.

## Constraints

- 1 <= k <= 1000
- 0 <= value <= 1000
- At most 3000 calls will be made to enQueue, deQueue, Front, Rear, isEmpty, and isFull.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding Circular Queue Structure</summary>

Key components needed:
1. **Fixed-size array**: Store queue elements
2. **Front pointer**: Index of first element
3. **Rear pointer**: Index of last element
4. **Count/Size**: Track number of elements (or use clever pointer math)

**Circular indexing**: Use modulo operator to wrap around
```python
next_index = (current_index + 1) % capacity

# Example with capacity=5:
# index 4 → (4 + 1) % 5 = 0 (wraps to beginning)
# index 2 → (2 + 1) % 5 = 3 (normal increment)
```

**Two approaches to track fullness**:
- **Approach A**: Maintain a `count` variable
- **Approach B**: Keep one slot empty (full when `(rear + 1) % k == front`)
</details>

<details>
<summary>Hint 2: Implementation with Count Variable</summary>

Using a count variable simplifies empty/full detection:

```python
class MyCircularQueue:
    def __init__(self, k: int):
        self.capacity = k
        self.data = [0] * k
        self.front = 0
        self.rear = -1  # No elements initially
        self.count = 0

    def enQueue(self, value: int) -> bool:
        if self.isFull():
            return False
        self.rear = (self.rear + 1) % self.capacity
        self.data[self.rear] = value
        self.count += 1
        return True

    def deQueue(self) -> bool:
        if self.isEmpty():
            return False
        self.front = (self.front + 1) % self.capacity
        self.count -= 1
        return True

    def isEmpty(self) -> bool:
        return self.count == 0

    def isFull(self) -> bool:
        return self.count == self.capacity
```
</details>

<details>
<summary>Hint 3: Complete Solution with All Methods</summary>

```python
class MyCircularQueue:
    def __init__(self, k: int):
        """Initialize with capacity k"""
        self.capacity = k
        self.data = [0] * k
        self.front = 0
        self.rear = -1
        self.size = 0

    def enQueue(self, value: int) -> bool:
        """Insert element at rear"""
        if self.isFull():
            return False

        # Move rear pointer circularly
        self.rear = (self.rear + 1) % self.capacity
        self.data[self.rear] = value
        self.size += 1
        return True

    def deQueue(self) -> bool:
        """Delete element from front"""
        if self.isEmpty():
            return False

        # Move front pointer circularly
        self.front = (self.front + 1) % self.capacity
        self.size -= 1
        return True

    def Front(self) -> int:
        """Get front element"""
        if self.isEmpty():
            return -1
        return self.data[self.front]

    def Rear(self) -> int:
        """Get rear element"""
        if self.isEmpty():
            return -1
        return self.data[self.rear]

    def isEmpty(self) -> bool:
        """Check if queue is empty"""
        return self.size == 0

    def isFull(self) -> bool:
        """Check if queue is full"""
        return self.size == self.capacity
```

**Alternative without count variable**:
```python
# Track (rear + 1) % capacity == front for full condition
# Requires keeping one slot always empty
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Array with Count | O(1) all operations | O(k) | k = capacity, maintains count |
| Array with Empty Slot | O(1) all operations | O(k) | Wastes one slot for full detection |
| Linked List | O(1) all operations | O(n) | n = current elements, no capacity limit |

**Detailed Analysis:**
- **Time**: O(1) for all operations (enQueue, deQueue, Front, Rear, isEmpty, isFull)
- **Space**: O(k) where k is the capacity
- **Key Insight**: Modular arithmetic enables O(1) circular indexing

## Common Mistakes

### Mistake 1: Not using modulo for circular wrapping
```python
# Wrong: Index out of bounds
self.rear = self.rear + 1
self.data[self.rear] = value  # Fails when rear >= capacity

# Correct: Use modulo operator
self.rear = (self.rear + 1) % self.capacity
self.data[self.rear] = value
```

### Mistake 2: Incorrect empty/full detection
```python
# Wrong: Using only front == rear
def isEmpty(self):
    return self.front == self.rear  # Ambiguous!
    # Could be empty OR full depending on history

# Correct: Use count variable
def isEmpty(self):
    return self.count == 0
```

### Mistake 3: Not handling edge case of single element
```python
# Wrong: Incorrect rear initialization
self.rear = 0  # Should be -1 for empty queue

# Correct: Initialize rear to -1
self.rear = -1
# After first enQueue: rear = (−1 + 1) % k = 0
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Circular Deque | Support both front and rear insertion/deletion | Medium |
| Thread-Safe Queue | Add synchronization for concurrent access | Hard |
| Resizable Circular Queue | Dynamically resize when capacity reached | Medium |
| Priority Circular Queue | Circular queue with priority ordering | Hard |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] **Initial Attempt** - Solve independently (30 min limit)
- [ ] **Solution Study** - If stuck, study one approach deeply
- [ ] **Implementation** - Code solution from scratch without reference
- [ ] **Optimization** - Achieve O(1) for all operations
- [ ] **Edge Cases** - Test: single element, fill and empty, alternating ops
- [ ] **Variations** - Solve at least 2 related problems
- [ ] **Spaced Repetition** - Re-solve after: 1 day, 1 week, 1 month

**Mastery Goal**: Solve in < 20 minutes with bug-free implementation.

**Strategy**: See [Queue Pattern](../strategies/data-structures/stacks-and-queues.md)
