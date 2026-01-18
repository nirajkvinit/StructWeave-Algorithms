---
id: H028
old_id: F146
slug: lru-cache
title: LRU Cache
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# LRU Cache

## Problem

Design a data structure for Least Recently Used (LRU) cache with O(1) operations.

## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Constraints

- 1 <= capacity <= 3000
- 0 <= key <= 10⁴
- 0 <= value <= 10⁵
- At most 2 * 10⁵ calls will be made to get and put.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Combine a hash map and a doubly linked list. The hash map provides O(1) key lookup, while the doubly linked list maintains the access order (most recent at head, least recent at tail). This dual structure allows both fast access and fast reordering.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a hash map where keys map to nodes in a doubly linked list. Each node contains the key-value pair. For get(key): look up in hash map, move the node to the head (most recently used). For put(key, value): if key exists, update and move to head; if new and at capacity, remove tail node and its hash map entry; add new node at head.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use dummy head and tail nodes to simplify edge cases when adding/removing nodes (avoids null checks). In Python, you can use OrderedDict which maintains insertion order and provides move_to_end() method, though implementing from scratch shows better understanding of the underlying mechanism.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| HashMap + Doubly Linked List | O(1) | O(capacity) | Both get and put are O(1) |
| OrderedDict (Python) | O(1) | O(capacity) | Built-in solution with move_to_end() |

## Common Mistakes

1. **Using list or array instead of linked list**
   ```python
   # Wrong: O(n) for removing/moving elements
   class LRUCache:
       def __init__(self, capacity):
           self.cache = []  # List of (key, value) tuples
           self.capacity = capacity

       def get(self, key):
           for i, (k, v) in enumerate(self.cache):
               if k == key:
                   self.cache.pop(i)  # O(n) operation
                   self.cache.append((k, v))
                   return v

   # Correct: O(1) with doubly linked list
   class Node:
       def __init__(self, key, value):
           self.key = key
           self.value = value
           self.prev = None
           self.next = None
   ```

2. **Not updating node position on get()**
   ```python
   # Wrong: Get doesn't update access order
   def get(self, key):
       if key in self.cache:
           return self.cache[key].value
       return -1

   # Correct: Move accessed node to head
   def get(self, key):
       if key in self.cache:
           node = self.cache[key]
           self._remove(node)
           self._add_to_head(node)
           return node.value
       return -1
   ```

3. **Not removing from hash map when evicting**
   ```python
   # Wrong: Hash map and linked list become inconsistent
   def _evict(self):
       tail = self.tail.prev
       self._remove(tail)
       # Forgot to remove from hash map!

   # Correct: Remove from both structures
   def _evict(self):
       tail = self.tail.prev
       self._remove(tail)
       del self.cache[tail.key]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| LFU Cache | Hard | Evict least frequently used instead of least recently used |
| Design Twitter | Medium | Similar data structure for timeline feeds |
| Time-Based Key-Value Store | Medium | Store multiple values with timestamps |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Map + Linked List Pattern](../../strategies/data-structures/linked-lists.md)
