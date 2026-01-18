---
id: M235
old_id: A022
slug: longest-word-in-dictionary-through-deleting
title: Longest Word in Dictionary through Deleting
difficulty: medium
category: medium
topics: ["string", "two-pointers", "sorting"]
patterns: ["two-pointers", "subsequence-matching"]
estimated_time_minutes: 30
frequency: medium
related_problems:
  - M392_is_subsequence
  - M524_longest_word_in_dictionary_through_deleting
  - M720_longest_word_in_dictionary
prerequisites:
  - E014_longest_common_prefix
  - E392_is_subsequence
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Longest Word in Dictionary through Deleting

## Problem

Given a string `s` and an array of strings `dictionary`, find the longest string in `dictionary` that is a subsequence of `s`. If multiple valid strings have the same length, return the lexicographically smallest one. If no such string exists, return an empty string.

Recall that string `word` is a **subsequence** of string `s` if you can form `word` by deleting characters from `s` without rearranging the remaining characters. For example, `"abc"` is a subsequence of `"aebdc"`, but `"adc"` is not (the order matters).

The core challenge combines two aspects: efficiently checking if each dictionary word is a subsequence of `s`, and selecting the optimal candidate when multiple words qualify. For subsequence checking, use the two-pointer technique that scans through `s` once per word, matching characters from the candidate word in order. This runs in O(length of s) time per check.

For candidate selection, you have two strategies: sort the dictionary by length descending and lexicographical order ascending, then return the first match you find; or iterate through unsorted and track the best candidate by comparing lengths and lexicographical order. The sorting approach provides cleaner code with early termination, while the no-sort approach might be faster for small dictionaries with few matches.

Consider the trade-offs: sorting takes O(n log n) time but simplifies selection logic; tracking best without sorting is O(n) for comparisons but requires careful condition checking. Both approaches check subsequences in O(nm) total where n is dictionary size and m is length of `s`.

## Why This Matters

Subsequence matching with two-pointers is a fundamental pattern appearing in many string problems including "Is Subsequence," "Number of Matching Subsequences," and various text processing tasks. This exact technique powers features in code editors (finding symbols while typing), autocomplete systems (matching partial queries), and DNA sequence analysis (finding gene patterns). The problem also teaches algorithmic decision-making: when to optimize through sorting versus maintaining running state. Understanding the trade-off between preprocessing cost and query efficiency is crucial for system design. Finally, combining multiple comparison criteria (length and lexicographical order) demonstrates how to build complex selection logic systematically, a skill essential for building ranking and filtering systems.

## Examples

**Example 1:**
- Input: `s = "abpcplea", dictionary = ["ale","apple","monkey","plea"]`
- Output: `"apple"`

**Example 2:**
- Input: `s = "abpcplea", dictionary = ["a","b","c"]`
- Output: `"a"`

## Constraints

- 1 <= s.length <= 1000
- 1 <= dictionary.length <= 1000
- 1 <= dictionary[i].length <= 1000
- s and dictionary[i] consist of lowercase English letters.

## Approach Hints

<details>
<summary>Hint 1: Subsequence Checking with Two Pointers</summary>

First, understand how to check if word `w` is a subsequence of string `s`:

```python
def isSubsequence(w, s):
    i = 0  # pointer for word
    for c in s:
        if i < len(w) and w[i] == c:
            i += 1
    return i == len(w)
```

This is O(n) where n = len(s). You scan `s` once, matching characters from `w` in order.

Now the problem: For each word in dictionary, check if it's a subsequence of `s`, then pick the longest (and lexicographically smallest if tie).

</details>

<details>
<summary>Hint 2: Sorting Strategy for Optimal Selection</summary>

You could check every word and track the best, but there's a smarter way:

**Sort the dictionary** by:
1. Length (descending) - longer words first
2. Lexicographical order (ascending) - alphabetically if same length

Then iterate through sorted dictionary and return the **first** word that's a subsequence of `s`.

Why does this work? Because:
- The first valid word you find is guaranteed to be longest
- Among words of same length, it's lexicographically smallest

This eliminates the need to track "current best" - just return on first match!

</details>

<details>
<summary>Hint 3: Optimization Without Sorting</summary>

Sorting takes O(n log n). Can we do better?

Alternative approach:
1. Iterate through dictionary once
2. For each word that's a subsequence:
   - If longer than current best, update best
   - If same length but lexicographically smaller, update best
