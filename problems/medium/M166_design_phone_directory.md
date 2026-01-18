---
id: M166
old_id: I178
slug: design-phone-directory
title: Design Phone Directory
difficulty: medium
category: medium
topics: ["design", "hash-table", "queue"]
patterns: ["system-design"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M380", "M146", "M895"]
prerequisites: ["hash-set", "queue", "amortized-analysis"]
---
# Design Phone Directory

## Problem

Design a phone directory system that manages a pool of `maxNumbers` available number slots, similar to how a company manages phone extensions or how a system allocates resources from a fixed pool. The system starts with all slots available (numbered 0 through maxNumbers-1) and must efficiently handle three operations. The `get()` method allocates and returns any available slot number, returning -1 if all slots are taken—this is like assigning the next free phone extension to a new employee. The `check(number)` method queries whether a specific slot is currently available, returning true if it's free and false if it's already assigned. The `release(number)` method frees up a previously allocated slot, making it available for future allocation again—like when an employee leaves and their extension becomes available. The challenge is making all three operations fast, ideally constant time O(1), even when managing thousands of slots. You'll need to balance quick lookups (for checking availability) with quick allocation (for finding and assigning free slots), which requires carefully choosing the right combination of data structures.

## Why This Matters

This problem mirrors real-world resource management systems that are everywhere in computing infrastructure. Database connection pools use exactly this pattern—when applications need database connections, the pool allocates an available connection, tracks which are in use, and recycles them when released, avoiding the expensive overhead of creating new connections repeatedly. Memory allocators in operating systems manage free memory blocks similarly, tracking which addresses are available and handling allocation/deallocation requests efficiently. Thread pools in web servers allocate worker threads from a fixed pool to handle incoming requests. Port management in networking stacks assigns available port numbers to new connections and releases them when connections close. License management software allocates floating licenses to users and reclaims them when users log off. Cloud resource managers allocate virtual machine IDs, IP addresses, or storage blocks from fixed pools. Understanding how to design these systems with O(1) operations teaches you about amortized complexity, the tradeoffs between different data structures (arrays vs. hash sets vs. queues), and how to prevent common bugs like double-allocation or allocation of already-used resources.

## Constraints

- 1 <= maxNumbers <= 10⁴
- 0 <= number < maxNumbers
- At most 2 * 10⁴ calls will be made to get, check, and release.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Trade-offs Between Operations</summary>

Consider what each operation needs:
- `get()`: Find an available number quickly
- `check()`: Test availability in O(1)
- `release()`: Mark number as available

You could use a boolean array for O(1) check, but how do you make get() fast? Scanning the array is O(n).
</details>

<details>
<summary>🎯 Hint 2: Combine Data Structures</summary>

Use two data structures:
1. **HashSet** to track which numbers are currently available (for O(1) check and quick retrieval)
2. **Queue/LinkedList** to maintain available numbers in order (for O(1) get)

When get() is called, pop from queue and remove from set. When release() is called, add back to both.
</details>

<details>
<summary>📝 Hint 3: Implementation Details</summary>

Pseudocode:
```
class PhoneDirectory:
    available_set: Set
    available_queue: Queue

    constructor(maxNumbers):
        available_set = Set containing [0, 1, ..., maxNumbers-1]
        available_queue = Queue containing [0, 1, ..., maxNumbers-1]

    get():
        if available_queue is empty:
            return -1

        number = available_queue.dequeue()
        available_set.remove(number)
        return number

    check(number):
        return number in available_set

    release(number):
        if number not in available_set:
            available_set.add(number)
            available_queue.enqueue(number)
```

All operations are O(1) amortized.
</details>

## Complexity Analysis

| Approach | Time (get/check/release) | Space | Notes |
|----------|--------------------------|-------|-------|
| Array Scan | O(n) / O(1) / O(1) | O(n) | Simple but get() is slow |
| **HashSet + Queue** | **O(1) / O(1) / O(1)** | **O(n)** | Optimal; all operations constant time |
| Linked List Only | O(1) / O(n) / O(1) | O(n) | check() becomes slow |

## Common Mistakes

**Mistake 1: Using only an array**
```python
# Wrong: get() is O(n)
class PhoneDirectory:
    def __init__(self, maxNumbers):
        self.available = [True] * maxNumbers

    def get(self):
        for i in range(len(self.available)):
            if self.available[i]:  # O(n) scan
                self.available[i] = False
                return i
        return -1

    def check(self, number):
        return self.available[number]

    def release(self, number):
        self.available[number] = True
```

**Mistake 2: Not preventing double-release**
```python
# Wrong: Allows adding same number multiple times
class PhoneDirectory:
    def __init__(self, maxNumbers):
        self.available = list(range(maxNumbers))

    def release(self, number):
        self.available.append(number)  # Wrong: no check for duplicates
        # This can add 5 multiple times if released repeatedly
```

```python
# Correct: Check before adding back
class PhoneDirectory:
    def __init__(self, maxNumbers):
        self.available_set = set(range(maxNumbers))
        self.available_queue = list(range(maxNumbers))

    def get(self):
        if not self.available_queue:
            return -1
        num = self.available_queue.pop(0)
        self.available_set.remove(num)
        return num

    def check(self, number):
        return number in self.available_set

    def release(self, number):
        if number not in self.available_set:  # Prevent duplicates
            self.available_set.add(number)
            self.available_queue.append(number)
```

**Mistake 3: Using inefficient queue implementation**
```python
# Wrong: Using list.pop(0) is O(n)
def get(self):
    if self.available:
        return self.available.pop(0)  # O(n) operation!
```

```python
# Correct: Use collections.deque for O(1) popleft
from collections import deque

def __init__(self, maxNumbers):
    self.available_set = set(range(maxNumbers))
    self.available_queue = deque(range(maxNumbers))

def get(self):
    if not self.available_queue:
        return -1
    num = self.available_queue.popleft()  # O(1)
    self.available_set.remove(num)
    return num
```

## Variations

| Variation | Difference | Hint |
|-----------|-----------|------|
| Priority allocation | Prefer lower numbers | Use min-heap instead of queue |
| Reserve specific number | get(number) to request specific slot | Check availability first, then allocate |
| Expiring allocations | Numbers auto-release after time T | Use priority queue with timestamps |
| Multiple allocations | get(k) allocates k consecutive numbers | Track contiguous ranges using intervals |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Attempted again after 1 day
- [ ] Attempted again after 3 days
- [ ] Attempted again after 1 week
- [ ] Attempted again after 2 weeks
