---
id: M156
old_id: I162
slug: max-sum-of-rectangle-no-larger-than-k
title: Max Sum of Rectangle No Larger Than K
difficulty: medium
category: medium
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M154", "E001", "M020"]
prerequisites: ["2d-array", "prefix-sum", "binary-search", "sorted-set"]
---
# Max Sum of Rectangle No Larger Than K

## Problem

Here's a challenging optimization puzzle on a 2D grid. You have an `m x n` matrix of integers (which can be positive, negative, or zero) and a threshold value `k`. Your goal is to find the rectangular subregion within this matrix that has the largest sum possible, but with an important constraint: the sum cannot exceed `k`. Think of it like carving out a rectangular section from the grid where you want to maximize the total value while staying under a budget. The rectangle can be any size from a single cell up to the entire matrix, and it must be contiguous (you can't skip rows or columns). For example, with the matrix `[[2, 2, -1]]` and `k = 3`, the best rectangle is all three elements with sum 3, which exactly meets the threshold. You're guaranteed that at least one valid rectangle exists (worst case, even a single cell will work if all values are negative). The main challenge here is efficiency: a brute force approach checking all possible rectangles would require trying every combination of top row, bottom row, left column, and right column, then summing all elements in each rectangle. For a 100x100 matrix, this becomes astronomically slow. Edge cases include matrices with all negative values (you might only select a single cell), matrices where the entire grid sums to exactly `k`, and cases where negative numbers strategically placed can help you get closer to `k` without exceeding it.

**Diagram:**

```
Example matrix with rectangles:
┌─────┬─────┬─────┐
│  2  │  2  │ -1  │
└─────┴─────┴─────┘

Possible rectangles and their sums:
- [2] → sum = 2
- [2,2] → sum = 4
- [2,2,-1] → sum = 3 (≤ k=3, maximum valid)
- [2] → sum = 2
- [2,-1] → sum = 1
- [-1] → sum = -1
```


## Why This Matters

This problem models resource allocation under constraints, which appears everywhere in real-world optimization. In digital advertising, companies need to select rectangular regions of ad space (width x height) that maximize click value without exceeding their budget - Google Ads and Facebook Ads use similar algorithms billions of times per day. In image processing and computer vision, this technique helps detect regions of interest in medical scans (finding the largest tumor area below a certain density threshold) or in satellite imagery analysis (identifying crop areas with yields within a target range). Financial portfolio managers use this pattern to select combinations of assets (think of it as a grid of returns over time) that maximize profit while keeping risk below a threshold. The algorithm you'll learn - reducing 2D problems to 1D subproblems - is a fundamental technique in computational geometry, appearing in warehouse space optimization (packing boxes to maximize value in a constrained volume) and in VLSI chip design where engineers place circuit components to maximize performance within power consumption limits.

## Examples

**Example 1:**
- Input: `matrix = [[2,2,-1]], k = 3`
- Output: `3`
- Explanation: The rectangle containing all three elements sums to 3, which does not exceed k.

## Constraints

- m == matrix.length
- n == matrix[i].length
- 1 <= m, n <= 100
- -100 <= matrix[i][j] <= 100
- -10⁵ <= k <= 10⁵

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Reduce to 1D Problem</summary>
This 2D problem can be reduced to multiple 1D subarray problems. Fix two rows (top and bottom), then compress all rows between them into a single array by summing column values. Now you need to find the maximum subarray sum ≤ k in this 1D array. Repeat for all row pairs.
</details>

<details>
<summary>🎯 Hint 2: Maximum Subarray Sum ≤ K in 1D</summary>
For a 1D array, you need to find max(sum[j] - sum[i]) where sum[j] - sum[i] ≤ k (subarray from i+1 to j). Rearrange: sum[j] - k ≤ sum[i], so find the smallest sum[i] ≥ sum[j] - k. Use a sorted set to maintain prefix sums and binary search for the smallest valid sum[i].
</details>

<details>
<summary>📝 Hint 3: Complete Algorithm</summary>
Algorithm:
1. For each pair of rows (top, bottom):
   - Compress rows into 1D array: arr[col] = sum of matrix[top..bottom][col]
2. For this 1D array, find max subarray sum ≤ k:
   - Maintain sorted set of prefix sums
   - For each position j with prefix sum[j]:
     - Find smallest sum[i] ≥ sum[j] - k using binary search
     - If found, update max_sum = max(max_sum, sum[j] - sum[i])
     - Add sum[j] to sorted set
