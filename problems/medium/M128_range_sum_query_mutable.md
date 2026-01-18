---
id: M128
old_id: I106
slug: range-sum-query-mutable
title: Range Sum Query - Mutable
difficulty: medium
category: medium
topics: ["array", "prefix-sum"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/patterns/prefix-sum.md
frequency: high
related_problems: ["E158", "M127", "H001"]
prerequisites: ["binary-indexed-tree", "segment-tree", "prefix-sum"]
---
# Range Sum Query - Mutable

## Problem

You're building a data structure that needs to efficiently handle two operations on an integer array: point updates (changing a single element's value) and range queries (summing elements over a range). Imagine you're maintaining financial data where individual transactions can be corrected (updates) and you frequently need to compute totals for specific time periods (range sums). You're given an integer array `nums` and need to create a `NumArray` class that supports both operations efficiently.

The class has three methods. First, the constructor `NumArray(int[] nums)` initializes the data structure with the given array. Second, `update(int index, int val)` modifies the element at position `index` to the new value `val`, overwriting whatever was there before. Third, `sumRange(int left, int right)` computes and returns the sum of all elements from index `left` to index `right`, inclusive on both ends. For example, if the array is [1, 3, 5, 7, 9] and you call `sumRange(1, 3)`, you'd get 3 + 5 + 7 = 15.

The challenge is balancing the time complexity of both operations. A naive approach using a simple array makes updates O(1) but range queries O(n) - you'd have to loop through the range summing elements. Using prefix sums makes queries O(1) but updates become O(n) because you'd need to recompute all prefix values after the changed position. Neither extreme is acceptable when you have up to 30,000 calls mixed between updates and queries. You need a data structure that makes both operations sublinear, ideally O(log n). Edge cases include updating the first or last element, querying a single element (left equals right), querying the entire array, and handling negative numbers which can appear in both the initial array and update values.

## Why This Matters

This problem introduces advanced data structures for dynamic range queries that appear throughout database systems, analytics platforms, and real-time monitoring applications. Database management systems use segment trees or B-trees to efficiently process SQL aggregate queries like SUM, MIN, MAX over table ranges while handling concurrent UPDATE operations. Time-series databases tracking sensor data, stock prices, or system metrics need to compute rolling window aggregations while continuously ingesting new data points. Analytics dashboards that display running totals, moving averages, or interval statistics require real-time range aggregation with frequent data updates. Financial trading systems maintain order books where price levels update constantly while computing total volume within price ranges. Game leaderboards track player scores with frequent updates while computing rank ranges and regional totals. The problem teaches two key data structures: Binary Indexed Trees (Fenwick Trees) which are space-efficient and elegant for cumulative frequency operations, and Segment Trees which are more versatile, supporting various associative operations beyond just sums, with both providing O(log n) update and query complexity through hierarchical range decomposition.

## Constraints

- 1 <= nums.length <= 3 * 10⁴
- -100 <= nums[i] <= 100
- 0 <= index < nums.length
- -100 <= val <= 100
- 0 <= left <= right < nums.length
- At most 3 * 10⁴ calls will be made to update and sumRange.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding the Trade-off</summary>

The naive approach stores the array directly. Updates are O(1) but range queries take O(n). Conversely, prefix sums make queries O(1) but updates O(n). This problem requires both operations to be efficient. Think about data structures that balance both operations.
</details>

<details>
<summary>🎯 Hint 2: Tree-Based Solutions</summary>

Consider using a Binary Indexed Tree (Fenwick Tree) or Segment Tree. Both structures allow logarithmic time complexity for updates and queries by storing partial sums in a hierarchical structure. Each node represents a range of elements, enabling efficient updates and queries through tree navigation.
</details>

<details>
<summary>📝 Hint 3: Implementation Strategy</summary>

For a Segment Tree approach:
1. Build a tree where each node stores the sum of a range
2. For updates: traverse from root to leaf, updating nodes along the path
3. For range queries: combine overlapping ranges from tree nodes
4. Tree height is log(n), so both operations take O(log n) time

