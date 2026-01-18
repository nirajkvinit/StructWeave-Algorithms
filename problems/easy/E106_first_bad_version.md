---
id: E106
old_id: I077
slug: first-bad-version
title: First Bad Version
difficulty: easy
category: easy
topics: ["binary-search"]
patterns: ["binary-search"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E069", "M001", "M018"]
prerequisites: ["binary-search", "integer-overflow"]
strategy_ref: ../strategies/patterns/binary-search.md
---
# First Bad Version

## Problem

You're managing software releases numbered from 1 to n. Due to a bug introduced in one version, all subsequent versions inherit the defect (since each version builds on the previous one). Your task is to find the first bad version to identify where the bug was introduced.

You have access to an API function `isBadVersion(version)` that returns true if a version is defective. A linear scan checking each version would work but would make too many API calls. The key insight is that the versions form a sorted sequence: all good versions come first, followed by all bad versions. You're searching for the boundary point between these two groups. This is precisely what binary search excels at: finding boundaries in sorted data.

Start with the full range [1, n]. Check the middle version. If it's bad, the first bad version must be at or before this point, so search the left half. If it's good, the first bad version must be after this point, so search the right half. Repeat until you converge on the answer. This reduces n checks to log₂(n) checks, a massive improvement for large n.

## Why This Matters

This problem is the canonical example for learning binary search on an abstract search space. While binary search is often taught using sorted arrays, real-world applications frequently involve searching for boundaries or thresholds in spaces that aren't explicitly arrays: version numbers, time ranges, capacity limits, or optimization parameters. Understanding how to identify when binary search applies (monotonic property: once bad, always bad) is more valuable than memorizing the array-search implementation. This problem also teaches the critical distinction between different binary search variants: finding exact matches versus finding boundaries. The boundary-finding pattern appears in problems involving finding first/last occurrence, minimizing/maximizing under constraints, and capacity/allocation problems. Finally, handling integer overflow when calculating the midpoint is a practical lesson in defensive programming.

## Examples

**Example 1:**
- Input: `n = 5, bad = 4`
- Output: `4`
- Explanation: call isBadVersion(3) -> false
call isBadVersion(5) -> true
call isBadVersion(4) -> true
Then 4 is the first bad version.

**Example 2:**
- Input: `n = 1, bad = 1`
- Output: `1`

## Constraints

- 1 <= bad <= n <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Recognize the Search Pattern</summary>

The versions form a sorted sequence where all good versions come before all bad versions. You're searching for the boundary point between these two groups. What classic algorithm excels at finding boundaries in sorted data?

</details>

<details>
<summary>🎯 Hint 2: Binary Search Strategy</summary>

Use binary search to minimize API calls. At each step, check the middle version. If it's bad, the first bad version must be at or before this point. If it's good, the first bad version must be after this point. This narrows your search range by half each time.

</details>

<details>
<summary>📝 Hint 3: Implementation Details</summary>

Pseudocode:
```
left = 1, right = n
while left < right:
    mid = left + (right - left) / 2  // Avoid overflow
    if isBadVersion(mid):
        right = mid  // First bad could be mid or earlier
    else:
        left = mid + 1  // First bad is definitely after mid
return left
```

Watch out for integer overflow when calculating mid.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Linear Scan | O(n) | O(1) | Check each version sequentially until finding first bad |
| **Binary Search** | **O(log n)** | **O(1)** | Optimal: Halves search space each iteration, minimal API calls |

## Common Mistakes

### Mistake 1: Integer Overflow in Mid Calculation

**Wrong:**
```python
mid = (left + right) // 2  # Overflow when left + right > 2³¹ - 1
```

**Correct:**
```python
mid = left + (right - left) // 2  # Safe from overflow
```

The wrong approach fails when `left` and `right` are both large numbers near 2³¹ - 1, causing their sum to exceed integer limits.

### Mistake 2: Incorrect Boundary Updates

**Wrong:**
```python
if isBadVersion(mid):
    right = mid - 1  # Might skip the first bad version
else:
    left = mid  # Creates infinite loop when left + 1 == right
```

**Correct:**
```python
if isBadVersion(mid):
    right = mid  # Keep mid as potential answer
else:
    left = mid + 1  # Skip mid, it's definitely good
```

The first bad version could be at `mid` itself when `isBadVersion(mid)` returns true, so setting `right = mid - 1` might miss it.

### Mistake 3: Wrong Loop Condition

**Wrong:**
```python
while left <= right:  # Can cause extra iterations
    # ...
```

**Correct:**
```python
while left < right:  # Stops when left == right (answer found)
    # ...
```

Using `left <= right` requires additional logic to handle the final convergence and may result in unnecessary API calls.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| First Good After Bad | Find first good version after a range of bad versions | Easy |
| K Bad Versions | Find all K distinct bad versions in sequence | Medium |
| Uncertain API | API has probability of returning wrong result | Hard |
| 2D Version Grid | Find first bad version in 2D dependency matrix | Medium |
| Weighted API Calls | Different API calls have different costs | Medium |

## Practice Checklist

- [ ] Solve using binary search (15 min)
- [ ] Handle edge case: n = 1 (5 min)
- [ ] Avoid integer overflow in mid calculation (5 min)
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Explain approach to someone else

**Strategy**: See [Binary Search Pattern](../strategies/patterns/binary-search.md)
