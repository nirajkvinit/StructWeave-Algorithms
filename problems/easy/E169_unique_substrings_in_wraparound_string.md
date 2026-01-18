---
id: E169
old_id: I266
slug: unique-substrings-in-wraparound-string
title: Unique Substrings in Wraparound String
difficulty: easy
category: easy
topics: ["string", "dynamic-programming"]
patterns: ["sliding-window", "counting"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E003", "E076", "E340"]
prerequisites: ["string-basics", "dynamic-programming", "hash-map"]
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Unique Substrings in Wraparound String

## Problem

Imagine an infinite string that continuously cycles through the alphabet: "...zabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcd..." This circular sequence, which we'll call `base`, wraps from 'z' back to 'a' and repeats forever in both directions.

Given a string `s`, your task is to count how many distinct, non-empty substrings of `s` appear somewhere in this infinite circular alphabet. The key constraint is that valid substrings must consist of consecutive alphabetic characters (with wraparound from 'z' to 'a'). For example, "abc" is valid (consecutive letters), "za" is valid (wraparound), but "ac" is not valid (skips 'b').

The challenge is to count unique substrings efficiently without actually generating them all. Consider that "abc" contains six substrings total: "a", "b", "c", "ab", "bc", "abc". But if "abc" appears multiple times in your input string `s`, you should only count these six once. The crucial insight involves recognizing that consecutive sequences of varying lengths can be tracked by their ending character—can you figure out why this eliminates the need to enumerate every substring?

## Why This Matters

This problem exemplifies dynamic programming's power in avoiding redundant computation through clever state representation. In text compression and pattern matching, identifying repeated consecutive patterns is essential for efficient encoding. The technique of tracking maximum sequence lengths ending at each character appears in many substring optimization problems and is a fundamental pattern in string algorithm design.

The wraparound alphabet concept relates to circular data structures used in scheduling algorithms, ring buffers in operating systems, and modular arithmetic in cryptography. More broadly, this problem teaches the important principle that counting unique elements often requires transforming the counting space—rather than tracking all substrings explicitly (which could be quadratic), you track a fixed-size summary (maximum length per ending character), achieving linear complexity. This reduction technique is powerful across many counting and optimization problems.

## Examples

**Example 1:**
- Input: `s = "a"`
- Output: `1`
- Explanation: The single character "a" exists in the circular sequence.

**Example 2:**
- Input: `s = "cac"`
- Output: `2`
- Explanation: Two distinct substrings from s ("a" and "c") appear in the circular sequence.

**Example 3:**
- Input: `s = "zab"`
- Output: `6`
- Explanation: Six distinct substrings ("z", "a", "b", "za", "ab", "zab") from s match portions of the circular sequence.

## Constraints

- 1 <= s.length <= 10⁵
- s consists of lowercase English letters.

## Think About

1. What makes this problem challenging?
   - Counting unique substrings without generating all of them
   - Recognizing that substrings must be consecutive in the alphabet
   - Handling the wraparound from 'z' to 'a'
   - Avoiding double-counting duplicate substrings

2. Can you identify subproblems?
   - Determining if a substring is valid (consecutive alphabetic characters)
   - Finding all maximal consecutive sequences
   - Counting unique substrings efficiently without enumeration

3. What invariants must be maintained?
   - Valid substrings have characters in consecutive alphabetic order
   - 'z' followed by 'a' is valid (wraparound)
   - Each unique substring should be counted only once

4. Is there a mathematical relationship to exploit?
   - A consecutive sequence of length n contributes n*(n+1)/2 substrings
   - For uniqueness, track the longest sequence ending with each character
   - Sum of these maximum lengths gives the unique count

## Approach Hints

### Hint 1: Brute Force - Generate All Substrings
Generate all possible substrings of s, check each one to see if it appears in the wraparound string (consecutive alphabetic characters), and store unique ones in a set.

**Key insight**: A substring is valid if each character is exactly one position ahead of the previous in the alphabet (with wraparound).

**Limitations**: Time O(n³) - O(n²) substrings, each taking O(n) to validate. Space O(n²) for storing all substrings.

### Hint 2: Dynamic Programming with Length Tracking
Track the length of the current consecutive sequence. When you find a consecutive character, extend the sequence; otherwise, start a new sequence. For each position, all substrings ending at that position are valid.

**Key insight**: If current sequence has length k, it contributes k new substrings ending at current position.

**How to implement**:
- Initialize length = 0
- For each character, check if it's consecutive to previous (including 'za')
- If consecutive: length++, add length to count
- If not: length = 1, add 1 to count
- Problem: This counts duplicates!

### Hint 3: Maximum Length per Ending Character
Instead of counting all substrings directly, track the maximum length of consecutive sequence ending with each character ('a' to 'z'). The sum of these maximum lengths equals the count of unique substrings.

**Key insight**: Any substring is uniquely identified by its ending character and length. By keeping only the maximum length per ending character, we avoid duplicates.

**Optimization strategy**:
- Use array maxLen[26] to track max consecutive length ending with each letter
- For each character, update maxLen[char] if current length is greater
- Handle consecutive check: (s[i] - s[i-1] + 26) % 26 == 1
- Sum all maxLen values for the answer

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Generate all) | O(n³) | O(n²) | Generate O(n²) substrings, validate each in O(n), store in set |
| Set-based Deduplication | O(n²) | O(n²) | Generate substrings intelligently, use set for uniqueness |
| DP with Length Tracking | O(n) | O(1) | Single pass, but naive version counts duplicates |
| Max Length per Character | O(n) | O(26) = O(1) | Optimal: single pass, constant space (26 letters) |

