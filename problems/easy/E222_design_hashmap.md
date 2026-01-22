---
id: E222
old_id: A173
slug: design-hashmap
title: Design HashMap
difficulty: easy
category: easy
topics: ["hash-table", "design", "array"]
patterns: ["hash-lookup", "chaining"]
estimated_time_minutes: 15
frequency: medium
related_problems:
  - E221_design_hashset
  - M146_lru_cache
  - M460_lfu_cache
prerequisites:
  - Hash function concepts
  - Collision resolution
  - Key-value pair storage
strategy_ref: ../prerequisites/hash-tables.md
---
# Design HashMap

## Problem

Build your own HashMap data structure from scratch without relying on any built-in hash table libraries. A **HashMap** (also called a dictionary or associative array) stores key-value pairs and provides fast lookup, insertion, and deletion based on keys.

Your `MyHashMap` class must support three core operations. First, `put(key, value)` should store a key-value pair in the map; if the key already exists, update its value to the new one. Second, `get(key)` should return the value associated with the given key, or `-1` if the key doesn't exist. Third, `remove(key)` should delete the key and its associated value from the map if present; if the key doesn't exist, do nothing.

The critical difference from HashSet is that you're now storing **pairs** (key, value) rather than just keys. This means when you find a matching key in a bucket, you need to either return its value or update it, not just confirm its presence. The collision handling becomes slightly more complex because you need to search through pairs to find matching keys, then extract values or perform updates.

Important details: both keys and values are integers in the range `[0, 10⁶]`, and you'll receive at most 10,000 total operations. When the same key is put multiple times, only the most recent value should be retained. The return value of `-1` for missing keys is a common convention that allows distinguishing between "key not found" and "key maps to 0".

Your `MyHashMap` class must provide the following functionality:

- `MyHashMap()` Creates an empty map instance.
- `void put(int key, int value)` Stores a key-value pair in the map. If the key is already present, its value should be updated.
- `int get(int key)` Retrieves the value associated with the given key, returning `-1` if no such key exists.
- `void remove(key)` Removes the key and its associated value from the map, if present.

## Why This Matters

HashMaps are the workhorse data structure behind countless systems: JSON parsing, database query optimization, compiler symbol tables, and web framework routing. Every time you use a dictionary in Python, an object in JavaScript, or a Map in Java, you're leveraging the HashMap pattern. Understanding the implementation reveals why certain operations are fast and others aren't, which is critical when optimizing real applications.

Real-world applications include caching (storing computed results to avoid recalculation, like memoization in dynamic programming), indexing (databases use hash indexes for fast lookups on non-primary keys), and counting/grouping operations (word frequency counts, grouping users by country). The key-value abstraction is so powerful that entire databases (Redis, DynamoDB) are built around it.

This problem extends HashSet by adding value management, which introduces new challenges. You need to handle **updates** correctly (finding existing key and changing its value) versus **insertions** (adding new key-value pair). This distinction appears in many interview follow-ups: "What if values are large objects? What if we need to track access order (leading to LRU cache)?"

From an interview perspective, this problem tests your ability to manage paired data, handle update vs insert logic, and discuss trade-offs like bucket sizing. It's a stepping stone to advanced caching problems and demonstrates why hash tables achieve O(1) average-case performance. The separate chaining technique you'll use here is how Python dictionaries worked before version 3.6 (which added order preservation using different internals).

## Examples

**Example 1:**
```
Input:
["MyHashMap", "put", "put", "get", "get", "put", "get", "remove", "get"]
[[], [1, 1], [2, 2], [1], [3], [2, 1], [2], [2], [2]]

Output:
[null, null, null, 1, -1, null, 1, null, -1]

Explanation:
MyHashMap myHashMap = new MyHashMap();
myHashMap.put(1, 1);    // map is now {1=1}
myHashMap.put(2, 2);    // map is now {1=1, 2=2}
myHashMap.get(1);       // return 1
myHashMap.get(3);       // return -1 (not found)
myHashMap.put(2, 1);    // map is now {1=1, 2=1} (update existing key)
myHashMap.get(2);       // return 1
myHashMap.remove(2);    // map is now {1=1}
myHashMap.get(2);       // return -1 (already removed)
```

