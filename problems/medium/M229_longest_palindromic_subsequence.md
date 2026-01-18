---
id: M229
old_id: A014
slug: longest-palindromic-subsequence
title: Longest Palindromic Subsequence
difficulty: medium
category: medium
topics: ["string", "dynamic-programming"]
patterns: ["dp-2d", "string-matching"]
estimated_time_minutes: 30
frequency: high
related_problems:
  - M005_longest_palindromic_substring
  - M072_edit_distance
  - M516_longest_common_subsequence
prerequisites:
  - E053_maximum_subarray
  - M139_word_break
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Longest Palindromic Subsequence

## Problem

Given a string `s`, find the length of the longest subsequence that forms a palindrome. A subsequence is formed by deleting zero or more characters from the string while maintaining the relative order of remaining characters. Unlike a substring, the characters don't need to be contiguous.

For example, in the string "bbbab", possible subsequences include "b", "bb", "bbb", "bbbb", "ba", "bab", etc. Among these, "bbbb" is the longest palindrome with length 4. Note that "abbb" is not a valid subsequence because it changes the relative order.

This is a classic dynamic programming problem with multiple solution approaches:

1. **Reverse and LCS**: A palindrome reads the same forwards and backwards. The longest palindromic subsequence of string `s` equals the longest common subsequence between `s` and its reverse `s_reverse`.

2. **Range DP**: Build a 2D table where `dp[i][j]` represents the longest palindrome in substring from index `i` to `j`. If characters at `i` and `j` match, they can be part of the palindrome: `dp[i][j] = dp[i+1][j-1] + 2`. If they don't match, take the max of excluding either end: `dp[i][j] = max(dp[i+1][j], dp[i][j-1])`.

3. **Space-optimized 1D DP**: Since each row only depends on the previous row, you can reduce space from O(n²) to O(n) using a rolling array technique.

The key insight is recognizing overlapping subproblems: finding the longest palindrome in a range often depends on finding palindromes in smaller ranges.


## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking and introduces important dynamic programming concepts used in bioinformatics (DNA sequence analysis) and text comparison algorithms. The longest palindromic subsequence pattern appears in genetic sequence alignment (finding conserved palindromic regions in DNA), data compression (identifying reversible patterns), text diff algorithms (finding common reversible patterns), and even in compiler optimization (detecting palindromic code patterns for optimization). Understanding the relationship between a problem and longest common subsequence (LCS) is a valuable problem-solving skill—many string problems can be reduced to LCS variants. This problem also builds intuition for interval DP, where you solve problems by considering ranges of the input.

## Examples

**Example 1:**
- Input: `s = "bbbab"`
- Output: `4`
- Explanation: A valid palindromic subsequence of maximum length is "bbbb".

**Example 2:**
- Input: `s = "cbbd"`
- Output: `2`
- Explanation: A valid palindromic subsequence of maximum length is "bb".

## Constraints

- 1 <= s.length <= 1000
- s consists only of lowercase English letters.

## Approach Hints

<details>
<summary>Hint 1: Reverse and Compare</summary>

Consider this insight: A palindrome reads the same forwards and backwards. What if you reverse the string `s` to get `s_rev`?

The longest palindromic subsequence of `s` is equivalent to the **longest common subsequence (LCS)** between `s` and `s_rev`.

For example, if `s = "bbbab"`, then `s_rev = "babbb"`. The LCS is "bbbb" with length 4.

This reduces the problem to a classic LCS problem you may already know!

</details>

<details>
<summary>Hint 2: Two-Pointer DP Table</summary>

Think about building a 2D DP table where `dp[i][j]` represents the length of the longest palindromic subsequence in the substring from index `i` to `j`.

Base cases:
- Single character: `dp[i][i] = 1`

Recurrence:
- If `s[i] == s[j]`: These characters can be part of a palindrome, so `dp[i][j] = dp[i+1][j-1] + 2`
- If `s[i] != s[j]`: Take the maximum of excluding either character: `dp[i][j] = max(dp[i+1][j], dp[i][j-1])`

Fill the table diagonally from bottom-right to top-left.

</details>

<details>
<summary>Hint 3: Space-Optimized 1D DP</summary>

Notice that when computing `dp[i][j]`, you only need values from the previous row (`dp[i+1][...]`) and the current row up to position `j-1`.

You can optimize space to O(n) by using a rolling array technique. Keep track of the previous diagonal value separately since `dp[i+1][j-1]` is needed when `s[i] == s[j]`.

