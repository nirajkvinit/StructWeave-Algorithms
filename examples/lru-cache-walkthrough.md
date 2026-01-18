---
title: LRU Cache - Complete Walkthrough
type: worked-example
problem_id: H028
patterns: ["hash-map-doubly-linked-list", "design"]
estimated_time: 45
difficulty: hard
topics: ["design", "hash-table", "linked-list"]
---

# LRU Cache - Complete Walkthrough

## Overview

This walkthrough demonstrates how to design and implement an LRU (Least Recently Used) Cache with O(1) operations. This is a classic system design problem that combines multiple data structures to achieve optimal performance.

**Problem Statement:** Design a data structure that supports get and put operations in O(1) time. When the cache reaches capacity, it should evict the least recently used item before inserting a new one.

**Learning Goals:**
- Understand LRU cache eviction policy
- Combine hash map and doubly linked list
- Master O(1) operations on complex data structures
- Develop system design thinking
- Learn to choose the right data structures

---

## Understanding LRU Cache

### What is LRU?

**Least Recently Used (LRU)** is a cache eviction policy:
- Keep track of what was used when
- When cache is full, discard the **least recently used** item
- "Recently used" includes both reads (get) and writes (put)

### Real-World Analogy

Think of a small desk with limited space:

```
Desk capacity: 3 books

Action: Place Book A
Desk: [A] (most recent)

Action: Place Book B
Desk: [B, A] (B is most recent)

Action: Place Book C
Desk: [C, B, A] (C is most recent, A is least recent)

Action: Place Book D (desk is full!)
Desk: Remove A (least recent), add D
Result: [D, C, B]

Action: Read Book B
Desk: Move B to front (it's now most recent)
Result: [B, D, C] (C is now least recent)
```

### Cache Operations

**get(key):**
- If key exists: return value and mark as recently used
- If key doesn't exist: return -1
- Time requirement: O(1)

**put(key, value):**
- If key exists: update value and mark as recently used
- If key doesn't exist:
  - If cache is full: remove least recently used item
  - Insert new key-value pair
- Time requirement: O(1)

---

## Problem Exploration

### Example Trace

```
Cache capacity: 2

Operation: put(1, 1)
  Cache: {1=1}
  Order: [1] (most recent → least recent)

Operation: put(2, 2)
  Cache: {1=1, 2=2}
  Order: [2, 1]

Operation: get(1)
  Return: 1
  Action: Move 1 to front (most recent)
  Order: [1, 2]

Operation: put(3, 3)
  Action: Cache full, evict least recent (2)
  Cache: {1=1, 3=3}
  Order: [3, 1]

Operation: get(2)
  Return: -1 (not found, was evicted)

Operation: put(4, 4)
  Action: Cache full, evict least recent (1)
  Cache: {3=3, 4=4}
  Order: [4, 3]
```

### What Operations Do We Need?

For O(1) performance, we need:

1. **Fast lookup by key** → Get value in O(1)
2. **Fast insert/update** → Add/modify entry in O(1)
3. **Fast access order tracking** → Know which is least recent in O(1)
4. **Fast removal from anywhere** → Delete least recent in O(1)
5. **Fast move to front** → Mark as most recent in O(1)

**Question:** Which single data structure can do all of this?

**Answer:** None! We need to combine data structures.

---

## Design Insight: Why Hash Map + Doubly Linked List?

### Data Structure Analysis

**Hash Map alone?**
```
✓ Fast lookup: O(1)
✓ Fast insert/update: O(1)
✗ Can't track access order
✗ Can't find least recent item

Conclusion: Need additional structure for ordering
```

**Array alone?**
```
✓ Can track order
✗ Lookup by key: O(n)
✗ Remove from middle: O(n)

Conclusion: Too slow
```

**Singly Linked List alone?**
```
✗ Lookup by key: O(n)
✓ Insert at front: O(1)
✗ Remove from middle: O(n) (need to find previous node)

Conclusion: Can't remove efficiently
```

