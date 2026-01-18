---
id: M232
old_id: A019
slug: longest-uncommon-subsequence-i
title: Longest Uncommon Subsequence I
difficulty: medium
category: medium
topics: ["string", "brain-teaser"]
patterns: ["edge-case-analysis"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - M233_longest_uncommon_subsequence_ii
  - M043_multiply_strings
  - E014_longest_common_prefix
prerequisites:
  - E125_valid_palindrome
  - E242_valid_anagram
strategy_ref: ../strategies/patterns/string-manipulation.md
---
# Longest Uncommon Subsequence I

## Problem

Given two strings `a` and `b`, find the length of the longest uncommon subsequence. If no such subsequence exists, return `-1`.

First, let's clarify what we mean by subsequence: it's any string formed by deleting zero or more characters from the original while keeping the remaining characters in their original order. For example, `"ace"` is a subsequence of `"abcde"` (delete `b` and `d`), and the complete string itself is also a valid subsequence.

Now for the twist: an **uncommon subsequence** is a subsequence of one string that is NOT a subsequence of the other string. Your goal is to find the longest such subsequence.

Here's the catch that makes this problem intriguing: it's a brain teaser disguised as a string algorithm problem. Before reaching for dynamic programming or complex pattern matching, think carefully about what it means for two strings to have or not have uncommon subsequences. Consider these cases: What if the strings are identical? What if they differ by even a single character? The answer might be simpler than you expect.

## Why This Matters

This problem is a classic example of recognizing when NOT to use complex algorithms. It teaches critical thinking about problem constraints and edge case analysis, skills that prevent overengineering in real systems. The lesson here is invaluable: sometimes the most elegant solution is also the simplest one. This appears frequently in technical interviews to test whether candidates can resist the urge to overcomplicate. Beyond the puzzle aspect, it reinforces understanding of subsequence properties, which are fundamental to longest common subsequence (LCS), edit distance, and other important string algorithms you'll encounter.

## Examples

**Example 1:**
- Input: `a = "aba", b = "cdc"`
- Output: `3`
- Explanation: The string "aba" is a valid uncommon subsequence (it's a subsequence of `a` but not `b`). Similarly, "cdc" qualifies as well.

**Example 2:**
- Input: `a = "aaa", b = "bbb"`
- Output: `3`
- Explanation: Both "aaa" and "bbb" are uncommon subsequences with length 3.

**Example 3:**
- Input: `a = "aaa", b = "aaa"`
- Output: `-1`
- Explanation: Since both strings are identical, any subsequence derivable from one is also derivable from the other.

## Constraints

- 1 <= a.length, b.length <= 100
- a and b consist of lower-case English letters.

## Approach Hints

<details>
<summary>Hint 1: Think About What "Uncommon" Really Means</summary>

An uncommon subsequence must be a subsequence of one string but NOT a subsequence of the other.

Key insight: If the two strings are **different**, can the entire first string be a subsequence of the second string? Think about it carefully...

If `a != b`, then the whole string `a` is a subsequence of itself but can it be a subsequence of `b` (which is different)?

</details>

<details>
<summary>Hint 2: The Simplest Case Analysis</summary>

Consider two cases:

**Case 1**: `a == b`
- Any subsequence of `a` is also a subsequence of `b`
- There's no uncommon subsequence
- Return `-1`

**Case 2**: `a != b`
- The entire string `a` is a subsequence of `a` (obviously)
- Can `a` (as a whole) be a subsequence of `b`? NO! Because `a != b`, and a subsequence can't have more or different characters than the original
- Similarly, `b` is a subsequence of `b` but not of `a`
- Return `max(len(a), len(b))`

Wait... is that really all there is to it?

</details>

<details>
<summary>Hint 3: Why This Isn't Overthinking</summary>

You might be tempted to use dynamic programming, LCS algorithms, or complex string matching. **Don't!**

The beauty of this problem is testing whether you can resist overcomplicating it.

The entire solution:
```python
return -1 if a == b else max(len(a), len(b))
```

Why does this work?
- If strings are equal: No uncommon subsequence exists
- If strings differ: The longer (or either, if same length) string itself is uncommon

This is a **brain teaser** disguised as an algorithm problem!

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| String Comparison | O(min(m,n)) | O(1) | Just compare strings |
| Optimal One-Liner | O(min(m,n)) | O(1) | Same as above |
| Wrong: DP/LCS | O(m×n) | O(m×n) | Massive overkill! |

## Common Mistakes

### Mistake 1: Overcomplicating with Dynamic Programming
```python
# WRONG: Way too complex for this problem!
def findLUSlength(a: str, b: str) -> int:
    m, n = len(a), len(b)
    # Building LCS table...
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i-1] == b[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    # ... then trying to compute uncommon from LCS
    # This approach doesn't even lead to the right answer easily!

# CORRECT: Simple logic
def findLUSlength(a: str, b: str) -> int:
    return -1 if a == b else max(len(a), len(b))
```

### Mistake 2: Only Checking If One is Subsequence of Other
```python
# WRONG: Misunderstanding the problem
def findLUSlength(a: str, b: str) -> int:
    def isSubsequence(s, t):
        i = 0
        for c in t:
            if i < len(s) and s[i] == c:
                i += 1
        return i == len(s)

    # This logic is incorrect for uncommon subsequence
    if isSubsequence(a, b):
        return -1
    return max(len(a), len(b))

# CORRECT: Just compare equality
def findLUSlength(a: str, b: str) -> int:
    return -1 if a == b else max(len(a), len(b))
```

### Mistake 3: Trying to Find Actual Uncommon Subsequences
```python
# WRONG: Generating and checking all subsequences
def findLUSlength(a: str, b: str) -> int:
    def getSubsequences(s):
        result = set()
        n = len(s)
        for mask in range(1 << n):
            subseq = ""
            for i in range(n):
                if mask & (1 << i):
                    subseq += s[i]
            result.add(subseq)
        return result

    subs_a = getSubsequences(a)
    subs_b = getSubsequences(b)
    uncommon = (subs_a - subs_b) | (subs_b - subs_a)
    return max(len(s) for s in uncommon) if uncommon else -1
    # Way too slow! O(2^n) time

# CORRECT: O(n) simple comparison
def findLUSlength(a: str, b: str) -> int:
    return -1 if a == b else max(len(a), len(b))
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| Longest Uncommon Subsequence II | Array of strings instead of two | Medium |
| Shortest Uncommon Subsequence | Find shortest instead of longest | Medium |
| Count Uncommon Subsequences | Count all uncommon subsequences | Hard |
| Longest Common Subsequence | Classic DP problem (opposite concept) | Medium |
| Distinct Subsequences | Count distinct subsequences | Hard |

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Practice Checklist

- [ ] Solve using simple comparison (Day 1)
- [ ] Understand why complex approaches fail (Day 1)
- [ ] Explain the logic to someone else (Day 3)
- [ ] Solve Longest Uncommon Subsequence II (Day 7)
- [ ] Compare with LCS problem to understand difference (Day 7)
- [ ] Identify other "brain teaser" algorithm problems (Day 14)
- [ ] Teach the counterintuitive solution (Day 30)

**Strategy**: See [String Manipulation Pattern](../strategies/patterns/string-manipulation.md)
