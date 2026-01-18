---
id: M351
old_id: A183
slug: max-stack
title: Max Stack
difficulty: medium
category: medium
topics: ["stack", "design", "heap", "ordered-map"]
patterns: ["data-structure-design"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E155", "E716", "M895"]
prerequisites: ["stack", "heap", "balanced-bst"]
---
# Max Stack

## Problem

Design a specialized stack data structure that combines traditional stack operations with the ability to efficiently track and manipulate the maximum element. Think of this as a stack with "superpowers" that can instantly identify and remove its largest element, even if it's buried in the middle.

Create a `MaxStack` class that supports six operations:

- `MaxStack()` - Constructs an empty stack ready for use.
- `void push(int x)` - Adds element `x` to the top of the stack, just like a normal stack.
- `int pop()` - Removes and returns the top element (standard LIFO behavior).
- `int top()` - Peeks at the top element without removing it.
- `int peekMax()` - Returns the largest element currently in the stack without removing it (this is where things get interesting).
- `int popMax()` - Finds and removes the largest element from anywhere in the stack. When duplicate maximum values exist, remove the one closest to the top to preserve LIFO semantics for ties.

The challenge lies in the efficiency requirements: `top()` must run in O(1) time, while all other operations should achieve O(log n) time complexity. A naive approach using linear search for `popMax()` won't meet these requirements. You'll need to maintain additional data structures that work together to track both the stack order and maximum values simultaneously. The tricky part is handling `popMax()` when the maximum isn't at the top, requiring you to "reach into" the middle of the stack while preserving the relative order of remaining elements.

## Why This Matters

This problem appears frequently in system design interviews at major tech companies because it tests your ability to combine multiple data structures creatively. Real-world applications include implementing undo/redo systems with priority operations, managing browser history with "most visited" tracking, and building trading systems that need both chronological order and price-based queries. The key skill here is recognizing when a single data structure isn't enough and learning to orchestrate multiple structures (like heaps, balanced trees, and stacks) to work in harmony. This pattern of "data structure composition" is fundamental to designing efficient systems at scale.

## Constraints

- -10⁷ <= x <= 10⁷
- At most 10⁵ calls will be made to push, pop, top, peekMax, and popMax.
- There will be **at least one element** in the stack when pop, top, peekMax, or popMax is called.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding the Constraints</summary>

A regular stack supports push/pop/top in O(1), but finding and removing the max element is O(n). We need to maintain both stack order (LIFO) and efficiently track the maximum element.

Think about what data structures can find the maximum efficiently:
- Heap (priority queue): O(log n) for insertion and removal of max
- Balanced BST: O(log n) for insertion, deletion, and finding max
- Max stack with auxiliary structure: track max at each level

The challenge: `popMax()` must remove from the middle of the stack while preserving stack order for remaining elements. How can you handle this?
</details>

<details>
<summary>Hint 2: Double Data Structure Approach</summary>

Use two data structures working together:

1. **A stack** (or list) to maintain insertion order and support top/pop operations
2. **A TreeMap/Balanced BST** to efficiently find and track maximum values

Key insight: Assign each element a unique ID (timestamp) when pushed. Store both:
- Stack: stores (value, id) pairs
- TreeMap: maps value -> TreeSet of IDs (to handle duplicates)

For `popMax()`:
1. Find max value from TreeMap (O(log n))
2. Get the largest ID for that value (most recent = closest to top)
3. Remove from TreeMap
4. Mark as deleted in stack (lazy deletion)

Challenge: How do you handle lazy deletion efficiently?
</details>

<details>
<summary>Hint 3: Implementation with Soft Deletion</summary>

Maintain three structures:
1. `stack`: List of (value, id) pairs
2. `valueToIds`: TreeMap from value to TreeSet of IDs
3. `deleted`: Set of deleted IDs

Operations:
- `push(x)`: Add to stack with new ID, add to TreeMap
- `pop()`: While top ID is in deleted set, pop and discard. Then pop and remove from TreeMap
- `top()`: Skip deleted elements, return value
- `peekMax()`: Get max key from TreeMap
- `popMax()`: Get max from TreeMap, get largest ID for that value, add ID to deleted set

Optimization: Periodically rebuild stack to remove deleted elements, or use a different approach with two stacks or heap + doubly linked list.

Alternative: Use a heap + doubly linked list with pointers, allowing O(log n) for all operations except top which is O(1).
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Stack + Linear Search | push/pop/top: O(1), peekMax/popMax: O(n) | O(n) | Simple but doesn't meet requirements |
| Stack + Heap + Soft Delete | All: O(log n), top: O(1) amortized | O(n) | Works but can accumulate deleted items |
| Stack + TreeMap | push/pop/peekMax/popMax: O(log n), top: O(1) | O(n) | Meets requirements with soft deletion |
| Heap + Doubly Linked List | All: O(log n), top: O(1) | O(n) | Optimal but complex implementation |

## Common Mistakes

**Mistake 1: Using simple stack with O(n) popMax**
```python
# Wrong - doesn't meet O(log n) requirement for popMax
class MaxStack:
    def __init__(self):
        self.stack = []

    def popMax(self):
        # O(n) to find max - violates requirement
        max_val = max(self.stack)
        # O(n) to find and remove last occurrence
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i] == max_val:
                return self.stack.pop(i)
```

**Mistake 2: Using heap without tracking stack order**
```python
# Wrong - heap doesn't maintain stack order for popMax
from heapq import heappush, heappop

class MaxStack:
    def __init__(self):
        self.stack = []
        self.max_heap = []  # Max heap using negative values

    def push(self, x):
        self.stack.append(x)
        heappush(self.max_heap, -x)

    def popMax(self):
        max_val = -heappop(self.max_heap)
        # Problem: can't efficiently find this in stack
        # Removing from middle of stack breaks LIFO order
        self.stack.remove(max_val)  # Removes first occurrence, not last!
        return max_val
```

**Mistake 3: Not handling duplicates correctly**
```python
# Wrong - doesn't handle multiple max values correctly
from collections import defaultdict

class MaxStack:
    def __init__(self):
        self.stack = []
        self.value_to_id = {}  # Wrong: should handle multiple IDs per value
        self.id_counter = 0

    def push(self, x):
        self.stack.append((x, self.id_counter))
        self.value_to_id[x] = self.id_counter  # Overwrites previous ID!
        self.id_counter += 1

    def popMax(self):
        max_val = max(self.value_to_id.keys())
        # Only knows about one ID for max_val, not all occurrences
        target_id = self.value_to_id[max_val]
        # ...
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Min Stack | Easy | Track minimum instead of maximum, simpler with auxiliary stack |
| Max Queue | Medium | FIFO instead of LIFO, use deque with monotonic property |
| Median Stack | Hard | Track median instead of max, requires two heaps |
| Max Stack with getMin | Hard | Track both max and min efficiently |
| Frequency Stack | Hard | Pop most frequent instead of max value |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Practiced again (1 day later)
- [ ] Practiced again (3 days later)
- [ ] Practiced again (1 week later)
- [ ] Can solve in under 30 minutes
- [ ] Can explain solution clearly
- [ ] Implemented with required time complexity
- [ ] Handled duplicates correctly
- [ ] Tested popMax with multiple identical max values

**Strategy**: See [Data Structure Design](../strategies/data-structures/advanced-structures.md)
