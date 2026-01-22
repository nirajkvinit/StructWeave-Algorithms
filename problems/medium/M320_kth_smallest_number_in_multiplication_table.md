---
id: M320
old_id: A135
slug: kth-smallest-number-in-multiplication-table
title: Kth Smallest Number in Multiplication Table
difficulty: medium
category: medium
topics: ["heap", "binary-search"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M378", "H004", "M240"]
prerequisites: ["binary-search", "heap", "matrix-properties"]
strategy_ref: ../prerequisites/heaps.md
---
# Kth Smallest Number in Multiplication Table

## Problem

Consider an `m x n` multiplication table where entry at row `i` and column `j` equals `i * j` (using 1-based indexing). Given three integers `m`, `n`, and `k`, find the `kth` smallest value in this table.

For example, a 3x3 multiplication table looks like this:
```
     1   2   3
   -----------
1 |  1   2   3
2 |  2   4   6
3 |  3   6   9
```
The values in sorted order are `[1, 2, 2, 3, 3, 4, 6, 6, 9]`. Notice that duplicates appear because `2*1 = 1*2 = 2` and `3*2 = 2*3 = 6`.

The naive approach of generating all `m * n` values and sorting would use excessive memory and time for large tables (constraints allow up to 30,000 rows and columns, creating 900 million entries). The key insight is that you don't need to materialize the table. Instead, use binary search on the answer space combined with an efficient counting function.

For any candidate value `x`, you can count how many table entries are less than or equal to `x` without generating the table: for row `i`, the count is `min(x / i, n)` because row `i` contains `[i, 2i, 3i, ..., ni]`. Sum this across all rows to get the total count. Binary search finds the smallest `x` where this count equals or exceeds `k`.

## Why This Matters

This problem demonstrates binary search on implicit sorted structures, a powerful technique for optimization problems where directly computing answers is infeasible but validating candidates is efficient. Database query optimizers use similar logic when estimating result set sizes without executing full queries. This pattern appears in resource allocation problems where you binary search on resource amounts and check feasibility. The counting function technique is fundamental to rank queries and percentile calculations in distributed systems where data cannot be centralized. Understanding how to exploit mathematical structure in virtually sorted data (like multiplication tables) builds intuition for working with formula-based sequences, geometric progressions, and other implicitly ordered sets. This approach is crucial for interviews where constraints make brute force impossible but structure enables efficient validation.

## Examples

**Example 1:**

Input: m = 3, n = 3, k = 5
```
Multiplication table (3x3):
   1  2  3
   -------
1| 1  2  3
2| 2  4  6
3| 3  6  9

Values in sorted order: [1, 2, 2, 3, 3, 4, 6, 6, 9]
The 5th smallest value is 3
```
Output: 3

**Example 2:**

Input: m = 2, n = 3, k = 6
```
Multiplication table (2x3):
   1  2  3
   -------
1| 1  2  3
2| 2  4  6

Values in sorted order: [1, 2, 2, 3, 4, 6]
The 6th smallest value is 6
```
Output: 6


## Why This Matters

This problem demonstrates binary search on implicit sorted structures, a powerful technique for optimization problems where directly computing answers is infeasible but validating candidates is efficient. Database query optimizers use similar logic when estimating result set sizes without executing full queries. This pattern appears in resource allocation problems where you binary search on resource amounts and check feasibility. The counting function technique is fundamental to rank queries and percentile calculations in distributed systems where data cannot be centralized. Understanding how to exploit mathematical structure in virtually sorted data (like multiplication tables) builds intuition for working with formula-based sequences, geometric progressions, and other implicitly ordered sets. This approach is crucial for interviews where constraints make brute force impossible but structure enables efficient validation.

## Constraints

- 1 <= m, n <= 3 * 10⁴
- 1 <= k <= m * n

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Avoid Building the Entire Table</summary>

With constraints up to 3 * 10⁴, building an m*n table could require 9 * 10⁸ cells - too much memory and time. Instead, recognize that you don't need all values, just the kth smallest.

Consider: For any value `x`, can you efficiently count how many elements in the multiplication table are less than or equal to `x`?

</details>

<details>
<summary>Hint 2: Binary Search on the Answer</summary>

The answer lies in the range `[1, m*n]`. You can binary search on this range. For each candidate value `mid`, count how many elements in the table are `<= mid`:

```python
def count_less_equal(m, n, x):
    count = 0
    for i in range(1, m + 1):
        # In row i, values are: i*1, i*2, ..., i*n
        # How many are <= x?
        count += min(x // i, n)
    return count
```

If `count >= k`, then the answer is `<= mid`. Binary search to find the minimum such value.

</details>

<details>
<summary>Hint 3: Optimize the Search Space</summary>

The actual answer must be a value that exists in the table. However, your binary search might converge to a value that doesn't exist (e.g., searching for 5th element might give 3.5 in continuous space).

The key insight: Binary search finds the smallest `x` where `count(x) >= k`. This `x` is guaranteed to be in the table because:
- If `count(x-1) < k` and `count(x) >= k`, then `x` must be the kth element
- The counting function is monotonic

```python
def findKthNumber(m, n, k):
    left, right = 1, m * n
    while left < right:
        mid = (left + right) // 2
        if count_less_equal(m, n, mid) < k:
            left = mid + 1
        else:
            right = mid
    return left
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Build + Sort Table | O(mn log(mn)) | O(mn) | Too slow for large inputs; TLE |
| Min Heap (merge k lists) | O(k log m) | O(m) | Treat each row as sorted list |
| Binary Search + Count | O(m log(mn)) | O(1) | Optimal; m iterations per binary search |
| Binary Search Optimized | O(m log(mn)) | O(1) | Best practical solution |

## Common Mistakes

**Mistake 1: Building the Entire Multiplication Table**
```python
# Wrong: Memory and time limit exceeded
table = []
for i in range(1, m + 1):
    for j in range(1, n + 1):
        table.append(i * j)
table.sort()
return table[k - 1]

# Correct: Use binary search without building table
# (See Hint 3)
```

**Mistake 2: Incorrect Counting Function**
```python
# Wrong: Not handling division correctly
def count(x):
    total = 0
    for i in range(1, m + 1):
        total += x // i  # Missing min with n!
    return total

# Correct: Each row has at most n elements
def count(x):
    total = 0
    for i in range(1, m + 1):
        total += min(x // i, n)
    return total
```

**Mistake 3: Wrong Binary Search Boundary**
```python
# Wrong: Including values not in table
left, right = 1, m * n
if count(mid) >= k:
    right = mid - 1  # Wrong: might skip answer

# Correct: Standard binary search for leftmost
if count(mid) >= k:
    right = mid
else:
    left = mid + 1
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Kth smallest in sorted matrix | Medium | General matrix, not multiplication table |
| Count elements <= x in mult table | Easy | Direct application of counting function |
| Find kth largest instead | Easy | Binary search from high to low |
| Multiplication table with step size | Medium | Non-consecutive row/column indices |
| Range sum in multiplication table | Hard | Segment tree or 2D prefix sum |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Analyzed time/space complexity
- [ ] Solved without hints
- [ ] Tested edge cases (k=1, k=m*n, m=1, n=1)
- [ ] Reviewed alternative approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 1 week
- [ ] Could explain solution to others

**Strategy**: See [Heap Pattern](../prerequisites/heaps.md)