**Doubly Linked List alone?**
```
✗ Lookup by key: O(n) - must traverse list
✓ Insert at front: O(1)
✓ Remove any node: O(1) - if we have reference to it
✓ Track order: most recent at head, least recent at tail

Conclusion: Good for ordering, but can't find nodes quickly
```

### The Winning Combination

**Hash Map + Doubly Linked List**

```
Hash Map: {key → node_reference}
  - Provides O(1) lookup
  - Maps keys to nodes in linked list

Doubly Linked List:
  - Tracks access order
  - Most recent: head
  - Least recent: tail
  - O(1) removal (with node reference from hash map)
  - O(1) move to front (remove + insert at head)

Together:
✓ Fast lookup: O(1) via hash map
✓ Fast insert/update: O(1)
✓ Fast order tracking: O(1) - head is most recent
✓ Fast removal: O(1) - hash map gives node reference
✓ Fast move to front: O(1)
```

---

## Data Structure Design

### Node Structure

```python
class Node:
    """
    Doubly linked list node

    Stores:
    - key: needed for deletion from hash map
    - value: the cached value
    - prev: pointer to previous node (more recent)
    - next: pointer to next node (less recent)
    """
    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None
```

**Why store key in node?**
When we evict the least recent node, we need to remove it from the hash map too. The node must know its own key.

### List Structure with Sentinel Nodes

```python
# Use dummy head and tail to simplify edge cases
head = Node()  # Dummy head (sentinel)
tail = Node()  # Dummy tail (sentinel)

head.next = tail
tail.prev = head

# Actual nodes go between head and tail
# Most recent: head.next
# Least recent: tail.prev
```

**Why dummy nodes?**
- No special cases for empty list
- No special cases for single element
- All operations work uniformly

**Visual:**
```
Initial state:
head ←→ tail

After adding Node(1, 1):
head ←→ [1,1] ←→ tail

After adding Node(2, 2):
head ←→ [2,2] ←→ [1,1] ←→ tail
        ↑ most recent    ↑ least recent
```

### Complete Data Structure

```python
class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {}  # key → Node

        # Dummy head and tail
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head
```

---

## Helper Methods

Before implementing get and put, let's create helper methods for linked list operations.

### Method 1: Add Node After Head (Most Recent)

```python
def _add_to_front(self, node):
    """
    Add node right after head (mark as most recent)

    Before:
      head ←→ old_first ←→ ... ←→ tail

    After:
      head ←→ node ←→ old_first ←→ ... ←→ tail
    """
    # Save reference to current first node
    old_first = self.head.next

    # Connect head ←→ node
    self.head.next = node
    node.prev = self.head

    # Connect node ←→ old_first
    node.next = old_first
    old_first.prev = node
```

**Step-by-step visualization:**
```
Initial: head ←→ A ←→ tail

Step 1: Save old_first = A
  head ←→ A ←→ tail

Step 2: head.next = node, node.prev = head
  head ←→ node   A ←→ tail
          ↓ next
          A

Step 3: node.next = old_first, old_first.prev = node
  head ←→ node ←→ A ←→ tail
```

### Method 2: Remove Node from List

```python
def _remove_node(self, node):
    """
    Remove node from its current position

    Before:
      ... ←→ prev_node ←→ node ←→ next_node ←→ ...

    After:
      ... ←→ prev_node ←→ next_node ←→ ...
              (node is disconnected)
    """
    prev_node = node.prev
    next_node = node.next

    # Connect previous ←→ next (bypassing node)
    prev_node.next = next_node
    next_node.prev = prev_node
```

**Visualization:**
```
Before: A ←→ B ←→ C
           (remove B)

Step 1: prev_node = A, next_node = C

Step 2: Connect A ←→ C
  A ←→ C
  (B is orphaned but still exists in memory)
```

### Method 3: Move to Front (Mark as Recently Used)

