---
id: E198
old_id: A079
slug: longest-harmonious-subsequence
title: Longest Harmonious Subsequence
difficulty: easy
category: easy
topics: ["array", "hash-table"]
patterns: ["frequency-counting", "complement-search"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E001", "E032", "M128"]
prerequisites: ["hash-maps", "frequency-counting", "array-traversal"]
strategy_ref: ../strategies/data-structures/hash-tables.md
---
# Longest Harmonious Subsequence

## Problem

A harmonious array contains numbers where the difference between the maximum and minimum values is exactly 1. Given an integer array, find the length of the longest subsequence that forms a harmonious array.

A subsequence is formed by removing zero or more elements from the original array while keeping the remaining elements in their relative order. Importantly, you're looking for any subsequence (not necessarily contiguous) that contains only two distinct values differing by exactly 1.

For example, in `[1,3,2,2,5,2,3,7]`, the subsequence `[3,2,2,2,3]` is harmonious because it contains only values 2 and 3, which differ by 1. Its length is 5. Note that `[1,1,1,1]` has no harmonious subsequence (all values are the same), and `[1,2,3,4]` has multiple harmonious options: [1,2], [2,3], and [3,4], with the longest being length 2.

The key insight: since order doesn't matter for determining if a subsequence is harmonious, you can simply count frequencies of each number and check which adjacent value pairs exist together.

## Why This Matters

This problem introduces the frequency counting pattern with hash maps, one of the most powerful techniques for array analysis. The complement-search approach (looking for value x+1 when you see x) appears in two-sum problems, pair detection algorithms, and data deduplication. Companies building analytics platforms, recommendation engines, or fraud detection systems use similar frequency analysis to identify patterns in large datasets. The technique generalizes to finding harmonious triplets, k-length sequences, or custom distance constraints. Understanding when to use hash maps versus sorting is crucial for optimization: this problem is O(n) with a hash map but would be O(n log n) with sorting. The pattern also applies to detecting anagrams, finding mode values, and implementing histogram-based algorithms in image processing and data visualization.

## Examples

**Example 1:**
- Input: `nums = [1,3,2,2,5,2,3,7]`
- Output: `5`
- Explanation: A harmonious subsequence with maximum length is [3,2,2,2,3], which has 5 elements.

**Example 2:**
- Input: `nums = [1,2,3,4]`
- Output: `2`

**Example 3:**
- Input: `nums = [1,1,1,1]`
- Output: `0`

## Constraints

- 1 <= nums.length <= 2 * 10⁴
- -10⁹ <= nums[i] <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Understanding Harmonious Constraint
A harmonious array requires exactly two distinct values with a difference of 1:
- What happens if all elements are the same?
- What if the array has elements [1, 2, 3, 4]? Can [1,2] and [2,3] both be harmonious?

Think about what makes a subsequence harmonious: it must contain both value `x` and value `x+1`.

### Hint 2: Counting Frequencies
Instead of checking all subsequences, can you count how many times each number appears?
- If you know the count of number `n`, what other number do you need to check?
- How can a hash map help you store and retrieve counts efficiently?

For each number `x` in your frequency map, check if `x+1` exists and calculate the total length.

### Hint 3: Single Pass Optimization
Consider this approach:
- Build a frequency map in one pass through the array
- For each unique number in the map, check if its successor exists
- Sum the frequencies of adjacent pairs

What is the maximum length among all valid pairs (x, x+1)?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash Map Frequency Count | O(n) | O(n) | Single pass to build map, single pass to check pairs |
| Sorting + Sliding Window | O(n log n) | O(log n) | Sort array, then use two pointers |
| Brute Force | O(n² × n) | O(n) | Check all subsequences; impractical |

## Common Mistakes

### Mistake 1: Counting All Elements Instead of Just Pairs
```python
# Wrong: Includes elements that aren't part of harmonious subsequence
def findLHS(nums):
    freq = {}
    for num in nums:
        freq[num] = freq.get(num, 0) + 1
    return max(freq.values())  # Returns max frequency, not harmonious length
```
**Why it's wrong:** A harmonious subsequence must have BOTH `x` and `x+1`. Just finding the most frequent element doesn't satisfy this.

**Correct approach:** For each number `x`, check if `x+1` exists and sum `freq[x] + freq[x+1]`.

### Mistake 2: Forgetting to Check for Both Values
```python
# Wrong: Doesn't verify both values exist
def findLHS(nums):
    freq = {}
    for num in nums:
        freq[num] = freq.get(num, 0) + 1
    max_len = 0
    for num in freq:
        if num + 1 in freq:
            max_len = max(max_len, freq[num])  # Only counts one value!
```
**Why it's wrong:** Only counts frequency of `num`, not the sum of both `num` and `num+1`.

**Correct approach:** `max_len = max(max_len, freq[num] + freq[num+1])`.

### Mistake 3: Checking Both num+1 and num-1
```python
# Wrong: Double counts pairs
def findLHS(nums):
    freq = {}
    for num in nums:
        freq[num] = freq.get(num, 0) + 1
    max_len = 0
    for num in freq:
        if num + 1 in freq:
            max_len = max(max_len, freq[num] + freq[num+1])
        if num - 1 in freq:  # Unnecessary, causes double counting
            max_len = max(max_len, freq[num] + freq[num-1])
```
**Why it's wrong:** While this produces correct results, it's inefficient. Each pair (x, x+1) is checked twice.

**Correct approach:** Only check `num + 1` to avoid redundant calculations.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Harmonious with difference k | Find longest subsequence where max-min equals k | Medium |
| Multiple harmonious subsequences | Find all non-overlapping harmonious subsequences | Medium |
| Continuous harmonious subarray | Require elements to be contiguous in original array | Medium |
| Harmonious triplet | Find longest subsequence with exactly 3 consecutive values | Medium |
| Weighted harmonious subsequence | Each element has a weight; maximize total weight | Hard |

## Practice Checklist

Practice this problem until you can confidently complete these tasks:

- [ ] Day 1: Solve with hash map approach (20 min)
- [ ] Day 3: Implement without looking at notes (15 min)
- [ ] Day 7: Solve in one pass efficiently (10 min)
- [ ] Day 14: Explain why order doesn't matter for subsequences
- [ ] Day 30: Solve a variation (harmonious with difference k)

**Strategy**: See [Hash Table Patterns](../strategies/data-structures/hash-tables.md)
