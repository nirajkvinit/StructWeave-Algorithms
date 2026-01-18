---
id: E248
old_id: A355
slug: fair-candy-swap
title: Fair Candy Swap
difficulty: easy
category: easy
topics: ["array", "hash-table", "math"]
patterns: ["complement-search"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - E001_two_sum.md
  - E217_contains_duplicate.md
prerequisites:
  - "Hash set operations"
  - "Basic algebra"
  - "Array traversal"
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Fair Candy Swap

## Problem

Alice and Bob each have a collection of candy boxes, where each box contains a specific number of candies. Alice's boxes are represented by the array `aliceSizes`, where `aliceSizes[i]` is the number of candies in her i-th box. Similarly, Bob's boxes are represented by `bobSizes`. Currently, Alice and Bob have different total amounts of candy.

They want to exchange exactly one box each so that after the swap, they both have the same total number of candies. Your task is to find which boxes should be swapped to achieve this fair exchange.

Here's the key mathematical insight: if Alice starts with a total of `sumA` candies and gives away a box of size `a` while receiving a box of size `b` from Bob, her new total becomes `sumA - a + b`. Similarly, Bob's new total becomes `sumB - b + a` (where `sumB` is his original total). For them to be equal after the swap:

`sumA - a + b = sumB - b + a`

Rearranging this equation: `2b = 2a + (sumB - sumA)`, which simplifies to `b = a + (sumB - sumA) / 2`.

This formula tells you that for any box of size `a` that Alice gives away, you can calculate exactly what size box `b` Bob must give in return. The challenge is efficiently checking whether Bob actually has such a box.

Return an array `[a, b]` where `a` is the size of the box Alice gives to Bob, and `b` is the size Bob gives to Alice. The problem guarantees at least one valid solution exists. If multiple solutions exist, you can return any one of them.

## Why This Matters

This problem demonstrates the power of algebraic thinking in algorithm design - by deriving a mathematical relationship, you can transform a seemingly complex search problem into a simple lookup task. The complement search pattern you learn here (finding if a target value exists in a collection) is one of the most frequently used techniques in competitive programming and technical interviews. It appears in classic problems like two-sum, finding pairs with specific differences, and matching problems. The optimization from O(n×m) brute force to O(n+m) using hash sets is a fundamental technique that applies to database query optimization, network packet matching, duplicate detection, and many real-world scenarios where you need to check membership efficiently. Understanding when to use hash tables for O(1) lookups versus linear search is a critical skill for writing performant code. This problem also reinforces the importance of extracting mathematical constraints before diving into code.

## Examples

**Example 1:**
- Input: `aliceSizes = [1,1], bobSizes = [2,2]`
- Output: `[1,2]`

**Example 2:**
- Input: `aliceSizes = [1,2], bobSizes = [2,3]`
- Output: `[1,2]`

**Example 3:**
- Input: `aliceSizes = [2], bobSizes = [1,3]`
- Output: `[2,3]`

## Constraints

- 1 <= aliceSizes.length, bobSizes.length <= 10⁴
- 1 <= aliceSizes[i], bobSizes[j] <= 10⁵
- Alice and Bob have a different total number of candies.
- There will be at least one valid answer for the given input.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Problem Understanding
After swapping one box from Alice (size `a`) with one box from Bob (size `b`), both should have equal totals. If Alice starts with total `sumA` and Bob with `sumB`, what equation must hold after the swap?

Think about the mathematical relationship: `sumA - a + b = sumB - b + a`

### Tier 2 Hint - Solution Strategy
From the equation `sumA - a + b = sumB - b + a`, you can derive:
- `sumA + 2b = sumB + 2a`
- `2b - 2a = sumB - sumA`
- `b - a = (sumB - sumA) / 2`

So `b = a + (sumB - sumA) / 2`. For each box size `a` in Alice's collection, can you determine what `b` must be and check if Bob has it?

### Tier 3 Hint - Implementation Details
1. Calculate total sums: `sumA` and `sumB`
2. Calculate the difference: `diff = (sumB - sumA) / 2`
3. Convert Bob's sizes to a hash set for O(1) lookup
4. For each size `a` in Alice's boxes:
   - Calculate required `b = a + diff`
   - If `b` exists in Bob's set, return `[a, b]`

This gives O(n + m) time complexity where n and m are array lengths.

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Hash set lookup | O(n + m) | O(m) | Optimal solution, store Bob's sizes in set |
| Brute force | O(n × m) | O(1) | Try all pairs, inefficient |
| Sort and binary search | O(n log n + m log m) | O(1) | Sort Bob's array, binary search for each Alice box |

## Common Mistakes

### Mistake 1: Not using the mathematical relationship
```python
# Wrong: Trying all combinations without math
for a in aliceSizes:
    for b in bobSizes:
        if sumA - a + b == sumB - b + a:
            return [a, b]
```
**Why it's wrong**: This works but is O(n × m) instead of O(n + m). The mathematical formula eliminates the need to try all combinations.

### Mistake 2: Integer division issues
```python
# Wrong: Not handling odd differences
diff = (sumB - sumA) // 2  # Floor division might give wrong result
```
**Why it's wrong**: If `sumB - sumA` is odd, there's no valid swap, but problem guarantees solution exists. Still, use exact division or check for validity.

### Mistake 3: Forgetting to check if target exists
```python
# Wrong: Assumes target always exists in Bob's array
diff = (sumB - sumA) // 2
for a in aliceSizes:
    return [a, a + diff]  # Doesn't verify b exists
```
**Why it's wrong**: Even though problem guarantees a solution, you need to verify the calculated `b` exists in Bob's collection.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Multiple swaps | Medium | Allow k swaps to equalize totals |
| Minimum difference | Medium | Find swap that minimizes absolute difference (no exact equal) |
| Three-way swap | Medium | Alice, Bob, and Carol want to equalize |
| Weighted candies | Medium | Each candy type has different value/weight |
| No solution case | Easy | Return empty array if no valid swap exists |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Reviewed solution and understood all approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 3 days
- [ ] Practiced again after 1 week
- [ ] Can explain the solution clearly to others
- [ ] Solved all variations above

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