```python
def _move_to_front(self, node):
    """
    Move existing node to front (mark as most recent)

    This is just: remove from current position + add to front
    """
    self._remove_node(node)
    self._add_to_front(node)
```

**Visualization:**
```
Before: head ←→ A ←→ B ←→ C ←→ tail
                (access B)

After _remove_node(B):
  head ←→ A ←→ C ←→ tail
  (B is removed)

After _add_to_front(B):
  head ←→ B ←→ A ←→ C ←→ tail
  (B is now most recent)
```

### Method 4: Remove Least Recently Used

```python
def _remove_lru(self):
    """
    Remove least recently used node (tail.prev)

    Returns the removed node (we need its key for hash map deletion)
    """
    lru_node = self.tail.prev

    # Remove from list
    self._remove_node(lru_node)

    return lru_node
```

**Visualization:**
```
Before: head ←→ A ←→ B ←→ C ←→ tail
                         ↑ LRU (tail.prev)

After:
  head ←→ A ←→ B ←→ tail
  Return C (so we can delete it from hash map)
```

---

## Main Operations Implementation

### get(key) Implementation

```python
def get(self, key):
    """
    Get value for key, return -1 if not found

    If found, move to front (mark as recently used)

    Time: O(1)
    Space: O(1)
    """
    # Check if key exists in cache
    if key not in self.cache:
        return -1

    # Key exists: get node
    node = self.cache[key]

    # Mark as recently used (move to front)
    self._move_to_front(node)

    # Return value
    return node.value
```

**Line-by-line breakdown:**

```python
if key not in self.cache:
    return -1
```
- Hash map lookup: O(1)
- If key doesn't exist, return -1 per requirements

```python
node = self.cache[key]
```
- Get node reference from hash map: O(1)
- This node contains the value and position in list

```python
self._move_to_front(node)
```
- Remove node from current position: O(1)
- Add to front (after head): O(1)
- Total: O(1)

```python
return node.value
```
- Return the cached value

**Total time complexity: O(1)**

### put(key, value) Implementation

```python
def put(self, key, value):
    """
    Insert or update key-value pair

    If cache is full, evict LRU item first

    Time: O(1)
    Space: O(1)
    """
    # Case 1: Key already exists → update value
    if key in self.cache:
        node = self.cache[key]
        node.value = value  # Update value
        self._move_to_front(node)  # Mark as recently used
        return

    # Case 2: Key doesn't exist → insert new node

    # Create new node
    new_node = Node(key, value)

    # Add to hash map
    self.cache[key] = new_node

    # Add to front of list (most recent)
    self._add_to_front(new_node)

    # Check capacity
    if len(self.cache) > self.capacity:
        # Evict LRU item
        lru_node = self._remove_lru()
        # Remove from hash map
        del self.cache[lru_node.key]
```

**Detailed breakdown:**

**Case 1: Key exists (update)**
```python
if key in self.cache:
    node = self.cache[key]
```
- Hash map lookup: O(1)
- Get existing node

```python
    node.value = value
```
- Update the value in place
- No change to key

```python
    self._move_to_front(node)
```
- Mark as recently used
- Remove from current position: O(1)
- Add to front: O(1)

```python
    return
```
- Done, no eviction needed

**Case 2: Key doesn't exist (insert)**
```python
new_node = Node(key, value)
```
- Create new node with key and value
- O(1) object creation

```python
self.cache[key] = new_node
```
- Add to hash map
- O(1) insertion

```python
self._add_to_front(new_node)
```
- Add to front of list (most recent position)
- O(1) insertion

```python
if len(self.cache) > self.capacity:
```
- Check if we exceeded capacity
- len() on dict is O(1)

```python
    lru_node = self._remove_lru()
```
- Get and remove least recent node (tail.prev)
- O(1) removal

```python
    del self.cache[lru_node.key]
```
- Remove from hash map using the node's key
- O(1) deletion
- This is why we store key in node!

**Total time complexity: O(1)**

---

## Complete Implementation

