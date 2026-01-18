---
id: M474
old_id: A340
slug: length-of-longest-fibonacci-subsequence
title: Length of Longest Fibonacci Subsequence
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Length of Longest Fibonacci Subsequence

## Problem

The Fibonacci sequence (1, 1, 2, 3, 5, 8, 13, 21...) is one of nature's most famous patterns, appearing in nautilus shells, flower petals, and pine cones. In this problem, you're looking for Fibonacci-like patterns hidden within an array.

A sequence qualifies as **Fibonacci-like** when:
- It contains at least 3 elements
- Each element equals the sum of the two preceding elements: `x[i] + x[i+1] == x[i+2]`

For example, [1, 3, 4, 7, 11, 18] is Fibonacci-like because 1+3=4, 3+4=7, 4+7=11, and 7+11=18.

Given a strictly ascending array `arr` of positive integers, find the length of the longest Fibonacci-like subsequence that can be extracted from it. Return `0` if no such subsequence exists.

**Remember**: A subsequence maintains the original element order while potentially omitting some elements. For instance, [3, 5, 8] is a valid subsequence of [3, 4, 5, 6, 7, 8].

## Why This Matters

This problem is relevant to pattern recognition in time-series data analysis, where financial analysts look for growth sequences in market data, biologists identify growth patterns in population studies, and data scientists detect recurring numerical patterns in large datasets. The dynamic programming technique you'll use here applies to sequence alignment problems in computational biology (DNA sequence analysis), natural language processing (finding word patterns), and anomaly detection systems that identify expected vs unexpected numerical progressions.

## Examples

**Example 1:**
- Input: `arr = [1,2,3,4,5,6,7,8]`
- Output: `5`
- Explanation: The longest Fibonacci-like subsequence is [1,2,3,5,8], which has length 5.

**Example 2:**
- Input: `arr = [1,3,7,11,12,14,18]`
- Output: `3`
- Explanation: Multiple Fibonacci-like subsequences of length 3 exist: [1,11,12], [3,11,14], and [7,11,18].

## Constraints

- 3 <= arr.length <= 1000
- 1 <= arr[i] < arr[i + 1] <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
A Fibonacci-like subsequence is determined by its first two elements. Once you pick two starting values arr[i] and arr[j], the rest of the sequence is uniquely determined by the sum property. Use dynamic programming where dp[i][j] represents the length of the longest Fibonacci-like sequence ending with arr[i] and arr[j].
</details>

<details>
<summary>🎯 Main Approach</summary>
Create a hash map for O(1) value lookup. Use DP with state dp[i][j] = length of sequence ending at indices i and j (where i < j). For each pair (i, j), check if arr[j] - arr[i] exists before index i. If it does at index k, then dp[i][j] = dp[k][i] + 1. Otherwise, dp[i][j] = 2 (start of new sequence). Track the maximum length found that's at least 3.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a dictionary to map values to indices for O(1) lookups. The DP state can be stored as a dictionary with keys (i, j) instead of a 2D array to save space. Only compute dp values where arr[i] + arr[j] might continue a sequence, and track the maximum as you go. Time complexity: O(n^2), space: O(n^2) in worst case.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n^3 * log n) | O(1) | Try all pairs, extend greedily |
| DP with Hash Map | O(n^2) | O(n^2) | Optimal solution |

## Common Mistakes

1. **Not using hash map for lookups**
   ```python
   # Wrong: Linear search for each element
   for i in range(n):
       for j in range(i+1, n):
           target = arr[j] - arr[i]
           for k in range(i):
               if arr[k] == target:
                   # found it

   # Correct: Use hash map for O(1) lookup
   index_map = {val: idx for idx, val in enumerate(arr)}
   for i in range(n):
       for j in range(i+1, n):
           target = arr[j] - arr[i]
           if target in index_map and index_map[target] < i:
               # found it
   ```

2. **Incorrect DP transition**
   ```python
   # Wrong: Not properly extending sequences
   dp[i][j] = 2  # Always setting to 2

   # Correct: Extend from previous sequence if exists
   target = arr[j] - arr[i]
   if target in index_map:
       k = index_map[target]
       if k < i:
           dp[i][j] = dp.get((k, i), 2) + 1
       else:
           dp[i][j] = 2
   else:
       dp[i][j] = 2
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Longest Arithmetic Subsequence | Medium | Arithmetic progression instead of Fibonacci |
| Fibonacci Number | Easy | Just compute nth Fibonacci number |
| Split Array into Fibonacci Sequence | Medium | Partition string into Fibonacci sequence |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
