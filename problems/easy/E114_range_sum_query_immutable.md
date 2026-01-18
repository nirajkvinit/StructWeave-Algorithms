---
id: E114
old_id: I102
slug: range-sum-query-immutable
title: Range Sum Query - Immutable
difficulty: easy
category: easy
topics: ["array", "prefix-sum"]
patterns: ["prefix-sum"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E115", "M307", "M304"]
prerequisites: ["prefix-sum", "array-preprocessing", "class-design"]
strategy_ref: ../strategies/patterns/prefix-sum.md
---
# Range Sum Query - Immutable

## Problem

Design a data structure that efficiently answers range sum queries on an integer array. The array is given once during initialization and never changes afterward (it's immutable), but you need to answer many sum queries over different ranges.

Create a `NumArray` class with two methods: a constructor `NumArray(int[] nums)` that accepts the array to process, and `int sumRange(int left, int right)` that returns the sum of elements from index `left` through index `right` inclusive.

The crucial insight here is the tradeoff between preprocessing time and query time. Since the constraints indicate up to 10,000 calls to `sumRange`, you cannot afford to sum elements repeatedly for each query. Imagine computing the sum of a 10,000-element array 10,000 times; that's 100 million operations just for basic addition.

This is where prefix sums shine. A prefix sum array stores cumulative totals at each position, where `prefix[i]` represents the sum of all elements from index 0 up to (but not including) index i. With this preprocessing, any range sum becomes a simple subtraction: `sum(left, right) = prefix[right+1] - prefix[left]`. This transforms an O(n) operation into O(1).

Think about the indexing carefully. Many implementations add an extra element at the beginning of the prefix array (starting with 0) to eliminate special cases when `left` is 0. This small trick makes the code cleaner and less error-prone.

## Why This Matters

The prefix sum technique is one of the most powerful preprocessing patterns in competitive programming and appears in countless real-world applications. Database systems use similar cumulative structures for fast range queries. Time-series databases aggregate sensor data this way. Financial systems compute portfolio returns over date ranges using this exact pattern.

This preprocessing versus query time tradeoff is fundamental to system design. It's the same principle behind database indexes (slow writes, fast reads), caching strategies, and materialized views in SQL. Understanding when to precompute versus compute on-demand is crucial for performance optimization.

The pattern extends beyond one-dimensional arrays to 2D matrices (prefix sum tables), trees (Fenwick trees, segment trees), and even graphs (shortest path preprocessing). Learning prefix sums here gives you a foundation for understanding more complex data structures that build on this concept.

This problem is extremely common in technical interviews because it tests multiple skills: class design, choosing appropriate data structures, understanding space-time tradeoffs, and handling edge cases with careful indexing.

## Constraints

- 1 <= nums.length <= 10⁴
- -10⁵ <= nums[i] <= 10⁵
- 0 <= left <= right < nums.length
- At most 10⁴ calls will be made to sumRange.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Preprocessing vs Query Time Tradeoff</summary>

Since sumRange can be called up to 10,000 times but the array is initialized only once, it makes sense to invest time during construction to make queries faster. What information can you precompute to answer any range sum query in constant time?

</details>

<details>
<summary>🎯 Hint 2: Prefix Sum Array</summary>

Build a prefix sum array where prefix[i] represents the sum of all elements from index 0 to i-1. Then any range sum from left to right can be computed as prefix[right+1] - prefix[left]. This transforms each query into a simple subtraction operation. Make sure to handle the indexing carefully.

</details>

<details>
<summary>📝 Hint 3: Implementation Details</summary>

Pseudocode:
```
class NumArray:
    prefix = []

    constructor(nums):
        // Build prefix sum array with extra element at front
        prefix = [0]  // prefix[0] = 0
        for i from 0 to len(nums):
            prefix.append(prefix[-1] + nums[i])
        // Now prefix[i] = sum of nums[0..i-1]

    sumRange(left, right):
        // Sum from left to right = prefix[right+1] - prefix[left]
        return prefix[right + 1] - prefix[left]
```

The key insight: sum(left, right) = sum(0, right) - sum(0, left-1)

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| No Preprocessing | O(n) per query | O(1) | Sum elements each time - too slow for many queries |
| **Prefix Sum** | **O(1) per query** | **O(n)** | Optimal: O(n) preprocessing, constant time queries |

Constructor: O(n) for both approaches. SumRange: differs significantly.

## Common Mistakes

### Mistake 1: Recomputing Sum Each Query

**Wrong:**
```python
class NumArray:
    def __init__(self, nums):
        self.nums = nums

    def sumRange(self, left, right):
        total = 0
        for i in range(left, right + 1):
            total += self.nums[i]
        return total
        # O(n) per query - too slow for 10,000 queries
```

**Correct:**
```python
class NumArray:
    def __init__(self, nums):
        self.prefix = [0]
        for num in nums:
            self.prefix.append(self.prefix[-1] + num)

    def sumRange(self, left, right):
        return self.prefix[right + 1] - self.prefix[left]
        # O(1) per query
```

Preprocessing with prefix sums makes queries instant.

### Mistake 2: Incorrect Prefix Array Indexing

**Wrong:**
```python
class NumArray:
    def __init__(self, nums):
        self.prefix = [0] * len(nums)
        self.prefix[0] = nums[0]
        for i in range(1, len(nums)):
            self.prefix[i] = self.prefix[i-1] + nums[i]

    def sumRange(self, left, right):
        if left == 0:
            return self.prefix[right]
        return self.prefix[right] - self.prefix[left - 1]
        # Requires special case for left == 0
```

**Correct:**
```python
class NumArray:
    def __init__(self, nums):
        self.prefix = [0]  # Extra 0 at beginning
        for num in nums:
            self.prefix.append(self.prefix[-1] + num)

    def sumRange(self, left, right):
        return self.prefix[right + 1] - self.prefix[left]
        # No special cases needed
```

Adding an extra 0 at the beginning eliminates edge cases.

### Mistake 3: Off-By-One in Subtraction

**Wrong:**
```python
class NumArray:
    def __init__(self, nums):
        self.prefix = [0]
        for num in nums:
            self.prefix.append(self.prefix[-1] + num)

    def sumRange(self, left, right):
        return self.prefix[right] - self.prefix[left]
        # Missing +1 on right index
```

**Correct:**
```python
class NumArray:
    def __init__(self, nums):
        self.prefix = [0]
        for num in nums:
            self.prefix.append(self.prefix[-1] + num)

    def sumRange(self, left, right):
        return self.prefix[right + 1] - self.prefix[left]
        # Correct: includes nums[right] in sum
```

Remember: prefix[i] contains sum of elements up to but NOT including index i in nums.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Range Sum Query Mutable | Support update operations | Medium |
| Range Sum Query 2D | 2D matrix version | Medium |
| Range Product Query | Product instead of sum | Medium |
| Range Min/Max Query | Query minimum or maximum in range | Medium |
| Segment Tree | More flexible data structure for range queries | Hard |

## Practice Checklist

- [ ] Implement using prefix sum array (10 min)
- [ ] Handle edge case: single element array (5 min)
- [ ] Verify indexing with multiple test queries (5 min)
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Try 2D version for deeper understanding

**Strategy**: See [Prefix Sum Pattern](../strategies/patterns/prefix-sum.md)
