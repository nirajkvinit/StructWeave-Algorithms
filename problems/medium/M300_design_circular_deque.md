---
id: M300
old_id: A108
slug: design-circular-deque
title: Design Circular Deque
difficulty: medium
category: medium
topics: ["queue", "array", "design"]
patterns: ["circular-buffer"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E232", "E622", "M641"]
prerequisites: ["E232", "E622"]
strategy_ref: ../prerequisites/stacks-and-queues.md
---
# Design Circular Deque

## Problem

Design a double-ended queue (deque, pronounced "deck") with a fixed maximum capacity that uses circular wrapping to efficiently use space.

A deque supports adding and removing elements from both ends:
- Front (head): insert, delete, get
- Rear (tail): insert, delete, get

The "circular" part means when you reach the end of the underlying storage array, the next position wraps around to the beginning. Think of it like a circular buffer or a clock face where after 12 comes 1.

Implement the `MyCircularDeque` class:

- `MyCircularDeque(int k)` - Initialize with fixed capacity `k`
- `boolean insertFront(int value)` - Add element at the front; return true if successful, false if full
- `boolean insertLast(int value)` - Add element at the rear; return true if successful, false if full
- `boolean deleteFront()` - Remove front element; return true if successful, false if empty
- `boolean deleteLast()` - Remove rear element; return true if successful, false if empty
- `int getFront()` - Return front element, or -1 if empty
- `int getRear()` - Return rear element, or -1 if empty
- `boolean isEmpty()` - Check if deque has no elements
- `boolean isFull()` - Check if deque is at capacity

The key challenge is managing two pointers (front and rear) that move in opposite directions and wrap around the array boundaries. You'll need careful index arithmetic using modulo operations to handle the circular nature.

## Why This Matters

Circular buffers are everywhere in systems programming. Audio/video streaming uses circular buffers to handle data arriving at variable rates - new data overwrites old data in a continuous loop. Network packet buffers in routers use circular deques to efficiently queue packets from both directions. Producer-consumer problems often use circular buffers for thread-safe communication. The data structure is cache-friendly (contiguous memory), doesn't require dynamic resizing, and provides O(1) operations at both ends. This problem teaches you to handle wraparound index arithmetic correctly (a common source of off-by-one bugs), distinguish between empty and full states when pointers overlap, and implement a data structure from scratch using arrays rather than relying on library implementations.

## Constraints

- 1 <= k <= 1000
- 0 <= value <= 1000
- At most 2000 calls will be made to insertFront, insertLast, deleteFront, deleteLast, getFront, getRear, isEmpty, isFull.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Use Fixed-Size Array with Two Pointers</summary>

The most efficient implementation uses a fixed-size array of length `k` with two pointers tracking the front and rear positions. The key insight is that the deque wraps around circularly.

Initialize:
- `array` of size `k`
- `front` pointer (initially at position 0)
- `rear` pointer (initially at position 0)
- `size` counter to track current number of elements

The circular nature means when you reach the end of the array, the next position is index 0. Use modulo arithmetic: `(index + 1) % k` or `(index - 1 + k) % k`.

</details>

<details>
<summary>Hint 2: Handle Pointer Movement Carefully</summary>

For a circular deque, pointer management is critical:

**Insert Front**:
- Move front pointer backward: `front = (front - 1 + k) % k`
- Place element at new front position
- Increment size

**Insert Last**:
- Place element at rear position
- Move rear pointer forward: `rear = (rear + 1) % k`
- Increment size

**Delete Front**:
- Move front pointer forward: `front = (front + 1) % k`
- Decrement size

**Delete Last**:
- Move rear pointer backward: `rear = (rear - 1 + k) % k`
- Decrement size

Notice the asymmetry: we insert before moving for front, after for rear.

</details>

<details>
<summary>Hint 3: Distinguish Empty vs Full States</summary>

A common challenge is distinguishing between empty and full states since both might have `front == rear`. Solutions:

1. **Use size counter** (recommended):
   - `isEmpty()`: return `size == 0`
   - `isFull()`: return `size == k`
   - Simple and clear

2. **Sacrifice one slot**:
   - Keep one slot always empty
   - `isEmpty()`: `front == rear`
   - `isFull()`: `(rear + 1) % k == front`
   - Uses `k+1` array for `k` capacity

3. **Use boolean flag**:
   - Track whether last operation was insert or delete
   - More complex state management

The size counter approach is cleanest and most intuitive.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Array + Two Pointers | O(1) all ops | O(k) | Optimal solution |
| Doubly Linked List | O(1) all ops | O(k) | More memory per node |
| Dynamic Array | O(1) amortized | O(k) | Complex for fixed capacity |

**Recommended**: Fixed-size array with two pointers for O(1) time and minimal space overhead.

## Common Mistakes

1. **Incorrect circular index calculation**
```python
# Wrong: Forgetting to add k before modulo
def insert_front(self, value):
    self.front = (self.front - 1) % self.k  # Can give negative result in some languages!

# Correct: Add k to ensure positive result
def insert_front(self, value):
    self.front = (self.front - 1 + self.k) % self.k
```

2. **Not checking full/empty before operations**
```python
# Wrong: Inserting without checking capacity
def insert_last(self, value):
    self.data[self.rear] = value
    self.rear = (self.rear + 1) % self.k  # Overwrites data if full!

# Correct: Check before modifying
def insert_last(self, value):
    if self.is_full():
        return False
    self.data[self.rear] = value
    self.rear = (self.rear + 1) % self.k
    self.size += 1
    return True
```

3. **Confusing front/rear semantics**
```python
# Wrong: Inconsistent pointer movement
def insert_front(self, value):
    self.data[self.front] = value  # Should move front first!
    self.front = (self.front - 1 + self.k) % self.k

# Correct: Move pointer before inserting
def insert_front(self, value):
    self.front = (self.front - 1 + self.k) % self.k
    self.data[self.front] = value
    self.size += 1
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Circular Queue | Easy | Single-ended version (only front/rear operations) |
| Dynamic Circular Deque | Medium | Auto-resize when capacity reached |
| Thread-Safe Deque | Hard | Add synchronization for concurrent access |
| Min/Max Deque | Hard | Support O(1) min/max queries |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Implement basic version with array and size counter
- [ ] Test all operations with small capacity (k=2 or k=3)
- [ ] Verify circular wrapping works correctly
- [ ] Handle edge cases (empty deque, full deque, single element)
- [ ] Implement alternative version using doubly linked list
- [ ] Review after 1 day: Can you recall the circular index formula?
- [ ] Review after 1 week: Implement without looking at notes
- [ ] Review after 1 month: Solve the dynamic resizing variation

**Strategy**: See [Queue Pattern](../prerequisites/stacks-and-queues.md)
