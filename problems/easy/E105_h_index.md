---
id: E105
old_id: I073
slug: h-index
title: H-Index
difficulty: easy
category: easy
topics: ["array", "sorting", "counting-sort"]
patterns: ["sorting", "counting"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["M274", "M275"]
prerequisites: ["sorting", "bucket-sort"]
strategy_ref: ../strategies/patterns/sorting.md
---
# H-Index

## Problem

The h-index is a metric used to measure research impact. Given an array where each element represents the number of citations a researcher's paper has received, calculate their h-index. By definition, a researcher has h-index h if they have h papers with at least h citations each, and the remaining papers have no more than h citations.

For example, if citations are [3, 0, 6, 1, 5], the researcher has 5 papers. How many papers have at least 3 citations? Three papers: those with 3, 6, and 5 citations. How many have at least 4 citations? Only two (6 and 5), which is less than 4. So the h-index is 3: there are exactly 3 papers with 3 or more citations.

The straightforward approach is to sort the citations in descending order, then walk through looking for the largest h where citations[h-1] >= h. There's also a clever O(n) solution using counting: create buckets for each citation count from 0 to n, count how many papers fall in each bucket, then scan from right to left accumulating counts until you find the h-index threshold.

## Why This Matters

Beyond its real-world application in academic metrics, this problem teaches two important algorithmic patterns. First, it demonstrates how sorting can transform an abstract definition into a concrete algorithm by arranging data to make the answer visible. Second, the counting/bucketing approach illustrates a classic trade-off: exchanging time complexity for space to achieve linear performance. This bucketing technique appears in many problems involving frequency analysis, ranking systems, and distribution-based algorithms. Understanding both the O(n log n) sorting solution and the O(n) counting solution gives you flexibility to choose the right approach based on constraints. The problem also reinforces how to convert human-readable definitions (like the h-index definition) into executable logic, a key skill for technical interviews.

## Examples

**Example 1:**
- Input: `citations = [3,0,6,1,5]`
- Output: `3`
- Explanation: [3,0,6,1,5] means the researcher has 5 papers in total and each of them had received 3, 0, 6, 1, 5 citations respectively.
Since the researcher has 3 papers with at least 3 citations each and the remaining two with no more than 3 citations each, their h-index is 3.

**Example 2:**
- Input: `citations = [1,3,1]`
- Output: `1`

## Constraints

- n == citations.length
- 1 <= n <= 5000
- 0 <= citations[i] <= 1000

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Understand the Definition</summary>

The h-index is the largest h where you have at least h papers with h or more citations each. After sorting citations in descending order, the h-index is the maximum i where citations[i] >= i+1. This transforms the abstract definition into a concrete algorithm: sort and find the crossover point.

</details>

<details>
<summary>🎯 Hint 2: Sort Descending and Count</summary>

Sort the citations in descending order: [6,5,3,1,0]. Walk through the sorted array with index i. At each position, check if citations[i] >= i+1 (since i is 0-indexed). The h-index is the largest i+1 where this holds. For [6,5,3,1,0]: at i=2, citations[2]=3 >= 3, so h=3.

</details>

<details>
<summary>📝 Hint 3: O(n) Counting Sort Approach</summary>

Pseudocode (sorting approach):
1. Sort citations descending
2. For i from 0 to n-1:
   - If citations[i] >= i+1: continue
   - Else: return i (h-index found)
3. Return n (all papers have n+ citations)

Or O(n) approach using counting:
1. Create buckets[0..n] where buckets[i] = count of papers with i citations
2. Scan from right: if cumulative count >= h, that's h-index

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Try All h) | O(n²) | O(1) | For each h, count papers >= h |
| Sorting | O(n log n) | O(1) | Sort + single pass |
| **Counting Sort/Buckets** | **O(n)** | **O(n)** | Bucket for each citation count |

## Common Mistakes

### Mistake 1: Wrong Loop Termination

```python
# WRONG: Returning i instead of i+1 (off-by-one)
def hIndex(citations):
    citations.sort(reverse=True)
    for i in range(len(citations)):
        if citations[i] < i + 1:
            return i  # Bug: should have checked this in previous iteration
    return len(citations)
# [3,0,6,1,5] sorted: [6,5,3,1,0]
# i=3: citations[3]=1 < 4, returns 3 ✓ (accidentally correct here)
```

```python
# CORRECT: Clear logic with proper boundary check
def hIndex(citations):
    citations.sort(reverse=True)
    h = 0
    for i, citation in enumerate(citations):
        if citation >= i + 1:
            h = i + 1  # Update h-index
        else:
            break  # Can't improve h-index further
    return h
```

### Mistake 2: Sorting in Wrong Order

```python
# WRONG: Ascending sort makes logic complicated
def hIndex(citations):
    citations.sort()  # Ascending: [0,1,3,5,6]
    n = len(citations)
    for i in range(n):
        if citations[i] >= n - i:  # Confusing index math
            return n - i
    return 0
```

```python
# CORRECT: Descending sort makes logic straightforward
def hIndex(citations):
    citations.sort(reverse=True)  # Descending: [6,5,3,1,0]
    for i in range(len(citations)):
        if citations[i] < i + 1:  # Simple: citation count vs paper count
            return i
    return len(citations)
```

### Mistake 3: Not Handling All-High-Citations Case

```python
# WRONG: Doesn't return n when all papers have high citations
def hIndex(citations):
    citations.sort(reverse=True)
    for i in range(len(citations)):
        if citations[i] < i + 1:
            return i
    # Bug: what if loop completes without returning?
```

```python
# CORRECT: Return n if all papers have sufficient citations
def hIndex(citations):
    citations.sort(reverse=True)
    for i in range(len(citations)):
        if citations[i] < i + 1:
            return i
    return len(citations)  # All papers have >= n citations
# [10,10,10] -> h-index = 3 (all 3 papers have 3+ citations)
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| H-Index II | Medium | Citations already sorted, use binary search |
| Top K Frequent Elements | Medium | Similar counting/bucketing technique |
| Kth Largest Element | Medium | Related sorting/selection problem |
| Least Number of Unique Integers | Medium | Frequency counting with constraint |

## Practice Checklist

- [ ] Day 1: Solve with sorting approach (15 min)
- [ ] Day 2: Implement O(n) counting/bucket approach (20 min)
- [ ] Day 7: Solve again, compare both methods (15 min)
- [ ] Day 14: Explain h-index definition clearly (5 min)
- [ ] Day 30: Code from memory (10 min)

**Strategy**: See [Sorting Pattern](../strategies/patterns/sorting.md)
