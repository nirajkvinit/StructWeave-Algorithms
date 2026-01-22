---
id: E200
old_id: A081
slug: minimum-index-sum-of-two-lists
title: Minimum Index Sum of Two Lists
difficulty: easy
category: easy
topics: ["array", "hash-table", "string"]
patterns: ["hash-map-lookup", "index-tracking"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E001", "E088", "M350"]
prerequisites: ["hash-maps", "array-indexing", "string-comparison"]
strategy_ref: ../prerequisites/hash-tables.md
---
# Minimum Index Sum of Two Lists

## Problem

You have two lists of strings, and you want to find strings that appear in both lists. Among these common strings, you're interested in those that have the smallest "index sum" - meaning they appear relatively early in both lists.

The index sum for a string is calculated by adding its position in the first list to its position in the second list. For example, if "coffee" appears at position 2 in the first list and position 5 in the second list, its index sum is 2 + 5 = 7. Your task is to find all strings that appear in both lists and have the minimum possible index sum.

The practical application here might be finding common preferences where both rankings matter - imagine two friends each ranking their favorite restaurants, and you want to find restaurants both like that appear high on both lists. A restaurant appearing at position 0 and position 1 (sum = 1) represents stronger mutual preference than one at positions 10 and 20 (sum = 30).

Note that multiple strings can tie for the minimum index sum, and you should return all of them. The strings in your result can appear in any order. The lists are guaranteed to have at least one common string.

## Why This Matters

This problem demonstrates a fundamental interview pattern: using hash maps to transform expensive nested-loop operations into efficient single-pass solutions. The naive approach of comparing every string in list1 against every string in list2 has O(n × m) time complexity, but with hash maps, we achieve O(n + m).

The "index sum" concept appears in recommendation systems (finding items ranked highly by multiple criteria), search ranking algorithms (combining relevance scores from different sources), and collaborative filtering (identifying common preferences weighted by priority). Understanding how to efficiently track and compare positional information across datasets is essential for building scalable matching and ranking systems.

This pattern also builds toward more complex problems like finding k-way intersections, weighted preference matching, and multi-criteria optimization.

## Examples

**Example 1:**
- Input: `list1 = ["Shogun","Tapioca Express","Burger King","KFC"], list2 = ["Piatti","The Grill at Torrey Pines","Hungry Hunter Steakhouse","Shogun"]`
- Output: `["Shogun"]`
- Explanation: "Shogun" is the sole string present in both arrays.

**Example 2:**
- Input: `list1 = ["Shogun","Tapioca Express","Burger King","KFC"], list2 = ["KFC","Shogun","Burger King"]`
- Output: `["Shogun"]`
- Explanation: Among shared strings, "Shogun" has the smallest index sum of (0 + 1) = 1.

**Example 3:**
- Input: `list1 = ["happy","sad","good"], list2 = ["sad","happy","good"]`
- Output: `["sad","happy"]`
- Explanation: Three strings appear in both arrays:
"happy" has sum (0 + 1) = 1.
"sad" has sum (1 + 0) = 1.
"good" has sum (2 + 2) = 4.
Both "sad" and "happy" achieve the minimum sum of 1.

## Constraints

- 1 <= list1.length, list2.length <= 1000
- 1 <= list1[i].length, list2[i].length <= 30
- list1[i] and list2[i] consist of spaces ' ' and English letters.
- All the strings of list1 are **unique**.
- All the strings of list2 are **unique**.
- There is at least a common string between list1 and list2.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Efficient Common String Detection
To find strings present in both lists, what data structure allows O(1) lookup?
- Can you store all strings from one list with their indices?
- For each string in the second list, how do you check if it exists in the first?

Think about using a hash map to store string → index mappings.

### Hint 2: Tracking Index Sums
As you process the second list:
- For each common string, calculate the sum of indices from both lists
- Keep track of the minimum sum seen so far
- When you find a smaller sum, what should you do with previously stored results?

Consider maintaining a list of results and updating it when you find a better (smaller) index sum.

### Hint 3: Handling Ties
Multiple strings might have the same minimum index sum:
- When you find a string with the same index sum as the current minimum, what should you do?
- When you find a smaller index sum, what should you do with the previous results?

Build a result list that gets reset when you find a smaller sum, or appended to when you find an equal sum.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash Map Lookup | O(n + m) | O(n) | n = list1.length, m = list2.length; optimal |
| Nested Loop | O(n × m) | O(1) | Check each pair; too slow for large lists |
| Sort Both Lists | O(n log n + m log m) | O(n + m) | Sorting doesn't help; loses index info |

## Common Mistakes

### Mistake 1: Comparing All Pairs Without Hash Map
```python
# Wrong: Nested loop is inefficient
def findRestaurant(list1, list2):
    min_sum = float('inf')
    result = []
    for i, s1 in enumerate(list1):
        for j, s2 in enumerate(list2):
            if s1 == s2:
                if i + j < min_sum:
                    min_sum = i + j
                    result = [s1]
```
**Why it's wrong:** Time complexity is O(n × m), which is inefficient when lists can have up to 1000 elements each.

**Correct approach:** Use a hash map to store list1 strings with indices, then iterate through list2 once.

### Mistake 2: Not Handling Multiple Results
```python
# Wrong: Only keeps one result when there could be multiple
def findRestaurant(list1, list2):
    index_map = {s: i for i, s in enumerate(list1)}
    min_sum = float('inf')
    result = ""
    for j, s in enumerate(list2):
        if s in index_map:
            curr_sum = index_map[s] + j
            if curr_sum < min_sum:
                min_sum = curr_sum
                result = s  # Overwrites instead of maintaining list
```
**Why it's wrong:** Multiple strings can have the same minimum index sum and all should be returned.

**Correct approach:** Use a list for results and append when index sum equals minimum.

### Mistake 3: Not Resetting Results on Better Sum
```python
# Wrong: Keeps adding to results without checking if sum is better
def findRestaurant(list1, list2):
    index_map = {s: i for i, s in enumerate(list1)}
    min_sum = float('inf')
    result = []
    for j, s in enumerate(list2):
        if s in index_map:
            curr_sum = index_map[s] + j
            if curr_sum <= min_sum:  # Wrong condition
                min_sum = curr_sum
                result.append(s)  # Should reset when curr_sum < min_sum
```
**Why it's wrong:** When finding a smaller sum, should clear previous results, not keep them.

**Correct approach:** Use `if curr_sum < min_sum: result = [s]` and `elif curr_sum == min_sum: result.append(s)`.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Maximum index sum | Find common strings with maximum sum instead | Easy |
| Top k index sums | Return all strings with k smallest index sums | Medium |
| Weighted index sum | Each position has different weight | Medium |
| Three lists intersection | Find common strings across three lists | Medium |
| Common prefix minimum sum | Find strings with common prefix and min sum | Hard |

## Practice Checklist

Practice this problem until you can confidently complete these tasks:

- [ ] Day 1: Solve with hash map approach (20 min)
- [ ] Day 3: Implement without looking at notes, handle ties (15 min)
- [ ] Day 7: Solve efficiently with clean code (10 min)
- [ ] Day 14: Explain the difference from Two Sum problem
- [ ] Day 30: Solve a variation (three lists intersection)

**Strategy**: See [Hash Table Patterns](../prerequisites/hash-tables.md)
