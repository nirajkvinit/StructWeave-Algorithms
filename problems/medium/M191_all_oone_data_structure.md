---
id: M191
old_id: I231
slug: all-oone-data-structure
title: All O`one Data Structure
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems: ["E146", "M380", "M460"]
prerequisites: ["hash-table", "doubly-linked-list", "data-structure-design"]
---
# All O`one Data Structure

## Problem

Your challenge is to design a data structure that efficiently tracks how often different strings appear and can instantly retrieve which strings are most or least common. Think of it like managing real-time statistics where you need to know both the popularity leader and the underdog at any moment.

Build the `AllOne` class with these methods:

- `AllOne()` Creates a new instance of the data structure.
- `inc(String key)` Adds 1 to the occurrence count for `key`. If `key` is not yet tracked, start tracking it with an initial count of `1`.
- `dec(String key)` Subtracts 1 from the occurrence count for `key`. When `key` reaches a count of `0`, stop tracking it. You may assume `key` is already being tracked when this is called.
- `getMaxKey()` Retrieves any string with the highest occurrence count. Return `""` if no strings are tracked.
- `getMinKey()` Retrieves any string with the lowest occurrence count. Return `""` if no strings are tracked.

The key constraint here is that all operations should execute in `O(1)` average time complexity. This means no matter how many strings you're tracking, each operation should take roughly the same amount of time. This is a challenging requirement that forces you to think beyond simple hash maps or sorting, as both would make some operations slower. Consider how you might organize strings into groups based on their counts, and how you could efficiently move strings between groups as their counts change.

## Why This Matters

This problem directly mirrors the design of LRU (Least Recently Used) and LFU (Least Frequently Used) caching systems used in modern web browsers, operating systems, and database engines. When your browser caches web pages or your operating system manages memory, it needs to quickly evict the least useful items while tracking access patterns. Similarly, real-time analytics dashboards for monitoring website traffic, API usage metrics, or social media trending topics require instant access to both the most and least active items without scanning through millions of entries. The data structure design pattern you develop here combining hash maps with doubly-linked lists of buckets is a fundamental technique used in Redis (an in-memory database), CDN edge caches, and rate-limiting systems that protect web services from overload. Mastering this problem teaches you how to maintain multiple invariants simultaneously while achieving constant-time performance, a skill directly applicable to building high-performance backend services.

## Constraints

- 1 <= key.length <= 10
- key consists of lowercase English letters.
- It is guaranteed that for each call to dec, key is existing in the data structure.
- At most 5 * 10⁴ calls will be made to inc, dec, getMaxKey, and getMinKey.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual Understanding</summary>
To achieve O(1) for all operations, you need a combination of data structures. A hash map alone can't give O(1) min/max retrieval. Think about maintaining keys grouped by their counts, and keeping these groups in sorted order. A doubly-linked list of count buckets can provide O(1) traversal to min/max.
</details>

<details>
<summary>🎯 Hint 2: Data Structure Design</summary>
Use two hash maps and a doubly-linked list: 1) Map from key to current count, 2) Map from count to a bucket node containing all keys with that count, 3) Doubly-linked list of buckets sorted by count. This allows O(1) updates by moving keys between adjacent buckets, and O(1) min/max by accessing head/tail buckets.
</details>

<details>
<summary>📝 Hint 3: Algorithm for inc/dec</summary>
```
inc(key):
1. Get current count from key_count map (0 if not present)
2. Remove key from bucket at current count
3. Add key to bucket at count+1 (create bucket if needed)
4. Update key_count[key] = count+1
5. If old bucket is now empty, remove it from list

dec(key):
1. Get current count from key_count map
2. Remove key from bucket at current count
3. If count > 1, add key to bucket at count-1
4. Else remove key from key_count map entirely
5. If old bucket is now empty, remove it from list

getMaxKey(): Return any key from tail bucket's key set
getMinKey(): Return any key from head bucket's key set
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| HashMap + Sorted List | O(log k) all ops | O(n + k) | k = unique counts, requires binary search |
| HashMap + Heap | O(log n) inc/dec, O(1) get | O(n) | Heap doesn't support arbitrary updates well |
| HashMap + DLL of Buckets | O(1) all ops | O(n + k) | Optimal - maintains sorted buckets |
| Naive HashMap only | O(1) inc/dec, O(n) get | O(n) | Can't achieve O(1) for getMin/getMax |

**Recommended approach**: HashMap + doubly-linked list of buckets for O(1) all operations.

## Common Mistakes

**Mistake 1: Using priority queue for min/max tracking**
```python
# Wrong: Heap doesn't support O(1) arbitrary key updates
class AllOne:
    def __init__(self):
        self.counts = {}
        self.min_heap = []  # Can't update counts in O(1)
        self.max_heap = []

    def inc(self, key):
        self.counts[key] = self.counts.get(key, 0) + 1
        # Need to rebuild heaps - O(n log n)
        self.min_heap = [(v, k) for k, v in self.counts.items()]
        heapify(self.min_heap)
