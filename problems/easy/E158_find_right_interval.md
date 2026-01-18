---
id: E158
old_id: I235
slug: find-right-interval
title: Find Right Interval
difficulty: easy
category: easy
topics: ["array", "binary-search", "sorting"]
patterns: ["binary-search", "indexing"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["M056", "E001", "M057"]
prerequisites: ["binary-search", "sorting-with-indices"]
strategy_ref: ../strategies/patterns/binary-search.md
---
# Find Right Interval

## Problem

Imagine you have a collection of time intervals, where each interval has a start time and an end time. For any given interval, you want to find the next interval that could logically follow it, called its "right interval."

You're given an array `intervals` where `intervals[i] = [starti, endi]`. All start values are distinct (no two intervals start at the same time).

For each interval `i`, the **right interval** is defined as the interval `j` such that:
1. The start of interval `j` is greater than or equal to the end of interval `i` (startj >= endi)
2. Among all intervals satisfying condition 1, interval `j` has the smallest possible start value
3. An interval can be its own right interval if its start is greater than or equal to its own end

Your task is to return an array where each element is the index of the right interval for the corresponding input interval. If no right interval exists, use -1 for that position.

This problem combines sorting (to organize intervals efficiently), binary search (to find the smallest valid start), and careful index tracking (to map back to original positions after sorting).

## Why This Matters

Interval scheduling problems appear frequently in real-world systems. Calendar applications need to find the next available meeting slot, CPU schedulers must determine which task to run after the current one completes, video streaming services need to preload the next segment before the current one finishes, and database systems must manage transaction time windows and detect conflicts. This problem teaches you the ceiling search pattern in binary search, where you're not looking for an exact match but rather the smallest value that meets a threshold. The technique of maintaining index mappings while sorting is crucial for problems where you need to return results in the original order after reordering data for processing. Understanding how to combine O(n log n) sorting with O(log n) binary search is fundamental to achieving optimal time complexity in many search and scheduling algorithms.

## Examples

**Example 1:**
- Input: `intervals = [[1,2]]`
- Output: `[-1]`
- Explanation: With only one interval available, no right interval exists.

**Example 2:**
- Input: `intervals = [[3,4],[2,3],[1,2]]`
- Output: `[-1,0,1]`
- Explanation: Interval [3,4] has no right interval.
For [2,3], the right interval is [3,4] at index 0, since 3 is the minimal start value that is >= 3.
For [1,2], the right interval is [2,3] at index 1, since 2 is the minimal start value that is >= 2.

**Example 3:**
- Input: `intervals = [[1,4],[2,3],[3,4]]`
- Output: `[-1,2,-1]`
- Explanation: Intervals [1,4] and [3,4] have no right intervals.
For [2,3], the right interval is [3,4] at index 2, since 3 is the minimal start value that is >= 3.

## Constraints

- 1 <= intervals.length <= 2 * 10⁴
- intervals[i].length == 2
- -10⁶ <= starti <= endi <= 10⁶
- The start point of each interval is **unique**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Brute Force Nested Loop
**Hint**: For each interval, check all other intervals to find the smallest valid start value.

**Key Ideas**:
- For each interval i, iterate through all intervals j
- Check if start[j] >= end[i]
- Track the minimum valid start and its index
- Return array of indices

**Why This Works**: Direct implementation of problem definition, easy to understand.

### Intermediate Approach - Sort with Index Mapping
**Hint**: Sort intervals by start time, but keep track of original indices using a mapping.

**Optimization**:
- Create pairs of (start_value, original_index)
- Sort by start_value
- For each original interval, binary search for smallest start >= end
- Map back to original indices

**Trade-off**: O(n log n) sorting + O(n log n) binary searches = better than O(n^2).

### Advanced Approach - HashMap + Binary Search
**Hint**: Use a hash map to store start->index mapping, then binary search on sorted starts.

**Key Insight**:
- Create map: start_value -> original_index
- Sort all start values
- For each interval's end value, binary search for ceiling in sorted starts
- Look up original index from map

**Why This is Optimal**: O(n log n) time from sorting + binary search, O(n) space for map.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force | O(n^2) | O(n) | Check all pairs, result array |
| Sort + Linear Search | O(n^2) | O(n) | Sort helps but still linear search per interval |
| Sort + Binary Search | O(n log n) | O(n) | Optimal for comparison-based solution |
| TreeMap/Balanced BST | O(n log n) | O(n) | Similar to binary search, language-dependent |

## Common Mistakes

### Mistake 1: Losing original indices after sorting
```
# WRONG - Sorting destroys original order
intervals.sort(key=lambda x: x[0])
result = []
for interval in intervals:
    # How do we know which original index this came from?
```
**Why it fails**: After sorting, you can't map results back to original positions.

**Correct approach**: Sort tuples of (start, original_index) or maintain separate index mapping.

### Mistake 2: Incorrect binary search boundary
```
# WRONG - Using wrong comparison in binary search
left, right = 0, len(starts) - 1
while left < right:  # Should be left <= right for some implementations
    mid = (left + right) // 2
    if starts[mid] >= target:
        right = mid
    else:
        left = mid  # Should be mid + 1
```
**Why it fails**: Infinite loop or missing the correct boundary value.

**Correct approach**: Use proper binary search template for finding ceiling value.

### Mistake 3: Not handling self-intervals correctly
```
# WRONG - Excluding the interval itself
for i in range(len(intervals)):
    for j in range(len(intervals)):
        if i != j and start[j] >= end[i]:  # Missing valid self-interval cases
```
**Why it fails**: Problem states "An interval can be its own right interval".

**Correct approach**: Include all intervals in search, including the current one.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Find Left Interval | Find interval where end <= current start | Easy |
| Find Overlapping Intervals | Count intervals that overlap with each | Medium |
| Merge Intervals | Combine overlapping intervals | Medium |
| Interval Scheduling | Maximum non-overlapping intervals | Medium |
| K Closest Intervals | Find K intervals closest to each interval | Hard |

## Practice Checklist

Track your progress as you master this problem:

- [ ] **Day 1**: Solve with brute force O(n^2) approach (allow 25 mins)
- [ ] **Day 2**: Implement sort + binary search solution
- [ ] **Day 3**: Code without reference, verify with edge cases
- [ ] **Week 2**: Optimize to handle start value mapping efficiently
- [ ] **Week 4**: Solve find-left-interval variation
- [ ] **Week 8**: Speed drill - solve in under 15 minutes

**Strategy**: See [Binary Search Pattern](../strategies/patterns/binary-search.md) for ceiling/floor search techniques.