## Constraints

- 0 <= key, value <= 10⁶
- At most 10⁴ calls will be made to put, get, and remove.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Initial Direction
Similar to a hash set, but now you need to store both keys and values. How can you modify the bucket structure to hold pairs instead of single values? What happens when updating an existing key?

### Tier 2 Hint - Key Insight
Use an array of buckets where each bucket stores a list of (key, value) pairs. Hash the key to find the bucket. Within a bucket, search linearly for the key. For `put`, if key exists update its value, otherwise append a new pair. For `get`, search the bucket and return value or -1.

### Tier 3 Hint - Implementation Details
Create `buckets = [[] for _ in range(1000)]`. For `put(key, val)`, compute `idx = key % 1000`. Search `buckets[idx]` for existing key. If found, update value. If not, append `(key, val)`. For `get(key)`, search bucket and return value or -1. For `remove(key)`, find and remove the pair from bucket.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Chaining with buckets | O(n/k) avg, O(n) worst | O(n + k) | k = buckets, n = key-value pairs |
| Direct array mapping | O(1) | O(max_key) | Only for small key ranges |
| BST buckets | O(log(n/k)) avg | O(n) | Better worst case |
| Open addressing | O(1) avg, O(n) worst | O(n) | Linear/quadratic probing |

**Optimization notes:**
- Optimal bucket count balances time and space
- Load factor should be around 0.75
- Can use dynamic resizing for better performance
- Using tuples or custom Node class for pairs

## Common Mistakes

### Mistake 1: Not updating existing keys
```python
# Wrong - creates duplicate keys
def put(self, key, value):
    bucket = self.buckets[key % 1000]
    bucket.append((key, value))  # Always appends!

# Correct - update if exists
def put(self, key, value):
    bucket = self.buckets[key % 1000]
    for i, (k, v) in enumerate(bucket):
        if k == key:
            bucket[i] = (key, value)
            return
    bucket.append((key, value))
```

### Mistake 2: Incorrect get implementation
```python
# Wrong - doesn't return -1 for missing keys
def get(self, key):
    bucket = self.buckets[key % 1000]
    for k, v in bucket:
        if k == key:
            return v
    # Forgot to return -1!

# Correct - return -1 when not found
def get(self, key):
    bucket = self.buckets[key % 1000]
    for k, v in bucket:
        if k == key:
            return v
    return -1
```

### Mistake 3: Inefficient bucket search
```python
# Wrong - rebuilding list on every remove
def remove(self, key):
    bucket = self.buckets[key % 1000]
    self.buckets[key % 1000] = [(k, v) for k, v in bucket if k != key]

# Correct - remove in place
def remove(self, key):
    bucket = self.buckets[key % 1000]
    for i, (k, v) in enumerate(bucket):
        if k == key:
            bucket.pop(i)
            return
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Design HashSet | Easy | Store only keys without values |
| LRU Cache | Medium | HashMap with recency tracking and capacity limit |
| Thread-safe HashMap | Hard | Add synchronization for concurrent access |
| Consistent hashing | Hard | Distribute keys across dynamic nodes |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve independently without hints (30 min time limit)
- [ ] Implement chaining with buckets
- [ ] Handle key updates correctly
- [ ] Test with collisions and edge cases

**Spaced Repetition**
- [ ] Day 1: Solve again from scratch
- [ ] Day 3: Optimize bucket search with early termination
- [ ] Week 1: Implement open addressing variation
- [ ] Week 2: Build LRU cache using this as base

**Mastery Validation**
- [ ] Can explain difference between HashSet and HashMap
- [ ] Can handle update vs insert logic
- [ ] Solve in under 10 minutes
- [ ] Implement without referring to notes

**Strategy**: See [Hash Table Pattern](../prerequisites/hash-tables.md)
