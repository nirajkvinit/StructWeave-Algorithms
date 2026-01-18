---
id: E056
old_id: F139
slug: word-break
title: Word Break
difficulty: easy
category: easy
topics: ["string", "dynamic-programming"]
patterns: ["dynamic-programming"]
estimated_time_minutes: 15
frequency: high
related_problems: ["M139", "H140", "E058"]
prerequisites: ["hash-set", "dynamic-programming"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Word Break

## Problem

Given a string and a dictionary of words, determine if the string can be completely segmented into a space-separated sequence of one or more dictionary words.

You are allowed to reuse dictionary words multiple times. For example, if your dictionary contains "apple", you can use it to match "apple" in "appleapple" twice.

The key challenge is recognizing when a substring match leads to a complete solution. Consider "catsandog" with dictionary ["cats","dog","sand","and","cat"]. While "cats" matches the beginning and individual parts exist in the dictionary, there's no way to segment the entire string.

**Watch out for:**
- You must use the entire string. Partial matches don't count.
- Words can be reused unlimited times.
- The order of words in the dictionary doesn't affect the result.

Think about this as building up knowledge: if you know certain positions in the string can be successfully segmented, can you use that information to determine if longer substrings can be segmented?

## Why This Matters

This problem demonstrates dynamic programming on strings, a pattern used in:
- Text editors with autocomplete (checking if typed text forms valid words)
- Natural language processing (tokenization and text parsing)
- Spell checkers and grammar validators
- URL routing in web frameworks (matching paths to handler patterns)

The technique of building solutions from smaller subproblems is foundational to understanding edit distance, longest common subsequence, and many string matching algorithms used in bioinformatics and data compression.

## Examples

**Example 1:**
- Input: `s = "algoprac", wordDict = ["algo","prac"]`
- Output: `true`
- Explanation: Return true because "algoprac" can be segmented as "algo prac".

**Example 2:**
- Input: `s = "applepenapple", wordDict = ["apple","pen"]`
- Output: `true`
- Explanation: Return true because "applepenapple" can be segmented as "apple pen apple".
Note that you are allowed to reuse a dictionary word.

**Example 3:**
- Input: `s = "catsandog", wordDict = ["cats","dog","sand","and","cat"]`
- Output: `false`

## Constraints

- 1 <= s.length <= 300
- 1 <= wordDict.length <= 1000
- 1 <= wordDict[i].length <= 20
- s and wordDict[i] consist of only lowercase English letters.
- All the strings of wordDict are **unique**.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Breaking Down the Problem</summary>

Think about this problem as building up from smaller strings to larger ones. If you can segment "algo", can you use that information to determine if "algoprac" can be segmented? What if you know whether each substring starting from the beginning can be segmented?

How can you check if the string up to position i is valid? What do you need to know about previous positions?

</details>

<details>
<summary>🎯 Hint 2: Dynamic Programming Table</summary>

Create a boolean array `dp` where `dp[i]` means "can we segment the first i characters of the string?" Start with `dp[0] = true` (empty string is always valid).

For each position i, check all possible previous positions j where `dp[j]` is true. If the substring from j to i exists in the dictionary, then `dp[i]` can be true.

Converting the dictionary to a hash set will allow O(1) lookups for substring checks.

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithm</summary>

```
1. Convert wordDict to a hash set for O(1) lookups
2. Create boolean array dp of size n+1, initialize dp[0] = true
3. For each position i from 1 to n:
   a. For each position j from 0 to i-1:
      - If dp[j] is true AND substring(j, i) is in wordDict:
        * Set dp[i] = true
        * Break inner loop (optimization)
4. Return dp[n]
```

Time complexity: O(n² × m) where m is average word length
Space complexity: O(n + w × m) where w is number of words

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(2^n) | O(n) | Try all possible segmentations recursively |
| **Dynamic Programming** | **O(n² × m)** | **O(n + w×m)** | DP table + hash set; m = avg word length, w = dict size |
| DP with Trie | O(n² + w×m) | O(w×m) | Faster dictionary lookups with trie |

## Common Mistakes

### 1. Not Converting Dictionary to Hash Set
```python
# WRONG: O(w) lookup for each substring check
for word in wordDict:
    if s[j:i] == word:
        dp[i] = True

# CORRECT: O(1) lookup with hash set
word_set = set(wordDict)
if s[j:i] in word_set:
    dp[i] = True
```

### 2. Incorrect Base Case
```python
# WRONG: No base case for empty string
dp = [False] * n

# CORRECT: Empty string can be segmented
dp = [False] * (n + 1)
dp[0] = True
```

### 3. Off-by-One Errors in Indexing
```python
# WRONG: Checking substring with wrong indices
if s[j:i-1] in word_set:  # Missing last character

# CORRECT: Python slicing s[j:i] already excludes i
if s[j:i] in word_set:
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Word Break II | Return all possible segmentations | Use DP + backtracking to reconstruct all solutions |
| Concatenated Words | Find words made of other words | Sort by length, apply word break on each word |
| Min Breaks | Find minimum breaks needed | DP tracking count instead of boolean |
| With Spaces | String already has spaces | Split first, then validate each word |

## Practice Checklist

**Correctness:**
- [ ] Handles empty string
- [ ] Handles single character strings
- [ ] Handles no valid segmentation
- [ ] Handles word reuse correctly
- [ ] Returns boolean (not count or array)

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 15 minutes
- [ ] Can discuss complexity trade-offs
- [ ] Can explain why DP is needed

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Dynamic Programming Pattern](../../strategies/patterns/dynamic-programming.md)
