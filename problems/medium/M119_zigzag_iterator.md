---
id: M119
old_id: I080
slug: zigzag-iterator
title: Zigzag Iterator
difficulty: medium
category: medium
topics: ["design", "array", "iterator"]
patterns: ["two-pointers"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M120", "E001", "M127"]
prerequisites: ["iterator-design", "two-pointers", "queue"]
---
# Zigzag Iterator

## Problem

Create an iterator that interleaves elements from two integer lists `v1` and `v2` in an alternating fashion. For example, given v1=[1,2] and v2=[3,4,5,6], the zigzag pattern would be [1,3,2,4,5,6] (one from v1, one from v2, repeat). When one list is exhausted, continue with the remaining elements from the other list. Design the `ZigzagIterator` class with these methods: a constructor `ZigzagIterator(v1, v2)` that initializes with two lists, `hasNext()` that returns true if more elements remain, and `next()` that retrieves the current element and advances the iterator. This is a classic iterator design problem testing your ability to maintain state across multiple sequences. The challenge is handling unequal list lengths gracefully and supporting lazy evaluation (only compute the next element when requested, don't pre-merge the lists).

## Why This Matters

Round-robin scheduling in operating systems alternates between process queues in exactly this zigzag pattern to ensure fair CPU time allocation. Merge operations in distributed systems interleave data streams from multiple sources to maintain ordering. Load balancers distribute incoming requests across server pools in a round-robin fashion. Data pipeline systems multiplex multiple input streams into a single output stream for processing. This problem teaches you iterator design patterns essential for building custom data structure APIs, stream processing libraries, and any system where you need to present multiple data sources as a unified sequence. The queue-based solution you develop extends naturally to k-way merging, a common operation in external sorting and database query execution.

## Examples

**Example 1:**
- Input: `v1 = [1,2], v2 = [3,4,5,6]`
- Output: `[1,3,2,4,5,6]`
- Explanation: By calling next repeatedly until hasNext returns false, the order of elements returned by next should be: [1,3,2,4,5,6].

**Example 2:**
- Input: `v1 = [1], v2 = []`
- Output: `[1]`

**Example 3:**
- Input: `v1 = [], v2 = [1]`
- Output: `[1]`

## Constraints

- 0 <= v1.length, v2.length <= 1000
- 1 <= v1.length + v2.length <= 2000
- -2³¹ <= v1[i], v2[i] <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

The problem requires alternating between two lists. Think about how you would manually pick elements: first from v1, then v2, then v1 again, continuing this pattern. You need to track which list to read from next and the current position in each list.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Consider using two pointers (one for each list) to track positions. Alternatively, use a queue to store (value, list_index, element_index) tuples, which generalizes better to k lists. The queue approach maintains the order and handles unequal lengths naturally.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**Two-Pointer Approach:**
1. Store both lists and maintain two index pointers (i1, i2)
2. Use a boolean flag to track which list to read next
3. In `next()`: read from current list, advance pointer, toggle flag
4. In `hasNext()`: check if either pointer hasn't reached end

**Queue Approach (generalizes to k lists):**
1. In constructor: enqueue (list_id, index) pairs for non-empty lists
2. In `next()`: dequeue, get value, increment index, re-enqueue if more elements
3. In `hasNext()`: return whether queue is non-empty

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Merge into Array | O(n) constructor, O(1) operations | O(n) | Pre-compute all elements, simple but not lazy |
| **Two Pointers** | **O(1) all operations** | **O(1)** | Optimal for 2 lists, just store indices |
| Queue of Iterators | O(1) amortized operations | O(k) | Best for k lists, k=2 here |
| Recursive Generator | O(1) per element | O(h) stack | Elegant but stack overhead |

## Common Mistakes

### Mistake 1: Not handling unequal list lengths properly

**Wrong:**
```python
class ZigzagIterator:
    def __init__(self, v1, v2):
        self.v1, self.v2 = v1, v2
        self.i1 = self.i2 = 0
        self.turn = 0  # 0 for v1, 1 for v2

    def next(self):
        if self.turn == 0:
            val = self.v1[self.i1]  # Crashes if v1 exhausted
            self.i1 += 1
            self.turn = 1
        else:
            val = self.v2[self.i2]  # Crashes if v2 exhausted
            self.i2 += 1
            self.turn = 0
        return val
```

**Correct:**
```python
class ZigzagIterator:
    def __init__(self, v1, v2):
        self.v1, self.v2 = v1, v2
        self.i1 = self.i2 = 0
        self.turn = 0

    def next(self):
        # Check which list to use, skip exhausted ones
        if self.i1 < len(self.v1) and (self.turn == 0 or self.i2 >= len(self.v2)):
            val = self.v1[self.i1]
            self.i1 += 1
            self.turn = 1
        else:
            val = self.v2[self.i2]
            self.i2 += 1
            self.turn = 0
        return val

    def hasNext(self):
        return self.i1 < len(self.v1) or self.i2 < len(self.v2)
```

### Mistake 2: Pre-merging all elements (not truly iterative)

**Wrong:**
```python
class ZigzagIterator:
    def __init__(self, v1, v2):
        # Pre-compute entire sequence - not lazy evaluation
        self.merged = []
        i1 = i2 = 0
        while i1 < len(v1) or i2 < len(v2):
            if i1 < len(v1):
                self.merged.append(v1[i1])
                i1 += 1
            if i2 < len(v2):
                self.merged.append(v2[i2])
                i2 += 1
        self.index = 0

    def next(self):
        val = self.merged[self.index]
        self.index += 1
        return val
```

**Correct:**
```python
from collections import deque

class ZigzagIterator:
    def __init__(self, v1, v2):
        # Queue stores (list, index) pairs
        self.queue = deque()
        if v1:
            self.queue.append((v1, 0))
        if v2:
            self.queue.append((v2, 0))

    def next(self):
        lst, idx = self.queue.popleft()
        val = lst[idx]
        if idx + 1 < len(lst):
            self.queue.append((lst, idx + 1))
        return val

    def hasNext(self):
        return len(self.queue) > 0
```

### Mistake 3: Not generalizing for follow-up (k lists)

**Wrong:**
```python
# Hard-coded for exactly 2 lists
class ZigzagIterator:
    def __init__(self, v1, v2):
        self.lists = [v1, v2]
        self.indices = [0, 0]
        self.current = 0
    # Cannot easily extend to k lists
```

**Correct:**
```python
from collections import deque

class ZigzagIterator:
    def __init__(self, *lists):
        # Works for any number of lists
        self.queue = deque()
        for lst in lists:
            if lst:
                self.queue.append((lst, 0))

    def next(self):
        lst, idx = self.queue.popleft()
        val = lst[idx]
        if idx + 1 < len(lst):
            self.queue.append((lst, idx + 1))
        return val

    def hasNext(self):
        return len(self.queue) > 0
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| k Lists Zigzag | Extend to interleave k lists instead of 2 | Medium |
| Weighted Zigzag | Take different ratios from each list (e.g., 2 from v1, 1 from v2) | Medium |
| Reverse Zigzag | Alternate from end of lists | Easy |
| Circular Iterator | After reaching end, restart from beginning | Medium |
| Nested Zigzag | Lists contain sublists to interleave recursively | Hard |

## Practice Checklist

- [ ] Implement using two-pointer approach
- [ ] Implement using queue approach
- [ ] Handle edge cases (empty lists, unequal lengths)
- [ ] Extend solution to k lists
- [ ] **Day 3**: Re-solve without looking at solution
- [ ] **Week 1**: Implement weighted zigzag variation
- [ ] **Week 2**: Explain approach to someone else
- [ ] **Month 1**: Solve nested iterator problem

**Strategy**: See [Iterator Design Patterns](../strategies/patterns/iterator-design.md)
