---
id: M243
old_id: A030
slug: k-diff-pairs-in-an-array
title: K-diff Pairs in an Array
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems:
  - id: E001
    title: Two Sum
    difficulty: easy
  - id: M001
    title: Add Two Numbers
    difficulty: medium
prerequisites:
  - Hash tables
  - Two pointers
  - Duplicate handling
---
# K-diff Pairs in an Array

## Problem

Given an integer array nums and a non-negative integer k, count how many unique pairs of numbers have an absolute difference of exactly k. A pair (nums[i], nums[j]) is valid if the indices are different (i != j) and the absolute difference |nums[i] - nums[j]| equals k.

The term "unique pairs" means we count distinct value pairs, not distinct index pairs. For example, if nums = [1, 1, 3, 4] and k = 2, the pairs (1,3) from indices (0,2) and (1,2) both represent the same value pair, so we count it only once. The absolute difference |a - b| is always positive, meaning |3 - 1| and |1 - 3| both equal 2.

A critical edge case is when k = 0. In this scenario, you're looking for pairs where both numbers are identical, like (5, 5). This only happens when the same value appears at least twice in the array. For instance, [1, 3, 1, 5] with k=0 has one valid pair: (1,1), because 1 appears twice. Understanding how to handle duplicates efficiently, especially for the k=0 case, is key to solving this problem correctly.

## Why This Matters

This problem bridges two fundamental algorithmic patterns: the complement search technique from Two Sum and the duplicate handling strategies essential for counting problems. It demonstrates how mathematical transformations can simplify constraints: converting |a - b| = k into "check if a+k exists" transforms an O(n²) comparison problem into an O(n) hash lookup problem. The k=0 edge case teaches an important lesson about frequency counting, a pattern that appears in database deduplication, statistics aggregation, and data validation systems where identifying repeated elements efficiently is crucial.

## Examples

**Example 1:**
- Input: `nums = [3,1,4,1,5], k = 2`
- Output: `2`
- Explanation: Two unique pairs exist: (1, 3) and (3, 5). Despite having duplicate 1s in the input, each distinct pair is counted only once.

**Example 2:**
- Input: `nums = [1,2,3,4,5], k = 1`
- Output: `4`
- Explanation: Four pairs qualify: (1, 2), (2, 3), (3, 4), and (4, 5).

**Example 3:**
- Input: `nums = [1,3,1,5,4], k = 0`
- Output: `1`
- Explanation: Only one pair (1, 1) has a difference of 0.

## Constraints

- 1 <= nums.length <= 10⁴
- -10⁷ <= nums[i] <= 10⁷
- 0 <= k <= 10⁷

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding the difference equation</summary>

For a pair (a, b) where a < b to have difference k:
- b - a = k
- Therefore, b = a + k

Key insight: For each number `n` in the array, check if `n + k` exists. This transforms the problem into a lookup problem, perfect for hash sets.

Special case: When k = 0, you need pairs of identical numbers, which requires checking if any number appears at least twice.

</details>

<details>
<summary>Hint 2: Handling duplicates correctly</summary>

The problem asks for distinct pairs, not distinct indices. With `nums = [1, 1, 3]` and `k = 2`:
- Indices (0,2) and (1,2) both give pair (1,3)
- Count this as ONE pair, not two

Solution: Use a set to track unique values, then check for complements:
```
unique = set(nums)
for num in unique:
    if num + k in unique:
        count += 1
```

</details>

<details>
<summary>Hint 3: Alternative two-pointer approach</summary>

After sorting, use two pointers:
1. If `nums[j] - nums[i] == k`: found a pair, increment both pointers
2. If `nums[j] - nums[i] < k`: increment j (increase difference)
3. If `nums[j] - nums[i] > k`: increment i (decrease difference)

Skip duplicates by advancing pointers past equal values. This approach is O(n log n) due to sorting.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash set | O(n) | O(n) | Optimal for unsorted array; single pass |
| Two pointers + sort | O(n log n) | O(1) or O(n) | Depends on sort implementation; no extra set needed |
| Brute force | O(n²) | O(n) | Check all pairs; use set to track distinct pairs |

## Common Mistakes

1. Not handling k=0 special case

```python
# Wrong: Fails for k=0
def findPairs(nums, k):
    unique = set(nums)
    count = 0
    for num in unique:
        if num + k in unique:  # When k=0, always true!
            count += 1
    return count

# Correct: Special handling for k=0
def findPairs(nums, k):
    if k == 0:
        from collections import Counter
        counter = Counter(nums)
        return sum(1 for v in counter.values() if v >= 2)

    unique = set(nums)
    count = 0
    for num in unique:
        if num + k in unique:
            count += 1
    return count
```

2. Counting pairs in both directions

```python
# Wrong: Double counting
for num in unique:
    if num + k in unique:
        count += 1
    if num - k in unique:  # This counts the same pair again!
        count += 1

# Correct: Only check one direction
for num in unique:
    if num + k in unique:
        count += 1
```

3. Not deduplicating before counting

```python
# Wrong: Counting duplicate pairs
def findPairs(nums, k):
    count = 0
    for i in range(len(nums)):
        for j in range(i+1, len(nums)):
            if abs(nums[i] - nums[j]) == k:
                count += 1  # Counts (1,3) twice if [1,1,3]
    return count

# Correct: Use set to track unique pairs
def findPairs(nums, k):
    pairs = set()
    for i in range(len(nums)):
        for j in range(i+1, len(nums)):
            if abs(nums[i] - nums[j]) == k:
                pairs.add((min(nums[i], nums[j]), max(nums[i], nums[j])))
    return len(pairs)
```

## Variations

| Variation | Difference | Strategy |
|-----------|-----------|----------|
| K-sum pairs | Find pairs with sum = k instead of difference | Hash set: check if k - num exists |
| Count all pairs | Include duplicates from different indices | Don't deduplicate; count all index pairs |
| Closest k-diff | Find pair with difference closest to k | Sort and use two pointers with min tracking |
| Multiple k values | Query for different k values | Build frequency map once, answer queries in O(n) each |

## Practice Checklist

- [ ] Implement hash set solution (20 min)
- [ ] Handle k=0 edge case correctly
- [ ] Implement two-pointer solution (20 min)
- [ ] Review after 1 day - solve from memory
- [ ] Review after 1 week - solve k-sum variant
- [ ] Review after 1 month - optimize for multiple queries

**Strategy**: Hash set for O(n) lookup with careful duplicate handling