This brings space complexity down from O(n²) to O(n) while maintaining O(n²) time.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| LCS with Reverse | O(n²) | O(n²) | Standard LCS DP table |
| 2D DP (Range-based) | O(n²) | O(n²) | Direct palindrome DP |
| 1D DP (Optimized) | O(n²) | O(n) | Space-optimized version |
| Recursion + Memoization | O(n²) | O(n²) | Easier to understand, same complexity |

## Common Mistakes

### Mistake 1: Confusing Subsequence with Substring
```python
# WRONG: This finds longest palindromic SUBSTRING, not SUBSEQUENCE
def longestPalindromeSubseq(s):
    n = len(s)
    max_len = 1
    for i in range(n):
        for j in range(i+1, n+1):
            substr = s[i:j]
            if substr == substr[::-1]:
                max_len = max(max_len, len(substr))
    return max_len

# CORRECT: DP for subsequence (can skip characters)
def longestPalindromeSubseq(s):
    n = len(s)
    dp = [[0] * n for _ in range(n)]

    for i in range(n):
        dp[i][i] = 1

    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            if s[i] == s[j]:
                dp[i][j] = dp[i+1][j-1] + 2
            else:
                dp[i][j] = max(dp[i+1][j], dp[i][j-1])

    return dp[0][n-1]
```

### Mistake 2: Wrong DP Table Fill Order
```python
# WRONG: Filling table in wrong order (top to bottom)
def longestPalindromeSubseq(s):
    n = len(s)
    dp = [[0] * n for _ in range(n)]

    for i in range(n):
        dp[i][i] = 1

    for i in range(n):  # Wrong: top to bottom
        for j in range(i+1, n):
            if s[i] == s[j]:
                dp[i][j] = dp[i+1][j-1] + 2  # dp[i+1][j-1] not computed yet!
            else:
                dp[i][j] = max(dp[i+1][j], dp[i][j-1])

    return dp[0][n-1]

# CORRECT: Fill by increasing substring length
def longestPalindromeSubseq(s):
    n = len(s)
    dp = [[0] * n for _ in range(n)]

    for i in range(n):
        dp[i][i] = 1

    for length in range(2, n + 1):  # Correct: by length
        for i in range(n - length + 1):
            j = i + length - 1
            if s[i] == s[j]:
                dp[i][j] = dp[i+1][j-1] + 2
            else:
                dp[i][j] = max(dp[i+1][j], dp[i][j-1])

    return dp[0][n-1]
```

### Mistake 3: Off-by-One in Base Case
```python
# WRONG: Missing initialization for adjacent characters
def longestPalindromeSubseq(s):
    n = len(s)
    dp = [[0] * n for _ in range(n)]

    for i in range(n):
        dp[i][i] = 1
    # Missing: dp[i][i+1] initialization

    for length in range(3, n + 1):  # Starts at 3, skips length 2!
        for i in range(n - length + 1):
            j = i + length - 1
            if s[i] == s[j]:
                dp[i][j] = dp[i+1][j-1] + 2
            else:
                dp[i][j] = max(dp[i+1][j], dp[i][j-1])

    return dp[0][n-1]

# CORRECT: Handle all lengths including 2
def longestPalindromeSubseq(s):
    n = len(s)
    dp = [[0] * n for _ in range(n)]

    for i in range(n):
        dp[i][i] = 1

    for length in range(2, n + 1):  # Starts at 2
        for i in range(n - length + 1):
            j = i + length - 1
            if s[i] == s[j]:
                dp[i][j] = dp[i+1][j-1] + 2
            else:
                dp[i][j] = max(dp[i+1][j], dp[i][j-1])

    return dp[0][n-1]
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| Longest Palindromic Substring | Must be contiguous characters | Medium |
| Count Palindromic Subsequences | Count all palindromic subsequences | Hard |
| Minimum Deletions to Make Palindrome | Find min deletions: `n - LPS(s)` | Medium |
| Palindrome Partitioning | Partition string into palindromic substrings | Medium |
| Distinct Palindromic Subsequences | Count distinct palindromic subsequences | Hard |

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Practice Checklist

- [ ] Solve using LCS approach with reversed string (Day 1)
- [ ] Solve using 2D DP range-based approach (Day 1)
- [ ] Implement space-optimized 1D DP version (Day 3)
- [ ] Compare all three approaches and complexities (Day 3)
- [ ] Solve related: Minimum Deletions to Make Palindrome (Day 7)
- [ ] Solve without looking at notes (Day 14)
- [ ] Teach the solution to someone else (Day 30)

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
