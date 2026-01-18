---
id: E053
old_id: F131
slug: palindrome-partitioning
title: Palindrome Partitioning
difficulty: easy
category: easy
topics: ["string", "backtracking"]
patterns: ["backtracking", "dynamic-programming"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E052", "M131", "M647"]
prerequisites: ["backtracking", "palindrome-check", "recursion"]
strategy_ref: ../strategies/patterns/backtracking.md
---
# Palindrome Partitioning

## Problem

Given a string `s`, partition it so that **every substring** in the partition is a palindrome. Return **all possible** palindrome partitionings.

**What's a partition?** Breaking the string into consecutive pieces that cover the entire string. For example, "aab" can be partitioned as:
- ["a", "a", "b"] - three pieces
- ["aa", "b"] - two pieces
- ["a", "ab"] - NOT valid because "ab" isn't a palindrome

**Your task:** Find ALL valid ways to partition the string where each piece is a palindrome.

**Think of it as:** At each position, you choose where to make a "cut". You can only make a cut if the piece you're cutting off is a palindrome. This is a classic **backtracking** problem - explore all possible cuts, backtrack when you finish one path, try different cuts.

**Example walkthrough for "aab":**
- Try cutting after 1st char: "a" + partition("ab")
  - "ab" can be: "a", "b" → gives ["a", "a", "b"]
- Try cutting after 2nd char: "aa" + partition("b")
  - "aa" is palindrome, "b" is palindrome → gives ["aa", "b"]
- Try no cuts: "aab" is not a palindrome → skip

Result: [["a","a","b"], ["aa","b"]]

## Why This Matters

Partitioning problems appear in text processing, DNA sequence analysis, and compiler design (tokenization). This problem teaches the fundamental **backtracking** pattern: at each decision point, try all valid choices, explore each recursively, then undo your choice and try the next.

The optimization technique of precomputing palindromes (using dynamic programming) is a common interview pattern - trade space for time by caching results of expensive checks. This same pattern appears in problems involving repeated substructure checks.

## Examples

**Example 1:**
- Input: `s = "aab"`
- Output: `[["a","a","b"],["aa","b"]]`

**Example 2:**
- Input: `s = "a"`
- Output: `[["a"]]`

## Constraints

- 1 <= s.length <= 16
- s contains only lowercase English letters.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Backtracking Pattern</summary>

This is a classic backtracking problem. At each position, you need to decide where to make the next cut. Try all possible cuts that result in a palindrome, then recursively partition the remaining string. When you've partitioned the entire string, you've found one valid solution.

Think about: What are your choices at each step? What makes a choice valid?

</details>

<details>
<summary>🎯 Hint 2: Palindrome Check Optimization</summary>

You'll need to check if a substring is a palindrome many times. Two approaches:
1. **On-the-fly**: Check each substring when needed (O(n) per check)
2. **Precompute**: Use DP to build a 2D table where dp[i][j] = true if s[i:j+1] is palindrome

For a string of length n, precomputing takes O(n²) time and space but makes lookups O(1).

</details>

<details>
<summary>📝 Hint 3: Backtracking Implementation</summary>

```
function partition(s):
    result = []
    current_partition = []

    function backtrack(start_index):
        # Base case: reached end of string
        if start_index == length(s):
            result.append(copy of current_partition)
            return

        # Try all possible cuts
        for end in range(start_index, length(s)):
            substring = s[start_index:end+1]

            # If substring is palindrome, explore this choice
            if isPalindrome(substring):
                current_partition.append(substring)
                backtrack(end + 1)  # Recurse on remaining string
                current_partition.pop()  # Backtrack

    backtrack(0)
    return result
```

Optional optimization: Precompute palindrome table before backtracking.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Backtracking (naive) | O(n * 2^n) | O(n) | Check palindrome each time: O(n), 2^n partitions |
| **Backtracking + DP** | **O(n * 2^n)** | **O(n²)** | Precompute palindromes, 2^n partitions to build |
| Backtracking + memoization | O(n * 2^n) | O(n²) | Cache intermediate results |

Note: There can be exponentially many valid partitions (e.g., "aaa" has 4 partitions).

## Common Mistakes

### 1. Not using backtracking
```python
# WRONG: Trying to build all partitions iteratively
def partition(s):
    result = []
    for i in range(len(s)):
        for j in range(i+1, len(s)+1):
            if isPalindrome(s[i:j]):
                # How to combine this with other palindromes?
                # This approach gets messy quickly
    return result

# CORRECT: Use backtracking
def partition(s):
    result = []
    def backtrack(start, path):
        if start == len(s):
            result.append(path[:])
            return
        for end in range(start + 1, len(s) + 1):
            if isPalindrome(s[start:end]):
                path.append(s[start:end])
                backtrack(end, path)
                path.pop()
    backtrack(0, [])
    return result
```

### 2. Forgetting to copy the path
```python
# WRONG: Appending reference to same list
def partition(s):
    result = []
    path = []
    def backtrack(start):
        if start == len(s):
            result.append(path)  # All results point to same list!
            return
        for end in range(start + 1, len(s) + 1):
            if isPalindrome(s[start:end]):
                path.append(s[start:end])
                backtrack(end)
                path.pop()
    backtrack(0)
    return result

# CORRECT: Append a copy
def partition(s):
    result = []
    path = []
    def backtrack(start):
        if start == len(s):
            result.append(path[:])  # Or list(path)
            return
        # rest of code...
```

### 3. Inefficient palindrome checking
```python
# SUBOPTIMAL: Checking palindrome repeatedly
def partition(s):
    def isPalindrome(sub):
        return sub == sub[::-1]  # Called many times

    result = []
    def backtrack(start, path):
        if start == len(s):
            result.append(path[:])
            return
        for end in range(start + 1, len(s) + 1):
            if isPalindrome(s[start:end]):
                backtrack(end, path + [s[start:end]])
    backtrack(0, [])
    return result

# BETTER: Precompute palindromes
def partition(s):
    n = len(s)
    dp = [[False] * n for _ in range(n)]

    # Build palindrome table
    for i in range(n):
        dp[i][i] = True
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            if s[i] == s[j]:
                dp[i][j] = (length == 2) or dp[i+1][j-1]

    result = []
    def backtrack(start, path):
        if start == n:
            result.append(path[:])
            return
        for end in range(start, n):
            if dp[start][end]:  # O(1) lookup
                path.append(s[start:end+1])
                backtrack(end + 1, path)
                path.pop()
    backtrack(0, [])
    return result
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Palindrome Partitioning II | Find minimum cuts needed | DP: min_cuts[i] = min cuts for s[0:i] |
| Count palindrome partitions | Return count, not all partitions | DFS with memoization, count instead of collect |
| Longest palindrome partition | Partition with fewest/most parts | Track partition length during backtracking |
| K-partitions | Exactly k palindrome parts | Add partition count to backtracking state |
| Weighted partitions | Each palindrome has a weight | Track total weight, find max/min weight partition |

## Practice Checklist

**Correctness:**
- [ ] Handles single character (returns [["a"]])
- [ ] Handles all same characters ("aaa")
- [ ] Handles no palindrome pairs (each char separate)
- [ ] Returns all valid partitions
- [ ] No duplicate partitions in result

**Interview Readiness:**
- [ ] Can explain backtracking approach in 3 minutes
- [ ] Can code solution in 12 minutes
- [ ] Can discuss palindrome precomputation trade-off
- [ ] Can analyze time complexity correctly

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve Palindrome Partitioning II (min cuts)
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Backtracking Pattern](../../strategies/patterns/backtracking.md)
