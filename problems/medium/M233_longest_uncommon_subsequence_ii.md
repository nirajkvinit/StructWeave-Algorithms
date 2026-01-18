---
id: M233
old_id: A020
slug: longest-uncommon-subsequence-ii
title: Longest Uncommon Subsequence II
difficulty: medium
category: medium
topics: ["array", "string", "sorting"]
patterns: ["two-pointers", "subsequence-matching"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - M232_longest_uncommon_subsequence_i
  - M392_is_subsequence
  - M524_longest_word_in_dictionary_through_deleting
prerequisites:
  - E125_valid_palindrome
  - E242_valid_anagram
  - M232_longest_uncommon_subsequence_i
strategy_ref: ../strategies/patterns/string-manipulation.md
---
# Longest Uncommon Subsequence II

## Problem

Given an array of strings, find the length of the longest uncommon subsequence among all the strings. Return `-1` if no such subsequence exists.

Let's break down the key concepts: A **subsequence** is formed by deleting zero or more characters from a string while keeping the rest in order. For example, `"abc"` is a subsequence of `"aebdc"`. An **uncommon subsequence** is one that exists as a subsequence of exactly one string in the array but not as a subsequence of any other string.

Here's the interesting insight: you don't need to generate all possible subsequences (which would be exponential). Instead, focus on the complete strings themselves as candidates. Why? Because if a full string doesn't appear as a subsequence in any other string, it's automatically an uncommon subsequence and likely to be the longest.

The challenge involves two key operations: efficiently checking if one string is a subsequence of another using two-pointers, and handling duplicates properly. If a string appears multiple times in the array, none of its subsequences can be uncommon since they'll appear in both copies. Edge cases to consider: all strings identical, strings of varying lengths, and strings where shorter ones are subsequences of longer ones.

## Why This Matters

This problem builds on subsequence matching, a fundamental technique in bioinformatics (DNA sequence analysis), text diff algorithms (like git diff), and autocomplete systems. The two-pointer subsequence check is a pattern you'll use repeatedly in string problems. More importantly, this teaches you to recognize that the optimal solution often lies in examining the original data cleverly rather than generating all possibilities. The sorting optimization strategy here (checking longer candidates first for early termination) is a general technique applicable to many search problems. Understanding when a greedy approach suffices versus when you need dynamic programming is a crucial algorithmic skill.

## Examples

**Example 1:**
- Input: `strs = ["aba","cdc","eae"]`
- Output: `3`

**Example 2:**
- Input: `strs = ["aaa","aaa","aa"]`
- Output: `-1`

## Constraints

- 2 <= strs.length <= 50
- 1 <= strs[i].length <= 10
- strs[i] consists of lowercase English letters.

## Approach Hints

<details>
<summary>Hint 1: Start with the Full Strings</summary>

Here's the key insight: An uncommon subsequence must be a subsequence of at least one string but not a subsequence of any other string.

The **simplest uncommon subsequence** is a complete string that doesn't appear elsewhere AND is not a subsequence of any other string.

Strategy:
1. Check each string to see if it's uncommon
2. A string is uncommon if it's unique OR not a subsequence of any other string
3. Try longer strings first (sort by length descending)

Why try longer strings first? Because we want the **longest** uncommon subsequence!

</details>

<details>
<summary>Hint 2: Checking if String is Uncommon</summary>

For each candidate string `s`, it's uncommon if:
1. It's not a duplicate of any string with equal or greater length
2. It's not a subsequence of any other string in the array

Implementation:
```python
def isSubsequence(s, t):
    # Check if s is a subsequence of t
    i = 0
    for c in t:
        if i < len(s) and s[i] == c:
            i += 1
    return i == len(s)

# For each string s:
for other in strs:
    if s != other and isSubsequence(s, other):
        # s is a subsequence of other, not uncommon
        break
```

</details>

<details>
<summary>Hint 3: Optimization with Sorting</summary>

Sort strings by length in descending order. This way:
1. You check longer strings first
2. As soon as you find an uncommon string, it's the longest one
3. Early termination saves time

Edge case: If a string appears multiple times (duplicates), it cannot be uncommon because any of its subsequences will also be subsequences of its duplicate.

Algorithm:
```
1. Sort strs by length (descending), then alphabetically
2. For each string s:
   a. Check if s is a duplicate (appears more than once)
   b. If not, check if s is a subsequence of any other string
   c. If s is not a subsequence of any other, return len(s)
3. If no uncommon found, return -1
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (All Subsequences) | O(n × 2^m) | O(2^m) | m = max string length, too slow |
| Check Each String | O(n² × m) | O(n log n) | n = array size, m = max string length |
| Optimized with Sorting | O(n² × m + n log n) | O(n) | Sorting overhead, but early termination |

## Common Mistakes

### Mistake 1: Generating All Possible Subsequences
```python
# WRONG: Exponential time complexity
def findLUSlength(strs):
    def getAllSubseqs(s):
        result = set()
        for mask in range(1 << len(s)):
            subseq = ""
            for i in range(len(s)):
                if mask & (1 << i):
                    subseq += s[i]
            result.add(subseq)
        return result

    all_subseqs = {}
    for s in strs:
        for subseq in getAllSubseqs(s):
            all_subseqs[subseq] = all_subseqs.get(subseq, 0) + 1

    # Find longest with count == 1
    result = -1
    for subseq, count in all_subseqs.items():
        if count == 1:
            result = max(result, len(subseq))
    return result
    # O(n × 2^m) - way too slow!

# CORRECT: Just check full strings
def findLUSlength(strs):
    def isSubsequence(s, t):
        i = 0
        for c in t:
            if i < len(s) and s[i] == c:
                i += 1
        return i == len(s)

    strs.sort(key=lambda x: -len(x))

    for i, s in enumerate(strs):
        is_uncommon = True
        for j, t in enumerate(strs):
            if i != j and isSubsequence(s, t):
                is_uncommon = False
                break
        if is_uncommon:
            return len(s)

    return -1
```

### Mistake 2: Not Handling Duplicate Strings
```python
# WRONG: Doesn't account for duplicate strings
def findLUSlength(strs):
    def isSubsequence(s, t):
        i = 0
        for c in t:
            if i < len(s) and s[i] == c:
                i += 1
        return i == len(s)

    strs.sort(key=lambda x: -len(x))

    for i, s in enumerate(strs):
        found_in_other = False
        for j, t in enumerate(strs):
            if i != j and isSubsequence(s, t):  # Bug: s == t passes this!
                found_in_other = True
                break
        if not found_in_other:
            return len(s)

    return -1
    # Fails for ["aaa", "aaa"] - returns 3 instead of -1

# CORRECT: Check for duplicates explicitly
def findLUSlength(strs):
    def isSubsequence(s, t):
        i = 0
        for c in t:
            if i < len(s) and s[i] == c:
                i += 1
        return i == len(s)

    strs.sort(key=lambda x: -len(x))

    for i, s in enumerate(strs):
        is_uncommon = True
        for j, t in enumerate(strs):
            if i == j:
                continue
            if s == t or isSubsequence(s, t):  # Check duplicates!
                is_uncommon = False
                break
        if is_uncommon:
            return len(s)

    return -1
```

### Mistake 3: Wrong Subsequence Check Logic
```python
# WRONG: Incorrect subsequence checking
def findLUSlength(strs):
    def isSubsequence(s, t):
        # Wrong: checks if all chars of s are in t (ignores order!)
        return all(c in t for c in s)

    strs.sort(key=lambda x: -len(x))

    for i, s in enumerate(strs):
        is_uncommon = True
        for j, t in enumerate(strs):
            if i != j and isSubsequence(s, t):
                is_uncommon = False
                break
        if is_uncommon:
            return len(s)

    return -1
    # Fails: "abc" would be subsequence of "cba" (wrong!)

# CORRECT: Proper two-pointer subsequence check
def findLUSlength(strs):
    def isSubsequence(s, t):
        i = 0
        for c in t:
            if i < len(s) and s[i] == c:
                i += 1
        return i == len(s)

    strs.sort(key=lambda x: -len(x))

    for i, s in enumerate(strs):
        is_uncommon = True
        for j, t in enumerate(strs):
            if i != j and isSubsequence(s, t):
                is_uncommon = False
                break
        if is_uncommon:
            return len(s)

    return -1
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| Longest Uncommon Subsequence I | Only two strings (much simpler) | Easy |
| Shortest Uncommon Subsequence | Find shortest instead of longest | Medium |
| Count All Uncommon Subsequences | Count instead of finding longest | Hard |
| Longest Common Subsequence | Find common instead of uncommon | Medium |
| Is Subsequence | Check if one string is subsequence of another | Easy |

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Practice Checklist

- [ ] Solve using sorting and subsequence checking (Day 1)
- [ ] Handle edge case: all identical strings (Day 1)
- [ ] Implement efficient isSubsequence helper (Day 1)
- [ ] Compare with Longest Uncommon Subsequence I (Day 3)
- [ ] Solve related: Is Subsequence (Day 7)
- [ ] Solve without looking at notes (Day 14)
- [ ] Teach the solution to someone else (Day 30)

**Strategy**: See [String Manipulation Pattern](../strategies/patterns/string-manipulation.md)
