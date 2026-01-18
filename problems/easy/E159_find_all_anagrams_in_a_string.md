---
id: E159
old_id: I237
slug: find-all-anagrams-in-a-string
title: Find All Anagrams in a String
difficulty: easy
category: easy
topics: ["array", "string", "hash-table", "sliding-window"]
patterns: ["sliding-window", "frequency-counting"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E003", "M003", "E242"]
prerequisites: ["sliding-window", "hash-maps"]
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Find All Anagrams in a String

## Problem

An **anagram** is a rearrangement of letters from one word to create another word, using each letter exactly once. For example, "abc", "bac", "cab", "acb", "bca", and "cba" are all anagrams of each other.

You're given two strings: a long string `s` and a shorter pattern string `p`. Your task is to find every position in `s` where an anagram of `p` begins, and return a list of all these starting indices in any order.

Think of this as sliding a window of length `p` across string `s`, and at each position checking if the characters in the window can be rearranged to form `p`. The challenge is doing this efficiently without actually rearranging characters at every position, which would be too slow for large strings.

For example, if `s = "cbaebabacd"` and `p = "abc"`, you'd find anagrams at positions 0 (window "cba") and 6 (window "bac"). The key insight is that you can use a frequency count of characters instead of checking all permutations. Two strings are anagrams if and only if they have identical character frequency counts.

## Why This Matters

Sliding window with frequency counting is one of the most important patterns in string processing and appears constantly in interviews and production code. This exact technique powers substring search in text editors, plagiarism detection (finding rearranged phrases), DNA sequence analysis (finding gene patterns), spam filters (detecting keyword variations), and autocomplete systems (matching typed prefixes). The optimization from O(n*m) to O(n) by reusing frequency counts between overlapping windows is a classic example of avoiding redundant computation. Learning to incrementally update a data structure (adding one character, removing another) as you slide a window is fundamental to stream processing, where you maintain aggregates over moving time windows. This problem is also an excellent introduction to the trade-off between hash map comparisons versus smarter update strategies using match counters.

## Examples

**Example 1:**
- Input: `s = "cbaebabacd", p = "abc"`
- Output: `[0,6]`
- Explanation: At index 0, we find "cba", which contains the same characters as "abc".
At index 6, we find "bac", which is also a rearrangement of "abc".

**Example 2:**
- Input: `s = "abab", p = "ab"`
- Output: `[0,1,2]`
- Explanation: At index 0, the substring "ab" matches the pattern.
At index 1, the substring "ba" is a rearrangement of "ab".
At index 2, the substring "ab" matches again.

## Constraints

- 1 <= s.length, p.length <= 3 * 10⁴
- s and p consist of lowercase English letters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Sort Each Substring
**Hint**: For every window of size p.length in s, sort the characters and compare with sorted p.

**Key Ideas**:
- Precompute sorted version of p
- Slide window of size len(p) through s
- Sort each window and compare
- If match, add starting index to result

**Why This Works**: Sorting identifies anagrams, but repeats work for overlapping windows.

### Intermediate Approach - Fixed Window with Frequency Map
**Hint**: Use a sliding window with character frequency counting instead of sorting.

**Optimization**:
- Create frequency map for p
- Create frequency map for first window of s
- Slide window, updating frequencies (add new char, remove old char)
- Compare frequency maps at each position

**Trade-off**: O(n * 26) for comparing maps at each position, but better than sorting.

### Advanced Approach - Optimized Sliding Window with Match Counter
**Hint**: Track how many characters have matching frequencies instead of comparing entire maps.

**Key Insight**:
- Maintain a "matches" counter (how many chars have correct frequency)
- When adding/removing characters, update match counter
- When matches == 26 (or number of unique chars), found anagram
- No need to compare entire frequency maps

**Why This is Optimal**: O(n) time with O(1) updates per position, O(1) space for fixed alphabet.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (sort each window) | O(n * m log m) | O(m) | m = len(p), n = len(s) |
| Sliding Window + Map Compare | O(n * 26) = O(n) | O(1) | 26 letters = constant |
| Optimized Sliding Window | O(n) | O(1) | Single pass with constant updates |
| Array Frequency (no hash map) | O(n) | O(1) | Use array[26] instead of map |

## Common Mistakes

### Mistake 1: Recomputing entire frequency map each iteration
```
# WRONG - Recreating frequency map for each window
for i in range(len(s) - len(p) + 1):
    window = s[i:i+len(p)]
    window_freq = Counter(window)  # O(m) every iteration!
    if window_freq == p_freq:
        result.append(i)
```
**Why it fails**: O(n * m) time complexity instead of O(n).

**Correct approach**: Update frequency map incrementally by adding one char and removing one char.

### Mistake 2: Incorrect window boundaries
```
# WRONG - Off-by-one in window range
for i in range(len(s) - len(p)):  # Missing last valid window
    # or
for i in range(len(s)):  # Goes beyond valid windows
```
**Why it fails**: Misses valid anagrams or causes index out of bounds.

**Correct approach**: Use `range(len(s) - len(p) + 1)` to include all valid windows.

### Mistake 3: Not handling edge cases
```
# WRONG - No validation
def findAnagrams(s, p):
    result = []
    # Missing: if len(p) > len(s): return []
    freq_p = Counter(p)
    # Missing: if len(p) == 0: return []
```
**Why it fails**: Empty strings or p longer than s cause errors.

**Correct approach**: Validate inputs: if not s or len(p) > len(s), return empty list.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Permutation in String | Return true/false instead of all indices | Easy |
| Minimum Window Substring | Find smallest window containing all chars from p | Hard |
| Longest Substring with K Distinct | Variable window size constraint | Medium |
| Find All Palindrome Substrings | Different matching criterion | Medium |
| Substring with Concatenation | Multiple pattern strings to match | Hard |

## Practice Checklist

Track your progress as you master this problem:

- [ ] **Day 1**: Solve with basic sliding window + frequency map (allow 30 mins)
- [ ] **Day 2**: Optimize to avoid full map comparison each iteration
- [ ] **Day 3**: Implement match counter optimization
- [ ] **Week 2**: Solve without looking at solution (aim for 20 mins)
- [ ] **Week 4**: Solve "Permutation in String" variation
- [ ] **Week 8**: Speed drill - solve in under 12 minutes

**Strategy**: See [Sliding Window Pattern](../strategies/patterns/sliding-window.md) for frequency tracking techniques.
