---
id: E221
old_id: A172
slug: design-hashset
title: Design HashSet
difficulty: easy
category: easy
topics: ["hash-table", "design", "array"]
patterns: ["hash-lookup", "chaining"]
estimated_time_minutes: 15
frequency: medium
related_problems:
  - E222_design_hashmap
  - E705_design_linked_list
  - M146_lru_cache
prerequisites:
  - Hash function concepts
  - Collision resolution
  - Array/List operations
strategy_ref: ../strategies/data-structures/hash-tables.md
---
# Design HashSet

## Problem

Implement your own HashSet data structure from the ground up, without using any built-in hash table libraries. A **HashSet** is a collection that stores unique elements and provides fast lookup, insertion, and deletion operations.

Your `MyHashSet` class needs to support three operations. First, `add(key)` should insert the given key into the set if it's not already present. Second, `contains(key)` should return true if the key exists in the set, false otherwise. Third, `remove(key)` should delete the key from the set if it exists; if the key is absent, this operation should do nothing (no error).

The core challenge is implementing these operations efficiently, ideally in O(1) average time. You'll need to understand how hash functions map keys to storage locations, and crucially, how to handle **collisions** when two different keys hash to the same location. There are several collision resolution strategies; the simplest is "separate chaining" where each storage location holds a list of keys.

Important constraints to consider: keys are integers in the range `[0, 10⁶]`, and you'll receive at most 10,000 operations total. A naive approach of using a boolean array of size 10⁶ would work but isn't what interviewers want to see. They're looking for a proper hashing strategy with collision handling.

Your `MyHashSet` class should support these operations:

- `void add(key)` Adds the specified `key` to the set.
- `bool contains(key)` Checks whether the given `key` is present in the set.
- `void remove(key)` Deletes the specified `key` from the set. If the `key` is not found, no action is taken.

## Why This Matters

Hash tables power nearly every high-performance application you've used: Python dictionaries, JavaScript objects, Java HashMaps, and database indexing. Understanding how they work under the hood transforms you from someone who uses data structures to someone who chooses the right one for the job. This knowledge is critical when debugging performance issues or when built-in options don't fit your constraints.

In real systems, hash tables enable constant-time caching (web browsers cache DNS lookups in hash tables), deduplication (detecting duplicate files or database records), and set operations (finding common elements between datasets). The "separate chaining" technique you'll implement here is used in production hash tables, though industrial-strength implementations add optimizations like dynamic resizing, better hash functions, and alternative collision strategies.

This problem is interview gold because it tests multiple skills simultaneously: understanding hash functions, handling edge cases (duplicate additions, removing non-existent keys), analyzing load factors, and discussing time-space tradeoffs. It's a warmup for harder design problems like LRU Cache and a foundation for understanding why certain operations are O(1) "on average" but O(n) worst-case. The concepts here generalize to distributed systems (consistent hashing for load balancing) and cryptography (hash-based message authentication).

## Examples

**Example 1:**
```
Input:
["MyHashSet", "add", "add", "contains", "contains", "add", "contains", "remove", "contains"]
[[], [1], [2], [1], [3], [2], [2], [2], [2]]

Output:
[null, null, null, true, false, null, true, null, false]

Explanation:
MyHashSet myHashSet = new MyHashSet();
myHashSet.add(1);      // set = [1]
myHashSet.add(2);      // set = [1, 2]
myHashSet.contains(1); // return True
myHashSet.contains(3); // return False (not found)
myHashSet.add(2);      // set = [1, 2] (no duplicates)
myHashSet.contains(2); // return True
myHashSet.remove(2);   // set = [1]
myHashSet.contains(2); // return False (already removed)
```

## Constraints

- 0 <= key <= 10⁶
- At most 10⁴ calls will be made to add, remove, and contains.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Initial Direction
A hash set needs to map keys to storage locations. What's a simple way to convert a key into an array index? How do you handle two keys mapping to the same index (collision)?

### Tier 2 Hint - Key Insight
Use an array of buckets where each bucket is a list. Apply a hash function (e.g., `key % bucket_count`) to determine which bucket. Within each bucket, use a simple list to store keys. This is called "separate chaining" for collision resolution.

### Tier 3 Hint - Implementation Details
Create an array of 1000 buckets (lists). For `add(key)`, compute `bucket_idx = key % 1000`, check if key exists in `buckets[bucket_idx]`, if not append it. For `contains(key)`, check if key is in `buckets[key % 1000]`. For `remove(key)`, find and remove from the appropriate bucket.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Chaining with buckets | O(n/k) avg, O(n) worst | O(n + k) | k = number of buckets, n = elements |
| Boolean array (direct) | O(1) | O(max_key) | Only works for small key range |
| Binary search tree buckets | O(log(n/k)) avg | O(n) | Better worst case than lists |
| Open addressing | O(1) avg, O(n) worst | O(n) | Linear probing or quadratic probing |

**Optimization notes:**
- More buckets reduce collision but increase space
- Load factor (n/k) should be kept around 0.75
- Can resize buckets when load factor exceeds threshold

## Common Mistakes

### Mistake 1: Using single list instead of buckets
```python
# Wrong - degrades to O(n) for all operations
def __init__(self):
    self.data = []  # Single list!

def add(self, key):
    if key not in self.data:
        self.data.append(key)

# Correct - use buckets
def __init__(self):
    self.buckets = [[] for _ in range(1000)]

def add(self, key):
    bucket = self.buckets[key % 1000]
    if key not in bucket:
        bucket.append(key)
```

### Mistake 2: Not handling duplicates in add
```python
# Wrong - allows duplicates
def add(self, key):
    bucket = self.buckets[key % 1000]
    bucket.append(key)  # Always adds!

# Correct - check before adding
def add(self, key):
    bucket = self.buckets[key % 1000]
    if key not in bucket:
        bucket.append(key)
```

### Mistake 3: Error when removing non-existent key
```python
# Wrong - throws error if key not present
def remove(self, key):
    bucket = self.buckets[key % 1000]
    bucket.remove(key)  # ValueError if not found!

# Correct - check before removing
def remove(self, key):
    bucket = self.buckets[key % 1000]
    if key in bucket:
        bucket.remove(key)
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Design HashMap | Easy | Store key-value pairs instead of just keys |
| Dynamic resizing | Medium | Resize buckets when load factor exceeds threshold |
| Open addressing | Medium | Use linear/quadratic probing instead of chaining |
| Bloom filter | Hard | Probabilistic set with false positives but no false negatives |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve independently without hints (30 min time limit)
- [ ] Implement chaining approach
- [ ] Handle collisions correctly
- [ ] Test with keys mapping to same bucket

**Spaced Repetition**
- [ ] Day 1: Solve again from scratch
- [ ] Day 3: Implement with different bucket count
- [ ] Week 1: Implement open addressing variation
- [ ] Week 2: Add dynamic resizing feature

**Mastery Validation**
- [ ] Can explain hash function and collision resolution
- [ ] Can analyze trade-offs of bucket count
- [ ] Solve in under 10 minutes
- [ ] Implement without referring to notes

**Strategy**: See [Hash Table Pattern](../strategies/data-structures/hash-tables.md)