3. Return best

Comparison:
- **With sorting**: O(n log n) sort + O(n × m) checking = O(n log n + nm)
- **Without sorting**: O(n × m) checking + O(n) comparisons = O(nm)

Where n = dictionary size, m = max string length.

For small dictionaries, no-sort might be faster. For large dictionaries with many matches, sorting provides early termination.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force | O(n × m) | O(1) | n = dict size, m = s length |
| Sort + Check | O(n log n + n × m) | O(n) | Sorting overhead but cleaner |
| No Sort + Track Best | O(n × m) | O(1) | Better for small dictionaries |
| Preprocess Dictionary | O(n × d) | O(n × 26) | d = avg dict word length |

## Common Mistakes

### Mistake 1: Incorrect Subsequence Check
```python
# WRONG: Checks if all characters exist (ignores order!)
def findLongestWord(s, dictionary):
    def isSubsequence(word, s):
        return all(c in s for c in word)  # Wrong!

    result = ""
    for word in dictionary:
        if isSubsequence(word, s):
            if len(word) > len(result) or (len(word) == len(result) and word < result):
                result = word
    return result
    # Fails: "abc" would match "cba" (wrong!)

# CORRECT: Two-pointer approach maintains order
def findLongestWord(s, dictionary):
    def isSubsequence(word, s):
        i = 0
        for c in s:
            if i < len(word) and word[i] == c:
                i += 1
        return i == len(word)

    result = ""
    for word in dictionary:
        if isSubsequence(word, s):
            if len(word) > len(result) or (len(word) == len(result) and word < result):
                result = word
    return result
```

### Mistake 2: Wrong Sorting Criteria
```python
# WRONG: Sorts only by length
def findLongestWord(s, dictionary):
    def isSubsequence(word, s):
        i = 0
        for c in s:
            if i < len(word) and word[i] == c:
                i += 1
        return i == len(word)

    dictionary.sort(key=lambda x: -len(x))  # Missing alphabetical tie-breaker!

    for word in dictionary:
        if isSubsequence(word, s):
            return word
    return ""
    # Fails when multiple words have same max length

# CORRECT: Sort by length DESC, then alphabetically ASC
def findLongestWord(s, dictionary):
    def isSubsequence(word, s):
        i = 0
        for c in s:
            if i < len(word) and word[i] == c:
                i += 1
        return i == len(word)

    dictionary.sort(key=lambda x: (-len(x), x))  # Correct!

    for word in dictionary:
        if isSubsequence(word, s):
            return word
    return ""
```

### Mistake 3: Inefficient Multiple Passes
```python
# WRONG: Multiple passes through dictionary
def findLongestWord(s, dictionary):
    def isSubsequence(word, s):
        i = 0
        for c in s:
            if i < len(word) and word[i] == c:
                i += 1
        return i == len(word)

    # First pass: find max length
    valid_words = [w for w in dictionary if isSubsequence(w, s)]
    if not valid_words:
        return ""

    max_len = max(len(w) for w in valid_words)

    # Second pass: filter by max length
    candidates = [w for w in valid_words if len(w) == max_len]

    # Third pass: find lexicographically smallest
    return min(candidates)  # Multiple passes!

# CORRECT: Single pass with tracking
def findLongestWord(s, dictionary):
    def isSubsequence(word, s):
        i = 0
        for c in s:
            if i < len(word) and word[i] == c:
                i += 1
        return i == len(word)

    result = ""
    for word in dictionary:
        if isSubsequence(word, s):
            if len(word) > len(result) or (len(word) == len(result) and word < result):
                result = word
    return result
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| All Matching Words | Return all valid words instead of just longest | Easy |
| Shortest Word Through Deleting | Find shortest instead of longest | Easy |
| K Longest Words | Return top k longest valid words | Medium |
| Word with Maximum Value | Each character has a value, maximize total | Medium |
| Longest Common Subsequence | Different problem - find LCS of two strings | Medium |

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Practice Checklist

- [ ] Implement two-pointer subsequence check (Day 1)
- [ ] Solve with sorting approach (Day 1)
- [ ] Solve without sorting (track best) (Day 1)
- [ ] Compare time complexity of both approaches (Day 3)
- [ ] Solve related: Is Subsequence (Day 7)
- [ ] Solve without looking at notes (Day 14)
- [ ] Teach both approaches to someone else (Day 30)

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
