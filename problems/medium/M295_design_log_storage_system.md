---
id: M295
old_id: A102
slug: design-log-storage-system
title: Design Log Storage System
difficulty: medium
category: medium
topics: ["string", "design", "hash-table"]
patterns: ["timestamp-comparison"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M166", "M318", "E158"]
prerequisites: ["string-manipulation", "timestamp-handling", "design-patterns"]
---
# Design Log Storage System

## Problem

Build a log storage system that records events with timestamps and supports querying logs within time ranges at different granularity levels.

Each log entry has:
- An integer ID (unique identifier)
- A timestamp in the format `"Year:Month:Day:Hour:Minute:Second"`, like `"2017:01:01:23:59:59"` (all components are zero-padded)

Design the `LogSystem` class with these operations:

- `LogSystem()` - Initialize an empty log storage system.

- `void put(int id, string timestamp)` - Store a log entry with the given ID and timestamp.

- `int[] retrieve(string start, string end, string granularity)` - Return all log IDs whose timestamps fall within the range `[start, end]` (inclusive) when compared at the specified granularity level.

The granularity parameter is the interesting part. It can be one of: `"Year"`, `"Month"`, `"Day"`, `"Hour"`, `"Minute"`, or `"Second"`. This determines how much of the timestamp to consider:

- `"Year"` granularity: only compare the year portion, ignoring month/day/hour/minute/second
- `"Day"` granularity: compare year, month, and day, ignoring hour/minute/second
- `"Second"` granularity: compare the full timestamp

For example, with `granularity = "Day"`, `start = "2017:01:01:23:59:59"`, and `end = "2017:01:02:23:59:59"`, you'd retrieve all logs from January 1st and January 2nd, 2017, regardless of what time of day they occurred. The hour/minute/second parts are effectively ignored.

## Why This Matters

This problem mirrors real-world log aggregation systems like Elasticsearch, Splunk, or CloudWatch. When analyzing system logs, you often query by time ranges with different precisions: "show me all errors from last Tuesday" (day granularity) versus "show me all errors between 2:30 PM and 2:35 PM" (minute granularity). The challenge is efficiently storing timestamps and comparing them at variable granularity levels. The elegant insight is that the fixed timestamp format with zero-padding makes lexicographic string comparison equivalent to chronological comparison - no need to parse into date objects. This problem teaches string manipulation, prefix matching, and the design tradeoff between storage format and query efficiency.

## Constraints

- 1 <= id <= 500
- 2000 <= Year <= 2017
- 1 <= Month <= 12
- 1 <= Day <= 31
- 0 <= Hour <= 23
- 0 <= Minute, Second <= 59
- granularity is one of the values ["Year", "Month", "Day", "Hour", "Minute", "Second"].
- At most 500 calls will be made to put and retrieve.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Timestamp Truncation by Granularity</summary>

The key insight is that granularity determines how many timestamp components to compare. Create a mapping from granularity to the number of characters or components to consider: Year → first 4 chars, Month → first 7 chars (Year:Mo), Day → first 10, Hour → first 13, Minute → 16, Second → 19 (entire timestamp). Truncate timestamps to the appropriate length before comparison.

</details>

<details>
<summary>Hint 2: String Comparison for Timestamps</summary>

Since timestamps are formatted consistently with zero-padding (e.g., "2017:01:01:23:59:59"), lexicographic string comparison works correctly for determining chronological order. Truncate start, end, and stored timestamps to the granularity level, then check if the truncated stored timestamp falls within [truncated_start, truncated_end] using string comparison.

</details>

<details>
<summary>Hint 3: Simple List Storage</summary>

Given the constraint of at most 500 calls, a simple list to store (id, timestamp) pairs is sufficient. For each `put()`, append to the list. For each `retrieve()`, iterate through all stored entries and filter based on truncated timestamp comparison. More complex data structures (like segment trees or timestamp indices) are unnecessary for this scale.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| List + Linear Scan | O(1) put, O(n) retrieve | O(n) | n is number of logs; simple and sufficient |
| Sorted List + Binary Search | O(log n) put, O(log n + k) retrieve | O(n) | k is results; overkill for n ≤ 500 |
| Timestamp Index (Dict) | O(1) put, O(n) retrieve | O(n * g) | g is granularities; complex implementation |

## Common Mistakes

1. **Incorrect granularity mapping**
```python
# Wrong: incorrect substring lengths
granularity_map = {
    "Year": 4,
    "Month": 6,  # Wrong! Should be 7 (includes ':')
    "Day": 9,    # Wrong! Should be 10
}

# Correct: account for colons in timestamp format
granularity_map = {
    "Year": 4,
    "Month": 7,   # "2017:01"
    "Day": 10,    # "2017:01:01"
    "Hour": 13,   # "2017:01:01:23"
    "Minute": 16, # "2017:01:01:23:59"
    "Second": 19  # "2017:01:01:23:59:59"
}
```

2. **Not handling inclusive range correctly**
```python
# Wrong: uses exclusive end
def retrieve(self, start, end, granularity):
    length = self.granularity_map[granularity]
    s, e = start[:length], end[:length]
    result = []
    for log_id, timestamp in self.logs:
        t = timestamp[:length]
        if s <= t < e:  # Wrong! Should be <=
            result.append(log_id)

# Correct: inclusive range [start, end]
def retrieve(self, start, end, granularity):
    length = self.granularity_map[granularity]
    s, e = start[:length], end[:length]
    result = []
    for log_id, timestamp in self.logs:
        t = timestamp[:length]
        if s <= t <= e:  # Both inclusive
            result.append(log_id)
    return result
```

3. **Not truncating comparison timestamps**
```python
# Wrong: compares full timestamps regardless of granularity
def retrieve(self, start, end, granularity):
    result = []
    for log_id, timestamp in self.logs:
        if start <= timestamp <= end:  # Ignores granularity!
            result.append(log_id)

# Correct: truncate based on granularity
def retrieve(self, start, end, granularity):
    length = self.granularity_map[granularity]
    s, e = start[:length], end[:length]
    result = []
    for log_id, timestamp in self.logs:
        t = timestamp[:length]
        if s <= t <= e:
            result.append(log_id)
    return result
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Log System with Update | Support updating timestamps of existing log IDs | Medium |
| Range Count Query | Return count of logs in range instead of IDs | Easy |
| Top K Recent Logs | Retrieve k most recent logs within a range | Medium |
| Log Aggregation | Group logs by granularity and return counts per bucket | Hard |

## Practice Checklist

- [ ] Implement LogSystem with list storage
- [ ] Create correct granularity mapping (4, 7, 10, 13, 16, 19)
- [ ] Truncate timestamps correctly based on granularity
- [ ] Use inclusive range comparison [start, end]
- [ ] Test with granularity = "Year"
- [ ] Test with granularity = "Second"
- [ ] Test edge case: start == end
- [ ] Test with multiple logs at same truncated timestamp
- [ ] **Review in 24 hours**: Re-implement from memory
- [ ] **Review in 1 week**: Solve without hints
- [ ] **Review in 2 weeks**: Implement binary search optimization
