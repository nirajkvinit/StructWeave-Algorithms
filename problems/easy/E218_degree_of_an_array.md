---
id: E218
old_id: A164
slug: degree-of-an-array
title: Degree of an Array
difficulty: easy
category: easy
topics: ["array", "hash-table"]
patterns: ["hash-lookup", "array-scan"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - E001_two_sum
  - M525_contiguous_array
  - M697_maximum_frequency_subarray
prerequisites:
  - Hash table operations
  - Array traversal
  - Finding min/max values
strategy_ref: ../prerequisites/hash-tables.md
---
# Degree of an Array

## Problem

Given an array `nums` of non-negative integers, you need to understand two key concepts. First, the **degree** of the array is defined as the maximum frequency of any element. In other words, if the most common element appears 5 times, the degree is 5. Second, you need to find the shortest contiguous subarray that has the same degree as the entire array.

Let's unpack this with an example. If `nums = [1, 2, 2, 3, 1]`, both the number 1 and the number 2 appear twice, making the array's degree 2. Now you need to find the shortest subarray that also has degree 2. The subarray `[2, 2]` has length 2 and degree 2 (since 2 appears twice in it), and this is the shortest possible. Other candidates like `[1, 2, 2, 3, 1]` also have degree 2 but are longer.

A critical edge case: there might be multiple elements tied for the maximum frequency. You need to consider all of them and find which one appears in the smallest span from its first to last occurrence. Also note that the answer is asking for the length of the subarray, not the subarray itself.

## Why This Matters

This problem teaches you how to efficiently track multiple properties simultaneously using hash tables, a fundamental skill in data engineering and real-time analytics. In practice, this pattern appears in time-series analysis (finding the shortest window where a sensor reading reaches peak frequency), network traffic monitoring (detecting the shortest burst period for the most common packet type), and user behavior analytics (identifying the shortest session where the most frequent action occurs).

The algorithmic pattern here is "multi-map tracking with aggregation." You're maintaining three pieces of information per element: frequency count, first occurrence, and last occurrence. This demonstrates how a single pass through data can populate multiple lookup structures, enabling O(1) queries afterward. It's a building block for more complex streaming algorithms and window-based computations.

From an interview perspective, this problem tests your ability to decompose a problem into subproblems (find degree, then find minimum span), choose the right data structure (hash maps over nested loops), and handle ties correctly (multiple elements with max frequency). It bridges the gap between simple array manipulation and sophisticated frequency analysis.

## Examples

**Example 1:**
- Input: `nums = [1,2,2,3,1]`
- Output: `2`
- Explanation: The array's degree is 2 since values 1 and 2 each occur twice.
Candidate subarrays with degree 2 include:
[1, 2, 2, 3, 1], [1, 2, 2, 3], [2, 2, 3, 1], [1, 2, 2], [2, 2, 3], [2, 2]
The minimum length among these is 2.

**Example 2:**
- Input: `nums = [1,2,2,3,1,4,2]`
- Output: `6`
- Explanation: Element 2 appears 3 times, establishing degree 3.
The minimal subarray [2,2,3,1,4,2] has length 6.

## Constraints

- nums.length will be between 1 and 50,000.
- nums[i] will be an integer between 0 and 49,999.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Initial Direction
You need to track three things for each element: how many times it appears (frequency), where it first appears (first index), and where it last appears (last index). What data structure allows you to efficiently store multiple values for each key?

### Tier 2 Hint - Key Insight
Use a hash table to store for each number: its count, first occurrence index, and last occurrence index. After one pass to collect this data, find the maximum count (the degree). Then among all numbers with this maximum count, find the one with the smallest distance between first and last occurrence.

### Tier 3 Hint - Implementation Details
Create three dictionaries: `count`, `first_seen`, and `last_seen`. Iterate through the array once to populate these. Find `max_count = max(count.values())`. Then iterate through all numbers with `count[num] == max_count` and compute `min_length = min(last_seen[num] - first_seen[num] + 1)`.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash table tracking | O(n) | O(n) | Single pass to build maps, second pass to find answer |
| Brute force subarray | O(n³) | O(n) | Check all subarrays, count frequencies |
| Two pass with sorting | O(n log n) | O(n) | Sort with indices, group consecutive elements |

**Optimization notes:**
- Can combine all tracking into single dictionary with tuple values
- Single pass is optimal for time complexity
- Space usage proportional to number of unique elements (can be O(n) worst case)

## Common Mistakes

### Mistake 1: Only tracking frequency without positions
```python
# Wrong - can't determine subarray length
count = {}
for num in nums:
    count[num] = count.get(num, 0) + 1
max_freq = max(count.values())
# Now what? We lost position information!

# Correct - track first and last positions
first = {}
last = {}
count = {}
for i, num in enumerate(nums):
    if num not in first:
        first[num] = i
    last[num] = i
    count[num] = count.get(num, 0) + 1
```

### Mistake 2: Not considering all elements with max degree
```python
# Wrong - only checking first element with max count
max_count = max(count.values())
for num in count:
    if count[num] == max_count:
        return last[num] - first[num] + 1  # Returns too early!

# Correct - find minimum among all
result = len(nums)
for num in count:
    if count[num] == max_count:
        result = min(result, last[num] - first[num] + 1)
return result
```

### Mistake 3: Off-by-one error in length calculation
```python
# Wrong - missing the +1
length = last[num] - first[num]

# Correct - inclusive range
length = last[num] - first[num] + 1
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Multiple degrees | Medium | Find subarrays for top k most frequent elements |
| Non-contiguous subarray | Medium | Allow non-contiguous elements with same degree |
| Minimum degree subarray | Medium | Find shortest subarray with degree exactly k |
| Weighted degree | Hard | Each element has a weight, maximize weighted degree |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve independently without hints (30 min time limit)
- [ ] Implement hash table tracking solution
- [ ] Handle arrays with multiple elements at max frequency
- [ ] Test with single-element and all-unique arrays

**Spaced Repetition**
- [ ] Day 1: Solve again from scratch
- [ ] Day 3: Optimize to use single dictionary with tuples
- [ ] Week 1: Solve without using built-in max function
- [ ] Week 2: Implement streaming version (process one at a time)

**Mastery Validation**
- [ ] Can explain the three-dictionary approach
- [ ] Can handle edge cases (all same, all different)
- [ ] Solve in under 10 minutes
- [ ] Implement without referring to notes

**Strategy**: See [Hash Table Pattern](../prerequisites/hash-tables.md)