```

```python
# Correct: Use doubly-linked list of buckets
class Bucket:
    def __init__(self, count):
        self.count = count
        self.keys = set()
        self.prev = None
        self.next = None

class AllOne:
    def __init__(self):
        self.key_count = {}  # key -> count
        self.count_bucket = {}  # count -> bucket node
        self.head = Bucket(0)  # Dummy head
        self.tail = Bucket(0)  # Dummy tail
        self.head.next = self.tail
        self.tail.prev = self.head

    def inc(self, key):
        count = self.key_count.get(key, 0)
        self.key_count[key] = count + 1
        # Move key to bucket with count+1 (O(1) list manipulation)
        # ... implementation
```

**Mistake 2: Not handling empty bucket removal**
```python
# Wrong: Leaves empty buckets in the linked list
def inc(self, key):
    count = self.key_count.get(key, 0)

    # Remove from old bucket
    if count > 0:
        old_bucket = self.count_bucket[count]
        old_bucket.keys.remove(key)
        # Missing: if old_bucket.keys is empty, remove bucket from list

    # Add to new bucket
    new_count = count + 1
    if new_count not in self.count_bucket:
        # Create and insert new bucket
        new_bucket = Bucket(new_count)
        self.count_bucket[new_count] = new_bucket
        # Insert after old bucket...

    self.count_bucket[new_count].keys.add(key)
    self.key_count[key] = new_count
```

```python
# Correct: Removes empty buckets
def inc(self, key):
    count = self.key_count.get(key, 0)

    # Remove from old bucket
    if count > 0:
        old_bucket = self.count_bucket[count]
        old_bucket.keys.remove(key)
        if not old_bucket.keys:  # Bucket is now empty
            self._remove_bucket(old_bucket)
            del self.count_bucket[count]

    # Add to new bucket
    new_count = count + 1
    if new_count not in self.count_bucket:
        new_bucket = Bucket(new_count)
        self.count_bucket[new_count] = new_bucket
        self._insert_bucket_after(new_bucket, old_bucket if count > 0 else self.head)

    self.count_bucket[new_count].keys.add(key)
    self.key_count[key] = new_count

def _remove_bucket(self, bucket):
    bucket.prev.next = bucket.next
    bucket.next.prev = bucket.prev
```

**Mistake 3: Returning wrong key when buckets exist**
```python
# Wrong: Returns empty string even when keys exist
def getMaxKey(self):
    if self.tail.prev == self.head:
        return ""
    # Forgot to actually return a key from the bucket
    return ""
```

```python
# Correct: Returns arbitrary key from max bucket
def getMaxKey(self):
    if self.tail.prev == self.head:  # No buckets
        return ""
    max_bucket = self.tail.prev
    return next(iter(max_bucket.keys))  # Any key from the set

def getMinKey(self):
    if self.head.next == self.tail:  # No buckets
        return ""
    min_bucket = self.head.next
    return next(iter(min_bucket.keys))
```

## Variations

| Variation | Difference | Key Insight |
|-----------|-----------|-------------|
| LFU Cache | Evict least frequently used | Same bucket structure + capacity limit |
| Top K Frequent | Return k most frequent keys | Maintain size-k set in max buckets |
| Frequency Histogram | Return count distribution | Buckets already maintain this |
| Weighted Keys | Different increment amounts | Generalize to arbitrary count changes |
| Time-windowed Counts | Expire old increments | Add timestamp tracking to each bucket |

## Practice Checklist

Use spaced repetition to master this problem:

- [ ] Day 1: Implement basic structure with HashMap + DLL
- [ ] Day 2: Add proper bucket insertion/removal
- [ ] Day 4: Implement without looking at notes
- [ ] Day 7: Solve and trace through inc/dec operations
- [ ] Day 14: Solve variations (LFU cache)
- [ ] Day 30: Speed test - solve in under 25 minutes
