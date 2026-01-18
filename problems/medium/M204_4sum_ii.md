---
id: M204
old_id: I253
slug: 4sum-ii
title: 4Sum II
difficulty: medium
category: medium
topics: ["array", "hash-table"]
patterns: ["two-pointer", "hash-map"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E001", "M015", "M018"]
prerequisites: ["hash-table", "two-sum-pattern", "space-time-tradeoff"]
---
# 4Sum II

## Problem

Given four integer arrays `nums1`, `nums2`, `nums3`, and `nums4`, each with `n` elements, count how many ways you can pick one number from each array such that the four numbers sum to zero. Formally, count all tuples `(i, j, k, l)` where `nums1[i] + nums2[j] + nums3[k] + nums4[l] == 0` and each index is valid (between 0 and n-1).

The brute force approach of checking all possible combinations requires four nested loops, yielding O(n⁴) time complexity. For n = 200 (the maximum), this means 1.6 billion operations, which is too slow. The key optimization comes from recognizing that you can split the problem in half: instead of searching through four arrays simultaneously, compute all possible sums from the first two arrays, then search for complementary sums from the last two arrays.

This transforms the problem into a variant of the classic Two Sum problem. By using a hash map to store frequencies of sums from the first pair of arrays, you can check in constant time whether each sum from the second pair has a complement that creates a zero total.

## Why This Matters

The divide-and-conquer strategy of splitting four arrays into two pairs is a fundamental optimization technique that appears throughout computer science. This pattern shows up in cryptography (meet-in-the-middle attacks), database query optimization (hash joins), and computational geometry. The space-time tradeoff demonstrated here—using O(n²) space to reduce time from O(n⁴) to O(n²)—is a classic example of trading memory for speed, a decision engineers make constantly in real systems. This problem builds your ability to recognize when a problem can be decomposed into smaller, cacheable subproblems, a skill essential for designing scalable systems.

## Examples

**Example 1:**
- Input: `nums1 = [1,2], nums2 = [-2,-1], nums3 = [-1,2], nums4 = [0,2]`
- Output: `2`
- Explanation: Two valid index combinations exist:
1. (0, 0, 0, 1) -> nums1[0] + nums2[0] + nums3[0] + nums4[1] = 1 + (-2) + (-1) + 2 = 0
2. (1, 1, 0, 0) -> nums1[1] + nums2[1] + nums3[0] + nums4[0] = 2 + (-1) + (-1) + 0 = 0

**Example 2:**
- Input: `nums1 = [0], nums2 = [0], nums3 = [0], nums4 = [0]`
- Output: `1`

## Constraints

- n == nums1.length
- n == nums2.length
- n == nums3.length
- n == nums4.length
- 1 <= n <= 200
- -2²⁸ <= nums1[i], nums2[i], nums3[i], nums4[i] <= 2²⁸

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Splitting the Problem</summary>

Instead of searching through all four arrays simultaneously (O(n⁴)), split the problem into two parts. Compute all possible sums from the first two arrays, then for each sum from the last two arrays, check if its negative exists in the first group. This reduces the problem to a Two Sum variant.

</details>

<details>
<summary>🎯 Hint 2: Hash Map Strategy</summary>

Create a hash map storing all possible sums from nums1[i] + nums2[j] and their frequencies. Then iterate through all possible sums of nums3[k] + nums4[l], and for each sum, check if -(nums3[k] + nums4[l]) exists in the hash map. Add the frequency count to your result.

</details>

<details>
<summary>📝 Hint 3: Implementation Algorithm</summary>

```
Create hash_map to store sum -> count

# Store all sums from first two arrays
For i in nums1:
    For j in nums2:
        sum12 = i + j
        hash_map[sum12] += 1

count = 0
# Check complements from last two arrays
For k in nums3:
    For l in nums4:
        sum34 = k + l
        target = -sum34
        if target in hash_map:
            count += hash_map[target]

Return count
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (4 loops) | O(n⁴) | O(1) | Too slow for n=200 |
| Hash Map (2+2 split) | O(n²) | O(n²) | Optimal trade-off |
| Sort + Binary Search | O(n² log n) | O(n²) | Less efficient than hash map |
| 3 loops + Hash | O(n³) | O(n) | Worse than 2+2 split |

**Recommended approach:** Hash map with 2+2 split (O(n²) time, O(n²) space)

## Common Mistakes

### Mistake 1: Using four nested loops
**Wrong:**
```python
def fourSumCount(nums1, nums2, nums3, nums4):
    count = 0
    # O(n^4) - too slow!
    for a in nums1:
        for b in nums2:
            for c in nums3:
                for d in nums4:
                    if a + b + c + d == 0:
                        count += 1
    return count
# Time Limit Exceeded for large n
```

**Correct:**
```python
def fourSumCount(nums1, nums2, nums3, nums4):
    from collections import defaultdict
    sum_map = defaultdict(int)

    # O(n^2) - compute all sums from first two arrays
    for a in nums1:
        for b in nums2:
            sum_map[a + b] += 1

    count = 0
    # O(n^2) - check complements from last two arrays
    for c in nums3:
        for d in nums4:
            count += sum_map[-(c + d)]

    return count
```

### Mistake 2: Not counting duplicates properly
**Wrong:**
```python
# Only checking if complement exists, not counting occurrences
for c in nums3:
    for d in nums4:
        if -(c + d) in sum_map:
            count += 1  # Wrong: should add the frequency
```

**Correct:**
```python
# Count all occurrences of the complement
for c in nums3:
    for d in nums4:
        count += sum_map[-(c + d)]  # Adds 0 if not found, frequency if found
```

### Mistake 3: Incorrect grouping strategy
**Wrong:**
```python
# Grouping 3 arrays together (O(n^3) space and time)
sum_map = {}
for a in nums1:
    for b in nums2:
        for c in nums3:
            sum_map[a + b + c] = sum_map.get(a + b + c, 0) + 1
# This creates O(n^3) entries and O(n^3) time
```

**Correct:**
```python
# Balanced 2+2 split for optimal O(n^2) complexity
sum_map = defaultdict(int)
for a in nums1:
    for b in nums2:
        sum_map[a + b] += 1
# Only O(n^2) entries
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Two Sum | Easy | 2 arrays instead of 4 |
| 3Sum | Medium | Find triplets in single array |
| 4Sum | Medium | Find quadruplets in single array (harder than 4Sum II) |
| K-Sum II | Hard | Generalized to k arrays |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Understood 2+2 split optimization
- [ ] Implemented with hash map
- [ ] Handled edge cases (all zeros, no solution, many solutions)
- [ ] Verified frequency counting
- [ ] Tested with custom cases
- [ ] Reviewed after 1 day
- [ ] Reviewed after 1 week
- [ ] Could explain solution to others
- [ ] Comfortable with variations

**Strategy**: See [Hash Table Pattern](../strategies/data-structures/hash-tables.md)