Alternatively, use a Binary Indexed Tree with cumulative frequency concepts.
</details>

## Complexity Analysis

| Approach | Time (Construction) | Time (Update) | Time (Query) | Space | Notes |
|----------|---------------------|---------------|--------------|-------|-------|
| Array Storage | O(1) | O(1) | O(n) | O(n) | Simple but slow queries |
| Prefix Sum | O(n) | O(n) | O(1) | O(n) | Fast queries, slow updates |
| **Segment Tree** | **O(n)** | **O(log n)** | **O(log n)** | **O(n)** | **Balanced approach** |
| **Binary Indexed Tree** | **O(n log n)** | **O(log n)** | **O(log n)** | **O(n)** | **Space-efficient** |

## Common Mistakes

### Mistake 1: Using Only Prefix Sum for Mutable Arrays

```python
# WRONG: Prefix sum requires O(n) update time
class NumArray:
    def __init__(self, nums):
        self.prefix = [0]
        for num in nums:
            self.prefix.append(self.prefix[-1] + num)

    def update(self, index, val):
        # This requires rebuilding all prefix sums after index
        diff = val - (self.prefix[index+1] - self.prefix[index])
        for i in range(index+1, len(self.prefix)):
            self.prefix[i] += diff  # O(n) time!
```

```python
# CORRECT: Use segment tree for O(log n) operations
class NumArray:
    def __init__(self, nums):
        self.n = len(nums)
        self.tree = [0] * (4 * self.n)
        self.build(nums, 0, 0, self.n - 1)

    def build(self, nums, node, start, end):
        if start == end:
            self.tree[node] = nums[start]
        else:
            mid = (start + end) // 2
            self.build(nums, 2*node+1, start, mid)
            self.build(nums, 2*node+2, mid+1, end)
            self.tree[node] = self.tree[2*node+1] + self.tree[2*node+2]
```

### Mistake 2: Incorrect Binary Indexed Tree Index Handling

```python
# WRONG: Forgetting BIT uses 1-based indexing
class NumArray:
    def __init__(self, nums):
        self.nums = nums
        self.bit = [0] * len(nums)  # Should be len(nums)+1

    def update(self, i, val):
        # Direct indexing causes off-by-one errors
        self.bit[i] += val
```

```python
# CORRECT: Handle 1-based indexing properly
class NumArray:
    def __init__(self, nums):
        self.n = len(nums)
        self.nums = [0] * self.n
        self.bit = [0] * (self.n + 1)  # 1-indexed
        for i, num in enumerate(nums):
            self.update(i, num)

    def update(self, i, val):
        diff = val - self.nums[i]
        self.nums[i] = val
        i += 1  # Convert to 1-indexed
        while i <= self.n:
            self.bit[i] += diff
            i += i & (-i)  # Move to next node
```

### Mistake 3: Not Handling Edge Cases in Range Queries

```python
# WRONG: Not validating range boundaries
def sumRange(self, left, right):
    return self.query(right) - self.query(left)  # Missing left-1
```

```python
# CORRECT: Proper range sum calculation
def sumRange(self, left, right):
    if left == 0:
        return self.query(right)
    return self.query(right) - self.query(left - 1)
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| 2D Range Sum | Extend to 2D matrix with updates | Use 2D segment tree or BIT |
| Range Update Point Query | Update ranges, query single points | Reverse operations using difference array |
| Range Min/Max Query | Find min/max instead of sum | Modify tree to store min/max |
| Lazy Propagation | Optimize range updates | Add lazy flags to defer updates |
| Persistent Segment Tree | Support historical queries | Create new tree nodes for updates |
| Interval Addition | Add value to entire range | Use lazy propagation technique |

## Practice Checklist

- [ ] Day 1: Implement segment tree solution
- [ ] Day 2: Implement Binary Indexed Tree solution
- [ ] Day 3: Solve without hints
- [ ] Day 7: Review and compare both approaches
- [ ] Day 14: Speed test - solve in 15 minutes
- [ ] Day 30: Teach the concept to someone

**Strategy**: See [Array Pattern](../strategies/patterns/prefix-sum.md)