```python
class Node:
    """Doubly linked list node"""
    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    """
    LRU Cache with O(1) get and put operations

    Uses:
    - Hash map for O(1) key lookup
    - Doubly linked list for O(1) order tracking
    """

    def __init__(self, capacity):
        """
        Initialize cache with given capacity

        Time: O(1)
        Space: O(capacity)
        """
        self.capacity = capacity
        self.cache = {}  # key → Node

        # Dummy nodes to simplify edge cases
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _add_to_front(self, node):
        """Add node right after head (most recent)"""
        old_first = self.head.next

        self.head.next = node
        node.prev = self.head

        node.next = old_first
        old_first.prev = node

    def _remove_node(self, node):
        """Remove node from its current position"""
        prev_node = node.prev
        next_node = node.next

        prev_node.next = next_node
        next_node.prev = prev_node

    def _move_to_front(self, node):
        """Move existing node to front"""
        self._remove_node(node)
        self._add_to_front(node)

    def _remove_lru(self):
        """Remove and return least recently used node"""
        lru_node = self.tail.prev
        self._remove_node(lru_node)
        return lru_node

    def get(self, key):
        """
        Get value for key, -1 if not found

        Time: O(1)
        """
        if key not in self.cache:
            return -1

        node = self.cache[key]
        self._move_to_front(node)
        return node.value

    def put(self, key, value):
        """
        Insert or update key-value pair

        Time: O(1)
        """
        # Case 1: Update existing key
        if key in self.cache:
            node = self.cache[key]
            node.value = value
            self._move_to_front(node)
            return

        # Case 2: Insert new key
        new_node = Node(key, value)
        self.cache[key] = new_node
        self._add_to_front(new_node)

        # Evict LRU if over capacity
        if len(self.cache) > self.capacity:
            lru_node = self._remove_lru()
            del self.cache[lru_node.key]
```

---

## Detailed Trace Through Example

Let's trace through a complete example with capacity = 2.

**Initial state:**
```
cache = {}
head ←→ tail
```

### Operation 1: put(1, 1)

**Steps:**
```
1. key=1 not in cache (empty)
2. Create Node(1, 1)
3. cache[1] = Node(1, 1)
4. _add_to_front(Node(1, 1))
5. len(cache) = 1 <= capacity=2, no eviction

Result:
cache = {1: Node(1,1)}
head ←→ [1,1] ←→ tail
        ↑ most recent
```

### Operation 2: put(2, 2)

**Steps:**
```
1. key=2 not in cache
2. Create Node(2, 2)
3. cache[2] = Node(2, 2)
4. _add_to_front(Node(2, 2))
5. len(cache) = 2 <= capacity=2, no eviction

Result:
cache = {1: Node(1,1), 2: Node(2,2)}
head ←→ [2,2] ←→ [1,1] ←→ tail
        ↑ most recent   ↑ least recent
```

### Operation 3: get(1)

**Steps:**
```
1. key=1 in cache? YES
2. node = cache[1] → Node(1,1)
3. _move_to_front(Node(1,1))
   a. _remove_node: head ←→ [2,2] ←→ tail
   b. _add_to_front: head ←→ [1,1] ←→ [2,2] ←→ tail
4. return node.value = 1

Result:
cache = {1: Node(1,1), 2: Node(2,2)}
head ←→ [1,1] ←→ [2,2] ←→ tail
        ↑ most recent   ↑ least recent
Return: 1
```

### Operation 4: put(3, 3)

**Steps:**
```
1. key=3 not in cache
2. Create Node(3, 3)
3. cache[3] = Node(3, 3)
4. _add_to_front(Node(3, 3))
   head ←→ [3,3] ←→ [1,1] ←→ [2,2] ←→ tail

5. len(cache) = 3 > capacity=2 → EVICT
6. lru_node = _remove_lru()
   → lru_node = Node(2,2) (tail.prev)
   → After removal: head ←→ [3,3] ←→ [1,1] ←→ tail

7. del cache[lru_node.key] → del cache[2]

Result:
cache = {1: Node(1,1), 3: Node(3,3)}
head ←→ [3,3] ←→ [1,1] ←→ tail
        ↑ most recent   ↑ least recent
```

