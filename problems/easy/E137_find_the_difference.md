---
id: E137
old_id: I188
slug: find-the-difference
title: Find the Difference
difficulty: easy
category: easy
topics: ["string", "hash-table", "bit-manipulation"]
patterns: ["xor-trick", "frequency-counting"]
estimated_time_minutes: 15
frequency: medium
related_problems:
  - E136
  - E001
  - M136
prerequisites:
  - XOR properties
  - hash-table basics
strategy_ref: ../strategies/patterns/bit-manipulation.md
---
# Find the Difference

## Problem

You are given two strings, `s` and `t`, where `t` is constructed from `s` with one crucial modification: all characters from `s` are shuffled randomly, and exactly one additional character is inserted at any position.

Your goal is to identify and return the extra character that was added to create string `t`. Both strings contain only lowercase English letters, and `t` is always exactly one character longer than `s`.

For example, if `s = "abcd"` and `t = "abcde"`, the extra character is `"e"`. Note that the characters in `t` can appear in any order relative to `s` - the shuffling means you cannot rely on positional comparison. An interesting edge case occurs when `s` is empty: if `s = ""` and `t = "y"`, then `"y"` is clearly the added character.

This problem has multiple solution approaches with different trade-offs, ranging from frequency counting to mathematical properties like XOR and sum differences.

## Why This Matters

Finding differences between related datasets is a core operation in version control systems (detecting file changes), data synchronization, integrity checking, and change detection algorithms. This problem introduces the XOR cancellation technique, an elegant bit manipulation pattern where identical values cancel out (`a XOR a = 0`), leaving only the unique element.

The XOR approach demonstrates how mathematical properties can simplify seemingly complex problems to just a few lines of code with O(1) space complexity. Understanding multiple solution approaches (hash table, sum difference, XOR) for the same problem develops algorithmic flexibility and helps you choose the right tool for different constraints.

## Examples

**Example 1:**
- Input: `s = "abcd", t = "abcde"`
- Output: `"e"`
- Explanation: The letter 'e' is the additional character in string `t`.

**Example 2:**
- Input: `s = "", t = "y"`
- Output: `"y"`
- Explanation: Starting with an empty string, 'y' was added to create `t`.

## Constraints

- 0 <= s.length <= 1000
- t.length == s.length + 1
- s and t consist of lowercase English letters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Tier 1 Hint - Core Concept
Think about the relationship between the two strings. String `t` has exactly one extra character compared to `s`. What mathematical or logical operations could help you identify the difference? Consider: frequency counting, character sum differences, or XOR properties (where `a XOR a = 0`).

### Tier 2 Hint - Implementation Details
Three viable approaches exist: (1) Hash table: count frequencies in both strings and find the character with different counts. (2) Sum difference: calculate sum of ASCII values in both strings; the difference is the extra character. (3) XOR: XOR all characters in both strings together; identical characters cancel out, leaving only the extra one.

### Tier 3 Hint - Optimization Strategy
The XOR approach is most elegant: initialize `result = 0`, then XOR all characters from both strings. Since XOR is commutative and `c XOR c = 0`, all matching characters cancel out. The remaining value is the extra character. This achieves O(n) time and O(1) space. Sum approach is similar: `sum(t) - sum(s)` gives the ASCII value of the extra character.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash Table (frequency count) | O(n) | O(1) | At most 26 lowercase letters |
| Sorting + Comparison | O(n log n) | O(n) | Sort both, compare position-by-position |
| Sum Difference | O(n) | O(1) | Calculate ASCII sum difference |
| XOR All Characters | O(n) | O(1) | Most elegant, uses XOR cancellation |

## Common Mistakes

### Mistake 1: Not handling empty string `s`
```python
# Incomplete - assumes s is non-empty
def findTheDifference(s, t):
    freq_s = {}
    for char in s:
        freq_s[char] = freq_s.get(char, 0) + 1

    for char in t:
        if char not in freq_s or freq_s[char] == 0:
            return char
        freq_s[char] -= 1
    # What if s is empty? Still works, but logic unclear
```

**Why it's concerning:** While this works for empty `s`, the logic isn't explicit about this edge case.

**Fix:** Add comment or explicit check for clarity.

### Mistake 2: Integer overflow concern in sum approach
```python
# Potential issue with very large strings
def findTheDifference(s, t):
    sum_s = sum(ord(c) for c in s)
    sum_t = sum(ord(c) for c in t)
    return chr(sum_t - sum_s)
```

**Why it's concerning:** In languages with fixed-size integers, this could overflow for very long strings (though Python handles arbitrary precision).

**Fix:** Use XOR approach for guaranteed safety, or ensure language supports large integers.

### Mistake 3: Modifying input or extra space
```python
# Wrong - creates sorted copies
def findTheDifference(s, t):
    s_sorted = sorted(s)
    t_sorted = sorted(t)
    for i in range(len(s)):
        if s_sorted[i] != t_sorted[i]:
            return t_sorted[i]
    return t_sorted[-1]
```

**Why it's wrong:** Uses O(n) extra space and O(n log n) time unnecessarily.

**Fix:** Use XOR or sum approach for O(1) space.

## Variations

| Variation | Difference | Difficulty Δ |
|-----------|-----------|-------------|
| Find K missing characters | `t` has K extra characters | +1 |
| Find removed character | `s` has one more character than `t` | 0 |
| Multiple character differences | Find all differences between strings | +1 |
| Case-insensitive version | Ignore character casing | 0 |
| Find first different position | Return index instead of character | 0 |
| Anagram difference detection | Check if strings differ by one char | 0 |

## Practice Checklist

Track your progress on this problem:

- [ ] Solved using hash table approach
- [ ] Implemented XOR solution
- [ ] Implemented sum difference solution
- [ ] After 1 day: Solved using XOR from memory
- [ ] After 1 week: Solved in < 5 minutes
- [ ] Explained XOR cancellation property to someone

**Strategy**: See [Bit Manipulation Pattern](../strategies/patterns/bit-manipulation.md)
