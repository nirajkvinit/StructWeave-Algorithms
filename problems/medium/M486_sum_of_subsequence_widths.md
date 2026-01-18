---
id: M486
old_id: A358
slug: sum-of-subsequence-widths
title: Sum of Subsequence Widths
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Sum of Subsequence Widths

## Problem

Imagine you're analyzing data ranges across all possible subsets of measurements. For any sequence of numbers, we define its "width" as the difference between the largest and smallest values in that sequence.

Given an integer array `nums`, your task is to calculate the sum of widths across all possible non-empty subsequences. A subsequence is any sequence you can create by selecting elements from the array while keeping their original relative order (you can skip elements, but you cannot rearrange them). For example, from the array `[0,3,1,6,2,2,7]`, you could form the subsequence `[3,6,2,7]` by removing some elements but maintaining the order of the remaining ones.

Since the total number of subsequences can be enormous (there are 2^n - 1 non-empty subsequences for an array of size n), the answer can grow extremely large. Return your final result modulo `10⁹ + 7`.

## Why This Matters

This problem combines combinatorics, mathematical reasoning, and efficient computation under modular arithmetic. It appears in statistical analysis where you need to understand the variability across all possible data subsets, in financial modeling when calculating ranges across different portfolio combinations, or in quality control systems analyzing measurement variations. The key insight here is recognizing that direct enumeration is impossible for large inputs and finding a mathematical formula to compute the answer efficiently. This type of problem teaches you to identify patterns in combinatorial sums, apply sorting transformations that preserve essential properties, and work with modular arithmetic for large number computations. These skills are essential for algorithm optimization, competitive programming, and any domain requiring efficient analysis of exponentially many possibilities.

## Examples

**Example 1:**
- Input: `nums = [2,1,3]`
- Output: `6`
- Explanation: All subsequences: [1], [2], [3], [2,1], [2,3], [1,3], [2,1,3]. Their widths: 0, 0, 0, 1, 1, 2, 2. Total sum: 6.

**Example 2:**
- Input: `nums = [2]`
- Output: `0`

## Constraints

- 1 <= nums.length <= 10⁵
- 1 <= nums[i] <= 10⁵

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
First, sort the array. In any subsequence, the width is max - min. After sorting, for element at index i, count how many subsequences have it as max and how many have it as min. Element i is max in 2^i subsequences (any subset of elements to its left). Element i is min in 2^(n-1-i) subsequences (any subset of elements to its right). The contribution is nums[i] * (2^i - 2^(n-1-i)).
</details>

<details>
<summary>🎯 Main Approach</summary>
Sort the array. Precompute powers of 2 modulo 10^9+7 to avoid recomputation. For each index i, calculate its contribution: nums[i] appears as max in 2^i subsequences and as min in 2^(n-1-i) subsequences. Add nums[i] * 2^i to the result (positive contribution as max) and subtract nums[i] * 2^(n-1-i) (negative contribution as min). Sum all contributions with modulo.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Precompute all needed powers of 2 in a single pass: pow2[i] = (2^i) % MOD. Use this array for O(1) lookup instead of computing pow(2, i, MOD) repeatedly. Be careful with modulo arithmetic when subtracting - add MOD before taking modulo to avoid negative results: result = (result + contribution + MOD) % MOD.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(2^n * n) | O(n) | Generate all subsequences, find width of each |
| Optimal (Math + Sort) | O(n log n) | O(n) | Dominated by sorting; O(n) for calculation |

## Common Mistakes

1. **Not sorting the array first**
   ```python
   # Wrong: Order matters for width calculation
   for i in range(len(nums)):
       contribution = nums[i] * (pow(2, i) - pow(2, n-1-i))

   # Correct: Sort first to use positional contribution
   nums.sort()
   for i in range(len(nums)):
       contribution = nums[i] * (pow2[i] - pow2[n-1-i])
   ```

2. **Not handling negative modulo correctly**
   ```python
   # Wrong: Can give negative result
   result = (result + nums[i] * (pow2[i] - pow2[n-1-i])) % MOD

   # Correct: Add MOD to handle negative differences
   contribution = (nums[i] * (pow2[i] - pow2[n-1-i] + MOD)) % MOD
   result = (result + contribution) % MOD
   ```

3. **Recomputing powers of 2**
   ```python
   # Wrong: Inefficient power computation in loop
   for i in range(len(nums)):
       contribution = nums[i] * (pow(2, i, MOD) - pow(2, n-1-i, MOD))

   # Correct: Precompute all powers once
   pow2 = [1] * n
   for i in range(1, n):
       pow2[i] = (pow2[i-1] * 2) % MOD
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Longest Increasing Subsequence | Medium | Find longest, not sum of widths |
| Sum of Subarray Ranges | Medium | Contiguous subarrays instead of subsequences |
| Number of Subsequences That Satisfy Sum Condition | Medium | Count subsequences with sum constraint |
| Maximum Sum of Subsequence Ranges | Hard | Similar math but with additional constraints |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Mathematical Patterns](../../strategies/patterns/math-patterns.md)