### Operation 5: get(2)

**Steps:**
```
1. key=2 in cache? NO (was evicted)
2. return -1

Result: -1
```

### Operation 6: put(4, 4)

**Steps:**
```
1. key=4 not in cache
2. Create Node(4, 4)
3. cache[4] = Node(4, 4)
4. _add_to_front(Node(4, 4))
   head ←→ [4,4] ←→ [3,3] ←→ [1,1] ←→ tail

5. len(cache) = 3 > capacity=2 → EVICT
6. lru_node = _remove_lru()
   → lru_node = Node(1,1)
   → After removal: head ←→ [4,4] ←→ [3,3] ←→ tail

7. del cache[1]

Result:
cache = {3: Node(3,3), 4: Node(4,4)}
head ←→ [4,4] ←→ [3,3] ←→ tail
        ↑ most recent   ↑ least recent
```

---

## Edge Cases and Testing

### Edge Case 1: Capacity = 1

```
Cache capacity: 1

put(1, 1):
  cache = {1: Node(1,1)}
  head ←→ [1,1] ←→ tail

put(2, 2):
  Insert [2,2]
  Evict [1,1] (LRU)
  cache = {2: Node(2,2)}
  head ←→ [2,2] ←→ tail

get(1):
  return -1 (evicted)
```

### Edge Case 2: Update Existing Key

```
Cache capacity: 2

put(1, 1):
  cache = {1: Node(1,1)}

put(2, 2):
  cache = {1: Node(1,1), 2: Node(2,2)}
  head ←→ [2,2] ←→ [1,1] ←→ tail

put(1, 10):  ← UPDATE
  node = cache[1]
  node.value = 10
  _move_to_front(node)
  cache = {1: Node(1,10), 2: Node(2,2)}
  head ←→ [1,10] ←→ [2,2] ←→ tail

Result: No eviction, just update and move to front
```

### Edge Case 3: All Gets (No Eviction)

```
Cache capacity: 2

put(1, 1):
put(2, 2):
  cache = {1: Node(1,1), 2: Node(2,2)}

get(1): return 1, moves [1,1] to front
get(2): return 2, moves [2,2] to front
get(1): return 1, moves [1,1] to front
get(2): return 2, moves [2,2] to front

No evictions occur, just reordering
```

### Edge Case 4: Sequential Puts with Evictions

```
Cache capacity: 2

put(1, 1): cache = {1}
put(2, 2): cache = {1, 2}
put(3, 3): evict 1, cache = {2, 3}
put(4, 4): evict 2, cache = {3, 4}
put(5, 5): evict 3, cache = {4, 5}

Pattern: Always evicting the oldest entry
```

---

## Common Mistakes

### Mistake 1: Using Singly Linked List

**Problem:**
```python
# With singly linked list
def _remove_node(self, node):
    # Need to find previous node by traversing from head
    current = self.head
    while current.next != node:  # O(n) traversal!
        current = current.next
    current.next = node.next
```

**Why doubly linked list is better:**
```python
# With doubly linked list
def _remove_node(self, node):
    # Direct access to previous node
    prev_node = node.prev  # O(1)
    next_node = node.next
    prev_node.next = next_node
    next_node.prev = prev_node
```

### Mistake 2: Not Storing Key in Node

**Problem:**
```python
class Node:
    def __init__(self, value):
        self.value = value  # No key!
        # ...

def put(self, key, value):
    # ...
    if len(self.cache) > self.capacity:
        lru_node = self._remove_lru()
        del self.cache[???]  # What key to delete??
```

**Fix:** Store key in node
```python
class Node:
    def __init__(self, key, value):
        self.key = key  # Store key!
        self.value = value
```

