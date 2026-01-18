---
id: M165
old_id: I177
slug: kth-smallest-element-in-a-sorted-matrix
title: Kth Smallest Element in a Sorted Matrix
difficulty: medium
category: medium
topics: ["heap", "matrix", "sorting"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/data-structures/heaps.md
frequency: high
related_problems: ["E378", "M373", "M668"]
prerequisites: ["min-heap", "binary-search", "matrix-traversal"]
---
# Kth Smallest Element in a Sorted Matrix

## Problem

You are given a square matrix of size `n x n` where both rows and columns are sorted in ascending order—meaning each row reads left-to-right in increasing values, and each column reads top-to-bottom in increasing values. Your task is to find the `kth` smallest element in the entire matrix when all values are considered together. Importantly, if duplicate values exist, they count as separate elements (so if the number 5 appears three times, it occupies three positions in the sorted order). For example, in a 3x3 matrix, asking for the 8th smallest means finding what value would be at index 7 if you flattened all nine elements into a sorted array. The constraint that makes this challenging is that you must solve it using less than `O(n²)` memory—so you cannot simply dump all values into an array, sort them, and pick the kth element. You need to cleverly exploit the sorted structure to find the answer without materializing the full sorted sequence. Edge cases include matrices with a single element, when k equals 1 (finding the minimum), or when k equals n² (finding the maximum).

## Why This Matters

This problem teaches efficient algorithms for finding order statistics in structured data, a critical technique in database query optimization. When databases execute queries like "SELECT * FROM table ORDER BY column LIMIT k OFFSET n", they use similar strategies to avoid sorting entire tables when only a subset is needed. Image processing applications use this for median filtering, where you need the median pixel value in a sliding window to reduce noise without sorting millions of pixels repeatedly. Machine learning systems apply this when selecting the top-k predictions from sorted probability distributions across multiple dimensions. Financial systems use order statistics to calculate percentile-based metrics like "95th percentile latency" across distributed logs without centralizing all data. Search engines rank results using similar techniques to find top-k documents from pre-sorted indexes. The heap-based and binary search approaches you'll explore demonstrate fundamental tradeoffs between time and space complexity, showing how the right data structure (heaps) combined with structural properties (sorted rows/columns) enables efficient solutions that seem impossible at first glance.

## Examples

**Example 1:**
- Input: `matrix = [[1,5,9],[10,11,13],[12,13,15]], k = 8`
- Output: `13`
- Explanation: When all matrix values are sorted: [1,5,9,10,11,12,13,**13**,15], the value at position 8 is 13

**Example 2:**
- Input: `matrix = [[-5]], k = 1`
- Output: `-5`

## Constraints

- n == matrix.length == matrix[i].length
- 1 <= n <= 300
- -10⁹ <= matrix[i][j] <= 10⁹
- All the rows and columns of matrix are **guaranteed** to be sorted in **non-decreasing order**.
- 1 <= k <= n²

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Leverage Sorted Property</summary>

Each row is sorted and each column is sorted. The smallest element is always at matrix[0][0]. After picking it, what are the candidates for the next smallest? Only matrix[0][1] and matrix[1][0] could be next. Think about how to efficiently track candidates as you extract elements.
</details>

<details>
<summary>🎯 Hint 2: Two Main Approaches</summary>

**Approach 1 - Min Heap**: Start with the first element of each row (or column) in a min-heap. Extract min k times. When you extract matrix[i][j], add matrix[i][j+1] to the heap if it exists. This works because of the sorted property.

**Approach 2 - Binary Search**: Binary search on the value range [min_element, max_element]. For each mid value, count how many elements are ≤ mid. If count >= k, the answer is at most mid; otherwise, search higher.
</details>

<details>
<summary>📝 Hint 3: Min-Heap Implementation</summary>

Pseudocode (Min-Heap approach):
```
function kthSmallest(matrix, k):
    n = matrix.length
    min_heap = empty heap

    // Initialize heap with first element of each row
    for i from 0 to n-1:
        heap.push((matrix[i][0], i, 0))  // (value, row, col)

    // Extract min k times
    for count from 1 to k:
        value, row, col = heap.pop()

        if count == k:
            return value

        // Add next element in the same row if exists
        if col + 1 < n:
            heap.push((matrix[row][col + 1], row, col + 1))

    return -1
```

Time: O(k * log n), Space: O(n)
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Flatten and Sort | O(n² log n) | O(n²) | Violates space constraint; simple but inefficient |
| **Min-Heap** | **O(k log n)** | **O(n)** | Best when k is small; only track n elements |
| Binary Search + Count | O(n² log(max-min)) | O(1) | Better when k is large; requires counting |

## Common Mistakes

**Mistake 1: Using max-heap of size k incorrectly**
```python
# Wrong: Max-heap approach is inefficient here
def kthSmallest(matrix, k):
    max_heap = []
    for row in matrix:
        for val in row:  # O(n²) iterations
            heappush(max_heap, -val)
            if len(max_heap) > k:
                heappop(max_heap)
    return -max_heap[0]
# This violates O(n²) memory and doesn't leverage sorted property
```

**Mistake 2: Not tracking visited elements in min-heap**
```python
# Wrong: May add duplicates to heap
def kthSmallest(matrix, k):
    heap = [(matrix[0][0], 0, 0)]
    for _ in range(k):
        val, i, j = heappop(heap)
        # Wrong: both neighbors might add same element
        if i + 1 < n:
            heappush(heap, (matrix[i+1][j], i+1, j))
        if j + 1 < n:
            heappush(heap, (matrix[i][j+1], i, j+1))
```

```python
# Correct: Use set to track visited
def kthSmallest(matrix, k):
    n = len(matrix)
    heap = [(matrix[0][0], 0, 0)]
    visited = {(0, 0)}

    for _ in range(k):
        val, i, j = heappop(heap)

        if i + 1 < n and (i+1, j) not in visited:
            heappush(heap, (matrix[i+1][j], i+1, j))
            visited.add((i+1, j))

        if j + 1 < n and (i, j+1) not in visited:
            heappush(heap, (matrix[i][j+1], i, j+1))
            visited.add((i, j+1))

    return val
```

**Mistake 3: Binary search with incorrect count function**
```python
# Wrong: Counting elements incorrectly
def countLessEqual(matrix, target):
    count = 0
    for row in matrix:
        for val in row:
            if val <= target:  # O(n²), doesn't use sorted property
                count += 1
    return count
```

```python
# Correct: Use sorted property for O(n) count
def countLessEqual(matrix, target):
    n = len(matrix)
    count = 0
    col = n - 1  # Start from top-right

    for row in range(n):
        while col >= 0 and matrix[row][col] > target:
            col -= 1
        count += (col + 1)

    return count
```

## Variations

| Variation | Difference | Hint |
|-----------|-----------|------|
| Kth largest instead | Find kth largest element | Use max-heap or search for (n² - k + 1)th smallest |
| Unsorted matrix | No sorted guarantee | Must sort or use selection algorithm |
| Rectangular matrix | m x n instead of n x n | Same approaches apply with adjusted indices |
| Find median | k = n²/2 | Use binary search for better efficiency |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Attempted again after 1 day
- [ ] Attempted again after 3 days
- [ ] Attempted again after 1 week
- [ ] Attempted again after 2 weeks

**Strategy**: See [Heap Pattern](../strategies/data-structures/heaps.md)
