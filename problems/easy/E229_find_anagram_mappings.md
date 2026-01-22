---
id: E229
old_id: A227
slug: find-anagram-mappings
title: Find Anagram Mappings
difficulty: easy
category: easy
topics: ["array", "hash-table"]
patterns: ["index-mapping"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["hash-table", "array-traversal"]
related_problems: ["E001", "E242", "M049"]
strategy_ref: ../prerequisites/hash-table.md
---
# Find Anagram Mappings

## Problem

You're given two integer arrays, `nums1` and `nums2`, where `nums2` is an anagram of `nums1`. An **anagram** means the second array contains exactly the same elements as the first, just rearranged in a different order. Both arrays can contain duplicate values.

Your task is to build a mapping array that shows where each element from `nums1` appears in `nums2`. Specifically, create an array `mapping` where `mapping[i] = j` means the element at position `i` in `nums1` is located at position `j` in `nums2`.

Here's the tricky part: when duplicate values exist, you might have multiple valid mappings. For example, if `nums1 = [1, 2, 2]` and `nums2 = [2, 1, 2]`, the element at `nums1[0]` (which is 1) clearly maps to `nums2[1]`. But for the two 2's in `nums1`, you could map them to either of the two 2's in `nums2`. The problem says any valid mapping is acceptable, so you don't need to worry about finding a "best" mapping, just any correct one.

The constraints guarantee that `nums2` is always a valid anagram of `nums1`, so you don't need to handle cases where the arrays don't match.

## Why This Matters

This problem teaches index-based mapping with hash tables, a pattern that appears in data reconciliation, database joins, and matching records across different data sources. The ability to map elements between arrays efficiently is crucial in ETL (Extract, Transform, Load) operations, data warehouse synchronization, and merging sorted datasets.

Handling duplicates correctly is particularly important in real-world scenarios. Consider matching customer records from different systems where names or IDs might appear multiple times, or reconciling inventory data where the same product appears in multiple warehouses. The technique of tracking "remaining" indices for duplicate values is a common pattern.

Hash tables reduce lookup complexity from O(n) to O(1), which becomes critical when processing large datasets. Understanding when and how to use hash-based index mapping versus nested loops is a fundamental optimization skill that appears frequently in technical interviews and production code.

## Examples

**Example 1:**
- Input: `nums1 = [12,28,46,32,50], nums2 = [50,12,32,46,28]`
- Output: `[1,4,3,2,0]`
- Explanation: The value at nums1[0] (which is 12) is located at nums2[1], so mapping[0] = 1. Similarly, nums1[1] (which is 28) is found at nums2[4], so mapping[1] = 4, and this pattern continues.

**Example 2:**
- Input: `nums1 = [84,46], nums2 = [84,46]`
- Output: `[0,1]`

## Constraints

- 1 <= nums1.length <= 100
- nums2.length == nums1.length
- 0 <= nums1[i], nums2[i] <= 10⁵
- nums2 is an anagram of nums1.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Brute Force Search
For each element in nums1, you need to find where that same value appears in nums2. The simplest approach is to search through nums2 for each element. What's the time complexity of this approach? How many comparisons do you make in the worst case?

### Tier 2: Hash Map for Fast Lookup
Instead of searching for each element, what if you could look up its position in constant time? Think about preprocessing nums2 to build a data structure that maps each value to its index. What data structure provides O(1) lookup?

### Tier 3: Handling Duplicates
The tricky part is handling duplicate values. If the same value appears multiple times in nums2, which index should you use? Since the problem says "any correct answer is acceptable," you can use any matching index. But how do you track which indices you've used if you want to avoid reusing them? Consider storing a list of indices for each value.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Nested Loop) | O(n²) | O(n) | For each element, search entire nums2 |
| Hash Map (Single Index) | O(n) | O(n) | Store value -> index mapping |
| Hash Map (Multiple Indices) | O(n) | O(n) | Store value -> list of indices for duplicates |

Where n = length of arrays

## Common Mistakes

### Mistake 1: Not Handling Duplicates Correctly
```python
# Wrong: Overwrites index for duplicate values
def anagramMappings(nums1, nums2):
    index_map = {}
    for i, num in enumerate(nums2):
        index_map[num] = i  # Loses previous indices!

    return [index_map[num] for num in nums1]

# Correct: Store list of indices
def anagramMappings(nums1, nums2):
    from collections import defaultdict
    index_map = defaultdict(list)
    for i, num in enumerate(nums2):
        index_map[num].append(i)

    result = []
    for num in nums1:
        result.append(index_map[num].pop())  # Use and remove
    return result
```

### Mistake 2: Inefficient Linear Search
```python
# Wrong: O(n²) time - searches entire array for each element
def anagramMappings(nums1, nums2):
    result = []
    for num in nums1:
        for i, val in enumerate(nums2):
            if val == num:
                result.append(i)
                break
    return result
```

### Mistake 3: Modifying Input Arrays
```python
# Wrong: Modifies nums2 which may be needed elsewhere
def anagramMappings(nums1, nums2):
    result = []
    for num in nums1:
        idx = nums2.index(num)
        result.append(idx)
        nums2[idx] = None  # Modifies original array!
    return result

# Correct: Use tracking without modifying input
# See approach in Mistake 1
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Bidirectional Mapping | Easy | Return mappings for both nums1->nums2 and nums2->nums1. |
| Unique Mapping Only | Medium | Each element can only map once - return empty if impossible. |
| Weighted Anagram Mapping | Medium | Elements have weights, map to minimize total weight difference. |
| Substring Anagram Mapping | Hard | Find anagram mapping between substrings of two strings. |
| K-Distance Mapping | Medium | Map elements that are within k positions of each other. |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Solved with brute force approach
- [ ] Optimized to O(n) with hash map
- [ ] Handled edge case: single element arrays
- [ ] Handled edge case: all elements are the same
- [ ] Handled edge case: duplicate values
- [ ] Tested with no duplicates
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Can explain approach to someone else

**Strategy**: See [Hash Table Patterns](../prerequisites/hash-table.md)
