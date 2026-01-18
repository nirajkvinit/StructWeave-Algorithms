---
id: E179
old_id: I290
slug: non-decreasing-subsequences
title: Non-decreasing Subsequences
difficulty: easy
category: easy
topics: ["array", "backtracking", "recursion"]
patterns: ["backtracking"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - M078  # Subsets
  - M079  # Subsets II
  - M080  # Permutations
prerequisites:
  - Backtracking
  - Recursion
  - Set for deduplication
strategy_ref: ../strategies/patterns/backtracking.md
---
# Non-decreasing Subsequences

## Problem

Given an integer array, your task is to find all distinct subsequences where the elements are in non-decreasing order (each element is greater than or equal to the previous one) and the subsequence contains at least two elements. A subsequence maintains the relative order of elements from the original array but doesn't need to be contiguous.

For example, from [4,6,7,7], the subsequence [4,7] is valid (4 ≤ 7), as is [6,7,7] (6 ≤ 7 ≤ 7). However, [7,6] would not be valid since 7 > 6. The crucial constraint here is that you cannot sort the input array - subsequences must respect the original ordering. This is different from finding increasing subsequences in a sorted array.

The challenge is handling duplicates in the result. For instance, if the array contains duplicate values like two 7's, you might generate the same subsequence [4,7] from both 7's. You need a strategy to avoid counting the same subsequence multiple times while still generating all unique possibilities.

## Why This Matters

This problem teaches backtracking with level-wise deduplication, a powerful technique for generating combinations while avoiding duplicates without sorting. This pattern appears in many real-world scenarios: finding valid configuration combinations in systems with ordering constraints, generating test cases where later steps depend on earlier ones, or discovering patterns in time-series data where temporal order matters. The specific deduplication strategy - using a local set at each recursion level rather than global deduplication - is particularly elegant and appears in constraint-satisfaction problems, game state exploration, and anywhere you need to prune duplicate branches in a decision tree without altering the input structure.

## Examples

**Example 1:**
- Input: `nums = [4,6,7,7]`
- Output: `[[4,6],[4,6,7],[4,6,7,7],[4,7],[4,7,7],[6,7],[6,7,7],[7,7]]`
- Explanation: All unique subsequences with length at least 2 where each element is greater than or equal to the previous element.

**Example 2:**
- Input: `nums = [4,4,3,2,1]`
- Output: `[[4,4]]`
- Explanation: The only non-decreasing subsequence with at least 2 elements is [4,4].

## Constraints

- 1 <= nums.length <= 15
- -100 <= nums[i] <= 100

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Hint
Use backtracking to generate all possible subsequences. For each element, decide whether to include it in the current subsequence. Only add it if it maintains the non-decreasing property. Use a set to track and avoid duplicate subsequences. Remember to only return subsequences with at least 2 elements.

### Intermediate Hint
Implement a recursive backtracking function that explores two choices at each index: include or skip the current element. When including, verify that it's >= the last element in current subsequence. To handle duplicates, use a set at each recursion level to track which values have been used at that position.

### Advanced Hint
Use backtracking with local deduplication. At each recursion level, maintain a set of used values to avoid processing the same value twice at that level. The key insight: instead of global deduplication (which would require sorting), use level-wise deduplication to prevent duplicate branches. This preserves the original array order while eliminating duplicates.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (All Subsequences) | O(2^n * n) | O(2^n * n) | Generate all, filter valid ones |
| Backtracking with Global Set | O(2^n * n) | O(2^n * n) | Use set to store unique subsequences |
| Backtracking with Local Set | O(2^n) | O(n * 2^n) | Deduplicate at each level |
| Optimal (Level-wise Pruning) | O(2^n) | O(n) | Recursion depth, minimal extra space |

## Common Mistakes

### Mistake 1: Sorting the array first
```python
# Wrong: Sorting destroys the subsequence property
def findSubsequences(nums):
    nums.sort()  # WRONG! Subsequences must maintain original order
    result = []
    # ... backtracking logic
    return result
```

**Issue**: Sorting changes the relative positions of elements. A subsequence must preserve the original order from the input array.

**Fix**: Never sort the input. Work with the array as-is and use the original indices.

### Mistake 2: Global deduplication without proper key
```python
# Wrong: Using list as set element
def findSubsequences(nums):
    result = set()
    def backtrack(start, path):
        if len(path) >= 2:
            result.add(path)  # Lists aren't hashable!
        # ... rest of logic
```

**Issue**: Lists can't be added to sets because they're not hashable.

**Fix**: Convert to tuple when adding to set: `result.add(tuple(path))` or use a list and manual duplicate checking.

### Mistake 3: Not pruning duplicate values at same level
```python
# Wrong: Processing same value multiple times at same recursion level
def findSubsequences(nums):
    result = []
    def backtrack(start, path):
        if len(path) >= 2:
            result.append(path[:])
        for i in range(start, len(nums)):
            if not path or nums[i] >= path[-1]:
                # Missing: check if nums[i] was already used at this level
                backtrack(i + 1, path + [nums[i]])
```

**Issue**: When array has duplicates like [4, 6, 7, 7], both 7's at the same level create duplicate subsequences.

**Fix**: Use a set to track used values at each recursion level: `used = set()` and `if nums[i] in used: continue`.

## Variations

| Variation | Difficulty | Description |
|-----------|----------|-------------|
| Increasing Subsequences | Medium | Find only strictly increasing subsequences (no equal elements) |
| Longest Increasing Subsequence | Medium | Find the length of the longest increasing subsequence |
| Non-decreasing Subarrays | Easy | Find contiguous non-decreasing subarrays instead of subsequences |
| Count Non-decreasing Subsequences | Medium | Count instead of enumerate all subsequences |
| K-length Non-decreasing Subsequences | Medium | Find all non-decreasing subsequences of exactly length K |

## Practice Checklist

Track your progress on this problem:

**First Attempt**
- [ ] Solved independently (30 min time limit)
- [ ] Implemented backtracking solution
- [ ] All test cases passing
- [ ] Analyzed time and space complexity

**Spaced Repetition**
- [ ] Day 1: Resolve from memory
- [ ] Day 3: Solve with level-wise deduplication
- [ ] Week 1: Implement without hints
- [ ] Week 2: Solve Subsets II variation
- [ ] Month 1: Teach backtracking pattern to someone else

**Mastery Goals**
- [ ] Can explain why sorting doesn't work
- [ ] Can handle edge cases (all same, all decreasing, duplicates)
- [ ] Can optimize deduplication strategy
- [ ] Can solve in under 25 minutes

**Strategy**: See [Backtracking Patterns](../strategies/patterns/backtracking.md)
