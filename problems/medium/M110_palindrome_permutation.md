---
id: M110
old_id: I065
slug: palindrome-permutation
title: Palindrome Permutation
difficulty: medium
category: medium
topics: ["string", "hash-table"]
patterns: ["character-frequency", "palindrome-properties"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E125", "M111", "E242"]
prerequisites: ["hash-map", "palindrome-properties", "string-manipulation"]
---
# Palindrome Permutation

## Problem

Given a string, determine if you can rearrange its characters to form a palindrome. You don't need to actually construct the palindrome, just verify whether it's possible. The key insight is understanding the character frequency requirements for palindromes. In a palindrome, characters must mirror around the center. For even-length palindromes like "abba", every character must appear an even number of times. For odd-length palindromes like "racecar", exactly one character can appear an odd number of times (the middle character), while all others must appear an even number of times. So the solution doesn't require generating permutations at all; you simply need to count character frequencies and check if at most one character has an odd count. You can optimize further by using a set to toggle characters in and out, avoiding explicit frequency counting. Edge cases include single characters (always true), strings with all identical characters (always true), and strings where more than one character has an odd frequency (always false).

## Why This Matters

Palindrome detection and manipulation appears in DNA sequence analysis where scientists search for palindromic sequences that indicate regulatory regions or restriction sites. Data compression algorithms use palindrome properties to identify redundant patterns. In text editors, spell checkers use character frequency analysis (similar to this problem) to suggest corrections for misspelled words. Cryptographic hash functions employ character distribution analysis for randomness testing. The frequency counting pattern you'll learn here is fundamental to anagram detection, which search engines use for query suggestions and document similarity. Understanding how to analyze string properties without generating all permutations is crucial for performance in text processing applications that handle large datasets, from log analysis systems to natural language processing pipelines. This problem teaches you to solve permutation questions analytically rather than computationally, a key optimization technique.

## Examples

**Example 1:**
- Input: `s = "code"`
- Output: `false`

**Example 2:**
- Input: `s = "aab"`
- Output: `true`

**Example 3:**
- Input: `s = "carerac"`
- Output: `true`

## Constraints

- 1 <= s.length <= 5000
- s consists of only lowercase English letters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Palindrome Character Properties</summary>

In a palindrome, characters are mirrored around the center. For even-length palindromes like "abba", every character appears an even number of times. For odd-length palindromes like "racecar", exactly one character appears an odd number of times (the center character). What does this tell you about character frequencies?

</details>

<details>
<summary>🎯 Hint 2: Frequency Counting</summary>

You don't need to generate permutations. Count the frequency of each character. A string can form a palindrome if and only if at most one character has an odd frequency. Use a hash map or array (since only lowercase letters) to track frequencies.

</details>

<details>
<summary>📝 Hint 3: Optimized Implementation</summary>

**Approach 1: Hash Map**
```
1. Create frequency map of all characters
2. Count how many characters have odd frequencies
3. Return true if odd_count <= 1
```

**Approach 2: Set (Space Optimized)**
```
1. Use a set to track characters with odd frequencies
2. For each character:
   - If in set, remove it (becomes even)
   - If not in set, add it (becomes odd)
3. Return true if set.size() <= 1
```

The set approach is more elegant as you don't need to count, just track odd/even state.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Generate All Permutations | O(n!) | O(n) | Impossibly slow, not viable |
| Hash Map Frequency | O(n) | O(k) | k = number of unique characters (≤26) |
| **Set Toggle** | **O(n)** | **O(k)** | Most elegant, same complexity |
| Bit Manipulation | O(n) | O(1) | Use 26-bit integer for lowercase letters |

## Common Mistakes

### Mistake 1: Trying to generate permutations
```python
# Wrong: Way too slow for n=5000
def canPermutePalindrome(s):
    from itertools import permutations
    for perm in permutations(s):
        if is_palindrome(''.join(perm)):
            return True
    return False

# Correct: Check frequency properties
def canPermutePalindrome(s):
    freq = {}
    for char in s:
        freq[char] = freq.get(char, 0) + 1
    odd_count = sum(1 for count in freq.values() if count % 2 == 1)
    return odd_count <= 1
```

### Mistake 2: Incorrect odd count logic
```python
# Wrong: Checking if total odd count is even
def canPermutePalindrome(s):
    freq = {}
    for char in s:
        freq[char] = freq.get(char, 0) + 1
    odd_count = sum(count for count in freq.values() if count % 2 == 1)
    return odd_count % 2 == 0  # Wrong logic!

# Correct: At most ONE character can have odd frequency
def canPermutePalindrome(s):
    freq = {}
    for char in s:
        freq[char] = freq.get(char, 0) + 1
    odd_count = sum(1 for count in freq.values() if count % 2 == 1)
    return odd_count <= 1
```

### Mistake 3: Not using set optimization
```python
# Suboptimal: Two passes (count, then check)
def canPermutePalindrome(s):
    freq = {}
    for char in s:
        freq[char] = freq.get(char, 0) + 1
    odd_count = 0
    for count in freq.values():
        if count % 2 == 1:
            odd_count += 1
    return odd_count <= 1

# Better: One pass with set toggle
def canPermutePalindrome(s):
    odd_chars = set()
    for char in s:
        if char in odd_chars:
            odd_chars.remove(char)
        else:
            odd_chars.add(char)
    return len(odd_chars) <= 1
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Valid Palindrome (check if already palindrome) | Easy | No permutation needed |
| Palindrome Permutation II (generate all palindromes) | Medium | Backtracking to construct |
| Longest Palindromic Substring | Medium | Find existing palindrome in string |
| Palindrome Pairs | Hard | Combine multiple strings |
| Minimum deletions to make palindrome | Medium | DP to find minimum edits |

## Practice Checklist

- [ ] **Day 0**: Solve using hash map approach (20 min)
- [ ] **Day 1**: Implement set toggle optimization (15 min)
- [ ] **Day 3**: Code bit manipulation solution (25 min)
- [ ] **Day 7**: Solve from memory, all approaches (15 min)
- [ ] **Day 14**: Extend to handle Unicode characters (20 min)
- [ ] **Day 30**: Speed run under time pressure (10 min)

**Strategy**: See [Hash Table Patterns](../prerequisites/hash-tables.md)