3. Return max_sum

Time: O(m² × n log n), Space: O(n)
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (All Rectangles) | O(m²n²) × O(mn) = O(m³n³) | O(1) | Try all rectangles, sum each |
| Prefix Sum + Brute Force | O(m²n²) | O(mn) | 2D prefix sum, O(1) rectangle sum |
| **Row Compression + Sorted Set** | **O(m² × n log n)** | **O(n)** | Reduce to 1D problem, binary search |

## Common Mistakes

**Mistake 1: Simple Prefix Sum Approach**
```python
# Wrong: O(m²n²) - still too slow and doesn't handle constraint ≤ k efficiently
def maxSumSubmatrix(matrix, k):
    m, n = len(matrix), len(matrix[0])
    max_sum = float('-inf')

    # Build 2D prefix sum
    prefix = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            prefix[i][j] = (matrix[i-1][j-1] + prefix[i-1][j] +
                           prefix[i][j-1] - prefix[i-1][j-1])

    # Try all rectangles
    for r1 in range(m):
        for c1 in range(n):
            for r2 in range(r1, m):
                for c2 in range(c1, n):
                    rect_sum = (prefix[r2+1][c2+1] - prefix[r1][c2+1] -
                               prefix[r2+1][c1] + prefix[r1][c1])
                    if rect_sum <= k:
                        max_sum = max(max_sum, rect_sum)

    return max_sum
```

**Correct Approach:**
```python
# Correct: O(m² × n log n) with row compression
from sortedcontainers import SortedList

def maxSumSubmatrix(matrix, k):
    m, n = len(matrix), len(matrix[0])
    max_sum = float('-inf')

    for top in range(m):
        # Compress rows from 'top' to 'bottom'
        arr = [0] * n
        for bottom in range(top, m):
            # Add current row to compressed array
            for col in range(n):
                arr[col] += matrix[bottom][col]

            # Find max subarray sum ≤ k in 1D array
            sorted_sums = SortedList([0])
            curr_sum = 0

            for val in arr:
                curr_sum += val
                # Find smallest sum ≥ curr_sum - k
                idx = sorted_sums.bisect_left(curr_sum - k)
                if idx < len(sorted_sums):
                    max_sum = max(max_sum, curr_sum - sorted_sums[idx])
                sorted_sums.add(curr_sum)

    return max_sum
```

**Mistake 2: Not Using Sorted Set**
```python
# Wrong: Linear search instead of binary search - O(m²n²)
def maxSumSubmatrix(matrix, k):
    # ... row compression ...
    for bottom in range(top, m):
        # ... update arr ...

        prefix_sums = [0]
        curr_sum = 0
        for val in arr:
            curr_sum += val
            # Linear search - O(n)!
            for psum in prefix_sums:
                if curr_sum - psum <= k:
                    max_sum = max(max_sum, curr_sum - psum)
            prefix_sums.append(curr_sum)
```

**Mistake 3: Incorrect Binary Search Logic**
```python
# Wrong: Looking for wrong target in binary search
curr_sum = 0
for val in arr:
    curr_sum += val
    # Wrong: searching for curr_sum + k instead of curr_sum - k
    idx = sorted_sums.bisect_left(curr_sum + k)  # Wrong!
    # ...
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| Exact Sum K | Find rectangle with sum exactly k | Check equality instead of ≤ |
| Maximum Sum (no constraint) | Find maximum sum rectangle | Use Kadane's 2D algorithm, simpler |
| Minimum Sum ≥ K | Find minimum sum that's at least k | Similar but reverse the comparison |
| Count Rectangles | Count rectangles with sum ≤ k | Count instead of tracking max |
| 3D Version | Find max sum in 3D subarray | Extend to 3 dimensions |

## Practice Checklist

- [ ] Day 1: Implement row compression with sorted set
- [ ] Day 2: Implement without sorted container using TreeSet simulation
- [ ] Day 7: Solve maximum sum rectangle (Kadane's 2D)
- [ ] Day 14: Solve count rectangles variation
- [ ] Day 30: Solve without looking at hints

**Strategy**: See [2D Dynamic Programming](../strategies/patterns/dp-2d.md)