### Mistake 3: Forgetting to Move to Front on get()

**Wrong:**
```python
def get(self, key):
    if key not in self.cache:
        return -1
    return self.cache[key].value  # WRONG: doesn't update recency
```

**Correct:**
```python
def get(self, key):
    if key not in self.cache:
        return -1
    node = self.cache[key]
    self._move_to_front(node)  # CORRECT: mark as recently used
    return node.value
```

### Mistake 4: Not Using Dummy Nodes

**Without dummy nodes:**
```python
# Many special cases needed!
def _add_to_front(self, node):
    if self.head is None:  # Empty list case
        self.head = node
        self.tail = node
    else:  # Non-empty list case
        node.next = self.head
        self.head.prev = node
        self.head = node
```

**With dummy nodes:**
```python
# Single code path!
def _add_to_front(self, node):
    old_first = self.head.next
    self.head.next = node
    node.prev = self.head
    node.next = old_first
    old_first.prev = node
```

### Mistake 5: Wrong Eviction Check

**Wrong:**
```python
if len(self.cache) == self.capacity:  # WRONG: should be >
    self._remove_lru()
```

**Why wrong?**
```
Capacity = 2
After put(1,1): len=1
After put(2,2): len=2
After put(3,3): len=3 > 2 ✓ CORRECT
If we check len == capacity, we evict too early!
```

**Correct:**
```python
if len(self.cache) > self.capacity:  # CORRECT
    self._remove_lru()
```

---

## Complexity Analysis

### Time Complexity

**get(key): O(1)**
- Hash map lookup: O(1)
- Move to front: O(1)
  - Remove node: O(1)
  - Add to front: O(1)
- Total: O(1)

**put(key, value): O(1)**
- Hash map lookup: O(1)
- Create node: O(1)
- Add to hash map: O(1)
- Add to front: O(1)
- Eviction (if needed):
  - Remove LRU node: O(1)
  - Delete from hash map: O(1)
- Total: O(1)

### Space Complexity

**O(capacity)**
- Hash map: stores up to `capacity` entries
- Doubly linked list: stores up to `capacity` nodes
- Each entry exists in both structures
- Total: O(capacity)

**Why not O(2 × capacity)?**
Because we count nodes, not pointers. Each key-value pair is stored once, with two pointers to it (hash map + list).

---

## Variations and Extensions

### Variation 1: LFU Cache (Least Frequently Used)

Instead of least recently used, evict least frequently used:

```python
# Need to track frequency counts
# Use hash map + multiple doubly linked lists (one per frequency)
# More complex than LRU
```

### Variation 2: TTL Cache (Time To Live)

Items expire after a certain time:

```python
class TTLCache:
    def __init__(self, capacity, ttl):
        self.capacity = capacity
        self.ttl = ttl  # Time to live in seconds
        self.cache = {}  # key → (value, timestamp)

    def get(self, key):
        if key not in self.cache:
            return -1

        value, timestamp = self.cache[key]
        if time.time() - timestamp > self.ttl:
            # Expired
            del self.cache[key]
            return -1

        return value
```

### Variation 3: Write-Through Cache

Cache writes immediately to underlying storage:

```python
class WriteThroughCache:
    def put(self, key, value):
        # Update cache
        super().put(key, value)
        # Also write to database
        self.database.write(key, value)
```

### Variation 4: Thread-Safe LRU Cache

Add locking for concurrent access:

```python
import threading

class ThreadSafeLRUCache:
    def __init__(self, capacity):
        self.lock = threading.Lock()
        # ... LRU cache implementation

    def get(self, key):
        with self.lock:
            # ... normal get logic

    def put(self, key, value):
        with self.lock:
            # ... normal put logic
```

---

## Interview Talking Points

### How to Explain the Design (3-minute version)

