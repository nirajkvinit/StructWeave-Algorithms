---
id: M248
old_id: A036
slug: minimum-time-difference
title: Minimum Time Difference
difficulty: medium
category: medium
topics: ["string", "sorting", "array"]
patterns: ["sorting", "circular-array"]
estimated_time_minutes: 30
frequency: medium
related_problems:
  - E001_two_sum.md
  - M349_time_based_key_value_store.md
prerequisites:
  - sorting algorithms
  - time/modular arithmetic
  - array manipulation
---
# Minimum Time Difference

## Problem

Given a list of time stamps in 24-hour "HH:MM" format, find the smallest time difference in minutes between any two timestamps. For example, given ["23:59", "00:00"], the minimum difference is 1 minute because midnight (00:00) is just one minute after 23:59.

The 24-hour format means hours range from 00 to 23 and minutes from 00 to 59. Each timestamp is a string like "14:30" (2:30 PM) or "09:05" (9:05 AM). The tricky part is that time wraps around: after 23:59 comes 00:00, creating a circular structure. So when comparing "23:30" and "00:15", you need to consider both the forward difference (45 minutes from 23:30 to 00:00, plus 15 more = 60 minutes) and realize there's also a backward wrap-around difference (23 hours and 15 minutes going the long way).

A key optimization opportunity: there are only 1440 possible unique minutes in a day (24 hours × 60 minutes). If you're given more than 1440 timestamps, by the pigeonhole principle at least two must be identical, giving you an immediate answer of 0 minutes. This early exit can save computation when processing large lists.

## Why This Matters

This problem introduces circular array thinking, where the "distance" between elements must account for wrap-around boundaries. This pattern appears in scheduling systems (finding closest available time slots), embedded systems (dealing with timer overflow), network protocols (sequence number wrap-around in TCP), and modular arithmetic problems. The technique of converting structured data (time strings) into a sortable numeric format, then exploiting the sorted property to check only adjacent elements, is a fundamental optimization that reduces O(n²) all-pairs comparisons to O(n log n) sorting plus O(n) scanning. Understanding when sorting enables linear-time solution patterns is essential for interview problems and real-world data processing.

## Examples

**Example 1:**
- Input: `timePoints = ["23:59","00:00"]`
- Output: `1`

**Example 2:**
- Input: `timePoints = ["00:00","23:59","00:00"]`
- Output: `0`

## Constraints

- 2 <= timePoints.length <= 2 * 10⁴
- timePoints[i] is in the format **"HH:MM"**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Convert to a Sortable Format</summary>

Instead of working with time strings directly, convert each timestamp to minutes since midnight (00:00). This transforms the problem into finding the minimum difference between sorted integers. Remember that time is circular - the difference between 23:59 and 00:00 is just 1 minute, not 1439 minutes.

Key insight: Convert "HH:MM" to minutes = HH * 60 + MM
</details>

<details>
<summary>Hint 2: Sort and Compare Adjacent Elements</summary>

After converting times to minutes and sorting, the minimum difference will be between adjacent elements in the sorted array. However, don't forget the circular nature - also check the difference between the last and first elements (wrapping around midnight).

For example: [00:05, 12:00, 23:55] → [5, 720, 1435]
Check: 720-5, 1435-720, and (1440-1435)+5 for the wrap-around
</details>

<details>
<summary>Hint 3: Handle Edge Cases</summary>

Consider these special cases:
1. Duplicate times (return 0 immediately)
2. Times spanning midnight (23:59 to 00:00)
3. Only two times given

The circular difference is: min(diff, 1440 - diff) where 1440 is total minutes in a day.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Sort + Linear Scan | O(n log n) | O(1) or O(n) | Sorting dominates; space depends on sort implementation |
| Bucket Sort | O(n) | O(1440) | Since max unique times = 1440, can use counting/bucket sort |
| Pigeonhole Principle | O(n) | O(1) | If n > 1440, return 0 immediately (duplicates must exist) |

## Common Mistakes

### Mistake 1: Forgetting the Circular Nature of Time
```python
# Wrong: Only checks adjacent differences
def findMinDifference(timePoints):
    minutes = sorted([int(t[:2]) * 60 + int(t[3:]) for t in timePoints])
    return min(minutes[i+1] - minutes[i] for i in range(len(minutes)-1))

# Correct: Includes wrap-around check
def findMinDifference(timePoints):
    minutes = sorted([int(t[:2]) * 60 + int(t[3:]) for t in timePoints])
    min_diff = min(minutes[i+1] - minutes[i] for i in range(len(minutes)-1))
    # Check wrap-around: from last time to first time (next day)
    wrap_diff = 1440 - minutes[-1] + minutes[0]
    return min(min_diff, wrap_diff)
```

### Mistake 2: Not Checking for Duplicate Times Early
```python
# Inefficient: Converts and sorts even when duplicates exist
def findMinDifference(timePoints):
    minutes = sorted([int(t[:2]) * 60 + int(t[3:]) for t in timePoints])
    # ... rest of logic

# Better: Early exit using pigeonhole principle
def findMinDifference(timePoints):
    if len(timePoints) > 1440:  # More times than minutes in a day
        return 0
    minutes = sorted([int(t[:2]) * 60 + int(t[3:]) for t in timePoints])
    # ... rest of logic
```

### Mistake 3: Incorrect String Parsing
```python
# Wrong: Assumes single-digit hours/minutes
def parseTime(time):
    return int(time[0]) * 60 + int(time[2])  # Fails on "10:30"

# Correct: Properly split on ':'
def parseTime(time):
    h, m = time.split(':')
    return int(h) * 60 + int(m)
```

## Variations

| Variation | Difference | Complexity Impact |
|-----------|------------|-------------------|
| Maximum Time Difference | Find largest gap instead of smallest | Same O(n log n) |
| K Closest Time Pairs | Find k pairs with smallest differences | O(n log n + k) |
| Circular Array Minimum Gap | Generic circular array problem | Same technique applies |
| Time Zones | Multiple time zones with conversions | Add O(n) conversion step |

## Practice Checklist

Track your progress with spaced repetition:

- [ ] First attempt (understand the problem)
- [ ] Implement basic sorting solution
- [ ] Handle circular wrap-around case
- [ ] Optimize with early duplicate detection
- [ ] After 1 day: Solve without hints
- [ ] After 1 week: Solve in under 20 minutes
- [ ] Before interview: Explain edge cases and optimizations

**Strategy**: See [Sorting Patterns](../strategies/patterns/sorting.md)
