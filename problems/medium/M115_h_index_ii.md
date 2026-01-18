---
id: M115
old_id: I074
slug: h-index-ii
title: H-Index II
difficulty: medium
category: medium
topics: ["array", "binary-search"]
patterns: ["binary-search-on-answer"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M274", "E278", "M162"]
prerequisites: ["binary-search", "array-operations"]
---
# H-Index II

## Problem

You have a sorted array (in ascending order) of integers representing citation counts for each of a researcher's papers. Determine the researcher's h-index. The h-index represents the highest value `h` where the researcher has at least `h` publications, each with `h` or more citations. For example, citations [0,1,3,5,6] means 5 papers with 0,1,3,5,6 citations respectively. The h-index is 3 because there are 3 papers with at least 3 citations each (the papers with 3, 5, and 6 citations), and the remaining papers have no more than 3 citations. The key observation is that for a paper at position i in the sorted array, there are (n-i) papers from that position onward. Since the array is already sorted, you can use binary search to find the leftmost position where citations[i] >= (n-i), eliminating the need for a linear scan.

Your solution must achieve O(log n) time complexity.

## Why This Matters

Academic databases like Google Scholar and research metrics platforms calculate h-index in real-time for millions of researchers to assess scientific impact and inform hiring decisions. Journal ranking systems use similar metrics to compute impact factors. Publication recommendation engines use citation-based metrics to suggest relevant papers. Research grant agencies use h-index variants to evaluate funding applications. This problem demonstrates binary search on implicit conditions rather than explicit target values, a technique that extends to finding thresholds in monotonic functions, optimizing resource allocation, and solving constraint satisfaction problems where you're searching for a boundary rather than a specific element.

## Examples

**Example 1:**
- Input: `citations = [0,1,3,5,6]`
- Output: `3`
- Explanation: [0,1,3,5,6] means the researcher has 5 papers in total and each of them had received 0, 1, 3, 5, 6 citations respectively.
Since the researcher has 3 papers with at least 3 citations each and the remaining two with no more than 3 citations each, their h-index is 3.

**Example 2:**
- Input: `citations = [1,2,100]`
- Output: `2`

## Constraints

- n == citations.length
- 1 <= n <= 10⁵
- 0 <= citations[i] <= 1000
- citations is sorted in **ascending order**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding H-Index with Sorted Array</summary>

For a paper at index i in a sorted array of length n, there are (n - i) papers with at least citations[i] citations. The h-index is the largest h where we can find a position where citations[i] >= h and there are at least h papers from that position onward.

</details>

<details>
<summary>🎯 Hint 2: Binary Search on Position</summary>

Since the array is sorted, use binary search to find the first position i where citations[i] >= n - i. The h-index will be n - i for that position. The sorted property allows you to eliminate half the search space at each step.

</details>

<details>
<summary>📝 Hint 3: Binary Search Implementation</summary>

```
1. Initialize left = 0, right = n - 1
2. While left <= right:
   - mid = (left + right) // 2
   - papers_from_mid = n - mid
   - If citations[mid] >= papers_from_mid:
       // This mid could be h-index, try left half for larger h
       right = mid - 1
   - Else:
       // Need more citations, search right
       left = mid + 1
3. Return n - left

Key insight: We're looking for the leftmost position where
citations[i] >= (n - i), which gives the maximum h-index.
```

Alternative: Linear scan is O(n), but binary search achieves required O(log n).

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Linear Scan | O(n) | O(1) | Check each position, simple but doesn't meet requirement |
| **Binary Search** | **O(log n)** | **O(1)** | Required complexity, exploits sorted property |
| H-Index I (unsorted) | O(n log n) | O(1) | Need to sort first |

## Common Mistakes

### Mistake 1: Linear scan instead of binary search
```python
# Wrong: O(n) doesn't meet requirement
def hIndex(citations):
    n = len(citations)
    for i in range(n):
        if citations[i] >= n - i:
            return n - i
    return 0

# Correct: O(log n) binary search
def hIndex(citations):
    n = len(citations)
    left, right = 0, n - 1
    while left <= right:
        mid = (left + right) // 2
        if citations[mid] >= n - mid:
            right = mid - 1
        else:
            left = mid + 1
    return n - left
```

### Mistake 2: Incorrect binary search condition
```python
# Wrong: Looking for exact match instead of first valid position
def hIndex(citations):
    n = len(citations)
    left, right = 0, n - 1
    while left <= right:
        mid = (left + right) // 2
        if citations[mid] == n - mid:
            return citations[mid]  # Wrong!
        elif citations[mid] > n - mid:
            right = mid - 1
        else:
            left = mid + 1
    return 0

# Correct: Find leftmost position where citations[i] >= n - i
def hIndex(citations):
    n = len(citations)
    left, right = 0, n - 1
    while left <= right:
        mid = (left + right) // 2
        if citations[mid] >= n - mid:
            right = mid - 1  # Could be answer, search left for larger h
        else:
            left = mid + 1
    return n - left
```

### Mistake 3: Off-by-one errors in final answer
```python
# Wrong: Returning wrong index transformation
def hIndex(citations):
    n = len(citations)
    left, right = 0, n - 1
    while left <= right:
        mid = (left + right) // 2
        if citations[mid] >= n - mid:
            right = mid - 1
        else:
            left = mid + 1
    return left  # Wrong! Should be n - left

# Correct: Proper transformation
def hIndex(citations):
    n = len(citations)
    left, right = 0, n - 1
    while left <= right:
        mid = (left + right) // 2
        if citations[mid] >= n - mid:
            right = mid - 1
        else:
            left = mid + 1
    return n - left  # Correct transformation
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| H-Index I (unsorted array) | Medium | Need to sort first or use counting |
| H-Index with updates | Hard | Dynamic h-index with paper additions |
| Citation count at percentile | Medium | Find kth percentile instead of h-index |
| Weighted h-index | Hard | Papers have different weights |
| Multi-author h-index | Hard | Combine multiple citation lists |

## Practice Checklist

- [ ] **Day 0**: Solve using binary search (25 min)
- [ ] **Day 1**: Code from memory, trace through examples (20 min)
- [ ] **Day 3**: Solve H-Index I (unsorted version) (30 min)
- [ ] **Day 7**: Implement both iterative and recursive binary search (25 min)
- [ ] **Day 14**: Handle edge cases (all zeros, all same value) (18 min)
- [ ] **Day 30**: Speed run under time pressure (12 min)

**Strategy**: See [Binary Search Patterns](../strategies/patterns/binary-search.md)
