---
id: M511
old_id: A390
slug: 3sum-with-multiplicity
title: 3Sum With Multiplicity
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# 3Sum With Multiplicity

## Problem

Imagine you're analyzing transaction data at a financial tech company, and you need to identify all combinations of three transaction amounts that sum to a specific target value. The twist? Multiple transactions can have identical amounts, and you need to count every possible way to select three positions (not just three unique values).

Given an integer array `arr` and a target value `target`, count how many index triplets `(i, j, k)` exist where `i < j < k` and the sum `arr[i] + arr[j] + arr[k]` equals the `target`.

The key challenge: duplicate values create multiple ways to form the same sum. For example, if you have `[1,1,2,2]` and target `4`, the triplet values `(1,1,2)` can be formed in several different ways by choosing different positions.

Since the count may be astronomically large, return the answer **modulo** `10⁹ + 7`.

## Why This Matters

This problem mirrors real-world scenarios in data analysis, inventory management, and pattern recognition. Financial analysts use similar techniques to detect transaction patterns, e-commerce platforms analyze shopping cart combinations for recommendations, and security systems identify suspicious activity patterns. The combinatorial counting aspect is crucial for understanding how to efficiently handle datasets with duplicate values—a common challenge when working with real-world data where repetition is the norm, not the exception. Mastering this teaches you to think beyond individual elements and consider frequency distributions, a fundamental skill for database optimization and statistical analysis.

## Examples

**Example 1:**
- Input: `arr = [1,1,2,2,3,3,4,4,5,5], target = 8`
- Output: `20
**Explanation: **
Enumerating by the values (arr[i], arr[j], arr[k]):
(1, 2, 5) occurs 8 times;
(1, 3, 4) occurs 8 times;
(2, 2, 4) occurs 2 times;
(2, 3, 3) occurs 2 times.`

**Example 2:**
- Input: `arr = [1,1,2,2,2,2], target = 5`
- Output: `12
**Explanation: **
arr[i] = 1, arr[j] = arr[k] = 2 occurs 12 times:
We choose one 1 from [1,1] in 2 ways,
and two 2s from [2,2,2,2] in 6 ways.`

**Example 3:**
- Input: `arr = [2,1,3], target = 6`
- Output: `1`
- Explanation: (1, 2, 3) occured one time in the array so we return 1.

## Constraints

- 3 <= arr.length <= 3000
- 0 <= arr[i] <= 100
- 0 <= target <= 300

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Instead of thinking about indices, think about values. Count the frequency of each number, then iterate through unique value combinations (i, j, k) where i + j + k = target. Use combinatorics to calculate how many ways to pick indices for each value combination.
</details>

<details>
<summary>🎯 Main Approach</summary>
Build a frequency map of all values. For each unique triplet of values (considering cases where all three are same, two are same, or all different), calculate combinations using the formula: C(count[i], x) * C(count[j], y) * C(count[k], z) where x+y+z depends on how many of each value you need.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Handle three cases separately: (1) all three values same (i==j==k), use C(count, 3); (2) two values same (i==j!=k), use C(count[i], 2) * count[k]; (3) all different, use count[i] * count[j] * count[k]. This avoids duplicate counting.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n³) | O(1) | Check all triplets, too slow |
| Hash Map + Combinatorics | O(n + m³) | O(m) | m = unique values (max 101), much faster |
| Optimal | O(n + m³) | O(m) | Count frequencies then iterate unique triplets |

## Common Mistakes

1. **Forgetting to apply modulo**
   ```python
   # Wrong: Integer overflow without modulo
   def threeSumMulti(self, arr, target):
       count = collections.Counter(arr)
       result = 0
       for i in count:
           for j in count:
               k = target - i - j
               if k in count:
                   if i == j == k:
                       result += count[i] * (count[i] - 1) * (count[i] - 2) // 6
       return result  # Missing: % (10**9 + 7)

   # Correct: Apply modulo to final result
   def threeSumMulti(self, arr, target):
       MOD = 10**9 + 7
       count = collections.Counter(arr)
       result = 0
       for i in count:
           for j in count:
               k = target - i - j
               if k in count:
                   if i == j == k:
                       result += count[i] * (count[i] - 1) * (count[i] - 2) // 6
       return result % MOD
   ```

2. **Not handling duplicate triplets correctly**
   ```python
   # Wrong: Counts same triplet multiple times
   def threeSumMulti(self, arr, target):
       count = collections.Counter(arr)
       result = 0
       for i in count:
           for j in count:
               k = target - i - j
               if k in count:
                   result += count[i] * count[j] * count[k]  # Bug: duplicates
       return result % (10**9 + 7)

   # Correct: Handle i==j, j==k, i==k cases
   def threeSumMulti(self, arr, target):
       MOD = 10**9 + 7
       count = collections.Counter(arr)
       result = 0
       for i in count:
           for j in count:
               k = target - i - j
               if k in count:
                   if i == j == k:
                       result += count[i] * (count[i]-1) * (count[i]-2) // 6
                   elif i == j and j != k:
                       result += count[i] * (count[i]-1) // 2 * count[k]
                   elif i < j < k:  # Avoid duplicates
                       result += count[i] * count[j] * count[k]
       return result % MOD
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Two Sum | Easy | Only two numbers instead of three |
| 3Sum | Medium | Find unique triplets, no frequency counting |
| 4Sum | Medium | Four numbers instead of three |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Table](../../strategies/data-structures/hash-table.md)
