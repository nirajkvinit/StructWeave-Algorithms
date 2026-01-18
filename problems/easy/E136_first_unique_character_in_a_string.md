---
id: E136
old_id: I186
slug: first-unique-character-in-a-string
title: First Unique Character in a String
difficulty: easy
category: easy
topics: ["string", "hash-table"]
patterns: ["frequency-counting"]
estimated_time_minutes: 15
frequency: high
related_problems:
  - E001
  - E137
  - M001
prerequisites:
  - hash-table basics
  - string iteration
strategy_ref: ../strategies/patterns/frequency-counting.md
---
# First Unique Character in a String

## Problem

Given a string `s`, your task is to find the first character that appears exactly once and return its index position (0-indexed). If no such character exists, return `-1`.

A character is considered "unique" if it appears only one time in the entire string. For example, in `"algoprac"`, the letter 'a' appears only once at index 0, making it the first unique character. In contrast, the string `"aabb"` has no unique characters since both 'a' and 'b' appear multiple times.

The challenge lies in efficiently tracking character frequencies while maintaining the order of appearance. A naive approach checking each character against the rest of the string would work but becomes slow with longer inputs. Note that the string consists only of lowercase English letters (26 possible characters), which provides an opportunity for space-efficient solutions using fixed-size arrays.

You need to return the index (not the character itself) of the first unique character when scanning left to right through the string.

## Why This Matters

Character frequency analysis is fundamental to many real-world applications including text processing, data deduplication, compression algorithms, and cryptography. This problem teaches the frequency counting pattern, which appears in problems involving finding duplicates, validating anagrams, and analyzing character distributions. The two-pass technique (count first, then find) is a common strategy for maintaining order while using hash-based lookups.

This is a high-frequency interview question that tests your ability to balance time and space complexity, choose appropriate data structures (hash map vs. fixed array), and handle edge cases like empty strings or all-duplicate characters. The skills practiced here transfer directly to more complex string manipulation problems.

## Examples

**Example 1:**
- Input: `s = "algoprac"`
- Output: `0`
- Explanation: The character 'a' appears only once and is at index 0.

**Example 2:**
- Input: `s = "lovealgoprac"`
- Output: `2`
- Explanation: The character 'v' appears only once and is at index 2.

**Example 3:**
- Input: `s = "aabb"`
- Output: `-1`
- Explanation: All characters appear more than once, so there is no unique character.

## Constraints

- 1 <= s.length <= 10⁵
- s consists of only lowercase English letters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Tier 1 Hint - Core Concept
Think about counting character frequencies. If you needed to find which characters appear exactly once, what data structure would help you track this efficiently? Consider a two-pass approach: first count all occurrences, then find the first character with count of 1.

### Tier 2 Hint - Implementation Details
Use a hash table (dictionary/map) to store character frequencies. In the first pass, iterate through the string and count each character. In the second pass, iterate through the string again (maintaining order) and return the index of the first character whose count is 1. An array of size 26 can also work since we only have lowercase letters.

### Tier 3 Hint - Optimization Strategy
While hash table works well, you can optimize space slightly by using a fixed-size array `freq[26]` where index represents 'a' through 'z'. Calculate index as `char - 'a'`. The two-pass approach is optimal: O(n) time, O(1) space (constant 26 characters max). Some try one-pass solutions but they're more complex without performance gains.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (nested loops) | O(n²) | O(1) | Check each character against all others |
| Hash Table (two-pass) | O(n) | O(1) | At most 26 lowercase letters |
| Fixed Array (two-pass) | O(n) | O(1) | Array of size 26 for 'a'-'z' |
| One-pass with Queue | O(n) | O(1) | Complex implementation, no real benefit |

## Common Mistakes

### Mistake 1: Returning character instead of index
```python
# Wrong - returns character
def firstUniqChar(s):
    freq = {}
    for char in s:
        freq[char] = freq.get(char, 0) + 1
    for char in s:
        if freq[char] == 1:
            return char  # Should return index!
```

**Why it's wrong:** Problem asks for the index (position), not the character itself.

**Fix:** Return `s.index(char)` or track index in the loop.

### Mistake 2: Single-pass without preserving order
```python
# Wrong - loses order information
def firstUniqChar(s):
    freq = {}
    for i, char in enumerate(s):
        if char in freq:
            freq[char] = -1  # Mark as duplicate
        else:
            freq[char] = i
    return min([idx for idx in freq.values() if idx != -1], default=-1)
```

**Why it's wrong:** Using `min()` works but is unnecessarily complex. The second iteration through the original string naturally preserves order.

**Fix:** Use two-pass approach for clarity.

### Mistake 3: Not handling edge case
```python
# Incomplete - doesn't handle "no unique character"
def firstUniqChar(s):
    freq = {}
    for char in s:
        freq[char] = freq.get(char, 0) + 1
    for i, char in enumerate(s):
        if freq[char] == 1:
            return i
    # Missing: return -1
```

**Why it's wrong:** If no unique character exists, function returns `None` instead of `-1`.

**Fix:** Add explicit `return -1` at the end.

## Variations

| Variation | Difference | Difficulty Δ |
|-----------|-----------|-------------|
| Find all unique characters | Return list of all indices with count=1 | 0 |
| First non-repeating in stream | Process characters one at a time | +1 |
| K-th unique character | Find the k-th character with count=1 | 0 |
| Case-insensitive version | Convert to lowercase first | 0 |
| Unicode/UTF-8 characters | Handle full Unicode range | 0 |
| Most frequent character | Find character with max count | 0 |

## Practice Checklist

Track your progress on this problem:

- [ ] Solved initial version using hash table
- [ ] Optimized to use fixed array for lowercase letters
- [ ] Handled all edge cases (empty string, no unique char)
- [ ] After 1 day: Solved again from memory
- [ ] After 1 week: Solved in < 10 minutes
- [ ] Explained solution to someone else

**Strategy**: See [Frequency Counting Pattern](../strategies/patterns/frequency-counting.md)