> "The key challenge is achieving O(1) for both get and put operations. I need fast lookup by key, which suggests a hash map. But I also need to track access order and quickly find the least recently used item.
>
> My solution combines a hash map with a doubly linked list:
>
> The hash map provides O(1) key lookup and maps keys to nodes in the linked list.
>
> The doubly linked list maintains access order - most recent at the head, least recent at the tail. Doubly linked is crucial because I need O(1) removal from anywhere in the list, which requires access to the previous node.
>
> For get operations, I look up the node in the hash map and move it to the front of the list.
>
> For put operations, if the key exists I update and move to front. If it's new, I insert at the front and check capacity. If over capacity, I remove the tail (least recent) from both the list and hash map.
>
> I use dummy head and tail nodes to eliminate special cases for empty lists or single elements."

### Common Follow-Up Questions

**Q: Why doubly linked list instead of singly linked?**

A: "With singly linked, removing a node requires O(n) traversal to find the previous node. Doubly linked gives O(1) removal because each node has a previous pointer."

**Q: Could you use an ordered dictionary?**

A: "Yes! Python's OrderedDict or Java's LinkedHashMap already implement this pattern. But in interviews, we implement from scratch to demonstrate understanding."

**Q: What if we need O(1) time and O(1) space?**

A: "That's impossible. We must store at least O(capacity) items - that's the definition of a cache. O(1) space would mean constant space regardless of capacity, which can't hold variable data."

**Q: How would you handle cache invalidation?**

A: "Add a method to explicitly remove entries, or implement TTL where entries expire after a time period. For distributed caches, use pub-sub to broadcast invalidation events."

---

## Practice Exercises

### Exercise 1: Implement from Scratch
Close this walkthrough and implement LRU cache without looking. Time limit: 30 minutes.

### Exercise 2: Test Edge Cases
Write test cases for:
- Capacity = 1
- Updating existing keys
- All gets (no eviction)
- All puts (constant eviction)
- Alternating get/put

### Exercise 3: Trace on Paper
On paper, trace through these operations with capacity = 3:
```
put(1,1), put(2,2), put(3,3), get(1), put(4,4), get(2), put(5,5)
```

### Exercise 4: Implement LFU
Try implementing Least Frequently Used cache. How does the design differ?

### Exercise 5: Add Features
Extend your implementation to:
- Return cache statistics (hit rate, miss rate)
- Support bulk operations (get_all, put_all)
- Add TTL expiration

---

## Summary

### Key Takeaways

1. **Combine data structures**: Sometimes no single structure suffices - combine their strengths

2. **Hash map + doubly linked list pattern**: Classic combination for O(1) lookup + O(1) ordering

3. **Dummy nodes**: Simplify edge cases for linked lists

4. **Store bidirectional references**: Node stores key for hash map deletion, hash map stores node reference for list operations

5. **Access = modification**: Both reads (get) and writes (put) update recency

### Design Decisions Summary

| Requirement | Data Structure | Why |
|-------------|----------------|-----|
| O(1) lookup | Hash map | Direct key → value mapping |
| O(1) order tracking | Doubly linked list | LIFO-like access order |
| O(1) removal anywhere | Doubly linked list | Previous pointer |
| Find LRU in O(1) | Doubly linked list | Tail is always LRU |
| No special cases | Dummy head/tail | Uniform operations |

### Pattern Recognition

Use hash map + doubly linked list when you need:
- Fast lookup by key (O(1))
- Fast ordering/access tracking (O(1))
- Fast removal from arbitrary position (O(1))
- Examples: LRU cache, browser history, music playlist

### Next Steps

1. Implement LFU (Least Frequently Used) cache
2. Study OrderedDict / LinkedHashMap implementations
3. Learn about cache replacement policies (FIFO, LRU, LFU, MRU)
4. Explore distributed caching systems (Redis, Memcached)

---

**Remember:** LRU cache is more than just a coding problem - it's a fundamental pattern in system design. Understanding this implementation gives you insight into how operating systems manage memory pages, how browsers cache web pages, and how databases optimize queries. This knowledge applies far beyond interviews.
