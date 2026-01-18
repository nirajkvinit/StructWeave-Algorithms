---
id: M325
old_id: A144
slug: map-sum-pairs
title: Map Sum Pairs
difficulty: medium
category: medium
topics: ["hash-table", "string", "trie"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["M208", "M677", "E720"]
prerequisites: ["trie", "hash-table", "prefix-operations"]
---
# Map Sum Pairs

## Problem

Design a `MapSum` data structure that combines a key-value store with prefix-based aggregation. Unlike a standard hash map, this structure can efficiently answer "what's the sum of all values whose keys start with a given prefix?"

Your `MapSum` class needs to support three operations:

- `MapSum()`: Initialize an empty map
- `void insert(String key, int val)`: Insert or update a key-value pair. If the key already exists, replace its old value with the new value
- `int sum(String prefix)`: Return the sum of all values whose keys start with the given prefix

For example, after inserting "apple" → 3 and "app" → 2, calling `sum("ap")` should return 5 (because both "apple" and "app" start with "ap"). If you then update "apple" → 5, the next call to `sum("ap")` should return 7.

The tricky part is handling updates correctly. When you update an existing key's value, you can't just add the new value to your stored sums, or you'll count the old value twice. Instead, you need to track the delta (difference between new and old values) and adjust all affected prefix sums accordingly.

A naive solution would iterate through all keys on every `sum` call, checking which ones match the prefix. However, with up to 50 operations total and keys up to length 50, you can optimize significantly using a trie data structure where each node stores the sum of all values in its subtree.

## Why This Matters

Prefix-based aggregation appears in autocomplete systems (suggesting completions with associated scores), analytics dashboards (summing metrics for URL prefixes), file system tools (calculating directory sizes), and DNS servers (aggregating records by domain prefix).

This problem teaches you to augment standard data structures with additional bookkeeping. The technique of storing aggregate information at each trie node (rather than computing it on demand) is a classic space-time tradeoff that appears in segment trees, Fenwick trees, and database indexes.

Understanding how to maintain invariants during updates (ensuring prefix sums stay correct when values change) is crucial for any system that caches computed results for performance.

## Constraints

- 1 <= key.length, prefix.length <= 50
- key and prefix consist of only lowercase English letters.
- 1 <= val <= 1000
- At most 50 calls will be made to insert and sum.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Brute Force with Hash Map</summary>

Use a hash map to store key-value pairs. For each `sum(prefix)` call, iterate through all keys and sum values for keys that start with the prefix:

```python
class MapSum:
    def __init__(self):
        self.map = {}

    def insert(self, key, val):
        self.map[key] = val

    def sum(self, prefix):
        total = 0
        for key, val in self.map.items():
            if key.startswith(prefix):
                total += val
        return total
```

Time: insert O(1), sum O(n×m) where n = number of keys, m = key length.

</details>

<details>
<summary>Hint 2: Trie with Sum Storage</summary>

Optimize using a Trie where each node stores the sum of all values in its subtree. When inserting, update the sum along the path:

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.sum = 0

class MapSum:
    def __init__(self):
        self.root = TrieNode()
        self.map = {}  # Track existing values for updates

    def insert(self, key, val):
        delta = val - self.map.get(key, 0)  # Handle updates
        self.map[key] = val

        node = self.root
        for char in key:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
            node.sum += delta  # Update sum along path

    def sum(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return 0
            node = node.children[char]
        return node.sum
```

Time: insert O(m), sum O(m) where m = key/prefix length.

</details>

<details>
<summary>Hint 3: Handle Updates Correctly</summary>

The tricky part is handling when a key already exists. When updating:
1. Calculate the difference (delta) between new and old value
2. Update all nodes along the path by this delta
3. Store the new value in the auxiliary map

This ensures that prefix sums remain correct even after updates.

Example:
- insert("apple", 3): All nodes in "apple" path have sum += 3
- insert("apple", 5): Delta = 5-3 = 2, all nodes in "apple" path have sum += 2

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash Map | insert: O(1), sum: O(n×m) | O(n×m) | n = keys, m = avg length; slow sum |
| Trie with Sum | insert: O(m), sum: O(m) | O(n×m) | Optimal for prefix queries |
| Prefix Hash Map | insert: O(m²), sum: O(1) | O(n×m²) | Store all prefixes; memory intensive |

## Common Mistakes

**Mistake 1: Not Handling Key Updates**
```python
# Wrong: Always adding the new value
def insert(self, key, val):
    node = self.root
    for char in key:
        if char not in node.children:
            node.children[char] = TrieNode()
        node = node.children[char]
        node.sum += val  # Wrong! If key exists, this adds twice

# Correct: Calculate delta for updates
delta = val - self.map.get(key, 0)
node.sum += delta
```

**Mistake 2: Forgetting to Store Old Values**
```python
# Wrong: No way to calculate delta on update
class MapSum:
    def __init__(self):
        self.root = TrieNode()
        # Missing: self.map = {}

# Correct: Track values separately
self.map = {}  # Needed for delta calculation
```

**Mistake 3: Returning Node Instead of Sum**
```python
# Wrong: Returning the node object
def sum(self, prefix):
    node = self.root
    for char in prefix:
        if char not in node.children:
            return 0
        node = node.children[char]
    return node  # Wrong! Should return node.sum

# Correct: Return the sum value
return node.sum
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Delete key-value pairs | Medium | Update sums when removing keys |
| Count keys with prefix | Easy | Store count instead of sum |
| Get max/min value with prefix | Medium | Track max/min in Trie nodes |
| Support wildcard prefixes | Hard | More complex Trie traversal |
| Range sum queries | Hard | Combine with segment tree |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Analyzed time/space complexity
- [ ] Solved without hints
- [ ] Tested edge cases (updates, non-existent prefix, empty prefix)
- [ ] Reviewed alternative approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 1 week
- [ ] Could explain solution to others
