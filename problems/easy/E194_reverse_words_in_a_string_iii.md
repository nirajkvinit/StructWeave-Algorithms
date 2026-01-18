---
id: E194
old_id: A053
slug: reverse-words-in-a-string-iii
title: Reverse Words in a String III
difficulty: easy
category: easy
topics: ["string", "two-pointers"]
patterns: ["string-reversal", "two-pointers", "in-place"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["string-manipulation", "two-pointers", "string-splitting"]
related_problems: ["E151", "E344", "M186"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Reverse Words in a String III

## Problem

Given a string containing words separated by single spaces, reverse the character order within each word individually while keeping the words in their original positions. For example, "Let's code" becomes "s'teL edoc" because each word is reversed in place.

The input string has some helpful guarantees: no leading or trailing spaces, at least one word present, and exactly one space between words. This means you don't need to handle edge cases like multiple consecutive spaces or empty strings.

Your task is to split the string into words, reverse each word's characters independently, and reconstruct the result with the same spacing. The two-pointer technique is particularly elegant here: for each word, use one pointer at the beginning and one at the end, swapping characters as the pointers move toward each other. Alternatively, many languages provide built-in reverse operations that make this straightforward.

## Why This Matters

Character-level string manipulation is fundamental in text processing pipelines, data transformation, and encoding systems. This specific pattern appears in obfuscation algorithms, simple encryption schemes, and text formatting tools. The two-pointer reversal technique you practice here is essential for many in-place array and string algorithms used in memory-constrained environments like embedded systems or mobile apps. Companies building text editors, chat applications, or content management systems implement similar transformations for features like markdown rendering or text normalization. The problem also teaches you how to work with immutable strings in languages like Python or Java, where you must convert to mutable structures for efficient manipulation. This is excellent practice for interviews at companies emphasizing string algorithms, and the pattern extends to problems involving palindrome checking, rotation detection, and anagram validation.

## Examples

**Example 1:**
- Input: `s = "Let's take AlgoPrac contest"`
- Output: `"s'teL ekat carPoglA tsetnoc"`

**Example 2:**
- Input: `s = "Mr Ding"`
- Output: `"rM gniD"`

## Constraints

- 1 <= s.length <= 5 * 10⁴
- s contains printable **ASCII** characters.
- s does not contain any leading or trailing spaces.
- There is **at least one** word in s.
- All the words in s are separated by a single space.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Breaking Down the Problem
Can you split the problem into smaller tasks? First identify individual words, then reverse each one, then join them back. What string operations support this workflow?

### Hint 2: Two-Pointer Reversal
To reverse a word in place, you can use two pointers starting at both ends moving toward the center. How do you swap characters? When do the pointers stop?

### Hint 3: Avoiding Extra Space
Instead of creating new strings for each reversed word, can you work with a character array? In languages where strings are immutable, converting to a mutable structure might help optimize space.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Split + Reverse + Join | O(n) | O(n) | Create list of words, reverse each, join |
| Two Pointers on Char Array | O(n) | O(n) | Convert to array, reverse each word in place |
| Stack-Based | O(n) | O(n) | Use stack for each word reversal |
| Manual Word Boundaries | O(n) | O(n) | Track word start/end, build result string |

## Common Mistakes

### Mistake 1: Reversing entire string first
```python
# Wrong: Reverses whole string instead of individual words
def reverseWords(s):
    return s[::-1]  # "tseetnoc carPoglA ekat s'teL"
```
**Why it's wrong**: This reverses the entire string including word order. Need to reverse only characters within each word while preserving word order.

### Mistake 2: Not preserving word boundaries
```python
# Wrong: Loses space information
def reverseWords(s):
    words = s.split()
    reversed_words = [w[::-1] for w in words]
    return ''.join(reversed_words)  # Missing spaces between words
```
**Why it's wrong**: When joining, forgot to include spaces. Should use `' '.join(reversed_words)`.

### Mistake 3: Inefficient character-by-character concatenation
```python
# Inefficient: String concatenation in loop
def reverseWords(s):
    result = ""
    for word in s.split():
        reversed_word = ""
        for char in word:
            reversed_word = char + reversed_word  # Creates new string each time
        result += reversed_word + " "
    return result.strip()
```
**Why it's wrong**: While correct, string concatenation in Python creates new string objects repeatedly, making it O(n²) in some implementations. Use list and join, or built-in reverse.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Reverse Words in a String | Medium | Reverse word order AND handle multiple spaces |
| Reverse String | Easy | Reverse entire string |
| Reverse Vowels in String | Easy | Reverse only vowel positions |
| Reverse Words in String II | Medium | In-place with O(1) extra space |
| Rotate String | Easy | Check if string is rotation of another |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve using split + reverse + join approach
- [ ] Handle single word and two word cases
- [ ] Verify spaces are preserved correctly

**After 1 Day**
- [ ] Implement using two-pointers on character array
- [ ] Can you explain the difference in space complexity?
- [ ] Code without looking at reference

**After 1 Week**
- [ ] Solve in under 10 minutes
- [ ] Implement both approaches from memory
- [ ] Optimize for minimal allocations

**After 1 Month**
- [ ] Solve "Reverse Words in a String I" (harder variation)
- [ ] Implement true in-place reversal (if language allows)
- [ ] Apply two-pointer reversal to other problems

## Strategy

**Pattern**: String Reversal with Two Pointers
**Key Insight**: Split string into words, reverse each word independently using two-pointer technique, then reconstruct with original spacing.

See [Two Pointers](../strategies/patterns/two-pointers.md) for more on using dual pointers for string reversal and manipulation.
