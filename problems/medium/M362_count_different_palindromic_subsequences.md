---
id: M362
old_id: A197
slug: count-different-palindromic-subsequences
title: Count Different Palindromic Subsequences
difficulty: medium
category: medium
topics: ["string", "dynamic-programming"]
patterns: ["dp-interval"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E125", "M005", "M516"]
prerequisites: ["dynamic-programming", "subsequence", "palindrome"]
---
# Count Different Palindromic Subsequences

## Problem

Given a string `s`, count how many different palindromic subsequences you can form from it. Since the answer can be enormous, return it **modulo** `10⁹ + 7`.

Let's clarify the key concepts. A **subsequence** is formed by deleting zero or more characters from the original string while keeping the remaining characters in their original order. For example, from "abc", the subsequences include "a", "b", "c", "ab", "ac", "bc", and "abc". Notice that "ba" is not a valid subsequence because 'b' comes after 'a' in the original string.

A **palindrome** reads the same forwards and backwards, like "aba" or "racecar". Single characters like "a" are also palindromes.

The word **distinct** means we count each unique palindrome only once, regardless of how many ways it can be formed. For instance, in the string "aaa", the subsequence "aa" can be formed in three different ways (positions 0-1, 0-2, 1-2), but we count it only once.

The constraint that `s` contains only characters 'a', 'b', 'c', and 'd' is intentional: it limits the alphabet but creates many duplicate characters, making the counting problem non-trivial. You can't just enumerate all possibilities because with a string of length 1000, there could be up to 2^1000 subsequences.

## Why This Matters

This problem teaches interval dynamic programming, a powerful technique for problems involving contiguous subranges of sequences. The pattern of building solutions for larger ranges from smaller ranges appears in RNA structure prediction, optimal matrix chain multiplication, and parsing algorithms.

Counting distinct structures while avoiding double-counting is a fundamental algorithmic challenge. You'll encounter similar problems in combinatorics, computational biology, and string algorithms. The modular arithmetic requirement also introduces you to handling large numbers in competitive programming and cryptography.

Understanding how to efficiently count palindromic patterns has applications in DNA sequence analysis, where palindromic sequences indicate important biological structures.

## Examples

**Example 1:**
- Input: `s = "bccb"`
- Output: `6`
- Explanation: Six distinct palindromic subsequences exist: 'b', 'c', 'bb', 'cc', 'bcb', 'bccb'. Each unique subsequence is counted once regardless of how many ways it can be formed.

**Example 2:**
- Input: `s = "abcdabcdabcdabcdabcdabcdabcdabcddcbadcbadcbadcbadcbadcbadcbadcba"`
- Output: `104860361`
- Explanation: The total count of distinct palindromic subsequences is 3104860382, which equals 104860361 when taken modulo 10⁹ + 7.

## Constraints

- 1 <= s.length <= 1000
- s[i] is either 'a', 'b', 'c', or 'd'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Interval DP Structure</summary>

Use interval dynamic programming where `dp[i][j]` represents the count of distinct palindromic subsequences in substring `s[i...j]`.

Base cases:
- Single character: `dp[i][i] = 1` (the character itself is a palindrome)
- Empty or invalid ranges: `dp[i][j] = 0` when `i > j`

Think about how to build larger intervals from smaller ones.

</details>

<details>
<summary>Hint 2: Character-by-Character Analysis</summary>

For a substring `s[i...j]`, consider the characters at the boundaries:

If `s[i] == s[j]`:
- All palindromes from `s[i+1...j-1]` are still valid
- Each palindrome from `s[i+1...j-1]` can be wrapped with `s[i]` and `s[j]` to form new palindromes
- The character `s[i]` itself forms a palindrome
- Need to avoid double-counting: check for duplicate occurrences of `s[i]` within `s[i+1...j-1]`

If `s[i] != s[j]`:
- Combine palindromes from `s[i...j-1]` and `s[i+1...j]`
- Subtract palindromes from `s[i+1...j-1]` (to avoid double-counting)

</details>

<details>
<summary>Hint 3: Handling Duplicates</summary>

Since the string only contains 4 characters ('a', 'b', 'c', 'd'), duplicates are common.

When `s[i] == s[j] == ch`:
1. Find the leftmost occurrence of `ch` in `s[i+1...j-1]` (call it `left`)
2. Find the rightmost occurrence of `ch` in `s[i+1...j-1]` (call it `right`)
3. Adjust the count based on these positions to avoid counting the same subsequence multiple times

Use precomputation or memoization to track character positions efficiently.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Interval DP (basic) | O(n³) | O(n²) | For each interval, scan for duplicates takes O(n) |
| Interval DP (optimized) | O(n²) | O(n²) | Precompute next/prev character positions |
| Memoized recursion | O(n²) | O(n²) | Recursion with memoization, similar to DP |

Where n is the length of the string.

## Common Mistakes

**Mistake 1: Not handling duplicates**
```python
# Wrong - counts duplicate subsequences
def count_palindromes(s, i, j):
    if i > j:
        return 0
    if i == j:
        return 1

    if s[i] == s[j]:
        return 2 * count_palindromes(s, i+1, j-1) + 2
    # This double-counts when s[i] appears in s[i+1...j-1]

# Correct - check for duplicates in the middle
# Adjust count based on leftmost and rightmost occurrences
```

**Mistake 2: Forgetting modulo operation**
```python
# Wrong - may overflow for large strings
dp[i][j] = dp[i+1][j-1] + dp[i][j-1] + dp[i+1][j]

# Correct - apply modulo at each step
MOD = 10**9 + 7
dp[i][j] = (dp[i+1][j-1] + dp[i][j-1] + dp[i+1][j]) % MOD
```

**Mistake 3: Incorrect base case initialization**
```python
# Wrong - doesn't initialize single characters
dp = [[0] * n for _ in range(n)]
# Missing: dp[i][i] = 1

# Correct - initialize diagonal
dp = [[0] * n for _ in range(n)]
for i in range(n):
    dp[i][i] = 1
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| Longest Palindromic Subsequence | Find length of longest palindrome, not count | Medium |
| Palindromic Substrings | Count palindromic substrings (consecutive) | Medium |
| Count Palindrome Permutations | Count strings that can be rearranged to palindrome | Easy |
| Distinct Subsequences | Count distinct subsequences (not necessarily palindromes) | Hard |

## Practice Checklist

- [ ] Solve with interval DP approach
- [ ] Test with all same characters: "aaaa"
- [ ] Test with no repeating characters: "abcd"
- [ ] Implement duplicate handling correctly
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Verify modulo operation is applied consistently
- [ ] Optimize with precomputed character positions
- [ ] Explain why interval DP is suitable for this problem
