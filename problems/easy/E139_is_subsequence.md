---
id: E139
old_id: I191
slug: is-subsequence
title: Is Subsequence
difficulty: easy
category: easy
topics: ["string", "two-pointers"]
patterns: ["two-pointers", "greedy"]
estimated_time_minutes: 15
frequency: high
related_problems:
  - M392
  - M792
  - H115
prerequisites:
  - two-pointer technique
  - string traversal
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Is Subsequence

## Problem

Given two strings `s` and `t`, determine whether `s` is a **subsequence** of `t`. Return `true` if `s` can be formed from `t`, otherwise return `false`.

A **subsequence** is created by deleting zero or more characters from a string while preserving the relative order of the remaining characters. The key word here is "order" - characters from `s` must appear in `t` in the same sequence, though they don't need to be consecutive.

For example, `"ace"` is a valid subsequence of `"abcde"` because the letters a, c, and e appear in that order (with b and d in between). However, `"aec"` is not a subsequence of `"abcde"` because the letters are out of order - in the original string, 'c' comes before 'e', not after.

Edge cases to consider: An empty string is a valid subsequence of any string. If `s` is longer than `t`, it cannot possibly be a subsequence. All characters of `s` must exist in `t` in the correct order, but `t` can have extra characters that aren't used.

This problem has an interesting follow-up: if you need to check billions of different strings `s` against the same large string `t`, how would you optimize your solution?

## Why This Matters

Subsequence matching is fundamental to many applications: version control systems (finding changes between file versions), DNA sequence analysis (finding gene patterns), natural language processing (identifying word patterns in text), and command-line fuzzy matching (how your IDE suggests files as you type).

This problem teaches the two-pointer greedy approach, one of the most versatile patterns in string algorithms. The greedy strategy works here because we can always safely match the first available character without needing to backtrack. Understanding when greedy algorithms work (versus when you need dynamic programming) is a crucial algorithmic skill.

For the follow-up scenario with multiple queries, this problem introduces preprocessing with binary search on indices, demonstrating how upfront work can optimize repeated operations - a common trade-off in system design.

## Examples

**Example 1:**
- Input: `s = "abc", t = "ahbgdc"`
- Output: `true`
- Explanation: All characters of s appear in t in the correct order.

**Example 2:**
- Input: `s = "axc", t = "ahbgdc"`
- Output: `false`
- Explanation: The character 'x' is not present in t.

## Constraints

- 0 <= s.length <= 100
- 0 <= t.length <= 10⁴
- s and t consist only of lowercase English letters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Tier 1 Hint - Core Concept
Think about using two pointers, one for each string. Since we need to maintain the order of characters in `s`, we can greedily match characters: scan through `t` looking for the first occurrence of each character from `s` in sequence. If we successfully match all characters in `s`, it's a subsequence.

### Tier 2 Hint - Implementation Details
Use two pointers: `i` for string `s` and `j` for string `t`. Start both at 0. Iterate through `t` with pointer `j`. When `s[i] == t[j]`, increment both pointers. Otherwise, only increment `j`. If `i` reaches the length of `s`, all characters are matched and we return `true`. If `j` reaches the end of `t` first, return `false`.

### Tier 3 Hint - Optimization Strategy
The two-pointer greedy approach is optimal: O(n) time where n = len(t), O(1) space. For the follow-up (many queries of different `s` against the same `t`), preprocess `t`: build a hash map where each character maps to a sorted list of its positions. Then for each query, use binary search to find the next valid position for each character. This optimizes repeated queries from O(q*n) to O(q*m*log(n)) where q=queries, m=avg len(s).

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (recursive) | O(2^n) | O(n) | Try all subsequences of `t` |
| Two Pointers (greedy) | O(n) | O(1) | n = len(t), single pass |
| Binary Search (preprocess) | O(n + q*m*log n) | O(n) | For q queries, m = avg len(s) |
| DP Table | O(n*m) | O(n*m) | Unnecessary for this problem |

## Common Mistakes

### Mistake 1: Not handling empty strings
```python
# Incomplete - crashes on empty s
def isSubsequence(s, t):
    i = 0
    for j in range(len(t)):
        if s[i] == t[j]:  # IndexError if s is empty
            i += 1
    return i == len(s)
```

**Why it's wrong:** If `s` is empty, `s[i]` causes an index error. Empty string is a valid subsequence.

**Fix:** Check `i < len(s)` before accessing `s[i]`.

### Mistake 2: Incorrect pointer advancement
```python
# Wrong - advances both pointers always
def isSubsequence(s, t):
    i = j = 0
    while i < len(s) and j < len(t):
        if s[i] == t[j]:
            i += 1
        j += 1  # This is correct
        i += 1  # WRONG - should only increment on match
    return i == len(s)
```

**Why it's wrong:** Advancing `i` unconditionally skips characters in `s`.

**Fix:** Only increment `i` when characters match.

### Mistake 3: Reversing or modifying strings
```python
# Wrong - doesn't respect order requirement
def isSubsequence(s, t):
    s_set = set(s)
    t_set = set(t)
    return s_set.issubset(t_set)  # Only checks presence, not order!
```

**Why it's wrong:** Subsequence requires maintaining order. This only checks if characters exist.

**Fix:** Use two-pointer approach to maintain order.

## Variations

| Variation | Difference | Difficulty Δ |
|-----------|-----------|-------------|
| Count subsequences | Count how many times `s` appears in `t` | +1 |
| Longest common subsequence | Find longest subsequence in both strings | +1 |
| Minimum deletions | Min chars to delete from `t` to get `s` | 0 |
| Multiple subsequence queries | Preprocess `t` for many `s` queries | +1 |
| Is supersequence | Check if `s` contains `t` as subsequence | 0 |
| Shortest supersequence | Find shortest string containing both | +2 |

## Practice Checklist

Track your progress on this problem:

- [ ] Solved using two-pointer approach
- [ ] Handled edge cases (empty strings)
- [ ] Implemented binary search version for multiple queries
- [ ] After 1 day: Solved from memory in one attempt
- [ ] After 1 week: Solved in < 5 minutes
- [ ] Explained greedy matching strategy to someone

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
