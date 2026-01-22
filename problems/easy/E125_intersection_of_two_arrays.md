---
id: E125
old_id: I148
slug: intersection-of-two-arrays
title: Intersection of Two Arrays
difficulty: easy
category: easy
topics: ["array"]
patterns: ["hash-table", "two-pointers"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E001", "E123", "E124"]
prerequisites: ["arrays", "hash-tables", "sets", "two-pointers"]
strategy_ref: ../prerequisites/hash-tables.md
---
# Intersection of Two Arrays

## Problem

Given two integer arrays `nums1` and `nums2`, find all values that appear in both arrays. Return these common elements as a new array, where each value appears only once regardless of how many times it occurs in either input array. The order of elements in the output doesn't matter.

For example, if nums1 = [1, 2, 2, 1] and nums2 = [2, 2], the value 2 appears in both arrays. Even though it appears multiple times in both inputs, your result should contain it only once: [2].

The key requirement is uniqueness in the output. This is a set intersection operation, different from a multiset intersection where frequencies would matter. You're essentially answering the question: "Which distinct values exist in both collections?"

There are two main approaches: using hash sets for O(n + m) time with extra space, or sorting both arrays and using two pointers for O(n log n + m log m) time with minimal extra space. The choice depends on whether the arrays are already sorted and how much memory you can use.

## Why This Matters

Set intersection is a fundamental operation in database joins, search engines (finding documents matching multiple keywords), recommendation systems (finding common interests), and data analysis pipelines. This problem teaches you to choose between hash-based and sorting-based approaches depending on constraints. Hash tables offer fast average-case performance but use extra memory, while two-pointer techniques work well with sorted data and minimal space. Understanding these trade-offs is crucial for system design and optimization. This is one of the most common interview questions because it tests your knowledge of data structures (sets vs arrays), algorithm complexity analysis, and the ability to recognize when different approaches are appropriate.

## Examples

**Example 1:**
- Input: `nums1 = [1,2,2,1], nums2 = [2,2]`
- Output: `[2]`
- Explanation: Only 2 appears in both arrays, so it is included once in the result.

**Example 2:**
- Input: `nums1 = [4,9,5], nums2 = [9,4,9,8,4]`
- Output: `[9,4]`
- Explanation: Both 9 and 4 exist in both arrays. The answer [4,9] is equally valid.

## Constraints

- 1 <= nums1.length, nums2.length <= 1000
- 0 <= nums1[i], nums2[i] <= 1000

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Hint 1: Intuition (Beginner)
The intersection means finding elements that appear in both arrays. The simplest approach is to check each element from the first array to see if it exists in the second array. Use a set to store unique results. However, this can be slow if you check existence with linear search. Think about using a data structure that offers fast lookup.

### Hint 2: Optimization (Intermediate)
Convert one array to a set for O(1) lookup time. Then iterate through the other array and check if each element exists in the set. If it does, add it to a result set (to maintain uniqueness). Finally, convert the result set to a list. This gives O(n + m) time where n and m are the array lengths. Alternatively, if arrays are sorted or can be sorted, use two pointers.

### Hint 3: Implementation Details (Advanced)
Approach 1 (Hash Set): Convert nums1 to set: set1 = set(nums1). Initialize result = set(). For each num in nums2, if num in set1, add to result. Return list(result). Time: O(n+m), Space: O(n). Approach 2 (Two Pointers): Sort both arrays, use two pointers i=0, j=0. If nums1[i] == nums2[j], add to result and advance both; if nums1[i] < nums2[j], advance i; else advance j. Time: O(n log n + m log m), Space: O(1) excluding output.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash set (two sets) | O(n + m) | O(n + m) | Optimal time, uses extra space |
| Hash set (one set) | O(n + m) | O(min(n,m)) | Convert smaller array to set |
| Two pointers (sorted) | O(n log n + m log m) | O(1) | Excluding output space |
| Brute force (nested loops) | O(n * m) | O(min(n,m)) | Check each pair, inefficient |

## Common Mistakes

### Mistake 1: Including Duplicates
```python
# Wrong: Not using set to ensure uniqueness
def intersection(nums1, nums2):
    result = []
    for num in nums1:
        if num in nums2:  # Can add same num multiple times!
            result.append(num)
    return result
```
**Fix:** Use a set for the result to guarantee each element appears once.

### Mistake 2: Inefficient Lookup
```python
# Wrong: Using list membership check (O(n) per lookup)
def intersection(nums1, nums2):
    result = set()
    for num in nums1:
        if num in nums2:  # O(m) lookup for each element!
            result.add(num)
    return list(result)
```
**Fix:** Convert nums2 to a set first for O(1) lookups: set2 = set(nums2).

### Mistake 3: Two Pointers Without Sorting
```python
# Wrong: Using two pointers on unsorted arrays
def intersection(nums1, nums2):
    i = j = 0
    result = []
    while i < len(nums1) and j < len(nums2):
        if nums1[i] == nums2[j]:  # Won't find all matches if unsorted!
            result.append(nums1[i])
```
**Fix:** Sort both arrays first before using two-pointer approach.

## Variations

| Variation | Description | Difficulty | Key Difference |
|-----------|-------------|------------|----------------|
| Intersection II | Include duplicates with frequencies | Easy | Count occurrences, return all matches |
| Union of Two Arrays | Find all unique elements | Easy | Combine sets instead of intersection |
| Difference of Arrays | Elements in first but not second | Easy | Set difference operation |
| Symmetric Difference | Elements in either but not both | Easy | XOR-like operation on sets |

## Practice Checklist

Study Plan:
- [ ] Day 1: Implement hash set approach, understand uniqueness requirement
- [ ] Day 3: Implement two-pointer approach with sorting
- [ ] Day 7: Solve Intersection II (with duplicates)
- [ ] Day 14: Compare time/space trade-offs, solve without hints
- [ ] Day 30: Speed solve (< 10 minutes), explain both approaches

Key Mastery Indicators:
- Can choose optimal approach based on constraints
- Understand set operations and their complexity
- Handle duplicate values correctly
- Recognize when to use hash table vs. two pointers

**Strategy**: See [Hash Tables](../prerequisites/hash-tables.md)
