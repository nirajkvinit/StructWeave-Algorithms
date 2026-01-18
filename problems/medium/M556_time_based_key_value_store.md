---
id: M556
old_id: A448
slug: time-based-key-value-store
title: Time Based Key-Value Store
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Time Based Key-Value Store

## Problem

Imagine building a version control system or a historical database where every value is tagged with a timestamp, allowing you to query "what was the value at this point in time?" This is what you'll create: a time-aware key-value data structure.

Design and implement a `TimeMap` class that stores string key-value pairs along with timestamps, enabling temporal queries. Think of it like Git for data - you can see the state of any key at any moment in history.

Your `TimeMap` class needs three operations:

**`TimeMap()`** - Constructor
- Initializes an empty time-based storage system

**`void set(String key, String value, int timestamp)`** - Store a value
- Associates `value` with `key` at the specified `timestamp`
- Multiple values can be stored for the same key at different timestamps
- Timestamps for a given key are guaranteed to be strictly increasing (each new timestamp is always larger than the previous)

**`String get(String key, int timestamp)`** - Retrieve a value
- Returns the most recent value stored for `key` at or before the query `timestamp`
- More precisely: find the value with the largest timestamp that is ≤ the query timestamp
- If no such value exists (all timestamps for this key are after the query time), return an empty string `""`

Example usage:
```
store.set("user", "alice", 1)   // At time 1, user = "alice"
store.set("user", "bob", 3)     // At time 3, user = "bob"
store.get("user", 2) → "alice"  // At time 2, most recent was "alice" at time 1
store.get("user", 3) → "bob"    // At time 3, exact match with "bob"
store.get("user", 5) → "bob"    // At time 5, most recent was "bob" at time 3
```

## Why This Matters

Time-based key-value stores power many critical systems in modern computing. Version control systems like Git track file contents across time, allowing developers to query any historical state. Database systems use temporal tables for audit trails, compliance tracking, and time-travel queries to analyze how data changed. Caching layers like Redis support time-based expiration for web applications. Monitoring systems store metrics with timestamps for performance analysis and anomaly detection. Financial systems maintain transaction histories with precise timestamps for regulatory compliance and fraud detection. IoT platforms aggregate sensor readings indexed by time for trend analysis. Configuration management systems track infrastructure changes over time. The ability to efficiently query historical data - "what was the value at timestamp T?" - is fundamental to debugging, analytics, compliance, and understanding system evolution.

## Constraints

- 1 <= key.length, value.length <= 100
- key and value consist of lowercase English letters and digits.
- 1 <= timestamp <= 10⁷
- All the timestamps timestamp of set are strictly increasing.
- At most 2 * 10⁵ calls will be made to set and get.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Since timestamps are strictly increasing for each key, the values for each key are naturally sorted by time. This means you can use binary search to find the largest timestamp ≤ query time, rather than linear search.
</details>

<details>
<summary>Main Approach</summary>
Use a hash map where each key maps to a list of (timestamp, value) pairs. For `set()`, append to the key's list (O(1)). For `get()`, use binary search on the timestamp list to find the rightmost timestamp ≤ query time, then return the corresponding value.
</details>

<details>
<summary>Optimization Tip</summary>
Python's `bisect_right()` can be used to find the insertion point, then index - 1 gives you the largest timestamp ≤ target. Store pairs as tuples (timestamp, value) and binary search on timestamps only. Handle the case where no valid timestamp exists (return empty string).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Linear Search | O(1) set, O(n) get | O(n) | n = number of values for a key |
| Optimal (Binary Search) | O(1) set, O(log n) get | O(n) | Binary search on sorted timestamps |

## Common Mistakes

1. **Not leveraging sorted timestamps**
   ```python
   # Wrong: Linear search through all timestamps
   def get(key, timestamp):
       if key not in store:
           return ""
       for ts, val in reversed(store[key]):
           if ts <= timestamp:
               return val
       return ""

   # Correct: Binary search
   def get(key, timestamp):
       if key not in store:
           return ""
       values = store[key]
       idx = bisect.bisect_right(values, (timestamp, chr(127)))
       return values[idx - 1][1] if idx > 0 else ""
   ```

2. **Incorrect binary search boundary**
   ```python
   # Wrong: Using bisect_left might miss the exact match
   idx = bisect.bisect_left(timestamps, timestamp)

   # Correct: bisect_right handles exact matches correctly
   idx = bisect.bisect_right(values, (timestamp, chr(127)))
   return values[idx - 1][1] if idx > 0 else ""
   ```

3. **Not handling empty results**
   ```python
   # Wrong: Index error when no timestamp ≤ query
   values = store[key]
   idx = bisect.bisect_right(values, (timestamp, chr(127)))
   return values[idx - 1][1]  # Crashes if idx == 0

   # Correct: Check boundary
   return values[idx - 1][1] if idx > 0 else ""
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| LRU Cache | Medium | Time-based eviction with capacity limit |
| Design HashMap | Easy | Simple key-value without timestamps |
| Snapshot Array | Medium | Array with version control via snapshots |
| Time-based File System | Hard | Hierarchical structure with temporal queries |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Binary Search](../../strategies/patterns/binary-search.md)