## Common Mistakes

### Mistake 1: Not handling the wraparound from 'z' to 'a'
```
// Wrong - only checks forward increment
if (s[i] == s[i-1] + 1) {
    length++
} else {
    length = 1
}

// Why it fails: 'za' is a valid consecutive sequence but 'a' != 'z' + 1
// Example: s = "zab" should find "z", "a", "b", "za", "ab", "zab"

// Correct - handle wraparound
if ((s[i] - s[i-1] + 26) % 26 == 1) {
    length++
} else {
    length = 1
}
```

### Mistake 2: Counting duplicates
```
// Wrong - counts every substring, including duplicates
count = 0
length = 1
for (let i = 1; i < s.length; i++) {
    if (isConsecutive(s[i], s[i-1])) {
        length++
    } else {
        length = 1
    }
    count += length  // Adds duplicates!
}

// Why it fails: s = "abcabc" would count "abc" twice
// Should return 6 ("a", "b", "c", "ab", "bc", "abc") but counts 9

// Correct - track maximum length per ending character
maxLen = new Array(26).fill(0)
for (...) {
    maxLen[s[i] - 'a'] = Math.max(maxLen[s[i] - 'a'], length)
}
return maxLen.reduce((sum, len) => sum + len, 0)
```

### Mistake 3: Incorrect consecutive character check
```
// Wrong - uses simple arithmetic without modulo
if (s[i] - s[i-1] == 1 || (s[i] == 'a' && s[i-1] == 'z')) {
    length++
}

// Why it's problematic: Works but less elegant and error-prone
// Can fail with uppercase/lowercase mixing or different encodings

// Correct - use modulo arithmetic for robustness
if ((s.charCodeAt(i) - s.charCodeAt(i-1) + 26) % 26 == 1) {
    length++
}
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Return actual substrings | Return the set of unique substrings instead of count | Medium |
| Longest wraparound substring | Find the longest valid substring in s | Easy |
| K-character wraparound | Extend to k-character alphabets instead of 26 | Medium |
| Multiple wraparound patterns | Allow different consecutive patterns (e.g., evens, odds) | Medium |
| Reverse wraparound | Count substrings in reverse alphabetic order | Medium |
| Bidirectional wraparound | Allow both forward and backward consecutive sequences | Hard |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] First attempt (understand the problem)
- [ ] Implement brute force with set
- [ ] Implement DP with length tracking
- [ ] Implement optimal max-length-per-character approach
- [ ] Handle edge cases (single char, all same chars, full alphabet)
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Solve without hints
- [ ] Explain solution to someone else
- [ ] Complete in under 20 minutes

**Strategy**: See [Sliding Window Pattern](../strategies/patterns/sliding-window.md)
